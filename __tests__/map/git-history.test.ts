/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability git-history-tests
 */

/**
 * Git-history extraction tests (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 P2).
 *
 * The parse is exercised PURELY via parseGitLogNumstat over fixture text (no
 * git process). Degradation paths are exercised against a hermetic tmp non-git
 * dir. The happy-path extraction runs `git` against a freshly-init'd tmp repo
 * so the assertions are deterministic and independent of this repo's history.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  parseGitLogNumstat,
  extractGitHistory,
  GIT_DEGRADE_NOT_A_REPO,
  GIT_DEGRADE_EMPTY_HISTORY,
} from '../../src/map/git-history.js';

const DELIM = '\x01';

describe('parseGitLogNumstat — pure parse over fixture text', () => {
  it('parses per-file churn and per-commit co-change pairs', () => {
    // 3 commits: c1 touches a,b ; c2 touches a,b,c ; c3 touches a.
    const fixture = [
      `${DELIM}sha1`,
      '10\t2\tsrc/a.ts',
      '5\t1\tsrc/b.ts',
      `${DELIM}sha2`,
      '3\t0\tsrc/a.ts',
      '1\t1\tsrc/b.ts',
      '8\t0\tsrc/c.ts',
      `${DELIM}sha3`,
      '2\t2\tsrc/a.ts',
      '',
    ].join('\n');

    const { files, coChanges, commitsScanned } = parseGitLogNumstat(fixture);

    expect(commitsScanned).toBe(3);

    const a = files.find(f => f.file === 'src/a.ts')!;
    expect(a.commitCount).toBe(3);
    expect(a.linesAdded).toBe(15); // 10 + 3 + 2
    expect(a.linesDeleted).toBe(4); // 2 + 0 + 2

    const c = files.find(f => f.file === 'src/c.ts')!;
    expect(c.commitCount).toBe(1);

    // a/b co-change in c1 and c2 -> 2; a/c and b/c only in c2 -> 1 each.
    const ab = coChanges.find(p => p.a === 'src/a.ts' && p.b === 'src/b.ts')!;
    expect(ab.coChangeCount).toBe(2);
    const ac = coChanges.find(p => p.a === 'src/a.ts' && p.b === 'src/c.ts')!;
    expect(ac.coChangeCount).toBe(1);
  });

  it('treats binary edits (- / -) as churn members with zero line deltas', () => {
    const fixture = [`${DELIM}sha1`, '-\t-\tassets/logo.png', '4\t1\tsrc/a.ts', ''].join('\n');
    const { files, coChanges } = parseGitLogNumstat(fixture);
    const png = files.find(f => f.file === 'assets/logo.png')!;
    expect(png.commitCount).toBe(1);
    expect(png.linesAdded).toBe(0);
    expect(png.linesDeleted).toBe(0);
    // still forms a co-change pair with a.ts
    expect(coChanges.find(p => p.a === 'assets/logo.png' && p.b === 'src/a.ts')!.coChangeCount).toBe(1);
  });

  it('resolves rename spellings to the new path (brace and arrow forms)', () => {
    const fixture = [
      `${DELIM}sha1`,
      '1\t1\tsrc/{old => new}/file.ts',
      `${DELIM}sha2`,
      '2\t0\tlib/a.ts => lib/b.ts',
      '',
    ].join('\n');
    const { files } = parseGitLogNumstat(fixture);
    expect(files.some(f => f.file === 'src/new/file.ts')).toBe(true);
    expect(files.some(f => f.file === 'lib/b.ts')).toBe(true);
  });

  it('normalizes backslash paths to forward slashes', () => {
    const fixture = [`${DELIM}sha1`, '1\t0\tsrc\\win\\path.ts', ''].join('\n');
    const { files } = parseGitLogNumstat(fixture);
    expect(files[0].file).toBe('src/win/path.ts');
  });

  it('caps co-change pairs from a giant sweep commit (churn still counts)', () => {
    // one commit touching 5 files, cap at 3 -> no pairs emitted, but all 5 churned.
    const rows = ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'].map(f => `1\t0\t${f}`);
    const fixture = [`${DELIM}sha1`, ...rows, ''].join('\n');
    const { files, coChanges } = parseGitLogNumstat(fixture, 3);
    expect(files).toHaveLength(5);
    expect(coChanges).toHaveLength(0);
  });

  it('emits deterministic sorted order for files and pairs', () => {
    const fixture = [`${DELIM}s`, '1\t0\tz.ts', '1\t0\ta.ts', '1\t0\tm.ts', ''].join('\n');
    const { files, coChanges } = parseGitLogNumstat(fixture);
    expect(files.map(f => f.file)).toEqual(['a.ts', 'm.ts', 'z.ts']);
    // pairs sorted by (a, b)
    expect(coChanges.map(p => `${p.a}|${p.b}`)).toEqual(['a.ts|m.ts', 'a.ts|z.ts', 'm.ts|z.ts']);
  });

  it('yields NO authorship for bare `<DELIM>sha` headers (additive — no author fields)', () => {
    // The existing fixture shape carries no author/at on the header; authorship
    // must be empty so the ownership block downstream degrades to no-data.
    const fixture = [`${DELIM}sha1`, '1\t0\tsrc/a.ts', ''].join('\n');
    const { files, authorship } = parseGitLogNumstat(fixture);
    expect(files).toHaveLength(1); // churn shape unchanged
    expect(authorship).toEqual([]);
  });

  it('captures per-file authorship when the header carries <DELIM>sha<DELIM>author<DELIM>at', () => {
    // 3 commits with authors: c1 alice touches a,b ; c2 bob touches a ; c3 alice touches a.
    // a.ts -> alice x2, bob x1 (alice dominant); b.ts -> alice x1.
    const at1 = '1700000000';
    const at2 = '1700100000';
    const at3 = '1700200000';
    const fixture = [
      `${DELIM}sha1${DELIM}alice${DELIM}${at1}`,
      '10\t2\tsrc/a.ts',
      '5\t1\tsrc/b.ts',
      `${DELIM}sha2${DELIM}bob${DELIM}${at2}`,
      '3\t0\tsrc/a.ts',
      `${DELIM}sha3${DELIM}alice${DELIM}${at3}`,
      '2\t2\tsrc/a.ts',
      '',
    ].join('\n');

    const { files, authorship } = parseGitLogNumstat(fixture);

    // churn shape is unchanged by author capture.
    expect(files.find(f => f.file === 'src/a.ts')!.commitCount).toBe(3);

    const a = authorship.find(f => f.file === 'src/a.ts')!;
    // authors sorted by commitCount desc then name asc -> alice(2) before bob(1).
    expect(a.authors).toEqual([
      { name: 'alice', commitCount: 2 },
      { name: 'bob', commitCount: 1 },
    ]);
    expect(a.distinctAuthorCount).toBe(2);
    // newest touch of a.ts is c3 (at3).
    expect(a.lastTouchedEpoch).toBe(parseInt(at3, 10));

    const b = authorship.find(f => f.file === 'src/b.ts')!;
    expect(b.authors).toEqual([{ name: 'alice', commitCount: 1 }]);
    expect(b.lastTouchedEpoch).toBe(parseInt(at1, 10));

    // authorship sorted file asc.
    expect(authorship.map(f => f.file)).toEqual(['src/a.ts', 'src/b.ts']);
  });
});

describe('extractGitHistory — degradation paths (any-repo rule)', () => {
  let tmpNonGit: string;

  beforeAll(() => {
    tmpNonGit = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-nongit-'));
  });
  afterAll(() => {
    try {
      fs.rmSync(tmpNonGit, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  });

  it('returns null with not_a_git_repo for a non-git directory', () => {
    const result = extractGitHistory(tmpNonGit);
    // On a machine with git on PATH this is not_a_git_repo; if git is entirely
    // absent it is git_absent. Either way: null history, never a throw.
    expect(result.history).toBeNull();
    expect([GIT_DEGRADE_NOT_A_REPO, 'git_absent']).toContain(result.reason);
  });

  it('never throws — always returns a result object', () => {
    expect(() => extractGitHistory(tmpNonGit)).not.toThrow();
    expect(() => extractGitHistory(path.join(tmpNonGit, 'does', 'not', 'exist'))).not.toThrow();
  });
});

/** Git available on PATH? Gate the live-repo test on it so CI without git still passes. */
function gitAvailable(): boolean {
  try {
    const r = spawnSync('git', ['--version'], { encoding: 'utf-8' });
    return !r.error && (r.status ?? 1) === 0;
  } catch {
    return false;
  }
}

describe.runIf(gitAvailable())('extractGitHistory — live extraction over a fresh tmp repo', () => {
  let repo: string;

  beforeAll(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-gitrepo-'));
    const git = (args: string[]) =>
      spawnSync('git', args, { cwd: repo, encoding: 'utf-8', windowsHide: true });
    git(['init', '-q']);
    git(['config', 'user.email', 'test@coderef.local']);
    git(['config', 'user.name', 'coderef-test']);
    git(['config', 'commit.gpgsign', 'false']);
    // commit 1: a + b together
    fs.writeFileSync(path.join(repo, 'a.ts'), 'export const a = 1;\n');
    fs.writeFileSync(path.join(repo, 'b.ts'), 'export const b = 2;\n');
    git(['add', 'a.ts', 'b.ts']);
    git(['commit', '-q', '-m', 'c1: a+b']);
    // commit 2: a again (a is now higher-churn than b)
    fs.writeFileSync(path.join(repo, 'a.ts'), 'export const a = 11;\n');
    git(['add', 'a.ts']);
    git(['commit', '-q', '-m', 'c2: a']);
  });
  afterAll(() => {
    try {
      fs.rmSync(repo, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  });

  it('extracts churn, co-change, and a resolved window from real git', () => {
    const result = extractGitHistory(repo);
    expect(result.history).not.toBeNull();
    const h = result.history!;
    expect(h.window.commitsScanned).toBe(2);
    expect(h.window.headSha).toMatch(/^[0-9a-f]{7,}$/);
    expect(h.window.shallow).toBe(false);

    const a = h.files.find(f => f.file === 'a.ts')!;
    const b = h.files.find(f => f.file === 'b.ts')!;
    expect(a.commitCount).toBe(2);
    expect(b.commitCount).toBe(1);

    // a and b co-changed exactly once (commit 1).
    const pair = h.coChanges.find(p => p.a === 'a.ts' && p.b === 'b.ts')!;
    expect(pair.coChangeCount).toBe(1);

    // Author capture is live (the tmp repo commits as 'coderef-test').
    expect(h.authorship).toBeDefined();
    const authA = h.authorship!.find(f => f.file === 'a.ts')!;
    expect(authA.authors).toEqual([{ name: 'coderef-test', commitCount: 2 }]);
    expect(authA.distinctAuthorCount).toBe(1);
    expect(authA.lastTouchedEpoch).toBeGreaterThan(0);
  });

  it('returns empty_history for a git repo with zero commits', () => {
    // A freshly-init'd repo has a work tree but no HEAD commit — the
    // deterministic empty-history trigger (independent of git's date parsing).
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-emptygit-'));
    try {
      spawnSync('git', ['init', '-q'], { cwd: empty, encoding: 'utf-8', windowsHide: true });
      const result = extractGitHistory(empty);
      expect(result.history).toBeNull();
      expect(result.reason).toBe(GIT_DEGRADE_EMPTY_HISTORY);
    } finally {
      try {
        fs.rmSync(empty, { recursive: true, force: true });
      } catch {
        /* best-effort */
      }
    }
  });
});

/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability map-git-history-extraction
 * @exports GitFileChurn, GitCoChangePair, GitHistoryWindow, GitHistory, GitHistoryResult, ExtractGitHistoryOptions, extractGitHistory, parseGitLogNumstat
 * @used_by src/map/emit-map.ts
 */

/**
 * Git-history extraction — the SINGLE impure module in the map pipeline
 * (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 P2, git-behavioral-substrate;
 * CodeScene / code-maat pattern). This is the only code that shells to `git`.
 *
 * IMPURITY IS ISOLATED HERE ON PURPOSE. Reading git history is non-deterministic
 * across clones (commit set differs per checkout depth/age), so it must never
 * live inside the pure `projectMapData` projection. The caller (generateMap →
 * CLI `--git` / MCP `git:true`) runs this extractor, and the plain serializable
 * `GitHistory` record it returns is passed as DATA into the pure analytics
 * (`src/map/git-behavioral.ts`). No analytics logic lives here — extraction only.
 *
 * ANY-REPO RULE: every non-git / degraded path returns { history: null, reason }
 * rather than throwing, so a non-git dir, a git-less PATH, or an empty repo
 * degrades the downstream `git` block to ABSENT with a declared warning — the
 * same no-data-vs-zero contract engineering-metrics uses for a header-less repo.
 *
 * DETERMINISM WITHIN A WINDOW: extraction is bounded by max-commit-count / since;
 * git-log order is stable for a fixed commit range. The resolved window
 * (maxCount, since, commitsScanned, headSha, shallow) is stamped into the record
 * so the block can declare its provenance. Beyond that boundary the data is a
 * property of the checkout, not of the source — hence the isolation.
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeSlashes } from '../utils/path-normalize.js';

/** Per-file churn facts within the extracted commit window. */
export interface GitFileChurn {
  /** Project-relative, slash-normalized file path (matches graph node ids). */
  file: string;
  /** Distinct commits in the window that touched this file. */
  commitCount: number;
  /** Total lines added across those commits (binary edits contribute 0). */
  linesAdded: number;
  /** Total lines deleted across those commits (binary edits contribute 0). */
  linesDeleted: number;
}

/** One unordered pair of files that changed together, with its co-change count. */
export interface GitCoChangePair {
  /** Lexicographically-first path of the pair (a < b). */
  a: string;
  /** Lexicographically-second path of the pair. */
  b: string;
  /** Distinct commits in the window that changed BOTH files. */
  coChangeCount: number;
}

/** One author's contribution count to a single file within the window. */
export interface GitFileAuthorCount {
  /** Author name as reported by git `%an` (verbatim; may be non-unique across identities). */
  name: string;
  /** Distinct commits in the window by this author that touched this file. */
  commitCount: number;
}

/**
 * Per-file authorship facts within the extracted commit window. ADDITIVE — this
 * array is present only when the extraction captured author fields (`%an`/`%at`
 * on the commit header). Older callers / fixtures without author fields produce
 * NO authorship entries, so the block downstream stays absent (no-data), never a
 * guess. The pure ownership analytics (src/map/ownership.ts) consume this record.
 */
export interface GitFileAuthorship {
  /** Project-relative, slash-normalized file path (matches graph node ids). */
  file: string;
  /** Per-author commit tallies for this file, sorted commitCount desc then name asc. */
  authors: GitFileAuthorCount[];
  /** Distinct authors that touched this file in the window. */
  distinctAuthorCount: number;
  /** Author-timestamp (epoch seconds) of the most recent commit touching this file. */
  lastTouchedEpoch: number;
}

/** Resolved extraction window — the block's provenance metadata. */
export interface GitHistoryWindow {
  /** The --max-count bound applied (0 = unbounded was requested). */
  maxCount: number;
  /** The --since bound applied, or null when none. */
  since: string | null;
  /** Commits actually scanned in the window. */
  commitsScanned: number;
  /** Short HEAD sha at extraction time (provenance only; not for determinism). */
  headSha: string;
  /** True when the checkout is a shallow clone (window is partial by depth). */
  shallow: boolean;
}

/** Plain serializable extracted history — the boundary object handed to the pure analytics. */
export interface GitHistory {
  window: GitHistoryWindow;
  /** Per-file churn, sorted (file asc). */
  files: GitFileChurn[];
  /** Co-change pairs, sorted (a asc, then b asc). */
  coChanges: GitCoChangePair[];
  /**
   * Per-file authorship, sorted (file asc). ADDITIVE + OPTIONAL: present only
   * when the extraction captured author fields (`%an`/`%at`). Absent when the
   * source (an older caller or a fixture without author fields) carried none —
   * the ownership block then degrades to no-data. Existing `files`/`coChanges`
   * consumers are unaffected (additive-schema rule).
   */
  authorship?: GitFileAuthorship[];
}

/** Extraction outcome: a history, or null with a machine-readable reason. */
export interface GitHistoryResult {
  history: GitHistory | null;
  /** Present only when history is null. One of the GIT_DEGRADE_* reasons. */
  reason?: string;
}

export interface ExtractGitHistoryOptions {
  /** Max commits to scan (default 500; 0 = unbounded). Bounds the window. */
  maxCount?: number;
  /** Git --since expression (e.g. '6 months ago'); default undefined (no bound). */
  since?: string;
  /**
   * Max distinct files a single commit may touch and still contribute
   * co-change pairs (default 100). A giant sweep commit (lockfile bump,
   * mass rename) would otherwise emit O(files^2) noise pairs. Files still
   * count toward per-file churn; only the pair explosion is capped.
   */
  coChangeCommitFileCap?: number;
}

/** Machine-readable degradation reasons (stable — tests + block warnings match on these). */
export const GIT_DEGRADE_NOT_A_REPO = 'not_a_git_repo';
export const GIT_DEGRADE_GIT_ABSENT = 'git_absent';
export const GIT_DEGRADE_EMPTY_HISTORY = 'empty_history';
export const GIT_DEGRADE_EXTRACTION_FAILED = 'extraction_failed';

const DEFAULT_MAX_COUNT = 500;
const DEFAULT_COCHANGE_FILE_CAP = 100;
const COMMIT_DELIM = '\x01';

/**
 * Resolve a numstat path field to a single normalized path. Handles git's two
 * rename spellings under --numstat:
 *   - brace form:  `src/{old => new}/file.ts`
 *   - arrow form:  `old/path.ts => new/path.ts`
 * Always resolves to the NEW path (the post-rename identity the graph uses).
 */
function resolveNumstatPath(raw: string): string {
  let p = raw.trim();
  // Brace form: expand `a/{b => c}/d` -> `a/c/d` (take the right side of =>).
  const brace = p.match(/^(.*)\{(.*) => (.*)\}(.*)$/);
  if (brace) {
    p = brace[1] + brace[3] + brace[4];
  } else {
    // Arrow form: `old => new` -> `new`.
    const arrow = p.indexOf(' => ');
    if (arrow !== -1) {
      p = p.slice(arrow + 4);
    }
  }
  // Collapse any doubled slashes the brace expansion may have produced.
  return normalizeSlashes(p).replace(/\/{2,}/g, '/');
}

/**
 * Parse `git log --no-merges --numstat --format=<DELIM>%H` output into a
 * GitHistory (without the window/headSha metadata — the caller stamps those).
 * PURE over its string input — split out so tests can feed fixture text with no
 * git process. Exported for direct unit testing.
 *
 * Format contract: each commit begins with a header line `<DELIM><sha>` — OR,
 * when author capture is enabled, `<DELIM><sha><DELIM><author><DELIM><at>`
 * (author name + author-timestamp epoch seconds). Subsequent non-empty lines are
 * numstat rows `added\tdeleted\tpath`. `added`/`deleted` are `-` for binary
 * files (counted as a co-change member, 0 lines).
 *
 * ADDITIVE authorship: the returned `authorship` array is populated ONLY when
 * commit headers carried author fields; bare `<DELIM><sha>` headers (older
 * callers, existing fixtures) yield an EMPTY authorship array, so the ownership
 * block downstream degrades to no-data rather than guessing.
 */
export function parseGitLogNumstat(
  raw: string,
  coChangeCommitFileCap: number = DEFAULT_COCHANGE_FILE_CAP,
): {
  files: GitFileChurn[];
  coChanges: GitCoChangePair[];
  authorship: GitFileAuthorship[];
  commitsScanned: number;
} {
  const churn = new Map<string, { commitCount: number; linesAdded: number; linesDeleted: number }>();
  const pairCounts = new Map<string, number>();
  // Per-file authorship accumulation: file -> (author -> commitCount) + newest touch epoch.
  const authorAcc = new Map<string, { byAuthor: Map<string, number>; lastTouchedEpoch: number }>();
  let commitsScanned = 0;

  const lines = raw.split(/\r?\n/);
  let currentFiles: Set<string> | null = null;
  let currentAuthor: string | null = null;
  let currentEpoch: number | null = null;

  const flush = (files: Set<string> | null): void => {
    if (!files || files.size === 0) return;
    // Per-file commit tallies were incremented as rows were read; here we only
    // emit co-change pairs for this commit's file set (bounded to avoid a
    // sweep commit's O(n^2) pair explosion).
    if (files.size > coChangeCommitFileCap) return;
    const sorted = Array.from(files).sort();
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = sorted[i] + '\x00' + sorted[j];
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  };

  for (const line of lines) {
    if (line.startsWith(COMMIT_DELIM)) {
      // Boundary: flush the previous commit's co-change pairs, start a new one.
      flush(currentFiles);
      currentFiles = new Set<string>();
      commitsScanned++;
      // Header may be bare `<DELIM>sha` or `<DELIM>sha<DELIM>author<DELIM>at`.
      // Split on the delimiter; fields after the sha are the optional author + at.
      const parts = line.split(COMMIT_DELIM);
      // parts[0] is '' (leading delimiter), parts[1] is the sha.
      currentAuthor = parts.length >= 3 && parts[2] !== '' ? parts[2] : null;
      const atRaw = parts.length >= 4 ? parts[3] : '';
      const at = parseInt(atRaw, 10);
      currentEpoch = Number.isFinite(at) ? at : null;
      continue;
    }
    if (!line.trim()) continue;
    if (currentFiles === null) continue; // rows before any commit header — ignore
    // numstat row: added \t deleted \t path
    const tab1 = line.indexOf('\t');
    if (tab1 === -1) continue;
    const tab2 = line.indexOf('\t', tab1 + 1);
    if (tab2 === -1) continue;
    const addedRaw = line.slice(0, tab1);
    const deletedRaw = line.slice(tab1 + 1, tab2);
    const file = resolveNumstatPath(line.slice(tab2 + 1));
    if (!file) continue;
    const added = addedRaw === '-' ? 0 : parseInt(addedRaw, 10) || 0;
    const deleted = deletedRaw === '-' ? 0 : parseInt(deletedRaw, 10) || 0;
    // Deduplicate within a commit: a file listed twice (shouldn't happen under
    // --numstat, but be defensive) counts once toward commitCount.
    const firstTouchThisCommit = !currentFiles.has(file);
    currentFiles.add(file);
    let c = churn.get(file);
    if (!c) {
      c = { commitCount: 0, linesAdded: 0, linesDeleted: 0 };
      churn.set(file, c);
    }
    if (firstTouchThisCommit) c.commitCount++;
    c.linesAdded += added;
    c.linesDeleted += deleted;

    // Authorship accrues only when this commit header carried an author.
    if (firstTouchThisCommit && currentAuthor !== null) {
      let acc = authorAcc.get(file);
      if (!acc) {
        acc = { byAuthor: new Map<string, number>(), lastTouchedEpoch: 0 };
        authorAcc.set(file, acc);
      }
      acc.byAuthor.set(currentAuthor, (acc.byAuthor.get(currentAuthor) || 0) + 1);
      if (currentEpoch !== null && currentEpoch > acc.lastTouchedEpoch) {
        acc.lastTouchedEpoch = currentEpoch;
      }
    }
  }
  flush(currentFiles); // last commit

  const files: GitFileChurn[] = Array.from(churn.entries())
    .map(([file, c]) => ({ file, commitCount: c.commitCount, linesAdded: c.linesAdded, linesDeleted: c.linesDeleted }))
    .sort((x, y) => (x.file < y.file ? -1 : x.file > y.file ? 1 : 0));

  const coChanges: GitCoChangePair[] = Array.from(pairCounts.entries())
    .map(([key, coChangeCount]) => {
      const [a, b] = key.split('\x00');
      return { a, b, coChangeCount };
    })
    .sort((x, y) => (x.a < y.a ? -1 : x.a > y.a ? 1 : x.b < y.b ? -1 : x.b > y.b ? 1 : 0));

  const authorship: GitFileAuthorship[] = Array.from(authorAcc.entries())
    .map(([file, acc]) => {
      const authors: GitFileAuthorCount[] = Array.from(acc.byAuthor.entries())
        .map(([name, commitCount]) => ({ name, commitCount }))
        .sort((x, y) =>
          y.commitCount - x.commitCount || (x.name < y.name ? -1 : x.name > y.name ? 1 : 0),
        );
      return {
        file,
        authors,
        distinctAuthorCount: authors.length,
        lastTouchedEpoch: acc.lastTouchedEpoch,
      };
    })
    .sort((x, y) => (x.file < y.file ? -1 : x.file > y.file ? 1 : 0));

  return { files, coChanges, authorship, commitsScanned };
}

function runGit(projectRoot: string, gitArgs: string[]): { ok: boolean; stdout: string; enoent: boolean; status: number | null } {
  const r = spawnSync('git', gitArgs, {
    cwd: projectRoot,
    encoding: 'utf-8',
    maxBuffer: 256 * 1024 * 1024, // large repos: 256MB numstat ceiling
    windowsHide: true,
  });
  if (r.error) {
    const enoent = (r.error as NodeJS.ErrnoException).code === 'ENOENT';
    return { ok: false, stdout: '', enoent, status: null };
  }
  return { ok: (r.status ?? 1) === 0, stdout: r.stdout || '', enoent: false, status: r.status ?? null };
}

/**
 * Extract bounded git history for `projectRoot`. Returns a plain GitHistory, or
 * { history: null, reason } for every degraded path (not-a-git-repo, git absent
 * on PATH, empty history, extraction failure). NEVER throws — any-repo rule.
 */
export function extractGitHistory(
  projectRoot: string,
  options: ExtractGitHistoryOptions = {},
): GitHistoryResult {
  const maxCount = options.maxCount ?? DEFAULT_MAX_COUNT;
  const since = options.since ?? null;
  const coChangeCommitFileCap = options.coChangeCommitFileCap ?? DEFAULT_COCHANGE_FILE_CAP;

  // 1. Is this a git work tree at all? (also catches git-absent via ENOENT)
  const insideCheck = runGit(projectRoot, ['rev-parse', '--is-inside-work-tree']);
  if (insideCheck.enoent) {
    return { history: null, reason: GIT_DEGRADE_GIT_ABSENT };
  }
  if (!insideCheck.ok || insideCheck.stdout.trim() !== 'true') {
    return { history: null, reason: GIT_DEGRADE_NOT_A_REPO };
  }

  // 2. HEAD sha (provenance) — also tells us empty-history (no commits yet).
  const headCheck = runGit(projectRoot, ['rev-parse', '--short', 'HEAD']);
  if (!headCheck.ok) {
    // rev-parse HEAD fails on a repo with zero commits.
    return { history: null, reason: GIT_DEGRADE_EMPTY_HISTORY };
  }
  const headSha = headCheck.stdout.trim();

  // 3. Shallow-clone detection (window is partial by depth — declared, not fatal).
  let shallow = false;
  try {
    const gitDirRes = runGit(projectRoot, ['rev-parse', '--git-dir']);
    if (gitDirRes.ok) {
      const gitDir = gitDirRes.stdout.trim();
      const shallowPath = path.isAbsolute(gitDir)
        ? path.join(gitDir, 'shallow')
        : path.join(projectRoot, gitDir, 'shallow');
      shallow = fs.existsSync(shallowPath);
    }
  } catch {
    shallow = false; // best-effort; absence of the marker is the common case
  }

  // 4. The extraction: bounded git log with per-commit numstat + authorship.
  //    Header carries sha + author name + author-timestamp so the pure parser can
  //    roll up per-file ownership without a second git pass. Delimiter-separated
  //    on the header line; numstat rows follow unchanged.
  const logArgs = [
    'log',
    '--no-merges',
    '--numstat',
    `--format=${COMMIT_DELIM}%H${COMMIT_DELIM}%an${COMMIT_DELIM}%at`,
  ];
  if (maxCount > 0) logArgs.push(`--max-count=${maxCount}`);
  if (since) logArgs.push(`--since=${since}`);
  const logRes = runGit(projectRoot, logArgs);
  if (!logRes.ok) {
    return { history: null, reason: GIT_DEGRADE_EXTRACTION_FAILED };
  }
  if (!logRes.stdout.trim()) {
    // Repo has a HEAD but the window yielded nothing (e.g. --since too tight).
    return { history: null, reason: GIT_DEGRADE_EMPTY_HISTORY };
  }

  const parsed = parseGitLogNumstat(logRes.stdout, coChangeCommitFileCap);
  if (parsed.commitsScanned === 0) {
    return { history: null, reason: GIT_DEGRADE_EMPTY_HISTORY };
  }

  return {
    history: {
      window: {
        maxCount,
        since,
        commitsScanned: parsed.commitsScanned,
        headSha,
        shallow,
      },
      files: parsed.files,
      coChanges: parsed.coChanges,
      // Additive: present when the format captured authors (always, post-P2).
      // An empty array (e.g. a window with no author fields) is preserved as
      // no-data — the ownership block is then absent rather than fabricated.
      authorship: parsed.authorship,
    },
  };
}

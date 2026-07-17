/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability staleness-check-test
 */

/**
 * Tests for the query-time freshness checker (checkStaleness) —
 * WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 Phase 8. These exercise the impure
 * half against a real tmp `.coderef/` so the load-bearing behaviours are pinned:
 *  - HASH-AUTHORITY: a file touched (mtime bumped) but byte-identical is NOT stale
 *    — the exact false-positive the Phase-7 mtime heuristic gets wrong.
 *  - a byte-CHANGED file IS stale, named in the sample, with a reindex hint.
 *  - manifest-ABSENT degrades to basis:'manifest-absent' (never throws).
 *  - a deleted source file is counted MISSING, not stale.
 */

import { afterEach, describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createHash } from 'crypto';
import { checkStaleness } from '../../src/query/staleness-check.js';
import { buildManifest, type ManifestSourceFile } from '../../src/pipeline/staleness-manifest.js';

const tmpDirs: string[] = [];
afterEach(() => {
  for (const d of tmpDirs.splice(0)) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

/** Real hash of a file on disk (what the checker computes internally). */
function sha(abs: string): string {
  return createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
}

/**
 * Build a project with `src/a.ts` + `src/b.ts`, a `.coderef/graph.json`, and a
 * matching `.coderef/manifest.json`. Returns the project dir. graph.json is
 * written LAST so its mtime is the freshness baseline (>= the source mtimes).
 */
function makeProject(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'staleness-'));
  tmpDirs.push(root);
  const coderef = path.join(root, '.coderef');
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.mkdirSync(coderef, { recursive: true });

  const aAbs = path.join(root, 'src', 'a.ts');
  const bAbs = path.join(root, 'src', 'b.ts');
  fs.writeFileSync(aAbs, 'export const a = 1;\n');
  fs.writeFileSync(bAbs, 'export const b = 2;\n');

  const files: ManifestSourceFile[] = [
    { path: 'src/a.ts', size: fs.statSync(aAbs).size },
    { path: 'src/b.ts', size: fs.statSync(bAbs).size },
  ];
  const manifest = buildManifest(files, (rel) => sha(path.join(root, rel)), '2026-07-17T00:00:00.000Z');
  fs.writeFileSync(path.join(coderef, 'manifest.json'), JSON.stringify(manifest, null, 2));
  // graph.json written last -> newest mtime among the artifacts + sources.
  fs.writeFileSync(path.join(coderef, 'graph.json'), JSON.stringify({ version: '1.0.0', nodes: [], edges: [] }));
  return root;
}

describe('checkStaleness — authoritative hash manifest', () => {
  it('a freshly built project is NOT stale (hash basis)', () => {
    const root = makeProject();
    const r = checkStaleness(root);
    expect(r.basis).toBe('scan-time-hash-manifest');
    expect(r.stale).toBe(false);
    expect(r.stale_count).toBe(0);
    expect(r.stale_files_sample).toEqual([]);
  });

  it('HASH AUTHORITY: a touched-but-byte-identical file is NOT stale', () => {
    const root = makeProject();
    const aAbs = path.join(root, 'src', 'a.ts');
    // Bump mtime WELL past graph.json without changing content (git-checkout-like).
    const future = new Date(Date.now() + 60_000);
    fs.utimesSync(aAbs, future, future);
    const r = checkStaleness(root);
    // mtime is newer -> the checker re-hashes it, finds identical content -> fresh.
    expect(r.basis).toBe('scan-time-hash-manifest');
    expect(r.stale).toBe(false);
    expect(r.stale_count).toBe(0);
  });

  it('a byte-CHANGED file IS stale, named in the sample, with a reindex hint', () => {
    const root = makeProject();
    const aAbs = path.join(root, 'src', 'a.ts');
    const future = new Date(Date.now() + 60_000);
    fs.writeFileSync(aAbs, 'export const a = 999; // edited\n');
    fs.utimesSync(aAbs, future, future);
    const r = checkStaleness(root);
    expect(r.stale).toBe(true);
    expect(r.stale_count).toBe(1);
    expect(r.stale_files_sample).toEqual(['src/a.ts']);
    expect(r.hint).toMatch(/reindex/i);
  });

  it('a deleted source file is counted MISSING, not stale', () => {
    const root = makeProject();
    fs.rmSync(path.join(root, 'src', 'b.ts'));
    const r = checkStaleness(root);
    // b.ts has no current hash -> MISSING, not a content-diff -> not stale.
    expect(r.stale).toBe(false);
    expect(r.stale_count).toBe(0);
  });

  it('honors the sample cap', () => {
    const root = makeProject();
    const future = new Date(Date.now() + 60_000);
    for (const f of ['a', 'b']) {
      const abs = path.join(root, 'src', `${f}.ts`);
      fs.writeFileSync(abs, `export const ${f} = 0; // edited\n`);
      fs.utimesSync(abs, future, future);
    }
    const r = checkStaleness(root, { sampleCap: 1 });
    expect(r.stale_count).toBe(2); // true count preserved
    expect(r.stale_files_sample).toHaveLength(1); // sample capped
  });
});

describe('checkStaleness — graceful degradation', () => {
  it('manifest ABSENT -> basis:manifest-absent, never throws', () => {
    const root = makeProject();
    fs.rmSync(path.join(root, '.coderef', 'manifest.json'));
    const r = checkStaleness(root);
    expect(r.basis).toBe('manifest-absent');
    // fresh project: nothing newer than graph.json (written last) -> not stale.
    expect(r.stale).toBe(false);
  });

  it('manifest absent + a newer source file -> mtime heuristic flags stale', () => {
    const root = makeProject();
    fs.rmSync(path.join(root, '.coderef', 'manifest.json'));
    const aAbs = path.join(root, 'src', 'a.ts');
    const future = new Date(Date.now() + 120_000);
    fs.writeFileSync(aAbs, 'export const a = 2;\n');
    fs.utimesSync(aAbs, future, future);
    const r = checkStaleness(root);
    expect(r.basis).toBe('manifest-absent');
    expect(r.stale).toBe(true);
    expect(r.hint).toMatch(/reindex/i);
  });
});

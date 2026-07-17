/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability staleness-manifest-test
 */

/**
 * Pure tests for the scan-time file-hash manifest builder + comparator
 * (buildManifest / diffManifest) — WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001
 * Phase 8. These pin the PURE half in isolation from any I/O:
 *  - DETERMINISM: identical inputs -> byte-identical manifest (sorted keys).
 *  - the builder skips unreadable files (hashOf -> undefined) rather than failing.
 *  - diffManifest partitions manifest files into stale / missing / fresh purely
 *    from already-computed current hashes (the fast-path lives in the checker).
 *  - HASH is the authority: a same-hash file is fresh; a changed hash is stale.
 */

import { describe, it, expect } from 'vitest';
import {
  buildManifest,
  diffManifest,
  STALENESS_MANIFEST_VERSION,
  type ManifestSourceFile,
} from '../../src/pipeline/staleness-manifest.js';

const FILES: ManifestSourceFile[] = [
  { path: 'src/b.ts', size: 20 },
  { path: 'src/a.ts', size: 10 },
];
// A deterministic fake hash: "h:" + path, so the manifest content is predictable.
const fakeHash = (p: string) => `h:${p}`;
const BUILT_AT = '2026-07-17T00:00:00.000Z';

describe('buildManifest — pure, deterministic', () => {
  it('emits the version + injected builtAt + a sorted file map', () => {
    const m = buildManifest(FILES, fakeHash, BUILT_AT);
    expect(m.version).toBe(STALENESS_MANIFEST_VERSION);
    expect(m.builtAt).toBe(BUILT_AT);
    // keys sorted regardless of input order
    expect(Object.keys(m.files)).toEqual(['src/a.ts', 'src/b.ts']);
    expect(m.files['src/a.ts']).toEqual({ sha256: 'h:src/a.ts', size: 10 });
    expect(m.files['src/b.ts']).toEqual({ sha256: 'h:src/b.ts', size: 20 });
  });

  it('identical inputs yield a byte-identical serialized manifest', () => {
    const a = JSON.stringify(buildManifest(FILES, fakeHash, BUILT_AT));
    const b = JSON.stringify(buildManifest([...FILES].reverse(), fakeHash, BUILT_AT));
    expect(a).toBe(b); // dedup+sort makes order irrelevant
  });

  it('skips a file whose hashOf returns undefined (unreadable at build) — no entry, no throw', () => {
    const hashOf = (p: string) => (p === 'src/a.ts' ? undefined : `h:${p}`);
    const m = buildManifest(FILES, hashOf, BUILT_AT);
    expect(Object.keys(m.files)).toEqual(['src/b.ts']);
  });

  it('dedups duplicate paths deterministically (first occurrence wins)', () => {
    const dup: ManifestSourceFile[] = [
      { path: 'src/a.ts', size: 10 },
      { path: 'src/a.ts', size: 999 },
    ];
    const m = buildManifest(dup, fakeHash, BUILT_AT);
    expect(m.files['src/a.ts'].size).toBe(10);
  });
});

describe('diffManifest — pure partition (hash authority)', () => {
  const manifest = buildManifest(FILES, fakeHash, BUILT_AT);

  it('all current hashes equal -> nothing stale, everything checked', () => {
    const d = diffManifest(manifest, { 'src/a.ts': 'h:src/a.ts', 'src/b.ts': 'h:src/b.ts' });
    expect(d.staleCount).toBe(0);
    expect(d.staleFiles).toEqual([]);
    expect(d.checked).toBe(2);
    expect(d.missingFiles).toEqual([]);
  });

  it('a changed hash is stale; the sorted staleFiles + count reflect it', () => {
    const d = diffManifest(manifest, { 'src/a.ts': 'CHANGED', 'src/b.ts': 'h:src/b.ts' });
    expect(d.staleCount).toBe(1);
    expect(d.staleFiles).toEqual(['src/a.ts']);
    expect(d.checked).toBe(2);
  });

  it('an absent current hash is MISSING (deleted/unreadable), not stale', () => {
    const d = diffManifest(manifest, { 'src/a.ts': 'h:src/a.ts', 'src/b.ts': undefined });
    expect(d.staleCount).toBe(0);
    expect(d.missingFiles).toEqual(['src/b.ts']);
    expect(d.checked).toBe(1);
  });

  it('output lists are sorted for byte-stable results', () => {
    const many = buildManifest(
      [{ path: 'z.ts', size: 1 }, { path: 'a.ts', size: 1 }, { path: 'm.ts', size: 1 }],
      fakeHash,
      BUILT_AT,
    );
    const d = diffManifest(many, { 'z.ts': 'X', 'a.ts': 'X', 'm.ts': 'X' });
    expect(d.staleFiles).toEqual(['a.ts', 'm.ts', 'z.ts']);
  });
});

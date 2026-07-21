/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability path-normalize-b3-coordinate-normalizer-test
 */

/**
 * Unit coverage for the B-3 SCIP path-coordinate normalizer
 * (WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 Phase 2, STUB-BQQJSY).
 *
 * The overlay's co-location key is `${toRepoRelativePosix(file, projectPath)}:line`.
 * If an ABSOLUTE graph `sourceLocation.file` and a repo-RELATIVE SCIP
 * `document.relativePath` for the SAME source line do not collapse to the same
 * key, the overlay silently flips nothing (the P2 delta_ratio>1 artifact). These
 * tests pin the collapse: the two path forms that name the same file must be
 * byte-identical after normalization.
 */

import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { normalizeSlashes, toRepoRelativePosix } from '../../src/utils/path-normalize.js';

describe('normalizeSlashes', () => {
  it('flips backslashes to forward slashes', () => {
    expect(normalizeSlashes('src\\pipeline\\x.ts')).toBe('src/pipeline/x.ts');
  });

  it('is idempotent on an already-posix path', () => {
    expect(normalizeSlashes('src/pipeline/x.ts')).toBe('src/pipeline/x.ts');
  });

  it('does not relativize or lower-case', () => {
    expect(normalizeSlashes('C:\\Repo\\Src\\X.ts')).toBe('C:/Repo/Src/X.ts');
  });
});

describe('toRepoRelativePosix — B-3 co-location key normalizer', () => {
  it('relativizes an absolute path under projectPath to repo-relative posix', () => {
    const root = path.join('C:', 'Users', 'x', 'repo');
    const abs = path.join(root, 'src', 'pipeline', 'x.ts');
    expect(toRepoRelativePosix(abs, root)).toBe('src/pipeline/x.ts');
  });

  it('collapses the absolute graph form and the relative SCIP form onto ONE key', () => {
    // This is THE overlay invariant: graph edges carry an absolute
    // sourceLocation.file; SCIP documents carry a repo-relative relativePath
    // with the indexer's native separator. Both must produce the same key.
    const root = path.join('C:', 'Users', 'x', 'repo');
    const graphAbsolute = path.join(root, 'src', 'pipeline', 'x.ts');
    const scipRelativeNativeSep = ['src', 'pipeline', 'x.ts'].join(path.sep);

    const graphKey = toRepoRelativePosix(graphAbsolute, root);
    const scipKey = toRepoRelativePosix(scipRelativeNativeSep, root);

    expect(graphKey).toBe(scipKey);
    expect(graphKey).toBe('src/pipeline/x.ts');
  });

  it('flips separators on a repo-relative path even without projectPath', () => {
    expect(toRepoRelativePosix('src\\pipeline\\x.ts')).toBe('src/pipeline/x.ts');
  });

  it('strips a leading ./ from a relative path', () => {
    expect(toRepoRelativePosix('./src/pipeline/x.ts')).toBe('src/pipeline/x.ts');
  });

  it('leaves an absolute path OUTSIDE projectPath un-relativized (slash-flipped only)', () => {
    const root = path.join('C:', 'Users', 'x', 'repo');
    const outside = path.join('C:', 'Users', 'x', 'other', 'y.ts');
    // Not under root → keeps the (slash-flipped) original; it is not an in-repo
    // key, so it simply will not match a graph edge — which is correct.
    const out = toRepoRelativePosix(outside, root);
    expect(out).toBe(normalizeSlashes(outside));
    expect(out.startsWith('..')).toBe(false);
  });

  it('returns the input slash-flipped when projectPath is omitted', () => {
    expect(toRepoRelativePosix('C:\\a\\b.ts')).toBe('C:/a/b.ts');
  });
});

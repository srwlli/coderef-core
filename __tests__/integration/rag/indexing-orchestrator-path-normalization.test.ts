import { describe, expect, it } from 'vitest';
import * as path from 'path';
import { normalizeChunkFileForGraphJoin } from '../../../src/integration/rag/indexing-orchestrator.js';

// WO-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001 — phase 3 unit test.
// normalizeChunkFileForGraphJoin reduces all 4 chunk-file path shapes
// to the relative-POSIX form that .coderef/graph.json node.file uses,
// so the facet enrichment join in indexCodebase succeeds. The fixture
// covers the 4 shapes called out by STUB-INDEXING-ORCHESTRATOR-PATH-
// NORMALIZATION-001: abs-Win backslash, abs-POSIX, file: URI + abs Win,
// and file: URI + abs POSIX. Each shape MUST collapse to the same
// relative-POSIX key.

const basePath = path.resolve('C:/projects/coderef-core').replace(/\\/g, path.sep);

describe('WO-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001 — normalizeChunkFileForGraphJoin', () => {
  const absWin = path.join(basePath, 'index.ts');
  const absPosix = absWin.replace(/\\/g, '/');
  const absBackslash = absPosix.replace(/\//g, '\\');

  const cases: Array<{ name: string; input: string; expected: string }> = [
    { name: 'absolute Windows backslash', input: absBackslash, expected: 'index.ts' },
    { name: 'absolute POSIX', input: absPosix, expected: 'index.ts' },
    { name: 'file: URI + abs Windows backslash', input: 'file:' + absBackslash, expected: 'index.ts' },
    { name: 'file: URI + abs POSIX', input: 'file:' + absPosix, expected: 'index.ts' },
  ];

  for (const c of cases) {
    it(`reduces ${c.name} to relative-POSIX`, () => {
      const out = normalizeChunkFileForGraphJoin(c.input, basePath);
      expect(out, c.name).toBe(c.expected);
    });
  }

  it('passes through already-relative POSIX paths unchanged', () => {
    expect(normalizeChunkFileForGraphJoin('src/lib/util.ts', basePath)).toBe('src/lib/util.ts');
  });

  it('normalizes already-relative Windows-backslash paths to POSIX', () => {
    expect(normalizeChunkFileForGraphJoin('src\\lib\\util.ts', basePath)).toBe('src/lib/util.ts');
  });

  it('handles basePath="." (the rag-index --dir . shape)', () => {
    const cwdAbs = path.resolve('.').replace(/\\/g, '/');
    const cwdAbsBackslash = cwdAbs.replace(/\//g, '\\');
    expect(
      normalizeChunkFileForGraphJoin(cwdAbsBackslash + '\\index.ts', '.'),
    ).toBe('index.ts');
    expect(
      normalizeChunkFileForGraphJoin('file:' + cwdAbs + '/index.ts', '.'),
    ).toBe('index.ts');
  });

  it('reduces nested files to nested relative-POSIX', () => {
    const nestedWin = path.join(basePath, 'src', 'lib', 'util.ts');
    const nestedAbsBackslash = nestedWin.replace(/\//g, '\\');
    expect(normalizeChunkFileForGraphJoin(nestedAbsBackslash, basePath)).toBe(
      'src/lib/util.ts',
    );
    expect(
      normalizeChunkFileForGraphJoin('file:' + nestedWin.replace(/\\/g, '/'), basePath),
    ).toBe('src/lib/util.ts');
  });
});

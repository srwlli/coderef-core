/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability stamp-on-write-header-enforcement-test
 */

/**
 * Tests for the P3 stamp-on-write enforcement backend
 * (scripts/check-header-coverage.mjs), WO-RAG-HEADER-COVERAGE-ENFORCE-AND-
 * SURFACE-001. The CLI wrapper is git/fs-coupled, but the core logic is pure
 * and injected with a readFn — these tests lock that logic.
 */

import { describe, it, expect } from 'vitest';
import {
  hasSemanticHeader,
  isEnforceableSourceFile,
  checkFilesForHeaders,
  // @ts-expect-error — .mjs sibling without types; runtime export is fine.
} from '../scripts/check-header-coverage.mjs';

describe('hasSemanticHeader', () => {
  it('detects a block-comment header', () => {
    expect(hasSemanticHeader('/**\n * @coderef-semantic: 1.0.0\n */')).toBe(true);
  });
  it('detects a line-comment header', () => {
    expect(hasSemanticHeader('// @coderef-semantic: 1.0.0 @layer cli')).toBe(true);
  });
  it('rejects a file with no header', () => {
    expect(hasSemanticHeader('export const x = 1;')).toBe(false);
  });
  it('rejects a string-literal mention without the space (test-fixture form)', () => {
    expect(hasSemanticHeader('const s = "@coderef-semantic:1.0.0";')).toBe(false);
  });
});

describe('isEnforceableSourceFile', () => {
  it('accepts .ts/.tsx/.js source', () => {
    expect(isEnforceableSourceFile('src/foo.ts')).toBe(true);
    expect(isEnforceableSourceFile('src/foo.tsx')).toBe(true);
    expect(isEnforceableSourceFile('src/foo.js')).toBe(true);
  });
  it('skips .d.ts, tests, dist, node_modules, and non-source', () => {
    expect(isEnforceableSourceFile('src/foo.d.ts')).toBe(false);
    expect(isEnforceableSourceFile('src/foo.test.ts')).toBe(false);
    expect(isEnforceableSourceFile('src/__tests__/foo.ts')).toBe(false);
    expect(isEnforceableSourceFile('dist/foo.js')).toBe(false);
    expect(isEnforceableSourceFile('node_modules/x/foo.js')).toBe(false);
    expect(isEnforceableSourceFile('README.md')).toBe(false);
  });
  it('normalizes windows backslashes', () => {
    expect(isEnforceableSourceFile('src\\__tests__\\foo.ts')).toBe(false);
    expect(isEnforceableSourceFile('src\\foo.ts')).toBe(true);
  });
});

describe('checkFilesForHeaders', () => {
  const fakeFs = (map: Record<string, string>) => (f: string) => {
    if (!(f in map)) throw new Error('ENOENT');
    return map[f];
  };

  it('flags only enforceable source files that lack a header', () => {
    const files = [
      'src/has.ts',
      'src/missing.ts',
      'src/foo.test.ts', // skipped (test)
      'README.md', // skipped (non-source)
    ];
    const fs = fakeFs({
      'src/has.ts': '/**\n * @coderef-semantic: 1.0.0\n */\nexport const a = 1;',
      'src/missing.ts': 'export const b = 2;',
      'src/foo.test.ts': 'export const c = 3;',
      'README.md': '# hi',
    });
    const { checked, missing } = checkFilesForHeaders(files, fs);
    expect(checked).toEqual(['src/has.ts', 'src/missing.ts']);
    expect(missing).toEqual(['src/missing.ts']);
  });

  it('returns no misses when every source file is covered', () => {
    const files = ['src/a.ts', 'src/b.ts'];
    const fs = fakeFs({
      'src/a.ts': '// @coderef-semantic: 1.0.0 @layer cli\nexport const a = 1;',
      'src/b.ts': '/**\n * @coderef-semantic: 1.0.0\n */',
    });
    const { missing } = checkFilesForHeaders(files, fs);
    expect(missing).toEqual([]);
  });

  it('skips unreadable (deleted/renamed) files rather than flagging them', () => {
    const files = ['src/gone.ts'];
    const fs = fakeFs({}); // every read throws
    const { checked, missing } = checkFilesForHeaders(files, fs);
    expect(checked).toEqual(['src/gone.ts']);
    expect(missing).toEqual([]);
  });
});

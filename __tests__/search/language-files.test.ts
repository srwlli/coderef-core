/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability ast-search-not-searched-visibility-tests
 */

/**
 * listLanguageFilesOnDisk tests (WO-...-GENRE-FEATURES-PROGRAM-001 Phase 4,
 * REC-002). The walker is the one impure edge that enumerates on-disk language
 * files so ast_search can surface files_skipped_no_index. Exercised against a
 * real temp directory tree.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { listLanguageFilesOnDisk } from '../../src/search/language-files.js';

let root: string;

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-langfiles-'));
  // Source files of several extensions.
  fs.writeFileSync(path.join(root, 'a.ts'), 'const a = 1;');
  fs.writeFileSync(path.join(root, 'b.ts'), 'const b = 2;');
  fs.writeFileSync(path.join(root, 'c.js'), 'const c = 3;');
  // Nested source.
  fs.mkdirSync(path.join(root, 'sub'), { recursive: true });
  fs.writeFileSync(path.join(root, 'sub', 'd.ts'), 'const d = 4;');
  // Files inside skipped directories must NOT be counted.
  fs.mkdirSync(path.join(root, 'node_modules', 'pkg'), { recursive: true });
  fs.writeFileSync(path.join(root, 'node_modules', 'pkg', 'vendored.ts'), 'export {};');
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist', 'built.ts'), 'export {};');
});

afterAll(() => {
  try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best-effort */ }
});

describe('listLanguageFilesOnDisk', () => {
  it('lists all files of the requested extension, recursively', () => {
    const ts = listLanguageFilesOnDisk(root, 'ts').sort();
    expect(ts).toEqual(['a.ts', 'b.ts', 'sub/d.ts']);
  });

  it('returns forward-slash relative paths (matches index.json path form)', () => {
    const ts = listLanguageFilesOnDisk(root, 'ts');
    expect(ts).toContain('sub/d.ts');
    expect(ts.every(p => !p.includes('\\'))).toBe(true);
    expect(ts.every(p => !path.isAbsolute(p))).toBe(true);
  });

  it('skips node_modules / dist and other heavy dirs', () => {
    const ts = listLanguageFilesOnDisk(root, 'ts');
    expect(ts).not.toContain('node_modules/pkg/vendored.ts');
    expect(ts).not.toContain('dist/built.ts');
  });

  it('filters by exact extension (js is not ts)', () => {
    expect(listLanguageFilesOnDisk(root, 'js')).toEqual(['c.js']);
  });

  it('never throws on a missing root — returns empty (best-effort)', () => {
    expect(listLanguageFilesOnDisk(path.join(root, 'does-not-exist'), 'ts')).toEqual([]);
  });
});

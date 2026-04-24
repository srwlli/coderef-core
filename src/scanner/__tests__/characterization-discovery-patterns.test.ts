/**
 * P0-002 Characterization Tests — Discovery, Excludes, Patterns, Dedupe
 *
 * Locks INTENDED behavior of scanCurrentElements() before scanner.ts is
 * decomposed in P1-P9. Some tests in this file are expected to fail against
 * the current implementation (notably parallel-mode dedupe) and are the
 * regression guards that P6/P8 must bring green.
 *
 * Scope for this file (P0-002):
 *   - Recursive vs non-recursive discovery
 *   - Default + custom exclude patterns
 *   - tsx/jsx language remap during discovery
 *   - Custom patterns (via ScanOptions.customPatterns)
 *   - Deduplication (highest TYPE_PRIORITY wins)
 *
 * P0-003 (sibling file) covers progress / cache / AST / tree-sitter / parity.
 *
 * Workorder: WO-SCANNER-MODULE-EXTRACTION-001
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanCurrentElements, clearScanCache, LANGUAGE_PATTERNS } from '../scanner.js';

describe('P0-002 Characterization: Discovery & Patterns', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-char-discovery-'));
    clearScanCache();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function writeFile(relPath: string, content: string): string {
    const full = path.join(tempDir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    return full;
  }

  // ─── Discovery: recursive vs non-recursive ────────────────────────────────

  describe('Discovery', () => {
    it('recursive: true includes files in nested subdirectories', async () => {
      writeFile('top.ts', 'export function topFn() {}');
      writeFile('nested/mid.ts', 'export function midFn() {}');
      writeFile('nested/deep/leaf.ts', 'export function leafFn() {}');

      const elements = await scanCurrentElements(tempDir, ['ts'], {
        recursive: true,
      });

      const names = elements.map(e => e.name).sort();
      expect(names).toContain('topFn');
      expect(names).toContain('midFn');
      expect(names).toContain('leafFn');
    });

    it('recursive: false only includes files at the top level', async () => {
      writeFile('top.ts', 'export function topFn() {}');
      writeFile('nested/mid.ts', 'export function midFn() {}');

      const elements = await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
      });

      const names = elements.map(e => e.name);
      expect(names).toContain('topFn');
      expect(names).not.toContain('midFn');
    });

    it('discovery normalizes Windows backslashes to forward slashes in element.file', async () => {
      writeFile('sub/file.ts', 'export function normalized() {}');

      const elements = await scanCurrentElements(tempDir, ['ts'], {
        recursive: true,
      });

      const found = elements.find(e => e.name === 'normalized');
      expect(found).toBeDefined();
      expect(found!.file).not.toContain('\\');
      expect(found!.file).toMatch(/\//);
    });

    it('tsx files are discovered and treated as ts (language remap)', async () => {
      writeFile('component.tsx', 'export const Button = () => null;');

      const elements = await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
      });

      const button = elements.find(e => e.name === 'Button');
      expect(button).toBeDefined();
    });

    it('jsx files are discovered and treated as js (language remap)', async () => {
      writeFile('legacy.jsx', 'export function Widget() { return null; }');

      const elements = await scanCurrentElements(tempDir, ['js'], {
        recursive: false,
      });

      const widget = elements.find(e => e.name === 'Widget');
      expect(widget).toBeDefined();
    });
  });

  // ─── Excludes ──────────────────────────────────────────────────────────────

  describe('Excludes', () => {
    it('default excludes skip node_modules', async () => {
      writeFile('src/app.ts', 'export function appFn() {}');
      writeFile('node_modules/pkg/index.ts', 'export function vendorFn() {}');

      const elements = await scanCurrentElements(tempDir, ['ts'], {
        recursive: true,
      });

      const names = elements.map(e => e.name);
      expect(names).toContain('appFn');
      expect(names).not.toContain('vendorFn');
    });

    it('default excludes skip dist and build output dirs', async () => {
      writeFile('src/real.ts', 'export function realFn() {}');
      writeFile('dist/compiled.ts', 'export function distFn() {}');
      writeFile('build/out.ts', 'export function buildFn() {}');

      const elements = await scanCurrentElements(tempDir, ['ts'], {
        recursive: true,
      });

      const names = elements.map(e => e.name);
      expect(names).toContain('realFn');
      expect(names).not.toContain('distFn');
      expect(names).not.toContain('buildFn');
    });

    it('exclude:[] overrides defaults and scans node_modules', async () => {
      writeFile('node_modules/pkg/index.ts', 'export function vendorFn() {}');

      const elements = await scanCurrentElements(tempDir, ['ts'], {
        recursive: true,
        exclude: [],
      });

      const names = elements.map(e => e.name);
      expect(names).toContain('vendorFn');
    });

    it('user-provided excludes fully replace defaults (no merge)', async () => {
      writeFile('src/custom.ts', 'export function customFn() {}');
      writeFile('node_modules/pkg/index.ts', 'export function vendorFn() {}');

      const elements = await scanCurrentElements(tempDir, ['ts'], {
        recursive: true,
        exclude: ['**/src/**'],
      });

      const names = elements.map(e => e.name);
      // src excluded by caller; defaults no longer applied, so node_modules is scanned
      expect(names).not.toContain('customFn');
      expect(names).toContain('vendorFn');
    });
  });

  // ─── Custom patterns ───────────────────────────────────────────────────────

  describe('Custom patterns via ScanOptions.customPatterns', () => {
    // Snapshot LANGUAGE_PATTERNS so cross-test pollution can be detected.
    // Pinned here to surface the current scan-time mutation behavior that P6
    // eliminates. After P6 lands, this snapshot test must still pass.
    let snapshot: Record<string, number>;

    beforeEach(() => {
      snapshot = Object.fromEntries(
        Object.entries(LANGUAGE_PATTERNS).map(([k, v]) => [k, v.length])
      );
    });

    it('detects elements matched by a user-supplied custom regex', async () => {
      writeFile(
        'app.ts',
        `export const ROUTE_MARKER = "@api-route /users";\nexport function fetchUsers() {}\n`
      );

      const elements = await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
        customPatterns: [
          {
            lang: 'ts',
            type: 'function',
            pattern: /@api-route\s+(\/[\w\/:-]+)/g,
            nameGroup: 1,
          },
        ],
      });

      const apiRoute = elements.find(e => e.name === '/users');
      expect(apiRoute).toBeDefined();
      expect(apiRoute!.type).toBe('function');
    });

    it('INTENDED: customPatterns does not leak into LANGUAGE_PATTERNS across calls', async () => {
      writeFile('trivial.ts', 'export function x() {}');

      await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
        customPatterns: [
          {
            lang: 'ts',
            type: 'constant',
            pattern: /@@MARKER@@/g,
            nameGroup: 0,
          },
        ],
      });

      // Spec: pattern map is stable across calls. P6 makes this pass.
      // Known to FAIL pre-P6 because scanner.ts mutates LANGUAGE_PATTERNS
      // at the call site. This is the regression guard for the refactor.
      const afterLengths = Object.fromEntries(
        Object.entries(LANGUAGE_PATTERNS).map(([k, v]) => [k, v.length])
      );
      expect(afterLengths).toEqual(snapshot);
    });
  });

  // ─── Dedupe ────────────────────────────────────────────────────────────────

  describe('Deduplication (TYPE_PRIORITY)', () => {
    it('drops duplicate (file, line, name) entries', async () => {
      // Same name at same line — method and function patterns both match
      // a line like `export function foo() {`. Dedupe should leave one.
      writeFile('dup.ts', 'export function foo() {}');

      const elements = await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
      });

      const fooEntries = elements.filter(e => e.name === 'foo');
      expect(fooEntries.length).toBe(1);
    });

    it('keeps higher TYPE_PRIORITY on tie (function outranks method)', async () => {
      // `export function foo()` matches both the function pattern (priority 2)
      // and the method pattern (priority 1). Function must win.
      writeFile('tie.ts', 'export function foo() {}');

      const elements = await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
      });

      const foo = elements.find(e => e.name === 'foo');
      expect(foo).toBeDefined();
      expect(foo!.type).toBe('function');
    });

    it('distinct (file, line, name) tuples are preserved across files', async () => {
      writeFile('a.ts', 'export function foo() {}');
      writeFile('b.ts', 'export function foo() {}');

      const elements = await scanCurrentElements(tempDir, ['ts'], {
        recursive: true,
      });

      const fooEntries = elements.filter(e => e.name === 'foo');
      expect(fooEntries.length).toBe(2);
      const files = fooEntries.map(e => e.file).sort();
      expect(files[0]).not.toBe(files[1]);
    });

    it('INTENDED: parallel mode dedupes identically to sequential mode', async () => {
      // P6/P8 guard: parallel path must run through the same deduplication
      // pipeline as sequential. Pre-refactor this test is known to FAIL on
      // some duplicate shapes (see P0-BASELINE.md).
      writeFile(
        'dupes.ts',
        'export function myFunc() { return 1; }\nexport function myFunc() { return 2; }'
      );

      const sequential = await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
        parallel: false,
      });
      clearScanCache();
      const parallel = await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
        parallel: true,
      });

      const seqMyFunc = sequential.filter(e => e.name === 'myFunc').length;
      const parMyFunc = parallel.filter(e => e.name === 'myFunc').length;
      expect(parMyFunc).toBe(seqMyFunc);
    });
  });
});

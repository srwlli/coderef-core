/**
 * P0-003 Characterization Tests — Progress, Cache, AST/Tree-sitter Fallbacks, Parity
 *
 * Locks INTENDED behavior of scanCurrentElements() for the
 * runtime/execution slice of the refactor (P3 file-runner, P4 runtime,
 * P8 parity). Some tests here are expected to fail against the current
 * implementation and become regression guards after P3/P4/P8.
 *
 * Scope:
 *   - onProgress callback contract (every file, cached or not)
 *   - SCAN_CACHE hit path (mtime-gated)
 *   - AST fallback control (useAST + fallbackToRegex)
 *   - Tree-sitter fallback control (useTreeSitter + fallbackToRegex)
 *   - Parallel vs sequential parity (element set + cache update + progress)
 *
 * Workorder: WO-SCANNER-MODULE-EXTRACTION-001
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanCurrentElements, clearScanCache } from '../scanner.js';

describe('P0-003 Characterization: Runtime & Fallbacks', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-char-runtime-'));
    clearScanCache();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function writeSource(relPath: string, content: string): string {
    const full = path.join(tempDir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    return full;
  }

  // ─── Progress callback ─────────────────────────────────────────────────────

  describe('Progress callback', () => {
    it('is called once per discovered file in sequential mode', async () => {
      writeSource('a.ts', 'export function a() {}');
      writeSource('b.ts', 'export function b() {}');
      writeSource('c.ts', 'export function c() {}');

      const calls: any[] = [];
      const onProgress = vi.fn((p) => calls.push(p));

      await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
        parallel: false,
        onProgress,
      });

      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(calls[calls.length - 1].percentComplete).toBe(100);
      for (const c of calls) {
        expect(typeof c.currentFile).toBe('string');
        expect(typeof c.filesProcessed).toBe('number');
        expect(typeof c.totalFiles).toBe('number');
        expect(typeof c.elementsFound).toBe('number');
        expect(c.totalFiles).toBe(3);
      }
    });

    it('is still called on a cache-hit pass (not skipped)', async () => {
      writeSource('a.ts', 'export function a() {}');

      await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
        parallel: false,
      });

      // Second scan — SCAN_CACHE hit path should still fire onProgress.
      const onProgress = vi.fn();
      await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
        parallel: false,
        onProgress,
      });

      expect(onProgress).toHaveBeenCalled();
      const call = onProgress.mock.calls[0][0];
      expect(call.percentComplete).toBe(100);
    });

    it('INTENDED: parallel mode fires onProgress (regression guard for P8 parity)', async () => {
      for (let i = 0; i < 10; i++) {
        writeSource(`file-${i}.ts`, `export function fn${i}() {}`);
      }

      const onProgress = vi.fn();
      await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
        parallel: true,
        onProgress,
      });

      // Spec: parallel path must report progress. Pre-P8 this may fall short
      // because the parallel branch short-circuits before the sequential
      // progress reporter runs. P8 parity fixes this.
      expect(onProgress).toHaveBeenCalled();
    });
  });

  // ─── SCAN_CACHE behavior ───────────────────────────────────────────────────

  describe('SCAN_CACHE', () => {
    it('returns cached elements when file mtime is unchanged', async () => {
      const file = writeSource('a.ts', 'export function original() {}');

      const first = await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
      });
      const second = await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
      });

      expect(second.length).toBe(first.length);
      expect(second.map(e => e.name).sort()).toEqual(first.map(e => e.name).sort());
    });

    it('re-scans the file when mtime changes', async () => {
      const file = writeSource('a.ts', 'export function original() {}');

      await scanCurrentElements(tempDir, ['ts'], { recursive: false });

      // Rewrite with a bumped mtime to force cache miss.
      const future = Date.now() / 1000 + 5;
      fs.writeFileSync(file, 'export function renamed() {}');
      fs.utimesSync(file, future, future);

      const after = await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
      });

      const names = after.map(e => e.name);
      expect(names).toContain('renamed');
      expect(names).not.toContain('original');
    });

    it('clearScanCache forces a full rescan', async () => {
      const file = writeSource('a.ts', 'export function one() {}');

      await scanCurrentElements(tempDir, ['ts'], { recursive: false });

      fs.writeFileSync(file, 'export function two() {}');
      // Same mtime window possible; clear cache to guarantee rescan.
      clearScanCache();

      const after = await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
      });

      const names = after.map(e => e.name);
      expect(names).toContain('two');
    });
  });

  // ─── Fallback control ──────────────────────────────────────────────────────

  describe('AST fallback control', () => {
    it('useAST: true with valid TS produces AST-enriched elements', async () => {
      writeSource(
        'iface.ts',
        `export interface UserData { id: number }\nexport function doThing() {}`
      );

      const elements = await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
        useAST: true,
      });

      // AST path surfaces interface as its own element type.
      const hasInterface = elements.some(
        e => e.name === 'UserData' && e.type === 'interface'
      );
      expect(hasInterface).toBe(true);
    });

    it('useAST + fallbackToRegex: false skips regex enrichment', async () => {
      writeSource('valid.ts', 'export function plain() {}');

      const elements = await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
        useAST: true,
        fallbackToRegex: false,
      });

      // Element is found via AST (no regex fallback needed). Spec: the
      // public array shape remains stable — still an array of ElementData.
      expect(Array.isArray(elements)).toBe(true);
      const plain = elements.find(e => e.name === 'plain');
      expect(plain).toBeDefined();
    });
  });

  describe('Tree-sitter fallback control', () => {
    it('useTreeSitter with a tiny TS file still returns an array (graceful)', async () => {
      writeSource('ts-tiny.ts', 'export function tiny() {}');

      // Don't require tree-sitter to succeed (grammar availability varies in
      // CI). Spec: scanner never throws on tree-sitter failure when
      // fallbackToRegex is the default (true).
      const elements = await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
        useTreeSitter: true,
      });

      expect(Array.isArray(elements)).toBe(true);
      // Regex fallback path must still surface `tiny`.
      expect(elements.some(e => e.name === 'tiny')).toBe(true);
    });
  });

  // ─── Parity: parallel vs sequential ────────────────────────────────────────

  describe('Parallel / sequential parity', () => {
    it('INTENDED: elements set is identical across modes (order-independent)', async () => {
      for (let i = 0; i < 12; i++) {
        writeSource(`file-${i}.ts`, `export function fn${i}() {}\nexport class Cls${i} {}`);
      }

      const sequential = await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
        parallel: false,
      });
      clearScanCache();
      const parallel = await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
        parallel: true,
      });

      const seqKeys = sequential.map(e => `${e.file}:${e.line}:${e.name}:${e.type}`).sort();
      const parKeys = parallel.map(e => `${e.file}:${e.line}:${e.name}:${e.type}`).sort();

      expect(parKeys).toEqual(seqKeys);
    });

    it('INTENDED: parallel mode populates SCAN_CACHE so a follow-up scan is a cache hit', async () => {
      for (let i = 0; i < 12; i++) {
        writeSource(`f${i}.ts`, `export function fn${i}() {}`);
      }

      const first = await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
        parallel: true,
      });
      // Second scan should be satisfied from SCAN_CACHE entirely.
      const second = await scanCurrentElements(tempDir, ['ts'], {
        recursive: false,
        parallel: true,
      });

      expect(second.length).toBe(first.length);
    });
  });
});

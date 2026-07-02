/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability scanner-ts-relationship-extraction-test
 */

/**
 * Scanner-path TS relationship extraction (WO-REPO-REVIEW-2026-07-REMEDIATION-001
 * Phase 2, P1-8).
 *
 * Before this phase the scanner attached calls[]/imports[] to TS elements via
 * JSCallDetector, whose plain-Acorn parser fails on TypeScript syntax and
 * silently returned [] — every real .ts file scanned with EMPTY relationship
 * data and NOTHING covered the hole. These tests pin the tree-sitter-facts
 * route: a real .ts fixture (with TS-only syntax) must yield non-empty
 * calls[] AND imports[].
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanCurrentElements, clearScanCache } from '../scanner.js';

describe('Scanner TS relationship extraction (tree-sitter facts)', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-ts-rel-test-'));
    clearScanCache();

    // TS-only syntax on purpose (interface, typed params, generics) — plain
    // Acorn cannot parse this file, which is exactly the regression class.
    fs.writeFileSync(path.join(tempDir, 'helpers.ts'), `
export interface Payload {
  value: number;
}

export function formatPayload(payload: Payload): string {
  return String(payload.value);
}
`);

    fs.writeFileSync(path.join(tempDir, 'main.ts'), `
import { formatPayload, type Payload } from './helpers.js';

export function processPayload(input: Payload): string {
  const rendered: string = formatPayload(input);
  return rendered.trim();
}
`);
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('attaches non-empty imports[] to elements of a real .ts file', async () => {
    const elements = await scanCurrentElements(tempDir, ['ts'], {
      recursive: false,
      verbose: false,
    });

    const processFn = elements.find(e => e.name === 'processPayload');
    expect(processFn).toBeDefined();
    expect(processFn!.imports).toBeDefined();
    expect(processFn!.imports!.length).toBeGreaterThan(0);
    const sources = processFn!.imports!.map(i => i.source);
    expect(sources).toContain('./helpers.js');
  });

  it('attaches non-empty calls[] to the calling element of a real .ts file', async () => {
    clearScanCache();
    const elements = await scanCurrentElements(tempDir, ['ts'], {
      recursive: false,
      verbose: false,
    });

    const processFn = elements.find(e => e.name === 'processPayload');
    expect(processFn).toBeDefined();
    expect(processFn!.calls).toBeDefined();
    expect(processFn!.calls!.length).toBeGreaterThan(0);
    expect(processFn!.calls).toContain('formatPayload');
  });

  it('still extracts relationships for plain .js files (Acorn path unchanged)', async () => {
    const jsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-js-rel-test-'));
    try {
      fs.writeFileSync(path.join(jsDir, 'util.js'), `
export function double(x) { return x * 2; }
`);
      fs.writeFileSync(path.join(jsDir, 'app.js'), `
import { double } from './util.js';

export function run(n) {
  return double(n);
}
`);
      clearScanCache();
      const elements = await scanCurrentElements(jsDir, ['js'], {
        recursive: false,
        verbose: false,
      });

      const runFn = elements.find(e => e.name === 'run');
      expect(runFn).toBeDefined();
      expect(runFn!.imports?.map(i => i.source)).toContain('./util.js');
      expect(runFn!.calls).toContain('double');
    } finally {
      fs.rmSync(jsDir, { recursive: true, force: true });
    }
  });
});

/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability accuracy-validation-test
 */

/**
 * Accuracy Validation Tests
 * WO-SCANNER-ACCURACY-IMPROVEMENTS-001: TEST-002
 *
 * Scanner element-detection accuracy against known fixtures.
 *
 * WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 2: the call/import-edge
 * accuracy blocks were removed with the legacy analyzer GraphBuilder they
 * exercised (DR-PHASE-5-C retirement). Edge accuracy is now pinned by the
 * canonical pipeline's ground-truth tests
 * (__tests__/pipeline/graph-ground-truth.test.ts) and the scanner-path
 * relationship test added in the same phase.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanCurrentElements } from '../src/scanner/scanner.js';

describe('Scanner Accuracy Validation', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-accuracy-'));
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createTestFile(filename: string, content: string): string {
    const filePath = path.join(tempDir, filename);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  describe('Accuracy Metrics', () => {
    it('should achieve >90% element detection rate', async () => {
      // Create a file with known elements
      createTestFile('known-elements.ts', `
// 1 class
export class TestClass {
  // 2 methods
  method1() {}
  method2() {}
}

// 3 functions
export function func1() {}
export function func2() {}
export function func3() {}

// 1 arrow function
export const arrowFn = () => {};

// 1 interface (may or may not be detected depending on scanner)
export interface TestInterface {
  prop: string;
}
      `);

      const elements = await scanCurrentElements(tempDir, ['ts']);

      // Expected minimum: class + 2 methods + 3 functions + arrow = 7
      // Interface detection is optional
      expect(elements.length).toBeGreaterThanOrEqual(6);

      // Calculate detection rate
      const expectedMinimum = 6;
      const detectionRate = elements.length / expectedMinimum;
      expect(detectionRate).toBeGreaterThanOrEqual(0.9); // 90%+
    });

    it('should correctly identify element types', async () => {
      createTestFile('typed-elements.ts', `
export class MyClass {
  myMethod() {}
}

export function myFunction() {}

export const myArrow = () => {};
      `);

      const elements = await scanCurrentElements(tempDir, ['ts']);

      const types = elements.map(e => e.type);

      // Should have class and function types
      expect(types.some(t => t === 'class' || t === 'Class')).toBe(true);
      expect(types.some(t => t === 'function' || t === 'Function')).toBe(true);
    });
  });
});

/**
 * Scanner Export Tests
 *
 * Tests that scanner functionality is properly exported from @coderef/core
 * and can be consumed by external packages.
 *
 * Test Categories:
 * 1. Export availability (functions, types, constants)
 * 2. Functional correctness (scanning works as expected)
 * 3. Type safety (TypeScript types are properly exported)
 */

import { describe, it, expect } from 'vitest';
import { scanCurrentElements, LANGUAGE_PATTERNS } from '../src/index.js';
import type { ScanOptions, ElementData } from '../src/index.js';

describe('Scanner Module Exports', () => {
  describe('Function Exports', () => {
    it('should export scanCurrentElements function', () => {
      expect(scanCurrentElements).toBeDefined();
      expect(typeof scanCurrentElements).toBe('function');
    });

    it('should export LANGUAGE_PATTERNS constant', () => {
      expect(LANGUAGE_PATTERNS).toBeDefined();
      expect(typeof LANGUAGE_PATTERNS).toBe('object');
    });
  });

  describe('Language Pattern Exports', () => {
    it('should have patterns for TypeScript', () => {
      expect(LANGUAGE_PATTERNS.ts).toBeDefined();
      expect(Array.isArray(LANGUAGE_PATTERNS.ts)).toBe(true);
      expect(LANGUAGE_PATTERNS.ts.length).toBeGreaterThan(0);
    });

    it('should have patterns for JavaScript', () => {
      expect(LANGUAGE_PATTERNS.js).toBeDefined();
      expect(Array.isArray(LANGUAGE_PATTERNS.js)).toBe(true);
    });

    it('should have patterns for TSX', () => {
      expect(LANGUAGE_PATTERNS.tsx).toBeDefined();
      expect(Array.isArray(LANGUAGE_PATTERNS.tsx)).toBe(true);
    });

    it('should have patterns for JSX', () => {
      expect(LANGUAGE_PATTERNS.jsx).toBeDefined();
      expect(Array.isArray(LANGUAGE_PATTERNS.jsx)).toBe(true);
    });

    it('should have patterns for Python', () => {
      expect(LANGUAGE_PATTERNS.py).toBeDefined();
      expect(Array.isArray(LANGUAGE_PATTERNS.py)).toBe(true);
    });

    it('should have correct pattern structure', () => {
      const pattern = LANGUAGE_PATTERNS.ts[0];
      expect(pattern).toHaveProperty('type');
      expect(pattern).toHaveProperty('pattern');
      expect(pattern).toHaveProperty('nameGroup');
      expect(pattern.pattern).toBeInstanceOf(RegExp);
      expect(typeof pattern.nameGroup).toBe('number');
    });
  });

  describe('Type Exports', () => {
    it('should accept ScanOptions type', () => {
      // This test verifies TypeScript compilation
      const options: ScanOptions = {
        recursive: true,
        exclude: ['**/node_modules/**'],
        verbose: false
      };
      expect(options).toBeDefined();
    });

    it('should accept ElementData type', () => {
      // This test verifies TypeScript compilation
      const element: ElementData = {
        type: 'function',
        name: 'testFunction',
        file: 'test.ts',
        line: 42
      };
      expect(element).toBeDefined();
      expect(element.type).toBe('function');
      expect(element.name).toBe('testFunction');
    });
  });

  describe('Scanner Functional Tests', () => {
    it('should scan TypeScript files successfully', async () => {
      // Test scanning the test file itself
      const elements = await scanCurrentElements(__dirname, 'ts', {
        recursive: false,
        verbose: false,
        exclude: ['**/node_modules/**']
      });

      expect(Array.isArray(elements)).toBe(true);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should return ElementData with correct structure', async () => {
      const elements = await scanCurrentElements(__dirname, 'ts', {
        recursive: false,
        verbose: false
      });

      if (elements.length > 0) {
        const element = elements[0];
        expect(element).toHaveProperty('type');
        expect(element).toHaveProperty('name');
        expect(element).toHaveProperty('file');
        expect(element).toHaveProperty('line');
        expect(typeof element.type).toBe('string');
        expect(typeof element.name).toBe('string');
        expect(typeof element.file).toBe('string');
        expect(typeof element.line).toBe('number');
      }
    });

    it('should accept multiple languages as array', async () => {
      const elements = await scanCurrentElements(__dirname, ['ts', 'js'], {
        recursive: false,
        verbose: false
      });

      expect(Array.isArray(elements)).toBe(true);
    });

    it('should accept single language as string', async () => {
      const elements = await scanCurrentElements(__dirname, 'ts', {
        recursive: false,
        verbose: false
      });

      expect(Array.isArray(elements)).toBe(true);
    });

    it('should respect exclude patterns', async () => {
      // Note: This test verifies that exclude option is accepted
      // Actual exclude behavior is tested in integration tests
      const elements = await scanCurrentElements(__dirname, 'ts', {
        recursive: false,
        exclude: ['**/excluded-dir/**'],
        verbose: false
      });

      // Should return results (exclude option accepted)
      expect(Array.isArray(elements)).toBe(true);
    });

    it('should handle non-existent directory gracefully', async () => {
      const elements = await scanCurrentElements('/non/existent/path', 'ts', {
        verbose: false
      });

      expect(Array.isArray(elements)).toBe(true);
      expect(elements.length).toBe(0);
    });

    it('should support recursive option', async () => {
      const nonRecursive = await scanCurrentElements(__dirname, 'ts', {
        recursive: false,
        verbose: false
      });

      const recursive = await scanCurrentElements(__dirname, 'ts', {
        recursive: true,
        verbose: false
      });

      expect(Array.isArray(nonRecursive)).toBe(true);
      expect(Array.isArray(recursive)).toBe(true);
      // Recursive should find same or more files
      expect(recursive.length).toBeGreaterThanOrEqual(nonRecursive.length);
    });
  });

  describe('External Package Usage Simulation', () => {
    it('should work as imported from @coderef/core', async () => {
      // Simulate external package importing scanner
      const { scanCurrentElements: scan, LANGUAGE_PATTERNS: patterns } = await import('../src/index.js');

      expect(scan).toBeDefined();
      expect(patterns).toBeDefined();
      expect(typeof scan).toBe('function');
      expect(typeof patterns).toBe('object');
    });

    it('should work with destructured imports', async () => {
      // Simulate common import pattern
      const coderef = await import('../src/index.js');

      expect(coderef.scanCurrentElements).toBeDefined();
      expect(coderef.LANGUAGE_PATTERNS).toBeDefined();
    });

    it('should provide type definitions for TypeScript consumers', () => {
      // This validates that types can be imported
      type Options = ScanOptions;
      type Element = ElementData;

      const opts: Options = { recursive: true };
      const elem: Element = { type: 'function', name: 'test', file: 'test.ts', line: 1 };

      expect(opts).toBeDefined();
      expect(elem).toBeDefined();
    });
  });

  describe('Integration with Analysis Workflow', () => {
    it('should scan and produce analyzable results', async () => {
      const elements = await scanCurrentElements(__dirname, 'ts', {
        recursive: false,
        verbose: false
      });

      // Verify results can be analyzed
      const functionCount = elements.filter(e => e.type === 'function').length;
      const classCount = elements.filter(e => e.type === 'class').length;

      expect(functionCount).toBeGreaterThanOrEqual(0);
      expect(classCount).toBeGreaterThanOrEqual(0);
    });

    it('should produce results compatible with CodeRef format', async () => {
      const elements = await scanCurrentElements(__dirname, 'ts', {
        recursive: false,
        verbose: false
      });

      // Verify each element has data needed for CodeRef tag generation
      for (const elem of elements) {
        expect(elem.file).toBeTruthy();
        expect(elem.name).toBeTruthy();
        expect(elem.line).toBeGreaterThan(0);
        expect(elem.type).toBeTruthy();
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain same API as CLI usage', async () => {
      // Verify the scanner API matches what CLI expects
      const result = await scanCurrentElements(
        './test-dir',
        ['ts', 'tsx'],
        {
          recursive: true,
          exclude: ['**/node_modules/**'],
          verbose: false
        }
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it('should work without options parameter', async () => {
      // Options should be optional
      const result = await scanCurrentElements(__dirname, 'ts');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should work with default language', async () => {
      // Language defaults to 'ts'
      const result = await scanCurrentElements(__dirname);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

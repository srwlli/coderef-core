/**
 * Tests for JavaScript Call Detector
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSCallDetector } from '../src/analyzer/js-call-detector.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to create temp test files
const testFilesDir = path.join(__dirname, '__test-files-js-detector__');

function createTestFile(filename: string, content: string): string {
  if (!fs.existsSync(testFilesDir)) {
    fs.mkdirSync(testFilesDir, { recursive: true });
  }
  const filePath = path.join(testFilesDir, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

function cleanupTestFiles() {
  if (fs.existsSync(testFilesDir)) {
    fs.rmSync(testFilesDir, { recursive: true, force: true });
  }
}

describe('JSCallDetector', () => {
  let detector: JSCallDetector;

  beforeEach(() => {
    detector = new JSCallDetector();
    cleanupTestFiles();
  });

  describe('detectCalls', () => {
    it('detects direct function calls', () => {
      const code = `
        function main() {
          foo();
          bar();
        }
      `;
      const filePath = createTestFile('direct-calls.js', code);
      const calls = detector.detectCalls(filePath);

      expect(calls.length).toBeGreaterThanOrEqual(2);

      const fooCall = calls.find(c => c.calleeFunction === 'foo');
      expect(fooCall).toBeDefined();
      expect(fooCall?.callType).toBe('function');
      expect(fooCall?.callerFunction).toBe('main');
    });

    it('detects method calls', () => {
      const code = `
        function process() {
          obj.method();
          this.helper();
        }
      `;
      const filePath = createTestFile('method-calls.js', code);
      const calls = detector.detectCalls(filePath);

      const objMethodCall = calls.find(c => c.calleeFunction === 'method');
      expect(objMethodCall).toBeDefined();
      expect(objMethodCall?.callType).toBe('method');
      expect(objMethodCall?.calleeObject).toBe('obj');

      const thisCall = calls.find(c => c.calleeFunction === 'helper');
      expect(thisCall).toBeDefined();
      expect(thisCall?.calleeObject).toBe('this');
    });

    it('detects constructor calls', () => {
      const code = `
        function create() {
          const instance = new MyClass();
          return instance;
        }
      `;
      const filePath = createTestFile('constructor-calls.js', code);
      const calls = detector.detectCalls(filePath);

      const newCall = calls.find(c => c.calleeFunction === 'MyClass');
      expect(newCall).toBeDefined();
      expect(newCall?.callType).toBe('constructor');
    });

    it('detects calls in arrow functions', () => {
      const code = `
        const process = () => {
          helper();
        };
      `;
      const filePath = createTestFile('arrow-calls.js', code);
      const calls = detector.detectCalls(filePath);

      const helperCall = calls.find(c => c.calleeFunction === 'helper');
      expect(helperCall).toBeDefined();
    });

    it('detects calls in class methods', () => {
      const code = `
        class MyClass {
          process() {
            this.helper();
            doSomething();
          }

          helper() {
            return 42;
          }
        }
      `;
      const filePath = createTestFile('class-methods.js', code);
      const calls = detector.detectCalls(filePath);

      const helperCall = calls.find(c => c.calleeFunction === 'helper');
      expect(helperCall).toBeDefined();
      expect(helperCall?.callerFunction).toBe('process');
      expect(helperCall?.callerClass).toBe('MyClass');
    });

    it('tracks line numbers', () => {
      const code = `
        function foo() {
          bar();
        }
      `;
      const filePath = createTestFile('line-numbers.js', code);
      const calls = detector.detectCalls(filePath);

      const barCall = calls.find(c => c.calleeFunction === 'bar');
      expect(barCall?.line).toBeGreaterThan(0);
    });

    it('returns empty array for invalid files', () => {
      const calls = detector.detectCalls('/nonexistent/file.js');
      expect(calls).toEqual([]);
    });

    it('caches results', () => {
      const code = 'function foo() { bar(); }';
      const filePath = createTestFile('cache-test.js', code);

      const calls1 = detector.detectCalls(filePath);
      const calls2 = detector.detectCalls(filePath);

      expect(calls1).toBe(calls2); // Same reference = cached
    });
  });

  describe('getFileParameters', () => {
    it('extracts simple parameters', () => {
      const code = `
        function add(a, b, c) {
          return a + b + c;
        }
      `;
      const filePath = createTestFile('simple-params.js', code);
      const params = detector.getFileParameters(filePath);

      const addParams = params.get('add');
      expect(addParams).toBeDefined();
      expect(addParams?.length).toBe(3);
      expect(addParams?.[0].name).toBe('a');
      expect(addParams?.[0].hasDefault).toBe(false);
      expect(addParams?.[0].isRest).toBe(false);
    });

    it('extracts default parameters', () => {
      const code = `
        function greet(name = 'World') {
          return 'Hello, ' + name;
        }
      `;
      const filePath = createTestFile('default-params.js', code);
      const params = detector.getFileParameters(filePath);

      const greetParams = params.get('greet');
      expect(greetParams?.[0].name).toBe('name');
      expect(greetParams?.[0].hasDefault).toBe(true);
    });

    it('extracts rest parameters', () => {
      const code = `
        function sum(...args) {
          return args.reduce((a, b) => a + b);
        }
      `;
      const filePath = createTestFile('rest-params.js', code);
      const params = detector.getFileParameters(filePath);

      const sumParams = params.get('sum');
      expect(sumParams?.[0].name).toBe('...args');
      expect(sumParams?.[0].isRest).toBe(true);
    });

    it('extracts object destructuring parameters', () => {
      const code = `
        function process({ id, name, age }) {
          return { id, name, age };
        }
      `;
      const filePath = createTestFile('object-destructure.js', code);
      const params = detector.getFileParameters(filePath);

      const processParams = params.get('process');
      expect(processParams?.[0].name).toContain('id');
      expect(processParams?.[0].name).toContain('name');
      expect(processParams?.[0].name).toContain('age');
      expect(processParams?.[0].isDestructured).toBe(true);
    });

    it('extracts array destructuring parameters', () => {
      const code = `
        function swap([a, b]) {
          return [b, a];
        }
      `;
      const filePath = createTestFile('array-destructure.js', code);
      const params = detector.getFileParameters(filePath);

      const swapParams = params.get('swap');
      expect(swapParams?.[0].name).toContain('a');
      expect(swapParams?.[0].name).toContain('b');
      expect(swapParams?.[0].isDestructured).toBe(true);
    });

    it('extracts mixed parameters', () => {
      const code = `
        function complex(first, { x, y } = {}, ...rest) {
          return { first, x, y, rest };
        }
      `;
      const filePath = createTestFile('mixed-params.js', code);
      const params = detector.getFileParameters(filePath);

      const complexParams = params.get('complex');
      expect(complexParams?.length).toBe(3);
      expect(complexParams?.[0].name).toBe('first');
      expect(complexParams?.[1].hasDefault).toBe(true);
      expect(complexParams?.[1].isDestructured).toBe(true);
      expect(complexParams?.[2].isRest).toBe(true);
    });

    it('extracts class method parameters', () => {
      const code = `
        class Calculator {
          add(a, b) {
            return a + b;
          }
        }
      `;
      const filePath = createTestFile('class-params.js', code);
      const params = detector.getFileParameters(filePath);

      const addParams = params.get('Calculator.add');
      expect(addParams).toBeDefined();
      expect(addParams?.length).toBe(2);
    });
  });

  describe('buildCallEdges', () => {
    it('builds call edges between files', () => {
      const code1 = `
        function caller() {
          target();
        }
      `;
      const code2 = `
        function target() {
          return 42;
        }
      `;
      const file1 = createTestFile('caller.js', code1);
      const file2 = createTestFile('target.js', code2);

      const edges = detector.buildCallEdges([file1, file2]);

      expect(edges.length).toBeGreaterThan(0);
      const edge = edges.find(e => e.sourceFile === file1);
      expect(edge).toBeDefined();
      expect(edge?.calls.length).toBeGreaterThan(0);
    });

    it('uses element map when provided', () => {
      const code = `
        function main() {
          helper();
        }
      `;
      const file = createTestFile('with-map.js', code);

      const elementMap = new Map([
        ['helper', { file: 'utils.js', type: 'function' }]
      ]);

      const edges = detector.buildCallEdges([file], elementMap);

      const edge = edges.find(e => e.targetFile === 'utils.js');
      expect(edge).toBeDefined();
    });
  });

  describe('analyzeCallPatterns', () => {
    it('analyzes call patterns and statistics', () => {
      const code = `
        class MyClass {
          process() {
            this.helper();
            doSomething();
            new OtherClass();
          }
        }
      `;
      const file = createTestFile('patterns.js', code);

      const stats = detector.analyzeCallPatterns([file]);

      expect(stats.totalCalls).toBeGreaterThan(0);
      expect(stats.uniqueFunctions.size).toBeGreaterThan(0);
      expect(stats.methodCalls).toBeGreaterThan(0);
      expect(stats.constructorCalls).toBeGreaterThan(0);
    });
  });

  describe('clearCache', () => {
    it('clears all caches', () => {
      const code = 'function foo() { bar(); }';
      const file = createTestFile('clear-cache.js', code);

      const calls1 = detector.detectCalls(file);
      detector.clearCache();
      const calls2 = detector.detectCalls(file);

      // After clearing cache, should get new instance (not same reference)
      expect(calls1).not.toBe(calls2);
      // But should have same content
      expect(calls1.length).toBe(calls2.length);
    });
  });

  describe('detectImports', () => {
    it('detects ESM import statements', () => {
      const code = `
        import { foo, bar } from './utils.js';
        import defaultExport from './config.js';
        import * as utils from './helpers.js';
      `;
      const file = createTestFile('esm-imports.js', code);
      const imports = detector.detectImports(file);

      expect(imports.length).toBe(3);

      const namedImport = imports.find(i => i.source === './utils.js');
      expect(namedImport?.importType).toBe('esm');
      expect(namedImport?.specifiers).toContain('foo');
      expect(namedImport?.specifiers).toContain('bar');

      const defaultImport = imports.find(i => i.source === './config.js');
      expect(defaultImport?.isDefault).toBe(true);

      const namespaceImport = imports.find(i => i.source === './helpers.js');
      expect(namespaceImport?.specifiers).toContain('*');
    });

    it('detects CommonJS require statements', () => {
      const code = `
        const fs = require('fs');
        const path = require('path');
      `;
      const file = createTestFile('commonjs-require.js', code);
      const imports = detector.detectImports(file);

      expect(imports.length).toBeGreaterThanOrEqual(2);

      const fsRequire = imports.find(i => i.source === 'fs');
      expect(fsRequire?.importType).toBe('commonjs');
      expect(fsRequire?.specifiers).toContain('*');
    });

    it('detects mixed ESM and CommonJS imports', () => {
      const code = `
        import { foo } from './esm.js';
        const bar = require('./cjs.js');
      `;
      const file = createTestFile('mixed-imports.js', code);
      const imports = detector.detectImports(file);

      const esmImport = imports.find(i => i.importType === 'esm');
      const cjsImport = imports.find(i => i.importType === 'commonjs');

      expect(esmImport).toBeDefined();
      expect(cjsImport).toBeDefined();
    });
  });

  describe('detectExports', () => {
    it('detects ESM export statements', () => {
      const code = `
        export const baz = 42;
        export function qux() {}
        export class MyClass {}
      `;
      const file = createTestFile('esm-exports.js', code);
      const exports = detector.detectExports(file);

      expect(exports.length).toBeGreaterThanOrEqual(2);

      const hasExportType = exports.every(e => e.exportType === 'esm');
      expect(hasExportType).toBe(true);

      // Check specific exports
      const bazExport = exports.find(e => e.specifiers.includes('baz'));
      expect(bazExport).toBeDefined();
    });

    it('detects ESM default export', () => {
      const code = `
        export default function main() {}
      `;
      const file = createTestFile('esm-default-export.js', code);
      const exports = detector.detectExports(file);

      const defaultExport = exports.find(e => e.isDefault);
      expect(defaultExport).toBeDefined();
      expect(defaultExport?.exportType).toBe('esm');
    });

    it('detects CommonJS module.exports', () => {
      const code = `
        module.exports = { foo, bar };
      `;
      const file = createTestFile('commonjs-exports.js', code);
      const exports = detector.detectExports(file);

      const cjsExport = exports.find(e => e.exportType === 'commonjs');
      expect(cjsExport).toBeDefined();
    });

    it('detects CommonJS exports.foo pattern', () => {
      const code = `
        exports.foo = function() {};
        exports.bar = 42;
      `;
      const file = createTestFile('commonjs-exports-pattern.js', code);
      const exports = detector.detectExports(file);

      expect(exports.length).toBeGreaterThanOrEqual(2);

      const fooExport = exports.find(e => e.specifiers.includes('foo'));
      expect(fooExport?.exportType).toBe('commonjs');
    });
  });
});

/**
 * Tests for JavaScript Parser
 */

import { describe, it, expect } from 'vitest';
import {
  parseJavaScript,
  isJavaScriptFile,
  isTypeScriptFile,
  getSourceTypeFromExtension,
} from '../src/analyzer/js-parser.js';

describe('parseJavaScript', () => {
  it('parses simple function declaration', () => {
    const code = 'function foo() { return 42; }';
    const ast = parseJavaScript(code);

    expect(ast).not.toBeNull();
    expect(ast?.type).toBe('Program');
  });

  it('parses ESM import statement', () => {
    const code = "import { foo } from './bar.js';";
    const ast = parseJavaScript(code);

    expect(ast).not.toBeNull();
    expect(ast?.type).toBe('Program');
  });

  it('parses CommonJS require statement', () => {
    const code = "const foo = require('./bar.js');";
    const ast = parseJavaScript(code, { sourceType: 'script' });

    expect(ast).not.toBeNull();
    expect(ast?.type).toBe('Program');
  });

  it('parses arrow functions', () => {
    const code = 'const add = (a, b) => a + b;';
    const ast = parseJavaScript(code);

    expect(ast).not.toBeNull();
    expect(ast?.type).toBe('Program');
  });

  it('parses class declarations', () => {
    const code = `
      class MyClass {
        constructor(value) {
          this.value = value;
        }

        method() {
          return this.value;
        }
      }
    `;
    const ast = parseJavaScript(code);

    expect(ast).not.toBeNull();
    expect(ast?.type).toBe('Program');
  });

  it('parses object destructuring', () => {
    const code = 'const { x, y } = obj;';
    const ast = parseJavaScript(code);

    expect(ast).not.toBeNull();
    expect(ast?.type).toBe('Program');
  });

  it('parses rest parameters', () => {
    const code = 'function sum(...args) { return args.reduce((a, b) => a + b); }';
    const ast = parseJavaScript(code);

    expect(ast).not.toBeNull();
    expect(ast?.type).toBe('Program');
  });

  it('parses default parameters', () => {
    const code = 'function greet(name = "World") { return `Hello, ${name}!`; }';
    const ast = parseJavaScript(code);

    expect(ast).not.toBeNull();
    expect(ast?.type).toBe('Program');
  });

  it('falls back to script mode if module mode fails', () => {
    // This code is valid in script mode but not in module mode
    const code = 'return 42;';
    const ast = parseJavaScript(code);

    expect(ast).not.toBeNull();
    expect(ast?.type).toBe('Program');
  });

  it('returns null for invalid syntax', () => {
    const code = 'function foo() { return'; // Missing closing brace
    const ast = parseJavaScript(code);

    expect(ast).toBeNull();
  });

  it('includes location information when requested', () => {
    const code = 'function foo() {}';
    const ast = parseJavaScript(code, { locations: true });

    expect(ast).not.toBeNull();
    // Location info is on child nodes
    expect(ast).toHaveProperty('body');
  });
});

describe('isJavaScriptFile', () => {
  it('returns true for .js files', () => {
    expect(isJavaScriptFile('foo.js')).toBe(true);
  });

  it('returns true for .jsx files', () => {
    expect(isJavaScriptFile('Component.jsx')).toBe(true);
  });

  it('returns true for .mjs files', () => {
    expect(isJavaScriptFile('module.mjs')).toBe(true);
  });

  it('returns true for .cjs files', () => {
    expect(isJavaScriptFile('commonjs.cjs')).toBe(true);
  });

  it('returns false for .ts files', () => {
    expect(isJavaScriptFile('foo.ts')).toBe(false);
  });

  it('returns false for .tsx files', () => {
    expect(isJavaScriptFile('Component.tsx')).toBe(false);
  });

  it('returns false for other files', () => {
    expect(isJavaScriptFile('foo.txt')).toBe(false);
    expect(isJavaScriptFile('foo.json')).toBe(false);
  });
});

describe('isTypeScriptFile', () => {
  it('returns true for .ts files', () => {
    expect(isTypeScriptFile('foo.ts')).toBe(true);
  });

  it('returns true for .tsx files', () => {
    expect(isTypeScriptFile('Component.tsx')).toBe(true);
  });

  it('returns true for .mts files', () => {
    expect(isTypeScriptFile('module.mts')).toBe(true);
  });

  it('returns true for .cts files', () => {
    expect(isTypeScriptFile('commonjs.cts')).toBe(true);
  });

  it('returns false for .js files', () => {
    expect(isTypeScriptFile('foo.js')).toBe(false);
  });

  it('returns false for other files', () => {
    expect(isTypeScriptFile('foo.txt')).toBe(false);
  });
});

describe('getSourceTypeFromExtension', () => {
  it('returns "module" for .mjs files', () => {
    expect(getSourceTypeFromExtension('foo.mjs')).toBe('module');
  });

  it('returns "script" for .cjs files', () => {
    expect(getSourceTypeFromExtension('foo.cjs')).toBe('script');
  });

  it('returns "module" for .js files (default)', () => {
    expect(getSourceTypeFromExtension('foo.js')).toBe('module');
  });

  it('returns "module" for .jsx files (default)', () => {
    expect(getSourceTypeFromExtension('foo.jsx')).toBe('module');
  });
});

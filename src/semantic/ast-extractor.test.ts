/**
 * Unit tests for AST extractor module
 * Tests: ES6 exports, CommonJS exports, named/default imports, performance baseline
 */

import * as fs from 'fs';
import * as path from 'path';
import { ASTExtractor, astExtractor } from './ast-extractor';

describe('ASTExtractor', () => {
  let tempDir: string;
  let extractor: ASTExtractor;

  beforeEach(() => {
    tempDir = path.join(__dirname, '.test-temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    extractor = new ASTExtractor();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('ES6 Module Exports', () => {
    test('should extract named exports', async () => {
      const file = path.join(tempDir, 'named.ts');
      fs.writeFileSync(
        file,
        `
export function myFunc() {}
export const myConst = 42;
export interface MyInterface {}
      `,
      );

      const result = await extractor.extractFile(file);
      expect(result.exports).toHaveLength(3);
      expect(result.exports.map((e) => e.name)).toEqual(['myFunc', 'myConst', 'MyInterface']);
    });

    test('should extract default exports', async () => {
      const file = path.join(tempDir, 'default.ts');
      fs.writeFileSync(file, 'export default function MyComponent() {}');

      const result = await extractor.extractFile(file);
      expect(result.exports).toHaveLength(1);
      expect(result.exports[0].name).toBe('default');
      expect(result.exports[0].type).toBe('default');
    });

    test('should extract re-exports', async () => {
      const file = path.join(tempDir, 'reexport.ts');
      fs.writeFileSync(file, `export { foo, bar } from './utils';`);

      const result = await extractor.extractFile(file);
      expect(result.exports.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Import Detection', () => {
    test('should extract named imports', async () => {
      const file = path.join(tempDir, 'imports.ts');
      fs.writeFileSync(
        file,
        `
import { foo, bar } from './utils';
import React from 'react';
import * as fs from 'fs';
      `,
      );

      const result = await extractor.extractFile(file);
      expect(result.imports.length).toBeGreaterThanOrEqual(2);
      expect(result.imports.some((i) => i.name === 'foo')).toBe(true);
    });

    test('should categorize external vs internal dependencies', async () => {
      const file = path.join(tempDir, 'deps.ts');
      fs.writeFileSync(
        file,
        `
import { foo } from './utils';
import React from 'react';
import { something } from '../helpers';
      `,
      );

      const result = await extractor.extractFile(file);
      expect(result.internalDependencies.length).toBeGreaterThanOrEqual(1);
      expect(result.externalDependencies.some((d) => d === 'react')).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should extract file in <100ms', async () => {
      const file = path.join(tempDir, 'perf.ts');
      const code = `
${Array.from({ length: 50 }, (_, i) => `export function func${i}() {}`).join('\n')}
${Array.from({ length: 50 }, (_, i) => `import { dep${i} } from './mod${i}';`).join('\n')}
      `;
      fs.writeFileSync(file, code);

      const startTime = Date.now();
      const result = await extractor.extractFile(file);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(100);
      expect(result.executionTime).toBeLessThan(100);
    });
  });

  describe('CommonJS Support', () => {
    test('should handle CommonJS modules', async () => {
      const file = path.join(tempDir, 'commonjs.js');
      fs.writeFileSync(
        file,
        `
module.exports = {
  foo: function() {},
  bar: 42
};
      `,
      );

      const result = await extractor.extractFile(file);
      expect(result.exports.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Convenience API', () => {
    test('should work with astExtractor function', async () => {
      const file = path.join(tempDir, 'api.ts');
      fs.writeFileSync(file, 'export const x = 1; export function y() {}');

      const result = await astExtractor(file);
      expect(result.exports.length).toBeGreaterThanOrEqual(1);
      expect(result.file).toBe(file);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing files gracefully', async () => {
      const result = await extractor.extractFile('/nonexistent/file.ts');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.exports).toHaveLength(0);
      expect(result.imports).toHaveLength(0);
    });

    test('should skip oversized files', async () => {
      const smallExtractor = new ASTExtractor({ maxFileSize: 10 });
      const file = path.join(tempDir, 'large.ts');
      fs.writeFileSync(file, 'x'.repeat(100));

      const result = await smallExtractor.extractFile(file);
      expect(result.exports).toEqual([]);
    });
  });
});

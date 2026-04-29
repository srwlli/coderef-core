/**
 * Unit tests for header generator
 */

import * as fs from 'fs';
import * as path from 'path';
import { HeaderGenerator, generateHeaders } from './header-generator';
import type { ExportInfo, ImportInfo } from './ast-extractor';

describe('HeaderGenerator', () => {
  let tempDir: string;
  let generator: HeaderGenerator;

  beforeEach(() => {
    tempDir = path.join(__dirname, '.test-temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    generator = new HeaderGenerator();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Header Generation', () => {
    test('should generate exports header', () => {
      const exports: ExportInfo[] = [
        { name: 'MyComponent', type: 'named', line: 1 },
        { name: 'MyFunction', type: 'named', line: 5 },
      ];

      const headers = generator.generateHeaders(exports, [], [], []);
      expect(headers).toHaveLength(1);
      expect(headers[0].type).toBe('exports');
      expect(headers[0].content[0]).toContain('MyComponent');
      expect(headers[0].content[0]).toContain('MyFunction');
    });

    test('should generate used_by header for internal dependencies', () => {
      const exports: ExportInfo[] = [];
      const internalDeps = ['./utils', '../helpers'];

      const headers = generator.generateHeaders(exports, [], internalDeps, []);
      expect(headers.some((h) => h.type === 'used_by')).toBe(true);
    });

    test('should generate rules header based on structure', () => {
      const exports: ExportInfo[] = [
        { name: 'default', type: 'default', line: 1 },
        { name: 'func1', type: 'named', line: 2 },
        { name: 'func2', type: 'named', line: 3 },
        { name: 'func3', type: 'named', line: 4 },
      ];
      const imports: ImportInfo[] = [{ name: 'React', from: 'react', type: 'default', line: 1 }];

      const headers = generator.generateHeaders(exports, imports, [], []);
      const rulesHeader = headers.find((h) => h.type === 'rules');
      expect(rulesHeader).toBeDefined();
    });

    test('should generate related header from imports', () => {
      const exports: ExportInfo[] = [];
      const imports: ImportInfo[] = [
        { name: 'func1', from: './utils', type: 'named', line: 1 },
        { name: 'func2', from: './utils', type: 'named', line: 2 },
        { name: 'React', from: 'react', type: 'default', line: 3 },
      ];

      const headers = generator.generateHeaders(exports, imports, [], []);
      const relatedHeader = headers.find((h) => h.type === 'related');
      expect(relatedHeader).toBeDefined();
      expect(relatedHeader?.content[0]).toContain('utils');
    });
  });

  describe('Comment Formatting', () => {
    test('should format headers as block comments', () => {
      const exports: ExportInfo[] = [{ name: 'MyFunc', type: 'named', line: 1 }];
      const headers = generator.generateHeaders(exports, [], [], []);
      const comments = generator.formatAsComments(headers);

      expect(comments.some((c) => c.includes('/**'))).toBe(true);
      expect(comments.some((c) => c.includes('*/'))).toBe(true);
      expect(comments.some((c) => c.includes('@semantic'))).toBe(true);
    });

    test('should format headers as line comments when specified', () => {
      const lineGenerator = new HeaderGenerator({ commentStyle: 'line' });
      const exports: ExportInfo[] = [{ name: 'MyFunc', type: 'named', line: 1 }];
      const headers = lineGenerator.generateHeaders(exports, [], [], []);
      const comments = lineGenerator.formatAsComments(headers);

      expect(comments.some((c) => c.startsWith('//'))).toBe(true);
      expect(comments.some((c) => c.includes('@semantic'))).toBe(true);
    });
  });

  describe('Header Insertion', () => {
    test('should insert headers at top of file', async () => {
      const file = path.join(tempDir, 'test.ts');
      fs.writeFileSync(file, 'export function myFunc() {}');

      const exports: ExportInfo[] = [{ name: 'myFunc', type: 'named', line: 1 }];
      await generateHeaders(file, exports, [], []);

      const content = fs.readFileSync(file, 'utf-8');
      expect(content).toContain('@semantic');
      expect(content).toContain('exports: [myFunc]');
    });

    test('should preserve existing semantic headers', async () => {
      const file = path.join(tempDir, 'test.ts');
      const originalContent = `
/**
 * @semantic
 * exports: [oldFunc]
 */
export function myFunc() {}`;
      fs.writeFileSync(file, originalContent);

      const exports: ExportInfo[] = [{ name: 'myFunc', type: 'named', line: 1 }];
      await generateHeaders(file, exports, []);

      const content = fs.readFileSync(file, 'utf-8');
      expect(content).toBe(originalContent); // Unchanged
    });

    test('should skip files with shebang correctly', async () => {
      const file = path.join(tempDir, 'script.ts');
      fs.writeFileSync(file, '#!/usr/bin/env node\nexport function myFunc() {}');

      const exports: ExportInfo[] = [{ name: 'myFunc', type: 'named', line: 1 }];
      await generateHeaders(file, exports, []);

      const content = fs.readFileSync(file, 'utf-8');
      expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
      expect(content).toContain('@semantic');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty exports and imports', () => {
      const headers = generator.generateHeaders([], [], [], []);
      expect(headers.length).toBeGreaterThanOrEqual(0);
    });

    test('should normalize module paths correctly', () => {
      const imports: ImportInfo[] = [
        { name: 'x', from: './utils/helper.ts', type: 'named', line: 1 },
      ];

      const headers = generator.generateHeaders([], imports, [], []);
      const relatedHeader = headers.find((h) => h.type === 'related');
      // Path should be normalized
      expect(relatedHeader?.content[0]).not.toContain('.ts');
    });
  });
});

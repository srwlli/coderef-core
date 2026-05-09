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
      const exportsHeader = headers.find(header => header.type === 'exports');
      expect(exportsHeader).toBeDefined();
      expect(exportsHeader?.content[0]).toContain('MyComponent');
      expect(exportsHeader?.content[0]).toContain('MyFunction');
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
      expect(comments.some((c) => c.includes('@coderef-semantic: 1.0.0'))).toBe(true);
    });

    test('should merge block comments into one semantic header block', () => {
      const headers = generator.generateHeadersFromElements([
        {
          type: 'function',
          name: 'one',
          file: 'src/provider.ts',
          line: 1,
          exports: [{ name: 'one', type: 'named' }],
          usedBy: [{ file: 'src/consumer.ts', line: 1 }],
        },
      ]);
      const comments = generator.formatAsComments(headers);

      expect(comments.filter(comment => comment.includes('@coderef-semantic: 1.0.0'))).toHaveLength(1);
      expect(comments.join('\n')).toContain('@exports one');
      expect(comments.join('\n')).toContain('@used_by src/consumer.ts');
    });

    test('should format headers as line comments when specified', () => {
      const lineGenerator = new HeaderGenerator({ commentStyle: 'line' });
      const exports: ExportInfo[] = [{ name: 'MyFunc', type: 'named', line: 1 }];
      const headers = lineGenerator.generateHeaders(exports, [], [], []);
      const comments = lineGenerator.formatAsComments(headers);

      expect(comments.some((c) => c.startsWith('//'))).toBe(true);
      expect(comments.some((c) => c.includes('@coderef-semantic: 1.0.0'))).toBe(true);
    });
  });

  describe('Header Insertion', () => {
    test('should insert headers at top of file', async () => {
      const file = path.join(tempDir, 'test.ts');
      fs.writeFileSync(file, 'export function myFunc() {}');

      const exports: ExportInfo[] = [{ name: 'myFunc', type: 'named', line: 1 }];
      await generateHeaders(file, exports, [], []);

      const content = fs.readFileSync(file, 'utf-8');
      expect(content).toContain('@coderef-semantic: 1.0.0');
      expect(content).toContain('@exports myFunc');
    });

    test('should preserve existing semantic headers', async () => {
      const file = path.join(tempDir, 'test.ts');
      const originalContent = `
export function myFunc() {}`;
      fs.writeFileSync(file, originalContent);

      const exports: ExportInfo[] = [{ name: 'myFunc', type: 'named', line: 1 }];
      await generateHeaders(file, exports, []);

      const content = fs.readFileSync(file, 'utf-8');
      expect(content).toBe(originalContent); // Unchanged
    });

    test('should not skip files that only mention @coderef-semantic in code', async () => {
      const file = path.join(tempDir, 'literal.ts');
      fs.writeFileSync(file, "const marker = '@coderef-semantic';\nexport function myFunc() {}");

      const exports: ExportInfo[] = [{ name: 'myFunc', type: 'named', line: 1 }];
      await generateHeaders(file, exports, []);

      const content = fs.readFileSync(file, 'utf-8');
      expect(content.startsWith('/**')).toBe(true);
      expect((content.match(/@coderef-semantic: 1\.0\.0/g) || []).length).toBe(1);
      expect(content).toContain("const marker = '@coderef-semantic';");
    });

    test('should skip files with shebang correctly', async () => {
      const file = path.join(tempDir, 'script.ts');
      fs.writeFileSync(file, '#!/usr/bin/env node\nexport function myFunc() {}');

      const exports: ExportInfo[] = [{ name: 'myFunc', type: 'named', line: 1 }];
      await generateHeaders(file, exports, []);

      const content = fs.readFileSync(file, 'utf-8');
      expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
      expect(content).toContain('@coderef-semantic: 1.0.0');
    });

    test('should insert cleanly after CRLF block comments', async () => {
      const file = path.join(tempDir, 'crlf.ts');
      fs.writeFileSync(file, '/* License */\r\nexport function myFunc() {}\r\n');

      const exports: ExportInfo[] = [{ name: 'myFunc', type: 'named', line: 1 }];
      await generateHeaders(file, exports, []);

      const content = fs.readFileSync(file, 'utf-8');
      expect(content).toContain('/* License */\r\n\r\n/**');
      expect(content).not.toContain('*//**');
    });

    test('should generate one deduplicated header set for multiple elements in a file', () => {
      const headers = generator.generateHeadersFromElements([
        {
          type: 'function',
          name: 'one',
          file: 'src/provider.ts',
          line: 1,
          exports: [{ name: 'one', type: 'named' }],
          usedBy: [{ file: 'src/consumer.ts', line: 1 }],
        },
        {
          type: 'function',
          name: 'two',
          file: 'src/provider.ts',
          line: 2,
          exports: [{ name: 'two', type: 'named' }],
          usedBy: [{ file: 'src/consumer.ts', line: 1 }],
        },
      ]);

      expect(headers.filter(header => header.type === 'exports')).toHaveLength(1);
      expect(headers.filter(header => header.type === 'used_by')).toHaveLength(1);
      expect(headers.find(header => header.type === 'exports')?.content[0]).toContain('one, two');
      expect(headers.find(header => header.type === 'used_by')?.content[0]).toContain('src/consumer.ts');
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

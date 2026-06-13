/**
 * Unit tests for header generator
 */

import * as fs from 'fs';
import * as path from 'path';
import { HeaderGenerator, generateHeaders, inferLayerFromPath, inferCapabilityFromPath } from './header-generator';
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
      const originalContent = `/**
 * @coderef-semantic: 1.0.0
 * @exports myFunc
 * @rules "no_circular_deps"
 */

export function myFunc() {}`;
      fs.writeFileSync(file, originalContent);

      const exports: ExportInfo[] = [{ name: 'myFunc', type: 'named', line: 1 }];
      await generateHeaders(file, exports, []);

      const content = fs.readFileSync(file, 'utf-8');
      expect(content).toBe(originalContent); // Unchanged — generator skips files with existing header
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
      // Coderef header is inserted first so detectHeaderBlock() finds it.
      // The original /* License */ comment follows below.
      expect(content).toMatch(/^\/\*\*\r?\n \* @coderef-semantic/);
      expect(content).toContain('/* License */');
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

  describe('Python comment syntax (STUB sweep root-cause: JS /** */ is a SyntaxError in .py)', () => {
    test('Python files get # line comments, not a /** */ block', async () => {
      const file = path.join(tempDir, 'script.py');
      fs.writeFileSync(file, 'def my_func():\n    return 1\n');

      const exports: ExportInfo[] = [{ name: 'my_func', type: 'named', line: 1 }];
      await generateHeaders(file, exports, [], []);

      const content = fs.readFileSync(file, 'utf-8');
      expect(content).toContain('@coderef-semantic: 1.0.0');
      // The header MUST be Python-comment syntax, never the JS block opener.
      expect(content.startsWith('/**')).toBe(false);
      expect(content).not.toContain('/**');
      expect(content).not.toContain(' */');
      // Every header line is a # comment.
      const headerLines = content.split('\n').filter(l => l.includes('@coderef-semantic') || l.includes('@exports'));
      for (const l of headerLines) {
        expect(l.trimStart().startsWith('#')).toBe(true);
      }
    });

    test('Python file with a shebang keeps the shebang on line 1, header below as # comments', async () => {
      const file = path.join(tempDir, 'cli.py');
      fs.writeFileSync(file, '#!/usr/bin/env python\ndef main():\n    pass\n');

      const exports: ExportInfo[] = [{ name: 'main', type: 'named', line: 2 }];
      await generateHeaders(file, exports, [], []);

      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      expect(lines[0]).toBe('#!/usr/bin/env python'); // shebang stays first
      expect(content).not.toContain('/**'); // no JS block anywhere
      expect(content).toContain('# @coderef-semantic: 1.0.0');
    });

    test('re-stamping a Python file with a # header does not double-stamp', async () => {
      const file = path.join(tempDir, 'redo.py');
      fs.writeFileSync(file, 'def f():\n    return 1\n');
      const exports: ExportInfo[] = [{ name: 'f', type: 'named', line: 1 }];

      // First stamp (preserveExisting=false so a second run would re-stamp).
      const gen = new HeaderGenerator({ preserveExisting: false });
      const headers = gen.generateHeaders(exports, [], [], []);
      await gen.insertHeaders(file, headers);
      await gen.insertHeaders(file, headers);

      const content = fs.readFileSync(file, 'utf-8');
      const markerCount = (content.match(/@coderef-semantic: 1\.0\.0/g) || []).length;
      expect(markerCount).toBe(1); // exactly one header, not two
      expect(content).not.toContain('/**');
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

describe('inferLayerFromPath', () => {
  test('__tests__/ path → test_support', () => {
    expect(inferLayerFromPath('__tests__/pipeline/foo.test.ts')).toBe('test_support');
  });

  test('.test. in filename → test_support (higher priority than src/ fallback)', () => {
    expect(inferLayerFromPath('src/semantic/header-generator.test.ts')).toBe('test_support');
  });

  test('src/cli/ → cli', () => {
    expect(inferLayerFromPath('src/cli/populate.ts')).toBe('cli');
  });

  test('scripts/ → cli', () => {
    expect(inferLayerFromPath('scripts/doc-gen/generate-index-md.js')).toBe('cli');
  });

  test('src/integration/ → integration', () => {
    expect(inferLayerFromPath('src/integration/llm/model-registry.ts')).toBe('integration');
  });

  test('src/utils/ → utility', () => {
    expect(inferLayerFromPath('src/utils/logger.ts')).toBe('utility');
  });

  test('src/pipeline/ → service', () => {
    expect(inferLayerFromPath('src/pipeline/orchestrator.ts')).toBe('service');
  });

  test('src/scanner/ → service', () => {
    expect(inferLayerFromPath('src/scanner/scanner.ts')).toBe('service');
  });

  test('src/semantic/ → service', () => {
    expect(inferLayerFromPath('src/semantic/header-generator.ts')).toBe('service');
  });

  test('src/analyzer/ → service', () => {
    expect(inferLayerFromPath('src/analyzer/dependency-analyzer.ts')).toBe('service');
  });

  test('src/query/ → service', () => {
    expect(inferLayerFromPath('src/query/query-executor.ts')).toBe('service');
  });

  test('src/types/ → domain', () => {
    expect(inferLayerFromPath('src/types/types.ts')).toBe('domain');
  });

  test('src/plugins/ → integration', () => {
    expect(inferLayerFromPath('src/plugins/plugin-graph.ts')).toBe('integration');
  });

  test('src/validator/ → validation', () => {
    expect(inferLayerFromPath('src/validator/report-generator.ts')).toBe('validation');
  });

  test('src/config/ → configuration', () => {
    expect(inferLayerFromPath('src/config/defaults.ts')).toBe('configuration');
  });

  test('src/ fallback → service for unrecognized subdirectory', () => {
    expect(inferLayerFromPath('src/unknown-subdir/foo.ts')).toBe('service');
  });

  test('unknown root-level path → undefined', () => {
    expect(inferLayerFromPath('scanner.js')).toBeUndefined();
  });

  test('empty string → undefined', () => {
    expect(inferLayerFromPath('')).toBeUndefined();
  });

  test('normalizes Windows backslash paths', () => {
    expect(inferLayerFromPath('src\\cli\\populate.ts')).toBe('cli');
  });
});

describe('inferCapabilityFromPath', () => {
  test('single-word stem with matching element name → stem slug only', () => {
    // stem='orchestrator', name='orchestrator' → 'orchestrator' (same, no duplication)
    expect(inferCapabilityFromPath('src/pipeline/orchestrator.ts', 'orchestrator')).toBe('orchestrator');
  });

  test('camelCase stem + camelCase element → kebab-case combined slug', () => {
    // stem='headerGenerator' → 'header-generator'; name='generateHeaders' → 'generate-headers'
    expect(inferCapabilityFromPath('src/semantic/headerGenerator.ts', 'generateHeaders')).toBe('header-generator-generate-headers');
  });

  test('stem with hyphens already in filename', () => {
    // stem='header-generator' (already kebab); name='inferLayerFromPath' → 'infer-layer-from-path'
    expect(inferCapabilityFromPath('src/semantic/header-generator.ts', 'inferLayerFromPath')).toBe('header-generator-infer-layer-from-path');
  });

  test('multi-segment path uses only filename stem', () => {
    // stem='indexing-orchestrator', name='IndexingOrchestrator' → nameSlug='indexing-orchestrator' === stemSlug → deduplicated
    expect(inferCapabilityFromPath('src/integration/rag/indexing-orchestrator.ts', 'IndexingOrchestrator')).toBe('indexing-orchestrator');
  });

  test('same stem and element slug → deduplication returns stem only', () => {
    // stem='orchestrator', name='Orchestrator' → nameSlug='orchestrator' === stemSlug → deduplicated
    expect(inferCapabilityFromPath('src/pipeline/orchestrator.ts', 'Orchestrator')).toBe('orchestrator');
  });

  test('empty element name → stem slug only when stem exists', () => {
    // nameSlug='' → capability = stemSlug + '-' + '' which fails the regex → undefined
    expect(inferCapabilityFromPath('src/cli/populate.ts', '')).toBeUndefined();
  });

  test('stem with numbers preserves them in slug', () => {
    expect(inferCapabilityFromPath('src/pipeline/phase2runner.ts', 'run')).toBe('phase2runner-run');
  });
});


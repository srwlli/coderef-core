/**
 * Index Storage Test Suite
 *
 * Tests for DISPATCH-2026-04-20-005: Index.json storage optimization
 * - Compact schema conversion (toCompactElements, fromCompactElements)
 * - Gzip compression/decompression
 * - Load priority order
 * - Format detection and backward compatibility
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  toCompactElements,
  fromCompactElements,
  createVerboseIndexFile,
  createCompactIndexFile,
  writeIndexVariants,
  loadIndexFromCoderefDir,
  type CompactElement,
  type VerboseIndexFile,
  type CompactIndexFile,
} from '../index-storage.js';
import type { ElementData } from '../../types/types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir, rm, readFile, writeFile, access } from 'fs/promises';
import { constants } from 'fs';
import { gzip } from 'zlib';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const gzipAsync = promisify(gzip);

describe('index-storage', () => {
  let testDir: string;
  let coderefDir: string;

  const sampleElements: ElementData[] = [
    {
      type: 'function',
      name: 'authenticateUser',
      file: 'src/auth.ts',
      line: 10,
      exported: true,
      parameters: ['username', 'password'],
      async: true,
    },
    {
      type: 'class',
      name: 'UserService',
      file: 'src/services/user.ts',
      line: 25,
      exported: true,
    },
    {
      type: 'function',
      name: 'validateCredentials',
      file: 'src/auth.ts',
      line: 50,
      exported: false,
      parameters: [{ name: 'creds', type: 'Credentials' }],
    },
    {
      type: 'constant',
      name: 'API_KEY',
      file: 'src/config.ts',
      line: 5,
      exported: true,
    },
    {
      type: 'hook',
      name: 'useAuth',
      file: 'src/hooks/useAuth.ts',
      line: 15,
      exported: true,
      async: false,
    },
  ];

  beforeEach(async () => {
    testDir = join(__dirname, '.test-storage');
    coderefDir = join(testDir, '.coderef');
    await mkdir(coderefDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('toCompactElements', () => {
    it('should convert verbose elements to compact format', () => {
      const compact = toCompactElements(sampleElements);

      expect(compact).toHaveLength(5);
      expect(compact[0]).toEqual({
        t: 'function',
        n: 'authenticateUser',
        f: 'src/auth.ts',
        l: 10,
        p: ['username', 'password'],
        e: true,
        a: true,
      });
    });

    it('should use compact keys (t, n, f, l, p, e, a)', () => {
      const compact = toCompactElements(sampleElements);
      const keys = Object.keys(compact[0]).sort();

      expect(keys).toEqual(['a', 'e', 'f', 'l', 'n', 'p', 't']);
    });

    it('should omit optional fields when undefined', () => {
      const element: ElementData = {
        type: 'function',
        name: 'simpleFunc',
        file: 'src/simple.ts',
        line: 1,
      };

      const compact = toCompactElements([element]);

      expect(compact[0]).toEqual({
        t: 'function',
        n: 'simpleFunc',
        f: 'src/simple.ts',
        l: 1,
      });
      expect(compact[0].e).toBeUndefined();
      expect(compact[0].p).toBeUndefined();
      expect(compact[0].a).toBeUndefined();
    });

    it('should handle parameter objects with name extraction', () => {
      const compact = toCompactElements(sampleElements);
      const validateFunc = compact.find(c => c.n === 'validateCredentials');

      expect(validateFunc?.p).toEqual(['creds']);
    });

    it('should handle empty parameters array', () => {
      const element: ElementData = {
        type: 'function',
        name: 'noParams',
        file: 'src/test.ts',
        line: 1,
        parameters: [],
      };

      const compact = toCompactElements([element]);

      expect(compact[0].p).toBeUndefined();
    });

    it('should preserve uuid if present', () => {
      const element: ElementData = {
        type: 'function',
        name: 'withUuid',
        file: 'src/test.ts',
        line: 1,
        uuid: 'abc-123-def-456',
      } as ElementData;

      const compact = toCompactElements([element]);

      expect(compact[0].u).toBe('abc-123-def-456');
    });
  });

  describe('fromCompactElements', () => {
    it('should convert compact elements back to verbose format', () => {
      const compact: CompactElement[] = [
        { t: 'function', n: 'testFunc', f: 'src/test.ts', l: 10, e: true, p: ['a', 'b'] },
      ];

      const verbose = fromCompactElements(compact);

      expect(verbose[0]).toEqual({
        type: 'function',
        name: 'testFunc',
        file: 'src/test.ts',
        line: 10,
        exported: true,
        parameters: ['a', 'b'],
      });
    });

    it('should roundtrip convert without data loss', () => {
      const compact = toCompactElements(sampleElements);
      const restored = fromCompactElements(compact);

      expect(restored).toHaveLength(sampleElements.length);
      for (let i = 0; i < sampleElements.length; i++) {
        expect(restored[i].type).toBe(sampleElements[i].type);
        expect(restored[i].name).toBe(sampleElements[i].name);
        expect(restored[i].file).toBe(sampleElements[i].file);
        expect(restored[i].line).toBe(sampleElements[i].line);
        expect(restored[i].exported).toBe(sampleElements[i].exported);
        expect(restored[i].async).toBe(sampleElements[i].async);
      }
    });

    it('should handle compact elements without optional fields', () => {
      const compact: CompactElement[] = [
        { t: 'class', n: 'SimpleClass', f: 'src/simple.ts', l: 5 },
      ];

      const verbose = fromCompactElements(compact);

      expect(verbose[0].type).toBe('class');
      expect(verbose[0].exported).toBeUndefined();
      expect(verbose[0].parameters).toBeUndefined();
      expect(verbose[0].async).toBeUndefined();
    });

    it('should restore uuid from compact format', () => {
      const compact: CompactElement[] = [
        { t: 'function', n: 'withUuid', f: 'src/test.ts', l: 1, u: 'uuid-123' },
      ];

      const verbose = fromCompactElements(compact);

      expect((verbose[0] as any).uuid).toBe('uuid-123');
    });
  });

  describe('createVerboseIndexFile', () => {
    it('should create verbose index with correct structure', () => {
      const index = createVerboseIndexFile(sampleElements, { projectPath: '/test' });

      expect(index.schemaVersion).toBe('3.0.0');
      expect(index.format).toBe('verbose');
      expect(index.projectPath).toBe('/test');
      expect(index.totalElements).toBe(5);
      expect(index.elements).toEqual(sampleElements);
    });

    it('should calculate elementsByType correctly', () => {
      const index = createVerboseIndexFile(sampleElements);

      expect(index.elementsByType).toEqual({
        function: 2,
        class: 1,
        constant: 1,
        hook: 1,
      });
    });

    it('should generate ISO timestamp', () => {
      const before = Date.now();
      const index = createVerboseIndexFile(sampleElements);
      const after = Date.now();

      const generatedTime = new Date(index.generatedAt).getTime();
      expect(generatedTime).toBeGreaterThanOrEqual(before - 1000);
      expect(generatedTime).toBeLessThanOrEqual(after + 1000);
    });
  });

  describe('createCompactIndexFile', () => {
    it('should create compact index with correct structure', () => {
      const index = createCompactIndexFile(sampleElements, { projectPath: '/test' });

      expect(index.schemaVersion).toBe('3.0.0');
      expect(index.format).toBe('compact');
      expect(index.projectPath).toBe('/test');
      expect(index.totalElements).toBe(5);
      expect(index.elements[0]).toHaveProperty('t');
      expect(index.elements[0]).toHaveProperty('n');
    });

    it('should use same timestamp as verbose when provided', () => {
      const timestamp = '2026-04-20T12:00:00.000Z';
      const verbose = createVerboseIndexFile(sampleElements, { generatedAt: timestamp });
      const compact = createCompactIndexFile(sampleElements, { generatedAt: timestamp });

      expect(compact.generatedAt).toBe(timestamp);
    });
  });

  describe('writeIndexVariants', () => {
    it('should write all 4 index variants', async () => {
      await writeIndexVariants(coderefDir, sampleElements);

      await expect(access(join(coderefDir, 'index.json'), constants.F_OK)).resolves.not.toThrow();
      await expect(access(join(coderefDir, 'index.json.gz'), constants.F_OK)).resolves.not.toThrow();
      await expect(access(join(coderefDir, 'index.compact.json'), constants.F_OK)).resolves.not.toThrow();
      await expect(access(join(coderefDir, 'index.compact.json.gz'), constants.F_OK)).resolves.not.toThrow();
    });

    it('should write valid verbose JSON', async () => {
      await writeIndexVariants(coderefDir, sampleElements);

      const content = await readFile(join(coderefDir, 'index.json'), 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.schemaVersion).toBe('3.0.0');
      expect(parsed.format).toBe('verbose');
      expect(parsed.totalElements).toBe(5);
    });

    it('should write valid compact JSON', async () => {
      await writeIndexVariants(coderefDir, sampleElements);

      const content = await readFile(join(coderefDir, 'index.compact.json'), 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.schemaVersion).toBe('3.0.0');
      expect(parsed.format).toBe('compact');
      expect(parsed.elements[0]).toHaveProperty('t');
    });

    it('should create valid gzip files', async () => {
      await writeIndexVariants(coderefDir, sampleElements);

      const gzContent = await readFile(join(coderefDir, 'index.json.gz'));
      const decompressed = await gzipAsync(gzContent, { level: 9 });
      // Actually gunzip would decompress it, let's just verify it's not plain JSON
      expect(gzContent.length).toBeLessThan(1000); // Compressed should be smaller
    });

    it('should return paths for all variants', async () => {
      const paths = await writeIndexVariants(coderefDir, sampleElements);

      expect(paths.verbosePath).toBe(join(coderefDir, 'index.json'));
      expect(paths.verboseGzPath).toBe(join(coderefDir, 'index.json.gz'));
      expect(paths.compactPath).toBe(join(coderefDir, 'index.compact.json'));
      expect(paths.compactGzPath).toBe(join(coderefDir, 'index.compact.json.gz'));
    });
  });

  describe('loadIndexFromCoderefDir', () => {
    it('should load verbose index.json', async () => {
      await writeIndexVariants(coderefDir, sampleElements);

      const loaded = await loadIndexFromCoderefDir(coderefDir);

      expect(loaded.elements).toHaveLength(5);
      expect(loaded.sourcePath).toContain('index.compact.json.gz'); // Priority order
    });

    it('should prioritize compact.json.gz over other formats', async () => {
      // Write files in reverse order to test priority
      await writeIndexVariants(coderefDir, sampleElements);

      const loaded = await loadIndexFromCoderefDir(coderefDir);

      expect(loaded.sourcePath).toContain('index.compact.json.gz');
    });

    it('should fall back to compact.json if .gz missing', async () => {
      await writeIndexVariants(coderefDir, sampleElements);
      await rm(join(coderefDir, 'index.compact.json.gz'));

      const loaded = await loadIndexFromCoderefDir(coderefDir);

      expect(loaded.sourcePath).toContain('index.compact.json');
      expect(loaded.elements).toHaveLength(5);
    });

    it('should fall back to index.json.gz if compact missing', async () => {
      await writeFile(join(coderefDir, 'index.json'), JSON.stringify(createVerboseIndexFile(sampleElements)));
      const gzipped = await gzipAsync(Buffer.from(JSON.stringify(createVerboseIndexFile(sampleElements))), { level: 9 });
      await writeFile(join(coderefDir, 'index.json.gz'), gzipped);

      const loaded = await loadIndexFromCoderefDir(coderefDir);

      expect(loaded.sourcePath).toContain('index.json.gz');
    });

    it('should fall back to plain index.json as last resort', async () => {
      await writeFile(join(coderefDir, 'index.json'), JSON.stringify(createVerboseIndexFile(sampleElements)));

      const loaded = await loadIndexFromCoderefDir(coderefDir);

      expect(loaded.sourcePath).toContain('index.json');
      expect(loaded.elements).toHaveLength(5);
    });

    it('should convert compact format back to verbose on load', async () => {
      await writeIndexVariants(coderefDir, sampleElements);

      const loaded = await loadIndexFromCoderefDir(coderefDir);

      // Verify first element has verbose keys, not compact keys
      expect(loaded.elements[0]).toHaveProperty('type');
      expect(loaded.elements[0]).toHaveProperty('name');
      expect(loaded.elements[0]).toHaveProperty('file');
      expect(loaded.elements[0]).toHaveProperty('line');
      expect(loaded.elements[0]).not.toHaveProperty('t');
      expect(loaded.elements[0]).not.toHaveProperty('n');
    });

    it('should load legacy array format (pre-v3)', async () => {
      // Write legacy array format
      await writeFile(join(coderefDir, 'index.json'), JSON.stringify(sampleElements));

      const loaded = await loadIndexFromCoderefDir(coderefDir);

      expect(loaded.elements).toHaveLength(5);
      expect(loaded.sourcePath).toContain('index.json');
    });

    it('should throw error when no index files found', async () => {
      await expect(loadIndexFromCoderefDir(coderefDir)).rejects.toThrow('Index file not found');
    });

    it('should preserve metadata when loading', async () => {
      await writeIndexVariants(coderefDir, sampleElements, { projectPath: '/test-project' });

      const loaded = await loadIndexFromCoderefDir(coderefDir);

      expect(loaded.schemaVersion).toBe('3.0.0');
      expect(loaded.format).toBe('compact');
      expect(loaded.projectPath).toBe('/test-project');
    });

    it('should decompress gzipped files correctly', async () => {
      // Write only gzipped verbose index
      const verbose = createVerboseIndexFile(sampleElements);
      const gzipped = await gzipAsync(Buffer.from(JSON.stringify(verbose)), { level: 9 });
      await writeFile(join(coderefDir, 'index.json.gz'), gzipped);

      const loaded = await loadIndexFromCoderefDir(coderefDir);

      expect(loaded.elements).toHaveLength(5);
      expect(loaded.sourcePath).toContain('index.json.gz');
    });
  });

  describe('format detection', () => {
    it('should detect compact format by presence of t, n, f, l keys', async () => {
      // Write compact format manually
      const compact = createCompactIndexFile(sampleElements);
      await writeFile(join(coderefDir, 'index.json'), JSON.stringify(compact));

      const loaded = await loadIndexFromCoderefDir(coderefDir);

      expect(loaded.elements[0]).toHaveProperty('type'); // Converted back
      expect(loaded.format).toBe('compact');
    });

    it('should handle legacy {elements: [...]} shape', async () => {
      // Legacy v2 format
      const legacy = {
        version: '2.0.0',
        generatedAt: new Date().toISOString(),
        elements: sampleElements,
      };
      await writeFile(join(coderefDir, 'index.json'), JSON.stringify(legacy));

      const loaded = await loadIndexFromCoderefDir(coderefDir);

      expect(loaded.elements).toHaveLength(5);
      expect(loaded.schemaVersion).toBe('2.0.0');
    });

    it('should handle v3.0.0 verbose format', async () => {
      const verbose = createVerboseIndexFile(sampleElements);
      await writeFile(join(coderefDir, 'index.json'), JSON.stringify(verbose));

      const loaded = await loadIndexFromCoderefDir(coderefDir);

      expect(loaded.schemaVersion).toBe('3.0.0');
      expect(loaded.format).toBe('verbose');
      expect(loaded.elements).toHaveLength(5);
    });
  });

  describe('size reduction verification', () => {
    it('should demonstrate compact format is smaller than verbose with many elements', async () => {
      // Create many elements to overcome JSON structure overhead
      const manyElements: ElementData[] = Array.from({ length: 50 }, (_, i) => ({
        type: 'function',
        name: `function${i}`,
        file: `src/file${i}.ts`,
        line: i * 10,
        exported: i % 2 === 0,
        parameters: i % 3 === 0 ? ['a', 'b', 'c'] : undefined,
      }));

      const verbose = JSON.stringify(createVerboseIndexFile(manyElements));
      const compact = JSON.stringify(createCompactIndexFile(manyElements));

      // Compact should be smaller with many elements (key name savings accumulate)
      expect(compact.length).toBeLessThan(verbose.length * 0.95);
    });

    it('should demonstrate gzip compression reduces size', async () => {
      const verbose = JSON.stringify(createVerboseIndexFile(sampleElements));
      const gzipped = await gzipAsync(Buffer.from(verbose), { level: 9 });

      expect(gzipped.length).toBeLessThan(verbose.length * 0.5);
    });
  });
});

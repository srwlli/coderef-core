/**
 * Save Index Test Suite
 *
 * Workorder: WO-CODEREF-CLI-IMPLEMENTATION-001
 * Part 1: Test saveIndex() function
 *
 * Tests:
 * - File creation in .coderef/index.json
 * - Directory creation if missing
 * - JSON structure and metadata
 * - Element counts by type
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { saveIndex } from '../saveIndex.js';
import type { ElementData } from '../../types/types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir, rm, readFile, access } from 'fs/promises';
import { constants } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('saveIndex() - File Generation', () => {
  let testProjectDir: string;
  let testElements: ElementData[];

  beforeEach(async () => {
    // Create temporary project directory
    testProjectDir = join(__dirname, '.test-project');
    await mkdir(testProjectDir, { recursive: true });

    // Create sample elements
    testElements = [
      {
        type: 'function',
        name: 'authenticateUser',
        file: 'src/auth.ts',
        line: 10,
        exported: true,
        parameters: ['username', 'password'],
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
      },
      {
        type: 'constant',
        name: 'API_KEY',
        file: 'src/config.ts',
        line: 5,
        exported: true,
      },
    ];
  });

  afterEach(async () => {
    // Clean up test directory (with retry for Windows)
    try {
      await rm(testProjectDir, { recursive: true, force: true });
    } catch (error) {
      // Windows sometimes locks files, wait and retry
      await new Promise(resolve => setTimeout(resolve, 100));
      try {
        await rm(testProjectDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors in tests
      }
    }
  });

  it('should create .coderef directory if it does not exist', async () => {
    await saveIndex(testProjectDir, testElements);

    const coderefDir = join(testProjectDir, '.coderef');
    await expect(access(coderefDir, constants.F_OK)).resolves.not.toThrow();
  });

  it('should create index.json file in .coderef directory', async () => {
    await saveIndex(testProjectDir, testElements);

    const indexPath = join(testProjectDir, '.coderef', 'index.json');
    await expect(access(indexPath, constants.F_OK)).resolves.not.toThrow();
  });

  it('should create compressed and compact index variants', async () => {
    await saveIndex(testProjectDir, testElements);

    const coderefDir = join(testProjectDir, '.coderef');
    await expect(access(join(coderefDir, 'index.json.gz'), constants.F_OK)).resolves.not.toThrow();
    await expect(access(join(coderefDir, 'index.compact.json'), constants.F_OK)).resolves.not.toThrow();
    await expect(access(join(coderefDir, 'index.compact.json.gz'), constants.F_OK)).resolves.not.toThrow();
  });

  it('should write valid JSON with correct structure', async () => {
    await saveIndex(testProjectDir, testElements);

    const indexPath = join(testProjectDir, '.coderef', 'index.json');
    const content = await readFile(indexPath, 'utf-8');
    const data = JSON.parse(content);

    expect(data).toHaveProperty('schemaVersion');
    expect(data).toHaveProperty('format');
    expect(data).toHaveProperty('generatedAt');
    expect(data).toHaveProperty('projectPath');
    expect(data).toHaveProperty('totalElements');
    expect(data).toHaveProperty('elementsByType');
    expect(data).toHaveProperty('elements');
  });

  it('should include correct metadata', async () => {
    await saveIndex(testProjectDir, testElements);

    const indexPath = join(testProjectDir, '.coderef', 'index.json');
    const content = await readFile(indexPath, 'utf-8');
    const data = JSON.parse(content);

    expect(data.schemaVersion).toBe('3.0.0');
    expect(data.format).toBe('verbose');
    expect(data.projectPath).toBe(testProjectDir);
    expect(data.totalElements).toBe(4);
    expect(Array.isArray(data.elements)).toBe(true);
    expect(data.elements.length).toBe(4);
  });

  it('should calculate element counts by type correctly', async () => {
    await saveIndex(testProjectDir, testElements);

    const indexPath = join(testProjectDir, '.coderef', 'index.json');
    const content = await readFile(indexPath, 'utf-8');
    const data = JSON.parse(content);

    expect(data.elementsByType).toEqual({
      function: 2,
      class: 1,
      constant: 1,
    });
  });

  it('should preserve all element data', async () => {
    await saveIndex(testProjectDir, testElements);

    const indexPath = join(testProjectDir, '.coderef', 'index.json');
    const content = await readFile(indexPath, 'utf-8');
    const data = JSON.parse(content);

    const authFunc = data.elements.find((el: ElementData) => el.name === 'authenticateUser');
    expect(authFunc).toBeDefined();
    expect(authFunc.type).toBe('function');
    expect(authFunc.file).toBe('src/auth.ts');
    expect(authFunc.line).toBe(10);
    expect(authFunc.exported).toBe(true);
    expect(authFunc.parameters).toEqual(['username', 'password']);
  });

  it('should handle empty elements array', async () => {
    await saveIndex(testProjectDir, []);

    const indexPath = join(testProjectDir, '.coderef', 'index.json');
    const content = await readFile(indexPath, 'utf-8');
    const data = JSON.parse(content);

    expect(data.totalElements).toBe(0);
    expect(data.elements).toEqual([]);
    expect(data.elementsByType).toEqual({});
  });

  it('should generate ISO timestamp', async () => {
    const beforeTime = Date.now();
    await saveIndex(testProjectDir, testElements);
    const afterTime = Date.now();

    const indexPath = join(testProjectDir, '.coderef', 'index.json');
    const content = await readFile(indexPath, 'utf-8');
    const data = JSON.parse(content);

    expect(data.generatedAt).toBeTruthy();
    const generatedTime = new Date(data.generatedAt).getTime();
    expect(generatedTime).toBeGreaterThanOrEqual(beforeTime - 1000); // Allow 1s margin
    expect(generatedTime).toBeLessThanOrEqual(afterTime + 1000); // Allow 1s margin
  });

  it('should handle large element arrays', async () => {
    const largeElements: ElementData[] = Array.from({ length: 100 }, (_, i) => ({
      type: 'function',
      name: `function${i}`,
      file: `src/file${i % 10}.ts`,
      line: i * 10,
      exported: i % 2 === 0,
    }));

    await saveIndex(testProjectDir, largeElements);

    const indexPath = join(testProjectDir, '.coderef', 'index.json');
    const content = await readFile(indexPath, 'utf-8');
    const data = JSON.parse(content);

    expect(data.totalElements).toBe(100);
    expect(data.elements.length).toBe(100);
    expect(data.elementsByType.function).toBe(100);
  });
});

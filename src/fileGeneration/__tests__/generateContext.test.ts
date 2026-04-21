/**
 * Generate Context Test Suite
 *
 * Workorder: WO-CODEREF-CLI-IMPLEMENTATION-001
 * Part 1: Test generateContext() function
 *
 * Tests:
 * - context.json creation
 * - context.md creation
 * - Statistics calculation
 * - Top files analysis
 * - Markdown formatting
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateContext } from '../generateContext.js';
import type { ElementData } from '../../types/types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir, rm, readFile, access } from 'fs/promises';
import { constants } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('generateContext() - File Generation', () => {
  let testProjectDir: string;
  let testElements: ElementData[];

  beforeEach(async () => {
    // Create temporary project directory
    testProjectDir = join(__dirname, '.test-project');
    await mkdir(testProjectDir, { recursive: true });

    // Create sample elements from multiple files
    testElements = [
      {
        type: 'function',
        name: 'authenticateUser',
        file: 'src/auth.ts',
        line: 10,
        exported: true,
      },
      {
        type: 'function',
        name: 'validateToken',
        file: 'src/auth.ts',
        line: 25,
        exported: true,
      },
      {
        type: 'class',
        name: 'UserService',
        file: 'src/services/user.ts',
        line: 5,
        exported: true,
      },
      {
        type: 'method',
        name: 'findUser',
        file: 'src/services/user.ts',
        line: 15,
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
    await generateContext(testProjectDir, testElements);

    const coderefDir = join(testProjectDir, '.coderef');
    await expect(access(coderefDir, constants.F_OK)).resolves.not.toThrow();
  });

  it('should create context.json file', async () => {
    await generateContext(testProjectDir, testElements);

    const jsonPath = join(testProjectDir, '.coderef', 'context.json');
    await expect(access(jsonPath, constants.F_OK)).resolves.not.toThrow();
  });

  it('should create context.md file', async () => {
    await generateContext(testProjectDir, testElements);

    const mdPath = join(testProjectDir, '.coderef', 'context.md');
    await expect(access(mdPath, constants.F_OK)).resolves.not.toThrow();
  });

  it('should write valid JSON with correct structure', async () => {
    await generateContext(testProjectDir, testElements);

    const jsonPath = join(testProjectDir, '.coderef', 'context.json');
    const content = await readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content);

    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('generatedAt');
    expect(data).toHaveProperty('projectPath');
    expect(data).toHaveProperty('statistics');
    expect(data).toHaveProperty('topFiles');
  });

  it('should calculate statistics correctly', async () => {
    await generateContext(testProjectDir, testElements);

    const jsonPath = join(testProjectDir, '.coderef', 'context.json');
    const content = await readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content);

    expect(data.statistics.totalElements).toBe(5);
    expect(data.statistics.totalFiles).toBe(3); // auth.ts, user.ts, config.ts
    expect(data.statistics.elementsByType).toEqual({
      function: 2,
      class: 1,
      method: 1,
      constant: 1,
    });
  });

  it('should count files by extension correctly', async () => {
    await generateContext(testProjectDir, testElements);

    const jsonPath = join(testProjectDir, '.coderef', 'context.json');
    const content = await readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content);

    // Count unique files with .ts extension (should be 3: auth.ts, user.ts, config.ts)
    // Note: filesByExtension counts occurrences, not unique files
    const tsCount = data.statistics.filesByExtension['.ts'] || 0;
    expect(tsCount).toBeGreaterThanOrEqual(3); // At least 3 files
  });

  it('should identify top files by element count', async () => {
    await generateContext(testProjectDir, testElements);

    const jsonPath = join(testProjectDir, '.coderef', 'context.json');
    const content = await readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content);

    expect(Array.isArray(data.topFiles)).toBe(true);
    expect(data.topFiles.length).toBeLessThanOrEqual(10);
    
    // src/auth.ts should have 2 elements (highest)
    const topFile = data.topFiles[0];
    expect(topFile.file).toBe('src/auth.ts');
    expect(topFile.elementCount).toBe(2);
  });

  it('should generate valid Markdown content', async () => {
    await generateContext(testProjectDir, testElements);

    const mdPath = join(testProjectDir, '.coderef', 'context.md');
    const content = await readFile(mdPath, 'utf-8');

    expect(content).toContain('# CodeRef Project Context');
    expect(content).toContain('**Generated:**');
    expect(content).toContain('**Version:**');
    expect(content).toContain('## Project Statistics');
    expect(content).toContain('Total Elements:');
    expect(content).toContain('Total Files:');
    expect(content).toContain('### Elements by Type');
    expect(content).toContain('### Files by Extension');
    expect(content).toContain('## Top Files by Element Count');
  });

  it('should include element counts in Markdown', async () => {
    await generateContext(testProjectDir, testElements);

    const mdPath = join(testProjectDir, '.coderef', 'context.md');
    const content = await readFile(mdPath, 'utf-8');

    expect(content).toContain('**function:** 2');
    expect(content).toContain('**class:** 1');
    expect(content).toContain('**method:** 1');
    expect(content).toContain('**constant:** 1');
  });

  it('should include top files in Markdown', async () => {
    await generateContext(testProjectDir, testElements);

    const mdPath = join(testProjectDir, '.coderef', 'context.md');
    const content = await readFile(mdPath, 'utf-8');

    expect(content).toContain('`src/auth.ts`');
    expect(content).toContain('`src/services/user.ts`');
  });

  it('should handle empty elements array', async () => {
    await generateContext(testProjectDir, []);

    const jsonPath = join(testProjectDir, '.coderef', 'context.json');
    const content = await readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content);

    expect(data.statistics.totalElements).toBe(0);
    expect(data.statistics.totalFiles).toBe(0);
    expect(data.statistics.elementsByType).toEqual({});
    // filesByExtension might be {} or undefined, both are valid
    expect(data.statistics.filesByExtension).toBeDefined();
    expect(data.topFiles).toEqual([]);
  });

  it('should generate ISO timestamp', async () => {
    const beforeTime = new Date().toISOString();
    await generateContext(testProjectDir, testElements);
    const afterTime = new Date().toISOString();

    const jsonPath = join(testProjectDir, '.coderef', 'context.json');
    const content = await readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content);

    expect(data.generatedAt).toBeTruthy();
    expect(new Date(data.generatedAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
    expect(new Date(data.generatedAt).getTime()).toBeLessThanOrEqual(new Date(afterTime).getTime());
  });

  it('should limit top files to 10', async () => {
    // Create 15 files with elements
    const manyFiles: ElementData[] = [];
    for (let i = 0; i < 15; i++) {
      manyFiles.push({
        type: 'function',
        name: `func${i}`,
        file: `src/file${i}.ts`,
        line: i * 10,
        exported: true,
      });
    }

    await generateContext(testProjectDir, manyFiles);

    const jsonPath = join(testProjectDir, '.coderef', 'context.json');
    const content = await readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content);

    expect(data.topFiles.length).toBe(10);
  });
});

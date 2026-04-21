/**
 * File Generation Integration Test Suite
 *
 * Workorder: WO-CODEREF-CLI-IMPLEMENTATION-001
 * Integration Tests: Full workflow (scan → generate files)
 *
 * Tests:
 * - Complete workflow: scan → saveIndex → generateContext → buildDependencyGraph
 * - All 4 files generated correctly
 * - Parallel execution capability
 * - File consistency
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { scanCurrentElements } from '../src/scanner/scanner.js';
import { saveIndex } from '../src/fileGeneration/saveIndex.js';
import { generateContext } from '../src/fileGeneration/generateContext.js';
import { buildDependencyGraph } from '../src/fileGeneration/buildDependencyGraph.js';
import type { ElementData } from '../src/types/types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir, rm, readFile, access } from 'fs/promises';
import { constants } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('File Generation Integration (WO-CODEREF-CLI-IMPLEMENTATION-001)', () => {
  let testProjectDir: string;
  let testSourceDir: string;

  beforeAll(async () => {
    // Create temporary project structure
    testProjectDir = join(__dirname, '.test-integration-project');
    testSourceDir = join(testProjectDir, 'src');
    await mkdir(testSourceDir, { recursive: true });

    // Create sample TypeScript files
    const authFile = join(testSourceDir, 'auth.ts');
    await require('fs/promises').writeFile(authFile, `
export function authenticateUser(username: string, password: string) {
  return validateCredentials(username, password);
}

function validateCredentials(username: string, password: string) {
  return username.length > 0 && password.length > 8;
}

export class AuthService {
  async login(username: string, password: string) {
    return authenticateUser(username, password);
  }
}
    `.trim());

    const userFile = join(testSourceDir, 'user.ts');
    await require('fs/promises').writeFile(userFile, `
export class UserService {
  constructor() {}

  async findUser(id: string) {
    return { id, name: 'Test User' };
  }
}

export const DEFAULT_USER = { id: '0', name: 'Guest' };
    `.trim());
  });

  afterAll(async () => {
    // Clean up test directory
    await rm(testProjectDir, { recursive: true, force: true });
  });

  it('should complete full workflow: scan → generate all files', async () => {
    // Step 1: Scan project
    const elements = await scanCurrentElements(testSourceDir, ['ts']);

    expect(elements.length).toBeGreaterThan(0);

    // Step 2: Generate all files in parallel
    await Promise.all([
      saveIndex(testProjectDir, elements),
      generateContext(testProjectDir, elements),
      buildDependencyGraph(testProjectDir, elements),
    ]);

    // Step 3: Verify all 4 files exist
    const indexPath = join(testProjectDir, '.coderef', 'index.json');
    const contextJsonPath = join(testProjectDir, '.coderef', 'context.json');
    const contextMdPath = join(testProjectDir, '.coderef', 'context.md');
    const graphPath = join(testProjectDir, '.coderef', 'graph.json');
    const exportsGraphPath = join(testProjectDir, '.coderef', 'exports', 'graph.json');

    await expect(access(indexPath, constants.F_OK)).resolves.not.toThrow();
    await expect(access(contextJsonPath, constants.F_OK)).resolves.not.toThrow();
    await expect(access(contextMdPath, constants.F_OK)).resolves.not.toThrow();
    await expect(access(graphPath, constants.F_OK)).resolves.not.toThrow();
    await expect(access(exportsGraphPath, constants.F_OK)).resolves.not.toThrow();
  });

  it('should generate consistent data across all files', async () => {
    // Scan and generate
    const elements = await scanCurrentElements(testSourceDir, ['ts']);

    await Promise.all([
      saveIndex(testProjectDir, elements),
      generateContext(testProjectDir, elements),
      buildDependencyGraph(testProjectDir, elements),
    ]);

    // Read all files
    const indexContent = await readFile(join(testProjectDir, '.coderef', 'index.json'), 'utf-8');
    const contextContent = await readFile(join(testProjectDir, '.coderef', 'context.json'), 'utf-8');
    const graphContent = await readFile(join(testProjectDir, '.coderef', 'graph.json'), 'utf-8');

    const indexData = JSON.parse(indexContent);
    const contextData = JSON.parse(contextContent);
    const graphData = JSON.parse(graphContent);

    // Verify consistent element counts
    expect(indexData.totalElements).toBe(elements.length);
    expect(contextData.statistics.totalElements).toBe(elements.length);
    expect(graphData.statistics.totalNodes).toBeGreaterThan(0);

    // Verify consistent project path
    expect(indexData.projectPath).toBe(testProjectDir);
    expect(contextData.projectPath).toBe(testProjectDir);
    expect(graphData.projectPath).toBe(testProjectDir);
  });

  it('should handle parallel execution without conflicts', async () => {
    const elements = await scanCurrentElements(testSourceDir, ['ts']);

    // Execute all three functions in parallel multiple times
    const promises = Array.from({ length: 3 }, () =>
      Promise.all([
        saveIndex(testProjectDir, elements),
        generateContext(testProjectDir, elements),
        buildDependencyGraph(testProjectDir, elements),
      ])
    );

    await Promise.all(promises);

    // Verify files still exist and are valid
    const indexPath = join(testProjectDir, '.coderef', 'index.json');
    const content = await readFile(indexPath, 'utf-8');
    const data = JSON.parse(content);

    expect(data.totalElements).toBe(elements.length);
  });

  it('should generate files with correct timestamps', async () => {
    const beforeTime = new Date().toISOString();
    const elements = await scanCurrentElements(testSourceDir, ['ts']);

    await Promise.all([
      saveIndex(testProjectDir, elements),
      generateContext(testProjectDir, elements),
      buildDependencyGraph(testProjectDir, elements),
    ]);
    const afterTime = new Date().toISOString();

    // Check timestamps in all files
    const indexContent = await readFile(join(testProjectDir, '.coderef', 'index.json'), 'utf-8');
    const contextContent = await readFile(join(testProjectDir, '.coderef', 'context.json'), 'utf-8');
    const graphContent = await readFile(join(testProjectDir, '.coderef', 'graph.json'), 'utf-8');

    const indexData = JSON.parse(indexContent);
    const contextData = JSON.parse(contextContent);
    const graphData = JSON.parse(graphContent);

    // All timestamps should be within the execution window
    const indexTime = new Date(indexData.generatedAt).getTime();
    const contextTime = new Date(contextData.generatedAt).getTime();
    const graphTime = new Date(graphData.generatedAt).getTime();

    expect(indexTime).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
    expect(indexTime).toBeLessThanOrEqual(new Date(afterTime).getTime());
    expect(contextTime).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
    expect(contextTime).toBeLessThanOrEqual(new Date(afterTime).getTime());
    expect(graphTime).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
    expect(graphTime).toBeLessThanOrEqual(new Date(afterTime).getTime());
  });

  it('should verify all 4 required files are generated', async () => {
    const elements = await scanCurrentElements(testSourceDir, ['ts']);

    await Promise.all([
      saveIndex(testProjectDir, elements),
      generateContext(testProjectDir, elements),
      buildDependencyGraph(testProjectDir, elements),
    ]);

    // Expected files per workorder requirements
    const requiredFiles = [
      '.coderef/index.json',
      '.coderef/context.json',
      '.coderef/context.md',
      '.coderef/graph.json',
    ];

    for (const file of requiredFiles) {
      const filePath = join(testProjectDir, file);
      await expect(access(filePath, constants.F_OK)).resolves.not.toThrow();
    }

    // Bonus: exports/graph.json should also exist
    const exportsGraphPath = join(testProjectDir, '.coderef', 'exports', 'graph.json');
    await expect(access(exportsGraphPath, constants.F_OK)).resolves.not.toThrow();
  });
});

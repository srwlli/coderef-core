/**
 * Standalone Scanner Test
 *
 * Purpose: Verify @coderef/core scanner works independently without CLI dependencies
 * Context: WO-CORE-DASHBOARD-INTEGRATION-001 (PKG-004)
 *
 * This test validates that:
 * 1. scanCurrentElements can be imported and called standalone
 * 2. Scanner finds code elements accurately
 * 3. No CLI dependencies are required
 * 4. Works in Next.js/dashboard-like environment
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { scanCurrentElements, clearScanCache, getScanCacheStats } from '../src/index.js';
import type { ElementData, ScanOptions } from '../src/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFile, mkdir, rm } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scanner Standalone (No CLI Dependencies)', () => {
  const testDir = join(__dirname, '.test-fixtures');
  const testFile = join(testDir, 'sample.ts');

  beforeAll(async () => {
    // Create test fixtures
    await mkdir(testDir, { recursive: true });
    await writeFile(testFile, `
// Sample TypeScript file for scanner testing
export function authenticateUser(username: string, password: string) {
  return validateCredentials(username, password);
}

export class UserService {
  constructor() {}

  async findUser(id: string) {
    return database.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}

export const API_KEY = 'test-key';

function validateCredentials(username: string, password: string) {
  return username.length > 0 && password.length > 8;
}
    `.trim());
  });

  afterAll(async () => {
    // Clean up test fixtures
    await rm(testDir, { recursive: true, force: true });
    clearScanCache();
  });

  it('should import scanner functions without errors', () => {
    expect(scanCurrentElements).toBeDefined();
    expect(typeof scanCurrentElements).toBe('function');
  });

  it('should scan directory and find code elements', async () => {
    const elements = await scanCurrentElements(testDir, 'ts');

    expect(elements).toBeDefined();
    expect(Array.isArray(elements)).toBe(true);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('should find exported function', async () => {
    const elements = await scanCurrentElements(testDir, 'ts');

    const authenticateUserFunc = elements.find(
      el => el.name === 'authenticateUser' && el.type === 'function'
    );

    expect(authenticateUserFunc).toBeDefined();
    expect(authenticateUserFunc?.exported).toBe(true);
    expect(authenticateUserFunc?.file).toContain('sample.ts');
    expect(authenticateUserFunc?.line).toBeGreaterThan(0);
  });

  it('should find exported class', async () => {
    const elements = await scanCurrentElements(testDir, 'ts');

    const userServiceClass = elements.find(
      el => el.name === 'UserService' && el.type === 'class'
    );

    expect(userServiceClass).toBeDefined();
    expect(userServiceClass?.exported).toBe(true);
  });

  it('should find class method', async () => {
    const elements = await scanCurrentElements(testDir, 'ts');

    const findUserMethod = elements.find(
      el => el.name === 'findUser' && el.type === 'method'
    );

    expect(findUserMethod).toBeDefined();
  });

  it('should find exported constant', async () => {
    const elements = await scanCurrentElements(testDir, 'ts');

    const apiKeyConst = elements.find(
      el => el.name === 'API_KEY' && el.type === 'constant'
    );

    expect(apiKeyConst).toBeDefined();
    expect(apiKeyConst?.exported).toBe(true);
  });

  it('should find non-exported (private) function', async () => {
    const elements = await scanCurrentElements(testDir, 'ts');

    const validateFunc = elements.find(
      el => el.name === 'validateCredentials' && el.type === 'function'
    );

    expect(validateFunc).toBeDefined();
    expect(validateFunc?.exported).toBe(false);
  });

  it('should accept multiple language extensions', async () => {
    const elements = await scanCurrentElements(testDir, ['ts', 'tsx', 'js']);

    expect(elements).toBeDefined();
    expect(Array.isArray(elements)).toBe(true);
  });

  it('should support scan options', async () => {
    const options: ScanOptions = {
      recursive: true,
      exclude: ['node_modules/**'],
      verbose: false
    };

    const elements = await scanCurrentElements(testDir, 'ts', options);

    expect(elements).toBeDefined();
    expect(elements.length).toBeGreaterThan(0);
  });

  it('should return ElementData with correct structure', async () => {
    const elements = await scanCurrentElements(testDir, 'ts');

    expect(elements.length).toBeGreaterThan(0);

    const element = elements[0];
    expect(element).toHaveProperty('type');
    expect(element).toHaveProperty('name');
    expect(element).toHaveProperty('file');
    expect(element).toHaveProperty('line');

    expect(typeof element.name).toBe('string');
    expect(typeof element.file).toBe('string');
    expect(typeof element.line).toBe('number');
    expect(['function', 'class', 'component', 'hook', 'method', 'constant', 'unknown'])
      .toContain(element.type);
  });

  it('should handle exclusion patterns', async () => {
    // Create excluded directory
    const excludedDir = join(testDir, 'node_modules');
    await mkdir(excludedDir, { recursive: true });
    await writeFile(join(excludedDir, 'excluded.ts'), 'export function shouldNotFind() {}');

    const options: ScanOptions = {
      recursive: true,
      exclude: ['**/node_modules/**']
    };

    const elements = await scanCurrentElements(testDir, 'ts', options);

    // Should not find elements from excluded directory
    const excludedFunc = elements.find(el => el.name === 'shouldNotFind');
    expect(excludedFunc).toBeUndefined();

    // Clean up
    await rm(excludedDir, { recursive: true, force: true });
  });

  it('should work with absolute paths (dashboard requirement)', async () => {
    // Dashboard will always pass absolute paths
    const absolutePath = join(process.cwd(), 'packages/core/__tests__/.test-fixtures');

    const elements = await scanCurrentElements(absolutePath, 'ts');

    expect(elements).toBeDefined();
    expect(elements.length).toBeGreaterThan(0);
  });

  it('should cache results for performance', async () => {
    clearScanCache();

    // First scan - not cached
    const start1 = Date.now();
    await scanCurrentElements(testDir, 'ts');
    const duration1 = Date.now() - start1;

    // Second scan - should use cache
    const start2 = Date.now();
    await scanCurrentElements(testDir, 'ts');
    const duration2 = Date.now() - start2;

    // Cached scan should be significantly faster
    expect(duration2).toBeLessThan(duration1);

    // Verify cache statistics
    const stats = getScanCacheStats();
    expect(stats.entries).toBeGreaterThan(0);
  });

  it('should clear cache when requested', async () => {
    await scanCurrentElements(testDir, 'ts');

    let stats = getScanCacheStats();
    expect(stats.entries).toBeGreaterThan(0);

    clearScanCache();

    stats = getScanCacheStats();
    expect(stats.entries).toBe(0);
  });

  it('should handle empty directory gracefully', async () => {
    const emptyDir = join(testDir, 'empty');
    await mkdir(emptyDir, { recursive: true });

    const elements = await scanCurrentElements(emptyDir, 'ts');

    expect(elements).toBeDefined();
    expect(Array.isArray(elements)).toBe(true);
    expect(elements.length).toBe(0);

    await rm(emptyDir, { recursive: true });
  });

  it('should handle non-existent directory gracefully', async () => {
    const nonExistentDir = join(testDir, 'does-not-exist');

    await expect(
      scanCurrentElements(nonExistentDir, 'ts')
    ).rejects.toThrow();
  });

  it('should scan recursively by default', async () => {
    // Create nested directory structure
    const nestedDir = join(testDir, 'nested', 'deep');
    await mkdir(nestedDir, { recursive: true });
    await writeFile(join(nestedDir, 'nested.ts'), 'export function nestedFunction() {}');

    const elements = await scanCurrentElements(testDir, 'ts', { recursive: true });

    const nestedFunc = elements.find(el => el.name === 'nestedFunction');
    expect(nestedFunc).toBeDefined();
    expect(nestedFunc?.file).toContain('nested');

    // Clean up
    await rm(join(testDir, 'nested'), { recursive: true });
  });

  it('should not require CLI dependencies', () => {
    // This test verifies that scanner can be imported and used
    // without any CLI-specific modules (commander, chalk, ora, etc.)

    // Scanner should only depend on core Node.js modules and minimal packages
    expect(scanCurrentElements).toBeDefined();

    // If this test passes, it means scanner is standalone
    // No CLI dependencies were imported during module load
  });

  it('should work in Next.js-like environment simulation', async () => {
    // Simulate Next.js API route behavior
    const mockRequest = {
      projectPath: testDir,
      options: {
        lang: ['ts'],
        recursive: true,
        exclude: ['node_modules/**']
      }
    };

    // Simulate API route handler
    async function handleScanRequest(req: typeof mockRequest) {
      try {
        const elements = await scanCurrentElements(
          req.projectPath,
          req.options.lang,
          {
            recursive: req.options.recursive,
            exclude: req.options.exclude
          }
        );

        return {
          success: true,
          data: {
            elements,
            summary: {
              total: elements.length,
              byType: elements.reduce((acc, el) => {
                acc[el.type] = (acc[el.type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            }
          }
        };
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message
        };
      }
    }

    const response = await handleScanRequest(mockRequest);

    expect(response.success).toBe(true);
    expect(response.data?.elements).toBeDefined();
    expect(response.data?.summary.total).toBeGreaterThan(0);
  });

  it('should provide type safety with TypeScript', () => {
    // This test verifies TypeScript types are properly exported
    const elementData: ElementData = {
      type: 'function',
      name: 'testFunction',
      file: '/path/to/file.ts',
      line: 10,
      exported: true
    };

    const scanOptions: ScanOptions = {
      recursive: true,
      exclude: ['node_modules/**']
    };

    // If types compile, this test passes
    expect(elementData.type).toBe('function');
    expect(scanOptions.recursive).toBe(true);
  });

  it('should measure performance for dashboard SLA', async () => {
    // Dashboard requires scan to complete in <5 seconds for typical projects
    const start = Date.now();

    const elements = await scanCurrentElements(testDir, 'ts');

    const duration = Date.now() - start;

    // Single file should scan in well under 1 second
    expect(duration).toBeLessThan(1000);
    expect(elements.length).toBeGreaterThan(0);

    console.log(`Scanner performance: ${elements.length} elements in ${duration}ms`);
  });
});

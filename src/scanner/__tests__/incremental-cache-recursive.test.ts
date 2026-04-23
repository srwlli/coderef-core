/**
 * IMP-CORE-076: Recursive incremental cache tests
 * Tests for proper cache behavior with nested directory structures
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { scanCurrentElements } from '../scanner.js';
import { IncrementalCache } from '../../cache/incremental-cache.js';

// Test directory structure:
// test-root/
//   root.ts
//   nested/
//     nested.ts
//     deep/
//       deep.ts

const TEST_ROOT = path.join(process.cwd(), 'test-incremental-root');
const CACHE_PATH = path.join(TEST_ROOT, '.coderef', 'incremental-cache.json');

function createTestFile(filePath: string, content: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
}

function cleanupTestDir() {
  if (fs.existsSync(TEST_ROOT)) {
    fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  }
}

describe('IMP-CORE-076: Recursive Incremental Cache', () => {
  beforeEach(() => {
    cleanupTestDir();
    fs.mkdirSync(TEST_ROOT, { recursive: true });
  });

  afterEach(() => {
    cleanupTestDir();
  });

  it('should cache all files from recursive scan including nested files', async () => {
    // Arrange: Create test files
    createTestFile(
      path.join(TEST_ROOT, 'root.ts'),
      'export function rootFunc() { return "root"; }'
    );
    createTestFile(
      path.join(TEST_ROOT, 'nested', 'nested.ts'),
      'export function nestedFunc() { return "nested"; }'
    );
    createTestFile(
      path.join(TEST_ROOT, 'nested', 'deep', 'deep.ts'),
      'export function deepFunc() { return "deep"; }'
    );

    // Act: First scan (creates cache)
    const cache1 = new IncrementalCache(TEST_ROOT, true);
    await cache1.load();
    
    const result1 = await scanCurrentElements(TEST_ROOT, ['ts'], {
      recursive: true,
      cache: cache1,
      verbose: false
    });
    
    await cache1.updateCache(cache1['cache'].files.keys() as unknown as string[]);
    await cache1.save();

    // Assert: Should find all 3 functions
    expect(result1).toHaveLength(3);
    const funcNames = result1.map(e => e.name).sort();
    expect(funcNames).toEqual(['deepFunc', 'nestedFunc', 'rootFunc']);

    // Verify cache has all 3 files
    const cacheData = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    const cachedFiles = Object.keys(cacheData.files);
    expect(cachedFiles).toHaveLength(3);
    expect(cachedFiles.some(f => f.includes('root.ts'))).toBe(true);
    expect(cachedFiles.some(f => f.includes('nested.ts'))).toBe(true);
    expect(cachedFiles.some(f => f.includes('deep.ts'))).toBe(true);
  });

  it('should skip all nested files on second unchanged recursive scan', async () => {
    // Arrange: Create test files
    createTestFile(
      path.join(TEST_ROOT, 'root.ts'),
      'export function rootFunc() { return "root"; }'
    );
    createTestFile(
      path.join(TEST_ROOT, 'nested', 'nested.ts'),
      'export function nestedFunc() { return "nested"; }'
    );
    createTestFile(
      path.join(TEST_ROOT, 'nested', 'deep', 'deep.ts'),
      'export function deepFunc() { return "deep"; }'
    );

    // First scan to populate cache
    const cache1 = new IncrementalCache(TEST_ROOT, true);
    await cache1.load();
    
    await scanCurrentElements(TEST_ROOT, ['ts'], {
      recursive: true,
      cache: cache1,
      verbose: false
    });
    
    await cache1.updateCache(cache1['cache'].files.keys() as unknown as string[]);
    await cache1.save();

    // Act: Second scan (should use cache)
    const cache2 = new IncrementalCache(TEST_ROOT, true);
    await cache2.load();

    let scannedFiles: string[] = [];
    let skippedFiles: string[] = [];

    // Override checkFiles to capture what's happening
    const originalCheckFiles = cache2.checkFiles.bind(cache2);
    cache2.checkFiles = async (files: string[]) => {
      const result = await originalCheckFiles(files);
      scannedFiles = result.filesToScan;
      skippedFiles = result.filesUnchanged;
      return result;
    };

    const result2 = await scanCurrentElements(TEST_ROOT, ['ts'], {
      recursive: true,
      cache: cache2,
      verbose: false
    });

    // Assert: Should skip all 3 files (100% hit ratio)
    expect(result2).toHaveLength(3);
    expect(scannedFiles).toHaveLength(0);
    expect(skippedFiles).toHaveLength(3);
  });

  it('should remove deleted nested files from cache', async () => {
    // Arrange: Create test files
    createTestFile(
      path.join(TEST_ROOT, 'root.ts'),
      'export function rootFunc() { return "root"; }'
    );
    createTestFile(
      path.join(TEST_ROOT, 'nested', 'nested.ts'),
      'export function nestedFunc() { return "nested"; }'
    );
    createTestFile(
      path.join(TEST_ROOT, 'nested', 'deep', 'deep.ts'),
      'export function deepFunc() { return "deep"; }'
    );

    // First scan to populate cache
    const cache1 = new IncrementalCache(TEST_ROOT, true);
    await cache1.load();
    
    await scanCurrentElements(TEST_ROOT, ['ts'], {
      recursive: true,
      cache: cache1,
      verbose: false
    });
    
    await cache1.updateCache(cache1['cache'].files.keys() as unknown as string[]);
    await cache1.save();

    // Delete a nested file
    fs.unlinkSync(path.join(TEST_ROOT, 'nested', 'deep', 'deep.ts'));

    // Act: Second scan should detect deletion
    const cache2 = new IncrementalCache(TEST_ROOT, true);
    await cache2.load();

    let deletedFiles: string[] = [];

    // Override checkFiles to capture deleted files
    const originalCheckFiles = cache2.checkFiles.bind(cache2);
    cache2.checkFiles = async (files: string[]) => {
      const result = await originalCheckFiles(files);
      deletedFiles = result.filesDeleted;
      return result;
    };

    const result2 = await scanCurrentElements(TEST_ROOT, ['ts'], {
      recursive: true,
      cache: cache2,
      verbose: false
    });

    // Assert: Should detect deleted file and remove from cache
    expect(result2).toHaveLength(2); // Only 2 functions remain
    expect(deletedFiles).toHaveLength(1);
    expect(deletedFiles[0]).toContain('deep.ts');

    // Verify cache no longer has deleted file
    await cache2.updateCache(cache2['cache'].files.keys() as unknown as string[]);
    await cache2.save();
    
    const cacheData = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    const cachedFiles = Object.keys(cacheData.files);
    expect(cachedFiles).toHaveLength(2);
    expect(cachedFiles.some(f => f.includes('deep.ts'))).toBe(false);
  });

  it('should respect recursive: false and only cache top-level files', async () => {
    // Arrange: Create test files
    createTestFile(
      path.join(TEST_ROOT, 'root.ts'),
      'export function rootFunc() { return "root"; }'
    );
    createTestFile(
      path.join(TEST_ROOT, 'nested', 'nested.ts'),
      'export function nestedFunc() { return "nested"; }'
    );

    // Act: Scan with recursive: false
    const cache1 = new IncrementalCache(TEST_ROOT, true);
    await cache1.load();
    
    const result1 = await scanCurrentElements(TEST_ROOT, ['ts'], {
      recursive: false,
      cache: cache1,
      verbose: false
    });
    
    await cache1.updateCache(cache1['cache'].files.keys() as unknown as string[]);
    await cache1.save();

    // Assert: Should only find root function
    expect(result1).toHaveLength(1);
    expect(result1[0].name).toBe('rootFunc');

    // Verify cache only has root.ts
    const cacheData = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    const cachedFiles = Object.keys(cacheData.files);
    expect(cachedFiles).toHaveLength(1);
    expect(cachedFiles[0]).toContain('root.ts');
  });
});

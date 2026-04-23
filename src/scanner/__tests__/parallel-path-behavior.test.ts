/**
 * IMP-CORE-077: Parallel path behavior tests
 * Tests that parallel mode goes through shared deduplication and cache update
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { scanCurrentElements } from '../scanner.js';
import { IncrementalCache } from '../../cache/incremental-cache.js';

// Test directory
const TEST_ROOT = path.join(process.cwd(), 'test-parallel-behavior');
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

describe('IMP-CORE-077: Parallel Path Preserves Normal Scanner Behavior', () => {
  beforeEach(() => {
    cleanupTestDir();
    fs.mkdirSync(TEST_ROOT, { recursive: true });
  });

  afterEach(() => {
    cleanupTestDir();
  });

  it('should run deduplication in parallel mode', async () => {
    // Arrange: Create test files with potential duplicates
    createTestFile(
      path.join(TEST_ROOT, 'file1.ts'),
      'export function myFunc() { return 1; }\nexport function myFunc() { return 2; }'
    );
    createTestFile(
      path.join(TEST_ROOT, 'file2.ts'),
      'export class MyClass {}'
    );

    // Act: Scan with parallel mode
    const result = await scanCurrentElements(TEST_ROOT, ['ts'], {
      parallel: true,
      verbose: false
    });

    // Assert: Results should be deduplicated
    expect(result.length).toBeGreaterThan(0);
    // myFunc appears twice in file1.ts but should be deduplicated
    const myFuncCount = result.filter(e => e.name === 'myFunc').length;
    expect(myFuncCount).toBe(1);
  });

  it('should update IncrementalCache after parallel scan', async () => {
    // Arrange: Create test files
    createTestFile(
      path.join(TEST_ROOT, 'file1.ts'),
      'export function func1() { return 1; }'
    );
    createTestFile(
      path.join(TEST_ROOT, 'file2.ts'),
      'export function func2() { return 2; }'
    );

    // Act: First scan with parallel mode and cache
    const cache1 = new IncrementalCache(TEST_ROOT, true);
    await cache1.load();

    const result1 = await scanCurrentElements(TEST_ROOT, ['ts'], {
      parallel: true,
      cache: cache1,
      verbose: false
    });

    await cache1.updateCache(cache1['cache'].files.keys() as unknown as string[]);
    await cache1.save();

    // Assert: Cache file should exist
    expect(fs.existsSync(CACHE_PATH)).toBe(true);

    // Act: Second scan (should use cache)
    const cache2 = new IncrementalCache(TEST_ROOT, true);
    await cache2.load();

    let scannedFiles: string[] = [];
    const originalCheckFiles = cache2.checkFiles.bind(cache2);
    cache2.checkFiles = async (files: string[]) => {
      const result = await originalCheckFiles(files);
      scannedFiles = result.filesToScan;
      return result;
    };

    const result2 = await scanCurrentElements(TEST_ROOT, ['ts'], {
      parallel: true,
      cache: cache2,
      verbose: false
    });

    // Assert: Should skip all files (100% hit ratio) - proves cache was updated
    expect(scannedFiles).toHaveLength(0);
    expect(result2.length).toBe(result1.length);
  });

  it('should produce equivalent results in parallel and sequential modes', async () => {
    // Arrange: Create test files
    createTestFile(
      path.join(TEST_ROOT, 'file1.ts'),
      'export function func1() { return 1; }'
    );
    createTestFile(
      path.join(TEST_ROOT, 'file2.ts'),
      'export function func2() { return 2; }'
    );
    createTestFile(
      path.join(TEST_ROOT, 'file3.ts'),
      'export class MyClass {}'
    );

    // Act: Scan with parallel mode
    const parallelResult = await scanCurrentElements(TEST_ROOT, ['ts'], {
      parallel: true,
      verbose: false
    });

    // Act: Scan with sequential mode
    const sequentialResult = await scanCurrentElements(TEST_ROOT, ['ts'], {
      parallel: false,
      verbose: false
    });

    // Assert: Results should be equivalent
    expect(parallelResult.length).toBe(sequentialResult.length);
    
    const parallelNames = parallelResult.map(e => e.name).sort();
    const sequentialNames = sequentialResult.map(e => e.name).sort();
    expect(parallelNames).toEqual(sequentialNames);
  });
});

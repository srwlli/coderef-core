/**
 * Progress Reporting Tests - Phase 5
 *
 * Tests the progress callback functionality during scanning
 * Validates progress updates are called with correct data
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanCurrentElements, clearScanCache } from '../scanner.js';

describe('Progress Reporting', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-progress-test-'));
    clearScanCache();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Basic Progress Tracking', () => {
    it('should call onProgress callback for each file processed', async () => {
      // Create 3 test files
      for (let i = 1; i <= 3; i++) {
        const testFile = path.join(tempDir, `file${i}.ts`);
        fs.writeFileSync(testFile, `
export function func${i}() {
  return ${i};
}
`);
      }

      const progressUpdates: any[] = [];
      const onProgress = vi.fn((progress) => {
        progressUpdates.push(progress);
      });

      await scanCurrentElements(tempDir, ['ts'], {
        useAST: true,
        recursive: false,
        onProgress
      });

      // Should have been called 3 times (once per file)
      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(progressUpdates.length).toBe(3);

      // Verify progress data structure
      for (const update of progressUpdates) {
        expect(update).toHaveProperty('currentFile');
        expect(update).toHaveProperty('filesProcessed');
        expect(update).toHaveProperty('totalFiles');
        expect(update).toHaveProperty('elementsFound');
        expect(update).toHaveProperty('percentComplete');
        expect(update.totalFiles).toBe(3);
      }
    });

    it('should report correct filesProcessed count', async () => {
      // Create 5 test files
      for (let i = 1; i <= 5; i++) {
        const testFile = path.join(tempDir, `test${i}.ts`);
        fs.writeFileSync(testFile, `export const val${i} = ${i};`);
      }

      const progressUpdates: any[] = [];

      await scanCurrentElements(tempDir, ['ts'], {
        useAST: true,
        recursive: false,
        onProgress: (progress) => {
          progressUpdates.push(progress);
        }
      });

      // Verify sequential count
      expect(progressUpdates[0].filesProcessed).toBe(1);
      expect(progressUpdates[1].filesProcessed).toBe(2);
      expect(progressUpdates[2].filesProcessed).toBe(3);
      expect(progressUpdates[3].filesProcessed).toBe(4);
      expect(progressUpdates[4].filesProcessed).toBe(5);
    });

    it('should report correct percentComplete', async () => {
      // Create 4 test files for easy percentage calculation (25%, 50%, 75%, 100%)
      for (let i = 1; i <= 4; i++) {
        const testFile = path.join(tempDir, `file${i}.ts`);
        fs.writeFileSync(testFile, `export const x${i} = ${i};`);
      }

      const progressUpdates: any[] = [];

      await scanCurrentElements(tempDir, ['ts'], {
        useAST: true,
        recursive: false,
        onProgress: (progress) => {
          progressUpdates.push(progress);
        }
      });

      // Verify percentage progression
      expect(progressUpdates[0].percentComplete).toBe(25);
      expect(progressUpdates[1].percentComplete).toBe(50);
      expect(progressUpdates[2].percentComplete).toBe(75);
      expect(progressUpdates[3].percentComplete).toBe(100);
    });

    it('should report increasing elementsFound', async () => {
      // Create files with different element counts
      fs.writeFileSync(path.join(tempDir, 'one.ts'), 'export function a() {}');
      fs.writeFileSync(path.join(tempDir, 'two.ts'), 'export function b() {}');
      fs.writeFileSync(path.join(tempDir, 'three.ts'), 'export function c() {}');

      const progressUpdates: any[] = [];

      await scanCurrentElements(tempDir, ['ts'], {
        useAST: true,
        recursive: false,
        onProgress: (progress) => {
          progressUpdates.push(progress);
        }
      });

      // Elements should increase (exact count depends on detection)
      expect(progressUpdates[0].elementsFound).toBeGreaterThan(0);
      expect(progressUpdates[1].elementsFound).toBeGreaterThan(progressUpdates[0].elementsFound);
      expect(progressUpdates[2].elementsFound).toBeGreaterThan(progressUpdates[1].elementsFound);
    });

    it('should include correct currentFile in progress', async () => {
      const file1 = path.join(tempDir, 'first.ts');
      const file2 = path.join(tempDir, 'second.ts');

      fs.writeFileSync(file1, 'export const x = 1;');
      fs.writeFileSync(file2, 'export const y = 2;');

      const progressUpdates: any[] = [];

      await scanCurrentElements(tempDir, ['ts'], {
        useAST: true,
        recursive: false,
        onProgress: (progress) => {
          progressUpdates.push(progress);
        }
      });

      // Should report the actual file being processed
      expect(progressUpdates.length).toBe(2);
      expect(progressUpdates.some(p => p.currentFile.includes('first.ts'))).toBe(true);
      expect(progressUpdates.some(p => p.currentFile.includes('second.ts'))).toBe(true);
    });
  });

  describe('Progress with Cached Files', () => {
    it('should report progress for cached files', async () => {
      const testFile = path.join(tempDir, 'cached.ts');
      fs.writeFileSync(testFile, 'export function test() {}');

      // First scan (populate cache)
      await scanCurrentElements(tempDir, ['ts'], {
        useAST: true,
        recursive: false
      });

      // Second scan with progress callback (should use cache)
      const progressUpdates: any[] = [];

      await scanCurrentElements(tempDir, ['ts'], {
        useAST: true,
        recursive: false,
        onProgress: (progress) => {
          progressUpdates.push(progress);
        }
      });

      // Should still report progress even for cached files
      expect(progressUpdates.length).toBe(1);
      expect(progressUpdates[0].currentFile).toContain('cached.ts');
      expect(progressUpdates[0].percentComplete).toBe(100);
    });
  });

  describe('Progress without onProgress callback', () => {
    it('should work normally when onProgress is not provided', async () => {
      const testFile = path.join(tempDir, 'no-callback.ts');
      fs.writeFileSync(testFile, 'export function test() {}');

      // Should not throw when onProgress is undefined
      const elements = await scanCurrentElements(tempDir, ['ts'], {
        useAST: true,
        recursive: false
        // No onProgress callback
      });

      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('Progress with Dynamic Imports', () => {
    it('should report progress when processing files with dynamic imports', async () => {
      const testFile = path.join(tempDir, 'dynamic.ts');
      fs.writeFileSync(testFile, `
export async function loader() {
  const mod = await import('./module');
  return mod;
}
`);

      const progressUpdates: any[] = [];

      await scanCurrentElements(tempDir, ['ts'], {
        useAST: true,
        recursive: false,
        onProgress: (progress) => {
          progressUpdates.push(progress);
        }
      });

      expect(progressUpdates.length).toBe(1);
      expect(progressUpdates[0].currentFile).toContain('dynamic.ts');
      expect(progressUpdates[0].percentComplete).toBe(100);
    });
  });
});

/**
 * @coderef-semantic: 1.0.0
 * @exports FileCacheEntry, CacheState, CacheCheckResult, IncrementalCache
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports FileCacheEntry, CacheState, CacheCheckResult, IncrementalCache
 */



/**
 * IncrementalCache - File change tracking for performance optimization
 *
 * IMP-CORE-028: Implement incremental context updates for performance
 *
 * Tracks file hashes and timestamps to skip unchanged files on subsequent runs.
 * Reduces scan time for large projects by only processing modified files.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

/**
 * Metadata for a cached file
 */
export interface FileCacheEntry {
  /** Absolute file path */
  filePath: string;
  /** SHA-256 hash of file content */
  contentHash: string;
  /** Last modified timestamp (ms) */
  mtimeMs: number;
  /** File size in bytes */
  size: number;
  /** When this entry was cached */
  cachedAt: string; // ISO timestamp
}

/**
 * Complete cache state stored between runs
 */
export interface CacheState {
  /** Cache version for migrations */
  version: number;
  /** When the cache was created/updated */
  lastUpdated: string;
  /** Map of file path -> cache entry */
  files: Map<string, FileCacheEntry>;
  /** Total files in last successful scan */
  totalFilesLastRun: number;
  /** Project root path */
  projectPath: string;
}

/**
 * Result of a cache check
 */
export interface CacheCheckResult {
  /** Files that need re-scanning (new or modified) */
  filesToScan: string[];
  /** Files that are unchanged (can use cached data) */
  filesUnchanged: string[];
  /** Files that were deleted since last run */
  filesDeleted: string[];
  /** Cache hit ratio (0-1) */
  hitRatio: number;
}

/**
 * IncrementalCache - Manage file change tracking
 */
export class IncrementalCache {
  private static readonly CACHE_VERSION = 1;
  private static readonly CACHE_FILENAME = 'incremental-cache.json';

  private cache: CacheState;
  private cachePath: string;
  private enabled: boolean;

  constructor(projectPath: string, enabled: boolean = true) {
    this.enabled = enabled;
    this.cachePath = path.join(projectPath, '.coderef', IncrementalCache.CACHE_FILENAME);
    this.cache = {
      version: IncrementalCache.CACHE_VERSION,
      lastUpdated: new Date().toISOString(),
      files: new Map(),
      totalFilesLastRun: 0,
      projectPath,
    };
  }

  /**
   * Load cache from disk if it exists
   */
  async load(): Promise<void> {
    if (!this.enabled) return;

    try {
      const content = await fs.readFile(this.cachePath, 'utf-8');
      const data = JSON.parse(content);

      // Version check for migrations
      if (data.version !== IncrementalCache.CACHE_VERSION) {
        console.log(`[IncrementalCache] Cache version mismatch (${data.version} vs ${IncrementalCache.CACHE_VERSION}), resetting`);
        return;
      }

      // Restore the cache
      this.cache = {
        version: data.version,
        lastUpdated: data.lastUpdated,
        files: new Map(Object.entries(data.files || {})),
        totalFilesLastRun: data.totalFilesLastRun || 0,
        projectPath: data.projectPath || this.cache.projectPath,
      };

      console.log(`[IncrementalCache] Loaded ${this.cache.files.size} cached files`);
    } catch (error) {
      // Cache doesn't exist or is corrupt - start fresh
      console.log('[IncrementalCache] No existing cache found, starting fresh');
    }
  }

  /**
   * Save cache to disk
   */
  async save(): Promise<void> {
    if (!this.enabled) return;

    try {
      // Ensure .coderef directory exists
      const cacheDir = path.dirname(this.cachePath);
      await fs.mkdir(cacheDir, { recursive: true });

      // Convert Map to plain object for JSON serialization
      const serialized = {
        version: this.cache.version,
        lastUpdated: new Date().toISOString(),
        files: Object.fromEntries(this.cache.files),
        totalFilesLastRun: this.cache.totalFilesLastRun,
        projectPath: this.cache.projectPath,
      };

      await fs.writeFile(this.cachePath, JSON.stringify(serialized, null, 2), 'utf-8');
      console.log(`[IncrementalCache] Saved ${this.cache.files.size} files to cache`);
    } catch (error) {
      console.error('[IncrementalCache] Failed to save cache:', error);
    }
  }

  /**
   * Check which files need to be re-scanned
   */
  async checkFiles(filePaths: string[]): Promise<CacheCheckResult> {
    if (!this.enabled || this.cache.files.size === 0) {
      // First run or disabled - scan all files
      return {
        filesToScan: filePaths,
        filesUnchanged: [],
        filesDeleted: [],
        hitRatio: 0,
      };
    }

    const filesToScan: string[] = [];
    const filesUnchanged: string[] = [];
    const currentFiles = new Set(filePaths);

    // Find deleted files (in cache but not in current file list)
    const filesDeleted: string[] = [];
    for (const [cachedPath] of this.cache.files) {
      if (!currentFiles.has(cachedPath)) {
        filesDeleted.push(cachedPath);
      }
    }

    // Check each file
    for (const filePath of filePaths) {
      try {
        const stats = await fs.stat(filePath);
        const cached = this.cache.files.get(filePath);

        if (!cached) {
          // New file not in cache
          filesToScan.push(filePath);
        } else if (stats.mtimeMs > cached.mtimeMs || stats.size !== cached.size) {
          // File modified - need to verify hash
          const currentHash = await this.computeFileHash(filePath);
          if (currentHash !== cached.contentHash) {
            filesToScan.push(filePath);
          } else {
            // Hash same but mtime changed (git checkout, etc.) - update cache
            filesUnchanged.push(filePath);
          }
        } else {
          // Unchanged
          filesUnchanged.push(filePath);
        }
      } catch (error) {
        // File not accessible - mark for scanning (will likely fail, but that's ok)
        filesToScan.push(filePath);
      }
    }

    const hitRatio = filePaths.length > 0
      ? filesUnchanged.length / filePaths.length
      : 0;

    console.log(`[IncrementalCache] ${filesToScan.length} to scan, ${filesUnchanged.length} unchanged, ${filesDeleted.length} deleted (hit ratio: ${(hitRatio * 100).toFixed(1)}%)`);

    return {
      filesToScan,
      filesUnchanged,
      filesDeleted,
      hitRatio,
    };
  }

  /**
   * Update cache with new file data after scanning
   */
  async updateCache(filePaths: string[]): Promise<void> {
    if (!this.enabled) return;

    for (const filePath of filePaths) {
      try {
        const stats = await fs.stat(filePath);
        const contentHash = await this.computeFileHash(filePath);

        this.cache.files.set(filePath, {
          filePath,
          contentHash,
          mtimeMs: stats.mtimeMs,
          size: stats.size,
          cachedAt: new Date().toISOString(),
        });
      } catch (error) {
        // Skip files that can't be read
        console.warn(`[IncrementalCache] Failed to cache ${filePath}:`, error);
      }
    }

    this.cache.totalFilesLastRun = this.cache.files.size;
  }

  /**
   * Remove deleted files from cache
   */
  removeDeletedFiles(filePaths: string[]): void {
    for (const filePath of filePaths) {
      this.cache.files.delete(filePath);
    }
  }

  /**
   * Compute SHA-256 hash of file content
   */
  private async computeFileHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get cache statistics
   */
  getStats(): { totalCached: number; lastUpdated: string; hitRatio: number | null } {
    return {
      totalCached: this.cache.files.size,
      lastUpdated: this.cache.lastUpdated,
      hitRatio: this.cache.totalFilesLastRun > 0
        ? this.cache.files.size / this.cache.totalFilesLastRun
        : null,
    };
  }

  /**
   * Clear the cache
   */
  async clear(): Promise<void> {
    this.cache.files.clear();
    this.cache.totalFilesLastRun = 0;
    this.cache.lastUpdated = new Date().toISOString();

    try {
      await fs.unlink(this.cachePath);
    } catch {
      // File may not exist - that's ok
    }
  }

  /**
   * Check if incremental mode is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

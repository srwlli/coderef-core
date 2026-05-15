/**
 * @coderef-semantic: 1.0.0
 * @exports FileWatcherOptions, WatcherStats, FileWatcher
 */



/**
 * FileWatcher - Real-time file monitoring for incremental scanning
 *
 * IMP-CORE-057: Implement incremental scanning with file-watcher
 *
 * Uses chokidar to monitor file system changes and trigger incremental scans.
 * Enables real-time code indexing for IDE integration.
 */

import chokidar from 'chokidar';
import * as path from 'path';
import { IncrementalCache } from '../cache/incremental-cache.js';
import { scanCurrentElements } from './scanner.js';
import type { ElementData } from '../types/types.js';

export interface FileWatcherOptions {
  /** Project root path to watch */
  projectPath: string;
  /** Languages to scan (default: ts, js, tsx, jsx) */
  languages?: string[];
  /** File patterns to exclude */
  exclude?: string[];
  /** Callback when files change */
  onChange?: (elements: ElementData[], changedFiles: string[]) => void;
  /** Callback for status updates */
  onStatus?: (message: string) => void;
}

export interface WatcherStats {
  /** Number of files being watched */
  watchedFiles: number;
  /** Number of change events processed */
  changesProcessed: number;
  /** Number of scans triggered */
  scansTriggered: number;
  /** Total time spent scanning (ms) */
  totalScanTime: number;
}

/**
 * FileWatcher - Monitor file changes and trigger incremental scans
 */
export class FileWatcher {
  private projectPath: string;
  private languages: string[];
  private exclude: string[];
  private cache: IncrementalCache;
  private watcher: chokidar.FSWatcher | null = null;
  private onChange: ((elements: ElementData[], changedFiles: string[]) => void) | null = null;
  private onStatus: ((message: string) => void) | null = null;
  private stats: WatcherStats = {
    watchedFiles: 0,
    changesProcessed: 0,
    scansTriggered: 0,
    totalScanTime: 0,
  };
  private isRunning: boolean = false;

  constructor(options: FileWatcherOptions) {
    this.projectPath = options.projectPath;
    this.languages = options.languages || ['ts', 'tsx', 'js', 'jsx'];
    this.exclude = options.exclude || [];
    this.cache = new IncrementalCache(this.projectPath, true);
    this.onChange = options.onChange || null;
    this.onStatus = options.onStatus || null;
  }

  /**
   * Start watching for file changes
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logStatus('FileWatcher is already running');
      return;
    }

    this.logStatus('Loading cache...');
    await this.cache.load();

    this.logStatus('Starting file watcher...');
    
    // Build glob pattern for languages
    const patterns = this.languages.map(lang => `**/*.${lang}`);
    
    this.watcher = chokidar.watch(patterns, {
      cwd: this.projectPath,
      ignored: this.exclude,
      persistent: true,
      ignoreInitial: false, // Scan initial files
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100,
      },
    });

    // Set up event handlers
    this.watcher
      .on('ready', () => {
        // Count total files being watched
        const watched = this.watcher?.getWatched();
        let totalFiles = 0;
        if (watched) {
          for (const dirPath in watched) {
            totalFiles += watched[dirPath].length;
          }
        }
        this.stats.watchedFiles = totalFiles;
        this.logStatus(`Watching ${this.stats.watchedFiles} files for changes...`);
        this.isRunning = true;
      })
      .on('add', (filePath) => this.handleFileChange(filePath, 'add'))
      .on('change', (filePath) => this.handleFileChange(filePath, 'change'))
      .on('unlink', (filePath) => this.handleFileDelete(filePath))
      .on('error', (error) => {
        console.error('[FileWatcher] Error:', error);
      });
  }

  /**
   * Stop watching for file changes
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logStatus('FileWatcher is not running');
      return;
    }

    this.logStatus('Stopping file watcher...');
    this.isRunning = false;

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    this.logStatus('Stopped watching');
  }

  /**
   * Handle file change events (add or modify)
   */
  private async handleFileChange(filePath: string, eventType: 'add' | 'change'): Promise<void> {
    this.stats.changesProcessed++;
    const fullPath = path.join(this.projectPath, filePath);
    
    this.logStatus(`File ${eventType}: ${filePath}`);
    
    const startTime = Date.now();
    
    try {
      // Incremental scan of changed file
      const elements = await scanCurrentElements(
        this.projectPath,
        this.languages,
        {
          include: [filePath],
          exclude: this.exclude,
          recursive: false,
        }
      );

      // Update cache
      await this.cache.updateCache([fullPath]);
      await this.cache.save();

      const scanTime = Date.now() - startTime;
      this.stats.scansTriggered++;
      this.stats.totalScanTime += scanTime;

      this.logStatus(`Scanned ${filePath} in ${scanTime}ms (${elements.length} elements)`);

      // Notify callback
      if (this.onChange) {
        this.onChange(elements, [fullPath]);
      }
    } catch (error) {
      console.error(`[FileWatcher] Failed to scan ${filePath}:`, error);
    }
  }

  /**
   * Handle file deletion events
   */
  private async handleFileDelete(filePath: string): Promise<void> {
    this.stats.changesProcessed++;
    const fullPath = path.join(this.projectPath, filePath);
    
    this.logStatus(`File deleted: ${filePath}`);
    
    // Remove from cache
    this.cache.removeDeletedFiles([fullPath]);
    await this.cache.save();

    // Notify callback with empty elements
    if (this.onChange) {
      this.onChange([], [fullPath]);
    }
  }

  /**
   * Get watcher statistics
   */
  getStats(): WatcherStats {
    return { ...this.stats };
  }

  /**
   * Check if watcher is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Log status message
   */
  private logStatus(message: string): void {
    if (this.onStatus) {
      this.onStatus(message);
    } else {
      console.log(`[FileWatcher] ${message}`);
    }
  }
}

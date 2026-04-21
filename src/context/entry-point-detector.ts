/**
 * Entry Point Detector
 * Detects entry points in code via naming and file patterns
 *
 * Part of WO-CONTEXT-GENERATION-001
 */

import type { ElementData } from '../types/types.js';
import * as path from 'path';

/**
 * Naming patterns that indicate entry points
 */
const ENTRY_POINT_NAME_PATTERNS = [
  /^handle[A-Z]/,        // handleRequest, handleCommand, etc.
  /^register[A-Z]/,      // registerRoutes, registerCommands, etc.
  /^main$/,              // main
  /^init$/,              // init
  /^run$/,               // run
  /^bootstrap$/,         // bootstrap
  /Command$/,            // AuthCommand, MigrateCommand, etc.
  /Handler$/,            // RequestHandler, EventHandler, etc.
];

/**
 * File basenames that typically contain entry points
 */
const ENTRY_POINT_FILE_PATTERNS = [
  'cli.ts',
  'cli.js',
  'main.ts',
  'main.js',
  'index.ts',
  'index.js',
  'app.ts',
  'app.js',
  'server.ts',
  'server.js',
];

/**
 * Detects entry points in scanned code elements
 */
export class EntryPointDetector {
  /**
   * Detect entry points from scanned elements
   * @param elements - Scanned code elements
   * @returns Elements that match entry point patterns
   */
  detectEntryPoints(elements: ElementData[]): ElementData[] {
    const entryPoints: ElementData[] = [];

    for (const element of elements) {
      if (this.isEntryPoint(element)) {
        entryPoints.push(element);
      }
    }

    return entryPoints;
  }

  /**
   * Check if element is an entry point
   * @param element - Element to check
   * @returns True if element matches entry point patterns
   */
  private isEntryPoint(element: ElementData): boolean {
    // Check naming patterns
    if (this.matchesNamePattern(element.name)) {
      return true;
    }

    // Check file patterns
    if (this.matchesFilePattern(element.file)) {
      return true;
    }

    return false;
  }

  /**
   * Check if element name matches entry point patterns
   */
  private matchesNamePattern(name: string): boolean {
    return ENTRY_POINT_NAME_PATTERNS.some(pattern => pattern.test(name));
  }

  /**
   * Check if file matches entry point file patterns
   */
  private matchesFilePattern(filePath: string): boolean {
    const basename = path.basename(filePath);
    return ENTRY_POINT_FILE_PATTERNS.includes(basename);
  }

  /**
   * Get entry point statistics
   * @param entryPoints - Detected entry points
   * @returns Statistics about entry points
   */
  getStatistics(entryPoints: ElementData[]): {
    total: number;
    byType: Record<string, number>;
    byPattern: {
      namePattern: number;
      filePattern: number;
    };
  } {
    const byType: Record<string, number> = {};
    let namePatternCount = 0;
    let filePatternCount = 0;

    for (const ep of entryPoints) {
      // Count by type
      byType[ep.type] = (byType[ep.type] || 0) + 1;

      // Count by detection method
      if (this.matchesNamePattern(ep.name)) {
        namePatternCount++;
      }
      if (this.matchesFilePattern(ep.file)) {
        filePatternCount++;
      }
    }

    return {
      total: entryPoints.length,
      byType,
      byPattern: {
        namePattern: namePatternCount,
        filePattern: filePatternCount,
      },
    };
  }
}

export default EntryPointDetector;

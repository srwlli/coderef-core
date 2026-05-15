/**
 * @coderef-semantic: 1.0.0
 * @exports detectDrift
 */





/**
 * Detect Drift - Find changes since last scan
 *
 * Outputs: .coderef/reports/drift.json
 *
 * @module fileGeneration/detectDrift
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ElementData } from '../types/types.js';
import { loadIndexFromCoderefDir } from './index-storage.js';

interface DriftReport {
  version: string;
  generatedAt: string;
  projectPath: string;
  hasPreviousScan: boolean;
  summary: {
    totalElements: number;
    addedElements: number;
    removedElements: number;
    modifiedElements: number;
    unchangedElements: number;
  };
  changes: {
    added: ElementData[];
    removed: ElementData[];
    modified: ElementData[];
  };
}

/**
 * Detect drift by comparing with previous scan
 *
 * @param projectPath - Absolute path to project root
 * @param elements - Array of code elements from current scan
 * @returns Promise that resolves when file is written
 */
export async function detectDrift(
  projectPath: string,
  elements: ElementData[]
): Promise<void> {
  // Try to load previous scan data
  const previousElements = await loadPreviousScan(projectPath);

  if (!previousElements) {
    // No previous scan - this is the first scan
    const report: DriftReport = {
      version: '2.0.0',
      generatedAt: new Date().toISOString(),
      projectPath,
      hasPreviousScan: false,
      summary: {
        totalElements: elements.length,
        addedElements: elements.length,
        removedElements: 0,
        modifiedElements: 0,
        unchangedElements: 0,
      },
      changes: {
        added: elements,
        removed: [],
        modified: [],
      },
    };

    await writeReport(projectPath, report);
    return;
  }

  // Compare current scan with previous scan
  const changes = compareScans(previousElements, elements);

  // Build drift report
  const report: DriftReport = {
    version: '2.0.0',
    generatedAt: new Date().toISOString(),
    projectPath,
    hasPreviousScan: true,
    summary: {
      totalElements: elements.length,
      addedElements: changes.added.length,
      removedElements: changes.removed.length,
      modifiedElements: changes.modified.length,
      unchangedElements: elements.length - changes.added.length - changes.modified.length,
    },
    changes,
  };

  await writeReport(projectPath, report);
}

/**
 * Load previous scan data from index.json
 */
async function loadPreviousScan(projectPath: string): Promise<ElementData[] | null> {
  try {
    const coderefDir = path.join(projectPath, '.coderef');
    const loaded = await loadIndexFromCoderefDir(coderefDir);
    return loaded.elements.length > 0 ? loaded.elements : null;
  } catch (error: any) {
    // File doesn't exist or can't be read - no previous scan
    return null;
  }
}

/**
 * Compare two scans and find changes
 */
function compareScans(
  previousElements: ElementData[],
  currentElements: ElementData[]
): {
  added: ElementData[];
  removed: ElementData[];
  modified: ElementData[];
} {
  // Build lookup maps
  const previousMap = new Map<string, ElementData>();
  for (const el of previousElements) {
    const key = `${el.file}:${el.name}`;
    previousMap.set(key, el);
  }

  const currentMap = new Map<string, ElementData>();
  for (const el of currentElements) {
    const key = `${el.file}:${el.name}`;
    currentMap.set(key, el);
  }

  // Find added elements (in current but not in previous)
  const added: ElementData[] = [];
  for (const [key, element] of currentMap) {
    if (!previousMap.has(key)) {
      added.push(element);
    }
  }

  // Find removed elements (in previous but not in current)
  const removed: ElementData[] = [];
  for (const [key, element] of previousMap) {
    if (!currentMap.has(key)) {
      removed.push(element);
    }
  }

  // Find modified elements (in both but with different line numbers)
  const modified: ElementData[] = [];
  for (const [key, currentElement] of currentMap) {
    const previousElement = previousMap.get(key);
    if (previousElement && previousElement.line !== currentElement.line) {
      modified.push(currentElement);
    }
  }

  return { added, removed, modified };
}

/**
 * Write drift report to disk
 */
async function writeReport(projectPath: string, report: DriftReport): Promise<void> {
  // Ensure reports directory exists
  const reportsDir = path.join(projectPath, '.coderef', 'reports');
  await fs.mkdir(reportsDir, { recursive: true });

  // Write report
  const reportPath = path.join(reportsDir, 'drift.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
}

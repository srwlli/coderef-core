/**
 * DriftGenerator - Detect drift between current and previous scans
 *
 * WO-UNIFIED-CODEREF-PIPELINE-001 - Phase 3, Task GEN-006
 *
 * Produces: .coderef/reports/drift.json
 * Analysis: Added, deleted, modified elements; drift percentage
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { PipelineState } from '../types.js';
import type { ElementData } from '../../types/types.js';
import { loadIndexFromCoderefDir } from '../../fileGeneration/index-storage.js';

interface DriftReport {
  driftPercentage: number;
  added: ElementData[];
  deleted: ElementData[];
  modified: Array<{
    element: string;
    file: string;
    changes: string[];
  }>;
  summary: {
    totalCurrent: number;
    totalPrevious: number;
    added: number;
    deleted: number;
    modified: number;
  };
}

/**
 * DriftGenerator - Detect changes since last scan
 */
export class DriftGenerator {
  async generate(state: PipelineState, outputDir: string): Promise<void> {
    const reportsDir = path.join(outputDir, 'reports');
    await fs.mkdir(reportsDir, { recursive: true });

    const report = await this.detectDrift(state, outputDir);

    const reportPath = path.join(reportsDir, 'drift.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    if (state.options.verbose) {
      console.log(`[DriftGenerator] Drift: ${report.driftPercentage}% (${report.summary.added} added, ${report.summary.deleted} deleted)`);
    }
  }

  private async detectDrift(state: PipelineState, outputDir: string): Promise<DriftReport> {
    const currentElements = state.elements.map(element => this.normalizeElement(element, state.projectPath));

    // Try to load previous index
    let previousElements: ElementData[] = [];
    try {
      const loaded = await loadIndexFromCoderefDir(outputDir);
      previousElements = loaded.elements;
    } catch {
      // No previous index, all elements are "added"
      return {
        driftPercentage: 100,
        added: currentElements,
        deleted: [],
        modified: [],
        summary: {
          totalCurrent: currentElements.length,
          totalPrevious: 0,
          added: currentElements.length,
          deleted: 0,
          modified: 0,
        },
      };
    }

    const normalizedPreviousElements = previousElements.map(element => this.normalizeElement(element, state.projectPath));

    // Build element maps by ID
    const currentMap = new Map(currentElements.map(e => [this.getElementId(e), e]));
    const previousMap = new Map(normalizedPreviousElements.map(e => [this.getElementId(e), e]));

    // Detect changes
    const added: ElementData[] = [];
    const deleted: ElementData[] = [];
    const modified: DriftReport['modified'] = [];

    // Find added and modified
    for (const [id, currentElem] of currentMap.entries()) {
      const previousElem = previousMap.get(id);

      if (!previousElem) {
        added.push(currentElem);
      } else {
        const changes = this.compareElements(currentElem, previousElem);
        if (changes.length > 0) {
          modified.push({
            element: currentElem.name,
            file: currentElem.file,
            changes,
          });
        }
      }
    }

    // Find deleted
    for (const [id, previousElem] of previousMap.entries()) {
      if (!currentMap.has(id)) {
        deleted.push(previousElem);
      }
    }

    const totalChanges = added.length + deleted.length + modified.length;
    const totalElements = Math.max(currentMap.size, previousMap.size);
    const driftPercentage = totalElements > 0 ? Math.round((totalChanges / totalElements) * 100) : 0;

    return {
      driftPercentage,
      added,
      deleted,
      modified,
      summary: {
        totalCurrent: currentMap.size,
        totalPrevious: previousMap.size,
        added: added.length,
        deleted: deleted.length,
        modified: modified.length,
      },
    };
  }

  private getElementId(elem: ElementData): string {
    return `${elem.file}:${elem.name}:${elem.line}`;
  }

  private normalizeElement(elem: ElementData, projectPath: string): ElementData {
    return {
      ...elem,
      file: this.normalizeFilePath(elem.file, projectPath),
    };
  }

  private normalizeFilePath(filePath: string, projectPath: string): string {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(projectPath, filePath);
    return path.relative(projectPath, absolutePath).replace(/\\/g, '/');
  }

  private compareElements(current: ElementData, previous: ElementData): string[] {
    const changes: string[] = [];

    if (current.type !== previous.type) {
      changes.push(`type: ${previous.type} → ${current.type}`);
    }

    if (current.exported !== previous.exported) {
      changes.push(`exported: ${previous.exported} → ${current.exported}`);
    }

    if (JSON.stringify(current.parameters) !== JSON.stringify(previous.parameters)) {
      changes.push('parameters changed');
    }

    if (current.returnType !== previous.returnType) {
      changes.push(`returnType: ${previous.returnType} → ${current.returnType}`);
    }

    return changes;
  }
}

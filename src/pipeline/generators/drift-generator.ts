/**
 * @coderef-semantic: 1.0.0
 * @exports DriftGenerator
 * @used_by src/cli/populate.ts
 */





/**
 * DriftGenerator - Detect drift between source files and the indexed snapshot.
 *
 * Produces: .coderef/reports/drift.json
 *
 * Algorithm (mtime-based):
 *   1. Read the prior .coderef/index.json.generatedAt timestamp, if present.
 *      Compare every file referenced by the current scan against its on-disk
 *      mtime. A file whose mtime > index.generatedAt is "stale".
 *   2. driftPercentage = round((staleFiles / totalFiles) * 100).
 *   3. Emit the same { added, deleted, modified, summary, driftPercentage }
 *      contract consumers expect. `modified` holds one entry per stale file
 *      with changes=["file modified since last scan"]. `added`/`deleted`
 *      remain element-level (derived from element-id presence in the stored
 *      vs. current snapshot); these are cheap and disambiguate file churn
 *      from schema churn.
 *
 * Rationale: the prior element-by-element JSON.stringify diff reported 18%
 * drift on a freshly-populated repo because the stored index and the current
 * run used different parameter serializations. Mtime-based drift is immune
 * to that schema-version skew.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { PipelineState } from '../types.js';
import type { ElementData } from '../../types/types.js';
import { loadIndexFromCoderefDir } from '../../fileGeneration/index-storage.js';
import { createCodeRefId } from '../../utils/coderef-id.js';

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
    staleFiles: number;
    totalFiles: number;
    indexGeneratedAt: string | null;
  };
}

export class DriftGenerator {
  async generate(state: PipelineState, outputDir: string): Promise<void> {
    const reportsDir = path.join(outputDir, 'reports');
    await fs.mkdir(reportsDir, { recursive: true });

    const report = await this.detectDrift(state, outputDir);

    const reportPath = path.join(reportsDir, 'drift.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    if (state.options.verbose) {
      console.log(
        `[DriftGenerator] Drift: ${report.driftPercentage}% ` +
        `(${report.summary.staleFiles}/${report.summary.totalFiles} files stale, ` +
        `${report.summary.added} added, ${report.summary.deleted} deleted)`
      );
    }
  }

  private async detectDrift(state: PipelineState, outputDir: string): Promise<DriftReport> {
    const currentElements = state.elements.map(e => this.normalizeElement(e, state.projectPath));

    // Try to load the prior index snapshot.
    let previousElements: ElementData[] = [];
    let indexGeneratedAt: string | null = null;
    try {
      const loaded = await loadIndexFromCoderefDir(outputDir);
      previousElements = loaded.elements;
      indexGeneratedAt = (loaded as { generatedAt?: string }).generatedAt ?? null;
    } catch {
      // No previous index: everything is "added", drift = 100%.
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
          staleFiles: 0,
          totalFiles: 0,
          indexGeneratedAt: null,
        },
      };
    }

    const normalizedPrevious = previousElements.map(e => this.normalizeElement(e, state.projectPath));

    // Element-level added/deleted (cheap; independent of mtime logic).
    const currentIds = new Set(currentElements.map(e => this.getElementId(e, state.projectPath)));
    const previousIds = new Set(normalizedPrevious.map(e => this.getElementId(e, state.projectPath)));
    const added: ElementData[] = currentElements.filter(e => !previousIds.has(this.getElementId(e, state.projectPath)));
    const deleted: ElementData[] = normalizedPrevious.filter(e => !currentIds.has(this.getElementId(e, state.projectPath)));

    // File-level "modified" via mtime comparison against indexGeneratedAt.
    const uniqueFiles = new Set<string>();
    for (const e of currentElements) uniqueFiles.add(e.file);
    const indexMs = indexGeneratedAt ? Date.parse(indexGeneratedAt) : NaN;
    const modified: DriftReport['modified'] = [];
    let staleFiles = 0;

    if (!Number.isNaN(indexMs)) {
      for (const relFile of uniqueFiles) {
        const abs = path.isAbsolute(relFile) ? relFile : path.join(state.projectPath, relFile);
        try {
          const st = await fs.stat(abs);
          if (st.mtimeMs > indexMs) {
            staleFiles++;
            modified.push({
              element: '*',
              file: relFile,
              changes: ['file modified since last scan'],
            });
          }
        } catch {
          // File in index no longer exists on disk. Treat as stale.
          staleFiles++;
          modified.push({
            element: '*',
            file: relFile,
            changes: ['file missing (counted as stale)'],
          });
        }
      }
    }
    // If indexGeneratedAt is unparseable, staleFiles stays 0 (no false positives).

    const totalFiles = uniqueFiles.size;
    const totalChangedUnits = staleFiles + added.length + deleted.length;
    const totalUnits = Math.max(totalFiles, 1);
    const driftPercentage = totalFiles > 0
      ? Math.min(100, Math.round((totalChangedUnits / totalUnits) * 100))
      : 0;

    return {
      driftPercentage,
      added,
      deleted,
      modified,
      summary: {
        totalCurrent: currentElements.length,
        totalPrevious: normalizedPrevious.length,
        added: added.length,
        deleted: deleted.length,
        modified: modified.length,
        staleFiles,
        totalFiles,
        indexGeneratedAt,
      },
    };
  }

  private getElementId(elem: ElementData, projectPath: string): string {
    return elem.codeRefId || createCodeRefId(elem, projectPath, { includeLine: true });
  }

  private normalizeElement(elem: ElementData, projectPath: string): ElementData {
    return { ...elem, file: this.normalizeFilePath(elem.file, projectPath) };
  }

  private normalizeFilePath(filePath: string, projectPath: string): string {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(projectPath, filePath);
    return path.relative(projectPath, absolutePath).replace(/\\/g, '/');
  }
}

/**
 * IndexGenerator - Generate index.json from PipelineState
 *
 * WO-UNIFIED-CODEREF-PIPELINE-001 - Phase 3, Task GEN-001
 *
 * Produces: .coderef/index.json
 * Format: Array of ElementData objects with enriched fields
 * Schema: Backward-compatible with existing index.json, additive-only changes
 */

import * as path from 'path';
import type { PipelineState } from '../types.js';
import type { ElementData } from '../../types/types.js';
import { globalRegistry } from '../../registry/entity-registry.js';
import { writeIndexVariants } from '../../fileGeneration/index-storage.js';
import { buildSemanticRelationships, deduplicateUsedBy } from '../../scanner/semantic-analyzer.js';

/**
 * IndexGenerator - Produce index.json from extracted elements
 */
export class IndexGenerator {
  /**
   * Generate index.json from pipeline state
   *
   * @param state Populated pipeline state
   * @param outputDir Output directory (.coderef/)
   */
  async generate(state: PipelineState, outputDir: string): Promise<void> {
    // Transform elements to output format
    let outputElements = this.transformElements(state.elements, state.projectPath);

    // WO-CODEREF-SEMANTIC-INTEGRATION-001: Phase 1
    // Build semantic relationships (exports, used_by) from scanned elements
    outputElements = buildSemanticRelationships(outputElements as ElementData[], state.projectPath) as any[];

    // Deduplicate used_by entries
    outputElements = outputElements.map(el => ({
      ...el,
      usedBy: deduplicateUsedBy(el.usedBy)
    }));

    // Sort elements for consistent output (by file, then line)
    outputElements.sort((a, b) => {
      if (a.file !== b.file) {
        return a.file.localeCompare(b.file);
      }
      return a.line - b.line;
    });

    // Write variants:
    // - index.json (verbose, minified) + index.json.gz
    // - index.compact.json (compact schema) + index.compact.json.gz
    await writeIndexVariants(outputDir, outputElements as ElementData[], { projectPath: state.projectPath });

    if (state.options.verbose) {
      console.log(`[IndexGenerator] Generated index.json with ${outputElements.length} elements (semantic fields enabled)`);
    }
  }

  /**
   * Transform elements to output format
   * Converts absolute paths to relative paths for portability
   *
   * @param elements Raw elements from pipeline
   * @param projectPath Project root path
   * @returns Transformed elements ready for JSON serialization
   */
  private transformElements(elements: ElementData[], projectPath: string): any[] {
    return elements.map(elem => {
      // Convert absolute path to relative path
      const relativePath = path.relative(projectPath, elem.file).replace(/\\/g, '/');

      // Create output element with relative path and UUID (WO-CODEREF-CORE-REGISTRY-001)
      const output: any = {
        ...elem,
        uuid: globalRegistry.lookup({ name: elem.name, file: elem.file, line: elem.line }),
        file: relativePath,
      };

      // WO-CODEREF-SEMANTIC-INTEGRATION-001: Ensure semantic fields always present
      // Initialize empty arrays if not present (ensures schema consistency)
      if (!output.exports) output.exports = [];
      if (!output.usedBy) output.usedBy = [];
      if (!output.related) output.related = [];
      if (!output.rules) output.rules = [];

      // Remove undefined/null fields for cleaner JSON (but keep semantic fields)
      Object.keys(output).forEach(key => {
        const value = output[key];
        // Skip semantic field cleanup - always include them even if empty
        if (['exports', 'usedBy', 'related', 'rules'].includes(key)) return;
        if (value === undefined || value === null) {
          delete output[key];
        }
      });

      return output;
    });
  }
}

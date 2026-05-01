/**
 * IndexGenerator - Generate index.json from PipelineState
 *
 * WO-UNIFIED-CODEREF-PIPELINE-001 - Phase 3, Task GEN-001
 *
 * Produces: .coderef/index.json
 * Format: Array of ElementData objects with enriched fields
 * Schema: Backward-compatible with existing index.json, additive-only changes
 */

import type { PipelineState } from '../types.js';
import type { ElementData } from '../../types/types.js';
import { writeIndexVariants } from '../../fileGeneration/index-storage.js';
import { buildSemanticElementsFromState, normalizeRelatedField, normalizeRulesField } from '../semantic-elements.js';

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
    const outputElements = buildSemanticElementsFromState(state);

    // Write variants:
    // - index.json (verbose, minified) + index.json.gz
    // - index.compact.json (compact schema) + index.compact.json.gz
    await writeIndexVariants(outputDir, outputElements as ElementData[], { projectPath: state.projectPath });

    if (state.options.verbose) {
      console.log(`[IndexGenerator] Generated index.json with ${outputElements.length} elements (semantic fields enabled)`);
    }
  }

  private normalizeRelatedField(related: any[]): any[] {
    return normalizeRelatedField(related);
  }

  private normalizeRulesField(rules: any[]): any[] {
    return normalizeRulesField(rules);
  }
}

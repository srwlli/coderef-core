/**
 * GraphGenerator - Generate graph.json from PipelineState
 *
 * WO-UNIFIED-CODEREF-PIPELINE-001 - Phase 3, Task GEN-002
 *
 * Produces: .coderef/graph.json
 * Format: ExportedGraph with nodes and edges
 * Schema: Matches packages/core/src/export/graph-exporter.ts ExportedGraph interface
 */

/**
 * @semantic
 * exports: [GraphGenerator]
 * used_by: [src/cli/populate.ts, __tests__/generators/root-cause-alignment.test.ts]
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { PipelineState } from '../types.js';
import { normalizeGraphForOutput } from './graph-output.js';

/**
 * GraphGenerator - Produce graph.json from dependency graph
 */
export class GraphGenerator {
  /**
   * Generate graph.json from pipeline state
   *
   * @param state Populated pipeline state
   * @param outputDir Output directory (.coderef/)
   */
  async generate(state: PipelineState, outputDir: string): Promise<void> {
    const graphPath = path.join(outputDir, 'graph.json');
    const outputGraph = normalizeGraphForOutput(state.graph, state.projectPath);

    // Write to file
    const content = JSON.stringify(outputGraph, null, 2);
    await fs.writeFile(graphPath, content, 'utf-8');

    if (state.options.verbose) {
      console.log(
        `[GraphGenerator] Generated graph.json with ${outputGraph.nodes.length} nodes, ${outputGraph.edges.length} edges`
      );
    }
  }
}

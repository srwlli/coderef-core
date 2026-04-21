/**
 * Graph to Elements Adapter
 * Converts AST DependencyGraph to ElementData[] format
 *
 * @Fn/core/adapter#convertGraphToElements
 */

import { DependencyGraph } from '../analyzer/graph-builder.js';
import { ElementData } from '../types/types.js';
// import { ConversionOptions } from './types.js';

// Temporary: Define ConversionOptions inline until types.js is created
export interface ConversionOptions {
  includeFileNodes?: boolean;
  includeOrphans?: boolean;
  includeIsolated?: boolean;
  typeFilter?: string[];
  verbose?: boolean;
}

/**
 * Convert AST DependencyGraph to ElementData[] format
 *
 * This adapter enables generators designed for regex scanner output
 * to work with AST analyzer output by converting the graph structure
 * to the simpler ElementData[] format.
 *
 * @param graph - DependencyGraph from AnalyzerService
 * @param options - Conversion options
 * @returns Array of ElementData with enhanced properties (parameters, calls)
 *
 * @example
 * ```typescript
 * const analyzer = new AnalyzerService('./src');
 * const result = await analyzer.analyze();
 * const elements = convertGraphToElements(result.graph);
 * // elements now compatible with generators
 * ```
 */
export function convertGraphToElements(
  graph: DependencyGraph,
  options: ConversionOptions = {}
): ElementData[] {
  const { includeIsolated = true, typeFilter = [], verbose = false } = options;

  const elements: ElementData[] = [];
  let processedCount = 0;
  let skippedCount = 0;

  if (verbose) {
    console.log(`\n🔄 Converting graph to elements...`);
    console.log(`   Nodes: ${graph.nodes.size}`);
    console.log(`   Edges: ${graph.edges.length}`);
  }

  // Process each node in the graph
  for (const [id, node] of graph.nodes) {
    // Apply type filter if specified
    if (typeFilter.length > 0 && !typeFilter.includes(node.type || 'unknown')) {
      skippedCount++;
      continue;
    }

    // Check if node is isolated (no edges)
    const outgoingEdges = graph.edgesBySource?.get(id) || [];
    const incomingEdges = graph.edgesByTarget?.get(id) || [];
    const hasEdges = outgoingEdges.length > 0 || incomingEdges.length > 0;
    if (!includeIsolated && !hasEdges) {
      skippedCount++;
      continue;
    }

    // Extract call relationships from edges
    const calls: string[] = [];
    const nodeEdges = graph.edgesBySource?.get(id) || [];

    for (const edge of nodeEdges) {
      if (edge.type === 'calls') {
        // Get the target node to extract function name
        const targetNode = graph.nodes.get(edge.target);
        if (targetNode) {
          // Extract name from node id (format: "file:name")
          // Split on last ':' to handle Windows paths (C:/...)
          const lastColonIndex = edge.target.lastIndexOf(':');
          const targetName =
            lastColonIndex !== -1 ? edge.target.substring(lastColonIndex + 1) : edge.target;
          if (!calls.includes(targetName)) {
            calls.push(targetName);
          }
        }
      }
    }

    // Extract name from node id (format: "file:name")
    // Split on last ':' to handle Windows paths (C:/...)
    const lastColonIndex = id.lastIndexOf(':');
    const elementName = lastColonIndex !== -1 ? id.substring(lastColonIndex + 1) : id;

    // Create ElementData from graph node
    const element: ElementData = {
      type: (node.type as any) || 'function',
      name: elementName,
      file: node.file,
      line: node.line || 1,
    };

    // Add enhanced properties from AST analysis (stored in metadata)
    if (node.metadata?.parameters && Array.isArray(node.metadata.parameters)) {
      element.parameters = node.metadata.parameters as string[];
    }

    if (calls.length > 0) {
      element.calls = calls;
    }

    elements.push(element);
    processedCount++;
  }

  if (verbose) {
    console.log(`   Processed: ${processedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Elements with parameters: ${elements.filter((e) => e.parameters).length}`);
    console.log(`   Elements with calls: ${elements.filter((e) => e.calls).length}`);
  }

  return elements;
}

/**
 * Get statistics about converted elements
 */
export function getConversionStats(elements: ElementData[]) {
  const stats = {
    total: elements.length,
    withParameters: elements.filter((e) => e.parameters && e.parameters.length > 0).length,
    withCalls: elements.filter((e) => e.calls && e.calls.length > 0).length,
    byType: {} as Record<string, number>,
  };

  // Count by type
  for (const element of elements) {
    const type = element.type || 'unknown';
    stats.byType[type] = (stats.byType[type] || 0) + 1;
  }

  return stats;
}

/**
 * @coderef-semantic: 1.0.0
 * @exports PluginGraphOptions, applyPluginGraphHooks, getPluginGraphStats
 */



/**
 * @legacy
 * @deprecated Use src/pipeline/graph-builder.ts (canonical Phase 5
 *             ExportedGraph builder) instead. Plugin hook surface for
 *             ExportedGraph is not yet defined; this module continues
 *             to push to the legacy DependencyGraph for plugin
 *             consumers that have not migrated.
 *
 * Plugin Graph Integration
 * WO-PLUGIN-SYSTEM-001: Plugin system for custom detectors
 *
 * @legacy Pushes edges to the legacy DependencyGraph (see
 *         src/analyzer/graph-builder.ts). DependencyGraph is
 *         structurally incompatible with the canonical Phase 5+
 *         ExportedGraph. This module is NOT consumed by the
 *         canonical pipeline path. Removal / migration of the
 *         plugin hook surface to ExportedGraph is scheduled for a
 *         dedicated cleanup workorder per
 *         WO-PIPELINE-GRAPH-CONSTRUCTION-001 DR-PHASE-5-C.
 *
 * Integrates plugin graph hooks into the CodeRef graph building process.
 * Allows plugins to add custom edges and relationships.
 */

import { DependencyGraph, GraphEdge } from '../analyzer/graph-builder.js';
import { CodeElement } from '../types/types.js';
import { pluginRegistry } from './plugin-registry.js';
import { GraphHook, GraphBuilderContext, CustomEdge } from './types.js';

/**
 * Options for plugin graph integration
 */
export interface PluginGraphOptions {
  /** Enable plugin hooks (default: true) */
  enabled?: boolean;
  /** Specific hooks to run (default: all) */
  hooks?: string[];
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Execute plugin hooks after graph is built
 * @param graph - The built dependency graph
 * @param elements - All discovered code elements
 * @param options - Graph options
 * @returns Modified graph with plugin edges
 */
export function applyPluginGraphHooks(
  graph: DependencyGraph,
  elements: CodeElement[],
  options: PluginGraphOptions = {}
): DependencyGraph {
  if (options.enabled === false) {
    return graph;
  }

  const hooks = getRelevantHooks(options);

  if (hooks.length === 0) {
    return graph;
  }

  if (options.debug) {
    console.log(`[plugin-graph] Running ${hooks.length} graph hooks`);
  }

  const context = createGraphContext(graph, elements);

  for (const hook of hooks) {
    try {
      const customEdges = hook.execute(elements, context);

      for (const edge of customEdges) {
        addCustomEdge(graph, edge, hook.name, options.debug);
      }

      if (options.debug && customEdges.length > 0) {
        console.log(`[plugin-graph] Hook ${hook.name} added ${customEdges.length} edges`);
      }
    } catch (error) {
      if (options.debug) {
        console.error(`[plugin-graph] Hook ${hook.name} failed:`, error);
      }
    }
  }

  return graph;
}

/**
 * Get relevant hooks based on options
 */
function getRelevantHooks(options: PluginGraphOptions): GraphHook[] {
  let hooks = pluginRegistry.getAllHooks();

  // Filter by specific hooks if requested
  if (options.hooks && options.hooks.length > 0) {
    hooks = hooks.filter(h => options.hooks!.includes(h.name));
  }

  return hooks;
}

/**
 * Create graph builder context for hooks
 */
function createGraphContext(
  graph: DependencyGraph,
  elements: CodeElement[]
): GraphBuilderContext {
  // Create element lookup maps
  const elementByUuid = new Map<string, CodeElement>();
  const elementsByType = new Map<string, CodeElement[]>();
  const elementsByFile = new Map<string, CodeElement[]>();

  for (const element of elements) {
    // By UUID (use a generated ID if not present)
    const uuid = (element as any).uuid || `${element.file}:${element.name}`;
    elementByUuid.set(uuid, element);

    // By type
    const typeList = elementsByType.get(element.type) || [];
    typeList.push(element);
    elementsByType.set(element.type, typeList);

    // By file
    const fileList = elementsByFile.get(element.file) || [];
    fileList.push(element);
    elementsByFile.set(element.file, fileList);
  }

  return {
    findElement(uuid: string): CodeElement | undefined {
      return elementByUuid.get(uuid);
    },

    findByType(type: string): CodeElement[] {
      return elementsByType.get(type) || [];
    },

    findByFile(file: string): CodeElement[] {
      return elementsByFile.get(file) || [];
    },

    hasEdge(from: string, to: string, type?: string): boolean {
      return graph.edges.some(e => {
        const fromMatch = e.source === from;
        const toMatch = e.target === to;
        const typeMatch = !type || e.type === type;
        return fromMatch && toMatch && typeMatch;
      });
    }
  };
}

/**
 * Add a custom edge from a plugin to the graph
 */
function addCustomEdge(
  graph: DependencyGraph,
  edge: CustomEdge,
  sourceHook: string,
  debug?: boolean
): void {
  // Check if edge already exists
  const exists = graph.edges.some(e =>
    e.source === edge.from && e.target === edge.to && e.type === edge.type
  );

  if (exists) {
    if (debug) {
      console.log(`[plugin-graph] Skipping duplicate edge: ${edge.from} -> ${edge.to}`);
    }
    return;
  }

  // Ensure nodes exist
  if (!graph.nodes.has(edge.from)) {
    if (debug) {
      console.log(`[plugin-graph] Creating missing node: ${edge.from}`);
    }
    graph.nodes.set(edge.from, {
      id: edge.from,
      name: edge.from,
      type: 'unknown',
      file: ''
    });
  }

  if (!graph.nodes.has(edge.to)) {
    if (debug) {
      console.log(`[plugin-graph] Creating missing node: ${edge.to}`);
    }
    graph.nodes.set(edge.to, {
      id: edge.to,
      name: edge.to,
      type: 'unknown',
      file: ''
    });
  }

  // Add the edge
  const graphEdge: GraphEdge = {
    source: edge.from,
    target: edge.to,
    type: edge.type as GraphEdge['type'],
    metadata: {
      ...edge.metadata,
      pluginSource: sourceHook
    }
  };

  graph.edges.push(graphEdge);

  // Update lookup maps
  const sourceEdges = graph.edgesBySource.get(edge.from) || [];
  sourceEdges.push(graphEdge);
  graph.edgesBySource.set(edge.from, sourceEdges);

  const targetEdges = graph.edgesByTarget.get(edge.to) || [];
  targetEdges.push(graphEdge);
  graph.edgesByTarget.set(edge.to, targetEdges);
}

/**
 * Get graph statistics including plugin edges
 */
export function getPluginGraphStats(graph: DependencyGraph): {
  totalEdges: number;
  pluginEdges: number;
  edgesBySource: Record<string, number>;
} {
  const stats = {
    totalEdges: graph.edges.length,
    pluginEdges: 0,
    edgesBySource: {} as Record<string, number>
  };

  for (const edge of graph.edges) {
    const source = String(edge.metadata?.pluginSource || 'core');
    if (source !== 'core') {
      stats.pluginEdges++;
    }
    stats.edgesBySource[source] = (stats.edgesBySource[source] || 0) + 1;
  }

  return stats;
}

/**
 * @legacy
 * @deprecated Use src/pipeline/graph-builder.ts (canonical Phase 5
 *             ExportedGraph builder) instead.
 *
 * Graph Builder - Constructs dependency graph from parsed relationships.
 * Phase 3 (legacy nine-phase numbering, NOT canonical Phase 3 of the
 * pipeline rebuild), Task P3-T3: Relationship Detection & Analysis.
 *
 * @legacy DependencyGraph schema (Map<string, GraphNode> nodes +
 *         GraphEdge[] edges + edgesBySource/edgesByTarget indexes)
 *         is structurally incompatible with the canonical Phase 5+
 *         ExportedGraph (Array nodes + 8-field edge schema). This
 *         legacy builder is NOT consumed by the canonical pipeline
 *         path (orchestrator.ts → src/pipeline/graph-builder.ts).
 *         Removal scheduled for Phase 6 or a dedicated cleanup
 *         workorder per WO-PIPELINE-GRAPH-CONSTRUCTION-001
 *         DR-PHASE-5-C.
 *
 * Combines:
 * - Import Parser: builds 'imports' relationship edges
 * - Call Detector: builds 'calls' relationship edges
 *
 * Creates:
 * - Graph nodes for each code element
 * - Relationship edges between nodes
 * - Support for 5 relationship types: imports, calls, depends-on, implements, tests
 */

import ImportParser, { ImportEdge, ImportStatement } from './import-parser.js';
import CallDetector, { CallEdge, CallExpression } from './call-detector.js';
import { GraphError, GraphErrorCode } from './graph-error.js';

/**
 * Represents a node in the dependency graph
 */
export interface GraphNode {
  id: string;
  uuid?: string;
  name: string;
  type: string;
  file: string;
  line?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Represents an edge in the dependency graph
 */
export interface GraphEdge {
  source: string;
  target: string;
  type: 'imports' | 'calls' | 'depends-on' | 'implements' | 'tests' | 'reexports';
  weight?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Represents the complete dependency graph
 */
export interface DependencyGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  edgesBySource: Map<string, GraphEdge[]>;
  edgesByTarget: Map<string, GraphEdge[]>;
}

export class GraphBuilder {
  private importParser: ImportParser;
  private callDetector: CallDetector;
  private basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
    this.importParser = new ImportParser(basePath);
    this.callDetector = new CallDetector(basePath);
  }

  /**
   * Build complete dependency graph from codebase
   */
  buildGraph(
    filePaths: string[],
    elementMap?: Map<string, { id: string; type: string; file: string; line?: number }>
  ): DependencyGraph {
    const graph: DependencyGraph = {
      nodes: new Map(),
      edges: [],
      edgesBySource: new Map(),
      edgesByTarget: new Map(),
    };

    // Add element nodes to graph
    if (elementMap) {
      for (const [elementId, element] of elementMap) {
        const nodeId = this.createNodeId(element.id, element.file);
        graph.nodes.set(nodeId, {
          id: nodeId,
          name: element.id,
          type: element.type,
          file: element.file,
          line: element.line,
        });
      }
    }

    // Build edges from imports
    const importEdges = this.importParser.buildImportEdges(filePaths);
    for (const edge of importEdges) {
      this.addImportEdges(graph, edge, elementMap);
    }

    // Build edges from calls
    const callEdges = this.callDetector.buildCallEdges(filePaths, elementMap);
    for (const edge of callEdges) {
      this.addCallEdges(graph, edge, elementMap);
    }

    return graph;
  }

  /**
   * Add import edges to graph
   */
  private addImportEdges(
    graph: DependencyGraph,
    importEdge: ImportEdge,
    elementMap?: Map<string, { id: string; type: string; file: string }>
  ): void {
    const sourceNodeId = this.createNodeIdFromFile(importEdge.sourceFile);
    const targetNodeId = this.createNodeIdFromFile(importEdge.targetFile);

    // Ensure nodes exist
    if (!graph.nodes.has(sourceNodeId)) {
      graph.nodes.set(sourceNodeId, {
        id: sourceNodeId,
        name: importEdge.sourceFile,
        type: 'file',
        file: importEdge.sourceFile,
      });
    }

    if (!graph.nodes.has(targetNodeId)) {
      graph.nodes.set(targetNodeId, {
        id: targetNodeId,
        name: importEdge.targetFile,
        type: 'file',
        file: importEdge.targetFile,
      });
    }

    // Add edge
    const edge: GraphEdge = {
      source: sourceNodeId,
      target: targetNodeId,
      type: importEdge.edgeType,
      weight: importEdge.importStatements.length,
      metadata: {
        statements: importEdge.importStatements.map((s) => ({
          type: s.type,
          line: s.line,
          isBarrel: s.isBarrelExport,
        })),
      },
    };

    graph.edges.push(edge);
    this.addEdgeToIndex(graph, edge);
  }

  /**
   * Add call edges to graph
   */
  private addCallEdges(
    graph: DependencyGraph,
    callEdge: CallEdge,
    elementMap?: Map<string, { id: string; type: string; file: string }>
  ): void {
    const sourceNodeId = this.createNodeIdFromFile(callEdge.sourceFile);
    const targetNodeId = this.createNodeIdFromFile(callEdge.targetFile);

    // Ensure nodes exist
    if (!graph.nodes.has(sourceNodeId)) {
      graph.nodes.set(sourceNodeId, {
        id: sourceNodeId,
        name: callEdge.sourceFile,
        type: 'file',
        file: callEdge.sourceFile,
      });
    }

    if (!graph.nodes.has(targetNodeId)) {
      graph.nodes.set(targetNodeId, {
        id: targetNodeId,
        name: callEdge.targetFile,
        type: 'file',
        file: callEdge.targetFile,
      });
    }

    // Add edge
    const edge: GraphEdge = {
      source: sourceNodeId,
      target: targetNodeId,
      type: 'calls',
      weight: callEdge.calls.length,
      metadata: {
        calls: callEdge.calls.map((c) => ({
          function: c.calleeFunction,
          object: c.calleeObject,
          type: c.callType,
          isAsync: c.isAsync,
          line: c.line,
        })),
      },
    };

    graph.edges.push(edge);
    this.addEdgeToIndex(graph, edge);
  }

  /**
   * Add edge to source and target indices for fast lookup
   */
  private addEdgeToIndex(graph: DependencyGraph, edge: GraphEdge): void {
    if (!graph.edgesBySource.has(edge.source)) {
      graph.edgesBySource.set(edge.source, []);
    }
    graph.edgesBySource.get(edge.source)!.push(edge);

    if (!graph.edgesByTarget.has(edge.target)) {
      graph.edgesByTarget.set(edge.target, []);
    }
    graph.edgesByTarget.get(edge.target)!.push(edge);
  }

  /**
   * Create node ID from element identifier and file
   */
  private createNodeId(elementId: string, file: string): string {
    return `${file}:${elementId}`;
  }

  /**
   * Create node ID from file path (for file-level nodes)
   */
  private createNodeIdFromFile(file: string): string {
    return `file:${file}`;
  }

  /**
   * Export graph as JSON
   */
  exportGraphAsJSON(graph: DependencyGraph): {
    nodes: Array<any>;
    edges: Array<any>;
    statistics: any;
  } {
    const nodes = Array.from(graph.nodes.values());
    const edges = graph.edges;
    const statistics = {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      edgesByType: this.countEdgesByType(edges),
      avgEdgesPerNode: edges.length / nodes.length,
    };

    return { nodes, edges, statistics };
  }

  /**
   * Import graph from JSON
   */
  importGraphFromJSON(json: {
    nodes: Array<GraphNode>;
    edges: Array<GraphEdge>;
  }): DependencyGraph {
    // Validate JSON structure
    if (!json || typeof json !== 'object') {
      throw new GraphError(
        'Invalid graph JSON: expected object',
        GraphErrorCode.INVALID_FORMAT
      );
    }

    if (!Array.isArray(json.nodes)) {
      throw new GraphError(
        'Invalid graph JSON: nodes must be an array',
        GraphErrorCode.MISSING_NODES,
        { received: typeof json.nodes }
      );
    }

    if (!Array.isArray(json.edges)) {
      throw new GraphError(
        'Invalid graph JSON: edges must be an array',
        GraphErrorCode.MISSING_EDGES,
        { received: typeof json.edges }
      );
    }

    const graph: DependencyGraph = {
      nodes: new Map(),
      edges: [],
      edgesBySource: new Map(),
      edgesByTarget: new Map(),
    };

    // Reconstruct nodes Map from array with validation
    for (const node of json.nodes) {
      // Validate node structure
      if (!node.id || typeof node.id !== 'string') {
        throw new GraphError(
          `Invalid node: missing or invalid id`,
          GraphErrorCode.INVALID_NODE,
          { node }
        );
      }

      if (!node.type || typeof node.type !== 'string') {
        throw new GraphError(
          `Invalid node: missing or invalid type for node ${node.id}`,
          GraphErrorCode.INVALID_NODE,
          { nodeId: node.id, type: node.type }
        );
      }

      if (!node.file || typeof node.file !== 'string') {
        throw new GraphError(
          `Invalid node: missing or invalid file for node ${node.id}`,
          GraphErrorCode.INVALID_NODE,
          { nodeId: node.id, file: node.file }
        );
      }

      graph.nodes.set(node.id, node);
    }

    // Reconstruct edges and indices with validation
    for (const edge of json.edges) {
      // Validate edge structure
      if (!edge.source || typeof edge.source !== 'string') {
        throw new GraphError(
          'Invalid edge: missing or invalid source',
          GraphErrorCode.INVALID_EDGE,
          { edge }
        );
      }

      if (!edge.target || typeof edge.target !== 'string') {
        throw new GraphError(
          'Invalid edge: missing or invalid target',
          GraphErrorCode.INVALID_EDGE,
          { edge }
        );
      }

      if (!edge.type) {
        throw new GraphError(
          'Invalid edge: missing type',
          GraphErrorCode.INVALID_EDGE,
          { edge }
        );
      }

      // Validate edge references exist in graph (if strict mode)
      if (!graph.nodes.has(edge.source)) {
        throw new GraphError(
          `Invalid edge: source node '${edge.source}' not found in graph`,
          GraphErrorCode.INVALID_REFERENCE,
          { edge, missingNode: edge.source }
        );
      }

      if (!graph.nodes.has(edge.target)) {
        throw new GraphError(
          `Invalid edge: target node '${edge.target}' not found in graph`,
          GraphErrorCode.INVALID_REFERENCE,
          { edge, missingNode: edge.target }
        );
      }

      graph.edges.push(edge);

      // Add to edgesBySource index
      if (!graph.edgesBySource.has(edge.source)) {
        graph.edgesBySource.set(edge.source, []);
      }
      graph.edgesBySource.get(edge.source)!.push(edge);

      // Add to edgesByTarget index
      if (!graph.edgesByTarget.has(edge.target)) {
        graph.edgesByTarget.set(edge.target, []);
      }
      graph.edgesByTarget.get(edge.target)!.push(edge);
    }

    return graph;
  }

  /**
   * Calculate statistics about graph
   */
  getGraphStatistics(graph: DependencyGraph): {
    nodeCount: number;
    edgeCount: number;
    edgesByType: Record<string, number>;
    densityRatio: number;
    avgInDegree: number;
    avgOutDegree: number;
  } {
    const nodeCount = graph.nodes.size;
    const edgeCount = graph.edges.length;
    const edgesByType = this.countEdgesByType(graph.edges);

    // Calculate density (actual edges / possible edges)
    const possibleEdges = nodeCount * (nodeCount - 1);
    const densityRatio = possibleEdges > 0 ? edgeCount / possibleEdges : 0;

    // Calculate average degrees
    const avgInDegree = edgeCount / (nodeCount || 1);
    const avgOutDegree = edgeCount / (nodeCount || 1);

    return {
      nodeCount,
      edgeCount,
      edgesByType,
      densityRatio,
      avgInDegree,
      avgOutDegree,
    };
  }

  /**
   * Count edges by type
   */
  private countEdgesByType(edges: GraphEdge[]): Record<string, number> {
    const counts: Record<string, number> = {
      imports: 0,
      calls: 0,
      'depends-on': 0,
      implements: 0,
      tests: 0,
    };

    for (const edge of edges) {
      counts[edge.type] = (counts[edge.type] || 0) + 1;
    }

    return counts;
  }

  /**
   * Detect isolated nodes (no incoming or outgoing edges)
   */
  findIsolatedNodes(graph: DependencyGraph): GraphNode[] {
    const isolated: GraphNode[] = [];

    for (const [nodeId, node] of graph.nodes) {
      const hasIncoming = graph.edgesByTarget.has(nodeId);
      const hasOutgoing = graph.edgesBySource.has(nodeId);

      if (!hasIncoming && !hasOutgoing) {
        isolated.push(node);
      }
    }

    return isolated;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.importParser.clearCache();
    this.callDetector.clearCache();
  }
}

export default GraphBuilder;

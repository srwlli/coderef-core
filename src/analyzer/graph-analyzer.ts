/**
 * Graph Analyzer - Query and traverse the dependency graph
 * Phase 3, Task P3-T4: Relationship Detection & Analysis
 *
 * Provides query methods:
 * - getCallers(element) - What calls this element?
 * - getCallees(element) - What does this element call?
 * - getDependents(element) - What depends on this element?
 * - getDependencies(element) - What does this element depend on?
 * - traverse(startNode, depth) - Multi-hop traversal
 * - detectCircularDependencies() - Find cycles in graph
 */

import { DependencyGraph, GraphNode, GraphEdge } from './graph-builder.js';

/**
 * Represents a traversal path through the graph
 */
export interface TraversalPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
  depth: number;
  cycleDetected?: boolean;
}

/**
 * Represents a circular dependency
 */
export interface CircularDependency {
  nodes: GraphNode[];
  path: string;
  length: number;
}

export class GraphAnalyzer {
  private graph: DependencyGraph;
  private visitedInCurrentTraversal: Set<string> = new Set();

  constructor(graph: DependencyGraph) {
    this.graph = graph;
  }

  /**
   * Get all nodes that call a given element/file
   */
  getCallers(nodeId: string): GraphNode[] {
    const callers: GraphNode[] = [];
    const incomingEdges = this.graph.edgesByTarget.get(nodeId) || [];

    for (const edge of incomingEdges) {
      if (edge.type === 'calls' || edge.type === 'imports') {
        const sourceNode = this.graph.nodes.get(edge.source);
        if (sourceNode) {
          callers.push(sourceNode);
        }
      }
    }

    return callers;
  }

  /**
   * Get all nodes that this element calls
   */
  getCallees(nodeId: string): GraphNode[] {
    const callees: GraphNode[] = [];
    const outgoingEdges = this.graph.edgesBySource.get(nodeId) || [];

    for (const edge of outgoingEdges) {
      if (edge.type === 'calls') {
        const targetNode = this.graph.nodes.get(edge.target);
        if (targetNode) {
          callees.push(targetNode);
        }
      }
    }

    return callees;
  }

  /**
   * Get all nodes that depend on a given element/file
   */
  getDependents(nodeId: string, maxDepth: number = 5): GraphNode[] {
    const dependents = new Set<string>();
    const queue: Array<{ nodeId: string; depth: number }> = [
      { nodeId, depth: 0 },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current.nodeId)) continue;
      if (current.depth > maxDepth) continue;

      visited.add(current.nodeId);

      const incomingEdges = this.graph.edgesByTarget.get(current.nodeId) || [];
      for (const edge of incomingEdges) {
        if (!visited.has(edge.source)) {
          dependents.add(edge.source);
          queue.push({ nodeId: edge.source, depth: current.depth + 1 });
        }
      }
    }

    const result: GraphNode[] = [];
    for (const nodeId of dependents) {
      const node = this.graph.nodes.get(nodeId);
      if (node) {
        result.push(node);
      }
    }

    return result;
  }

  /**
   * Get all nodes that this element depends on
   */
  getDependencies(nodeId: string, maxDepth: number = 5): GraphNode[] {
    const dependencies = new Set<string>();
    const queue: Array<{ nodeId: string; depth: number }> = [
      { nodeId, depth: 0 },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current.nodeId)) continue;
      if (current.depth > maxDepth) continue;

      visited.add(current.nodeId);

      const outgoingEdges = this.graph.edgesBySource.get(current.nodeId) || [];
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          dependencies.add(edge.target);
          queue.push({ nodeId: edge.target, depth: current.depth + 1 });
        }
      }
    }

    const result: GraphNode[] = [];
    for (const nodeId of dependencies) {
      const node = this.graph.nodes.get(nodeId);
      if (node) {
        result.push(node);
      }
    }

    return result;
  }

  /**
   * Traverse graph from starting node for specified depth
   */
  traverse(
    startNodeId: string,
    maxDepth: number = 3,
    direction: 'outgoing' | 'incoming' | 'both' = 'both'
  ): TraversalPath {
    const nodes = new Set<string>();
    const edges: GraphEdge[] = [];
    const queue: Array<{ nodeId: string; depth: number }> = [
      { nodeId: startNodeId, depth: 0 },
    ];
    const visited = new Set<string>();
    let cycleDetected = false;

    const startNode = this.graph.nodes.get(startNodeId);
    if (!startNode) {
      return { nodes: [], edges: [], depth: 0 };
    }

    nodes.add(startNodeId);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current.nodeId)) {
        cycleDetected = true;
        continue;
      }

      if (current.depth >= maxDepth) continue;

      visited.add(current.nodeId);

      const node = this.graph.nodes.get(current.nodeId);
      if (node) {
        nodes.add(current.nodeId);
      }

      // Get outgoing edges
      if (direction === 'outgoing' || direction === 'both') {
        const outgoing = this.graph.edgesBySource.get(current.nodeId) || [];
        for (const edge of outgoing) {
          edges.push(edge);
          if (!visited.has(edge.target)) {
            nodes.add(edge.target);
            queue.push({ nodeId: edge.target, depth: current.depth + 1 });
          }
        }
      }

      // Get incoming edges
      if (direction === 'incoming' || direction === 'both') {
        const incoming = this.graph.edgesByTarget.get(current.nodeId) || [];
        for (const edge of incoming) {
          edges.push(edge);
          if (!visited.has(edge.source)) {
            nodes.add(edge.source);
            queue.push({ nodeId: edge.source, depth: current.depth + 1 });
          }
        }
      }
    }

    // Convert node IDs to nodes
    const pathNodes: GraphNode[] = [];
    for (const nodeId of nodes) {
      const node = this.graph.nodes.get(nodeId);
      if (node) {
        pathNodes.push(node);
      }
    }

    return {
      nodes: pathNodes,
      edges,
      depth: maxDepth,
      cycleDetected,
    };
  }

  /**
   * Detect circular dependencies in graph
   */
  detectCircularDependencies(): CircularDependency[] {
    const cycles: CircularDependency[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (
      nodeId: string,
      path: GraphNode[]
    ): CircularDependency | null => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStartIndex = path.findIndex(
          (n) => n.id === nodeId
        );
        if (cycleStartIndex !== -1) {
          const cyclePath = path.slice(cycleStartIndex);
          cyclePath.push({ id: nodeId } as any);
          return {
            nodes: cyclePath,
            path: cyclePath.map((n) => n.id).join(' -> '),
            length: cyclePath.length,
          };
        }
      }

      if (visited.has(nodeId)) {
        return null;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = this.graph.nodes.get(nodeId);
      const outgoing = this.graph.edgesBySource.get(nodeId) || [];

      for (const edge of outgoing) {
        const cycle = dfs(edge.target, node ? [...path, node] : path);
        if (cycle) {
          cycles.push(cycle);
        }
      }

      recursionStack.delete(nodeId);
      return null;
    };

    for (const nodeId of this.graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    return cycles;
  }

  /**
   * Find shortest path between two nodes
   */
  findShortestPath(
    sourceNodeId: string,
    targetNodeId: string
  ): TraversalPath | null {
    const queue: Array<{ nodeId: string; path: GraphNode[]; edges: GraphEdge[] }> = [
      { nodeId: sourceNodeId, path: [], edges: [] },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current.nodeId)) continue;
      visited.add(current.nodeId);

      const node = this.graph.nodes.get(current.nodeId);
      if (!node) continue;

      const newPath = [...current.path, node];

      if (current.nodeId === targetNodeId) {
        return {
          nodes: newPath,
          edges: current.edges,
          depth: newPath.length,
        };
      }

      const outgoing = this.graph.edgesBySource.get(current.nodeId) || [];
      for (const edge of outgoing) {
        if (!visited.has(edge.target)) {
          queue.push({
            nodeId: edge.target,
            path: newPath,
            edges: [...current.edges, edge],
          });
        }
      }
    }

    return null;
  }

  /**
   * Get all paths between two nodes (up to max depth)
   */
  findAllPaths(
    sourceNodeId: string,
    targetNodeId: string,
    maxDepth: number = 5
  ): TraversalPath[] {
    const paths: TraversalPath[] = [];

    const dfs = (
      currentNodeId: string,
      targetId: string,
      visited: Set<string>,
      path: GraphNode[],
      edges: GraphEdge[],
      depth: number
    ) => {
      if (depth > maxDepth) return;

      if (currentNodeId === targetId) {
        paths.push({ nodes: [...path], edges: [...edges], depth });
        return;
      }

      const outgoing = this.graph.edgesBySource.get(currentNodeId) || [];
      for (const edge of outgoing) {
        if (!visited.has(edge.target)) {
          const targetNode = this.graph.nodes.get(edge.target);
          if (targetNode) {
            visited.add(edge.target);
            dfs(
              edge.target,
              targetId,
              visited,
              [...path, targetNode],
              [...edges, edge],
              depth + 1
            );
            visited.delete(edge.target);
          }
        }
      }
    };

    const startNode = this.graph.nodes.get(sourceNodeId);
    if (startNode) {
      const visited = new Set<string>();
      visited.add(sourceNodeId);
      dfs(sourceNodeId, targetNodeId, visited, [startNode], [], 0);
    }

    return paths;
  }
}

export default GraphAnalyzer;

/**
 * Multi-Hop Traversal - Query relationships at 2-5 levels deep
 * Phase 5, Task P5-T1: Multi-hop Reference Maps (used-by, calls, depends-on)
 *
 * Provides:
 * - Multi-hop traversal with configurable depth
 * - used-by query (reverse dependencies)
 * - calls query (call chains)
 * - depends-on query (forward dependencies)
 * - Result memoization
 */

import { DependencyGraph, GraphNode, GraphEdge } from '../analyzer/graph-builder.js';
import GraphAnalyzer from '../analyzer/graph-analyzer.js';

/**
 * Represents a traversal result with path information
 */
export interface TraversalResult {
  nodeId: string;
  depth: number;
  path: GraphNode[];
  edges: GraphEdge[];
  type: 'direct' | 'transitive' | 'secondary';
}

/**
 * Represents a multi-hop query result
 */
export interface MultiHopResult {
  sourceNodeId: string;
  queryType: 'used-by' | 'calls' | 'depends-on';
  maxDepth: number;
  results: TraversalResult[];
  totalCount: number;
  traversalTime: number;
}

export class MultiHopTraversal {
  private graph: DependencyGraph;
  private analyzer: GraphAnalyzer;
  private traversalCache: Map<string, TraversalResult[]> = new Map();
  private maxDepth: number = 5;
  private maxResults: number = 100;

  constructor(graph: DependencyGraph, maxDepth: number = 5, maxResults: number = 100) {
    this.graph = graph;
    this.analyzer = new GraphAnalyzer(graph);
    this.maxDepth = maxDepth;
    this.maxResults = maxResults;
  }

  /**
   * Query: What uses/depends on this element? (reverse dependencies)
   */
  usedBy(nodeId: string, maxDepth?: number): MultiHopResult {
    const startTime = Date.now();
    const depth = Math.min(maxDepth || this.maxDepth, this.maxDepth);
    const cacheKey = `used-by:${nodeId}:${depth}`;

    // Check cache
    if (this.traversalCache.has(cacheKey)) {
      const cached = this.traversalCache.get(cacheKey)!;
      return {
        sourceNodeId: nodeId,
        queryType: 'used-by',
        maxDepth: depth,
        results: cached.slice(0, this.maxResults),
        totalCount: cached.length,
        traversalTime: Date.now() - startTime,
      };
    }

    // BFS traversal for reverse dependencies
    const results = this.bfsTraversal(nodeId, 'incoming', depth);

    // Cache and return
    this.traversalCache.set(cacheKey, results);

    return {
      sourceNodeId: nodeId,
      queryType: 'used-by',
      maxDepth: depth,
      results: results.slice(0, this.maxResults),
      totalCount: results.length,
      traversalTime: Date.now() - startTime,
    };
  }

  /**
   * Query: What does this element call?
   */
  calls(nodeId: string, maxDepth?: number): MultiHopResult {
    const startTime = Date.now();
    const depth = Math.min(maxDepth || this.maxDepth, this.maxDepth);
    const cacheKey = `calls:${nodeId}:${depth}`;

    // Check cache
    if (this.traversalCache.has(cacheKey)) {
      const cached = this.traversalCache.get(cacheKey)!;
      return {
        sourceNodeId: nodeId,
        queryType: 'calls',
        maxDepth: depth,
        results: cached.slice(0, this.maxResults),
        totalCount: cached.length,
        traversalTime: Date.now() - startTime,
      };
    }

    // Traversal for call chains (outgoing 'calls' edges only)
    const results = this.bfsTraversal(nodeId, 'outgoing-calls', depth);

    // Cache and return
    this.traversalCache.set(cacheKey, results);

    return {
      sourceNodeId: nodeId,
      queryType: 'calls',
      maxDepth: depth,
      results: results.slice(0, this.maxResults),
      totalCount: results.length,
      traversalTime: Date.now() - startTime,
    };
  }

  /**
   * Query: What does this element depend on?
   */
  dependsOn(nodeId: string, maxDepth?: number): MultiHopResult {
    const startTime = Date.now();
    const depth = Math.min(maxDepth || this.maxDepth, this.maxDepth);
    const cacheKey = `depends-on:${nodeId}:${depth}`;

    // Check cache
    if (this.traversalCache.has(cacheKey)) {
      const cached = this.traversalCache.get(cacheKey)!;
      return {
        sourceNodeId: nodeId,
        queryType: 'depends-on',
        maxDepth: depth,
        results: cached.slice(0, this.maxResults),
        totalCount: cached.length,
        traversalTime: Date.now() - startTime,
      };
    }

    // BFS traversal for forward dependencies
    const results = this.bfsTraversal(nodeId, 'outgoing', depth);

    // Cache and return
    this.traversalCache.set(cacheKey, results);

    return {
      sourceNodeId: nodeId,
      queryType: 'depends-on',
      maxDepth: depth,
      results: results.slice(0, this.maxResults),
      totalCount: results.length,
      traversalTime: Date.now() - startTime,
    };
  }

  /**
   * Generic traversal for any direction
   */
  traverse(
    nodeId: string,
    queryType: 'used-by' | 'calls' | 'depends-on',
    maxDepth?: number
  ): MultiHopResult {
    switch (queryType) {
      case 'used-by':
        return this.usedBy(nodeId, maxDepth);
      case 'calls':
        return this.calls(nodeId, maxDepth);
      case 'depends-on':
        return this.dependsOn(nodeId, maxDepth);
      default:
        throw new Error(`Unknown query type: ${queryType}`);
    }
  }

  /**
   * Clear traversal cache
   */
  clearCache(): void {
    this.traversalCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): Record<string, any> {
    return {
      cacheSize: this.traversalCache.size,
      maxDepth: this.maxDepth,
      maxResults: this.maxResults,
      cachedQueries: Array.from(this.traversalCache.keys()),
    };
  }

  /**
   * Private: BFS traversal implementation
   */
  private bfsTraversal(
    nodeId: string,
    direction: 'incoming' | 'outgoing' | 'outgoing-calls',
    maxDepth: number
  ): TraversalResult[] {
    const results: TraversalResult[] = [];
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; depth: number; path: GraphNode[]; edges: GraphEdge[] }> = [
      { nodeId, depth: 0, path: [], edges: [] },
    ];

    const sourceNode = this.graph.nodes.get(nodeId);
    if (!sourceNode) {
      return results;
    }

    visited.add(nodeId);

    while (queue.length > 0 && results.length < this.maxResults) {
      const current = queue.shift()!;

      if (current.depth > 0 && current.depth <= maxDepth) {
        const node = this.graph.nodes.get(current.nodeId);
        if (node) {
          // Determine impact level based on depth
          let impactLevel: 'direct' | 'transitive' | 'secondary' = 'secondary';
          if (current.depth === 1) impactLevel = 'direct';
          else if (current.depth <= 3) impactLevel = 'transitive';

          results.push({
            nodeId: current.nodeId,
            depth: current.depth,
            path: [...current.path, node],
            edges: current.edges,
            type: impactLevel,
          });
        }
      }

      if (current.depth < maxDepth) {
        // Get edges based on direction
        let edges: GraphEdge[] = [];

        if (direction === 'incoming') {
          edges = this.graph.edgesByTarget.get(current.nodeId) || [];
        } else if (direction === 'outgoing-calls') {
          edges = (this.graph.edgesBySource.get(current.nodeId) || []).filter((e) => e.type === 'calls');
        } else {
          // outgoing: all types
          edges = this.graph.edgesBySource.get(current.nodeId) || [];
        }

        for (const edge of edges) {
          const nextNodeId = direction === 'incoming' ? edge.source : edge.target;

          if (!visited.has(nextNodeId)) {
            visited.add(nextNodeId);
            const nextNode = this.graph.nodes.get(nextNodeId);

            if (nextNode) {
              queue.push({
                nodeId: nextNodeId,
                depth: current.depth + 1,
                path: [...current.path, nextNode],
                edges: [...current.edges, edge],
              });
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Set maximum depth for traversals
   */
  setMaxDepth(depth: number): void {
    if (depth < 1 || depth > 10) {
      throw new Error('Max depth must be between 1 and 10');
    }
    this.maxDepth = depth;
    this.clearCache();
  }

  /**
   * Set maximum results per query
   */
  setMaxResults(count: number): void {
    if (count < 1 || count > 10000) {
      throw new Error('Max results must be between 1 and 10000');
    }
    this.maxResults = count;
  }
}

export default MultiHopTraversal;

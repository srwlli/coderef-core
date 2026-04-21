/**
 * Analyzer Service - Unified API for relationship analysis
 * Phase 3, Task P3-T5: Relationship Detection & Analysis
 *
 * Orchestrates:
 * - Import Parser (P3-T1)
 * - Call Detector (P3-T2)
 * - Graph Builder (P3-T3)
 * - Graph Analyzer (P3-T4)
 *
 * Provides single entry point for complete analysis pipeline
 */

import GraphBuilder, { DependencyGraph, GraphNode } from './graph-builder.js';
import GraphAnalyzer, {
  TraversalPath,
  CircularDependency,
} from './graph-analyzer.js';
import { GraphError, GraphErrorCode } from './graph-error.js';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

/**
 * Analysis result containing graph and statistics
 */
export interface AnalysisResult {
  graph: DependencyGraph;
  statistics: {
    nodeCount: number;
    edgeCount: number;
    edgesByType: Record<string, number>;
    densityRatio: number;
    avgInDegree: number;
    avgOutDegree: number;
    circularity: number;
  };
  circularDependencies: CircularDependency[];
  isolatedNodes: GraphNode[];
  analysisTime: number;
}

export class AnalyzerService {
  private graphBuilder: GraphBuilder;
  private graphAnalyzer?: GraphAnalyzer;
  private cachedGraph?: DependencyGraph;
  private basePath: string;
  private elementMap?: Map<string, { id: string; type: string; file: string; line?: number }>;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
    this.graphBuilder = new GraphBuilder(basePath);
  }

  /**
   * Set element map for enhanced graph building
   */
  setElementMap(
    elementMap: Map<string, { id: string; type: string; file: string; line?: number }>
  ): void {
    this.elementMap = elementMap;
  }

  /**
   * Analyze codebase and build dependency graph
   */
  async analyze(
    patterns: string[] = ['packages/**/*.ts', '!**/node_modules/**', '!**/dist/**'],
    useCache: boolean = true
  ): Promise<AnalysisResult> {
    const startTime = Date.now();

    // Return cached graph if available
    if (useCache && this.cachedGraph && this.graphAnalyzer) {
      return this.createAnalysisResult(this.cachedGraph, this.graphAnalyzer, startTime);
    }

    // Find all TypeScript files matching patterns
    const filePaths = await this.findFiles(patterns);

    if (filePaths.length === 0) {
      throw new Error(
        `No files found matching patterns: ${patterns.join(', ')}`
      );
    }

    // Build graph
    const graph = this.graphBuilder.buildGraph(
      filePaths,
      this.elementMap
    );

    // Create analyzer
    const analyzer = new GraphAnalyzer(graph);

    // Cache for future use
    this.cachedGraph = graph;
    this.graphAnalyzer = analyzer;

    return this.createAnalysisResult(graph, analyzer, startTime);
  }

  /**
   * Create analysis result with statistics
   */
  private createAnalysisResult(
    graph: DependencyGraph,
    analyzer: GraphAnalyzer,
    startTime: number
  ): AnalysisResult {
    const stats = this.getGraphStatistics(graph);
    const circularDeps = analyzer.detectCircularDependencies();
    const isolatedNodes = this.findIsolatedNodes(graph);

    const circularity =
      circularDeps.length > 0
        ? (circularDeps.length / (graph.nodes.size || 1)) * 100
        : 0;

    return {
      graph,
      statistics: {
        ...stats,
        circularity,
      },
      circularDependencies: circularDeps,
      isolatedNodes,
      analysisTime: Date.now() - startTime,
    };
  }

  /**
   * Query: What calls this element?
   */
  getCallers(nodeId: string): GraphNode[] {
    if (!this.graphAnalyzer) {
      throw new Error('No graph available. Call analyze() first.');
    }
    return this.graphAnalyzer.getCallers(nodeId);
  }

  /**
   * Query: What does this element call?
   */
  getCallees(nodeId: string): GraphNode[] {
    if (!this.graphAnalyzer) {
      throw new Error('No graph available. Call analyze() first.');
    }
    return this.graphAnalyzer.getCallees(nodeId);
  }

  /**
   * Query: What depends on this element?
   */
  getDependents(nodeId: string, maxDepth?: number): GraphNode[] {
    if (!this.graphAnalyzer) {
      throw new Error('No graph available. Call analyze() first.');
    }
    return this.graphAnalyzer.getDependents(nodeId, maxDepth);
  }

  /**
   * Query: What does this element depend on?
   */
  getDependencies(nodeId: string, maxDepth?: number): GraphNode[] {
    if (!this.graphAnalyzer) {
      throw new Error('No graph available. Call analyze() first.');
    }
    return this.graphAnalyzer.getDependencies(nodeId, maxDepth);
  }

  /**
   * Traverse graph from starting node
   */
  traverse(
    startNodeId: string,
    maxDepth?: number,
    direction?: 'outgoing' | 'incoming' | 'both'
  ): TraversalPath {
    if (!this.graphAnalyzer) {
      throw new Error('No graph available. Call analyze() first.');
    }
    return this.graphAnalyzer.traverse(startNodeId, maxDepth, direction);
  }

  /**
   * Find circular dependencies
   */
  detectCircularDependencies(): CircularDependency[] {
    if (!this.graphAnalyzer) {
      throw new Error('No graph available. Call analyze() first.');
    }
    return this.graphAnalyzer.detectCircularDependencies();
  }

  /**
   * Find shortest path between two nodes
   */
  findShortestPath(sourceNodeId: string, targetNodeId: string): TraversalPath | null {
    if (!this.graphAnalyzer) {
      throw new Error('No graph available. Call analyze() first.');
    }
    return this.graphAnalyzer.findShortestPath(sourceNodeId, targetNodeId);
  }

  /**
   * Find all paths between two nodes
   */
  findAllPaths(
    sourceNodeId: string,
    targetNodeId: string,
    maxDepth?: number
  ): TraversalPath[] {
    if (!this.graphAnalyzer) {
      throw new Error('No graph available. Call analyze() first.');
    }
    return this.graphAnalyzer.findAllPaths(sourceNodeId, targetNodeId, maxDepth);
  }

  /**
   * Get current cached graph
   */
  getGraph(): DependencyGraph | undefined {
    return this.cachedGraph;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cachedGraph = undefined;
    this.graphAnalyzer = undefined;
    this.graphBuilder.clearCache();
  }

  /**
   * Export graph as JSON
   */
  exportGraphAsJSON(): { nodes: any[]; edges: any[]; statistics: any } | null {
    if (!this.cachedGraph) {
      return null;
    }
    return this.graphBuilder.exportGraphAsJSON(this.cachedGraph);
  }

  /**
   * Save graph to file
   */
  async saveGraph(filePath: string): Promise<void> {
    if (!this.cachedGraph) {
      throw new Error('No graph available to save.');
    }

    const json = this.graphBuilder.exportGraphAsJSON(this.cachedGraph);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
  }

  /**
   * Load graph from file
   * @param filePath - Path to graph JSON file
   * @throws {GraphError} If file not found, invalid JSON, or invalid graph structure
   */
  async loadGraph(filePath: string): Promise<void> {
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      throw new GraphError(
        `Graph file not found: ${filePath}`,
        GraphErrorCode.FILE_NOT_FOUND,
        { filePath }
      );
    }

    // Read and parse JSON with error handling
    let json: any;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      json = JSON.parse(content);
    } catch (error) {
      throw new GraphError(
        `Failed to parse graph JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
        GraphErrorCode.PARSE_ERROR,
        { filePath, error: error instanceof Error ? error.message : String(error) }
      );
    }

    // Reconstruct graph from JSON using GraphBuilder helper
    // This will throw GraphError if validation fails (including missing edges)
    const graph = this.graphBuilder.importGraphFromJSON(json);

    // Cache the loaded graph
    this.cachedGraph = graph;

    // Create GraphAnalyzer with the loaded graph
    this.graphAnalyzer = new GraphAnalyzer(graph);
  }

  /**
   * Find all files matching glob patterns
   */
  private async findFiles(patterns: string[]): Promise<string[]> {
    const allFiles: string[] = [];
    const fileSet = new Set<string>();

    for (const pattern of patterns) {
      try {
        const matches = glob.sync(pattern, {
          cwd: this.basePath,
          ignore: ['**/node_modules/**', '**/dist/**', '**/__tests__/**'],
        });

        for (const file of matches) {
          const fullPath = path.resolve(this.basePath, file);
          fileSet.add(fullPath);
        }
      } catch (error) {
        // Skip patterns that fail
        console.warn(`Failed to match pattern: ${pattern}`);
      }
    }

    return Array.from(fileSet);
  }

  /**
   * Get graph statistics
   */
  private getGraphStatistics(graph: DependencyGraph): any {
    return this.graphBuilder.getGraphStatistics(graph);
  }

  /**
   * Find isolated nodes
   */
  private findIsolatedNodes(graph: DependencyGraph): GraphNode[] {
    return this.graphBuilder.findIsolatedNodes(graph);
  }
}

export default AnalyzerService;

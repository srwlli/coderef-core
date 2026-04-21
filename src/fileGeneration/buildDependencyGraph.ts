/**
 * Build Dependency Graph - Analyze import relationships
 *
 * Outputs:
 * - .coderef/graph.json (main graph)
 * - .coderef/exports/graph.json (copy for exports)
 *
 * @module fileGeneration/buildDependencyGraph
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ElementData } from '../types/types.js';

export interface DependencyGraph {
  version: string;
  generatedAt: string;
  projectPath: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  statistics: {
    totalNodes: number;
    totalEdges: number;
    filesWithDependencies: number;
  };
}

export interface GraphNode {
  id: string;
  type: 'file' | 'element';
  label: string;
  path?: string;
  elementType?: string;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'imports' | 'calls' | 'extends' | 'implements';
  weight?: number;
}

/**
 * Build dependency graph from scan results
 *
 * @param projectPath - Absolute path to project root
 * @param elements - Array of code elements from scan
 * @returns Promise<DependencyGraph> - Dependency graph structure
 *
 * @example
 * ```typescript
 * const elements = await scanCurrentElements('./src', ['ts', 'tsx']);
 * const graph = await buildDependencyGraph('./my-project', elements);
 * // Creates: ./my-project/.coderef/graph.json
 * //          ./my-project/.coderef/exports/graph.json
 * ```
 */
export async function buildDependencyGraph(
  projectPath: string,
  elements: ElementData[]
): Promise<DependencyGraph> {
  // Build graph structure
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const fileNodes = new Map<string, GraphNode>();
  const elementNodes = new Map<string, GraphNode>();

  // Create file nodes
  const uniqueFiles = new Set(elements.map((el) => el.file));
  for (const file of uniqueFiles) {
    const node: GraphNode = {
      id: `file:${file}`,
      type: 'file',
      label: path.basename(file),
      path: file,
    };
    nodes.push(node);
    fileNodes.set(file, node);
  }

  // Create element nodes and edges
  for (const element of elements) {
    const elementId = `element:${element.file}:${element.name}`;
    const node: GraphNode = {
      id: elementId,
      type: 'element',
      label: element.name,
      path: element.file,
      elementType: element.type,
      metadata: {
        line: element.line,
        exported: element.exported,
      },
    };
    nodes.push(node);
    elementNodes.set(elementId, node);

    // Connect element to its file
    const fileNode = fileNodes.get(element.file);
    if (fileNode) {
      edges.push({
        source: fileNode.id,
        target: elementId,
        type: 'imports',
      });
    }

    // Connect elements via calls
    if (element.calls && element.calls.length > 0) {
      for (const calledFunction of element.calls) {
        // Try to find the called function in our elements
        const targetId = `element:${element.file}:${calledFunction}`;
        if (elementNodes.has(targetId)) {
          edges.push({
            source: elementId,
            target: targetId,
            type: 'calls',
          });
        }
      }
    }
  }

  // Build graph object
  const graph: DependencyGraph = {
    version: '2.0.0',
    generatedAt: new Date().toISOString(),
    projectPath,
    nodes,
    edges,
    statistics: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      filesWithDependencies: uniqueFiles.size,
    },
  };

  // Ensure directories exist
  const coderefDir = path.join(projectPath, '.coderef');
  const exportsDir = path.join(projectPath, '.coderef', 'exports');
  await fs.mkdir(coderefDir, { recursive: true });
  await fs.mkdir(exportsDir, { recursive: true });

  // Write to both locations
  const graphPath = path.join(coderefDir, 'graph.json');
  const exportsGraphPath = path.join(exportsDir, 'graph.json');
  const graphJSON = JSON.stringify(graph, null, 2);

  await Promise.all([
    fs.writeFile(graphPath, graphJSON, 'utf-8'),
    fs.writeFile(exportsGraphPath, graphJSON, 'utf-8'),
  ]);

  return graph;
}

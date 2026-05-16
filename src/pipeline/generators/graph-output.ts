/**
 * @coderef-semantic: 1.0.0
 * @exports normalizeGraphForOutput
 * @used_by src/pipeline/generators/export-generator.ts, src/pipeline/generators/graph-generator.ts
 */

import * as path from 'path';
import type { ExportedGraph } from '../../export/graph-exporter.js';
import { globalRegistry } from '../../registry/entity-registry.js';

function toPortablePath(projectPath: string, value: string): string {
  if (path.isAbsolute(value)) {
    return path.relative(projectPath, value).replace(/\\/g, '/');
  }

  return value.replace(/\\/g, '/');
}

function looksLikeElementId(value: string): boolean {
  if (!path.isAbsolute(value)) {
    return false;
  }

  if (process.platform === 'win32') {
    return value.slice(2).includes(':');
  }

  return value.includes(':');
}

function normalizeEdgeReference(projectPath: string, value: string): string {
  if (looksLikeElementId(value)) {
    return value;
  }

  if (!path.isAbsolute(value)) {
    return value.replace(/\\/g, '/');
  }

  return toPortablePath(projectPath, value);
}

function normalizeMetadata(
  projectPath: string,
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!metadata) {
    return undefined;
  }

  const normalized = { ...metadata };

  for (const key of ['file', 'sourceFile', 'targetFile']) {
    const value = normalized[key];
    if (typeof value === 'string') {
      normalized[key] = toPortablePath(projectPath, value);
    }
  }

  return normalized;
}

export function normalizeGraphForOutput(
  graph: ExportedGraph,
  projectPath: string
): ExportedGraph {
  return {
    ...graph,
    nodes: graph.nodes.map(node => ({
      ...node,
      // Lookup UUID for the node which corresponds to an element (WO-CODEREF-CORE-REGISTRY-001)
      uuid: node.file && node.name && typeof node.line === 'number'
        ? globalRegistry.lookup({ name: node.name, file: node.file, line: node.line })
        : undefined,
      file: node.file ? toPortablePath(projectPath, node.file) : undefined,
      // elementType mirrors type so legacy consumers (buildDependencyGraph.ts interface) can read it
      elementType: node.type,
    })),
    edges: graph.edges.map(edge => ({
      ...edge,
      source: normalizeEdgeReference(projectPath, edge.source),
      target: normalizeEdgeReference(projectPath, edge.target),
      metadata: normalizeMetadata(projectPath, edge.metadata),
    })),
  };
}

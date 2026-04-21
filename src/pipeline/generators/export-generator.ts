/**
 * ExportGenerator - Export graph in various formats
 *
 * WO-UNIFIED-CODEREF-PIPELINE-001 - Phase 3, Task GEN-009
 *
 * Produces: .coderef/exports/graph.json, graph.jsonld, diagram-wrapped.md
 * Formats: Full JSON export, JSON-LD with context, wrapped Mermaid
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { PipelineState } from '../types.js';
import { normalizeGraphForOutput } from './graph-output.js';

/**
 * ExportGenerator - Export graph data in multiple formats
 */
export class ExportGenerator {
  async generate(state: PipelineState, outputDir: string): Promise<void> {
    const exportsDir = path.join(outputDir, 'exports');
    await fs.mkdir(exportsDir, { recursive: true });
    const normalizedGraph = normalizeGraphForOutput(state.graph, state.projectPath);

    // Full JSON export
    await this.generateJSONExport(normalizedGraph, exportsDir);

    // JSON-LD export
    await this.generateJSONLD(normalizedGraph, exportsDir);

    // Wrapped Mermaid diagram
    await this.generateWrappedDiagram(state, outputDir, exportsDir, normalizedGraph);

    if (state.options.verbose) {
      console.log('[ExportGenerator] Generated 3 export files');
    }
  }

  private async generateJSONExport(
    normalizedGraph: PipelineState['graph'],
    exportsDir: string
  ): Promise<void> {
    const exportPath = path.join(exportsDir, 'graph.json');
    await fs.writeFile(exportPath, JSON.stringify(normalizedGraph, null, 2), 'utf-8');
  }

  private async generateJSONLD(
    normalizedGraph: PipelineState['graph'],
    exportsDir: string
  ): Promise<void> {
    const exportPath = path.join(exportsDir, 'graph.jsonld');

    const jsonld = {
      '@context': {
        '@vocab': 'http://schema.org/',
        coderef: 'http://coderef.org/schema/',
        nodes: 'coderef:nodes',
        edges: 'coderef:edges',
        source: 'coderef:source',
        target: 'coderef:target',
      },
      '@type': 'coderef:DependencyGraph',
      nodes: normalizedGraph.nodes.slice(0, 1000).map(n => ({
        '@id': n.id,
        '@type': `coderef:${n.type}`,
        name: this.getNodeLabel(n),
        file: n.file,
        line: n.line,
      })),
      edges: normalizedGraph.edges.slice(0, 1000).map(e => ({
        '@type': `coderef:${e.type}`,
        source: e.source,
        target: e.target,
      })),
    };

    await fs.writeFile(exportPath, JSON.stringify(jsonld, null, 2), 'utf-8');
  }

  private async generateWrappedDiagram(
    state: PipelineState,
    outputDir: string,
    exportsDir: string,
    normalizedGraph: PipelineState['graph']
  ): Promise<void> {
    const exportPath = path.join(exportsDir, 'diagram-wrapped.md');
    const mermaidCode = await this.readDependencyDiagram(outputDir)
      ?? this.generateMermaidDiagram(normalizedGraph);

    const markdown = `# Dependency Diagram

## Usage

Embed this Mermaid diagram in your documentation:

\`\`\`mermaid
${mermaidCode}
\`\`\`

## Statistics

- **Nodes:** ${state.graph.nodes.length}
- **Edges:** ${state.graph.edges.length}
- **Files:** ${state.metadata.filesScanned}
- **Elements:** ${state.elements.length}

## Generated

${new Date().toISOString()}
`;

    await fs.writeFile(exportPath, markdown, 'utf-8');
  }

  private async readDependencyDiagram(outputDir: string): Promise<string | undefined> {
    const diagramPath = path.join(outputDir, 'diagrams', 'dependencies.mmd');

    try {
      return await fs.readFile(diagramPath, 'utf-8');
    } catch {
      return undefined;
    }
  }

  private generateMermaidDiagram(graph: PipelineState['graph']): string {
    const lines = ['graph TD'];

    graph.nodes.slice(0, 50).forEach(node => {
      const id = this.sanitizeId(node.id);
      lines.push(`  ${id}["${this.escapeLabel(this.getNodeLabel(node))}"]`);
    });

    graph.edges.slice(0, 100).forEach(edge => {
      const source = this.sanitizeId(edge.source);
      const target = this.sanitizeId(edge.target);
      lines.push(`  ${source} --> ${target}`);
    });

    return lines.join('\n');
  }

  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9]/g, '_');
  }

  private getNodeLabel(node: PipelineState['graph']['nodes'][number]): string {
    return node.name || node.file || node.id;
  }

  private escapeLabel(label: string): string {
    return label.replace(/"/g, '\\"');
  }
}

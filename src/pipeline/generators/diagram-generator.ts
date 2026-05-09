/**
 * DiagramGenerator - Generate visual dependency diagrams
 *
 * WO-UNIFIED-CODEREF-PIPELINE-001 - Phase 3, Task GEN-008
 *
 * Produces: .coderef/diagrams/*.mmd, *.dot
 * Formats: Mermaid (dependencies, calls, imports), Graphviz DOT
 */

/**
 * @semantic
 * exports: [DiagramGenerator]
 * used_by: [src/cli/populate.ts]
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { PipelineState } from '../types.js';

/**
 * DiagramGenerator - Generate Mermaid and DOT diagrams
 */
export class DiagramGenerator {
  async generate(state: PipelineState, outputDir: string): Promise<void> {
    const diagramsDir = path.join(outputDir, 'diagrams');
    await fs.mkdir(diagramsDir, { recursive: true });

    // Generate dependency diagram (Mermaid)
    const depMermaid = this.generateDependencyDiagram(state);
    await fs.writeFile(path.join(diagramsDir, 'dependencies.mmd'), depMermaid, 'utf-8');

    // Generate call diagram (Mermaid)
    const callMermaid = this.generateCallDiagram(state);
    await fs.writeFile(path.join(diagramsDir, 'calls.mmd'), callMermaid, 'utf-8');

    // Generate import diagram (Mermaid)
    const importMermaid = this.generateImportDiagram(state);
    await fs.writeFile(path.join(diagramsDir, 'imports.mmd'), importMermaid, 'utf-8');

    // Generate DOT format
    const dot = this.generateDOT(state);
    await fs.writeFile(path.join(diagramsDir, 'dependencies.dot'), dot, 'utf-8');

    if (state.options.verbose) {
      console.log('[DiagramGenerator] Generated 4 diagram files');
    }
  }

  private generateDependencyDiagram(state: PipelineState): string {
    const lines = ['graph TD'];

    // Add nodes
    state.graph.nodes.slice(0, 50).forEach(node => {
      const id = this.sanitizeId(node.id);
      lines.push(`  ${id}["${this.escapeLabel(this.getNodeLabel(node))}"]`);
    });

    // Add edges
    state.graph.edges.slice(0, 100).forEach(edge => {
      const source = this.sanitizeId(edge.source);
      const target = this.sanitizeId(edge.target);
      lines.push(`  ${source} --> ${target}`);
    });

    return lines.join('\n');
  }

  private generateCallDiagram(state: PipelineState): string {
    const lines = ['graph LR'];

    const callEdges = state.graph.edges.filter(e => e.type === 'calls').slice(0, 100);

    callEdges.forEach(edge => {
      const source = this.sanitizeId(edge.source);
      const target = this.sanitizeId(edge.target);
      lines.push(`  ${source} -->|calls| ${target}`);
    });

    return lines.join('\n');
  }

  private generateImportDiagram(state: PipelineState): string {
    const lines = ['graph TD'];

    const importEdges = state.graph.edges.filter(e => e.type === 'imports').slice(0, 100);

    importEdges.forEach(edge => {
      const source = this.sanitizeId(edge.source);
      const target = this.sanitizeId(edge.target);
      lines.push(`  ${source} -->|imports| ${target}`);
    });

    return lines.join('\n');
  }

  private generateDOT(state: PipelineState): string {
    const lines = ['digraph Dependencies {'];
    lines.push('  rankdir=LR;');
    lines.push('  node [shape=box];');

    const seenNodes = new Set<string>();

    state.graph.nodes.slice(0, 50).forEach(node => {
      const id = this.sanitizeId(node.id);
      seenNodes.add(node.id);
      lines.push(`  ${id} [label="${this.escapeLabel(this.getNodeLabel(node))}"];`);
    });

    // Add edges
    state.graph.edges.slice(0, 100).forEach(edge => {
      const sourceId = this.sanitizeId(edge.source);
      const targetId = this.sanitizeId(edge.target);
      const sourceNode = state.graph.nodes.find(n => n.id === edge.source);
      const targetNode = state.graph.nodes.find(n => n.id === edge.target);

      if (!seenNodes.has(edge.source)) {
        lines.push(
          `  ${sourceId} [label="${this.escapeLabel(sourceNode ? this.getNodeLabel(sourceNode) : edge.source)}"];`
        );
        seenNodes.add(edge.source);
      }

      if (!seenNodes.has(edge.target)) {
        lines.push(
          `  ${targetId} [label="${this.escapeLabel(targetNode ? this.getNodeLabel(targetNode) : edge.target)}"];`
        );
        seenNodes.add(edge.target);
      }

      lines.push(`  ${sourceId} -> ${targetId};`);
    });

    lines.push('}');
    return lines.join('\n');
  }

  private getNodeLabel(node: PipelineState['graph']['nodes'][number]): string {
    return node.name || node.file || node.id;
  }

  private escapeLabel(label: string): string {
    return label.replace(/"/g, '\\"');
  }

  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9]/g, '_');
  }
}

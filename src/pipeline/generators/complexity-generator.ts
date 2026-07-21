/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability complexity-generator-complexity-metrics
 * @exports ComplexityGenerator
 * @used_by src/cli/populate.ts
 */

/**
 * ComplexityGenerator - Generate complexity metrics from PipelineState
 *
 * WO-CODEREF-CORE-REGISTRY-001 - Phase 3, Task T3-1
 *
 * Produces: .coderef/reports/complexity/summary.json and complexity.json
 * Metrics: Cyclomatic complexity, LOC, parameter count per element
 *
 * WO-EXTEND-THE-CLONE-SURFACE-P10 P2: rows prefer the extract-time AST
 * metrics — cyclomatic from ElementData.complexity (the IMP-CORE-003
 * preference path, now actually fed), LOC from the persisted endLine span —
 * and carry additive cognitive/nestingDepth/metric_source columns. The
 * regex + next-element-line estimates remain ONLY as the disclosed fallback
 * (`metric_source: 'estimated'`) for elements without persisted data.
 */



import * as fs from 'fs/promises';
import * as path from 'path';
import type { PipelineState } from '../types.js';
import type { ElementData } from '../../types/types.js';
import logger from '../../utils/logger.js';
import { normalizeSlashes } from '../../utils/path-normalize.js';

interface ComplexityMetrics {
  element: string;
  file: string;
  type: string;
  complexity: number;
  loc: number;
  parameters: number;
  /** Cognitive complexity (Sonar-style subset), present when AST metrics were persisted */
  cognitive?: number;
  /** Max nesting depth, present when AST metrics were persisted */
  nestingDepth?: number;
  /** Provenance: 'ast' = extract-time metrics; 'estimated' = regex/next-element fallback */
  metric_source: 'ast' | 'estimated';
}

/**
 * ComplexityGenerator - Compute complexity metrics for code elements
 */
export class ComplexityGenerator {
  /**
   * Generate complexity reports from pipeline state
   *
   * @param state Populated pipeline state
   * @param outputDir Output directory (.coderef/)
   */
  async generate(state: PipelineState, outputDir: string): Promise<void> {
    const reportsDir = path.join(outputDir, 'reports');
    const complexityDir = path.join(reportsDir, 'complexity');
    const isSlim = state.options.mode === 'minimal' || state.options.mode === 'context';

    // Ensure directories exist
    await fs.mkdir(reportsDir, { recursive: true });
    await fs.mkdir(complexityDir, { recursive: true });

    // Compute metrics for all elements
    const metrics = this.computeMetrics(state.elements, state.sources, state.projectPath);

    // Sort by complexity (descending)
    metrics.sort((a, b) => b.complexity - a.complexity);

    // Filter high complexity items for summary
    const highComplexityItems = metrics.filter(m => m.complexity > 10);

    // Write summary file (always generated, slim by default)
    const summaryPath = path.join(complexityDir, 'summary.json');
    const summary = {
      totalElements: metrics.length,
      averageComplexity: this.average(metrics.map(m => m.complexity)),
      averageLOC: this.average(metrics.map(m => m.loc)),
      highComplexityCount: highComplexityItems.length,
      // In slim mode, only include high complexity items to reduce file size
      elements: isSlim ? highComplexityItems : metrics,
    };

    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');

    // Write full complexity file ONLY if not in slim/minimal mode
    if (!isSlim) {
      const fullPath = path.join(complexityDir, 'complexity.json');
      await fs.writeFile(fullPath, JSON.stringify(metrics, null, 2), 'utf-8');
    }

    if (state.options.verbose) {
      logger.debug(
        `[ComplexityGenerator] Generated complexity metrics (${isSlim ? 'slim' : 'full'}) for ${metrics.length} elements`
      );
    }
  }

  /**
   * Compute complexity metrics for all elements
   *
   * @param elements Code elements
   * @param sources File contents
   * @param projectPath Project root
   * @returns Array of complexity metrics
   */
  private computeMetrics(
    elements: ElementData[],
    sources: Map<string, string>,
    projectPath: string
  ): ComplexityMetrics[] {
    const elementsByFile = new Map<string, ElementData[]>();

    for (const element of elements) {
      const fileElements = elementsByFile.get(element.file) || [];
      fileElements.push(element);
      elementsByFile.set(element.file, fileElements);
    }

    for (const fileElements of elementsByFile.values()) {
      fileElements.sort((a, b) => a.line - b.line);
    }

    return elements
      .filter(elem => elem.type === 'function' || elem.type === 'method')
      .map(elem => {
        const relativePath = normalizeSlashes(path.relative(projectPath, elem.file));
        const content = sources.get(elem.file) || '';
        const fileElements = elementsByFile.get(elem.file) || [];

        const hasAstMetrics = elem.complexity?.cyclomatic !== undefined;
        const row: ComplexityMetrics = {
          element: elem.name,
          file: relativePath,
          type: elem.type,
          complexity: this.calculateComplexity(content, elem, fileElements),
          loc: this.calculateLOC(content, elem, fileElements),
          parameters: elem.parameters?.length || 0,
          metric_source: hasAstMetrics ? 'ast' : 'estimated',
        };
        if (elem.complexity?.cognitive !== undefined) {
          row.cognitive = elem.complexity.cognitive;
        }
        if (elem.complexity?.nestingDepth !== undefined) {
          row.nestingDepth = elem.complexity.nestingDepth;
        }
        return row;
      });
  }

  /**
   * Calculate cyclomatic complexity for an element
   * Uses AST-based complexity from tree-sitter scanner if available,
   * falls back to regex-based estimation for elements without AST data
   *
   * @param content File content
   * @param elem Code element
   * @returns Complexity score
   */
  private calculateComplexity(
    content: string,
    elem: ElementData,
    fileElements: ElementData[]
  ): number {
    // Use AST-based complexity from tree-sitter scanner if available (IMP-CORE-003)
    if (elem.complexity?.cyclomatic !== undefined) {
      return elem.complexity.cyclomatic;
    }

    // Fall back to regex-based estimation for elements without AST data
    const lines = content.split('\n');
    const startLine = Math.max(0, elem.line - 1);
    const endLine = this.getEstimatedEndLine(lines.length, elem, fileElements);
    const elementContent = lines.slice(startLine, endLine).join('\n');

    return this.calculateComplexityFromSource(elementContent);
  }

  /**
   * Fallback regex-based complexity estimation
   * Used when AST-based complexity is not available
   */
  private calculateComplexityFromSource(elementContent: string): number {
    // Count decision points
    const patterns = [
      /\bif\s*\(/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bcase\s+/g,
      /&&/g,
      /\|\|/g,
      /\?/g,
      /\bcatch\s*\(/g,
    ];

    let complexity = 1; // Base complexity
    for (const pattern of patterns) {
      const matches = elementContent.match(pattern);
      complexity += matches ? matches.length : 0;
    }

    return complexity;
  }

  /**
   * Calculate lines of code for an element
   *
   * @param content File content
   * @param elem Code element
   * @returns Line count
   */
  private calculateLOC(
    content: string,
    elem: ElementData,
    fileElements: ElementData[]
  ): number {
    // Persisted element span (P1 clone substrate) beats the next-element
    // estimate — the estimate attributes trailing gap/comments to the element.
    if (elem.endLine !== undefined && elem.endLine >= elem.line) {
      return elem.endLine - elem.line + 1;
    }
    const totalLines = content.split('\n').length;
    const endLine = this.getEstimatedEndLine(totalLines, elem, fileElements);
    return Math.max(1, endLine - elem.line + 1);
  }

  private getEstimatedEndLine(
    totalLines: number,
    elem: ElementData,
    fileElements: ElementData[]
  ): number {
    const currentIndex = fileElements.findIndex(
      candidate => candidate.file === elem.file && candidate.name === elem.name && candidate.line === elem.line
    );

    if (currentIndex >= 0 && currentIndex < fileElements.length - 1) {
      return Math.max(elem.line, fileElements[currentIndex + 1].line - 1);
    }

    return totalLines;
  }

  /**
   * Calculate average of numbers
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return Math.round((numbers.reduce((sum, n) => sum + n, 0) / numbers.length) * 10) / 10;
  }
}

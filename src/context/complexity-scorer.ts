/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability complexity-scorer
 * @exports ComplexityScorer
 * @used_by src/cli/coderef-analyze.ts, src/context/task-context-generator.ts
 */

/**
 * Complexity Scorer
 *
 * Calculates complexity metrics for code elements:
 * - Lines of Code (LOC)
 * - Parameter count
 * - Cyclomatic complexity
 * - Cognitive complexity + nesting depth (passthrough, when persisted)
 *
 * Part of WO-CODEREF-CONTEXT-ENHANCEMENT-001 - Phase 1.
 *
 * WO-EXTEND-THE-CLONE-SURFACE-P10 P2 rewire: inputs are REAL when the element
 * carries them — LOC from the persisted `endLine` span, parameterCount from
 * `element.parameters`, cyclomatic/cognitive/nesting from the extract-time
 * AST metrics (`ElementData.complexity`, computed by
 * src/pipeline/extractors/complexity-metrics.ts). The previous fabrications
 * (LOC = max(2, calls)*2, hardcoded 2/1 params, file-wide regex CC that gave
 * every element in a file the same number) are RETIRED. Elements without the
 * persisted data fall back to minimal disclosed estimates and are stamped
 * `metric_source: 'estimated'` — never a silently fake number.
 */



import type { ElementComplexity, ComplexityMetrics, ElementData } from './types.js';

/**
 * Complexity Scorer for code elements
 *
 * Provides methods to calculate:
 * - Lines of code per function
 * - Parameter count
 * - Cyclomatic complexity
 */
export class ComplexityScorer {
  private sourceMap: Map<string, string> = new Map();

  constructor() {
    // No formula needed - pure metrics only
  }

  /**
   * Add source code for a file (retained for API back-compat).
   *
   * @deprecated The P2 rewire scores from persisted element data
   * (endLine/parameters/complexity); registered sources are no longer read
   * by any scoring path.
   */
  addSource(filePath: string, source: string): void {
    this.sourceMap.set(filePath, source);
  }

  /**
   * Calculate complexity for a single element
   * @param element Element to analyze
   * @returns Element complexity with all metrics
   */
  scoreElement(element: ElementData): ElementComplexity {
    // Provenance keys on the headline metric: persisted AST cyclomatic
    // present = 'ast'; otherwise the fallbacks below are estimates.
    const hasAstMetrics = element.complexity?.cyclomatic !== undefined;

    const metrics: ComplexityMetrics = {
      loc: this.calculateLOC(element),
      parameterCount: this.countParameters(element),
      cyclomaticComplexity: this.calculateCyclomaticComplexity(element),
      complexityScore: 0, // Will be calculated below
      metric_source: hasAstMetrics ? 'ast' : 'estimated',
    };

    // Passthrough of the extract-time metrics when present (additive fields).
    if (element.complexity?.cognitive !== undefined) {
      metrics.cognitiveComplexity = element.complexity.cognitive;
    }
    if (element.complexity?.nestingDepth !== undefined) {
      metrics.nestingDepth = element.complexity.nestingDepth;
    }

    // Calculate overall complexity score (0-10)
    metrics.complexityScore = this.calculateComplexityScore(metrics);

    // Determine risk level
    const riskLevel = this.getRiskLevel(metrics.complexityScore);

    return {
      name: element.name,
      type: element.type,
      file: element.file,
      line: element.line,
      metrics,
      riskLevel,
    };
  }

  /**
   * Score multiple elements
   * @param elements Elements to analyze
   * @returns Array of element complexities
   */
  scoreElements(elements: ElementData[]): ElementComplexity[] {
    return elements.map((el) => this.scoreElement(el));
  }

  /**
   * Calculate Lines of Code (LOC) for an element
   *
   * REAL when the element carries the persisted `endLine` span (P1 clone
   * substrate): endLine - line + 1. Fallback: a small type-keyed estimate
   * (the element is stamped metric_source 'estimated' by scoreElement).
   *
   * @param element Element to measure
   * @returns LOC (real span when endLine present, else estimate)
   */
  private calculateLOC(element: ElementData): number {
    if (element.endLine !== undefined && element.endLine >= element.line) {
      return element.endLine - element.line + 1;
    }
    // Estimate when no persisted span exists (old/fallback-scanned index).
    return element.type === 'method' ? 8 : 6;
  }

  /**
   * Count function parameters
   *
   * REAL when the extractor populated `element.parameters` (all tree-sitter
   * paths do). Fallback: the historical type-keyed estimate.
   *
   * @param element Element to analyze
   * @returns Parameter count
   */
  private countParameters(element: ElementData): number {
    if (element.parameters !== undefined) {
      return element.parameters.length;
    }
    return element.type === 'method' ? 2 : 1;
  }

  /**
   * Cyclomatic Complexity (CC)
   *
   * REAL when the element carries the extract-time AST metric
   * (`element.complexity.cyclomatic` — decision nodes + 1 over the element
   * BODY, per-grammar node sets; see complexity-metrics.ts for the pinned
   * spec). The former file-wide regex fallback is RETIRED — it counted the
   * WHOLE FILE's tokens (including strings/comments) for every element.
   * Without the persisted metric this returns the minimal estimate 1.
   *
   * @param element Element to analyze
   * @returns Cyclomatic complexity
   */
  private calculateCyclomaticComplexity(element: ElementData): number {
    if (element.complexity?.cyclomatic !== undefined) {
      return Math.max(1, element.complexity.cyclomatic);
    }
    return 1;
  }

  /**
   * Calculate overall complexity score (0-10)
   *
   * Combines all metrics into single score using standard weights:
   * - LOC: 30% weight
   * - Cyclomatic Complexity: 40% weight
   * - Parameters: 20% weight
   *
   * Normalized to 0-10 scale
   *
   * @param metrics Complexity metrics
   * @returns Complexity score 0-10
   */
  private calculateComplexityScore(metrics: ComplexityMetrics): number {
    // Normalize each metric to 0-1 scale
    // Using reasonable maximums for typical functions

    const maxLOC = 200; // Very high for typical functions
    const maxCC = 15; // Warnings start at 10
    const maxParams = 10; // Unusual to have more than 10 params

    const locScore = Math.min(1, metrics.loc / maxLOC);
    const ccScore = Math.min(1, metrics.cyclomaticComplexity / maxCC);
    const paramScore = Math.min(1, metrics.parameterCount / maxParams);

    // Weighted combination (LOC 30%, CC 40%, params 20%)
    const combinedScore = locScore * 0.3 + ccScore * 0.4 + paramScore * 0.2;

    // Scale to 0-10
    return Math.round(combinedScore * 10);
  }

  /**
   * Determine risk level based on complexity score
   * @param score Complexity score 0-10
   * @returns Risk level
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score <= 3) return 'low';
    if (score <= 5) return 'medium';
    if (score <= 8) return 'high';
    return 'critical';
  }

  /**
   * Get complexity statistics for a set of elements
   * @param elements Elements to analyze
   * @returns Statistics object
   */
  getStatistics(elements: ElementData[]): {
    minComplexity: number;
    maxComplexity: number;
    avgComplexity: number;
    medianComplexity: number;
    highRiskCount: number;
    criticalRiskCount: number;
  } {
    if (elements.length === 0) {
      return {
        minComplexity: 0,
        maxComplexity: 0,
        avgComplexity: 0,
        medianComplexity: 0,
        highRiskCount: 0,
        criticalRiskCount: 0,
      };
    }

    const scored = this.scoreElements(elements);
    const scores = scored.map((s) => s.metrics.complexityScore);

    scores.sort((a, b) => a - b);

    const min = scores[0];
    const max = scores[scores.length - 1];
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const median =
      scores.length % 2 === 0
        ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
        : scores[Math.floor(scores.length / 2)];

    const highRiskCount = scored.filter(
      (s) => s.riskLevel === 'high'
    ).length;
    const criticalRiskCount = scored.filter(
      (s) => s.riskLevel === 'critical'
    ).length;

    return {
      minComplexity: min,
      maxComplexity: max,
      avgComplexity: Math.round(avg * 10) / 10,
      medianComplexity: Math.round(median * 10) / 10,
      highRiskCount,
      criticalRiskCount,
    };
  }
}

export default ComplexityScorer;

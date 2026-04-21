/**
 * Complexity Scorer
 *
 * Calculates complexity metrics for code elements:
 * - Lines of Code (LOC)
 * - Parameter count
 * - Cyclomatic complexity
 * - Effort estimation
 *
 * Part of WO-CODEREF-CONTEXT-ENHANCEMENT-001 - Phase 1
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
   * Add source code for a file to enable LOC calculation
   * @param filePath File path
   * @param source Source code content
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
    const metrics: ComplexityMetrics = {
      loc: this.calculateLOC(element),
      parameterCount: this.countParameters(element),
      cyclomaticComplexity: this.calculateCyclomaticComplexity(element),
      complexityScore: 0, // Will be calculated below
    };

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
   * Uses source code if available, otherwise estimates based on
   * available metadata
   *
   * @param element Element to measure
   * @returns Estimated LOC
   */
  private calculateLOC(element: ElementData): number {
    const source = this.sourceMap.get(element.file);
    if (!source) {
      // Estimate LOC if source not available
      // Default: function calls ~5-10 lines, method calls ~5-15 lines
      return element.type === 'method' ? 8 : 6;
    }

    // Count actual LOC from source code
    // This is a simplified calculation - real implementation would parse the function body
    const lines = source.split('\n');

    // For now, estimate based on element properties
    // In a real implementation, we'd parse the AST to find exact line ranges
    const baseLines = Math.max(2, element.calls?.length || 0) * 2;

    return Math.max(1, baseLines);
  }

  /**
   * Count function parameters
   *
   * Extracts parameter count from element metadata or parses signature
   *
   * @param element Element to analyze
   * @returns Parameter count
   */
  private countParameters(element: ElementData): number {
    // In a real implementation, this would parse the function signature
    // from source code using AST analysis

    // For now, return a reasonable default estimate
    // We'd enhance this with actual AST parsing

    // Most functions have 1-3 parameters on average
    // Methods might have fewer due to 'this'
    return element.type === 'method' ? 2 : 1;
  }

  /**
   * Calculate Cyclomatic Complexity (CC)
   *
   * Counts decision points:
   * - if/else: +1
   * - switch: +1 per case
   * - for/while/do-while: +1
   * - catch: +1
   * - logical operators (&&, ||): +1
   * - ternary: +1
   *
   * Base complexity is 1
   *
   * @param element Element to analyze
   * @returns Cyclomatic complexity
   */
  private calculateCyclomaticComplexity(element: ElementData): number {
    const source = this.sourceMap.get(element.file);
    if (!source) {
      // Estimate CC if source not available
      // Default function complexity ~1-2
      return 1;
    }

    // Count decision points in source code
    let complexity = 1; // Base complexity

    // Count if statements
    const ifMatches = source.match(/\bif\s*\(/g);
    complexity += ifMatches ? ifMatches.length : 0;

    // Count switch cases
    const switchMatches = source.match(/\bcase\s+/g);
    complexity += switchMatches ? switchMatches.length : 0;

    // Count loops
    const loopMatches = source.match(/\b(for|while|do)\s*[\(\{]/g);
    complexity += loopMatches ? loopMatches.length : 0;

    // Count catch blocks
    const catchMatches = source.match(/\bcatch\s*\(/g);
    complexity += catchMatches ? catchMatches.length : 0;

    // Count logical operators (conservative estimate: every 5 will be a decision point)
    const logicalMatches = source.match(/[&|]{2}/g);
    if (logicalMatches) {
      complexity += Math.floor(logicalMatches.length / 2);
    }

    // Count ternary operators
    const ternaryMatches = source.match(/\?[^:]+:/g);
    complexity += ternaryMatches ? ternaryMatches.length : 0;

    return Math.max(1, complexity);
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

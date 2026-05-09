/**
 * Task Context Generator
 *
 * Generates task-specific context by:
 * - Filtering elements relevant to a task
 * - Calculating impact scope for modifications
 * - Estimating effort for the task
 * - Assessing risk level
 *
 * Part of WO-CODEREF-CONTEXT-ENHANCEMENT-001 - Phase 2
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports TaskContextGenerator
 */

import { ComplexityScorer } from './complexity-scorer.js';
import type {
  TaskContext,
  TaskSpecificContext,
  ContextFilterCriteria,
  ImpactScope,
  ElementData,
  ElementComplexity,
} from './types.js';

/**
 * Task Context Generator
 *
 * Provides methods to:
 * - Filter elements by relevance to task
 * - Calculate impact scope (dependents/dependencies)
 * - Generate comprehensive task context
 */
export class TaskContextGenerator {
  private scorer: ComplexityScorer;
  private dependencyMap: Map<string, string[]> = new Map();
  private dependentMap: Map<string, string[]> = new Map();

  constructor(scorer?: ComplexityScorer) {
    this.scorer = scorer || new ComplexityScorer();
  }

  /**
   * Add dependency information (call graph)
   * @param caller Function that calls
   * @param callees Functions being called
   */
  addDependencies(caller: string, callees: string[]): void {
    this.dependencyMap.set(caller, callees);
    callees.forEach((callee) => {
      const dependents = this.dependentMap.get(callee) || [];
      if (!dependents.includes(caller)) {
        dependents.push(caller);
      }
      this.dependentMap.set(callee, dependents);
    });
  }

  /**
   * Filter elements by task relevance
   * @param elements All elements in codebase
   * @param criteria Filter criteria
   * @returns Filtered elements sorted by relevance
   */
  filterByTaskRelevance(
    elements: ElementData[],
    criteria: ContextFilterCriteria
  ): ElementData[] {
    return elements
      .filter((el) => {
        // Check keyword matches
        const keywordMatch = criteria.keywords.some(
          (kw) =>
            el.name.toLowerCase().includes(kw.toLowerCase()) ||
            el.file.toLowerCase().includes(kw.toLowerCase())
        );

        if (!keywordMatch) return false;

        // Check specific function names if provided
        if (criteria.functionNames && !criteria.functionNames.includes(el.name)) {
          return false;
        }

        // Check file patterns if provided
        if (criteria.filePatterns) {
          const hasMatch = criteria.filePatterns.some((pattern) =>
            this.matchPattern(el.file, pattern)
          );
          if (!hasMatch) return false;
        }

        // Check complexity threshold
        if (criteria.maxComplexity) {
          const scored = this.scorer.scoreElement(el);
          if (scored.metrics.complexityScore > criteria.maxComplexity) {
            return false;
          }
        }

        // Check export requirement
        if (criteria.onlyExported && !el.exported) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by relevance: name match > file match
        const aNameMatch = criteria.keywords.some((kw) =>
          a.name.toLowerCase().includes(kw.toLowerCase())
        );
        const bNameMatch = criteria.keywords.some((kw) =>
          b.name.toLowerCase().includes(kw.toLowerCase())
        );
        return aNameMatch === bNameMatch ? 0 : aNameMatch ? -1 : 1;
      });
  }

  /**
   * Calculate impact scope for modifying an element
   * @param element Element being modified
   * @returns Impact scope information
   */
  calculateImpactScope(element: ElementData): ImpactScope {
    const directDependents = this.dependentMap.get(element.name) || [];
    const directDependencies = this.dependencyMap.get(element.name) || [];

    // Calculate transitive dependents (simplified)
    const indirectDependents = this.calculateTransitiveDependents(
      element.name,
      new Set()
    );

    const scopeSize = 1 + directDependents.length + indirectDependents.size;

    // Assess risk based on scope size
    let riskAssessment: 'low' | 'medium' | 'high' | 'critical';
    if (scopeSize <= 2) {
      riskAssessment = 'low';
    } else if (scopeSize <= 5) {
      riskAssessment = 'medium';
    } else if (scopeSize <= 10) {
      riskAssessment = 'high';
    } else {
      riskAssessment = 'critical';
    }

    return {
      directDependents,
      indirectDependents: Array.from(indirectDependents),
      directDependencies,
      scopeSize,
      riskAssessment,
    };
  }

  /**
   * Generate comprehensive task context
   * @param taskId Task/workorder identifier
   * @param taskDescription Description of what needs to be done
   * @param elements All elements in codebase
   * @param criteria Filter criteria for relevant elements
   * @returns Complete task context
   */
  generateTaskContext(
    taskId: string,
    taskDescription: string,
    elements: ElementData[],
    criteria: ContextFilterCriteria
  ): TaskContext {
    // Filter relevant elements
    const relevant = this.filterByTaskRelevance(elements, criteria);

    // Score elements for complexity (keeping tree-sitter complexity if exists)
    const scored = relevant.map((el) => {
      const scorerResult = this.scorer.scoreElement(el);
      return {
        ...el,
        scorerComplexity: scorerResult, // Store scorer result separately
      };
    });

    // Calculate impact scope
    const withImpact = scored.map((el) => ({
      ...el,
      impactScope: this.calculateImpactScope(el),
    }));

    // Identify entry points (exported, likely modification targets)
    const entryPoints = withImpact
      .filter((el) => el.exported || el.type === 'function')
      .slice(0, 5); // Top 5

    // Identify functions to modify (high relevance, not too complex)
    const functionsToModify = withImpact
      .filter(
        (el) =>
          el.scorerComplexity.metrics.complexityScore <= 7 &&
          el.impactScope.scopeSize <= 5
      )
      .slice(0, 10);

    // Identify potentially impacted functions
    const impactedFunctions = withImpact
      .filter((el) => el.impactScope.directDependents.length > 0)
      .sort(
        (a, b) =>
          b.impactScope.directDependents.length -
          a.impactScope.directDependents.length
      )
      .slice(0, 10);

    // Calculate metrics
    const totalComplexity = withImpact.reduce(
      (sum, el) => sum + el.scorerComplexity.metrics.complexityScore,
      0
    );

    const avgComplexity =
      withImpact.length > 0 ? totalComplexity / withImpact.length : 0;

    // Assess overall risk
    let riskAssessment: 'low' | 'medium' | 'high' | 'critical';
    if (avgComplexity <= 2) {
      riskAssessment = 'low';
    } else if (avgComplexity <= 4) {
      riskAssessment = 'medium';
    } else if (avgComplexity <= 7) {
      riskAssessment = 'high';
    } else {
      riskAssessment = 'critical';
    }

    // Build task-specific context
    const taskContext: TaskSpecificContext[] = withImpact.map((el) => ({
      name: el.name,
      type: el.type,
      file: el.file,
      line: el.line,
      complexity: el.scorerComplexity.metrics,
      impactScope: el.impactScope,
      relevanceScore: 0.8, // Placeholder
      relevanceReason: `Matches task keywords: ${criteria.keywords.join(', ')}`,
      testCoverage: 0, // Will be populated by test analyzer
    }));

    return {
      taskId,
      taskDescription,
      relatedElements: taskContext,
      entryPoints: entryPoints.map((el) => ({
        name: el.name,
        type: el.type,
        file: el.file,
        line: el.line,
        complexity: el.scorerComplexity.metrics,
        impactScope: el.impactScope,
        relevanceScore: 0.9,
        relevanceReason: 'Entry point for this task',
      })),
      functionsToModify: functionsToModify.map((el) => ({
        name: el.name,
        type: el.type,
        file: el.file,
        line: el.line,
        complexity: el.scorerComplexity.metrics,
        impactScope: el.impactScope,
        relevanceScore: 0.85,
        relevanceReason: 'Modify to complete task',
      })),
      impactedFunctions: impactedFunctions.map((el) => ({
        name: el.name,
        type: el.type,
        file: el.file,
        line: el.line,
        complexity: el.scorerComplexity.metrics,
        impactScope: el.impactScope,
        relevanceScore: 0.75,
        relevanceReason: `Will be impacted by changes (${el.impactScope.directDependents.length} dependents)`,
      })),
      totalComplexity: Math.round(totalComplexity * 10) / 10,
      riskAssessment,
    };
  }

  /**
   * Calculate transitive dependents (functions that depend on this one transitively)
   * @param element Element name
   * @param visited Set of already visited elements (for cycle detection)
   * @returns Set of transitive dependents
   */
  private calculateTransitiveDependents(
    element: string,
    visited: Set<string>
  ): Set<string> {
    const directDependents = this.dependentMap.get(element) || [];
    const result = new Set<string>();

    for (const dependent of directDependents) {
      if (!visited.has(dependent)) {
        result.add(dependent);
        visited.add(dependent);

        // Recursively add transitive dependents
        const transitive = this.calculateTransitiveDependents(dependent, visited);
        transitive.forEach((t) => result.add(t));
      }
    }

    return result;
  }

  /**
   * Simple pattern matching for file paths
   * @param path File path
   * @param pattern Pattern (e.g., "**\/*.ts")
   * @returns Whether path matches pattern
   */
  private matchPattern(path: string, pattern: string): boolean {
    // Simplified pattern matching - convert glob to regex
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    return new RegExp(`^${regex}$`).test(path);
  }
}

export default TaskContextGenerator;

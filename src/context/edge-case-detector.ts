/**
 * Edge Case Detector
 *
 * Detects potential issues in code:
 * - Race conditions (async/await conflicts)
 * - State management issues
 * - Concurrency problems
 * - Resource leaks
 *
 * Part of WO-CODEREF-CONTEXT-ENHANCEMENT-001 - Phase 3
 */

import type { EdgeCaseDetection, EdgeCaseIssue, ElementData } from './types.js';

/**
 * Edge Case Detector for identifying potential issues
 */
export class EdgeCaseDetector {
  private sourceMap: Map<string, string> = new Map();

  /**
   * Add source code for analysis
   * @param filePath File path
   * @param source Source code
   */
  addSource(filePath: string, source: string): void {
    this.sourceMap.set(filePath, source);
  }

  /**
   * Detect edge cases and potential issues in elements
   * @param elements Elements to analyze
   * @returns Detection results with issues
   */
  detectEdgeCases(elements: ElementData[]): EdgeCaseDetection {
    const issues: EdgeCaseIssue[] = [];

    for (const element of elements) {
      const elementIssues = this.detectElementIssues(element);
      issues.push(...elementIssues);
    }

    // Categorize by severity and type
    const bySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const byType: Record<string, number> = {};

    for (const issue of issues) {
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
      byType[issue.type] = (byType[issue.type] || 0) + 1;
    }

    const criticalIssues = issues.filter((i) => i.severity === 'critical');

    return {
      totalIssues: issues.length,
      byType,
      bySeverity,
      issues,
      criticalIssues,
    };
  }

  /**
   * Detect issues in a single element
   * @param element Element to analyze
   * @returns List of detected issues
   */
  private detectElementIssues(element: ElementData): EdgeCaseIssue[] {
    const issues: EdgeCaseIssue[] = [];
    const source = this.sourceMap.get(element.file);

    if (!source) {
      return issues;
    }

    // Check for race conditions
    const raceConditionIssues = this.detectRaceConditions(element, source);
    issues.push(...raceConditionIssues);

    // Check for state management issues
    const stateIssues = this.detectStateManagementIssues(element, source);
    issues.push(...stateIssues);

    // Check for concurrency issues
    const concurrencyIssues = this.detectConcurrencyIssues(element, source);
    issues.push(...concurrencyIssues);

    // Check for resource issues
    const resourceIssues = this.detectResourceIssues(element, source);
    issues.push(...resourceIssues);

    return issues;
  }

  /**
   * Detect race conditions (Promise race, concurrent mutations)
   */
  private detectRaceConditions(element: ElementData, source: string): EdgeCaseIssue[] {
    const issues: EdgeCaseIssue[] = [];

    // Check for Promise.race without error handling
    if (/Promise\.race\s*\(/.test(source) && !/\.catch\s*\(/.test(source)) {
      issues.push({
        type: 'race-condition',
        severity: 'high',
        element: element.name,
        file: element.file,
        line: element.line,
        description: 'Promise.race without error handling could lose failures',
        mitigation: 'Add .catch() handler to Promise.race',
        pattern: 'Promise.race',
        confidence: 0.85,
      });
    }

    // Check for concurrent mutations (multiple async operations modifying shared state)
    if (/async\s+\w+.*{/.test(source) && /this\.\w+\s*=/.test(source)) {
      const asyncCount = (source.match(/async\s+\w+/g) || []).length;
      if (asyncCount > 1) {
        issues.push({
          type: 'race-condition',
          severity: 'medium',
          element: element.name,
          file: element.file,
          line: element.line,
          description: 'Multiple async operations may cause race condition',
          mitigation: 'Use locks, semaphores, or ensure sequential execution',
          pattern: 'concurrent async',
          confidence: 0.7,
        });
      }
    }

    return issues;
  }

  /**
   * Detect state management issues
   */
  private detectStateManagementIssues(element: ElementData, source: string): EdgeCaseIssue[] {
    const issues: EdgeCaseIssue[] = [];

    // Check for missing null checks
    const hasUndefinedAccess = /\w+\.\w+(?!\s*\?)/g.test(source);
    const hasNullChecks = /if\s*\(.*null|if\s*\(!|\?\./.test(source);

    if (hasUndefinedAccess && !hasNullChecks) {
      issues.push({
        type: 'state-issue',
        severity: 'high',
        element: element.name,
        file: element.file,
        line: element.line,
        description: 'Potential null pointer exception - missing null checks',
        mitigation: 'Add null/undefined checks or use optional chaining',
        pattern: 'null-pointer',
        confidence: 0.75,
      });
    }

    // Check for mutable state issues
    if (/let\s+\w+\s*=\s*\{|const\s+\w+\s*=\s*\[/.test(source)) {
      const mutations = (source.match(/\.\w+\s*=/g) || []).length;
      if (mutations > 3) {
        issues.push({
          type: 'state-issue',
          severity: 'medium',
          element: element.name,
          file: element.file,
          line: element.line,
          description: 'Excessive mutable state modifications',
          mitigation: 'Consider using immutable data structures',
          pattern: 'mutable-state',
          confidence: 0.8,
        });
      }
    }

    return issues;
  }

  /**
   * Detect concurrency issues
   */
  private detectConcurrencyIssues(element: ElementData, source: string): EdgeCaseIssue[] {
    const issues: EdgeCaseIssue[] = [];

    // Check for missing await in async functions
    if (/async\s+\w+/.test(source) && /Promise</.test(source)) {
      const hasAwait = /await\s+/.test(source);
      const hasNoAwait = /return\s+\w+\(/.test(source);

      if (hasNoAwait && !hasAwait) {
        issues.push({
          type: 'concurrency',
          severity: 'high',
          element: element.name,
          file: element.file,
          line: element.line,
          description: 'Async function returns Promise without awaiting',
          mitigation: 'Add await or return await to ensure proper sequencing',
          pattern: 'missing-await',
          confidence: 0.9,
        });
      }
    }

    // Check for setTimeout/setInterval without cleanup
    if (/(setTimeout|setInterval)\s*\(/.test(source)) {
      const hasCleanup = /clearTimeout|clearInterval/.test(source);
      if (!hasCleanup) {
        issues.push({
          type: 'resource',
          severity: 'medium',
          element: element.name,
          file: element.file,
          line: element.line,
          description: 'Timeout/Interval without cleanup - potential memory leak',
          mitigation: 'Store ID and call clearTimeout/clearInterval in cleanup',
          pattern: 'timeout-leak',
          confidence: 0.85,
        });
      }
    }

    return issues;
  }

  /**
   * Detect resource management issues
   */
  private detectResourceIssues(element: ElementData, source: string): EdgeCaseIssue[] {
    const issues: EdgeCaseIssue[] = [];

    // Check for unclosed resources
    if (/(fs\.open|createConnection|createServer)\s*\(/.test(source)) {
      const hasClose = /\.close\s*\(|\.destroy\s*\(/.test(source);
      if (!hasClose) {
        issues.push({
          type: 'resource',
          severity: 'high',
          element: element.name,
          file: element.file,
          line: element.line,
          description: 'Resource opened but not closed - potential leak',
          mitigation: 'Ensure .close() or .destroy() is called in finally block',
          pattern: 'resource-leak',
          confidence: 0.9,
        });
      }
    }

    // Check for event listener leaks
    if (/\.on\s*\(|\.addEventListener\s*\(/.test(source)) {
      const hasRemove = /\.off\s*\(|\.removeEventListener\s*\(/.test(source);
      if (!hasRemove) {
        issues.push({
          type: 'resource',
          severity: 'medium',
          element: element.name,
          file: element.file,
          line: element.line,
          description: 'Event listener added but not removed',
          mitigation: 'Call .off() or .removeEventListener() in cleanup',
          pattern: 'listener-leak',
          confidence: 0.8,
        });
      }
    }

    return issues;
  }
}

export default EdgeCaseDetector;

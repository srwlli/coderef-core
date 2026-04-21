/**
 * Test Pattern Analyzer
 *
 * Analyzes test files and patterns:
 * - Find test files and coverage
 * - Extract test patterns (@Mock, @Test, assertions)
 * - Calculate coverage metrics
 *
 * Part of WO-CODEREF-CONTEXT-ENHANCEMENT-001 - Phase 4
 */

import type {
  TestPatternAnalysis,
  TestPattern,
  TestFileInfo,
  ElementData,
} from './types.js';

/**
 * Test Pattern Analyzer
 */
export class TestPatternAnalyzer {
  private sourceMap: Map<string, string> = new Map();
  private testFilePattern = /\.test\.(ts|js|tsx|jsx)$|\.spec\.(ts|js|tsx|jsx)$/;

  /**
   * Add source code
   * @param filePath File path
   * @param source Source code
   */
  addSource(filePath: string, source: string): void {
    this.sourceMap.set(filePath, source);
  }

  /**
   * Analyze test patterns
   * @param elements Code elements
   * @returns Test pattern analysis
   */
  analyzeTestPatterns(elements: ElementData[]): TestPatternAnalysis {
    const testFiles: TestFileInfo[] = [];
    const patterns = new Map<string, TestPattern>();
    let totalPatterns = 0;

    // Find test files
    for (const [filePath, source] of this.sourceMap.entries()) {
      if (this.isTestFile(filePath)) {
        const filePatterns = this.extractPatternsFromFile(source);
        testFiles.push({
          file: filePath,
          testedFunctions: this.extractTestedFunctions(source),
          testCaseCount: this.countTestCases(source),
          patterns: filePatterns,
          coverage: this.estimateCoverage(filePatterns),
        });

        filePatterns.forEach((p) => {
          if (!patterns.has(p.name)) {
            patterns.set(p.name, p);
            totalPatterns++;
          }
        });
      }
    }

    // Calculate overall coverage
    const totalCoverage =
      testFiles.length > 0
        ? testFiles.reduce((sum, f) => sum + f.coverage, 0) / testFiles.length
        : 0;

    // Calculate coverage by type
    const coverageByType: Record<string, number> = {
      function: 0,
      method: 0,
      class: 0,
    };

    elements.forEach((el) => {
      const hasTest = testFiles.some((f) =>
        f.testedFunctions.includes(el.name)
      );
      if (hasTest && coverageByType[el.type] !== undefined) {
        coverageByType[el.type] += 1;
      }
    });

    return {
      totalTestFiles: testFiles.length,
      totalPatterns,
      patterns: Array.from(patterns.values()),
      testFiles,
      coverageByType,
      averageCoverage: Math.round(totalCoverage * 100) / 100,
    };
  }

  /**
   * Check if file is a test file
   */
  private isTestFile(filePath: string): boolean {
    return this.testFilePattern.test(filePath);
  }

  /**
   * Extract test patterns from source
   */
  private extractPatternsFromFile(source: string): TestPattern[] {
    const patterns: TestPattern[] = [];

    // Mock patterns
    patterns.push(...this.detectPattern(/jest\.mock|@Mock|sinon\.stub/, 'mock', 'Mock setup', source));

    // Test decorators
    patterns.push(...this.detectPattern(/@Test|it\(|describe\(|test\(/, 'setup', 'Test definition', source));

    // Assertions
    patterns.push(...this.detectPattern(/expect\(|assert\(|should\.|\.toBe|\.toEqual/, 'assertion', 'Assertion', source));

    // Spies
    patterns.push(...this.detectPattern(/jest\.spyOn|sinon\.spy/, 'spy', 'Spy setup', source));

    return patterns;
  }

  /**
   * Detect patterns in source
   */
  private detectPattern(
    regex: RegExp,
    type: string,
    description: string,
    source: string
  ): TestPattern[] {
    const matches = source.match(regex);
    if (!matches) return [];

    return [
      {
        name: description.toLowerCase().replace(/\s+/g, '-'),
        type: type as any,
        description,
        exampleCode: `// Example: ${matches[0]}`,
        frequency: matches.length,
        files: [],
        confidence: 0.9,
      },
    ];
  }

  /**
   * Extract tested function names
   */
  private extractTestedFunctions(source: string): string[] {
    const functions = new Set<string>();

    // Extract from test descriptions and imports
    const describeMatches = source.match(/describe\s*\(\s*['"`](.+?)['"`]/g);
    if (describeMatches) {
      describeMatches.forEach((m) => {
        const name = m.match(/['"`](.+?)['"`]/)?.[1];
        if (name) functions.add(name);
      });
    }

    return Array.from(functions);
  }

  /**
   * Count test cases
   */
  private countTestCases(source: string): number {
    const itTests = (source.match(/it\s*\(/g) || []).length;
    const testFunctions = (source.match(/test\s*\(/g) || []).length;
    return itTests + testFunctions;
  }

  /**
   * Estimate coverage
   */
  private estimateCoverage(patterns: TestPattern[]): number {
    // Simple estimate: more patterns = higher coverage
    return Math.min(100, (patterns.length / 5) * 100);
  }
}

export default TestPatternAnalyzer;

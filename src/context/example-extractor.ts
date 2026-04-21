/**
 * Example Extractor
 *
 * Extracts code examples and groups by pattern:
 * - Find canonical examples in codebase
 * - Group by pattern type
 * - Generate pattern documentation
 *
 * Part of WO-CODEREF-CONTEXT-ENHANCEMENT-001 - Phase 5
 */

import type { CodeExamplesResult, CodeExample, PatternGroup } from './types.js';

/**
 * Example Extractor - finds and categorizes code examples
 */
export class ExampleExtractor {
  private sourceMap: Map<string, string> = new Map();

  /**
   * Add source code
   */
  addSource(filePath: string, source: string): void {
    this.sourceMap.set(filePath, source);
  }

  /**
   * Extract code examples and group by pattern
   */
  extractExamples(): CodeExamplesResult {
    const patternGroups: PatternGroup[] = [];
    const examplesByCategory: Record<string, CodeExample[]> = {};

    // Define pattern categories to search for
    const patternCategories = [
      {
        name: 'error-handling',
        pattern: /try\s*{[\s\S]{1,500}?}\s*catch/,
        description: 'Error handling with try-catch',
      },
      {
        name: 'async-await',
        pattern: /async\s+\w+\s*\([\s\S]{1,300}?await/,
        description: 'Async/await patterns',
      },
      {
        name: 'promise',
        pattern: /new\s+Promise\s*\([\s\S]{1,300}?\)/,
        description: 'Promise creation and handling',
      },
      {
        name: 'validation',
        pattern: /if\s*\(![\s\S]{1,200}?throw/,
        description: 'Input validation patterns',
      },
      {
        name: 'data-transformation',
        pattern: /\.map\s*\(|\.filter\s*\(|\.reduce\s*\(/,
        description: 'Data transformation with array methods',
      },
    ];

    // Extract examples for each pattern
    patternCategories.forEach((category) => {
      const examples: CodeExample[] = [];
      const files = Array.from(this.sourceMap.entries());

      for (const [filePath, source] of files) {
        const matches = source.matchAll(category.pattern);
        let matchIndex = 0;

        for (const match of matches) {
          if (matchIndex >= 2) break; // Limit to 2 examples per category

          const startLine = source.substring(0, match.index || 0).split('\n').length;
          const codeLines = match[0].split('\n');
          const endLine = startLine + codeLines.length - 1;

          examples.push({
            name: `${category.name}-example-${matchIndex + 1}`,
            patternType: category.name,
            code: match[0],
            file: filePath,
            lineStart: startLine,
            lineEnd: endLine,
            whyGoodExample: `Demonstrates ${category.description}`,
            relatedPatterns: [category.name],
          });

          matchIndex++;
        }
      }

      if (examples.length > 0) {
        examplesByCategory[category.name] = examples;

        patternGroups.push({
          patternName: category.name,
          description: category.description,
          category: category.name,
          examples,
          antiPatterns: this.getAntiPatterns(category.name),
          bestPractices: this.getBestPractices(category.name),
        });
      }
    });

    return {
      totalPatterns: patternGroups.length,
      patternGroups,
      examplesByCategory,
    };
  }

  /**
   * Get anti-patterns to avoid
   */
  private getAntiPatterns(patternType: string): string[] {
    const antiPatterns: Record<string, string[]> = {
      'error-handling': [
        'Catching errors without re-throwing',
        'Silent failures',
        'Generic catch-all without specific handling',
      ],
      'async-await': [
        'Forgetting await keyword',
        'Not handling promise rejections',
        'Sequential awaits when parallel is possible',
      ],
      promise: ['Unhandled promise rejections', 'Missing .catch()'],
      validation: [
        'Validating after use',
        'Missing edge case checks',
        'Trusting external input',
      ],
      'data-transformation': [
        'Mutating original data',
        'Not handling empty collections',
        'Nested loops instead of map/filter',
      ],
    };

    return antiPatterns[patternType] || [];
  }

  /**
   * Get best practices
   */
  private getBestPractices(patternType: string): string[] {
    const practices: Record<string, string[]> = {
      'error-handling': [
        'Catch specific error types',
        'Log errors with context',
        'Provide meaningful error messages',
        'Clean up resources in finally',
      ],
      'async-await': [
        'Always await async functions',
        'Use try-catch for error handling',
        'Avoid unnecessary awaits',
        'Parallel execution when possible',
      ],
      promise: [
        'Always return promises',
        'Chain .then() or use await',
        'Handle rejections with .catch()',
      ],
      validation: [
        'Validate early',
        'Check for null/undefined',
        'Validate type and value',
        'Provide clear error messages',
      ],
      'data-transformation': [
        'Use immutable operations',
        'Chain methods for readability',
        'Handle empty collections',
        'Use appropriate methods for intent',
      ],
    };

    return practices[patternType] || [];
  }
}

export default ExampleExtractor;

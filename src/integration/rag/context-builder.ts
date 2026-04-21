/**
 * Context Builder
 * P3-T4: Formats retrieved code chunks into LLM-ready markdown context
 *
 * Transforms search results into well-structured markdown that includes:
 * - CodeRef tags for navigation
 * - Code snippets with syntax highlighting
 * - Relevance scores
 * - Dependency information
 * - Quality metrics
 */

import type { SearchResult } from './semantic-search.js';
import type { ReRankedResult } from './graph-reranker.js';

/**
 * Options for context building
 */
export interface ContextBuilderOptions {
  /** Maximum number of results to include */
  maxResults?: number;

  /** Include source code in context */
  includeCode?: boolean;

  /** Include dependencies information */
  includeDependencies?: boolean;

  /** Include quality metrics */
  includeMetrics?: boolean;

  /** Include relevance scores */
  includeScores?: boolean;

  /** Format style */
  style?: 'detailed' | 'compact' | 'minimal';

  /** Include table of contents */
  includeToc?: boolean;
}

/**
 * Built context ready for LLM
 */
export interface BuiltContext {
  /** Formatted markdown context */
  markdown: string;

  /** Number of results included */
  resultCount: number;

  /** Estimated token count */
  estimatedTokens: number;

  /** Results that were included */
  includedResults: SearchResult[];
}

/**
 * Builds LLM context from search results
 */
export class ContextBuilder {
  /**
   * Build context from search results
   */
  buildContext(
    results: SearchResult[] | ReRankedResult[],
    options?: ContextBuilderOptions
  ): BuiltContext {
    const opts: Required<ContextBuilderOptions> = {
      maxResults: options?.maxResults ?? 10,
      includeCode: options?.includeCode ?? true,
      includeDependencies: options?.includeDependencies ?? true,
      includeMetrics: options?.includeMetrics ?? true,
      includeScores: options?.includeScores ?? true,
      style: options?.style ?? 'detailed',
      includeToc: options?.includeToc ?? true
    };

    // Limit results
    const limitedResults = results.slice(0, opts.maxResults);

    // Build markdown sections
    const sections: string[] = [];

    // Header
    sections.push('# Code Search Results\n');

    // Summary
    sections.push(this.buildSummary(limitedResults, results.length));

    // Table of contents
    if (opts.includeToc && limitedResults.length > 3) {
      sections.push(this.buildTableOfContents(limitedResults));
    }

    // Individual results
    for (let i = 0; i < limitedResults.length; i++) {
      const result = limitedResults[i];
      sections.push(this.buildResultSection(result, i + 1, opts));
    }

    // Footer
    if (limitedResults.length < results.length) {
      sections.push(
        `\n---\n\n*Showing ${limitedResults.length} of ${results.length} results*\n`
      );
    }

    const markdown = sections.join('\n');
    const estimatedTokens = this.estimateTokens(markdown);

    return {
      markdown,
      resultCount: limitedResults.length,
      estimatedTokens,
      includedResults: limitedResults
    };
  }

  /**
   * Build summary section
   */
  private buildSummary(
    results: SearchResult[],
    totalResults: number
  ): string {
    const uniqueFiles = new Set(results.map((r) => r.metadata.file)).size;
    const uniqueTypes = new Set(results.map((r) => r.metadata.type)).size;
    const languages = new Set(results.map((r) => r.metadata.language));

    return [
      `Found ${totalResults} relevant code elements:`,
      `- ${results.length} results shown`,
      `- ${uniqueFiles} files`,
      `- ${uniqueTypes} element types`,
      `- Languages: ${Array.from(languages).join(', ')}`,
      ''
    ].join('\n');
  }

  /**
   * Build table of contents
   */
  private buildTableOfContents(results: SearchResult[]): string {
    const lines: string[] = [
      '## Table of Contents\n'
    ];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const anchor = `result-${i + 1}`;
      lines.push(
        `${i + 1}. [${result.metadata.type} \`${result.metadata.name}\`](#${anchor}) - ${result.metadata.file}`
      );
    }

    lines.push('');
    return lines.join('\n');
  }

  /**
   * Build section for a single result
   */
  private buildResultSection(
    result: SearchResult | ReRankedResult,
    index: number,
    options: Required<ContextBuilderOptions>
  ): string {
    const sections: string[] = [];

    // Header with anchor
    sections.push(`## Result ${index}: ${result.metadata.name} {#result-${index}}\n`);

    // CodeRef tag (always included)
    sections.push(`**CodeRef**: \`${result.coderef}\`\n`);

    // Metadata
    const metadata: string[] = [];
    metadata.push(`**Type**: ${result.metadata.type}`);
    metadata.push(`**File**: ${result.metadata.file}:${result.metadata.line}`);
    metadata.push(`**Language**: ${result.metadata.language}`);

    if (result.metadata.exported !== undefined) {
      metadata.push(`**Exported**: ${result.metadata.exported ? 'Yes' : 'No'}`);
    }

    sections.push(metadata.join(' | '));
    sections.push('');

    // Relevance score
    if (options.includeScores) {
      const scorePercent = (result.score * 100).toFixed(1);
      sections.push(`**Relevance Score**: ${scorePercent}%\n`);

      // Re-ranking explanation (if available)
      if ('explanation' in result) {
        const reranked = result as ReRankedResult;
        const boost = ((reranked.boostFactor - 1) * 100).toFixed(1);
        if (reranked.boostFactor > 1.1) {
          sections.push(`*Boosted by ${boost}% using graph analysis*\n`);
        }
      }
    }

    // Documentation
    if (result.metadata.documentation) {
      sections.push('### Documentation\n');
      sections.push(result.metadata.documentation);
      sections.push('');
    }

    // Source code (if available and requested)
    if (options.includeCode && result.snippet) {
      sections.push('### Implementation\n');
      sections.push('```' + result.metadata.language);
      sections.push(result.snippet);
      sections.push('```\n');
    }

    // Dependencies
    if (options.includeDependencies) {
      const depCount = result.metadata.dependencyCount ?? 0;
      const depText = result.metadata.dependentCount ?? 0;

      if (depCount > 0 || depText > 0) {
        sections.push('### Dependencies\n');

        if (depCount > 0) {
          sections.push(`- **Uses** ${depCount} other elements`);
        }
        if (depText > 0) {
          sections.push(`- **Used by** ${depText} other elements`);
        }
        sections.push('');
      }
    }

    // Quality metrics
    if (options.includeMetrics) {
      const metrics: string[] = [];

      if (result.metadata.coverage !== undefined) {
        metrics.push(`Test Coverage: ${result.metadata.coverage}%`);
      }
      if (result.metadata.complexity !== undefined) {
        metrics.push(`Complexity: ${result.metadata.complexity}`);
      }

      if (metrics.length > 0) {
        sections.push('### Quality Metrics\n');
        sections.push(metrics.map((m) => `- ${m}`).join('\n'));
        sections.push('');
      }
    }

    sections.push('---\n');

    return sections.join('\n');
  }

  /**
   * Build compact context (fewer details)
   */
  buildCompactContext(results: SearchResult[]): string {
    const lines: string[] = [
      '# Relevant Code\n'
    ];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      lines.push(
        `${i + 1}. \`${result.coderef}\` - ${result.metadata.type} in ${result.metadata.file}`
      );

      if (result.metadata.documentation) {
        lines.push(`   ${result.metadata.documentation.split('\n')[0]}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Build minimal context (just CodeRefs)
   */
  buildMinimalContext(results: SearchResult[]): string {
    return [
      '# Relevant Code References\n',
      ...results.map((r, i) => `${i + 1}. ${r.coderef}`),
      ''
    ].join('\n');
  }

  /**
   * Build context with custom template
   */
  buildWithTemplate(
    results: SearchResult[],
    template: (result: SearchResult, index: number) => string
  ): string {
    const sections = results.map((result, index) =>
      template(result, index + 1)
    );

    return sections.join('\n\n---\n\n');
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate context to fit token limit
   */
  truncateToTokenLimit(
    context: BuiltContext,
    maxTokens: number
  ): BuiltContext {
    if (context.estimatedTokens <= maxTokens) {
      return context;
    }

    // Binary search for the right number of results
    let low = 1;
    let high = context.includedResults.length;
    let bestContext = context;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const truncated = this.buildContext(context.includedResults, {
        maxResults: mid
      });

      if (truncated.estimatedTokens <= maxTokens) {
        bestContext = truncated;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return bestContext;
  }

  /**
   * Build context summary (for logging/debugging)
   */
  buildContextSummary(context: BuiltContext): string {
    return [
      `Context Summary:`,
      `- ${context.resultCount} results`,
      `- ${context.estimatedTokens} tokens (estimated)`,
      `- Types: ${this.getUniqueCounts(context.includedResults, 'type')}`,
      `- Languages: ${this.getUniqueCounts(context.includedResults, 'language')}`,
      `- Files: ${this.getUniqueCounts(context.includedResults, 'file')}`
    ].join('\n');
  }

  /**
   * Get counts of unique values for a metadata field
   */
  private getUniqueCounts(
    results: SearchResult[],
    field: 'type' | 'language' | 'file'
  ): string {
    const counts = new Map<string, number>();

    for (const result of results) {
      const value = result.metadata[field];
      counts.set(value, (counts.get(value) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([key, count]) => `${key}(${count})`)
      .join(', ');
  }

  /**
   * Validate context quality
   *
   * Returns warnings about the built context
   */
  validateContext(context: BuiltContext): string[] {
    const warnings: string[] = [];

    // Check if context is too large
    if (context.estimatedTokens > 8000) {
      warnings.push(
        `Context is very large (${context.estimatedTokens} tokens) - may exceed model limits`
      );
    }

    // Check if context is too small
    if (context.resultCount === 0) {
      warnings.push('Context is empty - no results to show');
    }

    // Check diversity
    const uniqueFiles = new Set(
      context.includedResults.map((r) => r.metadata.file)
    ).size;

    if (uniqueFiles === 1 && context.resultCount > 5) {
      warnings.push('All results from same file - may lack diversity');
    }

    // Check relevance
    const lowScoreCount = context.includedResults.filter(
      (r) => r.score < 0.5
    ).length;

    if (lowScoreCount > context.resultCount / 2) {
      warnings.push('Many results have low relevance scores');
    }

    return warnings;
  }
}

/**
 * Embedding Text Generator
 * P2-T3: Generates optimized text representations for embedding models
 *
 * Converts CodeChunks into structured text that includes all relevant
 * context for semantic search while optimizing for embedding model performance.
 */

import type { CodeChunk } from './code-chunk.js';

/**
 * Options for text generation
 */
export interface TextGenerationOptions {
  /**
   * Include source code in the text
   * Default: true
   */
  includeSourceCode?: boolean;

  /**
   * Include dependencies in the text
   * Default: true
   */
  includeDependencies?: boolean;

  /**
   * Include documentation in the text
   * Default: true
   */
  includeDocumentation?: boolean;

  /**
   * Maximum length of generated text (characters)
   * Default: 4000 (fits comfortably in most embedding models)
   */
  maxLength?: number;

  /**
   * Format style: 'natural' or 'structured'
   * - natural: Reads like natural language
   * - structured: More machine-readable with clear sections
   * Default: 'natural'
   */
  style?: 'natural' | 'structured';
}

/**
 * Generates embedding-optimized text from CodeChunks
 */
export class EmbeddingTextGenerator {
  /**
   * Generate embedding text for a single chunk
   */
  generate(chunk: CodeChunk, options?: TextGenerationOptions): string {
    const opts: Required<TextGenerationOptions> = {
      includeSourceCode: options?.includeSourceCode ?? true,
      includeDependencies: options?.includeDependencies ?? true,
      includeDocumentation: options?.includeDocumentation ?? true,
      maxLength: options?.maxLength ?? 4000,
      style: options?.style ?? 'natural'
    };

    const parts: string[] = [];

    // 1. CodeRef tag (always first for better retrieval)
    parts.push(`CodeRef: ${chunk.coderef}`);

    // 2. Element description
    if (opts.style === 'natural') {
      parts.push(this.generateNaturalDescription(chunk));
    } else {
      parts.push(this.generateStructuredDescription(chunk));
    }

    // 3. Documentation (high value for embeddings)
    if (opts.includeDocumentation && chunk.documentation) {
      parts.push('');
      parts.push('Documentation:');
      parts.push(chunk.documentation);
    }

    // 4. Source code (provides implementation context)
    if (opts.includeSourceCode && chunk.sourceCode) {
      parts.push('');
      parts.push('Implementation:');
      parts.push(chunk.sourceCode);
    }

    // 5. Dependencies (provides relationship context)
    if (opts.includeDependencies) {
      if (chunk.dependencies.length > 0) {
        parts.push('');
        parts.push(`Dependencies (${chunk.dependencyCount}):`);
        parts.push(chunk.dependencies.slice(0, 10).join(', '));
      }

      if (chunk.dependents.length > 0) {
        parts.push('');
        parts.push(`Used by (${chunk.dependentCount}):`);
        parts.push(chunk.dependents.slice(0, 10).join(', '));
      }
    }

    // 6. Metadata (provides quality signals)
    const metadataParts: string[] = [];
    if (chunk.complexity !== undefined) {
      metadataParts.push(`complexity: ${chunk.complexity}`);
    }
    if (chunk.coverage !== undefined) {
      metadataParts.push(`coverage: ${chunk.coverage}%`);
    }
    if (chunk.exported !== undefined) {
      metadataParts.push(`exported: ${chunk.exported}`);
    }

    if (metadataParts.length > 0) {
      parts.push('');
      parts.push('Metadata: ' + metadataParts.join(', '));
    }

    // Join and truncate if necessary
    let text = parts.join('\n');

    if (text.length > opts.maxLength) {
      text = text.substring(0, opts.maxLength) + '\n... (truncated)';
    }

    return text;
  }

  /**
   * Generate natural language description
   */
  private generateNaturalDescription(chunk: CodeChunk): string {
    const parts: string[] = [];

    // Type and name
    const typeDesc = this.getTypeDescription(chunk.type);
    parts.push(`This is a ${typeDesc} named "${chunk.name}"`);

    // Location
    parts.push(`located in ${chunk.file} at line ${chunk.line}`);

    // Language
    parts.push(`written in ${chunk.language}`);

    // Export status
    if (chunk.exported) {
      parts.push('and is exported');
    }

    return parts.join(' ') + '.';
  }

  /**
   * Generate structured description
   */
  private generateStructuredDescription(chunk: CodeChunk): string {
    const lines: string[] = [];

    lines.push(`Type: ${chunk.type}`);
    lines.push(`Name: ${chunk.name}`);
    lines.push(`File: ${chunk.file}`);
    lines.push(`Line: ${chunk.line}`);
    lines.push(`Language: ${chunk.language}`);

    if (chunk.exported !== undefined) {
      lines.push(`Exported: ${chunk.exported}`);
    }

    return lines.join('\n');
  }

  /**
   * Get human-readable type description
   */
  private getTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'function': 'function',
      'Fn': 'function',
      'class': 'class',
      'Cl': 'class',
      'method': 'method',
      'M': 'method',
      'interface': 'interface',
      'I': 'interface',
      'type': 'type definition',
      'T': 'type definition',
      'component': 'component',
      'C': 'component',
      'hook': 'React hook',
      'H': 'React hook',
      'api': 'API endpoint',
      'A': 'API endpoint',
      'test': 'test',
      'config': 'configuration',
      'Cfg': 'configuration'
    };

    return descriptions[type] || type;
  }

  /**
   * Generate batch of texts for multiple chunks
   */
  generateBatch(
    chunks: CodeChunk[],
    options?: TextGenerationOptions
  ): string[] {
    return chunks.map(chunk => this.generate(chunk, options));
  }

  /**
   * Generate query-optimized text (for semantic search queries)
   *
   * This is similar to chunk text but formatted for queries:
   * - Shorter
   * - More focused on intent
   * - Less structured
   */
  generateQueryText(query: string, context?: {
    language?: string;
    type?: string;
    file?: string;
  }): string {
    const parts: string[] = [query];

    if (context?.type) {
      parts.push(`looking for ${context.type}`);
    }

    if (context?.language) {
      parts.push(`in ${context.language}`);
    }

    if (context?.file) {
      parts.push(`from ${context.file}`);
    }

    return parts.join(' ');
  }

  /**
   * Calculate approximate token count
   * (rough estimate: 1 token ≈ 4 characters)
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate statistics about generated texts
   */
  calculateTextStatistics(texts: string[]): {
    totalTexts: number;
    avgLength: number;
    avgTokens: number;
    maxLength: number;
    minLength: number;
  } {
    if (texts.length === 0) {
      return {
        totalTexts: 0,
        avgLength: 0,
        avgTokens: 0,
        maxLength: 0,
        minLength: 0
      };
    }

    const lengths = texts.map(t => t.length);
    const totalLength = lengths.reduce((sum, len) => sum + len, 0);
    const avgLength = totalLength / texts.length;

    return {
      totalTexts: texts.length,
      avgLength,
      avgTokens: this.estimateTokens(texts.join('')),
      maxLength: Math.max(...lengths),
      minLength: Math.min(...lengths)
    };
  }

  /**
   * Validate generated text quality
   *
   * Returns issues found in the text
   */
  validateText(text: string): string[] {
    const issues: string[] = [];

    // Check minimum length
    if (text.length < 50) {
      issues.push('Text is too short (< 50 characters)');
    }

    // Check for CodeRef presence
    if (!text.includes('CodeRef:')) {
      issues.push('Missing CodeRef tag');
    }

    // Check for empty lines indicating missing sections
    if (text.split('\n').filter(line => line.trim() === '').length > 5) {
      issues.push('Too many empty sections');
    }

    // Check token count
    const tokens = this.estimateTokens(text);
    if (tokens > 1500) {
      issues.push(`Text may be too long for embedding (${tokens} tokens estimated)`);
    }

    return issues;
  }

  /**
   * Generate comparison text for two chunks
   * Useful for finding similar/related code elements
   */
  generateComparisonText(chunk1: CodeChunk, chunk2: CodeChunk): string {
    const similarities: string[] = [];
    const differences: string[] = [];

    // Compare types
    if (chunk1.type === chunk2.type) {
      similarities.push(`Both are ${chunk1.type}s`);
    } else {
      differences.push(`Different types: ${chunk1.type} vs ${chunk2.type}`);
    }

    // Compare files
    if (chunk1.file === chunk2.file) {
      similarities.push('Same file');
    } else {
      differences.push('Different files');
    }

    // Compare languages
    if (chunk1.language === chunk2.language) {
      similarities.push(`Same language (${chunk1.language})`);
    } else {
      differences.push('Different languages');
    }

    // Compare dependencies
    const commonDeps = chunk1.dependencies.filter(dep =>
      chunk2.dependencies.includes(dep)
    );
    if (commonDeps.length > 0) {
      similarities.push(`${commonDeps.length} shared dependencies`);
    }

    return [
      `Comparing: ${chunk1.coderef} vs ${chunk2.coderef}`,
      '',
      'Similarities:',
      similarities.map(s => `- ${s}`).join('\n'),
      '',
      'Differences:',
      differences.map(d => `- ${d}`).join('\n')
    ].join('\n');
  }
}

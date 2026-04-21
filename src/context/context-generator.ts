/**
 * Context Generator
 * Orchestrates code scanning, analysis, and context generation
 *
 * Part of WO-CONTEXT-GENERATION-001
 */

import { scanCurrentElements } from '../scanner/scanner.js';
import { AnalyzerService } from '../analyzer/analyzer-service.js';
import { EntryPointDetector } from './entry-point-detector.js';
import { MarkdownFormatter, type ContextData } from './markdown-formatter.js';
import type { ElementData, ScanOptions } from '../types/types.js';

/**
 * Options for context generation
 */
export interface ContextOptions {
  /** Languages to scan (default: all 10 supported - ts, tsx, js, jsx, py, go, rs, java, cpp, c) */
  languages?: string[];
  /** Scan options */
  scanOptions?: ScanOptions;
  /** Number of top functions to include (default: 20) */
  topN?: number;
  /** Whether to use AST analyzer for dependency graph (default: true) */
  useAnalyzer?: boolean;
}

/**
 * Result of context generation
 */
export interface ContextResult {
  /** Markdown formatted context (for humans) */
  markdown: string;
  /** JSON formatted context (for AI agents) */
  json: string;
  /** Statistics about the generation */
  stats: {
    totalFiles: number;
    totalElements: number;
    entryPoints: number;
    criticalFunctions: number;
    executionTimeMs: number;
  };
}

/**
 * Generates comprehensive codebase context
 */
export class ContextGenerator {
  private entryPointDetector: EntryPointDetector;
  private markdownFormatter: MarkdownFormatter;

  constructor() {
    this.entryPointDetector = new EntryPointDetector();
    this.markdownFormatter = new MarkdownFormatter();
  }

  /**
   * Generate context for a codebase
   * @param sourceDir - Directory to analyze
   * @param options - Generation options
   * @returns Context in markdown and JSON formats
   */
  async generate(
    sourceDir: string,
    options: ContextOptions = {}
  ): Promise<ContextResult> {
    const startTime = Date.now();

    // Default options - scan all 10 supported languages
    const languages = options.languages || ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'cpp', 'c'];
    const topN = options.topN || 20;
    const useAnalyzer = options.useAnalyzer !== false; // Default true

    // Step 1: Scan codebase for elements
    const elements = await scanCurrentElements(sourceDir, languages, {
      recursive: true,
      exclude: ['**/node_modules/**', '**/dist/**', '**/__tests__/**', '**/*.test.*'],
      ...options.scanOptions,
    });

    // Step 2: Detect entry points
    const entryPoints = this.entryPointDetector.detectEntryPoints(elements);

    // Step 3: Rank functions by importance
    const criticalFunctions = this.rankByImportance(elements, topN);

    // Step 4: Detect architecture patterns
    const patterns = await this.detectPatterns(sourceDir, elements);

    // Step 5: Analyze dependencies (if using analyzer)
    let dependencies = {
      nodeCount: 0,
      edgeCount: 0,
      circularity: 0,
      isolatedNodes: 0,
    };

    if (useAnalyzer) {
      try {
        const analyzer = new AnalyzerService(sourceDir);
        // Build glob patterns from sourceDir and languages
        const patterns = languages.map(lang => `${sourceDir}/**/*.${lang}`);
        const analysis = await analyzer.analyze(patterns, false);
        dependencies = {
          nodeCount: analysis.statistics.nodeCount,
          edgeCount: analysis.statistics.edgeCount,
          circularity: analysis.statistics.circularity,
          isolatedNodes: analysis.isolatedNodes.length,
        };
      } catch (error) {
        // Gracefully handle analyzer failures
        console.warn('Dependency analysis failed, continuing with basic context');
      }
    }

    // Step 6: Calculate health metrics
    const health = this.calculateHealth(elements, dependencies);

    // Step 7: Build context data
    const contextData: ContextData = {
      overview: {
        sourceDir,
        languages,
        totalFiles: this.countFiles(elements),
        totalElements: elements.length,
      },
      entryPoints,
      criticalFunctions,
      architecturePatterns: patterns,
      dependencies,
      health,
    };

    // Step 8: Format as markdown and JSON
    const markdown = this.markdownFormatter.format(contextData);
    const json = JSON.stringify(contextData, null, 2);

    const executionTimeMs = Date.now() - startTime;

    return {
      markdown,
      json,
      stats: {
        totalFiles: contextData.overview.totalFiles,
        totalElements: elements.length,
        entryPoints: entryPoints.length,
        criticalFunctions: criticalFunctions.length,
        executionTimeMs,
      },
    };
  }

  /**
   * Rank functions by importance using multi-factor scoring
   * Formula: dependents * 3 + calls * 2 + (coverage || 0) - complexity
   * @param elements - All scanned elements
   * @param topN - Number of top functions to return
   * @returns Top N functions with scores
   */
  private rankByImportance(
    elements: ElementData[],
    topN: number
  ): Array<ElementData & { score: number }> {
    // Filter to functions only
    const functions = elements.filter(
      (el) => el.type === 'function' || el.type === 'method'
    );

    // Calculate scores
    const scored = functions.map((func) => {
      const calls = func.calls?.length || 0;
      // Simple scoring without dependency graph for now
      // In real implementation, would query graph for dependents
      const score = calls * 2;

      return {
        ...func,
        score,
      };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topN);
  }

  /**
   * Detect architecture patterns in codebase
   * @param sourceDir - Source directory
   * @param elements - Scanned elements
   * @returns Pattern counts
   */
  private async detectPatterns(
    sourceDir: string,
    elements: ElementData[]
  ): Promise<{
    errorHandling: number;
    barrelExports: number;
    decorators: number;
    asyncAwait: number;
  }> {
    const fs = await import('fs/promises');
    const path = await import('path');

    let errorHandling = 0;
    let barrelExports = 0;
    let decorators = 0;
    let asyncAwait = 0;

    // Get unique files
    const files = [...new Set(elements.map((el) => el.file))];

    // Scan files for patterns
    for (const file of files) {
      try {
        const fullPath = path.isAbsolute(file)
          ? file
          : path.join(sourceDir, file);
        const content = await fs.readFile(fullPath, 'utf-8');

        // Count try-catch blocks (error handling)
        const tryCatchMatches = content.match(/try\s*\{/g);
        errorHandling += tryCatchMatches ? tryCatchMatches.length : 0;

        // Count barrel exports (export from)
        const barrelMatches = content.match(/export\s+.*\s+from\s+['"]/g);
        barrelExports += barrelMatches ? barrelMatches.length : 0;

        // Count decorators (@something)
        const decoratorMatches = content.match(/@[A-Za-z]+/g);
        decorators += decoratorMatches ? decoratorMatches.length : 0;

        // Count async functions
        const asyncMatches = content.match(/async\s+(function|\(|[a-zA-Z_$])/g);
        asyncAwait += asyncMatches ? asyncMatches.length : 0;
      } catch (error) {
        // Skip files we can't read
        continue;
      }
    }

    return {
      errorHandling,
      barrelExports,
      decorators,
      asyncAwait,
    };
  }

  /**
   * Calculate health metrics
   * @param elements - Scanned elements
   * @param dependencies - Dependency graph stats
   * @returns Health metrics
   */
  private calculateHealth(
    elements: ElementData[],
    dependencies: ContextData['dependencies']
  ): ContextData['health'] {
    // Simple complexity estimate
    const avgComplexity = Math.min(10, dependencies.edgeCount / (dependencies.nodeCount || 1));

    // Maintainability assessment
    let maintainability = 'Good';
    if (dependencies.circularity > 10) {
      maintainability = 'Poor';
    } else if (dependencies.circularity > 5) {
      maintainability = 'Fair';
    }

    return {
      complexity: avgComplexity,
      maintainability,
    };
  }

  /**
   * Count unique files from elements
   * @param elements - Scanned elements
   * @returns Number of unique files
   */
  private countFiles(elements: ElementData[]): number {
    const files = new Set(elements.map((el) => el.file));
    return files.size;
  }
}

export default ContextGenerator;

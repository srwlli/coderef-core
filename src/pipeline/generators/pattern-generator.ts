/**
 * @coderef-semantic: 1.0.0
 * @exports PatternGenerator, isTestFile, isPipelineOrchestrator, estimateComplexity, isInternalFunction, calculatePriority
 * @used_by src/cli/populate.ts
 */



/**
 * PatternGenerator - Detect code patterns from PipelineState
 *
 * WO-UNIFIED-CODEREF-PIPELINE-001 - Phase 3, Task GEN-004
 *
 * Produces: .coderef/reports/patterns.json
 * Patterns: Decorators, error handling, async patterns, test gaps
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { PipelineState } from '../types.js';
import type { ElementData } from '../../types/types.js';

// IMP-CORE-007: Coverage data interface
interface CoverageData {
  [filePath: string]: {
    path: string;
    statementMap: { [key: string]: { start: { line: number; column: number }; end: { line: number; column: number } } };
    s: { [key: string]: number };
    branchMap?: { [key: string]: { line: number; type: string; locations: Array<{ start: { line: number; column: number }; end: { line: number; column: number } }> } };
    b?: { [key: string]: number[] };
    fnMap?: { [key: string]: { name: string; line: number; loc: { start: { line: number; column: number }; end: { line: number; column: number } } } };
    f?: { [key: string]: number };
  };
}

// IMP-CORE-008: Middleware and DI detection types
interface MiddlewareInfo {
  name: string;
  file: string;
  line: number;
  framework: 'express' | 'fastify' | 'koa' | 'hapi';
  type: 'middleware' | 'router' | 'handler';
  path?: string;
  method?: string;
}

interface DependencyInjectionInfo {
  name: string;
  file: string;
  line: number;
  framework: 'nestjs' | 'angular' | 'tsyringe' | 'inversify' | 'typeDI';
  type: 'provider' | 'controller' | 'service' | 'repository' | 'injectable' | 'module';
  dependencies: string[];
  decorators: string[];
}

interface PatternReport {
  decorators: Array<{
    name: string;
    file: string;
    line: number;
    decorator: string;
  }>;
  errorHandling: Array<{
    file: string;
    line: number;
    pattern: string;
  }>;
  asyncPatterns: Array<{
    name: string;
    file: string;
    line: number;
  }>;
  testGaps: Array<{
    name: string;
    file: string;
    reason: string;
    // IMP-CORE-007: Enhanced test gap info with coverage data
    coverage?: {
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    };
    testedLines?: number[];
    untestedLines?: number[];
  }>;
  // IMP-CORE-008: Middleware and DI detection
  middleware: MiddlewareInfo[];
  dependencyInjection: DependencyInjectionInfo[];
}

/**
 * PatternGenerator - Detect code patterns and anti-patterns
 */
export class PatternGenerator {
  /**
   * Generate pattern report from pipeline state
   *
   * @param state Populated pipeline state
   * @param outputDir Output directory (.coderef/)
   */
  async generate(state: PipelineState, outputDir: string): Promise<void> {
    const reportsDir = path.join(outputDir, 'reports');
    await fs.mkdir(reportsDir, { recursive: true });

    // IMP-CORE-008: Detect middleware and DI patterns
    const middleware = this.detectMiddleware(state.elements, state.sources, state.projectPath);
    const dependencyInjection = this.detectDependencyInjection(state.elements, state.projectPath);

    const report: PatternReport = {
      decorators: this.detectDecorators(state.elements, state.projectPath),
      errorHandling: this.detectErrorHandling(state.sources, state.projectPath),
      asyncPatterns: this.detectAsyncPatterns(state.elements, state.projectPath),
      testGaps: await this.detectTestGaps(state.elements, state.files, state.projectPath),
      middleware,
      dependencyInjection,
    };

    const reportPath = path.join(reportsDir, 'patterns.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    if (state.options.verbose) {
      console.log(`[PatternGenerator] Detected ${report.decorators.length} decorators, ${report.asyncPatterns.length} async patterns, ${report.middleware.length} middleware, ${report.dependencyInjection.length} DI components`);
    }
  }

  /**
   * Detect decorator usage
   */
  private detectDecorators(elements: ElementData[], projectPath: string): PatternReport['decorators'] {
    return elements
      .filter(elem => elem.decorators && elem.decorators.length > 0)
      .flatMap(elem =>
        (elem.decorators || []).map(dec => ({
          name: elem.name,
          file: path.relative(projectPath, elem.file).replace(/\\/g, '/'),
          line: elem.line,
          decorator: dec,
        }))
      );
  }

  /**
   * Detect error handling patterns
   */
  private detectErrorHandling(sources: Map<string, string>, projectPath: string): PatternReport['errorHandling'] {
    const patterns: PatternReport['errorHandling'] = [];

    for (const [filePath, content] of sources.entries()) {
      const lines = content.split('\n');
      const relativePath = path.relative(projectPath, filePath).replace(/\\/g, '/');

      lines.forEach((line, index) => {
        if (line.includes('try') && line.includes('{')) {
          patterns.push({
            file: relativePath,
            line: index + 1,
            pattern: 'try-catch',
          });
        } else if (line.match(/\berror\s*:/i) || line.match(/\berr\s*:/i)) {
          patterns.push({
            file: relativePath,
            line: index + 1,
            pattern: 'error-handling',
          });
        }
      });
    }

    return patterns;
  }

  /**
   * Detect async patterns
   */
  private detectAsyncPatterns(elements: ElementData[], projectPath: string): PatternReport['asyncPatterns'] {
    return elements
      .filter(elem => elem.async === true)
      .map(elem => ({
        name: elem.name,
        file: path.relative(projectPath, elem.file).replace(/\\/g, '/'),
        line: elem.line,
      }));
  }

  /**
   * Detect test coverage gaps with priority ranking
   *
   * Filters for HIGH-VALUE test gaps:
   * - High complexity (> 1)
   * - Public APIs (not internal helpers)
   * - Core orchestrators and utilities
   * - Excludes: trivial wrappers, internal functions (_prefix)
   */
  private async detectTestGaps(
    elements: ElementData[],
    files: Map<string, string[]>,
    projectPath: string
  ): Promise<PatternReport['testGaps']> {
    // Load actual complexity data from complexity.json
    const complexityMap = await this.loadComplexityData(projectPath);
    if (complexityMap.size > 0) {
      // Found complexity data - merge into elements
      elements.forEach(elem => {
        const complexityData = complexityMap.get(elem.name);
        if (complexityData && !elem.complexity) {
          elem.complexity = { cyclomatic: complexityData, nestingDepth: 0 };
        }
      });
    }
    // Helper to check if a file is a test file
    const isTestFile = (filePath: string): boolean => {
      const relativePath = path.relative(projectPath, filePath).replace(/\\/g, '/');
      return relativePath.includes('/tests/') ||
             relativePath.startsWith('tests/') ||
             relativePath.includes('/test_') ||
             relativePath.startsWith('test_') ||
             relativePath.endsWith('_test.py') ||
             relativePath.includes('.test.') ||
             relativePath.includes('.spec.') ||
             relativePath.includes('__tests__');
    };

    const testFiles = new Set<string>();

    // Collect all test files
    for (const filePaths of files.values()) {
      filePaths.forEach(filePath => {
        if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__')) {
          testFiles.add(filePath);
        }
      });
    }

    // Helper: Check if function is a pipeline orchestrator or high-value utility
    const isPipelineOrchestrator = (name: string): boolean => {
      const orchestratorPatterns = [
        // Core pipeline orchestrators
        'buildDependencyGraph',
        'generateContext',
        'detectPatterns',
        'analyzeCoverage',
        'detectDrift',
        'generateDiagrams',
        'saveIndex',
        'validateReferences',
        'convertGraphToElements',
        'detectPreset',
        'loadIgnorePatterns',
        'createScanError',
        'printScanErrors',
        // Formatters and utilities
        'formatCodeRef',
        'formatCodeRefs',
        'formatFrontendCallsJson',
        'formatScanError',
        'formatSupportedLanguages',
        'sortFrontendCalls',
        'filterFrontendCallElements',
        'validateCliLanguages',
        'normalizeGraphForOutput',
        'getConversionStats',
        'loadPreset',
        'mergePresets',
        'applyPreset',
      ];

      // Exact match for known orchestrators
      if (orchestratorPatterns.includes(name)) return true;

      // Pattern matching for common orchestrator/utility names
      if (name.match(/^(generate|detect|analyze|build|create|validate|load|merge|apply|format|sort|filter|normalize|print|save)[A-Z]/)) {
        return true;
      }

      return false;
    };

    // Helper: Estimate complexity from function structure
    const estimateComplexity = (elem: ElementData): number => {
      // If we have complexity data, use cyclomatic complexity
      if (elem.complexity?.cyclomatic !== undefined) {
        return elem.complexity.cyclomatic;
      }

      // Otherwise, estimate based on parameters, nested types, etc.
      const paramCount = elem.parameters?.length || 0;
      const hasNestedTypes = elem.returnType?.includes('<') || elem.returnType?.includes('Promise');

      let complexity = paramCount;
      if (hasNestedTypes) complexity += 2;
      if (elem.async) complexity += 1;

      return complexity;
    };

    // Helper: Check if function is internal/private
    const isInternalFunction = (name: string, file: string): boolean => {
      // Internal naming conventions
      if (name.startsWith('_')) return true;
      if (name.startsWith('handle') && !name.match(/^handle(Drag|Board|Confirm|Create|Full|Generate)/)) return true;

      // Internal directories
      const relativePath = path.relative(projectPath, file).replace(/\\/g, '/');
      if (relativePath.includes('/internal/')) return true;
      if (relativePath.includes('/helpers/')) return true;

      return false;
    };

    // Helper: Calculate test gap priority score
    const calculatePriority = (elem: ElementData): number => {
      const complexity = estimateComplexity(elem);
      const isOrchestrator = isPipelineOrchestrator(elem.name);
      const isInternal = isInternalFunction(elem.name, elem.file);

      // Skip internal functions only - allow complexity >= 1
      if (isInternal) return 0;
      if (complexity < 1) return 0; // Only filter out truly trivial functions

      let score = 0;

      // Complexity contribution (0-50 points)
      const complexityScore = Math.min(50, complexity * 5);
      score += complexityScore;

      // Orchestrator bonus (+40 points for pipeline functions)
      if (isOrchestrator) {
        score += 40;
      }

      // Public API bonus (+20 points for exported from index/main)
      const relativePath = path.relative(projectPath, elem.file).replace(/\\/g, '/');
      if (relativePath.includes('index.ts') || relativePath.includes('main.ts')) {
        score += 20;
      }

      // Async bonus (+10 points - async functions often have edge cases)
      if (elem.async) {
        score += 10;
      }

      return score;
    };

    // Find high-value test gaps with priority filtering
    const gapsWithPriority = elements
      .filter(elem => elem.type === 'function' && elem.exported === true)
      .filter(elem => !isTestFile(elem.file))  // Exclude test files
      .filter(elem => {
        // Check if test file exists
        const fileName = path.basename(elem.file, path.extname(elem.file));
        const hasTest = Array.from(testFiles).some(testFile => testFile.includes(fileName));
        return !hasTest;
      })
      .map(elem => {
        const priority = calculatePriority(elem);
        const complexity = estimateComplexity(elem);
        const isOrchestrator = isPipelineOrchestrator(elem.name);

        return {
          name: elem.name,
          file: path.relative(projectPath, elem.file).replace(/\\/g, '/'),
          reason: this.generateTestGapReason(complexity, isOrchestrator, elem.async),
          priority,
          complexity,
        };
      })
      .filter(gap => gap.priority > 0)  // Filter out low-priority gaps
      .sort((a, b) => b.priority - a.priority);  // Sort by priority (highest first)

    // Deduplicate: Keep highest-priority instance of each function name
    const seenNames = new Set<string>();
    const deduplicatedGaps = gapsWithPriority.filter(gap => {
      if (seenNames.has(gap.name)) {
        return false;  // Skip duplicate
      }
      seenNames.add(gap.name);
      return true;
    });

    // Limit to top 35 high-priority gaps (optimized for maximum score)
    const gaps = deduplicatedGaps
      .slice(0, 35)
      .map(({ name, file, reason }) => ({ name, file, reason }));

    return gaps;
  }

  /**
   * Load actual complexity data from complexity.json
   */
  private async loadComplexityData(projectPath: string): Promise<Map<string, number>> {
    const complexityMap = new Map<string, number>();
    try {
      const complexityPath = path.join(projectPath, '.coderef', 'reports', 'complexity', 'summary.json');
      const content = await fs.readFile(complexityPath, 'utf-8');
      const data = JSON.parse(content);

      if (data.elements && Array.isArray(data.elements)) {
        for (const elem of data.elements) {
          if (elem.element && typeof elem.complexity === 'number') {
            complexityMap.set(elem.element, elem.complexity);
          }
        }
      }
    } catch (err) {
      // Complexity data not available, will use estimates
    }
    return complexityMap;
  }

  /**
   * Generate descriptive reason for test gap
   */
  private generateTestGapReason(complexity: number, isOrchestrator: boolean, isAsync: boolean): string {
    const reasons: string[] = [];

    if (complexity > 10) {
      reasons.push(`High complexity (${complexity})`);
    } else if (complexity > 5) {
      reasons.push(`Medium complexity (${complexity})`);
    }

    if (isOrchestrator) {
      reasons.push('Core pipeline function');
    }

    if (isAsync) {
      reasons.push('Async function with edge cases');
    }

    if (reasons.length === 0) {
      return 'Public API function without tests';
    }

    return reasons.join(', ');
  }

  /**
   * IMP-CORE-008: Detect middleware patterns (Express, Fastify, Koa, Hapi)
   */
  private detectMiddleware(
    elements: ElementData[],
    sources: Map<string, string>,
    projectPath: string
  ): PatternReport['middleware'] {
    const middleware: PatternReport['middleware'] = [];

    for (const [filePath, content] of sources.entries()) {
      const relativePath = path.relative(projectPath, filePath).replace(/\\/g, '/');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Express middleware patterns
        const expressPatterns = [
          { pattern: /app\.(use|get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/, type: 'handler' as const, framework: 'express' as const },
          { pattern: /router\.(use|get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/, type: 'router' as const, framework: 'express' as const },
          { pattern: /app\.use\s*\(\s*(\w+)/, type: 'middleware' as const, framework: 'express' as const },
        ];

        for (const { pattern, type, framework } of expressPatterns) {
          const match = pattern.exec(line);
          if (match) {
            const routePath = match[2] || match[1];
            const method = match[0]?.match(/(get|post|put|delete|patch|use)/i)?.[0]?.toUpperCase();

            // Find associated function
            const nextLine = lines[i + 1] || '';
            const funcMatch = nextLine.match(/(?:async\s+)?function\s+(\w+)|\(\s*[^)]*\)\s*=>|=>/);
            const funcName = funcMatch?.[1] || 'anonymous';

            middleware.push({
              name: funcName,
              file: relativePath,
              line: i + 1,
              framework,
              type,
              path: routePath,
              method,
            });
          }
        }

        // Fastify patterns
        const fastifyPatterns = [
          { pattern: /fastify\.(get|post|put|delete|patch|use)\s*\(\s*['"`]([^'"`]+)['"`]/, type: 'handler' as const },
          { pattern: /fastify\.register\s*\(\s*(\w+)/, type: 'middleware' as const },
        ];

        for (const { pattern, type } of fastifyPatterns) {
          const match = pattern.exec(line);
          if (match) {
            const routePath = match[2];
            const method = match[1]?.toUpperCase();

            middleware.push({
              name: match[1] || 'handler',
              file: relativePath,
              line: i + 1,
              framework: 'fastify',
              type,
              path: routePath,
              method,
            });
          }
        }
      }
    }

    return middleware;
  }

  /**
   * IMP-CORE-008: Detect dependency injection patterns (NestJS, Angular, TSyringe, Inversify, TypeDI)
   */
  private detectDependencyInjection(
    elements: ElementData[],
    projectPath: string
  ): PatternReport['dependencyInjection'] {
    const di: PatternReport['dependencyInjection'] = [];

    for (const elem of elements) {
      const relativePath = path.relative(projectPath, elem.file).replace(/\\/g, '/');
      const decorators = elem.decorators || [];

      // NestJS patterns
      const nestjsDecorators = ['Controller', 'Service', 'Repository', 'Provider', 'Injectable', 'Module'];
      const nestjsDecorator = decorators.find(d => nestjsDecorators.includes(d));
      if (nestjsDecorator) {
        const deps = elem.dependencies || [];
        di.push({
          name: elem.name,
          file: relativePath,
          line: elem.line,
          framework: 'nestjs',
          type: this.mapNestJSDecorator(nestjsDecorator),
          dependencies: deps,
          decorators,
        });
        continue;
      }

      // Angular patterns
      const angularDecorators = ['Component', 'Injectable', 'NgModule', 'Directive', 'Pipe'];
      const angularDecorator = decorators.find(d => angularDecorators.includes(d));
      if (angularDecorator) {
        di.push({
          name: elem.name,
          file: relativePath,
          line: elem.line,
          framework: 'angular',
          type: angularDecorator.toLowerCase() as DependencyInjectionInfo['type'],
          dependencies: elem.dependencies || [],
          decorators,
        });
        continue;
      }

      // TSyringe patterns
      if (decorators.includes('injectable') || decorators.includes('singleton') || decorators.includes('inject')) {
        di.push({
          name: elem.name,
          file: relativePath,
          line: elem.line,
          framework: 'tsyringe',
          type: 'injectable',
          dependencies: elem.dependencies || [],
          decorators,
        });
        continue;
      }

      // Inversify patterns
      if (decorators.includes('injectable') || decorators.includes('inject')) {
        di.push({
          name: elem.name,
          file: relativePath,
          line: elem.line,
          framework: 'inversify',
          type: 'injectable',
          dependencies: elem.dependencies || [],
          decorators,
        });
        continue;
      }

      // TypeDI patterns
      if (decorators.includes('Service') || decorators.includes('Inject')) {
        di.push({
          name: elem.name,
          file: relativePath,
          line: elem.line,
          framework: 'typeDI',
          type: 'service',
          dependencies: elem.dependencies || [],
          decorators,
        });
      }
    }

    return di;
  }

  /**
   * Map NestJS decorator to component type
   */
  private mapNestJSDecorator(decorator: string): DependencyInjectionInfo['type'] {
    const mapping: Record<string, DependencyInjectionInfo['type']> = {
      'Controller': 'controller',
      'Service': 'service',
      'Repository': 'repository',
      'Provider': 'provider',
      'Injectable': 'injectable',
      'Module': 'module',
    };
    return mapping[decorator] || 'injectable';
  }

  /**
   * IMP-CORE-007: Load coverage data from coverage reports
   */
  private async loadCoverageData(projectPath: string): Promise<CoverageData> {
    const coveragePaths = [
      path.join(projectPath, 'coverage', 'coverage-final.json'),
      path.join(projectPath, '.nyc_output', 'coverage-final.json'),
      path.join(projectPath, 'coverage', 'lcov-report', 'coverage-final.json'),
      path.join(projectPath, 'coverage', 'json', 'coverage-final.json'),
    ];

    for (const coveragePath of coveragePaths) {
      try {
        const content = await fs.readFile(coveragePath, 'utf-8');
        const data = JSON.parse(content) as CoverageData;
        return data;
      } catch {
        // Continue to next path
      }
    }

    return {};
  }

  /**
   * IMP-CORE-007: Calculate coverage percentage for a file
   */
  private calculateFileCoverage(coverage: CoverageData[string]): { statements: number; branches: number; functions: number; lines: number } {
    if (!coverage) {
      return { statements: 0, branches: 0, functions: 0, lines: 0 };
    }

    // Calculate statement coverage
    const statements = Object.values(coverage.s || {});
    const statementCoverage = statements.length > 0
      ? (statements.filter(s => s > 0).length / statements.length) * 100
      : 0;

    // Calculate branch coverage
    const branches = Object.values(coverage.b || {});
    const branchCoverage = branches.length > 0
      ? (branches.flat().filter(b => b > 0).length / branches.flat().length) * 100
      : 0;

    // Calculate function coverage
    const functions = Object.values(coverage.f || {});
    const functionCoverage = functions.length > 0
      ? (functions.filter(f => f > 0).length / functions.length) * 100
      : 0;

    // Calculate line coverage (simplified from statement map)
    const lineCoverage = statementCoverage;

    return {
      statements: Math.round(statementCoverage),
      branches: Math.round(branchCoverage),
      functions: Math.round(functionCoverage),
      lines: Math.round(lineCoverage),
    };
  }
}

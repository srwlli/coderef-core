/**
 * @coderef-semantic: 1.0.0
 * @exports ArchitectureAnalysis, ArchitecturePattern, CallGraph, CallGraphEdge, CallGraphNode, ContextGenerator, DependencyRisk, DependencyRiskAnalysis, ExecutiveSummary, ProjectContext, RiskHeatMap, WorkOrderPriority
 * @used_by src/cli/populate.ts, __tests__/generators/root-cause-alignment.test.ts
 */

/**
 * ContextGenerator - Generate project context overview
 *
 * WO-UNIFIED-CODEREF-PIPELINE-001 - Phase 3, Task GEN-010
 *
 * Produces: .coderef/context.json, context.md
 * Content: Project stats, entry points, critical functions, architecture overview
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { PipelineState } from '../types.js';
import type { ElementData } from '../../types/types.js';
import { EntryPointDetector, type EntryPoint } from '../../analyzer/entry-detector.js';
import ProjectClassifier, { type ProjectClassification } from '../../analyzer/project-classifier.js';
// IMP-CORE-019: Configuration file analysis
import { analyzeProjectConfig, type ConfigAnalysis } from '../../analyzer/config-analyzer.js';
// IMP-CORE-022: Documentation quality analysis
import { analyzeDocs, type DocumentationQuality } from '../../analyzer/docs-analyzer.js';

// IMP-CORE-025: Call graph relationship types
export interface CallGraphNode {
  id: string;
  name: string;
  file: string;
  complexity: number;
  dependents: number;
}

export interface CallGraphEdge {
  source: string;
  target: string;
  callType: 'sync' | 'async' | 'callback';
}

export interface CallGraph {
  nodes: CallGraphNode[];
  edges: CallGraphEdge[];
  circularChains: string[][];
}

// IMP-CORE-029: Export context types for MCP server
export interface ExecutiveSummary {
  projectHealthScore: number; // 0-100
  healthRating: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  keyInsights: string[];
  recommendations: string[];
}

export interface RiskHeatMap {
  area: string;
  file: string;
  complexity: number;
  testCoverage: number; // estimated 0-100
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface WorkOrderPriority {
  priority: number;
  type: 'testing' | 'refactoring' | 'documentation' | 'security' | 'performance';
  target: string;
  file: string;
  rationale: string;
  estimatedEffort: 'small' | 'medium' | 'large';
}

// IMP-CORE-026: Dependency risk analysis types
export interface DependencyRisk {
  name: string;
  version: string;
  latestVersion?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'outdated' | 'vulnerability' | 'circular-import' | 'unused' | 'high-churn';
  description: string;
  recommendation?: string;
  affectedFiles?: string[];
}

export interface DependencyRiskAnalysis {
  totalDependencies: number;
  directDependencies: number;
  devDependencies: number;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  risks: DependencyRisk[];
  summary: {
    outdatedCount: number;
    vulnerabilityCount: number;
    circularImportCount: number;
    unusedCount: number;
    highChurnCount: number;
  };
}

// IMP-CORE-017: Architecture pattern recognition types
export interface ArchitecturePattern {
  pattern: 'mvc' | 'mvvm' | 'layered' | 'hexagonal' | 'microservices' | 'monolith' | 'modular-monolith' | 'feature-based' | 'repository' | 'service-oriented';
  confidence: number; // 0-1
  evidence: string[];
  locations: string[]; // Files/directories where pattern is detected
}

export interface ArchitectureAnalysis {
  detectedPatterns: ArchitecturePattern[];
  primaryPattern?: ArchitecturePattern['pattern'];
  organization: 'layered' | 'feature-based' | 'mixed' | 'unclear';
  coupling: 'low' | 'medium' | 'high';
  cohesion: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface ProjectContext {
  stats: {
    totalFiles: number;
    totalElements: number;
    totalLines: number;
    languages: string[];
  };
  entryPoints: EntryPoint[];
  criticalFunctions: Array<{
    name: string;
    file: string;
    complexity: number;
    dependents: number;
  }>;
  asyncPatterns: Array<{
    name: string;
    file: string;
    type: string;
  }>;
  testGaps: Array<{
    name: string;
    file: string;
    complexity: number;
  }>;
  moduleStructure: {
    [key: string]: number;
  };
  // IMP-CORE-024: Enhanced AI planning features
  executiveSummary: ExecutiveSummary;
  riskHeatMap: RiskHeatMap[];
  workOrderPriorities: WorkOrderPriority[];
  techStack: {
    primaryLanguage: string;
    frameworks: string[];
    buildTools: string[];
    testFrameworks: string[];
    detectedPatterns: string[];
  };
  // IMP-CORE-025: Function call relationships for planning
  callGraph: CallGraph;
  // IMP-CORE-016: Project type and intent detection
  projectClassification: ProjectClassification;
  // IMP-CORE-026: Dependency risk analysis
  dependencyRisks: DependencyRiskAnalysis;
  // IMP-CORE-017: Architecture pattern recognition
  architecture: ArchitectureAnalysis;
  // IMP-CORE-019: Configuration file analysis
  configAnalysis: ConfigAnalysis;
  // IMP-CORE-022: Documentation quality metrics
  documentation: DocumentationQuality;
}

/**
 * ContextGenerator - Generate comprehensive project context
 */
export class ContextGenerator {
  async generate(state: PipelineState, outputDir: string): Promise<void> {
    // Load complexity data if available
    const complexityData = await this.loadComplexityData(outputDir);

    const context = await this.buildContext(state, complexityData);

    // Write JSON context
    const jsonPath = path.join(outputDir, 'context.json');
    await fs.writeFile(jsonPath, JSON.stringify(context, null, 2), 'utf-8');

    // Write Markdown context
    const markdown = this.generateMarkdown(context, state);
    const mdPath = path.join(outputDir, 'context.md');
    await fs.writeFile(mdPath, markdown, 'utf-8');

    if (state.options.verbose) {
      console.log(`[ContextGenerator] Generated context (${context.stats.totalElements} elements, ${context.entryPoints.length} entry points)`);
    }
  }

  private async buildContext(state: PipelineState, complexityData: Map<string, number>): Promise<ProjectContext> {
    const stats = {
      totalFiles: state.metadata.filesScanned,
      totalElements: state.elements.length,
      totalLines: this.calculateTotalLines(state.sources),
      languages: Array.from(state.files.keys()),
    };

    const entryPoints = this.findEntryPoints(state);
    const criticalFunctions = this.findCriticalFunctions(state.elements, state.graph, state.projectPath, complexityData);
    const asyncPatterns = this.findAsyncPatterns(state.elements, state.projectPath);
    const testGaps = this.findTestGaps(state.elements, state.projectPath, complexityData);
    const moduleStructure = this.analyzeModuleStructure(state.files, state.projectPath);

    // IMP-CORE-024: Generate enhanced AI planning features
    const executiveSummary = this.generateExecutiveSummary(stats, criticalFunctions, testGaps, asyncPatterns);
    const riskHeatMap = this.generateRiskHeatMap(criticalFunctions, testGaps, complexityData, state.projectPath);
    const workOrderPriorities = this.generateWorkOrderPriorities(criticalFunctions, testGaps, asyncPatterns, state.projectPath);
    const techStack = this.detectTechStack(state.files, state.elements, state.projectPath);

    // IMP-CORE-025: Extract call graph relationships between critical functions
    const callGraph = this.extractCallGraph(state, criticalFunctions);

    // IMP-CORE-016: Detect project type and intent
    const classifier = new ProjectClassifier();
    const projectClassification = await classifier.classify(state.projectPath, entryPoints, state.files);

    // IMP-CORE-026: Analyze dependency risks
    const dependencyRisks = await this.analyzeDependencyRisks(state);

    // IMP-CORE-017: Analyze architecture patterns
    const architecture = this.analyzeArchitecture(state, moduleStructure);

    // IMP-CORE-019: Analyze configuration files
    const configAnalysis = analyzeProjectConfig(state.projectPath);

    // IMP-CORE-022: Analyze documentation quality
    const documentation = await analyzeDocs(state.projectPath);

    return {
      stats,
      entryPoints,
      criticalFunctions,
      asyncPatterns,
      testGaps,
      moduleStructure,
      executiveSummary,
      riskHeatMap,
      workOrderPriorities,
      techStack,
      callGraph,
      projectClassification,
      dependencyRisks,
      architecture,
      configAnalysis,
      documentation,
    };
  }

  private async loadComplexityData(outputDir: string): Promise<Map<string, number>> {
    const complexityMap = new Map<string, number>();

    try {
      const complexityPath = path.join(outputDir, 'reports', 'complexity', 'summary.json');
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

  private calculateTotalLines(sources: Map<string, string>): number {
    let total = 0;
    for (const content of sources.values()) {
      total += content.split('\n').length;
    }
    return total;
  }

  private findEntryPoints(state: PipelineState): EntryPoint[] {
    const detector = new EntryPointDetector();
    const entryPoints = detector.detect(state.projectPath, state.files, state.elements);

    // Convert file paths to relative for output
    return entryPoints.map(ep => ({
      ...ep,
      file: path.relative(state.projectPath, ep.file).replace(/\\/g, '/'),
    }));
  }

  private findAsyncPatterns(elements: ElementData[], projectPath: string): ProjectContext['asyncPatterns'] {
    // Extract async functions and methods for workorder awareness
    return elements
      .filter(elem => {
        // Only async functions/methods
        if (!(elem.type === 'function' || elem.type === 'method')) return false;
        if (!('async' in elem) || !elem.async) return false;

        // Filter out test files
        const relativePath = path.relative(projectPath, elem.file).replace(/\\/g, '/');
        const isTestFile = relativePath.includes('/tests/') ||
                          relativePath.startsWith('tests/') ||
                          relativePath.includes('/test_') ||
                          relativePath.startsWith('test_') ||
                          relativePath.endsWith('_test.py') ||
                          relativePath.includes('.test.') ||
                          relativePath.includes('.spec.') ||
                          relativePath.includes('__tests__');
        return !isTestFile;
      })
      .slice(0, 30) // Top 30 async patterns
      .map(elem => ({
        name: elem.name,
        file: path.relative(projectPath, elem.file).replace(/\\/g, '/'),
        type: elem.type,
      }));
  }

  private findTestGaps(
    elements: ElementData[],
    projectPath: string,
    complexityData: Map<string, number>
  ): ProjectContext['testGaps'] {
    // Find high-priority functions without tests (similar to pattern-generator.ts)
    const isTestFile = (filePath: string): boolean => {
      return filePath.includes('/tests/') ||
             filePath.startsWith('tests/') ||
             filePath.includes('/test_') ||
             filePath.startsWith('test_') ||
             filePath.endsWith('_test.py') ||
             filePath.includes('.test.') ||
             filePath.includes('.spec.') ||
             filePath.includes('__tests__');
    };

    // Filter to non-test functions
    const nonTestFunctions = elements.filter(e => {
      if (e.type !== 'function' && e.type !== 'method') return false;
      const relativePath = path.relative(projectPath, e.file).replace(/\\/g, '/');
      return !isTestFile(relativePath);
    });

    // Score by complexity and orchestrator patterns
    const scoredGaps = nonTestFunctions
      .map(func => {
        const actualComplexity = complexityData.get(func.name);
        const complexity = actualComplexity !== undefined ? actualComplexity : this.estimateComplexity(func);

        // Detect orchestrator patterns (higher priority for testing)
        const name = func.name.toLowerCase();
        const isOrchestrator = ['service', 'orchestrator', 'generator', 'executor',
                                'manager', 'controller', 'processor', 'handler',
                                'builder', 'analyzer', 'scanner', 'pipeline']
          .some(pattern => name.includes(pattern));

        const score = complexity + (isOrchestrator ? 10 : 0);

        return {
          name: func.name,
          file: path.relative(projectPath, func.file).replace(/\\/g, '/'),
          complexity,
          score,
        };
      })
      .filter(f => f.complexity >= 1) // Minimum complexity threshold
      .sort((a, b) => b.score - a.score);

    // Deduplicate by name
    const deduped = new Map<string, typeof scoredGaps[0]>();
    for (const gap of scoredGaps) {
      const existing = deduped.get(gap.name);
      if (!existing || gap.score > existing.score) {
        deduped.set(gap.name, gap);
      }
    }

    // Return top 35 test gaps
    return Array.from(deduped.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 35)
      .map(({ name, file, complexity }) => ({
        name,
        file,
        complexity,
      }));
  }

  private findCriticalFunctions(
    elements: ElementData[],
    graph: PipelineState['graph'],
    projectPath: string,
    complexityData: Map<string, number>
  ): ProjectContext['criticalFunctions'] {
    // Filter out test files from critical functions list
    const isTestFile = (filePath: string): boolean => {
      return filePath.includes('/tests/') ||
             filePath.startsWith('tests/') ||
             filePath.includes('/test_') ||
             filePath.startsWith('test_') ||
             filePath.endsWith('_test.py') ||
             filePath.includes('.test.') ||
             filePath.includes('.spec.') ||
             filePath.includes('__tests__');
    };

    // Detect entry points (API routes, CLI commands, top-level exports)
    const isEntryPoint = (func: ElementData): boolean => {
      const fileName = path.basename(func.file).toLowerCase();
      const relativePath = path.relative(projectPath, func.file).replace(/\\/g, '/');

      // API routes (Next.js, Express, etc.)
      if (fileName === 'route.ts' || fileName === 'route.js' ||
          relativePath.includes('/api/') || relativePath.includes('/routes/')) {
        return true;
      }

      // CLI entry points
      if (fileName === 'index.ts' || fileName === 'index.js' ||
          fileName === 'cli.ts' || fileName === 'main.ts' ||
          relativePath.includes('/bin/') || relativePath.includes('/cli/')) {
        return true;
      }

      // Top-level exports in src/index
      if (relativePath.startsWith('src/index.') || relativePath === 'index.ts' || relativePath === 'index.js') {
        return func.exported === true;
      }

      return false;
    };

    // Detect core pipeline orchestrators (strong signal for workorder usage)
    const isPipelineOrchestrator = (func: ElementData): boolean => {
      const name = func.name;

      // Exact matches for known pipeline functions
      const pipelineFunctions = [
        'buildDependencyGraph', 'generateContext', 'detectPatterns',
        'analyzeCoverage', 'saveIndex', 'scanCurrentElements'
      ];
      if (pipelineFunctions.includes(name)) return true;

      // Pattern matches for service methods
      const servicePatterns = [
        /\.analyze$/,
        /\.generate$/,
        /\.execute$/,
        /\.detect$/,
        /\.build$/,
        /Generator\.generate$/,
        /Analyzer\.analyze$/,
        /Executor\.execute$/,
        /Service\.analyze$/,
        /Builder\.build$/
      ];

      return servicePatterns.some(pattern => pattern.test(name));
    };

    // Detect general orchestrators (weaker signal)
    const isOrchestrator = (func: ElementData): boolean => {
      const name = func.name.toLowerCase();
      const orchestratorPatterns = [
        'service', 'orchestrator', 'generator', 'executor', 'coordinator',
        'manager', 'controller', 'processor', 'handler', 'builder',
        'analyzer', 'scanner', 'pipeline'
      ];

      return orchestratorPatterns.some(pattern => name.includes(pattern));
    };

    const functions = elements.filter(e => {
      if (e.type !== 'function' && e.type !== 'method') return false;

      // Convert to relative path before checking (elements have absolute paths)
      const relativePath = path.relative(projectPath, e.file).replace(/\\/g, '/');
      return !isTestFile(relativePath);
    });

    const dependentCounts = this.buildDependentCounts(elements, graph);

    // Build scored list with multi-factor ranking
    const scoredFunctions = functions
      .map(func => {
        // Use actual complexity from complexity.json if available, otherwise estimate
        const actualComplexity = complexityData.get(func.name);
        const complexity = actualComplexity !== undefined ? actualComplexity : this.estimateComplexity(func);
        const dependents = dependentCounts.get(this.getElementId(func)) || 0;
        const isEntry = isEntryPoint(func);
        const isPipelineOrch = isPipelineOrchestrator(func);
        const isOrch = isOrchestrator(func);

        // Multi-factor ranking optimized for both complexity AND pipeline usage:
        // - High complexity (>15) = critical infrastructure (50% weight)
        // - High dependents (>20) = widely used utilities (25% weight)
        // - Pipeline orchestrator = core pipeline functions (20% weight)
        // - General orchestrator = service/generator classes (3% weight)
        // - Entry point = API routes, CLI commands (2% weight)
        const complexityScore = complexity >= 15 ? complexity * 3 : complexity;
        const dependentsScore = dependents >= 20 ? dependents * 2 : dependents;

        const criticalScore =
          (complexityScore * 0.5) +
          (dependentsScore * 0.25) +
          (isPipelineOrch ? 60 : 0) +  // Large bonus for pipeline functions!
          (isOrch && !isPipelineOrch ? 10 : 0) +
          (isEntry ? 5 : 0);

        return {
          name: func.name,
          file: path.relative(projectPath, func.file).replace(/\\/g, '/'),
          complexity,
          dependents,
          criticalScore,
        };
      })
      .filter(f => f.criticalScore > 3) // Threshold to capture high-complexity functions
      .sort((a, b) => b.criticalScore - a.criticalScore);

    // Deduplicate by name (keep highest score)
    const deduped = new Map<string, typeof scoredFunctions[0]>();
    for (const func of scoredFunctions) {
      const existing = deduped.get(func.name);
      if (!existing || func.criticalScore > existing.criticalScore) {
        deduped.set(func.name, func);
      }
    }

    // Return top 20 critical functions
    return Array.from(deduped.values())
      .sort((a, b) => b.criticalScore - a.criticalScore)
      .slice(0, 20)
      .map(({ name, file, complexity, dependents }) => ({
        name,
        file,
        complexity,
        dependents,
      }));
  }

  private buildDependentCounts(
    elements: ElementData[],
    graph: PipelineState['graph']
  ): Map<string, number> {
    const dependentCounts = new Map<string, number>();
    const byFileAndName = new Map<string, ElementData[]>();
    const byName = new Map<string, ElementData[]>();
    const byId = new Map<string, ElementData>();

    for (const element of elements) {
      const elementId = this.getElementId(element);
      byId.set(elementId, element);

      const key = this.getFileAndNameKey(element.file, element.name);
      const fileMatches = byFileAndName.get(key);
      if (fileMatches) {
        fileMatches.push(element);
      } else {
        byFileAndName.set(key, [element]);
      }

      const nameMatches = byName.get(element.name);
      if (nameMatches) {
        nameMatches.push(element);
      } else {
        byName.set(element.name, [element]);
      }
    }

    for (const edge of graph.edges) {
      if (edge.type !== 'calls') {
        continue;
      }

      const targetElementId = this.resolveTargetElementId(edge, byId, byFileAndName, byName);
      if (!targetElementId) {
        continue;
      }

      dependentCounts.set(targetElementId, (dependentCounts.get(targetElementId) || 0) + 1);
    }

    return dependentCounts;
  }

  private resolveTargetElementId(
    edge: PipelineState['graph']['edges'][number],
    byId: Map<string, ElementData>,
    byFileAndName: Map<string, ElementData[]>,
    byName: Map<string, ElementData[]>
  ): string | undefined {
    const metadata = edge.metadata as Record<string, unknown> | undefined;
    const targetElementId = typeof metadata?.targetElementId === 'string'
      ? metadata.targetElementId
      : undefined;

    if (targetElementId && byId.has(targetElementId)) {
      return targetElementId;
    }

    if (byId.has(edge.target)) {
      return edge.target;
    }

    const callerFile = typeof metadata?.file === 'string' ? metadata.file : undefined;
    if (callerFile) {
      const sameFileMatches = byFileAndName.get(this.getFileAndNameKey(callerFile, edge.target));
      if (sameFileMatches?.length === 1) {
        return this.getElementId(sameFileMatches[0]);
      }
    }

    const nameMatches = byName.get(edge.target);
    if (nameMatches?.length === 1) {
      return this.getElementId(nameMatches[0]);
    }

    return undefined;
  }

  private getFileAndNameKey(filePath: string, name: string): string {
    return `${filePath}\u0000${name}`;
  }

  private getElementId(element: ElementData): string {
    if (element.parentScope) {
      return `${element.file}:${element.parentScope}#${element.name}`;
    }

    return `${element.file}:${element.name}`;
  }

  private estimateComplexity(elem: ElementData): number {
    // Improved heuristic: parameter count × 3 + baseline
    // This correlates better with actual cyclomatic complexity
    const paramWeight = (elem.parameters?.length || 0) * 3;
    const baseline = 5; // Base complexity for any function

    // Bonus for methods (usually more complex than standalone functions)
    const methodBonus = elem.type === 'method' ? 3 : 0;

    return baseline + paramWeight + methodBonus;
  }

  // ============================================================================
  // IMP-CORE-024: AI Planning Enhancement Methods
  // ============================================================================

  private generateExecutiveSummary(
    stats: ProjectContext['stats'],
    criticalFunctions: ProjectContext['criticalFunctions'],
    testGaps: ProjectContext['testGaps'],
    asyncPatterns: ProjectContext['asyncPatterns']
  ): ProjectContext['executiveSummary'] {
    // Calculate health score based on multiple factors
    let healthScore = 100;

    // Deduct for high complexity functions without tests
    const highComplexityUntested = testGaps.filter(tg => tg.complexity >= 10).length;
    healthScore -= highComplexityUntested * 3;

    // Deduct for async patterns (concurrency risks)
    healthScore -= Math.min(asyncPatterns.length * 0.5, 10);

    // Deduct for critical function density
    const criticalDensity = criticalFunctions.length / Math.max(stats.totalElements, 1);
    healthScore -= criticalDensity * 20;

    // Ensure score is within bounds
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    // Determine rating
    let healthRating: ProjectContext['executiveSummary']['healthRating'];
    if (healthScore >= 90) healthRating = 'excellent';
    else if (healthScore >= 75) healthRating = 'good';
    else if (healthScore >= 50) healthRating = 'fair';
    else if (healthScore >= 25) healthRating = 'poor';
    else healthRating = 'critical';

    // Generate insights
    const keyInsights: string[] = [];
    if (criticalFunctions.length > 10) {
      keyInsights.push(`High complexity concentration: ${criticalFunctions.length} critical functions identified`);
    }
    if (testGaps.length > 20) {
      keyInsights.push(`Significant test debt: ${testGaps.length} functions lack test coverage`);
    }
    if (asyncPatterns.length > 15) {
      keyInsights.push(`Heavy async usage: ${asyncPatterns.length} async functions - review concurrency patterns`);
    }
    if (stats.languages.length > 3) {
      keyInsights.push(`Multi-language codebase: ${stats.languages.length} languages detected - ensure consistent patterns`);
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (testGaps.length > 0) {
      recommendations.push('Prioritize test coverage for high-complexity functions');
    }
    if (criticalFunctions.some(cf => cf.dependents > 20)) {
      recommendations.push('Review heavily-dependent functions for refactoring opportunities');
    }
    if (asyncPatterns.length > 10) {
      recommendations.push('Audit async error handling and race condition risks');
    }
    if (healthScore < 50) {
      recommendations.push('Consider focused refactoring sprint to address technical debt');
    }

    return {
      projectHealthScore: healthScore,
      healthRating,
      keyInsights,
      recommendations,
    };
  }

  private generateRiskHeatMap(
    criticalFunctions: ProjectContext['criticalFunctions'],
    testGaps: ProjectContext['testGaps'],
    complexityData: Map<string, number>,
    projectPath: string
  ): ProjectContext['riskHeatMap'] {
    const riskAreas: ProjectContext['riskHeatMap'] = [];

    // Combine critical functions with test gaps for comprehensive risk view
    const allRiskyFunctions = new Map<string, { complexity: number; hasTests: boolean }>();

    // Add critical functions
    for (const cf of criticalFunctions) {
      allRiskyFunctions.set(cf.file, {
        complexity: cf.complexity,
        hasTests: !testGaps.some(tg => tg.file === cf.file && tg.name === cf.name),
      });
    }

    // Add high-complexity test gaps
    for (const tg of testGaps) {
      if (tg.complexity >= 8) {
        const existing = allRiskyFunctions.get(tg.file);
        if (!existing || tg.complexity > existing.complexity) {
          allRiskyFunctions.set(tg.file, {
            complexity: tg.complexity,
            hasTests: false,
          });
        }
      }
    }

    // Calculate risk scores
    for (const [file, data] of allRiskyFunctions) {
      // Risk formula: complexity × 5 + (no tests ? 30 : 0)
      let riskScore = data.complexity * 5;
      if (!data.hasTests) riskScore += 30;

      // Estimate test coverage (inverse of risk)
      const testCoverage = data.hasTests ? Math.max(20, 100 - data.complexity * 3) : 0;

      // Determine risk level
      let riskLevel: ProjectContext['riskHeatMap'][number]['riskLevel'];
      if (riskScore >= 80) riskLevel = 'critical';
      else if (riskScore >= 60) riskLevel = 'high';
      else if (riskScore >= 40) riskLevel = 'medium';
      else riskLevel = 'low';

      riskAreas.push({
        area: path.basename(file, path.extname(file)),
        file,
        complexity: data.complexity,
        testCoverage,
        riskScore: Math.min(100, riskScore),
        riskLevel,
      });
    }

    // Sort by risk score descending
    return riskAreas.sort((a, b) => b.riskScore - a.riskScore).slice(0, 20);
  }

  private generateWorkOrderPriorities(
    criticalFunctions: ProjectContext['criticalFunctions'],
    testGaps: ProjectContext['testGaps'],
    asyncPatterns: ProjectContext['asyncPatterns'],
    projectPath: string
  ): ProjectContext['workOrderPriorities'] {
    const priorities: ProjectContext['workOrderPriorities'] = [];
    let priority = 1;

    // Priority 1: Critical functions without tests
    for (const cf of criticalFunctions.slice(0, 10)) {
      const hasTest = !testGaps.some(tg => tg.name === cf.name);
      if (!hasTest && cf.complexity >= 10) {
        priorities.push({
          priority: priority++,
          type: 'testing',
          target: cf.name,
          file: cf.file,
          rationale: `Critical function (complexity ${cf.complexity}, ${cf.dependents} dependents) lacks test coverage`,
          estimatedEffort: cf.complexity > 15 ? 'large' : 'medium',
        });
      }
    }

    // Priority 2: High complexity async functions (concurrency risks)
    const highComplexityAsync = asyncPatterns
      .filter(ap => {
        const cf = criticalFunctions.find(cf => cf.name === ap.name);
        return cf && cf.complexity >= 12;
      })
      .slice(0, 5);

    for (const ap of highComplexityAsync) {
      const cf = criticalFunctions.find(cf => cf.name === ap.name);
      if (cf) {
        priorities.push({
          priority: priority++,
          type: 'refactoring',
          target: ap.name,
          file: ap.file,
          rationale: `Complex async function (complexity ${cf.complexity}) - review for race conditions and error handling`,
          estimatedEffort: 'medium',
        });
      }
    }

    // Priority 3: Functions with extreme dependency count
    const heavilyDepended = criticalFunctions
      .filter(cf => cf.dependents > 25)
      .slice(0, 3);

    for (const cf of heavilyDepended) {
      priorities.push({
        priority: priority++,
        type: 'refactoring',
        target: cf.name,
        file: cf.file,
        rationale: `Heavily depended upon (${cf.dependents} dependents) - changes will have wide impact`,
        estimatedEffort: 'large',
      });
    }

    // Priority 4: Remaining high-complexity test gaps
    for (const tg of testGaps.slice(0, 5)) {
      if (!priorities.some(p => p.target === tg.name)) {
        priorities.push({
          priority: priority++,
          type: 'testing',
          target: tg.name,
          file: tg.file,
          rationale: `High-complexity function (${tg.complexity}) lacks test coverage`,
          estimatedEffort: tg.complexity > 10 ? 'medium' : 'small',
        });
      }
    }

    return priorities.slice(0, 15);
  }

  private detectTechStack(
    files: Map<string, string[]>,
    elements: ElementData[],
    projectPath: string
  ): ProjectContext['techStack'] {
    const frameworks: string[] = [];
    const buildTools: string[] = [];
    const testFrameworks: string[] = [];
    const detectedPatterns: string[] = [];

    // Detect frameworks from file patterns and imports
    for (const [lang, filePaths] of files) {
      for (const filePath of filePaths) {
        const content = ''; // We don't have content here, use element patterns

        // React/Next.js patterns
        if (filePath.includes('react') || filePath.includes('jsx') || filePath.includes('tsx')) {
          if (!frameworks.includes('React')) frameworks.push('React');
        }
        if (filePath.includes('next')) {
          if (!frameworks.includes('Next.js')) frameworks.push('Next.js');
        }

        // Vue patterns
        if (filePath.includes('vue')) {
          if (!frameworks.includes('Vue')) frameworks.push('Vue');
        }

        // Angular patterns
        if (filePath.includes('angular')) {
          if (!frameworks.includes('Angular')) frameworks.push('Angular');
        }

        // Express/FastAPI patterns
        if (filePath.includes('express') || filePath.includes('route')) {
          if (!frameworks.includes('Express')) frameworks.push('Express');
        }

        // Build tools
        if (filePath.includes('webpack')) buildTools.push('Webpack');
        if (filePath.includes('vite')) buildTools.push('Vite');
        if (filePath.includes('rollup')) buildTools.push('Rollup');
        if (filePath.includes('esbuild')) buildTools.push('ESBuild');
        if (filePath.includes('turbopack')) buildTools.push('Turbopack');

        // Test frameworks
        if (filePath.includes('jest')) testFrameworks.push('Jest');
        if (filePath.includes('vitest')) testFrameworks.push('Vitest');
        if (filePath.includes('mocha')) testFrameworks.push('Mocha');
        if (filePath.includes('pytest')) testFrameworks.push('Pytest');
      }
    }

    // Detect patterns from elements
    const hasAsync = elements.some(e => 'async' in e && e.async);
    const hasClasses = elements.some(e => e.type === 'class');
    const hasInterfaces = elements.some(e => e.type === 'interface');
    const hasTypes = elements.some(e => e.type === 'type');

    if (hasAsync) detectedPatterns.push('Async/Await');
    if (hasClasses) detectedPatterns.push('OOP');
    if (hasInterfaces) detectedPatterns.push('Interface-based Design');
    if (hasTypes) detectedPatterns.push('Type Definitions');

    // Determine primary language
    let primaryLanguage = 'Unknown';
    const langCounts = new Map<string, number>();
    for (const [lang, filePaths] of files) {
      langCounts.set(lang, filePaths.length);
    }
    const sortedLangs = Array.from(langCounts.entries()).sort((a, b) => b[1] - a[1]);
    if (sortedLangs.length > 0) {
      primaryLanguage = sortedLangs[0][0];
    }

    return {
      primaryLanguage,
      frameworks: [...new Set(frameworks)],
      buildTools: [...new Set(buildTools)],
      testFrameworks: [...new Set(testFrameworks)],
      detectedPatterns: [...new Set(detectedPatterns)],
    };
  }

  /**
   * IMP-CORE-025: Extract call graph relationships between critical functions
   * Builds a graph showing which critical functions call which others
   * OPTIMIZED: O(n) using indexes instead of O(n²) nested loops
   */
  private extractCallGraph(
    state: PipelineState,
    criticalFunctions: ProjectContext['criticalFunctions']
  ): CallGraph {
    const nodes: CallGraphNode[] = criticalFunctions.map(cf => ({
      id: `${cf.file}:${cf.name}`,
      name: cf.name,
      file: cf.file,
      complexity: cf.complexity,
      dependents: cf.dependents
    }));

    const nodeIds = new Set(nodes.map(n => n.id));
    const edges: CallGraphEdge[] = [];

    // OPTIMIZATION 1: Build element lookup map for O(1) access
    const elementByNodeId = new Map<string, ElementData>();
    for (const elem of state.elements) {
      const nodeId = this.getElementId(elem);
      elementByNodeId.set(nodeId, elem);
      // Also add file:name format for compatibility
      elementByNodeId.set(`${elem.file}:${elem.name}`, elem);
    }

    // OPTIMIZATION 2: Build edge index by source for O(1) lookup
    const edgesBySource = new Map<string, typeof state.graph.edges>();
    for (const edge of state.graph.edges) {
      const list = edgesBySource.get(edge.source) || [];
      list.push(edge);
      edgesBySource.set(edge.source, list);
    }

    // OPTIMIZATION 3: Single pass through edges with O(1) lookups
    for (const edge of state.graph.edges) {
      const sourceElem = elementByNodeId.get(edge.source);
      if (!sourceElem) continue;

      const sourceId = `${sourceElem.file}:${sourceElem.name}`;
      if (!nodeIds.has(sourceId)) continue;

      // Get outgoing edges from this source (O(1) lookup)
      const outgoingEdges = edgesBySource.get(edge.source) || [];
      for (const targetEdge of outgoingEdges) {
        const targetElem = elementByNodeId.get(targetEdge.target);
        if (!targetElem) continue;

        const targetId = `${targetElem.file}:${targetElem.name}`;
        if (targetId !== sourceId && nodeIds.has(targetId)) {
          const callType = this.determineCallTypeFast(targetElem, targetEdge);
          edges.push({
            source: sourceId,
            target: targetId,
            callType
          });
        }
      }
    }

    // Detect circular chains
    const circularChains = this.detectCircularChains(edges, nodes);

    return { nodes, edges, circularChains };
  }

  /**
   * Fast call type determination using pre-resolved element
   */
  private determineCallTypeFast(
    targetElem: ElementData,
    edge: PipelineState['graph']['edges'][number]
  ): 'sync' | 'async' | 'callback' {
    if (targetElem.async) return 'async';
    if (edge.type?.includes('callback') || edge.metadata?.callType === 'callback') {
      return 'callback';
    }
    return 'sync';
  }

  /**
   * Detect circular call chains (A -> B -> C -> A)
   * OPTIMIZED: Single DFS pass with shared state, limited depth
   */
  private detectCircularChains(
    edges: CallGraphEdge[],
    nodes: CallGraphNode[]
  ): string[][] {
    const chains: string[][] = [];
    const adjacency = new Map<string, string[]>();

    // Build adjacency list
    for (const edge of edges) {
      const neighbors = adjacency.get(edge.source) || [];
      neighbors.push(edge.target);
      adjacency.set(edge.source, neighbors);
    }

    // Limit search depth to prevent exponential explosion
    const MAX_DEPTH = 10;
    const foundCycles = new Set<string>(); // Deduplicate cycles

    // Single DFS from each unvisited node
    const globalVisited = new Set<string>();

    for (const startNode of nodes) {
      if (globalVisited.has(startNode.id)) continue;

      const path: string[] = [];
      const pathSet = new Set<string>();

      const dfs = (node: string): void => {
        if (pathSet.has(node)) {
          // Found a cycle - extract it
          const cycleStart = path.indexOf(node);
          const cycle = path.slice(cycleStart);
          const cycleKey = cycle.join('→');
          if (!foundCycles.has(cycleKey)) {
            foundCycles.add(cycleKey);
            chains.push(cycle);
          }
          return;
        }

        if (globalVisited.has(node) || path.length >= MAX_DEPTH) {
          return;
        }

        path.push(node);
        pathSet.add(node);
        globalVisited.add(node);

        const neighbors = adjacency.get(node) || [];
        for (const neighbor of neighbors) {
          dfs(neighbor);
        }

        path.pop();
        pathSet.delete(node);
      };

      dfs(startNode.id);
    }

    return chains;
  }

  /**
   * IMP-CORE-026: Analyze dependency risks
   * Detects outdated packages, vulnerabilities, circular imports, and unused dependencies
   */
  private async analyzeDependencyRisks(state: PipelineState): Promise<DependencyRiskAnalysis> {
    const risks: DependencyRisk[] = [];

    // Read package.json if available
    const packageJson = await this.loadPackageJson(state.projectPath);
    const totalDeps = packageJson
      ? Object.keys(packageJson.dependencies || {}).length +
        Object.keys(packageJson.devDependencies || {}).length
      : 0;
    const directDeps = packageJson
      ? Object.keys(packageJson.dependencies || {}).length
      : 0;
    const devDeps = packageJson
      ? Object.keys(packageJson.devDependencies || {}).length
      : 0;

    // Detect circular imports from graph
    const circularImportRisks = this.detectCircularImportRisks(state);
    risks.push(...circularImportRisks);

    // Detect unused dependencies (if package.json exists)
    const unusedRisks = this.detectUnusedDependencies(state, packageJson);
    risks.push(...unusedRisks);

    // Detect potentially outdated dependencies by version patterns
    const outdatedRisks = this.detectOutdatedDependencies(packageJson);
    risks.push(...outdatedRisks);

    // Calculate risk score
    const riskScore = this.calculateDependencyRiskScore(risks, totalDeps);
    const riskLevel = this.getRiskLevel(riskScore);

    return {
      totalDependencies: totalDeps,
      directDependencies: directDeps,
      devDependencies: devDeps,
      riskScore,
      riskLevel,
      risks,
      summary: {
        outdatedCount: risks.filter(r => r.type === 'outdated').length,
        vulnerabilityCount: risks.filter(r => r.type === 'vulnerability').length,
        circularImportCount: risks.filter(r => r.type === 'circular-import').length,
        unusedCount: risks.filter(r => r.type === 'unused').length,
        highChurnCount: risks.filter(r => r.type === 'high-churn').length,
      },
    };
  }

  /**
   * Load package.json from project root
   */
  private async loadPackageJson(projectPath: string): Promise<{ dependencies?: Record<string, string>; devDependencies?: Record<string, string> } | null> {
    try {
      const packagePath = path.join(projectPath, 'package.json');
      const content = await fs.readFile(packagePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Detect circular import risks from graph edges
   */
  private detectCircularImportRisks(state: PipelineState): DependencyRisk[] {
    const risks: DependencyRisk[] = [];
    const fileImports = new Map<string, Set<string>>();

    // Build import graph from edges
    for (const edge of state.graph.edges) {
      if (edge.type === 'import' || edge.type === 'dependency') {
        const sourceFile = edge.source.replace(/^file:/, '');
        const targetFile = edge.target.replace(/^file:/, '');

        if (!fileImports.has(sourceFile)) {
          fileImports.set(sourceFile, new Set());
        }
        fileImports.get(sourceFile)!.add(targetFile);
      }
    }

    // Detect simple circular imports (A -> B -> A)
    for (const [file, imports] of fileImports.entries()) {
      for (const importedFile of imports) {
        const importedFileImports = fileImports.get(importedFile);
        if (importedFileImports && importedFileImports.has(file)) {
          // Found circular import
          const riskKey = `${file}<->${importedFile}`;
          if (!risks.find(r => r.name === riskKey)) {
            risks.push({
              name: riskKey,
              version: 'N/A',
              severity: 'medium',
              type: 'circular-import',
              description: `Circular import detected between ${path.basename(file)} and ${path.basename(importedFile)}`,
              recommendation: 'Refactor to break circular dependency - consider dependency injection or moving shared code to a separate module',
              affectedFiles: [file, importedFile],
            });
          }
        }
      }
    }

    return risks;
  }

  /**
   * Detect potentially unused dependencies
   */
  private detectUnusedDependencies(
    state: PipelineState,
    packageJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } | null
  ): DependencyRisk[] {
    const risks: DependencyRisk[] = [];
    if (!packageJson?.dependencies) return risks;

    // Get all imported modules from elements
    const importedModules = new Set<string>();
    for (const element of state.elements) {
      if (element.imports) {
        for (const imp of element.imports) {
          // Extract package name from import source
          const pkgName = imp.source.split('/')[0];
          if (!imp.source.startsWith('.') && !imp.source.startsWith('/')) {
            importedModules.add(pkgName);
          }
        }
      }
    }

    // Check each dependency
    for (const [depName, version] of Object.entries(packageJson.dependencies)) {
      // Skip common toolchain deps that may not be directly imported
      const toolchainDeps = ['typescript', 'eslint', 'prettier', 'jest', 'vitest', '@types'];
      if (toolchainDeps.some(t => depName.includes(t))) continue;

      if (!importedModules.has(depName)) {
        risks.push({
          name: depName,
          version,
          severity: 'low',
          type: 'unused',
          description: `Dependency '${depName}' is declared but may not be imported in source code`,
          recommendation: 'Verify if dependency is truly unused and can be removed',
        });
      }
    }

    return risks;
  }

  /**
   * Detect potentially outdated dependencies by version patterns
   */
  private detectOutdatedDependencies(
    packageJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } | null
  ): DependencyRisk[] {
    const risks: DependencyRisk[] = [];
    if (!packageJson) return risks;

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const [depName, version] of Object.entries(allDeps)) {
      // Check for very outdated version patterns
      const versionMatch = version.match(/^(\^|~)?(\d+)\./);
      if (versionMatch) {
        const majorVersion = parseInt(versionMatch[2], 10);

        // Flag dependencies with very old major versions (heuristic)
        // This is a simplified check - real implementation would query npm registry
        if (majorVersion < 1 && !version.startsWith('0.')) {
          // Pre-1.0 might indicate unstable or abandoned
          risks.push({
            name: depName,
            version,
            severity: 'low',
            type: 'outdated',
            description: `Dependency '${depName}' is at major version 0 which may indicate instability`,
            recommendation: 'Consider upgrading to a stable 1.x version if available',
          });
        }
      }

      // Check for explicit old versions (no semver prefix)
      if (version.match(/^\d+\.\d+\.\d+$/) && !version.startsWith('0.')) {
        // Pinned version - might be outdated
        // Real implementation would compare with latest from npm
      }
    }

    return risks;
  }

  /**
   * Calculate overall dependency risk score (0-100)
   */
  private calculateDependencyRiskScore(risks: DependencyRisk[], totalDeps: number): number {
    if (totalDeps === 0) return 0;

    const severityWeights = {
      critical: 25,
      high: 10,
      medium: 5,
      low: 1,
    };

    const totalWeight = risks.reduce((sum, risk) => sum + severityWeights[risk.severity], 0);
    const maxPossibleWeight = totalDeps * 10; // Assume max 10 points per dependency

    return Math.min(100, Math.round((totalWeight / maxPossibleWeight) * 100));
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  /**
   * IMP-CORE-017: Analyze architecture patterns in the codebase
   * Detects MVC, MVVM, Layered, Hexagonal, Microservices, Feature-based, and Repository patterns
   */
  private analyzeArchitecture(
    state: PipelineState,
    moduleStructure: ProjectContext['moduleStructure']
  ): ArchitectureAnalysis {
    const detectedPatterns: ArchitecturePattern[] = [];

    // Detect Layered Architecture (controllers/services/repositories/models)
    const layeredPattern = this.detectLayeredArchitecture(moduleStructure);
    if (layeredPattern) detectedPatterns.push(layeredPattern);

    // Detect Feature-based Organization (features/ or modules/ directories)
    const featurePattern = this.detectFeatureBasedArchitecture(moduleStructure);
    if (featurePattern) detectedPatterns.push(featurePattern);

    // Detect MVC/MVVM from file naming and structure
    const mvcPattern = this.detectMVCPatterns(state.elements, moduleStructure);
    if (mvcPattern) detectedPatterns.push(mvcPattern);

    // Detect Repository Pattern from class/file naming
    const repositoryPattern = this.detectRepositoryPattern(state.elements);
    if (repositoryPattern) detectedPatterns.push(repositoryPattern);

    // Detect Hexagonal/Ports-Adapters from directory structure
    const hexagonalPattern = this.detectHexagonalArchitecture(moduleStructure);
    if (hexagonalPattern) detectedPatterns.push(hexagonalPattern);

    // Detect Microservices from service boundaries in code
    const microservicesPattern = this.detectMicroservices(state.elements, moduleStructure);
    if (microservicesPattern) detectedPatterns.push(microservicesPattern);

    // Determine organization type
    const organization = this.determineOrganizationType(moduleStructure, detectedPatterns);

    // Calculate coupling and cohesion
    const coupling = this.assessCoupling(state.graph, state.elements.length);
    const cohesion = this.assessCohesion(moduleStructure, detectedPatterns);

    // Generate recommendations
    const recommendations = this.generateArchitectureRecommendations(detectedPatterns, coupling, cohesion);

    // Determine primary pattern (highest confidence)
    const primaryPattern = detectedPatterns.length > 0
      ? detectedPatterns.sort((a, b) => b.confidence - a.confidence)[0].pattern
      : undefined;

    return {
      detectedPatterns,
      primaryPattern,
      organization,
      coupling,
      cohesion,
      recommendations,
    };
  }

  /**
   * Detect Layered Architecture pattern
   */
  private detectLayeredArchitecture(
    moduleStructure: ProjectContext['moduleStructure']
  ): ArchitecturePattern | null {
    const layers = ['controllers', 'services', 'repositories', 'models', 'entities', 'dto', 'dao'];
    const foundLayers: string[] = [];
    const locations: string[] = [];

    for (const [dir, count] of Object.entries(moduleStructure)) {
      const dirLower = dir.toLowerCase();
      for (const layer of layers) {
        if (dirLower.includes(layer)) {
          foundLayers.push(layer);
          locations.push(dir);
          break;
        }
      }
    }

    if (foundLayers.length >= 2) {
      return {
        pattern: 'layered',
        confidence: Math.min(0.9, 0.5 + foundLayers.length * 0.15),
        evidence: [`Found ${foundLayers.length} distinct layers: ${foundLayers.join(', ')}`],
        locations,
      };
    }

    return null;
  }

  /**
   * Detect Feature-based Architecture
   */
  private detectFeatureBasedArchitecture(
    moduleStructure: ProjectContext['moduleStructure']
  ): ArchitecturePattern | null {
    const featureDirs = ['features', 'modules', 'domains', 'components', 'pages', 'screens'];
    const foundFeatures: string[] = [];

    for (const [dir, count] of Object.entries(moduleStructure)) {
      const dirLower = dir.toLowerCase();
      for (const featureDir of featureDirs) {
        if (dirLower === featureDir || dirLower.startsWith(featureDir + '/')) {
          foundFeatures.push(dir);
          break;
        }
      }
    }

    if (foundFeatures.length > 0) {
      return {
        pattern: 'feature-based',
        confidence: foundFeatures.length >= 2 ? 0.85 : 0.7,
        evidence: [`Found ${foundFeatures.length} feature-based directories: ${foundFeatures.join(', ')}`],
        locations: foundFeatures,
      };
    }

    return null;
  }

  /**
   * Detect MVC/MVVM patterns from element naming and structure
   */
  private detectMVCPatterns(
    elements: ElementData[],
    moduleStructure: ProjectContext['moduleStructure']
  ): ArchitecturePattern | null {
    let controllers = 0;
    let models = 0;
    let views = 0;
    let viewModels = 0;
    const locations: string[] = [];

    for (const element of elements) {
      const name = element.name.toLowerCase();
      if (name.includes('controller') || name.endsWith('ctrl')) {
        controllers++;
        if (!locations.includes('controllers')) locations.push('controllers');
      }
      if (name.includes('model') && !name.includes('schema')) {
        models++;
        if (!locations.includes('models')) locations.push('models');
      }
      if (name.includes('view') && !name.includes('preview')) {
        views++;
        if (!locations.includes('views')) locations.push('views');
      }
      if (name.includes('viewmodel') || name.endsWith('vm')) {
        viewModels++;
        if (!locations.includes('viewmodels')) locations.push('viewmodels');
      }
    }

    // Check directory structure too
    for (const dir of Object.keys(moduleStructure)) {
      const dirLower = dir.toLowerCase();
      if (dirLower.includes('controller') && !locations.includes(dir)) locations.push(dir);
      if (dirLower.includes('model') && !locations.includes(dir)) locations.push(dir);
      if (dirLower.includes('view') && !locations.includes(dir)) locations.push(dir);
    }

    if (controllers > 0 && models > 0) {
      const isMVVM = viewModels > 0 || (controllers === 0 && views > 0);
      return {
        pattern: isMVVM ? 'mvvm' : 'mvc',
        confidence: Math.min(0.9, 0.6 + (controllers + models + (isMVVM ? viewModels : views)) * 0.05),
        evidence: [
          `Found ${controllers} controllers`,
          `Found ${models} models`,
          isMVVM ? `Found ${viewModels} view models` : `Found ${views} views`,
        ],
        locations,
      };
    }

    return null;
  }

  /**
   * Detect Repository Pattern
   */
  private detectRepositoryPattern(elements: ElementData[]): ArchitecturePattern | null {
    const repositories: string[] = [];
    const locations: string[] = [];

    for (const element of elements) {
      const name = element.name.toLowerCase();
      if (name.includes('repository') || name.endsWith('repo')) {
        repositories.push(element.name);
        const dir = path.dirname(element.file);
        if (!locations.includes(dir)) locations.push(dir);
      }
    }

    if (repositories.length >= 2) {
      return {
        pattern: 'repository',
        confidence: Math.min(0.9, 0.6 + repositories.length * 0.08),
        evidence: [`Found ${repositories.length} repository implementations: ${repositories.slice(0, 3).join(', ')}${repositories.length > 3 ? '...' : ''}`],
        locations,
      };
    }

    return null;
  }

  /**
   * Detect Hexagonal/Ports-Adapters Architecture
   */
  private detectHexagonalArchitecture(
    moduleStructure: ProjectContext['moduleStructure']
  ): ArchitecturePattern | null {
    const hexagonalDirs = ['domain', 'application', 'infrastructure', 'ports', 'adapters'];
    const foundDirs: string[] = [];
    const locations: string[] = [];

    for (const [dir, count] of Object.entries(moduleStructure)) {
      const dirLower = dir.toLowerCase();
      for (const hexDir of hexagonalDirs) {
        if (dirLower.includes(hexDir)) {
          foundDirs.push(hexDir);
          locations.push(dir);
          break;
        }
      }
    }

    if (foundDirs.length >= 3) {
      return {
        pattern: 'hexagonal',
        confidence: Math.min(0.9, 0.5 + foundDirs.length * 0.15),
        evidence: [`Found ${foundDirs.length} hexagonal architecture layers: ${foundDirs.join(', ')}`],
        locations,
      };
    }

    return null;
  }

  /**
   * Detect Microservices patterns
   */
  private detectMicroservices(
    elements: ElementData[],
    moduleStructure: ProjectContext['moduleStructure']
  ): ArchitecturePattern | null {
    const serviceCount = Object.keys(moduleStructure).filter(dir =>
      dir.toLowerCase().includes('service') ||
      dir.toLowerCase().includes('api') ||
      dir.toLowerCase().includes('gateway')
    ).length;

    const hasServiceFiles = elements.filter(e =>
      e.name.toLowerCase().includes('service') &&
      (e.type === 'class' || e.type === 'interface')
    ).length;

    // Check for microservice indicators in package.json would need async, simplified here
    const hasMultipleEntryPoints = Object.keys(moduleStructure).length >= 5;

    if (serviceCount >= 3 || (hasServiceFiles >= 5 && hasMultipleEntryPoints)) {
      return {
        pattern: 'microservices',
        confidence: serviceCount >= 3 ? 0.75 : 0.6,
        evidence: [
          `Found ${serviceCount} service directories`,
          `Found ${hasServiceFiles} service class implementations`,
          hasMultipleEntryPoints ? 'Multiple entry points detected (potential service boundaries)' : null,
        ].filter(Boolean) as string[],
        locations: Object.keys(moduleStructure).filter(dir =>
          dir.toLowerCase().includes('service') ||
          dir.toLowerCase().includes('api')
        ),
      };
    }

    return null;
  }

  /**
   * Determine organization type based on patterns and structure
   */
  private determineOrganizationType(
    moduleStructure: ProjectContext['moduleStructure'],
    patterns: ArchitecturePattern[]
  ): ArchitectureAnalysis['organization'] {
    const hasFeaturePattern = patterns.some(p => p.pattern === 'feature-based');
    const hasLayeredPattern = patterns.some(p => p.pattern === 'layered');

    if (hasFeaturePattern && !hasLayeredPattern) return 'feature-based';
    if (hasLayeredPattern && !hasFeaturePattern) return 'layered';
    if (hasFeaturePattern && hasLayeredPattern) return 'mixed';

    // Check directory depth and naming
    const dirs = Object.keys(moduleStructure);
    const hasDeepStructure = dirs.some(d => d.split('/').length > 2);

    if (hasDeepStructure) return 'layered';
    if (dirs.length <= 3) return 'unclear';

    return 'mixed';
  }

  /**
   * Assess coupling level based on graph density
   */
  private assessCoupling(
    graph: PipelineState['graph'],
    elementCount: number
  ): ArchitectureAnalysis['coupling'] {
    const edgeCount = graph.edges.length;
    if (elementCount === 0) return 'low';

    // Calculate density ratio
    const maxPossibleEdges = elementCount * (elementCount - 1);
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

    if (density > 0.5) return 'high';
    if (density > 0.25) return 'medium';
    return 'low';
  }

  /**
   * Assess cohesion based on pattern consistency
   */
  private assessCohesion(
    moduleStructure: ProjectContext['moduleStructure'],
    patterns: ArchitecturePattern[]
  ): ArchitectureAnalysis['cohesion'] {
    const hasConsistentPattern = patterns.some(p => p.confidence > 0.8);
    const moduleCount = Object.keys(moduleStructure).length;

    if (hasConsistentPattern && moduleCount <= 10) return 'high';
    if (hasConsistentPattern || moduleCount <= 15) return 'medium';
    return 'low';
  }

  /**
   * Generate architecture recommendations
   */
  private generateArchitectureRecommendations(
    patterns: ArchitecturePattern[],
    coupling: ArchitectureAnalysis['coupling'],
    cohesion: ArchitectureAnalysis['cohesion']
  ): string[] {
    const recommendations: string[] = [];

    if (coupling === 'high') {
      recommendations.push('Consider reducing coupling between modules - high interdependence detected');
    }

    if (cohesion === 'low') {
      recommendations.push('Review module organization - low cohesion suggests mixed responsibilities');
    }

    if (patterns.length === 0) {
      recommendations.push('No clear architectural pattern detected - consider adopting a documented architecture');
    } else if (patterns.length > 3) {
      recommendations.push('Multiple patterns detected - ensure intentional hybrid architecture');
    }

    // Pattern-specific recommendations
    const hasRepository = patterns.some(p => p.pattern === 'repository');
    const hasLayered = patterns.some(p => p.pattern === 'layered');

    if (hasLayered && !hasRepository) {
      recommendations.push('Consider adding Repository pattern for better data access abstraction');
    }

    return recommendations;
  }

  private analyzeModuleStructure(
    files: Map<string, string[]>,
    projectPath: string
  ): ProjectContext['moduleStructure'] {
    const structure: { [key: string]: number } = {};

    for (const filePaths of files.values()) {
      filePaths.forEach(filePath => {
        const relativePath = path.relative(projectPath, filePath).replace(/\\/g, '/');
        const dir = path.dirname(relativePath);
        const topLevel = dir.split('/')[0] || 'root';

        structure[topLevel] = (structure[topLevel] || 0) + 1;
      });
    }

    return structure;
  }

  private generateMarkdown(context: ProjectContext, state: PipelineState): string {
    const lines = [
      `# Project Context`,
      '',
      `## Statistics`,
      '',
      `- **Total Files:** ${context.stats.totalFiles}`,
      `- **Total Elements:** ${context.stats.totalElements}`,
      `- **Total Lines:** ${context.stats.totalLines}`,
      `- **Languages:** ${context.stats.languages.join(', ')}`,
      '',
    ];

    // IMP-CORE-028: Add incremental scan stats if available
    if (state.metadata.incremental?.enabled) {
      const inc = state.metadata.incremental;
      lines.push(
        `### Incremental Scan Performance`,
        '',
        `- **Files Scanned:** ${state.metadata.filesScanned}`,
        `- **Files Skipped (Cached):** ${inc.filesSkipped}`,
        `- **Cache Hit Ratio:** ${(inc.hitRatio * 100).toFixed(1)}%`,
        `- **Performance Gain:** ~${(inc.hitRatio * 100).toFixed(0)}% faster`,
        ''
      );
    }

    // IMP-CORE-016: Add project classification
    const pc = context.projectClassification;
    lines.push(
      '',
      `## Project Classification`,
      '',
      `- **Category:** ${pc.category}${pc.subtype ? ` (${pc.subtype})` : ''}`,
      `- **Confidence:** ${(pc.confidence * 100).toFixed(0)}%`,
      `- **Purpose:** ${pc.purpose}`,
      ''
    );

    if (pc.indicators.length > 0) {
      lines.push(`### Detection Indicators`, '');
      pc.indicators.forEach(ind => {
        lines.push(`- ${ind}`);
      });
      lines.push('');
    }

    if (pc.useCases.length > 0) {
      lines.push(`### Suggested Use Cases`, '');
      pc.useCases.forEach(useCase => {
        lines.push(`- ${useCase}`);
      });
      lines.push('');
    }

    // IMP-CORE-017: Add architecture analysis
    const arch = context.architecture;
    lines.push(
      '',
      `## Architecture Analysis`,
      '',
      `- **Primary Pattern:** ${arch.primaryPattern ? arch.primaryPattern.toUpperCase() : 'Unknown'}`,
      `- **Organization:** ${arch.organization}`,
      `- **Coupling:** ${arch.coupling}`,
      `- **Cohesion:** ${arch.cohesion}`,
      `- **Patterns Detected:** ${arch.detectedPatterns.length}`,
      ''
    );

    if (arch.detectedPatterns.length > 0) {
      lines.push('### Detected Patterns', '');
      arch.detectedPatterns.forEach(pattern => {
        const confidencePct = (pattern.confidence * 100).toFixed(0);
        lines.push(`- **${pattern.pattern.toUpperCase()}** (${confidencePct}% confidence)`);
        pattern.evidence.forEach(ev => {
          lines.push(`  - ${ev}`);
        });
        if (pattern.locations.length > 0) {
          lines.push(`  - Locations: ${pattern.locations.slice(0, 3).join(', ')}${pattern.locations.length > 3 ? '...' : ''}`);
        }
      });
      lines.push('');
    }

    if (arch.recommendations.length > 0) {
      lines.push('### Architecture Recommendations', '');
      arch.recommendations.forEach(rec => {
        lines.push(`- ${rec}`);
      });
      lines.push('');
    }

    // IMP-CORE-019: Configuration Analysis
    const cfg = context.configAnalysis;
    if (cfg.packageJson || cfg.tsconfig || cfg.dockerfile || cfg.dockerCompose || cfg.workflows.length > 0 || cfg.envFiles.length > 0) {
      lines.push(
        '',
        `## Configuration Analysis`,
        ''
      );

      if (cfg.packageJson) {
        lines.push(
          `### Package.json`,
          '',
          `- **Name:** ${cfg.packageJson.name}@${cfg.packageJson.version}`,
          `- **Type:** ${cfg.packageJson.type}`,
          `- **Dependencies:** ${cfg.packageJson.dependencies.length} production, ${cfg.packageJson.devDependencies.length} dev`,
          `- **Workspaces:** ${cfg.packageJson.hasWorkspaces ? 'Yes' : 'No'}`,
          ''
        );
      }

      if (cfg.tsconfig) {
        lines.push(
          `### TypeScript Configuration`,
          '',
          `- **Target:** ${cfg.tsconfig.compilerOptions.target || 'ES2020'}`,
          `- **Module:** ${cfg.tsconfig.compilerOptions.module || 'commonjs'}`,
          `- **Strict Mode:** ${cfg.tsconfig.compilerOptions.strict ? 'Yes' : 'No'}`,
          `- **Path Mapping:** ${cfg.tsconfig.hasPathMapping ? 'Yes' : 'No'}`,
          `- **Monorepo:** ${cfg.tsconfig.isMonorepo ? 'Yes' : 'No'}`,
          ''
        );
      }

      if (cfg.dockerfile) {
        lines.push(
          `### Dockerfile`,
          '',
          `- **Stages:** ${cfg.dockerfile.totalStages} (${cfg.dockerfile.isMultiStage ? 'Multi-stage' : 'Single-stage'})`,
          `- **Final Image:** ${cfg.dockerfile.finalImage}`,
          `- **Exposed Ports:** ${cfg.dockerfile.exposedPorts.join(', ') || 'None'}`,
          `- **Health Check:** ${cfg.dockerfile.hasHealthCheck ? 'Yes' : 'No'}`,
          ''
        );
      }

      if (cfg.dockerCompose) {
        lines.push(
          `### Docker Compose`,
          '',
          `- **Version:** ${cfg.dockerCompose.version}`,
          `- **Services:** ${cfg.dockerCompose.totalServices}`,
          `- **Networks:** ${cfg.dockerCompose.hasCustomNetworks ? 'Custom' : 'Default'}`,
          `- **External Volumes:** ${cfg.dockerCompose.hasExternalVolumes ? 'Yes' : 'No'}`,
          ''
        );

        if (cfg.dockerCompose.services.length > 0) {
          lines.push('#### Services:', '');
          cfg.dockerCompose.services.forEach(svc => {
            lines.push(`- **${svc.name}**${svc.image ? ` (image: ${svc.image})` : ''}`);
            if (svc.ports.length > 0) lines.push(`  - Ports: ${svc.ports.join(', ')}`);
            if (svc.dependsOn.length > 0) lines.push(`  - Depends on: ${svc.dependsOn.join(', ')}`);
          });
          lines.push('');
        }
      }

      if (cfg.workflows.length > 0) {
        lines.push(
          `### GitHub Actions Workflows`,
          '',
          `- **Total Workflows:** ${cfg.workflows.length}`,
          `- **Total Jobs:** ${cfg.workflows.reduce((sum, w) => sum + w.totalJobs, 0)}`,
          ''
        );

        cfg.workflows.forEach(workflow => {
          lines.push(`- **${workflow.name}** (${workflow.file})`);
          lines.push(`  - Triggers: ${workflow.triggers.join(', ')}`);
          lines.push(`  - Jobs: ${workflow.totalJobs}`);
          if (workflow.hasSecrets) lines.push(`  - Uses secrets: Yes`);
          if (workflow.hasMatrix) lines.push(`  - Matrix strategy: Yes`);
        });
        lines.push('');
      }

      if (cfg.envFiles.length > 0) {
        lines.push(
          `### Environment Files`,
          '',
          `- **Files:** ${cfg.envFiles.length}`,
          `- **Total Variables:** ${cfg.envFiles.reduce((sum, f) => sum + f.count, 0)}`,
          ''
        );

        cfg.envFiles.forEach(env => {
          lines.push(`- **${env.file}** (${env.count} variables)`);
          if (env.hasDatabaseUrl) lines.push(`  - Contains DATABASE_URL`);
          if (env.hasApiKeys) lines.push(`  - Contains API keys`);
          if (env.hasSecrets) lines.push(`  - Contains secrets/tokens`);
        });
        lines.push('');
      }
    }

    lines.push('', `## Entry Points`, '');
    lines.push(`Found ${context.entryPoints.length} application entry points. Primary entry point is marked with ⭐.`, '');

    context.entryPoints.forEach(ep => {
      const primary = ep.isPrimary ? '⭐ ' : '';
      const exported = ep.exported ? ' (exported)' : '';
      lines.push(`- **${primary}${ep.name}** [${ep.type}]${exported}`);
      lines.push(`  - File: ${ep.file}`);
      lines.push(`  - ${ep.description}`);
    });

    lines.push('', `## Critical Functions`, '');

    context.criticalFunctions.forEach(cf => {
      lines.push(`- **${cf.name}** - Complexity: ${cf.complexity}, Dependents: ${cf.dependents}`);
      lines.push(`  - File: ${cf.file}`);
    });

    // IMP-CORE-025: Call graph relationships for planning
    if (context.callGraph.edges.length > 0) {
      lines.push('', `## Call Graph Relationships`, '');
      lines.push(`Found ${context.callGraph.nodes.length} critical functions with ${context.callGraph.edges.length} call relationships.`);
      lines.push('');

      // Group edges by source for readability
      const edgesBySource = new Map<string, CallGraphEdge[]>();
      for (const edge of context.callGraph.edges) {
        const group = edgesBySource.get(edge.source) || [];
        group.push(edge);
        edgesBySource.set(edge.source, group);
      }

      edgesBySource.forEach((edges, sourceId) => {
        const sourceNode = context.callGraph.nodes.find(n => n.id === sourceId);
        if (sourceNode) {
          lines.push(`- **${sourceNode.name}** calls:`);
          edges.forEach(edge => {
            const targetNode = context.callGraph.nodes.find(n => n.id === edge.target);
            if (targetNode) {
              lines.push(`  - ${targetNode.name} (${edge.callType})`);
            }
          });
        }
      });

      // Show circular chains if any
      if (context.callGraph.circularChains.length > 0) {
        lines.push('', `⚠️ **Circular Dependencies Detected:**`);
        context.callGraph.circularChains.forEach((chain, idx) => {
          const names = chain.map(id => {
            const node = context.callGraph.nodes.find(n => n.id === id);
            return node?.name || id;
          });
          lines.push(`  ${idx + 1}. ${names.join(' → ')}`);
        });
      }
    }

    // IMP-CORE-026: Dependency Risk Analysis
    const dr = context.dependencyRisks;
    lines.push(
      '',
      `## Dependency Risk Analysis`,
      '',
      `- **Risk Level:** ${dr.riskLevel.toUpperCase()} (${dr.riskScore}/100)`,
      `- **Total Dependencies:** ${dr.totalDependencies} (${dr.directDependencies} direct, ${dr.devDependencies} dev)`,
      `- **Issues Found:** ${dr.risks.length} (${dr.summary.outdatedCount} outdated, ${dr.summary.vulnerabilityCount} vulnerabilities, ${dr.summary.circularImportCount} circular imports, ${dr.summary.unusedCount} potentially unused)`,
      ''
    );

    if (dr.risks.length > 0) {
      lines.push('### Risk Details');
      lines.push('');

      // Group by severity
      const critical = dr.risks.filter(r => r.severity === 'critical');
      const high = dr.risks.filter(r => r.severity === 'high');
      const medium = dr.risks.filter(r => r.severity === 'medium');
      const low = dr.risks.filter(r => r.severity === 'low');

      if (critical.length > 0) {
        lines.push('🔴 **Critical:**');
        critical.forEach(risk => {
          lines.push(`- **${risk.name}** (${risk.type}): ${risk.description}`);
          if (risk.recommendation) lines.push(`  - *Recommendation:* ${risk.recommendation}`);
        });
        lines.push('');
      }

      if (high.length > 0) {
        lines.push('🟠 **High:**');
        high.forEach(risk => {
          lines.push(`- **${risk.name}** (${risk.type}): ${risk.description}`);
          if (risk.recommendation) lines.push(`  - *Recommendation:* ${risk.recommendation}`);
        });
        lines.push('');
      }

      if (medium.length > 0) {
        lines.push('🟡 **Medium:**');
        medium.forEach(risk => {
          lines.push(`- **${risk.name}** (${risk.type}): ${risk.description}`);
          if (risk.recommendation) lines.push(`  - *Recommendation:* ${risk.recommendation}`);
        });
        lines.push('');
      }

      if (low.length > 0 && (critical.length + high.length + medium.length) < 5) {
        lines.push('🟢 **Low:**');
        low.slice(0, 10).forEach(risk => {
          lines.push(`- **${risk.name}** (${risk.type}): ${risk.description}`);
        });
        if (low.length > 10) {
          lines.push(`  - ... and ${low.length - 10} more low-severity items`);
        }
        lines.push('');
      }
    }

    // NEW: Async Patterns section for workorder awareness
    if (context.asyncPatterns.length > 0) {
      lines.push('', `## Async Patterns`, '');
      lines.push(`Found ${context.asyncPatterns.length} async functions/methods. Consider concurrency implications, error handling (Promise rejection, try/catch), and race conditions when planning features.`);
      lines.push('');

      context.asyncPatterns.forEach(ap => {
        lines.push(`- **${ap.name}** (${ap.type})`);
        lines.push(`  - File: ${ap.file}`);
      });
    }

    // NEW: Test Gaps section for workorder awareness
    if (context.testGaps.length > 0) {
      lines.push('', `## High-Priority Test Gaps`, '');
      lines.push(`Found ${context.testGaps.length} functions without test coverage. Prioritized by complexity and architectural importance.`);
      lines.push('');

      context.testGaps.forEach(tg => {
        lines.push(`- **${tg.name}** - Complexity: ${tg.complexity}`);
        lines.push(`  - File: ${tg.file}`);
      });
    }

    lines.push('', `## Module Structure`, '');

    Object.entries(context.moduleStructure)
      .sort(([, a], [, b]) => b - a)
      .forEach(([module, count]) => {
        lines.push(`- **${module}:** ${count} files`);
      });

    // IMP-CORE-024: Add enhanced AI planning sections
    lines.push(
      '',
      `## Executive Summary`,
      '',
      `**Project Health Score:** ${context.executiveSummary.projectHealthScore}/100 (${context.executiveSummary.healthRating.toUpperCase()})`,
      ''
    );

    if (context.executiveSummary.keyInsights.length > 0) {
      lines.push(`### Key Insights`, '');
      context.executiveSummary.keyInsights.forEach(insight => {
        lines.push(`- ${insight}`);
      });
      lines.push('');
    }

    if (context.executiveSummary.recommendations.length > 0) {
      lines.push(`### Recommendations`, '');
      context.executiveSummary.recommendations.forEach(rec => {
        lines.push(`- ${rec}`);
      });
      lines.push('');
    }

    if (context.riskHeatMap.length > 0) {
      lines.push(
        `## Risk Heat Map`,
        '',
        `Top ${context.riskHeatMap.length} high-risk areas by complexity × test coverage:`,
        ''
      );
      context.riskHeatMap.slice(0, 10).forEach(risk => {
        lines.push(`- **${risk.area}** (${risk.riskLevel.toUpperCase()}) - Risk Score: ${risk.riskScore}`);
        lines.push(`  - File: ${risk.file}`);
        lines.push(`  - Complexity: ${risk.complexity}, Estimated Coverage: ${risk.testCoverage}%`);
      });
      lines.push('');
    }

    if (context.workOrderPriorities.length > 0) {
      lines.push(
        `## Recommended Work Order Priorities`,
        '',
        `AI-generated priorities based on complexity, dependencies, and test gaps:`,
        ''
      );
      context.workOrderPriorities.slice(0, 10).forEach(wo => {
        lines.push(`${wo.priority}. **[${wo.type.toUpperCase()}]** ${wo.target}`);
        lines.push(`   - File: ${wo.file}`);
        lines.push(`   - Effort: ${wo.estimatedEffort}, Rationale: ${wo.rationale}`);
        lines.push('');
      });
    }

    // IMP-CORE-022: Documentation Quality
    const docs = context.documentation;
    lines.push(
      '',
      `## Documentation Quality`,
      '',
      `- **Overall Score:** ${docs.overallScore}/100 (${docs.qualityLevel.toUpperCase()})`,
      `- **Files Analyzed:** ${docs.totalFilesAnalyzed}`,
      `- **Average Comment Density:** ${(docs.averageCommentDensity * 100).toFixed(1)}%`,
      ''
    );

    // README analysis
    const readme = docs.readme;
    lines.push(
      `### README Analysis`,
      '',
      `- **Exists:** ${readme.exists ? 'Yes' : 'No'}`,
      `- **Completeness:** ${readme.completenessScore}% (${readme.presentSections}/${readme.totalSections} sections)`,
      `- **Quality:** ${readme.estimatedQuality.toUpperCase()}`,
      ''
    );

    if (readme.exists) {
      const checklist = [
        readme.hasInstallation && '✅ Installation',
        readme.hasUsage && '✅ Usage',
        readme.hasApiReference && '✅ API Reference',
        readme.hasContributing && '✅ Contributing',
        readme.hasLicense && '✅ License',
        readme.hasBadges && '✅ Badges',
      ].filter(Boolean);

      if (checklist.length > 0) {
        lines.push('**Key Sections Present:**', '');
        checklist.forEach(item => lines.push(`- ${item}`));
        lines.push('');
      }

      const missing = [
        !readme.hasInstallation && '❌ Installation',
        !readme.hasUsage && '❌ Usage',
        !readme.hasApiReference && '❌ API Reference',
        !readme.hasContributing && '❌ Contributing',
        !readme.hasLicense && '❌ License',
      ].filter(Boolean);

      if (missing.length > 0) {
        lines.push('**Missing Sections:**', '');
        missing.forEach(item => lines.push(`- ${item}`));
        lines.push('');
      }
    }

    // JSDoc Coverage
    const totalJSDocFiles = docs.jsdocCoverage.length;
    const avgJSDocCoverage = totalJSDocFiles > 0
      ? docs.jsdocCoverage.reduce((sum, jc) => sum + jc.coverageRatio, 0) / totalJSDocFiles
      : 0;

    lines.push(
      `### JSDoc/TSDoc Coverage`,
      '',
      `- **Files:** ${totalJSDocFiles}`,
      `- **Average Coverage:** ${(avgJSDocCoverage * 100).toFixed(1)}%`,
      ''
    );

    const lowCoverageFiles = docs.jsdocCoverage
      .filter(jc => jc.coverageRatio < 0.5)
      .slice(0, 5);

    if (lowCoverageFiles.length > 0) {
      lines.push('**Low Coverage Files:**', '');
      lowCoverageFiles.forEach(jc => {
        lines.push(`- ${jc.file}: ${(jc.coverageRatio * 100).toFixed(0)}% (${jc.documentedExports}/${jc.totalExports})`);
      });
      lines.push('');
    }

    // Changelog
    const changelog = docs.changelog;
    lines.push(
      `### Changelog`,
      '',
      `- **Exists:** ${changelog.exists ? 'Yes' : 'No'}`,
      changelog.exists && `- **Format:** ${changelog.format}`,
      changelog.exists && `- **Total Entries:** ${changelog.totalEntries}`,
      changelog.exists && `- **Last Updated:** ${changelog.daysSinceUpdate !== Infinity ? `${changelog.daysSinceUpdate} days ago` : 'Unknown'}`,
      changelog.exists && `- **Recency Score:** ${changelog.recencyScore}/100`,
      changelog.exists && `- **Has Unreleased Section:** ${changelog.hasUnreleasedSection ? 'Yes' : 'No'}`,
      ''
    );

    // API Docs
    const apiDocs = docs.apiDocs;
    lines.push(
      `### API Documentation`,
      '',
      `- **Has API Docs:** ${apiDocs.hasApiDocs ? 'Yes' : 'No'}`,
      apiDocs.hasApiDocs && `- **Location:** ${apiDocs.docsDirectory}`,
      apiDocs.hasApiDocs && `- **Format:** ${apiDocs.format}`,
      ''
    );

    // Recommendations
    if (docs.recommendations.length > 0) {
      lines.push(
        `### Documentation Recommendations`,
        ''
      );
      docs.recommendations.forEach(rec => {
        lines.push(`- ${rec}`);
      });
      lines.push('');
    }

    lines.push(
      `## Technology Stack`,
      '',
      `- **Primary Language:** ${context.techStack.primaryLanguage}`
    );
    if (context.techStack.frameworks.length > 0) {
      lines.push(`- **Frameworks:** ${context.techStack.frameworks.join(', ')}`);
    }
    if (context.techStack.buildTools.length > 0) {
      lines.push(`- **Build Tools:** ${context.techStack.buildTools.join(', ')}`);
    }
    if (context.techStack.testFrameworks.length > 0) {
      lines.push(`- **Test Frameworks:** ${context.techStack.testFrameworks.join(', ')}`);
    }
    if (context.techStack.detectedPatterns.length > 0) {
      lines.push(`- **Patterns:** ${context.techStack.detectedPatterns.join(', ')}`);
    }

    lines.push('', `## Generated`, '', new Date().toISOString());

    return lines.join('\n');
  }
}

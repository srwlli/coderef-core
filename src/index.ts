/**
 * CodeRef Core Module - Main export index
 * Combines Phase 3 (Analyzer) and Phase 5 (Context, Export, AI) components
 */

// Phase 3: Analyzer module
export * from './analyzer/index.js';

// Phase 5: Context module
export * from './context/index.js';

// Phase 5: Export module
export * from './export/index.js';

// Phase 5: Integration module
// export * from './integration/index.js'; // Temporarily disabled - missing AI dependencies

// Parser module
export * from './parser/parser.js';

// Query module
export * from './query/query-executor.js';

// Validator module - CodeRef2 reference validation
export * from './validator/validator.js';

// Route validation module - WO-ROUTE-VALIDATION-ENHANCEMENT-001
export {
  // Route normalization
  normalizeRoutePath,
  normalizeFlaskRoute,
  normalizeFastAPIRoute,
  normalizeExpressRoute,
  normalizeNextJsRoute,
  extractDynamicSegments
} from './validator/route-normalizer.js';
export type { NormalizedRoute } from './validator/route-normalizer.js';

export {
  // Route matching
  exactMatch,
  dynamicMatch,
  partialMatch,
  calculateMatchConfidence,
  findBestMatch,
  matchHttpMethods
} from './validator/route-matcher.js';
export type { RouteMatch } from './validator/route-matcher.js';

export {
  // Route validation
  loadFrontendCalls,
  loadServerRoutes,
  detectMissingRoutes,
  detectUnusedRoutes,
  detectMethodMismatches,
  classifyIssue,
  generateValidationReport,
  saveValidationReport
} from './validator/route-validator.js';

export {
  // Report generation
  formatIssueSummary,
  formatIssueDetails,
  formatRecommendations,
  formatAutoFixSection,
  generateMarkdownReport,
  saveMarkdownReport
} from './validator/report-generator.js';

// Migration validation (WO-MIGRATION-VALIDATION-001)
export {
  // Migration config validation
  validateMigrationConfig,
  checkRequiredFields,
  validateRegexPatterns,
  detectPathConflicts,
  checkDeprecatedAddedOverlap,
  // Path transformation
  applyMappings,
  applyExplicitMapping,
  applyPatternMapping,
  // Coverage analysis
  calculateMigrationCoverage,
  findUnmappedCalls,
  findDeprecatedCalls,
  groupCoverageByApiPrefix
} from './validator/migration-mapper.js';

export {
  // Migration validation
  loadMigrationMapping,
  validateMigration
} from './validator/route-validator.js';

// IMP-CORE-044: Frontend Update Generator - Automated API migration updates
export {
  // Confidence scoring
  getConfidenceLevel,
  calculatePathConfidence,
  CONFIDENCE_THRESHOLDS,
  // Batch processing
  generateUpdateSuggestions,
  batchProcessCalls,
  // File operations
  generateGitPatch,
  applyModifications,
  // Reporting
  generateUpdateReport,
  exportBatchResults
} from './validator/frontend-update-generator.js';
export type {
  ConfidenceLevel,
  FrontendUpdateSuggestion,
  BatchUpdateResult,
  GitPatch,
  FileModification
} from './validator/frontend-update-generator.js';

// Types module
export * from './types/types.js';

// Adapter module - Convert between scanner formats
export { convertGraphToElements, getConversionStats } from './adapter/graph-to-elements.js';
// export { mergeElements, getMergeStatistics } from './adapter/merge-scan-results.js';
// export type { ConversionOptions, MergeOptions, MergeResult } from './adapter/types.js';

/**
 * Scanner module - Regex-based code element scanning
 *
 * @example
 * ```typescript
 * import { scanCurrentElements, LANGUAGE_PATTERNS, DEFAULT_EXCLUDE_PATTERNS } from '@coderef/core';
 *
 * // Scan TypeScript files (uses DEFAULT_EXCLUDE_PATTERNS automatically)
 * const elements = await scanCurrentElements('./src', 'ts', {
 *   recursive: true
 * });
 *
 * // Scan multiple languages
 * const allElements = await scanCurrentElements('./src', ['ts', 'tsx', 'js', 'jsx']);
 *
 * // Access language patterns
 * const tsPatterns = LANGUAGE_PATTERNS.ts;
 *
 * // View default exclusions
 * console.log(DEFAULT_EXCLUDE_PATTERNS);
 * // Output: Array of glob patterns for excluded directories
 * ```
 *
 * @see {@link scanCurrentElements} - Main scanning function
 * @see {@link LANGUAGE_PATTERNS} - Pattern definitions by language
 * @see {@link DEFAULT_EXCLUDE_PATTERNS} - Default directory exclusions
 */
export { scanCurrentElements, LANGUAGE_PATTERNS, DEFAULT_EXCLUDE_PATTERNS } from './scanner/scanner.js';

/**
 * Error Reporting module - Structured error handling for scanner
 *
 * @example
 * ```typescript
 * import { createScanError, formatScanError, printScanErrors } from '@coderef/core';
 *
 * // Create structured error
 * try {
 *   fs.readFileSync(file, 'utf-8');
 * } catch (err) {
 *   const scanError = createScanError(err, file, 'read');
 *   console.error(formatScanError(scanError));
 * }
 * ```
 *
 * @see {@link createScanError} - Create structured error
 * @see {@link formatScanError} - Format error as string
 * @see {@link printScanErrors} - Print all errors from scan result
 */
export {
  createScanError,
  createScanErrorWithContext,
  formatScanError,
  printScanErrors,
  initScanStats,
  finalizeScanStats
} from './scanner/error-reporter.js';
export type {
  ScanError,
  ScanErrorType,
  ScanErrorSeverity,
  ScanStats,
  ScanResult
} from './scanner/error-reporter.js';

// Note: ScanOptions and ElementData are exported from ./types/types.js on line 28

/**
 * Configuration Presets module - Quick setup for common project types
 *
 * @example
 * ```typescript
 * import { loadPreset, detectPreset, applyPreset } from '@coderef/core';
 *
 * // Load a preset
 * const preset = loadPreset('react');
 * await scanCurrentElements('./src', preset.langs, { exclude: preset.exclude });
 *
 * // Auto-detect project type
 * const presets = detectPreset('./my-project');
 * console.log(presets); // ['nextjs', 'monorepo']
 *
 * // Apply preset with custom excludes
 * const config = applyPreset('nextjs', ['custom/**']);
 * ```
 *
 * @see {@link loadPreset} - Load preset by name
 * @see {@link detectPreset} - Auto-detect project type
 * @see {@link applyPreset} - Apply preset with custom excludes
 * @see {@link SCAN_PRESETS} - All available presets
 */
export {
  loadPreset,
  detectPreset,
  mergePresets,
  applyPreset,
  SCAN_PRESETS
} from './config/presets.js';
export type { ScanPreset } from './config/presets.js';

/**
 * File Generation module - Generate .coderef output files
 *
 * @example
 * ```typescript
 * import { saveIndex, generateContext, buildDependencyGraph } from '@coderef/core';
 *
 * // Scan and save
 * const elements = await scanCurrentElements('./src', ['ts', 'tsx']);
 * await saveIndex('./my-project', elements);
 *
 * // Generate context files
 * await generateContext('./my-project', elements);
 *
 * // Build dependency graph
 * const graph = await buildDependencyGraph('./my-project', elements);
 * ```
 *
 * @see {@link saveIndex} - Save scan results to index.json
 * @see {@link generateContext} - Generate context.json and context.md
 * @see {@link buildDependencyGraph} - Build dependency graph
 */
// Phase 1: Core file generation
export { saveIndex } from './fileGeneration/saveIndex.js';
export { generateContext } from './fileGeneration/generateContext.js';
export { buildDependencyGraph } from './fileGeneration/buildDependencyGraph.js';
export type { DependencyGraph, GraphNode, GraphEdge } from './fileGeneration/buildDependencyGraph.js';

// Phase 2: Analysis reports
export { detectPatterns } from './fileGeneration/detectPatterns.js';
export { analyzeCoverage } from './fileGeneration/analyzeCoverage.js';
export { validateReferences } from './fileGeneration/validateReferences.js';
export { detectDrift } from './fileGeneration/detectDrift.js';

// Phase 3: Diagrams
export { generateDiagrams } from './fileGeneration/generateDiagrams.js';

// Phase 4: Frontend Call Detection (WO-ROUTE-VALIDATION-ENHANCEMENT-001)
export {
  saveFrontendCalls,
  generateFrontendCallsOutput,
  countFrontendCalls,
  formatFrontendCallsOutput
} from './fileGeneration/saveFrontendCalls.js';
export type {
  FrontendCallElement,
  FrontendCallsOutput
} from './fileGeneration/saveFrontendCalls.js';

// Frontend Scanner - Attach frontend calls to elements or scan standalone
export {
  scanFileForFrontendCalls,
  attachFrontendCalls,
  scanProjectForFrontendCalls
} from './scanner/frontend-scanner.js';

// Pipeline module - Unified tree-sitter pipeline (WO-UNIFIED-CODEREF-PIPELINE-001)
export { PipelineOrchestrator } from './pipeline/orchestrator.js';
export { GrammarRegistry } from './pipeline/grammar-registry.js';
export { ElementExtractor } from './pipeline/extractors/element-extractor.js';
export { RelationshipExtractor } from './pipeline/extractors/relationship-extractor.js';

// Pipeline generators
export { IndexGenerator } from './pipeline/generators/index-generator.js';
export { GraphGenerator } from './pipeline/generators/graph-generator.js';
export { ComplexityGenerator } from './pipeline/generators/complexity-generator.js';
export { PatternGenerator } from './pipeline/generators/pattern-generator.js';
export { CoverageGenerator } from './pipeline/generators/coverage-generator.js';
export { DriftGenerator } from './pipeline/generators/drift-generator.js';
export { ValidationGenerator } from './pipeline/generators/validation-generator.js';
export { DiagramGenerator } from './pipeline/generators/diagram-generator.js';
export { ExportGenerator } from './pipeline/generators/export-generator.js';

// IMP-CORE-029: Context Generator - MCP server programmatic access
export { ContextGenerator } from './pipeline/generators/context-generator.js';
export type {
  ProjectContext,
  CallGraph,
  CallGraphNode,
  CallGraphEdge,
  ExecutiveSummary,
  RiskHeatMap,
  WorkOrderPriority
} from './pipeline/generators/context-generator.js';

// IMP-CORE-023: Dependency Health Analyzer
export {
  DependencyAnalyzer,
  analyzeDependencyHealth,
} from './analyzer/dependency-analyzer.js';
export type {
  DependencyHealth,
  DependencyHealthReport,
  SecurityVulnerability,
} from './analyzer/dependency-analyzer.js';

// IMP-CORE-023: Health Generator
export {
  HealthGenerator,
  generateHealthReport,
} from './pipeline/generators/health-generator.js';
export type {
  HealthMetrics,
} from './pipeline/generators/health-generator.js';

// IMP-CORE-010: Middleware and DI Detector
export {
  MiddlewareDetector,
  analyzeMiddlewareAndDI,
} from './analyzer/middleware-detector.js';
export type {
  MiddlewareChain,
  MiddlewareHandler,
  DIContainer,
  DIProvider,
  DIImport,
  MiddlewareAnalysis,
} from './analyzer/middleware-detector.js';

// IMP-CORE-019: Configuration Analyzer
export {
  ConfigAnalyzer,
  analyzeProjectConfig,
} from './analyzer/config-analyzer.js';
export type {
  ConfigAnalysis,
  PackageJsonAnalysis,
  TsConfigAnalysis,
  DockerfileAnalysis,
  DockerfileStage,
  DockerComposeAnalysis,
  DockerComposeService,
  GitHubActionWorkflow,
  EnvFileAnalysis,
} from './analyzer/config-analyzer.js';

// IMP-CORE-022: Documentation Quality Analyzer
export {
  DocsAnalyzer,
  analyzeDocs,
} from './analyzer/docs-analyzer.js';
export type {
  DocumentationQuality,
  ReadmeAnalysis,
  ReadmeSection,
  JSDocCoverage,
  ChangelogAnalysis,
  CommentDensity,
  ApiDocsAnalysis,
} from './analyzer/docs-analyzer.js';

// IMP-CORE-020: API Contract Detector
export {
  ContractDetector,
  analyzeContracts,
} from './analyzer/contract-detector.js';
export type {
  ContractAnalysis,
  OpenApiSpec,
  GraphqlSchema,
  ProtobufDefinition,
  JsonSchema,
} from './analyzer/contract-detector.js';

// IMP-CORE-021: Database/ORM Detector
export {
  DatabaseDetector,
  analyzeDatabase,
} from './analyzer/database-detector.js';
export type {
  DatabaseDetection,
  PrismaSchema,
  PrismaModel,
  PrismaField,
  TypeormEntity,
  SequelizeModel,
  MongooseSchema,
} from './analyzer/database-detector.js';

// IMP-CORE-027: Design Pattern Detector
export {
  DesignPatternDetector,
  analyzeDesignPatterns,
} from './analyzer/design-pattern-detector.js';
export type {
  DesignPatternType,
  DesignPatternInstance,
  PatternAnalysis,
} from './analyzer/design-pattern-detector.js';

// Pipeline types
export type { PipelineOptions, PipelineState, ImportRelationship, CallRelationship } from './pipeline/types.js';

// Search module NOT exported from main index
// Import explicitly from '@coderef/core/search-client' (client-side)
// This prevents accidental imports that pull in the entire core package

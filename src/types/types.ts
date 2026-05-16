/**
 * @coderef-semantic: 1.0.0
 * @exports TypeMetadata, isValidTypeDesignator, getTypeMetadata, getTypePriority, getHighPriorityTypes, getTypesByPriority, RouteMetadata, FrontendCall, ValidationIssue, RouteValidation, ElementData, CodeElement, ScanOptions, ScanProgress, SchemaFieldMapping, RequestBodyMapping, ResponseMapping, SchemaExamples, SchemaMapping, MigrationMapping, TransformedCall, MigrationCoverage, MigrationReport
 * @used_by src/adapter/graph-to-elements.ts, src/analyzer/ast-element-scanner.ts, src/analyzer/entry-detector.ts, src/analyzer/frontend-call-parsers.ts, src/analyzer/middleware-detector.ts, src/analyzer/migration-route-analyzer.ts, src/analyzer/route-parsers.ts, src/context/context-generator.ts, src/context/entry-point-detector.ts, src/context/markdown-formatter.ts, src/context/types.ts, src/fileGeneration/analyzeCoverage.ts, src/fileGeneration/buildDependencyGraph.ts, src/fileGeneration/detectDrift.ts, src/fileGeneration/detectPatterns.ts, src/fileGeneration/generateContext.ts, src/fileGeneration/generateDiagrams.ts, src/fileGeneration/index-storage.ts, src/fileGeneration/saveIndex.ts, src/fileGeneration/validateReferences.ts, src/generator/generateFrontendCalls.ts, src/generator/generateRoutes.ts, src/pipeline/call-resolver.ts, src/pipeline/extractors/element-extractor.ts, src/pipeline/generators/complexity-generator.ts, src/pipeline/generators/context-generator.ts, src/pipeline/generators/drift-generator.ts, src/pipeline/generators/index-generator.ts, src/pipeline/generators/pattern-generator.ts, src/pipeline/graph-builder.ts, src/pipeline/import-resolver.ts, src/pipeline/orchestrator.ts, src/pipeline/semantic-elements.ts, src/pipeline/types.ts, src/plugins/plugin-graph.ts, src/plugins/plugin-scanner.ts, src/plugins/types.ts, src/scanner/file-watcher.ts, src/scanner/framework-registry.ts, src/scanner/frontend-scanner.ts, src/scanner/lru-cache.ts, src/scanner/scanner-worker.ts, src/scanner/scanner.ts, src/scanner/semantic-analyzer.ts, src/scanner/tree-sitter-scanner.ts, src/semantic/header-generator.ts, src/semantic/llm-enricher.ts, src/semantic/projections.ts, src/utils/coderef-id.ts, src/validator/frontend-update-generator.ts, src/validator/migration-mapper.ts, src/validator/report-generator.ts, src/validator/route-validator.ts, __tests__/generators/helpers.ts, __tests__/generators/root-cause-alignment.test.ts, __tests__/integration.test.ts, __tests__/pipeline/output-validation-determinism.test.ts, __tests__/pipeline/output-validation-semantic-headers.test.ts
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports TypeMetadata, isValidTypeDesignator, getTypeMetadata, getTypePriority, getHighPriorityTypes, getTypesByPriority, RouteMetadata, FrontendCall, ValidationIssue, RouteValidation, ElementData, CodeElement, ScanOptions, ScanProgress, SchemaFieldMapping, RequestBodyMapping, ResponseMapping, SchemaExamples, SchemaMapping, MigrationMapping, TransformedCall, MigrationCoverage, MigrationReport
 * @used_by src/adapter/graph-to-elements.ts, src/analyzer/ast-element-scanner.ts, src/analyzer/entry-detector.ts, src/analyzer/frontend-call-parsers.ts, src/analyzer/middleware-detector.ts, src/analyzer/migration-route-analyzer.ts, src/analyzer/route-parsers.ts, src/context/context-generator.ts, src/context/entry-point-detector.ts, src/context/markdown-formatter.ts, src/context/types.ts, src/fileGeneration/analyzeCoverage.ts, src/fileGeneration/buildDependencyGraph.ts, src/fileGeneration/detectDrift.ts, src/fileGeneration/detectPatterns.ts, src/fileGeneration/generateContext.ts, src/fileGeneration/generateDiagrams.ts, src/fileGeneration/index-storage.ts, src/fileGeneration/saveIndex.ts, src/fileGeneration/validateReferences.ts, src/generator/generateFrontendCalls.ts, src/generator/generateRoutes.ts, src/pipeline/call-resolver.ts, src/pipeline/extractors/element-extractor.ts, src/pipeline/generators/complexity-generator.ts, src/pipeline/generators/context-generator.ts, src/pipeline/generators/drift-generator.ts, src/pipeline/generators/index-generator.ts, src/pipeline/generators/pattern-generator.ts, src/pipeline/graph-builder.ts, src/pipeline/import-resolver.ts, src/pipeline/orchestrator.ts, src/pipeline/semantic-elements.ts, src/pipeline/types.ts, src/plugins/plugin-graph.ts, src/plugins/plugin-scanner.ts, src/plugins/types.ts, src/scanner/file-watcher.ts, src/scanner/framework-registry.ts, src/scanner/frontend-scanner.ts, src/scanner/lru-cache.ts, src/scanner/scanner-worker.ts, src/scanner/scanner.ts, src/scanner/semantic-analyzer.ts, src/scanner/tree-sitter-scanner.ts, src/semantic/header-generator.ts, src/semantic/llm-enricher.ts, src/semantic/projections.ts, src/utils/coderef-id.ts, src/validator/frontend-update-generator.ts, src/validator/migration-mapper.ts, src/validator/report-generator.ts, src/validator/route-validator.ts, __tests__/generators/helpers.ts, __tests__/generators/root-cause-alignment.test.ts, __tests__/integration.test.ts, __tests__/pipeline/output-validation-determinism.test.ts, __tests__/pipeline/output-validation-semantic-headers.test.ts
 */



/**
 * CodeRef2 Type System
 *
 * 26 type designators with validation, priorities, and metadata
 * per specification lines 503-526
 */

export enum TypeDesignator {
  F = 'F',       // File
  D = 'D',       // Directory
  C = 'C',       // Component
  Fn = 'Fn',     // Function
  Cl = 'Cl',     // Class
  M = 'M',       // Method
  V = 'V',       // Variable
  S = 'S',       // Style
  T = 'T',       // Test
  A = 'A',       // API Route
  Cfg = 'Cfg',   // Config
  H = 'H',       // Hook
  Ctx = 'Ctx',   // Context
  R = 'R',       // Redux
  Q = 'Q',       // Query
  I = 'I',       // Interface/Type
  Doc = 'Doc',   // Documentation
  Gen = 'Gen',   // Generated
  Dep = 'Dep',   // Dependency
  E = 'E',       // Event
  WIP = 'WIP',   // Work in Progress
  AST = 'AST'    // Abstract Syntax Tree
}

export enum TypePriority {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low'
}

export interface TypeMetadata {
  name: string;
  description: string;
  priority: TypePriority;
  examples: string[];
}

export const TYPE_METADATA: Record<TypeDesignator, TypeMetadata> = {
  [TypeDesignator.F]: {
    name: 'File',
    description: 'Source code file or resource file',
    priority: TypePriority.High,
    examples: ['@F/src/parser.ts', '@F/packages/core/utils.js']
  },
  [TypeDesignator.D]: {
    name: 'Directory',
    description: 'Directory or folder path',
    priority: TypePriority.High,
    examples: ['@D/packages/core', '@D/src/components']
  },
  [TypeDesignator.C]: {
    name: 'Component',
    description: 'UI/Software component',
    priority: TypePriority.High,
    examples: ['@C/Button', '@C/Modal#open']
  },
  [TypeDesignator.Fn]: {
    name: 'Function',
    description: 'Function or exported function',
    priority: TypePriority.High,
    examples: ['@Fn/utils/logger#logInfo', '@Fn/core#parse']
  },
  [TypeDesignator.Cl]: {
    name: 'Class',
    description: 'Class definition',
    priority: TypePriority.High,
    examples: ['@Cl/Scanner', '@Cl/Parser#constructor']
  },
  [TypeDesignator.M]: {
    name: 'Method',
    description: 'Class method or instance method',
    priority: TypePriority.High,
    examples: ['@M/Parser#parse', '@M/Scanner#scan']
  },
  [TypeDesignator.V]: {
    name: 'Variable',
    description: 'Variable or constant declaration',
    priority: TypePriority.Medium,
    examples: ['@V/CONFIG', '@V/buffer']
  },
  [TypeDesignator.S]: {
    name: 'Style',
    description: 'CSS/styling definition',
    priority: TypePriority.Medium,
    examples: ['@S/Button.css#primary', '@S/colors']
  },
  [TypeDesignator.T]: {
    name: 'Test',
    description: 'Test case or test suite',
    priority: TypePriority.Medium,
    examples: ['@T/parser.test#shouldParse', '@T/validator.spec']
  },
  [TypeDesignator.A]: {
    name: 'API Route',
    description: 'API endpoint or route handler',
    priority: TypePriority.High,
    examples: ['@A/users/GET', '@A/api/validate']
  },
  [TypeDesignator.Cfg]: {
    name: 'Config',
    description: 'Configuration file or setting',
    priority: TypePriority.Medium,
    examples: ['@Cfg/tsconfig.json', '@Cfg/webpack.config']
  },
  [TypeDesignator.H]: {
    name: 'Hook',
    description: 'React hook or lifecycle hook',
    priority: TypePriority.High,
    examples: ['@H/useAuth', '@H/useEffect']
  },
  [TypeDesignator.Ctx]: {
    name: 'Context',
    description: 'Context provider or context consumer',
    priority: TypePriority.High,
    examples: ['@Ctx/AuthContext', '@Ctx/ThemeProvider']
  },
  [TypeDesignator.R]: {
    name: 'Redux',
    description: 'Redux store, action, or reducer',
    priority: TypePriority.Medium,
    examples: ['@R/userSlice', '@R/actions/setUser']
  },
  [TypeDesignator.Q]: {
    name: 'Query',
    description: 'Database query or GraphQL query',
    priority: TypePriority.Medium,
    examples: ['@Q/getUsersQuery', '@Q/findById']
  },
  [TypeDesignator.I]: {
    name: 'Interface/Type',
    description: 'TypeScript interface or type alias',
    priority: TypePriority.Medium,
    examples: ['@I/User', '@I/ParsedCodeRef']
  },
  [TypeDesignator.Doc]: {
    name: 'Documentation',
    description: 'Documentation file or comment',
    priority: TypePriority.Low,
    examples: ['@Doc/README#installation', '@Doc/API-guide']
  },
  [TypeDesignator.Gen]: {
    name: 'Generated Code',
    description: 'Code generated by tools',
    priority: TypePriority.Medium,
    examples: ['@Gen/types.generated.ts', '@Gen/schema']
  },
  [TypeDesignator.Dep]: {
    name: 'Dependency',
    description: 'External dependency or import',
    priority: TypePriority.Medium,
    examples: ['@Dep/react', '@Dep/@types/node']
  },
  [TypeDesignator.E]: {
    name: 'Event',
    description: 'Event emitter or event handler',
    priority: TypePriority.High,
    examples: ['@E/onClick', '@E/onChange']
  },
  [TypeDesignator.WIP]: {
    name: 'Work in Progress',
    description: 'Incomplete or experimental code',
    priority: TypePriority.Low,
    examples: ['@WIP/newFeature', '@WIP/refactoring']
  },
  [TypeDesignator.AST]: {
    name: 'AST Node',
    description: 'Abstract Syntax Tree node',
    priority: TypePriority.High,
    examples: ['@AST/Program', '@AST/FunctionDeclaration']
  }
};

/**
 * Validate type designator
 */
export function isValidTypeDesignator(type: string): boolean {
  return Object.values(TypeDesignator).includes(type as TypeDesignator) ||
         type === 'ML' || type === 'DB' || type === 'SEC'; // Extended types
}

/**
 * Get type metadata
 */
export function getTypeMetadata(type: string): TypeMetadata | null {
  const designator = type as TypeDesignator;
  return TYPE_METADATA[designator] || null;
}

/**
 * Get type priority
 */
export function getTypePriority(type: string): TypePriority {
  const metadata = getTypeMetadata(type);
  return metadata?.priority || TypePriority.Medium;
}

/**
 * Get all high-priority types
 */
export function getHighPriorityTypes(): string[] {
  return Object.entries(TYPE_METADATA)
    .filter(([_, meta]) => meta.priority === TypePriority.High)
    .map(([type, _]) => type);
}

/**
 * Get all types by priority
 */
export function getTypesByPriority(priority: TypePriority): string[] {
  return Object.entries(TYPE_METADATA)
    .filter(([_, meta]) => meta.priority === priority)
    .map(([type, _]) => type);
}

/**
 * Route metadata for API endpoints
 * WO-API-ROUTE-DETECTION-001: Multi-framework route detection
 */
export interface RouteMetadata {
  /** Route path pattern (e.g., '/api/users', '/users/<int:id>', '/api/boards') */
  path: string;
  /** HTTP methods (e.g., ['GET', 'POST']) */
  methods: string[];
  /** Framework type */
  framework: 'flask' | 'fastapi' | 'express' | 'nextjs' | 'sveltekit' | 'nuxt' | 'remix';
  /** Optional: Blueprint or router name (Flask blueprints, Express routers) */
  blueprint?: string;
}

/**
 * Frontend API call metadata
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Frontend call detection for route validation
 */
export interface FrontendCall {
  /** API path called (e.g., '/api/users', '/api/users/{id}') */
  path: string;
  /** HTTP method (e.g., 'GET', 'POST', 'PUT', 'DELETE') */
  method: string;
  /** File path where the call is made */
  file: string;
  /** Line number of the call */
  line: number;
  /** Type of API call pattern detected */
  callType: 'fetch' | 'axios' | 'reactQuery' | 'custom';
  /** Confidence score: 100 for static strings, 80 for template literals */
  confidence: number;
}

/**
 * Validation issue for route validation
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Phase 3 - Validation Engine
 */
export interface ValidationIssue {
  /** Type of validation issue */
  type: 'missing_route' | 'unused_route' | 'method_mismatch' | 'path_mismatch';
  /** Severity level */
  severity: 'critical' | 'warning' | 'info';
  /** Frontend call that caused the issue (for missing_route, method_mismatch) */
  frontendCall?: FrontendCall;
  /** Server route involved (for unused_route, method_mismatch) */
  serverRoute?: RouteMetadata & { path: string };
  /** Human-readable message describing the issue */
  message: string;
  /** Suggested fix or action */
  suggestion?: string;
}

/**
 * Route validation result
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Phase 3 - Validation Engine
 */
export interface RouteValidation {
  /** Total frontend calls analyzed */
  totalFrontendCalls: number;
  /** Total server routes analyzed */
  totalServerRoutes: number;
  /** Number of matched routes */
  matchedRoutes: number;
  /** List of validation issues found */
  issues: ValidationIssue[];
  /** Summary of issues by type */
  summary: {
    critical: number;
    warnings: number;
    info: number;
  };
}

/**
 * Represents a code element (function, class, etc.) found in the codebase
 * MIGRATED FROM ROOT types.ts - Phase 1 Type Migration
 * EXTENDED for Phase 1: AST Integration - Added interface, type, decorator, property types
 * EXTENDED for Phase 4: Relationship Tracking - Added imports, dependencies, callsTo fields
 * EXTENDED for WO-API-ROUTE-DETECTION-001: Added optional route metadata field
 */
export interface ElementData {
  type: 'function' | 'class' | 'component' | 'hook' | 'method' | 'constant' | 'interface' | 'type' | 'decorator' | 'property' | 'unknown';
  name: string;
  file: string;
  line: number;
  /** Canonical CodeRef ID, usually line-anchored: @Fn/src/file.ts#name:12 */
  codeRefId?: string;
  /** Stable CodeRef ID without line anchoring: @Fn/src/file.ts#name */
  codeRefIdNoLine?: string;
  /** Optional file-grain semantic layer from ASSISTANT/STANDARDS/layers.json. */
  layer?: import('../pipeline/element-taxonomy.js').LayerEnum;
  /** Optional file-grain semantic capability. Must be kebab-case when present. */
  capability?: string;
  /** Optional file-grain semantic constraints. Items must be kebab-case when present. */
  constraints?: string[];
  /** Semantic header parser status. Normalized scanner output always defaults this to "missing". */
  headerStatus?: import('../pipeline/element-taxonomy.js').HeaderStatus;
  /**
   * Phase 2.5 reference to the parsed semantic header for this element's
   * source file (WO-PIPELINE-SEMANTIC-HEADER-PARSER-001). Every element of
   * the same file shares the same HeaderFact reference. Undefined when no
   * header was detected or when the element came from a legacy scanner
   * path that has not been migrated yet.
   */
  headerFact?: import('../pipeline/header-fact.js').HeaderFact;
  /** Optional: Whether the element is exported */
  exported?: boolean;
  /**
   * Optional: Function/method parameters (from AST analysis)
   * - string[]: Simple parameter names (regex scanner)
   * - Array<{name, type}>: Enriched parameters with type information (tree-sitter scanner)
   */
  parameters?: string[] | Array<{ name: string; type?: string }>;
  /** Optional: Functions/methods called by this element (from AST analysis) */
  calls?: string[];

  // PHASE 4: Relationship Tracking
  /** Optional: Import statements in this file (ESM, CommonJS, dynamic) */
  imports?: Array<{
    source: string;      // Module path (e.g., './utils', 'react')
    specifiers?: string[]; // Named imports (e.g., ['useState', 'useEffect'])
    default?: string;    // Default import name
    namespace?: string;  // Namespace import (e.g., import * as React)
    dynamic?: boolean;   // True for dynamic imports (import() or require())
    line: number;        // Line number of import
  }>;
  /** Optional: Dependencies this element relies on (resolved imports) */
  dependencies?: string[]; // Array of module/file paths
  /** Optional: Elements that call this element (reverse relationship) */
  calledBy?: string[];     // Array of element names that call this element

  // WO-API-ROUTE-DETECTION-001: Route Detection
  /** Optional: Route metadata for API endpoints (Flask, FastAPI, Express, Next.js) */
  route?: RouteMetadata;

  // WO-ROUTE-VALIDATION-ENHANCEMENT-001: Frontend Call Detection
  /** Optional: Frontend API call metadata (fetch, axios, React Query, custom clients) */
  frontendCall?: import('../analyzer/frontend-call-parsers.js').FrontendCall;

  // WO-TREE-SITTER-SCANNER-001: Tree-sitter enriched metadata
  /** Optional: Return type annotation. Not implemented by the Phase 1 scanner downgrade. */
  returnType?: string;
  /** Optional: True if function/method is async */
  async?: boolean;
  /** Optional: Array of decorator names. Not implemented by the Phase 1 scanner downgrade. */
  decorators?: string[];
  /** Optional: Docstring or JSDoc comment text. Not implemented by the Phase 1 scanner downgrade. */
  docstring?: string;
  /** Optional: Parent class/scope name (for distinguishing methods from top-level functions) */
  parentScope?: string;
  /** Optional: Complexity metrics. Not implemented by the Phase 1 scanner downgrade. */
  complexity?: {
    /** Cyclomatic complexity (number of decision points + 1) */
    cyclomatic: number;
    /** Maximum nesting depth of control flow structures */
    nestingDepth: number;
  };
  /** Optional: Additional metadata from scanners, plugins, or graph projection. */
  metadata?: Record<string, any>;

  // WO-CODEREF-SEMANTIC-INTEGRATION-001: Phase 1 Semantic Fields
  /** Modules/functions/classes exported by this file */
  exports?: Array<{
    name: string;          // Export name (e.g., 'useState', 'UserService')
    type?: 'default' | 'named'; // Export type
    target?: string;       // Optional: what it points to (e.g., 'src/hooks/useState.ts')
  }>;

  /** Files that import/depend on this file (reverse imports) */
  usedBy?: Array<{
    file: string;         // File that imports this
    imports?: string[];   // Specific names imported (if available)
    line?: number;        // Line number of import statement
  }>;

  /** Semantically related files (no direct import relationship) */
  related?: Array<{
    file: string;         // Related file path
    reason?: string;      // Why related (e.g., 'same service', 'same domain')
    confidence?: number;  // Confidence score 0-1 (from Lloyd semantic search)
  }>;

  /** Constraints/patterns this file must enforce */
  rules?: Array<{
    rule: string;         // Rule name (e.g., 'must-export-as-default', 'no-circular-deps')
    description?: string; // Human-readable description
    severity?: 'error' | 'warning' | 'info'; // Rule severity (default: 'error')
  }>;
}

export interface CodeElement extends ElementData {
  id?: string;
  uuid?: string;
  metadata?: Record<string, any>;
}

/**
 * Options for scanning code elements
 * MIGRATED FROM ROOT types.ts - Phase 1 Type Migration
 * EXTENDED for Phase 1: AST Integration - Added useAST and fallbackToRegex flags
 */
export interface ScanOptions {
  /** Glob pattern for file inclusion */
  include?: string | string[];
  /** Glob pattern for file exclusion */
  exclude?: string | string[];
  /** Scan recursively into subdirectories */
  recursive?: boolean;
  /** Languages to scan (file extensions) */
  langs?: string[];
  /** Custom patterns to use for scanning */
  customPatterns?: Array<{
    type: ElementData['type'];
    pattern: RegExp;
    nameGroup: number;
    lang: string;
  }>;
  /** Whether to include comments in the scan */
  includeComments?: boolean;
  /** Whether to show verbose output */
  verbose?: boolean;
  /**
   * Phase 1: AST Integration
   * Use AST-based parsing for TypeScript/JavaScript instead of regex (default: false)
   * Improves accuracy from 85% to 95%+ but adds ~50ms per file overhead
   */
  useAST?: boolean;
  /**
   * IMP-CORE-057: Incremental scanning
   * Optional IncrementalCache instance for incremental scanning
   * When provided, only scans files that have changed since last run
   */
  cache?: import('../cache/incremental-cache.js').IncrementalCache;
  /**
   * Phase 1: AST Integration
   * Fallback to regex patterns if AST parsing fails (default: true)
   * Ensures scan completes even with syntax errors
   */
  fallbackToRegex?: boolean;
  /**
   * WO-TREE-SITTER-SCANNER-001: Tree-sitter Integration
   * Use tree-sitter AST parsing for all 10 supported languages (default: false)
   * Provides enriched metadata: parameters with types, return types, async detection,
   * decorators, docstrings, parent scope, and complexity metrics
   * Performance: ~10-20ms per file vs ~5ms for regex
   */
  useTreeSitter?: boolean;
  /**
   * Phase 2: Parallel Processing
   * Enable parallel file processing with worker threads (default: false)
   * Can be boolean or config object: { workers: number }
   * Provides 3-5x performance boost on large projects (500+ files)
   */
  parallel?: boolean | {
    /** Number of worker threads (default: CPU cores - 1) */
    workers?: number;
  };
  /**
   * Phase 2: Parallel Processing
   * Number of worker threads to use (deprecated: use parallel.workers instead)
   * Only used if parallel is true (default: os.cpus().length - 1)
   */
  workerPoolSize?: number;
  /**
   * Phase 5: Progress Reporting
   * Optional callback for progress updates during scanning
   * Called after each file is processed with current progress info
   * @param progress Progress information object
   */
  onProgress?: (progress: {
    /** Current file being processed */
    currentFile: string;
    /** Number of files processed so far */
    filesProcessed: number;
    /** Total number of files to process */
    totalFiles: number;
    /** Number of elements found so far */
    elementsFound: number;
    /** Percentage complete (0-100) */
    percentComplete: number;
  }) => void;
}

/**
 * Progress information for scan operations
 * Phase 5: Progress Reporting
 */
export interface ScanProgress {
  /** Current file being processed */
  currentFile: string;
  /** Number of files processed so far */
  filesProcessed: number;
  /** Total number of files to process */
  totalFiles: number;
  /** Number of elements found so far */
  elementsFound: number;
  /** Percentage complete (0-100) */
  percentComplete: number;
}

/**
 * IMP-CORE-042: Schema field mapping for request/response transformations
 */
export interface SchemaFieldMapping {
  /** Original field name */
  oldField: string;
  /** New field name */
  newField: string;
  /** Original field type (optional) */
  oldType?: string;
  /** New field type (optional) */
  newType?: string;
  /** Transformation logic description */
  transform?: string;
}

/**
 * IMP-CORE-042: Request body transformation details
 */
export interface RequestBodyMapping {
  /** Original content type */
  oldContentType?: 'application/json' | 'application/x-www-form-urlencoded' | 'multipart/form-data' | 'text/plain';
  /** New content type */
  newContentType?: 'application/json' | 'application/x-www-form-urlencoded' | 'multipart/form-data' | 'text/plain';
  /** Field name/type mappings */
  fieldMappings?: SchemaFieldMapping[];
  /** Validation migration notes */
  validationMigration?: string;
}

/**
 * IMP-CORE-042: Response transformation details
 */
export interface ResponseMapping {
  /** HTTP status code changes */
  statusCodeChanges?: Record<string, {
    old: number;
    new: number;
    reason?: string;
  }>;
  /** Response field mappings */
  fieldMappings?: SchemaFieldMapping[];
  /** Whether response is wrapped in envelope */
  wrapInEnvelope?: boolean;
}

/**
 * IMP-CORE-042: Example request/response pairs for testing
 */
export interface SchemaExamples {
  /** Example request payloads */
  request?: {
    old?: unknown;
    new?: unknown;
  };
  /** Example response payloads */
  response?: {
    old?: unknown;
    new?: unknown;
  };
}

/**
 * IMP-CORE-042: Schema mapping for a specific route
 */
export interface SchemaMapping {
  /** API route path */
  route: string;
  /** Request body transformation */
  requestBody?: RequestBodyMapping;
  /** Response transformation */
  response?: ResponseMapping;
  /** Example payloads for testing */
  examples?: SchemaExamples;
}

/**
 * Migration mapping configuration
 * WO-MIGRATION-VALIDATION-001
 */
export interface MigrationMapping {
  /** Config schema version (semver) */
  version: string;
  /** Human-readable migration name */
  name: string;
  /** Route transformation mappings */
  mappings: {
    /** Explicit 1:1 path mappings (old → new) */
    paths?: Record<string, string>;
    /** Regex-based pattern transformations */
    patterns?: Array<{
      /** Regex pattern to match */
      find: string;
      /** Replacement string (supports $1, $2 capture groups) */
      replace: string;
    }>;
    /** HTTP method changes for specific paths */
    methodChanges?: Record<string, {
      old: string;
      new: string;
    }>;
    /** Routes deprecated in migration (no new equivalent) */
    deprecated?: string[];
    /** Routes newly added in target (not in source) */
    added?: string[];
    /** IMP-CORE-042: Request/response schema transformations */
    schemaMappings?: SchemaMapping[];
  };
  /** Migration metadata */
  metadata: {
    /** Source system/version */
    source: string;
    /** Target system/version */
    target: string;
    /** ISO 8601 timestamp */
    createdAt: string;
    /** Optional description */
    description?: string;
  };
}

/**
 * Transformed call with confidence tracking
 * WO-MIGRATION-VALIDATION-001
 */
export interface TransformedCall {
  /** Original path before transformation */
  originalPath: string;
  /** Transformed path after applying mapping */
  transformedPath: string;
  /** Confidence score (0-100): explicit=100, pattern=80, unmapped=0 */
  confidence: number;
  /** Mapping rule used */
  mappingRule: 'explicit' | 'pattern' | 'unmapped';
}

/**
 * Migration coverage metrics
 * WO-MIGRATION-VALIDATION-001
 */
export interface MigrationCoverage {
  /** Total routes in old system */
  totalOldRoutes: number;
  /** Total routes in new system */
  totalNewRoutes: number;
  /** Number of routes successfully migrated */
  migratedRoutes: number;
  /** Number of routes newly added (not in old) */
  newlyAddedRoutes: number;
  /** Coverage percentage (migratedRoutes / totalOldRoutes * 100) */
  coverage: number;
}

/**
 * Migration validation report
 * Extends RouteValidation with migration-specific data
 * WO-MIGRATION-VALIDATION-001
 */
export interface MigrationReport extends RouteValidation {
  /** Migration coverage metrics */
  migration: {
    /** Total frontend calls transformed */
    totalMapped: number;
    /** Frontend calls with no mapping rule */
    unmapped: FrontendCall[];
    /** Frontend calls to deprecated routes */
    deprecated: FrontendCall[];
    /** Coverage breakdown */
    coverage: MigrationCoverage;
  };
}

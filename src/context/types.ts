/**
 * Shared Type Definitions for Context Generation
 *
 * Provides types for all six phases:
 * Phase 1: Complexity Scoring
 * Phase 2: Task-Specific Context
 * Phase 3: Edge Case Detection
 * Phase 4: Test Pattern Analysis
 * Phase 5: Code Examples
 * Phase 6: Agentic Output Formatting
 *
 * Part of WO-CODEREF-CONTEXT-ENHANCEMENT-001
 */

import type { ElementData } from '../types/types.js';

// ============================================================================
// PHASE 1: COMPLEXITY SCORING
// ============================================================================

/**
 * Complexity metrics for a code element
 */
export interface ComplexityMetrics {
  /** Lines of code (LOC) */
  loc: number;
  /** Number of parameters */
  parameterCount: number;
  /** Cyclomatic complexity (CC) */
  cyclomaticComplexity: number;
  /** Overall complexity score (0-10) */
  complexityScore: number;
}

/**
 * Complexity score with element details
 */
export interface ElementComplexity {
  /** Element name */
  name: string;
  /** Element type (function, method, class, etc.) */
  type: string;
  /** File path */
  file: string;
  /** Line number */
  line: number;
  /** Complexity metrics */
  metrics: ComplexityMetrics;
  /** Risk level based on complexity */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}


// ============================================================================
// PHASE 2: TASK-SPECIFIC CONTEXT
// ============================================================================

/**
 * Context filter criteria for task-specific generation
 */
export interface ContextFilterCriteria {
  /** Keywords to search for */
  keywords: string[];
  /** Function names to include */
  functionNames?: string[];
  /** File patterns to include */
  filePatterns?: string[];
  /** Maximum complexity score to include */
  maxComplexity?: number;
  /** Include only exported elements */
  onlyExported?: boolean;
}

/**
 * Impact scope information
 */
export interface ImpactScope {
  /** Direct dependents (functions that call this) */
  directDependents: string[];
  /** Indirect dependents (transitive) */
  indirectDependents: string[];
  /** Direct dependencies (functions this calls) */
  directDependencies: string[];
  /** Total functions in impact scope */
  scopeSize: number;
  /** Risk assessment for changes */
  riskAssessment: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Task-specific context for an element
 */
export interface TaskSpecificContext {
  /** Element name */
  name: string;
  /** Element type */
  type: string;
  /** File path */
  file: string;
  /** Line number */
  line: number;
  /** Complexity metrics */
  complexity: ComplexityMetrics;
  /** Impact scope */
  impactScope: ImpactScope;
  /** Relevance score (0-1) */
  relevanceScore: number;
  /** Why this element is relevant */
  relevanceReason: string;
  /** Test coverage percentage */
  testCoverage?: number;
}

/**
 * Full task context result
 */
export interface TaskContext {
  /** Task/workorder ID */
  taskId: string;
  /** Task description */
  taskDescription: string;
  /** Filtered elements relevant to task */
  relatedElements: TaskSpecificContext[];
  /** Entry points for this task */
  entryPoints: TaskSpecificContext[];
  /** Functions to modify */
  functionsToModify: TaskSpecificContext[];
  /** Functions that will be impacted */
  impactedFunctions: TaskSpecificContext[];
  /** Total complexity in scope */
  totalComplexity: number;
  /** Risk assessment */
  riskAssessment: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// PHASE 3: EDGE CASE DETECTION
// ============================================================================

/**
 * Detected edge case or potential issue
 */
export interface EdgeCaseIssue {
  /** Issue type */
  type: 'race-condition' | 'state-issue' | 'concurrency' | 'timing' | 'resource' | 'boundary' | 'other';
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Element name */
  element: string;
  /** File path */
  file: string;
  /** Line number */
  line: number;
  /** Issue description */
  description: string;
  /** How to mitigate */
  mitigation: string;
  /** Code pattern that triggered detection */
  pattern: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Edge case detection results
 */
export interface EdgeCaseDetection {
  /** Total issues found */
  totalIssues: number;
  /** Issues by type */
  byType: Record<string, number>;
  /** Issues by severity */
  bySeverity: Record<string, number>;
  /** List of detected issues */
  issues: EdgeCaseIssue[];
  /** Critical issues requiring attention */
  criticalIssues: EdgeCaseIssue[];
}

// ============================================================================
// PHASE 4: TEST PATTERN ANALYSIS
// ============================================================================

/**
 * Test pattern found in codebase
 */
export interface TestPattern {
  /** Pattern name (e.g., "mock-setup", "assertion-chain") */
  name: string;
  /** Pattern type */
  type: 'mock' | 'spy' | 'stub' | 'assertion' | 'setup' | 'teardown' | 'other';
  /** Pattern description */
  description: string;
  /** Example code snippet */
  exampleCode: string;
  /** Frequency (how often it appears) */
  frequency: number;
  /** Files where it appears */
  files: string[];
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Test file information
 */
export interface TestFileInfo {
  /** Test file path */
  file: string;
  /** Functions tested by this file */
  testedFunctions: string[];
  /** Number of test cases */
  testCaseCount: number;
  /** Test patterns used */
  patterns: TestPattern[];
  /** Code coverage percentage */
  coverage: number;
}

/**
 * Test pattern analysis results
 */
export interface TestPatternAnalysis {
  /** Total test files found */
  totalTestFiles: number;
  /** Total test patterns found */
  totalPatterns: number;
  /** Detected test patterns */
  patterns: TestPattern[];
  /** Test file information */
  testFiles: TestFileInfo[];
  /** Coverage by element type */
  coverageByType: Record<string, number>;
  /** Average test coverage */
  averageCoverage: number;
}

// ============================================================================
// PHASE 5: CODE EXAMPLES
// ============================================================================

/**
 * Code example extracted from codebase
 */
export interface CodeExample {
  /** Example name/title */
  name: string;
  /** Code pattern type */
  patternType: string;
  /** Code snippet */
  code: string;
  /** File where example is located */
  file: string;
  /** Line number start */
  lineStart: number;
  /** Line number end */
  lineEnd: number;
  /** Why this is a good example */
  whyGoodExample: string;
  /** Related patterns */
  relatedPatterns: string[];
}

/**
 * Pattern group with canonical examples
 */
export interface PatternGroup {
  /** Pattern name */
  patternName: string;
  /** Pattern description */
  description: string;
  /** Pattern category (async, error-handling, validation, etc.) */
  category: string;
  /** Canonical examples for this pattern */
  examples: CodeExample[];
  /** Anti-patterns to avoid */
  antiPatterns?: string[];
  /** Best practices */
  bestPractices: string[];
}

/**
 * Code examples extraction results
 */
export interface CodeExamplesResult {
  /** Total patterns found */
  totalPatterns: number;
  /** Pattern groups */
  patternGroups: PatternGroup[];
  /** Examples by category */
  examplesByCategory: Record<string, CodeExample[]>;
}

// ============================================================================
// PHASE 6: AGENTIC OUTPUT FORMATTING
// ============================================================================

/**
 * Confidence score breakdown
 */
export interface ConfidenceBreakdown {
  /** Extraction quality (0-1) */
  extractionQuality: number;
  /** Pattern consistency (0-1) */
  patternConsistency: number;
  /** Data completeness (0-1) */
  dataCompleteness: number;
  /** Overall confidence (0-1) */
  overall: number;
  /** Confidence level description */
  level: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
}

/**
 * Agentic context output format
 * Structured for AI agent consumption
 */
export interface AgenticContext {
  /** Workorder/task ID */
  workorderId: string;
  /** Task description */
  taskDescription: string;

  // Phase 1: Complexity
  complexity: {
    /** Functions ranked by complexity */
    functionsByComplexity: ElementComplexity[];
    /** Complexity distribution stats */
    stats: {
      minComplexity: number;
      maxComplexity: number;
      avgComplexity: number;
      medianComplexity: number;
    };
  };

  // Phase 2: Task context
  context: {
    /** Functions to modify */
    functionsToModify: TaskSpecificContext[];
    /** Functions that will be impacted */
    impactedFunctions: TaskSpecificContext[];
    /** Risk assessment */
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };

  // Phase 3: Edge cases
  edgeCases: {
    /** Critical issues */
    criticalIssues: EdgeCaseIssue[];
    /** High severity issues */
    highSeverityIssues: EdgeCaseIssue[];
    /** All issues */
    allIssues: EdgeCaseIssue[];
  };

  // Phase 4: Test patterns
  testing: {
    /** Test coverage for functions in scope */
    coveragePercentage: number;
    /** Recommended test patterns */
    recommendedPatterns: TestPattern[];
    /** Related test files */
    testFiles: TestFileInfo[];
  };

  // Phase 5: Code examples
  examples: {
    /** Relevant pattern examples */
    patternExamples: PatternGroup[];
    /** Anti-patterns to avoid */
    antiPatternsToAvoid: string[];
  };

  // Phase 6: Confidence and metadata
  metadata: {
    /** When context was generated */
    generatedAt: string;
    /** Confidence scores */
    confidence: ConfidenceBreakdown;
    /** Processing statistics */
    processingStats: {
      /** Elements analyzed */
      elementsAnalyzed: number;
      /** Edge cases detected */
      edgeCasesDetected: number;
      /** Test patterns found */
      patternsFound: number;
      /** Processing time (ms) */
      processingTimeMs: number;
    };
  };
}

/**
 * Context generation options
 */
export interface ContextGenerationOptions {
  /** Languages to analyze */
  languages?: string[];
  /** Include complexity analysis */
  includeComplexity?: boolean;
  /** Include edge case detection */
  includeEdgeCases?: boolean;
  /** Include test pattern analysis */
  includeTestPatterns?: boolean;
  /** Include code examples */
  includeExamples?: boolean;
  /** Include confidence scores */
  includeConfidence?: boolean;
  /** Maximum functions to analyze */
  maxFunctions?: number;
  /** Minimum confidence threshold for results */
  confidenceThreshold?: number;
}

// ============================================================================
// CR-001: BREAKING CHANGE DETECTION
// ============================================================================

/**
 * Represents a detected change in a function/method signature
 */
export interface SignatureChange {
  /** Changed element information */
  element: {
    /** Element name */
    name: string;
    /** Element kind (Fn=function, M=method, Cl=class) */
    kind: 'Fn' | 'M' | 'Cl';
    /** File path containing the element */
    file: string;
    /** Line number where element is defined */
    line: number;
    /** CodeRef2 tag for precise reference */
    coderefTag: string;
  };
  /** Type of change that occurred */
  changeType: 'signature' | 'return' | 'visibility' | 'export' | 'overload' | 'type';
  /** Severity of the breaking change */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Details of what changed */
  details: {
    /** Before value/signature */
    before: string;
    /** After value/signature */
    after: string;
    /** Diff summary */
    diff: string;
  };
}

/**
 * Represents a call site affected by a breaking change
 */
export interface ImpactedCallSite {
  /** File containing the call */
  file: string;
  /** Line number of the call */
  line: number;
  /** Name of the function/method making the call */
  callerElement: string;
  /** Actual call context (code snippet) */
  callContext: string;
  /** Confidence that this call will break (0-1, higher=more certain) */
  confidence: number;
  /** Type of call (direct, imported, dynamic, proxy) */
  callType: 'direct' | 'imported' | 'dynamic' | 'proxy';
}

/**
 * Suggestion for how to fix a breaking change
 */
export interface MigrationHint {
  /** Type of migration strategy */
  hintType: 'wrap' | 'rename' | 'defaultParam' | 'optionsObject' | 'adapter';
  /** Human-readable suggestion text */
  text: string;
  /** Confidence this fix works (0-1) */
  confidence: number;
  /** Code example of the fix (optional) */
  codeExample?: string;
}

/**
 * Complete breaking change analysis report
 */
export interface BreakingChangeReport {
  /** Base git reference (e.g., 'main') */
  baseRef: string;
  /** Head git reference (e.g., 'feature-branch'), if comparing refs */
  headRef?: string;
  /** Whether analysis used working tree */
  worktree?: boolean;
  /** Summary of changes found */
  summary: {
    /** Count of breaking changes */
    breakingCount: number;
    /** Count of potentially breaking changes */
    potentiallyBreakingCount: number;
    /** Count of non-breaking changes */
    nonBreakingCount: number;
  };
  /** List of detected changes */
  changes: {
    /** Element that changed */
    element: SignatureChange['element'];
    /** Type of change */
    changeType: SignatureChange['changeType'];
    /** Severity of the change */
    severity: SignatureChange['severity'];
    /** Detailed information about the change */
    details: SignatureChange['details'];
    /** Call sites affected by this change */
    impactedCallSites: ImpactedCallSite[];
    /** Suggestions for migrating code */
    migrationHints: MigrationHint[];
  }[];
  /** Metadata about the analysis */
  metadata: {
    /** ISO timestamp when analysis completed */
    analyzedAt: string;
    /** Time taken for analysis (milliseconds) */
    analysisTime: number;
    /** Overall confidence of the report (0-1) */
    confidence: number;
  };
}

// ============================================================================
// RE-EXPORTED TYPES
// ============================================================================

// ElementData is imported from root types and re-exported here for convenience
export type { ElementData };

// Note: Additional helper types (like SourceWithContext) can be added as needed

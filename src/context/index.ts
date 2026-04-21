/**
 * Context Module Index - Export all context components
 * Phase 5: Context Tracking & Multi-hop Traversal
 */

export { default as ContextTracker } from './context-tracker.js';
export type { ContextEntry, ContextHistory } from './context-tracker.js';

export { default as MultiHopTraversal } from './multi-hop-traversal.js';
export type { TraversalResult, MultiHopResult } from './multi-hop-traversal.js';

export { default as FuzzyResolver } from './fuzzy-resolver.js';
export type { FuzzyMatch, DriftResult } from './fuzzy-resolver.js';

export { default as ImpactSimulator } from './impact-simulator.js';
export type { ElementImpact, BlastRadius, ImpactSummary } from './impact-simulator.js';

export { ComplexityScorer } from './complexity-scorer.js';
export type { ElementComplexity, ComplexityMetrics } from './types.js';

export { TestPatternAnalyzer } from './test-pattern-analyzer.js';
export type { TestPatternAnalysis, TestPattern, TestFileInfo } from './types.js';

export { ContextGenerator } from './context-generator.js';
export type { ContextOptions } from './context-generator.js';

export { BreakingChangeDetector } from './breaking-change-detector.js';
export type {
  BreakingChangeReport,
  SignatureChange,
  ImpactedCallSite,
  MigrationHint,
} from './breaking-change-detector.js';

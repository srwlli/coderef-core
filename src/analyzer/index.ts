/**
 * Analyzer Module Index - Export all analyzer components
 *
 * The legacy in-memory graph stack (ImportParser, CallDetector,
 * GraphBuilder, GraphAnalyzer, AnalyzerService, graph-helpers, GraphError)
 * was retired per DR-PHASE-5-C (WO-REPO-REVIEW-2026-07-REMEDIATION-001
 * Phase 2). Relationship queries live on the canonical pipeline artifact —
 * see src/query/canonical-graph.ts.
 */

// IMP-CORE-018: Entry point detection
export { EntryPointDetector } from './entry-detector.js';
export type { EntryPoint, EntryPointType } from './entry-detector.js';

// IMP-CORE-016: Project classification
export { default as ProjectClassifier } from './project-classifier.js';
export type { ProjectClassification, ProjectCategory, ApiServiceType, WebAppType } from './project-classifier.js';

// IMP-CORE-039: Migration Route Analyzer
export { MigrationRouteAnalyzer } from './migration-route-analyzer.js';
export type {
  MigrationRouteElement,
  BreakingChange,
  OrphanedCall,
  FrameworkStats
} from './migration-route-analyzer.js';
export {
  extractAllRoutes,
  findOrphanedCalls,
  detectBreakingChanges
} from './migration-route-analyzer.js';

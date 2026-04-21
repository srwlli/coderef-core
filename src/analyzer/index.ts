/**
 * Analyzer Module Index - Export all analyzer components
 * Phase 3: Relationship Detection & Analysis
 */

export { default as ImportParser } from './import-parser.js';
export type { ImportStatement, ImportEdge } from './import-parser.js';

export { default as CallDetector } from './call-detector.js';
export type { CallExpression, CallEdge } from './call-detector.js';

export { default as GraphBuilder } from './graph-builder.js';
export type { GraphNode, GraphEdge, DependencyGraph } from './graph-builder.js';

export { default as GraphAnalyzer } from './graph-analyzer.js';
export type { TraversalPath, CircularDependency } from './graph-analyzer.js';

export { default as AnalyzerService } from './analyzer-service.js';
export type { AnalysisResult } from './analyzer-service.js';

export { GraphError, GraphErrorCode } from './graph-error.js';

// Graph Query Helpers - Resource Sheet Integration
export {
  getImportsForElement,
  getExportsForElement,
  getConsumersForElement,
  getDependenciesForElement,
  getElementCharacteristics,
  calculateAutoFillRate,
  parseNodeId,
} from './graph-helpers.js';
export type { ElementReference } from './graph-helpers.js';

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

/**
 * @coderef/core - Main entry point
 * WO-CODEREF-CONSOLIDATION-001
 */

// Core modules
export * from './src/types/types.js';
export * from './src/scanner/scanner.js';
export * from './src/parser/parser.js';
export * from './src/analyzer/index.js';
export * from './src/validator/validator.js';
// Canonical-graph query engine (legacy query-executor retired per DR-PHASE-5-C)
export * from './src/query/canonical-graph.js';

// Context & AI integration
export * from './src/context/index.js';
export * from './src/export/index.js';
// export * from './src/integration/index.js'; // Temporarily disabled - missing AI dependencies

// Utilities retired (WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 Phase 7):
// root utils/fs.ts had zero consumers beyond this re-export — deleted with
// Tombstone; src/utils/path-normalize.ts is the live utility surface.

// Error classes retired (WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 3, P2-14):
// src/errors/ had zero production importers — CodeRefError/FileNotFoundError/
// IndexError/ParseError/ScanError/ValidationError are no longer exported.

// Legacy fileGeneration writers quarantined (WO-UNIFIED-PIPELINE-LEGACY-SURFACE-BOUNDARY-001 P2):
// saveIndex/generateContext/buildDependencyGraph/detectPatterns/analyzeCoverage/
// validateReferences/detectDrift/generateDiagrams competed with the pipeline
// generators for the same canonical .coderef paths. Import them explicitly from
// '@coderef/core/legacy' (src/legacy/file-generation.ts) — every writer now
// refuses to overwrite a pipeline-owned .coderef dir unless passed {force:true}.
export type { DependencyGraph, GraphNode, GraphEdge } from './src/fileGeneration/buildDependencyGraph.js';

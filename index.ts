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

// Utilities
export * from './utils/fs.js';

// Error classes
export * from './src/errors/index.js';

// File generation - Phase 1
export { saveIndex } from './src/fileGeneration/saveIndex.js';
export { generateContext } from './src/fileGeneration/generateContext.js';
export { buildDependencyGraph } from './src/fileGeneration/buildDependencyGraph.js';
export type { DependencyGraph, GraphNode, GraphEdge } from './src/fileGeneration/buildDependencyGraph.js';

// File generation - Phase 2
export { detectPatterns } from './src/fileGeneration/detectPatterns.js';
export { analyzeCoverage } from './src/fileGeneration/analyzeCoverage.js';
export { validateReferences } from './src/fileGeneration/validateReferences.js';
export { detectDrift } from './src/fileGeneration/detectDrift.js';

// File generation - Phase 3
export { generateDiagrams } from './src/fileGeneration/generateDiagrams.js';

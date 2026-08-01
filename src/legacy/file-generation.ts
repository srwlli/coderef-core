/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability legacy-file-generation-surface
 * @exports saveIndex, generateContext, buildDependencyGraph, detectPatterns, analyzeCoverage, validateReferences, detectDrift, generateDiagrams, DependencyGraph, GraphNode, GraphEdge, LegacyWriteOptions, isPipelineOwnedCoderefDir
 * @used_by __tests__/boundary/legacy-surface-boundary.contract.test.ts
 */

/**
 * Explicit legacy compatibility surface — WO-UNIFIED-PIPELINE-LEGACY-SURFACE-BOUNDARY-001 P2-T1.
 *
 * The scanner-era fileGeneration writers used to leak through both package
 * barrels, competing with the PipelineOrchestrator generators for the same
 * canonical .coderef paths. They are now importable ONLY through this module
 * (`@coderef/core/legacy` at the package boundary). Every writer is guarded:
 * it refuses to overwrite a pipeline-owned .coderef dir (see ./guard.js)
 * unless the caller passes `{ force: true }`.
 *
 * Canonical replacements: run `populate-coderef` (PipelineOrchestrator) for
 * every artifact this module can produce.
 *
 * NOT in this module by design:
 *   - scanCurrentElements — retained first-class lightweight API (src barrel).
 *   - index-storage — shared canonical serializer, re-homed to src/artifacts/.
 *   - generateRoutes / saveFrontendCalls — shared route serializers consumed
 *     by the pipeline RoutesGenerator and the scan-frontend-calls bin.
 */

export { saveIndex } from '../fileGeneration/saveIndex.js';
export { generateContext } from '../fileGeneration/generateContext.js';
export { buildDependencyGraph } from '../fileGeneration/buildDependencyGraph.js';
export type { DependencyGraph, GraphNode, GraphEdge } from '../fileGeneration/buildDependencyGraph.js';
export { detectPatterns } from '../fileGeneration/detectPatterns.js';
export { analyzeCoverage } from '../fileGeneration/analyzeCoverage.js';
export { validateReferences } from '../fileGeneration/validateReferences.js';
export { detectDrift } from '../fileGeneration/detectDrift.js';
export { generateDiagrams } from '../fileGeneration/generateDiagrams.js';
export { isPipelineOwnedCoderefDir } from './guard.js';
export type { LegacyWriteOptions } from './guard.js';

/**
 * @coderef/core - Main entry point
 * WO-CODEREF-CONSOLIDATION-001
 *
 * P3 entrypoint unification (WO-UNIFIED-PIPELINE-LEGACY-SURFACE-BOUNDARY-001):
 * this root barrel is now a pure re-export of the canonical src barrel, so
 * every supported resolution mode — `main`/`types` (node10), `exports["."]`
 * (node16/bundler), and direct dist paths — exposes the SAME public API.
 * Before this change the root barrel carried a divergent legacy surface
 * (scanner-backed ContextGenerator, no pipeline module); the canonical
 * surface is defined once in src/index.ts.
 */

export * from './src/index.js';

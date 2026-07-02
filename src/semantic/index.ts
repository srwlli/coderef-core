/**
 * CodeRef-Semantics module exports
 */

export { ASTExtractor, astExtractor, extractBatch } from './ast-extractor.js';
export type { ExportInfo, ImportInfo, SemanticExtractionResult, ASTExtractorOptions } from './ast-extractor.js';

export { HeaderGenerator, generateHeaders } from './header-generator.js';
export type { SemanticHeader, HeaderGenerationOptions } from './header-generator.js';

// LLMEnricher deleted (WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 3, P2-14):
// its constructor unconditionally self-disabled so it never enriched anything,
// and it was Anthropic-based — this environment is Ollama local-only.

export { RegistrySyncer, syncEntry, refreshSync } from './registry-sync.js';
export type { RegistryEntry, RegistrySyncOptions, SyncResult, EnrichedMetadata } from './registry-sync.js';

export { SemanticOrchestrator, runSemanticPipeline } from './orchestrator.js';
export type { SemanticPipelineOptions, PipelineResult } from './orchestrator.js';

export { createSemanticRegistryProjection } from './projections.js';
export type { SemanticRegistryProjection, SemanticRegistryProjectionEntry } from './projections.js';

/**
 * CodeRef-Semantics module exports
 */

export { ASTExtractor, astExtractor, extractBatch } from './ast-extractor.js';
export type { ExportInfo, ImportInfo, SemanticExtractionResult, ASTExtractorOptions } from './ast-extractor.js';

export { HeaderGenerator, generateHeaders } from './header-generator.js';
export type { SemanticHeader, HeaderGenerationOptions } from './header-generator.js';

export { LLMEnricher, enrichMetadata, enrichBatch } from './llm-enricher.js';
export type { EnrichmentRequest, EnrichedMetadata, LLMEnricherOptions } from './llm-enricher.js';

export { RegistrySyncer, syncEntry, refreshSync } from './registry-sync.js';
export type { RegistryEntry, RegistrySyncOptions, SyncResult } from './registry-sync.js';

export { SemanticOrchestrator, runSemanticPipeline } from './orchestrator.js';
export type { SemanticPipelineOptions, PipelineResult } from './orchestrator.js';

export { createSemanticRegistryProjection } from './projections.js';
export type { SemanticRegistryProjection, SemanticRegistryProjectionEntry } from './projections.js';

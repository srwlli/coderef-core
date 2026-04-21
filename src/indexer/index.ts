/**
 * CodeRef2 Indexer Module - Public API
 *
 * Exports core indexing functionality:
 * - IndexStore: Primary index management
 * - MetadataIndex: Metadata category indexing
 * - RelationshipIndex: Dependency graph
 * - QueryEngine: Multi-dimensional queries
 * - IndexerService: Orchestration layer
 */

export {
  IndexRecord,
  IndexStorage,
  IndexStats,
  IndexStore,
  createIndexStore,
  indexReferences,
} from './index-store.js';

export {
  MetadataCategory,
  CATEGORY_VALUES,
  MetadataIndex,
  createMetadataIndex,
} from './metadata-index.js';

export {
  RelationshipType,
  ALL_RELATIONSHIP_TYPES,
  RelationshipEdge,
  GraphNode,
  RelationshipIndex,
  createRelationshipIndex,
} from './relationship-index.js';

export {
  QueryResult,
  QueryFilter,
  QueryEngineConfig,
  QueryEngine,
  createQueryEngine,
} from './query-engine.js';

export {
  IndexingStage,
  IndexingResult,
  BatchIndexingResult,
  IndexerStats,
  IndexerService,
  createIndexerService,
} from './indexer-service.js';

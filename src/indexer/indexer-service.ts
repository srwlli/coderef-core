/**
 * CodeRef2 Indexer Service
 *
 * Orchestration layer that coordinates all indexing components:
 * - IndexStore (primary indices)
 * - MetadataIndex (metadata lookups)
 * - RelationshipIndex (dependency graph)
 * - QueryEngine (multi-dimensional queries)
 *
 * Provides unified indexing pipeline and public API
 */

import { ParsedCodeRef } from '../parser/parser.js';
import { IndexStore, IndexRecord, IndexStats } from './index-store.js';
import { MetadataIndex, MetadataCategory } from './metadata-index.js';
import { RelationshipIndex, RelationshipType } from './relationship-index.js';
import { QueryEngine, QueryEngineConfig } from './query-engine.js';

/**
 * Indexing pipeline stage
 */
export type IndexingStage =
  | 'initialized'
  | 'parsing'
  | 'validating'
  | 'indexing-type'
  | 'indexing-path'
  | 'indexing-element'
  | 'indexing-metadata'
  | 'indexing-relationships'
  | 'ready';

/**
 * Indexing result for a single reference
 */
export interface IndexingResult {
  success: boolean;
  reference: ParsedCodeRef;
  record?: IndexRecord;
  error?: string;
  stage_completed: IndexingStage;
}

/**
 * Batch indexing result summary
 */
export interface BatchIndexingResult {
  total_submitted: number;
  total_indexed: number;
  total_failed: number;
  success_rate: number;
  duration_ms: number;
  stage_reached: IndexingStage;
  errors: Array<{
    reference: string;
    error: string;
  }>;
}

/**
 * Indexer statistics
 */
export interface IndexerStats {
  total_indexed: number;
  total_failed: number;
  stage: IndexingStage;
  index_stats: IndexStats;
  metadata_stats: any;
  relationship_stats: any;
  query_stats: any;
  last_indexed_at: Date | null;
}

/**
 * Indexer Service - Main orchestration layer
 */
export class IndexerService {
  private indexStore: IndexStore;
  private metadataIndex: MetadataIndex;
  private relationshipIndex: RelationshipIndex;
  private queryEngine: QueryEngine;

  private stage: IndexingStage = 'initialized';
  private total_indexed = 0;
  private total_failed = 0;
  private last_indexed_at: Date | null = null;
  private errors: Array<{ reference: string; error: string }> = [];

  constructor(queryEngineConfig?: QueryEngineConfig) {
    // Create all components
    this.indexStore = new IndexStore();
    this.metadataIndex = new MetadataIndex();
    this.relationshipIndex = new RelationshipIndex();
    this.queryEngine = new QueryEngine(
      this.indexStore,
      this.metadataIndex,
      this.relationshipIndex,
      queryEngineConfig
    );
  }

  /**
   * Index a single reference (full pipeline)
   */
  public indexReference(parsed: ParsedCodeRef): IndexingResult {
    try {
      this.stage = 'indexing-type';

      // Add to index store (primary indices)
      const record = this.indexStore.addReference(parsed);
      this.stage = 'indexing-path';

      // Index metadata if present
      if (parsed.metadata) {
        this.metadataIndex.indexReference(record);
        this.stage = 'indexing-metadata';
      }

      // Index relationships if present
      if (parsed.metadata) {
        this.relationshipIndex.indexRecord(record);
        this.stage = 'indexing-relationships';
      }

      this.stage = 'ready';
      this.total_indexed++;
      this.last_indexed_at = new Date();

      return {
        success: true,
        reference: parsed,
        record,
        stage_completed: this.stage,
      };
    } catch (error) {
      this.total_failed++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.errors.push({
        reference: this.refId(parsed),
        error: errorMsg,
      });

      return {
        success: false,
        reference: parsed,
        error: errorMsg,
        stage_completed: this.stage,
      };
    }
  }

  /**
   * Index multiple references (batch operation)
   */
  public indexReferences(parsed: ParsedCodeRef[]): BatchIndexingResult {
    const start = Date.now();
    const results: IndexingResult[] = [];

    for (const ref of parsed) {
      results.push(this.indexReference(ref));
    }

    const duration_ms = Date.now() - start;
    const success_rate = parsed.length > 0 ? (this.total_indexed / parsed.length) * 100 : 0;

    return {
      total_submitted: parsed.length,
      total_indexed: this.total_indexed,
      total_failed: this.total_failed,
      success_rate,
      duration_ms,
      stage_reached: this.stage,
      errors: this.errors.slice(-10), // Last 10 errors
    };
  }

  /**
   * Get all indexed references
   */
  public getAll(): ParsedCodeRef[] {
    return this.indexStore.getAll();
  }

  /**
   * Get total count of indexed references
   */
  public count(): number {
    return this.indexStore.count();
  }

  /**
   * Get index store for direct access to primary indices
   */
  public getIndexStore(): IndexStore {
    return this.indexStore;
  }

  /**
   * Get metadata index for direct access
   */
  public getMetadataIndex(): MetadataIndex {
    return this.metadataIndex;
  }

  /**
   * Get relationship index for direct access
   */
  public getRelationshipIndex(): RelationshipIndex {
    return this.relationshipIndex;
  }

  /**
   * Get query engine for unified queries
   */
  public getQueryEngine(): QueryEngine {
    return this.queryEngine;
  }

  /**
   * Query by type through query engine
   */
  public queryByType(type: string) {
    return this.queryEngine.byType(type);
  }

  /**
   * Query by path through query engine
   */
  public queryByPath(path: string) {
    return this.queryEngine.byPath(path);
  }

  /**
   * Query by path prefix through query engine
   */
  public queryByPathPrefix(prefix: string) {
    return this.queryEngine.byPathPrefix(prefix);
  }

  /**
   * Query by element through query engine
   */
  public queryByElement(element: string) {
    return this.queryEngine.byElement(element);
  }

  /**
   * Query by metadata through query engine
   */
  public queryByMetadata(category: MetadataCategory, value: string) {
    return this.queryEngine.byMetadata(category, value);
  }

  /**
   * Query by metadata multiple through query engine
   */
  public queryByMetadataMultiple(category: MetadataCategory, values: string[]) {
    return this.queryEngine.byMetadataMultiple(category, values);
  }

  /**
   * Query by relationship type through query engine
   */
  public queryByRelationshipType(type: RelationshipType) {
    return this.queryEngine.byRelationshipType(type);
  }

  /**
   * Complex query with multiple conditions
   */
  public complexQuery(conditions: {
    type?: string;
    path?: string;
    element?: string;
    metadata?: Array<{ category: MetadataCategory; value: string }>;
    filter?: (ref: ParsedCodeRef) => boolean;
  }) {
    return this.queryEngine.complex(conditions);
  }

  /**
   * Get all statistics
   */
  public getStats(): IndexerStats {
    return {
      total_indexed: this.total_indexed,
      total_failed: this.total_failed,
      stage: this.stage,
      index_stats: this.indexStore.getStats(),
      metadata_stats: this.metadataIndex.getStats(),
      relationship_stats: this.relationshipIndex.getStats(),
      query_stats: this.queryEngine.getStats(),
      last_indexed_at: this.last_indexed_at,
    };
  }

  /**
   * Get recent errors
   */
  public getErrors(limit: number = 10): Array<{ reference: string; error: string }> {
    return this.errors.slice(-limit);
  }

  /**
   * Clear all indices and reset
   */
  public reset(): void {
    this.indexStore.clear();
    this.metadataIndex.clear();
    this.relationshipIndex.clear();
    this.queryEngine.clearCache();

    this.stage = 'initialized';
    this.total_indexed = 0;
    this.total_failed = 0;
    this.last_indexed_at = null;
    this.errors = [];
  }

  /**
   * Enable query caching
   */
  public enableCaching(): void {
    this.queryEngine.enableCache();
  }

  /**
   * Disable query caching
   */
  public disableCaching(): void {
    this.queryEngine.disableCache();
  }

  /**
   * Clear query cache
   */
  public clearCache(): void {
    this.queryEngine.clearCache();
  }

  /**
   * Export current index state
   */
  public export() {
    return {
      index_store: this.indexStore.export(),
      metadata_index: this.metadataIndex.export(),
      relationship_index: this.relationshipIndex.export(),
      stats: this.getStats(),
    };
  }

  /**
   * Import index state
   */
  public import(data: {
    index_store?: { records: IndexRecord[] };
    metadata_index?: any;
    relationship_index?: any;
  }): void {
    if (data.index_store) {
      this.indexStore.import(data.index_store);
      this.total_indexed = this.indexStore.count();

      // Re-index metadata and relationships for imported records
      const records = this.indexStore.getAllRecords();
      this.metadataIndex.indexReferences(records);
      this.relationshipIndex.indexRecords(records);
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Generate reference ID
   */
  private refId(ref: ParsedCodeRef): string {
    return `${ref.type}:${ref.path}:${ref.element || 'none'}:${ref.line || 'none'}`;
  }
}

// Export for public API
export const createIndexerService = (queryEngineConfig?: QueryEngineConfig): IndexerService => {
  return new IndexerService(queryEngineConfig);
};

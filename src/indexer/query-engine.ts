/**
 * CodeRef2 Query Engine
 *
 * Multi-dimensional query interface for efficient reference lookups
 * Provides unified access to all index types with caching
 * Targets < 100ms query performance
 */

import { ParsedCodeRef } from '../parser/parser.js';
import { IndexStore } from './index-store.js';
import { MetadataIndex, MetadataCategory } from './metadata-index.js';
import { RelationshipIndex, RelationshipType } from './relationship-index.js';

/**
 * Query result with performance metrics
 */
export interface QueryResult {
  references: ParsedCodeRef[];
  count: number;
  execution_time_ms: number;
  from_cache: boolean;
}

/**
 * Query filter predicate
 */
export type QueryFilter = (ref: ParsedCodeRef) => boolean;

/**
 * Query engine configuration
 */
export interface QueryEngineConfig {
  enable_caching?: boolean;
  cache_max_size?: number;
  cache_ttl_ms?: number;
}

/**
 * Cache entry
 */
interface CacheEntry {
  results: ParsedCodeRef[];
  created_at: number;
  hit_count: number;
}

/**
 * Query Engine Manager
 */
export class QueryEngine {
  private indexStore: IndexStore;
  private metadataIndex: MetadataIndex;
  private relationshipIndex: RelationshipIndex;

  private config: Required<QueryEngineConfig>;
  private cache: Map<string, CacheEntry>;
  private cache_hits = 0;
  private cache_misses = 0;

  constructor(
    indexStore: IndexStore,
    metadataIndex: MetadataIndex,
    relationshipIndex: RelationshipIndex,
    config: QueryEngineConfig = {}
  ) {
    this.indexStore = indexStore;
    this.metadataIndex = metadataIndex;
    this.relationshipIndex = relationshipIndex;

    this.config = {
      enable_caching: config.enable_caching ?? true,
      cache_max_size: config.cache_max_size ?? 1000,
      cache_ttl_ms: config.cache_ttl_ms ?? 60000, // 1 minute
    };

    this.cache = new Map();
  }

  /**
   * Query by type
   */
  public byType(type: string): QueryResult {
    const key = `byType:${type}`;
    return this.executeQuery(key, () => this.indexStore.queryByType(type));
  }

  /**
   * Query by path
   */
  public byPath(path: string): QueryResult {
    const key = `byPath:${path}`;
    return this.executeQuery(key, () => this.indexStore.queryByPath(path));
  }

  /**
   * Query by path prefix (hierarchical)
   */
  public byPathPrefix(prefix: string): QueryResult {
    const key = `byPathPrefix:${prefix}`;
    return this.executeQuery(key, () =>
      Array.from(this.indexStore.getStorage().byPath.entries())
        .flatMap(([path, records]) =>
          path.startsWith(prefix) ? records.map((r: any) => r.parsed) : []
        )
    );
  }

  /**
   * Query by element name
   */
  public byElement(element: string): QueryResult {
    const key = `byElement:${element}`;
    return this.executeQuery(key, () => this.indexStore.queryByElement(element));
  }

  /**
   * Query by metadata
   */
  public byMetadata(category: MetadataCategory, value: string): QueryResult {
    const key = `byMetadata:${category}:${value}`;
    return this.executeQuery(key, () =>
      this.metadataIndex.query(category, value)
    );
  }

  /**
   * Query by multiple metadata values (OR logic)
   */
  public byMetadataMultiple(
    category: MetadataCategory,
    values: string[]
  ): QueryResult {
    const key = `byMetadataMultiple:${category}:${values.join(',')}`;
    return this.executeQuery(key, () =>
      this.metadataIndex.queryMultiple(category, values)
    );
  }

  /**
   * Query all metadata for a category
   */
  public byMetadataCategory(category: MetadataCategory): QueryResult {
    const key = `byMetadataCategory:${category}`;
    return this.executeQuery(key, () => {
      const results = this.metadataIndex.queryCategory(category);
      const allRefs: ParsedCodeRef[] = [];
      for (const { records } of results) {
        allRefs.push(...records);
      }
      return allRefs;
    });
  }

  /**
   * Query by relationship type
   */
  public byRelationshipType(type: RelationshipType): QueryResult {
    const key = `byRelationshipType:${type}`;
    return this.executeQuery(key, () => {
      const edges = this.relationshipIndex.getByType(type);
      const refs = new Set<string>();
      const results: ParsedCodeRef[] = [];

      for (const edge of edges) {
        const refId = this.refId(edge.from.parsed);
        if (!refs.has(refId)) {
          refs.add(refId);
          results.push(edge.from.parsed);
        }
      }

      return results;
    });
  }

  /**
   * Advanced filter query
   */
  public where(filter: QueryFilter): QueryResult {
    const key = `where:${filter.toString().substring(0, 50)}`;
    return this.executeQuery(
      key,
      () => this.indexStore.getAll().filter(filter),
      false // Don't cache complex filters by default
    );
  }

  /**
   * Complex query combining multiple conditions
   */
  public complex(
    conditions: {
      type?: string;
      path?: string;
      element?: string;
      metadata?: Array<{ category: MetadataCategory; value: string }>;
      filter?: QueryFilter;
    }
  ): QueryResult {
    let results = this.indexStore.getAll();

    // Apply type filter
    if (conditions.type) {
      results = results.filter(r => r.type === conditions.type);
    }

    // Apply path filter
    if (conditions.path) {
      results = results.filter(r => r.path === conditions.path);
    }

    // Apply element filter
    if (conditions.element) {
      results = results.filter(r => r.element === conditions.element);
    }

    // Apply metadata filters
    if (conditions.metadata && conditions.metadata.length > 0) {
      for (const { category, value } of conditions.metadata) {
        const metadataResults = this.metadataIndex.query(category, value);
        const metaIds = new Set(metadataResults.map(r => this.refId(r)));
        results = results.filter(r => metaIds.has(this.refId(r)));
      }
    }

    // Apply custom filter
    if (conditions.filter) {
      results = results.filter(conditions.filter);
    }

    const start = Date.now();
    const execution_time_ms = Date.now() - start;

    return {
      references: results,
      count: results.length,
      execution_time_ms,
      from_cache: false,
    };
  }

  /**
   * Pagination helper
   */
  public paginate(
    query: () => QueryResult,
    page: number = 1,
    pageSize: number = 50
  ): {
    references: ParsedCodeRef[];
    page: number;
    pageSize: number;
    total: number;
    pages: number;
  } {
    const result = query();
    const total = result.count;
    const pages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      references: result.references.slice(start, end),
      page,
      pageSize,
      total,
      pages,
    };
  }

  /**
   * Get statistics
   */
  public getStats(): {
    total_queries: number;
    cache_hits: number;
    cache_misses: number;
    cache_size: number;
    hit_rate: number;
  } {
    const total = this.cache_hits + this.cache_misses;
    const hit_rate = total > 0 ? (this.cache_hits / total) * 100 : 0;

    return {
      total_queries: total,
      cache_hits: this.cache_hits,
      cache_misses: this.cache_misses,
      cache_size: this.cache.size,
      hit_rate,
    };
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Disable cache
   */
  public disableCache(): void {
    this.config.enable_caching = false;
    this.clearCache();
  }

  /**
   * Enable cache
   */
  public enableCache(): void {
    this.config.enable_caching = true;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Execute query with caching
   */
  private executeQuery(
    cacheKey: string,
    queryFn: () => ParsedCodeRef[],
    useCache: boolean = true
  ): QueryResult {
    const start = Date.now();

    // Check cache
    if (this.config.enable_caching && useCache) {
      const cached = this.getCacheEntry(cacheKey);
      if (cached) {
        const execution_time_ms = Date.now() - start;
        this.cache_hits++;
        return {
          references: cached,
          count: cached.length,
          execution_time_ms,
          from_cache: true,
        };
      }
    }

    // Execute query
    const results = queryFn();
    const execution_time_ms = Date.now() - start;

    // Cache result
    if (this.config.enable_caching && useCache) {
      this.setCacheEntry(cacheKey, results);
    }

    this.cache_misses++;

    return {
      references: results,
      count: results.length,
      execution_time_ms,
      from_cache: false,
    };
  }

  /**
   * Get cache entry if valid
   */
  private getCacheEntry(key: string): ParsedCodeRef[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.created_at;
    if (age > this.config.cache_ttl_ms) {
      this.cache.delete(key);
      return null;
    }

    entry.hit_count++;
    return entry.results;
  }

  /**
   * Set cache entry
   */
  private setCacheEntry(key: string, results: ParsedCodeRef[]): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.config.cache_max_size) {
      let oldestKey = '';
      let oldestTime = Infinity;

      for (const [k, v] of this.cache.entries()) {
        if (v.created_at < oldestTime) {
          oldestTime = v.created_at;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      results,
      created_at: Date.now(),
      hit_count: 0,
    });
  }

  /**
   * Generate reference ID
   */
  private refId(ref: ParsedCodeRef): string {
    return `${ref.type}:${ref.path}:${ref.element || 'none'}:${ref.line || 'none'}`;
  }
}

// Export for public API
export const createQueryEngine = (
  indexStore: IndexStore,
  metadataIndex: MetadataIndex,
  relationshipIndex: RelationshipIndex,
  config?: QueryEngineConfig
): QueryEngine => {
  return new QueryEngine(indexStore, metadataIndex, relationshipIndex, config);
};

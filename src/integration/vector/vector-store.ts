/**
 * Vector Store Interface
 * P1-T4: Provider-agnostic interface for vector database operations
 *
 * Supports multiple vector database providers (Pinecone, Chroma, etc.) with
 * a unified interface for storing and querying code embeddings.
 */

/**
 * Metadata attached to each code chunk in the vector store
 *
 * This metadata enables filtering and provides context for search results
 */
export interface CodeChunkMetadata {
  /** CodeRef tag for precise code reference */
  coderef: string;

  /** Element type (function, class, method, etc.) */
  type: string;

  /** Element name */
  name: string;

  /** File path relative to project root */
  file: string;

  /** Line number in file */
  line: number;

  /** Programming language */
  language: string;

  /** Whether element is exported */
  exported?: boolean;

  /** JSDoc/docstring documentation */
  documentation?: string;

  /** Number of dependencies */
  dependencyCount?: number;

  /** Number of dependents */
  dependentCount?: number;

  /** Cyclomatic complexity */
  complexity?: number;

  /** Test coverage percentage (0-100) */
  coverage?: number;

  /** Additional custom metadata */
  [key: string]: any;
}

/**
 * Vector record to be stored in the database
 */
export interface VectorRecord {
  /** Unique identifier (typically CodeRef tag) */
  id: string;

  /** Embedding vector (typically 1536 dimensions for OpenAI) */
  values: number[];

  /** Metadata for filtering and context */
  metadata: CodeChunkMetadata;
}

/**
 * Options for querying the vector store
 */
export interface QueryOptions {
  /** Number of results to return (default: 10) */
  topK?: number;

  /** Metadata filters */
  filter?: Partial<CodeChunkMetadata>;

  /** Whether to include metadata in results (default: true) */
  includeMetadata?: boolean;

  /** Whether to include vectors in results (default: false) */
  includeValues?: boolean;

  /** Minimum relevance score threshold (0-1) */
  minScore?: number;

  /** Namespace for multi-tenancy (optional) */
  namespace?: string;
}

/**
 * A single match from a vector query
 */
export interface VectorMatch {
  /** Unique identifier (CodeRef tag) */
  id: string;

  /** Relevance score (0-1, higher is more relevant) */
  score: number;

  /** Metadata for the matched chunk */
  metadata?: CodeChunkMetadata;

  /** Embedding vector (only if includeValues: true) */
  values?: number[];
}

/**
 * Result from a vector query
 */
export interface VectorQueryResult {
  /** Array of matches sorted by relevance */
  matches: VectorMatch[];

  /** Namespace queried (if applicable) */
  namespace?: string;
}

/**
 * Statistics about the vector store
 */
export interface VectorStoreStats {
  /** Total number of vectors stored */
  totalVectors: number;

  /** Dimension of vectors */
  dimension: number;

  /** Namespaces (if multi-tenancy supported) */
  namespaces?: string[];

  /** Additional provider-specific stats */
  [key: string]: any;
}

/**
 * Error thrown by vector store operations
 */
export class VectorStoreError extends Error {
  constructor(
    message: string,
    public code: VectorStoreErrorCode,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'VectorStoreError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, VectorStoreError);
    }
  }
}

/**
 * Error codes for vector store operations
 */
export enum VectorStoreErrorCode {
  /** Connection error */
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  /** Index/collection not found */
  INDEX_NOT_FOUND = 'INDEX_NOT_FOUND',

  /** Invalid vector dimensions */
  INVALID_DIMENSIONS = 'INVALID_DIMENSIONS',

  /** Invalid query parameters */
  INVALID_QUERY = 'INVALID_QUERY',

  /** Rate limit exceeded */
  RATE_LIMIT = 'RATE_LIMIT',

  /** Unknown error */
  UNKNOWN = 'UNKNOWN'
}

/**
 * Main vector store interface
 *
 * All vector database providers (Pinecone, Chroma, etc.) must implement
 * this interface to ensure consistent behavior across the RAG system.
 */
export interface VectorStore {
  /**
   * Store or update vectors in the database
   *
   * @param records - Array of vector records to upsert
   * @param namespace - Optional namespace for multi-tenancy
   * @throws {VectorStoreError} If the operation fails
   *
   * @example
   * ```typescript
   * await store.upsert([
   *   {
   *     id: '@Fn/auth/login#authenticate:24',
   *     values: [0.1, 0.2, ...], // 1536-dim vector
   *     metadata: {
   *       coderef: '@Fn/auth/login#authenticate:24',
   *       type: 'function',
   *       name: 'authenticate',
   *       file: 'auth/login.ts',
   *       line: 24,
   *       language: 'typescript'
   *     }
   *   }
   * ]);
   * ```
   */
  upsert(records: VectorRecord[], namespace?: string): Promise<void>;

  /**
   * Query for similar vectors
   *
   * @param vector - Query vector to find similar vectors
   * @param options - Query options (topK, filters, etc.)
   * @returns Promise resolving to query results
   * @throws {VectorStoreError} If the query fails
   *
   * @example
   * ```typescript
   * const results = await store.query(
   *   [0.1, 0.2, ...], // Query vector
   *   {
   *     topK: 5,
   *     filter: { language: 'typescript', type: 'function' },
   *     minScore: 0.7
   *   }
   * );
   *
   * for (const match of results.matches) {
   *   console.log(match.metadata.coderef, match.score);
   * }
   * ```
   */
  query(vector: number[], options?: QueryOptions): Promise<VectorQueryResult>;

  /**
   * Delete vectors by ID
   *
   * @param ids - Array of vector IDs to delete
   * @param namespace - Optional namespace
   * @throws {VectorStoreError} If the operation fails
   *
   * @example
   * ```typescript
   * await store.delete([
   *   '@Fn/auth/login#authenticate:24',
   *   '@Fn/auth/logout#logout:42'
   * ]);
   * ```
   */
  delete(ids: string[], namespace?: string): Promise<void>;

  /**
   * Clear all vectors from the store
   *
   * @param namespace - Optional namespace to clear (if omitted, clears all)
   * @throws {VectorStoreError} If the operation fails
   *
   * @example
   * ```typescript
   * await store.clear(); // Clear all vectors
   * await store.clear('my-project'); // Clear specific namespace
   * ```
   */
  clear(namespace?: string): Promise<void>;

  /**
   * Get statistics about the vector store
   *
   * @returns Promise resolving to store statistics
   *
   * @example
   * ```typescript
   * const stats = await store.stats();
   * console.log(`Total vectors: ${stats.totalVectors}`);
   * console.log(`Dimension: ${stats.dimension}`);
   * ```
   */
  stats(): Promise<VectorStoreStats>;

  /**
   * Get the provider name
   *
   * @returns Provider identifier (e.g., 'pinecone', 'chroma')
   */
  getProviderName(): string;
}

/**
 * Configuration for vector store
 */
export interface VectorStoreConfig {
  /** API key or connection string */
  apiKey?: string;

  /** Environment (for cloud providers) */
  environment?: string;

  /** Index/collection name */
  indexName?: string;

  /** Vector dimension (e.g., 1536 for OpenAI embeddings) */
  dimension?: number;

  /** Metric for similarity (cosine, euclidean, dotProduct) */
  metric?: 'cosine' | 'euclidean' | 'dotProduct';

  /** Host URL (for self-hosted providers) */
  host?: string;

  /** Port (for self-hosted providers) */
  port?: number;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Additional provider-specific options */
  [key: string]: any;
}

/**
 * Factory function type for creating vector stores
 */
export type VectorStoreFactory = (config: VectorStoreConfig) => VectorStore;

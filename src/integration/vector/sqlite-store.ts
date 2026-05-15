/**
 * @coderef-semantic: 1.0.0
 * @exports SQLiteVectorStore
 * @used_by src/cli/coderef-rag-server.ts, src/cli/rag-index.ts, src/cli/rag-search.ts, __tests__/integration/rag/facet-filter.test.ts
 */



/**
 * SQLite/File-based Vector Store
 * WO-SQLITE-VECTOR-STORE-001
 *
 * A lightweight, file-based vector store that requires no external services.
 * Uses JSON file storage with cosine similarity for vector search.
 *
 * Benefits:
 * - Works out of the box (no Docker, no external DB)
 * - Pure JavaScript (no native modules)
 * - Persistent storage in .coderef/ directory
 * - Suitable for codebases up to ~10,000 files
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  VectorStore,
  VectorRecord,
  VectorStoreConfig,
  QueryOptions,
  VectorQueryResult,
  VectorMatch,
  VectorStoreStats,
  VectorStoreError,
  VectorStoreErrorCode,
  CodeChunkMetadata
} from './vector-store.js';

/**
 * Internal storage format
 */
interface StorageData {
  version: string;
  dimension: number;
  records: Record<string, StoredRecord>;
  namespaces: string[];
  createdAt: string;
  updatedAt: string;
}

interface StoredRecord {
  id: string;
  values: number[];
  metadata: CodeChunkMetadata;
  namespace?: string;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Check if a record matches the filter criteria
 */
function matchesFilter(
  metadata: CodeChunkMetadata,
  filter?: Partial<CodeChunkMetadata>
): boolean {
  if (!filter) return true;

  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && metadata[key] !== value) {
      return false;
    }
  }

  return true;
}

/**
 * SQLite/File-based Vector Store Implementation
 *
 * @example
 * ```typescript
 * const store = new SQLiteVectorStore({
 *   indexName: 'my-project',
 *   storagePath: './.coderef'
 * });
 *
 * await store.initialize();
 *
 * await store.upsert([
 *   {
 *     id: '@Fn/auth#login:24',
 *     values: [0.1, 0.2, ...],
 *     metadata: { coderef: '@Fn/auth#login:24', type: 'function', ... }
 *   }
 * ]);
 *
 * const results = await store.query([0.1, 0.2, ...], { topK: 5 });
 * ```
 */
export class SQLiteVectorStore implements VectorStore {
  private config: VectorStoreConfig;
  private storagePath: string;
  private data: StorageData;
  private initialized: boolean = false;

  constructor(config: VectorStoreConfig) {
    this.config = {
      dimension: 1536, // Default OpenAI embedding dimension
      metric: 'cosine',
      ...config
    };

    // Determine storage path.
    //
    // The `storagePath` config field has historically been overloaded: callers
    // sometimes pass a project root (basePath), sometimes pass a directory
    // path that already contains `.coderef/`, and rag-index passes the full
    // intended file path including a misleading `.sqlite` suffix. We accept
    // any of these and resolve to a single .json file:
    //
    //   - if storagePath ends in `.json` → use it as-is
    //   - if storagePath looks like a basePath (no extension) → join
    //     `.coderef/{indexName}.json` onto it
    //   - default (no storagePath) → cwd + `.coderef/{indexName}.json`
    const indexName = config.indexName || 'coderef-vectors';
    const raw = config.storagePath;
    if (raw && raw.endsWith('.json')) {
      this.storagePath = raw;
    } else {
      const basePath = raw || process.cwd();
      this.storagePath = path.join(basePath, '.coderef', `${indexName}.json`);
    }

    // Initialize empty data structure
    this.data = this.createEmptyStorage();
  }

  /**
   * Create empty storage structure
   */
  private createEmptyStorage(): StorageData {
    return {
      version: '1.0.0',
      dimension: this.config.dimension || 1536,
      records: {},
      namespaces: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Initialize the vector store (load from disk if exists)
   */
  async initialize(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Legacy cleanup: prior versions sometimes created a directory at the
      // intended file path (path-join bug from rag-index/sqlite-store before
      // 2026-04-25). If we see a directory where a file should be, remove it
      // so we can write the file fresh. No data lost — the actual store
      // contents lived nested inside as `<dir>/.coderef/coderef-vectors.json`,
      // and that nested file is unreachable through any current code path.
      if (fs.existsSync(this.storagePath) && fs.statSync(this.storagePath).isDirectory()) {
        fs.rmSync(this.storagePath, { recursive: true, force: true });
      }

      // Load existing data if available
      if (fs.existsSync(this.storagePath)) {
        const content = fs.readFileSync(this.storagePath, 'utf-8');
        const loaded = JSON.parse(content) as StorageData;

        // Check for dimension mismatch between stored data and expected config
        if (loaded.dimension !== this.config.dimension) {
          throw new VectorStoreError(
            `Dimension mismatch: vector store at ${this.storagePath} has ` +
            `${loaded.dimension} dimensions but the active provider requires ` +
            `${this.config.dimension}. Run rag-index with --reset to recreate, ` +
            `or delete this file by hand: ${this.storagePath}`,
            VectorStoreErrorCode.INVALID_DIMENSIONS
          );
        }

        this.data = loaded;
      } else {
        // Create new storage file
        this.data = this.createEmptyStorage();
        await this.save();
      }

      this.initialized = true;
    } catch (error) {
      throw new VectorStoreError(
        `Failed to initialize SQLite vector store: ${error}`,
        VectorStoreErrorCode.CONNECTION_ERROR,
        error as Error
      );
    }
  }

  /**
   * Save data to disk
   */
  private async save(): Promise<void> {
    try {
      this.data.updatedAt = new Date().toISOString();
      fs.writeFileSync(this.storagePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      throw new VectorStoreError(
        `Failed to save vector store: ${error}`,
        VectorStoreErrorCode.UNKNOWN,
        error as Error
      );
    }
  }

  /**
   * Ensure store is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new VectorStoreError(
        'Vector store not initialized. Call initialize() first.',
        VectorStoreErrorCode.CONNECTION_ERROR
      );
    }
  }

  /**
   * Store or update vectors
   */
  async upsert(records: VectorRecord[], namespace?: string): Promise<void> {
    this.ensureInitialized();

    try {
      for (const record of records) {
        // Validate dimension
        if (record.values.length !== this.data.dimension) {
          throw new VectorStoreError(
            `Invalid vector dimension: expected ${this.data.dimension}, got ${record.values.length}`,
            VectorStoreErrorCode.INVALID_DIMENSIONS
          );
        }

        // Store record
        this.data.records[record.id] = {
          id: record.id,
          values: record.values,
          metadata: record.metadata,
          namespace
        };

        // Track namespace
        if (namespace && !this.data.namespaces.includes(namespace)) {
          this.data.namespaces.push(namespace);
        }
      }

      await this.save();
    } catch (error) {
      if (error instanceof VectorStoreError) throw error;
      throw new VectorStoreError(
        `Failed to upsert vectors: ${error}`,
        VectorStoreErrorCode.UNKNOWN,
        error as Error
      );
    }
  }

  /**
   * Query for similar vectors
   */
  async query(vector: number[], options?: QueryOptions): Promise<VectorQueryResult> {
    this.ensureInitialized();

    try {
      const {
        topK = 10,
        filter,
        includeMetadata = true,
        includeValues = false,
        minScore = 0,
        namespace
      } = options || {};

      // Validate query vector dimension
      if (vector.length !== this.data.dimension) {
        throw new VectorStoreError(
          `Invalid query vector dimension: expected ${this.data.dimension}, got ${vector.length}`,
          VectorStoreErrorCode.INVALID_DIMENSIONS
        );
      }

      // Calculate similarities
      const matches: VectorMatch[] = [];

      for (const record of Object.values(this.data.records)) {
        // Filter by namespace
        if (namespace && record.namespace !== namespace) {
          continue;
        }

        // Filter by metadata
        if (!matchesFilter(record.metadata, filter)) {
          continue;
        }

        // Calculate similarity
        const score = cosineSimilarity(vector, record.values);

        // Filter by minimum score
        if (score < minScore) {
          continue;
        }

        const match: VectorMatch = {
          id: record.id,
          score
        };

        if (includeMetadata) {
          match.metadata = record.metadata;
        }

        if (includeValues) {
          match.values = record.values;
        }

        matches.push(match);
      }

      // Sort by score descending
      matches.sort((a, b) => b.score - a.score);

      // Return top K results
      return {
        matches: matches.slice(0, topK),
        namespace
      };
    } catch (error) {
      if (error instanceof VectorStoreError) throw error;
      throw new VectorStoreError(
        `Failed to query vectors: ${error}`,
        VectorStoreErrorCode.INVALID_QUERY,
        error as Error
      );
    }
  }

  /**
   * Delete vectors by ID
   */
  async delete(ids: string[], namespace?: string): Promise<void> {
    this.ensureInitialized();

    try {
      for (const id of ids) {
        const record = this.data.records[id];

        // Check namespace if specified
        if (namespace && record?.namespace !== namespace) {
          continue;
        }

        delete this.data.records[id];
      }

      await this.save();
    } catch (error) {
      throw new VectorStoreError(
        `Failed to delete vectors: ${error}`,
        VectorStoreErrorCode.UNKNOWN,
        error as Error
      );
    }
  }

  /**
   * Clear all vectors
   */
  async clear(namespace?: string): Promise<void> {
    this.ensureInitialized();

    try {
      if (namespace) {
        // Clear only specified namespace
        for (const [id, record] of Object.entries(this.data.records)) {
          if (record.namespace === namespace) {
            delete this.data.records[id];
          }
        }

        // Remove namespace from list
        this.data.namespaces = this.data.namespaces.filter(ns => ns !== namespace);
      } else {
        // Clear all
        this.data.records = {};
        this.data.namespaces = [];
      }

      await this.save();
    } catch (error) {
      throw new VectorStoreError(
        `Failed to clear vectors: ${error}`,
        VectorStoreErrorCode.UNKNOWN,
        error as Error
      );
    }
  }

  /**
   * Get statistics
   */
  async stats(): Promise<VectorStoreStats> {
    this.ensureInitialized();

    return {
      totalVectors: Object.keys(this.data.records).length,
      dimension: this.data.dimension,
      namespaces: this.data.namespaces,
      storagePath: this.storagePath,
      version: this.data.version,
      createdAt: this.data.createdAt,
      updatedAt: this.data.updatedAt
    };
  }

  /**
   * Fetch a single vector record by ID
   */
  async fetchById(id: string, namespace?: string): Promise<VectorRecord | null> {
    this.ensureInitialized();

    try {
      const record = this.data.records[id];

      if (!record) {
        return null;
      }

      // Check namespace if specified
      if (namespace && record.namespace !== namespace) {
        return null;
      }

      return {
        id: record.id,
        values: record.values,
        metadata: record.metadata
      };
    } catch (error) {
      throw new VectorStoreError(
        `Failed to fetch vector by ID: ${error}`,
        VectorStoreErrorCode.UNKNOWN,
        error as Error
      );
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'sqlite';
  }

  /**
   * Check if store file exists
   */
  exists(): boolean {
    return fs.existsSync(this.storagePath);
  }

  /**
   * Get storage file path
   */
  getStoragePath(): string {
    return this.storagePath;
  }
}

export default SQLiteVectorStore;

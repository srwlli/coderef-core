/**
 * Chroma Vector Store Implementation
 * P1-T6: Implements VectorStore interface using Chroma (self-hosted option)
 */

import { ChromaClient, Collection } from 'chromadb';
import type {
  VectorStore,
  VectorRecord,
  QueryOptions,
  VectorQueryResult,
  VectorStoreStats,
  VectorStoreConfig,
  VectorMatch
} from './vector-store.js';
import { VectorStoreError, VectorStoreErrorCode } from './vector-store.js';

/**
 * Chroma vector store implementation
 *
 * Chroma is an open-source embedding database that can run locally or self-hosted.
 * This provides an alternative to cloud-based vector stores like Pinecone.
 *
 * @example
 * ```typescript
 * // Local Chroma instance
 * const store = new ChromaStore({
 *   host: 'http://localhost',
 *   port: 8000,
 *   indexName: 'coderef-collection'
 * });
 *
 * // Or remote Chroma instance
 * const store = new ChromaStore({
 *   host: 'https://my-chroma-server.com',
 *   indexName: 'coderef-collection'
 * });
 *
 * await store.initialize();
 * ```
 */
export class ChromaStore implements VectorStore {
  private client: ChromaClient;
  private collectionName: string;
  private collection?: Collection;
  private dimension: number;

  constructor(config: VectorStoreConfig) {
    if (!config.indexName) {
      throw new VectorStoreError(
        'Collection name (indexName) is required for Chroma',
        VectorStoreErrorCode.INVALID_QUERY
      );
    }

    const host = config.host ?? 'http://localhost';
    const port = config.port ?? 8000;

    this.client = new ChromaClient({
      path: `${host}:${port}`
    });

    this.collectionName = config.indexName;
    this.dimension = config.dimension ?? 1536;
  }

  /**
   * Initialize connection and create/get collection
   */
  async initialize(): Promise<void> {
    try {
      // Get or create collection with cosine similarity
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: {
          'hnsw:space': 'cosine' // Use cosine similarity
        }
      });
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Upsert vectors to Chroma
   */
  async upsert(records: VectorRecord[], namespace?: string): Promise<void> {
    if (!this.collection) {
      throw new VectorStoreError(
        'Chroma store not initialized. Call initialize() first',
        VectorStoreErrorCode.CONNECTION_ERROR
      );
    }

    if (records.length === 0) {
      return;
    }

    try {
      // Chroma uses different parameter names
      const ids = records.map(r => r.id);
      const embeddings = records.map(r => r.values);
      const metadatas = records.map(r => {
        // Add namespace to metadata if provided
        const metadata = { ...r.metadata } as any;
        if (namespace) {
          metadata._namespace = namespace;
        }
        return metadata;
      });

      // Chroma requires documents, we'll use CodeRef as document
      const documents = records.map(r => r.metadata.coderef);

      await this.collection.upsert({
        ids,
        embeddings,
        metadatas,
        documents
      });
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Query for similar vectors
   */
  async query(vector: number[], options?: QueryOptions): Promise<VectorQueryResult> {
    if (!this.collection) {
      throw new VectorStoreError(
        'Chroma store not initialized. Call initialize() first',
        VectorStoreErrorCode.CONNECTION_ERROR
      );
    }

    try {
      const queryParams: any = {
        queryEmbeddings: [vector],
        nResults: options?.topK ?? 10
      };

      // Add namespace filter if provided
      if (options?.namespace || options?.filter) {
        const where: Record<string, any> = {};

        if (options.namespace) {
          where._namespace = { $eq: options.namespace };
        }

        if (options.filter) {
          // Merge custom filters
          Object.entries(options.filter).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              where[key] = { $eq: value };
            }
          });
        }

        if (Object.keys(where).length > 0) {
          queryParams.where = where;
        }
      }

      const results = await this.collection.query(queryParams);

      // Chroma returns results in a different format
      const ids = results.ids[0] || [];
      const distances = results.distances?.[0] || [];
      const metadatas = results.metadatas?.[0] || [];
      const documents = results.documents?.[0] || [];

      // Convert distances to similarity scores (cosine similarity)
      // Chroma returns cosine distance (0-2), convert to similarity (0-1)
      const scores = distances.map(d => 1 - (d / 2));

      // Build matches
      let matches: VectorMatch[] = ids.map((id, i) => ({
        id,
        score: scores[i],
        metadata: metadatas[i] as any,
        values: options?.includeValues ? undefined : undefined // Chroma doesn't return vectors by default
      }));

      // Filter by minimum score if specified
      if (options?.minScore !== undefined) {
        matches = matches.filter(m => m.score >= options.minScore!);
      }

      return {
        matches,
        namespace: options?.namespace
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete vectors by ID
   */
  async delete(ids: string[], namespace?: string): Promise<void> {
    if (!this.collection) {
      throw new VectorStoreError(
        'Chroma store not initialized. Call initialize() first',
        VectorStoreErrorCode.CONNECTION_ERROR
      );
    }

    if (ids.length === 0) {
      return;
    }

    try {
      // If namespace is specified, need to filter by namespace
      const deleteParams: any = { ids };

      if (namespace) {
        deleteParams.where = {
          _namespace: { $eq: namespace }
        };
      }

      await this.collection.delete(deleteParams);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Clear all vectors
   */
  async clear(namespace?: string): Promise<void> {
    if (!this.collection) {
      throw new VectorStoreError(
        'Chroma store not initialized. Call initialize() first',
        VectorStoreErrorCode.CONNECTION_ERROR
      );
    }

    try {
      if (namespace) {
        // Delete all items in namespace
        await this.collection.delete({
          where: {
            _namespace: { $eq: namespace }
          }
        });
      } else {
        // Delete the entire collection and recreate
        await this.client.deleteCollection({ name: this.collectionName });
        await this.initialize();
      }
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Get store statistics
   */
  async stats(): Promise<VectorStoreStats> {
    if (!this.collection) {
      throw new VectorStoreError(
        'Chroma store not initialized. Call initialize() first',
        VectorStoreErrorCode.CONNECTION_ERROR
      );
    }

    try {
      const count = await this.collection.count();

      // Try to get namespaces by querying metadata
      // This is a workaround since Chroma doesn't have a native namespace concept
      let namespaces: string[] = [];
      try {
        const sample = await this.collection.get({ limit: 1000 });
        const namespaceSet = new Set<string>();
        sample.metadatas?.forEach((meta: any) => {
          if (meta?._namespace) {
            namespaceSet.add(meta._namespace);
          }
        });
        namespaces = Array.from(namespaceSet);
      } catch {
        // If sampling fails, just skip namespaces
      }

      return {
        totalVectors: count,
        dimension: this.dimension,
        namespaces: namespaces.length > 0 ? namespaces : undefined,
        collectionName: this.collectionName
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'chroma';
  }

  /**
   * Handle Chroma errors and convert to VectorStoreError
   */
  private handleError(error: any): VectorStoreError {
    // Check for specific error patterns
    if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
      return new VectorStoreError(
        `Chroma collection not found: ${this.collectionName}`,
        VectorStoreErrorCode.INDEX_NOT_FOUND,
        error
      );
    }

    if (error.message?.includes('dimension')) {
      return new VectorStoreError(
        'Invalid vector dimensions',
        VectorStoreErrorCode.INVALID_DIMENSIONS,
        error
      );
    }

    if (
      error.message?.includes('connection') ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND'
    ) {
      return new VectorStoreError(
        'Connection error to Chroma. Make sure Chroma server is running.',
        VectorStoreErrorCode.CONNECTION_ERROR,
        error
      );
    }

    // Unknown error
    return new VectorStoreError(
      `Chroma error: ${error.message}`,
      VectorStoreErrorCode.UNKNOWN,
      error
    );
  }
}

/**
 * Factory function to create Chroma store
 */
export async function createChromaStore(
  config: VectorStoreConfig
): Promise<ChromaStore> {
  const store = new ChromaStore(config);
  await store.initialize();
  return store;
}

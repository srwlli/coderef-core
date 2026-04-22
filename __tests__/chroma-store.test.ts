/**
 * ChromaStore Unit Tests
 * WO-RAG-PINECONE-CHROMA-STORES-001
 *
 * Tests for ChromaStore vector store implementation with mocked client.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChromaStore } from '../src/integration/vector/chroma-store.js';
import { VectorStoreError, VectorStoreErrorCode } from '../src/integration/vector/vector-store.js';

// Mock Chroma client
const mockAdd = vi.fn();
const mockQuery = vi.fn();
const mockDelete = vi.fn();
const mockCount = vi.fn();
const mockPeek = vi.fn();

const mockCollection = {
  add: mockAdd,
  query: mockQuery,
  delete: mockDelete,
  count: mockCount,
  peek: mockPeek,
};

const mockGetOrCreateCollection = vi.fn();
const mockDeleteCollection = vi.fn();

vi.mock('chromadb', () => ({
  ChromaClient: vi.fn().mockImplementation(() => ({
    getOrCreateCollection: mockGetOrCreateCollection,
    deleteCollection: mockDeleteCollection,
  })),
}));

describe('ChromaStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrCreateCollection.mockResolvedValue(mockCollection);
  });

  describe('constructor', () => {
    it('should throw error when collection name is missing', () => {
      expect(() => new ChromaStore({
        host: 'http://localhost:8000',
        dimension: 768,
      })).toThrow(VectorStoreError);
    });

    it('should create store with valid config', () => {
      const store = new ChromaStore({
        host: 'http://localhost:8000',
        indexName: 'test-collection',
        dimension: 768,
      });
      expect(store.getProviderName()).toBe('chroma');
    });

    it('should use localhost:8000 as default host', () => {
      const store = new ChromaStore({
        indexName: 'test-collection',
        dimension: 768,
      });
      // Just verify it creates without error - actual URL is used in initialize
      expect(store.getProviderName()).toBe('chroma');
    });
  });

  describe('initialize', () => {
    it('should create/get collection on initialize', async () => {
      const store = new ChromaStore({
        host: 'http://localhost:8000',
        indexName: 'test-collection',
        dimension: 768,
      });

      await store.initialize();

      expect(mockGetOrCreateCollection).toHaveBeenCalledWith({
        name: 'test-collection',
        metadata: { dimension: 768, metric: 'cosine' },
      });
    });

    it('should throw connection error if Chroma is unreachable', async () => {
      mockGetOrCreateCollection.mockRejectedValue(new Error('ECONNREFUSED'));

      const store = new ChromaStore({
        host: 'http://localhost:8000',
        indexName: 'test-collection',
        dimension: 768,
      });

      await expect(store.initialize()).rejects.toThrow(VectorStoreError);
    });
  });

  describe('upsert', () => {
    it('should add vectors to collection', async () => {
      const store = new ChromaStore({
        host: 'http://localhost:8000',
        indexName: 'test-collection',
        dimension: 768,
      });
      await store.initialize();

      const records = [
        {
          id: 'vec1',
          values: new Array(768).fill(0.1),
          metadata: { coderef: '@Fn/test#test:1', type: 'function', name: 'test', file: 'test.ts', line: 1, language: 'typescript' }
        },
        {
          id: 'vec2',
          values: new Array(768).fill(0.2),
          metadata: { coderef: '@Cl/TestClass:1', type: 'class', name: 'TestClass', file: 'test.ts', line: 1, language: 'typescript' }
        },
      ];

      await store.upsert(records);

      expect(mockAdd).toHaveBeenCalledWith({
        ids: ['vec1', 'vec2'],
        embeddings: [expect.any(Array), expect.any(Array)],
        metadatas: [
          { coderef: '@Fn/test#test:1', type: 'function', name: 'test', file: 'test.ts', line: 1, language: 'typescript' },
          { coderef: '@Cl/TestClass:1', type: 'class', name: 'TestClass', file: 'test.ts', line: 1, language: 'typescript' },
        ],
      });
    });

    it('should handle empty records', async () => {
      const store = new ChromaStore({
        host: 'http://localhost:8000',
        indexName: 'test-collection',
        dimension: 768,
      });
      await store.initialize();

      await store.upsert([]);

      expect(mockAdd).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should query vectors and return matches', async () => {
      mockQuery.mockResolvedValue({
        ids: [['vec1', 'vec2']],
        distances: [[0.05, 0.15]],
        metadatas: [[
          { coderef: '@Fn/test#test:1', type: 'function', name: 'test', file: 'test.ts', line: 1, language: 'typescript' },
          { coderef: '@Cl/TestClass:1', type: 'class', name: 'TestClass', file: 'test.ts', line: 1, language: 'typescript' },
        ]],
      });

      const store = new ChromaStore({
        host: 'http://localhost:8000',
        indexName: 'test-collection',
        dimension: 768,
      });
      await store.initialize();

      const results = await store.query(new Array(768).fill(0.1), { topK: 5 });

      expect(results.matches).toHaveLength(2);
      expect(results.matches[0].id).toBe('vec1');
      // Chroma returns distance (lower is better), we convert to similarity score
      expect(results.matches[0].score).toBeGreaterThan(0);
    });

    it('should filter by minScore', async () => {
      mockQuery.mockResolvedValue({
        ids: [['vec1', 'vec2', 'vec3']],
        distances: [[0.05, 0.35, 0.65]],
        metadatas: [[
          { coderef: '@Fn/test#test:1', type: 'function', name: 'test', file: 'test.ts', line: 1, language: 'typescript' },
          { coderef: '@Fn/test2#test2:1', type: 'function', name: 'test2', file: 'test.ts', line: 1, language: 'typescript' },
          { coderef: '@Fn/test3#test3:1', type: 'function', name: 'test3', file: 'test.ts', line: 1, language: 'typescript' },
        ]],
      });

      const store = new ChromaStore({
        host: 'http://localhost:8000',
        indexName: 'test-collection',
        dimension: 768,
      });
      await store.initialize();

      const results = await store.query(new Array(768).fill(0.1), { topK: 10, minScore: 0.7 });

      // Only vec1 with distance 0.05 -> score ~0.95 should pass
      expect(results.matches).toHaveLength(1);
      expect(results.matches[0].id).toBe('vec1');
    });
  });

  describe('delete', () => {
    it('should delete vectors by ID', async () => {
      const store = new ChromaStore({
        host: 'http://localhost:8000',
        indexName: 'test-collection',
        dimension: 768,
      });
      await store.initialize();

      await store.delete(['vec1', 'vec2']);

      expect(mockDelete).toHaveBeenCalledWith({ ids: ['vec1', 'vec2'] });
    });

    it('should handle empty delete array', async () => {
      const store = new ChromaStore({
        host: 'http://localhost:8000',
        indexName: 'test-collection',
        dimension: 768,
      });
      await store.initialize();

      await store.delete([]);

      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should delete and recreate collection', async () => {
      const store = new ChromaStore({
        host: 'http://localhost:8000',
        indexName: 'test-collection',
        dimension: 768,
      });
      await store.initialize();

      await store.clear();

      expect(mockDeleteCollection).toHaveBeenCalledWith({ name: 'test-collection' });
      expect(mockGetOrCreateCollection).toHaveBeenCalledTimes(2); // init + clear
    });
  });

  describe('stats', () => {
    it('should return store statistics', async () => {
      mockCount.mockResolvedValue(100);

      const store = new ChromaStore({
        host: 'http://localhost:8000',
        indexName: 'test-collection',
        dimension: 768,
      });
      await store.initialize();

      const stats = await store.stats();

      expect(stats.totalVectors).toBe(100);
      expect(stats.dimension).toBe(768);
    });
  });
});

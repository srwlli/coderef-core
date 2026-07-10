/**
 * @coderef-semantic: 1.0.0
 * @layer integration
 * @capability semantic-search-search-result
 * @exports SearchResult, SearchOptions, QueryContext, SearchResponse, SemanticSearchService
 * @used_by src/cli/coderef-rag-server.ts, src/cli/rag-search.ts, src/integration/rag/answer-generation-service.ts, src/integration/rag/context-builder.ts, src/integration/rag/graph-reranker.ts, src/integration/rag/__tests__/graph-reranker.test.ts
 */

/**
 * Semantic Search Service
 * P3-T2: Implements semantic code search using vector similarity
 *
 * Enables natural language queries against the codebase by:
 * 1. Embedding the query
 * 2. Searching vector store for similar code
 * 3. Returning ranked results
 */



import type { LLMProvider } from '../llm/llm-provider.js';
import type { VectorStore, QueryOptions as VectorQueryOptions } from '../vector/vector-store.js';
interface _GraphNode { id: string; name?: string; type: string; file: string; line?: number; metadata?: Record<string, unknown>; }
interface _GraphEdge { source: string; target: string; type: string; }
interface DependencyGraph { nodes: Map<string, _GraphNode>; edges: _GraphEdge[]; edgesBySource: Map<string, _GraphEdge[]>; edgesByTarget: Map<string, _GraphEdge[]>; }
import {
  EmbeddingTextGenerator,
  type TextGenerationOptions
} from './embedding-text-generator.js';
import type { CodeChunkMetadata } from '../vector/vector-store.js';
import {
  SparseRetriever,
  reciprocalRankFusion,
  type RankedList
} from './sparse-retriever.js';

/**
 * A search result with code metadata
 */
export interface SearchResult {
  /** CodeRef tag */
  coderef: string;

  /** Relevance score (0-1, higher is more relevant) */
  score: number;

  /** Code metadata */
  metadata: CodeChunkMetadata;

  /** Snippet of the code (if available) */
  snippet?: string;
}

/**
 * Options for semantic search
 */
export interface SearchOptions {
  /** Number of results to return (default: 10) */
  topK?: number;

  /** Minimum relevance score threshold (0-1) */
  minScore?: number;

  /** Filter by programming language */
  language?: string;

  /** Filter by element type (function, class, etc.) */
  type?: string;

  /** Filter by file path */
  file?: string;

  /** Filter by exported status */
  exported?: boolean;

  /** Additional metadata filters */
  filters?: Partial<CodeChunkMetadata>;

  /** Namespace for multi-tenancy */
  namespace?: string;

  /**
   * Hybrid retrieval toggle (STUB-Q7MRD6). When true (the default), a sparse/
   * BM25 lexical leg runs in parallel with the dense/embedding leg and the two
   * ranked lists are fused via reciprocal-rank fusion before results are
   * returned. Set false to force embedding-only retrieval (A/B testing, or when
   * the store cannot enumerate its corpus). Falls back to embedding-only
   * automatically if the vector store does not implement listAll().
   */
  hybrid?: boolean;

  /**
   * Reciprocal-rank-fusion constant (default 60, the standard TREC value).
   * Higher values flatten the contribution of lower-ranked hits. Only used
   * when hybrid retrieval is active.
   */
  rrfK?: number;
}

/**
 * Query context for better search results
 */
export interface QueryContext {
  /** Previous queries in the session */
  previousQueries?: string[];

  /** Recently viewed code */
  recentCodeRefs?: string[];

  /** User's preferred language */
  preferredLanguage?: string;

  /** Current file context */
  currentFile?: string;
}

/**
 * Result from a search operation
 */
export interface SearchResponse {
  /** Query that was executed */
  query: string;

  /** Search results */
  results: SearchResult[];

  /** Total results found */
  totalResults: number;

  /** Search time in milliseconds */
  searchTimeMs: number;

  /** Whether results were filtered */
  filtered: boolean;
}

/**
 * Semantic search service for code
 */
export class SemanticSearchService {
  private llmProvider: LLMProvider;
  private vectorStore: VectorStore;
  private textGenerator: EmbeddingTextGenerator;
  private graph?: DependencyGraph;

  /** Whether hybrid (dense + sparse/BM25 RRF) retrieval is on by default. */
  private hybridDefault: boolean;

  /**
   * Lazily-built sparse index, cached across searches on this service instance.
   * `null` = not yet attempted; a Promise = build in flight or done; the
   * resolved value is `undefined` when the store cannot enumerate its corpus
   * (no listAll), which pins this service to embedding-only.
   */
  private sparsePromise: Promise<SparseRetriever | undefined> | null = null;

  constructor(
    llmProvider: LLMProvider,
    vectorStore: VectorStore,
    graph?: DependencyGraph,
    options?: { hybrid?: boolean }
  ) {
    this.llmProvider = llmProvider;
    this.vectorStore = vectorStore;
    this.textGenerator = new EmbeddingTextGenerator();
    this.graph = graph;
    // Hybrid on by default (STUB-Q7MRD6); callers opt out via options.hybrid
    // or per-search via SearchOptions.hybrid.
    this.hybridDefault = options?.hybrid ?? true;
  }

  /**
   * Build (once) and return the sparse/BM25 retriever over the store's corpus,
   * or undefined if the store cannot enumerate its records. Cached on the
   * instance so repeated searches reuse the index.
   */
  private getSparseRetriever(namespace?: string): Promise<SparseRetriever | undefined> {
    if (this.sparsePromise) return this.sparsePromise;
    this.sparsePromise = (async () => {
      // Capability probe: only stores that hold their corpus locally implement
      // listAll(). Remote stores (Pinecone/Chroma) omit it → embedding-only.
      const listAll = this.vectorStore.listAll?.bind(this.vectorStore);
      if (!listAll) return undefined;
      try {
        const records = await listAll(namespace);
        if (!records || records.length === 0) return undefined;
        return SparseRetriever.fromRecords(
          records.map((r) => ({ id: r.id, metadata: r.metadata }))
        );
      } catch {
        // Any enumeration failure degrades to embedding-only, never throws.
        return undefined;
      }
    })();
    return this.sparsePromise;
  }

  /**
   * Search for code using natural language query
   */
  async search(
    query: string,
    options?: SearchOptions,
    context?: QueryContext
  ): Promise<SearchResponse> {
    const startTime = Date.now();

    // Enhance query with context if available
    const enhancedQuery = this.enhanceQuery(query, context);

    // Generate query embedding
    const queryText = this.textGenerator.generateQueryText(enhancedQuery, {
      language: options?.language || context?.preferredLanguage,
      type: options?.type,
      file: options?.file || context?.currentFile
    });

    const queryEmbedding = await this.embedQuery(queryText);

    // Build vector store query options
    const vectorOptions: VectorQueryOptions = {
      topK: options?.topK ?? 10,
      minScore: options?.minScore,
      namespace: options?.namespace,
      includeMetadata: true,
      includeValues: false
    };

    // Build metadata filter
    const filter: Partial<CodeChunkMetadata> = {};

    if (options?.language) {
      filter.language = options.language;
    }
    if (options?.type) {
      filter.type = options.type;
    }
    if (options?.file) {
      filter.file = options.file;
    }
    if (options?.exported !== undefined) {
      filter.exported = options.exported;
    }
    if (options?.filters) {
      Object.assign(filter, options.filters);
    }

    if (Object.keys(filter).length > 0) {
      vectorOptions.filter = filter;
    }

    const topK = options?.topK ?? 10;
    const hybrid = options?.hybrid ?? this.hybridDefault;

    // Resolve the sparse leg FIRST (cheap after the first call — cached). This
    // determines whether fusion will actually happen: only stores that can
    // enumerate their corpus (listAll) support the BM25 leg. When fusion is off
    // we must NOT over-fetch the dense leg — the dense topK stays exactly the
    // caller's topK so embedding-only behavior is byte-for-byte unchanged.
    const sparseRetriever = hybrid
      ? await this.getSparseRetriever(options?.namespace)
      : undefined;
    const willFuse = hybrid && !!sparseRetriever;

    // Dense (embedding) leg. When fusion WILL run, over-fetch so fusion has a
    // deeper candidate pool than the final topK (a lexical-only hit may sit
    // below rank topK in the dense list). Otherwise fetch exactly topK.
    const denseTopK = willFuse ? Math.max(topK * 4, 40) : topK;
    const queryResult = await this.vectorStore.query(queryEmbedding, {
      ...vectorOptions,
      topK: denseTopK
    });

    // Dense results as a ranked list.
    const denseMatches = queryResult.matches;

    let results: SearchResult[];
    let fusionApplied = false;

    if (willFuse && sparseRetriever) {
      // Sparse leg over the same corpus; over-fetch symmetrically.
      const sparseHits = sparseRetriever.search(enhancedQuery, denseTopK);

      // Apply the same metadata filter to sparse hits so hybrid respects
      // --lang/--type/--layer/etc. exactly as the dense leg does.
      const sparseFiltered = Object.keys(filter).length > 0
        ? sparseHits.filter((h) => this.matchesFilter(h.metadata, filter))
        : sparseHits;

      const denseList: RankedList = {
        order: denseMatches.map((m) => m.id),
        metaById: new Map(denseMatches.map((m) => [m.id, m.metadata as CodeChunkMetadata])),
        scoreById: new Map(denseMatches.map((m) => [m.id, m.score]))
      };
      const sparseList: RankedList = {
        order: sparseFiltered.map((h) => h.id),
        metaById: new Map(sparseFiltered.map((h) => [h.id, h.metadata])),
        scoreById: new Map(sparseFiltered.map((h) => [h.id, h.score]))
      };

      const fused = reciprocalRankFusion([denseList, sparseList], {
        rrfK: options?.rrfK,
        topK
      });

      results = fused.map((f) => ({
        coderef: f.id,
        score: f.score,
        metadata: f.metadata,
        snippet: f.metadata?.documentation
      }));
      fusionApplied = true;
    } else {
      // Embedding-only path (hybrid off, or store not enumerable).
      results = denseMatches.slice(0, topK).map((match) => ({
        coderef: match.id,
        score: match.score,
        metadata: match.metadata as CodeChunkMetadata,
        snippet: match.metadata?.documentation
      }));
    }

    const searchTimeMs = Date.now() - startTime;

    return {
      query,
      results,
      totalResults: results.length,
      searchTimeMs,
      filtered: Object.keys(filter).length > 0 || fusionApplied
    };
  }

  /**
   * Metadata-filter predicate mirroring the vector store's own matchesFilter
   * (json-store.ts). Applied to sparse hits so hybrid retrieval honors the same
   * --lang/--type/--layer/etc. filters the dense leg passes to the store.
   */
  private matchesFilter(
    metadata: CodeChunkMetadata,
    filter: Partial<CodeChunkMetadata>
  ): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && (metadata as Record<string, unknown>)[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Search with multiple queries and merge results
   *
   * Useful for complex questions that might require multiple search strategies
   */
  async multiQuerySearch(
    queries: string[],
    options?: SearchOptions,
    context?: QueryContext
  ): Promise<SearchResponse> {
    const allResults: SearchResult[] = [];
    const seen = new Set<string>();

    // Execute all queries
    for (const query of queries) {
      const response = await this.search(query, options, context);

      for (const result of response.results) {
        if (!seen.has(result.coderef)) {
          allResults.push(result);
          seen.add(result.coderef);
        }
      }
    }

    // Sort by score
    allResults.sort((a, b) => b.score - a.score);

    // Limit to topK
    const topK = options?.topK ?? 10;
    const results = allResults.slice(0, topK);

    return {
      query: queries.join(' OR '),
      results,
      totalResults: results.length,
      searchTimeMs: 0, // Aggregate search time not tracked
      filtered: false
    };
  }

  /**
   * Find similar code to a given CodeRef
   */
  async findSimilar(
    coderef: string,
    options?: SearchOptions
  ): Promise<SearchResponse> {
    // Get the embedding for the target coderef
    // This would require fetching from vector store first
    throw new Error('Not yet implemented - requires vector store fetch by ID');
  }

  /**
   * Search by example code snippet
   */
  async searchByExample(
    codeSnippet: string,
    options?: SearchOptions
  ): Promise<SearchResponse> {
    // Embed the code snippet directly
    const embedding = await this.embedQuery(codeSnippet);

    const vectorOptions: VectorQueryOptions = {
      topK: options?.topK ?? 10,
      minScore: options?.minScore,
      namespace: options?.namespace,
      includeMetadata: true
    };

    const queryResult = await this.vectorStore.query(embedding, vectorOptions);

    const results: SearchResult[] = queryResult.matches.map((match) => ({
      coderef: match.id,
      score: match.score,
      metadata: match.metadata as CodeChunkMetadata
    }));

    return {
      query: `Example: ${codeSnippet.substring(0, 50)}...`,
      results,
      totalResults: results.length,
      searchTimeMs: 0,
      filtered: false
    };
  }

  /**
   * Get related code elements
   *
   * Returns code that is semantically or structurally related
   */
  async getRelated(
    coderef: string,
    relationshipType: 'semantic' | 'structural' | 'both' = 'both',
    options?: SearchOptions
  ): Promise<SearchResponse> {
    const startTime = Date.now();
    const topK = options?.topK ?? 10;

    let results: SearchResult[] = [];

    if (relationshipType === 'semantic' || relationshipType === 'both') {
      // Semantic similarity: find similar code using vector store
      const semanticResults = await this.findSimilar(coderef, options);
      results = results.concat(semanticResults.results);
    }

    if (relationshipType === 'structural' || relationshipType === 'both') {
      // Structural: find graph neighbors (dependencies and dependents)
      const structuralResults = await this.getGraphNeighbors(coderef, topK);
      results = results.concat(structuralResults);
    }

    // Deduplicate by coderef
    const uniqueResults = new Map<string, SearchResult>();
    for (const result of results) {
      if (!uniqueResults.has(result.coderef)) {
        uniqueResults.set(result.coderef, result);
      }
    }

    // Sort by score and limit to topK
    const finalResults = Array.from(uniqueResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return {
      query: `Related to: ${coderef}`,
      results: finalResults,
      totalResults: finalResults.length,
      searchTimeMs: Date.now() - startTime,
      filtered: false
    };
  }

  /**
   * Get graph neighbors (dependencies and dependents) for a coderef
   */
  private async getGraphNeighbors(coderef: string, limit: number): Promise<SearchResult[]> {
    if (!this.graph) {
      return [];
    }

    const neighbors: SearchResult[] = [];

    // Get dependencies (what this code depends on)
    const dependencyEdges = this.graph.edgesBySource.get(coderef) || [];
    for (const edge of dependencyEdges) {
      const node = this.graph.nodes.get(edge.target);
      if (node) {
        const vectorRecord = await this.vectorStore.fetchById(edge.target);
        if (vectorRecord) {
          neighbors.push({
            coderef: edge.target,
            score: 0.7, // Base score for structural relationship
            metadata: vectorRecord.metadata as CodeChunkMetadata
          });
        }
      }
    }

    // Get dependents (what depends on this code)
    const dependentEdges = this.graph.edgesByTarget.get(coderef) || [];
    for (const edge of dependentEdges) {
      const node = this.graph.nodes.get(edge.source);
      if (node) {
        const vectorRecord = await this.vectorStore.fetchById(edge.source);
        if (vectorRecord) {
          neighbors.push({
            coderef: edge.source,
            score: 0.8, // Higher score for dependents (more important)
            metadata: vectorRecord.metadata as CodeChunkMetadata
          });
        }
      }
    }

    return neighbors.slice(0, limit);
  }

  /**
   * Embed a query string
   */
  private async embedQuery(query: string): Promise<number[]> {
    const embeddings = await this.llmProvider.embed([query]);
    return embeddings[0];
  }

  /**
   * Enhance query with context
   */
  private enhanceQuery(query: string, context?: QueryContext): string {
    if (!context) {
      return query;
    }

    const parts: string[] = [query];

    // Add context from previous queries
    if (context.previousQueries && context.previousQueries.length > 0) {
      const recentQuery = context.previousQueries[context.previousQueries.length - 1];
      parts.push(`Related to: ${recentQuery}`);
    }

    // Add file context
    if (context.currentFile) {
      parts.push(`in context of ${context.currentFile}`);
    }

    return parts.join('. ');
  }

  /**
   * Analyze search quality
   *
   * Returns metrics about search result quality
   */
  analyzeResults(results: SearchResult[]): {
    avgScore: number;
    scoreDistribution: { high: number; medium: number; low: number };
    diversityScore: number;
  } {
    if (results.length === 0) {
      return {
        avgScore: 0,
        scoreDistribution: { high: 0, medium: 0, low: 0 },
        diversityScore: 0
      };
    }

    // Average score
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    // Score distribution
    const high = results.filter((r) => r.score >= 0.8).length;
    const medium = results.filter((r) => r.score >= 0.5 && r.score < 0.8).length;
    const low = results.filter((r) => r.score < 0.5).length;

    // Diversity score (based on number of unique files)
    const uniqueFiles = new Set(results.map((r) => r.metadata.file)).size;
    const diversityScore = uniqueFiles / results.length;

    return {
      avgScore,
      scoreDistribution: { high, medium, low },
      diversityScore
    };
  }

  /**
   * Suggest query improvements
   *
   * Analyzes query and suggests improvements for better results
   */
  suggestQueryImprovements(query: string, results: SearchResult[]): string[] {
    const suggestions: string[] = [];

    // Check if query is too short
    if (query.split(' ').length < 3) {
      suggestions.push('Try adding more specific keywords to your query');
    }

    // Check if results have low scores
    if (results.length > 0) {
      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
      if (avgScore < 0.5) {
        suggestions.push('Consider using different terminology or adding context');
      }
    }

    // Check if results are too diverse
    const uniqueTypes = new Set(results.map((r) => r.metadata.type)).size;
    if (uniqueTypes > 3) {
      suggestions.push('Try filtering by specific element type (function, class, etc.)');
    }

    return suggestions;
  }
}

/**
 * @coderef-semantic: 1.0.0
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
import type { DependencyGraph } from '../../analyzer/graph-builder.js';
import {
  EmbeddingTextGenerator,
  type TextGenerationOptions
} from './embedding-text-generator.js';
import type { CodeChunkMetadata } from '../vector/vector-store.js';

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

  constructor(llmProvider: LLMProvider, vectorStore: VectorStore, graph?: DependencyGraph) {
    this.llmProvider = llmProvider;
    this.vectorStore = vectorStore;
    this.textGenerator = new EmbeddingTextGenerator();
    this.graph = graph;
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

    // Query vector store
    const queryResult = await this.vectorStore.query(
      queryEmbedding,
      vectorOptions
    );

    // Convert to search results
    const results: SearchResult[] = queryResult.matches.map((match) => ({
      coderef: match.id,
      score: match.score,
      metadata: match.metadata as CodeChunkMetadata,
      snippet: match.metadata?.documentation
    }));

    const searchTimeMs = Date.now() - startTime;

    return {
      query,
      results,
      totalResults: results.length,
      searchTimeMs,
      filtered: Object.keys(filter).length > 0
    };
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

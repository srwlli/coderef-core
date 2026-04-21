/**
 * Indexing Orchestrator
 * P3-T1: Orchestrates the complete pipeline from source code to vector DB
 *
 * This is the main entry point for RAG indexing. It coordinates:
 * 1. Code scanning (AnalyzerService)
 * 2. Graph building (GraphBuilder)
 * 3. Chunk conversion
 * 4. Embedding generation
 * 5. Vector storage
 * 6. Incremental indexing
 */

import type { AnalyzerService } from '../../analyzer/analyzer-service.js';
import type { DependencyGraph } from '../../analyzer/graph-builder.js';
import type { LLMProvider } from '../llm/llm-provider.js';
import type { VectorStore } from '../vector/vector-store.js';
import { ChunkConverter } from './chunk-converter.js';
import type { ChunkOptions } from './code-chunk.js';
import {
  EmbeddingService,
  type EmbeddingServiceOptions
} from './embedding-service.js';
import {
  IncrementalIndexer,
  type IncrementalIndexOptions
} from './incremental-indexer.js';
import type { CodeChunk } from './code-chunk.js';
import type { VectorRecord } from '../vector/vector-store.js';

/**
 * Progress callback for indexing
 */
export type IndexingProgressCallback = (progress: IndexingProgress) => void;

/**
 * Progress information during indexing
 */
export interface IndexingProgress {
  /** Current stage */
  stage: IndexingStage;

  /** Stage description */
  stageDescription: string;

  /** Progress within stage (0-100) */
  stageProgress: number;

  /** Overall progress (0-100) */
  overallProgress: number;

  /** Additional stage-specific data */
  data?: any;
}

/**
 * Indexing stages
 */
export enum IndexingStage {
  ANALYZING = 'analyzing',
  CONVERTING = 'converting',
  EMBEDDING = 'embedding',
  STORING = 'storing',
  COMPLETE = 'complete'
}

/**
 * Options for indexing
 */
export interface IndexingOptions {
  /** Source directory to index */
  sourceDir: string;

  /** Languages to scan */
  languages?: string[];

  /** Chunk conversion options */
  chunkOptions?: ChunkOptions;

  /** Embedding service options */
  embeddingOptions?: EmbeddingServiceOptions;

  /** Incremental indexing options */
  incrementalOptions?: IncrementalIndexOptions;

  /** Namespace for vector store */
  namespace?: string;

  /** Progress callback */
  onProgress?: IndexingProgressCallback;

  /** Whether to use the analyzer (AST-based) or regex scanner */
  useAnalyzer?: boolean;
}

/**
 * Result from indexing operation
 */
export interface IndexingResult {
  /** Number of chunks successfully indexed */
  chunksIndexed: number;

  /** Number of chunks skipped (unchanged) */
  chunksSkipped: number;

  /** Number of failed chunks */
  chunksFailed: number;

  /** Total files processed */
  filesProcessed: number;

  /** Processing time in milliseconds */
  processingTimeMs: number;

  /** Statistics */
  stats: IndexingStatistics;

  /** Errors encountered */
  errors: IndexingError[];
}

/**
 * Statistics from indexing
 */
export interface IndexingStatistics {
  /** Total tokens used */
  tokensUsed: number;

  /** Estimated cost */
  estimatedCost?: number;

  /** Average embedding time per chunk (ms) */
  avgEmbeddingTimeMs: number;

  /** Chunks by type */
  byType: Record<string, number>;

  /** Chunks by language */
  byLanguage: Record<string, number>;
}

/**
 * Error during indexing
 */
export interface IndexingError {
  /** Stage where error occurred */
  stage: IndexingStage;

  /** Error message */
  message: string;

  /** Optional context */
  context?: string;

  /** Original error */
  originalError?: Error;
}

/**
 * Orchestrates the complete RAG indexing pipeline
 */
export class IndexingOrchestrator {
  private analyzerService: AnalyzerService;
  private llmProvider: LLMProvider;
  private vectorStore: VectorStore;
  private basePath: string;

  constructor(
    analyzerService: AnalyzerService,
    llmProvider: LLMProvider,
    vectorStore: VectorStore,
    basePath: string = process.cwd()
  ) {
    this.analyzerService = analyzerService;
    this.llmProvider = llmProvider;
    this.vectorStore = vectorStore;
    this.basePath = basePath;
  }

  /**
   * Index a codebase
   */
  async indexCodebase(options: IndexingOptions): Promise<IndexingResult> {
    const startTime = Date.now();
    const errors: IndexingError[] = [];

    const reportProgress = (
      stage: IndexingStage,
      stageDescription: string,
      stageProgress: number,
      overallProgress: number,
      data?: any
    ) => {
      if (options.onProgress) {
        options.onProgress({
          stage,
          stageDescription,
          stageProgress,
          overallProgress,
          data
        });
      }
    };

    try {
      // Stage 1: Analyze codebase (25% of overall progress)
      reportProgress(
        IndexingStage.ANALYZING,
        'Analyzing codebase with AST scanner',
        0,
        0
      );

      let graph: DependencyGraph;
      let chunks: CodeChunk[];

      if (options.useAnalyzer) {
        // Use AST-based analyzer
        const languages = options.languages ?? ['ts', 'tsx', 'js', 'jsx', 'py'];
        const patterns = languages.map(lang => `${options.sourceDir}/**/*.${lang}`);
        const analysisResult = await this.analyzerService.analyze(patterns, false);

        graph = analysisResult.graph;

        reportProgress(
          IndexingStage.ANALYZING,
          'Analysis complete',
          100,
          25,
          {
            nodes: graph.nodes.size,
            edges: graph.edges.length
          }
        );

        // Stage 2: Convert to chunks (25-40% of overall progress)
        reportProgress(
          IndexingStage.CONVERTING,
          'Converting graph nodes to code chunks',
          0,
          25
        );

        const chunkConverter = new ChunkConverter(this.basePath);
        const conversionResult = await chunkConverter.convertGraph(
          graph,
          options.chunkOptions
        );

        chunks = conversionResult.chunks;

        // Record conversion errors
        for (const error of conversionResult.errors) {
          errors.push({
            stage: IndexingStage.CONVERTING,
            message: error.message,
            context: error.coderef,
            originalError: error.originalError
          });
        }

        reportProgress(
          IndexingStage.CONVERTING,
          'Conversion complete',
          100,
          40,
          {
            chunks: chunks.length,
            errors: conversionResult.errors.length
          }
        );
      } else {
        throw new Error('Non-analyzer mode not yet implemented');
      }

      // Filter for incremental indexing
      const incrementalIndexer = new IncrementalIndexer(
        this.basePath,
        options.incrementalOptions?.stateFile
      );

      const { chunksToIndex, chunksToKeep } =
        await incrementalIndexer.filterChangedChunks(
          chunks,
          options.incrementalOptions
        );

      reportProgress(
        IndexingStage.EMBEDDING,
        'Preparing embeddings',
        0,
        40,
        {
          toIndex: chunksToIndex.length,
          toSkip: chunksToKeep.length
        }
      );

      // Stage 3: Generate embeddings (40-80% of overall progress)
      const embeddingService = new EmbeddingService(this.llmProvider);

      const embeddingResult = await embeddingService.embedChunks(
        chunksToIndex,
        {
          ...options.embeddingOptions,
          onProgress: (embeddingProgress) => {
            const stageProgress = embeddingProgress.percentage;
            const overallProgress = 40 + (stageProgress / 100) * 40;

            reportProgress(
              IndexingStage.EMBEDDING,
              `Embedding batch ${embeddingProgress.currentBatch}/${embeddingProgress.totalBatches}`,
              stageProgress,
              overallProgress,
              embeddingProgress
            );
          }
        }
      );

      // Record embedding errors
      for (const error of embeddingResult.failed) {
        errors.push({
          stage: IndexingStage.EMBEDDING,
          message: error.message,
          context: error.coderef,
          originalError: error.originalError
        });
      }

      reportProgress(
        IndexingStage.EMBEDDING,
        'Embeddings complete',
        100,
        80,
        {
          embedded: embeddingResult.embedded.length,
          failed: embeddingResult.failed.length
        }
      );

      // Stage 4: Store in vector DB (80-95% of overall progress)
      reportProgress(
        IndexingStage.STORING,
        'Storing vectors in database',
        0,
        80
      );

      // Convert embedded chunks to vector records
      const vectorRecords: VectorRecord[] = embeddingResult.embedded.map(
        (item) => ({
          id: item.chunk.coderef,
          values: item.embedding,
          metadata: {
            coderef: item.chunk.coderef,
            type: item.chunk.type,
            name: item.chunk.name,
            file: item.chunk.file,
            line: item.chunk.line,
            language: item.chunk.language,
            exported: item.chunk.exported,
            documentation: item.chunk.documentation,
            dependencyCount: item.chunk.dependencyCount,
            dependentCount: item.chunk.dependentCount,
            complexity: item.chunk.complexity,
            coverage: item.chunk.coverage
          }
        })
      );

      // Upsert vectors
      await this.vectorStore.upsert(vectorRecords, options.namespace);

      reportProgress(
        IndexingStage.STORING,
        'Vectors stored',
        100,
        95,
        {
          stored: vectorRecords.length
        }
      );

      // Stage 5: Update incremental index state (95-100%)
      reportProgress(
        IndexingStage.COMPLETE,
        'Updating index state',
        50,
        97
      );

      await incrementalIndexer.updateState(chunksToIndex);

      reportProgress(
        IndexingStage.COMPLETE,
        'Indexing complete',
        100,
        100
      );

      const processingTimeMs = Date.now() - startTime;

      // Calculate statistics
      const chunkStats = embeddingResult.stats;
      const byType: Record<string, number> = {};
      const byLanguage: Record<string, number> = {};

      for (const chunk of chunksToIndex) {
        byType[chunk.type] = (byType[chunk.type] || 0) + 1;
        byLanguage[chunk.language] = (byLanguage[chunk.language] || 0) + 1;
      }

      return {
        chunksIndexed: embeddingResult.embedded.length,
        chunksSkipped: chunksToKeep.length,
        chunksFailed: embeddingResult.failed.length,
        filesProcessed: Array.from(
          new Set(chunks.map((c) => c.file))
        ).length,
        processingTimeMs,
        stats: {
          tokensUsed: chunkStats.totalTokensUsed,
          estimatedCost: (chunkStats.totalTokensUsed / 1_000_000) * 0.020,
          avgEmbeddingTimeMs: chunkStats.avgBatchTimeMs,
          byType,
          byLanguage
        },
        errors
      };
    } catch (error: any) {
      errors.push({
        stage: IndexingStage.ANALYZING,
        message: `Fatal error: ${error.message}`,
        originalError: error
      });

      throw new Error(`Indexing failed: ${error.message}`);
    }
  }

  /**
   * Get statistics about current index
   */
  async getIndexStats(): Promise<{
    vectorStoreStats: any;
    incrementalStats: any;
  }> {
    const vectorStoreStats = await this.vectorStore.stats();

    const incrementalIndexer = new IncrementalIndexer(this.basePath);
    const incrementalStats = await incrementalIndexer.getStatistics();

    return {
      vectorStoreStats,
      incrementalStats
    };
  }

  /**
   * Clear all indexed data
   */
  async clearIndex(namespace?: string): Promise<void> {
    // Clear vector store
    await this.vectorStore.clear(namespace);

    // Clear incremental index state
    const incrementalIndexer = new IncrementalIndexer(this.basePath);
    await incrementalIndexer.clearState();
  }
}

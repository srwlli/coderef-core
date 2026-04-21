/**
 * Embedding Service
 * P2-T4: Efficiently generates embeddings for code chunks in batches
 *
 * Handles batch processing, progress reporting, error recovery, and
 * optimization for API rate limits and token usage.
 */

import type { LLMProvider } from '../llm/llm-provider.js';
import type { CodeChunk } from './code-chunk.js';
import {
  EmbeddingTextGenerator,
  type TextGenerationOptions
} from './embedding-text-generator.js';

/**
 * A code chunk with its embedding vector
 */
export interface EmbeddedChunk {
  /** Original code chunk */
  chunk: CodeChunk;

  /** Embedding vector (typically 1536 dimensions for OpenAI) */
  embedding: number[];

  /** Text that was embedded */
  text: string;

  /** Timestamp when embedded */
  timestamp: number;
}

/**
 * Progress callback for embedding generation
 */
export type ProgressCallback = (progress: EmbeddingProgress) => void;

/**
 * Progress information during embedding
 */
export interface EmbeddingProgress {
  /** Number of chunks processed so far */
  processed: number;

  /** Total number of chunks to process */
  total: number;

  /** Progress percentage (0-100) */
  percentage: number;

  /** Current batch being processed */
  currentBatch: number;

  /** Total number of batches */
  totalBatches: number;

  /** Estimated time remaining (seconds) */
  estimatedSecondsRemaining?: number;
}

/**
 * Options for embedding service
 */
export interface EmbeddingServiceOptions {
  /** Batch size for API calls (default: 100) */
  batchSize?: number;

  /** Text generation options */
  textOptions?: TextGenerationOptions;

  /** Progress callback */
  onProgress?: ProgressCallback;

  /** Delay between batches in milliseconds (for rate limiting) */
  batchDelayMs?: number;

  /** Maximum concurrent batch operations (default: 1) */
  maxConcurrency?: number;
}

/**
 * Result from embedding operation
 */
export interface EmbeddingResult {
  /** Successfully embedded chunks */
  embedded: EmbeddedChunk[];

  /** Chunks that failed to embed */
  failed: EmbeddingError[];

  /** Total processing time in milliseconds */
  processingTimeMs: number;

  /** Statistics */
  stats: EmbeddingStatistics;
}

/**
 * Error during embedding
 */
export interface EmbeddingError {
  /** CodeRef of the chunk that failed */
  coderef: string;

  /** Error message */
  message: string;

  /** Original error */
  originalError?: Error;
}

/**
 * Statistics about embedding operation
 */
export interface EmbeddingStatistics {
  /** Total chunks processed */
  totalChunks: number;

  /** Successful embeddings */
  successCount: number;

  /** Failed embeddings */
  failedCount: number;

  /** Total batches processed */
  totalBatches: number;

  /** Average processing time per batch (ms) */
  avgBatchTimeMs: number;

  /** Total tokens used (estimated) */
  totalTokensUsed: number;
}

/**
 * Service for generating embeddings in efficient batches
 */
export class EmbeddingService {
  private llmProvider: LLMProvider;
  private textGenerator: EmbeddingTextGenerator;

  constructor(llmProvider: LLMProvider) {
    this.llmProvider = llmProvider;
    this.textGenerator = new EmbeddingTextGenerator();
  }

  /**
   * Generate embeddings for chunks in batches
   */
  async embedChunks(
    chunks: CodeChunk[],
    options?: EmbeddingServiceOptions
  ): Promise<EmbeddingResult> {
    const startTime = Date.now();

    const opts: Required<EmbeddingServiceOptions> = {
      batchSize: options?.batchSize ?? 100,
      textOptions: options?.textOptions ?? {},
      onProgress: options?.onProgress ?? (() => {}),
      batchDelayMs: options?.batchDelayMs ?? 0,
      maxConcurrency: options?.maxConcurrency ?? 1
    };

    const embedded: EmbeddedChunk[] = [];
    const failed: EmbeddingError[] = [];

    // Split chunks into batches
    const batches = this.createBatches(chunks, opts.batchSize);
    const totalBatches = batches.length;

    let processedCount = 0;
    let totalTokensUsed = 0;
    const batchTimes: number[] = [];

    // Process batches
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchStartTime = Date.now();

      try {
        // Generate texts for batch
        const texts = batch.map(chunk =>
          this.textGenerator.generate(chunk, opts.textOptions)
        );

        // Count tokens
        const batchTokens = texts.reduce(
          (sum, text) => sum + this.textGenerator.estimateTokens(text),
          0
        );
        totalTokensUsed += batchTokens;

        // Call LLM provider to get embeddings
        const embeddings = await this.llmProvider.embed(texts);

        // Map embeddings back to chunks
        for (let j = 0; j < batch.length; j++) {
          embedded.push({
            chunk: batch[j],
            embedding: embeddings[j],
            text: texts[j],
            timestamp: Date.now()
          });
        }

        processedCount += batch.length;
      } catch (error: any) {
        // Batch failed, record errors for all chunks in batch
        for (const chunk of batch) {
          failed.push({
            coderef: chunk.coderef,
            message: `Batch embedding failed: ${error.message}`,
            originalError: error
          });
        }
        processedCount += batch.length;
      }

      const batchTime = Date.now() - batchStartTime;
      batchTimes.push(batchTime);

      // Report progress
      const avgBatchTime =
        batchTimes.reduce((sum, t) => sum + t, 0) / batchTimes.length;
      const remainingBatches = totalBatches - (i + 1);
      const estimatedSecondsRemaining =
        (remainingBatches * avgBatchTime) / 1000;

      opts.onProgress({
        processed: processedCount,
        total: chunks.length,
        percentage: (processedCount / chunks.length) * 100,
        currentBatch: i + 1,
        totalBatches,
        estimatedSecondsRemaining
      });

      // Add delay between batches if configured
      if (opts.batchDelayMs > 0 && i < batches.length - 1) {
        await this.delay(opts.batchDelayMs);
      }
    }

    const processingTimeMs = Date.now() - startTime;
    const avgBatchTimeMs =
      batchTimes.reduce((sum, t) => sum + t, 0) / batchTimes.length;

    return {
      embedded,
      failed,
      processingTimeMs,
      stats: {
        totalChunks: chunks.length,
        successCount: embedded.length,
        failedCount: failed.length,
        totalBatches,
        avgBatchTimeMs,
        totalTokensUsed
      }
    };
  }

  /**
   * Generate embedding for a single chunk
   */
  async embedChunk(
    chunk: CodeChunk,
    textOptions?: TextGenerationOptions
  ): Promise<EmbeddedChunk> {
    const text = this.textGenerator.generate(chunk, textOptions);
    const embeddings = await this.llmProvider.embed([text]);

    return {
      chunk,
      embedding: embeddings[0],
      text,
      timestamp: Date.now()
    };
  }

  /**
   * Generate embedding for raw text
   */
  async embedText(text: string): Promise<number[]> {
    const embeddings = await this.llmProvider.embed([text]);
    return embeddings[0];
  }

  /**
   * Split chunks into batches
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Estimate cost for embedding chunks
   *
   * Rough estimates:
   * - OpenAI text-embedding-3-small: $0.020 / 1M tokens
   * - OpenAI text-embedding-3-large: $0.130 / 1M tokens
   */
  estimateCost(
    chunks: CodeChunk[],
    pricePerMillionTokens: number = 0.020,
    textOptions?: TextGenerationOptions
  ): {
    estimatedTokens: number;
    estimatedCost: number;
  } {
    const texts = chunks.map(chunk =>
      this.textGenerator.generate(chunk, textOptions)
    );

    const estimatedTokens = texts.reduce(
      (sum, text) => sum + this.textGenerator.estimateTokens(text),
      0
    );

    const estimatedCost = (estimatedTokens / 1_000_000) * pricePerMillionTokens;

    return {
      estimatedTokens,
      estimatedCost
    };
  }

  /**
   * Validate embeddings quality
   *
   * Checks for common issues like zero vectors, NaN values, etc.
   */
  validateEmbeddings(embedded: EmbeddedChunk[]): string[] {
    const issues: string[] = [];

    for (const item of embedded) {
      // Check for zero vector
      const isZeroVector = item.embedding.every(val => val === 0);
      if (isZeroVector) {
        issues.push(
          `Zero vector detected for ${item.chunk.coderef} - likely an error`
        );
      }

      // Check for NaN values
      const hasNaN = item.embedding.some(val => isNaN(val));
      if (hasNaN) {
        issues.push(`NaN values detected for ${item.chunk.coderef}`);
      }

      // Check for infinite values
      const hasInfinite = item.embedding.some(val => !isFinite(val));
      if (hasInfinite) {
        issues.push(`Infinite values detected for ${item.chunk.coderef}`);
      }

      // Check dimension consistency
      if (embedded.length > 1) {
        const expectedDim = embedded[0].embedding.length;
        if (item.embedding.length !== expectedDim) {
          issues.push(
            `Inconsistent dimensions for ${item.chunk.coderef}: ` +
            `expected ${expectedDim}, got ${item.embedding.length}`
          );
        }
      }
    }

    return issues;
  }

  /**
   * Calculate similarity between two embeddings
   * Uses cosine similarity (0-1, higher is more similar)
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    // Calculate dot product
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * Find most similar chunks to a query embedding
   */
  findSimilar(
    queryEmbedding: number[],
    embedded: EmbeddedChunk[],
    topK: number = 10
  ): Array<{ chunk: CodeChunk; similarity: number }> {
    const similarities = embedded.map(item => ({
      chunk: item.chunk,
      similarity: this.calculateSimilarity(queryEmbedding, item.embedding)
    }));

    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, topK);
  }
}

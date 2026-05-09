/**
 * Ollama LLM Provider Implementation
 * P2-T1: Implements LLMProvider interface using local Ollama API
 *
 * Supports:
 * - Embeddings via /api/embeddings endpoint (single text per call)
 * - Text generation via /api/generate endpoint
 * - No API key required (Ollama runs locally)
 * - Dimension: 768 (nomic-embed-text, measured empirically)
 *
 * ENVIRONMENT:
 * - CODEREF_LLM_PROVIDER=ollama
 * - CODEREF_LLM_BASE_URL=http://localhost:11434 (or your Ollama host)
 * - CODEREF_LLM_MODEL=nomic-embed-text (embedding) or qwen2.5:7b-instruct (generation)
 * - CODEREF_LLM_API_KEY=ollama (any non-empty string, not actually used)
 *
 * NEGATIVE TEST: See __tests__/ollama-provider-unreachable.test.ts
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports OllamaProvider, createOllamaProvider
 * @used_by src/cli/coderef-rag-server.ts, src/cli/rag-index.ts, src/cli/rag-search.ts
 */

import type {
  LLMProvider,
  CompletionOptions,
  LLMResponse,
  LLMProviderConfig
} from './llm-provider.js';
import { LLMError, LLMErrorCode } from './llm-provider.js';
import {
  getProviderSpec,
  supportsEmbeddings,
  ProviderDoesNotSupportEmbeddings
} from './model-registry.js';

/**
 * Ollama API response for embeddings
 */
interface OllamaEmbedResponse {
  embedding: number[];
}

/**
 * Ollama API response for generation
 */
interface OllamaGenerateResponse {
  response: string;
  done: boolean;
  model: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

/**
 * Ollama provider implementation for local models
 *
 * @example
 * ```typescript
 * const provider = new OllamaProvider({
 *   apiKey: 'ollama',  // Any non-empty string
 *   baseUrl: 'http://localhost:11434',
 *   model: 'qwen2.5:7b-instruct'
 * });
 *
 * // Generate embeddings
 * const vectors = await provider.embed(['function add(a, b) { return a + b; }']);
 *
 * // Generate text
 * const response = await provider.complete('Explain this code');
 * ```
 */
export class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private model: string;
  private embeddingModel: string;
  private maxRetries: number;
  private timeout: number;

  constructor(config: LLMProviderConfig) {
    // Get spec from registry
    const spec = getProviderSpec('ollama');
    if (!spec) {
      throw new LLMError(
        'Ollama provider not found in MODEL_REGISTRY',
        LLMErrorCode.UNKNOWN
      );
    }

    // Use provided baseUrl or default from registry/env
    this.baseUrl = config.baseUrl ||
      spec.defaultHost;

    // Trim trailing slash
    this.baseUrl = this.baseUrl.replace(/\/$/, '');

    // Generation model (from config or env or registry default)
    this.model = config.model ||
      process.env[spec.generationModel.envOverride] ||
      spec.generationModel.name;

    // Embedding model (from env or registry default)
    this.embeddingModel = process.env[spec.embeddingModel.envOverride] ||
      spec.embeddingModel.name;

    this.maxRetries = config.maxRetries ?? 3;
    this.timeout = config.timeout ?? 60000;
  }

  /**
   * Generate text completion using Ollama generate API
   */
  async complete(prompt: string, options?: CompletionOptions): Promise<LLMResponse> {
    return this.withRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Lloyd-Gateway': 'coderef-core',
            'X-Workorder-ID': process.env.WO_ID || 'unknown',
            'X-Session-ID': process.env.SESSION_ID || 'unknown'
          },
          body: JSON.stringify({
            model: this.model,
            prompt,
            stream: false,
            task_type: 'execution',
            options: {
              temperature: options?.temperature ?? 0.3,
              num_predict: options?.maxTokens ?? 1000,
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw await this.handleHttpError(response);
        }

        const data = await response.json() as OllamaGenerateResponse;

        if (!data.response) {
          throw new LLMError(
            'No content in Ollama response',
            LLMErrorCode.UNKNOWN
          );
        }

        return {
          text: data.response,
          usage: {
            promptTokens: data.prompt_eval_count ?? 0,
            completionTokens: data.eval_count ?? 0,
            totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0)
          },
          finishReason: data.done ? 'stop' : 'length',
          model: data.model,
          metadata: {
            totalDuration: data.total_duration,
            loadDuration: data.load_duration
          }
        };
      } catch (error: any) {
        clearTimeout(timeoutId);
        throw this.handleError(error);
      }
    });
  }

  /**
   * Generate embeddings using Ollama embeddings API
   *
   * Note: Ollama does not support batch embeddings. Each text is embedded
   * individually in sequence.
   */
  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    // Get dimension from registry for validation
    const spec = getProviderSpec('ollama');
    if (!spec || !spec.supportsEmbeddings) {
      throw new ProviderDoesNotSupportEmbeddings('ollama');
    }
    const expectedDim = spec.embeddingModel.dimensions;

    const results: number[][] = [];

    // Ollama embeddings API is single-text only, so we loop
    for (const text of texts) {
      const embedding = await this.embedSingle(text, expectedDim);
      results.push(embedding);
    }

    return results;
  }

  /**
   * Embed a single text using Ollama API
   */
  private async embedSingle(text: string, expectedDim: number): Promise<number[]> {
    return this.withRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(`${this.baseUrl}/api/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.embeddingModel,
            prompt: text
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw await this.handleHttpError(response);
        }

        const data = await response.json() as OllamaEmbedResponse;

        if (!data.embedding || !Array.isArray(data.embedding)) {
          throw new LLMError(
            'Invalid embedding response from Ollama',
            LLMErrorCode.UNKNOWN
          );
        }

        // Validate dimension matches registry
        if (data.embedding.length !== expectedDim) {
          throw new LLMError(
            `Embedding dimension mismatch: expected ${expectedDim}, got ${data.embedding.length}. ` +
            `Check that your Ollama model matches MODEL_REGISTRY spec.`,
            LLMErrorCode.UNKNOWN
          );
        }

        return data.embedding;
      } catch (error: any) {
        clearTimeout(timeoutId);
        throw this.handleError(error);
      }
    });
  }

  /**
   * Count tokens in text
   *
   * Note: Ollama doesn't expose tokenizer, so we use a rough estimate.
   * This is imprecise but sufficient for planning purposes.
   */
  countTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    // This is conservative and may underestimate
    return Math.ceil(text.length / 4);
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'ollama';
  }

  /**
   * Get current generation model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get embedding dimensions
   * Reads from MODEL_REGISTRY - single source of truth
   */
  getEmbeddingDimensions(): number {
    const spec = getProviderSpec('ollama');
    if (!spec || !spec.supportsEmbeddings) {
      throw new ProviderDoesNotSupportEmbeddings('ollama');
    }
    return spec.embeddingModel.dimensions;
  }

  /**
   * Check if this provider supports embeddings
   */
  supportsEmbeddings(): boolean {
    return supportsEmbeddings('ollama');
  }

  /**
   * Retry logic with exponential backoff
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Don't retry non-retryable errors
        if (error instanceof LLMError && !error.retryable) {
          throw error;
        }

        // Check for connection refused - don't retry too aggressively
        if (error.cause?.code === 'ECONNREFUSED') {
          throw this.handleError(error); // Fail fast with clear message
        }

        // Don't retry on last attempt
        if (attempt === this.maxRetries) {
          break;
        }

        // Calculate exponential backoff: 1s, 2s, 4s, 8s...
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    throw lastError;
  }

  /**
   * Handle HTTP error responses from Ollama
   */
  private async handleHttpError(response: Response): Promise<LLMError> {
    const text = await response.text();

    if (response.status === 404) {
      return new LLMError(
        `Ollama model not found. Run: ollama pull ${this.model}`,
        LLMErrorCode.INVALID_REQUEST,
        new Error(text),
        false
      );
    }

    return new LLMError(
      `Ollama API error (${response.status}): ${text}`,
      LLMErrorCode.NETWORK_ERROR,
      new Error(text),
      response.status >= 500 // Retryable on server errors
    );
  }

  /**
   * Handle Ollama errors and convert to LLMError
   */
  private handleError(error: any): LLMError {
    // Already an LLMError - pass through
    if (error instanceof LLMError) {
      return error;
    }

    // Connection refused - Ollama daemon not running
    if (error.cause?.code === 'ECONNREFUSED' || error.code === 'ECONNREFUSED') {
      return new LLMError(
        `Ollama daemon unreachable at ${this.baseUrl}. ` +
        `Ensure Ollama is running (ollama serve) or check CODEREF_LLM_BASE_URL.`,
        LLMErrorCode.NETWORK_ERROR,
        error,
        false // Not retryable - requires user action
      );
    }

    // Abort/timeout
    if (error.name === 'AbortError') {
      return new LLMError(
        'Ollama request timeout',
        LLMErrorCode.TIMEOUT,
        error,
        true // Retryable
      );
    }

    // Network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
      return new LLMError(
        `Network error connecting to Ollama at ${this.baseUrl}`,
        LLMErrorCode.NETWORK_ERROR,
        error,
        true // Retryable
      );
    }

    // Unknown error
    return new LLMError(
      `Ollama error: ${error.message}`,
      LLMErrorCode.UNKNOWN,
      error,
      false
    );
  }
}

/**
 * Factory function to create Ollama provider
 */
export function createOllamaProvider(config: LLMProviderConfig): OllamaProvider {
  return new OllamaProvider(config);
}

/**
 * @coderef-semantic: 1.0.0
 * @layer integration
 * @capability ollama-provider-ollama-embed-response
 * @exports OllamaProvider, createOllamaProvider
 * @used_by src/cli/coderef-rag-server.ts, src/cli/rag-index.ts, src/cli/rag-search.ts
 */

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
/**
 * Bounded default + clamp for the embedding worker pool. Ollama serves
 * concurrent /api/embeddings requests fine, but an unbounded fan-out over
 * thousands of chunks would hammer the daemon; 4 is a daemon-friendly
 * default and 16 a safe ceiling. Exported for the concurrency tests.
 */
export const OLLAMA_EMBED_CONCURRENCY_DEFAULT = 4;
export const OLLAMA_EMBED_CONCURRENCY_MAX = 16;

/**
 * Resolve the embedding concurrency from (config > CODEREF_EMBED_CONCURRENCY
 * env > default), clamped to [1, MAX]. A non-finite / <1 value falls back to
 * the default; concurrency 1 is the strictly-serial legacy path. Pure — no
 * I/O, no Date.now/Math.random.
 */
export function resolveEmbedConcurrency(
  configValue: number | undefined,
  envValue: string | undefined,
): number {
  let raw = configValue;
  if (raw === undefined && envValue !== undefined && envValue.trim() !== '') {
    const parsed = Number(envValue);
    if (Number.isFinite(parsed)) raw = parsed;
  }
  if (raw === undefined || !Number.isFinite(raw)) {
    return OLLAMA_EMBED_CONCURRENCY_DEFAULT;
  }
  const floored = Math.floor(raw);
  if (floored < 1) return OLLAMA_EMBED_CONCURRENCY_DEFAULT;
  return Math.min(floored, OLLAMA_EMBED_CONCURRENCY_MAX);
}

export class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private model: string;
  private embeddingModel: string;
  private maxRetries: number;
  private timeout: number;
  private embedConcurrency: number;

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

    // Embedding concurrency (config > CODEREF_EMBED_CONCURRENCY > default 4),
    // clamped to [1,16]. 1 = strictly-serial legacy path.
    this.embedConcurrency = resolveEmbedConcurrency(
      config.embedConcurrency,
      process.env.CODEREF_EMBED_CONCURRENCY,
    );
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
   * Generate embeddings using Ollama embeddings API.
   *
   * Ollama's /api/embeddings is single-text-per-call (no batch endpoint),
   * but the daemon serves concurrent requests. This runs a fixed-size,
   * ORDER-PRESERVING worker pool: `embedConcurrency` workers pull the next
   * input index from a shared cursor and write each result into its own
   * index-keyed slot, so the returned array is always in INPUT order
   * regardless of which request completes first. Order preservation is a
   * hard contract — EmbeddingService maps `embedding: embeddings[j]`
   * positionally back onto chunks.
   *
   * FAIL-FAST: the first non-retryable error (e.g. ECONNREFUSED when the
   * daemon is down) aborts the pool — no further indices are dispatched, so
   * a dead socket is not fanned N more times. That first error is re-thrown,
   * preserving the pre-existing failure surface.
   *
   * With embedConcurrency === 1 this is byte-for-byte the legacy serial loop
   * (one worker, sequential). No Date.now/Math.random.
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

    // Index-keyed result slots preserve input order independent of
    // completion order.
    const results: number[][] = new Array(texts.length);

    const workerCount = Math.min(this.embedConcurrency, texts.length);

    // Shared cursor + abort flag drive the pool. `nextIndex` is only ever
    // read/incremented on the single JS event-loop thread (no interleaving
    // mid-statement), so the post-increment hand-out is race-free.
    let nextIndex = 0;
    let aborted = false;
    let firstError: unknown;

    const worker = async (): Promise<void> => {
      while (!aborted) {
        const i = nextIndex++;
        if (i >= texts.length) {
          return;
        }
        try {
          results[i] = await this.embedSingle(texts[i], expectedDim);
        } catch (error) {
          // Fail-fast: record the first error and stop dispatch. Other
          // in-flight workers observe `aborted` and exit at the next loop
          // check without starting new requests.
          if (!aborted) {
            aborted = true;
            firstError = error;
          }
          return;
        }
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    if (aborted) {
      throw firstError;
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
   * Get the embedding model identifier (e.g. 'nomic-embed-text').
   * The content-addressed embedding cache mixes this into its key so a
   * model swap (nomic-embed-text -> other) invalidates cached vectors.
   */
  getEmbeddingModel(): string {
    return this.embeddingModel;
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

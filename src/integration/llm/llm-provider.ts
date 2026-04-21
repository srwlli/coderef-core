/**
 * LLM Provider Interface
 * P1-T1: Provider-agnostic interface for LLM operations
 *
 * Supports multiple LLM providers (OpenAI, Anthropic, etc.) with a unified interface
 * for completions, embeddings, and token counting.
 */

/**
 * Options for LLM completion requests
 */
export interface CompletionOptions {
  /** Temperature for randomness (0.0 = deterministic, 2.0 = very random) */
  temperature?: number;

  /** Maximum tokens to generate in the completion */
  maxTokens?: number;

  /** Whether to stream the response (not yet implemented) */
  streaming?: boolean;

  /** Stop sequences to end generation */
  stop?: string[];

  /** Top-p nucleus sampling parameter */
  topP?: number;

  /** Frequency penalty to reduce repetition */
  frequencyPenalty?: number;

  /** Presence penalty to encourage topic diversity */
  presencePenalty?: number;
}

/**
 * Response from LLM completion
 */
export interface LLMResponse {
  /** Generated text content */
  text: string;

  /** Token usage statistics */
  usage: {
    /** Tokens in the prompt */
    promptTokens: number;

    /** Tokens in the completion */
    completionTokens: number;

    /** Total tokens used */
    totalTokens: number;
  };

  /** Reason the generation finished */
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';

  /** Model used for generation */
  model: string;

  /** Optional metadata from provider */
  metadata?: Record<string, any>;
}

/**
 * Error thrown by LLM providers
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public code: LLMErrorCode,
    public originalError?: Error,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMError';

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LLMError);
    }
  }
}

/**
 * Error codes for LLM operations
 */
export enum LLMErrorCode {
  /** API key is missing or invalid */
  INVALID_API_KEY = 'INVALID_API_KEY',

  /** Rate limit exceeded */
  RATE_LIMIT = 'RATE_LIMIT',

  /** Network error communicating with provider */
  NETWORK_ERROR = 'NETWORK_ERROR',

  /** Request timeout */
  TIMEOUT = 'TIMEOUT',

  /** Invalid request parameters */
  INVALID_REQUEST = 'INVALID_REQUEST',

  /** Content was filtered by provider */
  CONTENT_FILTER = 'CONTENT_FILTER',

  /** Token limit exceeded */
  TOKEN_LIMIT = 'TOKEN_LIMIT',

  /** Unknown error */
  UNKNOWN = 'UNKNOWN'
}

/**
 * Main LLM provider interface
 *
 * All LLM providers (OpenAI, Anthropic, etc.) must implement this interface
 * to ensure consistent behavior across the RAG system.
 */
export interface LLMProvider {
  /**
   * Generate text completion from a prompt
   *
   * @param prompt - The input prompt text
   * @param options - Optional parameters for generation
   * @returns Promise resolving to the completion response
   * @throws {LLMError} If the API request fails
   *
   * @example
   * ```typescript
   * const response = await provider.complete('Explain how RAG works', {
   *   temperature: 0.3,
   *   maxTokens: 500
   * });
   * console.log(response.text);
   * ```
   */
  complete(prompt: string, options?: CompletionOptions): Promise<LLMResponse>;

  /**
   * Generate embeddings for a batch of texts
   *
   * @param texts - Array of texts to embed
   * @returns Promise resolving to array of embedding vectors
   * @throws {LLMError} If the API request fails
   *
   * @example
   * ```typescript
   * const vectors = await provider.embed([
   *   'function authenticate(email, password)',
   *   'class UserService'
   * ]);
   * // vectors = [[0.1, 0.2, ...], [0.3, 0.4, ...]]
   * ```
   */
  embed(texts: string[]): Promise<number[][]>;

  /**
   * Count tokens in a text string
   *
   * Used for managing context limits and estimating API costs.
   *
   * @param text - The text to count tokens for
   * @returns Number of tokens
   *
   * @example
   * ```typescript
   * const tokens = provider.countTokens('Hello, world!');
   * // tokens = 4
   * ```
   */
  countTokens(text: string): number;

  /**
   * Get the provider name
   *
   * @returns Provider identifier (e.g., 'openai', 'anthropic')
   */
  getProviderName(): string;

  /**
   * Get the current model being used
   *
   * @returns Model identifier (e.g., 'gpt-4-turbo-preview', 'claude-3-5-sonnet')
   */
  getModel(): string;
}

/**
 * Factory function type for creating LLM providers
 */
export type LLMProviderFactory = (config: LLMProviderConfig) => LLMProvider;

/**
 * Configuration for LLM provider
 */
export interface LLMProviderConfig {
  /** API key for the provider */
  apiKey: string;

  /** Optional model override */
  model?: string;

  /** Optional organization ID (for OpenAI) */
  organization?: string;

  /** Optional base URL (for custom endpoints) */
  baseUrl?: string;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Maximum retries for failed requests */
  maxRetries?: number;
}

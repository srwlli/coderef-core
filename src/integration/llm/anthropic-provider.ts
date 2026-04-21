/**
 * Anthropic LLM Provider Implementation
 * P1-T3: Implements LLMProvider interface using Anthropic Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMProvider,
  CompletionOptions,
  LLMResponse,
  LLMProviderConfig
} from './llm-provider.js';
import { LLMError, LLMErrorCode } from './llm-provider.js';
import { OpenAIProvider } from './openai-provider.js';

/**
 * Anthropic provider implementation
 *
 * NOTE: Anthropic does not provide embedding models, so this provider
 * delegates embedding operations to OpenAI. You must provide both API keys.
 *
 * @example
 * ```typescript
 * const provider = new AnthropicProvider({
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 *   model: 'claude-3-5-sonnet-20241022'
 * }, {
 *   apiKey: process.env.OPENAI_API_KEY // For embeddings
 * });
 *
 * const response = await provider.complete('Explain RAG', {
 *   temperature: 0.3,
 *   maxTokens: 500
 * });
 * ```
 */
export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;
  private maxRetries: number;
  private timeout: number;
  private embeddingProvider: OpenAIProvider;

  constructor(
    config: LLMProviderConfig,
    openAIConfig?: LLMProviderConfig
  ) {
    if (!config.apiKey) {
      throw new LLMError(
        'Anthropic API key is required',
        LLMErrorCode.INVALID_API_KEY
      );
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeout ?? 60000,
      maxRetries: config.maxRetries ?? 3
    });

    this.model = config.model ?? 'claude-3-5-sonnet-20241022';
    this.maxRetries = config.maxRetries ?? 3;
    this.timeout = config.timeout ?? 60000;

    // Delegate embeddings to OpenAI
    if (openAIConfig) {
      this.embeddingProvider = new OpenAIProvider(openAIConfig);
    } else {
      // Try to use OPENAI_API_KEY from environment
      const openAIKey = process.env.OPENAI_API_KEY;
      if (!openAIKey) {
        throw new LLMError(
          'OpenAI API key is required for embeddings (Anthropic does not provide embedding models)',
          LLMErrorCode.INVALID_API_KEY
        );
      }
      this.embeddingProvider = new OpenAIProvider({ apiKey: openAIKey });
    }
  }

  /**
   * Generate text completion using Anthropic Claude API
   */
  async complete(prompt: string, options?: CompletionOptions): Promise<LLMResponse> {
    return this.withRetry(async () => {
      try {
        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: options?.maxTokens ?? 1000,
          temperature: options?.temperature ?? 0.3,
          top_p: options?.topP,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          stop_sequences: options?.stop
        });

        // Extract text from content blocks
        const textContent = response.content
          .filter(block => block.type === 'text')
          .map(block => ('text' in block ? block.text : ''))
          .join('\n');

        if (!textContent) {
          throw new LLMError(
            'No text content in Anthropic response',
            LLMErrorCode.UNKNOWN
          );
        }

        return {
          text: textContent,
          usage: {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens
          },
          finishReason: this.mapStopReason(response.stop_reason),
          model: response.model,
          metadata: {
            id: response.id,
            role: response.role,
            stopSequence: response.stop_sequence
          }
        };
      } catch (error: any) {
        throw this.handleError(error);
      }
    });
  }

  /**
   * Generate embeddings - delegates to OpenAI
   *
   * Note: Anthropic does not provide embedding models, so we use OpenAI
   */
  async embed(texts: string[]): Promise<number[][]> {
    return this.embeddingProvider.embed(texts);
  }

  /**
   * Count tokens - uses OpenAI's tiktoken as approximation
   *
   * Note: This is an approximation. Anthropic uses a different tokenizer,
   * but tiktoken provides a reasonable estimate for planning purposes.
   */
  countTokens(text: string): number {
    return this.embeddingProvider.countTokens(text);
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'anthropic';
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
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
   * Map Anthropic stop reason to our standard format
   */
  private mapStopReason(
    reason: string | null
  ): LLMResponse['finishReason'] {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      default:
        return 'error';
    }
  }

  /**
   * Handle Anthropic errors and convert to LLMError
   */
  private handleError(error: any): LLMError {
    // Anthropic SDK throws APIError instances
    if (error.status) {
      switch (error.status) {
        case 401:
          return new LLMError(
            'Invalid Anthropic API key',
            LLMErrorCode.INVALID_API_KEY,
            error,
            false
          );
        case 429:
          return new LLMError(
            'Anthropic rate limit exceeded',
            LLMErrorCode.RATE_LIMIT,
            error,
            true // Retryable
          );
        case 408:
        case 504:
          return new LLMError(
            'Anthropic request timeout',
            LLMErrorCode.TIMEOUT,
            error,
            true // Retryable
          );
        case 400:
          return new LLMError(
            `Invalid Anthropic request: ${error.message}`,
            LLMErrorCode.INVALID_REQUEST,
            error,
            false
          );
        case 500:
        case 502:
        case 503:
          return new LLMError(
            'Anthropic service error',
            LLMErrorCode.NETWORK_ERROR,
            error,
            true // Retryable
          );
        default:
          return new LLMError(
            `Anthropic error: ${error.message}`,
            LLMErrorCode.UNKNOWN,
            error,
            false
          );
      }
    }

    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new LLMError(
        'Network error connecting to Anthropic',
        LLMErrorCode.NETWORK_ERROR,
        error,
        true // Retryable
      );
    }

    // Unknown error
    return new LLMError(
      `Unexpected error: ${error.message}`,
      LLMErrorCode.UNKNOWN,
      error,
      false
    );
  }
}

/**
 * Factory function to create Anthropic provider
 */
export function createAnthropicProvider(
  config: LLMProviderConfig,
  openAIConfig?: LLMProviderConfig
): AnthropicProvider {
  return new AnthropicProvider(config, openAIConfig);
}

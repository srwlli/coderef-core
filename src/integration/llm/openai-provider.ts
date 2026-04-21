/**
 * OpenAI LLM Provider Implementation
 * P1-T2: Implements LLMProvider interface using OpenAI API
 */

import OpenAI from 'openai';
import { encoding_for_model } from 'tiktoken';
import type {
  LLMProvider,
  CompletionOptions,
  LLMResponse,
  LLMProviderConfig
} from './llm-provider.js';
import { LLMError, LLMErrorCode } from './llm-provider.js';

/**
 * OpenAI provider implementation
 *
 * @example
 * ```typescript
 * const provider = new OpenAIProvider({
 *   apiKey: process.env.OPENAI_API_KEY,
 *   model: 'gpt-4-turbo-preview'
 * });
 *
 * const response = await provider.complete('Explain RAG', {
 *   temperature: 0.3,
 *   maxTokens: 500
 * });
 * ```
 */
export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private embeddingModel: string = 'text-embedding-3-small';
  private maxRetries: number;
  private timeout: number;

  constructor(config: LLMProviderConfig) {
    if (!config.apiKey) {
      throw new LLMError(
        'OpenAI API key is required',
        LLMErrorCode.INVALID_API_KEY
      );
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      baseURL: config.baseUrl,
      timeout: config.timeout ?? 60000,
      maxRetries: config.maxRetries ?? 3
    });

    this.model = config.model ?? 'gpt-4-turbo-preview';
    this.maxRetries = config.maxRetries ?? 3;
    this.timeout = config.timeout ?? 60000;
  }

  /**
   * Generate text completion using OpenAI chat API
   */
  async complete(prompt: string, options?: CompletionOptions): Promise<LLMResponse> {
    return this.withRetry(async () => {
      try {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.maxTokens ?? 1000,
          top_p: options?.topP,
          frequency_penalty: options?.frequencyPenalty,
          presence_penalty: options?.presencePenalty,
          stop: options?.stop,
          stream: false
        });

        const choice = response.choices[0];
        if (!choice?.message?.content) {
          throw new LLMError(
            'No content in OpenAI response',
            LLMErrorCode.UNKNOWN
          );
        }

        return {
          text: choice.message.content,
          usage: {
            promptTokens: response.usage?.prompt_tokens ?? 0,
            completionTokens: response.usage?.completion_tokens ?? 0,
            totalTokens: response.usage?.total_tokens ?? 0
          },
          finishReason: this.mapFinishReason(choice.finish_reason),
          model: response.model,
          metadata: {
            id: response.id,
            created: response.created
          }
        };
      } catch (error: any) {
        throw this.handleError(error);
      }
    });
  }

  /**
   * Generate embeddings using OpenAI embeddings API
   */
  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    return this.withRetry(async () => {
      try {
        const response = await this.client.embeddings.create({
          model: this.embeddingModel,
          input: texts,
          encoding_format: 'float'
        });

        // Sort by index to ensure correct order
        const sorted = response.data.sort((a, b) => a.index - b.index);
        return sorted.map(item => item.embedding);
      } catch (error: any) {
        throw this.handleError(error);
      }
    });
  }

  /**
   * Count tokens in text using tiktoken
   */
  countTokens(text: string): number {
    try {
      // Use gpt-4 encoding as it's compatible with most models
      const encoding = encoding_for_model('gpt-4');
      const tokens = encoding.encode(text);
      encoding.free(); // Free memory
      return tokens.length;
    } catch (error: any) {
      // Fallback: rough estimation (1 token ≈ 4 characters)
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'openai';
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
   * Map OpenAI finish reason to our standard format
   */
  private mapFinishReason(reason: string | undefined): LLMResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'error';
    }
  }

  /**
   * Handle OpenAI errors and convert to LLMError
   */
  private handleError(error: any): LLMError {
    // OpenAI SDK throws APIError instances
    if (error.status) {
      switch (error.status) {
        case 401:
          return new LLMError(
            'Invalid OpenAI API key',
            LLMErrorCode.INVALID_API_KEY,
            error,
            false
          );
        case 429:
          return new LLMError(
            'OpenAI rate limit exceeded',
            LLMErrorCode.RATE_LIMIT,
            error,
            true // Retryable
          );
        case 408:
        case 504:
          return new LLMError(
            'OpenAI request timeout',
            LLMErrorCode.TIMEOUT,
            error,
            true // Retryable
          );
        case 400:
          return new LLMError(
            `Invalid OpenAI request: ${error.message}`,
            LLMErrorCode.INVALID_REQUEST,
            error,
            false
          );
        case 500:
        case 502:
        case 503:
          return new LLMError(
            'OpenAI service error',
            LLMErrorCode.NETWORK_ERROR,
            error,
            true // Retryable
          );
        default:
          return new LLMError(
            `OpenAI error: ${error.message}`,
            LLMErrorCode.UNKNOWN,
            error,
            false
          );
      }
    }

    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new LLMError(
        'Network error connecting to OpenAI',
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
 * Factory function to create OpenAI provider
 */
export function createOpenAIProvider(config: LLMProviderConfig): OpenAIProvider {
  return new OpenAIProvider(config);
}

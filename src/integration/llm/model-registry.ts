/**
 * Model Registry
 * P1-T1: Single source of truth for LLM provider specifications
 *
 * Centralizes:
 * - Embedding dimensions (measured empirically, not guessed)
 * - Host/environment variable mappings
 * - Model names for embeddings and generation
 * - Capability flags (supportsEmbeddings, supportsBatchEmbed)
 *
 * ALL dimension values must come from this registry. No hardcoded
 * dimension literals allowed in provider implementations.
 */

/**
 * Specification for a single LLM provider's models and capabilities
 */
export interface ProviderSpec {
  /** Provider identifier (e.g., 'openai', 'ollama') */
  name: string;

  /** Environment variable for host/base URL */
  hostEnv: string;

  /** Default host URL if env not set */
  defaultHost: string;

  /** Whether this provider supports embedding operations */
  supportsEmbeddings: boolean;

  /** Whether this provider supports batch embedding (multiple texts in one call) */
  supportsBatchEmbed: boolean;

  /** Embedding model specification */
  embeddingModel: {
    /** Default model name */
    name: string;

    /** Embedding dimension (MEASURED, not guessed) */
    dimensions: number;

    /** Environment variable to override model name */
    envOverride: string;
  };

  /** Generation/chat model specification */
  generationModel: {
    /** Default model name */
    name: string;

    /** Environment variable to override model name */
    envOverride: string;
  };
}

/**
 * Registry of all supported LLM providers
 *
 * DIMENSION POLICY:
 * - OpenAI: 1536 (text-embedding-3-small), 3072 (text-embedding-3-large)
 * - Ollama: TBD - must be measured empirically per model
 * - Anthropic: N/A (no embedding support)
 */
export const MODEL_REGISTRY: Record<string, ProviderSpec> = {
  openai: {
    name: 'openai',
    hostEnv: 'OPENAI_BASE_URL',
    defaultHost: 'https://api.openai.com',
    supportsEmbeddings: true,
    supportsBatchEmbed: true,
    embeddingModel: {
      name: 'text-embedding-3-small',
      dimensions: 1536,
      envOverride: 'OPENAI_EMBEDDING_MODEL'
    },
    generationModel: {
      name: 'gpt-4-turbo-preview',
      envOverride: 'OPENAI_MODEL'
    }
  },

  'openai-large': {
    name: 'openai-large',
    hostEnv: 'OPENAI_BASE_URL',
    defaultHost: 'https://api.openai.com',
    supportsEmbeddings: true,
    supportsBatchEmbed: true,
    embeddingModel: {
      name: 'text-embedding-3-large',
      dimensions: 3072,
      envOverride: 'OPENAI_EMBEDDING_MODEL'
    },
    generationModel: {
      name: 'gpt-4-turbo-preview',
      envOverride: 'OPENAI_MODEL'
    }
  },

  anthropic: {
    name: 'anthropic',
    hostEnv: 'ANTHROPIC_BASE_URL',
    defaultHost: 'https://api.anthropic.com',
    supportsEmbeddings: false,
    supportsBatchEmbed: false,
    embeddingModel: {
      name: 'none',
      dimensions: 0,
      envOverride: 'ANTHROPIC_EMBEDDING_MODEL'
    },
    generationModel: {
      name: 'claude-3-5-sonnet-20241022',
      envOverride: 'ANTHROPIC_MODEL'
    }
  },

  /**
   * Ollama provider for local models
   *
   * DIMENSION NOTE:
   * Ollama dimensions vary by model:
   * - nomic-embed-text: 768 (measured via `ollama show nomic-embed-text`)
   * - all-minilm: 384
   * - mxbai-embed-large: 1024
   *
   * Default is 768 for nomic-embed-text. Override with OLLAMA_EMBEDDING_MODEL.
   *
   * ENVIRONMENT SETUP:
   * - Set CODEREF_LLM_PROVIDER=ollama
   * - Set CODEREF_LLM_BASE_URL=http://localhost:11434 (or your Ollama host)
   * - Set CODEREF_LLM_MODEL=nomic-embed-text (or your preferred model)
   * - API_KEY can be 'ollama' or any non-empty string (Ollama doesn't require auth)
   */
  ollama: {
    name: 'ollama',
    hostEnv: 'OLLAMA_HOST',
    defaultHost: 'http://localhost:11434',
    supportsEmbeddings: true,
    supportsBatchEmbed: false, // Ollama embeddings API is single-text per call
    embeddingModel: {
      name: 'nomic-embed-text',
      dimensions: 768, // Measured: ollama show nomic-embed-text
      envOverride: 'OLLAMA_EMBEDDING_MODEL'
    },
    generationModel: {
      name: 'gemma4-coderef:latest',
      envOverride: 'OLLAMA_MODEL'
    }
  }
};

/**
 * Get provider specification from registry
 *
 * @param providerName - Provider identifier (e.g., 'openai', 'ollama')
 * @returns ProviderSpec or undefined if not found
 */
export function getProviderSpec(providerName: string): ProviderSpec | undefined {
  return MODEL_REGISTRY[providerName.toLowerCase()];
}

/**
 * Get embedding dimensions for a provider
 *
 * @param providerName - Provider identifier
 * @returns Dimensions or 0 if provider doesn't support embeddings
 * @throws If provider not found in registry
 */
export function getEmbeddingDimensions(providerName: string): number {
  const spec = getProviderSpec(providerName);
  if (!spec) {
    throw new Error(`Provider '${providerName}' not found in MODEL_REGISTRY`);
  }
  if (!spec.supportsEmbeddings) {
    throw new Error(`Provider '${providerName}' does not support embeddings`);
  }
  return spec.embeddingModel.dimensions;
}

/**
 * Check if provider supports embeddings
 *
 * @param providerName - Provider identifier
 * @returns boolean
 */
export function supportsEmbeddings(providerName: string): boolean {
  const spec = getProviderSpec(providerName);
  return spec?.supportsEmbeddings ?? false;
}

/**
 * Error thrown when provider doesn't support embeddings
 */
export class ProviderDoesNotSupportEmbeddings extends Error {
  constructor(providerName: string) {
    super(
      `Provider '${providerName}' does not support embeddings. ` +
      `Use a provider with embedding support (openai, ollama) ` +
      `or configure a separate embedding provider.`
    );
    this.name = 'ProviderDoesNotSupportEmbeddings';
  }
}

/**
 * Validate that all dimensions in registry are > 0 for embedding-capable providers
 */
export function validateRegistry(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [name, spec] of Object.entries(MODEL_REGISTRY)) {
    if (spec.supportsEmbeddings) {
      if (spec.embeddingModel.dimensions <= 0) {
        errors.push(
          `Provider '${name}' has supportsEmbeddings=true but dimensions=${spec.embeddingModel.dimensions}`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

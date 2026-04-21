/**
 * RAG Configuration Loader
 * P5-T1: Loads and validates RAG configuration from environment
 *
 * Manages configuration for:
 * - LLM providers (OpenAI, Anthropic)
 * - Vector stores (Pinecone, Chroma)
 * - RAG behavior settings
 */

import type { LLMProviderConfig } from '../llm/llm-provider.js';
import type { VectorStoreConfig } from '../vector/vector-store.js';

/**
 * Complete RAG system configuration
 */
export interface RAGConfig {
  /** LLM provider configuration */
  llm: {
    provider: 'openai' | 'anthropic';
    config: LLMProviderConfig;
  };

  /** Vector store configuration */
  vectorStore: {
    provider: 'pinecone' | 'chroma' | 'sqlite';
    config: VectorStoreConfig;
  };

  /** Indexing settings */
  indexing?: {
    batchSize?: number;
    batchDelayMs?: number;
    maxSourceCodeLength?: number;
    includeDocumentation?: boolean;
    includeDependencies?: boolean;
  };

  /** Search settings */
  search?: {
    defaultTopK?: number;
    minScore?: number;
    enableReRanking?: boolean;
  };

  /** Answer generation settings */
  generation?: {
    temperature?: number;
    maxTokens?: number;
    maxContextResults?: number;
  };
}

/**
 * Environment variable names
 */
export const ENV_VARS = {
  // LLM Provider
  LLM_PROVIDER: 'CODEREF_LLM_PROVIDER',
  OPENAI_API_KEY: 'OPENAI_API_KEY',
  OPENAI_MODEL: 'CODEREF_OPENAI_MODEL',
  OPENAI_ORG: 'OPENAI_ORGANIZATION',
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
  ANTHROPIC_MODEL: 'CODEREF_ANTHROPIC_MODEL',

  // Vector Store
  VECTOR_STORE_PROVIDER: 'CODEREF_VECTOR_STORE',
  PINECONE_API_KEY: 'PINECONE_API_KEY',
  PINECONE_ENVIRONMENT: 'PINECONE_ENVIRONMENT',
  PINECONE_INDEX: 'CODEREF_PINECONE_INDEX',
  CHROMA_HOST: 'CODEREF_CHROMA_HOST',
  CHROMA_PORT: 'CODEREF_CHROMA_PORT',
  CHROMA_COLLECTION: 'CODEREF_CHROMA_COLLECTION',
  SQLITE_STORAGE_PATH: 'CODEREF_SQLITE_PATH',
  SQLITE_INDEX_NAME: 'CODEREF_SQLITE_INDEX',

  // Settings
  BATCH_SIZE: 'CODEREF_BATCH_SIZE',
  DEFAULT_TOP_K: 'CODEREF_DEFAULT_TOP_K',
  TEMPERATURE: 'CODEREF_TEMPERATURE',
  MAX_TOKENS: 'CODEREF_MAX_TOKENS'
} as const;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<RAGConfig> = {
  indexing: {
    batchSize: 100,
    batchDelayMs: 0,
    maxSourceCodeLength: 2000,
    includeDocumentation: true,
    includeDependencies: true
  },
  search: {
    defaultTopK: 10,
    minScore: 0.5,
    enableReRanking: true
  },
  generation: {
    temperature: 0.3,
    maxTokens: 2000,
    maxContextResults: 5
  }
};

/**
 * Configuration validation errors
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * RAG configuration loader and validator
 */
export class RAGConfigLoader {
  /**
   * Load configuration from environment
   */
  loadConfig(): RAGConfig {
    // Load LLM configuration
    const llmProvider = this.getLLMProvider();
    const llmConfig = this.getLLMConfig(llmProvider);

    // Load vector store configuration
    const vectorStoreProvider = this.getVectorStoreProvider();
    const vectorStoreConfig = this.getVectorStoreConfig(vectorStoreProvider);

    // Load optional settings
    const indexing = this.getIndexingSettings();
    const search = this.getSearchSettings();
    const generation = this.getGenerationSettings();

    return {
      llm: {
        provider: llmProvider,
        config: llmConfig
      },
      vectorStore: {
        provider: vectorStoreProvider,
        config: vectorStoreConfig
      },
      indexing,
      search,
      generation
    };
  }

  /**
   * Get LLM provider from environment
   */
  private getLLMProvider(): 'openai' | 'anthropic' {
    const provider = process.env[ENV_VARS.LLM_PROVIDER]?.toLowerCase();

    if (provider === 'openai' || provider === 'anthropic') {
      return provider;
    }

    // Default to OpenAI if not specified but API key is available
    if (process.env[ENV_VARS.OPENAI_API_KEY]) {
      return 'openai';
    }

    if (process.env[ENV_VARS.ANTHROPIC_API_KEY]) {
      return 'anthropic';
    }

    throw new ConfigError(
      `LLM provider not configured. Set ${ENV_VARS.LLM_PROVIDER} to 'openai' or 'anthropic', ` +
      `or provide ${ENV_VARS.OPENAI_API_KEY} or ${ENV_VARS.ANTHROPIC_API_KEY}`
    );
  }

  /**
   * Get LLM provider configuration
   */
  private getLLMConfig(provider: 'openai' | 'anthropic'): LLMProviderConfig {
    if (provider === 'openai') {
      const apiKey = process.env[ENV_VARS.OPENAI_API_KEY];
      if (!apiKey) {
        throw new ConfigError(
          `OpenAI API key not found. Set ${ENV_VARS.OPENAI_API_KEY}`
        );
      }

      return {
        apiKey,
        model: process.env[ENV_VARS.OPENAI_MODEL] || 'gpt-4-turbo-preview',
        organization: process.env[ENV_VARS.OPENAI_ORG],
        maxRetries: 3,
        timeout: 60000
      };
    } else {
      const apiKey = process.env[ENV_VARS.ANTHROPIC_API_KEY];
      if (!apiKey) {
        throw new ConfigError(
          `Anthropic API key not found. Set ${ENV_VARS.ANTHROPIC_API_KEY}`
        );
      }

      return {
        apiKey,
        model: process.env[ENV_VARS.ANTHROPIC_MODEL] || 'claude-3-5-sonnet-20241022',
        maxRetries: 3,
        timeout: 60000
      };
    }
  }

  /**
   * Get vector store provider from environment
   */
  private getVectorStoreProvider(): 'pinecone' | 'chroma' | 'sqlite' {
    const provider = process.env[ENV_VARS.VECTOR_STORE_PROVIDER]?.toLowerCase();

    if (provider === 'pinecone' || provider === 'chroma' || provider === 'sqlite') {
      return provider;
    }

    // Default to Pinecone if API key is available
    if (process.env[ENV_VARS.PINECONE_API_KEY]) {
      return 'pinecone';
    }

    // Default to SQLite (works out of the box, no external dependencies)
    return 'sqlite';
  }

  /**
   * Get vector store configuration
   */
  private getVectorStoreConfig(
    provider: 'pinecone' | 'chroma' | 'sqlite'
  ): VectorStoreConfig {
    if (provider === 'pinecone') {
      const apiKey = process.env[ENV_VARS.PINECONE_API_KEY];
      if (!apiKey) {
        throw new ConfigError(
          `Pinecone API key not found. Set ${ENV_VARS.PINECONE_API_KEY}`
        );
      }

      const indexName = process.env[ENV_VARS.PINECONE_INDEX] || 'coderef-index';

      return {
        apiKey,
        environment: process.env[ENV_VARS.PINECONE_ENVIRONMENT],
        indexName,
        dimension: 1536, // OpenAI embedding dimension
        metric: 'cosine'
      };
    } else if (provider === 'chroma') {
      // Chroma configuration
      const host = process.env[ENV_VARS.CHROMA_HOST] || 'http://localhost';
      const port = parseInt(process.env[ENV_VARS.CHROMA_PORT] || '8000', 10);
      const indexName = process.env[ENV_VARS.CHROMA_COLLECTION] || 'coderef-collection';

      return {
        host,
        port,
        indexName,
        dimension: 1536,
        metric: 'cosine'
      };
    } else {
      // SQLite configuration (default - no external dependencies)
      const storagePath = process.env[ENV_VARS.SQLITE_STORAGE_PATH] || process.cwd();
      const indexName = process.env[ENV_VARS.SQLITE_INDEX_NAME] || 'coderef-vectors';

      return {
        storagePath,
        indexName,
        dimension: 1536,
        metric: 'cosine'
      };
    }
  }

  /**
   * Get indexing settings
   */
  private getIndexingSettings(): RAGConfig['indexing'] {
    const defaults = DEFAULT_CONFIG.indexing!;

    return {
      batchSize: parseInt(
        process.env[ENV_VARS.BATCH_SIZE] || String(defaults.batchSize),
        10
      ),
      batchDelayMs: defaults.batchDelayMs,
      maxSourceCodeLength: defaults.maxSourceCodeLength,
      includeDocumentation: defaults.includeDocumentation,
      includeDependencies: defaults.includeDependencies
    };
  }

  /**
   * Get search settings
   */
  private getSearchSettings(): RAGConfig['search'] {
    const defaults = DEFAULT_CONFIG.search!;

    return {
      defaultTopK: parseInt(
        process.env[ENV_VARS.DEFAULT_TOP_K] || String(defaults.defaultTopK),
        10
      ),
      minScore: defaults.minScore,
      enableReRanking: defaults.enableReRanking
    };
  }

  /**
   * Get generation settings
   */
  private getGenerationSettings(): RAGConfig['generation'] {
    const defaults = DEFAULT_CONFIG.generation!;

    return {
      temperature: parseFloat(
        process.env[ENV_VARS.TEMPERATURE] || String(defaults.temperature)
      ),
      maxTokens: parseInt(
        process.env[ENV_VARS.MAX_TOKENS] || String(defaults.maxTokens),
        10
      ),
      maxContextResults: defaults.maxContextResults
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(config: RAGConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate LLM config
    if (!config.llm.config.apiKey) {
      errors.push('LLM API key is required');
    }

    // Validate vector store config
    if (config.vectorStore.provider === 'pinecone' && !config.vectorStore.config.apiKey) {
      errors.push('Pinecone API key is required');
    }

    if (!config.vectorStore.config.indexName) {
      errors.push('Vector store index/collection name is required');
    }

    // Validate numeric settings
    if (config.indexing?.batchSize && config.indexing.batchSize <= 0) {
      errors.push('Batch size must be positive');
    }

    if (config.search?.defaultTopK && config.search.defaultTopK <= 0) {
      errors.push('Default topK must be positive');
    }

    if (
      config.generation?.temperature !== undefined &&
      (config.generation.temperature < 0 || config.generation.temperature > 2)
    ) {
      errors.push('Temperature must be between 0 and 2');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Print configuration summary (safe for logging)
   */
  printConfigSummary(config: RAGConfig): string {
    const lines = [
      'RAG Configuration:',
      `  LLM Provider: ${config.llm.provider}`,
      `  LLM Model: ${config.llm.config.model || 'default'}`,
      `  Vector Store: ${config.vectorStore.provider}`,
      `  Vector Index: ${config.vectorStore.config.indexName}`,
      '',
      'Settings:',
      `  Batch Size: ${config.indexing?.batchSize}`,
      `  Default Top-K: ${config.search?.defaultTopK}`,
      `  Temperature: ${config.generation?.temperature}`,
      `  Max Tokens: ${config.generation?.maxTokens}`
    ];

    return lines.join('\n');
  }

  /**
   * Generate example .env file content
   */
  generateEnvTemplate(): string {
    return `# RAG Configuration Template
# Copy this to .env and fill in your values

# LLM Provider (openai or anthropic)
${ENV_VARS.LLM_PROVIDER}=openai

# OpenAI Configuration
${ENV_VARS.OPENAI_API_KEY}=sk-...
${ENV_VARS.OPENAI_MODEL}=gpt-4-turbo-preview
# ${ENV_VARS.OPENAI_ORG}=org-...

# Anthropic Configuration (alternative to OpenAI)
# ${ENV_VARS.ANTHROPIC_API_KEY}=sk-ant-...
# ${ENV_VARS.ANTHROPIC_MODEL}=claude-3-5-sonnet-20241022

# Vector Store (sqlite, pinecone, or chroma)
# SQLite is the default - works out of the box with no external dependencies
${ENV_VARS.VECTOR_STORE_PROVIDER}=sqlite

# SQLite Configuration (default - no setup required)
# ${ENV_VARS.SQLITE_STORAGE_PATH}=.  # Stores in .coderef/ directory
# ${ENV_VARS.SQLITE_INDEX_NAME}=coderef-vectors

# Pinecone Configuration (cloud-hosted vector store)
# ${ENV_VARS.PINECONE_API_KEY}=...
# ${ENV_VARS.PINECONE_ENVIRONMENT}=us-east-1-aws
# ${ENV_VARS.PINECONE_INDEX}=coderef-index

# Chroma Configuration (requires Docker or local Chroma server)
# ${ENV_VARS.CHROMA_HOST}=http://localhost
# ${ENV_VARS.CHROMA_PORT}=8000
# ${ENV_VARS.CHROMA_COLLECTION}=coderef-collection

# Optional Settings
# ${ENV_VARS.BATCH_SIZE}=100
# ${ENV_VARS.DEFAULT_TOP_K}=10
# ${ENV_VARS.TEMPERATURE}=0.3
# ${ENV_VARS.MAX_TOKENS}=2000
`;
  }
}

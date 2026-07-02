/**
 * @coderef-semantic: 1.0.0
 * @layer integration
 * @capability llm-provider-store-factory
 * @exports createLLMProvider, createVectorStore, embeddingDimensionsForModel
 * @used_by src/cli/rag-index.ts, src/cli/rag-search.ts, src/cli/rag-eval.ts, src/cli/coderef-mcp-server.ts, src/cli/coderef-rag-server.ts
 */

/**
 * Shared LLM-provider / vector-store factory.
 *
 * WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 2 (P1-10): replaces four
 * hand-maintained copies of this logic (rag-index, rag-search,
 * coderef-mcp-server, rag-eval) plus coderef-rag-server's private dimension
 * table. Model names, hosts, and embedding dimensions come from
 * MODEL_REGISTRY — the single source of truth.
 *
 * HARD CONSTRAINT (operator directive 2026-07-02): this environment is
 * Ollama LOCAL-ONLY. The default provider is 'ollama' and requires NO API
 * key. Cloud providers (openai/anthropic) are constructed only when
 * explicitly requested, and fail loudly when their keys are absent.
 *
 * Providers and store SDKs are loaded with dynamic imports so optional
 * dependencies (pinecone/chroma SDKs, cloud clients) are never pulled in
 * unless actually requested — same laziness contract the CLIs had.
 */

import * as path from 'path';
import { MODEL_REGISTRY, getProviderSpec } from './model-registry.js';

/**
 * Create an LLM provider by name. Defaults to Ollama (local-only).
 *
 * Env compatibility: the long-standing CLI variable names
 * (CODEREF_OPENAI_MODEL / CODEREF_ANTHROPIC_MODEL / CODEREF_LLM_*) are
 * honored first, then the registry's own envOverride, then the registry
 * default.
 */
export async function createLLMProvider(providerName?: string): Promise<any> {
  const provider = (providerName ?? process.env.CODEREF_LLM_PROVIDER ?? 'ollama').toLowerCase();

  if (provider === 'openai') {
    const spec = getProviderSpec('openai')!;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    const { OpenAIProvider } = await import('./openai-provider.js');
    return new OpenAIProvider({
      apiKey,
      model:
        process.env.CODEREF_OPENAI_MODEL ||
        process.env[spec.generationModel.envOverride] ||
        spec.generationModel.name,
    });
  }

  if (provider === 'anthropic') {
    const spec = getProviderSpec('anthropic')!;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    const { AnthropicProvider } = await import('./anthropic-provider.js');
    return new AnthropicProvider({
      apiKey,
      model:
        process.env.CODEREF_ANTHROPIC_MODEL ||
        process.env[spec.generationModel.envOverride] ||
        spec.generationModel.name,
    });
  }

  if (provider === 'ollama') {
    const spec = getProviderSpec('ollama')!;
    const { OllamaProvider } = await import('./ollama-provider.js');
    return new OllamaProvider({
      // Ollama does not authenticate; any non-empty string works.
      apiKey: process.env.CODEREF_LLM_API_KEY || 'ollama',
      baseUrl: process.env[spec.hostEnv] || spec.defaultHost,
      model:
        process.env[spec.generationModel.envOverride] ||
        spec.generationModel.name,
    });
  }

  throw new Error(
    `Provider '${provider}' not supported. Supported: openai, anthropic, ollama.`,
  );
}

/**
 * Create a vector store by name, sized to the provider's embedding
 * dimensions. Canonical local store name is 'json' (a JSON-file store);
 * 'sqlite' is accepted as a DEPRECATED alias (P2-16 honest rename — the
 * store was never SQLite). Unknown stores and missing cloud config fall
 * back to the JSON store.
 */
export async function createVectorStore(
  storeName: string,
  projectDir: string,
  llmProvider: any,
  options: { warnTag?: string } = {},
): Promise<any> {
  const warnTag = options.warnTag ?? 'provider-factory';
  const dimension =
    llmProvider?.getEmbeddingDimensions?.() ??
    (() => {
      throw new Error(
        'Provider does not support embeddings or getEmbeddingDimensions() not implemented',
      );
    })();

  switch (storeName) {
    case 'pinecone': {
      const apiKey = process.env.PINECONE_API_KEY;
      if (!apiKey) {
        console.warn(`[${warnTag}] PINECONE_API_KEY not set, falling back to the local JSON store`);
        break;
      }
      const { PineconeStore } = await import('../vector/pinecone-store.js');
      return new PineconeStore({
        apiKey,
        indexName: process.env.PINECONE_INDEX_NAME || 'coderef-index',
        dimension,
      });
    }

    case 'chroma': {
      const { ChromaStore } = await import('../vector/chroma-store.js');
      return new ChromaStore({
        host: process.env.CHROMA_URL || 'http://localhost:8000',
        indexName: 'coderef-collection',
        dimension,
      });
    }

    case 'sqlite':
      console.warn(
        `[${warnTag}] store name 'sqlite' is deprecated — it was always a JSON file store. Use --store json.`,
      );
      break;

    case 'json':
    default:
      break;
  }

  // Use a .json extension so JsonVectorStore treats it as the literal file
  // path and doesn't double-join `.coderef/coderef-vectors.json`.
  const { JsonVectorStore } = await import('../vector/json-store.js');
  const storagePath =
    process.env.CODEREF_SQLITE_PATH ||
    path.join(projectDir, '.coderef', 'coderef-vectors.json');
  return new JsonVectorStore({ storagePath, dimension });
}

/**
 * Embedding dimension for a model NAME (e.g. 'nomic-embed-text' -> 768),
 * resolved from MODEL_REGISTRY. Replaces coderef-rag-server's private
 * dimension table. Returns null for models the registry doesn't know.
 */
export function embeddingDimensionsForModel(modelName: string): number | null {
  for (const spec of Object.values(MODEL_REGISTRY)) {
    if (spec.supportsEmbeddings && spec.embeddingModel.name === modelName) {
      return spec.embeddingModel.dimensions;
    }
  }
  return null;
}

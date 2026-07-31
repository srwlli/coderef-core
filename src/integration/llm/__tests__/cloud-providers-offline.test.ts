/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability cloud-providers-offline-tests
 */

/**
 * Offline construction/shape tests for the cloud-provider surface and the
 * factory's explicit-opt-in construction paths.
 *
 * HARD CONSTRAINT (Ollama local-only environment): NO network calls, NO real
 * API keys. Everything here pins construction-time behavior only — config
 * validation, defaults, the capability surface, and the factory contract
 * that cloud providers are constructed ONLY on explicit selection while
 * 'ollama' stays the unconditional default even when cloud keys are present.
 * Resolution-order pins (explicit > CODEREF_LLM_PROVIDER > 'ollama') live in
 * __tests__/rag-provider-default.test.ts; this file pins CONSTRUCTION.
 *
 * QUARANTINE REALITY: the openai SDK + tiktoken are installed dependencies,
 * so OpenAIProvider is constructible offline and tested directly. The
 * @anthropic-ai/sdk package is deliberately NOT a dependency — an ambient
 * stub (src/types/external-modules.d.ts) satisfies the compiler and the
 * factory reaches the module only through a dynamic import behind an
 * explicit opt-in. AnthropicProvider is therefore unimportable here; its
 * pins are factory-level: the opt-in path fails LOUDLY (key check first,
 * module absence second) instead of silently degrading.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OpenAIProvider } from '../openai-provider.js';
import { LLMError, LLMErrorCode } from '../llm-provider.js';
import { supportsEmbeddings } from '../model-registry.js';
import { createLLMProvider } from '../provider-factory.js';

const DUMMY_KEY = 'offline-test-key-never-real';

const ENV_KEYS = [
  'CODEREF_LLM_PROVIDER',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
] as const;
let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {};
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe('OpenAIProvider — offline construction and shape', () => {
  it('refuses construction without an API key (typed LLMError)', () => {
    expect(() => new OpenAIProvider({} as never)).toThrowError(LLMError);
    try {
      new OpenAIProvider({} as never);
      expect.unreachable('constructor must throw');
    } catch (e) {
      expect((e as LLMError).code).toBe(LLMErrorCode.INVALID_API_KEY);
    }
  });

  it('constructs offline with a dummy key and reports its capability surface', () => {
    const p = new OpenAIProvider({ apiKey: DUMMY_KEY });
    expect(p.getProviderName()).toBe('openai');
    expect(typeof p.getModel()).toBe('string');
    expect(p.supportsEmbeddings()).toBe(true);
    expect(p.getEmbeddingDimensions()).toBeGreaterThan(0);
    // Present but never invoked — invoking would hit the network.
    expect(typeof p.complete).toBe('function');
    expect(typeof p.embed).toBe('function');
  });

  it('counts tokens locally via tiktoken (no network)', () => {
    const p = new OpenAIProvider({ apiKey: DUMMY_KEY });
    expect(p.countTokens('hello coderef world')).toBeGreaterThan(0);
  });
});

describe('anthropic surface — quarantined by construction AND by absent dependency', () => {
  it('the registry declares anthropic embedding-incapable', () => {
    expect(supportsEmbeddings('anthropic')).toBe(false);
  });

  it('explicit anthropic opt-in fails loudly on the missing key BEFORE touching the module', async () => {
    // Key validation precedes the dynamic import, so the error names the
    // key — not the absent package.
    await expect(createLLMProvider('anthropic')).rejects.toThrow('ANTHROPIC_API_KEY');
  });

  it('explicit anthropic opt-in with a key fails loudly on the absent SDK (never silently degrades)', async () => {
    process.env.ANTHROPIC_API_KEY = DUMMY_KEY;
    // @anthropic-ai/sdk is intentionally not a dependency in this
    // Ollama-local-only environment; the dynamic import must surface that
    // as a hard error, not fall back to another provider.
    await expect(createLLMProvider('anthropic')).rejects.toThrow(/@anthropic-ai\/sdk|Cannot find|Failed to load/);
  });
});

describe('createLLMProvider — construction is explicit-opt-in only (Ollama local-only)', () => {
  it('default construction yields the Ollama provider even when cloud keys are present', async () => {
    // Key presence must NEVER select a cloud provider (STUB-MN7E0G rule,
    // proven here at the construction level, not just name resolution).
    process.env.OPENAI_API_KEY = DUMMY_KEY;
    process.env.ANTHROPIC_API_KEY = DUMMY_KEY;
    const p = await createLLMProvider();
    expect(p.getProviderName()).toBe('ollama');
  });

  it('explicitly-selected openai fails loudly when its key is absent', async () => {
    await expect(createLLMProvider('openai')).rejects.toThrow('OPENAI_API_KEY');
  });

  it('explicitly-selected openai constructs offline via the dynamic-import path', async () => {
    process.env.OPENAI_API_KEY = DUMMY_KEY;
    const openai = await createLLMProvider('openai');
    expect(openai.getProviderName()).toBe('openai');
  });
});

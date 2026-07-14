/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability rag-provider-default-regression
 *
 * WO-RAG-INDEX-DEFAULTS-TO-CLOUD-OPENAI-ON-LOCAL-001 (STUB-MN7E0G).
 *
 * Locks the operator-ruled provider-resolution contract: local Ollama is the
 * UNCONDITIONAL default at every seam — a merely-present OPENAI_API_KEY /
 * ANTHROPIC_API_KEY must NEVER flip selection to a paid cloud API. Cloud is
 * explicit opt-in only (--provider / CODEREF_LLM_PROVIDER). The old behavior
 * this file guards against: `envProvider ?? (OPENAI_API_KEY ? 'openai' :
 * 'ollama')` in rag-index/rag-search parse defaults and the key-sniff in
 * RAGConfigLoader.getLLMProvider() permissive mode.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveRagProvider } from '../src/integration/llm/provider-factory.js';
import { RAGConfigLoader, ConfigError } from '../src/integration/rag/rag-config.js';

const ENV_KEYS = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'CODEREF_LLM_PROVIDER',
  'CODEREF_LLM_BASE_URL',
  'CODEREF_LLM_API_KEY',
  'CODEREF_LLM_MODEL',
  'CODEREF_RAG_LOCAL_ONLY',
  'PINECONE_API_KEY',
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('resolveRagProvider — shared CLI resolution seam', () => {
  it('defaults to ollama with a bare environment', () => {
    expect(resolveRagProvider()).toBe('ollama');
  });

  it('stays ollama when OPENAI_API_KEY is merely present (the STUB-MN7E0G bug)', () => {
    process.env.OPENAI_API_KEY = 'sk-test-incidental';
    expect(resolveRagProvider()).toBe('ollama');
  });

  it('stays ollama when ANTHROPIC_API_KEY is merely present', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-incidental';
    expect(resolveRagProvider()).toBe('ollama');
  });

  it('honors an explicit provider argument (cloud opt-in path)', () => {
    expect(resolveRagProvider('openai')).toBe('openai');
    expect(resolveRagProvider('OpenAI')).toBe('openai');
  });

  it('honors CODEREF_LLM_PROVIDER when no explicit argument is given', () => {
    process.env.CODEREF_LLM_PROVIDER = 'openai';
    expect(resolveRagProvider()).toBe('openai');
  });

  it('explicit argument trumps CODEREF_LLM_PROVIDER', () => {
    process.env.CODEREF_LLM_PROVIDER = 'openai';
    expect(resolveRagProvider('ollama')).toBe('ollama');
  });
});

describe('RAGConfigLoader.getLLMProvider — permissive mode, no key-sniffing', () => {
  it('selects ollama (never openai) when OPENAI_API_KEY is set but no provider is configured', () => {
    process.env.OPENAI_API_KEY = 'sk-test-incidental';
    process.env.CODEREF_LLM_BASE_URL = 'http://localhost:11434';
    const config = new RAGConfigLoader().loadConfig();
    expect(config.llm.provider).toBe('ollama');
  });

  it('selects ollama (never anthropic) when only ANTHROPIC_API_KEY is set', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-incidental';
    process.env.CODEREF_LLM_BASE_URL = 'http://localhost:11434';
    const config = new RAGConfigLoader().loadConfig();
    expect(config.llm.provider).toBe('ollama');
  });

  it('fully-unconfigured environment fails with local-first guidance, not a cloud selection', () => {
    process.env.OPENAI_API_KEY = 'sk-test-incidental';
    // No CODEREF_LLM_BASE_URL / CODEREF_LLM_API_KEY: the ollama branch of
    // getLLMConfig must throw its actionable local-config error — proving the
    // selector routed local despite the cloud key in the shell.
    expect(() => new RAGConfigLoader().loadConfig()).toThrow(/CODEREF_LLM_BASE_URL/);
  });

  it('still honors an explicit CODEREF_LLM_PROVIDER=openai opt-in when its key is present', () => {
    process.env.CODEREF_LLM_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'sk-test-explicit';
    const config = new RAGConfigLoader().loadConfig();
    expect(config.llm.provider).toBe('openai');
  });
});

describe('CODEREF_RAG_LOCAL_ONLY guard — behavior unchanged', () => {
  it('refuses an explicit cloud provider in local-only mode', () => {
    process.env.CODEREF_RAG_LOCAL_ONLY = '1';
    process.env.CODEREF_LLM_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'sk-test-explicit';
    expect(() => new RAGConfigLoader().loadConfig()).toThrow(ConfigError);
  });

  it('local-only mode still requires an explicit local provider', () => {
    process.env.CODEREF_RAG_LOCAL_ONLY = '1';
    expect(() => new RAGConfigLoader().loadConfig()).toThrow(/CODEREF_LLM_PROVIDER is not set/);
  });
});

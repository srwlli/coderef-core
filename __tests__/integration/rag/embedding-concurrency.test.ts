/**
 * OllamaProvider.embed() bounded-concurrency worker-pool tests
 * (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 P5).
 *
 * The provider's embed() replaced a strictly-serial per-text loop with a
 * fixed-size, ORDER-PRESERVING worker pool. These tests pin the four
 * contract properties that matter:
 *   1. order preservation — output vectors are in INPUT order even when the
 *      mock completes requests out of order (reverse-latency);
 *   2. concurrency cap — never more than N embedSingle requests in flight;
 *   3. fail-fast — a mid-pool ECONNREFUSED aborts without fanning the rest;
 *   4. concurrency=1 is the serial path (sequential, one in flight).
 *
 * fetch is fully mocked — no Ollama daemon needed. The mock encodes the
 * INPUT text's index into embedding[0] so order is checkable, and a scheduled
 * per-call latency forces completion order != input order.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { OllamaProvider } from '../../../src/integration/llm/ollama-provider.js';

const EMBED_DIM = 768; // nomic-embed-text, matches MODEL_REGISTRY

/**
 * Build a Response-like object for a given embedding vector.
 */
function embedResponse(vector: number[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ embedding: vector }),
    text: async () => '',
  };
}

/**
 * A 768-dim vector whose FIRST element encodes `marker` (the input index),
 * so a caller can assert result[i][0] === i (order preserved).
 */
function markedVector(marker: number): number[] {
  const v = new Array(EMBED_DIM).fill(0);
  v[0] = marker;
  return v;
}

/**
 * Extract the input index a request carried, from its POSTed prompt.
 * The tests set each text to `text-<index>`.
 */
function indexFromBody(init: any): number {
  const body = JSON.parse(init.body);
  const m = /text-(\d+)/.exec(body.prompt);
  return m ? Number(m[1]) : -1;
}

function makeProvider(embedConcurrency?: number): OllamaProvider {
  return new OllamaProvider({
    apiKey: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5:7b-instruct',
    embedConcurrency,
  });
}

describe('OllamaProvider.embed() bounded concurrency', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete process.env.CODEREF_EMBED_CONCURRENCY;
  });

  it('preserves INPUT order even when requests complete out of order', async () => {
    // Reverse-latency: earlier indices resolve LATER, so completion order is
    // the reverse of input order. If the pool pushed by completion order the
    // result would be reversed; index-keyed slots keep it in input order.
    const mockFetch = vi.fn((_url: string, init: any) => {
      const i = indexFromBody(init);
      const delay = (100 - i) * 2; // i=0 slowest, i=n fastest
      return new Promise((resolve) => {
        setTimeout(() => resolve(embedResponse(markedVector(i))), delay);
      });
    });
    global.fetch = mockFetch as any;

    const provider = makeProvider(4);
    const texts = Array.from({ length: 12 }, (_, i) => `text-${i}`);
    const vectors = await provider.embed(texts);

    expect(vectors).toHaveLength(12);
    // Each output slot's marker equals its input index -> order preserved.
    for (let i = 0; i < 12; i++) {
      expect(vectors[i][0]).toBe(i);
      expect(vectors[i]).toHaveLength(EMBED_DIM);
    }
  });

  it('never exceeds the configured concurrency (max in-flight <= N)', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const mockFetch = vi.fn((_url: string, init: any) => {
      const i = indexFromBody(init);
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      return new Promise((resolve) => {
        setTimeout(() => {
          inFlight--;
          resolve(embedResponse(markedVector(i)));
        }, 10);
      });
    });
    global.fetch = mockFetch as any;

    const provider = makeProvider(3);
    const texts = Array.from({ length: 20 }, (_, i) => `text-${i}`);
    await provider.embed(texts);

    expect(maxInFlight).toBeLessThanOrEqual(3);
    // With 20 texts and a cap of 3, we must have genuinely parallelized
    // (a serial run would peak at 1).
    expect(maxInFlight).toBeGreaterThan(1);
    expect(mockFetch).toHaveBeenCalledTimes(20);
  });

  it('fails fast on ECONNREFUSED without fanning the remaining requests', async () => {
    // A large input with a hard cap; the FIRST dispatched request rejects
    // non-retryably (ECONNREFUSED). Fail-fast means we must NOT go on to fire
    // one request per remaining text — only the initial in-flight window (at
    // most the pool size) should ever hit fetch.
    let callCount = 0;
    const mockFetch = vi.fn((_url: string, _init: any) => {
      callCount++;
      const error = new Error('fetch failed');
      (error as any).cause = { code: 'ECONNREFUSED' };
      return Promise.reject(error);
    });
    global.fetch = mockFetch as any;

    const provider = makeProvider(4);
    const texts = Array.from({ length: 100 }, (_, i) => `text-${i}`);

    await expect(provider.embed(texts)).rejects.toThrow(
      /Ollama daemon unreachable|ECONNREFUSED/,
    );

    // Fail-fast: at most the pool size (4) requests were dispatched, NOT 100.
    // (All 4 workers may have picked up their first index before the reject
    // propagated; none should start a 5th.)
    expect(callCount).toBeLessThanOrEqual(4);
    expect(callCount).toBeLessThan(100);
  });

  it('concurrency=1 is the serial path (one request in flight at a time)', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const mockFetch = vi.fn((_url: string, init: any) => {
      const i = indexFromBody(init);
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      return new Promise((resolve) => {
        setTimeout(() => {
          inFlight--;
          resolve(embedResponse(markedVector(i)));
        }, 5);
      });
    });
    global.fetch = mockFetch as any;

    const provider = makeProvider(1);
    const texts = Array.from({ length: 6 }, (_, i) => `text-${i}`);
    const vectors = await provider.embed(texts);

    // Strictly serial: never more than one request outstanding.
    expect(maxInFlight).toBe(1);
    // Order still preserved.
    for (let i = 0; i < 6; i++) {
      expect(vectors[i][0]).toBe(i);
    }
  });

  it('empty input returns [] without any fetch', async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch as any;
    const provider = makeProvider(4);
    const vectors = await provider.embed([]);
    expect(vectors).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('resolveEmbedConcurrency (pure clamp)', () => {
  it('clamps, defaults, and honors the env fallback deterministically', async () => {
    const { resolveEmbedConcurrency, OLLAMA_EMBED_CONCURRENCY_DEFAULT, OLLAMA_EMBED_CONCURRENCY_MAX } =
      await import('../../../src/integration/llm/ollama-provider.js');

    // Explicit config wins.
    expect(resolveEmbedConcurrency(6, undefined)).toBe(6);
    // Clamp to MAX.
    expect(resolveEmbedConcurrency(999, undefined)).toBe(OLLAMA_EMBED_CONCURRENCY_MAX);
    // <1 or non-finite -> default.
    expect(resolveEmbedConcurrency(0, undefined)).toBe(OLLAMA_EMBED_CONCURRENCY_DEFAULT);
    expect(resolveEmbedConcurrency(-3, undefined)).toBe(OLLAMA_EMBED_CONCURRENCY_DEFAULT);
    expect(resolveEmbedConcurrency(undefined, undefined)).toBe(OLLAMA_EMBED_CONCURRENCY_DEFAULT);
    // Env fallback when config absent.
    expect(resolveEmbedConcurrency(undefined, '8')).toBe(8);
    // Non-numeric env -> default.
    expect(resolveEmbedConcurrency(undefined, 'abc')).toBe(OLLAMA_EMBED_CONCURRENCY_DEFAULT);
    // Fractional floors down.
    expect(resolveEmbedConcurrency(3.9, undefined)).toBe(3);
  });
});

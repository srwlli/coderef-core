/**
 * EmbeddingCache — content-addressed chunk-grain embedding cache tests
 * (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 P5).
 *
 * Pins the substitutability contract: a cache hit returns the byte-identical
 * vector for identical embedding text under the same model; a model swap
 * misses (the model id is part of the key); the partition helper splits a
 * chunk list into hits (materialized as EmbeddedChunks) and misses; and the
 * sidecar round-trips deterministically. No Date.now/Math.random in keys.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  EmbeddingCache,
  embeddingCacheKey,
} from '../embedding-cache.js';
import { EmbeddingTextGenerator } from '../embedding-text-generator.js';
import type { CodeChunk } from '../code-chunk.js';

function chunk(overrides: Partial<CodeChunk> = {}): CodeChunk {
  return {
    coderef: '@Fn/auth/login#authenticate:24',
    type: 'function',
    name: 'authenticate',
    file: 'src/auth/login.ts',
    line: 24,
    language: 'typescript',
    exported: true,
    dependencies: [],
    dependents: [],
    dependencyCount: 0,
    dependentCount: 0,
    ...overrides,
  };
}

function vec(marker: number, dim = 8): number[] {
  const v = new Array(dim).fill(0);
  v[0] = marker;
  return v;
}

describe('embeddingCacheKey (pure)', () => {
  it('is deterministic and model-qualified', () => {
    const k1 = embeddingCacheKey('some text', 'nomic-embed-text');
    const k2 = embeddingCacheKey('some text', 'nomic-embed-text');
    const kOtherModel = embeddingCacheKey('some text', 'other-model');
    const kOtherText = embeddingCacheKey('different', 'nomic-embed-text');

    expect(k1).toBe(k2); // deterministic
    expect(k1).not.toBe(kOtherModel); // model id changes the key
    expect(k1).not.toBe(kOtherText); // text changes the key
    expect(k1.endsWith(':nomic-embed-text')).toBe(true); // model suffix
  });
});

describe('EmbeddingCache', () => {
  let baseDir: string;
  const gen = new EmbeddingTextGenerator();

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'embed-cache-test-'));
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it('get returns the byte-identical vector that was set (substitutability)', async () => {
    const cache = new EmbeddingCache(baseDir, 'nomic-embed-text');
    await cache.load();
    const c = chunk();
    const key = cache.keyForChunk(c, gen);
    const vector = vec(42);
    cache.set(key, vector);

    const got = cache.get(key);
    expect(got).toEqual(vector); // identical bytes
    // Re-keying the same chunk yields the same key -> same hit.
    expect(cache.get(cache.keyForChunk(c, gen))).toEqual(vector);
  });

  it('misses on a model swap (model id is part of the key)', async () => {
    const nomic = new EmbeddingCache(baseDir, 'nomic-embed-text');
    await nomic.load();
    const c = chunk();
    nomic.set(nomic.keyForChunk(c, gen), vec(1));

    // A cache for a DIFFERENT model computes a different key -> miss.
    const other = new EmbeddingCache(baseDir, 'other-model');
    await other.load(); // loads the same sidecar? no — nomic hasn't persisted
    expect(other.get(other.keyForChunk(c, gen))).toBeUndefined();
  });

  it('partition splits chunks into hits (EmbeddedChunk) and misses', async () => {
    const cache = new EmbeddingCache(baseDir, 'nomic-embed-text');
    await cache.load();

    const warm = chunk({ coderef: '@Fn/a#warm:1', name: 'warm' });
    const cold = chunk({ coderef: '@Fn/b#cold:2', name: 'cold' });

    // Pre-warm ONLY `warm`.
    const warmKey = cache.keyForChunk(warm, gen);
    const warmVector = vec(7);
    cache.set(warmKey, warmVector);

    const { hits, misses } = cache.partition([warm, cold], gen);

    expect(hits).toHaveLength(1);
    expect(misses).toHaveLength(1);
    expect(hits[0].chunk.coderef).toBe('@Fn/a#warm:1');
    expect(hits[0].embedding).toEqual(warmVector); // hit carries the cached vector
    expect(hits[0].timestamp).toBe(0); // deterministic, not Date.now
    expect(misses[0].coderef).toBe('@Fn/b#cold:2');
  });

  it('persist + load round-trips deterministically (sidecar sibling)', async () => {
    const cache = new EmbeddingCache(baseDir, 'nomic-embed-text');
    await cache.load();
    const c1 = chunk({ coderef: '@Fn/a#one:1' });
    const c2 = chunk({ coderef: '@Fn/b#two:2', name: 'two' });
    cache.set(cache.keyForChunk(c1, gen), vec(1));
    cache.set(cache.keyForChunk(c2, gen), vec(2));
    await cache.persist();

    // The sidecar lives at baseDir/.coderef-embed-cache.json.
    const sidecar = path.join(baseDir, '.coderef-embed-cache.json');
    expect(fs.existsSync(sidecar)).toBe(true);

    // A fresh cache instance loads the same vectors.
    const reloaded = new EmbeddingCache(baseDir, 'nomic-embed-text');
    await reloaded.load();
    expect(reloaded.size()).toBe(2);
    expect(reloaded.get(reloaded.keyForChunk(c1, gen))).toEqual(vec(1));
    expect(reloaded.get(reloaded.keyForChunk(c2, gen))).toEqual(vec(2));

    // Byte-identical re-serialization (deterministic key-sorted snapshot).
    const firstBytes = fs.readFileSync(sidecar, 'utf-8');
    await reloaded.persist();
    expect(fs.readFileSync(sidecar, 'utf-8')).toBe(firstBytes);
  });

  it('tolerates a missing sidecar (first run) and a corrupt one', async () => {
    // Missing: load() on a fresh dir starts empty, no throw.
    const fresh = new EmbeddingCache(baseDir, 'nomic-embed-text');
    await fresh.load();
    expect(fresh.size()).toBe(0);

    // Corrupt: a non-JSON sidecar is ignored (starts empty), no throw.
    const sidecar = path.join(baseDir, '.coderef-embed-cache.json');
    fs.writeFileSync(sidecar, 'not json{{{', 'utf-8');
    const corrupt = new EmbeddingCache(baseDir, 'nomic-embed-text');
    await corrupt.load();
    expect(corrupt.size()).toBe(0);
  });

  it('a warm-cache partition means zero misses on an unchanged chunk set', async () => {
    const cache = new EmbeddingCache(baseDir, 'nomic-embed-text');
    await cache.load();
    const chunks = [
      chunk({ coderef: '@Fn/a#a:1', name: 'a' }),
      chunk({ coderef: '@Fn/b#b:2', name: 'b' }),
      chunk({ coderef: '@Fn/c#c:3', name: 'c' }),
    ];
    // Warm all.
    for (const c of chunks) cache.set(cache.keyForChunk(c, gen), vec(1));

    const { hits, misses } = cache.partition(chunks, gen);
    expect(hits).toHaveLength(3);
    expect(misses).toHaveLength(0); // second pass fully served from cache
  });
});

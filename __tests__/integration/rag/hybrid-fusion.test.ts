/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability rag-hybrid-fusion-test
 */

import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { JsonVectorStore } from '../../../src/integration/vector/json-store.js';
import type { VectorRecord } from '../../../src/integration/vector/vector-store.js';
import { SemanticSearchService } from '../../../src/integration/rag/semantic-search.js';
import {
  SparseRetriever,
  reciprocalRankFusion,
  tokenizeLexical,
  type RankedList,
} from '../../../src/integration/rag/sparse-retriever.js';

// STUB-Q7MRD6 — genre-feature-extraction P1: BM25/lexical hybrid fusion.
//
// The central proof: a query that names an identifier EXACTLY but is far from
// that element in embedding space is retrieved by the sparse/BM25 leg (and thus
// by hybrid fusion) even though embedding-only retrieval misses it. We control
// embeddings via a mock provider whose vectors are deliberately orthogonal to
// the lexically-matching record, so the dense leg cannot find it.

const created: string[] = [];
afterEach(async () => {
  await Promise.all(
    created.splice(0).map((p) => fs.rm(p, { recursive: true, force: true }).catch(() => {})),
  );
});

const DIM = 4;

/**
 * Mock LLM provider. Every query embeds to a FIXED vector [1,0,0,0]; records are
 * seeded with whatever vector the test chooses. This lets a test make the dense
 * leg blind to a record (orthogonal vector) while the sparse leg still finds it
 * by name.
 */
function mockProvider(queryVector: number[] = [1, 0, 0, 0]): any {
  return {
    embed: async (texts: string[]) => texts.map(() => queryVector.slice()),
  };
}

async function makeStore(records: VectorRecord[]): Promise<JsonVectorStore> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-p1-hybrid-'));
  created.push(dir);
  const store = new JsonVectorStore({ storagePath: path.join(dir, 'vectors.json'), dimension: DIM });
  await store.initialize();
  await store.upsert(records);
  return store;
}

function rec(id: string, name: string, values: number[], extra: Record<string, unknown> = {}): VectorRecord {
  return {
    id,
    values,
    metadata: {
      coderef: id,
      type: 'function',
      name,
      file: `${name}.ts`,
      line: 1,
      language: 'typescript',
      ...extra,
    },
  };
}

describe('P1 BM25 hybrid fusion — recall lever', () => {
  it('hybrid retrieves a lexically-exact record that embedding-only misses', async () => {
    // The target record `serializeFactSet` is embedded ORTHOGONAL to the query
    // vector [1,0,0,0], so cosine similarity is 0 → the dense leg never surfaces
    // it above minScore. Two decoy records sit ON the query vector so the dense
    // leg happily returns those instead.
    const store = await makeStore([
      rec('@Fn/a.ts#serializeFactSet:10', 'serializeFactSet', [-1, 0, 0, 0]),
      rec('@Fn/b.ts#decoyOne:1', 'decoyOne', [1, 0, 0, 0]),
      rec('@Fn/c.ts#decoyTwo:1', 'decoyTwo', [1, 0, 0, 0]),
    ]);

    const provider = mockProvider([1, 0, 0, 0]);
    const service = new SemanticSearchService(provider, store);

    // Embedding-only: the orthogonal record is NOT retrieved.
    const denseOnly = await service.search('serializeFactSet', { topK: 5, hybrid: false });
    const denseIds = denseOnly.results.map((r) => r.coderef);
    expect(denseIds).not.toContain('@Fn/a.ts#serializeFactSet:10');

    // Hybrid: the BM25 leg matches the exact name → fusion surfaces it.
    const hybrid = await service.search('serializeFactSet', { topK: 5, hybrid: true });
    const hybridIds = hybrid.results.map((r) => r.coderef);
    expect(hybridIds).toContain('@Fn/a.ts#serializeFactSet:10');
  });

  it('GUARD: neutering the sparse leg makes the recall win disappear', async () => {
    // Proves the test above is load-bearing on the BM25 leg specifically. If the
    // sparse retriever returns nothing, hybrid degenerates to dense-only and the
    // orthogonal record is again missed.
    const store = await makeStore([
      rec('@Fn/a.ts#serializeFactSet:10', 'serializeFactSet', [-1, 0, 0, 0]),
      rec('@Fn/b.ts#decoyOne:1', 'decoyOne', [1, 0, 0, 0]),
    ]);
    const provider = mockProvider([1, 0, 0, 0]);
    const service = new SemanticSearchService(provider, store);

    // Neuter: force SparseRetriever.search to return [] (simulate a dead leg).
    const spy = SparseRetriever.prototype.search;
    (SparseRetriever.prototype as any).search = () => [];
    try {
      const hybrid = await service.search('serializeFactSet', { topK: 5, hybrid: true });
      const ids = hybrid.results.map((r) => r.coderef);
      expect(ids).not.toContain('@Fn/a.ts#serializeFactSet:10');
    } finally {
      (SparseRetriever.prototype as any).search = spy;
    }
  });

  it('response shape is identical between hybrid and embedding-only', async () => {
    const store = await makeStore([
      rec('@Fn/a.ts#alpha:1', 'alpha', [1, 0, 0, 0]),
      rec('@Fn/b.ts#beta:1', 'beta', [0, 1, 0, 0]),
    ]);
    const service = new SemanticSearchService(mockProvider(), store);

    const dense = await service.search('alpha', { topK: 5, hybrid: false });
    const hybrid = await service.search('alpha', { topK: 5, hybrid: true });

    for (const resp of [dense, hybrid]) {
      expect(resp).toHaveProperty('query');
      expect(resp).toHaveProperty('results');
      expect(resp).toHaveProperty('totalResults');
      expect(resp).toHaveProperty('searchTimeMs');
      expect(resp).toHaveProperty('filtered');
      if (resp.results.length > 0) {
        const r = resp.results[0];
        expect(r).toHaveProperty('coderef');
        expect(r).toHaveProperty('score');
        expect(r).toHaveProperty('metadata');
      }
    }
  });

  it('hybrid respects metadata filters (sparse hits are filtered too)', async () => {
    const store = await makeStore([
      rec('@Fn/a.ts#run:1', 'run', [0, 1, 0, 0], { layer: 'service' }),
      rec('@Fn/b.ts#run:2', 'run', [0, 1, 0, 0], { layer: 'cli' }),
    ]);
    const service = new SemanticSearchService(mockProvider([1, 0, 0, 0]), store);

    const filtered = await service.search('run', {
      topK: 5,
      hybrid: true,
      filters: { layer: 'service' },
    });
    const ids = filtered.results.map((r) => r.coderef);
    expect(ids).toContain('@Fn/a.ts#run:1');
    expect(ids).not.toContain('@Fn/b.ts#run:2');
  });

  it('embedding-only path still works when hybrid disabled at construction', async () => {
    const store = await makeStore([rec('@Fn/a.ts#alpha:1', 'alpha', [1, 0, 0, 0])]);
    const service = new SemanticSearchService(mockProvider(), store, undefined, { hybrid: false });
    const resp = await service.search('alpha', { topK: 5 });
    expect(resp.results.length).toBeGreaterThan(0);
    expect(resp.results[0].coderef).toBe('@Fn/a.ts#alpha:1');
  });
});

describe('P1 sparse retriever + RRF — determinism + tokenization', () => {
  it('tokenizer splits camelCase / snake_case / kebab-case identifiers', () => {
    expect(tokenizeLexical('serializeFactSet')).toEqual(['serialize', 'fact', 'set']);
    expect(tokenizeLexical('--stale-only')).toEqual(['stale', 'only']);
    expect(tokenizeLexical('read_fact_set')).toEqual(['read', 'fact', 'set']);
    expect(tokenizeLexical('')).toEqual([]);
  });

  it('BM25 ranks the exact-name doc first', () => {
    const retriever = SparseRetriever.fromRecords([
      { id: 'x', metadata: { coderef: 'x', type: 'function', name: 'authenticateUser', file: 'a.ts', line: 1, language: 'ts' } },
      { id: 'y', metadata: { coderef: 'y', type: 'function', name: 'logout', file: 'b.ts', line: 1, language: 'ts' } },
    ]);
    const hits = retriever.search('authenticate', 5);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].id).toBe('x');
  });

  it('RRF fusion is deterministic and ties break on id', () => {
    const listA: RankedList = {
      order: ['b', 'a'],
      metaById: new Map([
        ['a', { coderef: 'a', type: 'function', name: 'a', file: 'a.ts', line: 1, language: 'ts' }],
        ['b', { coderef: 'b', type: 'function', name: 'b', file: 'b.ts', line: 1, language: 'ts' }],
      ]),
    };
    const listB: RankedList = {
      order: ['a', 'b'],
      metaById: listA.metaById,
    };
    const first = reciprocalRankFusion([listA, listB]);
    const second = reciprocalRankFusion([listA, listB]);
    expect(first.map((r) => r.id)).toEqual(second.map((r) => r.id));
    // a and b each appear at rank 0 and rank 1 across the two lists → equal
    // fused score → id tiebreak puts 'a' first.
    expect(first[0].id).toBe('a');
  });

  it('empty query yields no sparse hits', () => {
    const retriever = SparseRetriever.fromRecords([
      { id: 'x', metadata: { coderef: 'x', type: 'function', name: 'foo', file: 'a.ts', line: 1, language: 'ts' } },
    ]);
    expect(retriever.search('', 5)).toEqual([]);
  });
});

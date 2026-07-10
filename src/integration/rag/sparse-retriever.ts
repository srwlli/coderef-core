/**
 * @coderef-semantic: 1.0.0
 * @layer integration
 * @capability sparse-bm25-retriever
 * @exports SparseDoc, SparseHit, BM25Params, tokenizeLexical, SparseRetriever, reciprocalRankFusion
 * @used_by src/integration/rag/semantic-search.ts
 */

/**
 * Sparse / BM25 Retriever  (STUB-Q7MRD6 — genre-feature-extraction P1)
 *
 * The RAG retrieval path (semantic-search.ts) was embedding-only (dense) with a
 * graph-rerank layer composed on top. It had NO lexical leg — a query that names
 * an identifier exactly (`serializeFactSet`, `RRF`, `--stale-only`) but sits far
 * from the query in embedding space could be missed entirely. This module adds
 * the missing SPARSE leg: a classic BM25 index built in-process over the chunk
 * metadata that the vector store already persists (name, documentation, coderef,
 * type, layer, capability). It is fused with the dense leg via reciprocal-rank
 * fusion (RRF) BEFORE the existing graph-reranker runs.
 *
 * Design constraints honored:
 *  - Local / in-process only. No external service, no network, no cloud. The
 *    index is built from records the store already holds (same ids as the dense
 *    leg), so BM25 hits carry the identical coderef ids and metadata.
 *  - Additive. The dense + graph-rerank pipeline is untouched; this is a parallel
 *    leg fused in. Embedding-only remains reachable (hybrid=false) for A/B.
 *  - Deterministic. Tokenization + BM25 scoring + RRF are pure functions of the
 *    input; identical inputs produce identical rankings (byte-stable ordering via
 *    a stable id tiebreak).
 */

import type { CodeChunkMetadata } from '../vector/vector-store.js';

/**
 * A document the sparse index scores over. `id` is the coderef tag (same id the
 * dense leg returns). `text` is the concatenated lexical surface; `metadata` is
 * carried through so fused results can reconstruct a SearchResult without a
 * second store lookup.
 */
export interface SparseDoc {
  id: string;
  text: string;
  metadata: CodeChunkMetadata;
}

/**
 * A single BM25 hit.
 */
export interface SparseHit {
  id: string;
  score: number;
  metadata: CodeChunkMetadata;
}

/**
 * BM25 tuning parameters. Defaults are the textbook values (k1=1.5, b=0.75),
 * which behave well across corpora without tuning.
 */
export interface BM25Params {
  /** Term-frequency saturation. Higher = TF matters more. Default 1.5. */
  k1?: number;
  /** Length normalization. 0 = none, 1 = full. Default 0.75. */
  b?: number;
}

/**
 * Identifier-aware lexical tokenizer.
 *
 * Splits on non-alphanumerics AND on camelCase / PascalCase boundaries, then
 * lowercases, so a query token `authenticate` matches an identifier
 * `authenticateUser` and `stale` matches `--stale-only`. snake_case and
 * kebab-case fall out of the non-alphanumeric split. Pure + deterministic.
 */
export function tokenizeLexical(text: string): string[] {
  if (!text) return [];
  const tokens: string[] = [];
  // Split on any run of non-alphanumeric characters first.
  for (const raw of text.split(/[^A-Za-z0-9]+/)) {
    if (!raw) continue;
    // Further split camelCase / PascalCase / digit boundaries.
    const parts = raw
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Za-z])([0-9])/g, '$1 $2')
      .replace(/([0-9])([A-Za-z])/g, '$1 $2')
      .split(/\s+/);
    for (const p of parts) {
      const t = p.toLowerCase();
      if (t.length > 0) tokens.push(t);
    }
  }
  return tokens;
}

/**
 * Build the lexical text surface for a chunk from the metadata the store holds.
 * Weighting via repetition: the element `name` is the strongest lexical signal
 * (an exact-name query should win), so it is emitted a few extra times; the
 * coderef tag and type/layer/capability facets are lower-weight context.
 */
export function lexicalSurface(meta: CodeChunkMetadata): string {
  const parts: string[] = [];
  if (meta.name) {
    // Name is the primary lexical anchor — weight it up.
    parts.push(meta.name, meta.name, meta.name);
  }
  if (meta.coderef) parts.push(meta.coderef);
  if (meta.type) parts.push(meta.type);
  if (meta.layer) parts.push(meta.layer);
  if (meta.capability) parts.push(meta.capability);
  if (meta.file) parts.push(meta.file);
  if (meta.documentation) parts.push(meta.documentation);
  return parts.join(' ');
}

/**
 * In-process BM25 index. Build once per search (cheap for the ~few-thousand
 * chunk corpora this store targets), then `search(query, topK)`.
 */
export class SparseRetriever {
  private docs: SparseDoc[] = [];
  /** postings: term -> array of {docIndex, tf} */
  private postings = new Map<string, Array<{ i: number; tf: number }>>();
  private docLengths: number[] = [];
  private avgDocLength = 0;
  /** document frequency per term */
  private df = new Map<string, number>();
  private readonly k1: number;
  private readonly b: number;

  constructor(docs: SparseDoc[], params?: BM25Params) {
    this.k1 = params?.k1 ?? 1.5;
    this.b = params?.b ?? 0.75;
    this.docs = docs;
    this.build();
  }

  /**
   * Convenience: build a retriever directly from vector-store records (id +
   * metadata), deriving each doc's lexical surface. This is the path
   * semantic-search.ts uses.
   */
  static fromRecords(
    records: Array<{ id: string; metadata: CodeChunkMetadata }>,
    params?: BM25Params
  ): SparseRetriever {
    const docs: SparseDoc[] = records.map((r) => ({
      id: r.id,
      metadata: r.metadata,
      text: lexicalSurface(r.metadata),
    }));
    return new SparseRetriever(docs, params);
  }

  private build(): void {
    let totalLen = 0;
    for (let i = 0; i < this.docs.length; i++) {
      const tokens = tokenizeLexical(this.docs[i].text);
      this.docLengths[i] = tokens.length;
      totalLen += tokens.length;

      // term frequency within this doc
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);

      for (const [term, count] of tf) {
        let plist = this.postings.get(term);
        if (!plist) {
          plist = [];
          this.postings.set(term, plist);
        }
        plist.push({ i, tf: count });
        this.df.set(term, (this.df.get(term) ?? 0) + 1);
      }
    }
    this.avgDocLength = this.docs.length > 0 ? totalLen / this.docs.length : 0;
  }

  /** Number of indexed documents. */
  get size(): number {
    return this.docs.length;
  }

  /**
   * Score all docs matching any query term via BM25; return the top-K by score.
   * Ties break on doc id (ascending) for deterministic ordering. Docs with zero
   * matching terms are not returned (BM25 gives them score 0).
   */
  search(query: string, topK = 10): SparseHit[] {
    if (this.docs.length === 0) return [];
    const qTerms = tokenizeLexical(query);
    if (qTerms.length === 0) return [];

    const N = this.docs.length;
    const scores = new Map<number, number>();

    // Deduplicate query terms — a repeated query term should not double-count IDF.
    for (const term of new Set(qTerms)) {
      const plist = this.postings.get(term);
      if (!plist) continue;
      const df = this.df.get(term) ?? plist.length;
      // BM25 IDF with the standard +0.5 smoothing (always positive via the +1).
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      for (const { i, tf } of plist) {
        const dl = this.docLengths[i] || 0;
        const denom = tf + this.k1 * (1 - this.b + (this.b * dl) / (this.avgDocLength || 1));
        const contribution = idf * ((tf * (this.k1 + 1)) / (denom || 1));
        scores.set(i, (scores.get(i) ?? 0) + contribution);
      }
    }

    const hits: SparseHit[] = [];
    for (const [i, score] of scores) {
      hits.push({ id: this.docs[i].id, score, metadata: this.docs[i].metadata });
    }
    // Sort by score desc, tiebreak by id asc for determinism.
    hits.sort((a, b) => (b.score - a.score) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return hits.slice(0, topK);
  }
}

/**
 * A ranked list for fusion: ordered ids (rank 0 = best), with the metadata
 * needed to reconstruct results, keyed by id.
 */
export interface RankedList {
  /** ids in rank order (best first) */
  order: string[];
  /** id -> metadata (union of both legs) */
  metaById: Map<string, CodeChunkMetadata>;
  /** id -> raw leg score (for reporting / debug) */
  scoreById?: Map<string, number>;
}

/**
 * Reciprocal-Rank Fusion. Combines N ranked lists into one, scoring each id by
 * sum over lists of 1/(rrfK + rank). `rrfK` (default 60, the standard TREC
 * value) damps the contribution of low-ranked items. Pure + deterministic:
 * ties break on id.
 *
 * Returns fused ids in descending fused-score order, plus the per-id fused
 * score and merged metadata, so the caller can rebuild SearchResults without a
 * store round-trip.
 */
export function reciprocalRankFusion(
  lists: RankedList[],
  opts?: { rrfK?: number; topK?: number }
): Array<{ id: string; score: number; metadata: CodeChunkMetadata }> {
  const rrfK = opts?.rrfK ?? 60;
  const fused = new Map<string, number>();
  const meta = new Map<string, CodeChunkMetadata>();

  for (const list of lists) {
    for (let rank = 0; rank < list.order.length; rank++) {
      const id = list.order[rank];
      fused.set(id, (fused.get(id) ?? 0) + 1 / (rrfK + rank));
      if (!meta.has(id)) {
        const m = list.metaById.get(id);
        if (m) meta.set(id, m);
      }
    }
  }

  const out = Array.from(fused.entries())
    .map(([id, score]) => ({ id, score, metadata: meta.get(id) as CodeChunkMetadata }))
    .filter((r) => r.metadata !== undefined);

  out.sort((a, b) => (b.score - a.score) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const topK = opts?.topK;
  return topK !== undefined ? out.slice(0, topK) : out;
}

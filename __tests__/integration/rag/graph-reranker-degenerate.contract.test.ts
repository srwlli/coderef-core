/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability graph-reranker-degenerate-input-contract
 */

/**
 * Degenerate-input contract for
 * WO-ELEMENTEXTRACTOR-REVISITS-RUST-IMPL-AND-JAVA-OR-C-001 phase 5
 * (TKT-G8GWG0 / STUB-T7RJJT).
 *
 * Two divisions by zero in rerank():
 *   - weights are normalized by their sum, which can be zero;
 *   - the boost factor is `rerankedScore / result.score`, and result.score can
 *     be zero.
 *
 * The ticket calls this "emits non-finite scores". The measured damage is
 * worse than that phrasing suggests, and it is an ORDERING bug: rerank() ends
 * with `sort((a,b) => b.rerankedScore - a.rerankedScore)`, and a NaN
 * comparator result makes the sort implementation-defined. Measured at HEAD, a
 * result the semantic layer scored 0 came back ranked ABOVE a result it scored
 * 0.5. One degenerate document silently reorders the whole answer.
 *
 * The n/0 branch is quieter but not better: it produced boostFactor 2.0 after
 * the maxBoost cap, i.e. the result claimed it had been doubled while its
 * score never left zero.
 *
 * Why the existing suite missed all of this: its all-weights-zero case
 * (graph-reranker.test.ts:159) leaves semanticWeight at its 0.2 default, so
 * the sum is 0.2 and the division never degenerates. And its assertion is
 * `expect(reranked[0].rerankedScore).toEqual(reranked[1].rerankedScore)`,
 * which passes for NaN === NaN under vitest's Object.is semantics — so even a
 * fully-NaN result set would have satisfied it.
 */

import { describe, expect, it } from 'vitest';
import { GraphReRanker } from '../../../src/integration/rag/graph-reranker.js';

function mk(id: string, score: number, metadata: Record<string, unknown> = {}) {
  return { id, score, content: 'x', metadata: { coderef: id, ...metadata } } as never;
}

/** A ranker with a graph attached, so rerank() takes the real path. */
function ranker() {
  const r = new GraphReRanker();
  (r as never as { index: unknown }).index = { dependentsByTarget: new Map(), nodeCount: 1 };
  return r;
}

const ZERO_WEIGHTS = {
  dependencyWeight: 0, dependentWeight: 0, coverageWeight: 0,
  complexityWeight: 0, semanticWeight: 0,
};

describe('GraphReRanker degenerate inputs (TKT-G8GWG0)', () => {
  it('a zero-score result does NOT outrank a real match', () => {
    // The assertion that matters. At HEAD the zero-score result came FIRST,
    // because its NaN score made the sort comparator meaningless.
    const out = ranker().rerank([mk('zero', 0), mk('real', 0.5)]);

    expect(out.map(r => r.id)).toEqual(['real', 'zero']);
    expect(out[1].rerankedScore).toBe(0);
  });

  it('every numeric field stays finite for a zero-score result', () => {
    const out = ranker().rerank([mk('zero', 0)]);

    for (const field of ['score', 'rerankedScore', 'boostFactor'] as const) {
      expect(Number.isFinite(out[0][field]), `${field} was ${out[0][field]} at HEAD`).toBe(true);
    }
    // No boost, and honest about it — not the fictional 2.0 the maxBoost cap
    // produced from Infinity.
    expect(out[0].boostFactor).toBe(1);
  });

  it('a zero score WITH graph metadata does not claim a 2x boost', () => {
    // This is the n/0 -> Infinity -> capped-to-maxBoost branch. It never went
    // non-finite, so it would survive a naive isFinite-only fix, yet it
    // reported boostFactor 2.0 for a result whose score never moved.
    const out = ranker().rerank([mk('zero', 0, { dependentCount: 5, coverage: 80 })]);

    expect(out[0].boostFactor).toBe(1);
    expect(out[0].rerankedScore).toBe(0);
  });

  it('weights summing to zero are REJECTED, not silently normalized', () => {
    expect(() => ranker().rerank([mk('a', 0.5)], ZERO_WEIGHTS))
      .toThrow(/weights must sum to a positive finite number/);
  });

  it('weights that merely SUM to zero are rejected too', () => {
    // Not the all-zero case the ticket describes; equally broken at HEAD.
    expect(() => ranker().rerank([mk('a', 0.5)], {
      ...ZERO_WEIGHTS, dependencyWeight: 1, dependentWeight: -1,
    })).toThrow(/weights must sum to a positive finite number/);
  });

  it('ordinary input is untouched — the guards are not a behaviour change', () => {
    const out = ranker().rerank([mk('lo', 0.3), mk('hi', 0.9)]);

    expect(out.map(r => r.id)).toEqual(['hi', 'lo']);
    for (const r of out) {
      expect(Number.isFinite(r.rerankedScore)).toBe(true);
      expect(Number.isFinite(r.boostFactor)).toBe(true);
      expect(r.rerankedScore).toBeGreaterThan(0);
    }
  });

  it('the default weight set still sums positive, so defaults never throw', () => {
    expect(() => ranker().rerank([mk('a', 0.5)])).not.toThrow();
  });
});

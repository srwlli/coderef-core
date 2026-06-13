/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability rag-eval-scoring-test
 */

import { describe, expect, it } from 'vitest';
import { computeMetrics, rankOfFirstHit } from '../src/cli/rag-eval.js';

describe('rankOfFirstHit', () => {
  it('finds the first expected file, 1-based, collapsing duplicate files', () => {
    const files = ['src/a.ts', 'src/a.ts', 'src/b.ts', 'src/target.ts'];
    expect(rankOfFirstHit(files, ['src/target.ts'])).toBe(3); // a, b, target
  });

  it('tolerates absolute and backslash result paths', () => {
    const files = ['C:\\repo\\src\\x.ts', '/abs/repo/src/target.ts'];
    expect(rankOfFirstHit(files, ['src/target.ts'])).toBe(2);
  });

  it('returns null on a miss', () => {
    expect(rankOfFirstHit(['src/a.ts', 'src/b.ts'], ['src/zzz.ts'])).toBeNull();
  });

  it('any of several expected files counts', () => {
    expect(rankOfFirstHit(['src/alt.ts'], ['src/main.ts', 'src/alt.ts'])).toBe(1);
  });
});

describe('computeMetrics', () => {
  it('aggregates hit@1, hit@5, and MRR over ranks', () => {
    // ranks: 1 (hit1+hit5, rr 1), 3 (hit5, rr 1/3), null (miss, rr 0)
    const m = computeMetrics([1, 3, null]);
    expect(m.queries).toBe(3);
    expect(m.hit_at_1).toBe(Math.round((1 / 3) * 1000) / 1000);
    expect(m.hit_at_5).toBe(Math.round((2 / 3) * 1000) / 1000);
    expect(m.mrr).toBe(Math.round(((1 + 1 / 3 + 0) / 3) * 1000) / 1000);
  });

  it('rank 6 counts for MRR but not hit@5', () => {
    const m = computeMetrics([6]);
    expect(m.hit_at_5).toBe(0);
    expect(m.mrr).toBe(Math.round((1 / 6) * 1000) / 1000);
  });

  it('empty input is all zeros', () => {
    expect(computeMetrics([])).toEqual({ queries: 0, hit_at_1: 0, hit_at_5: 0, mrr: 0 });
  });
});

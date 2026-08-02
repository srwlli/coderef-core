/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability diagnostic-metric-finiteness-contract
 */

/**
 * Contract tests for WO-ELEMENTEXTRACTOR-REVISITS-RUST-IMPL-AND-JAVA-OR-C-001
 * phase 7 (TKT-XQEZW6 / STUB-V0HQ5J).
 *
 * TWO diagnostics that reported numbers nobody could act on.
 *
 * (1) QueryEngine.complex() TIMED NOTHING. `const start = Date.now()` sat on
 *     the line immediately before `Date.now() - start`, AFTER every filter had
 *     already run. The two calls were adjacent, so the method structurally
 *     reported ~0 however much work it did — MEASURED, 31ms of real filtering
 *     over 20,000 records reported as 0. This is not "timing starts a bit late";
 *     the timer never spanned any work at all.
 *
 *     Every other query path is timed correctly, because they all route through
 *     executeQuery(), which takes `start` BEFORE invoking queryFn. complex() is
 *     the only public query that does not, and it is the only one that drifted.
 *
 * (2) analyzeAnswer().processingEfficiency DIVIDED BY ZERO. MEASURED at HEAD:
 *     totalTokens=100 / processingTimeMs=0 -> Infinity; 0/0 -> NaN. Both on a
 *     field whose declared type is `number`.
 *
 *     The consequence the ticket does not state is the serialization one:
 *     JSON.stringify(Infinity) and JSON.stringify(NaN) are both `null`. A
 *     consumer reading this diagnostic out of an MCP response or a written
 *     report gets null where the type promised a number, and nothing raises.
 *     That is asserted directly below, because it is the form the damage
 *     actually takes.
 *
 * Why the existing suite missed both: indexer.test.ts:559 exercises complex()
 * but asserts only `expect(result.count).toBeGreaterThanOrEqual(0)` — true of
 * every possible result, and it never looks at execution_time_ms.
 * analyzeAnswer had no degenerate-input coverage at all.
 */

import { describe, expect, it } from 'vitest';
import {
  createIndexStore,
  createMetadataIndex,
  createRelationshipIndex,
  createQueryEngine,
} from '../src/indexer/index.js';
import { AnswerGenerationService } from '../src/integration/rag/answer-generation-service.js';

function seed(n: number) {
  const store = createIndexStore();
  const metadataIndex = createMetadataIndex();
  const relationshipIndex = createRelationshipIndex();
  for (let i = 0; i < n; i++) {
    const record = store.addReference({
      raw: `@F/mod${i % 50}/file${i}.ts#el${i}`,
      type: 'F',
      path: `mod${i % 50}/file${i}.ts`,
      element: `el${i}`,
      metadata: { status: i % 2 ? 'active' : 'deprecated' },
    } as never);
    metadataIndex.indexReference(record);
    relationshipIndex.indexRecord(record);
  }
  return { store, queryEngine: createQueryEngine(store, metadataIndex, relationshipIndex) };
}

/** Burn a known amount of wall-clock inside the filter predicate. */
function slowPredicate(ms: number) {
  let done = false;
  return () => {
    if (!done) {
      const until = Date.now() + ms;
      while (Date.now() < until) { /* spin */ }
      done = true;
    }
    return true;
  };
}

describe('QueryEngine.complex() execution timing (phase 7)', () => {
  it('(a) reports time that INCLUDES the filtering work', () => {
    const { queryEngine } = seed(500);
    const result = queryEngine.complex({ type: 'F', filter: slowPredicate(40) as never });

    // At HEAD this was 0 — the timer began after all filtering had finished.
    // The defect-defining assertion: the reported time must have actually
    // spanned the 40ms the predicate spent.
    expect(result.execution_time_ms, 'was 0 before the fix').toBeGreaterThanOrEqual(30);
  });

  it('(b) reported time is bounded by real wall-clock — not inflated', () => {
    const { queryEngine } = seed(500);
    const wallStart = Date.now();
    const result = queryEngine.complex({ type: 'F', filter: slowPredicate(40) as never });
    const wall = Date.now() - wallStart;

    // Guards the fix from overcorrecting: it must measure this call, not
    // accumulate across calls or start from some earlier epoch.
    expect(result.execution_time_ms).toBeLessThanOrEqual(wall + 5);
  });

  it('(c) a trivial complex() still reports a sane, finite, non-negative time', () => {
    const { queryEngine } = seed(20);
    const result = queryEngine.complex({ type: 'F' });

    expect(Number.isFinite(result.execution_time_ms)).toBe(true);
    expect(result.execution_time_ms).toBeGreaterThanOrEqual(0);
    expect(result.execution_time_ms).toBeLessThan(5_000);
  });

  it('(d) complex() still returns the right RESULTS — timing fix changed nothing else', () => {
    const { queryEngine } = seed(100);
    const all = queryEngine.complex({ type: 'F' });
    const filtered = queryEngine.complex({
      type: 'F',
      metadata: [{ category: 'status', value: 'active' }],
    });

    expect(all.count).toBe(100);
    expect(filtered.count).toBeGreaterThan(0);
    expect(filtered.count).toBeLessThan(all.count);
    expect(filtered.from_cache).toBe(false);
  });
});

describe('analyzeAnswer().processingEfficiency degenerate inputs (phase 7)', () => {
  const svc = Object.create(AnswerGenerationService.prototype) as AnswerGenerationService;

  const answer = (totalTokens: number, processingTimeMs: number) => ({
    answer: 'x'.repeat(200),
    sources: [],
    relatedQuestions: [],
    tokenUsage: { totalTokens, promptTokens: 10, completionTokens: 10 },
    processingTimeMs,
    confidence: 0.5,
  }) as never;

  it('(e) tokens over ZERO milliseconds no longer yields Infinity', () => {
    const m = svc.analyzeAnswer(answer(100, 0));
    expect(m.processingEfficiency, 'was Infinity at HEAD').toBe(100);
    expect(Number.isFinite(m.processingEfficiency)).toBe(true);
  });

  it('(f) zero tokens over zero milliseconds no longer yields NaN', () => {
    const m = svc.analyzeAnswer(answer(0, 0));
    expect(m.processingEfficiency, 'was NaN at HEAD').toBe(0);
    expect(Number.isFinite(m.processingEfficiency)).toBe(true);
  });

  it('(g) the metric SURVIVES JSON serialization as a number', () => {
    // The consequence that actually bites: JSON.stringify(Infinity) and
    // JSON.stringify(NaN) are both `null`, so a consumer reading this out of an
    // MCP response or a report file silently got null where the type says
    // number. Both degenerate shapes at HEAD serialized to null.
    for (const [tokens, ms] of [[100, 0], [0, 0], [100, 50]] as Array<[number, number]>) {
      const m = svc.analyzeAnswer(answer(tokens, ms));
      const round = JSON.parse(JSON.stringify({ e: m.processingEfficiency }));
      expect(round.e, `tokens=${tokens} ms=${ms} serialized to null`).not.toBeNull();
      expect(typeof round.e).toBe('number');
    }
  });

  it('(h) a negative processing time cannot flip the metric negative', () => {
    // Not in the ticket. A clock adjustment mid-request can make an elapsed
    // time negative, which would have reported a negative "efficiency".
    const m = svc.analyzeAnswer(answer(100, -5));
    expect(m.processingEfficiency).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(m.processingEfficiency)).toBe(true);
  });

  it('(i) HEALTHY inputs are arithmetically unchanged', () => {
    // The guard must not perturb the normal case: 100 tokens in 50ms is 2/ms,
    // exactly as before.
    expect(svc.analyzeAnswer(answer(100, 50)).processingEfficiency).toBe(2);
    expect(svc.analyzeAnswer(answer(3000, 1500)).processingEfficiency).toBe(2);
  });

  it('(j) the other analyzeAnswer fields are untouched', () => {
    const m = svc.analyzeAnswer(answer(100, 0));
    expect(m.answerLength).toBe(200);
    expect(m.codeRefCount).toBe(0);
    expect(m.hasCodeRefs).toBe(false);
    expect(m.avgSourceRelevance).toBe(0);
  });
});

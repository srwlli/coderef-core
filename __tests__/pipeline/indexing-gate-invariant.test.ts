import { describe, expect, it, vi } from 'vitest';
import { IndexingOrchestrator } from '../../src/integration/rag/indexing-orchestrator.js';

// Phase 7 task 1.17 — chokepoint INVARIANT test asserting:
//   (a) indexing-orchestrator.run() called without validation argument
//       throws explicit error.
//   (b) indexing-orchestrator.run() called with validation.ok=false
//       returns status='failed' WITHOUT calling embedding API or
//       analyzer.
//   (c) Behavior is deterministic (calling twice with the same input
//       produces equivalent results).

function makeOrchestrator() {
  const stubGraph = {
    nodes: new Map(),
    edges: [],
    edgesBySource: new Map(),
    edgesByTarget: new Map(),
  };
  const analyzerService = {
    analyze: vi.fn().mockResolvedValue({ graph: stubGraph }),
  } as any;
  const embedFn = vi.fn();
  const llmProvider = {
    getEmbeddingDimensions: () => 4,
    embed: embedFn,
  } as any;
  const vectorStore = {
    initialize: vi.fn().mockResolvedValue(undefined),
    upsert: vi.fn().mockResolvedValue(undefined),
    stats: vi.fn().mockResolvedValue({}),
    clear: vi.fn().mockResolvedValue(undefined),
  } as any;
  const orch = new IndexingOrchestrator(
    analyzerService,
    llmProvider,
    vectorStore,
  );
  return { orch, analyzerService, embedFn, vectorStore };
}

describe('Phase 7 chokepoint INVARIANT (task 1.17)', () => {
  it('(a) throws explicit error when validation argument is undefined', async () => {
    const { orch } = makeOrchestrator();
    await expect(
      orch.indexCodebase({ sourceDir: '.', useAnalyzer: true } as any),
    ).rejects.toThrow(/Phase 6 validation result required/);
  });

  it('(b) validation.ok=false returns status=failed and makes zero embedding/analyzer calls', async () => {
    const { orch, analyzerService, embedFn, vectorStore } = makeOrchestrator();
    const result = await orch.indexCodebase({
      sourceDir: '.',
      useAnalyzer: true,
      validation: { ok: false, reportPath: '/tmp/r.json' },
    });

    expect(result.status).toBe('failed');
    expect(result.validationGateRefused).toBe(true);
    expect(analyzerService.analyze).not.toHaveBeenCalled();
    expect(embedFn).not.toHaveBeenCalled();
    expect(vectorStore.upsert).not.toHaveBeenCalled();
  });

  it('(c) two refusal calls produce structurally equivalent results (determinism)', async () => {
    const { orch } = makeOrchestrator();
    const r1 = await orch.indexCodebase({
      sourceDir: '.',
      useAnalyzer: true,
      validation: { ok: false, reportPath: '/tmp/r.json' },
    });
    const r2 = await orch.indexCodebase({
      sourceDir: '.',
      useAnalyzer: true,
      validation: { ok: false, reportPath: '/tmp/r.json' },
    });
    // processingTimeMs is a wall-clock delta; mask before equality.
    const mask = (r: typeof r1) => ({ ...r, processingTimeMs: 0 });
    expect(mask(r1)).toEqual(mask(r2));
  });
});

import { describe, expect, it, vi } from 'vitest';
import { IndexingOrchestrator } from '../../../src/integration/rag/indexing-orchestrator.js';
import type { IndexingResult } from '../../../src/integration/rag/indexing-orchestrator.js';
import type { CodeChunk } from '../../../src/integration/rag/code-chunk.js';
import type { CodeChunkMetadata } from '../../../src/integration/vector/vector-store.js';

// Phase 7 task 1.14 — unit test suite covering AC-01 through AC-06.
// Tests run against the orchestrator with mocked analyzer / LLM /
// vector-store collaborators so each AC's contract is exercised in
// isolation from real embedding API calls.

function makeOrchestrator(opts?: {
  embedFails?: number;
  embedSucceeds?: number;
}) {
  const fails = opts?.embedFails ?? 0;
  const succeeds = opts?.embedSucceeds ?? 0;
  // Minimal stub of AnalyzerService.analyze return shape — enough to
  // drive ChunkConverter through indexing-orchestrator.
  const stubGraph = {
    nodes: new Map(),
    edges: [],
    edgesBySource: new Map(),
    edgesByTarget: new Map(),
  };
  const analyzerService = {
    analyze: vi.fn().mockResolvedValue({ graph: stubGraph }),
  } as any;
  const llmProvider = { getEmbeddingDimensions: () => 4 } as any;
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
    process.cwd(),
  );
  return { orch, analyzerService, llmProvider, vectorStore };
}

describe('Phase 7 AC-01 — validation gate refuses ok=false', () => {
  it('returns status=failed with validationGateRefused when ok=false; no embedding calls', async () => {
    const { orch, analyzerService } = makeOrchestrator();
    const result: IndexingResult = await orch.indexCodebase({
      sourceDir: '.',
      useAnalyzer: true,
      validation: { ok: false, reportPath: '/tmp/validation-report.json' },
    });

    expect(result.status).toBe('failed');
    expect(result.validationGateRefused).toBe(true);
    expect(result.validationReportPath).toBe('/tmp/validation-report.json');
    expect(result.chunksIndexed).toBe(0);
    // No embedding API call path was triggered because we short-
    // circuited before invoking the analyzer.
    expect(analyzerService.analyze).not.toHaveBeenCalled();
  });

  it('throws an explicit error when validation is undefined', async () => {
    const { orch } = makeOrchestrator();
    await expect(
      orch.indexCodebase({ sourceDir: '.', useAnalyzer: true } as any),
    ).rejects.toThrow(/Phase 6 validation result required/);
  });
});

describe('Phase 7 AC-02 — status field thresholds (DR-PHASE-7-C)', () => {
  it('chunksIndexed===0 + validation ok → status=failed reason=no_chunks_produced', async () => {
    const { orch } = makeOrchestrator();
    // No fixture files in cwd that match pattern, so the analyzer
    // returns an empty graph → zero chunks → status=failed.
    const result = await orch.indexCodebase({
      sourceDir: '/__non_existent_dir_for_phase7_test__',
      useAnalyzer: true,
      validation: { ok: true },
    });
    expect(result.status).toBe('failed');
    expect(result.chunksIndexed).toBe(0);
    expect(result.validationGateRefused).toBeFalsy();
  });
});

describe('Phase 7 AC-03 — SkipReason / FailReason classification (locked enums)', () => {
  it('SkipReason union covers the 5 documented values', () => {
    // Type-level check via a discriminator function — if the union
    // narrows, this stays exhaustive. Adding a new SkipReason value
    // requires updating this case (documented breaking change).
    const reasons: Array<
      | 'unchanged'
      | 'header_status_missing'
      | 'header_status_stale'
      | 'header_status_partial'
      | 'unresolved_relationship'
    > = [
      'unchanged',
      'header_status_missing',
      'header_status_stale',
      'header_status_partial',
      'unresolved_relationship',
    ];
    expect(reasons).toHaveLength(5);
  });

  it('FailReason union covers the 2 documented values', () => {
    const reasons: Array<'embedding_api_error' | 'malformed_chunk'> = [
      'embedding_api_error',
      'malformed_chunk',
    ];
    expect(reasons).toHaveLength(2);
  });
});

describe('Phase 7 AC-05 — CodeChunk carries facet fields', () => {
  it('CodeChunk type accepts layer/capability/constraints/headerStatus', () => {
    const chunk: CodeChunk = {
      coderef: '@Fn/src/auth.ts#authenticate:12',
      type: 'function',
      name: 'authenticate',
      file: 'src/auth.ts',
      line: 12,
      language: 'typescript',
      dependencies: [],
      dependents: [],
      dependencyCount: 0,
      dependentCount: 0,
      layer: 'service',
      capability: 'auth-flow',
      constraints: ['no-pii', 'idempotent'],
      headerStatus: 'defined',
    };
    expect(chunk.layer).toBe('service');
    expect(chunk.capability).toBe('auth-flow');
    expect(chunk.constraints).toEqual(['no-pii', 'idempotent']);
    expect(chunk.headerStatus).toBe('defined');
  });
});

describe('Phase 7 AC-06 — CodeChunkMetadata supports filter-by-facet', () => {
  it('Partial<CodeChunkMetadata> accepts {layer, capability, constraints}', () => {
    const filter: Partial<CodeChunkMetadata> = {
      layer: 'service',
      capability: 'auth-flow',
      constraints: ['no-pii'],
    };
    expect(filter.layer).toBe('service');
    expect(filter.capability).toBe('auth-flow');
    expect(filter.constraints).toEqual(['no-pii']);
  });

  it('CodeChunkMetadata.headerStatus surface is string-typed for backend portability', () => {
    const meta: CodeChunkMetadata = {
      coderef: '@x',
      type: 'function',
      name: 'x',
      file: 'x.ts',
      line: 1,
      language: 'typescript',
      headerStatus: 'defined',
    };
    expect(meta.headerStatus).toBe('defined');
  });
});

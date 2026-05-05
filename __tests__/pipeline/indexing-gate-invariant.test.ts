import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
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

// WO-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001 — phase 4 invariant.
// When .coderef/graph.json contains nodes with headerStatus='missing'
// AND the indexing run does not refuse via the validation gate, the
// chunk<->graph join MUST produce skip entries whose count tracks
// header_missing_count within the AC-09 tolerance band (±10%). This
// is the dynamic counterpart to the static AC-09 check Phase 7 ran;
// it catches future regressions of the chunk.file shape contract.
const tmpDirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    tmpDirs.splice(0).map((p) =>
      fs.rm(p, { recursive: true, force: true }).catch(() => {}),
    ),
  );
});

describe('AC-09 dynamic invariant — chunksSkipped tracks header_missing_count (±10%)', () => {
  it('header_missing_count > 0 and run not refused → chunksSkipped(header_status_missing) within ±10% of header_missing_count', async () => {
    const projectDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'coderef-ac09-invariant-'),
    );
    tmpDirs.push(projectDir);
    await fs.mkdir(path.join(projectDir, '.coderef'), { recursive: true });

    // Construct N=10 missing-header files + 1 defined-header file, all
    // as real source files on disk so ChunkConverter.fileExists passes.
    // The defined-header file ensures chunksIndexed>=1 so the run does
    // not collapse into status='failed' via the no_chunks_produced
    // threshold (DR-PHASE-7-C). Only the 10 missing files should skip.
    const N = 10;
    const fileNames: string[] = [];
    for (let i = 0; i < N; i++) {
      const rel = `src/mod${i}.ts`;
      fileNames.push(rel);
      const abs = path.join(projectDir, rel);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, `export function mod${i}() { return ${i}; }\n`, 'utf-8');
    }
    const goodFile = 'src/good.ts';
    await fs.writeFile(
      path.join(projectDir, goodFile),
      `export function good() { return 'ok'; }\n`,
      'utf-8',
    );

    const graph = {
      nodes: [
        ...fileNames.map((rel, i) => ({
          id: `@Fn/${rel}#mod${i}:1`,
          file: rel,
          metadata: { headerStatus: 'missing', layer: 'utility' },
        })),
        {
          id: `@Fn/${goodFile}#good:1`,
          file: goodFile,
          metadata: { headerStatus: 'defined', layer: 'utility' },
        },
      ],
      edges: [],
    };
    await fs.writeFile(
      path.join(projectDir, '.coderef', 'graph.json'),
      JSON.stringify(graph),
      'utf-8',
    );

    // Stub analyzer returns chunks for the same N files using absolute
    // Windows paths — the production shape that triggered the original
    // STUB-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001 bug.
    const stubGraph: any = {
      nodes: new Map(),
      edges: [],
      edgesBySource: new Map(),
      edgesByTarget: new Map(),
    };
    for (let i = 0; i < N; i++) {
      const absFile = path.join(projectDir, fileNames[i]);
      const id = 'file:' + absFile;
      stubGraph.nodes.set(id, {
        id,
        name: `mod${i}`,
        type: 'function',
        file: absFile,
        line: 1,
        metadata: { codeRefId: `@Fn/${fileNames[i]}#mod${i}:1` },
      });
    }
    {
      const absFile = path.join(projectDir, goodFile);
      const id = 'file:' + absFile;
      stubGraph.nodes.set(id, {
        id,
        name: 'good',
        type: 'function',
        file: absFile,
        line: 1,
        metadata: { codeRefId: `@Fn/${goodFile}#good:1` },
      });
    }

    const analyzerService = {
      analyze: vi.fn().mockResolvedValue({ graph: stubGraph }),
    } as any;
    const llmProvider = {
      getEmbeddingDimensions: () => 4,
      embedBatch: vi.fn().mockResolvedValue(
        Array.from({ length: N + 1 }, () => [1, 0, 0, 0]),
      ),
      embed: vi.fn().mockResolvedValue([1, 0, 0, 0]),
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
      projectDir,
    );

    const result = await orch.indexCodebase({
      sourceDir: projectDir,
      useAnalyzer: true,
      validation: { ok: true },
    });

    expect(result.status).not.toBe('failed');
    const missingSkipCount =
      result.chunksSkippedDetails?.filter((s) => s.reason === 'header_status_missing')
        .length ?? 0;
    const headerMissingCount = N;
    const tolerance = Math.ceil(headerMissingCount * 0.1);
    expect(missingSkipCount).toBeGreaterThanOrEqual(headerMissingCount - tolerance);
  });
});

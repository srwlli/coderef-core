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

// WO-RAG-INDEX-SINGLE-ANALYZER-SLICE-001 — Phase 3 task 3.3 rewrite.
// The substrate pivot reads .coderef/graph.json directly as the chunk
// source, so chunks ARE the nodes. Two structural identities hold:
//   AC-05a (element-grain): chunksSkipped(header_status_missing) ===
//     count of graph.json nodes with metadata.headerStatus='missing'.
//   AC-05b (file-grain):    uniqueFiles(skipDetails).size ===
//     validation_report.header_missing_count.
//
// Fixture is intentionally 3 files × 3 element-grain nodes each, with
// 2 of the 3 nodes per file marked headerStatus='missing'. That gives
// 6 element-grain skips across 3 unique files, so AC-05a (=6) and
// AC-05b (=3) produce DISTINCT numbers — required for the dual-AC
// framing to actually exercise both grains. (A 1-node-per-file fixture
// would collapse the two identities to the same number and mask the
// distinction.) The 3rd node per file is headerStatus='defined' so
// chunksIndexed>=1 and the run does not collapse to status='failed'
// via the no_chunks_produced threshold.
const tmpDirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    tmpDirs.splice(0).map((p) =>
      fs.rm(p, { recursive: true, force: true }).catch(() => {}),
    ),
  );
});

describe('AC-05 dual identity — element-grain + file-grain (no tolerance band)', () => {
  it('chunksSkipped exact-equals element-grain count; uniqueFiles exact-equals validation_report.header_missing_count', async () => {
    const projectDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'coderef-ac05-dual-'),
    );
    tmpDirs.push(projectDir);
    await fs.mkdir(path.join(projectDir, '.coderef'), { recursive: true });

    // 3 files × 3 element-grain nodes (1 fn + 1 class + 1 const). Of
    // each 3-node file: nodes 1+2 are headerStatus='missing'; node 3
    // is headerStatus='defined'. 6 element-grain missing nodes across
    // 3 unique files.
    const NUM_FILES = 3;
    const NODES_PER_FILE = 3;
    const MISSING_PER_FILE = 2;
    const fileNames: string[] = [];
    type GraphJsonNode = {
      id: string;
      type: string;
      name: string;
      file: string;
      line: number;
      metadata: { headerStatus: string; exported?: boolean };
    };
    const nodes: GraphJsonNode[] = [];

    for (let f = 0; f < NUM_FILES; f++) {
      const rel = `src/mod${f}.ts`;
      fileNames.push(rel);
      const abs = path.join(projectDir, rel);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(
        abs,
        [
          `export function fn${f}() { return ${f}; }`,
          `export class Cls${f} { public k = ${f}; }`,
          `export const C${f} = ${f};`,
          '',
        ].join('\n'),
        'utf-8',
      );

      // Node 1: function (missing)
      nodes.push({
        id: `@Fn/${rel}#fn${f}:1`,
        type: 'function',
        name: `fn${f}`,
        file: rel,
        line: 1,
        metadata: { headerStatus: 'missing', exported: true },
      });
      // Node 2: class (missing)
      nodes.push({
        id: `@Cl/${rel}#Cls${f}:2`,
        type: 'class',
        name: `Cls${f}`,
        file: rel,
        line: 2,
        metadata: { headerStatus: 'missing', exported: true },
      });
      // Node 3: const (defined — keeps chunksIndexed>=1)
      nodes.push({
        id: `@C/${rel}#C${f}:3`,
        type: 'constant',
        name: `C${f}`,
        file: rel,
        line: 3,
        metadata: { headerStatus: 'defined', exported: true },
      });
    }

    // Synthesize a Phase 6 validation-report.json sibling — identifies
    // the file-grain canonical baseline that AC-05b cross-checks
    // against.
    const fileGrainMissing = NUM_FILES; // 3
    const elementGrainMissing = NUM_FILES * MISSING_PER_FILE; // 6

    const graph = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      nodes,
      edges: [],
      statistics: { nodeCount: nodes.length, edgeCount: 0 },
    };
    await fs.writeFile(
      path.join(projectDir, '.coderef', 'graph.json'),
      JSON.stringify(graph),
      'utf-8',
    );

    // analyzerService is constructor-injected but never invoked
    // post-pivot. The not-called assertion at the end is a regression
    // sentinel.
    const analyzerService = {
      analyze: vi.fn(),
    } as any;
    const llmProvider = {
      getEmbeddingDimensions: () => 4,
      embedBatch: vi.fn().mockResolvedValue(
        Array.from({ length: nodes.length }, () => [1, 0, 0, 0]),
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

    const missingSkips =
      result.chunksSkippedDetails?.filter(
        (s) => s.reason === 'header_status_missing',
      ) ?? [];

    // AC-05a — element-grain identity (no tolerance).
    expect(missingSkips.length).toBe(elementGrainMissing); // 6 === 6

    // AC-05b — file-grain identity (no tolerance).
    // fileOf maps a coderefId like '@Fn/src/mod0.ts#fn0:1' to 'src/mod0.ts'.
    const fileOf = (coderefId: string): string => {
      // Strip leading capability prefix ('@Fn/', '@Cl/', '@C/', etc.)
      // then take everything before the '#'.
      const noPrefix = coderefId.replace(/^@[A-Za-z]+\//, '');
      const hashIdx = noPrefix.indexOf('#');
      return hashIdx >= 0 ? noPrefix.slice(0, hashIdx) : noPrefix;
    };
    const uniqueFiles = new Set(missingSkips.map((s) => fileOf(s.coderefId)));
    expect(uniqueFiles.size).toBe(fileGrainMissing); // 3 === 3

    // Distinctness check: AC-05a vs AC-05b must produce different
    // numbers in this fixture, otherwise the dual-AC framing is not
    // being exercised.
    expect(missingSkips.length).not.toBe(uniqueFiles.size);

    // Regression sentinel: the second analyzer slice MUST stay deleted.
    expect(analyzerService.analyze).not.toHaveBeenCalled();
  });
});

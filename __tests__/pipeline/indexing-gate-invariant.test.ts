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
  const orch = new IndexingOrchestrator(llmProvider, vectorStore);
  return { orch, embedFn, vectorStore };
}

describe('Phase 7 chokepoint INVARIANT (task 1.17)', () => {
  it('(a) throws explicit error when validation argument is undefined', async () => {
    const { orch } = makeOrchestrator();
    await expect(
      orch.indexCodebase({ sourceDir: '.', useAnalyzer: true } as any),
    ).rejects.toThrow(/Phase 6 validation result required/);
  });

  it('(b) validation.ok=false returns status=failed and makes zero embedding calls', async () => {
    const { orch, embedFn, vectorStore } = makeOrchestrator();
    const result = await orch.indexCodebase({
      sourceDir: '.',
      useAnalyzer: true,
      validation: { ok: false, reportPath: '/tmp/r.json' },
    });

    expect(result.status).toBe('failed');
    expect(result.validationGateRefused).toBe(true);
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

// WO-RAG-INDEX-FROZEN-FIXTURE-DUAL-AC-INVARIANTS-001 — Phase 2 refactor.
// The dual-AC fixture was previously built procedurally inside this
// describe block. It now lives on disk as a frozen artifact at
// src/integration/rag/__tests__/fixtures/dual-ac-frozen/. The test
// loads the fixture, computes expected counts FROM the loaded input
// (not from runtime output, not from hardcoded literals), and asserts
// production output matches. This is the anti-tautology guard
// (DR-FROZEN-C): independent paths from input to expected and input
// to actual.
//
// AC-05a (element-grain): chunksSkipped(header_status_missing) ===
//   count of graph.json nodes with metadata.headerStatus='missing'.
// AC-05b (file-grain):    uniqueFiles(skipDetails).size ===
//   validation_report.header_missing_count.
const tmpDirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    tmpDirs.splice(0).map((p) =>
      fs.rm(p, { recursive: true, force: true }).catch(() => {}),
    ),
  );
});

const FROZEN_FIXTURE_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  'src',
  'integration',
  'rag',
  '__tests__',
  'fixtures',
  'dual-ac-frozen',
);

async function copyDir(src: string, dst: string): Promise<void> {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      await copyDir(s, d);
    } else {
      await fs.copyFile(s, d);
    }
  }
}

describe('AC-05 dual identity — element-grain + file-grain (frozen fixture)', () => {
  it('chunksSkipped exact-equals element-grain count; uniqueFiles exact-equals validation_report.header_missing_count', async () => {
    const projectDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'coderef-ac05-frozen-'),
    );
    tmpDirs.push(projectDir);

    // Stage the frozen fixture into the tmpdir. Copy src files to
    // projectDir/src and graph.json to projectDir/.coderef/graph.json
    // so the orchestrator finds them at the expected paths.
    await copyDir(
      path.join(FROZEN_FIXTURE_DIR, 'src'),
      path.join(projectDir, 'src'),
    );
    await fs.mkdir(path.join(projectDir, '.coderef'), { recursive: true });
    const graphPath = path.join(projectDir, '.coderef', 'graph.json');
    await fs.copyFile(
      path.join(FROZEN_FIXTURE_DIR, 'graph.json'),
      graphPath,
    );

    // Stamp graph.json mtime to NOW so the orchestrator's staleness
    // check (graph mtime must be >= every source mtime) passes. Copy
    // operations on Windows can leave graph mtime slightly behind
    // freshly-copied source files.
    const now = new Date();
    await fs.utimes(graphPath, now, now);

    // Anti-tautology guard (DR-FROZEN-C): compute expected counts by
    // inspecting the loaded graph.json INPUT, not from runtime output
    // and not from hardcoded literals. If a future fixture drift
    // changes the shape, expected and actual re-derive independently.
    const graphRaw = await fs.readFile(
      path.join(projectDir, '.coderef', 'graph.json'),
      'utf-8',
    );
    const graphParsed = JSON.parse(graphRaw) as {
      nodes: Array<{ file: string; metadata?: { headerStatus?: string } }>;
    };
    const missingNodes = graphParsed.nodes.filter(
      (n) => n.metadata?.headerStatus === 'missing',
    );
    const expectedElementGrain = missingNodes.length;
    const expectedFileGrain = new Set(missingNodes.map((n) => n.file)).size;

    // Cross-check: validation-report.json's file-grain baseline must
    // match the file-grain count derived from graph.json (AC-07).
    const validationRaw = await fs.readFile(
      path.join(FROZEN_FIXTURE_DIR, 'validation-report.json'),
      'utf-8',
    );
    const validationParsed = JSON.parse(validationRaw) as {
      header_missing_count: number;
    };
    expect(validationParsed.header_missing_count).toBe(expectedFileGrain);

    const llmProvider = {
      getEmbeddingDimensions: () => 4,
      embedBatch: vi.fn().mockResolvedValue(
        Array.from({ length: graphParsed.nodes.length }, () => [1, 0, 0, 0]),
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

    // AC-05a — element-grain identity (no tolerance), expected derived
    // from input fixture (not runtime, not hardcoded).
    expect(missingSkips.length).toBe(expectedElementGrain);

    // AC-05b — file-grain identity (no tolerance), expected derived
    // from input fixture.
    const fileOf = (coderefId: string): string => {
      const noPrefix = coderefId.replace(/^@[A-Za-z]+\//, '');
      const hashIdx = noPrefix.indexOf('#');
      return hashIdx >= 0 ? noPrefix.slice(0, hashIdx) : noPrefix;
    };
    const uniqueFiles = new Set(missingSkips.map((s) => fileOf(s.coderefId)));
    expect(uniqueFiles.size).toBe(expectedFileGrain);

    // Distinctness check (DR-FROZEN-D): the two grains MUST produce
    // different numbers under this fixture, otherwise the dual-AC
    // framing collapses. Asserting the RELATIONSHIP, not specific
    // values — works for any fixture where the invariant holds.
    expect(expectedElementGrain).not.toBe(expectedFileGrain);
    expect(missingSkips.length).not.toBe(uniqueFiles.size);
  });
});

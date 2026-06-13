/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability rag-indexing-orchestrator-stale-deletions-test
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { IndexingOrchestrator } from '../../../src/integration/rag/indexing-orchestrator.js';

// STUB-81XNNM — deletion sweep at graph load. The mtime stale-check (AC-04)
// cannot see files DELETED after the last populate; they only surfaced as
// per-chunk ENOENT errors mid-run (17 of them, 9.7h into the 2026-06-12
// full-repo dogfood). The sweep surfaces staleness at minute zero via the
// additive IndexingResult.staleIndexWarning field — warn-only, never a gate.

const tmpDirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    tmpDirs.splice(0).map((p) =>
      fs.rm(p, { recursive: true, force: true }).catch(() => {}),
    ),
  );
});

function makeOrchestrator(basePath: string) {
  const llmProvider = {
    getEmbeddingDimensions: () => 4,
    embed: vi.fn().mockResolvedValue([1, 0, 0, 0]),
    embedBatch: vi.fn().mockResolvedValue([[1, 0, 0, 0]]),
  } as any;
  const vectorStore = {
    initialize: vi.fn().mockResolvedValue(undefined),
    upsert: vi.fn().mockResolvedValue(undefined),
    stats: vi.fn().mockResolvedValue({}),
    clear: vi.fn().mockResolvedValue(undefined),
  } as any;
  return new IndexingOrchestrator(llmProvider, vectorStore, basePath);
}

async function makeFixture(opts: { withGhost: boolean }): Promise<string> {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-staledel-'));
  tmpDirs.push(projectDir);
  await fs.mkdir(path.join(projectDir, '.coderef'), { recursive: true });
  await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });

  const liveRel = 'src/live.ts';
  const liveAbs = path.join(projectDir, liveRel);
  await fs.writeFile(liveAbs, 'export function live() { return 1; }\n', 'utf-8');
  const longAgo = new Date(Date.now() - 60 * 60 * 1000);
  await fs.utimes(liveAbs, longAgo, longAgo);

  const nodes = [
    { id: `@Fn/${liveRel}#live:1`, type: 'function', name: 'live', file: liveRel, line: 1, metadata: {} },
  ];
  if (opts.withGhost) {
    // ghost.ts is referenced by the graph but never written to disk —
    // simulates a file deleted after the last populate.
    nodes.push({ id: '@Fn/src/ghost.ts#gone:1', type: 'function', name: 'gone', file: 'src/ghost.ts', line: 1, metadata: {} });
  }
  const graphPath = path.join(projectDir, '.coderef', 'graph.json');
  await fs.writeFile(graphPath, JSON.stringify({ version: '1.0', nodes, edges: [] }), 'utf-8');
  // graph newer than the live source so the AC-04 mtime check passes.
  return projectDir;
}

describe('deletion sweep (STUB-81XNNM): graph files missing on disk surface at load time', () => {
  it('sets staleIndexWarning naming the missing file; run still completes (warn-only)', async () => {
    const projectDir = await makeFixture({ withGhost: true });
    const orch = makeOrchestrator(projectDir);

    const result = await orch.indexCodebase({
      sourceDir: projectDir,
      useAnalyzer: true,
      validation: { ok: true },
    });

    expect(result.staleIndexWarning, 'staleIndexWarning set').toBeDefined();
    expect(result.staleIndexWarning).toContain('ghost.ts');
    expect(result.staleIndexWarning).toContain('populate-coderef');
  });

  it('absent when every graph file exists on disk', async () => {
    const projectDir = await makeFixture({ withGhost: false });
    const orch = makeOrchestrator(projectDir);

    const result = await orch.indexCodebase({
      sourceDir: projectDir,
      useAnalyzer: true,
      validation: { ok: true },
    });

    expect(result.staleIndexWarning).toBeUndefined();
  });
});

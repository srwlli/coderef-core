import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
  IndexingOrchestrator,
  buildGraphFromExportedJson,
} from '../../../src/integration/rag/indexing-orchestrator.js';

// WO-RAG-INDEX-SINGLE-ANALYZER-SLICE-001 — phase 3 unit tests for the
// graph.json substrate pivot. Covers AC-03 (missing-graph fail loud)
// and AC-04 (stale-graph fail loud). Plus a unit fixture for the
// buildGraphFromExportedJson adapter.

const tmpDirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    tmpDirs.splice(0).map((p) =>
      fs.rm(p, { recursive: true, force: true }).catch(() => {}),
    ),
  );
});

function makeOrchestrator(basePath: string) {
  const analyzerService = { analyze: vi.fn() } as any;
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
  return new IndexingOrchestrator(
    analyzerService,
    llmProvider,
    vectorStore,
    basePath,
  );
}

describe('AC-03: missing graph.json throws explicit error', () => {
  it('indexCodebase against a directory with no .coderef/graph.json throws', async () => {
    const projectDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'coderef-ac03-'),
    );
    tmpDirs.push(projectDir);

    const orch = makeOrchestrator(projectDir);

    await expect(
      orch.indexCodebase({
        sourceDir: projectDir,
        useAnalyzer: true,
        validation: { ok: true },
      }),
    ).rejects.toThrow(/graph\.json not found/);
  });

  it('error message references `coderef populate` as the resolution', async () => {
    const projectDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'coderef-ac03b-'),
    );
    tmpDirs.push(projectDir);

    const orch = makeOrchestrator(projectDir);

    await expect(
      orch.indexCodebase({
        sourceDir: projectDir,
        useAnalyzer: true,
        validation: { ok: true },
      }),
    ).rejects.toThrow(/coderef populate/);
  });
});

describe('AC-04: stale graph.json throws explicit error', () => {
  it('source file newer than graph.json triggers fail-loud staleness error', async () => {
    const projectDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'coderef-ac04-'),
    );
    tmpDirs.push(projectDir);
    await fs.mkdir(path.join(projectDir, '.coderef'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });

    // Write the source file FIRST (older mtime)
    const srcRel = 'src/sample.ts';
    const srcAbs = path.join(projectDir, srcRel);
    await fs.writeFile(srcAbs, 'export function x() { return 1; }\n', 'utf-8');
    // Backdate source to 1 hour ago so the next steps can make it
    // unambiguously "newer than graph"
    const longAgo = new Date(Date.now() - 60 * 60 * 1000);
    await fs.utimes(srcAbs, longAgo, longAgo);

    // Write graph.json referencing that source — slightly newer mtime
    const graph = {
      version: '1.0',
      nodes: [
        {
          id: `@Fn/${srcRel}#x:1`,
          type: 'function',
          name: 'x',
          file: srcRel,
          line: 1,
          metadata: {},
        },
      ],
      edges: [],
    };
    const graphPath = path.join(projectDir, '.coderef', 'graph.json');
    await fs.writeFile(graphPath, JSON.stringify(graph), 'utf-8');
    const graphMtime = new Date(Date.now() - 30 * 60 * 1000);
    await fs.utimes(graphPath, graphMtime, graphMtime);

    // Touch the source file to NOW so its mtime > graph mtime
    const now = new Date();
    await fs.utimes(srcAbs, now, now);

    const orch = makeOrchestrator(projectDir);

    await expect(
      orch.indexCodebase({
        sourceDir: projectDir,
        useAnalyzer: true,
        validation: { ok: true },
      }),
    ).rejects.toThrow(/stale/);
  });
});

describe('buildGraphFromExportedJson adapter', () => {
  it('builds DependencyGraph with Map-keyed nodes + reverse-index Maps', () => {
    const j = {
      nodes: [
        { id: '@Fn/a.ts#f:1', type: 'function', name: 'f', file: 'a.ts', line: 1, metadata: { headerStatus: 'missing' } },
        { id: '@Fn/b.ts#g:1', type: 'function', name: 'g', file: 'b.ts', line: 1, metadata: { headerStatus: 'defined' } },
      ],
      edges: [
        { source: '@Fn/a.ts#f:1', target: '@Fn/b.ts#g:1', type: 'calls' },
      ],
    };
    const graph = buildGraphFromExportedJson(j);
    expect(graph.nodes.size).toBe(2);
    expect(graph.nodes.get('@Fn/a.ts#f:1')?.metadata?.headerStatus).toBe('missing');
    expect(graph.edges).toHaveLength(1);
    expect(graph.edgesBySource.get('@Fn/a.ts#f:1')).toHaveLength(1);
    expect(graph.edgesByTarget.get('@Fn/b.ts#g:1')).toHaveLength(1);
  });

  it('skips nodes lacking required id/file fields', () => {
    const j = {
      nodes: [
        { id: '@Fn/a.ts#f:1', type: 'function', name: 'f', file: 'a.ts', line: 1 },
        { type: 'function', name: 'g', file: 'b.ts', line: 1 } as any, // no id
        { id: '@Fn/c.ts#h:1', type: 'function', name: 'h' } as any, // no file
      ],
      edges: [],
    };
    const graph = buildGraphFromExportedJson(j);
    expect(graph.nodes.size).toBe(1);
  });

  it('handles missing edges array', () => {
    const j = { nodes: [{ id: 'x', type: 't', name: 'x', file: 'f', line: 1 }] };
    const graph = buildGraphFromExportedJson(j);
    expect(graph.edges).toEqual([]);
  });
});

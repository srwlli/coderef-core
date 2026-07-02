/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability rag-incremental-state-truth-regression-test
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { IndexingOrchestrator } from '../indexing-orchestrator.js';

// P0-3 (repo-review-2026-07-02) — two truth guarantees for incremental
// RAG indexing state:
//   (a) a chunk whose embedding FAILED is never recorded as indexed, so
//       the next run retries it instead of skipping it as "unchanged";
//   (b) chunks whose source was removed (file deleted, or element dropped
//       from a modified file) are deleted from the vector store, and
//       deleted files leave the state file so the deletion is not
//       re-issued forever.

const tmpDirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    tmpDirs.splice(0).map((p) =>
      fs.rm(p, { recursive: true, force: true }).catch(() => {}),
    ),
  );
});

function makeMocks(opts: { embedFails?: boolean } = {}) {
  const llmProvider = {
    getEmbeddingDimensions: () => 4,
    embed: opts.embedFails
      ? vi.fn().mockRejectedValue(new Error('embedding backend unreachable'))
      : vi.fn().mockImplementation(async (texts: string[]) =>
          texts.map(() => [1, 0, 0, 0]),
        ),
  } as any;
  const vectorStore = {
    initialize: vi.fn().mockResolvedValue(undefined),
    upsert: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    stats: vi.fn().mockResolvedValue({}),
    clear: vi.fn().mockResolvedValue(undefined),
  } as any;
  return { llmProvider, vectorStore };
}

interface FixtureFile {
  rel: string;
  fnName: string;
}

async function writeGraph(projectDir: string, files: FixtureFile[]): Promise<void> {
  const nodes = files.map((f) => ({
    id: `@Fn/${f.rel}#${f.fnName}:1`,
    type: 'function',
    name: f.fnName,
    file: f.rel,
    line: 1,
    metadata: {},
  }));
  await fs.writeFile(
    path.join(projectDir, '.coderef', 'graph.json'),
    JSON.stringify({ version: '1.0', nodes, edges: [] }),
    'utf-8',
  );
}

async function writeSource(projectDir: string, f: FixtureFile): Promise<void> {
  const abs = path.join(projectDir, f.rel);
  await fs.writeFile(abs, `export function ${f.fnName}() { return 1; }\n`, 'utf-8');
  // Source older than graph.json so the AC-04 mtime stale-check passes.
  const longAgo = new Date(Date.now() - 60 * 60 * 1000);
  await fs.utimes(abs, longAgo, longAgo);
}

async function makeFixture(files: FixtureFile[]): Promise<string> {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-incr-state-'));
  tmpDirs.push(projectDir);
  await fs.mkdir(path.join(projectDir, '.coderef'), { recursive: true });
  await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });
  for (const f of files) {
    await writeSource(projectDir, f);
  }
  await writeGraph(projectDir, files);
  return projectDir;
}

function runIndex(projectDir: string, mocks: ReturnType<typeof makeMocks>) {
  const orch = new IndexingOrchestrator(mocks.llmProvider, mocks.vectorStore, projectDir);
  return orch.indexCodebase({
    sourceDir: projectDir,
    useAnalyzer: true,
    validation: { ok: true },
  });
}

describe('P0-3a: failed embeds are never recorded as indexed', () => {
  it('retries a chunk on the next run after its embedding failed', async () => {
    const fileA: FixtureFile = { rel: 'src/a.ts', fnName: 'alpha' };
    const projectDir = await makeFixture([fileA]);

    // Run 1: embedding fails for the only chunk.
    const failing = makeMocks({ embedFails: true });
    const run1 = await runIndex(projectDir, failing);
    expect(run1.chunksIndexed).toBe(0);
    expect(run1.chunksFailed).toBe(1);

    // Run 2: embedding works. Before the fix, run 1 recorded the file as
    // indexed, so run 2 skipped it as "unchanged" and the chunk was lost
    // until the file changed or --force.
    const working = makeMocks();
    const run2 = await runIndex(projectDir, working);
    expect(run2.chunksIndexed).toBe(1);
    const upserted = working.vectorStore.upsert.mock.calls.flatMap((c: any[]) => c[0]);
    expect(upserted.map((r: any) => r.id)).toContain('@Fn/src/a.ts#alpha:1');
  });
});

describe('P0-3b: removed chunks are deleted from the vector store', () => {
  it('deletes vectors for a file removed from source + graph, exactly once', async () => {
    const fileA: FixtureFile = { rel: 'src/a.ts', fnName: 'alpha' };
    const fileB: FixtureFile = { rel: 'src/b.ts', fnName: 'beta' };
    const projectDir = await makeFixture([fileA, fileB]);

    // Run 1: both files index cleanly; nothing to delete yet.
    const run1Mocks = makeMocks();
    const run1 = await runIndex(projectDir, run1Mocks);
    expect(run1.chunksIndexed).toBe(2);
    expect(run1Mocks.vectorStore.delete).not.toHaveBeenCalled();

    // Remove b.ts from disk and from the graph.
    await fs.rm(path.join(projectDir, fileB.rel));
    await writeGraph(projectDir, [fileA]);

    // Run 2: b's chunk must be deleted from the vector store.
    const run2Mocks = makeMocks();
    await runIndex(projectDir, run2Mocks);
    expect(run2Mocks.vectorStore.delete).toHaveBeenCalledTimes(1);
    const [deletedIds] = run2Mocks.vectorStore.delete.mock.calls[0];
    expect(deletedIds).toEqual(['@Fn/src/b.ts#beta:1']);

    // Run 3: b left the state file, so the deletion is not re-issued.
    const run3Mocks = makeMocks();
    await runIndex(projectDir, run3Mocks);
    expect(run3Mocks.vectorStore.delete).not.toHaveBeenCalled();
  });

  it('deletes the old chunk id when an element is renamed in a modified file', async () => {
    const fileA: FixtureFile = { rel: 'src/a.ts', fnName: 'alpha' };
    const projectDir = await makeFixture([fileA]);

    const run1Mocks = makeMocks();
    const run1 = await runIndex(projectDir, run1Mocks);
    expect(run1.chunksIndexed).toBe(1);

    // Rename the element: file content changes, chunk id changes.
    const renamed: FixtureFile = { rel: 'src/a.ts', fnName: 'alphaRenamed' };
    await writeSource(projectDir, renamed);
    await writeGraph(projectDir, [renamed]);

    const run2Mocks = makeMocks();
    await runIndex(projectDir, run2Mocks);

    const upserted = run2Mocks.vectorStore.upsert.mock.calls.flatMap((c: any[]) => c[0]);
    expect(upserted.map((r: any) => r.id)).toContain('@Fn/src/a.ts#alphaRenamed:1');
    expect(run2Mocks.vectorStore.delete).toHaveBeenCalledTimes(1);
    const [staleIds] = run2Mocks.vectorStore.delete.mock.calls[0];
    expect(staleIds).toEqual(['@Fn/src/a.ts#alpha:1']);
  });
});

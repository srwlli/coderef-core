/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability mcp-server-repo-agnostic
 */

/**
 * coderef-mcp-server repo-agnostic behavioral tests
 * (WO-MCP-REPO-AGNOSTIC-ANY-REPO-001 P3-T1).
 *
 * Drives the exported handlersFor() registry against TWO distinct fixture
 * .coderef/ directories — proving one server answers per-repo, that the
 * resolution error taxonomy fires as structured envelopes (via the exported
 * errorPayload, which is exactly the perRepo tool-call boundary mapping), and
 * that the registry memoizes per canonical root without cross-repo pollution.
 *
 * spawnSync is mocked so the ensureArtifacts auto-build path is DETERMINISTIC:
 * an absent .coderef/ always fails its (mocked) build attempt, so the second
 * call surfaces the taxonomy's coderef_artifacts_missing instead of racing a
 * real populate spawn. The build-if-missing behavior itself is covered by
 * mcp-server-build-if-missing.test.ts with the real spawn.
 */

import { vi } from 'vitest';

vi.mock('child_process', () => ({
  spawnSync: vi.fn(() => ({ status: 1, stdout: '', stderr: 'mocked: no auto-build in repo-agnostic tests', error: undefined })),
}));

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { errorPayload, handlersFor, ToolHandlers } from '../src/cli/coderef-mcp-server.js';
import type { ExportedGraph } from '../src/export/graph-exporter.js';

// ---- two distinct fixtures --------------------------------------------------------
// repoA: 2 functions in src/lib.ts (one calls two), both exported.
// repoB: 3 functions in src/mod.ts (f1->f2, f2->f3, f1->f3), all exported.
// DIFFERENT totals on every surface the tests assert (elements, nodes, edges).

const GRAPH_A: ExportedGraph = {
  version: '1.0.0',
  exportedAt: 1750000000000,
  nodes: [
    { id: '@Fn/src/lib.ts#one:1', type: 'function', name: 'one', file: 'src/lib.ts', line: 1, metadata: {} },
    { id: '@Fn/src/lib.ts#two:5', type: 'function', name: 'two', file: 'src/lib.ts', line: 5, metadata: {} },
    { id: '@File/src/lib.ts', type: 'file', name: '@File/src/lib.ts', file: 'src/lib.ts', line: 1, metadata: { fileGrain: true } },
  ],
  edges: [
    {
      id: 'a1', sourceId: '@Fn/src/lib.ts#one:1', targetId: '@Fn/src/lib.ts#two:5',
      relationship: 'call', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/lib.ts', line: 2 },
      source: '@Fn/src/lib.ts#one:1', target: '@Fn/src/lib.ts#two:5', type: 'call',
    },
    {
      id: 'a2', sourceId: '@File/src/lib.ts', targetId: '@Fn/src/lib.ts#one:1',
      relationship: 'export', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/lib.ts', line: 1 },
      source: '@File/src/lib.ts', target: '@Fn/src/lib.ts#one:1', type: 'export',
    },
    {
      id: 'a3', sourceId: '@File/src/lib.ts', targetId: '@Fn/src/lib.ts#two:5',
      relationship: 'export', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/lib.ts', line: 5 },
      source: '@File/src/lib.ts', target: '@Fn/src/lib.ts#two:5', type: 'export',
    },
  ],
};

const INDEX_A = {
  schemaVersion: '1.0.0',
  generatedAt: '2026-07-14T00:00:00Z',
  totalElements: 2,
  elementsByType: { function: 2 },
  elements: [
    { type: 'function', name: 'one', file: 'src/lib.ts', line: 1, exported: true, codeRefId: '@Fn/src/lib.ts#one:1' },
    { type: 'function', name: 'two', file: 'src/lib.ts', line: 5, exported: true, codeRefId: '@Fn/src/lib.ts#two:5' },
  ],
};

const GRAPH_B: ExportedGraph = {
  version: '1.0.0',
  exportedAt: 1750000000000,
  nodes: [
    { id: '@Fn/src/mod.ts#f1:1', type: 'function', name: 'f1', file: 'src/mod.ts', line: 1, metadata: {} },
    { id: '@Fn/src/mod.ts#f2:5', type: 'function', name: 'f2', file: 'src/mod.ts', line: 5, metadata: {} },
    { id: '@Fn/src/mod.ts#f3:9', type: 'function', name: 'f3', file: 'src/mod.ts', line: 9, metadata: {} },
    { id: '@File/src/mod.ts', type: 'file', name: '@File/src/mod.ts', file: 'src/mod.ts', line: 1, metadata: { fileGrain: true } },
  ],
  edges: [
    {
      id: 'b1', sourceId: '@Fn/src/mod.ts#f1:1', targetId: '@Fn/src/mod.ts#f2:5',
      relationship: 'call', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/mod.ts', line: 2 },
      source: '@Fn/src/mod.ts#f1:1', target: '@Fn/src/mod.ts#f2:5', type: 'call',
    },
    {
      id: 'b2', sourceId: '@Fn/src/mod.ts#f2:5', targetId: '@Fn/src/mod.ts#f3:9',
      relationship: 'call', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/mod.ts', line: 6 },
      source: '@Fn/src/mod.ts#f2:5', target: '@Fn/src/mod.ts#f3:9', type: 'call',
    },
    {
      id: 'b3', sourceId: '@Fn/src/mod.ts#f1:1', targetId: '@Fn/src/mod.ts#f3:9',
      relationship: 'call', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/mod.ts', line: 3 },
      source: '@Fn/src/mod.ts#f1:1', target: '@Fn/src/mod.ts#f3:9', type: 'call',
    },
    {
      id: 'b4', sourceId: '@File/src/mod.ts', targetId: '@Fn/src/mod.ts#f1:1',
      relationship: 'export', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/mod.ts', line: 1 },
      source: '@File/src/mod.ts', target: '@Fn/src/mod.ts#f1:1', type: 'export',
    },
    {
      id: 'b5', sourceId: '@File/src/mod.ts', targetId: '@Fn/src/mod.ts#f2:5',
      relationship: 'export', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/mod.ts', line: 5 },
      source: '@File/src/mod.ts', target: '@Fn/src/mod.ts#f2:5', type: 'export',
    },
    {
      id: 'b6', sourceId: '@File/src/mod.ts', targetId: '@Fn/src/mod.ts#f3:9',
      relationship: 'export', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/mod.ts', line: 9 },
      source: '@File/src/mod.ts', target: '@Fn/src/mod.ts#f3:9', type: 'export',
    },
  ],
};

const INDEX_B = {
  schemaVersion: '1.0.0',
  generatedAt: '2026-07-14T00:00:00Z',
  totalElements: 3,
  elementsByType: { function: 3 },
  elements: [
    { type: 'function', name: 'f1', file: 'src/mod.ts', line: 1, exported: true, codeRefId: '@Fn/src/mod.ts#f1:1' },
    { type: 'function', name: 'f2', file: 'src/mod.ts', line: 5, exported: true, codeRefId: '@Fn/src/mod.ts#f2:5' },
    { type: 'function', name: 'f3', file: 'src/mod.ts', line: 9, exported: true, codeRefId: '@Fn/src/mod.ts#f3:9' },
  ],
};

function writeFixture(dir: string, graph: ExportedGraph, index: unknown): void {
  const coderef = path.join(dir, '.coderef');
  fs.mkdirSync(coderef, { recursive: true });
  fs.writeFileSync(path.join(coderef, 'graph.json'), JSON.stringify(graph));
  fs.writeFileSync(path.join(coderef, 'index.json'), JSON.stringify(index));
}

/** Mirrors main()'s perRepo boundary exactly: resolve via the registry, run
 * the handler, convert ANY error to the structured envelope. */
async function callTool(
  root: string,
  fn: (h: ToolHandlers) => Record<string, unknown> | Promise<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  try {
    return await fn(handlersFor(root));
  } catch (e) {
    return errorPayload(e, root);
  }
}

let base: string;
let repoA: string;
let repoB: string;

beforeAll(() => {
  base = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-mcp-agnostic-'));
  repoA = path.join(base, 'repoA');
  repoB = path.join(base, 'repoB');
  fs.mkdirSync(repoA);
  fs.mkdirSync(repoB);
  writeFixture(repoA, GRAPH_A, INDEX_A);
  writeFixture(repoB, GRAPH_B, INDEX_B);
});

afterAll(() => {
  fs.rmSync(base, { recursive: true, force: true });
});

// ---- (1) per-repo dispatch from ONE server ---------------------------------------

describe('per-repo dispatch', () => {
  it('codebase_summary returns DIFFERENT totals per project_root', async () => {
    const a = (await callTool(repoA, h => h.codebase_summary())) as any;
    const b = (await callTool(repoB, h => h.codebase_summary())) as any;
    expect(a.error).toBeUndefined();
    expect(b.error).toBeUndefined();
    expect(a.total_elements).toBe(2);
    expect(b.total_elements).toBe(3);
    expect(a.graph.nodes).toBe(3);
    expect(b.graph.nodes).toBe(4);
    expect(a.graph.edges).toBe(3);
    expect(b.graph.edges).toBe(6);
  });

  it('what_exports routes per repo — and NEVER answers from the other repo', async () => {
    const a = (await callTool(repoA, h => h.what_exports({ file: 'src/lib.ts' }))) as any;
    expect(a.total).toBe(2);
    const b = (await callTool(repoB, h => h.what_exports({ file: 'src/mod.ts' }))) as any;
    expect(b.total).toBe(3);
    // Cross-check: repoA has no src/mod.ts — asking A for B's file must be a
    // clean not-found, NOT B's data (no silent fallback to another repo).
    const cross = (await callTool(repoA, h => h.what_exports({ file: 'src/mod.ts' }))) as any;
    expect(cross.error).toBe('file_not_found');
  });

  it('hotspots ranks each repo over its own graph', async () => {
    const a = (await callTool(repoA, h => h.hotspots({}))) as any;
    const b = (await callTool(repoB, h => h.hotspots({}))) as any;
    expect(a.total_ranked).toBe(2);
    expect(b.total_ranked).toBe(3);
    const bTop = b.hotspots[0];
    // repoB's busiest node participates in 2 resolved call edges minimum.
    expect(bTop.score).toBeGreaterThanOrEqual(2);
  });
});

// ---- (2) error taxonomy (structured envelopes, never a throw) ---------------------

describe('error taxonomy', () => {
  it('(A) nonexistent project_root -> project_root_nonexistent', async () => {
    const missing = path.join(base, 'no-such-repo');
    const r = (await callTool(missing, h => h.codebase_summary())) as any;
    expect(r.error).toBe('project_root_nonexistent');
    expect(r.project_root).toBe(missing);
    expect(typeof r.hint).toBe('string');
    expect(r.hint.length).toBeGreaterThan(0);
  });

  it('(A) project_root that is a FILE -> project_root_nonexistent', async () => {
    const filePath = path.join(base, 'a-file.txt');
    fs.writeFileSync(filePath, 'not a dir');
    const r = (await callTool(filePath, h => h.codebase_summary())) as any;
    expect(r.error).toBe('project_root_nonexistent');
    expect(r.hint).toContain('not a directory');
  });

  it('(B) dir without .coderef/ -> coderef_artifacts_missing after the (mocked, failing) build attempt', async () => {
    const bare = path.join(base, 'bare-repo');
    fs.mkdirSync(bare);
    // First call: the mocked spawnSync fails the auto-build -> coderef_build_failed.
    const first = (await callTool(bare, h => h.codebase_summary())) as any;
    expect(first.error).toBe('coderef_build_failed');
    // Second call: buildAttempted guard -> the taxonomy's canonical missing code.
    const second = (await callTool(bare, h => h.codebase_summary())) as any;
    expect(second.error).toBe('coderef_artifacts_missing');
    expect(second.project_root).toBe(bare);
    expect(second.hint).toContain('populate');
  });

  it('(C) corrupt graph.json -> coderef_artifacts_corrupt', async () => {
    const corrupt = path.join(base, 'corrupt-repo');
    fs.mkdirSync(corrupt);
    const coderef = path.join(corrupt, '.coderef');
    fs.mkdirSync(coderef);
    fs.writeFileSync(path.join(coderef, 'graph.json'), '{ this is not json !!!');
    fs.writeFileSync(path.join(coderef, 'index.json'), JSON.stringify(INDEX_A));
    const r = (await callTool(corrupt, h => h.hotspots({}))) as any;
    expect(r.error).toBe('coderef_artifacts_corrupt');
    expect(r.project_root).toBe(corrupt);
    expect(r.hint).toContain('rebuild');
  });

  it('every envelope carries the { error, project_root, hint } contract fields', async () => {
    const missing = path.join(base, 'still-not-there');
    const r = (await callTool(missing, h => h.what_calls({ element: 'x' }))) as any;
    expect(Object.keys(r)).toEqual(expect.arrayContaining(['error', 'project_root', 'hint']));
  });
});

// ---- symlink taxonomy (E/F) — junction-based, skipped where unsupported -----------

describe('symlink taxonomy', () => {
  it('(F) symlink to a nonexistent target -> project_root_symlink_broken', async () => {
    const link = path.join(base, 'broken-link');
    try {
      fs.symlinkSync(path.join(base, 'ghost-target'), link, 'junction');
    } catch {
      return; // environment cannot create links — covered on platforms that can
    }
    const r = (await callTool(link, h => h.codebase_summary())) as any;
    expect(r.error).toBe('project_root_symlink_broken');
    expect(r.hint).toContain('ghost-target');
  });

  it('(E) circular symlinks -> project_root_symlink_loop', async () => {
    const loopA = path.join(base, 'loop-a');
    const loopB = path.join(base, 'loop-b');
    try {
      fs.symlinkSync(loopB, loopA, 'junction');
      fs.symlinkSync(loopA, loopB, 'junction');
    } catch {
      return; // environment cannot create links
    }
    const r = (await callTool(loopA, h => h.codebase_summary())) as any;
    // Node surfaces cyclic links as ELOOP (mapped) — some Windows FS stacks
    // report the cycle's tail as a missing target instead; both are loud,
    // structured, and never another repo's data.
    expect(['project_root_symlink_loop', 'project_root_symlink_broken']).toContain(r.error);
  });
});

// ---- (3) registry memoization + (4) no cross-repo pollution ------------------------

describe('handler registry', () => {
  it('(3) two handlersFor calls on the same root return the SAME memoized object', () => {
    const h1 = handlersFor(repoA);
    const h2 = handlersFor(repoA);
    expect(Object.is(h1, h2)).toBe(true);
  });

  it('relative project_root resolves against the anchor onto the SAME registry entry', () => {
    const viaAbsolute = handlersFor(repoA);
    const viaRelative = handlersFor('repoA', base);
    expect(Object.is(viaAbsolute, viaRelative)).toBe(true);
  });

  it('(4) distinct roots hold independent handler sets + independent caches', async () => {
    expect(Object.is(handlersFor(repoA), handlersFor(repoB))).toBe(false);
    // Query B, then re-query A — A's numbers must be untouched by B's load.
    await callTool(repoB, h => h.codebase_summary());
    const a = (await callTool(repoA, h => h.codebase_summary())) as any;
    expect(a.total_elements).toBe(2);
    expect(a.graph.edges).toBe(3);
  });

  it('a failed resolution is NOT cached — the root works once it exists', async () => {
    const late = path.join(base, 'late-repo');
    const before = (await callTool(late, h => h.codebase_summary())) as any;
    expect(before.error).toBe('project_root_nonexistent');
    // Create the repo after the failure; the registry must not have poisoned it.
    fs.mkdirSync(late);
    writeFixture(late, GRAPH_A, INDEX_A);
    const after = (await callTool(late, h => h.codebase_summary())) as any;
    expect(after.error).toBeUndefined();
    expect(after.total_elements).toBe(2);
  });
});

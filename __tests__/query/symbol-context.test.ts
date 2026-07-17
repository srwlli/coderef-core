/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability symbol-context-test
 */

/**
 * Pure tests for the consolidated symbol-context card assembler
 * (assembleSymbolContext) — WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 Phase 7.
 *
 * These pin the JOIN in isolation from the MCP server (per-tool wiring is pinned
 * in __tests__/mcp-server.test.ts against the fixture graph). Load-bearing
 * behaviours:
 *  - the card is assembled purely from already-loaded inputs — no I/O, no
 *    Date.now/Math.random (the only clock touch is the caller's mtime, passed in).
 *  - DETERMINISM: identical inputs -> byte-identical card.
 *  - neighborhood delegates to egoGraphOf (directions not swapped, tiers present).
 *  - references + test_linkage partition the SAME inbound edges (a test-file
 *    source counts as a test ref; a src source does not).
 *  - staleness is the MTIME heuristic: element file newer than graph.json ->
 *    stale:true with the basis label; older -> stale:false; unavailable -> not-stale.
 *  - absence is no-data: no index element -> header status 'missing', not an error.
 */

import { describe, it, expect } from 'vitest';
import { CanonicalGraphQuery } from '../../src/query/canonical-graph.js';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';
import { assembleSymbolContext, type SymbolContextInputs } from '../../src/query/symbol-context.js';

// ---- synthetic graph ----------------------------------------------------------
// helper is called by srcCaller (src/a.ts) AND testCaller (__tests__/x.test.ts),
// and calls leaf. So: 2 inbound callers, 1 outbound callee, 1 test-file ref.
const HELPER = '@Fn/src/util.ts#helper:10';
const SRC_CALLER = '@Fn/src/a.ts#srcCaller:5';
const TEST_CALLER = '@Fn/__tests__/x.test.ts#testCaller:3';
const LEAF = '@Fn/src/leaf.ts#leaf:1';

function makeGraph(): ExportedGraph {
  const nodes: ExportedGraph['nodes'] = [
    { id: HELPER, type: 'function', name: 'helper', file: 'src/util.ts', line: 10, metadata: { codeRefIdNoLine: '@Fn/src/util.ts#helper' } },
    { id: SRC_CALLER, type: 'function', name: 'srcCaller', file: 'src/a.ts', line: 5, metadata: { codeRefIdNoLine: '@Fn/src/a.ts#srcCaller' } },
    { id: TEST_CALLER, type: 'function', name: 'testCaller', file: '__tests__/x.test.ts', line: 3, metadata: { codeRefIdNoLine: '@Fn/__tests__/x.test.ts#testCaller' } },
    { id: LEAF, type: 'function', name: 'leaf', file: 'src/leaf.ts', line: 1, metadata: { codeRefIdNoLine: '@Fn/src/leaf.ts#leaf' } },
  ];
  const callEdge = (id: string, sourceId: string, targetId: string, at: string): ExportedGraph['edges'][number] => ({
    id, sourceId, targetId, relationship: 'call', resolutionStatus: 'resolved',
    sourceLocation: { file: at.split(':')[0], line: Number(at.split(':')[1]) },
    source: sourceId, target: targetId, type: 'call',
  } as any);
  const edges: ExportedGraph['edges'] = [
    callEdge('c1', SRC_CALLER, HELPER, 'src/a.ts:6'),
    callEdge('c2', TEST_CALLER, HELPER, '__tests__/x.test.ts:4'),
    callEdge('c3', HELPER, LEAF, 'src/util.ts:11'),
  ];
  return { version: '1.0.0', exportedAt: 1750000000000, nodes, edges };
}

const TEST_FILE_RE = /__tests__|\.test\.|\.spec\./;
const isTestFile = (f: string | undefined) => TEST_FILE_RE.test(f ?? '');

/** Build the inputs a real handler would pass, for `helper`. */
function makeInputs(overrides?: Partial<SymbolContextInputs>): SymbolContextInputs {
  const graph = makeGraph();
  const query = new CanonicalGraphQuery(graph);
  const byId = new Map(graph.nodes.map(n => [n.id, n]));
  const helper = byId.get(HELPER)!;
  // inbound resolved edges targeting helper (c1 + c2)
  const inboundEdges = graph.edges.filter(e => e.targetId === HELPER);
  return {
    node: helper,
    indexElement: { headerStatus: 'defined', exported: true, layer: 'service', capability: 'helping' },
    query,
    inboundEdges,
    resolveSource: (sourceId: string) => {
      const n = byId.get(sourceId);
      return n ? { id: n.id, name: n.name, type: n.type, file: n.file, line: n.line } : undefined;
    },
    isTestFile,
    elementFileMtimeMs: 1000, // older than graphMtime below -> fresh
    graphMtimeMs: 2000,
    ...overrides,
  };
}

describe('assembleSymbolContext — identity + header', () => {
  it('surfaces the nodeSummary identity 5-tuple', () => {
    const card = assembleSymbolContext(makeInputs());
    expect(card.identity).toEqual({ id: HELPER, name: 'helper', type: 'function', file: 'src/util.ts', line: 10 });
  });

  it('surfaces header PRESENCE from the index element', () => {
    const card = assembleSymbolContext(makeInputs());
    expect(card.header).toEqual({ status: 'defined', exported: true, layer: 'service', capability: 'helping' });
  });

  it('absence is no-data: no index element -> status:missing, exported:false, not an error', () => {
    const card = assembleSymbolContext(makeInputs({ indexElement: undefined }));
    expect(card.header.status).toBe('missing');
    expect(card.header.exported).toBe(false);
    expect(card.header.layer).toBeUndefined();
  });
});

describe('assembleSymbolContext — neighborhood (ego-graph delegation)', () => {
  it('callers are inbound, callees outbound — not swapped', () => {
    const card = assembleSymbolContext(makeInputs());
    expect(card.neighborhood.resolved).toBe(true);
    const callers = card.neighborhood.callers.neighbors.map(n => n.id).sort();
    expect(callers).toEqual([SRC_CALLER, TEST_CALLER].sort());
    expect(card.neighborhood.callees.neighbors.map(n => n.id)).toEqual([LEAF]);
  });

  it('caps each direction with a declared truncation flag + true total', () => {
    const card = assembleSymbolContext(makeInputs(), { cap: 1 });
    expect(card.neighborhood.callers.neighbors).toHaveLength(1);
    expect(card.neighborhood.callers.truncated).toBe(true);
    expect(card.neighborhood.callers.total).toBe(2);
  });
});

describe('assembleSymbolContext — references + test_linkage (one partition)', () => {
  it('counts inbound call sites and preserves the true total', () => {
    const card = assembleSymbolContext(makeInputs());
    expect(card.references.call_site_count).toBe(2);
    expect(card.references.import_site_count).toBe(0);
    expect(card.references.total).toBe(2);
  });

  it('test_linkage counts ONLY the refs from test files', () => {
    const card = assembleSymbolContext(makeInputs());
    expect(card.test_linkage.test_ref_count).toBe(1);
    expect(card.test_linkage.sample[0].id).toBe(TEST_CALLER);
  });

  it('a symbol whose refs are all src files reports 0 test refs (no-data, not a verdict)', () => {
    // drop the test-file edge -> only the src caller remains
    const graph = makeGraph();
    const inputs = makeInputs({ inboundEdges: graph.edges.filter(e => e.targetId === HELPER && e.sourceId === SRC_CALLER) });
    const card = assembleSymbolContext(inputs);
    expect(card.test_linkage.test_ref_count).toBe(0);
  });

  it('reference sample honors the cap with a declared truncation flag', () => {
    const card = assembleSymbolContext(makeInputs(), { cap: 1 });
    expect(card.references.sample).toHaveLength(1);
    expect(card.references.truncated).toBe(true);
    expect(card.references.total).toBe(2); // true count preserved
  });
});

describe('assembleSymbolContext — staleness (mtime heuristic, Phase-8 boundary)', () => {
  it('element file NEWER than graph.json -> stale:true with the basis label', () => {
    const card = assembleSymbolContext(makeInputs({ elementFileMtimeMs: 5000, graphMtimeMs: 2000 }));
    expect(card.staleness.stale).toBe(true);
    expect(card.staleness.basis).toBe('element-file-mtime-vs-graph');
    expect(card.staleness.note).toMatch(/mtime heuristic/i); // NOT a hash-manifest claim
  });

  it('element file OLDER than graph.json -> stale:false', () => {
    const card = assembleSymbolContext(makeInputs({ elementFileMtimeMs: 1000, graphMtimeMs: 2000 }));
    expect(card.staleness.stale).toBe(false);
  });

  it('unavailable mtime -> treated as not-stale with a freshness-unknown note', () => {
    const card = assembleSymbolContext(makeInputs({ elementFileMtimeMs: null }));
    expect(card.staleness.stale).toBe(false);
    expect(card.staleness.note).toMatch(/unavailable/i);
  });
});

describe('assembleSymbolContext — determinism', () => {
  it('identical inputs yield a byte-identical card', () => {
    expect(assembleSymbolContext(makeInputs())).toEqual(assembleSymbolContext(makeInputs()));
  });
});

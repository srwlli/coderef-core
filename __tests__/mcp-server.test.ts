/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability mcp-server-test-fixture-graph
 */

/**
 * coderef-mcp-server behavioral tests
 * (WO-CODEREF-CORE-MCP-SERVER-AND-INTELLIGENCE-FIXES-001 P3-T4).
 *
 * Drives the exported buildToolHandlers() against a fixture .coderef/
 * directory — no stdio transport involved. The fixture graph is typed as
 * ExportedGraph so a future edge-schema change (the drift class that broke
 * the external Python coderef-context server) fails THIS file at compile
 * time instead of silently returning wrong answers at runtime.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildToolHandlers, ToolHandlers } from '../src/cli/coderef-mcp-server.js';
import type { ExportedGraph } from '../src/export/graph-exporter.js';

// ---- fixture --------------------------------------------------------------------

// Shape: util.ts#helper is called by a.ts#alpha and b.ts#beta; alpha is
// called by main.ts#main. So impact_of(helper) at depth>=2 reaches
// {alpha, beta, main}. util.ts#Helper (interface) is imported by a.ts.
// "dup" exists 6x to trip the ambiguity guard.
const FIXTURE_GRAPH: ExportedGraph = {
  version: '1.0.0',
  exportedAt: 1750000000000,
  nodes: [
    { id: '@Fn/src/util.ts#helper:10', type: 'function', name: 'helper', file: 'src/util.ts', line: 10, metadata: { codeRefIdNoLine: '@Fn/src/util.ts#helper', headerStatus: 'defined' } },
    { id: '@I/src/util.ts#Helper:3', type: 'interface', name: 'Helper', file: 'src/util.ts', line: 3, metadata: { codeRefIdNoLine: '@I/src/util.ts#Helper' } },
    { id: '@Fn/src/a.ts#alpha:5', type: 'function', name: 'alpha', file: 'src/a.ts', line: 5, metadata: {} },
    { id: '@Fn/src/b.ts#beta:8', type: 'function', name: 'beta', file: 'src/b.ts', line: 8, metadata: {} },
    { id: '@Fn/src/main.ts#main:1', type: 'function', name: 'main', file: 'src/main.ts', line: 1, metadata: {} },
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `@Fn/src/dups/d${i}.ts#dup:1`,
      type: 'function',
      name: 'dup',
      file: `src/dups/d${i}.ts`,
      line: 1,
      metadata: {},
    })),
    // v2 fixture extensions (WO-MCP-V2-TOOLS-AND-PS-VALIDATION-001 P1):
    // file-grain node for export edges, a 2-node call cycle, and a
    // test-file caller for the hotspots src_only filter.
    { id: '@File/src/util.ts', type: 'file', name: '@File/src/util.ts', file: 'src/util.ts', line: 1, metadata: { fileGrain: true } },
    { id: '@Fn/src/c1.ts#cyc1:1', type: 'function', name: 'cyc1', file: 'src/c1.ts', line: 1, metadata: {} },
    { id: '@Fn/src/c2.ts#cyc2:1', type: 'function', name: 'cyc2', file: 'src/c2.ts', line: 1, metadata: {} },
    { id: '@Fn/__tests__/t.test.ts#tcall:1', type: 'function', name: 'tcall', file: '__tests__/t.test.ts', line: 1, metadata: {} },
    // P1 follow-up (REC-P1-003): an isolated subgraph exercising outbound
    // edge-cases without perturbing any existing assertion.
    //  - fan calls 3 distinct leaves -> outbound truncation (total>cap).
    //  - sameA & sameB share src/same.ts and call each other -> byFile
    //    intra-file self-exclusion.
    //  - diamond: dtop -> dmidL/dmidR -> dbot -> two simple paths for mode=all.
    { id: '@Fn/src/fan.ts#fan:1', type: 'function', name: 'fan', file: 'src/fan.ts', line: 1, metadata: {} },
    { id: '@Fn/src/fan.ts#leaf1:2', type: 'function', name: 'leaf1', file: 'src/fan.ts', line: 2, metadata: {} },
    { id: '@Fn/src/fan.ts#leaf2:3', type: 'function', name: 'leaf2', file: 'src/fan.ts', line: 3, metadata: {} },
    { id: '@Fn/src/fan.ts#leaf3:4', type: 'function', name: 'leaf3', file: 'src/fan.ts', line: 4, metadata: {} },
    { id: '@Fn/src/same.ts#sameA:1', type: 'function', name: 'sameA', file: 'src/same.ts', line: 1, metadata: {} },
    { id: '@Fn/src/same.ts#sameB:2', type: 'function', name: 'sameB', file: 'src/same.ts', line: 2, metadata: {} },
    { id: '@File/src/same.ts', type: 'file', name: '@File/src/same.ts', file: 'src/same.ts', line: 1, metadata: { fileGrain: true } },
    { id: '@Fn/src/dia.ts#dtop:1', type: 'function', name: 'dtop', file: 'src/dia.ts', line: 1, metadata: {} },
    { id: '@Fn/src/dia.ts#dmidL:2', type: 'function', name: 'dmidL', file: 'src/dia.ts', line: 2, metadata: {} },
    { id: '@Fn/src/dia.ts#dmidR:3', type: 'function', name: 'dmidR', file: 'src/dia.ts', line: 3, metadata: {} },
    { id: '@Fn/src/dia.ts#dbot:4', type: 'function', name: 'dbot', file: 'src/dia.ts', line: 4, metadata: {} },
    // P2 (WO-AGENT-NATIVE-CAPABILITY-GAPS-001): candidate targets for the
    // ambiguous non-resolved edges below — two same-named symbols the resolver
    // could not choose between (surfaced by unresolved_edges candidates[]).
    { id: '@Fn/src/dupcall/x.ts#doThing:1', type: 'function', name: 'doThing', file: 'src/dupcall/x.ts', line: 1, metadata: {} },
    { id: '@Fn/src/dupcall/y.ts#doThing:1', type: 'function', name: 'doThing', file: 'src/dupcall/y.ts', line: 1, metadata: {} },
  ],
  edges: [
    // canonical 8-field schema + legacy compat fields (source/target/type)
    {
      id: 'e1', sourceId: '@Fn/src/a.ts#alpha:5', targetId: '@Fn/src/util.ts#helper:10',
      relationship: 'call', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/a.ts', line: 6 },
      source: '@Fn/src/a.ts#alpha:5', target: '@Fn/src/util.ts#helper:10', type: 'call',
    },
    {
      id: 'e2', sourceId: '@Fn/src/b.ts#beta:8', targetId: '@Fn/src/util.ts#helper:10',
      relationship: 'call', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/b.ts', line: 9 },
      source: '@Fn/src/b.ts#beta:8', target: '@Fn/src/util.ts#helper:10', type: 'call',
    },
    {
      id: 'e3', sourceId: '@Fn/src/main.ts#main:1', targetId: '@Fn/src/a.ts#alpha:5',
      relationship: 'call', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/main.ts', line: 2 },
      source: '@Fn/src/main.ts#main:1', target: '@Fn/src/a.ts#alpha:5', type: 'call',
    },
    {
      id: 'e4', sourceId: '@Fn/src/a.ts#alpha:5', targetId: '@I/src/util.ts#Helper:3',
      relationship: 'import', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/a.ts', line: 1 },
      source: '@Fn/src/a.ts#alpha:5', target: '@I/src/util.ts#Helper:3', type: 'import',
    },
    // unresolved edge: must be invisible to all tools (no targetId)
    {
      id: 'e5', sourceId: '@Fn/src/main.ts#main:1',
      relationship: 'call', resolutionStatus: 'unresolved', reason: 'dynamic call',
      source: '@Fn/src/main.ts#main:1', target: 'whatever', type: 'call',
    },
    // v2: export edges (file-grain -> element) — consumed by what_exports;
    // must NOT count as impact_of dependents (call+import only).
    {
      id: 'ex1', sourceId: '@File/src/util.ts', targetId: '@Fn/src/util.ts#helper:10',
      relationship: 'export', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/util.ts', line: 10 },
      source: '@File/src/util.ts', target: '@Fn/src/util.ts#helper:10', type: 'export',
    },
    {
      id: 'ex2', sourceId: '@File/src/util.ts', targetId: '@I/src/util.ts#Helper:3',
      relationship: 'export', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/util.ts', line: 3 },
      source: '@File/src/util.ts', target: '@I/src/util.ts#Helper:3', type: 'export',
    },
    // v2: 2-node call cycle — consumed by cycles.
    {
      id: 'cy1', sourceId: '@Fn/src/c1.ts#cyc1:1', targetId: '@Fn/src/c2.ts#cyc2:1',
      relationship: 'call', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/c1.ts', line: 2 },
      source: '@Fn/src/c1.ts#cyc1:1', target: '@Fn/src/c2.ts#cyc2:1', type: 'call',
    },
    {
      id: 'cy2', sourceId: '@Fn/src/c2.ts#cyc2:1', targetId: '@Fn/src/c1.ts#cyc1:1',
      relationship: 'call', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/c2.ts', line: 2 },
      source: '@Fn/src/c2.ts#cyc2:1', target: '@Fn/src/c1.ts#cyc1:1', type: 'call',
    },
    // v2: test-origin call (evidence.testOrigin) — excluded by hotspots src_only.
    {
      id: 'te1', sourceId: '@Fn/__tests__/t.test.ts#tcall:1', targetId: '@Fn/src/c2.ts#cyc2:1',
      relationship: 'call', resolutionStatus: 'resolved',
      evidence: { kind: 'resolved-call', calleeName: 'cyc2', receiverText: '', scopePath: '', testOrigin: true } as any,
      sourceLocation: { file: '__tests__/t.test.ts', line: 5 },
      source: '@Fn/__tests__/t.test.ts#tcall:1', target: '@Fn/src/c2.ts#cyc2:1', type: 'call',
    },
    // P1 follow-up (REC-P1-003) isolated subgraph edges.
    // fan -> leaf1/leaf2/leaf3 (3 distinct outbound callees).
    {
      id: 'fn1', sourceId: '@Fn/src/fan.ts#fan:1', targetId: '@Fn/src/fan.ts#leaf1:2',
      relationship: 'call', resolutionStatus: 'resolved', sourceLocation: { file: 'src/fan.ts', line: 1 },
      source: '@Fn/src/fan.ts#fan:1', target: '@Fn/src/fan.ts#leaf1:2', type: 'call',
    },
    {
      id: 'fn2', sourceId: '@Fn/src/fan.ts#fan:1', targetId: '@Fn/src/fan.ts#leaf2:3',
      relationship: 'call', resolutionStatus: 'resolved', sourceLocation: { file: 'src/fan.ts', line: 1 },
      source: '@Fn/src/fan.ts#fan:1', target: '@Fn/src/fan.ts#leaf2:3', type: 'call',
    },
    {
      id: 'fn3', sourceId: '@Fn/src/fan.ts#fan:1', targetId: '@Fn/src/fan.ts#leaf3:4',
      relationship: 'call', resolutionStatus: 'resolved', sourceLocation: { file: 'src/fan.ts', line: 1 },
      source: '@Fn/src/fan.ts#fan:1', target: '@Fn/src/fan.ts#leaf3:4', type: 'call',
    },
    // sameA -> sameB, both in src/same.ts (intra-file call for byFile self-exclusion).
    {
      id: 'sm1', sourceId: '@Fn/src/same.ts#sameA:1', targetId: '@Fn/src/same.ts#sameB:2',
      relationship: 'call', resolutionStatus: 'resolved', sourceLocation: { file: 'src/same.ts', line: 1 },
      source: '@Fn/src/same.ts#sameA:1', target: '@Fn/src/same.ts#sameB:2', type: 'call',
    },
    // diamond: dtop -> dmidL -> dbot AND dtop -> dmidR -> dbot (2 simple paths).
    {
      id: 'di1', sourceId: '@Fn/src/dia.ts#dtop:1', targetId: '@Fn/src/dia.ts#dmidL:2',
      relationship: 'call', resolutionStatus: 'resolved', sourceLocation: { file: 'src/dia.ts', line: 1 },
      source: '@Fn/src/dia.ts#dtop:1', target: '@Fn/src/dia.ts#dmidL:2', type: 'call',
    },
    {
      id: 'di2', sourceId: '@Fn/src/dia.ts#dtop:1', targetId: '@Fn/src/dia.ts#dmidR:3',
      relationship: 'call', resolutionStatus: 'resolved', sourceLocation: { file: 'src/dia.ts', line: 1 },
      source: '@Fn/src/dia.ts#dtop:1', target: '@Fn/src/dia.ts#dmidR:3', type: 'call',
    },
    {
      id: 'di3', sourceId: '@Fn/src/dia.ts#dmidL:2', targetId: '@Fn/src/dia.ts#dbot:4',
      relationship: 'call', resolutionStatus: 'resolved', sourceLocation: { file: 'src/dia.ts', line: 2 },
      source: '@Fn/src/dia.ts#dmidL:2', target: '@Fn/src/dia.ts#dbot:4', type: 'call',
    },
    {
      id: 'di4', sourceId: '@Fn/src/dia.ts#dmidR:3', targetId: '@Fn/src/dia.ts#dbot:4',
      relationship: 'call', resolutionStatus: 'resolved', sourceLocation: { file: 'src/dia.ts', line: 3 },
      source: '@Fn/src/dia.ts#dmidR:3', target: '@Fn/src/dia.ts#dbot:4', type: 'call',
    },
    // P2 (WO-AGENT-NATIVE-CAPABILITY-GAPS-001): non-resolved edges the
    // unresolved_edges tool enumerates. No targetId (unresolved/ambiguous
    // never carry one). These make the fixture's non-resolved population:
    //   unresolved: e5 (dynamic call), ur2 (unresolved import) -> 2
    //   ambiguous : am1 (call, 2 candidates), am2 (import, 2 candidates) -> 2
    //   external  : ex-npm (external import) -> 1
    // FIXTURE_REPORT counts below are kept in lockstep for the T4 reconcile.
    {
      id: 'ur2', sourceId: '@Fn/src/dia.ts#dtop:1',
      relationship: 'import', resolutionStatus: 'unresolved', reason: 'module_not_found',
      evidence: { kind: 'unresolved-import', originSpecifier: './missing', reason: 'module_not_found' } as any,
      sourceLocation: { file: 'src/dia.ts', line: 10 },
      source: '@Fn/src/dia.ts#dtop:1', target: './missing', type: 'import',
    },
    {
      id: 'am1', sourceId: '@Fn/src/dia.ts#dtop:1',
      relationship: 'call', resolutionStatus: 'ambiguous', reason: 'multiple_candidates',
      candidates: ['@Fn/src/dupcall/x.ts#doThing:1', '@Fn/src/dupcall/y.ts#doThing:1'],
      evidence: { kind: 'ambiguous-call', calleeName: 'doThing', receiverText: '', candidates: ['@Fn/src/dupcall/x.ts#doThing:1', '@Fn/src/dupcall/y.ts#doThing:1'] } as any,
      sourceLocation: { file: 'src/dia.ts', line: 11 },
      source: '@Fn/src/dia.ts#dtop:1', target: 'doThing', type: 'call',
    },
    {
      id: 'am2', sourceId: '@Fn/src/dia.ts#dmidL:2',
      relationship: 'import', resolutionStatus: 'ambiguous', reason: 'multiple_candidates',
      candidates: ['@Fn/src/dupcall/x.ts#doThing:1', '@Fn/src/dupcall/y.ts#doThing:1'],
      evidence: { kind: 'ambiguous-import', originSpecifier: 'doThing', candidates: ['@Fn/src/dupcall/x.ts#doThing:1', '@Fn/src/dupcall/y.ts#doThing:1'] } as any,
      sourceLocation: { file: 'src/dia.ts', line: 12 },
      source: '@Fn/src/dia.ts#dmidL:2', target: 'doThing', type: 'import',
    },
    {
      id: 'ex-npm', sourceId: '@Fn/src/dia.ts#dbot:4',
      relationship: 'import', resolutionStatus: 'external',
      evidence: { kind: 'external-import', originSpecifier: 'left-pad' } as any,
      sourceLocation: { file: 'src/dia.ts', line: 13 },
      source: '@Fn/src/dia.ts#dbot:4', target: 'left-pad', type: 'import',
    },
  ],
  statistics: { nodeCount: 11, edgeCount: 5, edgesByType: { call: 4, import: 1 }, densityRatio: 0.04 },
};

const FIXTURE_INDEX = {
  schemaVersion: '1.0',
  generatedAt: '2026-06-12T00:00:00Z',
  totalElements: 3,
  elementsByType: { function: 2, interface: 1 },
  elements: [
    { type: 'function', name: 'helper', file: 'src/util.ts', line: 10, exported: true, headerStatus: 'defined', codeRefId: '@Fn/src/util.ts#helper:10', layer: 'service', capability: 'helping' },
    { type: 'interface', name: 'Helper', file: 'src/util.ts', line: 3, exported: true, headerStatus: 'missing', codeRefId: '@I/src/util.ts#Helper:3' },
    { type: 'function', name: 'alpha', file: 'src/a.ts', line: 5, exported: false, headerStatus: 'missing', codeRefId: '@Fn/src/a.ts#alpha:5' },
  ],
};

// The locked 12-field report (output-validator.ts additive stability rule).
// Non-resolved counts are kept in lockstep with the FIXTURE_GRAPH edges so the
// P2 unresolved_edges reconciliation test can assert the tool's live count over
// graph.json equals these aggregates (mirrors output-validator's per-status
// tally): 2 unresolved (e5 call + ur2 import), 2 ambiguous (am1 call + am2
// import), 1 external (ex-npm import).
const FIXTURE_REPORT = {
  valid_edge_count: 4,
  unresolved_count: 2,
  ambiguous_count: 2,
  external_count: 1,
  builtin_count: 0,
  header_defined_count: 1,
  header_missing_count: 2,
  header_stale_count: 0,
  header_partial_count: 0,
  header_layer_mismatch_count: 0,
  header_export_mismatch_count: 0,
  header_coverage_pct: 33.3,
};

let fixtureDir: string;
let handlers: ToolHandlers;

beforeAll(() => {
  fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-mcp-fixture-'));
  const coderefDir = path.join(fixtureDir, '.coderef');
  fs.mkdirSync(coderefDir, { recursive: true });
  fs.writeFileSync(path.join(coderefDir, 'graph.json'), JSON.stringify(FIXTURE_GRAPH));
  fs.writeFileSync(path.join(coderefDir, 'index.json'), JSON.stringify(FIXTURE_INDEX));
  fs.writeFileSync(path.join(coderefDir, 'validation-report.json'), JSON.stringify(FIXTURE_REPORT));
  handlers = buildToolHandlers(fixtureDir);
});

afterAll(() => {
  fs.rmSync(fixtureDir, { recursive: true, force: true });
});

// ---- what_calls -------------------------------------------------------------------

describe('what_calls', () => {
  it('returns resolved inbound call edges with caller summaries', () => {
    const r = handlers.what_calls({ element: 'helper' }) as any;
    expect(r.error).toBeUndefined();
    expect(r.relationship).toBe('call');
    expect(r.total).toBe(2);
    expect(r.truncated).toBe(false);
    const callerIds = r.callers.map((c: any) => c.id).sort();
    expect(callerIds).toEqual(['@Fn/src/a.ts#alpha:5', '@Fn/src/b.ts#beta:8']);
    // call-site location is surfaced
    expect(r.callers.find((c: any) => c.name === 'alpha').at).toBe('src/a.ts:6');
  });

  it('resolves by exact codeRefId and by codeRefIdNoLine', () => {
    const byId = handlers.what_calls({ element: '@Fn/src/util.ts#helper:10' }) as any;
    expect(byId.total).toBe(2);
    const byNoLine = handlers.what_calls({ element: '@Fn/src/util.ts#helper' }) as any;
    expect(byNoLine.total).toBe(2);
  });

  it('honors the limit and sets truncated', () => {
    const r = handlers.what_calls({ element: 'helper', limit: 1 }) as any;
    expect(r.total).toBe(2);
    expect(r.returned).toBe(1);
    expect(r.truncated).toBe(true);
  });

  it('does not count unresolved edges', () => {
    // main has only the unresolved e5 outbound; alpha's only inbound is e3.
    const r = handlers.what_calls({ element: 'alpha' }) as any;
    expect(r.total).toBe(1);
    expect(r.callers[0].name).toBe('main');
  });

  it('returns element_not_found for unknown elements', () => {
    const r = handlers.what_calls({ element: 'no-such-thing-anywhere' }) as any;
    expect(r.error).toBe('element_not_found');
  });

  it('refuses ambiguous queries with candidates', () => {
    const r = handlers.what_calls({ element: 'dup' }) as any;
    expect(r.error).toBe('ambiguous_element');
    expect(r.match_count).toBe(6);
    expect(r.candidates.length).toBeLessThanOrEqual(5);
  });
});

// ---- what_imports -----------------------------------------------------------------

describe('what_imports', () => {
  it('returns resolved inbound import edges', () => {
    const r = handlers.what_imports({ element: 'Helper' }) as any;
    expect(r.relationship).toBe('import');
    expect(r.total).toBe(1);
    expect(r.importers[0].id).toBe('@Fn/src/a.ts#alpha:5');
  });

  it('does not mix relationship kinds', () => {
    // helper has 2 inbound CALLS but no inbound imports.
    const r = handlers.what_imports({ element: 'helper' }) as any;
    expect(r.total).toBe(0);
  });
});

// ---- impact_of --------------------------------------------------------------------

describe('impact_of', () => {
  it('walks transitive dependents breadth-first up to max_depth', () => {
    const r = handlers.impact_of({ element: 'helper', max_depth: 3 }) as any;
    // depth 1: alpha (call), beta (call); depth 2: main (calls alpha)
    expect(r.transitive_dependents).toBe(3);
    expect(r.dependents_by_depth.slice(0, 2)).toEqual([2, 1]);
    const files = r.files.map((f: any) => f.file).sort();
    expect(files).toEqual(['src/a.ts', 'src/b.ts', 'src/main.ts'].sort());
  });

  it('respects a depth cap of 1', () => {
    const r = handlers.impact_of({ element: 'helper', max_depth: 1 }) as any;
    expect(r.transitive_dependents).toBe(2);
    expect(r.dependents_by_depth).toEqual([2]);
  });

  it('aggregates over all elements of a file when queried by path', () => {
    // src/util.ts contains helper (2 callers) + Helper (1 importer):
    // depth-1 dependents = {alpha, beta}; alpha also imports Helper but is
    // deduped. main arrives at depth 2.
    const r = handlers.impact_of({ element: 'src/util.ts', max_depth: 2 }) as any;
    expect(r.error).toBeUndefined();
    expect(r.transitive_dependents).toBe(3);
  });
});

// ---- find_element -----------------------------------------------------------------

describe('find_element', () => {
  it('finds by exact name with full metadata, ranking the exact match first', () => {
    // 'helper' also substring-matches the 'Helper' interface — both return,
    // exact-name match first.
    const r = handlers.find_element({ query: 'helper' }) as any;
    expect(r.total).toBe(2);
    const e = r.elements[0];
    expect(e).toMatchObject({
      id: '@Fn/src/util.ts#helper:10',
      type: 'function',
      file: 'src/util.ts',
      line: 10,
      exported: true,
      headerStatus: 'defined',
      layer: 'service',
      capability: 'helping',
    });
  });

  it('filters by type', () => {
    const all = handlers.find_element({ query: 'src/util.ts' }) as any;
    expect(all.total).toBe(2);
    const ifaces = handlers.find_element({ query: 'src/util.ts', type: 'interface' }) as any;
    expect(ifaces.total).toBe(1);
    expect(ifaces.elements[0].name).toBe('Helper');
  });

  it('ranks exact-name matches first', () => {
    const r = handlers.find_element({ query: 'Helper' }) as any;
    expect(r.elements[0].name).toBe('Helper');
  });
});

// ---- codebase_summary -------------------------------------------------------------

describe('codebase_summary', () => {
  it('reports totals, type distribution, coverage, and edge stats', () => {
    const r = handlers.codebase_summary() as any;
    expect(r.total_elements).toBe(3);
    expect(r.elements_by_type).toEqual({ function: 2, interface: 1 });
    // pct comes from the validation report when present
    expect(r.header_coverage.pct).toBe(33.3);
    expect(r.header_coverage.by_status).toEqual({ defined: 1, missing: 2 });
    expect(r.graph.nodes).toBe(11);
    expect(r.graph.edges_by_type).toEqual({ call: 4, import: 1 });
  });
});

// ---- validation_status ------------------------------------------------------------

describe('validation_status', () => {
  it('passes the locked 12-field report through verbatim', () => {
    const r = handlers.validation_status() as any;
    expect(r.report).toEqual(FIXTURE_REPORT);
    // every locked field present and numeric — same contract the pipeline
    // output-validation-report test enforces on the producer side.
    expect(Object.keys(r.report)).toHaveLength(12);
    for (const v of Object.values(r.report)) expect(typeof v).toBe('number');
    expect(r.summary.header_coverage_pct).toBe(33.3);
    expect(r.summary.resolved_edges).toBe(4);
  });

  it('degrades gracefully when the report is missing', () => {
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-mcp-bare-'));
    try {
      fs.mkdirSync(path.join(bare, '.coderef'), { recursive: true });
      const h = buildToolHandlers(bare);
      const r = h.validation_status() as any;
      expect(r.error).toBe('validation_report_missing');
    } finally {
      fs.rmSync(bare, { recursive: true, force: true });
    }
  });
});

// ---- v2 tools (WO-MCP-V2-TOOLS-AND-PS-VALIDATION-001 P1) --------------------------

describe('hotspots', () => {
  it('ranks elements by fan-in + fan-out over resolved call+import edges, src-only by default', () => {
    const r = (handlers as any).hotspots({}) as any;
    expect(r.error).toBeUndefined();
    expect(r.src_only).toBe(true);
    const byId: Record<string, any> = {};
    for (const h of r.hotspots) byId[h.id] = h;
    // helper: called by alpha+beta (export edge does not count)
    expect(byId['@Fn/src/util.ts#helper:10'].fan_in).toBe(2);
    // cyc2: src_only excludes the test-origin call -> only cyc1's call counts
    expect(byId['@Fn/src/c2.ts#cyc2:1'].fan_in).toBe(1);
    // test-file elements are not ranked in src-only mode
    expect(byId['@Fn/__tests__/t.test.ts#tcall:1']).toBeUndefined();
    // sorted descending by score
    const scores = r.hotspots.map((h: any) => h.score);
    expect([...scores].sort((a: number, b: number) => b - a)).toEqual(scores);
  });

  it('src_only=false includes test-origin edges and test-file elements', () => {
    const r = (handlers as any).hotspots({ src_only: false }) as any;
    const byId: Record<string, any> = {};
    for (const h of r.hotspots) byId[h.id] = h;
    expect(byId['@Fn/src/c2.ts#cyc2:1'].fan_in).toBe(2);
    expect(byId['@Fn/__tests__/t.test.ts#tcall:1'].fan_out).toBe(1);
  });
});

describe('cycles', () => {
  it('detects the 2-node call cycle with members and a sample edge', () => {
    const r = (handlers as any).cycles({}) as any;
    expect(r.error).toBeUndefined();
    expect(r.total_cycles).toBe(1);
    expect(r.cycles[0].size).toBe(2);
    const members = r.cycles[0].members.map((m: any) => m.id).sort();
    expect(members).toEqual(['@Fn/src/c1.ts#cyc1:1', '@Fn/src/c2.ts#cyc2:1']);
    expect(r.cycles[0].sample_edge).toBeDefined();
  });

  it('finds no cycles over import edges alone', () => {
    const r = (handlers as any).cycles({ relationship: 'import' }) as any;
    expect(r.total_cycles).toBe(0);
  });
});

describe('what_exports', () => {
  it('returns the exported elements of a file via export edges', () => {
    const r = (handlers as any).what_exports({ file: 'src/util.ts' }) as any;
    expect(r.error).toBeUndefined();
    expect(r.total).toBe(2);
    const ids = r.exports.map((e: any) => e.id).sort();
    expect(ids).toEqual(['@Fn/src/util.ts#helper:10', '@I/src/util.ts#Helper:3']);
  });

  it('errors cleanly on a file with no export edges', () => {
    const r = (handlers as any).what_exports({ file: 'src/nope.ts' }) as any;
    expect(r.error).toBe('file_not_found');
  });
});

describe('impact_of export-edge hygiene (v2)', () => {
  it('export edges do not count as dependents — helper impact stays {alpha, beta, main}', () => {
    const r = handlers.impact_of({ element: 'helper', max_depth: 5 }) as any;
    expect(r.transitive_dependents).toBe(3);
  });
});

// ---- v2 flow tools (P2) -----------------------------------------------------------

describe('rag_search', () => {
  it('errors cleanly when no rag-index.json exists', async () => {
    const r = (await (handlers as any).rag_search({ query: 'anything' })) as any;
    expect(r.error).toBe('rag_index_missing');
  });
});

describe('diff_impact', () => {
  it('errors cleanly when the project dir is not a git repo', () => {
    const r = (handlers as any).diff_impact({}) as any;
    expect(r.error).toBe('git_diff_failed');
    expect(r.hint).toContain('git ref');
  });
});

// ---- agent-native outbound + path tools (WO-AGENT-NATIVE-CAPABILITY-GAPS-001 P1) ---
// Fixture call chain: main -> alpha -> helper (e3, e1). alpha imports Helper (e4).
// These prove the FORWARD direction is distinct from the inbound tools:
// what_this_calls(alpha) = {helper}, but what_calls(alpha) = {main}.

describe('what_this_calls (outbound)', () => {
  it('returns what the element CALLS (outbound), not who calls it', () => {
    const out = handlers.what_this_calls({ element: 'alpha' }) as any;
    expect(out.error).toBeUndefined();
    expect(out.relationship).toBe('call');
    expect(out.direction).toBe('outbound');
    expect(out.total).toBe(1);
    expect(out.callees[0].id).toBe('@Fn/src/util.ts#helper:10');
  });

  it('is direction-distinct from what_calls (X calls Y != Y calls X)', () => {
    // alpha CALLS helper (outbound); alpha is CALLED BY main (inbound).
    const outbound = handlers.what_this_calls({ element: 'alpha' }) as any;
    const inbound = handlers.what_calls({ element: 'alpha' }) as any;
    expect(outbound.callees.map((c: any) => c.name)).toEqual(['helper']);
    expect(inbound.callers.map((c: any) => c.name)).toEqual(['main']);
  });

  it('helper calls nothing outbound (it is a leaf)', () => {
    const r = handlers.what_this_calls({ element: 'helper' }) as any;
    expect(r.total).toBe(0);
  });

  it('honors the limit and sets truncated', () => {
    // main -> alpha is the only resolved outbound call from main (e5 is unresolved).
    const r = handlers.what_this_calls({ element: 'main', limit: 1 }) as any;
    expect(r.total).toBe(1);
    expect(r.returned).toBe(1);
    expect(r.truncated).toBe(false);
  });

  it('returns element_not_found / ambiguous like the inbound tools', () => {
    expect((handlers.what_this_calls({ element: 'no-such-thing' }) as any).error).toBe('element_not_found');
    const amb = handlers.what_this_calls({ element: 'dup' }) as any;
    expect(amb.error).toBe('ambiguous_element');
    expect(amb.match_count).toBe(6);
  });
});

describe('what_this_imports (outbound)', () => {
  it('returns what the element IMPORTS (outbound)', () => {
    const r = handlers.what_this_imports({ element: 'alpha' }) as any;
    expect(r.error).toBeUndefined();
    expect(r.relationship).toBe('import');
    expect(r.direction).toBe('outbound');
    expect(r.total).toBe(1);
    expect(r.imports[0].id).toBe('@I/src/util.ts#Helper:3');
  });

  it('does not mix relationship kinds (alpha calls helper but that is not an import)', () => {
    const r = handlers.what_this_imports({ element: 'main' }) as any;
    expect(r.total).toBe(0);
  });
});

describe('what_this_depends_on (transitive outbound)', () => {
  it('walks transitive forward dependencies: main depends on {alpha, helper}', () => {
    const r = handlers.what_this_depends_on({ element: 'main', max_depth: 5 }) as any;
    expect(r.error).toBeUndefined();
    expect(r.direction).toBe('outbound');
    const ids = r.sample_dependencies.map((d: any) => d.id).sort();
    expect(ids).toContain('@Fn/src/a.ts#alpha:5');
    expect(ids).toContain('@Fn/src/util.ts#helper:10');
    expect(r.transitive_dependencies).toBeGreaterThanOrEqual(2);
  });

  it('is the mirror of impact_of: helper depends on nothing outbound', () => {
    const r = handlers.what_this_depends_on({ element: 'helper', max_depth: 5 }) as any;
    expect(r.transitive_dependencies).toBe(0);
  });
});

describe('path_between', () => {
  it('shortest: returns the ordered chain main -> alpha -> helper', () => {
    const r = handlers.path_between({ source: 'main', target: 'helper' }) as any;
    expect(r.error).toBeUndefined();
    expect(r.mode).toBe('shortest');
    expect(r.found).toBe(true);
    expect(r.path.map((n: any) => n.name)).toEqual(['main', 'alpha', 'helper']);
    expect(r.length).toBe(2);
  });

  it('shortest: found=false when no directed path exists (helper -> main is backwards)', () => {
    const r = handlers.path_between({ source: 'helper', target: 'main' }) as any;
    expect(r.found).toBe(false);
    expect(r.path).toEqual([]);
  });

  it('all: enumerates simple paths source -> target (bounded)', () => {
    const r = handlers.path_between({ source: 'main', target: 'helper', mode: 'all' }) as any;
    expect(r.mode).toBe('all');
    expect(r.total).toBeGreaterThanOrEqual(1);
    // every returned path starts at main and ends at helper
    for (const p of r.paths) {
      expect(p.nodes[0].name).toBe('main');
      expect(p.nodes[p.nodes.length - 1].name).toBe('helper');
    }
  });

  it('returns element_not_found when either endpoint is unknown', () => {
    expect((handlers.path_between({ source: 'no-such', target: 'helper' }) as any).error).toBe('element_not_found');
    expect((handlers.path_between({ source: 'main', target: 'no-such' }) as any).error).toBe('element_not_found');
  });
});

// ---- P1 follow-up edge cases (REC-P1-003) -----------------------------------------
// Close the branches the initial P1 suite left unexercised: outbound truncation,
// byFile intra-file self-exclusion, and the mode=all path enumeration.

describe('what_this_calls — outbound truncation (REC-P1-003a)', () => {
  it('sets truncated=true when distinct callees exceed the limit', () => {
    // fan calls 3 distinct leaves; limit 2 must truncate.
    const r = handlers.what_this_calls({ element: 'fan', limit: 2 }) as any;
    expect(r.error).toBeUndefined();
    expect(r.total).toBe(3);
    expect(r.returned).toBe(2);
    expect(r.truncated).toBe(true);
    expect(r.callees.length).toBe(2);
  });

  it('total counts DISTINCT callees, not edges (contrast with what_calls edge count)', () => {
    const r = handlers.what_this_calls({ element: 'fan' }) as any;
    expect(r.total).toBe(3);
    expect(r.callees.map((c: any) => c.name).sort()).toEqual(['leaf1', 'leaf2', 'leaf3']);
  });
});

describe('what_this_calls — byFile intra-file self-exclusion (REC-P1-003b)', () => {
  it('a whole-file query omits calls between two elements of that same file', () => {
    // src/same.ts holds sameA + sameB; sameA calls sameB. A byFile query treats
    // both as the subject, so the intra-file edge is excluded (this is the
    // documented "what does this FILE call" semantics, not a bug).
    const byFile = handlers.what_this_calls({ element: 'src/same.ts' }) as any;
    expect(byFile.error).toBeUndefined();
    expect(byFile.total).toBe(0);
  });

  it('but an element-level query DOES return the intra-file callee', () => {
    // sameA alone (not byFile) -> sameB is a legitimate outbound callee.
    const el = handlers.what_this_calls({ element: 'sameA' }) as any;
    expect(el.total).toBe(1);
    expect(el.callees[0].name).toBe('sameB');
  });
});

describe('path_between — mode=all enumeration (REC-P1-003c)', () => {
  it('enumerates both simple paths through the diamond', () => {
    // dtop -> {dmidL, dmidR} -> dbot : exactly 2 simple paths.
    const r = handlers.path_between({ source: 'dtop', target: 'dbot', mode: 'all' }) as any;
    expect(r.error).toBeUndefined();
    expect(r.mode).toBe('all');
    expect(r.total).toBe(2);
    const mids = r.paths.map((p: any) => p.nodes[1].name).sort();
    expect(mids).toEqual(['dmidL', 'dmidR']);
    // well under the internal cap
    expect(r.internal_cap_hit).toBe(false);
  });

  it('reports internal_cap_hit=false when the enumeration is complete', () => {
    const r = handlers.path_between({ source: 'dtop', target: 'dbot', mode: 'all' }) as any;
    expect(r.internal_cap_hit).toBe(false);
    expect(r.total).toBeLessThan(50);
  });
});

// ---- unresolved_edges (WO-AGENT-NATIVE-CAPABILITY-GAPS-001 P2) ---------------------

describe('unresolved_edges', () => {
  it('defaults to unresolved + ambiguous call/import edges', () => {
    const r = handlers.unresolved_edges({}) as any;
    expect(r.error).toBeUndefined();
    // fixture: e5 (unresolved call) + ur2 (unresolved import) + am1 (ambiguous
    // call) + am2 (ambiguous import) = 4. external/builtin excluded by default.
    expect(r.total).toBe(4);
    expect(r.returned).toBe(4);
    expect(r.truncated).toBe(false);
    const statuses = new Set(r.edges.map((e: any) => e.status));
    expect([...statuses].sort()).toEqual(['ambiguous', 'unresolved']);
  });

  it('surfaces the reason on unresolved edges', () => {
    const r = handlers.unresolved_edges({ status: 'unresolved' }) as any;
    expect(r.total).toBe(2);
    const byReason = r.edges.map((e: any) => e.reason).sort();
    expect(byReason).toEqual(['dynamic call', 'module_not_found']);
    // call evidence passthrough: e5's callee-less dynamic call still carries the
    // source location so an agent can jump to the site.
    const e5 = r.edges.find((e: any) => e.reason === 'dynamic call');
    expect(e5.relationship).toBe('call');
    expect(e5.from.id).toBe('@Fn/src/main.ts#main:1');
  });

  it('surfaces candidates[] (competing symbols) on ambiguous edges', () => {
    const r = handlers.unresolved_edges({ status: 'ambiguous' }) as any;
    expect(r.total).toBe(2);
    for (const edge of r.edges) {
      expect(edge.status).toBe('ambiguous');
      expect(Array.isArray(edge.candidates)).toBe(true);
      expect(edge.candidates.length).toBe(2);
      // candidates resolve to node summaries (name/file), not bare ids.
      const names = edge.candidates.map((c: any) => c.name);
      expect(names).toEqual(['doThing', 'doThing']);
      const files = edge.candidates.map((c: any) => c.file).sort();
      expect(files).toEqual(['src/dupcall/x.ts', 'src/dupcall/y.ts']);
    }
  });

  it('facets by relationship', () => {
    const calls = handlers.unresolved_edges({ relationship: 'call' }) as any;
    // e5 (unresolved) + am1 (ambiguous) are the two non-resolved CALL edges.
    expect(calls.total).toBe(2);
    expect(calls.edges.every((e: any) => e.relationship === 'call')).toBe(true);

    const imports = handlers.unresolved_edges({ relationship: 'import' }) as any;
    // ur2 (unresolved) + am2 (ambiguous) are the two non-resolved IMPORT edges.
    expect(imports.total).toBe(2);
    expect(imports.edges.every((e: any) => e.relationship === 'import')).toBe(true);
  });

  it('facets by file (call/import site)', () => {
    const r = handlers.unresolved_edges({ file: 'src/dia.ts' }) as any;
    // ur2, am1 (from dtop), am2 (from dmidL) all have their site in src/dia.ts.
    // e5's site is src/main.ts (no sourceLocation on e5 -> excluded).
    expect(r.total).toBe(3);
    expect(r.edges.every((e: any) => (e.at ?? '').startsWith('src/dia.ts:'))).toBe(true);
  });

  it('facets by reason substring', () => {
    const r = handlers.unresolved_edges({ reason: 'multiple_candidates' }) as any;
    expect(r.total).toBe(2);
    expect(r.edges.every((e: any) => e.status === 'ambiguous')).toBe(true);
  });

  it('surfaces external/builtin only on request, with a full status_breakdown', () => {
    const ext = handlers.unresolved_edges({ status: 'external' }) as any;
    expect(ext.total).toBe(1);
    expect(ext.edges[0].specifier).toBe('left-pad');
    // status_breakdown reflects the FULL non-resolved population regardless of
    // the active facet: 2 unresolved + 2 ambiguous + 1 external.
    expect(ext.status_breakdown.unresolved).toBe(2);
    expect(ext.status_breakdown.ambiguous).toBe(2);
    expect(ext.status_breakdown.external).toBe(1);
  });

  it('paginates with offset/limit and reports truncated', () => {
    const page1 = handlers.unresolved_edges({ limit: 2 }) as any;
    expect(page1.total).toBe(4);
    expect(page1.returned).toBe(2);
    expect(page1.offset).toBe(0);
    expect(page1.truncated).toBe(true);
    const page2 = handlers.unresolved_edges({ limit: 2, offset: 2 }) as any;
    expect(page2.returned).toBe(2);
    expect(page2.offset).toBe(2);
    expect(page2.truncated).toBe(false);
    // the two pages together cover the full set with no overlap.
    const ids1 = page1.edges.map((e: any) => e.at ?? e.reason);
    const ids2 = page2.edges.map((e: any) => e.at ?? e.reason);
    expect(ids1.filter((x: any) => ids2.includes(x))).toEqual([]);
  });

  it('reconciles unfiltered counts with the validation-report aggregates', () => {
    // The tool computes its status_breakdown live over graph.json; the report
    // is the pipeline's own per-status tally. They MUST agree — this is the
    // exposure invariant: unresolved_edges enumerates exactly what
    // validation_status counts.
    const report = (handlers.validation_status() as any).report;
    const breakdown = (handlers.unresolved_edges({}) as any).status_breakdown;
    expect(breakdown.unresolved).toBe(report.unresolved_count);
    expect(breakdown.ambiguous).toBe(report.ambiguous_count);
    expect(breakdown.external ?? 0).toBe(report.external_count);
  });
});

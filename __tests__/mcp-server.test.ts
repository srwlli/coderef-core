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
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildToolHandlers, ToolHandlers, attachStaleness } from '../src/cli/coderef-mcp-server.js';
import type { ExportedGraph } from '../src/export/graph-exporter.js';
import { createHash } from 'crypto';
import { buildManifest, type ManifestSourceFile } from '../src/pipeline/staleness-manifest.js';

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
    // STUB-4NYW5W (P4): demo/example scaffolding that WOULD rank under src_only
    // (each has a resolved outbound call -> fan_out) but must be EXCLUDED, plus a
    // guardrail src file whose basename contains "example" that must STILL rank.
    { id: '@Fn/demo-all-modules.ts#demoMain:1', type: 'function', name: 'demoMain', file: 'demo-all-modules.ts', line: 1, metadata: {} },
    { id: '@Fn/examples/nextjs-api-route.ts#handler:1', type: 'function', name: 'handler', file: 'examples/nextjs-api-route.ts', line: 1, metadata: {} },
    { id: '@Fn/src/context/example-extractor.ts#extractExample:1', type: 'function', name: 'extractExample', file: 'src/context/example-extractor.ts', line: 1, metadata: {} },
    // Isolated sink for the P4 demo/example edges (no other test asserts on it).
    { id: '@Fn/src/sink.ts#demoSink:1', type: 'function', name: 'demoSink', file: 'src/sink.ts', line: 1, metadata: {} },
  ],
  edges: [
    // canonical 8-field schema + legacy compat fields (source/target/type)
    {
      id: 'e1', sourceId: '@Fn/src/a.ts#alpha:5', targetId: '@Fn/src/util.ts#helper:10',
      relationship: 'call', resolutionStatus: 'resolved',
      // P3-T4: rich resolved-call evidence — what_calls passes calleeName/
      // receiverText/scopePath through (previously dropped).
      evidence: { kind: 'resolved-call', calleeName: 'helper', receiverText: 'utils', scopePath: 'alpha' } as any,
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
    // STUB-4NYW5W (P4): resolved outbound calls from the demo/example/guardrail
    // sources -> an ISOLATED sink (demoSink) that no other test asserts on. This
    // gives demoMain/handler/extractExample a fan_out so they are ELIGIBLE to rank
    // WITHOUT perturbing helper's fan_in / what_calls / impact_of assertions. The
    // src_only demo filter must drop the first two and keep extractExample
    // (path-anchored, not a substring match on "example").
    {
      id: 'dm1', sourceId: '@Fn/demo-all-modules.ts#demoMain:1', targetId: '@Fn/src/sink.ts#demoSink:1',
      relationship: 'call', resolutionStatus: 'resolved', sourceLocation: { file: 'demo-all-modules.ts', line: 2 },
      source: '@Fn/demo-all-modules.ts#demoMain:1', target: '@Fn/src/sink.ts#demoSink:1', type: 'call',
    },
    {
      id: 'ex-eg1', sourceId: '@Fn/examples/nextjs-api-route.ts#handler:1', targetId: '@Fn/src/sink.ts#demoSink:1',
      relationship: 'call', resolutionStatus: 'resolved', sourceLocation: { file: 'examples/nextjs-api-route.ts', line: 2 },
      source: '@Fn/examples/nextjs-api-route.ts#handler:1', target: '@Fn/src/sink.ts#demoSink:1', type: 'call',
    },
    {
      id: 'eg1', sourceId: '@Fn/src/context/example-extractor.ts#extractExample:1', targetId: '@Fn/src/sink.ts#demoSink:1',
      relationship: 'call', resolutionStatus: 'resolved', sourceLocation: { file: 'src/context/example-extractor.ts', line: 2 },
      source: '@Fn/src/context/example-extractor.ts#extractExample:1', target: '@Fn/src/sink.ts#demoSink:1', type: 'call',
    },
    // P3 (WO-AGENT-NATIVE-CAPABILITY-GAPS-001): a type-only import edge.
    // resolutionStatus='typeOnly', module-grain source, targetId OMITTED — the
    // engine's real shape. specifier basename 'util' matches helper's file
    // (src/util.ts), so find_all_references surfaces it as a NON-TRAVERSABLE
    // type_reference. It is NOT in the unresolved+ambiguous default set.
    {
      id: 'to1', sourceId: '@File/src/b.ts',
      relationship: 'import', resolutionStatus: 'typeOnly', reason: 'type_only_import',
      evidence: { kind: 'unresolved-import', originSpecifier: './util.js', reason: 'type_only_import' } as any,
      sourceLocation: { file: 'src/b.ts', line: 2 },
      source: '@File/src/b.ts', target: '', type: 'import',
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
  // STUB-6CWWHQ Phase 2: sub-count of valid_edge_count. 1 of the 4 resolved
  // edges is a provisional (single_candidate_unknown_receiver) tier edge.
  provisional_count: 1,
  header_defined_count: 1,
  header_missing_count: 2,
  header_stale_count: 0,
  header_partial_count: 0,
  header_layer_mismatch_count: 0,
  header_export_mismatch_count: 0,
  header_coverage_pct: 33.3,
  // STUB-CXZ7VZ Phase 5: resolution rates (canonical, produced by buildReport;
  // hand-computed here to match). total_emitted = 4+2+2+1+0 = 9; resolvable =
  // 9 - external(1) - builtin(0) = 8.
  resolution_rate: 44.44, // 4/9
  resolved_of_resolvable: 50, // 4/8
  ambiguous_rate: 22.22, // 2/9
  provisional_rate: 25, // 1/4
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
  // P3: a real source file so source_of has bytes to slice. helper is at
  // src/util.ts line 10 (per FIXTURE_INDEX); line 10 carries a marker string
  // the source_of test asserts on.
  const utilSrc = [
    'export interface Helper {}',        // line 1
    '', '', '', '', '', '', '', '',      // lines 2-9
    'export function helper() {',         // line 10  <- helper start
    '  return HELPER_MARKER_LINE_11;',    // line 11
    '}',                                  // line 12
    '// trailing',                        // line 13
  ].join('\n');
  fs.mkdirSync(path.join(fixtureDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(fixtureDir, 'src', 'util.ts'), utilSrc);
  // P4: this fixture IS an authoritative, pre-built .coderef/ — mark graph.json +
  // index.json as the NEWEST files so build-if-missing's staleness check treats
  // them as fresh and serves them as-is (never auto-rebuilds over the hand-built
  // fixture). Without this, src/util.ts (written last) would read as newer than
  // graph.json and trigger a populate that clobbers the fixture.
  const future = new Date(Date.now() + 60_000);
  fs.utimesSync(path.join(coderefDir, 'graph.json'), future, future);
  fs.utimesSync(path.join(coderefDir, 'index.json'), future, future);
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

  it('surfaces a resolution block that reconciles with validation_status (STUB-CXZ7VZ)', () => {
    const r = handlers.codebase_summary() as any;
    // The rates come from the ValidationReport (canonical), the SAME source
    // validation_status reads — so the two tools agree on how many call edges
    // resolve. total_call_edges = 4+2+2+1+0 = 9 (all emitted), resolved = 4.
    expect(r.resolution.resolution_rate).toBe(44.44);
    expect(r.resolution.resolved_of_resolvable).toBe(50);
    expect(r.resolution.ambiguous_rate).toBe(22.22);
    expect(r.resolution.provisional_rate).toBe(25);
    expect(r.resolution.resolved_edges).toBe(4);
    expect(r.resolution.total_call_edges).toBe(9);
    // THE reconciliation invariant: codebase_summary and validation_status now
    // report the identical resolved-edge count and resolution_rate.
    const vs = handlers.validation_status() as any;
    expect(r.resolution.resolved_edges).toBe(vs.summary.resolved_edges);
    expect(r.resolution.resolution_rate).toBe(vs.summary.resolution_rate);
  });

  it('resolution block is null-safe when no validation-report.json exists', () => {
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-mcp-summary-bare-'));
    try {
      const bareCoderef = path.join(bare, '.coderef');
      fs.mkdirSync(bareCoderef, { recursive: true });
      fs.writeFileSync(path.join(bareCoderef, 'graph.json'), JSON.stringify(FIXTURE_GRAPH));
      fs.writeFileSync(path.join(bareCoderef, 'index.json'), JSON.stringify(FIXTURE_INDEX));
      // no validation-report.json — report load fails, rates fall back to null.
      const h = buildToolHandlers(bare);
      const r = h.codebase_summary() as any;
      expect(r.resolution.resolution_rate).toBeNull();
      expect(r.resolution.resolved_of_resolvable).toBeNull();
      expect(r.resolution.total_call_edges).toBeNull();
    } finally {
      fs.rmSync(bare, { recursive: true, force: true });
    }
  });
});

// ---- validation_status ------------------------------------------------------------

describe('validation_status', () => {
  it('passes the report through verbatim + surfaces provisional_edges in the summary', () => {
    const r = handlers.validation_status() as any;
    expect(r.report).toEqual(FIXTURE_REPORT);
    // every field present and numeric — same contract the pipeline
    // output-validation-report test enforces on the producer side. This
    // minimal fixture omits the optional *_src_count fields; it carries
    // provisional_count (STUB-6CWWHQ Phase 2) + the four Phase 5 resolution
    // rates (STUB-CXZ7VZ), so 17 keys.
    expect(Object.keys(r.report)).toHaveLength(17);
    for (const v of Object.values(r.report)) expect(typeof v).toBe('number');
    expect(r.summary.header_coverage_pct).toBe(33.3);
    expect(r.summary.resolved_edges).toBe(4);
    // STUB-6CWWHQ Phase 2: the provisional-trust slice surfaces in the summary
    // for agent visibility (sub-count of resolved_edges).
    expect(r.summary.provisional_edges).toBe(1);
    // STUB-CXZ7VZ Phase 5: the canonical resolution rates surface in the
    // summary — the SAME fields codebase_summary reads, so the two tools agree.
    expect(r.summary.resolution_rate).toBe(44.44); // 4/9 emitted
    expect(r.summary.resolved_of_resolvable).toBe(50); // 4/8 resolvable
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

  // STUB-4NYW5W (WO-RESOLVER-SYMBOL-TABLE-DEDUP-FIX-001 P4): demo/example
  // scaffolding pollutes the src_only leverage signal (live: demo-all-modules.ts
  // ranked in the top-8). It must be excluded under src_only, present under
  // src_only=false, and the exclusion must be PATH-ANCHORED — a real src file
  // whose basename merely contains "example" still ranks.
  it('src_only excludes demo-*.ts and examples/ elements from ranking', () => {
    const r = (handlers as any).hotspots({}) as any;
    const ids = new Set(r.hotspots.map((h: any) => h.id));
    // root demo-all-modules.ts and examples/ scaffolding are dropped...
    expect(ids.has('@Fn/demo-all-modules.ts#demoMain:1')).toBe(false);
    expect(ids.has('@Fn/examples/nextjs-api-route.ts#handler:1')).toBe(false);
    // ...GUARDRAIL: a real src file with "example" in its basename still ranks
    // (path-anchored filter, never a substring match on "example").
    expect(ids.has('@Fn/src/context/example-extractor.ts#extractExample:1')).toBe(true);
  });

  it('src_only=false includes the demo/example elements', () => {
    const r = (handlers as any).hotspots({ src_only: false }) as any;
    const ids = new Set(r.hotspots.map((h: any) => h.id));
    expect(ids.has('@Fn/demo-all-modules.ts#demoMain:1')).toBe(true);
    expect(ids.has('@Fn/examples/nextjs-api-route.ts#handler:1')).toBe(true);
    expect(ids.has('@Fn/src/context/example-extractor.ts#extractExample:1')).toBe(true);
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

describe('rag_search — Phase 9 lexical-first router', () => {
  it('answers a symbol-shaped query from the LEXICAL lane with no rag-index / Ollama', async () => {
    // Phase 9: `anything` is a single-token (symbol-shaped) query, so it routes
    // to the symbol-table BM25 lane over index.json — NO embedding, NO rag-index
    // requirement. The old hard error:'rag_index_missing' is gone; a symbol query
    // ALWAYS answers from the symbol table (empty results here, since the fixture
    // has no matching element — absence = no-data, never an error).
    const r = (await (handlers as any).rag_search({ query: 'anything' })) as any;
    expect(r.error).toBeUndefined();
    expect(r.lane).toBe('lexical');
    expect(r.routing_reason).toMatch(/lexical lane/);
    expect(Array.isArray(r.results)).toBe(true);
    expect(r.results).toEqual([]);
  });

  it('ranks a known fixture symbol at the top via the lexical lane', async () => {
    // `helper` is a fixture element — the lexical lane must find and rank it at
    // the top. The fixture also has an interface `Helper`; both tokenize to
    // `helper` and both earn the case-insensitive exact-name boost, so they TIE
    // and the deterministic id-tiebreak decides rank 0. Assert the meaningful
    // property: the top result is one of the two exact `helper`/`Helper` matches
    // (not a bad match), both are present, and ordering is byte-deterministic.
    const r = (await (handlers as any).rag_search({ query: 'helper' })) as any;
    expect(r.lane).toBe('lexical');
    expect(r.results.length).toBeGreaterThan(0);
    const topNames = r.results.slice(0, 2).map((h: any) => h.name);
    expect(topNames).toContain('helper');
    expect(topNames).toContain('Helper');
    expect(String(r.results[0].name).toLowerCase()).toBe('helper');
    // Determinism: identical query ⇒ identical ordering.
    const r2 = (await (handlers as any).rag_search({ query: 'helper' })) as any;
    expect(r2.results).toEqual(r.results);
  });

  it('accepts the Phase 4 expand param on the lexical lane (params accepted, lane consistent)', async () => {
    // expand=true must not perturb the lexical envelope's lane/routing when the
    // hits have no graph neighbors; the new params are accepted and the bare vs
    // expanded lane/results are consistent.
    const bare = (await (handlers as any).rag_search({ query: 'anything' })) as any;
    const expanded = (await (handlers as any).rag_search({ query: 'anything', expand: true, neighbor_limit: 5 })) as any;
    expect(bare.lane).toBe('lexical');
    expect(expanded.lane).toBe('lexical');
    expect(expanded.results).toEqual(bare.results);
  });

  it('DEGRADES a conceptual query to the lexical lane when no rag-index exists (no hard error)', async () => {
    // A multi-word conceptual query would route to the embedding lane, but the
    // fixture has no rag-index.json — Phase 9 degrades to the lexical lane and
    // still answers (lane:'lexical', degraded:true) instead of the old
    // error:'rag_index_missing'.
    const r = (await (handlers as any).rag_search({ query: 'how does the helper work' })) as any;
    expect(r.error).toBeUndefined();
    expect(r.lane).toBe('lexical');
    expect(r.degraded).toBe(true);
    expect(r.routing_reason).toMatch(/lexical fallback/);
  });

  it('lane:"lexical" forces the symbol-table lane even for a conceptual query', async () => {
    const r = (await (handlers as any).rag_search({ query: 'how does the helper work', lane: 'lexical' })) as any;
    expect(r.lane).toBe('lexical');
    expect(r.error).toBeUndefined();
    // Forced-lexical is NOT a degrade — it is the requested lane.
    expect(r.degraded).toBeUndefined();
  });
});

describe('diff_impact', () => {
  it('errors cleanly when the project dir is not a git repo', () => {
    const r = (handlers as any).diff_impact({}) as any;
    expect(r.error).toBe('git_diff_failed');
    expect(r.hint).toContain('git ref');
  });
});

describe('tests_for_change', () => {
  it('is registered as a handler', () => {
    expect(typeof (handlers as any).tests_for_change).toBe('function');
  });

  it('errors cleanly when the project dir is not a git repo (shares diff_impact seam)', () => {
    const r = (handlers as any).tests_for_change({}) as any;
    expect(r.error).toBe('git_diff_failed');
    expect(r.hint).toContain('git ref');
  });
});

// type_hierarchy (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P5). Self-contained
// fixture with heritage edges so we don't perturb the shared FIXTURE_GRAPH aggregates.
describe('type_hierarchy', () => {
  it('is registered as a handler', () => {
    expect(typeof (handlers as any).type_hierarchy).toBe('function');
  });

  it('returns supertypes UP and subtypes DOWN over extends/implements edges', () => {
    const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-mcp-typehier-'));
    try {
      const cr = path.join(proj, '.coderef');
      fs.mkdirSync(cr, { recursive: true });
      // Dog extends Animal; Dog implements Pet. (Dog -> Animal extends, Dog -> Pet implements)
      const graph: ExportedGraph = {
        version: '1.0.0', exportedAt: 1,
        nodes: [
          { id: '@Class/src/a.ts#Animal:1', type: 'Class', name: 'Animal', file: 'src/a.ts', line: 1, metadata: {} },
          { id: '@Class/src/p.ts#Pet:1', type: 'Class', name: 'Pet', file: 'src/p.ts', line: 1, metadata: {} },
          { id: '@Class/src/d.ts#Dog:1', type: 'Class', name: 'Dog', file: 'src/d.ts', line: 1, metadata: {} },
        ],
        edges: [
          {
            id: 'h1', sourceId: '@Class/src/d.ts#Dog:1', targetId: '@Class/src/a.ts#Animal:1',
            relationship: 'call', resolutionStatus: 'resolved', sourceLocation: { file: 'src/d.ts', line: 1 },
            source: '@Class/src/d.ts#Dog:1', target: '@Class/src/a.ts#Animal:1', type: 'extends',
          },
          {
            id: 'h2', sourceId: '@Class/src/d.ts#Dog:1', targetId: '@Class/src/p.ts#Pet:1',
            relationship: 'call', resolutionStatus: 'resolved', sourceLocation: { file: 'src/d.ts', line: 1 },
            source: '@Class/src/d.ts#Dog:1', target: '@Class/src/p.ts#Pet:1', type: 'implements',
          },
        ],
        statistics: { nodeCount: 3, edgeCount: 2, edgesByType: { extends: 1, implements: 1 }, densityRatio: 0 },
      };
      // Write all three artifacts + mark them newest so build-if-missing serves the
      // hand-built fixture instead of auto-populating the tmp dir (mirrors the main
      // fixture setup). index.json mirrors the three class elements.
      const index = {
        elements: graph.nodes.map(n => ({ file: n.file, line: n.line, codeRefId: n.id, name: n.name })),
      };
      fs.writeFileSync(path.join(cr, 'graph.json'), JSON.stringify(graph));
      fs.writeFileSync(path.join(cr, 'index.json'), JSON.stringify(index));
      fs.writeFileSync(path.join(cr, 'validation-report.json'), JSON.stringify({ ok: true }));
      const future = new Date(Date.now() + 60_000);
      fs.utimesSync(path.join(cr, 'graph.json'), future, future);
      fs.utimesSync(path.join(cr, 'index.json'), future, future);

      const h = buildToolHandlers(proj);

      // UP from Dog: Animal (extends) + Pet (implements), both depth 1.
      const up = h.type_hierarchy({ element: '@Class/src/d.ts#Dog:1', direction: 'up' }) as any;
      expect(up.error).toBeUndefined();
      expect(up.supertype_count).toBe(2);
      const kinds = Object.fromEntries(up.supertypes.map((s: any) => [s.name, s.kind]));
      expect(kinds).toEqual({ Animal: 'extends', Pet: 'implements' });
      expect(up.subtype_count).toBe(0);

      // DOWN from Animal: Dog (depth 1).
      const down = h.type_hierarchy({ element: '@Class/src/a.ts#Animal:1', direction: 'down' }) as any;
      expect(down.subtype_count).toBe(1);
      expect(down.subtypes[0].name).toBe('Dog');

      // absence=no-data: Pet has no supertypes/subtypes below it.
      const petUp = h.type_hierarchy({ element: '@Class/src/p.ts#Pet:1', direction: 'up' }) as any;
      expect(petUp.supertype_count).toBe(0);
      expect(petUp.note).toMatch(/no-data/i);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });
});

// api_diff (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P6). Self-contained
// fixture: snapshot the current exports, then diff. index.json carries exported +
// parameters so the manifest has real signatures.
describe('api_diff', () => {
  it('is registered as a handler', () => {
    expect(typeof (handlers as any).api_diff).toBe('function');
  });

  function writeRepo(elements: any[]): string {
    const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-mcp-apidiff-'));
    const cr = path.join(proj, '.coderef');
    fs.mkdirSync(cr, { recursive: true });
    const graph: ExportedGraph = {
      version: '1.0.0', exportedAt: 1, nodes: [], edges: [],
      statistics: { nodeCount: 0, edgeCount: 0, edgesByType: {}, densityRatio: 0 },
    };
    fs.writeFileSync(path.join(cr, 'graph.json'), JSON.stringify(graph));
    fs.writeFileSync(path.join(cr, 'index.json'), JSON.stringify({ elements }));
    fs.writeFileSync(path.join(cr, 'validation-report.json'), JSON.stringify({ ok: true }));
    const future = new Date(Date.now() + 60_000);
    fs.utimesSync(path.join(cr, 'graph.json'), future, future);
    fs.utimesSync(path.join(cr, 'index.json'), future, future);
    return proj;
  }

  it('no-data when no baseline snapshot exists (never a false 0-breaking)', () => {
    const proj = writeRepo([{ name: 'a', type: 'function', file: 'src/a.ts', line: 1, exported: true, parameters: [], codeRefIdNoLine: 'a' }]);
    try {
      const h = buildToolHandlers(proj);
      const r = h.api_diff({}) as any;
      expect(r.no_data).toBe(true);
      expect(r.added).toEqual([]);
      expect(r.removed).toEqual([]);
      expect(r.warnings.some((w: string) => /BEFORE manifest absent/.test(w))).toBe(true);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });

  it('snapshot then diff surfaces an added export (no composite verdict)', () => {
    const proj = writeRepo([{ name: 'a', type: 'function', file: 'src/a.ts', line: 1, exported: true, parameters: [], codeRefIdNoLine: 'a' }]);
    try {
      const h = buildToolHandlers(proj);
      // Snapshot the current single-export surface.
      const snap = h.api_diff({ snapshot: true }) as any;
      expect(snap.action).toBe('snapshot');
      expect(snap.exported_count).toBe(1);
      expect(fs.existsSync(path.join(proj, '.coderef', 'api-manifest-baseline.json'))).toBe(true);

      // Add a second exported element to the index, then diff.
      const cr = path.join(proj, '.coderef');
      fs.writeFileSync(path.join(cr, 'index.json'), JSON.stringify({
        elements: [
          { name: 'a', type: 'function', file: 'src/a.ts', line: 1, exported: true, parameters: [], codeRefIdNoLine: 'a' },
          { name: 'b', type: 'function', file: 'src/b.ts', line: 1, exported: true, parameters: [{}], codeRefIdNoLine: 'b' },
        ],
      }));
      const future = new Date(Date.now() + 120_000);
      fs.utimesSync(path.join(cr, 'index.json'), future, future);

      const h2 = buildToolHandlers(proj);
      const d = h2.api_diff({}) as any;
      expect(d.no_data).toBe(false);
      expect(d.added_count).toBe(1);
      expect(d.added[0].name).toBe('b');
      expect(d.removed_count).toBe(0);
      expect(d.unchanged_count).toBe(1);
      // Surfaces-not-verdicts: no composite breaking-count field.
      expect(d).not.toHaveProperty('breaking_count');
      expect(d.note).toMatch(/SURFACES, NOT VERDICTS/);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });
});

// dependency_rules (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P7). Graph
// nodes carry metadata.layer; one observed edge service -> cli. rules.json
// declares constraints checked against it. No exit code — MCP only reports.
describe('dependency_rules', () => {
  it('is registered as a handler', () => {
    expect(typeof (handlers as any).dependency_rules).toBe('function');
  });

  function writeRepo(rules?: unknown): string {
    const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-mcp-deprules-'));
    const cr = path.join(proj, '.coderef');
    fs.mkdirSync(cr, { recursive: true });
    const nodes = [
      { id: '@Fn/svc.ts#doWork:1', file: 'svc.ts', type: 'function', name: 'doWork', line: 1, metadata: { layer: 'service' } },
      { id: '@Fn/cli.ts#main:1', file: 'cli.ts', type: 'function', name: 'main', line: 1, metadata: { layer: 'cli' } },
    ];
    const edges = [{ id: 'e1', sourceId: '@Fn/svc.ts#doWork:1', source: '@Fn/svc.ts#doWork:1', target: '@Fn/cli.ts#main:1', type: 'calls' }];
    const graph: ExportedGraph = {
      version: '1.0.0', exportedAt: 1, nodes: nodes as any, edges: edges as any,
      statistics: { nodeCount: nodes.length, edgeCount: edges.length, edgesByType: { calls: 1 }, densityRatio: 0 },
    };
    fs.writeFileSync(path.join(cr, 'graph.json'), JSON.stringify(graph));
    fs.writeFileSync(path.join(cr, 'index.json'), JSON.stringify({ elements: nodes }));
    fs.writeFileSync(path.join(cr, 'validation-report.json'), JSON.stringify({ ok: true }));
    const future = new Date(Date.now() + 60_000);
    fs.utimesSync(path.join(cr, 'graph.json'), future, future);
    fs.utimesSync(path.join(cr, 'index.json'), future, future);
    if (rules !== undefined) fs.writeFileSync(path.join(cr, 'rules.json'), JSON.stringify(rules));
    return proj;
  }

  it('no rules.json -> no_data (never a false all-pass), edges still surfaced', () => {
    const proj = writeRepo();
    try {
      const h = buildToolHandlers(proj);
      const r = h.dependency_rules({}) as any;
      expect(r.no_data).toBe(true);
      expect(r.rule_count).toBe(0);
      expect(r.observed_layer_edge_count).toBe(1);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });

  it('a forbid violation is surfaced with the offending edge (no composite score)', () => {
    const proj = writeRepo({ forbid: [{ from: 'service', to: 'cli' }] });
    try {
      const h = buildToolHandlers(proj);
      const r = h.dependency_rules({}) as any;
      expect(r.no_data).toBe(false);
      expect(r.violated_count).toBe(1);
      expect(r.rules[0].status).toBe('violated');
      expect(r.rules[0].violatingEdges[0].sourceLayer).toBe('service');
      expect(r.rules[0].violatingEdges[0].targetLayer).toBe('cli');
      expect(r).not.toHaveProperty('score');
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });

  it('a satisfied forbid rule reports satisfied, 0 violated', () => {
    const proj = writeRepo({ forbid: [{ from: 'cli', to: 'service' }] });
    try {
      const h = buildToolHandlers(proj);
      const r = h.dependency_rules({}) as any;
      expect(r.violated_count).toBe(0);
      expect(r.satisfied_count).toBe(1);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
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

// ---- source_of (WO-AGENT-NATIVE-CAPABILITY-GAPS-001 P3) ---------------------------

describe('source_of', () => {
  it('returns the source slice from disk for a known element (no RAG)', () => {
    const r = handlers.source_of({ element: 'helper' }) as any;
    expect(r.error).toBeUndefined();
    expect(r.name).toBe('helper');
    expect(r.file).toBe('src/util.ts');
    expect(r.start_line).toBe(10);
    // the slice begins at the element's start line and includes its body.
    expect(r.source).toContain('export function helper() {');
    expect(r.source).toContain('HELPER_MARKER_LINE_11');
    // it must NOT include the interface at line 1 (window starts at line 10).
    expect(r.source).not.toContain('export interface Helper');
  });

  it('honors the context window and flags char truncation', () => {
    const small = handlers.source_of({ element: 'helper', context: 2 }) as any;
    expect(small.lines_returned).toBeLessThanOrEqual(2);
    const clipped = handlers.source_of({ element: 'helper', max_chars: 10 }) as any;
    expect(clipped.char_truncated).toBe(true);
    expect(clipped.source.length).toBeLessThanOrEqual(10);
  });

  it('resolves by exact codeRefId', () => {
    const r = handlers.source_of({ element: '@Fn/src/util.ts#helper:10' }) as any;
    expect(r.name).toBe('helper');
    expect(r.source).toContain('HELPER_MARKER_LINE_11');
  });

  it('returns element_not_found for an unknown element', () => {
    const r = handlers.source_of({ element: 'no-such-symbol-anywhere' }) as any;
    expect(r.error).toBe('element_not_found');
  });

  it('errors cleanly (source_unavailable) when the file is gone', () => {
    // alpha resolves in the index but src/a.ts was never written to the fixture.
    const r = handlers.source_of({ element: 'alpha' }) as any;
    expect(r.error).toBe('source_unavailable');
    expect(r.file).toBe('src/a.ts');
  });
});

// ---- find_all_references (WO-AGENT-NATIVE-CAPABILITY-GAPS-001 P3) ------------------

describe('find_all_references', () => {
  it('unions resolved call-sites + import-sites for a symbol', () => {
    const r = handlers.find_all_references({ element: 'helper' }) as any;
    expect(r.error).toBeUndefined();
    // helper is called by alpha (e1) + beta (e2): 2 call-sites. No inbound
    // resolved import edges target helper directly.
    expect(r.call_site_count).toBe(2);
    const callerNames = r.call_sites.map((c: any) => c.name).sort();
    expect(callerNames).toEqual(['alpha', 'beta']);
  });

  it('surfaces type-only references as additive + non-traversable', () => {
    const r = handlers.find_all_references({ element: 'helper' }) as any;
    // to1 is a typeOnly import with specifier './util.js' — basename 'util'
    // matches helper's file src/util.ts, so it surfaces as a type_reference.
    expect(r.type_reference_count).toBe(1);
    expect(r.type_references[0].traversable).toBe(false);
    expect(r.type_references[0].specifier).toBe('./util.js');
    // total unions all three categories.
    expect(r.total_references).toBe(r.call_site_count + r.import_site_count + r.type_reference_count);
    expect(r.note).toContain('typeOnly');
  });

  it('does not reclassify typeOnly — validation counts + resolved tools unchanged', () => {
    // The typeOnly edge must remain invisible to the resolved-only tools and
    // must not appear in unresolved_edges' unresolved/ambiguous default set
    // (RISK-06: additive, never reclassified).
    const wc = handlers.what_calls({ element: 'helper' }) as any;
    expect(wc.total).toBe(2); // still just the 2 resolved calls
    const ue = handlers.unresolved_edges({}) as any;
    expect(ue.status_breakdown.typeOnly).toBeUndefined(); // not in the non-resolved set
  });

  it('returns element_not_found for an unknown symbol', () => {
    const r = handlers.find_all_references({ element: 'no-such-symbol-anywhere' }) as any;
    expect(r.error).toBe('element_not_found');
  });
});

// ---- what_calls evidence passthrough (P3-T4) --------------------------------------

describe('what_calls (P3 evidence passthrough)', () => {
  it('passes through calleeName / receiverText / scopePath on call edges', () => {
    const r = handlers.what_calls({ element: 'helper' }) as any;
    // e1 (alpha -> helper) carries resolved-call evidence.
    const fromAlpha = r.callers.find((c: any) => c.name === 'alpha');
    expect(fromAlpha.callee).toBe('helper');
    expect(fromAlpha.receiver).toBe('utils');
    expect(fromAlpha.scope).toBe('alpha');
    // the existing contract is preserved: total + at unchanged.
    expect(r.total).toBe(2);
    expect(fromAlpha.at).toBe('src/a.ts:6');
  });

  it('omits evidence fields on edges that carry none', () => {
    const r = handlers.what_calls({ element: 'helper' }) as any;
    // e2 (beta -> helper) has no evidence object — no callee/receiver/scope keys.
    const fromBeta = r.callers.find((c: any) => c.name === 'beta');
    expect(fromBeta.callee).toBeUndefined();
    expect(fromBeta.receiver).toBeUndefined();
  });
});

// ---- CLI/MCP parity tools (WO-...-CLI-MCP-PARITY-001 P6) ===========================
// Five new tools bring the surface to 23. Two of these are GUARD tests that go RED
// if a safety property is removed:
//   (b) rename_preview writes NOTHING to disk — RED if an apply path is ever added.
//   (d) reindex writes ONLY under <tmp>/.coderef/ — RED if a stray write escapes.

// ---- (a) pack_context -------------------------------------------------------------

describe('pack_context', () => {
  it('returns a bundle + manifest for a fixture element', () => {
    // helper (src/util.ts) exists on disk in the fixture; it is a leaf (no
    // outbound deps) so the bundle is the focus block alone.
    const r = handlers.pack_context({ element: 'helper' }) as any;
    expect(r.error).toBeUndefined();
    expect(typeof r.bundle).toBe('string');
    expect(r.bundle.length).toBeGreaterThan(0);
    // the focus block leads with the element's own header + source window.
    expect(r.bundle).toContain('@Fn/src/util.ts#helper:10');
    expect(r.bundle).toContain('[focus]');
    expect(r.manifest).toBeDefined();
    expect(r.manifest.focus).toBe('helper');
    // the focus is always the first included entry.
    expect(r.manifest.included[0].id).toBe('@Fn/src/util.ts#helper:10');
  });

  it('honors token_budget (a tiny budget still admits the focus, drops far deps)', () => {
    // main -> alpha -> helper: main has a dependency closure. A tiny budget must
    // still include the focus but record dropped deps in the manifest — nothing
    // is silently omitted.
    const generous = handlers.pack_context({ element: 'main', token_budget: 8000 }) as any;
    const tiny = handlers.pack_context({ element: 'main', token_budget: 1 }) as any;
    expect(tiny.error).toBeUndefined();
    expect(tiny.manifest.budget).toBe(1);
    // focus always present even when it alone exceeds the budget.
    expect(tiny.manifest.included.length).toBeGreaterThanOrEqual(1);
    // the tiny budget admits no MORE than the generous one (monotonic).
    expect(tiny.manifest.included.length).toBeLessThanOrEqual(generous.manifest.included.length);
    // if the generous pack had deps, the tiny one must have dropped at least one.
    if (generous.manifest.included.length > 1) {
      expect(tiny.manifest.dropped.length).toBeGreaterThan(0);
    }
  });

  it('returns element_not_found for an unknown focus (throw caught cleanly)', () => {
    const r = handlers.pack_context({ element: 'no-such-focus-anywhere' }) as any;
    expect(r.error).toBe('element_not_found');
  });
});

// ---- (b) rename_preview — GUARD: writes NOTHING -----------------------------------

describe('rename_preview', () => {
  it('returns the rename plan (sites, target ids, ambiguities) as a dry run', () => {
    // helper is called by alpha (e1) + beta (e2); its declaration is a site too.
    const r = handlers.rename_preview({ old_name: 'helper', new_name: 'helper2' }) as any;
    expect(r.error).toBeUndefined();
    expect(r.old_name).toBe('helper');
    expect(r.new_name).toBe('helper2');
    expect(r.preview_only).toBe(true);
    expect(Array.isArray(r.sites)).toBe(true);
    // at least the declaration + 2 call sites are attributed.
    expect(r.site_count).toBeGreaterThanOrEqual(3);
    expect(r.target_ids).toContain('@Fn/src/util.ts#helper:10');
    expect(Array.isArray(r.ambiguities)).toBe(true);
    // there is NO apply flag on the output — this is preview-only.
    expect(r.applied).toBeUndefined();
  });

  it('returns element_not_found for an unknown symbol (throw caught cleanly)', () => {
    const r = handlers.rename_preview({ old_name: 'no-such-symbol', new_name: 'x' }) as any;
    expect(r.error).toBe('element_not_found');
  });

  // GUARD (b): the whole point of rename_preview is that it is DRY-RUN. This test
  // runs it against a dedicated temp project whose source files carry REAL
  // rename sites (declaration + call sites), snapshots the WHOLE project tree
  // (path -> bytes) before + after, and asserts it is byte-identical. It goes
  // RED the moment anyone wires an apply/force path into rename_preview: an
  // apply would rewrite src/*.ts -> a file's bytes change -> assertion fails.
  it('GUARD: writes NOTHING to disk (fails if an apply path is ever added)', () => {
    const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-mcp-rename-guard-'));
    try {
      const cr = path.join(proj, '.coderef');
      fs.mkdirSync(cr, { recursive: true });
      fs.mkdirSync(path.join(proj, 'src'), { recursive: true });
      // renameMe: declared in a.ts, called from b.ts — real sites to plan over.
      fs.writeFileSync(path.join(proj, 'src', 'a.ts'), 'export function renameMe(x) {\n  return x;\n}\n');
      fs.writeFileSync(path.join(proj, 'src', 'b.ts'), "import { renameMe } from './a.js';\nexport const q = renameMe(1);\n");
      const graph: ExportedGraph = {
        version: '1.0.0', exportedAt: 1,
        nodes: [
          { id: '@Fn/src/a.ts#renameMe:1', type: 'function', name: 'renameMe', file: 'src/a.ts', line: 1, metadata: {} },
          { id: '@Fn/src/b.ts#q:2', type: 'variable', name: 'q', file: 'src/b.ts', line: 2, metadata: {} },
        ],
        edges: [
          {
            id: 'rc1', sourceId: '@Fn/src/b.ts#q:2', targetId: '@Fn/src/a.ts#renameMe:1',
            relationship: 'call', resolutionStatus: 'resolved',
            sourceLocation: { file: 'src/b.ts', line: 2 },
            source: '@Fn/src/b.ts#q:2', target: '@Fn/src/a.ts#renameMe:1', type: 'call',
          },
        ],
        statistics: { nodeCount: 2, edgeCount: 1, edgesByType: { call: 1 }, densityRatio: 0 },
      };
      fs.writeFileSync(path.join(cr, 'graph.json'), JSON.stringify(graph));

      // Snapshot the whole project tree (bytes) BEFORE the preview.
      const snapshotTree = (root: string): Map<string, string> => {
        const snap = new Map<string, string>();
        const walk = (dir: string): void => {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else snap.set(full, fs.readFileSync(full, 'utf8'));
          }
        };
        walk(root);
        return snap;
      };
      const before = snapshotTree(proj);

      const h = buildToolHandlers(proj);
      const r = h.rename_preview({ old_name: 'renameMe', new_name: 'renameMe2' }) as any;
      expect(r.error).toBeUndefined();
      expect(r.preview_only).toBe(true);
      expect(r.site_count).toBeGreaterThanOrEqual(2); // declaration + 1 call site

      // THE GUARD: the entire tree is byte-identical — nothing was written.
      const after = snapshotTree(proj);
      expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
      for (const [file, content] of before) {
        expect(after.get(file)).toBe(content);
      }
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });
});

// ---- (c) rag_status ---------------------------------------------------------------

describe('rag_status', () => {
  it('returns metadata + health for a fixture index', async () => {
    const withIndex = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-mcp-ragstatus-'));
    try {
      const cr = path.join(withIndex, '.coderef');
      fs.mkdirSync(cr, { recursive: true });
      fs.writeFileSync(path.join(cr, 'rag-index.json'), JSON.stringify({
        version: '1.0', createdAt: new Date().toISOString(), provider: 'ollama',
        store: 'json', chunksIndexed: 42, filesProcessed: 3, processingTimeMs: 1234,
        stats: { tokensUsed: 100, avgEmbeddingTimeMs: 1, byType: {}, byLanguage: {} },
      }));
      // a vector store file so health can reach 'healthy'.
      fs.writeFileSync(path.join(cr, 'coderef-vectors.json'), JSON.stringify({ vectors: [] }));
      const h = buildToolHandlers(withIndex);
      const r = (await h.rag_status()) as any;
      expect(r.error).toBeUndefined();
      expect(r.indexExists).toBe(true);
      expect(r.vectorsExist).toBe(true);
      expect(r.health).toBe('healthy');
      expect(r.metadata.provider).toBe('ollama');
      expect(r.metadata.chunksIndexed).toBe(42);
    } finally {
      fs.rmSync(withIndex, { recursive: true, force: true });
    }
  });

  it('reports a clean "no index" status when none exists', async () => {
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-mcp-ragstatus-bare-'));
    try {
      fs.mkdirSync(path.join(bare, '.coderef'), { recursive: true });
      const h = buildToolHandlers(bare);
      const r = (await h.rag_status()) as any;
      // no throw, no crash — a clean 'missing' verdict.
      expect(r.error).toBeUndefined();
      expect(r.exists).toBe(false);
      expect(r.indexExists).toBe(false);
      expect(r.health).toBe('missing');
      expect(r.metadata).toBeNull();
    } finally {
      fs.rmSync(bare, { recursive: true, force: true });
    }
  });
});

// ---- (d) reindex — GUARD: writes ONLY under <tmp>/.coderef/ ------------------------

describe('reindex', () => {
  const OLD_LAYERS = process.env.CODEREF_LAYERS_PATH;
  afterEach(() => {
    if (OLD_LAYERS === undefined) delete process.env.CODEREF_LAYERS_PATH;
    else process.env.CODEREF_LAYERS_PATH = OLD_LAYERS;
  });

  // Snapshot every file OUTSIDE <proj>/.coderef/ as path -> content. Used to
  // prove the reindex touched nothing outside the .coderef/ write surface.
  function snapshotOutsideCoderef(root: string): Map<string, string> {
    const snap = new Map<string, string>();
    const coderefRoot = path.join(root, '.coderef');
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (full === coderefRoot) continue; // the ONE allowed write surface
        if (entry.isDirectory()) walk(full);
        else snap.set(full, fs.readFileSync(full, 'utf8'));
      }
    };
    walk(root);
    return snap;
  }

  // GUARD (d): reindex runs the REAL populate pipeline (delegated) against a tiny
  // temp project. It snapshots every file OUTSIDE <tmp>/.coderef/ (path -> bytes)
  // before + after and asserts that set is IDENTICAL — the write-CONFINEMENT
  // property. It goes RED if a stray write ever escapes .coderef/ (e.g. a
  // source-header rewrite of src/a.ts, an output-dir arg, or a new write path):
  // a changed/added/removed file outside .coderef/ breaks an assertion below.
  it('GUARD: writes ONLY under <tmp>/.coderef/ (fails if a write escapes)', async () => {
    const proj = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-mcp-reindex-')));
    // Pin a local layers.json so the pipeline never depends on a sibling repo.
    const layersPath = path.join(proj, 'layers.json');
    fs.writeFileSync(layersPath, JSON.stringify({
      layers: [{ id: 'service' }, { id: 'cli' }, { id: 'test_support' }, { id: 'ui' }],
    }));
    process.env.CODEREF_LAYERS_PATH = layersPath;
    fs.mkdirSync(path.join(proj, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(proj, 'src', 'a.ts'),
      'export function foo() { return 1; }\nexport function bar() { return foo(); }\n',
    );

    const coderefRoot = path.join(proj, '.coderef');
    // Snapshot everything outside .coderef/ BEFORE the reindex.
    const before = snapshotOutsideCoderef(proj);

    try {
      const h = buildToolHandlers(proj);
      const r = (await h.reindex({})) as any;
      // the delegated pipeline succeeded and reported a compact summary.
      expect(r.error).toBeUndefined();
      expect(r.success).toBe(true);
      expect(r.elements).toBeGreaterThanOrEqual(2); // foo + bar
      expect(r.files).toBe(1);
      expect(r.outputPath).toBe(coderefRoot);

      // THE GUARD: the set of files outside .coderef/ and their bytes are
      // IDENTICAL before and after — no source mutation, no stray output.
      const after = snapshotOutsideCoderef(proj);
      expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
      for (const [file, content] of before) {
        expect(after.get(file)).toBe(content);
      }
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  }, 60_000);
});

// ---- (e) rag_index — clean error when the embedder is unreachable ------------------

describe('rag_index', () => {
  const SAVED = {
    base: process.env.CODEREF_LLM_BASE_URL,
    localOnly: process.env.CODEREF_RAG_LOCAL_ONLY,
  };
  afterEach(() => {
    const restore = (k: string, v: string | undefined) => {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    };
    restore('CODEREF_LLM_BASE_URL', SAVED.base);
    restore('CODEREF_RAG_LOCAL_ONLY', SAVED.localOnly);
  });

  it('surfaces a clean error (not a crash) when Ollama is unreachable', async () => {
    const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-mcp-ragindex-'));
    try {
      const cr = path.join(proj, '.coderef');
      fs.mkdirSync(cr, { recursive: true });
      fs.mkdirSync(path.join(proj, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(proj, 'src', 'a.ts'),
        '/**\n * @coderef-semantic: 1.0.0\n * @layer service\n * @capability x\n */\nexport function foo() { return 1; }\n',
      );
      // The phase-6 gate needs a passing validation-report on disk.
      fs.writeFileSync(path.join(cr, 'validation-report.json'), JSON.stringify({ valid_edge_count: 1, header_coverage_pct: 100 }));
      fs.writeFileSync(path.join(cr, 'index.json'), JSON.stringify({ elements: [] }));
      fs.writeFileSync(path.join(cr, 'graph.json'), JSON.stringify({ version: '1.0.0', exportedAt: 1, nodes: [], edges: [], statistics: {} }));

      // Point the local embedder at a dead port -> every embed batch fails.
      process.env.CODEREF_LLM_BASE_URL = 'http://127.0.0.1:9';
      process.env.CODEREF_RAG_LOCAL_ONLY = '1';

      const h = buildToolHandlers(proj);
      const r = (await h.rag_index()) as any;
      // The server did NOT crash — it returned a clean error record. When Ollama
      // is unreachable, no chunks embed, so the handler surfaces
      // embedding_unavailable (never a silent zero-chunk "success").
      expect(r.error).toBe('embedding_unavailable');
      expect(r.provider).toBe('ollama');
      expect(r.hint).toMatch(/ollama/i);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  }, 60_000);
});

// ---- Phase 6: response_format + offset wiring (STUB-8H3YV0) ----------------------
// Pure-module behavior is pinned in __tests__/cli/mcp-response-format.test.ts;
// these assert the params actually reach the fixture handlers and that the
// default (absent-param) shape is byte-unchanged.

describe('Phase 6 — response_format', () => {
  it('what_calls concise keeps counts but reduces callers to identity fields', () => {
    const detailed = handlers.what_calls({ element: 'helper' }) as any;
    const concise = handlers.what_calls({ element: 'helper', response_format: 'concise' }) as any;
    // counts preserved (total-preserving)
    expect(concise.total).toBe(detailed.total);
    expect(concise.returned).toBe(detailed.returned);
    expect(concise.format).toBe('concise');
    // body detail dropped: detailed callers carry `at` (+ maybe callee); concise does not
    const dHasExtra = detailed.callers.some((c: any) => 'at' in c || 'confidence' in c);
    expect(dHasExtra).toBe(true);
    for (const c of concise.callers) {
      expect('at' in c).toBe(false);
      expect('confidence' in c).toBe(false);
      // identity fields still present
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('name');
    }
    // same caller identities, same order
    expect(concise.callers.map((c: any) => c.id)).toEqual(detailed.callers.map((c: any) => c.id));
  });

  it('what_this_calls concise reduces callees; detailed is unchanged', () => {
    const concise = handlers.what_this_calls({ element: 'fan', response_format: 'concise' }) as any;
    expect(concise.total).toBe(3);
    expect(concise.format).toBe('concise');
    expect(concise.callees).toHaveLength(3);
  });

  it('default (absent response_format) is byte-identical to explicit detailed', () => {
    const bare = handlers.what_calls({ element: 'helper' });
    const detailed = handlers.what_calls({ element: 'helper', response_format: 'detailed' });
    expect(bare).toEqual(detailed);
    // and carries NO concise marker
    expect((bare as any).format).toBeUndefined();
  });
});

describe('Phase 6 — offset pagination', () => {
  it('what_this_calls pages via offset with a correct has_more', () => {
    // fan calls 3 leaves. limit 2, offset 0 -> first 2 + has_more.
    const p1 = handlers.what_this_calls({ element: 'fan', limit: 2, offset: 0 }) as any;
    expect(p1.total).toBe(3);
    expect(p1.offset).toBe(0);
    expect(p1.limit).toBe(2);
    expect(p1.callees).toHaveLength(2);
    expect(p1.has_more).toBe(true);
    // second page: offset 2 -> the remaining 1, has_more false.
    const p2 = handlers.what_this_calls({ element: 'fan', limit: 2, offset: 2 }) as any;
    expect(p2.offset).toBe(2);
    expect(p2.callees).toHaveLength(1);
    expect(p2.has_more).toBe(false);
    // windows are disjoint and cover the full set
    const ids = [...p1.callees, ...p2.callees].map((c: any) => c.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('what_calls reports the paged envelope {offset,limit,total,has_more}', () => {
    const r = handlers.what_calls({ element: 'helper', limit: 1, offset: 0 }) as any;
    expect(r.total).toBe(2); // helper has 2 callers
    expect(r.offset).toBe(0);
    expect(r.limit).toBe(1);
    expect(r.returned).toBe(1);
    expect(r.has_more).toBe(true); // 0 + 1 < 2
    // truncated retained for back-compat and tracks has_more here
    expect(r.truncated).toBe(true);
  });

  it('offset past the end yields an empty page with has_more=false (not an error)', () => {
    const r = handlers.what_calls({ element: 'helper', offset: 999 }) as any;
    expect(r.total).toBe(2); // true count preserved — no silent truncation
    expect(r.callers).toEqual([]);
    expect(r.has_more).toBe(false);
  });

  it('unresolved_edges still pages on the refactored shared helper', () => {
    // The pre-existing offset tool now runs through paginate(); its envelope
    // gains limit/has_more while keeping total/offset/status_breakdown.
    const r = handlers.unresolved_edges({ limit: 1, offset: 0 }) as any;
    expect(typeof r.total).toBe('number');
    expect(r.offset).toBe(0);
    expect(r.limit).toBe(1);
    expect(r).toHaveProperty('has_more');
    expect(r).toHaveProperty('status_breakdown');
    expect(Array.isArray(r.edges)).toBe(true);
  });
});

// ---- Phase 7: symbol_context consolidated card (STUB-G1VH0S) --------------------
// Pure card-assembly is pinned in __tests__/query/symbol-context.test.ts; these
// assert the JOIN reaches the fixture handler — every facet sourced from the
// substrate the sibling tools already expose, no new analysis.

describe('Phase 7 — symbol_context', () => {
  it('joins identity + header + neighborhood + references + test_linkage + staleness in ONE call', () => {
    const card = handlers.symbol_context({ element: 'helper' }) as any;
    // identity — the nodeSummary grade
    expect(card.identity).toEqual({
      id: '@Fn/src/util.ts#helper:10',
      name: 'helper',
      type: 'function',
      file: 'src/util.ts',
      line: 10,
    });
    // header PRESENCE — from the index element (find_element grade)
    expect(card.header).toEqual({
      status: 'defined',
      exported: true,
      layer: 'service',
      capability: 'helping',
    });
    // neighborhood — the ego-graph: helper is CALLED by alpha + beta (inbound)
    expect(card.neighborhood.resolved).toBe(true);
    const callerIds = card.neighborhood.callers.neighbors.map((n: any) => n.id).sort();
    expect(callerIds).toEqual(['@Fn/src/a.ts#alpha:5', '@Fn/src/b.ts#beta:8']);
    // references — 2 inbound call sites, 0 import sites
    expect(card.references.call_site_count).toBe(2);
    expect(card.references.import_site_count).toBe(0);
    expect(card.references.total).toBe(2);
    // staleness — fixture graph.json is stamped NEWER than src/util.ts, so the
    // mtime heuristic reports fresh (basis labelled, NOT a hash-manifest claim)
    expect(card.staleness.stale).toBe(false);
    expect(card.staleness.basis).toBe('element-file-mtime-vs-graph');
  });

  it('directions are not swapped — callers are inbound, callees/imports outbound', () => {
    const card = handlers.symbol_context({ element: 'helper' }) as any;
    // helper is a leaf: no outbound calls/imports of its own
    expect(card.neighborhood.callees.neighbors).toHaveLength(0);
    expect(card.neighborhood.imports.neighbors).toHaveLength(0);
    // but it HAS inbound callers (proven above) — the direction is real
    expect(card.neighborhood.callers.neighbors.length).toBeGreaterThan(0);
  });

  it('test_linkage counts inbound refs from test files (cyc2 is called by a *.test.ts)', () => {
    // cyc2 is called by tcall in __tests__/t.test.ts (edge te1)
    const card = handlers.symbol_context({ element: 'cyc2' }) as any;
    expect(card.test_linkage.test_ref_count).toBe(1);
    expect(card.test_linkage.sample[0].id).toBe('@Fn/__tests__/t.test.ts#tcall:1');
    // helper's callers are src (alpha/beta), not tests -> 0 test refs (no-data)
    const helperCard = handlers.symbol_context({ element: 'helper' }) as any;
    expect(helperCard.test_linkage.test_ref_count).toBe(0);
  });

  it('absence is no-data — a header-less element reports status:missing, not an error', () => {
    // alpha has headerStatus:'missing' in the index; it is NOT an error envelope
    const card = handlers.symbol_context({ element: 'alpha' }) as any;
    expect(card.error).toBeUndefined();
    expect(card.header.status).toBe('missing');
    expect(card.header.exported).toBe(false);
    // alpha calls helper (outbound) and is called by main (inbound) — both present
    expect(card.neighborhood.callees.neighbors.map((n: any) => n.id)).toContain('@Fn/src/util.ts#helper:10');
    expect(card.neighborhood.callers.neighbors.map((n: any) => n.id)).toContain('@Fn/src/main.ts#main:1');
  });

  it('is a single-symbol card — an ambiguous (>1) query returns the ambiguity envelope', () => {
    const r = handlers.symbol_context({ element: 'dup' }) as any; // 6 dups
    expect(r.error).toBe('ambiguous_element');
    expect(r.match_count).toBe(6);
  });

  it('not-found element returns the shared notFound envelope', () => {
    const r = handlers.symbol_context({ element: 'no_such_symbol_xyz' }) as any;
    expect(r.error).toBe('element_not_found');
  });

  it('include_source attaches a bounded body slice; default omits it', () => {
    const bare = handlers.symbol_context({ element: 'helper' }) as any;
    expect(bare.source).toBeUndefined();
    const withSrc = handlers.symbol_context({ element: 'helper', include_source: true }) as any;
    expect(withSrc.source).toBeDefined();
    // the slice starts at helper's line and carries the marker on line 11
    expect(withSrc.source.start_line).toBe(10);
    expect(withSrc.source.source).toContain('HELPER_MARKER_LINE_11');
  });

  it('cap bounds each facet with a declared truncation flag', () => {
    // helper has 2 callers; cap 1 keeps 1 and flags the ego-graph direction
    const card = handlers.symbol_context({ element: 'helper', cap: 1 }) as any;
    expect(card.neighborhood.callers.neighbors).toHaveLength(1);
    expect(card.neighborhood.callers.truncated).toBe(true);
    expect(card.neighborhood.callers.total).toBe(2);
    // references sample also honors the cap
    expect(card.references.sample).toHaveLength(1);
    expect(card.references.truncated).toBe(true);
    expect(card.references.total).toBe(2); // true count preserved
  });

  it('response_format concise preserves counts, drops list bodies, and is genuinely smaller', () => {
    const detailed = handlers.symbol_context({ element: 'helper', response_format: 'detailed' }) as any;
    const concise = handlers.symbol_context({ element: 'helper', response_format: 'concise' }) as any;
    expect(concise.format).toBe('concise');
    // counts/totals PRESERVED (surfaces-not-verdicts — never lose the count)
    expect(concise.references.total).toBe(2);
    expect(concise.references.call_site_count).toBe(2);
    expect(concise.neighborhood.callers.total).toBe(2);
    expect(concise.test_linkage.test_ref_count).toBe(0);
    expect(concise.staleness.basis).toBe('element-file-mtime-vs-graph');
    // but the neighbor/site ARRAYS are dropped (that's the token cut)
    expect(concise.neighborhood.callers.neighbors).toBeUndefined();
    expect(concise.references.sample).toBeUndefined();
    // and concise is strictly smaller than detailed on the same symbol
    const size = (o: unknown) => JSON.stringify(o).length;
    expect(size(concise)).toBeLessThan(size(detailed));
    // concise drops the (opt-in) source slice even if requested
    const conciseSrc = handlers.symbol_context({ element: 'helper', include_source: true, response_format: 'concise' }) as any;
    expect(conciseSrc.source).toBeUndefined();
    // default (absent) === explicit detailed, no concise marker
    const bare = handlers.symbol_context({ element: 'helper' });
    expect(bare).toEqual(detailed);
    expect((bare as any).format).toBeUndefined();
  });

  it('is deterministic — identical inputs yield a byte-identical card', () => {
    expect(handlers.symbol_context({ element: 'helper' }))
      .toEqual(handlers.symbol_context({ element: 'helper' }));
  });
});

// ---- Phase 8 — staleness attach (perRepo seam, WO-...-PROGRAM-001 / STUB-G5PDE9)-
// attachStaleness is the module-level function perRepo calls on every success
// payload. These pin the ADDITIVE, non-clobbering, error-safe attach contract
// against a real tmp .coderef/ (the verdict logic itself is pinned in
// __tests__/query/staleness-check.test.ts).
describe('Phase 8 — attachStaleness', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) {
      try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  function makeRepo(withManifest: boolean): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'staleness-wire-'));
    dirs.push(root);
    const coderef = path.join(root, '.coderef');
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.mkdirSync(coderef, { recursive: true });
    const aAbs = path.join(root, 'src', 'a.ts');
    fs.writeFileSync(aAbs, 'export const a = 1;\n');
    if (withManifest) {
      const files: ManifestSourceFile[] = [{ path: 'src/a.ts', size: fs.statSync(aAbs).size }];
      const manifest = buildManifest(
        files,
        () => createHash('sha256').update(fs.readFileSync(aAbs)).digest('hex'),
        '2026-07-17T00:00:00.000Z',
      );
      fs.writeFileSync(path.join(coderef, 'manifest.json'), JSON.stringify(manifest));
    }
    fs.writeFileSync(path.join(coderef, 'graph.json'), JSON.stringify({ version: '1.0.0', nodes: [], edges: [] }));
    return root;
  }

  it('attaches a compact fresh block to a success payload (hash basis)', () => {
    const root = makeRepo(true);
    const payload: Record<string, unknown> = { result: 'ok' };
    attachStaleness(payload, root, process.cwd());
    expect(payload.staleness).toEqual({ stale: false, stale_count: 0, basis: 'scan-time-hash-manifest' });
  });

  it('degrades to basis:manifest-absent when no manifest is present', () => {
    const root = makeRepo(false);
    const payload: Record<string, unknown> = { result: 'ok' };
    attachStaleness(payload, root, process.cwd());
    expect((payload.staleness as any).basis).toBe('manifest-absent');
  });

  it('NEVER annotates an error envelope', () => {
    const root = makeRepo(true);
    const payload: Record<string, unknown> = { error: 'tool_failed', hint: 'x' };
    attachStaleness(payload, root, process.cwd());
    expect('staleness' in payload).toBe(false);
  });

  it('does NOT clobber a handler-provided staleness field', () => {
    const root = makeRepo(true);
    const payload: Record<string, unknown> = { result: 'ok', staleness: { mine: true } };
    attachStaleness(payload, root, process.cwd());
    expect(payload.staleness).toEqual({ mine: true });
  });

  it('is best-effort — an unresolvable root leaves the payload untouched', () => {
    const payload: Record<string, unknown> = { result: 'ok' };
    attachStaleness(payload, path.join(os.tmpdir(), 'no-such-dir-xyz-staleness'), process.cwd());
    expect('staleness' in payload).toBe(false);
  });
});

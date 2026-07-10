/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability pipeline-output-validation-graph-integrity-test
 */

/**
 * Phase 6 — output-validation-graph-integrity unit test (AC-01, AC-02,
 * AC-07, AC-10).
 *
 * Six sub-tests, one per GI-* check. Each has a PASS fixture (clean Phase 5
 * graph slice) and a FAIL fixture (injected violation). Inline fixtures
 * keep the unit test fast and free of orchestrator overhead — the
 * validator is a pure function over (state, graph, options) so it can be
 * exercised with minimal stubs.
 */

import { describe, expect, it } from 'vitest';
import {
  validatePipelineState,
  type ValidatePipelineStateOptions,
} from '../../src/pipeline/output-validator.js';
import type { PipelineState } from '../../src/pipeline/types.js';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';

const layerEnum: ValidatePipelineStateOptions['layerEnum'] = [
  'ui_component', 'service', 'utility', 'data_access', 'api', 'integration',
  'domain', 'validation', 'parser', 'formatter', 'cli', 'configuration',
  'test_support',
];

function makeState(): PipelineState {
  return {
    projectPath: '/tmp/p',
    files: new Map(),
    elements: [],
    imports: [],
    calls: [],
    rawImports: [],
    rawCalls: [],
    rawExports: [],
    headerFacts: new Map(),
    headerImportFacts: [],
    headerParseErrors: [],
    importResolutions: [],
    callResolutions: [],
    graph: makeGraph([], []),
    sources: new Map(),
    options: {},
    metadata: {
      startTime: 0,
      filesScanned: 0,
      elementsExtracted: 0,
      relationshipsExtracted: 0,
    },
  };
}

function makeGraph(
  nodes: ExportedGraph['nodes'],
  edges: ExportedGraph['edges'],
): ExportedGraph {
  return {
    version: 'phase5',
    exportedAt: 0,
    nodes,
    edges,
    statistics: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      edgesByType: {},
      densityRatio: 0,
    },
  };
}

const ALPHA = { id: '@Fn/src/alpha.ts#a:1', type: 'function', name: 'a', file: 'src/alpha.ts', line: 1 };
const BETA  = { id: '@Fn/src/beta.ts#b:1',  type: 'function', name: 'b', file: 'src/beta.ts',  line: 1 };

describe('Phase 6 GI-1: node ID uniqueness', () => {
  it('PASS: distinct node ids', () => {
    const r = validatePipelineState(makeState(), makeGraph([ALPHA, BETA], []), { layerEnum });
    expect(r.errors.filter(e => e.check === 'node_id_uniqueness')).toEqual([]);
    expect(r.ok).toBe(true);
  });
  it('FAIL: two nodes share an id', () => {
    const dup = { ...BETA, id: ALPHA.id };
    const r = validatePipelineState(makeState(), makeGraph([ALPHA, dup], []), { layerEnum });
    const violations = r.errors.filter(e => e.check === 'node_id_uniqueness');
    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations[0].kind).toBe('graph_integrity');
    expect(r.ok).toBe(false);
  });
});

describe('Resolution rates (STUB-CXZ7VZ, Phase 5): report reconciles the two tools', () => {
  // Fixture: 5 resolved (1 provisional) + 2 unresolved + 2 ambiguous + 1 external
  // + 1 builtin = 11 emitted edges. buildReport counts purely by resolutionStatus.
  const GAMMA = { id: '@Fn/src/gamma.ts#c:1', type: 'function', name: 'c', file: 'src/gamma.ts', line: 1 };
  const rEdge = (id: string, provisional = false): ExportedGraph['edges'][0] => ({
    id, sourceId: ALPHA.id, targetId: BETA.id, relationship: 'call', resolutionStatus: 'resolved',
    source: '', target: '', type: 'call',
    ...(provisional ? { evidence: { confidence: 'provisional' } } : {}),
  });
  const sEdge = (id: string, status: NonNullable<ExportedGraph['edges'][0]['resolutionStatus']>): ExportedGraph['edges'][0] => ({
    id, sourceId: ALPHA.id, targetId: BETA.id, relationship: 'call', resolutionStatus: status,
    source: '', target: '', type: 'call',
  });

  it('computes each rate over the correct denominator (2dp)', () => {
    const edges = [
      rEdge('r1'), rEdge('r2'), rEdge('r3'), rEdge('r4'), rEdge('r5', true),
      sEdge('u1', 'unresolved'), sEdge('u2', 'unresolved'),
      sEdge('a1', 'ambiguous'), sEdge('a2', 'ambiguous'),
      sEdge('x1', 'external'), sEdge('b1', 'builtin'),
    ];
    const r = validatePipelineState(makeState(), makeGraph([ALPHA, BETA, GAMMA], edges), { layerEnum });
    const rep = r.report;
    // total_emitted = 11; resolvable = 11 - external(1) - builtin(1) = 9.
    expect(rep.valid_edge_count).toBe(5);
    expect(rep.provisional_count).toBe(1);
    // resolution_rate = 5/11 = 45.45 (all-emitted denominator — the stub's number).
    expect(rep.resolution_rate).toBe(45.45);
    // resolved_of_resolvable = 5/9 = 55.56 — ALWAYS >= resolution_rate (external/
    // builtin excluded because they are correctly-not-fabricated, not failures).
    expect(rep.resolved_of_resolvable).toBe(55.56);
    expect(rep.resolved_of_resolvable).toBeGreaterThan(rep.resolution_rate);
    // ambiguous_rate = 2/11 = 18.18 (same all-emitted denominator).
    expect(rep.ambiguous_rate).toBe(18.18);
    // provisional_rate = 1/5 = 20 (denominator = valid_edge_count, the resolved slice).
    expect(rep.provisional_rate).toBe(20);
    // Every rate is a bounded number — the additive-contract invariant.
    for (const k of ['resolution_rate', 'resolved_of_resolvable', 'ambiguous_rate', 'provisional_rate'] as const) {
      expect(typeof rep[k]).toBe('number');
      expect(rep[k]).toBeGreaterThanOrEqual(0);
      expect(rep[k]).toBeLessThanOrEqual(100);
    }
  });

  it('handles vacuous denominators: empty graph -> resolution 0, resolvable 100, provisional 0', () => {
    const r = validatePipelineState(makeState(), makeGraph([], []), { layerEnum });
    const rep = r.report;
    // total_emitted = 0 -> resolution_rate/ambiguous_rate = 0.
    expect(rep.resolution_rate).toBe(0);
    expect(rep.ambiguous_rate).toBe(0);
    // resolvable = 0 -> resolved_of_resolvable is vacuously 100 (mirrors
    // header_coverage_pct's empty-denominator convention).
    expect(rep.resolved_of_resolvable).toBe(100);
    // valid_edge_count = 0 -> provisional_rate = 0.
    expect(rep.provisional_rate).toBe(0);
  });

  it('all-external/builtin graph: resolution_rate 0 but resolved_of_resolvable stays 100 (no resolvable edges)', () => {
    const edges = [sEdge('x1', 'external'), sEdge('x2', 'external'), sEdge('b1', 'builtin')];
    const r = validatePipelineState(makeState(), makeGraph([ALPHA, BETA], edges), { layerEnum });
    const rep = r.report;
    // total_emitted = 3, valid = 0 -> resolution_rate = 0.
    expect(rep.resolution_rate).toBe(0);
    // resolvable = 3 - 2 - 1 = 0 -> vacuously 100 (never divides by zero).
    expect(rep.resolved_of_resolvable).toBe(100);
  });
});

describe('Phase 6 GI-2: resolved edge endpoint existence', () => {
  it('PASS: resolved edge endpoints in nodes', () => {
    const r = validatePipelineState(
      makeState(),
      makeGraph(
        [ALPHA, BETA],
        [{ id: 'e1', sourceId: ALPHA.id, targetId: BETA.id, relationship: 'import', resolutionStatus: 'resolved', source: '', target: '', type: 'import' }],
      ),
      { layerEnum },
    );
    expect(r.errors.filter(e => e.check === 'resolved_edge_endpoint_existence')).toEqual([]);
    expect(r.ok).toBe(true);
  });
  it('FAIL: resolved edge targetId missing from nodes', () => {
    const r = validatePipelineState(
      makeState(),
      makeGraph(
        [ALPHA],
        [{ id: 'e1', sourceId: ALPHA.id, targetId: '@Fn/src/missing.ts#x:1', relationship: 'import', resolutionStatus: 'resolved', source: '', target: '', type: 'import' }],
      ),
      { layerEnum },
    );
    const violations = r.errors.filter(e => e.check === 'resolved_edge_endpoint_existence');
    expect(violations.length).toBe(1);
    expect(violations[0].details.missing).toBe('targetId');
    expect(r.ok).toBe(false);
  });
});

describe('Phase 6 GI-3: no dangling resolved edges (Phase 5 honest-demotion invariant, AC-07)', () => {
  it('PASS: no resolved edges with undefined targetId', () => {
    const r = validatePipelineState(
      makeState(),
      makeGraph(
        [ALPHA, BETA],
        [{ id: 'e1', sourceId: ALPHA.id, targetId: BETA.id, relationship: 'import', resolutionStatus: 'resolved', source: '', target: '', type: 'import' }],
      ),
      { layerEnum },
    );
    expect(r.errors.filter(e => e.check === 'no_dangling_resolved_edges')).toEqual([]);
    expect(r.ok).toBe(true);
  });
  it('FAIL: resolved edge with undefined targetId trips phase5_demotion', () => {
    const r = validatePipelineState(
      makeState(),
      makeGraph(
        [ALPHA],
        [{ id: 'e1', sourceId: ALPHA.id, relationship: 'import', resolutionStatus: 'resolved', source: '', target: '', type: 'import' }],
      ),
      { layerEnum },
    );
    const violations = r.errors.filter(e => e.check === 'no_dangling_resolved_edges');
    expect(violations.length).toBe(1);
    expect(violations[0].kind).toBe('phase5_demotion');
    expect(r.ok).toBe(false);
  });
});

describe('Phase 6 GI-4: valid relationship enum', () => {
  it('PASS: all relationships in enum', () => {
    const r = validatePipelineState(
      makeState(),
      makeGraph([ALPHA, BETA], [
        { id: 'e1', sourceId: ALPHA.id, targetId: BETA.id, relationship: 'import',        resolutionStatus: 'resolved', source: '', target: '', type: 'import' },
        { id: 'e2', sourceId: ALPHA.id, targetId: BETA.id, relationship: 'call',          resolutionStatus: 'resolved', source: '', target: '', type: 'call' },
        { id: 'e3', sourceId: ALPHA.id, targetId: BETA.id, relationship: 'header-import', resolutionStatus: 'resolved', source: '', target: '', type: 'header-import' },
      ]),
      { layerEnum },
    );
    expect(r.errors.filter(e => e.check === 'valid_relationship_enum')).toEqual([]);
  });
  it('FAIL: out-of-enum relationship', () => {
    const r = validatePipelineState(
      makeState(),
      makeGraph([ALPHA, BETA], [
        { id: 'e1', sourceId: ALPHA.id, targetId: BETA.id, relationship: 'mystery' as never, resolutionStatus: 'resolved', source: '', target: '', type: 'mystery' },
      ]),
      { layerEnum },
    );
    const violations = r.errors.filter(e => e.check === 'valid_relationship_enum');
    expect(violations.length).toBe(1);
    expect(violations[0].details.relationship).toBe('mystery');
    expect(r.ok).toBe(false);
  });
});

describe('Phase 6 GI-5: valid resolutionStatus enum', () => {
  it('PASS: all 8 statuses accepted', () => {
    const statuses: Array<NonNullable<ExportedGraph['edges'][0]['resolutionStatus']>> = [
      'resolved', 'unresolved', 'ambiguous', 'external', 'builtin', 'dynamic', 'typeOnly', 'stale',
    ];
    for (const s of statuses) {
      const edge: ExportedGraph['edges'][0] = s === 'resolved'
        ? { id: 'e', sourceId: ALPHA.id, targetId: BETA.id, relationship: 'import', resolutionStatus: s, source: '', target: '', type: 'import' }
        : { id: 'e', sourceId: ALPHA.id, relationship: 'import', resolutionStatus: s, source: '', target: '', type: 'import' };
      const r = validatePipelineState(makeState(), makeGraph([ALPHA, BETA], [edge]), { layerEnum });
      expect(r.errors.filter(e => e.check === 'valid_resolution_status_enum')).toEqual([]);
    }
  });
  it('FAIL: out-of-enum resolutionStatus', () => {
    const r = validatePipelineState(
      makeState(),
      makeGraph([ALPHA, BETA], [
        { id: 'e1', sourceId: ALPHA.id, relationship: 'import', resolutionStatus: 'magic' as never, source: '', target: '', type: 'import' },
      ]),
      { layerEnum },
    );
    const violations = r.errors.filter(e => e.check === 'valid_resolution_status_enum');
    expect(violations.length).toBe(1);
    expect(violations[0].details.resolutionStatus).toBe('magic');
    expect(r.ok).toBe(false);
  });
});

describe('Phase 6 GI-6: no duplicate node identities (name+file+line tuple)', () => {
  it('PASS: no two nodes share name+file+line tuple', () => {
    const r = validatePipelineState(makeState(), makeGraph([ALPHA, BETA], []), { layerEnum });
    expect(r.errors.filter(e => e.check === 'no_duplicate_node_identities')).toEqual([]);
    expect(r.ok).toBe(true);
  });
  it('PASS (reframed): nested functions sharing name+file at distinct lines DO NOT trip GI-6', () => {
    // Two `traverse` functions in the same file at different lines —
    // legitimately distinct nested functions. Pre-reframe this would have
    // failed GI-6; post-reframe it passes because the line differs.
    const traverseA = { ...ALPHA, id: '@Fn/src/scanner.ts#traverse:100', name: 'traverse', file: 'src/scanner.ts', line: 100 };
    const traverseB = { ...BETA,  id: '@Fn/src/scanner.ts#traverse:200', name: 'traverse', file: 'src/scanner.ts', line: 200 };
    const r = validatePipelineState(makeState(), makeGraph([traverseA, traverseB], []), { layerEnum });
    expect(r.errors.filter(e => e.check === 'no_duplicate_node_identities')).toEqual([]);
  });
  it('FAIL: two nodes share name AND file AND line (genuine collision)', () => {
    const collision = { ...ALPHA, id: '@Fn/src/alpha.ts#a:1-dup' };
    const r = validatePipelineState(makeState(), makeGraph([ALPHA, collision], []), { layerEnum });
    const violations = r.errors.filter(e => e.check === 'no_duplicate_node_identities');
    expect(violations.length).toBe(1);
    expect((violations[0].details as { ids: string[] }).ids).toEqual([ALPHA.id, collision.id]);
    expect((violations[0].details as { line: number }).line).toBe(1);
    expect(r.ok).toBe(false);
  });
});

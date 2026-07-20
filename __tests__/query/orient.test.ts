/**
 * orient composite + vector-staleness tests
 * (WO-CODE-INTELLIGENCE-LEVERAGE-WIRING-PROGRAM-001 P4, REC-003 + REC-006).
 *
 * Pins the PURE seams both edges (MCP orient tool, coderef-query --type=orient)
 * share: composeOrient determinism / budget respect / no-data behavior,
 * rankHotspotsFromGraph ordering, and the compareVectorStamps freshness
 * comparator (fires on stale vectors, silent on fresh, null on absent stamps).
 */

import { describe, it, expect } from 'vitest';
import {
  ORIENT_DEFAULT_TOKEN_BUDGET,
  ORIENT_STRUCTURED_RESERVE,
  skeletonBudgetFor,
  rankHotspotsFromGraph,
  condenseSummary,
  condenseValidation,
  composeOrient,
  type OrientGraphEdge,
  type OrientGraphNode,
  type OrientInputs,
  type OrientSkeletonBlock,
} from '../../src/query/orient.js';
import { compareVectorStamps } from '../../src/query/staleness-check.js';

function skeletonFixture(text = '# repo map (skeleton): fixture\nsrc/a.ts (in 2 / out 0)\n'): OrientSkeletonBlock {
  return {
    text,
    estimated_tokens: Math.ceil(text.length / 4),
    token_budget: 700,
    included_files: 1,
    omitted_files: 0,
    warnings: [],
  };
}

function fullInputs(): OrientInputs {
  return {
    skeleton: skeletonFixture(),
    summary: { total_elements: 3, elements_by_type: { function: 2, class: 1 }, generated_at: '2026-07-19T00:00:00Z' },
    validation: { resolution_rate: 21.58, unresolved_count: 10, ambiguous_count: 2, header_coverage_pct: 90.5 },
    staleness: { stale: false, stale_count: 0, basis: 'scan-time-hash-manifest' },
    vector_staleness: { stale: false, vectors_created_at: '2026-07-19T01:00:00Z', index_generated_at: '2026-07-19T00:00:00Z' },
    hotspots: [
      { id: '@Fn/src/a.ts#a:1', name: 'a', file: 'src/a.ts', line: 1, fan_in: 5, fan_out: 1, score: 6 },
      { id: '@Fn/src/b.ts#b:1', name: 'b', file: 'src/b.ts', line: 1, fan_in: 2, fan_out: 1, score: 3 },
    ],
    token_budget: ORIENT_DEFAULT_TOKEN_BUDGET,
  };
}

describe('composeOrient', () => {
  it('is deterministic: identical inputs produce identical envelopes', () => {
    const a = composeOrient(fullInputs());
    const b = composeOrient(fullInputs());
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it('carries every block and reports estimated tokens within budget on a small fixture', () => {
    const env = composeOrient(fullInputs());
    expect(env.orientation?.text).toContain('repo map');
    expect(env.summary).toBeTruthy();
    expect(env.validation).toBeTruthy();
    expect(env.staleness).toBeTruthy();
    expect(env.vector_staleness).toBeTruthy();
    expect(env.hotspot_count).toBe(2);
    expect(env.no_data).toEqual([]);
    expect(env.estimated_tokens).toBeGreaterThan(0);
    expect(env.estimated_tokens).toBeLessThanOrEqual(env.token_budget);
    expect(env.warnings).toEqual([]);
  });

  it('names every absent block in no_data on an unindexed fixture (never throws, never guesses)', () => {
    const env = composeOrient({
      skeleton: null,
      summary: null,
      validation: null,
      staleness: null,
      vector_staleness: null,
      hotspots: null,
      token_budget: ORIENT_DEFAULT_TOKEN_BUDGET,
    });
    expect(env.no_data).toEqual([
      'skeleton_map',
      'codebase_summary',
      'validation_report',
      'staleness',
      'vector_staleness',
      'hotspots',
    ]);
    expect(env.orientation).toBeNull();
    expect(env.hotspots).toBeNull();
    expect(env.hotspot_count).toBe(0);
  });

  it('trims hotspots deterministically when over budget, declaring each trim', () => {
    const inputs = fullInputs();
    // 10 hotspots with long ids + a tiny budget forces both trim stages.
    inputs.hotspots = Array.from({ length: 10 }, (_, i) => ({
      id: `@Fn/src/some/deeply/nested/module-${i}.ts#exportedFunctionName${i}:${i + 1}`,
      name: `exportedFunctionName${i}`,
      file: `src/some/deeply/nested/module-${i}.ts`,
      line: i + 1,
      fan_in: 10 - i,
      fan_out: 1,
      score: 11 - i,
    }));
    inputs.token_budget = 200;
    const env = composeOrient(inputs);
    expect(env.hotspot_count).toBeLessThan(10);
    expect(env.warnings.length).toBeGreaterThan(0);
    expect(env.warnings.join(' ')).toContain('trimmed');
  });

  it('caps hotspots at 10 even when more are supplied', () => {
    const inputs = fullInputs();
    inputs.hotspots = Array.from({ length: 25 }, (_, i) => ({
      id: `@Fn/x${i}`, name: `x${i}`, file: `src/x${i}.ts`, line: 1, fan_in: i, fan_out: 0, score: i,
    }));
    inputs.token_budget = 100000;
    const env = composeOrient(inputs);
    expect(env.hotspot_count).toBe(10);
  });
});

describe('skeletonBudgetFor', () => {
  it('reserves the structured-blocks budget and floors small budgets', () => {
    expect(skeletonBudgetFor(ORIENT_DEFAULT_TOKEN_BUDGET)).toBe(
      ORIENT_DEFAULT_TOKEN_BUDGET - ORIENT_STRUCTURED_RESERVE,
    );
    expect(skeletonBudgetFor(100)).toBeGreaterThanOrEqual(300);
  });
});

describe('rankHotspotsFromGraph', () => {
  const nodes: OrientGraphNode[] = [
    { id: 'A', name: 'a', file: 'src/a.ts', line: 1 },
    { id: 'B', name: 'b', file: 'src/b.ts', line: 1 },
    { id: 'C', name: 'c', file: 'src/c.ts', line: 1 },
    { id: 'T', name: 't', file: '__tests__/t.test.ts', line: 1 },
  ];
  const byId = new Map(nodes.map(n => [n.id, n]));
  const edge = (s: string, t: string, extra: Partial<OrientGraphEdge> = {}): OrientGraphEdge => ({
    sourceId: s,
    targetId: t,
    relationship: 'call',
    resolutionStatus: 'resolved',
    ...extra,
  });

  it('ranks by fan-in + fan-out, deterministic tiebreak by id', () => {
    const edges = [edge('B', 'A'), edge('C', 'A'), edge('A', 'C')];
    const ranked = rankHotspotsFromGraph(edges, byId, 10);
    expect(ranked[0].id).toBe('A'); // fan_in 2 + fan_out 1
    expect(ranked[0].score).toBe(3);
    // B (out 1) and C (in 1 + out 1 = 2): C outranks B; equal scores tiebreak by id asc
    expect(ranked.map(r => r.id)).toEqual(['A', 'C', 'B']);
  });

  it('excludes unresolved edges, non-call/import relationships, test-origin edges, and test-file elements', () => {
    const edges = [
      edge('B', 'A', { resolutionStatus: 'unresolved' }),
      edge('B', 'A', { relationship: 'export' }),
      edge('B', 'A', { evidence: { testOrigin: true } }),
      edge('T', 'A'), // T is a test file: contributes to A's fan-in but is itself dropped
    ];
    const ranked = rankHotspotsFromGraph(edges, byId, 10);
    expect(ranked.map(r => r.id)).toEqual(['A']);
    expect(ranked[0].fan_in).toBe(1);
  });
});

describe('condense helpers', () => {
  it('condenseSummary reports null on fully absent artifacts and toplines otherwise', () => {
    expect(condenseSummary(null, null)).toBeNull();
    const s = condenseSummary(
      { totalElements: 5, elementsByType: { function: 5 }, generatedAt: 'x' },
      { statistics: { nodeCount: 7, edgeCount: 9, edgesByType: { call: 9 } } },
    );
    expect(s?.total_elements).toBe(5);
    expect((s?.graph as any).nodes).toBe(7);
  });

  it('condenseValidation is null on an absent report, never a guessed zero', () => {
    expect(condenseValidation(null)).toBeNull();
    const v = condenseValidation({ resolution_rate: 21.58, header_coverage_pct: 90.53 });
    expect(v?.resolution_rate).toBe(21.58);
    expect(v?.unresolved_count).toBeNull();
  });
});

describe('compareVectorStamps (vector-staleness WARN, REC-006)', () => {
  it('fires the WARN when vectors predate the index (the live 07-10 vs 07-19 evidence class)', () => {
    const r = compareVectorStamps('2026-07-10T06:42:34.802Z', '2026-07-19T08:44:27.520Z');
    expect(r?.stale).toBe(true);
    expect(r?.warning).toContain('predates');
    expect(r?.suggestion).toContain('rag_index');
  });

  it('stays silent (no warning field) when vectors are fresh', () => {
    const r = compareVectorStamps('2026-07-19T09:00:00Z', '2026-07-19T08:44:27.520Z');
    expect(r?.stale).toBe(false);
    expect(r?.warning).toBeUndefined();
    expect(r?.suggestion).toBeUndefined();
  });

  it('equal stamps are fresh (vectors built from that exact index)', () => {
    const r = compareVectorStamps('2026-07-19T08:44:27.520Z', '2026-07-19T08:44:27.520Z');
    expect(r?.stale).toBe(false);
  });

  it('returns null (no_data) on absent or unparseable stamps — never a guessed verdict', () => {
    expect(compareVectorStamps(null, '2026-07-19T00:00:00Z')).toBeNull();
    expect(compareVectorStamps('2026-07-19T00:00:00Z', undefined)).toBeNull();
    expect(compareVectorStamps('not-a-date', '2026-07-19T00:00:00Z')).toBeNull();
  });
});

/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability scip-resolution-delta-tests
 */

/**
 * Pure computeScipResolutionDelta tests (WO-...-GENRE-FEATURES-PROGRAM-001 P11).
 *
 * Synthetic ScipIndex + elements + edges — no decode, no I/O. Asserts the lift
 * computation (SCIP resolves what CodeRef didn't), no-double-count when CodeRef
 * already resolved, absence=no-data, 0-indexed→1-indexed line mapping,
 * determinism, and surfaces-not-verdicts.
 */

import { describe, it, expect } from 'vitest';
import {
  computeScipResolutionDelta,
  SCIP_DELTA_SCHEMA_VERSION,
  type ScipDeltaElement,
  type ScipDeltaEdge,
} from '../../src/query/scip-resolution-delta.js';

const elements: ScipDeltaElement[] = [
  { codeRefId: '@Fn/src/a.ts#caller:20', name: 'caller', file: 'src/a.ts', line: 20 },
  { codeRefId: '@Fn/src/a.ts#other:30', name: 'other', file: 'src/a.ts', line: 30 },
];

// A synthetic SCIP index: one reference at line 20 (0-indexed 19), one at line 30 (0-indexed 29).
const scip = {
  documents: [
    {
      relativePath: 'src/a.ts',
      occurrences: [
        { range: [8, 0, 8, 3], symbol: 'scip . add().', isDefinition: true }, // a def — never a delta
        { range: [19, 2, 19, 5], symbol: 'scip . add().', isDefinition: false }, // ref @ line 20
        { range: [29, 2, 29, 5], symbol: 'scip . sub().', isDefinition: false }, // ref @ line 30
      ],
    },
  ],
};

describe('computeScipResolutionDelta', () => {
  it('emits a delta row for a SCIP-resolved reference CodeRef left unresolved', () => {
    const edges: ScipDeltaEdge[] = [
      // CodeRef's edge at line 20 is unresolved -> SCIP lifts it
      { sourceId: '@Fn/src/a.ts#caller:20', type: 'call', resolutionStatus: 'unresolved', sourceLocation: { file: 'src/a.ts', line: 20 } },
      // CodeRef already resolved line 30 -> NOT a delta
      { sourceId: '@Fn/src/a.ts#other:30', type: 'call', resolutionStatus: 'resolved', sourceLocation: { file: 'src/a.ts', line: 30 } },
    ];
    const s = computeScipResolutionDelta({ scip, elements, edges });
    expect(s.no_data).toBe(false);
    expect(s.summary.delta_resolved_by_scip).toBe(1);
    expect(s.deltas).toHaveLength(1);
    expect(s.deltas[0].line).toBe(20);
    expect(s.deltas[0].coderefStatus).toBe('unresolved');
    expect(s.deltas[0].codeRefId).toBe('@Fn/src/a.ts#caller:20');
    expect(s.deltas[0].provenance).toBe('scip');
  });

  it('does NOT count a reference CodeRef already resolved (no double-count)', () => {
    const edges: ScipDeltaEdge[] = [
      { sourceId: 'x', type: 'call', resolutionStatus: 'resolved', sourceLocation: { file: 'src/a.ts', line: 20 } },
      { sourceId: 'y', type: 'call', resolutionStatus: 'resolved', sourceLocation: { file: 'src/a.ts', line: 30 } },
    ];
    const s = computeScipResolutionDelta({ scip, elements, edges });
    expect(s.summary.delta_resolved_by_scip).toBe(0);
    expect(s.deltas).toEqual([]);
  });

  it('treats an ABSENT CodeRef edge as a delta (coderefStatus:absent)', () => {
    const s = computeScipResolutionDelta({ scip, elements, edges: [] });
    // both references (line 20 + 30) have no CodeRef edge at all -> both lift
    expect(s.summary.delta_resolved_by_scip).toBe(2);
    expect(s.deltas.every((d) => d.coderefStatus === 'absent')).toBe(true);
  });

  it('maps SCIP 0-indexed range start to a 1-indexed line', () => {
    const s = computeScipResolutionDelta({ scip, elements, edges: [] });
    // range [19,...] -> line 20; range [29,...] -> line 30
    expect(s.deltas.map((d) => d.line).sort((a, b) => a - b)).toEqual([20, 30]);
  });

  it('returns no_data:true when no SCIP index is provided (never a false 0 delta)', () => {
    const s = computeScipResolutionDelta({ scip: null, elements, edges: [] });
    expect(s.no_data).toBe(true);
    expect(s.summary.delta_resolved_by_scip).toBe(0);
    expect(s.deltas).toEqual([]);
  });

  it('returns no_data:true for an empty SCIP index', () => {
    const s = computeScipResolutionDelta({ scip: { documents: [] }, elements, edges: [] });
    expect(s.no_data).toBe(true);
  });

  it('counts scip definitions separately and excludes them from deltas', () => {
    const s = computeScipResolutionDelta({ scip, elements, edges: [] });
    expect(s.summary.scip_definitions).toBe(1);
    expect(s.summary.scip_occurrences).toBe(3);
  });

  it('is deterministic — identical inputs yield byte-identical output', () => {
    const a = JSON.stringify(computeScipResolutionDelta({ scip, elements, edges: [] }));
    const b = JSON.stringify(computeScipResolutionDelta({ scip, elements, edges: [] }));
    expect(a).toBe(b);
  });

  it('carries the schema version and exposes NO score/grade/verdict', () => {
    const s = computeScipResolutionDelta({ scip, elements, edges: [] });
    expect(s.schema_version).toBe(SCIP_DELTA_SCHEMA_VERSION);
    expect(s.summary).not.toHaveProperty('score');
    expect(s.summary).not.toHaveProperty('grade');
    expect(s).not.toHaveProperty('verdict');
  });
});

/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability edge-confidence-tier-test
 */

/**
 * Tests for the PURE edge-confidence projection
 * (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 Phase 3).
 *
 * Load-bearing behaviours pinned here:
 *  - classifyEdgeConfidence is a TOTAL, DETERMINISTIC function of
 *    (resolutionStatus, reason, evidence.confidence): every taxonomy string
 *    maps to its expected tier and the same input always yields the same tier.
 *  - the ONE reason/evidence override: resolved + provisional -> heuristic.
 *  - status-based fallback covers all 8 resolutionStatus values; an unknown
 *    status fails SAFE to 'inferred' (never silently 'exact').
 *  - confidenceRank orders exact>strong>heuristic>inferred; unknown ranks -1.
 *  - meetsMinConfidence is an inclusive threshold; absent threshold = no filter.
 */

import { describe, it, expect } from 'vitest';
import {
  type EdgeConfidenceTier,
  EDGE_CONFIDENCE_TIERS,
  classifyEdgeConfidence,
  confidenceRank,
  meetsMinConfidence,
} from '../../src/pipeline/edge-confidence.js';

/**
 * The FULL resolver reason taxonomy paired with the resolutionStatus the graph
 * builder maps it onto, and the tier this module must assign. This table is the
 * executable form of the P3-T1 mapping table in execution-notes.md — if the
 * classifier drifts from the taxonomy, one of these rows goes red.
 */
const TAXONOMY: Array<{
  status: string;
  reason?: string;
  evidenceConfidence?: string;
  tier: EdgeConfidenceTier;
}> = [
  // resolved (exact) — normal call/import/export edges, no provisional flag.
  { status: 'resolved', tier: 'exact' },
  { status: 'resolved', reason: 'resolved-call', tier: 'exact' },
  // resolved + provisional (heuristic) — single_candidate_unknown_receiver.
  { status: 'resolved', reason: 'single_candidate_unknown_receiver', evidenceConfidence: 'provisional', tier: 'heuristic' },
  // builtin (strong) — CALL builtin reasons.
  { status: 'builtin', reason: 'in_allowlist', tier: 'strong' },
  { status: 'builtin', reason: 'builtin_module_receiver', tier: 'strong' },
  { status: 'builtin', reason: 'python_stdlib_receiver', tier: 'strong' },
  { status: 'builtin', reason: 'js_prototype_member', tier: 'strong' },
  { status: 'builtin', reason: 'js_global_callee', tier: 'strong' },
  { status: 'builtin', reason: 'python_builtin_callee', tier: 'strong' },
  // external (strong) — IMPORT external reasons (node_builtin/python_stdlib map
  // to resolutionStatus 'builtin' upstream, so they arrive as 'builtin' here;
  // plain external / resolved-no-target demotion arrive as 'external').
  { status: 'external', tier: 'strong' },
  { status: 'external', reason: 'external_via_import', tier: 'strong' },
  { status: 'builtin', reason: 'node_builtin', tier: 'strong' },
  { status: 'builtin', reason: 'python_stdlib', tier: 'strong' },
  // typeOnly (strong).
  { status: 'typeOnly', reason: 'type_only_import', tier: 'strong' },
  // dynamic (strong).
  { status: 'dynamic', reason: 'dynamic_import', tier: 'strong' },
  // unresolved (inferred) — every unresolved reason.
  { status: 'unresolved', reason: 'this_outside_class_scope', tier: 'inferred' },
  { status: 'unresolved', reason: 'this_method_not_in_class', tier: 'inferred' },
  { status: 'unresolved', reason: 'super_call_out_of_scope', tier: 'inferred' },
  { status: 'unresolved', reason: 'method_not_in_class_own_methods', tier: 'inferred' },
  { status: 'unresolved', reason: 'imported_receiver_method_unknown', tier: 'inferred' },
  { status: 'unresolved', reason: 'receiver_not_in_symbol_table', tier: 'inferred' },
  { status: 'unresolved', reason: 'callee_not_in_symbol_table', tier: 'inferred' },
  { status: 'unresolved', reason: 'not_in_manifest_or_node_modules', tier: 'inferred' },
  { status: 'unresolved', reason: 'relative_target_not_in_project', tier: 'inferred' },
  { status: 'unresolved', reason: 'resolved_but_no_module_file', tier: 'inferred' },
  // ambiguous (inferred).
  { status: 'ambiguous', tier: 'inferred' },
  // stale (inferred).
  { status: 'stale', reason: 'symbol_not_in_module_exports', tier: 'inferred' },
];

describe('classifyEdgeConfidence — full taxonomy mapping', () => {
  for (const row of TAXONOMY) {
    const label = `${row.status}${row.reason ? ` / ${row.reason}` : ''}${row.evidenceConfidence ? ` (${row.evidenceConfidence})` : ''}`;
    it(`maps ${label} -> ${row.tier}`, () => {
      expect(classifyEdgeConfidence(row.status, row.reason, row.evidenceConfidence)).toBe(row.tier);
    });
  }

  it('is deterministic: the same input yields the same tier across repeated calls', () => {
    for (const row of TAXONOMY) {
      const a = classifyEdgeConfidence(row.status, row.reason, row.evidenceConfidence);
      const b = classifyEdgeConfidence(row.status, row.reason, row.evidenceConfidence);
      const c = classifyEdgeConfidence(row.status, row.reason, row.evidenceConfidence);
      expect(a).toBe(b);
      expect(b).toBe(c);
    }
  });
});

describe('classifyEdgeConfidence — the provisional carve-out is the ONLY reason override', () => {
  it('resolved WITHOUT provisional is exact regardless of reason', () => {
    expect(classifyEdgeConfidence('resolved', 'anything', undefined)).toBe('exact');
    expect(classifyEdgeConfidence('resolved', undefined, undefined)).toBe('exact');
  });

  it('resolved WITH provisional is heuristic', () => {
    expect(classifyEdgeConfidence('resolved', 'single_candidate_unknown_receiver', 'provisional')).toBe('heuristic');
    // The override keys on evidence.confidence, not the reason string.
    expect(classifyEdgeConfidence('resolved', undefined, 'provisional')).toBe('heuristic');
  });

  it('a provisional flag on a NON-resolved status does not change the status-based tier', () => {
    // Only resolved edges can be provisional in practice; defensively, a stray
    // provisional flag on a builtin/unresolved edge must not promote/demote it.
    expect(classifyEdgeConfidence('builtin', 'in_allowlist', 'provisional')).toBe('strong');
    expect(classifyEdgeConfidence('unresolved', 'receiver_not_in_symbol_table', 'provisional')).toBe('inferred');
  });
});

describe('classifyEdgeConfidence — status fallback covers all 8 values + fails safe', () => {
  it('every ExportedGraphEdgeResolutionStatus value maps to a real tier', () => {
    const allStatuses = ['resolved', 'unresolved', 'ambiguous', 'external', 'builtin', 'dynamic', 'typeOnly', 'stale'];
    for (const status of allStatuses) {
      const tier = classifyEdgeConfidence(status, undefined, undefined);
      expect(EDGE_CONFIDENCE_TIERS).toContain(tier);
    }
  });

  it('an unknown reason never changes the tier (status decides)', () => {
    expect(classifyEdgeConfidence('unresolved', 'some_brand_new_reason_string', undefined)).toBe('inferred');
    expect(classifyEdgeConfidence('builtin', 'some_brand_new_reason_string', undefined)).toBe('strong');
  });

  it('an unknown / absent status fails SAFE to inferred (never exact)', () => {
    expect(classifyEdgeConfidence('totally-unknown-status', undefined, undefined)).toBe('inferred');
    expect(classifyEdgeConfidence(undefined, undefined, undefined)).toBe('inferred');
  });
});

describe('confidenceRank', () => {
  it('orders exact > strong > heuristic > inferred', () => {
    expect(confidenceRank('exact')).toBeGreaterThan(confidenceRank('strong'));
    expect(confidenceRank('strong')).toBeGreaterThan(confidenceRank('heuristic'));
    expect(confidenceRank('heuristic')).toBeGreaterThan(confidenceRank('inferred'));
  });

  it('the frozen tier list is in descending rank order', () => {
    for (let i = 1; i < EDGE_CONFIDENCE_TIERS.length; i++) {
      expect(confidenceRank(EDGE_CONFIDENCE_TIERS[i - 1])).toBeGreaterThan(confidenceRank(EDGE_CONFIDENCE_TIERS[i]));
    }
  });

  it('an unknown tier ranks below every real tier', () => {
    expect(confidenceRank('nonsense')).toBeLessThan(confidenceRank('inferred'));
  });
});

describe('meetsMinConfidence — inclusive threshold predicate', () => {
  it('absent threshold is no-filter (everything passes)', () => {
    for (const t of EDGE_CONFIDENCE_TIERS) expect(meetsMinConfidence(t, undefined)).toBe(true);
  });

  it('equal ranks pass (inclusive)', () => {
    for (const t of EDGE_CONFIDENCE_TIERS) expect(meetsMinConfidence(t, t)).toBe(true);
  });

  it('exact threshold keeps only exact', () => {
    expect(meetsMinConfidence('exact', 'exact')).toBe(true);
    expect(meetsMinConfidence('strong', 'exact')).toBe(false);
    expect(meetsMinConfidence('heuristic', 'exact')).toBe(false);
    expect(meetsMinConfidence('inferred', 'exact')).toBe(false);
  });

  it('heuristic threshold keeps exact/strong/heuristic, drops inferred', () => {
    expect(meetsMinConfidence('exact', 'heuristic')).toBe(true);
    expect(meetsMinConfidence('strong', 'heuristic')).toBe(true);
    expect(meetsMinConfidence('heuristic', 'heuristic')).toBe(true);
    expect(meetsMinConfidence('inferred', 'heuristic')).toBe(false);
  });

  it('an unknown threshold string is treated as no-filter', () => {
    expect(meetsMinConfidence('inferred', 'garbage')).toBe(true);
  });
});

/**
 * Phase 6 — output-validation-real-world-noregress integration test
 * (AC-01, AC-10).
 *
 * Runs validatePipelineState against the actual coderef-core source tree —
 * the same regression check Phase 5 ran. Asserts:
 *   AC-01: zero false positives on real Phase 5-passing graph (validation.ok=true)
 *   AC-10: 6 Phase 0 graph-ground-truth assertions remain PASSING (verified
 *          structurally — every resolved edge has both sourceId and targetId
 *          in graph.nodes; this is the same invariant graph-ground-truth
 *          test 1 line 52 enforces)
 *
 * Uses the existing PipelineOrchestrator on the coderef-core repo to
 * reproduce the Phase 5 close baseline (3290 resolved edges per
 * execution-notes), then runs the validator. The test is deliberately
 * scale-flexible — it asserts the count is "in the right ballpark" rather
 * than exactly 3290 because the source tree drifts as new commits land.
 */

import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { validatePipelineState } from '../../src/pipeline/output-validator.js';
import { loadLayerEnum } from '../../src/pipeline/element-taxonomy.js';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('Phase 6 real-world no-regression (AC-01, AC-10)', () => {
  it('coderef-core source produces zero validator false positives', async () => {
    const orchestrator = new PipelineOrchestrator();
    const state = await orchestrator.run(REPO_ROOT, {
      languages: ['ts'],
      mode: 'minimal',
      outputDir: path.join(REPO_ROOT, '.coderef'),
    });
    const layerEnum = loadLayerEnum();
    const result = validatePipelineState(state, state.graph, {
      strictHeaders: false,
      layerEnum,
    });

    if (!result.ok) {
      // Surface details so future regressions are debuggable.
      console.error('[real-world-noregress] validator failed with errors:');
      for (const err of result.errors) {
        console.error(`  ${err.kind} ${err.check} ${JSON.stringify(err.details)}`);
      }
    }

    // AC-01: no graph integrity violations on a real Phase 5-passing graph.
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);

    // AC-10: every resolved edge has both endpoints in graph.nodes.
    // This is the same invariant graph-ground-truth test 1 line 52 enforces.
    const nodeIds = new Set(state.graph.nodes.map(n => n.id));
    let resolvedEdgeCount = 0;
    let resolvedWithBothEndpoints = 0;
    for (const edge of state.graph.edges) {
      if (edge.resolutionStatus !== 'resolved') continue;
      resolvedEdgeCount++;
      if (
        edge.sourceId !== undefined
        && nodeIds.has(edge.sourceId)
        && edge.targetId !== undefined
        && nodeIds.has(edge.targetId)
      ) {
        resolvedWithBothEndpoints++;
      }
    }
    expect(resolvedWithBothEndpoints).toBe(resolvedEdgeCount);

    // Sanity check: real-world source has at least a few hundred resolved
    // edges. Phase 5 close baseline was 3290; assertion uses lower bound to
    // tolerate source drift.
    expect(resolvedEdgeCount).toBeGreaterThan(500);

    // Validation report has all 11 fields populated as numbers.
    for (const field of [
      'valid_edge_count', 'unresolved_count', 'ambiguous_count',
      'external_count', 'builtin_count', 'header_defined_count',
      'header_missing_count', 'header_stale_count', 'header_partial_count',
      'header_layer_mismatch_count', 'header_export_mismatch_count',
    ] as const) {
      expect(typeof result.report[field]).toBe('number');
    }
    // valid_edge_count must equal the resolved edge count we measured.
    expect(result.report.valid_edge_count).toBe(resolvedEdgeCount);
  }, 120000);
});

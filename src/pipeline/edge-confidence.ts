/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability edge-confidence-tiers
 * @exports EdgeConfidenceTier, EDGE_CONFIDENCE_TIERS, classifyEdgeConfidence, confidenceRank, meetsMinConfidence
 */

/**
 * edge-confidence — the single source of truth that PROJECTS a graph edge's
 * existing resolver signals onto a four-value confidence TIER.
 *
 * This module is PURE: no I/O, no filesystem, no `Date.now`, no `Math.random`.
 * It computes a tier as a total deterministic function of the three fields the
 * exported edge already carries by the time the graph builder finishes —
 * `resolutionStatus` (the 8-value enum), `reason` (the resolver reason
 * taxonomy), and `evidence.confidence` (the STUB-6CWWHQ `'provisional'`
 * boolean). No resolver analysis is added or changed; the tier is a read-only
 * generalization of signals already on the edge (SCIP / Glean fact-provenance
 * pattern). It GENERALIZES the existing `evidence.confidence:'provisional'`
 * boolean into the exposed 4-tier enum — a reuse, not a duplicate.
 *
 * SURFACES, NOT VERDICTS. A tier reports edge PROVENANCE — HOW the edge was
 * derived — never whether the edge is "good", "correct", or "safe" in a
 * semantic sense:
 *   - `exact`     the edge is a fully-resolved binding: both endpoints known,
 *                 no provisionality. Auto-apply-safe (e.g. for a rename).
 *   - `strong`    the edge is DETERMINISTICALLY classified as out-of-project
 *                 (builtin / external / stdlib / type-only / dynamic import).
 *                 Not an intra-project target, but NOT a guess — high provenance.
 *   - `heuristic` the edge is resolved but PROVISIONAL: bound to its single
 *                 candidate while the receiver was unknown
 *                 (`single_candidate_unknown_receiver`). Labeled, not silently
 *                 trusted — verify before auto-acting.
 *   - `inferred`  the edge could NOT be bound to a single confirmed target
 *                 (unresolved / ambiguous / stale). LOWEST provenance. `inferred`
 *                 is not "wrong" — it is "lower-provenance: verify before you
 *                 auto-act on it".
 *
 * Consumers filter on the tier (a trust/audit signal), exactly as STUB-6CWWHQ's
 * `provisional` flag was intended to be filtered — now with four bands instead
 * of a boolean.
 */

/**
 * Confidence tier of a single graph edge, in descending order of provenance:
 * `exact` > `strong` > `heuristic` > `inferred`.
 */
export type EdgeConfidenceTier = 'exact' | 'strong' | 'heuristic' | 'inferred';

/**
 * The tiers in descending provenance order. Index === rank (0 is the most
 * trusted). Frozen so the ordering is a stable contract for `confidenceRank`
 * and `meetsMinConfidence`.
 */
export const EDGE_CONFIDENCE_TIERS: readonly EdgeConfidenceTier[] = Object.freeze([
  'exact',
  'strong',
  'heuristic',
  'inferred',
]);

/**
 * Numeric provenance rank of a tier: `exact`=3, `strong`=2, `heuristic`=1,
 * `inferred`=0. Higher is MORE trusted. Used by `meetsMinConfidence` and by
 * consumers that want to sort or compare tiers. An unknown string ranks -1
 * (below every real tier) so it never accidentally passes a threshold.
 */
export function confidenceRank(tier: EdgeConfidenceTier | string): number {
  switch (tier) {
    case 'exact':
      return 3;
    case 'strong':
      return 2;
    case 'heuristic':
      return 1;
    case 'inferred':
      return 0;
    default:
      return -1;
  }
}

/**
 * The `resolutionStatus` values that a DETERMINISTICALLY-classified, out-of-
 * project edge carries. Each is a known classification (not a resolution
 * failure), so each maps to the `strong` tier:
 *   - `external`  bare/manifest module, resolved-but-no-target demotion, etc.
 *   - `builtin`   language builtin / stdlib / global (node_builtin,
 *                 python_stdlib, js_prototype_member, js_global_callee, ...)
 *   - `typeOnly`  `import type` — a deterministic type-only import
 *   - `dynamic`   a deterministically-identified dynamic `import()`
 */
const STRONG_STATUSES: ReadonlySet<string> = new Set([
  'external',
  'builtin',
  'typeOnly',
  'dynamic',
]);

/**
 * The `resolutionStatus` values that indicate the edge could NOT be bound to a
 * single confirmed target — the lowest-provenance (`inferred`) tier:
 *   - `unresolved`  no binding found (any reason)
 *   - `ambiguous`   >=2 candidates, none chosen
 *   - `stale`       a header asserts a binding the fresh scan cannot confirm
 */
const INFERRED_STATUSES: ReadonlySet<string> = new Set([
  'unresolved',
  'ambiguous',
  'stale',
]);

/**
 * Project an edge's `(resolutionStatus, reason, evidenceConfidence)` onto its
 * confidence tier. TOTAL and DETERMINISTIC: every input triple maps to exactly
 * one tier; the same triple always yields the same tier (byte-stable).
 *
 * The classifier is STATUS-PRIMARY with a SINGLE reason/evidence override:
 *
 *   1. `resolved` + `evidenceConfidence === 'provisional'` → `heuristic`
 *      (the `single_candidate_unknown_receiver` case, STUB-6CWWHQ). This is the
 *      ONLY case where `reason`/evidence changes the tier away from what status
 *      alone would give.
 *   2. `resolved` (no provisional flag)                    → `exact`
 *   3. external | builtin | typeOnly | dynamic             → `strong`
 *   4. unresolved | ambiguous | stale                      → `inferred`
 *   5. any UNKNOWN `resolutionStatus`                      → `inferred`
 *      (fail-safe: unknown provenance is the LEAST trusted, never silently
 *      promoted to `exact`).
 *
 * `reason` is accepted for forward-compatibility and to keep the call site
 * self-documenting, but only the provisional-evidence signal currently changes
 * the outcome; an unknown or absent `reason` never alters the tier (status
 * decides). This keeps the mapping table small and auditable.
 *
 * @param resolutionStatus the edge's `resolutionStatus` (8-value enum, or any
 *   string — unknowns fall back to `inferred`).
 * @param reason the resolver reason string, if any. Currently informational.
 * @param evidenceConfidence the edge's `evidence.confidence` — `'provisional'`
 *   for a single-candidate unknown-receiver resolved edge, otherwise absent.
 */
export function classifyEdgeConfidence(
  resolutionStatus: string | undefined,
  reason?: string,
  evidenceConfidence?: string,
): EdgeConfidenceTier {
  if (resolutionStatus === 'resolved') {
    // The one reason/evidence-keyed override: a provisional single-candidate
    // resolution is bound but its receiver was unknown — heuristic, not exact.
    if (evidenceConfidence === 'provisional') return 'heuristic';
    return 'exact';
  }
  if (resolutionStatus !== undefined && STRONG_STATUSES.has(resolutionStatus)) {
    return 'strong';
  }
  if (resolutionStatus !== undefined && INFERRED_STATUSES.has(resolutionStatus)) {
    return 'inferred';
  }
  // Fail-safe: unknown / absent status is the least-trusted provenance.
  return 'inferred';
}

/**
 * Threshold predicate for the `--min-confidence` / `min_confidence` filters:
 * does `tier` meet or exceed the `threshold` tier's provenance rank?
 *
 * `meetsMinConfidence('exact', 'strong')`     → true  (exact >= strong)
 * `meetsMinConfidence('heuristic', 'exact')`  → false (heuristic < exact)
 * `meetsMinConfidence('strong', 'strong')`    → true  (equal ranks pass)
 *
 * An absent/undefined `threshold` means "no filter" and always passes — this is
 * what preserves the default (no-filter) behavior of every consumer surface
 * byte-for-byte. An unknown `threshold` string is treated as no-filter (passes)
 * rather than silently rejecting everything; an unknown `tier` ranks below every
 * real threshold and so fails any real filter.
 */
export function meetsMinConfidence(
  tier: EdgeConfidenceTier | string,
  threshold?: EdgeConfidenceTier | string,
): boolean {
  if (threshold === undefined) return true;
  const min = confidenceRank(threshold);
  // Unknown threshold string → treat as no-filter (rank -1 means everything
  // would pass anyway, but be explicit so intent is clear).
  if (min < 0) return true;
  return confidenceRank(tier) >= min;
}

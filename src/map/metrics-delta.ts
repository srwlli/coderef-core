/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability map-metrics-delta
 * @exports ScalarDelta, SummaryDeltas, RankingChange, MetricsFamilyDelta, MapMetricsDelta, diffMapMetrics
 * @used_by src/cli/coderef-mcp-server.ts
 */

/**
 * Map-metrics delta — a PURE before/after diff over the five MapMetrics families
 * (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 P11, graphify feedback item #11;
 * CodeScene MCP verified-refactor-loop pattern).
 *
 * The five metric families already NAME issues (src/map/engineering-metrics.ts:
 * testLinkage, documentation, unresolvedRefs, largestModules, mostDependencies),
 * but an agent has no way to PROVE a refactor improved the target surface without
 * regressing others. This module is the missing half of the loop: a pure
 * diffMapMetrics(before, after) that emits a DECOMPOSED per-family factor vector —
 * one delta record per family, each diffed by its own comparable surface (summary
 * scalars, Record<key,count> per-key deltas, ranked-list set-membership).
 *
 * NO COMPOSITE SCORE (load-bearing — the stub's literal constraint). The families
 * are NEVER summed or weighted into a single number: a regression in one family
 * must never be hidden by an improvement in another. There is deliberately no
 * top-level total — an agent reads each family's delta and decides.
 *
 * SURFACES, NOT VERDICTS. A delta is a CHANGE fact; the per-family `direction`
 * label is PROVENANCE (which way the measured surface moved), never a quality
 * verdict — the operator decides whether that direction is "good". The two pure
 * rankings (largestModules, mostDependencies) are direction-neutral: a module
 * growing is a fact, not a regression, so they report membership churn only.
 *
 * DETERMINISTIC by construction: no Date.now, no Math.random; every Record is
 * emitted key-sorted and every array is sorted with an explicit tie-break, so
 * identical (before, after) inputs yield a byte-identical delta.
 *
 * GRACEFUL NO-DATA: a schemaVersion mismatch between the two snapshots, or a
 * family absent on one side (e.g. a pre-1.4 snapshot with no metrics block),
 * produces a warnings[] entry and marks the affected family `noData` — NEVER a
 * fabricated numeric delta. The diff is a fact about what changed, or an honest
 * declaration that it could not be computed.
 */

import type { MapMetrics } from './engineering-metrics.js';

/** A single numeric before/after with its signed delta (after - before). */
export interface ScalarDelta {
  before: number;
  after: number;
  delta: number;
}

/** Per-summary-scalar deltas, key-sorted; keys present on either side. */
export type SummaryDeltas = Record<string, ScalarDelta>;

/**
 * Ranked-list change diffed by FILE IDENTITY (never array position). A pure
 * reorder with identical membership yields empty entered/left and reports only
 * the rank shifts.
 */
export interface RankingChange {
  /** Files present in `after.top[]` but not `before.top[]` (sorted). */
  entered: string[];
  /** Files present in `before.top[]` but not `after.top[]` (sorted). */
  left: string[];
  /** Files in BOTH whose 0-based rank changed (sorted by file). */
  rankChanged: Array<{ file: string; beforeRank: number; afterRank: number }>;
}

export type FamilyDirection = 'improved' | 'regressed' | 'unchanged';

/** One family's decomposed delta. Fields present depend on the family's shape. */
export interface MetricsFamilyDelta {
  /** True when this family was absent on one side — no numeric delta computed. */
  noData: boolean;
  /**
   * PROVENANCE, not a verdict. 'improved'/'regressed' only for the three families
   * with a defensible concern-scalar (testLinkage/documentation/unresolvedRefs);
   * the two pure rankings stay 'unchanged' and surface change via rankingChange.
   */
  direction: FamilyDirection;
  /** Per numeric summary scalar (families that have a `.summary`). */
  summaryDeltas?: SummaryDeltas;
  /** Per Record<status,count> key (documentation + unresolvedRefs `.byStatus`). */
  byStatusDeltas?: SummaryDeltas;
  /** Set-membership change of the ranked `top[]` (families that have one). */
  rankingChange?: RankingChange;
}

export interface MapMetricsDelta {
  /**
   * The two snapshots' schemaVersions. When they differ, `schemaMismatch` is true
   * and a warning is emitted — the families are still diffed field-by-field where
   * both are present, but the mismatch is surfaced (a future schema bump is caught,
   * not silently mis-diffed).
   */
  schemaVersion: { before: string; after: string; match: boolean };
  testLinkage: MetricsFamilyDelta;
  documentation: MetricsFamilyDelta;
  unresolvedRefs: MetricsFamilyDelta;
  largestModules: MetricsFamilyDelta;
  mostDependencies: MetricsFamilyDelta;
  warnings: string[];
  note: string;
}

const DELTA_NOTE =
  'Map-metrics delta is SURFACES, NOT VERDICTS: a per-family decomposed change fact. ' +
  'The direction label is PROVENANCE (which way the surface moved), never a quality verdict. ' +
  'The families are NEVER summed into a composite score — a regression in one family is not ' +
  'hidden by an improvement in another.';

/** A family record marked no-data (present on one side only / snapshot absent). */
function noDataFamily(): MetricsFamilyDelta {
  return { noData: true, direction: 'unchanged' };
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/**
 * Diff two flat Record<string, number> maps into key-sorted ScalarDelta entries,
 * covering every key present on EITHER side (absent side reads 0).
 */
function diffScalarRecord(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): SummaryDeltas {
  const out: SummaryDeltas = {};
  const keys = new Set<string>();
  if (before) for (const k of Object.keys(before)) keys.add(k);
  if (after) for (const k of Object.keys(after)) keys.add(k);
  for (const key of Array.from(keys).sort()) {
    const b = num(before?.[key]);
    const a = num(after?.[key]);
    out[key] = { before: b, after: a, delta: a - b };
  }
  return out;
}

/**
 * Diff two ranked `top[]` arrays by file identity. `fileOf` extracts the identity
 * from an entry. Deterministic: entered/left sorted by file, rankChanged sorted by
 * file. A pure reorder (same membership) reports only rankChanged.
 */
function diffRanking<T>(
  before: readonly T[] | undefined,
  after: readonly T[] | undefined,
  fileOf: (entry: T) => string,
): RankingChange {
  const beforeRank = new Map<string, number>();
  const afterRank = new Map<string, number>();
  (before ?? []).forEach((e, i) => {
    const f = fileOf(e);
    if (!beforeRank.has(f)) beforeRank.set(f, i);
  });
  (after ?? []).forEach((e, i) => {
    const f = fileOf(e);
    if (!afterRank.has(f)) afterRank.set(f, i);
  });
  const entered: string[] = [];
  const left: string[] = [];
  const rankChanged: Array<{ file: string; beforeRank: number; afterRank: number }> = [];
  for (const f of afterRank.keys()) {
    if (!beforeRank.has(f)) entered.push(f);
  }
  for (const f of beforeRank.keys()) {
    if (!afterRank.has(f)) left.push(f);
    else {
      const br = beforeRank.get(f)!;
      const ar = afterRank.get(f)!;
      if (br !== ar) rankChanged.push({ file: f, beforeRank: br, afterRank: ar });
    }
  }
  entered.sort();
  left.sort();
  rankChanged.sort((x, y) => (x.file < y.file ? -1 : x.file > y.file ? 1 : 0));
  return { entered, left, rankChanged };
}

/**
 * Direction from a single concern-scalar delta, framed as provenance: the scalar
 * moving DOWN (delta < 0) reduces a surfaced concern (improved); UP is regressed;
 * unchanged when equal.
 */
function directionFromConcernDrop(delta: number): FamilyDirection {
  if (delta < 0) return 'improved';
  if (delta > 0) return 'regressed';
  return 'unchanged';
}

/**
 * Diff the five MapMetrics families into a decomposed delta. Pure; no I/O, no
 * clock, no randomness. Absent (undefined) before OR after for a family marks that
 * family no-data with a warning rather than fabricating a numeric delta.
 */
export function diffMapMetrics(
  before: MapMetrics | undefined,
  after: MapMetrics | undefined,
): MapMetricsDelta {
  const warnings: string[] = [];

  const beforeVer = before?.schemaVersion ?? '(absent)';
  const afterVer = after?.schemaVersion ?? '(absent)';
  const match = before !== undefined && after !== undefined && beforeVer === afterVer;
  if (before !== undefined && after !== undefined && beforeVer !== afterVer) {
    warnings.push(
      `metrics-delta: schemaVersion mismatch (before=${beforeVer}, after=${afterVer}) — ` +
        `families diffed field-by-field where both present; interpret with care`,
    );
  }

  // ---- testLinkage (concern: srcWithoutTestEdgeCount down = improved) ---------
  let testLinkage: MetricsFamilyDelta;
  if (!before?.testLinkage || !after?.testLinkage) {
    testLinkage = noDataFamily();
    if (before || after) warnings.push('metrics-delta: testLinkage absent on one side — marked no-data');
  } else {
    const summaryDeltas = diffScalarRecord(
      before.testLinkage.summary as unknown as Record<string, unknown>,
      after.testLinkage.summary as unknown as Record<string, unknown>,
    );
    testLinkage = {
      noData: false,
      direction: directionFromConcernDrop(summaryDeltas.srcWithoutTestEdgeCount?.delta ?? 0),
      summaryDeltas,
    };
  }

  // ---- documentation (concern: filesWithNonDefinedCount down = improved) ------
  let documentation: MetricsFamilyDelta;
  if (!before?.documentation || !after?.documentation) {
    documentation = noDataFamily();
    if (before || after) warnings.push('metrics-delta: documentation absent on one side — marked no-data');
  } else {
    const summaryDeltas = diffScalarRecord(
      { ...(before.documentation.summary as unknown as Record<string, unknown>), byStatus: undefined },
      { ...(after.documentation.summary as unknown as Record<string, unknown>), byStatus: undefined },
    );
    // byStatus is a nested Record<status,count>, diffed per-status separately.
    delete summaryDeltas.byStatus;
    const byStatusDeltas = diffScalarRecord(
      before.documentation.summary.byStatus,
      after.documentation.summary.byStatus,
    );
    documentation = {
      noData: false,
      direction: directionFromConcernDrop(summaryDeltas.filesWithNonDefinedCount?.delta ?? 0),
      summaryDeltas,
      byStatusDeltas,
    };
  }

  // ---- unresolvedRefs (concern: edgeCount down = improved) --------------------
  let unresolvedRefs: MetricsFamilyDelta;
  if (!before?.unresolvedRefs || !after?.unresolvedRefs) {
    unresolvedRefs = noDataFamily();
    if (before || after) warnings.push('metrics-delta: unresolvedRefs absent on one side — marked no-data');
  } else {
    const summaryDeltas = diffScalarRecord(
      { ...(before.unresolvedRefs.summary as unknown as Record<string, unknown>), byStatus: undefined },
      { ...(after.unresolvedRefs.summary as unknown as Record<string, unknown>), byStatus: undefined },
    );
    delete summaryDeltas.byStatus;
    const byStatusDeltas = diffScalarRecord(
      before.unresolvedRefs.summary.byStatus,
      after.unresolvedRefs.summary.byStatus,
    );
    unresolvedRefs = {
      noData: false,
      direction: directionFromConcernDrop(summaryDeltas.edgeCount?.delta ?? 0),
      summaryDeltas,
      byStatusDeltas,
    };
  }

  // ---- largestModules (pure ranking — direction-neutral, membership churn) ----
  let largestModules: MetricsFamilyDelta;
  if (!before?.largestModules || !after?.largestModules) {
    largestModules = noDataFamily();
    if (before || after) warnings.push('metrics-delta: largestModules absent on one side — marked no-data');
  } else {
    largestModules = {
      noData: false,
      direction: 'unchanged', // a module growing is a fact, not a regression
      rankingChange: diffRanking(before.largestModules.top, after.largestModules.top, e => e.file),
    };
  }

  // ---- mostDependencies (pure ranking — direction-neutral, membership churn) --
  let mostDependencies: MetricsFamilyDelta;
  if (!before?.mostDependencies || !after?.mostDependencies) {
    mostDependencies = noDataFamily();
    if (before || after) warnings.push('metrics-delta: mostDependencies absent on one side — marked no-data');
  } else {
    mostDependencies = {
      noData: false,
      direction: 'unchanged',
      rankingChange: diffRanking(before.mostDependencies.top, after.mostDependencies.top, e => e.file),
    };
  }

  return {
    schemaVersion: { before: beforeVer, after: afterVer, match },
    testLinkage,
    documentation,
    unresolvedRefs,
    largestModules,
    mostDependencies,
    warnings,
    note: DELTA_NOTE,
  };
}

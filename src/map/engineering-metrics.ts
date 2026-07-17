/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability map-engineering-metrics
 * @exports MapMetricsTestLinkage, MapMetricsDocumentation, MapMetricsUnresolvedRefs, MapMetricsLargestModules, MapMetricsMostDependencies, MapMetrics, EngineeringMetricsOptions, computeEngineeringMetrics
 * @used_by src/map/project-map-data.ts
 */

/**
 * Engineering metrics over the FILE-level map projection
 * (WO-MAP-GRAPH-ANALYTICS-MODULE-001 P4, graphify feedback item #6).
 *
 * PURE function — no `.coderef/` reads. The projection feeds per-file
 * headerStatus tallies from its existing index-element walk and per-file
 * unresolved/ambiguous raw-edge counts from its existing raw-edge walk, so
 * any-repo universality is inherited: every family computes from artifacts
 * the projection already consumes. Deterministic by construction: no
 * Date.now, no Math.random; every Record is emitted key-sorted and every
 * array is sorted with an explicit tie-break.
 *
 * SURFACES, NOT VERDICTS: ranked observations, never judgments. Zero test
 * in-edges is not an "untested" verdict (transitive and integration coverage
 * are invisible to the file graph); unresolved references are resolution
 * facts from the scan, not defects; missing headers are coverage facts.
 *
 * Records bounded by file count are uncapped (analytics.assignments
 * precedent — the viewer's color-by needs totality); human-facing rankings
 * are capped with one aggregate warning per truncation. Absence semantics
 * per family: documentation.files absence = NO DATA (file not in
 * index.json), inboundFromTests / unresolvedRefs.files absence = observed
 * zero.
 */

import { isTestLikeFile } from './graph-analytics.js';

export interface MapMetricsTestLinkage {
  summary: {
    testFileCount: number;
    srcFileCount: number;
    srcWithTestEdgeCount: number;
    srcWithoutTestEdgeCount: number;
  };
  /** Sorted test-like files (heuristic shared with graph-analytics). */
  testFiles: string[];
  /** src file -> inbound-from-test facts, key-sorted; absence = observed zero. */
  inboundFromTests: Record<string, { testFileCount: number; weight: number }>;
  /** Sorted src files with zero inbound-from-test edges (capped). */
  zeroTestInEdge: string[];
  zeroTestInEdgeTruncated: boolean;
  note: string;
}

export interface MapMetricsDocumentation {
  summary: {
    totalElements: number;
    /** headerStatus -> element count, key-sorted. */
    byStatus: Record<string, number>;
    indexedFileCount: number;
    filesWithNonDefinedCount: number;
  };
  /**
   * file -> headerStatus -> element count (non-zero statuses only), both
   * levels key-sorted. Covers ALL index-present files — a file absent from
   * this Record has NO index data (no-data, not zero).
   */
  files: Record<string, Record<string, number>>;
  /** Capped ranking by non-defined element count (desc, file asc). */
  topNonDefined: Array<{ file: string; nonDefined: number; total: number }>;
  topNonDefinedTruncated: boolean;
  note: string;
}

export interface MapMetricsUnresolvedRefs {
  summary: {
    fileCount: number;
    edgeCount: number;
    /** resolutionStatus -> raw-edge count, key-sorted. */
    byStatus: Record<string, number>;
  };
  /** file -> outbound raw-edge counts, key-sorted; absence = observed zero. */
  files: Record<string, { unresolved: number; ambiguous: number }>;
  /** Capped ranking by unresolved+ambiguous total (desc, file asc). */
  top: Array<{ file: string; total: number; unresolved: number; ambiguous: number }>;
  topTruncated: boolean;
  note: string;
}

export interface MapMetricsLargestModules {
  /** Capped ranking by elementCount (desc, file asc). */
  top: Array<{ file: string; elementCount: number }>;
  topTruncated: boolean;
}

export interface MapMetricsMostDependencies {
  /** Capped ranking by distinct efferent files (desc, afferent desc, file asc). */
  top: Array<{ file: string; efferent: number; afferent: number }>;
  topTruncated: boolean;
}

export interface MapMetrics {
  schemaVersion: string;
  testLinkage: MapMetricsTestLinkage;
  documentation: MapMetricsDocumentation;
  unresolvedRefs: MapMetricsUnresolvedRefs;
  largestModules: MapMetricsLargestModules;
  mostDependencies: MapMetricsMostDependencies;
  warnings: string[];
  note: string;
}

export interface EngineeringMetricsOptions {
  /** Max entries per ranking list. Default 25. */
  rankingCap?: number;
  /** Max zero-test-in-edge files listed. Default 200. */
  zeroTestCap?: number;
}

interface MetricsNodeInput {
  id: string;
  elementCount: number;
}

interface MetricsEdgeInput {
  source: string;
  target: string;
  weight?: number;
}

const METRICS_NOTE =
  'Engineering metrics are SURFACES, NOT VERDICTS: ranked observations computed from the ' +
  'projection and scan artifacts, no judgments.';

const TEST_LINKAGE_NOTE =
  'Zero test in-edges is an observation, not an untested verdict — transitive and ' +
  'integration coverage are invisible to the file graph.';

const DOCUMENTATION_NOTE =
  'Per-file semantic-header status tallies from index elements — coverage facts, not verdicts.';

const NO_DEFINED_NOTE =
  'no defined semantic headers found; the header convention appears absent from this repo — ' +
  'counts are coverage observations only';

const NO_INDEX_NOTE =
  'no index element data supplied; documentation family has no data (index.json absent or unreadable)';

const UNRESOLVED_NOTE =
  'Unresolved and ambiguous references are resolution facts from the scan, not defects.';

function sortedRecord<T>(map: Map<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const key of Array.from(map.keys()).sort()) {
    out[key] = map.get(key)!;
  }
  return out;
}

/**
 * Compute the metrics block from projected file nodes ({id, elementCount}),
 * aggregated file edges, caller-fed per-file headerStatus tallies
 * (undefined when index.json was absent/unreadable) and per-file
 * unresolved/ambiguous raw-edge counts. Edges whose endpoints are not in
 * `nodes` are ignored (defensive — projectMapData never emits them).
 */
export function computeEngineeringMetrics(
  nodes: MetricsNodeInput[],
  edges: MetricsEdgeInput[],
  headerTallies: Map<string, Map<string, number>> | undefined,
  unresolvedCounts: Map<string, { unresolved: number; ambiguous: number }>,
  options: EngineeringMetricsOptions = {},
): MapMetrics {
  const rankingCap = options.rankingCap ?? 25;
  const zeroTestCap = options.zeroTestCap ?? 200;

  const warnings: string[] = [];
  const sortedNodes = nodes.slice().sort((a, b) => (a.id < b.id ? -1 : 1));
  const nodeIds = new Set(sortedNodes.map(n => n.id));

  // ---- testLinkage -----------------------------------------------------------
  const testFiles: string[] = [];
  const srcFiles: string[] = [];
  for (const n of sortedNodes) {
    if (isTestLikeFile(n.id)) testFiles.push(n.id);
    else srcFiles.push(n.id);
  }
  const testSet = new Set(testFiles);
  const inboundAgg = new Map<string, { sources: Set<string>; weight: number }>();
  for (const e of edges) {
    if (!e || !nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
    if (!testSet.has(e.source) || testSet.has(e.target)) continue;
    let agg = inboundAgg.get(e.target);
    if (!agg) {
      agg = { sources: new Set(), weight: 0 };
      inboundAgg.set(e.target, agg);
    }
    agg.sources.add(e.source);
    agg.weight += Number(e.weight || 1);
  }
  const inboundFromTests = new Map<string, { testFileCount: number; weight: number }>();
  for (const [file, agg] of inboundAgg) {
    inboundFromTests.set(file, { testFileCount: agg.sources.size, weight: agg.weight });
  }
  const zeroAll = srcFiles.filter(f => !inboundAgg.has(f));
  const testLinkage: MapMetricsTestLinkage = {
    summary: {
      testFileCount: testFiles.length,
      srcFileCount: srcFiles.length,
      srcWithTestEdgeCount: inboundAgg.size,
      srcWithoutTestEdgeCount: zeroAll.length,
    },
    testFiles,
    inboundFromTests: sortedRecord(inboundFromTests),
    zeroTestInEdge: zeroAll.slice(0, zeroTestCap),
    zeroTestInEdgeTruncated: zeroAll.length > zeroTestCap,
    note: TEST_LINKAGE_NOTE,
  };
  if (testLinkage.zeroTestInEdgeTruncated) {
    warnings.push(
      `metrics: zero-test-in-edge files truncated to ${zeroTestCap} of ${zeroAll.length} (zeroTestCap)`,
    );
  }

  // ---- documentation ---------------------------------------------------------
  const byStatus = new Map<string, number>();
  const docFiles = new Map<string, Record<string, number>>();
  const nonDefinedAll: Array<{ file: string; nonDefined: number; total: number }> = [];
  let totalElements = 0;
  if (headerTallies) {
    for (const file of Array.from(headerTallies.keys()).sort()) {
      const tally = headerTallies.get(file)!;
      let fileTotal = 0;
      let nonDefined = 0;
      for (const [status, count] of tally) {
        byStatus.set(status, (byStatus.get(status) || 0) + count);
        fileTotal += count;
        if (status !== 'defined') nonDefined += count;
      }
      totalElements += fileTotal;
      docFiles.set(file, sortedRecord(tally));
      if (nonDefined > 0) nonDefinedAll.push({ file, nonDefined, total: fileTotal });
    }
    nonDefinedAll.sort((a, b) => b.nonDefined - a.nonDefined || (a.file < b.file ? -1 : 1));
  }
  const definedCount = byStatus.get('defined') || 0;
  const documentation: MapMetricsDocumentation = {
    summary: {
      totalElements,
      byStatus: sortedRecord(byStatus),
      indexedFileCount: docFiles.size,
      filesWithNonDefinedCount: nonDefinedAll.length,
    },
    files: sortedRecord(docFiles),
    topNonDefined: nonDefinedAll.slice(0, rankingCap),
    topNonDefinedTruncated: nonDefinedAll.length > rankingCap,
    note: !headerTallies
      ? NO_INDEX_NOTE
      : totalElements > 0 && definedCount === 0
        ? NO_DEFINED_NOTE
        : DOCUMENTATION_NOTE,
  };
  if (documentation.topNonDefinedTruncated) {
    warnings.push(
      `metrics: non-defined-header ranking truncated to ${rankingCap} of ${nonDefinedAll.length} (rankingCap)`,
    );
  }

  // ---- unresolvedRefs --------------------------------------------------------
  const unresolvedFiles = new Map<string, { unresolved: number; ambiguous: number }>();
  const unresolvedByStatus = new Map<string, number>();
  const unresolvedAll: Array<{ file: string; total: number; unresolved: number; ambiguous: number }> = [];
  let unresolvedEdgeCount = 0;
  for (const file of Array.from(unresolvedCounts.keys()).sort()) {
    const counts = unresolvedCounts.get(file)!;
    const unresolved = Number(counts.unresolved || 0);
    const ambiguous = Number(counts.ambiguous || 0);
    const total = unresolved + ambiguous;
    if (total === 0) continue;
    unresolvedFiles.set(file, { unresolved, ambiguous });
    if (unresolved > 0) unresolvedByStatus.set('unresolved', (unresolvedByStatus.get('unresolved') || 0) + unresolved);
    if (ambiguous > 0) unresolvedByStatus.set('ambiguous', (unresolvedByStatus.get('ambiguous') || 0) + ambiguous);
    unresolvedEdgeCount += total;
    unresolvedAll.push({ file, total, unresolved, ambiguous });
  }
  unresolvedAll.sort((a, b) => b.total - a.total || (a.file < b.file ? -1 : 1));
  const unresolvedRefs: MapMetricsUnresolvedRefs = {
    summary: {
      fileCount: unresolvedFiles.size,
      edgeCount: unresolvedEdgeCount,
      byStatus: sortedRecord(unresolvedByStatus),
    },
    files: sortedRecord(unresolvedFiles),
    top: unresolvedAll.slice(0, rankingCap),
    topTruncated: unresolvedAll.length > rankingCap,
    note: UNRESOLVED_NOTE,
  };
  if (unresolvedRefs.topTruncated) {
    warnings.push(
      `metrics: unresolved-refs ranking truncated to ${rankingCap} of ${unresolvedAll.length} (rankingCap)`,
    );
  }

  // ---- largestModules --------------------------------------------------------
  const largestAll = sortedNodes
    .filter(n => n.elementCount > 0)
    .map(n => ({ file: n.id, elementCount: n.elementCount }))
    .sort((a, b) => b.elementCount - a.elementCount || (a.file < b.file ? -1 : 1));
  const largestModules: MapMetricsLargestModules = {
    top: largestAll.slice(0, rankingCap),
    topTruncated: largestAll.length > rankingCap,
  };
  if (largestModules.topTruncated) {
    warnings.push(
      `metrics: largest-modules ranking truncated to ${rankingCap} of ${largestAll.length} (rankingCap)`,
    );
  }

  // ---- mostDependencies ------------------------------------------------------
  const outNb = new Map<string, Set<string>>();
  const inNb = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!e || !nodeIds.has(e.source) || !nodeIds.has(e.target) || e.source === e.target) continue;
    let out = outNb.get(e.source);
    if (!out) {
      out = new Set();
      outNb.set(e.source, out);
    }
    out.add(e.target);
    let inSet = inNb.get(e.target);
    if (!inSet) {
      inSet = new Set();
      inNb.set(e.target, inSet);
    }
    inSet.add(e.source);
  }
  const depsAll = sortedNodes
    .map(n => ({
      file: n.id,
      efferent: (outNb.get(n.id) || new Set()).size,
      afferent: (inNb.get(n.id) || new Set()).size,
    }))
    .filter(d => d.efferent + d.afferent > 0)
    .sort(
      (a, b) =>
        b.efferent - a.efferent || b.afferent - a.afferent || (a.file < b.file ? -1 : 1),
    );
  const mostDependencies: MapMetricsMostDependencies = {
    top: depsAll.slice(0, rankingCap),
    topTruncated: depsAll.length > rankingCap,
  };
  if (mostDependencies.topTruncated) {
    warnings.push(
      `metrics: most-dependencies ranking truncated to ${rankingCap} of ${depsAll.length} (rankingCap)`,
    );
  }

  return {
    schemaVersion: '1.0.0',
    testLinkage,
    documentation,
    unresolvedRefs,
    largestModules,
    mostDependencies,
    warnings,
    note: METRICS_NOTE,
  };
}

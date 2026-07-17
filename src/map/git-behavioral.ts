/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability map-git-behavioral-analytics
 * @exports GitBehavioralHotspot, GitBehavioralCoupling, GitBehavioral, GitBehavioralOptions, computeGitBehavioral
 * @used_by src/map/project-map-data.ts
 */

/**
 * Git-behavioral analytics over the FILE-level map projection
 * (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 P2, genre-research item #2:
 * CodeScene / code-maat behavioral code analysis).
 *
 * PURE function — no git reads, no `.coderef/` reads, no Date.now, no
 * Math.random. Consumes a plain `GitHistory` record (extracted by the ONE
 * impure module, src/map/git-history.ts) plus the already-projected file
 * nodes/edges. Because both inputs are data, this module is fully unit-testable
 * with a synthetic GitHistory and needs no git repo. Deterministic by
 * construction: every Record is key-sorted and every array has an explicit
 * tie-break (graph-analytics / engineering-metrics discipline).
 *
 * Two surfaces:
 *   1. churnHotspots — churn (commitCount) × module size (elementCount). The
 *      faithful, deterministic adaptation of CodeScene's high-churn ×
 *      high-complexity hotspot: coderef-core has no cyclomatic-complexity
 *      metric and this phase does not invent one, so elementCount is the size
 *      proxy (centrality is a secondary lens, noted, not multiplied in).
 *   2. couplingDrift — change-coupling pairs (files that co-change in git) whose
 *      two files have NO static import/call edge between them. This is the
 *      set difference "co-change MINUS static edge" — candidate hidden
 *      dependencies invisible to impact_of. Corroborated pairs (co-change AND a
 *      static edge) are excluded from the list but counted in the summary.
 *
 * SURFACES, NOT VERDICTS: high churn is not a "bad code" verdict (churn tracks
 * legitimate active development as much as instability); a coupling-drift pair
 * is a CANDIDATE hidden dependency to investigate, never a proven missing edge.
 *
 * Records bounded by file count are uncapped (viewer/consumer totality — the
 * engineering-metrics precedent); human-facing rankings are capped with one
 * aggregate warning per truncation. The extracted commit window is declared in
 * the block so consumers know the observation's provenance and bound.
 */

import { GitHistory } from './git-history.js';

export interface GitBehavioralHotspot {
  file: string;
  /** Distinct commits touching this file within the window. */
  commitCount: number;
  /** Element count (module-size proxy) from the projected node. */
  elementCount: number;
  /** commitCount × elementCount — the churn×size hotspot score. */
  score: number;
  linesAdded: number;
  linesDeleted: number;
}

export interface GitBehavioralCoupling {
  /** Lexicographically-first path of the pair (a < b). */
  a: string;
  /** Lexicographically-second path of the pair. */
  b: string;
  /** Distinct commits changing both files within the window. */
  coChangeCount: number;
}

export interface GitBehavioral {
  schemaVersion: string;
  /** Resolved extraction window (provenance + bound), copied from GitHistory. */
  window: {
    maxCount: number;
    since: string | null;
    commitsScanned: number;
    headSha: string;
    shallow: boolean;
  };
  churnHotspots: {
    summary: {
      /** Files with any churn in the window. */
      churnedFileCount: number;
      /** Churned files that matched a projected node (contribute a size score). */
      scoredFileCount: number;
    };
    /** Capped ranking by churn×size (desc), then commitCount desc, then file asc. */
    top: GitBehavioralHotspot[];
    topTruncated: boolean;
    note: string;
  };
  couplingDrift: {
    summary: {
      /** Co-change pairs at or above the threshold, before the static-edge filter. */
      coChangePairCount: number;
      /** Of those, pairs WITH a static edge (corroborated — excluded from the list). */
      corroboratedPairCount: number;
      /** Of those, pairs WITHOUT a static edge (the surfaced drift candidates). */
      driftPairCount: number;
      /** Minimum co-change count applied as the noise floor. */
      minCoChange: number;
    };
    /** Capped ranking by coChangeCount (desc), then a asc, then b asc. */
    top: GitBehavioralCoupling[];
    topTruncated: boolean;
    note: string;
  };
  note: string;
}

export interface GitBehavioralOptions {
  /** Max churn-hotspot entries. Default 25. */
  hotspotTop?: number;
  /** Max coupling-drift entries. Default 25. */
  couplingTop?: number;
  /** Co-change count floor — pairs below this are noise. Default 2. */
  minCoChange?: number;
}

interface BehavioralNodeInput {
  id: string;
  elementCount: number;
}

interface BehavioralEdgeInput {
  source: string;
  target: string;
}

const BEHAVIORAL_NOTE =
  'Git-behavioral analytics are SURFACES, NOT VERDICTS: churn and change-coupling are ' +
  'observations over a bounded commit window, not judgments about code quality.';

const CHURN_NOTE =
  'Churn×size hotspots multiply commit count by module size (elementCount) — high churn tracks ' +
  'active development as much as instability; centrality is a secondary lens, not part of the score.';

const COUPLING_NOTE =
  'Change-coupling drift lists file pairs that co-change in git but have NO static import/call edge — ' +
  'CANDIDATE hidden dependencies invisible to impact_of, not proven missing edges. Pairs with a static ' +
  'edge are corroboration (counted, not listed).';

/** Undirected pair key for static-edge membership tests (a < b). */
function pairKey(x: string, y: string): string {
  return x < y ? x + '\x00' + y : y + '\x00' + x;
}

/**
 * Compute the git-behavioral block from an extracted GitHistory plus the
 * projected file nodes ({id, elementCount}) and aggregated file edges. Pure and
 * deterministic. The caller only invokes this when a GitHistory was extracted;
 * a null history means the block is absent (no-data), handled by projectMapData.
 */
export function computeGitBehavioral(
  history: GitHistory,
  nodes: BehavioralNodeInput[],
  edges: BehavioralEdgeInput[],
  options: GitBehavioralOptions = {},
): GitBehavioral {
  const hotspotTop = options.hotspotTop ?? 25;
  const couplingTop = options.couplingTop ?? 25;
  const minCoChange = options.minCoChange ?? 2;

  // ---- churn hotspots: churn × elementCount ---------------------------------
  const elementCountByFile = new Map<string, number>();
  for (const n of nodes) elementCountByFile.set(n.id, n.elementCount);

  const hotspotsAll: GitBehavioralHotspot[] = [];
  for (const f of history.files) {
    // Only files present in the projected graph carry a size proxy. A churned
    // file absent from the projection (e.g. a deleted or non-source path in the
    // window) has no elementCount and is not scored — counted in summary only.
    if (!elementCountByFile.has(f.file)) continue;
    const elementCount = elementCountByFile.get(f.file)!;
    hotspotsAll.push({
      file: f.file,
      commitCount: f.commitCount,
      elementCount,
      score: f.commitCount * elementCount,
      linesAdded: f.linesAdded,
      linesDeleted: f.linesDeleted,
    });
  }
  hotspotsAll.sort(
    (a, b) =>
      b.score - a.score ||
      b.commitCount - a.commitCount ||
      (a.file < b.file ? -1 : a.file > b.file ? 1 : 0),
  );

  // ---- coupling drift: co-change MINUS static edge --------------------------
  const staticPairs = new Set<string>();
  for (const e of edges) {
    if (!e || e.source === e.target) continue;
    staticPairs.add(pairKey(e.source, e.target));
  }

  let coChangePairCount = 0;
  let corroboratedPairCount = 0;
  const driftAll: GitBehavioralCoupling[] = [];
  for (const p of history.coChanges) {
    if (p.coChangeCount < minCoChange) continue;
    coChangePairCount++;
    if (staticPairs.has(pairKey(p.a, p.b))) {
      corroboratedPairCount++;
    } else {
      driftAll.push({ a: p.a, b: p.b, coChangeCount: p.coChangeCount });
    }
  }
  driftAll.sort(
    (x, y) =>
      y.coChangeCount - x.coChangeCount ||
      (x.a < y.a ? -1 : x.a > y.a ? 1 : x.b < y.b ? -1 : x.b > y.b ? 1 : 0),
  );

  return {
    schemaVersion: '1.0.0',
    window: {
      maxCount: history.window.maxCount,
      since: history.window.since,
      commitsScanned: history.window.commitsScanned,
      headSha: history.window.headSha,
      shallow: history.window.shallow,
    },
    churnHotspots: {
      summary: {
        churnedFileCount: history.files.length,
        scoredFileCount: hotspotsAll.length,
      },
      top: hotspotsAll.slice(0, hotspotTop),
      topTruncated: hotspotsAll.length > hotspotTop,
      note: CHURN_NOTE,
    },
    couplingDrift: {
      summary: {
        coChangePairCount,
        corroboratedPairCount,
        driftPairCount: driftAll.length,
        minCoChange,
      },
      top: driftAll.slice(0, couplingTop),
      topTruncated: driftAll.length > couplingTop,
      note: COUPLING_NOTE,
    },
    note: BEHAVIORAL_NOTE,
  };
}

/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability map-ownership-analytics
 * @exports OwnershipFile, MapOwnership, OwnershipOptions, computeOwnership
 * @used_by src/map/project-map-data.ts
 */

/**
 * Ownership / knowledge analytics over the FILE-level map projection
 * (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P2, genre item #7:
 * CodeScene knowledge maps / CODEOWNERS bus-factor pattern).
 *
 * PURE function — no git reads, no `.coderef/` reads, no Date.now, no
 * Math.random. Consumes the plain `GitHistory.authorship` record (extracted by
 * the ONE impure module, src/map/git-history.ts, via `%an`/`%at` capture) plus
 * the already-projected file nodes. Because both inputs are data — including the
 * reference clock, passed in as `nowEpoch` — this module is fully unit-testable
 * with a synthetic authorship record and is deterministic by construction: every
 * array has an explicit tie-break (git-behavioral / engineering-metrics
 * discipline).
 *
 * One surface:
 *   ownership — per file: dominant-author share (the bus-factor proxy: what
 *   fraction of the file's commits in the window came from its single most
 *   active author), distinct author count, and last-touched recency (ageDays
 *   derived from the caller-supplied nowEpoch, NOT the wall clock). A file with
 *   dominantAuthorShare == 1 is single-author (bus factor 1); a high share plus a
 *   large ageDays is the "one author, long-untouched" fragility signal an agent
 *   uses to calibrate how boldly to refactor.
 *
 * SURFACES, NOT VERDICTS: a single-author or long-untouched file is an
 * OBSERVATION over a bounded commit window, not a "risky code" verdict — a file
 * can be single-author because it is small and stable, or because knowledge is
 * concentrated. The block reports the distribution; the agent judges.
 *
 * ABSENCE = NO-DATA: a file with no authorship record (absent from the window,
 * or the window carried no author fields) contributes NOTHING — it is not
 * reported as "unowned" or share-0. An empty authorship input yields an empty
 * block, never a fabricated ownership guess.
 *
 * Records bounded by file count are summarized in full; the human-facing ranking
 * is capped with one aggregate warning per truncation (engineering-metrics /
 * git-behavioral precedent). The extraction window's headSha commit is the
 * natural nowEpoch the caller passes so ageDays is relative to the observation,
 * not the reader's clock.
 */

import { GitHistory } from './git-history.js';

const SECONDS_PER_DAY = 86400;

export interface OwnershipFile {
  /** Project-relative, slash-normalized file path (matches graph node ids). */
  file: string;
  /** Distinct authors touching this file within the window. */
  distinctAuthorCount: number;
  /** Name of the single most active author (ties broken by name asc). */
  dominantAuthor: string;
  /**
   * Fraction of this file's window commits from its most active author, in
   * [0,1]. 1 == single-author (bus factor 1). The bus-factor proxy.
   */
  dominantAuthorShare: number;
  /** Total window commits touching this file (denominator of the share). */
  totalCommits: number;
  /** Author-timestamp (epoch seconds) of the most recent touch. */
  lastTouchedEpoch: number;
  /**
   * Whole days between lastTouchedEpoch and the caller-supplied nowEpoch,
   * floored, never negative. Recency signal — abandonment lens.
   */
  ageDays: number;
}

export interface MapOwnership {
  schemaVersion: string;
  summary: {
    /** Files in the window that carried authorship (the block's population). */
    filesWithAuthorship: number;
    /** Of those, files whose commits all came from ONE author (share == 1, bus factor 1). */
    singleAuthorFileCount: number;
    /** Reference clock (epoch seconds) ageDays is measured against — provenance. */
    nowEpoch: number;
  };
  /**
   * Capped ranking. Ordered dominantAuthorShare desc (most concentrated first),
   * then ageDays desc (most abandoned first), then file asc — the
   * "concentrated AND stale" files an agent most wants flagged surface at top.
   */
  top: OwnershipFile[];
  topTruncated: boolean;
  note: string;
}

export interface OwnershipOptions {
  /** Max ownership entries in `top`. Default 25. */
  ownershipTop?: number;
}

interface OwnershipNodeInput {
  id: string;
}

const OWNERSHIP_NOTE =
  'Ownership analytics are SURFACES, NOT VERDICTS: author concentration (bus factor) and ' +
  'last-touched age are observations over a bounded commit window, not judgments about code ' +
  'quality. Absence of an authorship record is no-data (file outside the window), never share-0. ' +
  'ageDays is measured against the extraction-window clock, not the reader’s.';

/**
 * Compute the ownership block from an extracted GitHistory (its `authorship`
 * facet) plus the projected file node ids, relative to a caller-supplied
 * `nowEpoch` (epoch seconds — pass the window headSha commit time to keep the
 * result a property of the observation, not the reader's clock). Pure and
 * deterministic. Files absent from the projection are excluded (the graph is the
 * source of which files "exist"); files present but without authorship
 * contribute nothing (no-data). Returns an empty block when no authorship is
 * available.
 */
export function computeOwnership(
  history: GitHistory,
  nodes: OwnershipNodeInput[],
  nowEpoch: number,
  options: OwnershipOptions = {},
): MapOwnership {
  const ownershipTop = options.ownershipTop ?? 25;
  const authorship = history.authorship ?? [];

  const projectedFiles = new Set<string>();
  for (const n of nodes) projectedFiles.add(n.id);

  const rows: OwnershipFile[] = [];
  for (const a of authorship) {
    // Only files present in the projected graph carry an ownership row. A file
    // in the authorship window but absent from the projection (deleted, or a
    // non-source path) is not reported — the graph defines what "exists".
    if (!projectedFiles.has(a.file)) continue;
    if (a.authors.length === 0) continue; // defensive: no authors => no-data

    const totalCommits = a.authors.reduce((s, x) => s + x.commitCount, 0);
    if (totalCommits <= 0) continue;

    // authors are pre-sorted (commitCount desc, name asc) by git-history.ts, so
    // authors[0] is the dominant author with a deterministic tie-break.
    const dominant = a.authors[0];
    const dominantAuthorShare = dominant.commitCount / totalCommits;
    const ageSeconds = nowEpoch - a.lastTouchedEpoch;
    const ageDays = ageSeconds > 0 ? Math.floor(ageSeconds / SECONDS_PER_DAY) : 0;

    rows.push({
      file: a.file,
      distinctAuthorCount: a.distinctAuthorCount,
      dominantAuthor: dominant.name,
      dominantAuthorShare,
      totalCommits,
      lastTouchedEpoch: a.lastTouchedEpoch,
      ageDays,
    });
  }

  rows.sort(
    (x, y) =>
      y.dominantAuthorShare - x.dominantAuthorShare ||
      y.ageDays - x.ageDays ||
      (x.file < y.file ? -1 : x.file > y.file ? 1 : 0),
  );

  const singleAuthorFileCount = rows.filter(r => r.dominantAuthorShare === 1).length;

  return {
    schemaVersion: '1.0.0',
    summary: {
      filesWithAuthorship: rows.length,
      singleAuthorFileCount,
      nowEpoch,
    },
    top: rows.slice(0, ownershipTop),
    topTruncated: rows.length > ownershipTop,
    note: OWNERSHIP_NOTE,
  };
}

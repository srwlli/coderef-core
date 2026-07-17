/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability ego-graph-retrieval
 * @exports EgoGraphDirection, EgoGraphNeighbor, EgoGraph, EgoGraphOptions, EGO_GRAPH_DIRECTIONS, egoGraphOf
 */

/**
 * ego-graph — the 1-hop neighborhood of a resolved element, returned as
 * SIGNATURES (node summaries), never bodies.
 *
 * This is the retrieval-meets-graph seam (RepoGraph / CodexGraph / LocAgent
 * pattern, WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 Phase 4). The retriever
 * (rag_search) and the graph do not talk at query time, so an agent burns 4-6
 * follow-up calls fetching the neighborhood of every search hit the graph
 * already knows. This helper collapses that: given a resolved element, it
 * returns its callers / callees / imports / importedBy in one shot.
 *
 * PURE COMPOSITION: it does no adjacency logic of its own — it calls
 * `CanonicalGraphQuery.neighborsWithConfidence` (which exposes the (node, edge)
 * pairs `collectNeighbors` already computes) four times, one per direction, and
 * shapes the result. No I/O beyond the passed-in query engine, no
 * `Date.now`/`Math.random`. Deterministic: neighbors are sorted by id so the
 * same graph + same resolved element yields a byte-identical ego-graph.
 *
 * SURFACES, NOT VERDICTS. The ego-graph is the RESOLVED-graph 1-hop
 * neighborhood (the query engine indexes only resolved edges). It is what the
 * graph KNOWS, not a completeness claim:
 *   - `resolved: false` (or an empty direction) means "no resolved edges
 *     recorded for this element", NOT "unused". Absence is no-data.
 *   - Each neighbor carries the confidence TIER (Phase 3) of the edge it was
 *     reached through — provenance (how the graph knows this neighbor), never a
 *     quality verdict. A caller reached via a `heuristic` edge is a
 *     single-candidate/unknown-receiver match; verify before auto-acting.
 */

import {
  type CanonicalGraphQuery,
  type CanonicalNode,
  type NodeResolution,
} from './canonical-graph.js';
import type { EdgeConfidenceTier } from '../pipeline/edge-confidence.js';

/**
 * The four 1-hop directions of an ego-graph, mapping 1:1 onto the existing
 * neighbor semantics:
 *   - `callers`    — inbound call edges  (who calls the target)
 *   - `callees`    — outbound call edges (what the target calls)
 *   - `imports`    — outbound import edges (what the target imports)
 *   - `importedBy` — inbound import edges  (who imports the target)
 */
export type EgoGraphDirection = 'callers' | 'callees' | 'imports' | 'importedBy';

/**
 * The directions in canonical order. Frozen so callers can iterate a stable set.
 */
export const EGO_GRAPH_DIRECTIONS: readonly EgoGraphDirection[] = Object.freeze([
  'callers',
  'callees',
  'imports',
  'importedBy',
]);

/** One neighbor: a node summary (signature, not a body) + edge provenance. */
export interface EgoGraphNeighbor extends CanonicalNode {
  /**
   * Confidence tier of the edge this neighbor was reached through (Phase 3).
   * Omitted when `withConfidence: false`. Provenance, not a verdict.
   */
  confidence?: EdgeConfidenceTier;
}

/** One direction's slice of the neighborhood, with cap accounting. */
export interface EgoGraphDirectionResult {
  neighbors: EgoGraphNeighbor[];
  /** Total neighbors in this direction BEFORE the cap was applied. */
  total: number;
  /** True when `total` exceeded the cap and `neighbors` was truncated. */
  truncated: boolean;
}

/** The 1-hop neighborhood of a resolved element. */
export interface EgoGraph {
  /**
   * False when the query resolved to zero graph nodes: every direction is
   * empty and this is "no resolved edges recorded", NOT "isolated". Absence =
   * no-data.
   */
  resolved: boolean;
  callers: EgoGraphDirectionResult;
  callees: EgoGraphDirectionResult;
  imports: EgoGraphDirectionResult;
  importedBy: EgoGraphDirectionResult;
}

export interface EgoGraphOptions {
  /**
   * Which directions to include. Default: all four. A direction not listed is
   * still present in the result but as an empty, non-truncated slice (so the
   * shape is stable) — callers that only want, say, callers+callees pay nothing
   * for the other two.
   */
  directions?: readonly EgoGraphDirection[];
  /**
   * Max neighbors returned PER direction. Excess are dropped and the direction
   * is flagged `truncated` with the true `total`. Default 25. A cap <= 0 is
   * treated as "no cap" (return everything, never truncated).
   */
  cap?: number;
  /**
   * Annotate each neighbor with the confidence tier of its edge (Phase 3).
   * Default true. Set false to omit the tier (smaller payload).
   */
  withConfidence?: boolean;
}

const DEFAULT_CAP = 25;

/** Direction → (traversal direction, edge kind) for neighborsWithConfidence. */
const DIRECTION_SPEC: Record<EgoGraphDirection, { direction: 'inbound' | 'outbound'; kind: 'call' | 'import' }> = {
  callers: { direction: 'inbound', kind: 'call' },
  callees: { direction: 'outbound', kind: 'call' },
  imports: { direction: 'outbound', kind: 'import' },
  importedBy: { direction: 'inbound', kind: 'import' },
};

function emptyDirection(): EgoGraphDirectionResult {
  return { neighbors: [], total: 0, truncated: false };
}

/**
 * Build the 1-hop ego-graph of an ALREADY-RESOLVED element.
 *
 * @param query the canonical graph query engine (loaded once by the caller).
 * @param resolution a NodeResolution from `query.resolve(...)`. When it holds
 *   zero nodes, the returned ego-graph is `resolved:false` with all-empty
 *   directions (absence = no-data — never a fabricated neighbor).
 * @param opts direction selection, per-direction cap, confidence annotation.
 */
export function egoGraphOf(
  query: CanonicalGraphQuery,
  resolution: NodeResolution,
  opts?: EgoGraphOptions,
): EgoGraph {
  const wanted = opts?.directions ?? EGO_GRAPH_DIRECTIONS;
  const wantedSet = new Set<EgoGraphDirection>(wanted);
  const cap = opts?.cap ?? DEFAULT_CAP;
  const withConfidence = opts?.withConfidence ?? true;

  const result: EgoGraph = {
    resolved: resolution.nodes.length > 0,
    callers: emptyDirection(),
    callees: emptyDirection(),
    imports: emptyDirection(),
    importedBy: emptyDirection(),
  };

  // A query that resolved to nothing has no neighborhood — return the
  // all-empty, resolved:false shape. Never fabricate neighbors.
  if (!result.resolved) return result;

  for (const dir of EGO_GRAPH_DIRECTIONS) {
    if (!wantedSet.has(dir)) continue; // stays the empty slice, shape stable
    const spec = DIRECTION_SPEC[dir];
    const raw = query.neighborsWithConfidence(resolution, spec.direction, spec.kind);
    // Deterministic ordering: by node id (stable across runs — no wall-clock,
    // no insertion-order dependence).
    raw.sort((a, b) => (a.node.id < b.node.id ? -1 : a.node.id > b.node.id ? 1 : 0));

    const total = raw.length;
    const limit = cap > 0 ? cap : total;
    const kept = raw.slice(0, limit);
    const neighbors: EgoGraphNeighbor[] = kept.map(({ node, confidence }) =>
      withConfidence ? { ...node, confidence } : { ...node },
    );
    result[dir] = { neighbors, total, truncated: total > neighbors.length };
  }

  return result;
}

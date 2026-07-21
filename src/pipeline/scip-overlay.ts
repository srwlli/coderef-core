/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability scip-resolution-overlay
 * @exports ScipOverlayStats, applyScipOverlay
 * @used_by src/pipeline/orchestrator.ts
 */

/**
 * scip-overlay — the LIVE post-resolution SCIP overlay
 * (WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 Phase 2, STUB-BQQJSY).
 *
 * scip-resolution-delta.ts (Phase 11 scope-A) REPORTS what SCIP resolves that
 * CodeRef missed; it is read-only. THIS module is the deferred deep integration
 * that delta note foresaw: given a real decoded SCIP index, it FLIPS the
 * co-located unresolved/ambiguous graph edges to `resolved` with SCIP
 * provenance — the opt-in `--scip` live wiring.
 *
 * WHY a post-resolution overlay (discovery-phase-2.md REC-001), NOT an in-pass
 * feed into call-resolver.ts:
 *   - AC-09 pass purity: resolveCalls is PURE over PipelineState — no file-IO,
 *     no external index. Decoding a .scip is file-IO; doing it inside the
 *     resolver would break the structural (not statistical) no-regress
 *     guarantee. The decode happens UPSTREAM (populate.ts), the decoded index
 *     is passed in via options, and the overlay runs AFTER Phase 5 construction.
 *   - No-regress BY CONSTRUCTION: the overlay reads `resolutionStatus` and only
 *     ever flips `unresolved`/`ambiguous` → `resolved`. An edge already
 *     `resolved` (or `builtin`/`external`/`typeOnly`/`dynamic`/`stale`) is NEVER
 *     touched, so every one of the baseline resolved edges is byte-identical.
 *   - No invented edges: the overlay only flips edges that ALREADY EXIST at a
 *     SCIP-referenced (file, line). A SCIP occurrence with no co-located CodeRef
 *     edge (the delta's `absent` class — type positions, identifier reads) is
 *     ignored. The overlay can only RAISE the status of an existing edge.
 *
 * TARGET MAPPING (GI-3/GI-2 by construction — the phase-2 /discover ruling,
 * option C): a flip happens ONLY when the reference's SCIP symbol can be
 * followed to its DEFINITION occurrence in the same index, and that definition
 * site (repo-relative file : 1-indexed line) lands on exactly ONE graph node.
 * The flipped edge is stamped with that node's real `id` as `targetId`, so
 * every scip-resolved edge satisfies GI-3 (resolved ⇒ targetId defined) and
 * GI-2 (targetId ∈ node id set) — and is genuinely traversable by the
 * canonical-graph consumers (what_calls / impact_of / tests_for_change), which
 * skip any edge without a targetId. A reference whose symbol has no definition
 * in the index, or whose definition site has no (or more than one) node, flips
 * NOTHING — the edge keeps its honest unresolved/ambiguous status and the miss
 * is counted in `no_target_mapping`. SCIP `local N` monikers are unique only
 * within their document (SCIP spec), so local symbols are mapped with
 * document-scoped keys — a `local 5` in one file can never bind a reference in
 * another.
 *
 * HONESTY — the flipped tier is `heuristic`, not `exact`. The definition-site →
 * node join is POSITIONAL (line-grain co-location after B-3 normalization), not
 * an identity proof, so the overlay stamps `evidence.confidence:'provisional'`
 * + `reason:'scip_resolved'` and classifyEdgeConfidence projects that onto the
 * `heuristic` tier (resolved + provisional) — labeled, not silently trusted.
 *
 * PURE: graph + decoded index in, mutated-in-place graph + stats out. No I/O,
 * deterministic. `projectPath` is used only for the B-3 path-coordinate
 * normalizer (toRepoRelativePosix) so an ABSOLUTE graph `sourceLocation.file` /
 * node `file` and a repo-RELATIVE SCIP `relativePath` collapse onto one
 * co-location key.
 *
 * ABSENCE = NO-OP: a null/empty index flips nothing and returns zeroed stats —
 * the graph is left byte-identical, which is exactly the no-`--scip` behavior.
 */

import { toRepoRelativePosix } from '../utils/path-normalize.js';
import { classifyEdgeConfidence } from './edge-confidence.js';
import type { ExportedGraph } from '../export/graph-exporter.js';
import type { ScipIndexShape } from './types.js';

/** What the overlay did — surfaces, not verdicts (report the numbers). */
export interface ScipOverlayStats {
  /** true when no index (or an empty one) was supplied — nothing was flipped. */
  no_data: boolean;
  /** SCIP reference occurrences considered (non-definition, with a symbol + range). */
  scip_references: number;
  /** Edges flipped unresolved → resolved by a co-located SCIP reference. */
  flipped_unresolved: number;
  /** Edges flipped ambiguous → resolved by a co-located SCIP reference. */
  flipped_ambiguous: number;
  /** Total edges flipped (flipped_unresolved + flipped_ambiguous). */
  flipped_total: number;
  /**
   * Co-located SCIP references whose edge was ALREADY resolved (left untouched)
   * — context for the no-regress proof (these are the baseline resolved edges
   * the overlay must never disturb).
   */
  already_resolved: number;
  /**
   * Co-located SCIP references sitting on a flippable edge that were left
   * untouched because the symbol could not be mapped to exactly ONE graph node
   * (no definition occurrence in the index, ambiguous definition sites, or
   * no/multiple nodes at the definition site). These edges keep their honest
   * unresolved/ambiguous status — the overlay never emits a resolved edge
   * without a proven targetId (GI-3).
   */
  no_target_mapping: number;
}

/** Key an edge / occurrence / node by "repo-relative-file:1-indexed-line". */
function coLocationKey(file: string, line: number): string {
  return `${file}:${line}`;
}

/**
 * Apply the SCIP resolution overlay to a Phase-5 graph IN PLACE.
 *
 * For every non-definition SCIP reference occurrence, look up the co-located
 * CodeRef edge (same repo-relative file, same 1-indexed line). If that edge is
 * `unresolved` or `ambiguous` AND the reference's symbol maps — via its SCIP
 * definition occurrence — to exactly one graph node, flip it to resolved with
 * SCIP provenance:
 *   - resolutionStatus  → 'resolved'
 *   - targetId          → the mapped node's real id (GI-3/GI-2 by construction)
 *   - evidence          → { ...existing, kind:'scip', scipSymbol, confidence:'provisional' }
 *   - reason            → 'scip_resolved'
 *   - candidates        → cleared (a resolved edge carries no ambiguity set)
 *   - confidence        → recomputed via classifyEdgeConfidence → 'heuristic'
 * (The deprecated legacy `target` field is deliberately left untouched —
 * canonical consumers read `targetId`.)
 *
 * Edges already `resolved` (or any deterministic out-of-project status) are
 * NEVER touched. Occurrences with no co-located edge are ignored (no invented
 * edges). A flippable edge whose symbol has no unique node mapping is left
 * untouched and counted in `no_target_mapping`. Returns stats; mutates
 * `graph.edges` in place.
 *
 * @param graph the Phase-5 ExportedGraph (mutated in place).
 * @param scip decoded SCIP index, or null/undefined for the no-`--scip` path.
 * @param projectPath absolute repo root, for the B-3 path normalizer.
 */
export function applyScipOverlay(
  graph: ExportedGraph,
  scip: ScipIndexShape | null | undefined,
  projectPath: string,
): ScipOverlayStats {
  const zero: ScipOverlayStats = {
    no_data: true,
    scip_references: 0,
    flipped_unresolved: 0,
    flipped_ambiguous: 0,
    flipped_total: 0,
    already_resolved: 0,
    no_target_mapping: 0,
  };

  if (!scip || !Array.isArray(scip.documents) || scip.documents.length === 0) {
    return zero;
  }

  const key = (file: string): string => toRepoRelativePosix(file, projectPath);

  // SCIP `local N` monikers are unique only WITHIN a document (SCIP spec) —
  // scope them by file so locals never cross-bind between documents. Global
  // monikers are index-wide.
  const symbolKey = (docFile: string, symbol: string): string =>
    symbol.startsWith('local ') ? `${docFile}\u0000${symbol}` : symbol;

  // Sentinel for "more than one candidate — no deterministic mapping, no flip".
  const AMBIGUOUS = Symbol('ambiguous-mapping');

  // symbol → its definition site ("file:line"), from the index's definition
  // occurrences. A symbol defined at multiple distinct sites is AMBIGUOUS.
  const defSiteBySymbol = new Map<string, string | typeof AMBIGUOUS>();
  for (const doc of scip.documents) {
    const file = key(doc.relativePath);
    for (const occ of doc.occurrences) {
      if (!occ.isDefinition) continue;
      if (!occ.symbol || !Array.isArray(occ.range) || occ.range.length === 0) continue;
      const sk = symbolKey(file, occ.symbol);
      const site = coLocationKey(file, occ.range[0] + 1);
      const prior = defSiteBySymbol.get(sk);
      if (prior === undefined) defSiteBySymbol.set(sk, site);
      else if (prior !== site) defSiteBySymbol.set(sk, AMBIGUOUS);
    }
  }

  // definition site ("file:line") → the ONE graph node id defined there. Two
  // distinct nodes on the same line (GI-6 allows name+file collisions across
  // scopes) make the site AMBIGUOUS — no flip rather than a guessed target.
  const nodeBySite = new Map<string, string | typeof AMBIGUOUS>();
  for (const node of graph.nodes) {
    if (typeof node.file !== 'string' || typeof node.line !== 'number') continue;
    const site = coLocationKey(key(node.file), node.line);
    const prior = nodeBySite.get(site);
    if (prior === undefined) nodeBySite.set(site, node.id);
    else if (prior !== node.id) nodeBySite.set(site, AMBIGUOUS);
  }

  // Index the FLIPPABLE edges by co-location key. Only unresolved/ambiguous
  // edges are candidates; a site that already has a resolved edge is recorded
  // as resolved so a second unresolved edge at the same site is never flipped
  // over a real resolution (mirrors the delta's "prefer resolved" precedence).
  //
  // Value: the edge object itself (for in-place mutation), or the sentinel
  // RESOLVED marking "an edge here is already resolved — do not flip".
  const RESOLVED = Symbol('already-resolved');
  const bySite = new Map<string, ExportedGraph['edges'][number] | typeof RESOLVED>();

  for (const edge of graph.edges) {
    const file = edge.sourceLocation?.file;
    const line = edge.sourceLocation?.line;
    if (typeof file !== 'string' || typeof line !== 'number') continue;
    const k = coLocationKey(key(file), line);
    const status = edge.resolutionStatus;
    if (status === 'resolved') {
      bySite.set(k, RESOLVED);
      continue;
    }
    if (status === 'unresolved' || status === 'ambiguous') {
      // Do not overwrite a RESOLVED sentinel already recorded for this site.
      if (bySite.get(k) !== RESOLVED) bySite.set(k, edge);
    }
  }

  let scipReferences = 0;
  let flippedUnresolved = 0;
  let flippedAmbiguous = 0;
  let alreadyResolved = 0;
  let noTargetMapping = 0;
  // Guard against two SCIP references at the same site double-counting a flip:
  // once an edge is flipped its status is 'resolved', so the second lookup sees
  // a resolved edge and is counted as already_resolved. A flipped edge is also
  // removed from bySite so it cannot be revisited as a flip candidate.
  for (const doc of scip.documents) {
    const file = key(doc.relativePath);
    for (const occ of doc.occurrences) {
      if (occ.isDefinition) continue; // definitions anchor symbols; overlay is about references
      if (!occ.symbol || !Array.isArray(occ.range) || occ.range.length === 0) continue;
      scipReferences += 1;

      // SCIP range is 0-indexed [startLine, ...]; CodeRef line is 1-indexed.
      const line = occ.range[0] + 1;
      const k = coLocationKey(file, line);
      const hit = bySite.get(k);
      if (hit === undefined) continue; // no co-located edge — never invent one
      if (hit === RESOLVED) {
        alreadyResolved += 1;
        continue; // CodeRef already resolved this site — no-regress, leave it
      }

      // hit is a flippable unresolved/ambiguous edge. Follow the symbol to its
      // definition site, then to the ONE node defined there. No unique node →
      // no flip: the overlay never emits a resolved edge without a proven
      // targetId (GI-3), and GI-2 re-verifies every stamped id downstream.
      const defSite = defSiteBySymbol.get(symbolKey(file, occ.symbol));
      const nodeId = typeof defSite === 'string' ? nodeBySite.get(defSite) : undefined;
      if (typeof nodeId !== 'string') {
        noTargetMapping += 1;
        continue; // edge keeps its honest unresolved/ambiguous status
      }

      // Flip it to resolved with SCIP provenance. The status was captured
      // BEFORE mutation for the counter.
      const wasAmbiguous = hit.resolutionStatus === 'ambiguous';
      const priorEvidence =
        hit.evidence && typeof hit.evidence === 'object' ? hit.evidence : {};
      hit.resolutionStatus = 'resolved';
      hit.targetId = nodeId;
      hit.evidence = {
        ...priorEvidence,
        kind: 'scip',
        scipSymbol: occ.symbol,
        // Provisional: the definition-site → node join is positional
        // (line-grain), not an identity proof. classifyEdgeConfidence maps
        // resolved+provisional → 'heuristic' (labeled, not silently trusted).
        confidence: 'provisional',
      };
      hit.reason = 'scip_resolved';
      // A resolved edge carries no ambiguity set.
      hit.candidates = undefined;
      hit.confidence = classifyEdgeConfidence('resolved', 'scip_resolved', 'provisional');

      if (wasAmbiguous) flippedAmbiguous += 1;
      else flippedUnresolved += 1;
      // Prevent re-flip / double-count: mark this site resolved.
      bySite.set(k, RESOLVED);
    }
  }

  const flippedTotal = flippedUnresolved + flippedAmbiguous;

  // Recompute graph statistics that key off resolution (edgesByType is by
  // relationship, not status, so it is unchanged; edgeCount is unchanged — the
  // overlay never adds or removes edges). Nothing structural changes, so the
  // ExportedGraph.statistics block stays valid as-is.

  return {
    no_data: false,
    scip_references: scipReferences,
    flipped_unresolved: flippedUnresolved,
    flipped_ambiguous: flippedAmbiguous,
    flipped_total: flippedTotal,
    already_resolved: alreadyResolved,
    no_target_mapping: noTargetMapping,
  };
}

/**
 * Phase 5 Graph Builder
 *
 * WO-PIPELINE-GRAPH-CONSTRUCTION-001
 *
 * Single authoritative path (DR-PHASE-5-B) for constructing the
 * canonical ExportedGraph from PipelineState. Replaces 6 distinct
 * graph emission sites that lived inline in orchestrator.ts and the
 * legacy DependencyGraph builders (the latter are marked @legacy
 * but kept per DR-PHASE-5-C).
 *
 * Two-pass:
 *   Pass 1 (buildNodes) — every state.elements item becomes a graph
 *     node with id = canonical codeRefId (AC-01).
 *   Pass 2 (buildEdges) — every state.importResolutions and
 *     state.callResolutions becomes a graph edge with the new
 *     8-field schema (AC-03). Resolved edges have both sourceId AND
 *     targetId pointing at codeRefIds that exist in graph.nodes
 *     (AC-02). Non-resolved kinds OMIT targetId (DR-PHASE-5-A).
 *     Header-import-derived ImportResolutions become relationship=
 *     'header-import' edges; AST-derived become relationship='import'
 *     (AC-04). Same module:symbol pair from both sources produces
 *     TWO edges, intentionally (R-PHASE-5-C drift detection).
 *
 * Phase 5 invariants (enforced by tests):
 *   AC-01: every graph.nodes[i].id is a canonical codeRefId.
 *   AC-02: every resolved edge's sourceId AND targetId appear in
 *          graph.nodes (Phase 0 test 1 line 52 finally flips).
 *   AC-03: every edge has id, sourceId, relationship,
 *          resolutionStatus; targetId/evidence/sourceLocation/
 *          candidates conditional on kind.
 *   AC-04: header-import vs import coexistence — distinct
 *          relationship values, two edges intentional.
 *   AC-05: non-resolved edges OMIT targetId (no synthetic
 *          placeholders).
 *   AC-08: deterministic and pure — N invocations on identical state
 *          produce deepStrictEqual outputs, including edge.id values.
 *   AC-10: edge.id is unique across the graph (deterministic hash
 *          per DR-PHASE-5-D).
 *
 * Design records:
 *   DR-PHASE-5-A: omit targetId for non-resolved (no placeholder).
 *   DR-PHASE-5-B: graph-builder.ts is the single authoritative path.
 *   DR-PHASE-5-C: legacy DependencyGraph builders marked @legacy,
 *                 NOT deleted in Phase 5.
 *   DR-PHASE-5-D: deterministic sha1 hash for edge ids (16 hex chars
 *                 over sourceId+relationship+target+location).
 */

import * as crypto from 'crypto';
import type { PipelineState, CallResolution, ImportResolution } from './types.js';
import type { ElementData } from '../types/types.js';
import type { ExportedGraph } from '../export/graph-exporter.js';
import { createCodeRefId } from '../utils/coderef-id.js';
import { globalRegistry } from '../registry/entity-registry.js';

/**
 * Canonical edge relationship enum (AC-03 + AC-04).
 *
 *   import        — AST-derived ImportResolution (came from a
 *                   RawImportFact). Sourced via state.rawImports.
 *   call          — Phase 4 CallResolution. Sourced via
 *                   state.callResolutions.
 *   export        — reserved for future use; Phase 5 does not emit
 *                   export edges (exports are tracked on nodes via
 *                   element.exported).
 *   header-import — Header-derived ImportResolution (came from a
 *                   HeaderImportFact). Sourced via
 *                   state.headerImportFacts. Per AC-04 these coexist
 *                   with 'import' edges without merging.
 */
export type EdgeRelationship = 'import' | 'call' | 'export' | 'header-import';

/**
 * Canonical edge resolution status (AC-03).
 */
export type EdgeResolutionStatus =
  | 'resolved'
  | 'unresolved'
  | 'ambiguous'
  | 'external'
  | 'builtin'
  | 'dynamic'
  | 'typeOnly'
  | 'stale';

/**
 * 8-field canonical graph edge schema (DR-PHASE-5-D).
 *
 * Note: the existing ExportedGraph type carries `source`/`target`/
 * `type`/`metadata` for legacy compat. Phase 5 emits the new
 * canonical fields (`sourceId`/`targetId`/`relationship`) AND keeps
 * the legacy fields populated (source=sourceId, target=targetId
 * fallback, type=relationship) so consumers transitioning to the new
 * schema can read either. Future cleanup workorder removes the
 * legacy fields.
 */
export interface GraphEdgeV2 {
  /** Required. Deterministic hash, unique within the graph. */
  id: string;
  /** Required. Canonical codeRefId of the source element. */
  sourceId: string;
  /**
   * Conditional. Canonical codeRefId of the target element.
   * Present only when resolutionStatus === 'resolved'.
   * OMITTED (not synthetic) for all non-resolved kinds (DR-PHASE-5-A).
   */
  targetId?: string;
  /** Required. One of import|call|export|header-import. */
  relationship: EdgeRelationship;
  /** Required. Disposition of the edge. */
  resolutionStatus: EdgeResolutionStatus;
  /** Conditional. Structured evidence keyed by relationship kind. */
  evidence?: Record<string, unknown>;
  /** Conditional. {file, line} of the import/call statement. */
  sourceLocation?: { file: string; line: number };
  /**
   * Conditional. Candidate codeRefIds; only present when
   * resolutionStatus === 'ambiguous'. Always >= 2 entries when
   * present.
   */
  candidates?: string[];
  /**
   * Reason string for non-resolved kinds. Mirrors the reason field
   * already carried by ImportResolution / CallResolution.
   */
  reason?: string;
  // Legacy compat surface (matches ExportedGraph['edges'][number]).
  source: string;
  target: string;
  type: string;
  metadata?: Record<string, unknown>;
}

/**
 * Entry point. Drives pass 1 then pass 2 and returns a fully
 * constructed ExportedGraph. Caller is responsible for assigning
 * the result to state.graph.
 *
 * R-PHASE-4-B / R-PHASE-5-B: state.importResolutions and
 * state.callResolutions must be populated (Phase 3 + Phase 4 must
 * have run). Throws when null/undefined.
 *
 * AC-08 + AC-09: pure over PipelineState; identical state produces
 * identical ExportedGraph (including edge.id hashes).
 */
export function constructGraph(state: PipelineState): ExportedGraph {
  if (state.importResolutions === null || state.importResolutions === undefined) {
    throw new Error(
      '[Phase 5 / graph-builder] state.importResolutions is null/undefined. ' +
      'Phase 3 must run first; resolveImports populates the cross-phase seam ' +
      'Phase 5 reads.',
    );
  }
  if (state.callResolutions === null || state.callResolutions === undefined) {
    throw new Error(
      '[Phase 5 / graph-builder] state.callResolutions is null/undefined. ' +
      'Phase 4 must run first; resolveCalls populates the cross-phase seam ' +
      'Phase 5 reads.',
    );
  }

  // Pass 1: build nodes from state.elements.
  const nodes = buildNodes(state);
  const nodeIdSet = new Set(nodes.map(n => n.id));

  // Pass 2: build edges from importResolutions + callResolutions.
  // Implementation lands in tasks 1.7-1.9 after structural_foundation_review.
  const edges = buildEdges(state, nodeIdSet);

  // Statistics.
  const edgesByType: Record<string, number> = {};
  for (const edge of edges) {
    edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
  }
  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const maxPossibleEdges = nodeCount * (nodeCount - 1);
  const densityRatio = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

  return {
    version: '1.0.0',
    exportedAt: Date.now(),
    nodes,
    edges,
    statistics: {
      nodeCount,
      edgeCount,
      edgesByType,
      densityRatio,
    },
  };
}

/**
 * Pass 1 — every state.elements item becomes a graph node with
 * id = canonical codeRefId. Preserves metadata.codeRefId for
 * backwards-compat consumers during the transition window.
 *
 * AC-01: every graph.nodes[i].id is a canonical codeRefId.
 *
 * Public for testability of the two-pass split.
 */
export function buildNodes(state: PipelineState): ExportedGraph['nodes'] {
  const projectPath = state.projectPath;
  return state.elements.map(elem => {
    const id = elem.codeRefId
      ?? createCodeRefId(elem, projectPath, { includeLine: true });
    const codeRefIdNoLine = elem.codeRefIdNoLine
      ?? createCodeRefId(elem, projectPath, { includeLine: false });
    return {
      id,
      uuid: globalRegistry.lookup({ name: elem.name, file: elem.file, line: elem.line }),
      type: elem.type,
      name: elem.name,
      file: elem.file,
      line: elem.line,
      metadata: {
        codeRefId: id,
        codeRefIdNoLine,
      },
    };
  });
}

/**
 * Pass 2 — promote every ImportResolution and CallResolution into a
 * graph edge with the new 8-field schema. Implementation lands in
 * tasks 1.7–1.9 after structural_foundation_review.
 *
 * Public for testability of the two-pass split.
 */
export function buildEdges(
  state: PipelineState,
  nodeIdSet: ReadonlySet<string>,
): ExportedGraph['edges'] {
  // Skeleton: tasks 1.7–1.9 implement the full edge-emission logic
  // (import + call + header-import edges, evidence assembly, edge-id
  // hashing). Returns an empty edge list so types compile and the
  // checkpoint halt can land before pass-2 implementation begins.
  void state;
  void nodeIdSet;
  return [];
}

/**
 * Compute a deterministic 16-hex-char edge id (DR-PHASE-5-D).
 *
 * Strategy: sha1 over `sourceId + ':' + relationship + ':' +
 * (targetId ?? originSpecifier) + ':' + sourceFile + ':' + line`.
 * Truncate to 16 hex chars (2^64 collision resistance — adequate
 * for a per-project graph). Same (source, relationship, target/
 * specifier, location) tuple ALWAYS produces the same id.
 *
 * For unresolved edges where targetId is absent, originSpecifier
 * stands in. The id is stable as long as the source element's
 * codeRefId is stable.
 *
 * Public for testability and explicit documentation of the id shape.
 */
export function computeEdgeId(args: {
  sourceId: string;
  relationship: EdgeRelationship;
  targetId?: string;
  originSpecifier: string;
  sourceFile: string;
  line: number;
}): string {
  const target = args.targetId ?? args.originSpecifier;
  const tuple = `${args.sourceId}:${args.relationship}:${target}:${args.sourceFile}:${args.line}`;
  return crypto.createHash('sha1').update(tuple).digest('hex').slice(0, 16);
}

/**
 * Determine whether an ImportResolution came from a RawImportFact
 * (relationship='import') or a HeaderImportFact (relationship=
 * 'header-import'). Implementation note: the resolver does not
 * record the source explicitly; we identify header-derived
 * resolutions by checking whether the (sourceFile, originSpecifier)
 * pair matches a HeaderImportFact in state.headerImportFacts.
 *
 * Per AC-04, the same (sourceFile, module, symbol) tuple may
 * appear in BOTH sources and produces TWO edges with distinct
 * relationship values. This function answers "does THIS particular
 * ImportResolution trace back to a header fact?" — duplication is
 * handled by emitting one edge per ImportResolution, since Phase 3
 * already emits one ImportResolution per HeaderImportFact AND one
 * per RawImportFact specifier (see import-resolver AC-01).
 *
 * Public for testability of the AC-04 coexistence invariant.
 */
export function isHeaderDerived(
  resolution: ImportResolution,
  state: PipelineState,
): boolean {
  // Phase 3 emits ImportResolution from two sources:
  //   resolveAstImports — one per RawImportFact specifier
  //   resolveHeaderImports — one per HeaderImportFact
  // The localName matches a HeaderImportFact.symbol AND the
  // originSpecifier matches HeaderImportFact.module. We use this
  // tuple to decide which source produced the resolution. AST
  // ImportResolutions also have localName/originSpecifier, but the
  // header-fact check is sufficient: a resolution is header-derived
  // IFF a HeaderImportFact exists with the same (sourceFile, module,
  // symbol) tuple AND the resolution is the matching record.
  // Phase 3's resolveHeaderImports order ensures header resolutions
  // appear AFTER ast resolutions in importResolutions[]; we match
  // by tuple, not by index.
  for (const fact of state.headerImportFacts) {
    if (
      fact.sourceFile === resolution.sourceFile
      && fact.module === resolution.originSpecifier
      && fact.symbol === resolution.localName
    ) {
      return true;
    }
  }
  return false;
}

// Helpers re-exported above so consumers (tests, future cleanup
// workorders) can verify the schema without re-deriving it.
export type { CallResolution, ImportResolution } from './types.js';
export type { ElementData } from '../types/types.js';

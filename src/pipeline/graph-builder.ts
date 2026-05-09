/**
 * @coderef-semantic: 1.0.0
 * @exports EdgeRelationship, EdgeResolutionStatus, EdgeEvidence, GraphEdgeV2, constructGraph, buildNodes, fileGrainNodeId, buildEdges, computeEdgeId, isHeaderDerived
 * @used_by src/pipeline/orchestrator.ts, __tests__/pipeline/graph-construction-determinism.test.ts
 */

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
 * Discriminated union for edge evidence (ORCHESTRATOR design call,
 * checkpoint 1.6 review). Phase 6's validator reads
 * `edge.evidence.{field}` for invariant checks; the discriminator
 * lets TypeScript enforce the shape per (relationship,
 * resolutionStatus) combination at the validator boundary.
 *
 * 10 variants — one per active edge kind:
 *   resolved-import / unresolved-import / ambiguous-import / external-import
 *   resolved-call   / unresolved-call   / ambiguous-call   / builtin-call
 *   header-import   / stale-header-import
 *
 * Note: dynamic / typeOnly / stale (non-header) imports use the
 * `unresolved-import` variant with appropriate `reason` strings.
 * Phase 5 maps them to that variant rather than introducing more
 * variants — Phase 6 can split later if needed.
 */
export type EdgeEvidence =
  | { kind: 'resolved-import'; resolvedModuleFile: string; originSpecifier: string; localName: string }
  | { kind: 'unresolved-import'; originSpecifier: string; reason: string }
  | { kind: 'ambiguous-import'; originSpecifier: string; candidates: string[] }
  | { kind: 'external-import'; originSpecifier: string; packageName?: string }
  | { kind: 'resolved-call'; calleeName: string; receiverText: string; scopePath: string }
  | { kind: 'unresolved-call'; calleeName: string; receiverText: string; reason: string }
  | { kind: 'ambiguous-call'; calleeName: string; receiverText: string; candidates: string[] }
  | { kind: 'builtin-call'; calleeName: string; receiverText: string }
  | { kind: 'header-import'; module: string; symbol: string; resolvedModuleFile?: string }
  | { kind: 'stale-header-import'; module: string; symbol: string; reason: string };

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
  /** Conditional. Structured evidence as a discriminated union. */
  evidence?: EdgeEvidence;
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
  const nodes: ExportedGraph['nodes'] = state.elements.map(elem => {
    const id = elem.codeRefId
      ?? createCodeRefId(elem, projectPath, { includeLine: true });
    const codeRefIdNoLine = elem.codeRefIdNoLine
      ?? createCodeRefId(elem, projectPath, { includeLine: false });
    // Phase 7 task 1.1.5 (Option 3 per ORCHESTRATOR ruling DISPATCH-2026-05-04-001):
    // additive metadata propagation of 4 ElementData semantic facets so
    // chunk-conversion can attach them to RAG chunks without re-routing
    // through PipelineState. Strictly additive — undefined-passthrough
    // when ElementData lacks the value. No graph topology change.
    const metadata: Record<string, unknown> = {
      codeRefId: id,
      codeRefIdNoLine,
    };
    if (elem.layer !== undefined) metadata.layer = elem.layer;
    if (elem.capability !== undefined) metadata.capability = elem.capability;
    if (elem.constraints !== undefined) metadata.constraints = elem.constraints;
    if (elem.headerStatus !== undefined) metadata.headerStatus = elem.headerStatus;
    return {
      id,
      uuid: globalRegistry.lookup({ name: elem.name, file: elem.file, line: elem.line }),
      type: elem.type,
      name: elem.name,
      file: elem.file,
      line: elem.line,
      metadata,
    };
  });

  // Emit file-grain pseudo-nodes for every source file. Module-level
  // imports (importerCodeRefId === null in Phase 3 ImportResolution)
  // need a source-side endpoint that exists in graph.nodes for AC-02
  // (resolved edges with both endpoints in graph). The file-grain
  // node id pattern is `@File/{relativePath}`. Per AC-01 these ids
  // ARE canonical codeRefIds in the broadened sense — they identify
  // a file as a graph entity rather than a code element. Phase 6
  // validators may opt to filter them out for element-only queries.
  const seenFiles = new Set<string>();
  // First-seen-wins per file — same policy as buildFileHeaderStatusMap in
  // output-validator.ts. Used to stamp headerStatus on file-grain nodes.
  const fileHeaderStatus = new Map<string, string>();
  for (const elem of state.elements) {
    seenFiles.add(elem.file);
    if (elem.headerStatus !== undefined && !fileHeaderStatus.has(elem.file)) {
      fileHeaderStatus.set(elem.file, elem.headerStatus);
    }
  }
  // Also include files referenced by importResolutions (importer side)
  // so module-level imports always have a source-node.
  for (const ir of state.importResolutions) {
    seenFiles.add(ir.sourceFile);
  }
  for (const file of seenFiles) {
    const id = fileGrainNodeId(file, projectPath);
    const fileGrainMeta: Record<string, unknown> = { codeRefId: id, codeRefIdNoLine: id, fileGrain: true };
    const hs = fileHeaderStatus.get(file);
    if (hs !== undefined) fileGrainMeta.headerStatus = hs;
    nodes.push({
      id,
      type: 'file',
      name: id,
      file,
      line: 1,
      metadata: fileGrainMeta,
    });
  }

  return nodes;
}

/**
 * Compute the file-grain node id for a given source file. Pattern:
 * `@File/{projectRelativePath}`. Slashes are normalized to forward
 * slashes; absolute paths within projectPath are made relative.
 */
export function fileGrainNodeId(file: string, projectPath: string): string {
  // path.relative behavior + forward-slash normalization mirrors
  // createCodeRefId's normalizeProjectPath helper.
  const path = require('path') as typeof import('path');
  const normalized = path.isAbsolute(file)
    ? path.relative(projectPath, file)
    : file;
  const rel = normalized.replace(/\\/g, '/').replace(/^\.\//, '');
  return `@File/${rel}`;
}

/**
 * Pass 2 — promote every ImportResolution and CallResolution into a
 * graph edge with the new 8-field schema.
 *
 * Edge emission rules (DR-PHASE-5-A + DR-PHASE-5-D):
 *   - kind='resolved' AND both endpoints bound → emit edge with
 *     sourceId, targetId, relationship, resolutionStatus, evidence.
 *   - kind='resolved' but no resolved target codeRefId (e.g.
 *     namespace import with resolvedModuleFile only, or a resolved
 *     binding whose target element wasn't extracted) → emit with
 *     sourceId set, targetId absent. Honors AC-05.
 *   - kind='unresolved'/'ambiguous'/'external'/'builtin'/'dynamic'/
 *     'typeOnly'/'stale' → sourceId set, targetId OMITTED, evidence
 *     populated per discriminated union variant. No synthetic
 *     placeholder.
 *
 * Header-vs-AST distinction (AC-04): each ImportResolution is
 * checked against state.headerImportFacts via isHeaderDerived. A
 * match emits relationship='header-import'; otherwise 'import'.
 * The same (sourceFile, module, symbol) tuple may produce TWO
 * edges intentionally — one from the AST resolution, one from the
 * header resolution. This is the drift-detection signal
 * (R-PHASE-5-C).
 *
 * Edges with NO sourceId (e.g. module-level imports where the
 * resolver returned null importerCodeRefId) are skipped — they
 * cannot be canonical-codeRefId graph edges. Phase 3/4 already
 * preserve these as explicit facts in state.importResolutions /
 * state.callResolutions; Phase 5 simply omits them from the graph.
 *
 * Public for testability of the two-pass split.
 */
export function buildEdges(
  state: PipelineState,
  nodeIdSet: ReadonlySet<string>,
): ExportedGraph['edges'] {
  void nodeIdSet; // currently unused; reserved for future pruning.
  const edges: ExportedGraph['edges'] = [];

  // === Import edges ===
  // Phase 3's resolveAstImports emits BEFORE resolveHeaderImports, so
  // a (sourceFile, module, symbol) tuple that exists in BOTH sources
  // appears twice in state.importResolutions[] — first as AST, then
  // as header. Track which header-facts have been "claimed" so the
  // first matching resolution gets relationship='import' (AST) and
  // the second gets relationship='header-import' (header). This
  // mirrors Phase 3's emission order semantics.
  const claimedHeaderFactKeys = new Set<string>();
  for (const ir of state.importResolutions) {
    // Module-level imports (Phase 3 emits importerCodeRefId=null
    // when the import statement lives at module scope, not inside an
    // element). Phase 5 falls back to the file-grain node id so the
    // edge has a source endpoint that exists in graph.nodes.
    const sourceId = ir.importerCodeRefId
      ?? fileGrainNodeId(ir.sourceFile, state.projectPath);
    // Header-vs-AST distinction: a resolution is header-derived iff
    // (a) a HeaderImportFact exists matching its (sourceFile, module,
    // symbol), AND (b) no earlier resolution has already claimed
    // that fact. The "earliest claim wins" ordering gives AST edges
    // priority for the relationship='import' label, matching Phase
    // 3's emission order (resolveAstImports runs before
    // resolveHeaderImports).
    const factKey = `${ir.sourceFile}\u0000${ir.originSpecifier}\u0000${ir.localName}`;
    const headerFactExists = isHeaderDerived(ir, state);
    let headerDerived = false;
    if (headerFactExists) {
      if (claimedHeaderFactKeys.has(factKey)) {
        // Earlier resolution (likely AST) already claimed the fact;
        // THIS resolution must be the header-derived one.
        headerDerived = true;
      } else {
        // First matching resolution — claim it as AST. Mark so the
        // next matching resolution flips to header-derived.
        claimedHeaderFactKeys.add(factKey);
        headerDerived = false;
      }
    }
    const relationship: EdgeRelationship = headerDerived ? 'header-import' : 'import';

    const sourceFile = ir.sourceFile;
    // ImportResolution doesn't carry a line; use 0 as a stable
    // placeholder. The (sourceId, relationship, target/specifier,
    // sourceFile) tuple is still unique because Phase 3 emits at
    // most one ImportResolution per (sourceFile, originSpecifier,
    // localName) tuple, and importerCodeRefId disambiguates further.
    const line = 0;

    // Branch on resolution kind. If kind='resolved' but no
    // resolvedTargetCodeRefId (module bound, but the symbol's element
    // wasn't extracted — e.g., a re-exported constant from an
    // unscanned file), demote to 'external' so the graph stays
    // honest. AC-05 requires resolved edges to have targetId.
    if (ir.kind === 'resolved' && !ir.resolvedTargetCodeRefId) {
      const id = computeEdgeId({
        sourceId,
        relationship,
        originSpecifier: ir.originSpecifier,
        sourceFile,
        line,
      });
      const evidence: EdgeEvidence = {
        kind: 'external-import',
        originSpecifier: ir.originSpecifier,
      };
      edges.push(buildEdgeRecord({
        id, sourceId, relationship,
        resolutionStatus: 'external',
        evidence,
        sourceLocation: { file: sourceFile, line },
      }));
      continue;
    }
    if (ir.kind === 'resolved') {
      const targetId = ir.resolvedTargetCodeRefId;
      let evidence: EdgeEvidence;
      if (headerDerived) {
        evidence = {
          kind: 'header-import',
          module: ir.originSpecifier,
          symbol: ir.localName,
          resolvedModuleFile: ir.resolvedModuleFile,
        };
      } else {
        // 'resolved-import' evidence requires resolvedModuleFile;
        // when absent (rare — can happen for namespace imports
        // bound to a module without a single target element), fall
        // through to evidence omitted.
        evidence = ir.resolvedModuleFile
          ? {
              kind: 'resolved-import',
              resolvedModuleFile: ir.resolvedModuleFile,
              originSpecifier: ir.originSpecifier,
              localName: ir.localName,
            }
          : {
              kind: 'unresolved-import',
              originSpecifier: ir.originSpecifier,
              reason: 'resolved_but_no_module_file',
            };
      }
      const id = computeEdgeId({
        sourceId,
        relationship,
        targetId,
        originSpecifier: ir.originSpecifier,
        sourceFile,
        line,
      });
      edges.push(buildEdgeRecord({
        id, sourceId, targetId, relationship,
        resolutionStatus: 'resolved',
        evidence,
        sourceLocation: { file: sourceFile, line },
      }));
      continue;
    }

    // Stale (header-only).
    if (ir.kind === 'stale') {
      const evidence: EdgeEvidence = {
        kind: 'stale-header-import',
        module: ir.originSpecifier,
        symbol: ir.localName,
        reason: ir.reason ?? 'symbol_not_in_module_exports',
      };
      const id = computeEdgeId({
        sourceId,
        relationship: 'header-import',
        originSpecifier: ir.originSpecifier,
        sourceFile,
        line,
      });
      edges.push(buildEdgeRecord({
        id, sourceId, relationship: 'header-import',
        resolutionStatus: 'stale',
        evidence,
        sourceLocation: { file: sourceFile, line },
        reason: ir.reason,
      }));
      continue;
    }

    // External / unresolved / ambiguous / dynamic / typeOnly.
    const id = computeEdgeId({
      sourceId,
      relationship,
      originSpecifier: ir.originSpecifier,
      sourceFile,
      line,
    });
    let evidence: EdgeEvidence;
    if (ir.kind === 'external') {
      evidence = { kind: 'external-import', originSpecifier: ir.originSpecifier };
    } else if (ir.kind === 'ambiguous' && ir.candidates && ir.candidates.length > 0) {
      evidence = {
        kind: 'ambiguous-import',
        originSpecifier: ir.originSpecifier,
        candidates: ir.candidates,
      };
    } else {
      evidence = {
        kind: 'unresolved-import',
        originSpecifier: ir.originSpecifier,
        reason: ir.reason ?? `kind:${ir.kind}`,
      };
    }
    edges.push(buildEdgeRecord({
      id, sourceId, relationship,
      resolutionStatus: ir.kind,
      evidence,
      sourceLocation: { file: sourceFile, line },
      candidates: ir.candidates,
      reason: ir.reason,
    }));
  }

  // === Call edges ===
  for (const cr of state.callResolutions) {
    // Module-level calls fall back to file-grain node id (parallel to
    // the import-edge handling above).
    const sourceId = cr.callerCodeRefId
      ?? fileGrainNodeId(cr.sourceFile, state.projectPath);
    const sourceFile = cr.sourceFile;
    const line = cr.line;
    const calleeName = cr.calleeName;
    const receiverText = cr.receiverText ?? '';

    if (cr.kind === 'resolved') {
      const targetId = cr.resolvedTargetCodeRefId;
      const evidence: EdgeEvidence = {
        kind: 'resolved-call',
        calleeName,
        receiverText,
        scopePath: cr.scopePath.join('.'),
      };
      const id = computeEdgeId({
        sourceId, relationship: 'call', targetId,
        originSpecifier: calleeName, sourceFile, line,
      });
      edges.push(buildEdgeRecord({
        id, sourceId, targetId, relationship: 'call',
        resolutionStatus: 'resolved',
        evidence,
        sourceLocation: { file: sourceFile, line },
      }));
      continue;
    }

    // Non-resolved call kinds.
    const id = computeEdgeId({
      sourceId, relationship: 'call',
      originSpecifier: calleeName, sourceFile, line,
    });
    let evidence: EdgeEvidence;
    if (cr.kind === 'builtin') {
      evidence = { kind: 'builtin-call', calleeName, receiverText };
    } else if (cr.kind === 'ambiguous' && cr.candidates && cr.candidates.length > 0) {
      evidence = {
        kind: 'ambiguous-call', calleeName, receiverText,
        candidates: cr.candidates,
      };
    } else {
      evidence = {
        kind: 'unresolved-call', calleeName, receiverText,
        reason: cr.reason ?? `kind:${cr.kind}`,
      };
    }
    edges.push(buildEdgeRecord({
      id, sourceId, relationship: 'call',
      resolutionStatus: cr.kind,
      evidence,
      sourceLocation: { file: sourceFile, line },
      candidates: cr.candidates,
      reason: cr.reason,
    }));
  }

  return edges;
}

/**
 * Build a single ExportedGraph edge record. Populates BOTH the new
 * 8-field canonical fields AND the legacy source/target/type/
 * metadata fields for backwards-compat consumers during the Phase
 * 5 transition window.
 */
function buildEdgeRecord(args: {
  id: string;
  sourceId: string;
  targetId?: string;
  relationship: EdgeRelationship;
  resolutionStatus: EdgeResolutionStatus;
  evidence?: EdgeEvidence;
  sourceLocation?: { file: string; line: number };
  candidates?: string[];
  reason?: string;
}): ExportedGraph['edges'][number] {
  const record: ExportedGraph['edges'][number] = {
    id: args.id,
    sourceId: args.sourceId,
    targetId: args.targetId,
    relationship: args.relationship,
    resolutionStatus: args.resolutionStatus,
    evidence: args.evidence as Record<string, unknown> | undefined,
    sourceLocation: args.sourceLocation,
    candidates: args.candidates,
    reason: args.reason,
    // Legacy compat: source = sourceId, target = targetId ?? evidence
    // originSpecifier ?? '', type = relationship.
    source: args.sourceId,
    target: args.targetId ?? '',
    type: args.relationship,
  };
  return record;
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

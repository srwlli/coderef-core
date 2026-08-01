/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability graph-builder-edge-relationship
 * @exports EdgeRelationship, EdgeResolutionStatus, EdgeEvidence, GraphEdgeV2, constructGraph, buildNodes, EndpointRecord, collectEndpoints, fileGrainNodeId, buildEdges, computeEdgeId, isHeaderDerived, isTestOriginFile
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
import type { PipelineState, CallResolution, ImportResolution, HeritageRelationship } from './types.js';
import type { ElementData } from '../types/types.js';
import type { ExportedGraph } from '../export/graph-exporter.js';
import { createCodeRefId } from '../utils/coderef-id.js';
import { globalRegistry } from '../registry/entity-registry.js';
import { normalizeSlashes } from '../utils/path-normalize.js';
import { classifyEdgeConfidence } from './edge-confidence.js';
import { docTargets } from './doc-ingest.js';
import {
  METHOD_UNSPECIFIED,
  canonicalEndpointPath,
  classifyClientPath,
  endpointNodeId,
} from './endpoint-identity.js';

/**
 * Canonical edge relationship enum (AC-03 + AC-04).
 *
 *   import        — AST-derived ImportResolution (came from a
 *                   RawImportFact). Sourced via state.rawImports.
 *   call          — Phase 4 CallResolution. Sourced via
 *                   state.callResolutions.
 *   export        — file-to-element edge for exported elements; source
 *                   is the file-grain node, target is the element's
 *                   codeRefId. Emitted in buildEdges pass 2.5.
 *   header-import — Header-derived ImportResolution (came from a
 *                   HeaderImportFact). Sourced via
 *                   state.headerImportFacts. Per AC-04 these coexist
 *                   with 'import' edges without merging.
 *   extends       — class/interface inheritance heritage edge
 *                   (WO-...-GENRE-FEATURES-PROGRAM-001 P5). Sourced via
 *                   state.heritage (subtype extends supertype).
 *   implements    — interface-conformance heritage edge. Sourced via
 *                   state.heritage (subtype implements supertype).
 *   calls_endpoint  — a client-side API call crossing the network
 *                   boundary. Source is the calling element's
 *                   file-grain node, target is an `@Endpoint/...`
 *                   node. Sourced via state.frontendCalls.
 *   serves_endpoint — an endpoint dispatching to the handler that
 *                   serves it. Source is the `@Endpoint/...` node,
 *                   target is the handler's file-grain node. Sourced
 *                   via state.routes.
 */
export type EdgeRelationship =
  | 'import'
  | 'call'
  | 'export'
  | 'header-import'
  | 'extends'
  | 'implements'
  // WO-API-SURFACE-MAPPING-...-001 P2 (REC-002): HTTP endpoint edges.
  | 'calls_endpoint'
  | 'serves_endpoint'
  // WO-DOCS-TO-GRAPH-P1-...-001: a governing doc (`@Doc/...` node) documenting
  // a source file (`@File/...` node). Sourced via state.docs.
  | 'documents'
  // WO-TREAT-MARKDOWN-FILES-LIKE-CODE-SECTION-LEVEL-AST-001 P1: a doc
  // (`@Doc/x.md`) containing one of its heading-delimited sections
  // (`@Doc/x.md#slug`). Structural containment, never a dependency — it only
  // ever sources from a doc node and targets that same doc's section node.
  | 'contains';

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
export type EdgeEvidence = (
  | { kind: 'resolved-import'; resolvedModuleFile: string; originSpecifier: string; localName: string }
  | { kind: 'unresolved-import'; originSpecifier: string; reason: string }
  | { kind: 'ambiguous-import'; originSpecifier: string; candidates: string[] }
  | { kind: 'external-import'; originSpecifier: string; packageName?: string; workspacePackage?: string; workspaceRoot?: string }
  | { kind: 'resolved-call'; calleeName: string; receiverText: string; scopePath: string }
  | { kind: 'unresolved-call'; calleeName: string; receiverText: string; reason: string }
  | { kind: 'ambiguous-call'; calleeName: string; receiverText: string; candidates: string[] }
  | { kind: 'builtin-call'; calleeName: string; receiverText: string }
  | { kind: 'header-import'; module: string; symbol: string; resolvedModuleFile?: string }
  | { kind: 'stale-header-import'; module: string; symbol: string; reason: string }
  // WO-API-SURFACE-MAPPING-...-001 P2. `detectionConfidence` is deliberately NOT
  // named `confidence`: the intersection below already owns that key with the
  // literal type 'provisional', and FrontendCall.confidence is a 0-100 NUMBER
  // (100 static string / 80 template literal). Reusing the name would collapse
  // two unrelated signals into one field.
  | {
      kind: 'calls-endpoint';
      endpointPath: string;
      method: string;
      callType: string;
      detectionConfidence: number;
      rawPath: string;
    }
  | {
      kind: 'serves-endpoint';
      endpointPath: string;
      method: string;
      framework: string;
      declaredMethods: string[];
    }
  // WO-DOCS-TO-GRAPH-P1-...-001: provenance for a `documents` edge. docStatus
  // and placeholderSections are what the retrieval ranking contract reads
  // (projected-facts > approved > draft; placeholders never authority), so
  // they ride the EDGE, not just the node — a consumer holding one edge can
  // rank it without a second node lookup.
  | {
      kind: 'documents';
      sheetPath: string;
      docStatus: string;
      placeholderSections: number;
      documentsPath: string;
    }
  // WO-TREAT-MARKDOWN-FILES-LIKE-CODE-SECTION-LEVEL-AST-001 P1: provenance for
  // a `contains` edge. `order` + `depth` let a consumer rebuild the document's
  // heading outline from edges alone, without re-reading the markdown.
  | {
      kind: 'contains';
      sheetPath: string;
      slug: string;
      depth: number;
      order: number;
    }
) & {
  /**
   * Additive evidence-level tag (STUB-K5YBFN, operator ruling option A):
   * present and true when the edge's sourceLocation.file is a test file
   * (`__tests__|.test.|.spec.`). Lets validation reporting surface
   * src-only counts alongside totals WITHOUT changing graph semantics —
   * test-origin edges keep their status, ids, and totals membership.
   */
  testOrigin?: boolean;
  /**
   * Additive evidence-level tier (STUB-6CWWHQ, Phase 2). Present and set to
   * 'provisional' on a resolved-call edge whose CallResolution.confidence was
   * 'provisional' (the single_candidate_unknown_receiver tier). The edge is a
   * genuine resolved edge (targetId set, counted in valid_edge_count) but the
   * flag lets validation reporting sub-count it (provisional_count) and lets
   * agents filter by trust tier. Never present on ambiguous/unresolved edges.
   */
  confidence?: 'provisional';
};

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
  // STUB-M3GE4S: a RESOLVED call whose caller is a module-level statement
  // (callerCodeRefId === null) uses the file-grain node `@File/<sourceFile>`
  // as its edge source (buildEdges line ~601). If that file has no extracted
  // elements and no import resolutions, its file-grain node would be absent —
  // producing a resolved call edge with a dangling sourceId (GI-2 failure).
  // This bit Python module-level scripts on Primary-Sources (167 of 220
  // errors). Guarantee a file-grain node for every call source file.
  for (const cr of state.callResolutions) {
    if (cr.sourceFile) seenFiles.add(cr.sourceFile);
  }
  // WO-API-SURFACE-MAPPING-...-001 P2: same guarantee for the API-surface facts.
  // A `serves_endpoint` edge targets the handler's file-grain node and a
  // `calls_endpoint` edge sources from the caller's, so both files need a node
  // for AC-02 to hold. A route handler with no extracted elements is not
  // hypothetical — a Python module-level Flask app or a Next.js route file whose
  // only export is an arrow constant can land here.
  for (const route of state.routes ?? []) {
    if (route.file) seenFiles.add(route.file);
  }
  for (const call of state.frontendCalls ?? []) {
    if (call.file) seenFiles.add(call.file);
  }
  // WO-DOCS-TO-GRAPH-P1-...-001: same guarantee for documented files — but
  // ONLY those inside the scan universe (state.sources). A resolved
  // `documents` edge needs its `@File/...` target in graph.nodes (GI-2/GI-3),
  // and a scanned file can lack elements/imports/calls. A `documents:` target
  // OUTSIDE the universe must NOT mint a phantom file node — its edge is
  // emitted unresolved instead (discovery G3 policy, buildEdges).
  // Optional-chained: PipelineState declares sources, but pre-existing test
  // states (and any legacy assembly) omit it — absence means "universe
  // membership unknowable", which correctly yields zero in-universe targets.
  const scannedFileIds = new Set<string>();
  for (const sourceFile of state.sources?.keys() ?? []) {
    scannedFileIds.add(fileGrainNodeId(sourceFile, projectPath));
  }
  for (const doc of state.docs ?? []) {
    for (const target of docTargets(doc)) {
      if (scannedFileIds.has(fileGrainNodeId(target, projectPath))) {
        seenFiles.add(target);
      }
    }
  }
  // Dedupe on the NODE ID, not on the raw path string. `seenFiles` accumulates
  // whatever spelling each fact source recorded, and those spellings differ:
  // state.elements carries native platform paths (`C:\...\src\a.ts`) while
  // RouteFact/FrontendCallFact carry the POSIX form the route extractor
  // normalized to (`C:/.../src/a.ts`). Both collapse to the same
  // `@File/src/a.ts` id, so keying the Set on the path emitted the node twice
  // and tripped GI-1 node_id_uniqueness. Identity is the id; uniqueness has to
  // be enforced there. First spelling wins, which keeps `node.file` on the
  // native-path value elements already supplied.
  const emittedFileNodeIds = new Set<string>();
  for (const file of seenFiles) {
    const id = fileGrainNodeId(file, projectPath);
    if (emittedFileNodeIds.has(id)) continue;
    emittedFileNodeIds.add(id);
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

  // Emit endpoint pseudo-nodes (WO-API-SURFACE-MAPPING-...-001 P2, REC-002).
  //
  // An endpoint is a first-class NODE, not merely edge metadata, because the
  // single most valuable thing this subsystem can report is an endpoint that
  // NOTHING calls. Modelling the network hop as an edge from client element
  // straight to handler element would make an uncalled endpoint literally
  // unrepresentable — no edge, no trace — which is the exact blindness REC-002
  // exists to remove. With a node, an orphan is an endpoint carrying a
  // `serves_endpoint` out-edge and zero `calls_endpoint` in-edges: visible,
  // countable, and queryable.
  //
  // Endpoint nodes carry NO `file` and NO `line`. They are not located in source
  // — several handler files may serve the same endpoint, and a client that calls
  // one has no relationship to any particular file. Consumers already handle
  // this: GI-6's duplicate-identity check skips nodes without file+line,
  // project-map-data skips nodes without a file, and canonical-graph indexes
  // them by id while leaving them out of file-grain expansion.
  //
  // Sorted by id so node ORDER is deterministic (AC-08) regardless of file-scan
  // order.
  for (const record of collectEndpoints(state).values()) {
    nodes.push({
      id: record.id,
      type: 'endpoint',
      name: `${record.method} ${record.path}`,
      metadata: {
        codeRefId: record.id,
        codeRefIdNoLine: record.id,
        endpoint: true,
        path: record.path,
        method: record.method,
        frameworks: record.frameworks,
        declaredMethods: record.declaredMethods,
        // Node IDS, not raw paths — a consumer reading this metadata can follow
        // them straight into graph.nodes without re-deriving the file-grain id.
        handlers: record.handlerFiles.map(f => fileGrainNodeId(f, projectPath)),
      },
    });
  }

  // Emit doc pseudo-nodes (WO-DOCS-TO-GRAPH-P1-...-001). Like endpoint nodes
  // they carry NO file and NO line — a doc is not a code location, and the
  // file-less shape is what existing consumers (GI-6 duplicate-identity,
  // project-map-data, canonical-graph file expansion) already know to skip.
  // The artifact's own path lives in metadata.sheetPath. Sorted by id so node
  // order is deterministic (AC-08); collectDocFacts already sorts, but the
  // graph must not depend on a producer's ordering discipline.
  for (const doc of [...(state.docs ?? [])].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const docMeta: Record<string, unknown> = {
      codeRefId: doc.id,
      codeRefIdNoLine: doc.id,
      doc: true,
      docType: doc.docType,
      sheetPath: doc.sheetPath,
      docStatus: doc.docStatus,
      placeholderSections: doc.placeholderSections,
    };
    if (doc.subject !== undefined) docMeta.subject = doc.subject;
    if (doc.task !== undefined) docMeta.task = doc.task;
    if (doc.documentsPath !== undefined) docMeta.documentsPath = doc.documentsPath;
    if (doc.documentsPaths !== undefined && doc.documentsPaths.length > 0) {
      docMeta.documentsPaths = doc.documentsPaths;
    }
    if (doc.relatedFiles.length > 0) docMeta.relatedFiles = doc.relatedFiles;
    nodes.push({
      id: doc.id,
      type: 'doc',
      name: doc.subject ?? doc.slug,
      metadata: docMeta,
    });

    // Section sub-nodes (WO-TREAT-MARKDOWN-FILES-LIKE-CODE-...-001 P1). Same
    // file-less `type: 'doc'` shape as their container — every consumer that
    // already skips file-less doc nodes keeps skipping these — with
    // `docSection: true` as the explicit discriminator so no reader has to
    // parse the id string to tell a section from a whole document.
    for (const section of doc.sections ?? []) {
      nodes.push({
        id: section.id,
        type: 'doc',
        name: section.heading,
        metadata: {
          codeRefId: section.id,
          codeRefIdNoLine: section.id,
          doc: true,
          docSection: true,
          docId: section.docId,
          docType: doc.docType,
          docStatus: doc.docStatus,
          sheetPath: doc.sheetPath,
          heading: section.heading,
          slug: section.slug,
          depth: section.depth,
          order: section.order,
          line: section.line,
          endLine: section.endLine,
        },
      });
    }
  }

  return nodes;
}

/**
 * One canonical HTTP endpoint, aggregated across every route declaration that
 * produced it.
 */
export interface EndpointRecord {
  /** `@Endpoint/<path-sans-leading-slash>#<METHOD>`. */
  id: string;
  /** Canonical path with parameter names erased (`/api/users/{}`). */
  path: string;
  /** Uppercase HTTP method, or METHOD_UNSPECIFIED when none was declared. */
  method: string;
  /** Frameworks that declared this endpoint. Sorted; usually one entry. */
  frameworks: string[];
  /** Every method the underlying route declarations listed. Sorted. */
  declaredMethods: string[];
  /** Files whose route declaration produced this endpoint. Sorted. */
  handlerFiles: string[];
}

/**
 * Fold state.routes into the canonical endpoint set.
 *
 * One RouteFact declaring `methods: ['GET','POST']` yields TWO endpoints, per
 * RFC 9110's separation of target from method — `GET /api/users` and
 * `POST /api/users` are different operations that can be independently orphaned,
 * and 405 exists precisely because a server can know the path and reject the
 * verb.
 *
 * Two declarations that canonicalize to the same (path, method) MERGE into one
 * node with both handler files recorded. That is not deduplication for tidiness:
 * two files serving one endpoint is a real condition a reader needs to see, and
 * hiding one of them would make the graph lie about the surface.
 *
 * Deterministic: the returned Map is built in sorted-id order and every array
 * field is sorted, so the node list is byte-stable across runs (AC-08).
 *
 * Public so tests can assert the fold without reconstructing a whole graph.
 */
export function collectEndpoints(state: PipelineState): Map<string, EndpointRecord> {
  const acc = new Map<string, {
    id: string;
    path: string;
    method: string;
    frameworks: Set<string>;
    declaredMethods: Set<string>;
    handlerFiles: Set<string>;
  }>();

  for (const fact of state.routes ?? []) {
    const framework = fact.route.framework;
    const path = canonicalEndpointPath(fact.route.path, framework);
    const declared = (fact.route.methods ?? [])
      .map(m => m.trim().toUpperCase())
      .filter(m => m.length > 0);
    // No declared method is NO-DATA about which verbs are served. Mint the
    // single METHOD_UNSPECIFIED node rather than fanning out to all verbs,
    // which would invent endpoints the producer never claimed.
    const methods = declared.length > 0 ? declared : [METHOD_UNSPECIFIED];

    for (const method of methods) {
      const id = endpointNodeId(path, method);
      let entry = acc.get(id);
      if (!entry) {
        entry = {
          id,
          path,
          method,
          frameworks: new Set(),
          declaredMethods: new Set(),
          handlerFiles: new Set(),
        };
        acc.set(id, entry);
      }
      entry.frameworks.add(framework);
      for (const m of declared) entry.declaredMethods.add(m);
      if (fact.file) entry.handlerFiles.add(normalizeSlashes(fact.file));
    }
  }

  const sorted = new Map<string, EndpointRecord>();
  for (const id of Array.from(acc.keys()).sort()) {
    const entry = acc.get(id)!;
    sorted.set(id, {
      id: entry.id,
      path: entry.path,
      method: entry.method,
      frameworks: Array.from(entry.frameworks).sort(),
      declaredMethods: Array.from(entry.declaredMethods).sort(),
      handlerFiles: Array.from(entry.handlerFiles).sort(),
    });
  }
  return sorted;
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
  const rel = normalizeSlashes(normalized).replace(/^\.\//, '');
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
      // Workspace linkage rides evidence as OPTIONAL fields (WO-CROSS-REPO-
      // WORKSPACE-LINKAGE-001): absent registry = absent fields = byte-
      // identical edges. No new evidence variant, no new edge kind — the
      // adjacency indexes learn nothing new.
      evidence = ir.workspacePackage !== undefined
        ? {
            kind: 'external-import',
            originSpecifier: ir.originSpecifier,
            workspacePackage: ir.workspacePackage,
            workspaceRoot: ir.workspaceRoot,
          }
        : { kind: 'external-import', originSpecifier: ir.originSpecifier };
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
      // Node-builtin imports (kind='external' + reason='node_builtin',
      // STUB-QT400D) and Python-stdlib imports (reason='python_stdlib',
      // STUB-G5E6EA gap #1) belong in builtin_count, not external_count.
      resolutionStatus: ir.kind === 'external'
        && (ir.reason === 'node_builtin' || ir.reason === 'python_stdlib')
        ? 'builtin'
        : ir.kind,
      evidence,
      sourceLocation: { file: sourceFile, line },
      candidates: ir.candidates,
      reason: ir.reason,
    }));
  }

  // === Export edges ===
  // Emit one export edge per exported element. Source = file-grain node
  // (the file that owns the export), target = the element's codeRefId.
  // resolutionStatus is always 'resolved' — both endpoints are known.
  for (const elem of state.elements) {
    if (!elem.exported) continue;
    const elemId = elem.codeRefId
      ?? createCodeRefId(elem, state.projectPath, { includeLine: true });
    const fileId = fileGrainNodeId(elem.file, state.projectPath);
    const id = computeEdgeId({
      sourceId: fileId,
      relationship: 'export',
      targetId: elemId,
      originSpecifier: elem.name,
      sourceFile: elem.file,
      line: elem.line ?? 0,
    });
    edges.push(buildEdgeRecord({
      id,
      sourceId: fileId,
      targetId: elemId,
      relationship: 'export',
      resolutionStatus: 'resolved',
      sourceLocation: { file: elem.file, line: elem.line ?? 0 },
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
      // Confidence tier (STUB-6CWWHQ, Phase 2): a provisional resolved call
      // (single_candidate_unknown_receiver OR the Phase-10 field_based_acg
      // single-candidate ACG hit) stamps the additive evidence flag AND keeps
      // its lone candidate on the edge for audit. A normally-resolved call
      // carries neither — evidence.confidence stays absent.
      const provisional = cr.confidence === 'provisional';
      if (provisional) evidence.confidence = 'provisional';
      const id = computeEdgeId({
        sourceId, relationship: 'call', targetId,
        originSpecifier: calleeName, sourceFile, line,
      });
      edges.push(buildEdgeRecord({
        id, sourceId, targetId, relationship: 'call',
        resolutionStatus: 'resolved',
        evidence,
        sourceLocation: { file: sourceFile, line },
        // Provisional resolved edges retain their single candidate for audit;
        // normally-resolved edges have no candidates.
        candidates: provisional ? cr.candidates : undefined,
        // Pass the resolver reason through so a provisional resolved edge is
        // separately identifiable and filterable by its origin — notably
        // 'field_based_acg' (Phase 10 ACG) vs 'single_candidate_unknown_receiver'.
        // The tier is unaffected (both stay 'heuristic' via evidence.confidence);
        // reason is additive audit provenance on the exported edge.
        reason: cr.reason,
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
      // STUB-KWDA8V Phase 3 (3c): JS-prototype calls on unknown receivers are
      // now classified kind='builtin' reason='js_prototype_member' upstream in
      // call-resolver (superseding the 2026-06-12 option-A probableBuiltinMember
      // evidence flag, now removed). They take the builtin-call branch above and
      // emit no edge, so no receiver_not_in_symbol_table sub-flagging remains.
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

  // === Heritage edges (WO-...-GENRE-FEATURES-PROGRAM-001 P5) ===
  // Emit extends/implements edges from state.heritage. Endpoints are TYPE NAMES
  // (subtype/supertype); resolve each to a class/interface element's codeRefId
  // via a name->id map built from state.elements. A supertype that does not
  // resolve to a project element (an external base like Error or a library
  // interface) is emitted as an 'external' edge with the raw name as target
  // (absence=no-data — the base exists, we just don't own its element).
  const heritage = state.heritage ?? [];
  if (heritage.length > 0) {
    // Map a type NAME to its codeRefId. Prefer class/interface elements; a name
    // that resolves to multiple elements is ambiguous and left unresolved (we do
    // not guess). Keyed by (file, name) first for a same-file subtype match, then
    // by bare name for cross-file supertypes.
    const idByFileName = new Map<string, string>();
    const idsByName = new Map<string, string[]>();
    const typeKinds = new Set(['class', 'interface', 'Class', 'Interface', 'type', 'enum']);
    for (const elem of state.elements) {
      if (elem.name === undefined) continue;
      if (!typeKinds.has(elem.type)) continue;
      const id = elem.codeRefId ?? createCodeRefId(elem, state.projectPath, { includeLine: true });
      idByFileName.set(`${normalizeSlashes(elem.file)}\u0000${elem.name}`, id);
      const list = idsByName.get(elem.name);
      if (list) list.push(id); else idsByName.set(elem.name, [id]);
    }
    const resolveName = (name: string, sameFile: string): string | undefined => {
      const inFile = idByFileName.get(`${normalizeSlashes(sameFile)}\u0000${name}`);
      if (inFile) return inFile;
      const byName = idsByName.get(name);
      return byName && byName.length === 1 ? byName[0] : undefined; // unique-only; no guessing
    };
    for (const h of heritage) {
      const sourceId = resolveName(h.subtype, h.sourceFile);
      if (!sourceId) continue; // the declaring type must be a known element to anchor the edge
      const targetId = resolveName(h.supertype, h.sourceFile);
      const relationship: EdgeRelationship = h.kind; // 'extends' | 'implements'
      const id = computeEdgeId({
        sourceId,
        relationship,
        targetId: targetId ?? undefined,
        originSpecifier: h.supertype,
        sourceFile: h.sourceFile,
        line: h.line,
      });
      edges.push(buildEdgeRecord({
        id,
        sourceId,
        targetId: targetId ?? undefined,
        relationship,
        // resolved when both endpoints are project elements; external when the
        // supertype is not one we extracted (a library/global base type).
        resolutionStatus: targetId ? 'resolved' : 'external',
        evidence: {
          kind: `resolved-heritage`,
          heritageKind: h.kind,
          supertypeName: h.supertype,
          subtypeName: h.subtype,
        } as unknown as EdgeEvidence,
        sourceLocation: { file: h.sourceFile, line: h.line },
        ...(targetId ? {} : { reason: 'supertype_not_in_project' }),
      }));
    }
  }

  // === API-surface edges (WO-API-SURFACE-MAPPING-...-001 P2, REC-002) ===
  //
  // Direction mirrors runtime control flow and the existing `call` edge
  // convention (caller -> callee), so a directed walk crosses the network
  // boundary in one continuous chain:
  //
  //     @File/src/client.ts  --calls_endpoint-->  @Endpoint/api/users/{}#GET
  //     @Endpoint/api/users/{}#GET  --serves_endpoint-->  @File/server/users.ts
  //
  // Pointing `serves_endpoint` from the handler at the endpoint instead would
  // have produced client -> endpoint <- handler, which no directed traversal can
  // walk end to end, and `path_between(clientFile, handlerFile)` would have
  // stayed empty for a connection that plainly exists.
  //
  // Both endpoints anchor at FILE grain. RouteFact carries line 0 (detectors
  // report route identity, not a source anchor) and FrontendCall gives a call
  // site but not its enclosing element. Picking "the nearest element declared
  // above this line" would be a guess that names the wrong function whenever a
  // call sits inside a nested callback. File grain is what we actually know.
  const endpointRecords = collectEndpoints(state);

  // --- serves_endpoint: endpoint -> handler file ---
  for (const record of endpointRecords.values()) {
    for (const handlerFile of record.handlerFiles) {
      const targetId = fileGrainNodeId(handlerFile, state.projectPath);
      const id = computeEdgeId({
        sourceId: record.id,
        relationship: 'serves_endpoint',
        targetId,
        originSpecifier: record.path,
        sourceFile: handlerFile,
        line: 0,
      });
      edges.push(buildEdgeRecord({
        id,
        sourceId: record.id,
        targetId,
        relationship: 'serves_endpoint',
        resolutionStatus: 'resolved',
        evidence: {
          kind: 'serves-endpoint',
          endpointPath: record.path,
          method: record.method,
          framework: record.frameworks.join(','),
          declaredMethods: record.declaredMethods,
        },
        sourceLocation: { file: handlerFile, line: 0 },
      }));
    }
  }

  // --- calls_endpoint: caller file -> endpoint ---
  //
  // Because the identity grammar erases parameter NAMES, matching a client path
  // to a server route is now exact-string equality on the canonical path —
  // precisely the semantics route-matcher.dynamicMatch implements by walking
  // segments, but as a single Map probe instead of an O(routes x calls) scan.
  //
  // EVERY client call produces an edge. A call with no matching endpoint is
  // recorded unresolved with a reason that says WHICH way it failed; it is never
  // dropped. Silence would read as "this client calls nothing", which is a
  // verdict, and a false one.
  const endpointsByPath = new Map<string, Set<string>>();
  for (const record of endpointRecords.values()) {
    const set = endpointsByPath.get(record.path);
    if (set) set.add(record.method);
    else endpointsByPath.set(record.path, new Set([record.method]));
  }

  for (const call of state.frontendCalls ?? []) {
    const sourceId = fileGrainNodeId(call.file, state.projectPath);
    const classified = classifyClientPath(call.path, call.method);
    const evidence: EdgeEvidence = {
      kind: 'calls-endpoint',
      endpointPath: classified.path,
      method: classified.method,
      callType: call.callType,
      detectionConfidence: call.confidence,
      rawPath: call.path,
    };

    // Off-origin or unknown-origin calls never get a targetId (AC-05: no
    // synthetic placeholders). They are still real, recorded call sites.
    if (classified.kind !== 'local') {
      const id = computeEdgeId({
        sourceId,
        relationship: 'calls_endpoint',
        originSpecifier: `${classified.method} ${classified.path}`,
        sourceFile: call.file,
        line: call.line,
      });
      edges.push(buildEdgeRecord({
        id,
        sourceId,
        relationship: 'calls_endpoint',
        // An absolute URL is DETERMINISTICALLY out-of-project (a distinct
        // authority per RFC 3986 s3.2) — that is a classification, not a
        // resolution failure, so it earns 'external' and the `strong`
        // confidence tier. An interpolated origin genuinely could not be
        // resolved and stays 'unresolved'.
        resolutionStatus: classified.kind === 'external' ? 'external' : 'unresolved',
        evidence,
        sourceLocation: { file: call.file, line: call.line },
        reason: classified.reason,
      }));
      continue;
    }

    const servedMethods = endpointsByPath.get(classified.path);
    // Method resolution order: the exact verb, then a route that declared no
    // methods at all (METHOD_UNSPECIFIED serves any verb we cannot disprove).
    const matchedMethod =
      servedMethods?.has(classified.method) ? classified.method
      : servedMethods?.has(METHOD_UNSPECIFIED) ? METHOD_UNSPECIFIED
      : undefined;

    if (matchedMethod === undefined) {
      // Distinguish 404-shaped from 405-shaped absence. Both are unresolved,
      // but they send a reader to completely different places: a missing path
      // means the endpoint was never built; a served path with the wrong verb
      // means it was built and the client is calling it wrong.
      const reason = servedMethods
        ? 'endpoint_method_not_served'
        : 'endpoint_not_in_project';
      const id = computeEdgeId({
        sourceId,
        relationship: 'calls_endpoint',
        originSpecifier: `${classified.method} ${classified.path}`,
        sourceFile: call.file,
        line: call.line,
      });
      edges.push(buildEdgeRecord({
        id,
        sourceId,
        relationship: 'calls_endpoint',
        resolutionStatus: 'unresolved',
        evidence,
        sourceLocation: { file: call.file, line: call.line },
        reason,
      }));
      continue;
    }

    const targetId = endpointNodeId(classified.path, matchedMethod);
    // A path matched only because the SERVER declared no methods is a weaker
    // binding than a verb-for-verb match. Reuse the existing provisional
    // mechanism (STUB-6CWWHQ) rather than inventing a parallel one: setting
    // evidence.confidence routes the edge to the `heuristic` tier through
    // classifyEdgeConfidence unchanged — resolved and traversable, but labelled.
    const methodInferred =
      matchedMethod === METHOD_UNSPECIFIED && classified.method !== METHOD_UNSPECIFIED;
    if (methodInferred) evidence.confidence = 'provisional';
    const id = computeEdgeId({
      sourceId,
      relationship: 'calls_endpoint',
      targetId,
      originSpecifier: `${classified.method} ${classified.path}`,
      sourceFile: call.file,
      line: call.line,
    });
    edges.push(buildEdgeRecord({
      id,
      sourceId,
      targetId,
      relationship: 'calls_endpoint',
      resolutionStatus: 'resolved',
      evidence,
      sourceLocation: { file: call.file, line: call.line },
      ...(methodInferred ? { reason: 'endpoint_method_undeclared_by_server' } : {}),
    }));
  }

  // === documents edges (WO-DOCS-TO-GRAPH-P1-...-001) ===
  //
  // Direction: doc -> documented file, so `inbound(@File/x)` answers "which
  // docs govern this file" — the query pack_context asks. Every doc class may
  // bear edges: frontmatter-keyed resource sheets, opted-in reports, and —
  // since WO-FOUNDATION-DOCS-GENERATOR-EMITTED-FRONTMATTER-001 — foundation
  // docs, whose generators now stamp mechanically-derived documents: lists
  // (the original DR-DOCS-D foundation hold is resolved; a producer stamps
  // them). One edge per claim target: docTargets() unions the scalar and
  // list frontmatter forms.
  //
  // A `documents:` target OUTSIDE the scan universe (deleted file, a scripts/
  // dir, a typo) emits an UNRESOLVED edge — endpoint precedent: the claim is
  // real and recorded, never dropped, and never a dangling resolved edge
  // (GI-3 fail-close, discovery G3). buildNodes minted the `@File/...` target
  // for every in-universe documented file, so nodeIdSet membership IS the
  // universe test.
  for (const doc of state.docs ?? []) {
    for (const documentsPath of docTargets(doc)) {
      const targetId = fileGrainNodeId(documentsPath, state.projectPath);
      const inUniverse = nodeIdSet.has(targetId);
      const evidence: EdgeEvidence = {
        kind: 'documents',
        sheetPath: doc.sheetPath,
        docStatus: doc.docStatus,
        placeholderSections: doc.placeholderSections,
        documentsPath,
      };
      const id = computeEdgeId({
        sourceId: doc.id,
        relationship: 'documents',
        ...(inUniverse ? { targetId } : {}),
        originSpecifier: documentsPath,
        sourceFile: doc.sheetPath,
        line: 1,
      });
      edges.push(buildEdgeRecord({
        id,
        sourceId: doc.id,
        ...(inUniverse ? { targetId } : {}),
        relationship: 'documents',
        resolutionStatus: inUniverse ? 'resolved' : 'unresolved',
        evidence,
        sourceLocation: { file: doc.sheetPath, line: 1 },
        ...(inUniverse ? {} : { reason: 'documents_target_not_in_scan' }),
      }));
    }
  }

  // === contains edges (WO-TREAT-MARKDOWN-FILES-LIKE-CODE-...-001 P1) ===
  //
  // Direction: document -> its own section, so `outbound(@Doc/x.md)` reads back
  // the heading outline in document order. Always RESOLVED: buildNodes minted
  // the target section node from the same fact in the same pass, so the target
  // cannot be out of universe (unlike a `documents:` frontmatter claim, which
  // points at a file the scan may never have seen).
  for (const doc of state.docs ?? []) {
    for (const section of doc.sections ?? []) {
      const evidence: EdgeEvidence = {
        kind: 'contains',
        sheetPath: doc.sheetPath,
        slug: section.slug,
        depth: section.depth,
        order: section.order,
      };
      edges.push(buildEdgeRecord({
        id: computeEdgeId({
          sourceId: doc.id,
          relationship: 'contains',
          targetId: section.id,
          originSpecifier: section.slug,
          sourceFile: doc.sheetPath,
          line: section.line,
        }),
        sourceId: doc.id,
        targetId: section.id,
        relationship: 'contains',
        resolutionStatus: 'resolved',
        evidence,
        sourceLocation: { file: doc.sheetPath, line: section.line },
      }));
    }
  }

  // WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 3: dedupe by edge id.
  // computeEdgeId hashes the semantic tuple (source, relationship, target,
  // file, line), so equal ids ARE the same edge — yet the passes above could
  // emit the same tuple more than once (the live self-scan artifact carried
  // 948 duplicate-id entries). One id, one edge; first occurrence wins.
  const seenEdgeIds = new Set<string>();
  const deduped: ExportedGraph['edges'] = [];
  for (const edge of edges) {
    const id = edge.id;
    if (id === undefined) {
      // id is optional on the transition-window edge type; every edge built
      // above carries one, but an id-less edge cannot be deduped — pass it.
      deduped.push(edge);
      continue;
    }
    if (seenEdgeIds.has(id)) continue;
    seenEdgeIds.add(id);
    deduped.push(edge);
  }
  return deduped;
}

/**
 * Build a single ExportedGraph edge record. Populates BOTH the new
 * 8-field canonical fields AND the legacy source/target/type/
 * metadata fields for backwards-compat consumers during the Phase
 * 5 transition window.
 */
/**
 * Test-origin detection for the evidence-level testOrigin tag
 * (STUB-K5YBFN). Canonical regex matches __tests__ directories and
 * .test./.spec. file infixes on either path-separator convention.
 */
const TEST_ORIGIN_RE = /__tests__|\.test\.|\.spec\./;

export function isTestOriginFile(file: string): boolean {
  return TEST_ORIGIN_RE.test(file.split('\\').join('/'));
}

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
  // Evidence-level test-origin tag (STUB-K5YBFN): single chokepoint —
  // every edge with evidence and a test-file sourceLocation gets tagged.
  let evidence = args.evidence;
  if (evidence && args.sourceLocation && isTestOriginFile(args.sourceLocation.file)) {
    evidence = { ...evidence, testOrigin: true };
  }
  // Confidence TIER (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 Phase 3): a PURE
  // projection of the edge's (resolutionStatus, reason, evidence.confidence)
  // onto exact|strong|heuristic|inferred. Single chokepoint — every canonical
  // edge (call / import / export) is stamped exactly once, deterministically.
  // Additive; legacy consumers ignore it. evidence.confidence is 'provisional'
  // only for the single_candidate_unknown_receiver case (STUB-6CWWHQ).
  const evidenceConfidence =
    evidence && typeof (evidence as { confidence?: unknown }).confidence === 'string'
      ? (evidence as { confidence?: string }).confidence
      : undefined;
  const confidence = classifyEdgeConfidence(
    args.resolutionStatus,
    args.reason,
    evidenceConfidence,
  );
  const record: ExportedGraph['edges'][number] = {
    id: args.id,
    sourceId: args.sourceId,
    targetId: args.targetId,
    relationship: args.relationship,
    resolutionStatus: args.resolutionStatus,
    evidence: evidence as Record<string, unknown> | undefined,
    sourceLocation: args.sourceLocation,
    candidates: args.candidates,
    reason: args.reason,
    confidence,
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

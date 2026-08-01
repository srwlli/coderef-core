/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability canonical-graph-query
 * @exports CanonicalGraphError, CanonicalNode, NodeResolution, PathResult, CanonicalGraphQuery, ALL_PATHS_MAX, loadCanonicalGraph
 * @used_by src/cli/coderef-query.ts, src/cli/coderef-analyze.ts
 */

/**
 * Canonical-graph query engine — reads the pipeline-emitted
 * `.coderef/graph.json` (ExportedGraph, 8-field canonical edge schema) and
 * answers relationship questions with direction-correct semantics.
 *
 * Replaces the retired legacy in-memory analyzer stack
 * (src/analyzer/graph-builder.ts / graph-analyzer.ts / analyzer-service.ts /
 * src/query/query-executor.ts) per DR-PHASE-5-C and the 2026-07-02 operator
 * ruling (WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 2): the legacy stack
 * filtered plural edge vocabulary against canonical singular values and had
 * inverted query semantics; this module traverses only what the canonical
 * pipeline emitted.
 *
 * Graph endpoint model (verified against a live artifact):
 * - call edges join element -> element (`@Fn/...#name:line`).
 * - import edges join `@File/<path>` -> element (imports are file-grain).
 * - Only edges with resolutionStatus='resolved' carry a traversable
 *   targetId; everything else is reported but never traversed.
 * - Elements are tied to their containing file via node.file (there are no
 *   containment edges), so file-grain expansion is done here.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ExportedGraph } from '../export/graph-exporter.js';
import { normalizeSlashes } from '../utils/path-normalize.js';
import {
  type EdgeConfidenceTier,
  classifyEdgeConfidence,
  meetsMinConfidence,
} from '../pipeline/edge-confidence.js';

type ExportedNode = ExportedGraph['nodes'][number];
type ExportedEdge = ExportedGraph['edges'][number];

export class CanonicalGraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CanonicalGraphError';
  }
}

/** Slim node view returned by every query. */
export interface CanonicalNode {
  id: string;
  name?: string;
  type: string;
  file?: string;
  line?: number;
}

export interface NodeResolution {
  nodes: ExportedNode[];
  /** True when the query named a whole file (all its elements are targets). */
  byFile: boolean;
}

export interface PathResult {
  found: boolean;
  path: CanonicalNode[];
  length: number;
}

function summarize(node: ExportedNode): CanonicalNode {
  return { id: node.id, name: node.name, type: node.type, file: node.file, line: node.line };
}

export class CanonicalGraphQuery {
  readonly graph: ExportedGraph;
  private nodeById = new Map<string, ExportedNode>();
  /** Resolved edges keyed by sourceId. */
  private outbound = new Map<string, ExportedEdge[]>();
  /** Resolved edges keyed by targetId. */
  private inbound = new Map<string, ExportedEdge[]>();
  /** normalized file path -> element node ids in that file. */
  private fileToElements = new Map<string, string[]>();
  /** normalized file path -> `@File/<path>` node id (when present). */
  private fileNodeId = new Map<string, string>();

  constructor(graph: ExportedGraph) {
    this.graph = graph;
    for (const node of graph.nodes) {
      this.nodeById.set(node.id, node);
      const file = node.file ? normalizeSlashes(node.file) : undefined;
      if (!file) continue;
      if (node.id.startsWith('@File/')) {
        this.fileNodeId.set(file, node.id);
      } else {
        const list = this.fileToElements.get(file);
        if (list) list.push(node.id);
        else this.fileToElements.set(file, [node.id]);
      }
    }
    for (const edge of graph.edges) {
      if (edge.resolutionStatus !== 'resolved' || !edge.sourceId || !edge.targetId) continue;
      const out = this.outbound.get(edge.sourceId);
      if (out) out.push(edge);
      else this.outbound.set(edge.sourceId, [edge]);
      const inn = this.inbound.get(edge.targetId);
      if (inn) inn.push(edge);
      else this.inbound.set(edge.targetId, [edge]);
    }
  }

  /**
   * Resolve a free-form query (codeRefId, element name, or file path) to
   * graph nodes. Precedence mirrors the MCP server's resolveNodes: exact id,
   * exact codeRefIdNoLine, exact name, exact file path (slash-normalized;
   * returns ALL elements of the file), then case-insensitive substring.
   */
  resolve(query: string): NodeResolution {
    const nodes = this.graph.nodes;

    const exact = nodes.filter(n => n.id === query);
    if (exact.length > 0) return { nodes: exact, byFile: false };

    const noLine = nodes.filter(n => (n.metadata as any)?.codeRefIdNoLine === query);
    if (noLine.length > 0) return { nodes: noLine, byFile: false };

    // Doc SECTION nodes are excluded from name-based resolution
    // (WO-TREAT-MARKDOWN-FILES-LIKE-CODE-SECTION-LEVEL-AST-001). A section's
    // `name` is its heading text, and resource sheets routinely head a section
    // with the exact name of the symbol it documents — so including sections
    // here made `resolve('normalizeSlashes')` return the prose ALONGSIDE the
    // function, silently changing what every name-keyed query (what_calls,
    // impact_of, find_element, symbol_context) answers about real code.
    // Sections stay fully addressable by their exact id (matched above) and
    // reachable via `contains` / docReferences(); they simply never shadow or
    // join a code symbol that happens to share their heading.
    const byName = nodes.filter(n => n.name === query && !isDocSectionNode(n));
    if (byName.length > 0) return { nodes: byName, byFile: false };

    const qPath = normalizeSlashes(query).replace(/^@File\//, '');
    const byFile = nodes.filter(n => normalizeSlashes(n.file ?? '') === qPath);
    if (byFile.length > 0) return { nodes: byFile, byFile: true };

    // Suffix match on file path (lets callers pass absolute paths or
    // sub-tree-relative spellings on Windows or posix).
    const bySuffix = nodes.filter(n => {
      const f = normalizeSlashes(n.file ?? '');
      return f.length > 0 && qPath.length > 0 && (qPath.endsWith('/' + f) || f.endsWith('/' + qPath) || f === qPath);
    });
    if (bySuffix.length > 0) return { nodes: bySuffix, byFile: true };

    const q = query.toLowerCase();
    return {
      nodes: nodes.filter(
        n =>
          !isDocSectionNode(n) &&
          (n.id.toLowerCase().includes(q) ||
            (n.name ?? '').toLowerCase().includes(q) ||
            (n.file ?? '').toLowerCase().includes(q)),
      ),
      byFile: false,
    };
  }

  /**
   * The id set a resolution occupies on the graph: the resolved node ids,
   * plus (import edges are file-grain) the `@File/` node of any file the
   * resolution covers, plus — for a byFile resolution — every element of
   * that file.
   */
  private idSetOf(resolution: NodeResolution): Set<string> {
    const ids = new Set<string>();
    const files = new Set<string>();
    for (const node of resolution.nodes) {
      ids.add(node.id);
      if (node.file) files.add(normalizeSlashes(node.file));
    }
    for (const file of files) {
      const fileId = this.fileNodeId.get(file);
      if (fileId) ids.add(fileId);
      if (resolution.byFile) {
        for (const el of this.fileToElements.get(file) ?? []) ids.add(el);
      }
    }
    return ids;
  }

  /** Expand a node id to its traversal unit (a @File node covers its elements). */
  private expand(id: string): string[] {
    const node = this.nodeById.get(id);
    if (!node) return [id];
    if (node.id.startsWith('@File/') && node.file) {
      const file = normalizeSlashes(node.file);
      return [id, ...(this.fileToElements.get(file) ?? [])];
    }
    return [id];
  }

  /** For an element id, the `@File/` id of its containing file (if any). */
  private fileIdFor(id: string): string | undefined {
    const node = this.nodeById.get(id);
    if (!node || node.id.startsWith('@File/') || !node.file) return undefined;
    return this.fileNodeId.get(normalizeSlashes(node.file));
  }

  /**
   * Governing docs for a query (WO-DOCS-TO-GRAPH-P1-...-001): the `@Doc/...`
   * nodes whose resolved `documents` edges target the query's file(s).
   *
   * Ordered by the retrieval ranking contract (DR-DOCS-E): approved prose
   * before draft, placeholder-free before placeholder-bearing within a
   * status, deterministic id tiebreak. Placeholder-bearing docs are still
   * RETURNED (surfaces, not verdicts) — `placeholderSections` on the result
   * lets a consumer refuse them authority; ordering alone must not hide them.
   *
   * Only resolved edges are indexed (constructor invariant), so a sheet whose
   * `documents:` target is outside the scan universe never appears here — it
   * is reported by unresolved_edges instead.
   */
  governingDocs(query: string): Array<{ doc: ExportedNode; edge: ExportedEdge }> {
    const resolution = this.resolve(query);
    const fileIds = new Set<string>();
    for (const node of resolution.nodes) {
      if (node.id.startsWith('@File/')) fileIds.add(node.id);
      const fileId = node.file ? this.fileNodeId.get(normalizeSlashes(node.file)) : undefined;
      if (fileId) fileIds.add(fileId);
    }
    const hits: Array<{ doc: ExportedNode; edge: ExportedEdge }> = [];
    const seenDocIds = new Set<string>();
    for (const fileId of fileIds) {
      for (const edge of this.inbound.get(fileId) ?? []) {
        if (edge.relationship !== 'documents' || !edge.sourceId) continue;
        if (seenDocIds.has(edge.sourceId)) continue;
        const doc = this.nodeById.get(edge.sourceId);
        if (!doc) continue;
        seenDocIds.add(edge.sourceId);
        hits.push({ doc, edge });
      }
    }
    const rank = (h: { doc: ExportedNode }): number => {
      const meta = (h.doc.metadata ?? {}) as { docStatus?: string; placeholderSections?: number };
      const statusRank = meta.docStatus === 'approved' ? 0 : 1;
      const placeholderRank = (meta.placeholderSections ?? 0) > 0 ? 1 : 0;
      return statusRank * 2 + placeholderRank;
    };
    return hits.sort((a, b) => rank(a) - rank(b) || (a.doc.id < b.doc.id ? -1 : 1));
  }

  /**
   * Doc SECTIONS that name this query's element(s)
   * (WO-TREAT-MARKDOWN-FILES-LIKE-CODE-SECTION-LEVEL-AST-001 P2) — "which
   * prose has to change if I change this symbol".
   *
   * This is a DEDICATED accessor rather than a widening of the DEPENDS set on
   * purpose. `references` edges target ordinary code elements, so folding them
   * into the dependency walk would silently change what `impact_of` returns
   * for every symbol any doc happens to mention. Callers that want doc impact
   * ask for it here; blast radius keeps meaning what it meant before. (The
   * `contains` kind IS in DEPENDS — it can only ever land on doc nodes, so it
   * cannot perturb an element-to-element answer.)
   *
   * Ambiguous references are indexed but NOT returned: an ambiguous edge has
   * no target, so it never lands in `inbound`. It is reported by
   * unresolved_edges, the same disposition an ambiguous call gets.
   */
  docReferences(query: string): Array<{ section: ExportedNode; edge: ExportedEdge }> {
    const resolution = this.resolve(query);
    const hits: Array<{ section: ExportedNode; edge: ExportedEdge }> = [];
    const seen = new Set<string>();
    for (const node of resolution.nodes) {
      for (const edge of this.inbound.get(node.id) ?? []) {
        if (edge.relationship !== 'references' || !edge.sourceId) continue;
        if (seen.has(edge.sourceId)) continue;
        const section = this.nodeById.get(edge.sourceId);
        if (!section) continue;
        seen.add(edge.sourceId);
        hits.push({ section, edge });
      }
    }
    return hits.sort((a, b) => (a.section.id < b.section.id ? -1 : 1));
  }

  private collectNeighbors(
    ids: Set<string>,
    direction: 'inbound' | 'outbound',
    kinds: ReadonlySet<string>,
  ): Map<string, ExportedEdge> {
    const adjacency = direction === 'inbound' ? this.inbound : this.outbound;
    const hits = new Map<string, ExportedEdge>();
    for (const id of ids) {
      for (const edge of adjacency.get(id) ?? []) {
        if (!kinds.has(edge.relationship ?? '')) continue;
        const neighbor = direction === 'inbound' ? edge.sourceId! : edge.targetId!;
        if (!ids.has(neighbor) && !hits.has(neighbor)) hits.set(neighbor, edge);
      }
    }
    return hits;
  }

  private nodesOf(ids: Iterable<string>): CanonicalNode[] {
    const out: CanonicalNode[] = [];
    for (const id of ids) {
      const node = this.nodeById.get(id);
      out.push(node ? summarize(node) : { id, type: 'unknown' });
    }
    return out;
  }

  /**
   * The confidence TIER of an edge (Phase 3). Prefers the tier the builder
   * already stamped onto the edge; falls back to recomputing from
   * (resolutionStatus, reason, evidence.confidence) via the same pure
   * classifier so a pre-Phase-3 graph.json (no `confidence` field) still
   * yields a correct tier. Read-only, deterministic.
   */
  private edgeConfidence(edge: ExportedEdge): EdgeConfidenceTier {
    if (typeof edge.confidence === 'string') return edge.confidence;
    const ev = edge.evidence as { confidence?: unknown } | undefined;
    const evidenceConfidence = typeof ev?.confidence === 'string' ? ev.confidence : undefined;
    return classifyEdgeConfidence(edge.resolutionStatus, edge.reason, evidenceConfidence);
  }

  /**
   * Inbound resolved call+import reference SITES (per-edge, with line + tier).
   *
   * Unlike callersOf/importersOf (which dedupe to unique neighbor NODES and so
   * collapse multiple call sites in one caller into a single entry), this
   * returns every distinct (file, line, relationship) triple at which the
   * resolution is referenced — the span granularity a rename needs. Each site
   * additionally carries its edge `confidence` tier (Phase 3). Read-only.
   *
   * `minConfidence` (optional) is a within-the-resolved-set filter: only sites
   * whose edge tier meets or exceeds the threshold are returned. Because the
   * inbound index holds ONLY resolved edges (constructor invariant), the filter
   * differentiates `exact` from `heuristic` (provisional single-candidate); it
   * never resurfaces non-resolved edges. Absent `minConfidence` → no filter, so
   * the default output is byte-unchanged from the pre-Phase-3 shape plus the
   * additive `confidence` field.
   */
  referenceSitesOf(
    resolution: NodeResolution,
    minConfidence?: EdgeConfidenceTier,
  ): Array<{ file: string; line: number; relationship: string; confidence: EdgeConfidenceTier }> {
    const ids = this.idSetOf(resolution);
    const seen = new Set<string>();
    const sites: Array<{ file: string; line: number; relationship: string; confidence: EdgeConfidenceTier }> = [];
    for (const id of ids) {
      for (const edge of this.inbound.get(id) ?? []) {
        const rel = edge.relationship ?? '';
        if (rel !== 'call' && rel !== 'import') continue;
        const loc = edge.sourceLocation;
        if (!loc || typeof loc.file !== 'string' || typeof loc.line !== 'number') continue;
        const confidence = this.edgeConfidence(edge);
        if (!meetsMinConfidence(confidence, minConfidence)) continue;
        const key = `${loc.file}::${loc.line}::${rel}`;
        if (seen.has(key)) continue;
        seen.add(key);
        sites.push({ file: loc.file, line: loc.line, relationship: rel, confidence });
      }
    }
    return sites;
  }

  /** Who calls the target? (inbound call edges) */
  callersOf(resolution: NodeResolution): CanonicalNode[] {
    return this.nodesOf(this.collectNeighbors(this.idSetOf(resolution), 'inbound', CALL).keys());
  }

  /** What does the target call? (outbound call edges) */
  calleesOf(resolution: NodeResolution): CanonicalNode[] {
    return this.nodesOf(this.collectNeighbors(this.idSetOf(resolution), 'outbound', CALL).keys());
  }

  /** Who imports the target? (inbound import edges — sources are @File nodes) */
  importersOf(resolution: NodeResolution): CanonicalNode[] {
    return this.nodesOf(this.collectNeighbors(this.idSetOf(resolution), 'inbound', IMPORT).keys());
  }

  /** What does the target import? (outbound import edges from the target / its file) */
  importsOf(resolution: NodeResolution): CanonicalNode[] {
    return this.nodesOf(this.collectNeighbors(this.idSetOf(resolution), 'outbound', IMPORT).keys());
  }

  /**
   * 1-hop neighbors of a resolution in one direction/kind, each paired with the
   * confidence TIER of the edge it was reached through (Phase 4, ego-graph).
   *
   * callersOf/calleesOf/importersOf/importsOf discard the edge (they keep only
   * neighbor NODES); this exposes the (node, edge→tier) pair `collectNeighbors`
   * already computes so the ego-graph helper can annotate provenance without
   * duplicating any adjacency logic. Because the inbound/outbound index holds
   * ONLY resolved edges (constructor invariant), these neighbors are
   * resolved-graph neighbors — deterministic, never fabricated. Read-only.
   *
   * `direction`: 'inbound' = who points AT the target (callers / importers);
   * 'outbound' = what the target points at (callees / imports). `kind`: 'call'
   * or 'import'. Returns node summaries (signatures, not bodies).
   */
  neighborsWithConfidence(
    resolution: NodeResolution,
    direction: 'inbound' | 'outbound',
    kind: 'call' | 'import',
  ): Array<{ node: CanonicalNode; confidence: EdgeConfidenceTier }> {
    const kinds = kind === 'call' ? CALL : IMPORT;
    const hits = this.collectNeighbors(this.idSetOf(resolution), direction, kinds);
    const out: Array<{ node: CanonicalNode; confidence: EdgeConfidenceTier }> = [];
    for (const [neighborId, edge] of hits) {
      const node = this.nodeById.get(neighborId);
      out.push({
        node: node ? summarize(node) : { id: neighborId, type: 'unknown' },
        confidence: this.edgeConfidence(edge),
      });
    }
    return out;
  }

  /**
   * Who depends on the target, transitively? (inbound call+import BFS)
   * Depth counts BFS levels; each discovered @File node also seeds its
   * elements so the walk crosses file boundaries.
   */
  dependentsOf(resolution: NodeResolution, maxDepth = 5): CanonicalNode[] {
    return this.transitive(resolution, 'inbound', maxDepth);
  }

  /** What does the target depend on, transitively? (outbound call+import BFS) */
  dependenciesOf(resolution: NodeResolution, maxDepth = 5): CanonicalNode[] {
    return this.transitive(resolution, 'outbound', maxDepth);
  }

  private transitive(
    resolution: NodeResolution,
    direction: 'inbound' | 'outbound',
    maxDepth: number,
  ): CanonicalNode[] {
    const seeds = this.idSetOf(resolution);
    const visited = new Set<string>(seeds);
    const found = new Set<string>();
    let frontier = seeds;
    for (let depth = 0; depth < maxDepth && frontier.size > 0; depth++) {
      const next = new Set<string>();
      const neighbors = this.collectNeighbors(frontier, direction, DEPENDS);
      for (const id of neighbors.keys()) {
        for (const expanded of this.expand(id)) {
          if (visited.has(expanded)) continue;
          visited.add(expanded);
          next.add(expanded);
        }
        if (!seeds.has(id)) found.add(id);
        // An element's file participates in import-grain traversal.
        const fileId = direction === 'inbound' ? undefined : this.fileIdFor(id);
        if (fileId && !visited.has(fileId)) {
          visited.add(fileId);
          next.add(fileId);
        }
      }
      frontier = next;
    }
    return this.nodesOf(found);
  }

  /**
   * Shortest directed path from source to target over resolved call+import
   * edges (file-grain expansion applied at each hop). Returns found=false
   * when no path exists within maxDepth.
   */
  shortestPath(source: NodeResolution, target: NodeResolution, maxDepth = 10): PathResult {
    const targetIds = this.idSetOf(target);
    const start = this.idSetOf(source);
    // parent pointers for path reconstruction
    const parent = new Map<string, string | null>();
    const queue: string[] = [];
    for (const id of start) {
      parent.set(id, null);
      queue.push(id);
    }
    let depthLimitNodes = queue.length;
    let depth = 0;
    while (queue.length > 0 && depth <= maxDepth) {
      const id = queue.shift()!;
      depthLimitNodes--;
      if (targetIds.has(id) && parent.get(id) !== null) {
        return this.buildPath(id, parent);
      }
      const stepIds = new Set<string>(this.expand(id));
      const fileId = this.fileIdFor(id);
      if (fileId) stepIds.add(fileId);
      for (const stepId of stepIds) {
        if (stepId !== id && !parent.has(stepId)) {
          // Same traversal unit as id (file-grain expansion): inherit its
          // parent so reconstructed paths show the element chain only.
          parent.set(stepId, parent.get(id) ?? null);
        }
      }
      for (const stepId of stepIds) {
        for (const edge of this.outbound.get(stepId) ?? []) {
          if (!DEPENDS.has(edge.relationship ?? '')) continue;
          const neighbor = edge.targetId!;
          if (parent.has(neighbor)) continue;
          parent.set(neighbor, id);
          if (targetIds.has(neighbor)) return this.buildPath(neighbor, parent);
          queue.push(neighbor);
        }
      }
      if (depthLimitNodes === 0) {
        depth++;
        depthLimitNodes = queue.length;
      }
    }
    return { found: false, path: [], length: 0 };
  }

  private buildPath(endId: string, parent: Map<string, string | null>): PathResult {
    const ids: string[] = [];
    let cursor: string | null = endId;
    while (cursor !== null) {
      ids.unshift(cursor);
      cursor = parent.get(cursor) ?? null;
    }
    return { found: true, path: this.nodesOf(ids), length: ids.length - 1 };
  }

  /** All simple directed paths source->target within maxDepth (bounded DFS). */
  allPaths(source: NodeResolution, target: NodeResolution, maxDepth = 5, maxPaths = ALL_PATHS_MAX): PathResult[] {
    const targetIds = this.idSetOf(target);
    const results: PathResult[] = [];
    const stack: string[] = [];
    const onStack = new Set<string>();

    const dfs = (id: string): void => {
      if (results.length >= maxPaths) return;
      stack.push(id);
      onStack.add(id);
      if (targetIds.has(id) && stack.length > 1) {
        results.push({
          found: true,
          path: this.nodesOf(stack),
          length: stack.length - 1,
        });
      } else if (stack.length <= maxDepth) {
        const stepIds = new Set<string>(this.expand(id));
        const fileId = this.fileIdFor(id);
        if (fileId) stepIds.add(fileId);
        for (const stepId of stepIds) {
          for (const edge of this.outbound.get(stepId) ?? []) {
            if (!DEPENDS.has(edge.relationship ?? '')) continue;
            const neighbor = edge.targetId!;
            if (onStack.has(neighbor)) continue;
            dfs(neighbor);
            if (results.length >= maxPaths) break;
          }
        }
      }
      onStack.delete(id);
      stack.pop();
    };

    for (const id of this.idSetOf(source)) dfs(id);
    return results;
  }

  /** Graph-wide statistics passthrough plus resolved-edge breakdown. */
  statistics(): Record<string, unknown> {
    const resolvedByRel: Record<string, number> = {};
    for (const edges of this.outbound.values()) {
      for (const edge of edges) {
        const rel = edge.relationship ?? 'unknown';
        resolvedByRel[rel] = (resolvedByRel[rel] || 0) + 1;
      }
    }
    return {
      ...this.graph.statistics,
      resolvedEdgesByRelationship: resolvedByRel,
    };
  }
}

/**
 * Call-shaped relationships (WO-API-SURFACE-MAPPING-...-001 P2).
 *
 * `calls_endpoint` and `serves_endpoint` join this set because an HTTP request
 * IS a call — it just crosses a network boundary instead of a module one, and
 * every question `what_calls` answers about a function is the same question a
 * reader has about an endpoint. Widening the set is safe for existing results:
 * a `calls_endpoint` edge only ever TARGETS an `@Endpoint/...` node and a
 * `serves_endpoint` edge only ever SOURCES from one, so no element-to-element
 * query gains or loses a neighbour it had before. What changes is that
 * `callersOf(handlerFile)` now returns the endpoints served by that file, and
 * `callersOf(endpoint)` returns its clients — both previously unanswerable.
 */
const CALL: ReadonlySet<string> = new Set(['call', 'calls_endpoint', 'serves_endpoint']);
const IMPORT: ReadonlySet<string> = new Set(['import']);
/**
 * Relationships a dependency walk (impact_of / path_between / dependents) may
 * traverse. Including the endpoint kinds is what makes blast radius cross the
 * network boundary: the directed chain
 *
 *     client file --calls_endpoint--> endpoint --serves_endpoint--> handler file
 *
 * means changing a handler now surfaces the CLIENTS that call it, not just the
 * modules that import it. Only resolved edges are indexed (constructor
 * invariant), so an endpoint whose client could not be matched is reported by
 * unresolved_edges and never silently walked.
 */
/**
 * Is this node a doc SECTION (`@Doc/x.md#slug`) rather than a code element or
 * a whole-file doc? Section nodes carry `metadata.docSection === true`; the id
 * shape is a corroborating signal, never the test on its own.
 *
 * Used to keep sections OUT of name-keyed resolution — see resolve().
 */
function isDocSectionNode(node: { id: string; metadata?: unknown }): boolean {
  return (node.metadata as { docSection?: boolean } | undefined)?.docSection === true;
}

const DEPENDS: ReadonlySet<string> = new Set([
  'call',
  'import',
  'calls_endpoint',
  'serves_endpoint',
  // WO-TREAT-MARKDOWN-FILES-LIKE-CODE-...-001 P1. Safe on the same argument the
  // endpoint kinds use: a `contains` edge only ever sources from a `@Doc/...`
  // node and targets that document's own `@Doc/...#section` node, so no
  // element-to-element walk gains or loses a neighbour. What it adds is that a
  // walk reaching a document can enumerate its sections.
  'contains',
]);

/**
 * Upper bound on paths returned by allPaths() (bounded DFS). Exported as the
 * single source of truth so callers (e.g. the MCP path_between tool) can detect
 * when enumeration hit the cap rather than reading a capped count as complete.
 */
export const ALL_PATHS_MAX = 50;

/**
 * Load `.coderef/graph.json` for a project and wrap it in a query engine.
 * Throws CanonicalGraphError with a run-populate hint when the artifact is
 * missing — the canonical graph is produced by the populate pipeline, not
 * built in-memory here.
 */
export function loadCanonicalGraph(projectDir: string): CanonicalGraphQuery {
  const graphPath = path.join(projectDir, '.coderef', 'graph.json');
  if (!fs.existsSync(graphPath)) {
    throw new CanonicalGraphError(
      `Canonical graph not found: ${graphPath}\n` +
        `Run the populate pipeline first (e.g. "coderef-pipeline --project ${projectDir}" ` +
        `or the /populate-coderef skill) to generate .coderef/graph.json.`,
    );
  }
  let parsed: ExportedGraph;
  try {
    parsed = JSON.parse(fs.readFileSync(graphPath, 'utf8')) as ExportedGraph;
  } catch (err) {
    throw new CanonicalGraphError(
      `Failed to parse ${graphPath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new CanonicalGraphError(
      `Malformed canonical graph at ${graphPath}: expected nodes[] and edges[] arrays.`,
    );
  }
  return new CanonicalGraphQuery(parsed);
}

export default CanonicalGraphQuery;

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

    const byName = nodes.filter(n => n.name === query);
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
          n.id.toLowerCase().includes(q) ||
          (n.name ?? '').toLowerCase().includes(q) ||
          (n.file ?? '').toLowerCase().includes(q),
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
   * Inbound resolved call+import reference SITES (per-edge, with line).
   *
   * Unlike callersOf/importersOf (which dedupe to unique neighbor NODES and so
   * collapse multiple call sites in one caller into a single entry), this
   * returns every distinct (file, line, relationship) triple at which the
   * resolution is referenced — the span granularity a rename needs. Read-only.
   */
  referenceSitesOf(
    resolution: NodeResolution,
  ): Array<{ file: string; line: number; relationship: string }> {
    const ids = this.idSetOf(resolution);
    const seen = new Set<string>();
    const sites: Array<{ file: string; line: number; relationship: string }> = [];
    for (const id of ids) {
      for (const edge of this.inbound.get(id) ?? []) {
        const rel = edge.relationship ?? '';
        if (rel !== 'call' && rel !== 'import') continue;
        const loc = edge.sourceLocation;
        if (!loc || typeof loc.file !== 'string' || typeof loc.line !== 'number') continue;
        const key = `${loc.file}::${loc.line}::${rel}`;
        if (seen.has(key)) continue;
        seen.add(key);
        sites.push({ file: loc.file, line: loc.line, relationship: rel });
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

const CALL: ReadonlySet<string> = new Set(['call']);
const IMPORT: ReadonlySet<string> = new Set(['import']);
const DEPENDS: ReadonlySet<string> = new Set(['call', 'import']);

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

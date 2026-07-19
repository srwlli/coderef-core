/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability type-hierarchy
 * @exports TypeHierarchyNode, TypeHierarchy, TypeHierarchyInputs, TypeHierarchyDirection, computeTypeHierarchy
 * @used_by src/cli/coderef-mcp-server.ts, src/cli/coderef-analyze.ts
 */

/**
 * type-hierarchy — supertype/subtype projection over heritage edges
 * (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 Phase 5).
 *
 * Answers "what does this class extend / implement, and what extends / implements
 * it?" by walking the `extends` + `implements` graph edges that Phase 5's heritage
 * extractor now populates (previously these edge types were declared but never
 * emitted). A supertype walk goes UP the inheritance edges (a subtype -> its
 * parents); a subtype walk goes DOWN (a type -> its children).
 *
 * PURE. No I/O, no `Date.now`/`Math.random`, deterministic — identical inputs yield
 * a byte-identical result. The caller loads graph.json, builds the forward + reverse
 * heritage adjacency and a node map, then passes the seed element; this function
 * walks and ranks. Mirrors tests-for-change.ts (the same PURE-join contract).
 *
 * SURFACES, NOT VERDICTS. The returned supertypes/subtypes are what the graph KNOWS
 * through recorded heritage edges. An element with no heritage edges returns EMPTY
 * arrays + a note — that is NO-DATA ("no recorded extends/implements edge"), NEVER
 * "this type is flat / has no hierarchy". Absence is no-data — the map-family contract.
 */

import type { ExportedGraph } from '../export/graph-exporter.js';

type ExportedNode = ExportedGraph['nodes'][number];
type ExportedEdge = ExportedGraph['edges'][number];

/** Which way to walk the heritage edges. */
export type TypeHierarchyDirection = 'up' | 'down' | 'both';

/** Default + clamp for the traversal depth (mirrors ast_search / diff_impact style caps). */
export const TYPE_HIERARCHY_DEFAULT_DEPTH = 10;

/**
 * One related type reached in the walk, with the distance at which it was reached.
 * `depth: 1` = a direct supertype/subtype (one heritage edge away); higher depth =
 * reached transitively through N intermediate types.
 */
export interface TypeHierarchyNode {
  /** codeRefId (or raw string endpoint when the supertype did not resolve to a node). */
  id: string;
  name?: string;
  type?: string;
  file?: string;
  line?: number;
  /** Shortest heritage-edge distance from the seed element to this type. */
  depth: number;
  /** The heritage relation on the edge that first reached this type. */
  kind: 'extends' | 'implements';
  /** True when `id` resolved to a real graph node; false = string-only endpoint (no-data). */
  resolved: boolean;
}

/** The computed hierarchy for a seed element. */
export interface TypeHierarchy {
  /** The seed element id as supplied. */
  element: string;
  /** Whether the seed resolved to a graph node (false = seed unknown; both arrays empty). */
  element_resolved: boolean;
  direction: TypeHierarchyDirection;
  /** Ancestors: types the seed extends/implements (direction 'up'|'both'), ranked. */
  supertypes: TypeHierarchyNode[];
  /** Descendants: types that extend/implement the seed (direction 'down'|'both'), ranked. */
  subtypes: TypeHierarchyNode[];
  /** True when the walk hit the depth cap and deeper relations were not expanded. */
  truncated: boolean;
  /** Human-facing note; carries the absence=no-data framing. */
  note: string;
}

/**
 * Inputs a real handler assembles from the canonical graph. Heritage edges are the
 * `extends` + `implements` graph edges (populated by Phase 5). The caller builds
 * both adjacency directions once and a node map for endpoint resolution.
 */
export interface TypeHierarchyInputs {
  /** The seed element — a codeRefId, or a bare type name the caller resolved to one. */
  element: string;
  /** 'up' supertypes, 'down' subtypes, or 'both'. Default 'both'. */
  direction?: TypeHierarchyDirection;
  /** id -> node, for resolving a reached endpoint to its file/name/type. */
  nodeById: Map<string, ExportedNode>;
  /**
   * Forward heritage adjacency (subtype endpoint -> heritage edges OUT of it, i.e.
   * toward its supertypes). Keyed by the edge's source endpoint id.
   */
  supertypeEdges: Map<string, ExportedEdge[]>;
  /**
   * Reverse heritage adjacency (supertype endpoint -> heritage edges INTO it, i.e.
   * from its subtypes). Keyed by the edge's target endpoint id.
   */
  subtypeEdges: Map<string, ExportedEdge[]>;
  /** Max walk depth. Default TYPE_HIERARCHY_DEFAULT_DEPTH, clamped 1..25. */
  maxDepth?: number;
}

const NOTE =
  'supertypes/subtypes are what the graph records through extends/implements edges. ' +
  'An empty result is no-data (no recorded heritage edge for this element), never "this type is flat".';

/** Pull the endpoint id off a heritage edge for a given walk direction. */
function endpointId(edge: ExportedEdge, dir: 'up' | 'down'): string | undefined {
  // Walking UP (toward supertypes) we hop source(subtype) -> target(supertype).
  // Walking DOWN (toward subtypes) we hop target(supertype) -> source(subtype).
  if (dir === 'up') return edge.targetId ?? (edge.target || undefined);
  return edge.sourceId ?? (edge.source || undefined);
}

/** Is this edge a heritage edge? (extends/implements — the Phase 5 populated types.) */
function isHeritage(edge: ExportedEdge): edge is ExportedEdge & { type: 'extends' | 'implements' } {
  return edge.type === 'extends' || edge.type === 'implements';
}

/**
 * Breadth-first heritage walk in one direction. Returns reached types with their
 * shortest depth + the kind of the edge that first reached them, plus whether the
 * cap was hit. The seed is depth 0 and excluded from the output.
 */
function walk(
  seed: string,
  dir: 'up' | 'down',
  adjacency: Map<string, ExportedEdge[]>,
  nodeById: Map<string, ExportedNode>,
  depthCap: number,
): { nodes: TypeHierarchyNode[]; truncated: boolean } {
  const bestDepth = new Map<string, number>([[seed, 0]]);
  const firstKind = new Map<string, 'extends' | 'implements'>();
  let frontier = [seed];
  let truncated = false;

  for (let depth = 1; depth <= depthCap && frontier.length > 0; depth++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const edge of adjacency.get(id) ?? []) {
        if (!isHeritage(edge)) continue;
        const to = endpointId(edge, dir);
        if (!to || bestDepth.has(to)) continue;
        bestDepth.set(to, depth);
        firstKind.set(to, edge.type);
        next.push(to);
      }
    }
    frontier = next;
    // If we exit the loop because depth exceeded the cap while a frontier remains,
    // there were deeper relations we did not expand.
    if (depth === depthCap && frontier.length > 0) truncated = true;
  }

  const nodes: TypeHierarchyNode[] = [];
  for (const [id, depth] of bestDepth) {
    if (depth === 0) continue; // the seed itself
    const node = nodeById.get(id);
    nodes.push({
      id,
      ...(node?.name !== undefined ? { name: node.name } : {}),
      ...(node?.type !== undefined ? { type: node.type } : {}),
      ...(node?.file !== undefined ? { file: node.file } : {}),
      ...(node?.line !== undefined ? { line: node.line } : {}),
      depth,
      kind: firstKind.get(id) ?? 'extends',
      resolved: node !== undefined,
    });
  }

  // Deterministic total order: shallowest first, then name, then id.
  nodes.sort(
    (a, b) =>
      a.depth - b.depth ||
      (a.name ?? '').localeCompare(b.name ?? '') ||
      a.id.localeCompare(b.id),
  );

  return { nodes, truncated };
}

/**
 * Compute the type hierarchy (supertypes and/or subtypes) for a seed element by
 * walking the heritage graph. Pure over the supplied adjacency + node map.
 */
export function computeTypeHierarchy(inputs: TypeHierarchyInputs): TypeHierarchy {
  const direction: TypeHierarchyDirection = inputs.direction ?? 'both';
  const depthCap = Math.max(1, Math.min(25, inputs.maxDepth ?? TYPE_HIERARCHY_DEFAULT_DEPTH));
  const elementResolved = inputs.nodeById.has(inputs.element);

  let supertypes: TypeHierarchyNode[] = [];
  let subtypes: TypeHierarchyNode[] = [];
  let truncated = false;

  if (direction === 'up' || direction === 'both') {
    const up = walk(inputs.element, 'up', inputs.supertypeEdges, inputs.nodeById, depthCap);
    supertypes = up.nodes;
    truncated = truncated || up.truncated;
  }
  if (direction === 'down' || direction === 'both') {
    const down = walk(inputs.element, 'down', inputs.subtypeEdges, inputs.nodeById, depthCap);
    subtypes = down.nodes;
    truncated = truncated || down.truncated;
  }

  return {
    element: inputs.element,
    element_resolved: elementResolved,
    direction,
    supertypes,
    subtypes,
    truncated,
    note: truncated ? `Walk capped at depth ${depthCap}. ${NOTE}` : NOTE,
  };
}

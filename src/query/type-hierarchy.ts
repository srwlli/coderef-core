/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability type-hierarchy
 * @exports TypeHierarchyNode, TypeHierarchy, TypeHierarchyInputs, TypeHierarchyDirection, computeTypeHierarchy, LspPosition, LspRange, LspTypeHierarchyItem, LspProjectionInputs, LspHierarchyProjection, LSP_SYMBOL_KIND, LSP_SYMBOL_KIND_FALLBACK, LSP_PROJECTION_NOTE, toLspItem, toLspTypeHierarchyItems
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

// ---------------------------------------------------------------------------
// LSP 3.17 typeHierarchy item projection (opt-in)
// WO-EXTEND-THE-CLONE-SURFACE-P10-SRC-QUERY-CLONES-001 Phase 3 (STUB-7BVGJ5).
//
// Projects walk results into spec-shaped TypeHierarchyItem records
// (typeHierarchy/supertypes + typeHierarchy/subtypes responses; the seed item is
// the prepareTypeHierarchy analogue). PURE over the supplied fields + lookups —
// no file IO; `uri` is computed from projectRoot + the node's recorded file path.
//
// Positions are 0-based per LSP. The index records 1-based LINES only (no column
// data), so every position uses the whole-line convention: character 0, with
// `range` ending EXCLUSIVE at the start of the line after the element's last
// line. `range` spans line..endLine when the caller supplies an endLine (the
// Phase 1 clone substrate persists ElementData.endLine); with no endLine the
// range degrades to the single declaration line — DISCLOSED via
// data.range_source + the degraded counter, never silently faked.
// ---------------------------------------------------------------------------

/** LSP Position — 0-based line + character. */
export interface LspPosition {
  line: number;
  character: number;
}

/** LSP Range — start inclusive, end exclusive. */
export interface LspRange {
  start: LspPosition;
  end: LspPosition;
}

/**
 * LSP 3.17 TypeHierarchyItem (spec fields), with coderef provenance carried in
 * the spec's opaque `data` slot so the spec surface stays clean.
 */
export interface LspTypeHierarchyItem {
  name: string;
  /** Numeric LSP SymbolKind (class=5, interface=11, ...). */
  kind: number;
  /** file:// DocumentUri resolved from projectRoot + the node's file path. */
  uri: string;
  /** Full element span (whole-line convention); single line when endLine unknown. */
  range: LspRange;
  /** The declaration line (whole-line convention). */
  selectionRange: LspRange;
  /** Coderef provenance — NOT spec-interpreted; safe round-trip payload. */
  data: {
    coderef_id: string;
    coderef_type?: string;
    depth?: number;
    heritage?: 'extends' | 'implements';
    range_source: 'endLine' | 'line_only';
  };
}

/**
 * Coderef element-type -> LSP SymbolKind. Explicit map; unmapped types fall back
 * to LSP_SYMBOL_KIND_FALLBACK (Object=19) with the raw type preserved in
 * data.coderef_type. `type`/`component`/`constant` follow typescript-language-server
 * precedent (alias->Variable, component-fn->Function, const->Constant).
 */
export const LSP_SYMBOL_KIND: Record<string, number> = {
  class: 5,
  interface: 11,
  enum: 10,
  struct: 23,
  function: 12,
  method: 6,
  component: 12,
  constant: 14,
  type: 13,
  variable: 13,
  property: 7,
  module: 2,
};

/** Fallback SymbolKind for element types outside the explicit map (Object=19). */
export const LSP_SYMBOL_KIND_FALLBACK = 19;

/** Disclosure note attached to every LSP projection envelope. */
export const LSP_PROJECTION_NOTE =
  'LSP 3.17 TypeHierarchyItem projection. Positions are 0-based whole-line (character granularity ' +
  'is not recorded; range end is exclusive at the start of the line after the element). ' +
  'range spans the element when the index carries endLine; range_source:"line_only" marks a ' +
  'single-line degraded range (older index without the clone substrate). Unresolved (string-only) ' +
  'heritage endpoints have no file/uri and are EXCLUDED from item arrays - excluded_unresolved ' +
  'counts them; that is missing data, never "no such supertype".';

/** Inputs for the LSP projection. */
export interface LspProjectionInputs {
  /** Absolute project root — uri = file:// of projectRoot-resolved file paths. */
  projectRoot: string;
  /**
   * endLine lookup (1-based, from the index's Phase 1 substrate). Return
   * undefined when unknown — the item degrades to a single-line range.
   */
  endLineOf?: (node: { id: string; file?: string; line?: number; name?: string }) => number | undefined;
  /**
   * file path -> DocumentUri. Callers on Node supply pathToFileURL-based
   * resolution; the default builds a naive file:/// URI from forward-slashed
   * segments (sufficient for tests / display, not for byte-exact URI escaping).
   */
  toUri?: (file: string) => string;
}

/** One projected item set + its disclosure counters. */
export interface LspHierarchyProjection {
  items: LspTypeHierarchyItem[];
  /** Nodes dropped because they lack a resolvable file/name (resolved:false endpoints). */
  excluded_unresolved: number;
  /** Items whose range degraded to the single declaration line (no endLine). */
  degraded_single_line: number;
}

/** Whole-line range: [start of line, start of line after lastLine), 0-based. */
function wholeLineRange(line1: number, lastLine1: number): LspRange {
  const start = Math.max(0, line1 - 1);
  const endExclusive = Math.max(start + 1, lastLine1); // (lastLine1-1)+1 = lastLine1
  return { start: { line: start, character: 0 }, end: { line: endExclusive, character: 0 } };
}

/** Naive default DocumentUri builder (forward slashes, file:/// prefix). */
function defaultToUri(projectRoot: string, file: string): string {
  const joined = `${projectRoot.replace(/\\/g, '/').replace(/\/+$/, '')}/${file.replace(/\\/g, '/')}`;
  return joined.startsWith('/') ? `file://${joined}` : `file:///${joined}`;
}

/**
 * Project one node's fields to an LSP TypeHierarchyItem, or null when the node
 * cannot form a spec-valid item (no name, or no file+line to anchor uri/range).
 */
export function toLspItem(
  fields: { id: string; name?: string; type?: string; file?: string; line?: number },
  extra: { depth?: number; heritage?: 'extends' | 'implements' },
  inputs: LspProjectionInputs,
): LspTypeHierarchyItem | null {
  if (!fields.name || !fields.file || fields.line === undefined) return null;
  const endLine = inputs.endLineOf?.(fields);
  const hasEnd = typeof endLine === 'number' && endLine >= fields.line;
  const uri = (inputs.toUri ?? (f => defaultToUri(inputs.projectRoot, f)))(fields.file);
  const rawType = fields.type?.toLowerCase();
  return {
    name: fields.name,
    kind: (rawType !== undefined ? LSP_SYMBOL_KIND[rawType] : undefined) ?? LSP_SYMBOL_KIND_FALLBACK,
    uri,
    range: wholeLineRange(fields.line, hasEnd ? (endLine as number) : fields.line),
    selectionRange: wholeLineRange(fields.line, fields.line),
    data: {
      coderef_id: fields.id,
      ...(fields.type !== undefined ? { coderef_type: fields.type } : {}),
      ...(extra.depth !== undefined ? { depth: extra.depth } : {}),
      ...(extra.heritage !== undefined ? { heritage: extra.heritage } : {}),
      range_source: hasEnd ? 'endLine' : 'line_only',
    },
  };
}

/**
 * Project a walk result array (supertypes OR subtypes) to LSP items.
 * Order is preserved from the walk's deterministic ranking. resolved:false
 * endpoints (no node fields) are excluded and counted, never silently dropped.
 */
export function toLspTypeHierarchyItems(
  nodes: TypeHierarchyNode[],
  inputs: LspProjectionInputs,
): LspHierarchyProjection {
  const items: LspTypeHierarchyItem[] = [];
  let excluded = 0;
  let degraded = 0;
  for (const n of nodes) {
    const item = toLspItem(n, { depth: n.depth, heritage: n.kind }, inputs);
    if (item === null) {
      excluded++;
      continue;
    }
    if (item.data.range_source === 'line_only') degraded++;
    items.push(item);
  }
  return { items, excluded_unresolved: excluded, degraded_single_line: degraded };
}

/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability type-hierarchy-tests
 */

/**
 * computeTypeHierarchy tests (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P5).
 * PURE over a synthetic heritage graph — no scan, no disk. Mirrors the purity
 * contract of tests-for-change.test.ts: adjacency + node map in, ranked
 * supertypes/subtypes out, deterministic, absence=no-data.
 */

import { describe, it, expect } from 'vitest';
import {
  LSP_PROJECTION_NOTE,
  LSP_SYMBOL_KIND,
  LSP_SYMBOL_KIND_FALLBACK,
  computeTypeHierarchy,
  toLspItem,
  toLspTypeHierarchyItems,
  TYPE_HIERARCHY_DEFAULT_DEPTH,
  type TypeHierarchyInputs,
  type TypeHierarchyNode,
} from '../../src/query/type-hierarchy.js';

// Minimal ExportedGraph-shaped fixtures. Only the fields the projection reads are
// populated (id/name/type/file/line on nodes; type + source/target on edges).
type N = { id: string; name?: string; type?: string; file?: string; line?: number };
type E = { type: string; source: string; target: string; sourceId?: string; targetId?: string };

function node(id: string, name = id): N {
  return { id, name, type: 'Class', file: `${name}.ts`, line: 1 };
}
function edge(kind: 'extends' | 'implements', sub: string, sup: string): E {
  // subtype (source) --kind--> supertype (target).
  return { type: kind, source: sub, target: sup, sourceId: sub, targetId: sup };
}

/** Build the two adjacency maps + node map a handler would pass. */
function build(nodes: N[], edges: E[]): Omit<TypeHierarchyInputs, 'element' | 'direction' | 'maxDepth'> {
  const nodeById = new Map(nodes.map(n => [n.id, n as any] as const));
  const supertypeEdges = new Map<string, any[]>();
  const subtypeEdges = new Map<string, any[]>();
  for (const e of edges) {
    const s = e.sourceId ?? e.source;
    const t = e.targetId ?? e.target;
    (supertypeEdges.get(s) ?? supertypeEdges.set(s, []).get(s)!).push(e);
    (subtypeEdges.get(t) ?? subtypeEdges.set(t, []).get(t)!).push(e);
  }
  return { nodeById, supertypeEdges, subtypeEdges };
}

describe('computeTypeHierarchy', () => {
  it('walks a single extends chain UP (supertypes / ancestors)', () => {
    // C extends B extends A
    const nodes = [node('A'), node('B'), node('C')];
    const edges = [edge('extends', 'B', 'A'), edge('extends', 'C', 'B')];
    const r = computeTypeHierarchy({ element: 'C', direction: 'up', ...build(nodes, edges) });
    expect(r.supertypes.map(s => s.id)).toEqual(['B', 'A']); // B at depth 1, A at depth 2
    expect(r.supertypes.map(s => s.depth)).toEqual([1, 2]);
    expect(r.subtypes).toEqual([]);
    expect(r.supertypes.every(s => s.kind === 'extends')).toBe(true);
  });

  it('walks the same chain DOWN (subtypes / descendants)', () => {
    const nodes = [node('A'), node('B'), node('C')];
    const edges = [edge('extends', 'B', 'A'), edge('extends', 'C', 'B')];
    const r = computeTypeHierarchy({ element: 'A', direction: 'down', ...build(nodes, edges) });
    expect(r.subtypes.map(s => s.id)).toEqual(['B', 'C']); // B depth 1, C depth 2
    expect(r.subtypes.map(s => s.depth)).toEqual([1, 2]);
    expect(r.supertypes).toEqual([]);
  });

  it('direction:both returns supertypes AND subtypes around a middle node', () => {
    const nodes = [node('A'), node('B'), node('C')];
    const edges = [edge('extends', 'B', 'A'), edge('extends', 'C', 'B')];
    const r = computeTypeHierarchy({ element: 'B', direction: 'both', ...build(nodes, edges) });
    expect(r.supertypes.map(s => s.id)).toEqual(['A']);
    expect(r.subtypes.map(s => s.id)).toEqual(['C']);
  });

  it('captures multiple implements as depth-1 supertypes with kind:implements', () => {
    // D implements I, J and extends Base.
    const nodes = [node('D'), node('I'), node('J'), node('Base')];
    const edges = [
      edge('implements', 'D', 'I'),
      edge('implements', 'D', 'J'),
      edge('extends', 'D', 'Base'),
    ];
    const r = computeTypeHierarchy({ element: 'D', direction: 'up', ...build(nodes, edges) });
    const byId = Object.fromEntries(r.supertypes.map(s => [s.id, s]));
    expect(byId['I'].kind).toBe('implements');
    expect(byId['J'].kind).toBe('implements');
    expect(byId['Base'].kind).toBe('extends');
    expect(r.supertypes.every(s => s.depth === 1)).toBe(true);
  });

  it('dedupes a diamond (a supertype reached by two paths counts once, shallowest depth)', () => {
    // D extends B and C; B and C each extend A. A is reachable at depth 2 by two paths.
    const nodes = [node('A'), node('B'), node('C'), node('D')];
    const edges = [
      edge('extends', 'D', 'B'),
      edge('extends', 'D', 'C'),
      edge('extends', 'B', 'A'),
      edge('extends', 'C', 'A'),
    ];
    const r = computeTypeHierarchy({ element: 'D', direction: 'up', ...build(nodes, edges) });
    const aHits = r.supertypes.filter(s => s.id === 'A');
    expect(aHits).toHaveLength(1);
    expect(aHits[0].depth).toBe(2);
  });

  it('absence=no-data: an element with no heritage edges returns empty + a note', () => {
    const nodes = [node('Lonely')];
    const r = computeTypeHierarchy({ element: 'Lonely', direction: 'both', ...build(nodes, []) });
    expect(r.supertypes).toEqual([]);
    expect(r.subtypes).toEqual([]);
    expect(r.element_resolved).toBe(true);
    expect(r.note).toMatch(/no-data/i);
  });

  it('unknown seed element resolves to empty (element_resolved:false)', () => {
    const nodes = [node('A')];
    const r = computeTypeHierarchy({ element: 'Ghost', direction: 'both', ...build(nodes, []) });
    expect(r.element_resolved).toBe(false);
    expect(r.supertypes).toEqual([]);
    expect(r.subtypes).toEqual([]);
  });

  it('caps the walk at maxDepth and reports truncated', () => {
    // A->B->C->D chain; from D up with maxDepth 1 sees only C.
    const nodes = [node('A'), node('B'), node('C'), node('D')];
    const edges = [edge('extends', 'B', 'A'), edge('extends', 'C', 'B'), edge('extends', 'D', 'C')];
    const r = computeTypeHierarchy({ element: 'D', direction: 'up', maxDepth: 1, ...build(nodes, edges) });
    expect(r.supertypes.map(s => s.id)).toEqual(['C']);
    expect(r.truncated).toBe(true);
  });

  it('an unresolved supertype endpoint is returned with resolved:false, not dropped', () => {
    // C extends ExternalBase which is NOT a graph node.
    const nodes = [node('C')];
    const edges = [edge('extends', 'C', 'ExternalBase')];
    const r = computeTypeHierarchy({ element: 'C', direction: 'up', ...build(nodes, edges) });
    expect(r.supertypes).toHaveLength(1);
    expect(r.supertypes[0].id).toBe('ExternalBase');
    expect(r.supertypes[0].resolved).toBe(false);
  });

  it('is deterministic — identical inputs yield byte-identical output', () => {
    const nodes = [node('A'), node('B'), node('C'), node('D')];
    const edges = [
      edge('extends', 'D', 'B'),
      edge('implements', 'D', 'C'),
      edge('extends', 'B', 'A'),
    ];
    const a = computeTypeHierarchy({ element: 'D', direction: 'up', ...build(nodes, edges) });
    const b = computeTypeHierarchy({ element: 'D', direction: 'up', ...build(nodes, [...edges].reverse()) });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('default depth is TYPE_HIERARCHY_DEFAULT_DEPTH', () => {
    expect(TYPE_HIERARCHY_DEFAULT_DEPTH).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// LSP 3.17 TypeHierarchyItem projection (P3, STUB-7BVGJ5). PURE — no disk.
// ---------------------------------------------------------------------------
describe('toLspItem / toLspTypeHierarchyItems', () => {
  const ROOT = 'C:/proj';
  const withEnd = (map: Record<string, number>) => ({
    projectRoot: ROOT,
    endLineOf: (n: { id: string }) => map[n.id],
  });

  const hNode = (over: Partial<TypeHierarchyNode> & { id: string }): TypeHierarchyNode => ({
    name: over.id,
    type: 'class',
    file: `src/${over.id}.ts`,
    line: 10,
    depth: 1,
    kind: 'extends',
    resolved: true,
    ...over,
  });

  it('maps element types to numeric LSP SymbolKind with a documented fallback', () => {
    expect(LSP_SYMBOL_KIND.class).toBe(5);
    expect(LSP_SYMBOL_KIND.interface).toBe(11);
    expect(LSP_SYMBOL_KIND.enum).toBe(10);
    expect(LSP_SYMBOL_KIND.function).toBe(12);
    expect(LSP_SYMBOL_KIND.method).toBe(6);
    const item = toLspItem(
      { id: 'X', name: 'X', type: 'weird-new-kind', file: 'src/x.ts', line: 3 },
      {},
      { projectRoot: ROOT },
    );
    expect(item?.kind).toBe(LSP_SYMBOL_KIND_FALLBACK); // Object=19
    expect(item?.data.coderef_type).toBe('weird-new-kind'); // raw type preserved
  });

  it('kind mapping is case-insensitive over the recorded element type', () => {
    const item = toLspItem({ id: 'X', name: 'X', type: 'Class', file: 'src/x.ts', line: 1 }, {}, { projectRoot: ROOT });
    expect(item?.kind).toBe(5);
  });

  it('converts 1-based lines to 0-based whole-line ranges spanning line..endLine', () => {
    const item = toLspItem(
      { id: 'A', name: 'A', type: 'class', file: 'src/a.ts', line: 10 },
      {},
      withEnd({ A: 25 }),
    );
    // range: start of line 10 (0-based 9) .. exclusive at start of line 26 (0-based 25).
    expect(item?.range).toEqual({ start: { line: 9, character: 0 }, end: { line: 25, character: 0 } });
    // selectionRange: the declaration line only.
    expect(item?.selectionRange).toEqual({ start: { line: 9, character: 0 }, end: { line: 10, character: 0 } });
    expect(item?.data.range_source).toBe('endLine');
  });

  it('degrades to a DISCLOSED single-line range when endLine is unknown', () => {
    const item = toLspItem({ id: 'A', name: 'A', type: 'class', file: 'src/a.ts', line: 10 }, {}, { projectRoot: ROOT });
    expect(item?.range).toEqual(item?.selectionRange); // single line
    expect(item?.data.range_source).toBe('line_only');
  });

  it('builds a file:// uri from projectRoot + the recorded file path', () => {
    const item = toLspItem({ id: 'A', name: 'A', type: 'class', file: 'src/a.ts', line: 1 }, {}, { projectRoot: ROOT });
    expect(item?.uri).toMatch(/^file:\/\//);
    expect(item?.uri).toContain('src/a.ts');
    // A caller-supplied toUri (the Node surfaces use pathToFileURL) wins verbatim.
    const custom = toLspItem(
      { id: 'A', name: 'A', type: 'class', file: 'src/a.ts', line: 1 },
      {},
      { projectRoot: ROOT, toUri: f => `file:///custom/${f}` },
    );
    expect(custom?.uri).toBe('file:///custom/src/a.ts');
  });

  it('excludes unresolved (fileless) endpoints and COUNTS them — absence disclosed, never dropped silently', () => {
    const nodes: TypeHierarchyNode[] = [
      hNode({ id: 'Real', depth: 1 }),
      { id: 'ExternalBase', depth: 1, kind: 'extends', resolved: false }, // string-only endpoint
    ];
    const proj = toLspTypeHierarchyItems(nodes, { projectRoot: ROOT });
    expect(proj.items).toHaveLength(1);
    expect(proj.items[0].data.coderef_id).toBe('Real');
    expect(proj.excluded_unresolved).toBe(1);
  });

  it('carries depth + heritage provenance in the spec data slot and counts degraded ranges', () => {
    const nodes: TypeHierarchyNode[] = [
      hNode({ id: 'A', depth: 1, kind: 'implements' }),
      hNode({ id: 'B', depth: 2, kind: 'extends' }),
    ];
    const proj = toLspTypeHierarchyItems(nodes, withEnd({ A: 20 }));
    expect(proj.items.map(i => i.data.heritage)).toEqual(['implements', 'extends']);
    expect(proj.items.map(i => i.data.depth)).toEqual([1, 2]);
    expect(proj.items[0].data.range_source).toBe('endLine');
    expect(proj.items[1].data.range_source).toBe('line_only');
    expect(proj.degraded_single_line).toBe(1);
    expect(LSP_PROJECTION_NOTE).toContain('0-based');
  });

  it('is deterministic and preserves walk order', () => {
    const nodes: TypeHierarchyNode[] = [hNode({ id: 'B', depth: 1 }), hNode({ id: 'A', depth: 2 })];
    const a = toLspTypeHierarchyItems(nodes, withEnd({ A: 12, B: 15 }));
    const b = toLspTypeHierarchyItems(nodes, withEnd({ A: 12, B: 15 }));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.items.map(i => i.name)).toEqual(['B', 'A']);
  });
});

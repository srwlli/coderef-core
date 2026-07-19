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
  computeTypeHierarchy,
  TYPE_HIERARCHY_DEFAULT_DEPTH,
  type TypeHierarchyInputs,
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

/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability tests-for-change-test
 */

/**
 * Pure tests for the diff-to-test-selection projection (computeTestsForChange)
 * and the shared diff parser (parseDiffToChangedElements) —
 * WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 Phase 1.
 *
 * Load-bearing behaviours pinned here:
 *  - DIRECT linkage: a test-file element that directly references a changed
 *    element is selected at depth 1.
 *  - TRANSITIVE linkage: a test that reaches the change through an intermediate
 *    src element is selected at the correct (deeper) depth, and depth is the
 *    SHORTEST path when multiple exist.
 *  - ABSENCE = NO-DATA: a change with no test-file element reaching it yields an
 *    empty selection (never a fabricated / "untested" verdict).
 *  - TEST-FILE-ONLY: non-test dependents are never returned; a changed element
 *    that itself lives in a test file (depth 0 seed) is not self-selected.
 *  - DETERMINISM: identical inputs yield a byte-identical ranking.
 *  - depthCap clamps the reverse-BFS.
 *  - the diff parser attributes a hunk range to its enclosing element.
 */

import { describe, it, expect } from 'vitest';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';
import { computeTestsForChange } from '../../src/query/tests-for-change.js';
import { parseDiffToChangedElements, type ChangedElement } from '../../src/query/changed-elements.js';

// ---- synthetic element-level graph -------------------------------------------
// leaf (src)  <-- changed
//   ^ called by helper (src)         [depth 1 from leaf]
//       ^ called by testHelper (test)   [depth 2 from leaf]  <-- transitive test
//   ^ called by testLeafDirect (test) [depth 1 from leaf]    <-- direct test
const LEAF = '@Fn/src/leaf.ts#leaf:1';
const HELPER = '@Fn/src/util.ts#helper:10';
const TEST_DIRECT = '@Fn/__tests__/leaf.test.ts#testLeafDirect:3';
const TEST_TRANSITIVE = '@Fn/__tests__/util.test.ts#testHelper:5';
const SRC_ONLY = '@Fn/src/other.ts#other:2';

type Node = ExportedGraph['nodes'][number];
type Edge = ExportedGraph['edges'][number];

function node(id: string, name: string, file: string, line: number): Node {
  return { id, type: 'function', name, file, line };
}
function callEdge(id: string, sourceId: string, targetId: string): Edge {
  return {
    id, sourceId, targetId, relationship: 'call', resolutionStatus: 'resolved',
    source: sourceId, target: targetId, type: 'call',
  } as Edge;
}

/** Build the nodeById + inbound reverse-adjacency the handler assembles. */
function buildGraph(edges: Edge[], nodes: Node[]) {
  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const inbound = new Map<string, Edge[]>();
  for (const e of edges) {
    if (!e.targetId) continue;
    const list = inbound.get(e.targetId);
    if (list) list.push(e);
    else inbound.set(e.targetId, [e]);
  }
  return { nodeById, inbound };
}

const isTestFile = (f: string | undefined) => /(?:^|\/)__tests__\/|\.test\.|\.spec\./.test(f ?? '');

const NODES = [
  node(LEAF, 'leaf', 'src/leaf.ts', 1),
  node(HELPER, 'helper', 'src/util.ts', 10),
  node(TEST_DIRECT, 'testLeafDirect', '__tests__/leaf.test.ts', 3),
  node(TEST_TRANSITIVE, 'testHelper', '__tests__/util.test.ts', 5),
  node(SRC_ONLY, 'other', 'src/other.ts', 2),
];
const EDGES = [
  callEdge('e1', HELPER, LEAF),            // helper -> leaf
  callEdge('e2', TEST_DIRECT, LEAF),       // test -> leaf (direct)
  callEdge('e3', TEST_TRANSITIVE, HELPER), // test -> helper -> leaf (transitive)
  callEdge('e4', SRC_ONLY, LEAF),          // non-test dependent (must be excluded)
];

describe('computeTestsForChange', () => {
  it('selects the DIRECT test at depth 1 and the TRANSITIVE test at depth 2', () => {
    const { nodeById, inbound } = buildGraph(EDGES, NODES);
    const result = computeTestsForChange({
      changedElementIds: [LEAF],
      nodeById,
      inbound,
      isTestFile,
      maxDepth: 3,
    });

    expect(result.changed_element_count).toBe(1);
    expect(result.total).toBe(2);
    expect(result.tests.map(t => t.id)).toEqual([TEST_DIRECT, TEST_TRANSITIVE]);
    expect(result.tests.find(t => t.id === TEST_DIRECT)!.depth).toBe(1);
    expect(result.tests.find(t => t.id === TEST_TRANSITIVE)!.depth).toBe(2);
  });

  it('never returns a non-test dependent (SRC_ONLY reaches leaf but is excluded)', () => {
    const { nodeById, inbound } = buildGraph(EDGES, NODES);
    const result = computeTestsForChange({ changedElementIds: [LEAF], nodeById, inbound, isTestFile });
    expect(result.tests.map(t => t.id)).not.toContain(SRC_ONLY);
    expect(result.tests.every(t => isTestFile(t.file))).toBe(true);
  });

  it('absence is no-data: a change no test reaches yields an empty selection', () => {
    // Change SRC_ONLY, which nothing calls -> no test reaches it.
    const { nodeById, inbound } = buildGraph(EDGES, NODES);
    const result = computeTestsForChange({ changedElementIds: [SRC_ONLY], nodeById, inbound, isTestFile });
    expect(result.total).toBe(0);
    expect(result.tests).toEqual([]);
    expect(result.test_file_count).toBe(0);
    expect(result.files).toEqual([]);
  });

  it('does not self-select a changed element that lives in a test file (depth-0 seed excluded)', () => {
    const { nodeById, inbound } = buildGraph(EDGES, NODES);
    const result = computeTestsForChange({ changedElementIds: [TEST_DIRECT], nodeById, inbound, isTestFile });
    // TEST_DIRECT is the change itself (depth 0), and nothing calls it, so the
    // selection is empty — it is not returned as "a test for itself".
    expect(result.tests.map(t => t.id)).not.toContain(TEST_DIRECT);
    expect(result.total).toBe(0);
  });

  it('takes the SHORTEST depth when a test reaches the change two ways', () => {
    // Add a direct edge testHelper -> leaf, so testHelper reaches leaf at depth 1
    // AND depth 2 (via helper). The shallower (1) must win.
    const edges = [...EDGES, callEdge('e5', TEST_TRANSITIVE, LEAF)];
    const { nodeById, inbound } = buildGraph(edges, NODES);
    const result = computeTestsForChange({ changedElementIds: [LEAF], nodeById, inbound, isTestFile });
    expect(result.tests.find(t => t.id === TEST_TRANSITIVE)!.depth).toBe(1);
  });

  it('respects maxDepth (cap 1 drops the transitive test)', () => {
    const { nodeById, inbound } = buildGraph(EDGES, NODES);
    const result = computeTestsForChange({ changedElementIds: [LEAF], nodeById, inbound, isTestFile, maxDepth: 1 });
    expect(result.tests.map(t => t.id)).toEqual([TEST_DIRECT]);
  });

  it('is deterministic: identical inputs -> byte-identical ranking', () => {
    const g1 = buildGraph(EDGES, NODES);
    const g2 = buildGraph(EDGES, NODES);
    const a = computeTestsForChange({ changedElementIds: [LEAF], nodeById: g1.nodeById, inbound: g1.inbound, isTestFile });
    const b = computeTestsForChange({ changedElementIds: [LEAF], nodeById: g2.nodeById, inbound: g2.inbound, isTestFile });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('rolls up per-file with element_count + min_depth', () => {
    const { nodeById, inbound } = buildGraph(EDGES, NODES);
    const result = computeTestsForChange({ changedElementIds: [LEAF], nodeById, inbound, isTestFile });
    expect(result.files).toEqual([
      { file: '__tests__/leaf.test.ts', element_count: 1, min_depth: 1 },
      { file: '__tests__/util.test.ts', element_count: 1, min_depth: 2 },
    ]);
  });

  it('a changed id absent from the graph contributes no seed', () => {
    const { nodeById, inbound } = buildGraph(EDGES, NODES);
    const result = computeTestsForChange({ changedElementIds: ['@Fn/src/ghost.ts#ghost:9'], nodeById, inbound, isTestFile });
    expect(result.changed_element_count).toBe(0);
    expect(result.total).toBe(0);
  });
});

describe('parseDiffToChangedElements', () => {
  const elements: ChangedElement[] = [
    { file: 'src/a.ts', line: 1, codeRefId: '@Fn/src/a.ts#first:1', name: 'first', type: 'function' },
    { file: 'src/a.ts', line: 20, codeRefId: '@Fn/src/a.ts#second:20', name: 'second', type: 'function' },
  ];

  it('attributes a hunk range to its enclosing element', () => {
    // Change lands at line 22 -> inside `second` (owns [20, EOF)).
    const diff = [
      'diff --git a/src/a.ts b/src/a.ts',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -22,0 +22,2 @@',
      '+  const x = 1;',
      '+  return x;',
    ].join('\n');
    const { changedElements, changedFileCount } = parseDiffToChangedElements(diff, elements);
    expect(changedFileCount).toBe(1);
    expect([...changedElements.keys()]).toEqual(['@Fn/src/a.ts#second:20']);
  });

  it('attributes an early hunk to the first element', () => {
    const diff = [
      '+++ b/src/a.ts',
      '@@ -3,1 +3,1 @@',
      '+  // edit inside first',
    ].join('\n');
    const { changedElements } = parseDiffToChangedElements(diff, elements);
    expect([...changedElements.keys()]).toEqual(['@Fn/src/a.ts#first:1']);
  });

  it('a diff touching an unknown file yields no changed elements', () => {
    const diff = ['+++ b/src/unknown.ts', '@@ -1,1 +1,1 @@', '+x'].join('\n');
    const { changedElements, changedFileCount } = parseDiffToChangedElements(diff, elements);
    expect(changedFileCount).toBe(1);
    expect(changedElements.size).toBe(0);
  });

  it('normalizes backslash paths (Windows) to forward slashes', () => {
    const winElements: ChangedElement[] = [
      { file: 'src\\win.ts', line: 1, codeRefId: '@Fn/src/win.ts#w:1', name: 'w', type: 'function' },
    ];
    const diff = ['+++ b/src/win.ts', '@@ -2,1 +2,1 @@', '+edit'].join('\n');
    const { changedElements } = parseDiffToChangedElements(diff, winElements);
    expect([...changedElements.keys()]).toEqual(['@Fn/src/win.ts#w:1']);
  });
});

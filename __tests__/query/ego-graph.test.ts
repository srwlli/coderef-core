/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability ego-graph-test
 */

/**
 * Tests for the 1-hop ego-graph helper (egoGraphOf) — the retrieval-meets-graph
 * seam (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 Phase 4).
 *
 * Load-bearing behaviours pinned here (built on a real .coderef/graph.json in a
 * temp dir, deterministic — no Date.now/random):
 *  - DIRECTIONAL CORRECTNESS: callers = inbound call, callees = outbound call,
 *    imports = outbound import, importedBy = inbound import. NOT swapped. (The
 *    retired legacy analyzer stack had INVERTED query semantics — a swap here is
 *    a real regression class, so this is pinned hard.)
 *  - every neighbor is a SIGNATURE (id/name/type/file/line) with NO source body.
 *  - DETERMINISM: same graph + same resolved element -> byte-identical ego-graph
 *    (neighbors sorted by id).
 *  - CAP + declared truncation: a direction with more neighbors than the cap
 *    returns exactly cap entries + truncated:true + the true total.
 *  - a query resolving to zero graph nodes -> resolved:false + all-empty (absence
 *    = no-data, never a fabricated neighbor).
 *  - CONFIDENCE tier annotation: each neighbor carries the tier of its edge; a
 *    provisional edge -> heuristic; withConfidence:false omits the field.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';
import { loadCanonicalGraph } from '../../src/query/canonical-graph.js';
import { egoGraphOf, EGO_GRAPH_DIRECTIONS } from '../../src/query/ego-graph.js';

/**
 * Fixture graph centered on `focus`:
 *   caller1, caller2  --call-->  focus            (2 inbound callers)
 *   focus             --call-->  callee1          (1 outbound callee, EXACT)
 *   focus             --call-->  calleeProv       (1 outbound callee, PROVISIONAL -> heuristic)
 *   @File/importer.ts --import-> focus            (1 inbound importedBy)
 *   @File/focus.ts    --import-> libTarget        (1 outbound import)
 */
function makeFixture(): { dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-ego-'));
  const coderefDir = path.join(dir, '.coderef');
  fs.mkdirSync(coderefDir, { recursive: true });

  const FOCUS = '@Fn/src/focus.ts#focus:1';
  const CALLER1 = '@Fn/src/caller1.ts#caller1:1';
  const CALLER2 = '@Fn/src/caller2.ts#caller2:1';
  const CALLEE1 = '@Fn/src/callee1.ts#callee1:1';
  const CALLEE_PROV = '@Fn/src/calleeProv.ts#calleeProv:1';
  const LIBTARGET = '@Fn/src/lib.ts#libTarget:1';

  const nodes: ExportedGraph['nodes'] = [
    { id: '@File/src/focus.ts', type: 'file', name: 'focus.ts', file: 'src/focus.ts' },
    { id: '@File/src/importer.ts', type: 'file', name: 'importer.ts', file: 'src/importer.ts' },
    { id: FOCUS, type: 'function', name: 'focus', file: 'src/focus.ts', line: 1, metadata: { codeRefIdNoLine: '@Fn/src/focus.ts#focus' } },
    { id: CALLER1, type: 'function', name: 'caller1', file: 'src/caller1.ts', line: 1, metadata: { codeRefIdNoLine: '@Fn/src/caller1.ts#caller1' } },
    { id: CALLER2, type: 'function', name: 'caller2', file: 'src/caller2.ts', line: 1, metadata: { codeRefIdNoLine: '@Fn/src/caller2.ts#caller2' } },
    { id: CALLEE1, type: 'function', name: 'callee1', file: 'src/callee1.ts', line: 1, metadata: { codeRefIdNoLine: '@Fn/src/callee1.ts#callee1' } },
    { id: CALLEE_PROV, type: 'function', name: 'calleeProv', file: 'src/calleeProv.ts', line: 1, metadata: { codeRefIdNoLine: '@Fn/src/calleeProv.ts#calleeProv' } },
    { id: LIBTARGET, type: 'function', name: 'libTarget', file: 'src/lib.ts', line: 1, metadata: { codeRefIdNoLine: '@Fn/src/lib.ts#libTarget' } },
  ];

  const callEdge = (id: string, sourceId: string, targetId: string, extra?: Record<string, unknown>): ExportedGraph['edges'][number] => ({
    id, sourceId, targetId, relationship: 'call', resolutionStatus: 'resolved',
    sourceLocation: { file: sourceId.split('#')[0].replace('@Fn/', ''), line: 2 },
    source: sourceId, target: targetId, type: 'call', ...(extra ?? {}),
  } as ExportedGraph['edges'][number]);

  const edges: ExportedGraph['edges'] = [
    // inbound callers
    callEdge('c1', CALLER1, FOCUS),
    callEdge('c2', CALLER2, FOCUS),
    // outbound callees — one exact, one provisional (heuristic)
    callEdge('c3', FOCUS, CALLEE1),
    callEdge('c4', FOCUS, CALLEE_PROV, { evidence: { kind: 'resolved-call', confidence: 'provisional' }, candidates: [CALLEE_PROV] }),
    // inbound importedBy (source is a @File node — imports are file-grain)
    {
      id: 'i1', sourceId: '@File/src/importer.ts', targetId: FOCUS, relationship: 'import', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/importer.ts', line: 3 }, source: '@File/src/importer.ts', target: FOCUS, type: 'import',
    } as ExportedGraph['edges'][number],
    // outbound import (focus's @File node imports libTarget)
    {
      id: 'i2', sourceId: '@File/src/focus.ts', targetId: LIBTARGET, relationship: 'import', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/focus.ts', line: 1 }, source: '@File/src/focus.ts', target: LIBTARGET, type: 'import',
    } as ExportedGraph['edges'][number],
  ];

  const graph: ExportedGraph = {
    version: '1.0.0', exportedAt: 0, nodes, edges,
    statistics: { nodeCount: nodes.length, edgeCount: edges.length, edgesByType: {}, densityRatio: 0 },
  };
  fs.writeFileSync(path.join(coderefDir, 'graph.json'), JSON.stringify(graph), 'utf-8');
  return { dir };
}

describe('egoGraphOf — directional correctness + shape', () => {
  let fixture: { dir: string };
  beforeEach(() => { fixture = makeFixture(); });
  afterEach(() => { fs.rmSync(fixture.dir, { recursive: true, force: true }); });

  it('places callers/callees/imports/importedBy in the RIGHT directions (not swapped)', () => {
    const q = loadCanonicalGraph(fixture.dir);
    const ego = egoGraphOf(q, q.resolve('focus'));
    expect(ego.resolved).toBe(true);

    const names = (arr: { name?: string }[]) => arr.map(n => n.name).sort();
    // callers = INBOUND call
    expect(names(ego.callers.neighbors)).toEqual(['caller1', 'caller2']);
    // callees = OUTBOUND call
    expect(names(ego.callees.neighbors)).toEqual(['callee1', 'calleeProv']);
    // importedBy = INBOUND import (the @File importer node)
    expect(ego.importedBy.neighbors.some(n => n.id === '@File/src/importer.ts')).toBe(true);
    // imports = OUTBOUND import
    expect(names(ego.imports.neighbors)).toEqual(['libTarget']);
    // The two call directions are NOT the same set (would be true if swapped).
    expect(names(ego.callers.neighbors)).not.toEqual(names(ego.callees.neighbors));
  });

  it('returns SIGNATURES not bodies (id/name/type/file/line only, no source text)', () => {
    const q = loadCanonicalGraph(fixture.dir);
    const ego = egoGraphOf(q, q.resolve('focus'));
    for (const dir of EGO_GRAPH_DIRECTIONS) {
      for (const n of ego[dir].neighbors) {
        expect(typeof n.id).toBe('string');
        expect(n).not.toHaveProperty('source');
        expect(n).not.toHaveProperty('body');
        expect(n).not.toHaveProperty('snippet');
      }
    }
  });

  it('is deterministic — identical inputs yield byte-identical ego-graphs', () => {
    const q = loadCanonicalGraph(fixture.dir);
    const a = JSON.stringify(egoGraphOf(q, q.resolve('focus')));
    const b = JSON.stringify(egoGraphOf(q, q.resolve('focus')));
    expect(a).toBe(b);
  });

  it('caps each direction and flags truncation with the true total', () => {
    const q = loadCanonicalGraph(fixture.dir);
    const ego = egoGraphOf(q, q.resolve('focus'), { cap: 1 });
    // 2 callers, cap 1 -> 1 returned, truncated, total 2.
    expect(ego.callers.neighbors.length).toBe(1);
    expect(ego.callers.truncated).toBe(true);
    expect(ego.callers.total).toBe(2);
    // 1 outbound import, cap 1 -> not truncated.
    expect(ego.imports.truncated).toBe(false);
    expect(ego.imports.total).toBe(1);
  });

  it('honors the directions option (unlisted directions are empty but present)', () => {
    const q = loadCanonicalGraph(fixture.dir);
    const ego = egoGraphOf(q, q.resolve('focus'), { directions: ['callers'] });
    expect(ego.callers.neighbors.length).toBe(2);
    expect(ego.callees.neighbors.length).toBe(0);
    expect(ego.imports.neighbors.length).toBe(0);
    expect(ego.importedBy.neighbors.length).toBe(0);
  });
});

describe('egoGraphOf — absence + confidence provenance', () => {
  let fixture: { dir: string };
  beforeEach(() => { fixture = makeFixture(); });
  afterEach(() => { fs.rmSync(fixture.dir, { recursive: true, force: true }); });

  it('a query resolving to zero graph nodes returns resolved:false + all-empty', () => {
    const q = loadCanonicalGraph(fixture.dir);
    const ego = egoGraphOf(q, q.resolve('noSuchSymbolAnywhere'));
    expect(ego.resolved).toBe(false);
    for (const dir of EGO_GRAPH_DIRECTIONS) {
      expect(ego[dir].neighbors).toEqual([]);
      expect(ego[dir].total).toBe(0);
      expect(ego[dir].truncated).toBe(false);
    }
  });

  it('annotates each neighbor with its edge confidence tier; provisional -> heuristic', () => {
    const q = loadCanonicalGraph(fixture.dir);
    const ego = egoGraphOf(q, q.resolve('focus'));
    // callee1 reached via a normal resolved edge -> exact
    const callee1 = ego.callees.neighbors.find(n => n.name === 'callee1');
    expect(callee1?.confidence).toBe('exact');
    // calleeProv reached via a provisional edge -> heuristic
    const calleeProv = ego.callees.neighbors.find(n => n.name === 'calleeProv');
    expect(calleeProv?.confidence).toBe('heuristic');
  });

  it('withConfidence:false omits the tier field', () => {
    const q = loadCanonicalGraph(fixture.dir);
    const ego = egoGraphOf(q, q.resolve('focus'), { withConfidence: false });
    for (const n of ego.callees.neighbors) {
      expect(n).not.toHaveProperty('confidence');
    }
  });
});

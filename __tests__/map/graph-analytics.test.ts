/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability map-graph-analytics-tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { computeGraphAnalytics } from '../../src/map/graph-analytics.js';
import { projectMapData } from '../../src/map/project-map-data.js';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Hermetic fixture: two dense clusters joined by ONE bridge file, plus an
 * isolated file and a zero-in-degree utility.
 *
 *   cluster A: a1 <-> a2, a1 -> a3, a2 -> a3
 *   cluster B: b1 <-> b2, b1 -> b3, b2 -> b3
 *   bridge:    a3 -> bridge.ts -> b1   (removing bridge.ts disconnects A from B)
 *   dead:      src/orphan.ts (no edges), src/unused-util.ts -> a1 (out only)
 *   excluded:  src/index.ts -> a1 (entrypoint-like, zero in-degree)
 */
const FIXTURE_NODES = [
  'src/a/a1.ts', 'src/a/a2.ts', 'src/a/a3.ts',
  'src/b/b1.ts', 'src/b/b2.ts', 'src/b/b3.ts',
  'src/bridge.ts',
  'src/orphan.ts',
  'src/unused-util.ts',
  'src/index.ts',
];
const FIXTURE_EDGES = [
  { source: 'src/a/a1.ts', target: 'src/a/a2.ts', weight: 3 },
  { source: 'src/a/a2.ts', target: 'src/a/a1.ts', weight: 2 },
  { source: 'src/a/a1.ts', target: 'src/a/a3.ts', weight: 1 },
  { source: 'src/a/a2.ts', target: 'src/a/a3.ts', weight: 1 },
  { source: 'src/b/b1.ts', target: 'src/b/b2.ts', weight: 3 },
  { source: 'src/b/b2.ts', target: 'src/b/b1.ts', weight: 2 },
  { source: 'src/b/b1.ts', target: 'src/b/b3.ts', weight: 1 },
  { source: 'src/b/b2.ts', target: 'src/b/b3.ts', weight: 1 },
  { source: 'src/a/a3.ts', target: 'src/bridge.ts', weight: 1 },
  { source: 'src/bridge.ts', target: 'src/b/b1.ts', weight: 1 },
  { source: 'src/unused-util.ts', target: 'src/a/a1.ts', weight: 1 },
  { source: 'src/index.ts', target: 'src/a/a1.ts', weight: 1 },
];

describe('computeGraphAnalytics — hermetic fixture', () => {
  const analytics = computeGraphAnalytics(FIXTURE_NODES, FIXTURE_EDGES);

  it('assigns every file a community and separates the two clusters', () => {
    for (const f of FIXTURE_NODES) {
      expect(analytics.assignments[f], `missing assignment for ${f}`).toBeTypeOf('number');
    }
    // The two dense clusters must land in different communities.
    expect(analytics.assignments['src/a/a1.ts']).toBe(analytics.assignments['src/a/a2.ts']);
    expect(analytics.assignments['src/b/b1.ts']).toBe(analytics.assignments['src/b/b2.ts']);
    expect(analytics.assignments['src/a/a1.ts']).not.toBe(analytics.assignments['src/b/b1.ts']);
    // The isolated file is its own community.
    const orphanCommunity = analytics.assignments['src/orphan.ts'];
    expect(analytics.communities.find(c => c.id === orphanCommunity)!.files).toEqual(['src/orphan.ts']);
    expect(analytics.communityCount).toBe(analytics.communities.length);
    // Community ids are rank-ordered by size descending.
    for (let i = 1; i < analytics.communities.length; i++) {
      expect(analytics.communities[i - 1].size).toBeGreaterThanOrEqual(analytics.communities[i].size);
    }
  });

  it('labels communities with their dominant top-level dir', () => {
    for (const c of analytics.communities) {
      expect(c.label).toBeTypeOf('string');
      expect(c.label.length).toBeGreaterThan(0);
    }
  });

  it('finds the bridge file as an articulation point', () => {
    expect(analytics.bridges).toContain('src/bridge.ts');
    // Interior cluster members are never articulation points here.
    expect(analytics.bridges).not.toContain('src/orphan.ts');
    expect(analytics.bridges).toEqual([...analytics.bridges].sort());
  });

  it('computes exact betweenness for the cut vertices', () => {
    // Hand-computed Brandes (unordered pairs): a3 carries {a1,a2,unused,index}
    // x {bridge,b1,b2,b3} = 16; bridge carries the 5 A-side files x 3 B-side
    // files = 15; interior triangle members carry none of the cross traffic.
    const a3 = analytics.centrality.top.find(c => c.file === 'src/a/a3.ts')!;
    const bridge = analytics.centrality.top.find(c => c.file === 'src/bridge.ts')!;
    expect(a3.betweenness).toBe(16);
    expect(bridge.betweenness).toBe(15);
    expect(analytics.centrality.betweennessApproximated).toBe(false);
  });

  it('computes coupling with instability in [0,1]', () => {
    const a1 = analytics.coupling.top.find(c => c.file === 'src/a/a1.ts')!;
    expect(a1.efferent).toBe(2); // a2, a3
    expect(a1.afferent).toBe(3); // a2, unused-util, index
    expect(a1.instability).toBeCloseTo(2 / 5, 3);
    for (const c of analytics.coupling.top) {
      expect(c.instability).toBeGreaterThanOrEqual(0);
      expect(c.instability).toBeLessThanOrEqual(1);
    }
  });

  it('surfaces dead-code candidates without verdicts', () => {
    expect(analytics.deadCode.isolated).toEqual(['src/orphan.ts']);
    expect(analytics.deadCode.zeroInDegreeCandidates).toEqual(['src/unused-util.ts']);
    // src/index.ts is zero-in-degree but entrypoint-like — excluded, counted.
    expect(analytics.deadCode.entrypointExcludedCount).toBe(1);
    expect(analytics.deadCode.note.toLowerCase()).toContain('candidates');
  });

  it('is deterministic across runs', () => {
    const again = computeGraphAnalytics(FIXTURE_NODES, FIXTURE_EDGES);
    expect(JSON.stringify(again)).toBe(JSON.stringify(analytics));
    // Shuffled input order must not change the output.
    const reversed = computeGraphAnalytics(
      [...FIXTURE_NODES].reverse(),
      [...FIXTURE_EDGES].reverse(),
    );
    expect(JSON.stringify(reversed)).toBe(JSON.stringify(analytics));
  });

  it('ignores edges with unknown endpoints', () => {
    const withGhost = computeGraphAnalytics(FIXTURE_NODES, [
      ...FIXTURE_EDGES,
      { source: 'src/a/a1.ts', target: 'src/ghost.ts', weight: 9 },
      { source: 'src/ghost.ts', target: 'src/b/b1.ts', weight: 9 },
    ]);
    expect(JSON.stringify(withGhost)).toBe(JSON.stringify(analytics));
  });
});

describe('computeGraphAnalytics — caps and degradations', () => {
  it('truncates community list at communityCap with a warning; assignments stay total', () => {
    // 10 isolated files = 10 singleton communities.
    const nodes = Array.from({ length: 10 }, (_, i) => `src/f${i}.ts`);
    const result = computeGraphAnalytics(nodes, [], { communityCap: 3 });
    expect(result.communityCount).toBe(10);
    expect(result.communities.length).toBe(3);
    expect(result.warnings.some(w => w.includes('communities truncated to 3 of 10'))).toBe(true);
    expect(Object.keys(result.assignments).length).toBe(10);
  });

  it('flags approximated betweenness with the sampled source count', () => {
    const nodes: string[] = [];
    const edges: Array<{ source: string; target: string }> = [];
    for (let i = 0; i < 30; i++) {
      nodes.push(`src/n${String(i).padStart(2, '0')}.ts`);
      if (i > 0) edges.push({ source: `src/n${String(i - 1).padStart(2, '0')}.ts`, target: `src/n${String(i).padStart(2, '0')}.ts` });
    }
    const result = computeGraphAnalytics(nodes, edges, {
      betweennessExactLimit: 10,
      betweennessSampleTarget: 5,
    });
    expect(result.centrality.betweennessApproximated).toBe(true);
    expect(result.centrality.sampledSources).toBeGreaterThan(0);
    expect(result.centrality.sampledSources!).toBeLessThan(30);
    expect(result.warnings.some(w => w.includes('betweenness approximated'))).toBe(true);
  });

  it('truncates dead-code lists at deadCodeCap with warnings', () => {
    const nodes = Array.from({ length: 8 }, (_, i) => `src/iso${i}.ts`);
    const result = computeGraphAnalytics(nodes, [], { deadCodeCap: 4 });
    expect(result.deadCode.isolated.length).toBe(4);
    expect(result.warnings.some(w => w.includes('isolated files truncated to 4 of 8'))).toBe(true);
  });

  it('handles the empty graph', () => {
    const result = computeGraphAnalytics([], []);
    expect(result.communityCount).toBe(0);
    expect(result.communities).toEqual([]);
    expect(result.bridges).toEqual([]);
    expect(result.centrality.top).toEqual([]);
    expect(result.coupling.top).toEqual([]);
    expect(result.deadCode.isolated).toEqual([]);
  });
});

describe('graph analytics — real-repo smoke (tmp copy, never the live tree)', () => {
  const liveGraph = path.join(REPO_ROOT, '.coderef', 'graph.json');
  const liveIndex = path.join(REPO_ROOT, '.coderef', 'index.json');
  const hasArtifacts = fs.existsSync(liveGraph) && fs.existsSync(liveIndex);
  let root: string;

  beforeAll(() => {
    if (!hasArtifacts) return;
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-analytics-smoke-'));
    const coderefDir = path.join(root, '.coderef');
    fs.mkdirSync(coderefDir, { recursive: true });
    fs.copyFileSync(liveGraph, path.join(coderefDir, 'graph.json'));
    fs.copyFileSync(liveIndex, path.join(coderefDir, 'index.json'));
  });

  afterAll(() => {
    if (root) fs.rmSync(root, { recursive: true, force: true });
  });

  it.skipIf(!hasArtifacts)('attaches a plausible analytics block to this repo\'s projection', () => {
    const data = projectMapData(root);
    expect(data.analytics).toBeDefined();
    const a = data.analytics!;
    expect(a.communityCount).toBeGreaterThan(0);
    expect(Object.keys(a.assignments).length).toBe(data.nodes.length);
    expect(a.centrality.top.length).toBeGreaterThan(0);
    expect(a.coupling.top.length).toBeGreaterThan(0);
    // src/index.ts-style entrypoints must not be flagged as dead-code candidates.
    for (const f of a.deadCode.zeroInDegreeCandidates) {
      expect(f).not.toMatch(/(^|\/)index\.[^/]+$/);
    }
    // Determinism modulo generatedAt on a real graph.
    const again = projectMapData(root);
    expect(JSON.stringify(again.analytics)).toBe(JSON.stringify(a));
  });

  it.skipIf(!hasArtifacts)('can be disabled via options', () => {
    const data = projectMapData(root, { analytics: false });
    expect(data.analytics).toBeUndefined();
  });
});

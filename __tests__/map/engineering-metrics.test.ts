/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability map-engineering-metrics-tests
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { computeEngineeringMetrics } from '../../src/map/engineering-metrics.js';
import { isTestLikeFile } from '../../src/map/graph-analytics.js';
import { projectMapData } from '../../src/map/project-map-data.js';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Hermetic fixture: 2 test-like files (one __tests__/ segment, one .spec.
 * basename), 4 src files (one index-absent, one fully disconnected), known
 * header tallies and unresolved counts.
 */
const NODES = [
  { id: 'src/a.ts', elementCount: 3 },
  { id: 'src/b.ts', elementCount: 5 },
  { id: 'src/c.ts', elementCount: 1 },
  { id: 'src/extra.ts', elementCount: 0 },
  { id: '__tests__/a.test.ts', elementCount: 2 },
  { id: 'src/util.spec.ts', elementCount: 1 },
];

const EDGES = [
  { source: '__tests__/a.test.ts', target: 'src/a.ts', weight: 2 },
  { source: 'src/util.spec.ts', target: 'src/a.ts', weight: 1 },
  { source: '__tests__/a.test.ts', target: 'src/b.ts', weight: 1 },
  { source: '__tests__/a.test.ts', target: 'src/util.spec.ts', weight: 1 }, // test->test: ignored
  { source: 'src/a.ts', target: 'src/b.ts', weight: 4 },
  { source: 'src/b.ts', target: 'src/c.ts', weight: 1 },
];

function fixtureHeaderTallies(): Map<string, Map<string, number>> {
  return new Map([
    ['src/a.ts', new Map([['defined', 2], ['missing', 1]])],
    ['src/b.ts', new Map([['defined', 5]])],
    ['__tests__/a.test.ts', new Map([['stale', 1], ['partial', 1]])],
    // src/c.ts deliberately absent — index-absent file (no-data, not zero)
  ]);
}

function fixtureUnresolvedCounts(): Map<string, { unresolved: number; ambiguous: number }> {
  return new Map([
    ['src/a.ts', { unresolved: 3, ambiguous: 1 }],
    ['src/c.ts', { unresolved: 0, ambiguous: 2 }],
    ['src/zero.ts', { unresolved: 0, ambiguous: 0 }], // total 0: dropped from the family
  ]);
}

describe('computeEngineeringMetrics — hermetic fixture', () => {
  it('classifies test linkage via the shared heuristic with exact counts', () => {
    const metrics = computeEngineeringMetrics(NODES, EDGES, fixtureHeaderTallies(), fixtureUnresolvedCounts());

    expect(metrics.testLinkage.summary).toEqual({
      testFileCount: 2,
      srcFileCount: 4,
      srcWithTestEdgeCount: 2,
      srcWithoutTestEdgeCount: 2,
    });
    expect(metrics.testLinkage.testFiles).toEqual(['__tests__/a.test.ts', 'src/util.spec.ts']);
    expect(metrics.testLinkage.inboundFromTests).toEqual({
      'src/a.ts': { testFileCount: 2, weight: 3 },
      'src/b.ts': { testFileCount: 1, weight: 1 },
    });
    expect(metrics.testLinkage.zeroTestInEdge).toEqual(['src/c.ts', 'src/extra.ts']);
    expect(metrics.testLinkage.zeroTestInEdgeTruncated).toBe(false);
    expect(metrics.testLinkage.note).toContain('not an untested verdict');
    // Single source: the module's classification IS the exported heuristic.
    expect(isTestLikeFile('__tests__/a.test.ts')).toBe(true);
    expect(isTestLikeFile('src/util.spec.ts')).toBe(true);
    expect(isTestLikeFile('src/a.ts')).toBe(false);
  });

  it('tallies documentation per file with no-data distinguished from zero', () => {
    const metrics = computeEngineeringMetrics(NODES, EDGES, fixtureHeaderTallies(), fixtureUnresolvedCounts());

    expect(metrics.documentation.summary).toEqual({
      totalElements: 10,
      byStatus: { defined: 7, missing: 1, partial: 1, stale: 1 },
      indexedFileCount: 3,
      filesWithNonDefinedCount: 2,
    });
    expect(metrics.documentation.files).toEqual({
      '__tests__/a.test.ts': { partial: 1, stale: 1 },
      'src/a.ts': { defined: 2, missing: 1 },
      'src/b.ts': { defined: 5 },
    });
    // Index-absent node: NOT in the Record — no-data, not a zero row.
    expect('src/c.ts' in metrics.documentation.files).toBe(false);
    expect(metrics.documentation.topNonDefined).toEqual([
      { file: '__tests__/a.test.ts', nonDefined: 2, total: 2 },
      { file: 'src/a.ts', nonDefined: 1, total: 3 },
    ]);
    expect(metrics.documentation.topNonDefinedTruncated).toBe(false);
    expect(metrics.documentation.note).toContain('coverage facts');
  });

  it('ranks unresolved references as resolution facts', () => {
    const metrics = computeEngineeringMetrics(NODES, EDGES, fixtureHeaderTallies(), fixtureUnresolvedCounts());

    expect(metrics.unresolvedRefs.summary).toEqual({
      fileCount: 2,
      edgeCount: 6,
      byStatus: { ambiguous: 3, unresolved: 3 },
    });
    expect(metrics.unresolvedRefs.files).toEqual({
      'src/a.ts': { unresolved: 3, ambiguous: 1 },
      'src/c.ts': { unresolved: 0, ambiguous: 2 },
    });
    expect(metrics.unresolvedRefs.top).toEqual([
      { file: 'src/a.ts', total: 4, unresolved: 3, ambiguous: 1 },
      { file: 'src/c.ts', total: 2, unresolved: 0, ambiguous: 2 },
    ]);
    expect(metrics.unresolvedRefs.topTruncated).toBe(false);
    expect(metrics.unresolvedRefs.note).toContain('not defects');
  });

  it('ranks largest modules and most dependencies with exact tie-breaks', () => {
    const metrics = computeEngineeringMetrics(NODES, EDGES, fixtureHeaderTallies(), fixtureUnresolvedCounts());

    expect(metrics.largestModules.top).toEqual([
      { file: 'src/b.ts', elementCount: 5 },
      { file: 'src/a.ts', elementCount: 3 },
      { file: '__tests__/a.test.ts', elementCount: 2 },
      { file: 'src/c.ts', elementCount: 1 },
      { file: 'src/util.spec.ts', elementCount: 1 },
    ]);
    expect(metrics.largestModules.topTruncated).toBe(false);

    expect(metrics.mostDependencies.top).toEqual([
      { file: '__tests__/a.test.ts', efferent: 3, afferent: 0 },
      { file: 'src/a.ts', efferent: 1, afferent: 2 },
      { file: 'src/b.ts', efferent: 1, afferent: 2 },
      { file: 'src/util.spec.ts', efferent: 1, afferent: 1 },
      { file: 'src/c.ts', efferent: 0, afferent: 1 },
    ]);
    expect(metrics.mostDependencies.topTruncated).toBe(false);
    expect(metrics.warnings).toEqual([]);
    expect(metrics.note).toContain('NOT VERDICTS');
  });

  it('degrades the documentation family when zero elements are defined (header-less repo)', () => {
    const headerless = new Map([
      ['src/a.ts', new Map([['missing', 3]])],
      ['src/b.ts', new Map([['missing', 5]])],
    ]);
    const metrics = computeEngineeringMetrics(NODES, EDGES, headerless, new Map());
    expect(metrics.documentation.summary.byStatus).toEqual({ missing: 8 });
    expect(metrics.documentation.note).toContain('header convention appears absent');
  });

  it('degrades the documentation family to no-data when no index tallies are supplied', () => {
    const metrics = computeEngineeringMetrics(NODES, EDGES, undefined, new Map());
    expect(metrics.documentation.summary).toEqual({
      totalElements: 0,
      byStatus: {},
      indexedFileCount: 0,
      filesWithNonDefinedCount: 0,
    });
    expect(metrics.documentation.files).toEqual({});
    expect(metrics.documentation.topNonDefined).toEqual([]);
    expect(metrics.documentation.note).toContain('no index element data');
  });

  it('degrades the testLinkage family when the repo has no test-like files', () => {
    const srcOnly = NODES.filter(n => !isTestLikeFile(n.id));
    const srcEdges = EDGES.filter(e => !isTestLikeFile(e.source) && !isTestLikeFile(e.target));
    const metrics = computeEngineeringMetrics(srcOnly, srcEdges, undefined, new Map());
    expect(metrics.testLinkage.summary).toEqual({
      testFileCount: 0,
      srcFileCount: 4,
      srcWithTestEdgeCount: 0,
      srcWithoutTestEdgeCount: 4,
    });
    expect(metrics.testLinkage.testFiles).toEqual([]);
    expect(metrics.testLinkage.inboundFromTests).toEqual({});
  });

  it('caps every ranking with an exact truncation warning', () => {
    const metrics = computeEngineeringMetrics(
      NODES,
      EDGES,
      fixtureHeaderTallies(),
      fixtureUnresolvedCounts(),
      { rankingCap: 1, zeroTestCap: 1 },
    );
    expect(metrics.testLinkage.zeroTestInEdge).toEqual(['src/c.ts']);
    expect(metrics.testLinkage.zeroTestInEdgeTruncated).toBe(true);
    expect(metrics.documentation.topNonDefined.length).toBe(1);
    expect(metrics.documentation.topNonDefinedTruncated).toBe(true);
    expect(metrics.unresolvedRefs.top.length).toBe(1);
    expect(metrics.unresolvedRefs.topTruncated).toBe(true);
    expect(metrics.largestModules.top.length).toBe(1);
    expect(metrics.largestModules.topTruncated).toBe(true);
    expect(metrics.mostDependencies.top.length).toBe(1);
    expect(metrics.mostDependencies.topTruncated).toBe(true);
    expect(metrics.warnings).toEqual([
      'metrics: zero-test-in-edge files truncated to 1 of 2 (zeroTestCap)',
      'metrics: non-defined-header ranking truncated to 1 of 2 (rankingCap)',
      'metrics: unresolved-refs ranking truncated to 1 of 2 (rankingCap)',
      'metrics: largest-modules ranking truncated to 1 of 5 (rankingCap)',
      'metrics: most-dependencies ranking truncated to 1 of 5 (rankingCap)',
    ]);
  });

  it('is deterministic under reversed input order (incl. key-sorted Records)', () => {
    const forward = computeEngineeringMetrics(NODES, EDGES, fixtureHeaderTallies(), fixtureUnresolvedCounts());

    const reversedTallies = new Map(Array.from(fixtureHeaderTallies().entries()).reverse());
    const reversedCounts = new Map(Array.from(fixtureUnresolvedCounts().entries()).reverse());
    const reversed = computeEngineeringMetrics(
      NODES.slice().reverse(),
      EDGES.slice().reverse(),
      reversedTallies,
      reversedCounts,
    );
    expect(JSON.stringify(reversed)).toBe(JSON.stringify(forward));
  });

  it('handles empty inputs', () => {
    const metrics = computeEngineeringMetrics([], [], undefined, new Map());
    expect(metrics.testLinkage.summary.testFileCount).toBe(0);
    expect(metrics.testLinkage.summary.srcFileCount).toBe(0);
    expect(metrics.unresolvedRefs.summary.fileCount).toBe(0);
    expect(metrics.largestModules.top).toEqual([]);
    expect(metrics.mostDependencies.top).toEqual([]);
    expect(metrics.warnings).toEqual([]);
  });
});

describe('engineering metrics — real-repo smoke (coderef-core, tmp copy)', () => {
  const graphPath = path.join(REPO_ROOT, '.coderef', 'graph.json');
  const hasArtifacts = fs.existsSync(graphPath);

  it.skipIf(!hasArtifacts)('projects this repo with a consistent metrics block', () => {
    // tmp copy — never the live artifact tree (other suites regenerate it mid-run).
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-metrics-smoke-'));
    try {
      const coderefDir = path.join(tmp, '.coderef');
      fs.mkdirSync(coderefDir, { recursive: true });
      fs.copyFileSync(graphPath, path.join(coderefDir, 'graph.json'));
      const indexPath = path.join(REPO_ROOT, '.coderef', 'index.json');
      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, path.join(coderefDir, 'index.json'));
      }

      const data = projectMapData(tmp);
      expect(data.metrics).toBeDefined();
      const metrics = data.metrics!;

      // Test/src classification partitions the node set exactly.
      const tl = metrics.testLinkage.summary;
      expect(tl.testFileCount + tl.srcFileCount).toBe(data.nodes.length);
      expect(tl.srcWithTestEdgeCount + tl.srcWithoutTestEdgeCount).toBe(tl.srcFileCount);
      expect(tl.testFileCount).toBeGreaterThan(0);

      // Documentation tallies cover a subset of the node set (index files only).
      const doc = metrics.documentation.summary;
      expect(doc.indexedFileCount).toBeGreaterThan(0);
      expect(doc.indexedFileCount).toBeLessThanOrEqual(data.nodes.length);
      for (const entry of metrics.documentation.topNonDefined) {
        expect(metrics.documentation.files[entry.file]).toBeDefined();
        expect(entry.nonDefined).toBeGreaterThan(0);
        expect(entry.nonDefined).toBeLessThanOrEqual(entry.total);
      }

      // Unresolved refs: every listed file carries at least one such edge.
      for (const entry of metrics.unresolvedRefs.top) {
        expect(entry.total).toBe(entry.unresolved + entry.ambiguous);
        expect(entry.total).toBeGreaterThan(0);
      }

      // Rankings are honestly ordered.
      const largest = metrics.largestModules.top;
      for (let i = 1; i < largest.length; i++) {
        expect(largest[i - 1].elementCount).toBeGreaterThanOrEqual(largest[i].elementCount);
      }
      const deps = metrics.mostDependencies.top;
      for (let i = 1; i < deps.length; i++) {
        expect(deps[i - 1].efferent).toBeGreaterThanOrEqual(deps[i].efferent);
      }
      // Top mostDependencies entry matches distinct out-neighbors from the edges.
      if (deps.length > 0) {
        const topFile = deps[0].file;
        const distinctOut = new Set(
          data.edges.filter(e => e.source === topFile).map(e => e.target),
        );
        expect(deps[0].efferent).toBe(distinctOut.size);
      }

      // Metrics are independent of the analytics block.
      const noAnalytics = projectMapData(tmp, { analytics: false });
      expect(noAnalytics.analytics).toBeUndefined();
      expect(noAnalytics.metrics).toBeDefined();
      expect(noAnalytics.metrics!.testLinkage.summary).toEqual(tl);

      // options.metrics=false skips the block.
      const noMetrics = projectMapData(tmp, { metrics: false });
      expect(noMetrics.metrics).toBeUndefined();
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

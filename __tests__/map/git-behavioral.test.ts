/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability git-behavioral-tests
 */

/**
 * Git-behavioral analytics tests (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 P2).
 *
 * computeGitBehavioral is PURE over (GitHistory, nodes, edges) — these tests
 * feed synthetic GitHistory records directly, no git repo and no filesystem.
 * They pin the two surfaces (churn×size hotspots, co-change-minus-static-edge
 * coupling drift), determinism, cap+warning emission, and empty behavior.
 */

import { describe, it, expect } from 'vitest';
import { computeGitBehavioral } from '../../src/map/git-behavioral.js';
import { GitHistory, GitFileChurn, GitCoChangePair } from '../../src/map/git-history.js';

function makeHistory(
  files: GitFileChurn[],
  coChanges: GitCoChangePair[],
  windowPartial: Partial<GitHistory['window']> = {},
): GitHistory {
  return {
    window: {
      maxCount: 500,
      since: null,
      commitsScanned: 10,
      headSha: 'abc1234',
      shallow: false,
      ...windowPartial,
    },
    files,
    coChanges,
  };
}

const node = (id: string, elementCount: number) => ({ id, elementCount });
const edge = (source: string, target: string) => ({ source, target });

describe('computeGitBehavioral — churn hotspots', () => {
  it('scores churn × elementCount and ranks by score desc', () => {
    const history = makeHistory(
      [
        { file: 'a.ts', commitCount: 10, linesAdded: 100, linesDeleted: 50 }, // 10 * 3 = 30
        { file: 'b.ts', commitCount: 2, linesAdded: 20, linesDeleted: 10 }, //  2 * 40 = 80
        { file: 'c.ts', commitCount: 5, linesAdded: 5, linesDeleted: 5 }, //   5 * 5 = 25
      ],
      [],
    );
    const nodes = [node('a.ts', 3), node('b.ts', 40), node('c.ts', 5)];
    const result = computeGitBehavioral(history, nodes, []);

    expect(result.churnHotspots.top.map(h => h.file)).toEqual(['b.ts', 'a.ts', 'c.ts']);
    expect(result.churnHotspots.top[0].score).toBe(80);
    expect(result.churnHotspots.top[1].score).toBe(30);
    expect(result.churnHotspots.summary.churnedFileCount).toBe(3);
    expect(result.churnHotspots.summary.scoredFileCount).toBe(3);
  });

  it('excludes churned files absent from the projected nodes (no size proxy)', () => {
    const history = makeHistory(
      [
        { file: 'kept.ts', commitCount: 4, linesAdded: 10, linesDeleted: 2 },
        { file: 'deleted.ts', commitCount: 9, linesAdded: 99, linesDeleted: 99 }, // not in nodes
      ],
      [],
    );
    const nodes = [node('kept.ts', 6)];
    const result = computeGitBehavioral(history, nodes, []);

    expect(result.churnHotspots.top.map(h => h.file)).toEqual(['kept.ts']);
    expect(result.churnHotspots.summary.churnedFileCount).toBe(2); // both counted
    expect(result.churnHotspots.summary.scoredFileCount).toBe(1); // only kept.ts scored
  });

  it('caps the hotspot ranking with a truncation flag', () => {
    const files: GitFileChurn[] = [];
    const nodes = [];
    for (let i = 0; i < 30; i++) {
      const id = `f${String(i).padStart(2, '0')}.ts`;
      files.push({ file: id, commitCount: i + 1, linesAdded: 1, linesDeleted: 0 });
      nodes.push(node(id, 2));
    }
    const result = computeGitBehavioral(makeHistory(files, []), nodes, [], { hotspotTop: 5 });
    expect(result.churnHotspots.top).toHaveLength(5);
    expect(result.churnHotspots.topTruncated).toBe(true);
    // highest commitCount (f29, score 60) ranks first
    expect(result.churnHotspots.top[0].file).toBe('f29.ts');
  });
});

describe('computeGitBehavioral — coupling drift (co-change MINUS static edge)', () => {
  it('surfaces a co-change pair with NO static edge and excludes one WITH an edge', () => {
    const coChanges: GitCoChangePair[] = [
      { a: 'x.ts', b: 'y.ts', coChangeCount: 5 }, // no static edge -> drift
      { a: 'p.ts', b: 'q.ts', coChangeCount: 4 }, // static edge -> corroborated
    ];
    const history = makeHistory([], coChanges);
    const nodes = [node('x.ts', 1), node('y.ts', 1), node('p.ts', 1), node('q.ts', 1)];
    const edges = [edge('p.ts', 'q.ts')]; // corroborates the p/q pair

    const result = computeGitBehavioral(history, nodes, edges);

    expect(result.couplingDrift.top).toEqual([{ a: 'x.ts', b: 'y.ts', coChangeCount: 5 }]);
    expect(result.couplingDrift.summary.coChangePairCount).toBe(2);
    expect(result.couplingDrift.summary.corroboratedPairCount).toBe(1);
    expect(result.couplingDrift.summary.driftPairCount).toBe(1);
  });

  it('treats a static edge as undirected (reverse-direction edge still corroborates)', () => {
    const coChanges: GitCoChangePair[] = [{ a: 'p.ts', b: 'q.ts', coChangeCount: 3 }];
    const history = makeHistory([], coChanges);
    const nodes = [node('p.ts', 1), node('q.ts', 1)];
    const edges = [edge('q.ts', 'p.ts')]; // reverse direction

    const result = computeGitBehavioral(history, nodes, edges);
    expect(result.couplingDrift.top).toHaveLength(0);
    expect(result.couplingDrift.summary.corroboratedPairCount).toBe(1);
  });

  it('applies the minCoChange noise floor', () => {
    const coChanges: GitCoChangePair[] = [
      { a: 'a.ts', b: 'b.ts', coChangeCount: 1 }, // below default floor of 2 -> ignored
      { a: 'c.ts', b: 'd.ts', coChangeCount: 2 }, // at floor -> surfaced
    ];
    const result = computeGitBehavioral(makeHistory([], coChanges), [], []);
    expect(result.couplingDrift.top.map(p => `${p.a}/${p.b}`)).toEqual(['c.ts/d.ts']);
    expect(result.couplingDrift.summary.coChangePairCount).toBe(1); // only the at-floor pair counted
    expect(result.couplingDrift.summary.minCoChange).toBe(2);
  });

  it('ranks drift pairs by coChangeCount desc then pair-key asc, and caps them', () => {
    const coChanges: GitCoChangePair[] = [];
    for (let i = 0; i < 30; i++) {
      coChanges.push({ a: `a${String(i).padStart(2, '0')}.ts`, b: 'z.ts', coChangeCount: i + 2 });
    }
    const result = computeGitBehavioral(makeHistory([], coChanges), [], [], { couplingTop: 5 });
    expect(result.couplingDrift.top).toHaveLength(5);
    expect(result.couplingDrift.topTruncated).toBe(true);
    expect(result.couplingDrift.top[0].coChangeCount).toBe(31); // a29/z.ts
    expect(result.couplingDrift.top[0].a).toBe('a29.ts');
  });
});

describe('computeGitBehavioral — determinism + provenance + absence', () => {
  it('produces byte-identical JSON for identical inputs', () => {
    const files: GitFileChurn[] = [
      { file: 'a.ts', commitCount: 3, linesAdded: 10, linesDeleted: 1 },
      { file: 'b.ts', commitCount: 7, linesAdded: 20, linesDeleted: 2 },
    ];
    const coChanges: GitCoChangePair[] = [{ a: 'a.ts', b: 'b.ts', coChangeCount: 3 }];
    const nodes = [node('a.ts', 4), node('b.ts', 8)];
    const a = JSON.stringify(computeGitBehavioral(makeHistory(files, coChanges), nodes, []));
    const b = JSON.stringify(computeGitBehavioral(makeHistory(files, coChanges), nodes, []));
    expect(a).toBe(b);
  });

  it('copies the extraction window into the block for provenance', () => {
    const result = computeGitBehavioral(
      makeHistory([], [], { maxCount: 200, since: '6 months ago', commitsScanned: 42, headSha: 'deadbee', shallow: true }),
      [],
      [],
    );
    expect(result.window).toEqual({
      maxCount: 200,
      since: '6 months ago',
      commitsScanned: 42,
      headSha: 'deadbee',
      shallow: true,
    });
  });

  it('handles empty history + empty graph without throwing', () => {
    const result = computeGitBehavioral(makeHistory([], []), [], []);
    expect(result.churnHotspots.top).toHaveLength(0);
    expect(result.churnHotspots.summary.churnedFileCount).toBe(0);
    expect(result.couplingDrift.top).toHaveLength(0);
    expect(result.couplingDrift.summary.driftPairCount).toBe(0);
  });

  it('carries surfaces-not-verdicts notes on both surfaces', () => {
    const result = computeGitBehavioral(makeHistory([], []), [], []);
    expect(result.note).toMatch(/SURFACES, NOT VERDICTS/);
    expect(result.churnHotspots.note).toMatch(/active development/);
    expect(result.couplingDrift.note).toMatch(/CANDIDATE hidden dependencies/);
  });
});

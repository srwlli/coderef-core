/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability ownership-analytics-tests
 */

/**
 * Ownership / knowledge analytics tests
 * (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P2).
 *
 * computeOwnership is PURE over (GitHistory, nodes, nowEpoch) — these tests feed
 * a synthetic GitHistory.authorship record directly, no git repo and no
 * filesystem, and pass the reference clock in as data (so ageDays is
 * deterministic, never Date.now). They pin: dominant-author share (bus-factor
 * proxy), single-author counting, projection filtering, absence=no-data,
 * ranking + determinism, and clock-as-data ageDays.
 */

import { describe, it, expect } from 'vitest';
import { computeOwnership } from '../../src/map/ownership.js';
import { GitHistory, GitFileAuthorship } from '../../src/map/git-history.js';

/** epoch seconds for a fixed reference "now" (2024-01-01T00:00:00Z). */
const NOW = 1704067200;
const DAY = 86400;

function makeHistory(authorship: GitFileAuthorship[]): GitHistory {
  return {
    window: {
      maxCount: 500,
      since: null,
      commitsScanned: 10,
      headSha: 'abc1234',
      shallow: false,
    },
    files: [],
    coChanges: [],
    authorship,
  };
}

const node = (id: string) => ({ id });

describe('computeOwnership — dominant-author share (bus factor)', () => {
  it('reports share == 1 for a single-author file and counts it as single-author', () => {
    const history = makeHistory([
      {
        file: 'a.ts',
        authors: [{ name: 'alice', commitCount: 5 }],
        distinctAuthorCount: 1,
        lastTouchedEpoch: NOW - 10 * DAY,
      },
    ]);
    const result = computeOwnership(history, [node('a.ts')], NOW);
    const a = result.top.find(f => f.file === 'a.ts')!;
    expect(a.dominantAuthor).toBe('alice');
    expect(a.dominantAuthorShare).toBe(1);
    expect(a.distinctAuthorCount).toBe(1);
    expect(a.totalCommits).toBe(5);
    expect(result.summary.singleAuthorFileCount).toBe(1);
    expect(result.summary.filesWithAuthorship).toBe(1);
  });

  it('computes a fractional share for a multi-author file (top author / total)', () => {
    const history = makeHistory([
      {
        file: 'b.ts',
        authors: [
          { name: 'bob', commitCount: 6 },
          { name: 'carol', commitCount: 2 },
        ],
        distinctAuthorCount: 2,
        lastTouchedEpoch: NOW - 3 * DAY,
      },
    ]);
    const result = computeOwnership(history, [node('b.ts')], NOW);
    const b = result.top.find(f => f.file === 'b.ts')!;
    expect(b.dominantAuthor).toBe('bob');
    expect(b.totalCommits).toBe(8);
    expect(b.dominantAuthorShare).toBeCloseTo(0.75, 6);
    expect(result.summary.singleAuthorFileCount).toBe(0);
  });
});

describe('computeOwnership — projection filtering + absence=no-data', () => {
  it('excludes files absent from the projected node set', () => {
    const history = makeHistory([
      { file: 'kept.ts', authors: [{ name: 'a', commitCount: 1 }], distinctAuthorCount: 1, lastTouchedEpoch: NOW },
      { file: 'gone.ts', authors: [{ name: 'a', commitCount: 1 }], distinctAuthorCount: 1, lastTouchedEpoch: NOW },
    ]);
    // only kept.ts is a projected node
    const result = computeOwnership(history, [node('kept.ts')], NOW);
    expect(result.top.map(f => f.file)).toEqual(['kept.ts']);
    expect(result.summary.filesWithAuthorship).toBe(1);
  });

  it('returns an empty block when authorship is absent (no-data, not zero)', () => {
    const history = makeHistory([]);
    // simulate a GitHistory with no authorship facet at all
    delete (history as { authorship?: unknown }).authorship;
    const result = computeOwnership(history, [node('a.ts')], NOW);
    expect(result.top).toEqual([]);
    expect(result.summary.filesWithAuthorship).toBe(0);
    expect(result.summary.singleAuthorFileCount).toBe(0);
  });

  it('returns an empty block when authorship is an empty array', () => {
    const result = computeOwnership(makeHistory([]), [node('a.ts')], NOW);
    expect(result.top).toEqual([]);
    expect(result.summary.filesWithAuthorship).toBe(0);
  });
});

describe('computeOwnership — ranking + determinism', () => {
  it('ranks by dominant share desc, then ageDays desc, then file asc', () => {
    const history = makeHistory([
      // share 1.0, old
      { file: 'z-old.ts', authors: [{ name: 'a', commitCount: 3 }], distinctAuthorCount: 1, lastTouchedEpoch: NOW - 100 * DAY },
      // share 1.0, recent -> same share as z-old, but younger => ranks AFTER z-old
      { file: 'a-recent.ts', authors: [{ name: 'a', commitCount: 3 }], distinctAuthorCount: 1, lastTouchedEpoch: NOW - 1 * DAY },
      // share 0.5 -> ranks last
      { file: 'm-shared.ts', authors: [{ name: 'a', commitCount: 1 }, { name: 'b', commitCount: 1 }], distinctAuthorCount: 2, lastTouchedEpoch: NOW },
    ]);
    const nodes = [node('z-old.ts'), node('a-recent.ts'), node('m-shared.ts')];
    const result = computeOwnership(history, nodes, NOW);
    expect(result.top.map(f => f.file)).toEqual(['z-old.ts', 'a-recent.ts', 'm-shared.ts']);
  });

  it('is deterministic — identical inputs produce identical output', () => {
    const build = () =>
      makeHistory([
        { file: 'a.ts', authors: [{ name: 'x', commitCount: 2 }], distinctAuthorCount: 1, lastTouchedEpoch: NOW - DAY },
        { file: 'b.ts', authors: [{ name: 'y', commitCount: 4 }, { name: 'z', commitCount: 1 }], distinctAuthorCount: 2, lastTouchedEpoch: NOW - 2 * DAY },
      ]);
    const nodes = [node('a.ts'), node('b.ts')];
    expect(JSON.stringify(computeOwnership(build(), nodes, NOW))).toBe(
      JSON.stringify(computeOwnership(build(), nodes, NOW)),
    );
  });

  it('caps the ranking and flags truncation', () => {
    const authorship: GitFileAuthorship[] = Array.from({ length: 5 }, (_, i) => ({
      file: `f${i}.ts`,
      authors: [{ name: 'a', commitCount: 1 }],
      distinctAuthorCount: 1,
      lastTouchedEpoch: NOW,
    }));
    const nodes = authorship.map(a => node(a.file));
    const result = computeOwnership(makeHistory(authorship), nodes, NOW, { ownershipTop: 2 });
    expect(result.top).toHaveLength(2);
    expect(result.topTruncated).toBe(true);
    expect(result.summary.filesWithAuthorship).toBe(5);
  });
});

describe('computeOwnership — ageDays is derived from the passed clock, not Date.now', () => {
  it('floors age against nowEpoch and never goes negative', () => {
    const history = makeHistory([
      { file: 'past.ts', authors: [{ name: 'a', commitCount: 1 }], distinctAuthorCount: 1, lastTouchedEpoch: NOW - 30 * DAY - 100 },
      // lastTouched in the "future" relative to nowEpoch => clamped to 0, not negative
      { file: 'future.ts', authors: [{ name: 'a', commitCount: 1 }], distinctAuthorCount: 1, lastTouchedEpoch: NOW + 5 * DAY },
    ]);
    const result = computeOwnership(history, [node('past.ts'), node('future.ts')], NOW);
    const past = result.top.find(f => f.file === 'past.ts')!;
    const future = result.top.find(f => f.file === 'future.ts')!;
    expect(past.ageDays).toBe(30); // floor((30d + 100s) / 1d)
    expect(future.ageDays).toBe(0);
    expect(result.summary.nowEpoch).toBe(NOW);
  });
});

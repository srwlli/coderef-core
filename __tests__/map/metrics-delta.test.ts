/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability map-metrics-delta-tests
 */

import { describe, it, expect } from 'vitest';
import { diffMapMetrics, type MapMetricsDelta } from '../../src/map/metrics-delta.js';
import type { MapMetrics } from '../../src/map/engineering-metrics.js';

/**
 * Build a synthetic MapMetrics with sensible defaults, overridable per family.
 * No .coderef read — the diff is a pure function of two MapMetrics records.
 */
function makeMetrics(overrides: Partial<MapMetrics> = {}): MapMetrics {
  const base: MapMetrics = {
    schemaVersion: '1.0.0',
    testLinkage: {
      summary: {
        testFileCount: 2,
        srcFileCount: 10,
        srcWithTestEdgeCount: 6,
        srcWithoutTestEdgeCount: 4,
      },
      testFiles: [],
      inboundFromTests: {},
      zeroTestInEdge: [],
      zeroTestInEdgeTruncated: false,
      note: '',
    },
    documentation: {
      summary: {
        totalElements: 100,
        byStatus: { defined: 80, missing: 15, partial: 5 },
        indexedFileCount: 10,
        filesWithNonDefinedCount: 6,
      },
      files: {},
      topNonDefined: [],
      topNonDefinedTruncated: false,
      note: '',
    },
    unresolvedRefs: {
      summary: {
        fileCount: 3,
        edgeCount: 12,
        byStatus: { unresolved: 8, ambiguous: 4 },
      },
      files: {},
      top: [],
      topTruncated: false,
      note: '',
    },
    largestModules: {
      top: [
        { file: 'src/a.ts', elementCount: 30 },
        { file: 'src/b.ts', elementCount: 20 },
        { file: 'src/c.ts', elementCount: 10 },
      ],
      topTruncated: false,
    },
    mostDependencies: {
      top: [
        { file: 'src/a.ts', efferent: 5, afferent: 2 },
        { file: 'src/b.ts', efferent: 3, afferent: 1 },
      ],
      topTruncated: false,
    },
    warnings: [],
    note: '',
  };
  return { ...base, ...overrides };
}

describe('diffMapMetrics — pure determinism', () => {
  it('is byte-identical for identical inputs (deep-equal, stable)', () => {
    const a = makeMetrics();
    const b = makeMetrics();
    const d1 = diffMapMetrics(a, b);
    const d2 = diffMapMetrics(makeMetrics(), makeMetrics());
    expect(JSON.stringify(d1)).toBe(JSON.stringify(d2));
  });

  it('identical snapshots => all-zero delta, every family unchanged', () => {
    const same = makeMetrics();
    const d = diffMapMetrics(same, JSON.parse(JSON.stringify(same)) as MapMetrics);
    expect(d.testLinkage.direction).toBe('unchanged');
    expect(d.documentation.direction).toBe('unchanged');
    expect(d.unresolvedRefs.direction).toBe('unchanged');
    expect(d.largestModules.direction).toBe('unchanged');
    expect(d.mostDependencies.direction).toBe('unchanged');
    // every scalar delta is 0
    for (const sd of Object.values(d.testLinkage.summaryDeltas ?? {})) expect(sd.delta).toBe(0);
    for (const sd of Object.values(d.documentation.byStatusDeltas ?? {})) expect(sd.delta).toBe(0);
    // no ranking membership churn
    expect(d.largestModules.rankingChange).toEqual({ entered: [], left: [], rankChanged: [] });
    expect(d.mostDependencies.rankingChange).toEqual({ entered: [], left: [], rankChanged: [] });
    expect(d.warnings).toEqual([]);
  });
});

describe('diffMapMetrics — scalar deltas + direction (concern-scalar provenance)', () => {
  it('testLinkage: srcWithoutTestEdgeCount down => improved', () => {
    const before = makeMetrics();
    const after = makeMetrics({
      testLinkage: {
        ...makeMetrics().testLinkage,
        summary: { testFileCount: 2, srcFileCount: 10, srcWithTestEdgeCount: 9, srcWithoutTestEdgeCount: 1 },
      },
    });
    const d = diffMapMetrics(before, after);
    expect(d.testLinkage.summaryDeltas?.srcWithoutTestEdgeCount).toEqual({ before: 4, after: 1, delta: -3 });
    expect(d.testLinkage.direction).toBe('improved');
  });

  it('documentation: filesWithNonDefinedCount up => regressed', () => {
    const before = makeMetrics();
    const after = makeMetrics({
      documentation: {
        ...makeMetrics().documentation,
        summary: { totalElements: 100, byStatus: { defined: 70, missing: 25, partial: 5 }, indexedFileCount: 10, filesWithNonDefinedCount: 9 },
      },
    });
    const d = diffMapMetrics(before, after);
    expect(d.documentation.summaryDeltas?.filesWithNonDefinedCount).toEqual({ before: 6, after: 9, delta: 3 });
    expect(d.documentation.direction).toBe('regressed');
  });

  it('unresolvedRefs: edgeCount unchanged => unchanged', () => {
    const d = diffMapMetrics(makeMetrics(), makeMetrics());
    expect(d.unresolvedRefs.summaryDeltas?.edgeCount).toEqual({ before: 12, after: 12, delta: 0 });
    expect(d.unresolvedRefs.direction).toBe('unchanged');
  });
});

describe('diffMapMetrics — Record<key,count> per-key diff', () => {
  it('documentation.byStatus: add/drop/change surfaced per key, key-sorted', () => {
    const before = makeMetrics();
    const after = makeMetrics({
      documentation: {
        ...makeMetrics().documentation,
        summary: {
          totalElements: 100,
          byStatus: { defined: 85, missing: 15, stale: 3 }, // partial dropped, stale added, defined changed
          indexedFileCount: 10,
          filesWithNonDefinedCount: 6,
        },
      },
    });
    const d = diffMapMetrics(before, after);
    const bs = d.documentation.byStatusDeltas!;
    expect(bs.defined).toEqual({ before: 80, after: 85, delta: 5 });
    expect(bs.missing).toEqual({ before: 15, after: 15, delta: 0 });
    expect(bs.partial).toEqual({ before: 5, after: 0, delta: -5 }); // dropped
    expect(bs.stale).toEqual({ before: 0, after: 3, delta: 3 }); // added
    // key-sorted
    expect(Object.keys(bs)).toEqual(['defined', 'missing', 'partial', 'stale']);
  });

  it('byStatus is NOT leaked into summaryDeltas (nested Record handled separately)', () => {
    const d = diffMapMetrics(makeMetrics(), makeMetrics());
    expect(d.documentation.summaryDeltas).not.toHaveProperty('byStatus');
    expect(d.unresolvedRefs.summaryDeltas).not.toHaveProperty('byStatus');
  });
});

describe('diffMapMetrics — ranked-list membership (identity, never position)', () => {
  it('entered / left / rankChanged by file identity', () => {
    const before = makeMetrics();
    const after = makeMetrics({
      largestModules: {
        top: [
          { file: 'src/b.ts', elementCount: 40 }, // was rank 1 -> now rank 0 (rankChanged)
          { file: 'src/a.ts', elementCount: 35 }, // was rank 0 -> now rank 1 (rankChanged)
          { file: 'src/d.ts', elementCount: 12 }, // entered (src/c.ts left)
        ],
        topTruncated: false,
      },
    });
    const d = diffMapMetrics(before, after);
    const rc = d.largestModules.rankingChange!;
    expect(rc.entered).toEqual(['src/d.ts']);
    expect(rc.left).toEqual(['src/c.ts']);
    expect(rc.rankChanged).toEqual([
      { file: 'src/a.ts', beforeRank: 0, afterRank: 1 },
      { file: 'src/b.ts', beforeRank: 1, afterRank: 0 },
    ]);
  });

  it('pure reorder with identical membership => empty entered/left, only rankChanged', () => {
    const before = makeMetrics();
    const after = makeMetrics({
      largestModules: {
        top: [
          { file: 'src/c.ts', elementCount: 10 },
          { file: 'src/b.ts', elementCount: 20 },
          { file: 'src/a.ts', elementCount: 30 },
        ],
        topTruncated: false,
      },
    });
    const d = diffMapMetrics(before, after);
    const rc = d.largestModules.rankingChange!;
    expect(rc.entered).toEqual([]);
    expect(rc.left).toEqual([]);
    // a.ts 0->2 and c.ts 2->0 changed; b.ts stayed at 1
    expect(rc.rankChanged.map(r => r.file)).toEqual(['src/a.ts', 'src/c.ts']);
  });

  it('pure rankings stay direction-neutral (a module growing is a fact, not a regression)', () => {
    const before = makeMetrics();
    const after = makeMetrics({
      largestModules: {
        top: [
          { file: 'src/a.ts', elementCount: 300 }, // huge growth
          { file: 'src/b.ts', elementCount: 20 },
          { file: 'src/c.ts', elementCount: 10 },
        ],
        topTruncated: false,
      },
    });
    const d = diffMapMetrics(before, after);
    expect(d.largestModules.direction).toBe('unchanged');
    expect(d.mostDependencies.direction).toBe('unchanged');
  });
});

describe('diffMapMetrics — NO composite score (load-bearing constraint)', () => {
  it('output has no summed/weighted total field across families', () => {
    const d = diffMapMetrics(makeMetrics(), makeMetrics()) as unknown as Record<string, unknown>;
    // The only top-level keys are the five families + schemaVersion + warnings + note.
    expect(Object.keys(d).sort()).toEqual(
      ['documentation', 'largestModules', 'mostDependencies', 'note', 'schemaVersion', 'testLinkage', 'unresolvedRefs', 'warnings'].sort(),
    );
    // No 'score', 'total', 'composite', 'overall', 'aggregate' anywhere.
    for (const forbidden of ['score', 'total', 'composite', 'overall', 'aggregate']) {
      expect(d).not.toHaveProperty(forbidden);
    }
  });

  it('a regression in one family and an improvement in another both surface, un-netted', () => {
    const before = makeMetrics();
    const after = makeMetrics({
      testLinkage: {
        ...makeMetrics().testLinkage,
        summary: { testFileCount: 2, srcFileCount: 10, srcWithTestEdgeCount: 9, srcWithoutTestEdgeCount: 1 }, // improved
      },
      unresolvedRefs: {
        ...makeMetrics().unresolvedRefs,
        summary: { fileCount: 5, edgeCount: 20, byStatus: { unresolved: 14, ambiguous: 6 } }, // regressed
      },
    });
    const d = diffMapMetrics(before, after);
    expect(d.testLinkage.direction).toBe('improved');
    expect(d.unresolvedRefs.direction).toBe('regressed');
    // The two are independent — neither cancels the other.
  });
});

describe('diffMapMetrics — surfaces-not-verdicts (direction is provenance)', () => {
  it('every family carries a direction label documented as provenance', () => {
    const d = diffMapMetrics(makeMetrics(), makeMetrics());
    for (const fam of [d.testLinkage, d.documentation, d.unresolvedRefs, d.largestModules, d.mostDependencies]) {
      expect(['improved', 'regressed', 'unchanged']).toContain(fam.direction);
    }
    expect(d.note).toMatch(/SURFACES, NOT VERDICTS/i);
    expect(d.note).toMatch(/never.*composite/i);
  });
});

describe('diffMapMetrics — graceful no-data (never a fabricated diff)', () => {
  it('schemaVersion mismatch => warning + match:false, families still diffed', () => {
    const before = makeMetrics({ schemaVersion: '1.0.0' });
    const after = makeMetrics({ schemaVersion: '2.0.0' });
    const d = diffMapMetrics(before, after);
    expect(d.schemaVersion).toEqual({ before: '1.0.0', after: '2.0.0', match: false });
    expect(d.warnings.some(w => /schemaVersion mismatch/i.test(w))).toBe(true);
    // families with equal content still diff to zero (mismatch is surfaced, not fatal)
    expect(d.testLinkage.noData).toBe(false);
  });

  it('a family absent on one side => noData + warning, no fabricated numbers', () => {
    const before = makeMetrics();
    const after = makeMetrics();
    // Simulate a pre-1.4 / partial snapshot missing testLinkage.
    delete (after as { testLinkage?: unknown }).testLinkage;
    const d = diffMapMetrics(before, after);
    expect(d.testLinkage.noData).toBe(true);
    expect(d.testLinkage.summaryDeltas).toBeUndefined();
    expect(d.warnings.some(w => /testLinkage absent/i.test(w))).toBe(true);
    // other families still diff normally
    expect(d.documentation.noData).toBe(false);
  });

  it('both snapshots undefined => all families no-data, no throw', () => {
    const d: MapMetricsDelta = diffMapMetrics(undefined, undefined);
    expect(d.testLinkage.noData).toBe(true);
    expect(d.documentation.noData).toBe(true);
    expect(d.unresolvedRefs.noData).toBe(true);
    expect(d.largestModules.noData).toBe(true);
    expect(d.mostDependencies.noData).toBe(true);
    expect(d.schemaVersion.match).toBe(false);
  });
});

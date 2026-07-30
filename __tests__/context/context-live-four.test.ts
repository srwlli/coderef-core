/**
 * Context cluster — behavior tests for the LIVE-CONSUMED untested four
 * (WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 Phase 4, cluster C):
 *
 * - ImpactSimulator      ← breaking-change-detector/index.ts + cli/coderef-analyze.ts
 * - FuzzyResolver        ← public context barrel (src/index.ts)
 * - ContextTracker       ← integration/ai-prompt-generator.ts
 * - EntryPointDetector   ← context/context-generator.ts
 *
 * Scope guard (honest metric): the remaining zero-edge context files
 * (formatters/generators/extractors, types.ts) are a ranked residual deferred
 * to Phase 7 quarantine rulings — no tests-for-the-metric's-sake here.
 * breaking-change-detector internals stay covered transitively via their
 * facade test; that is a metric-semantics disclosure, not a gap this file fills.
 *
 * ContextTracker starts a cleanup setInterval in its constructor — every test
 * MUST destroy() the tracker or the open handle outlives the suite.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { ImpactSimulator } from '../../src/context/impact-simulator.js';
import { FuzzyResolver } from '../../src/context/fuzzy-resolver.js';
import { ContextTracker } from '../../src/context/context-tracker.js';
import { EntryPointDetector } from '../../src/context/entry-point-detector.js';
import type { ElementData } from '../../src/types/types.js';

// ---------------------------------------------------------------------------
// ImpactSimulator
// ---------------------------------------------------------------------------

interface SimNode { id: string; type: string; file: string; }
interface SimEdge { source: string; target: string; type: string; }

function buildGraph(nodeSpecs: Array<{ id: string; file: string }>, edgeSpecs: Array<{ source: string; target: string }>) {
  const nodes = new Map<string, SimNode>();
  for (const n of nodeSpecs) nodes.set(n.id, { id: n.id, type: 'function', file: n.file });
  const edges: SimEdge[] = edgeSpecs.map(e => ({ ...e, type: 'call' }));
  const edgesBySource = new Map<string, SimEdge[]>();
  const edgesByTarget = new Map<string, SimEdge[]>();
  for (const e of edges) {
    if (!edgesBySource.has(e.source)) edgesBySource.set(e.source, []);
    edgesBySource.get(e.source)!.push(e);
    if (!edgesByTarget.has(e.target)) edgesByTarget.set(e.target, []);
    edgesByTarget.get(e.target)!.push(e);
  }
  return { nodes, edges, edgesBySource, edgesByTarget };
}

describe('ImpactSimulator - blast radius over incoming edges', () => {
  // Dependency chain: B depends on A, C depends on B (edges point source->target
  // as "source depends on target"): changing A impacts B directly, C transitively.
  const graph = buildGraph(
    [
      { id: 'A', file: 'src/a.ts' },
      { id: 'B', file: 'src/b.ts' },
      { id: 'C', file: 'src/c.ts' },
    ],
    [
      { source: 'B', target: 'A' },
      { source: 'C', target: 'B' },
    ],
  );

  it('classifies direct vs transitive impacts with severity and risk score', () => {
    const sim = new ImpactSimulator(graph as any);
    const blast = sim.calculateBlastRadius('A');

    expect(blast.sourceElement.id).toBe('A');
    expect(blast.directImpacts.map(i => i.elementId)).toEqual(['B']);
    expect(blast.directImpacts[0].impactLevel).toBe('direct');
    expect(blast.directImpacts[0].cascadeDepth).toBe(1);
    expect(blast.directImpacts[0].dependentCount).toBe(1); // C depends on B

    expect(blast.transitiveImpacts.map(i => i.elementId)).toEqual(['C']);
    expect(blast.transitiveImpacts[0].impactLevel).toBe('transitive');

    expect(blast.secondaryImpacts).toEqual([]);
    expect(blast.totalImpactedElements).toBe(2);
    expect(blast.severity).toBe('low'); // < 5 impacted
    expect(blast.riskScore).toBe(12); // 1 direct * 10 + 1 transitive * 2
  });

  it('throws on an unknown element id', () => {
    const sim = new ImpactSimulator(graph as any);
    expect(() => sim.calculateBlastRadius('does-not-exist')).toThrow(/Element not found/);
  });

  it('caches blast radius results and summarizes modules', () => {
    const sim = new ImpactSimulator(graph as any);
    const first = sim.calculateBlastRadius('A');
    const second = sim.calculateBlastRadius('A');
    expect(second).toBe(first); // cache hit returns the same object
    expect(sim.getCacheStats().cacheSize).toBe(1);

    const summary = sim.getImpactSummary('A');
    expect(summary.totalImpactedElements).toBe(2);
    expect(summary.affectedModules).toEqual(['src']); // first path segment of impacted files
    expect(summary.totalImpactedFiles).toBe(1);
    expect(summary.severity).toBe('low');
    expect(summary.mitigationStrategies.length).toBeGreaterThan(0);
    expect(summary.cascadeChain[0]).toBe('START: A');
    expect(summary.cascadeChain[summary.cascadeChain.length - 1]).toBe('END: 2 total elements affected');
  });
});

// ---------------------------------------------------------------------------
// FuzzyResolver
// ---------------------------------------------------------------------------

describe('FuzzyResolver - moved/renamed element matching', () => {
  const meta = { type: 'function', exported: true, isAsync: false };
  const elements = new Map<string, any>([
    ['function:doWork:src/a.ts', { id: 'function:doWork:src/a.ts', type: 'function', file: 'src/a.ts', metadata: meta }],
    ['function:doWork:src/b.ts', { id: 'function:doWork:src/b.ts', type: 'function', file: 'src/b.ts', metadata: meta }],
    ['class:Unrelated:lib/zeta.ts', { id: 'class:Unrelated:lib/zeta.ts', type: 'class', file: 'lib/zeta.ts', metadata: { type: 'class', exported: false, isAsync: true } }],
  ]);

  it('finds the moved twin above the default threshold and excludes unrelated elements', () => {
    const resolver = new FuzzyResolver(elements);
    const drift = resolver.findMovedElements('function:doWork:src/a.ts');

    expect(drift.hasMatch).toBe(true);
    expect(drift.matchFound).toBe(true);
    expect(drift.matches[0].matchedElementId).toBe('function:doWork:src/b.ts');
    expect(drift.matches[0].metrics.nameSimilarity).toBeGreaterThan(0.9);
    // The unrelated class never clears the threshold.
    expect(drift.matches.map(m => m.matchedElementId)).not.toContain('class:Unrelated:lib/zeta.ts');
  });

  it('returns an empty no-match result for an unknown source id', () => {
    const resolver = new FuzzyResolver(elements);
    const drift = resolver.findMovedElements('missing:id');
    expect(drift.sourceElement).toBeNull();
    expect(drift.hasMatch).toBe(false);
    expect(drift.matchFound).toBe(false);
    expect(drift.matches).toEqual([]);
  });

  it('validates the similarity threshold and honors overrides', () => {
    const resolver = new FuzzyResolver(elements);
    expect(() => resolver.setSimilarityThreshold(1.5)).toThrow();
    expect(() => resolver.setSimilarityThreshold(-0.1)).toThrow();

    const similar = resolver.findSimilarElements('function:doWork:src/a.ts', 0.7);
    expect(similar.length).toBeGreaterThan(0);
    expect(similar[0].element.id).toBe('function:doWork:src/b.ts');
    expect(resolver.getCacheStats().totalElements).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// ContextTracker
// ---------------------------------------------------------------------------

describe('ContextTracker - conversation context state', () => {
  const trackers: ContextTracker[] = [];
  function makeTracker(maxHistory = 100): ContextTracker {
    const t = new ContextTracker('conv-test', maxHistory);
    trackers.push(t);
    return t;
  }

  afterEach(() => {
    // The constructor starts a cleanup setInterval; destroy() is mandatory.
    while (trackers.length > 0) trackers.pop()!.destroy();
  });

  it('stores and retrieves context values', () => {
    const tracker = makeTracker();
    const id = tracker.setContext('focusFile', 'src/map/emit-map.ts');
    expect(id).toBeTruthy();
    expect(tracker.getContext('focusFile')).toBe('src/map/emit-map.ts');
    expect(tracker.hasContext('focusFile')).toBe(true);
    expect(tracker.getContext('unknown')).toBeNull();
    expect(tracker.getContextKeys()).toEqual(['focusFile']);
    expect(tracker.getConversationId()).toBe('conv-test');
  });

  it('expires entries past their TTL', async () => {
    const tracker = makeTracker();
    tracker.setContext('ephemeral', 42, 1); // 1ms TTL
    await new Promise(resolve => setTimeout(resolve, 15));
    expect(tracker.getContext('ephemeral')).toBeNull();
    expect(tracker.hasContext('ephemeral')).toBe(false);
  });

  it('caps history at maxHistorySize and serves recent slices', () => {
    const tracker = makeTracker(5);
    for (let i = 0; i < 7; i++) tracker.setContext(`k${i}`, i);
    const history = tracker.getHistory();
    expect(history.conversationId).toBe('conv-test');
    expect(history.entries).toHaveLength(5);
    expect(history.entries[0].key).toBe('k2'); // first two evicted

    const recent = tracker.getRecentHistory(2);
    expect(recent.map(e => e.key)).toEqual(['k5', 'k6']);
    expect(tracker.getKeyHistory('k6')).toHaveLength(1);
  });

  it('merges context with concat and preserve strategies', () => {
    const tracker = makeTracker();
    tracker.setContext('tags', ['a']);
    tracker.mergeContext({ tags: ['b'] }, 'concat');
    expect(tracker.getContext('tags')).toEqual(['a', 'b']);

    tracker.setContext('mode', 'original');
    tracker.mergeContext({ mode: 'clobbered' }, 'preserve');
    expect(tracker.getContext('mode')).toBe('original');
  });

  it('round-trips context through JSON export/import', () => {
    const tracker = makeTracker();
    tracker.setContext('focus', { file: 'src/a.ts' });
    const json = tracker.exportToJSON();

    const restored = makeTracker();
    restored.importFromJSON(json);
    expect(restored.getContext('focus')).toEqual({ file: 'src/a.ts' });
    expect(restored.getConversationId()).toBe('conv-test');

    expect(() => restored.importFromJSON('{not json')).toThrow(/Failed to import context/);
    const stats = tracker.getStatistics();
    expect(stats.contextCount).toBe(1);
    expect(stats.historySize).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// EntryPointDetector
// ---------------------------------------------------------------------------

describe('EntryPointDetector - naming and file-pattern detection', () => {
  const detector = new EntryPointDetector();

  const elements: ElementData[] = [
    { type: 'function', name: 'handleRequest', file: 'src/http/request.ts', line: 1 },
    { type: 'function', name: 'registerRoutes', file: 'src/http/routes.ts', line: 2 },
    { type: 'function', name: 'main', file: 'src/boot/start.ts', line: 3 },
    { type: 'class', name: 'AuthCommand', file: 'src/commands/auth.ts', line: 4 },
    { type: 'class', name: 'EventHandler', file: 'src/events/on.ts', line: 5 },
    { type: 'function', name: 'parseArgs', file: 'src/cli.ts', line: 6 }, // file-pattern hit
    { type: 'function', name: 'randomHelper', file: 'src/util/helpers.ts', line: 7 }, // neither
    { type: 'function', name: 'transformData', file: 'src/deep/logic.ts', line: 8 }, // neither
  ];

  it('detects name-pattern and file-pattern entry points, excludes the rest', () => {
    const entryPoints = detector.detectEntryPoints(elements);
    const names = entryPoints.map(e => e.name).sort();
    expect(names).toEqual(['AuthCommand', 'EventHandler', 'handleRequest', 'main', 'parseArgs', 'registerRoutes']);
    expect(names).not.toContain('randomHelper');
    expect(names).not.toContain('transformData');
  });

  it('reports statistics by type and detection method', () => {
    const entryPoints = detector.detectEntryPoints(elements);
    const stats = detector.getStatistics(entryPoints);
    expect(stats.total).toBe(6);
    expect(stats.byType).toEqual({ function: 4, class: 2 });
    expect(stats.byPattern.namePattern).toBe(5); // all but the cli.ts file-pattern hit
    expect(stats.byPattern.filePattern).toBe(1);
  });
});

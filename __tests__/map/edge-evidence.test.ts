/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability map-edge-evidence-tests
 */

/**
 * Edge evidence for the map projection (WO-MAP-GRAPH-ANALYTICS-MODULE-001 P2).
 *
 * Hermetic fixture of raw graph.json edge records exercising: exact sample
 * content per provenance class, builtin/unresolved exclusion, ambiguous
 * candidate counts, cap truncation + warnings, determinism under reversed
 * input, and a real-repo smoke bound on a tmp copy of this repo's artifacts
 * (never the live tree — sibling suites regenerate it mid-run).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { computeEdgeEvidence, MapEdgeEvidence } from '../../src/map/edge-evidence.js';
import { projectMapData } from '../../src/map/project-map-data.js';
import { normalizeSlashes } from '../../src/utils/path-normalize.js';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function fixtureNodeFile(): Map<string, string> {
  return new Map([
    ['@File/src/a.ts', 'src/a.ts'],
    ['@Fn/src/a.ts#alpha:1', 'src/a.ts'],
    ['@File/src/b.ts', 'src/b.ts'],
    ['@Fn/src/b.ts#beta:1', 'src/b.ts'],
    ['@I/src/b.ts#Beta:2', 'src/b.ts'],
    ['@Fn/src/c.ts#gamma:1', 'src/c.ts'],
  ]);
}

function fixtureEdges(): any[] {
  return [
    // resolved import (line 0 like real scans; explicit provenance)
    {
      id: 'e1',
      sourceId: '@File/src/a.ts',
      targetId: '@I/src/b.ts#Beta:2',
      relationship: 'import',
      resolutionStatus: 'resolved',
      evidence: { kind: 'resolved-import', originSpecifier: './b.js', localName: 'Beta' },
      sourceLocation: { file: 'src/a.ts', line: 0 },
    },
    // resolved call (real line; inferred provenance)
    {
      id: 'e2',
      sourceId: '@Fn/src/a.ts#alpha:1',
      targetId: '@Fn/src/b.ts#beta:1',
      relationship: 'call',
      resolutionStatus: 'resolved',
      evidence: { kind: 'resolved-call', calleeName: 'beta', receiverText: '', scopePath: 'alpha' },
      sourceLocation: { file: 'src/a.ts', line: 12 },
    },
    // builtin + unresolved calls: must NOT leak into samples or counts
    {
      id: 'e3',
      sourceId: '@Fn/src/a.ts#alpha:1',
      relationship: 'call',
      resolutionStatus: 'builtin',
      evidence: { kind: 'builtin-call', calleeName: 'log', receiverText: 'console' },
      sourceLocation: { file: 'src/a.ts', line: 3 },
    },
    {
      id: 'e4',
      sourceId: '@Fn/src/a.ts#alpha:1',
      relationship: 'call',
      resolutionStatus: 'unresolved',
      evidence: { kind: 'unresolved-call', calleeName: 'mystery' },
      sourceLocation: { file: 'src/a.ts', line: 4 },
    },
    // ambiguous call: one candidate lands on the existing a->b pair, the
    // c.ts candidate has no resolved pair and is ignored
    {
      id: 'e5',
      sourceId: '@Fn/src/a.ts#alpha:1',
      relationship: 'call',
      resolutionStatus: 'ambiguous',
      evidence: { kind: 'ambiguous-call', calleeName: 'beta' },
      candidates: ['@Fn/src/b.ts#beta:1', '@Fn/src/c.ts#gamma:1'],
      sourceLocation: { file: 'src/a.ts', line: 9 },
    },
    // ambiguous call with NO candidate on any resolved pair -> unattached
    {
      id: 'e6',
      sourceId: '@Fn/src/b.ts#beta:1',
      relationship: 'call',
      resolutionStatus: 'ambiguous',
      evidence: { kind: 'ambiguous-call', calleeName: 'gamma' },
      candidates: ['@Fn/src/c.ts#gamma:1'],
      sourceLocation: { file: 'src/b.ts', line: 2 },
    },
    // same-file resolved edge: skipped by the cross-file rule
    {
      id: 'e7',
      sourceId: '@File/src/a.ts',
      targetId: '@Fn/src/a.ts#alpha:1',
      relationship: 'export',
      resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/a.ts', line: 1 },
    },
  ];
}

describe('computeEdgeEvidence — hermetic fixture', () => {
  it('emits exact samples and provenance counts for the resolved pair', () => {
    const { byPair, warnings } = computeEdgeEvidence(fixtureEdges(), fixtureNodeFile());
    expect(Array.from(byPair.keys())).toEqual(['src/a.ts src/b.ts']);
    const ev = byPair.get('src/a.ts src/b.ts')!;
    expect(ev.provenance).toEqual({ explicit: 1, inferred: 1 });
    expect(ev.samples).toEqual([
      { relationship: 'import', provenance: 'explicit', line: 0, detail: 'Beta <- ./b.js' },
      { relationship: 'call', provenance: 'inferred', line: 12, detail: 'beta() in alpha' },
    ]);
    expect(ev.samplesTruncated).toBe(false);
    // one warning: the e6 ambiguous edge found no resolved pair
    expect(warnings).toEqual([
      '1 ambiguous edges had no resolved file edge to attach to (counts omitted)',
    ]);
  });

  it('attaches ambiguous counts only to existing pairs, ignoring foreign candidates', () => {
    const { byPair } = computeEdgeEvidence(fixtureEdges(), fixtureNodeFile());
    const ev = byPair.get('src/a.ts src/b.ts')!;
    expect(ev.ambiguous).toEqual({ edgeCount: 1, candidateCount: 1 });
  });

  it('never leaks builtin/unresolved edges into samples', () => {
    const { byPair } = computeEdgeEvidence(fixtureEdges(), fixtureNodeFile());
    for (const ev of byPair.values()) {
      for (const s of ev.samples) {
        expect(s.detail).not.toContain('console.log');
        expect(s.detail).not.toContain('mystery');
      }
    }
  });

  it('degrades gracefully on edges without evidence or sourceLocation', () => {
    const edges = [
      {
        id: 'bare',
        sourceId: '@File/src/a.ts',
        targetId: '@Fn/src/b.ts#beta:1',
        relationship: 'import',
        resolutionStatus: 'resolved',
      },
    ];
    const { byPair, warnings } = computeEdgeEvidence(edges, fixtureNodeFile());
    const ev = byPair.get('src/a.ts src/b.ts')!;
    expect(ev.provenance).toEqual({ explicit: 1 });
    expect(ev.samples).toEqual([
      { relationship: 'import', provenance: 'explicit', line: 0, detail: 'beta' },
    ]);
    expect(warnings).toEqual([]);
  });

  it('caps samples per pair with an aggregate warning; counts stay total', () => {
    const nodeFile = fixtureNodeFile();
    const edges: any[] = [];
    for (let i = 1; i <= 7; i++) {
      edges.push({
        id: 'c' + i,
        sourceId: '@Fn/src/a.ts#alpha:1',
        targetId: '@Fn/src/b.ts#beta:1',
        relationship: 'call',
        resolutionStatus: 'resolved',
        evidence: { kind: 'resolved-call', calleeName: 'fn' + i, scopePath: 'alpha' },
        sourceLocation: { file: 'src/a.ts', line: i * 10 },
      });
    }
    const { byPair, warnings } = computeEdgeEvidence(edges, nodeFile);
    const ev = byPair.get('src/a.ts src/b.ts')!;
    expect(ev.samples.length).toBe(5);
    expect(ev.samplesTruncated).toBe(true);
    expect(ev.provenance.inferred).toBe(7);
    // line-sorted: the five lowest lines survive the cap
    expect(ev.samples.map(s => s.line)).toEqual([10, 20, 30, 40, 50]);
    expect(warnings).toEqual(['edge evidence samples capped at 5 for 1 of 1 file edges']);

    const wide = computeEdgeEvidence(edges, nodeFile, { sampleCap: 10 });
    const wideEv = wide.byPair.get('src/a.ts src/b.ts')!;
    expect(wideEv.samples.length).toBe(7);
    expect(wideEv.samplesTruncated).toBe(false);
    expect(wide.warnings).toEqual([]);
  });

  it('is deterministic under reversed input order', () => {
    const forward = computeEdgeEvidence(fixtureEdges(), fixtureNodeFile());
    const reversed = computeEdgeEvidence(fixtureEdges().reverse(), fixtureNodeFile());
    expect(JSON.stringify(Array.from(forward.byPair.entries()))).toBe(
      JSON.stringify(Array.from(reversed.byPair.entries())),
    );
    expect(forward.warnings).toEqual(reversed.warnings);
  });

  it('handles empty input', () => {
    const { byPair, warnings } = computeEdgeEvidence([], new Map());
    expect(byPair.size).toBe(0);
    expect(warnings).toEqual([]);
  });
});

describe('edge evidence — real-repo smoke (tmp copy, never the live tree)', () => {
  const liveGraph = path.join(REPO_ROOT, '.coderef', 'graph.json');
  const liveIndex = path.join(REPO_ROOT, '.coderef', 'index.json');
  const hasArtifacts = fs.existsSync(liveGraph) && fs.existsSync(liveIndex);
  let root: string;
  let rawEdges: any[];
  let nodeFile: Map<string, string>;

  beforeAll(() => {
    if (!hasArtifacts) return;
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-edge-evidence-smoke-'));
    const coderefDir = path.join(root, '.coderef');
    fs.mkdirSync(coderefDir, { recursive: true });
    fs.copyFileSync(liveGraph, path.join(coderefDir, 'graph.json'));
    fs.copyFileSync(liveIndex, path.join(coderefDir, 'index.json'));
    const graph = JSON.parse(fs.readFileSync(path.join(coderefDir, 'graph.json'), 'utf-8'));
    rawEdges = graph.edges;
    nodeFile = new Map();
    for (const n of graph.nodes) {
      if (n && n.id && n.file) nodeFile.set(n.id, normalizeSlashes(String(n.file)));
    }
  });

  afterAll(() => {
    if (root) fs.rmSync(root, { recursive: true, force: true });
  });

  it.skipIf(!hasArtifacts)('covers exactly the pairs the projection aggregates', () => {
    const { byPair } = computeEdgeEvidence(rawEdges, nodeFile);
    const data = projectMapData(root, { analytics: false });
    expect(byPair.size).toBe(data.edges.length);
    for (const e of data.edges) {
      const ev = byPair.get(e.source + ' ' + e.target);
      expect(ev, e.source + ' -> ' + e.target).toBeDefined();
      const provenanceTotal = Object.values(ev!.provenance).reduce((a, b) => a + b, 0);
      expect(provenanceTotal).toBe(e.weight);
      expect(ev!.samples.length).toBeGreaterThan(0);
      expect(ev!.samples.length).toBeLessThanOrEqual(5);
    }
  });

  it.skipIf(!hasArtifacts)('is deterministic on the real graph', () => {
    const a = computeEdgeEvidence(rawEdges, nodeFile);
    const b = computeEdgeEvidence(rawEdges.slice().reverse(), nodeFile);
    expect(JSON.stringify(Array.from(a.byPair.entries()))).toBe(
      JSON.stringify(Array.from(b.byPair.entries())),
    );
  });
});

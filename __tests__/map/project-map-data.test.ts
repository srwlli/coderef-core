/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability map-data-projection-tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { projectMapData, MapProjectionError } from '../../src/map/project-map-data.js';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/** Minimal synthetic .coderef fixture: 3 files, a 2-file cycle, 1 isolated file. */
function writeFixture(root: string, opts: { withIndex?: boolean } = {}): void {
  const coderefDir = path.join(root, '.coderef');
  fs.mkdirSync(coderefDir, { recursive: true });

  const graph = {
    version: '1.0.0',
    exportedAt: '2026-01-01T00:00:00.000Z',
    nodes: [
      { id: '@File/src/a.ts', type: 'file', name: 'a.ts', file: 'src/a.ts', line: 0 },
      { id: '@Fn/src/a.ts#alpha:1', type: 'function', name: 'alpha', file: 'src/a.ts', line: 1, metadata: { layer: 'service' } },
      { id: '@File/src/b.ts', type: 'file', name: 'b.ts', file: 'src/b.ts', line: 0 },
      { id: '@Fn/src/b.ts#beta:1', type: 'function', name: 'beta', file: 'src/b.ts', line: 1, metadata: { layer: 'utility' } },
      { id: '@Fn/src/c.ts#gamma:1', type: 'function', name: 'gamma', file: 'src/c.ts', line: 1 },
    ],
    edges: [
      // a -> b (import, resolved)
      { id: 'e1', sourceId: '@File/src/a.ts', targetId: '@Fn/src/b.ts#beta:1', relationship: 'import', resolutionStatus: 'resolved' },
      // b -> a (call, resolved) — closes the a<->b cycle
      { id: 'e2', sourceId: '@Fn/src/b.ts#beta:1', targetId: '@Fn/src/a.ts#alpha:1', relationship: 'call', resolutionStatus: 'resolved' },
      // a -> b again (call, resolved) — aggregates onto the same file edge
      { id: 'e3', sourceId: '@Fn/src/a.ts#alpha:1', targetId: '@Fn/src/b.ts#beta:1', relationship: 'call', resolutionStatus: 'resolved' },
      // intra-file edge — must NOT appear as a file edge
      { id: 'e4', sourceId: '@File/src/a.ts', targetId: '@Fn/src/a.ts#alpha:1', relationship: 'export', resolutionStatus: 'resolved' },
      // unresolved edge — must be counted but never aggregated
      { id: 'e5', sourceId: '@Fn/src/a.ts#alpha:1', relationship: 'call', resolutionStatus: 'unresolved' },
    ],
    statistics: { nodeCount: 5, edgeCount: 5 },
  };
  fs.writeFileSync(path.join(coderefDir, 'graph.json'), JSON.stringify(graph), 'utf-8');

  if (opts.withIndex !== false) {
    const index = {
      schemaVersion: '1.0.0',
      projectPath: root,
      totalElements: 3,
      elements: [
        { type: 'function', name: 'alpha', file: 'src/a.ts', line: 1, exported: true },
        { type: 'function', name: 'beta', file: 'src/b.ts', line: 1, exported: false },
        { type: 'function', name: 'gamma', file: 'src/c.ts', line: 1, exported: true },
      ],
    };
    fs.writeFileSync(path.join(coderefDir, 'index.json'), JSON.stringify(index), 'utf-8');
  }
}

describe('projectMapData — synthetic fixture', () => {
  let root: string;

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-map-fixture-'));
    writeFixture(root);
  });

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('aggregates resolved edges to file level, skipping intra-file and unresolved', () => {
    const data = projectMapData(root);
    expect(data.nodes.map(n => n.id)).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
    // a->b aggregates e1 (import) + e3 (call) into one weighted edge; each
    // edge carries the default-on evidence block (P2 — no evidence payloads
    // in this fixture, so provenance falls back to relationship and detail
    // to the target element name).
    expect(data.edges).toEqual([
      {
        source: 'src/a.ts',
        target: 'src/b.ts',
        weight: 2,
        kinds: { import: 1, call: 1 },
        evidence: {
          provenance: { explicit: 1, inferred: 1 },
          samples: [
            { relationship: 'call', provenance: 'inferred', line: 0, detail: 'beta' },
            { relationship: 'import', provenance: 'explicit', line: 0, detail: 'beta' },
          ],
          samplesTruncated: false,
        },
      },
      {
        source: 'src/b.ts',
        target: 'src/a.ts',
        weight: 1,
        kinds: { call: 1 },
        evidence: {
          provenance: { inferred: 1 },
          samples: [
            { relationship: 'call', provenance: 'inferred', line: 0, detail: 'alpha' },
          ],
          samplesTruncated: false,
        },
      },
    ]);
    // Opting out strips the blocks without touching aggregation.
    const bare = projectMapData(root, { edgeEvidence: false });
    expect(bare.edges).toEqual([
      { source: 'src/a.ts', target: 'src/b.ts', weight: 2, kinds: { import: 1, call: 1 } },
      { source: 'src/b.ts', target: 'src/a.ts', weight: 1, kinds: { call: 1 } },
    ]);
    expect(data.meta.source.resolvedEdgeCount).toBe(4); // e1..e4 resolved; e5 not
  });

  it('embeds element detail per node from index.json', () => {
    const data = projectMapData(root);
    const a = data.nodes.find(n => n.id === 'src/a.ts')!;
    expect(a.elements).toEqual([{ name: 'alpha', type: 'function', line: 1, exported: true }]);
    expect(a.elementCount).toBe(1);
    expect(a.elementsTruncated).toBe(false);
    expect(a.layer).toBe('service');
    expect(a.label).toBe('a.ts');
    expect(a.dir).toBe('src');
  });

  it('computes hotspot scores and the hotspots overlay from graph weights', () => {
    const data = projectMapData(root);
    const a = data.nodes.find(n => n.id === 'src/a.ts')!;
    expect(a.outWeight).toBe(2);
    expect(a.inWeight).toBe(1);
    expect(a.hotspotScore).toBe(3);
    expect(data.overlays.hotspots[0]).toEqual({ file: 'src/a.ts', score: 3 });
    // c.ts has no edges — never a hotspot
    expect(data.overlays.hotspots.find(h => h.file === 'src/c.ts')).toBeUndefined();
  });

  it('detects the a<->b file cycle', () => {
    const data = projectMapData(root);
    expect(data.overlays.cycles).toEqual([['src/a.ts', 'src/b.ts']]);
  });

  it('is deterministic modulo generatedAt', () => {
    const one = projectMapData(root);
    const two = projectMapData(root);
    (one.meta as any).generatedAt = 'X';
    (two.meta as any).generatedAt = 'X';
    expect(JSON.stringify(one)).toBe(JSON.stringify(two));
  });

  it('records a warning for the absent optional hotspots enrichment', () => {
    const data = projectMapData(root);
    expect(data.meta.warnings.some(w => w.includes('hotspots.json absent'))).toBe(true);
  });
});

describe('projectMapData — degradation paths', () => {
  it('throws MapProjectionError when graph.json is absent', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-map-empty-'));
    try {
      expect(() => projectMapData(empty)).toThrow(MapProjectionError);
    } finally {
      fs.rmSync(empty, { recursive: true, force: true });
    }
  });

  it('degrades element detail to graph nodes when index.json is absent', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-map-noindex-'));
    try {
      writeFixture(root, { withIndex: false });
      const data = projectMapData(root);
      expect(data.meta.warnings.some(w => w.includes('index.json absent'))).toBe(true);
      const a = data.nodes.find(n => n.id === 'src/a.ts')!;
      // Fallback pulls the non-@File graph nodes as elements
      expect(a.elements.map(e => e.name)).toEqual(['alpha']);
      // Edges are unaffected by index absence
      expect(data.edges.length).toBe(2);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('caps embedded elements at elementCap and flags truncation', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-map-cap-'));
    try {
      writeFixture(root);
      const data = projectMapData(root, { elementCap: 0 });
      const a = data.nodes.find(n => n.id === 'src/a.ts')!;
      expect(a.elements).toEqual([]);
      expect(a.elementsTruncated).toBe(true);
      expect(a.elementCount).toBe(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('projectMapData — real-repo smoke (coderef-core)', () => {
  const hasArtifacts = fs.existsSync(path.join(REPO_ROOT, '.coderef', 'graph.json'));

  it.skipIf(!hasArtifacts)('projects this repo to file-level nodes matching graph files', () => {
    const data = projectMapData(REPO_ROOT);
    const graph = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.coderef', 'graph.json'), 'utf-8'));
    const distinctFiles = new Set(
      graph.nodes.filter((n: any) => n.file).map((n: any) => String(n.file).replace(/\\/g, '/')),
    );
    // Every graph file becomes a node (index.json may add more files, never fewer)
    expect(data.nodes.length).toBeGreaterThanOrEqual(distinctFiles.size);
    expect(data.edges.length).toBeGreaterThan(0);
    expect(data.overlays.hotspots.length).toBeGreaterThan(0);
    // Scale caution from review.md: file-level projection stays small
    const bytes = Buffer.byteLength(JSON.stringify(data), 'utf-8');
    expect(bytes).toBeLessThan(5 * 1024 * 1024);
  });
});

describe('projectMapData — git-behavioral block (opt-in, additive)', () => {
  let root: string;

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-map-git-'));
    writeFixture(root); // src/a.ts <-> src/b.ts have a static edge; src/c.ts isolated
  });
  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const syntheticHistory = {
    window: { maxCount: 500, since: null, commitsScanned: 4, headSha: 'fixture', shallow: false },
    files: [
      { file: 'src/a.ts', commitCount: 4, linesAdded: 40, linesDeleted: 4 },
      { file: 'src/b.ts', commitCount: 2, linesAdded: 20, linesDeleted: 2 },
      { file: 'src/c.ts', commitCount: 3, linesAdded: 30, linesDeleted: 3 },
    ],
    coChanges: [
      { a: 'src/a.ts', b: 'src/b.ts', coChangeCount: 2 }, // has a static edge -> corroborated
      { a: 'src/a.ts', b: 'src/c.ts', coChangeCount: 3 }, // NO static edge -> drift candidate
    ],
  };

  it('omits the git block by default (base path is git-independent)', () => {
    const data = projectMapData(root);
    expect(data.git).toBeUndefined();
    expect(data.meta.schemaVersion).toBe('1.6.0');
  });

  it('omits the git block (with a warning) when git requested but no history supplied', () => {
    const data = projectMapData(root, { git: true, gitHistory: null });
    expect(data.git).toBeUndefined();
    expect(data.meta.warnings.some(w => w.includes('git block requested but no git history'))).toBe(true);
  });

  it('attaches the git block when a history is supplied, applying the co-change-minus-static-edge diff', () => {
    const data = projectMapData(root, { git: true, gitHistory: syntheticHistory });
    expect(data.git).toBeDefined();
    // a/c has no static edge -> surfaced as drift; a/b has one -> corroborated, excluded.
    expect(data.git!.couplingDrift.top).toEqual([{ a: 'src/a.ts', b: 'src/c.ts', coChangeCount: 3 }]);
    expect(data.git!.couplingDrift.summary.corroboratedPairCount).toBe(1);
    // churn×size: src/a.ts has the most commits; elementCount comes from the projection.
    expect(data.git!.churnHotspots.top[0].file).toBe('src/a.ts');
    // provenance window rides along
    expect(data.git!.window.commitsScanned).toBe(4);
  });
});

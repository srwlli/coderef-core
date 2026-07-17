/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability skeleton-map-tests
 */

/**
 * Skeleton map renderer tests (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 P1).
 *
 * renderSkeletonMap is a PURE renderer over MapData — these tests feed it
 * synthetic projections directly (no filesystem). emitSkeleton (the shared
 * CLI/MCP wrapper) gets a hermetic tmp fixture repo, same pattern as
 * mcp-map-parity.test.ts — never this repo's live .coderef/.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { MapData, MapNode, MapEdge } from '../../src/map/project-map-data.js';
import {
  renderSkeletonMap,
  emitSkeleton,
  SkeletonElement,
} from '../../src/map/skeleton-map.js';
import { projectMapData } from '../../src/map/project-map-data.js';

function makeNode(id: string, partial: Partial<MapNode> = {}): MapNode {
  return {
    id,
    label: path.posix.basename(id),
    dir: path.posix.dirname(id) === '.' ? '' : path.posix.dirname(id),
    elementCount: 0,
    elements: [],
    elementsTruncated: false,
    inWeight: 0,
    outWeight: 0,
    hotspotScore: 0,
    ...partial,
  };
}

function makeEdge(source: string, target: string, weight = 1): MapEdge {
  return { source, target, weight, kinds: { import: weight } };
}

function makeData(nodes: MapNode[], edges: MapEdge[]): MapData {
  return {
    meta: {
      schemaVersion: '1.4.0',
      projectPath: '/fixture',
      repoName: 'fixture',
      generatedAt: '2026-01-01T00:00:00.000Z',
      source: { nodeCount: nodes.length, edgeCount: edges.length, resolvedEdgeCount: edges.length, elementCount: 0 },
      warnings: [],
    },
    nodes,
    edges,
    overlays: { hotspots: [], cycles: [] },
  };
}

/** A 12-file synthetic repo: hub.ts is depended on by everything. */
function fixtureData(): { data: MapData; indexElements: SkeletonElement[] } {
  const files = ['src/hub.ts', 'src/mid-a.ts', 'src/mid-b.ts'];
  for (let i = 0; i < 9; i++) files.push(`src/leaf-${String(i).padStart(2, '0')}.ts`);
  const edges: MapEdge[] = [];
  for (const f of files) {
    if (f !== 'src/hub.ts') edges.push(makeEdge(f, 'src/hub.ts', 2));
  }
  edges.push(makeEdge('src/leaf-00.ts', 'src/mid-a.ts'));
  edges.push(makeEdge('src/leaf-01.ts', 'src/mid-a.ts'));
  edges.push(makeEdge('src/leaf-02.ts', 'src/mid-b.ts'));
  const nodes = files.map(f =>
    makeNode(f, {
      elements: [
        { name: `${path.posix.basename(f, '.ts').replace(/-/g, '_')}_fn`, type: 'function', line: 1, exported: true },
      ],
      elementCount: 1,
      hotspotScore: f === 'src/hub.ts' ? 22 : 2,
    }),
  );
  const indexElements: SkeletonElement[] = files.map(f => ({
    name: `${path.posix.basename(f, '.ts').replace(/-/g, '_')}_fn`,
    type: 'function',
    file: f,
    line: 1,
    exported: true,
    parameters: ['input', 'options'],
    async: f === 'src/hub.ts',
  }));
  return { data: makeData(nodes, edges), indexElements };
}

/** Parse the included file ids from rendered text (head lines). */
function includedFileIds(text: string): string[] {
  const ids: string[] = [];
  for (const m of text.matchAll(/^(\S+)  \(in \d+ \/ out \d+\)$/gm)) ids.push(m[1]);
  return ids;
}

describe('renderSkeletonMap', () => {
  it('is deterministic: same inputs render byte-identical text', () => {
    const { data, indexElements } = fixtureData();
    const a = renderSkeletonMap(data, { tokenBudget: 400, indexElements });
    const b = renderSkeletonMap(data, { tokenBudget: 400, indexElements });
    expect(a.text).toBe(b.text);
    expect(a.text).not.toContain('2026-01-01'); // no timestamp in the artifact
  });

  it('ranks the most-depended-on file first', () => {
    const { data, indexElements } = fixtureData();
    const r = renderSkeletonMap(data, { tokenBudget: 4000, indexElements });
    expect(includedFileIds(r.text)[0]).toBe('src/hub.ts');
  });

  it('renders signatures from index elements (async + parameters)', () => {
    const { data, indexElements } = fixtureData();
    const r = renderSkeletonMap(data, { tokenBudget: 4000, indexElements });
    expect(r.text).toContain('async fn hub_fn(input, options)');
    expect(r.text).toContain('fn mid_a_fn(input, options)');
  });

  it('budget monotonicity: a larger budget includes a superset of files', () => {
    const { data, indexElements } = fixtureData();
    const budgets = [200, 300, 500, 4000];
    const sets = budgets.map(b =>
      new Set(includedFileIds(renderSkeletonMap(data, { tokenBudget: b, indexElements }).text)),
    );
    for (let i = 1; i < sets.length; i++) {
      for (const f of sets[i - 1]) expect(sets[i].has(f)).toBe(true);
      expect(sets[i].size).toBeGreaterThanOrEqual(sets[i - 1].size);
    }
  });

  it('adheres to the token budget (estimator-consistent)', () => {
    const { data, indexElements } = fixtureData();
    for (const budget of [250, 400, 800, 1600]) {
      const r = renderSkeletonMap(data, { tokenBudget: budget, indexElements });
      expect(r.estimatedTokens).toBeLessThanOrEqual(budget);
      expect(Math.ceil(r.text.length / 4)).toBe(r.estimatedTokens);
    }
  });

  it('declares omitted files in a ## truncation section and result warnings', () => {
    const { data, indexElements } = fixtureData();
    const r = renderSkeletonMap(data, { tokenBudget: 200, indexElements });
    expect(r.omittedFiles).toBeGreaterThan(0);
    expect(r.includedFiles + r.omittedFiles).toBe(data.nodes.length);
    expect(r.text).toContain('## truncation');
    expect(r.text).toMatch(/omitted \d+ of 12 files beyond token budget/);
    expect(r.warnings.some(w => w.includes('omitted'))).toBe(true);
  });

  it('emits no truncation section when nothing was dropped', () => {
    const { data, indexElements } = fixtureData();
    const r = renderSkeletonMap(data, { tokenBudget: 8000, indexElements });
    expect(r.omittedFiles).toBe(0);
    expect(r.text).not.toContain('## truncation');
  });

  it('caps symbol lists per file and declares the cap', () => {
    const many: SkeletonElement[] = [];
    for (let i = 0; i < 12; i++) {
      many.push({ name: `sym${String(i).padStart(2, '0')}`, type: 'function', file: 'src/big.ts', line: i + 1, exported: true, parameters: [] });
    }
    const data = makeData([makeNode('src/big.ts'), makeNode('src/user.ts')], [makeEdge('src/user.ts', 'src/big.ts')]);
    const r = renderSkeletonMap(data, { tokenBudget: 4000, maxSymbolsPerFile: 8, indexElements: many });
    expect(r.text).toContain('fn sym07()');
    expect(r.text).not.toContain('sym08');
    expect(r.text).toMatch(/symbol lists capped at 8 exported symbols \(1 files affected\)/);
  });

  it('degrades gracefully without index elements: exported names from MapData, declared', () => {
    const { data } = fixtureData();
    const r = renderSkeletonMap(data, { tokenBudget: 4000 });
    expect(r.text).toContain('exports: hub_fn');
    expect(r.text).not.toContain('(input, options)');
    expect(r.warnings.some(w => w.includes('signature detail unavailable'))).toBe(true);
    expect(r.text).toContain('signature detail unavailable');
  });

  it('handles an empty graph without throwing', () => {
    const r = renderSkeletonMap(makeData([], []), { tokenBudget: 1600 });
    expect(r.text).toContain('(empty graph — no files to map)');
    expect(r.includedFiles).toBe(0);
    expect(r.omittedFiles).toBe(0);
  });

  it('always emits the header even when the budget is below fixed overhead', () => {
    const { data, indexElements } = fixtureData();
    const r = renderSkeletonMap(data, { tokenBudget: 10, indexElements });
    expect(r.text).toContain('# repo map (skeleton): fixture');
    expect(r.warnings.some(w => w.includes('below fixed overhead'))).toBe(true);
  });
});

describe('emitSkeleton (shared CLI/MCP wrapper)', () => {
  let tmpRoot: string;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-skeleton-'));
    const coderefDir = path.join(tmpRoot, '.coderef');
    fs.mkdirSync(coderefDir, { recursive: true });
    fs.writeFileSync(
      path.join(coderefDir, 'graph.json'),
      JSON.stringify({
        version: '1.0.0',
        nodes: [
          { id: '@Fn/src/a.ts#alpha:1', type: 'function', name: 'alpha', file: 'src/a.ts', line: 1 },
          { id: '@Fn/src/b.ts#beta:1', type: 'function', name: 'beta', file: 'src/b.ts', line: 1 },
        ],
        edges: [
          { id: 'e1', sourceId: '@Fn/src/b.ts#beta:1', targetId: '@Fn/src/a.ts#alpha:1', relationship: 'call', resolutionStatus: 'resolved' },
        ],
      }),
      'utf-8',
    );
    fs.writeFileSync(
      path.join(coderefDir, 'index.json'),
      JSON.stringify({
        elements: [
          { type: 'function', name: 'alpha', file: 'src/a.ts', line: 1, exported: true, parameters: ['x'], async: true },
          { type: 'function', name: 'beta', file: 'src/b.ts', line: 1, exported: true, parameters: [] },
        ],
      }),
      'utf-8',
    );
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('writes skeleton.md into the map out dir with index-derived signatures', () => {
    const data = projectMapData(tmpRoot);
    const result = emitSkeleton(tmpRoot, data);
    expect(fs.existsSync(result.skeletonPath)).toBe(true);
    expect(result.skeletonPath.replace(/\\/g, '/')).toContain('.coderef/map/skeleton.md');
    const onDisk = fs.readFileSync(result.skeletonPath, 'utf-8');
    expect(onDisk).toBe(result.text);
    expect(onDisk).toContain('async fn alpha(x)');
    expect(onDisk).toContain('fn beta()');
    // a.ts has the dependent — it ranks first
    expect(includedFileIds(onDisk)[0]).toBe('src/a.ts');
  });

  it('degrades to names-only when index.json is absent (headerless-repo path)', () => {
    fs.rmSync(path.join(tmpRoot, '.coderef', 'index.json'));
    const data = projectMapData(tmpRoot); // element detail now derived from graph nodes
    const result = emitSkeleton(tmpRoot, data);
    expect(result.warnings.some(w => w.includes('signature detail unavailable'))).toBe(true);
    expect(result.text).not.toContain('alpha(x)');
  });
});

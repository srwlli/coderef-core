/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability map-layer-drift-tests
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { computeLayerDrift, LayersSpec } from '../../src/map/layer-drift.js';
import { projectMapData } from '../../src/map/project-map-data.js';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Hermetic fixture: 8 files across 5 declared layers + 1 undeclared, in 3
 * detected communities with known dominant layers and outliers.
 */
const NODES = [
  { id: 'src/a.ts', layer: 'service' },
  { id: 'src/b.ts', layer: 'service' },
  { id: 'src/c.ts', layer: 'utility' },
  { id: 'src/cli/run.ts', layer: 'cli' },
  { id: 'src/api/routes.ts', layer: 'api' },
  { id: 'src/util/pure.ts', layer: 'utility' },
  { id: 'src/mystery.ts', layer: 'wizardry' },
  { id: 'src/plain.ts' },
];

const EDGES = [
  { source: 'src/a.ts', target: 'src/b.ts', weight: 2 },
  { source: 'src/b.ts', target: 'src/c.ts', weight: 1 },
  { source: 'src/cli/run.ts', target: 'src/api/routes.ts', weight: 1 },
  { source: 'src/util/pure.ts', target: 'src/a.ts', weight: 1 },
  { source: 'src/mystery.ts', target: 'src/a.ts', weight: 1 },
  { source: 'src/plain.ts', target: 'src/a.ts', weight: 1 },
];

const ASSIGNMENTS: Record<string, number> = {
  'src/a.ts': 0,
  'src/b.ts': 0,
  'src/c.ts': 0,
  'src/plain.ts': 0,
  'src/cli/run.ts': 1,
  'src/api/routes.ts': 1,
  'src/util/pure.ts': 2,
  'src/mystery.ts': 2,
};

const SPEC: LayersSpec = {
  layerIds: ['api', 'cli', 'domain', 'service', 'utility'],
  entryLayers: ['cli', 'api', 'ui_component'],
  leafLayers: ['utility', 'domain'],
};

describe('computeLayerDrift — hermetic fixture', () => {
  it('computes coverage, layer matrix, community composition, and outliers exactly', () => {
    const drift = computeLayerDrift(NODES, EDGES, ASSIGNMENTS);

    expect(drift.coverage).toEqual({
      declaredFileCount: 7,
      undeclaredFileCount: 1,
      undeclared: ['src/plain.ts'],
      undeclaredTruncated: false,
      byLayer: { api: 1, cli: 1, service: 2, utility: 2, wizardry: 1 },
    });

    expect(drift.layerMatrix).toEqual([
      { sourceLayer: 'cli', targetLayer: 'api', edgeCount: 1, weight: 1 },
      { sourceLayer: 'service', targetLayer: 'service', edgeCount: 1, weight: 2 },
      { sourceLayer: 'service', targetLayer: 'utility', edgeCount: 1, weight: 1 },
      { sourceLayer: 'utility', targetLayer: 'service', edgeCount: 1, weight: 1 },
      { sourceLayer: 'wizardry', targetLayer: 'service', edgeCount: 1, weight: 1 },
    ]);

    expect(drift.communities).toEqual([
      { id: 0, size: 4, layeredSize: 3, layers: { service: 2, utility: 1 }, dominantLayer: 'service', purity: 0.667 },
      { id: 1, size: 2, layeredSize: 2, layers: { api: 1, cli: 1 }, dominantLayer: 'api', purity: 0.5 },
      { id: 2, size: 2, layeredSize: 2, layers: { utility: 1, wizardry: 1 }, dominantLayer: 'utility', purity: 0.5 },
    ]);
    expect(drift.communitiesTruncated).toBe(false);

    expect(drift.outliers).toEqual([
      { file: 'src/c.ts', layer: 'utility', communityId: 0, dominantLayer: 'service' },
      { file: 'src/cli/run.ts', layer: 'cli', communityId: 1, dominantLayer: 'api' },
      { file: 'src/mystery.ts', layer: 'wizardry', communityId: 2, dominantLayer: 'utility' },
    ]);
    expect(drift.outliersTruncated).toBe(false);

    // No spec supplied — the optional sections are absent, not empty.
    expect(drift.vocabulary).toBeUndefined();
    expect(drift.invariantSurfaces).toBeUndefined();
    expect(drift.warnings).toEqual([]);
    expect(drift.note).toContain('not verdicts');
  });

  it('surfaces vocabulary and entry/leaf observations when a layers spec is supplied', () => {
    const drift = computeLayerDrift(NODES, EDGES, ASSIGNMENTS, SPEC);

    expect(drift.vocabulary).toEqual({
      unknownLayers: { wizardry: 1 },
      unusedLayers: ['domain'],
    });

    expect(drift.invariantSurfaces!.entryPeerEdges).toEqual({
      edgeCount: 1,
      weight: 1,
      pairs: ['cli->api'],
    });
    expect(drift.invariantSurfaces!.leafOutboundEdges).toEqual({
      edgeCount: 1,
      weight: 1,
      files: ['src/util/pure.ts'],
    });
    expect(drift.invariantSurfaces!.note).toContain('not verdicts');
  });

  it('degrades to a coverage-only note when no file declares a layer', () => {
    const bare = NODES.map(n => ({ id: n.id }));
    const drift = computeLayerDrift(bare, EDGES, undefined);
    expect(drift.coverage.declaredFileCount).toBe(0);
    expect(drift.coverage.undeclaredFileCount).toBe(NODES.length);
    expect(drift.layerMatrix).toEqual([]);
    expect(drift.communities).toEqual([]);
    expect(drift.outliers).toEqual([]);
    expect(drift.warnings).toEqual([]);
    expect(drift.note).toBe(
      'no declared layers found; drift comparison requires @layer semantic headers or a layers spec',
    );
  });

  it('skips the community comparison with a warning when assignments are absent (analytics off)', () => {
    const drift = computeLayerDrift(NODES, EDGES, undefined);
    expect(drift.communities).toEqual([]);
    expect(drift.outliers).toEqual([]);
    // Coverage and the layer matrix still compute from headers alone.
    expect(drift.coverage.declaredFileCount).toBe(7);
    expect(drift.layerMatrix.length).toBe(5);
    expect(drift.warnings).toEqual([
      'layer drift: analytics disabled; community comparison skipped',
    ]);
  });

  it('caps every list with an exact truncation warning', () => {
    const drift = computeLayerDrift(NODES, EDGES, ASSIGNMENTS, SPEC, {
      undeclaredCap: 0,
      communityCap: 1,
      outlierCap: 2,
      surfaceSampleCap: 0,
    });
    expect(drift.coverage.undeclared).toEqual([]);
    expect(drift.coverage.undeclaredTruncated).toBe(true);
    expect(drift.communities.length).toBe(1);
    expect(drift.communitiesTruncated).toBe(true);
    expect(drift.outliers.length).toBe(2);
    expect(drift.outliersTruncated).toBe(true);
    expect(drift.invariantSurfaces!.entryPeerEdges.pairs).toEqual([]);
    expect(drift.invariantSurfaces!.leafOutboundEdges.files).toEqual([]);
    expect(drift.warnings).toEqual([
      'layer drift: undeclared files truncated to 0 of 1 (undeclaredCap)',
      'layer drift: community composition truncated to 1 of 3 (communityCap)',
      'layer drift: outliers truncated to 2 of 3 (outlierCap)',
      'layer drift: entry-peer pairs truncated to 0 of 1 (surfaceSampleCap)',
      'layer drift: leaf-outbound files truncated to 0 of 1 (surfaceSampleCap)',
    ]);
  });

  it('is deterministic under reversed input order (incl. key-sorted Records)', () => {
    const forward = computeLayerDrift(NODES, EDGES, ASSIGNMENTS, SPEC);
    const reversed = computeLayerDrift(
      NODES.slice().reverse(),
      EDGES.slice().reverse(),
      ASSIGNMENTS,
      { ...SPEC, layerIds: SPEC.layerIds.slice().reverse() },
    );
    expect(JSON.stringify(reversed)).toBe(JSON.stringify(forward));
  });

  it('handles empty inputs', () => {
    const drift = computeLayerDrift([], [], undefined);
    expect(drift.coverage.declaredFileCount).toBe(0);
    expect(drift.coverage.undeclaredFileCount).toBe(0);
    expect(drift.layerMatrix).toEqual([]);
    expect(drift.warnings).toEqual([]);
  });
});

describe('layer drift — real-repo smoke (coderef-core, tmp copy)', () => {
  const graphPath = path.join(REPO_ROOT, '.coderef', 'graph.json');
  const hasArtifacts = fs.existsSync(graphPath);

  it.skipIf(!hasArtifacts)('projects this repo with a consistent drift block', () => {
    // tmp copy — never the live artifact tree (other suites regenerate it mid-run).
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-drift-smoke-'));
    try {
      const coderefDir = path.join(tmp, '.coderef');
      fs.mkdirSync(coderefDir, { recursive: true });
      fs.copyFileSync(graphPath, path.join(coderefDir, 'graph.json'));
      const indexPath = path.join(REPO_ROOT, '.coderef', 'index.json');
      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, path.join(coderefDir, 'index.json'));
      }

      const data = projectMapData(tmp);
      expect(data.drift).toBeDefined();
      const drift = data.drift!;
      // Coverage partitions the node set exactly.
      expect(drift.coverage.declaredFileCount + drift.coverage.undeclaredFileCount).toBe(
        data.nodes.length,
      );
      expect(drift.coverage.declaredFileCount).toBeGreaterThan(0);
      // Matrix weights only count edges with both endpoints declared.
      const totalWeight = data.edges.reduce((s, e) => s + e.weight, 0);
      const matrixWeight = drift.layerMatrix.reduce((s, m) => s + m.weight, 0);
      expect(matrixWeight).toBeGreaterThan(0);
      expect(matrixWeight).toBeLessThanOrEqual(totalWeight);
      // Every outlier genuinely differs from its community's dominant layer.
      for (const o of drift.outliers) {
        expect(o.layer).not.toBe(o.dominantLayer);
      }
      // Communities report layered members only and honest purity bounds.
      for (const c of drift.communities) {
        expect(c.layeredSize).toBeGreaterThan(0);
        expect(c.layeredSize).toBeLessThanOrEqual(c.size);
        expect(c.purity).toBeGreaterThan(0);
        expect(c.purity).toBeLessThanOrEqual(1);
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

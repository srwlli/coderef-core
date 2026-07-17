/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability map-viewer-asset-tests
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

const ASSET_DIR = path.resolve(__dirname, '..', '..', 'assets', 'map-viewer');

const html = fs.readFileSync(path.join(ASSET_DIR, 'graph.html'), 'utf-8');
const js = fs.readFileSync(path.join(ASSET_DIR, 'viewer.js'), 'utf-8');
const css = fs.readFileSync(path.join(ASSET_DIR, 'viewer.css'), 'utf-8');

describe('map-viewer static asset', () => {
  it('graph.html carries the data placeholder for static-mode substitution', () => {
    expect(html).toContain('window.__CODEREF_MAP_DATA__');
    // The exact token the CLI replaces (comment marker + null)
    expect(html).toContain('/*__CODEREF_MAP_DATA__*/null');
  });

  it('graph.html exposes the required UI hooks', () => {
    for (const id of [
      'search-input',
      'detail-panel',
      'toggle-hotspots',
      'toggle-cycles',
      'toggle-communities',
      'toggle-deadcode',
      'toggle-drift',
      'toggle-metrics',
      'metric-select',
      'metrics-legend',
      'toggle-blast',
      'drift-legend',
      'reset-view',
      'graph-canvas',
    ]) {
      expect(html, `missing #${id}`).toContain(`id="${id}"`);
    }
  });

  it('graph.html references only adjacent assets', () => {
    expect(html).toContain('href="./viewer.css"');
    expect(html).toContain('src="./viewer.js"');
  });

  it('viewer.js parses as a valid script', () => {
    // vm.Script parses without executing — a syntax error throws here.
    expect(() => new vm.Script(js, { filename: 'viewer.js' })).not.toThrow();
  });

  it('viewer.js supports both data modes (inline placeholder + serve fetch)', () => {
    expect(js).toContain('window.__CODEREF_MAP_DATA__');
    expect(js).toContain("fetch('./data.json')");
  });

  it('viewer renders per-edge evidence with a pre-1.2 graceful path (P2)', () => {
    // Expander only when the edge carries an evidence block.
    expect(js).toContain('link.edge && link.edge.evidence');
    expect(js).toContain('buildEvidenceBox');
    expect(js).toContain('evidence-toggle');
    expect(js).toContain('ambiguous');
    // Styles ship with the bundle.
    expect(css).toContain('.edge-evidence');
    expect(css).toContain('.evidence-toggle');
  });

  it('viewer renders the layer-drift overlay with a pre-1.3 graceful path (P3)', () => {
    // Overlay only when the data.json carries a drift block.
    expect(js).toContain('data.drift || null');
    expect(js).toContain('buildDriftLegend');
    expect(js).toContain('outlierOf');
    expect(js).toContain("exclusiveToggle('drift')");
    // Detail-panel drift row + graceful disable on pre-1.3 data.
    expect(js).toContain("addRow(meta, 'Drift'");
    expect(js).toContain('no drift block in this data.json');
    // Styles ship with the bundle.
    expect(css).toContain('#drift-legend');
    expect(css).toContain('.drift-chip');
    expect(css).toContain('.drift-ring');
  });

  it('viewer renders the metrics overlay with a pre-1.4 graceful path (P4)', () => {
    // Overlay only when the data.json carries a metrics block.
    expect(js).toContain('data.metrics || null');
    expect(js).toContain('buildMetricsLegend');
    expect(js).toContain('computeMetricRange');
    expect(js).toContain('metricValue');
    expect(js).toContain("exclusiveToggle('metrics')");
    // Five metric families feed the select control.
    for (const key of ['tests', 'docs', 'unresolved', 'size', 'deps']) {
      expect(js, `missing metric family '${key}'`).toContain(`'${key}'`);
    }
    for (const value of ['tests', 'docs', 'unresolved', 'size', 'deps']) {
      expect(html, `missing option value="${value}"`).toContain(`value="${value}"`);
    }
    // Detail-panel metrics row + graceful disable on pre-1.4 data.
    expect(js).toContain("addRow(meta, 'Metrics'");
    expect(js).toContain('no metrics block in this data.json');
    // Styles ship with the bundle.
    expect(css).toContain('#metrics-legend');
    expect(css).toContain('.metric-gradient');
    expect(css).toContain('#metric-select');
  });

  it('asset bundle makes no external network references (CDN ban)', () => {
    const external = /https?:\/\//i;
    expect(external.test(html)).toBe(false);
    expect(external.test(js)).toBe(false);
    expect(external.test(css)).toBe(false);
  });
});

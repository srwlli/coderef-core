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
const tokensCss = fs.readFileSync(path.join(ASSET_DIR, 'tokens.css'), 'utf-8');

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
      'toggle-api',
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

  it('viewer renders the API overlay with a pre-1.7 graceful path (P1-T4/T5/T6)', () => {
    // Overlay only when the data.json carries an api block, guarded the same
    // way every other schema-additive block is.
    expect(js).toContain('data.api || null');
    expect(js).toContain('apiEdgeKeys');
    expect(js).toContain('apiNetEdges');
    expect(js).toContain("exclusiveToggle('api')");
    // The absent-block message must say UNKNOWN, not "no endpoints" — this is
    // the tri-state's top branch and the two must never collapse.
    expect(js).toContain('API surface UNKNOWN');
    expect(js).toContain('NOT zero endpoints');
  });

  it('the api toggle is registered in the exclusiveToggle sibling-clear list', () => {
    // Omitting 'api' here leaves the overlay stuck ON when another toggle is
    // pressed — the overlays are meant to be mutually exclusive, and a stuck
    // overlay silently composites two encodings on top of each other.
    const sibling = /\['hotspots',\s*'cycles',\s*'communities',\s*'deadcode',\s*'drift',\s*'metrics',\s*'blast',\s*'api'\]/;
    expect(sibling.test(js), 'api missing from the exclusiveToggle sibling list').toBe(true);
    // And it must be re-synced like every other toggle, or the button's active
    // state drifts from `mode`.
    expect(js).toContain("setToggle(document.getElementById('toggle-api'), mode.api)");
  });

  it('network hops are DASHED and drawn from their own list, never as module edges', () => {
    // The dash is semantic: an HTTP hop and an import are different kinds of
    // coupling and must not share a stroke style.
    expect(js).toContain('ctx.setLineDash');
    // Drawn from api.networkEdges, NOT by filtering `edges` — an HTTP hop
    // frequently has no import edge at all, so re-styling module edges would
    // draw nothing for exactly the hops worth seeing.
    expect(js).toMatch(/apiNetEdges\[i\]/);
    // The dash pattern is restored, or every stroke drawn afterwards inherits it.
    expect(js).toContain('ctx.restore()');
  });

  it('the API hue comes from a CSS token, not a 24th hardcoded hex', () => {
    // OBS-001 on the token workorder flagged viewer.js's hardcoded canvas hues
    // as a standing defect; this overlay must not add to the pile.
    expect(js).toContain("cssToken('--data-api-edge'");
    expect(tokensCss).toContain('--data-api-edge');
  });

  it('the detail panel labels SERVES and CALLS as separate facts', () => {
    // One file can do both, and the direction is the only thing distinguishing
    // a handler from a client — merging them would lose it.
    expect(js).toContain("addRow(meta, 'Serves'");
    expect(js).toContain("addRow(meta, 'Calls over HTTP'");
  });

  it('asset bundle makes no external network references (CDN ban)', () => {
    const external = /https?:\/\//i;
    expect(external.test(html)).toBe(false);
    expect(external.test(js)).toBe(false);
    expect(external.test(css)).toBe(false);
  });
});

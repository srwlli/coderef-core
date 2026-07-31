/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability map-dashboard-asset-tests
 */

/**
 * Contract tests for the dashboard render
 * (WO-WIRE-THE-MAPDATA-DASHBOARD-INTO-CODEREF-MAP-AND-001 P1).
 *
 * Two halves:
 *   1. ASSET shape — dashboard.html/.js/.css are PREBUILT and carry both
 *      placeholder tokens. Core analysis code never generates HTML; if that
 *      rule is ever broken, the placeholder assertions here fail first.
 *   2. EMISSION behaviour — emitViewer substitutes both tokens, and an absent
 *      or malformed validation report is DISCLOSED as no-data rather than
 *      rendered as a clean bill of health. That last case is the one that
 *      matters: a missing measurement must never read as a healthy one.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vm from 'vm';
import {
  emitViewer,
  readValidationReport,
  MAP_DATA_PLACEHOLDER,
  VALIDATION_PLACEHOLDER,
} from '../../src/map/emit-map.js';

const ASSET_DIR = path.resolve(__dirname, '..', '..', 'assets', 'map-viewer');

const html = fs.readFileSync(path.join(ASSET_DIR, 'dashboard.html'), 'utf-8');
const js = fs.readFileSync(path.join(ASSET_DIR, 'dashboard.js'), 'utf-8');
const css = fs.readFileSync(path.join(ASSET_DIR, 'dashboard.css'), 'utf-8');

/** Minimal MapData-shaped payload; only what the dashboard reads. */
const DATA = JSON.stringify({
  meta: {
    schemaVersion: '1.6.0',
    repoName: 'fixture-repo',
    generatedAt: '2026-07-31T00:00:00.000Z',
    source: { nodeCount: 3, edgeCount: 4, resolvedEdgeCount: 2, elementCount: 5 },
    warnings: ['ranking truncated to 25 of 382'],
  },
  nodes: [], edges: [],
  analytics: {}, metrics: {}, drift: {}, overlays: { hotspots: [], cycles: [] },
});

function emitTo(validation: string | null): { dir: string; dash: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-dash-'));
  emitViewer(dir, DATA, validation);
  return { dir, dash: fs.readFileSync(path.join(dir, 'dashboard.html'), 'utf-8') };
}

describe('map-dashboard static asset', () => {
  it('dashboard.html carries BOTH placeholder tokens for static substitution', () => {
    expect(html).toContain(MAP_DATA_PLACEHOLDER);
    expect(html).toContain(VALIDATION_PLACEHOLDER);
    expect(html).toContain('window.__CODEREF_MAP_DATA__');
    expect(html).toContain('window.__CODEREF_VALIDATION__');
  });

  it('dashboard.html references only adjacent sibling assets', () => {
    expect(html).toContain('href="./dashboard.css"');
    expect(html).toContain('src="./dashboard.js"');
    // The graph link is a ONE-hop sibling: this is what removed the old
    // five-level relative path that broke silently whenever the file moved.
    expect(html).toContain('href="./graph.html"');
    expect(html).not.toMatch(/\.\.\/\.\./);
  });

  it('dashboard.js parses as a valid script', () => {
    expect(() => new vm.Script(js, { filename: 'dashboard.js' })).not.toThrow();
  });

  it('asset bundle makes no external network references (CDN ban)', () => {
    const external = /https?:\/\//i;
    expect(external.test(html)).toBe(false);
    expect(external.test(js)).toBe(false);
    expect(external.test(css)).toBe(false);
  });

  it('dashboard.js encodes the tri-state contract, not a two-state one', () => {
    expect(js).toContain('no data');
    expect(js).toContain('tri--nodata');
    expect(js).toContain('tri--absent');
    expect(js).toContain('tri--fact');
    // Truncation is disclosed as its own badge.
    expect(js).toContain('truncBadge');
    expect(js).toContain('Ranking truncated');
  });
});

/**
 * Renders dashboard.js against a payload and returns the HTML each mount point
 * received. There is no DOM environment in this suite (no jsdom/happy-dom, and
 * adding one for a 300-line static asset is not worth the dependency), so the
 * script runs under `vm` against a stub exposing only what it touches:
 * getElementById, textContent/innerHTML, document.title, and an absent `fetch`
 * so the static path is taken.
 *
 * This is what makes the assertions below CONTRACT tests rather than substring
 * greps over the source — they read what the renderer actually produced.
 */
function renderDashboard(data: unknown, validation: unknown = null): Record<string, string> {
  const sinks: Record<string, string> = {};
  const el = (id: string) => ({
    set innerHTML(v: string) { sinks[id] = (sinks[id] ?? '') + v; },
    get innerHTML() { return sinks[id] ?? ''; },
    set textContent(v: string) { sinks[id] = v; },
    get textContent() { return sinks[id] ?? ''; },
    set hidden(v: boolean) { sinks[id + ':hidden'] = String(v); },
  });
  const cache: Record<string, ReturnType<typeof el>> = {};
  const sandbox = {
    window: { __CODEREF_MAP_DATA__: data, __CODEREF_VALIDATION__: validation },
    document: {
      title: '',
      getElementById: (id: string) => (cache[id] ??= el(id)),
    },
    location: { protocol: 'file:' },
  };
  vm.createContext(sandbox);
  new vm.Script(js, { filename: 'dashboard.js' }).runInContext(sandbox);
  return sinks;
}

/** Everything the renderer emitted, concatenated — for whole-output assertions. */
const allOutput = (sinks: Record<string, string>) => Object.values(sinks).join('\n');

describe('dashboard disclosure contract (WO-RENDER-THE-UNRENDERED-MAPDATA-BLOCKS P1)', () => {
  it('surfaces warnings from ALL FOUR emitting blocks, not just meta', () => {
    const out = allOutput(renderDashboard({
      meta: { warnings: ['meta-cap-alpha'], source: {} },
      analytics: { warnings: ['analytics-cap-bravo'] },
      metrics: { warnings: ['metrics-cap-charlie'] },
      drift: { warnings: ['drift-cap-delta'] },
      overlays: {},
    }));
    // The defect this replaces: only meta.warnings reached the panel, so a cap
    // disclosed by analytics/metrics/drift was dropped on the floor.
    expect(out).toContain('meta-cap-alpha');
    expect(out).toContain('analytics-cap-bravo');
    expect(out).toContain('metrics-cap-charlie');
    expect(out).toContain('drift-cap-delta');
    expect(out).toContain('disclosures (4)');
  });

  it('labels each disclosure with its origin block', () => {
    const out = allOutput(renderDashboard({
      meta: { warnings: ['w'], source: {} },
      analytics: { warnings: ['w'] },
      metrics: {}, drift: {}, overlays: {},
    }));
    expect(out).toContain('disclose__origin');
    // Same text from two blocks is NOT deduped — independent disclosure of the
    // same cap is real signal, and collapsing it under-reports.
    expect(out).toContain('disclosures (2)');
  });

  it('renders remaining blocks when a warnings array is absent entirely', () => {
    // An older or partial bundle omitting a block contributes zero entries.
    const out = allOutput(renderDashboard({
      meta: { warnings: ['only-one'], source: {} },
      overlays: {},
    }));
    expect(out).toContain('only-one');
    expect(out).toContain('disclosures (1)');
  });

  it('omits the disclosure panel when no block emits a warning', () => {
    const out = allOutput(renderDashboard({ meta: { source: {} }, overlays: {} }));
    expect(out).not.toContain('disclosures (');
  });

  it('BADGES a capped community emission so the total never reads as complete', () => {
    const out = allOutput(renderDashboard({
      meta: { source: {} },
      analytics: { communityCount: 135, communities: new Array(50).fill({}) },
      overlays: {},
    }));
    // 135 over "50 emitted" with no badge was the live defect.
    expect(out).toContain('showing 50 of 135');
  });

  it('does NOT badge an uncapped emission', () => {
    const out = allOutput(renderDashboard({
      meta: { source: {} },
      analytics: { communityCount: 12, communities: new Array(12).fill({}) },
      overlays: {},
    }));
    expect(out).not.toContain('showing 12 of 12');
  });

  it('badges a renderer-imposed slice, not only bundle-level truncation', () => {
    // The panel draws 8 rows; a 25-row bundle is truncated BY THE RENDERER.
    const rows = Array.from({ length: 25 }, (_, i) => ({
      file: `src/f${i}.ts`, degree: i, inDegree: i, outDegree: 0, betweenness: i,
    }));
    const out = allOutput(renderDashboard({
      meta: { source: {} },
      analytics: { centrality: { top: rows } },
      overlays: {},
    }));
    expect(out).toContain('showing 8 of 25');
  });
});

describe('emitViewer dashboard emission', () => {
  it('emits dashboard.html plus its sibling assets alongside the graph', () => {
    const { dir } = emitTo(null);
    for (const f of ['dashboard.html', 'dashboard.js', 'dashboard.css', 'graph.html', 'data.json']) {
      expect(fs.existsSync(path.join(dir, f)), `missing ${f}`).toBe(true);
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('substitutes the map-data token — no residual placeholder survives', () => {
    const { dir, dash } = emitTo(null);
    expect(dash).not.toContain(MAP_DATA_PLACEHOLDER);
    expect(dash).toContain('fixture-repo');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('inlines the validation report when one is supplied', () => {
    const { dir, dash } = emitTo(JSON.stringify({ resolution_rate: 23.2, header_coverage_pct: 100 }));
    expect(dash).not.toContain(VALIDATION_PLACEHOLDER);
    expect(dash).toContain('23.2');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('DISCLOSES an absent validation report as no-data, never as clean', () => {
    const { dir, dash } = emitTo(null);
    // The token is replaced by a literal null — the renderer turns that into an
    // explicit no-data band. What must NOT happen is a surviving placeholder
    // or a fabricated zero standing in for an unmeasured value.
    expect(dash).not.toContain(VALIDATION_PLACEHOLDER);
    expect(dash).toContain('window.__CODEREF_VALIDATION__ = null');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('escapes embedded JSON so a payload cannot break out of the script block', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-dash-esc-'));
    emitViewer(dir, JSON.stringify({ meta: { repoName: '</script><script>x' } }), null);
    const dash = fs.readFileSync(path.join(dir, 'dashboard.html'), 'utf-8');
    expect(dash).not.toContain('</script><script>x');
    expect(dash).toContain('\\u003c');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('readValidationReport', () => {
  it('returns null for an absent report rather than throwing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-val-'));
    expect(readValidationReport(dir)).toBeNull();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('returns null for a MALFORMED report — unparseable is no-data, not clean', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-val-bad-'));
    fs.mkdirSync(path.join(dir, '.coderef'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.coderef', 'validation-report.json'), '{ not json', 'utf-8');
    expect(readValidationReport(dir)).toBeNull();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('returns the raw JSON text for a well-formed report', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-val-ok-'));
    fs.mkdirSync(path.join(dir, '.coderef'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.coderef', 'validation-report.json'),
      '{"resolution_rate":23.2}', 'utf-8');
    expect(readValidationReport(dir)).toContain('23.2');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

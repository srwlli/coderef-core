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

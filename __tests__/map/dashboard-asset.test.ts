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
const tokensCss = fs.readFileSync(path.join(ASSET_DIR, 'tokens.css'), 'utf-8');
const viewerCss = fs.readFileSync(path.join(ASSET_DIR, 'viewer.css'), 'utf-8');
const graphHtml = fs.readFileSync(path.join(ASSET_DIR, 'graph.html'), 'utf-8');

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

describe('dashboard renders the blocks that already ship (P2)', () => {
  const base = { meta: { source: {} }, analytics: {}, metrics: {}, drift: {}, overlays: {} };

  it('renders the hotspots ranking from overlays.hotspots', () => {
    const out = allOutput(renderDashboard({
      ...base,
      overlays: { hotspots: [{ file: 'src/a.ts', score: 284 }, { file: 'src/b.ts', score: 96 }] },
    }));
    expect(out).toContain('Hotspots');
    expect(out).toContain('src/a.ts');
    expect(out).toContain('284');
  });

  it('distinguishes MEASURED-ZERO cycles from absent cycle data', () => {
    // This distinction is the whole reason the panel exists: this repo drove
    // cycles 2 -> 0, and "0 measured" is a result, not an absence.
    const measured = allOutput(renderDashboard({ ...base, overlays: { cycles: [] } }));
    expect(measured).toContain('0 &mdash; measured');
    expect(measured).toContain('no cycles detected');

    const absent = allOutput(renderDashboard({ ...base, overlays: {} }));
    expect(absent).not.toContain('0 &mdash; measured');
    expect(absent).toContain('no data');
  });

  it('lists cycles when the overlay carries them', () => {
    const out = allOutput(renderDashboard({
      ...base, overlays: { cycles: [['src/a.ts', 'src/b.ts', 'src/a.ts']] },
    }));
    expect(out).toContain('src/a.ts → src/b.ts → src/a.ts');
    expect(out).not.toContain('0 &mdash; measured');
  });

  it('renders documentation coverage from metrics.documentation', () => {
    const out = allOutput(renderDashboard({
      ...base,
      metrics: {
        documentation: {
          summary: {
            totalElements: 3155, byStatus: { defined: 3143, missing: 12 },
            indexedFileCount: 361, filesWithNonDefinedCount: 2,
          },
          topNonDefined: [{ file: 'src/x.test.ts', nonDefined: 7, total: 7 }],
          topNonDefinedTruncated: false,
        },
      },
    }));
    expect(out).toContain('3,143');
    expect(out).toContain('3,155');
    expect(out).toContain('src/x.test.ts');
  });

  it('discloses absent non-defined NAMES as no-data when the count is nonzero', () => {
    // A populated count with an empty list must never read as "no such files".
    const out = allOutput(renderDashboard({
      ...base,
      metrics: {
        documentation: {
          summary: { totalElements: 10, byStatus: { defined: 8, missing: 2 }, filesWithNonDefinedCount: 2 },
          topNonDefined: [],
        },
      },
    }));
    expect(out).toContain('file names not emitted');
    expect(out).toContain('no data');
  });

  it('renders bridges from a BARE STRING array without blanking the paths', () => {
    // Guards the pathCol trap: bridges are strings, not {file} objects, so a
    // renderer reading r.file emits empty cells that look like no-data.
    const out = allOutput(renderDashboard({
      ...base, analytics: { bridges: ['__tests__/integration.test.ts', 'src/seam.ts'] },
    }));
    expect(out).toContain('__tests__/integration.test.ts');
    expect(out).toContain('src/seam.ts');
    expect(out).not.toContain('<span class="path"></span>');
  });

  it('badges a capped bridges emission from the analytics disclosure', () => {
    const out = allOutput(renderDashboard({
      ...base,
      analytics: {
        bridges: new Array(50).fill('src/f.ts'),
        warnings: ['bridges truncated to 50 of 82 (bridgeCap)'],
      },
    }));
    expect(out).toContain('Bridges');
    expect(out).toMatch(/showing 50/);
  });

  it('reports each absent block as no-data rather than omitting the panel', () => {
    const out = allOutput(renderDashboard(base));
    for (const title of ['Hotspots', 'Cycles', 'Documentation', 'Bridges']) {
      expect(out, `${title} panel missing`).toContain(title);
    }
    expect(out).toContain('no data');
  });
});

describe('names, not just counts (P3)', () => {
  const base = { meta: { source: {} }, analytics: {}, metrics: {}, drift: {}, overlays: {} };

  it('expands dead-code candidates to their file names via static <details>', () => {
    const out = allOutput(renderDashboard({
      ...base,
      analytics: { deadCode: { isolated: ['src/orphan.ts', 'src/unused.ts'], zeroInDegreeCandidates: [] } },
    }));
    expect(out).toContain('<details class="filelist">');
    expect(out).toContain('src/orphan.ts');
    expect(out).toContain('src/unused.ts');
  });

  it('expands the zero-test-edge list to names', () => {
    const out = allOutput(renderDashboard({
      ...base,
      metrics: {
        testLinkage: {
          summary: { srcFileCount: 2, srcWithTestEdgeCount: 1, srcWithoutTestEdgeCount: 1 },
          zeroTestInEdge: ['src/lonely.ts'],
          zeroTestInEdgeTruncated: false,
        },
      },
    }));
    expect(out).toContain('src/lonely.ts');
  });

  it('does NOT badge a COMPLETE list, and DOES badge a capped one', () => {
    const complete = allOutput(renderDashboard({
      ...base,
      metrics: { testLinkage: { summary: {}, zeroTestInEdge: ['a.ts'], zeroTestInEdgeTruncated: false } },
    }));
    expect(complete).not.toMatch(/showing 1 of/);

    const capped = allOutput(renderDashboard({
      ...base,
      metrics: {
        testLinkage: {
          summary: { srcWithoutTestEdgeCount: 90 },
          zeroTestInEdge: ['a.ts'], zeroTestInEdgeTruncated: true,
        },
      },
    }));
    expect(capped).toContain('showing 1 of 90');
  });

  it('renders an empty list as measured-zero and an absent one as no-data', () => {
    const empty = allOutput(renderDashboard({
      ...base, analytics: { deadCode: { isolated: [], zeroInDegreeCandidates: [] } },
    }));
    expect(empty).toContain('0 &mdash; measured');

    const absent = allOutput(renderDashboard({ ...base, analytics: { deadCode: {} } }));
    expect(absent).toContain('no data');
  });

  it('uses no framework, no fetch, and no external network for the lists', () => {
    // Native <details> only — the asset rule is no CDN, no runtime dependency.
    expect(js).toContain('<details class="filelist">');
    expect(js).not.toMatch(/https?:\/\//);
  });
});

describe('the cross-reference is a read-list, NEVER a coverage verdict', () => {
  const withBoth = {
    meta: { source: {} }, analytics: {}, drift: {},
    overlays: { hotspots: [{ file: 'src/mcp/shared.ts', score: 154 }, { file: 'src/other.ts', score: 12 }] },
    metrics: {
      testLinkage: {
        summary: {}, zeroTestInEdge: ['src/mcp/shared.ts'], zeroTestInEdgeTruncated: false,
        note: 'Zero test in-edges is an observation, not an untested verdict — transitive and integration coverage are invisible to the file graph.',
      },
    },
  };

  it('intersects the two published lists', () => {
    const out = allOutput(renderDashboard(withBoth));
    expect(out).toContain('Worth reading');
    expect(out).toContain('src/mcp/shared.ts');
    expect(out).toContain('1 of 2 ranked files');
  });

  it('never labels a file "untested" in its own framing', () => {
    // THE guard for RISK-003. Three of four real-world members of this
    // intersection are covered through a barrel import the file graph cannot
    // see; "untested" would be a false verdict shipped to every repo. The word
    // may appear ONLY inside the quoted testLinkage note, which says the
    // opposite ("not an untested verdict").
    const out = allOutput(renderDashboard(withBoth));
    const outsideNote = out.replace(/Zero test in-edges is an observation[^<]*/g, '');
    expect(outsideNote).not.toMatch(/untested/i);
  });

  it('carries the testLinkage note and the barrel caveat in-panel', () => {
    const out = allOutput(renderDashboard(withBoth));
    expect(out).toContain('not an untested verdict');
    expect(out).toContain('barrel');
    expect(out).toContain('candidate to READ');
  });

  it('reports an empty intersection as measured-zero, not as absence', () => {
    const out = allOutput(renderDashboard({
      ...withBoth,
      metrics: { testLinkage: { summary: {}, zeroTestInEdge: [], zeroTestInEdgeTruncated: false } },
    }));
    expect(out).toContain('no ranked file lacks a test edge');
  });

  it('omits the panel entirely when either input list is absent', () => {
    const out = allOutput(renderDashboard({
      meta: { source: {} }, analytics: {}, metrics: {}, drift: {}, overlays: { hotspots: [] },
    }));
    expect(out).not.toContain('Worth reading');
  });
});

describe('the explicit non-goal holds: no composite score', () => {
  it('renders no grade, health score, or single-number summary', () => {
    const out = allOutput(renderDashboard({
      meta: { source: { nodeCount: 1, edgeCount: 2 } },
      analytics: { communityCount: 3, communities: [{}], deadCode: { isolated: ['a.ts'] } },
      metrics: { testLinkage: { summary: {}, zeroTestInEdge: ['a.ts'] } },
      drift: {}, overlays: { hotspots: [{ file: 'a.ts', score: 9 }], cycles: [] },
    }));
    expect(out).not.toMatch(/health score|overall score|grade[: ]|composite/i);
  });
});

describe('no measurement ever renders as the literal string "undefined"', () => {
  it('a validation report missing a count renders no-data, not "undefined"', () => {
    // Lived case: byStatus.missing drops out of the bundle once nothing is
    // missing, and a bare nf() printed the string "undefined" on the page.
    const out = allOutput(renderDashboard(
      { meta: { source: {} }, analytics: {}, metrics: {}, drift: {}, overlays: {} },
      { header_coverage_pct: 100, header_defined_count: 365 }, // header_missing_count absent
    ));
    expect(out).toContain('no data');
    expect(out).not.toMatch(/>undefined</);
  });

  it('a ranking row missing one field renders no-data for that cell only', () => {
    const out = allOutput(renderDashboard({
      meta: { source: {} }, metrics: {}, drift: {}, overlays: {},
      analytics: { centrality: { top: [{ file: 'src/a.ts', degree: 5 }] } }, // in/out/btw absent
    }));
    expect(out).toContain('src/a.ts');
    expect(out).not.toMatch(/>undefined</);
  });

  it('the live-shaped payload renders no "undefined" anywhere', () => {
    const out = allOutput(renderDashboard({
      meta: { source: { nodeCount: 1, edgeCount: 2, resolvedEdgeCount: 1, elementCount: 3 } },
      analytics: { communityCount: 4, communities: [{}], bridges: ['a.ts'], deadCode: {} },
      metrics: {
        documentation: { summary: { totalElements: 10, byStatus: { defined: 10 } } },
        testLinkage: { summary: {} }, unresolvedRefs: { summary: {} },
      },
      drift: { coverage: {} },
      overlays: { hotspots: [{ file: 'a.ts', score: 1 }], cycles: [] },
    }));
    expect(out).not.toMatch(/>undefined</);
  });
});

describe('graph <-> dashboard navigation is bidirectional', () => {
  it('graph.html links BACK to the dashboard (not one-way)', () => {
    const graph = fs.readFileSync(path.join(ASSET_DIR, 'graph.html'), 'utf-8');
    expect(graph).toContain('href="./dashboard.html"');
    // One-hop sibling on both sides — no relative-depth assumption to break.
    expect(graph).not.toMatch(/href="\.\.\/[^"]*dashboard\.html"/);
  });

  it('dashboard.html still links to the graph', () => {
    expect(html).toContain('href="./graph.html"');
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

/* Shared UI token standard — WO-UNIFY-THE-MAP-VIEWER-UI-TOKEN-STANDARD-SO-001.
   Both emitted surfaces render from ONE palette in tokens.css. */
describe('shared token standard: tokens.css is the single source of truth', () => {
  it('both HTML surfaces link tokens.css BEFORE their own stylesheet', () => {
    // Cascade order is load-bearing: tokens must be defined before a consumer
    // reads them. A link tag (not @import) keeps the two sheets parallel-fetched.
    for (const [name, doc, consumer] of [
      ['dashboard.html', html, 'dashboard.css'],
      ['graph.html', graphHtml, 'viewer.css'],
    ] as const) {
      const tokensAt = doc.indexOf('href="./tokens.css"');
      const consumerAt = doc.indexOf(`href="./${consumer}"`);
      expect(tokensAt, `${name} must link tokens.css`).toBeGreaterThan(-1);
      expect(consumerAt, `${name} must link ${consumer}`).toBeGreaterThan(-1);
      expect(tokensAt, `${name}: tokens.css must come first`).toBeLessThan(consumerAt);
      expect(doc).not.toContain('@import');
    }
  });

  it('EMITS tokens.css into the bundle beside every asset both surfaces need', () => {
    // The one hard failure mode: emit-map.ts hardcodes its copy list, so a
    // source-only assertion would pass while every emitted bundle shipped two
    // stylesheets pointing at a file that does not exist — both surfaces
    // rendering completely unstyled. This drives the REAL emit path.
    const { dir } = emitTo(null);
    for (const f of [
      'tokens.css', 'viewer.js', 'viewer.css', 'dashboard.js', 'dashboard.css',
      'graph.html', 'dashboard.html', 'data.json',
    ]) {
      expect(fs.existsSync(path.join(dir, f)), `missing ${f} in emitted bundle`).toBe(true);
    }

    // Every stylesheet each emitted HTML references must actually EXIST in the
    // output — the assertion that would have caught a missing copyFileSync.
    for (const page of ['graph.html', 'dashboard.html']) {
      const doc = fs.readFileSync(path.join(dir, page), 'utf-8');
      const hrefs = [...doc.matchAll(/<link[^>]+href="\.\/([^"]+\.css)"/g)].map((m) => m[1]);
      expect(hrefs.length, `${page} references no stylesheet`).toBeGreaterThan(0);
      for (const href of hrefs) {
        expect(fs.existsSync(path.join(dir, href)), `${page} -> missing ${href}`).toBe(true);
      }
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('declares each palette token EXACTLY once, via light-dark()', () => {
    // Replaces the dashboard's former four-way duplication (:root +
    // prefers-color-scheme + two data-theme blocks each restating the palette).
    for (const token of ['--ground', '--ink', '--dim', '--line', '--card-bg', '--accent-ci']) {
      const declarations = tokensCss.match(new RegExp(`^\\s*${token}\\s*:`, 'gm')) ?? [];
      expect(declarations.length, `${token} must be declared once`).toBe(1);
      expect(tokensCss).toMatch(new RegExp(`${token}\\s*:\\s*light-dark\\(`));
    }
    expect(tokensCss).toContain('color-scheme: light dark');
  });

  it('keeps BOTH theme paths alive: OS preference AND the manual toggle', () => {
    // light-dark() resolves against the color-scheme PROPERTY, not against
    // re-declared colours. A naive port re-states colours under the data-theme
    // selectors, which silently does nothing: the OS path keeps working while
    // the manual toggle is dead, so a default-settings smoke test still passes.
    expect(tokensCss).toMatch(/:root\[data-theme="dark"\]\s*\{\s*color-scheme:\s*dark;?\s*\}/);
    expect(tokensCss).toMatch(/:root\[data-theme="light"\]\s*\{\s*color-scheme:\s*light;?\s*\}/);

    // The dead-toggle regression, asserted directly: a data-theme block must
    // never try to drive the theme by re-declaring a palette colour.
    const themeBlocks = tokensCss.match(/:root\[data-theme="[^"]+"\]\s*\{[^}]*\}/g) ?? [];
    expect(themeBlocks.length).toBe(2);
    for (const block of themeBlocks) {
      expect(block, 'data-theme block must not re-declare colours').not.toMatch(/--[\w-]+\s*:\s*#/);
    }
  });

  it('holds the --data-* hues OUTSIDE light-dark()', () => {
    // These encode MEANING, not chrome: a drift ring and a metrics gradient are
    // read as values, so they must be identical in both modes. Guards against a
    // future edit that "completes" the tokenization.
    for (const [token, hex] of [
      ['--data-drift-ring', '#ffb300'],
      ['--data-metric-lo', '#1e88e5'],
      ['--data-metric-hi', '#ffca28'],
    ] as const) {
      expect(tokensCss).toMatch(new RegExp(`${token}\\s*:\\s*${hex}\\s*;`));
      const decl = tokensCss.match(new RegExp(`${token}\\s*:[^;]+;`))![0];
      expect(decl, `${token} must not be theme-conditional`).not.toContain('light-dark');
    }
  });

  it('leaves NO raw colour outside tokens.css in either consumer stylesheet', () => {
    // The enforcement mechanism: this is what stops the palette re-drifting
    // back into two products. Scoped to colour-bearing declarations so a
    // non-colour hex (an escape like \25B8) does not false-positive.
    for (const [name, sheet] of [
      ['dashboard.css', css],
      ['viewer.css', viewerCss],
    ] as const) {
      expect(sheet, `${name} must declare no hex colour`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(sheet, `${name} must declare no rgb()/hsl() colour`).not.toMatch(/\b(?:rgba?|hsla?)\(/);
      // Declarations, not prose: these files may still DISCUSS the theming
      // mechanism in a comment pointing at tokens.css, but must not implement it.
      const declarations = sheet.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(declarations, `${name} must not re-declare the palette`).not.toContain('light-dark(');
      expect(declarations, `${name} must not own color-scheme`).not.toMatch(/^\s*color-scheme\s*:/m);
    }
  });

  it('maps every viewer bucket viewer.css consumes onto the shared palette', () => {
    // The bucket NAMES are the graph viewer's consumer contract. Any var() the
    // viewer reads must resolve, or that rule silently renders unstyled.
    const consumed = new Set(
      [...viewerCss.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]),
    );
    expect(consumed.size).toBeGreaterThan(15);
    for (const token of consumed) {
      expect(tokensCss, `viewer.css consumes ${token}; tokens.css must define it`)
        .toMatch(new RegExp(`^\\s*${token}\\s*:`, 'm'));
    }
  });

  it('defines every token dashboard.css consumes', () => {
    const consumed = new Set([...css.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]));
    expect(consumed.size).toBeGreaterThan(5);
    for (const token of consumed) {
      expect(tokensCss, `dashboard.css consumes ${token}; tokens.css must define it`)
        .toMatch(new RegExp(`^\\s*${token}\\s*:`, 'm'));
    }
  });

  it('adds no external reference — the bundle stays offline-only', () => {
    expect(tokensCss).not.toMatch(/https?:|\/\/[a-z]|@import|url\(/i);
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

// graphprint generator — renders a graph-first planning package from blueprint.json.
// Three styles per plan:
//   1. LAYERED  blueprint.html + per-band graph.html (+ as-is.html when a repo map exists)
//      — deliberate lane/band SVG, phases/tracks/laws, deny-by-default dep edges.
//   2. EXPLORER explorer.html — the coderef-core map-viewer style (vanilla-JS canvas
//      force-graph, assets/map-viewer bundle) fed a MapData projection of the blueprint.
//   3. MERMAID  blueprint.mmd + injection into PLAN.md between
//      <!-- graphprint:mermaid:start --> / <!-- graphprint:mermaid:end --> markers.
// Self-contained by design: this file is COPIED into <planning-folder>/tools/ so the
// folder regenerates standalone (node tools/gen.mjs). No deps, no network.
// Refuses to render a blueprint whose dep edges contain a cycle (law L9-style gate).

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, resolve, join, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
  const i = a.indexOf('='); return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)];
}));
if (argv.help || argv.h) {
  console.log('graphprint gen — renders blueprint.json into layered + explorer + mermaid graphs.\n'
    + 'usage: node gen.mjs [--blueprint=path/to/blueprint.json]\n'
    + 'Outputs land beside the blueprint. See the graphprint SKILL.md for the blueprint contract.');
  process.exit(0);
}
const BP_PATH = resolve(argv.blueprint || join(HERE, '..', 'blueprint.json'));
const FOLDER = dirname(BP_PATH);
const bp = JSON.parse(readFileSync(BP_PATH, 'utf8'));
const meta = bp.meta || {};
const REPO = meta.repo_root ? (isAbsolute(meta.repo_root) ? meta.repo_root : resolve(FOLDER, meta.repo_root)) : null;

const bandById = Object.fromEntries(bp.bands.map(b => [b.id, b]));
const problemById = Object.fromEntries((bp.problems || []).map(p => [p.id, p.title]));
const nodesByBand = id => bp.nodes.filter(n => n.band === id);

// ---------------------------------------------------------------- L9 gate: dep edges must be acyclic
{
  const adj = new Map();
  bp.edges.filter(e => e.kind === 'dep').forEach(e => {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from).push(e.to);
  });
  const state = new Map(), stack = [];
  function dfs(v) {
    state.set(v, 1); stack.push(v);
    for (const w of adj.get(v) || []) {
      if (state.get(w) === 1) { const i = stack.indexOf(w); throw new Error('blueprint dep cycle: ' + stack.slice(i).concat(w).join(' -> ')); }
      if (!state.get(w)) dfs(w);
    }
    state.set(v, 2); stack.pop();
  }
  try { for (const v of adj.keys()) if (!state.get(v)) dfs(v); }
  catch (e) {
    if (meta.allow_cycles) { console.warn('[warn] ' + e.message + ' (meta.allow_cycles is set — rendering anyway; reference graphs may cycle legitimately)'); }
    else { console.error('[FAIL] ' + e.message + '\nA blueprint that violates its own acyclicity law does not render.'); process.exit(1); }
  }
}

// ---------------------------------------------------------------- generic layered layout
// bands render in array order: kind 'column' left->right, then one 'ghost' lane,
// then kind 'strip' bands stacked full-width below. node.subcol pins a node to a
// sub-column; otherwise nodes fill sub-columns sequentially.
function layoutViews(viewNodes, bands, dims) {
  const NW = dims.nw, NH = dims.nh, ROW = NH + 16, TOP = 72;
  const pos = {}, lanes = [];
  const memberOf = b => viewNodes.filter(n => n.band === b.id);
  const cols = bands.filter(b => (!b.layout || b.layout.kind === 'column') && memberOf(b).length);
  const ghost = bands.filter(b => b.layout && b.layout.kind === 'ghost' && memberOf(b).length);
  const strips = bands.filter(b => b.layout && b.layout.kind === 'strip' && memberOf(b).length);
  let x = 52, colBottom = 0;
  for (const b of cols) {
    const mem = memberOf(b);
    const subcols = (b.layout && b.layout.subcols) || (mem.length > 7 ? 2 : 1);
    const per = Math.ceil(mem.length / subcols);
    const rows = new Array(subcols).fill(0);
    mem.forEach((n, i) => {
      const c = (n.subcol !== undefined && n.subcol < subcols) ? n.subcol : Math.floor(i / per);
      const r = rows[c]++;
      pos[n.id] = { x: x + 18 + c * (NW + 26), y: TOP + 40 + r * ROW, w: NW, h: NH };
    });
    const laneW = subcols * NW + (subcols - 1) * 26 + 36;
    const laneH = Math.max(...rows) * ROW + 64;
    lanes.push({ band: b.id, x, y: TOP, w: laneW, h: laneH });
    colBottom = Math.max(colBottom, TOP + laneH);
    x += laneW + 32;
  }
  for (const b of ghost) {
    const mem = memberOf(b);
    mem.forEach((n, i) => { pos[n.id] = { x: x + 16, y: TOP + 56 + i * 96, w: 156, h: 42 }; });
    const laneH = Math.max(colBottom - TOP, mem.length * 96 + 80);
    lanes.push({ band: b.id, x, y: TOP, w: 188, h: laneH, ghost: true, label: b.layout.label });
    colBottom = Math.max(colBottom, TOP + laneH);
    x += 188 + 20;
  }
  const totalW = Math.max(x + 8, 900);
  let y = colBottom + 26;
  for (const b of strips) {
    const mem = memberOf(b);
    const w = Math.min(250, Math.floor((totalW - 76) / mem.length) - 16);
    mem.forEach((n, i) => { pos[n.id] = { x: 58 + i * (w + 16), y: y + 24, w, h: dims.striph || 48 }; });
    lanes.push({ band: b.id, x: 40, y, w: totalW - 80, h: (dims.striph || 48) + 52 });
    y += (dims.striph || 48) + 52 + 28;
  }
  return { pos, lanes, canvas: { w: totalW, h: Math.max(y + 12, colBottom + 40) } };
}

function nodeView(n, pos, opts = {}) {
  return {
    id: n.id, name: n.name, band: n.band, kind: n.kind, phase: n.phase, track: n.track,
    responsibility: n.responsibility, sub: opts.sub !== undefined ? opts.sub : (n.sub !== undefined ? n.sub : (n.kind || '')),
    neutralizes: (n.neutralizes || []).map(p => problemById[p] ? p + ' — ' + problemById[p] : p),
    ghost: !!opts.ghost, ...pos[n.id]
  };
}

function edgesFor(ids) { const s = new Set(ids); return bp.edges.filter(e => s.has(e.from) && s.has(e.to)); }

function blueprintView({ title, subtitle, focusBand, links }) {
  let members, ghosts = [];
  if (focusBand) {
    members = nodesByBand(focusBand).map(n => n.id);
    const mSet = new Set(members), nb = new Set();
    bp.edges.forEach(e => {
      if (mSet.has(e.from) && !mSet.has(e.to)) nb.add(e.to);
      if (mSet.has(e.to) && !mSet.has(e.from)) nb.add(e.from);
    });
    ghosts = [...nb];
  } else members = bp.nodes.map(n => n.id);
  const all = [...members, ...ghosts];
  const inView = bp.nodes.filter(n => all.includes(n.id));
  const { pos, lanes, canvas } = layoutViews(inView, bp.bands, { nw: 200, nh: 46 });
  return {
    mode: 'blueprint', title, subtitle, links, bands: bp.bands, lanes, canvas,
    nodes: inView.map(n => nodeView(n, pos, { ghost: ghosts.includes(n.id) })),
    edges: edgesFor(all), laws: bp.laws || [], phases: bp.phases || [], tracks: bp.tracks || [],
    defaults: { cdeps: !!focusBand },
    footer: 'Rendered from blueprint.json v' + (bp.version || '?') + ' by tools/gen.mjs (graphprint) — edit the JSON, regenerate; never edit this HTML.'
  };
}

// ---------------------------------------------------------------- as-is aggregation (optional; needs repo map data)
function bucketOf(id, rules) {
  for (const r of rules || []) {
    if (id.startsWith(r.prefix)) {
      if (r.mode === 'second-segment') { const seg = id.split('/'); return seg.length >= 3 ? seg[0] + '/' + seg[1] : 'root'; }
      if (r.mode === 'self') return r.prefix.replace(/\/$/, '');
      if (r.group) return r.group;
    }
  }
  if (id.startsWith('src/')) { const seg = id.split('/'); return seg.length >= 3 ? 'src/' + seg[1] : 'root'; }
  const top = id.split('/')[0];
  return id.includes('/') ? top : 'root';
}

function asisView(links) {
  if (!bp.asis || !REPO) return null;
  const dataPath = join(REPO, bp.asis.map_data || '.coderef/map/data.json');
  if (!existsSync(dataPath)) { console.warn('[warn] as-is skipped: no map data at ' + dataPath); return null; }
  const map = JSON.parse(readFileSync(dataPath, 'utf8'));
  const routes = bp.asis.routes || {};
  const buckets = new Map(), fileBucket = new Map();
  for (const n of map.nodes) {
    const b = bucketOf(n.id, bp.asis.bucket_rules);
    fileBucket.set(n.id, b);
    const cur = buckets.get(b) || { files: 0, elements: 0, inW: 0, outW: 0, hot: [] };
    cur.files++; cur.elements += n.elementCount || 0; cur.inW += n.inWeight || 0; cur.outW += n.outWeight || 0;
    if ((n.hotspotScore || 0) > 0) cur.hot.push([n.id, n.hotspotScore]);
    buckets.set(b, cur);
  }
  const agg = new Map(); let crossBand = 0, totalW = 0;
  for (const e of map.edges) {
    const a = fileBucket.get(e.source), b = fileBucket.get(e.target);
    if (!a || !b || a === b) continue;
    const k = a + '\u0001' + b;
    const cur = agg.get(k) || { from: a, to: b, weight: 0, imports: 0, calls: 0 };
    cur.weight += e.weight || 1;
    cur.imports += (e.kinds && e.kinds.import) || 0;
    cur.calls += (e.kinds && e.kinds.call) || 0;
    agg.set(k, cur); totalW += e.weight || 1;
    const ba = (routes[a] || {}).band, bb = (routes[b] || {}).band;
    if (ba && bb && ba !== bb) crossBand += e.weight || 1;
  }
  const ghostBand = bp.bands.find(b => b.layout && b.layout.kind === 'ghost');
  const asisNodes = [];
  for (const [b, v] of buckets) {
    const r = routes[b] || { band: null, dest: [], note: 'unmapped — route it in blueprint.json asis.routes' };
    const hot = v.hot.sort((x, z) => z[1] - x[1]).slice(0, 2).map(h => h[0].split('/').pop() + ' (' + h[1] + ')');
    asisNodes.push({
      id: b, name: b, band: r.band || (ghostBand && ghostBand.id) || bp.bands[bp.bands.length - 1].id,
      kind: r.band ? 'as-is' : 'exits', phase: 'P0', track: '*', ghost: !r.band,
      sub: v.files + ' files · ' + v.elements + ' elements' + (r.mixed ? ' · SPLITS' : ''),
      responsibility: 'Today: ' + v.files + ' files, ' + v.elements + ' elements, weight in/out ' + v.inW + '/' + v.outW + '.'
        + (hot.length ? ' Hotspots: ' + hot.join(', ') + '.' : '') + (r.note ? ' — ' + r.note : ''),
      neutralizes: r.dest && r.dest.length ? ['-> destination: ' + r.dest.join(', ')] : ['-> destination: none (leaves the system)'],
      w: 196, h: 56,
      _sortW: v.inW + v.outW
    });
  }
  asisNodes.sort((a, z) => z._sortW - a._sortW);
  const { pos, lanes, canvas } = layoutViews(asisNodes, bp.bands, { nw: 196, nh: 56, striph: 52 });
  asisNodes.forEach(n => Object.assign(n, pos[n.id]));
  const edges = [...agg.values()].sort((a, z) => z.weight - a.weight)
    .map(e => ({ from: e.from, to: e.to, kind: 'real', weight: e.weight, note: e.imports + ' import / ' + e.calls + ' call' }));
  return {
    mode: 'asis',
    title: (meta.program || 'plan') + ' — As-Is, colored by destination',
    subtitle: 'Aggregated from ' + (bp.asis.map_data || '.coderef/map/data.json') + ' (' + ((map.meta && (map.meta.generatedAt || map.meta.generated_at)) || 'live') + '). Each block is a current bucket, placed and colored by the band it migrates to — the migration routing table. Cross-band edge weight: ' + crossBand + ' of ' + totalW + '.',
    links, bands: bp.bands, lanes, canvas, nodes: asisNodes, edges,
    laws: bp.laws || [], phases: [], tracks: [], defaults: { cdeps: true, minw: 2 },
    footer: 'Real data, dogfooded from the repo\u2019s own coderef map artifact. Surfaces, not verdicts — read the files before concluding.'
  };
}

// ---------------------------------------------------------------- style 2: EXPLORER (coderef map-viewer bundle)
function emitExplorer() {
  const inDeg = new Map(), outDeg = new Map();
  bp.edges.filter(e => e.kind === 'dep').forEach(e => {
    outDeg.set(e.from, (outDeg.get(e.from) || 0) + 1);
    inDeg.set(e.to, (inDeg.get(e.to) || 0) + 1);
  });
  const mapData = {
    meta: { repoName: (meta.program || 'blueprint') + ' — blueprint explorer', generatedAt: bp.created || '' },
    nodes: bp.nodes.map(n => ({
      id: n.id, label: n.name, dir: n.band, layer: n.band,
      elementCount: n.elements ? n.elements.length : 1,
      elements: n.elements || [{ name: (n.kind || 'node') + (n.phase ? ' · ' + n.phase : '') + (n.track && n.track !== '*' ? ' · track ' + n.track : ''), type: 'meta', line: 0 }],
      inWeight: inDeg.get(n.id) || 0, outWeight: outDeg.get(n.id) || 0,
      hotspotScore: (inDeg.get(n.id) || 0) + (outDeg.get(n.id) || 0)
    })),
    edges: bp.edges.map(e => ({
      source: e.from, target: e.to, weight: e.kind === 'dep' ? 2 : 1,
      kinds: e.kind === 'dep' ? { import: 1 } : { call: 1 }
    })),
    overlays: { hotspots: [], cycles: [] }
  };
  // bundle source order: explicit core assets -> repo's live map output -> local snapshot
  const candidates = [
    meta.core_assets ? resolve(FOLDER, meta.core_assets) : null,
    REPO ? join(REPO, '.coderef', 'map') : null,
    join(HERE, 'map-viewer-snapshot')
  ].filter(Boolean);
  const tplDirs = [meta.core_assets ? resolve(FOLDER, meta.core_assets) : null, join(HERE, 'map-viewer-snapshot')].filter(Boolean);
  const tplDir = tplDirs.find(d => existsSync(join(d, 'graph.html')));
  const supDir = candidates.find(d => existsSync(join(d, 'viewer.js')));
  if (!tplDir || !supDir) { console.warn('[warn] explorer skipped: no map-viewer bundle found (looked in: ' + candidates.join(' | ') + ')'); return false; }
  let html = readFileSync(join(tplDir, 'graph.html'), 'utf8');
  if (!html.includes('/*__CODEREF_MAP_DATA__*/null')) { console.warn('[warn] explorer skipped: bundle graph.html missing data placeholder'); return false; }
  html = html.replace('/*__CODEREF_MAP_DATA__*/null', JSON.stringify(mapData).replace(/</g, '\\u003c'));
  html = html.replace(/<a id="dashboard-link"[\s\S]*?<\/a>/, '');
  html = html.replace('<title>coderef map</title>', '<title>' + (meta.program || 'blueprint') + ' — explorer</title>');
  writeFileSync(join(FOLDER, 'explorer.html'), html);
  for (const f of ['viewer.js', 'viewer.css', 'tokens.css']) copyFileSync(join(supDir, f), join(FOLDER, f));
  console.log('wrote explorer.html (coderef map-viewer style, bundle: ' + supDir + ')');
  return true;
}

// ---------------------------------------------------------------- style 3: MERMAID
function mermaidText() {
  const mid = s => s.replace(/[^A-Za-z0-9_]/g, '_');
  const lines = ['flowchart LR'];
  for (const b of bp.bands) {
    const mem = nodesByBand(b.id);
    if (!mem.length) continue;
    lines.push('  subgraph ' + mid(b.id) + '["' + b.name + '"]');
    mem.forEach(n => lines.push('    ' + mid(n.id) + '["' + n.name + (n.phase ? '<br/><i>' + n.phase + (n.track && n.track !== '*' ? ' · ' + n.track : '') + '</i>' : '') + '"]'));
    lines.push('  end');
  }
  bp.edges.forEach(e => {
    const a = mid(e.from), b = mid(e.to);
    if (e.kind === 'dep') lines.push('  ' + a + ' --> ' + b);
    else if (e.kind === 'gate') lines.push('  ' + a + ' -.->|verifies| ' + b);
    else lines.push('  ' + a + ' -.-> ' + b);
  });
  bp.bands.filter(b => b.color_light).forEach(b => {
    lines.push('  classDef band_' + mid(b.id) + ' stroke:' + b.color_light + ',stroke-width:2px;');
    const mem = nodesByBand(b.id).map(n => mid(n.id));
    if (mem.length) lines.push('  class ' + mem.join(',') + ' band_' + mid(b.id) + ';');
  });
  return lines.join('\n');
}
function emitMermaid() {
  const txt = mermaidText();
  writeFileSync(join(FOLDER, 'blueprint.mmd'), txt + '\n');
  const planPath = join(FOLDER, 'PLAN.md');
  if (existsSync(planPath)) {
    const plan = readFileSync(planPath, 'utf8');
    const re = /(<!-- graphprint:mermaid:start -->)[\s\S]*?(<!-- graphprint:mermaid:end -->)/;
    if (re.test(plan)) {
      writeFileSync(planPath, plan.replace(re, '$1\n```mermaid\n' + txt + '\n```\n$2'));
      console.log('wrote blueprint.mmd + injected mermaid into PLAN.md');
      return;
    }
  }
  console.log('wrote blueprint.mmd (PLAN.md has no graphprint:mermaid markers — not injected)');
}

// ---------------------------------------------------------------- layered HTML shell + renderer (shared with as-is)
const INKS = {
  light: { page: '#f9f9f7', surface: '#fcfcfb', ink: '#0b0b0b', ink2: '#52514e', muted: '#898781', grid: '#e1e0d9', axis: '#c3c2b7', border: 'rgba(11,11,11,0.10)', pill: 'rgba(11,11,11,0.05)' },
  dark: { page: '#0d0d0d', surface: '#1a1a19', ink: '#ffffff', ink2: '#c3c2b7', muted: '#898781', grid: '#2c2c2a', axis: '#383835', border: 'rgba(255,255,255,0.10)', pill: 'rgba(255,255,255,0.07)' }
};
function bandVars(mode) {
  const t = INKS[mode];
  const lines = ['--page:' + t.page, '--surface:' + t.surface, '--ink:' + t.ink, '--ink2:' + t.ink2, '--muted:' + t.muted, '--grid:' + t.grid, '--axis:' + t.axis, '--border:' + t.border, '--pill:' + t.pill];
  for (const b of bp.bands) {
    const c = mode === 'light' ? b.color_light : b.color_dark;
    if (!c) continue;
    lines.push('--b-' + b.id + ':' + c);
    lines.push('--bf-' + b.id + ':color-mix(in srgb, ' + c + ' ' + (mode === 'light' ? '10%' : '22%') + ', ' + t.surface + ')');
  }
  return lines.join(';');
}
const CSS = [
  ':root{color-scheme:light dark}', 'html,body{margin:0;padding:0}',
  'body{background:var(--page);color:var(--ink);font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}',
  '.wrap{max-width:1420px;margin:0 auto;padding:18px 22px 40px}',
  'header h1{font-size:19px;margin:0 0 2px;letter-spacing:-.01em}',
  'header p{margin:0 0 10px;color:var(--ink2);font-size:13px;max-width:1080px}',
  'nav{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0 14px}',
  'nav a{color:var(--ink2);text-decoration:none;font-size:12.5px;border:1px solid var(--border);border-radius:999px;padding:3px 11px;background:var(--surface)}',
  'nav a:hover{color:var(--ink);border-color:var(--axis)}',
  '.controls{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin:0 0 10px;font-size:12.5px;color:var(--ink2)}',
  '.controls .grp{display:flex;gap:4px;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:3px}',
  '.controls button{font:600 12px system-ui,sans-serif;color:var(--ink2);background:none;border:none;border-radius:6px;padding:3px 10px;cursor:pointer}',
  '.controls button[aria-pressed="true"]{background:var(--pill);color:var(--ink)}',
  '.controls label{display:flex;gap:5px;align-items:center;cursor:pointer}',
  '.canvas{overflow-x:auto;background:var(--surface);border:1px solid var(--border);border-radius:14px}',
  'svg{display:block;min-width:1100px}',
  '.lane{fill:none;stroke:var(--grid)}', '.lane.ghost{stroke-dasharray:5 5}',
  '.laneTitle{fill:var(--muted);font:600 11px system-ui,sans-serif;letter-spacing:.09em}',
  '.edge{fill:none;stroke:var(--muted);stroke-width:1.4;opacity:.5}',
  '.edge.flow{stroke-dasharray:6 5}', '.edge.gate{stroke-dasharray:2 4}',
  '.edge.hl{stroke:var(--hlc);stroke-width:2.6;opacity:1}', '.edge.fade{opacity:.1}',
  '.edge.hidden,.node.hidden{display:none}', '.edge.dim,.node.dim{opacity:.22}',
  '.node{cursor:pointer}', '.node rect.box{stroke-width:1.5;rx:9}',
  '.node.ghost rect.box{stroke-dasharray:4 4;fill:none!important}',
  '.node text.lbl{fill:var(--ink);font:600 12.5px system-ui,sans-serif}',
  '.node.ghost text.lbl{fill:var(--ink2)}',
  '.node text.sub{fill:var(--ink2);font:10.5px system-ui,sans-serif}',
  '.node text.pill{fill:var(--ink2);font:600 9.5px system-ui,sans-serif}',
  '.node rect.pillbox{fill:var(--pill);stroke:var(--border);rx:6}',
  '.node.sel rect.box{stroke-width:3}',
  '.legend{display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin:12px 2px;font-size:12.5px;color:var(--ink2)}',
  '.legend .sw{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px}',
  '.legend .ln{display:inline-block;width:26px;height:0;border-top:2px solid var(--axis);margin-right:5px;vertical-align:3px}',
  '.legend .ln.flow{border-top-style:dashed}', '.legend .ln.gate{border-top-style:dotted}',
  '#panel{position:sticky;bottom:14px;margin-top:14px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px 18px;display:none;box-shadow:0 6px 24px rgba(0,0,0,.08)}',
  '#panel.open{display:block}', '#panel h2{margin:0;font-size:15px}',
  '#panel .meta{color:var(--ink2);font-size:12px;margin:2px 0 8px;font-family:ui-monospace,Consolas,monospace}',
  '#panel p{margin:6px 0;font-size:13px;max-width:980px}',
  '#panel .tag{display:inline-block;border:1px solid var(--border);background:var(--pill);border-radius:999px;padding:1px 9px;font-size:11.5px;margin:2px 4px 2px 0;color:var(--ink2)}',
  '#panel .cols{display:flex;gap:28px;flex-wrap:wrap}',
  '#panel .cols div{min-width:220px}', '#panel .cols h3{font-size:11px;color:var(--muted);letter-spacing:.08em;margin:8px 0 4px;text-transform:uppercase}',
  '#panel ul{margin:0;padding-left:16px;font-size:12.5px;color:var(--ink2)}',
  'details{margin-top:16px}', 'summary{cursor:pointer;color:var(--ink2);font-size:13px}',
  'table{border-collapse:collapse;margin-top:10px;font-size:12px;width:100%}',
  'th,td{text-align:left;border-bottom:1px solid var(--grid);padding:5px 10px 5px 0;vertical-align:top}',
  'th{color:var(--muted);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.06em}',
  'td:first-child{font-family:ui-monospace,Consolas,monospace;white-space:nowrap}',
  '.tblwrap{overflow-x:auto}', 'footer{margin-top:18px;color:var(--muted);font-size:11.5px}',
  '.law{margin:3px 0}', '#themeBtn{margin-left:auto}'
].join('\n');

const RENDERER = [
  'var D = JSON.parse(document.getElementById("data").textContent);',
  'var svgNS = "http://www.w3.org/2000/svg";',
  'var byId = {}; D.nodes.forEach(function(n){ byId[n.id] = n; });',
  'var bandC = {}; D.bands.forEach(function(b){ bandC[b.id] = b; });',
  'var state = { phase: "All", cdeps: D.defaults && D.defaults.cdeps, flows: true, minw: (D.defaults && D.defaults.minw) || 0, sel: null };',
  'var PH = { P0: 0, P1: 1, P2: 2, P3: 3 };',
  'function el(tag, attrs, parent) { var e = document.createElementNS(svgNS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }',
  'function bandColor(id) { return "var(--b-" + id + ")"; }',
  'function bandFill(id) { return "var(--bf-" + id + ")"; }',
  'var svg = el("svg", { viewBox: "0 0 " + D.canvas.w + " " + D.canvas.h, role: "img", "aria-label": D.title }, null);',
  'document.getElementById("canvas").appendChild(svg);',
  'var defs = el("defs", {}, svg);',
  '["dep","flow","gate","real"].forEach(function(k){',
  '  var m = el("marker", { id: "arr-" + k, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);',
  '  var p = el("path", { d: "M 0 1 L 9 5 L 0 9 z" }, m); p.style.fill = "var(--muted)";',
  '});',
  'D.lanes.forEach(function(L){',
  '  el("rect", { x: L.x, y: L.y, width: L.w, height: L.h, rx: 12, "class": "lane" + (L.ghost ? " ghost" : "") }, svg);',
  '  var t = el("text", { x: L.x + 12, y: L.y - 8, "class": "laneTitle" }, svg);',
  '  var b = bandC[L.band];',
  '  t.textContent = (L.label || (b ? b.name : L.band)).toUpperCase();',
  '  if (b && b.slot) { t.style.fill = bandColor(L.band); }',
  '});',
  'function anchor(n, other) {',
  '  var cx = n.x + n.w / 2, cy = n.y + n.h / 2;',
  '  var ox = other.x + other.w / 2, oy = other.y + other.h / 2;',
  '  var dx = ox - cx, dy = oy - cy;',
  '  if (Math.abs(dx) * (n.h / n.w) > Math.abs(dy)) return { x: cx + (dx > 0 ? n.w / 2 : -n.w / 2), y: cy, h: true, s: dx > 0 ? 1 : -1 };',
  '  return { x: cx, y: cy + (dy > 0 ? n.h / 2 : -n.h / 2), h: false, s: dy > 0 ? 1 : -1 };',
  '}',
  'var edgeEls = [];',
  'D.edges.forEach(function(e){',
  '  var a = byId[e.from], b = byId[e.to]; if (!a || !b) return;',
  '  var p1 = anchor(a, b), p2 = anchor(b, a);',
  '  var k = 55;',
  '  var c1x = p1.h ? p1.x + p1.s * k : p1.x, c1y = p1.h ? p1.y : p1.y + p1.s * k;',
  '  var c2x = p2.h ? p2.x + p2.s * k : p2.x, c2y = p2.h ? p2.y : p2.y + p2.s * k;',
  '  var d = "M " + p1.x + " " + p1.y + " C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + p2.x + " " + p2.y;',
  '  var path = el("path", { d: d, "class": "edge " + e.kind, "marker-end": "url(#arr-" + e.kind + ")" }, svg);',
  '  if (e.kind === "real" && e.weight) path.style.strokeWidth = Math.min(1 + Math.sqrt(e.weight) * 0.55, 6);',
  '  path.style.setProperty("--hlc", bandColor(a.band));',
  '  edgeEls.push({ e: e, el: path });',
  '});',
  'var nodeEls = [];',
  'D.nodes.forEach(function(n){',
  '  var g = el("g", { "class": "node" + (n.ghost ? " ghost" : ""), tabindex: 0, role: "button", "aria-label": n.name }, svg);',
  '  var box = el("rect", { x: n.x, y: n.y, width: n.w, height: n.h, "class": "box" }, g);',
  '  box.style.stroke = n.ghost ? "var(--muted)" : bandColor(n.band);',
  '  box.style.fill = n.ghost ? "none" : bandFill(n.band);',
  '  var lbl = el("text", { x: n.x + 11, y: n.y + (n.sub ? 19 : n.h / 2 + 4), "class": "lbl" }, g);',
  '  lbl.textContent = n.name;',
  '  if (n.sub) { var sub = el("text", { x: n.x + 11, y: n.y + 34, "class": "sub" }, g); sub.textContent = n.sub; }',
  '  if (n.phase && D.mode === "blueprint" && !n.ghost) {',
  '    var pw = n.track && n.track !== "*" ? 46 : 26;',
  '    el("rect", { x: n.x + n.w - pw - 7, y: n.y + 6, width: pw, height: 15, "class": "pillbox" }, g);',
  '    var pt = el("text", { x: n.x + n.w - pw - 1, y: n.y + 17, "class": "pill" }, g);',
  '    pt.textContent = n.phase + (n.track && n.track !== "*" ? " · " + n.track : "");',
  '  }',
  '  g.addEventListener("mouseenter", function(){ highlight(n.id); });',
  '  g.addEventListener("mouseleave", function(){ if (!state.sel) clear(); else highlight(state.sel); });',
  '  g.addEventListener("click", function(ev){ ev.stopPropagation(); select(n.id); });',
  '  g.addEventListener("keydown", function(ev){ if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); select(n.id); } });',
  '  nodeEls.push({ n: n, el: g });',
  '});',
  'svg.addEventListener("click", function(){ state.sel = null; clear(); document.getElementById("panel").className = ""; });',
  'function highlight(id) {',
  '  edgeEls.forEach(function(x){',
  '    var on = x.e.from === id || x.e.to === id;',
  '    x.el.classList.toggle("hl", on); x.el.classList.toggle("fade", !on);',
  '  });',
  '}',
  'function clear() { edgeEls.forEach(function(x){ x.el.classList.remove("hl"); x.el.classList.remove("fade"); }); }',
  'function select(id) {',
  '  state.sel = id; highlight(id);',
  '  nodeEls.forEach(function(x){ x.el.classList.toggle("sel", x.n.id === id); });',
  '  var n = byId[id]; var p = document.getElementById("panel"); p.className = "open";',
  '  var imports = D.edges.filter(function(e){ return e.from === id && e.kind === "dep"; }).map(function(e){ return e.to + (e.note ? " — " + e.note : ""); });',
  '  var importedBy = D.edges.filter(function(e){ return e.to === id && e.kind === "dep"; }).map(function(e){ return e.from; });',
  '  var flows = D.edges.filter(function(e){ return (e.from === id || e.to === id) && e.kind !== "dep"; }).map(function(e){ return e.from + " -> " + e.to + (e.note ? " (" + e.note + ")" : "") + (e.weight ? " · w=" + e.weight : ""); });',
  '  function li(a) { return a.length ? a.map(function(s){ return "<li>" + esc(s) + "</li>"; }).join("") : "<li>—</li>"; }',
  '  p.innerHTML = "<h2>" + esc(n.name) + "</h2><div class=\'meta\'>" + esc(n.id) + " · " + esc(n.band) + " · " + esc(n.kind || "") + "</div>"',
  '    + (D.mode === "blueprint" ? "<span class=\'tag\'>phase " + esc(n.phase) + "</span><span class=\'tag\'>track " + esc(n.track) + "</span>" : "")',
  '    + "<p>" + esc(n.responsibility || "") + "</p>"',
  '    + "<div class=\'cols\'><div><h3>" + (D.mode === "asis" ? "Migrates to" : "Neutralizes") + "</h3><ul>" + li(n.neutralizes || []) + "</ul></div>"',
  '    + "<div><h3>May import</h3><ul>" + li(imports) + "</ul></div>"',
  '    + "<div><h3>Imported by</h3><ul>" + li(importedBy) + "</ul></div>"',
  '    + "<div><h3>" + (D.mode === "asis" ? "Real edges" : "Flows / gates") + "</h3><ul>" + li(flows.slice(0, 8)) + "</ul></div></div>";',
  '}',
  'function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }',
  'function visPhase(n) {',
  '  if (state.phase === "All") return "show";',
  '  var sp = PH[state.phase], np = PH[n.phase] !== undefined ? PH[n.phase] : 3;',
  '  if (np > sp) return "hide"; if (np < sp) return "dim"; return "show";',
  '}',
  'function apply() {',
  '  var vis = {};',
  '  nodeEls.forEach(function(x){',
  '    var v = visPhase(x.n); vis[x.n.id] = v;',
  '    x.el.classList.toggle("hidden", v === "hide");',
  '    x.el.classList.toggle("dim", v === "dim");',
  '  });',
  '  edgeEls.forEach(function(x){',
  '    var e = x.e, a = vis[e.from], b = vis[e.to];',
  '    var hide = a === "hide" || b === "hide";',
  '    if (!hide && e.kind === "dep" && !state.cdeps) {',
  '      var tb = byId[e.to] && byId[e.to].band, fb = byId[e.from] && byId[e.from].band;',
  '      if (tb === D.contract_band && fb !== D.contract_band) hide = true;',
  '    }',
  '    if (!hide && e.kind !== "dep" && e.kind !== "real" && !state.flows) hide = true;',
  '    if (!hide && e.kind === "real" && (e.weight || 0) < state.minw) hide = true;',
  '    x.el.classList.toggle("hidden", hide);',
  '    x.el.classList.toggle("dim", !hide && (a === "dim" || b === "dim"));',
  '  });',
  '}',
  'var phasesBar = document.getElementById("phases");',
  'if (D.phases.length) {',
  '  ["All","P0","P1","P2","P3"].forEach(function(ph){',
  '    var b = document.createElement("button"); b.textContent = ph; b.setAttribute("aria-pressed", ph === "All");',
  '    b.onclick = function(){ state.phase = ph; [].forEach.call(phasesBar.children, function(c){ c.setAttribute("aria-pressed", c === b); }); apply(); };',
  '    phasesBar.appendChild(b);',
  '  });',
  '} else { phasesBar.parentNode.style.display = "none"; }',
  'var cdep = document.getElementById("cdeps"); cdep.checked = !!state.cdeps;',
  'cdep.onchange = function(){ state.cdeps = cdep.checked; apply(); };',
  'if (!D.contract_band) { cdep.parentNode.style.display = "none"; state.cdeps = true; }',
  'var flowsCb = document.getElementById("flows"); flowsCb.checked = true;',
  'flowsCb.onchange = function(){ state.flows = flowsCb.checked; apply(); };',
  'var minwCb = document.getElementById("minw");',
  'if (D.mode !== "asis") { minwCb.parentNode.style.display = "none"; } else {',
  '  minwCb.checked = state.minw > 1;',
  '  minwCb.onchange = function(){ state.minw = minwCb.checked ? 2 : 0; apply(); };',
  '}',
  'var themeBtn = document.getElementById("themeBtn");',
  'var themes = ["auto","light","dark"]; var ti = 0;',
  'themeBtn.onclick = function(){ ti = (ti + 1) % 3; var t = themes[ti];',
  '  if (t === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;',
  '  themeBtn.textContent = "theme: " + t; };',
  'apply();'
].join('\n');

function page(view) {
  view.contract_band = meta.contract_band || null;
  const json = JSON.stringify(view).replace(/</g, '\\u003c');
  const nav = (view.links || []).map(l => '<a href="' + l.href + '">' + l.label + '</a>').join('');
  const legend = view.bands.filter(b => b.slot > 0)
    .map(b => '<span><span class="sw" style="background:var(--b-' + b.id + ')"></span>' + b.name + '</span>').join('')
    + (view.mode === 'asis'
      ? '<span><span class="ln"></span>real edges (width = weight)</span><span><span class="sw" style="background:none;border:1px dashed var(--muted)"></span>leaves the system</span>'
      : '<span><span class="ln"></span>' + (meta.legend_dep || 'dep (A -> B: A may import B)') + '</span><span><span class="ln flow"></span>' + (meta.legend_flow || 'flow (data / artifact)') + '</span><span><span class="ln gate"></span>gate (verifies against)</span><span><span class="sw" style="background:none;border:1px dashed var(--muted)"></span>ghost / external</span>');
  const laws = (view.laws || []).map(l => '<div class="law"><strong>' + l.id + '</strong> — ' + l.text + (l.kills ? ' <em style="color:var(--muted)">(kills ' + l.kills.join(', ') + ')</em>' : '') + '</div>').join('');
  const nodeRows = view.nodes.map(n => '<tr><td>' + n.id + '</td><td>' + n.band + '</td><td>' + (n.phase || '') + '</td><td>' + (n.track || '') + '</td><td>' + (n.responsibility || '') + '</td></tr>').join('');
  const edgeRows = view.edges.map(e => '<tr><td>' + e.from + '</td><td>' + e.to + '</td><td>' + e.kind + (e.weight ? ' (w=' + e.weight + ')' : '') + '</td><td>' + (e.note || '') + '</td></tr>').join('');
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + view.title + '</title>'
    + '<style>\n:root{' + bandVars('light') + '}\n'
    + '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){' + bandVars('dark') + '}}\n'
    + ':root[data-theme="dark"]{' + bandVars('dark') + '}\n'
    + CSS + '\n</style></head><body><div class="wrap">'
    + '<header><h1>' + view.title + '</h1><p>' + view.subtitle + '</p>'
    + '<nav>' + nav + '</nav></header>'
    + '<div class="controls">'
    + '<div class="grp"><span style="padding:0 4px 0 8px;color:var(--muted)">build phase</span><span id="phases" style="display:flex;gap:4px"></span></div>'
    + '<label><input type="checkbox" id="cdeps"> contract deps</label>'
    + '<label><input type="checkbox" id="flows" checked> flows</label>'
    + '<label><input type="checkbox" id="minw"> hide weight-1 edges</label>'
    + '<div class="grp" style="margin-left:auto"><button id="themeBtn">theme: auto</button></div>'
    + '</div>'
    + '<div class="canvas" id="canvas"></div>'
    + '<div class="legend">' + legend + '</div>'
    + '<div id="panel" role="region" aria-label="details"></div>'
    + (laws ? '<details><summary>The ' + view.laws.length + ' laws (what the rules gate enforces)</summary>' + laws + '</details>' : '')
    + '<details><summary>Table view (all nodes and edges)</summary><div class="tblwrap"><table><thead><tr><th>id</th><th>band</th><th>phase</th><th>track</th><th>responsibility</th></tr></thead><tbody>' + nodeRows + '</tbody></table>'
    + '<table><thead><tr><th>from</th><th>to</th><th>kind</th><th>note</th></tr></thead><tbody>' + edgeRows + '</tbody></table></div></details>'
    + '<footer>' + view.footer + ' · Palette validated (dataviz six-checks, light+dark). Click a node for details; click empty space to clear.</footer>'
    + '</div><script id="data" type="application/json">' + json + '</script>'
    + '<script>\n' + RENDERER + '\n</script></body></html>';
}

// ---------------------------------------------------------------- emit all
const repoMapLink = REPO && existsSync(join(REPO, '.coderef', 'map', 'graph.html'))
  ? { label: 'Repo map (live)', href: relative(FOLDER, join(REPO, '.coderef', 'map', 'graph.html')).split('\\').join('/') }
  : null;
const bandViews = meta.band_views || bp.bands.filter(b => (!b.layout || b.layout.kind === 'column')).map(b => b.id);
const masterLinks = [
  ...(bp.asis && REPO ? [{ label: 'As-is (today)', href: 'as-is.html' }] : []),
  { label: 'Explorer (map style)', href: 'explorer.html' },
  ...bandViews.map(b => ({ label: bandById[b] ? bandById[b].name : b, href: b + '/graph.html' })),
  { label: 'PLAN.md', href: 'PLAN.md' }, { label: 'PROBLEMS.md', href: 'PROBLEMS.md' },
  ...(repoMapLink ? [repoMapLink] : []), ...(meta.nav_links || [])
];
const upLinks = [{ label: '<- Blueprint (master)', href: '../blueprint.html' }, { label: 'Explorer', href: '../explorer.html' }, { label: 'PLAN.md', href: 'PLAN.md' }];

const views = [['blueprint.html', blueprintView({
  title: (meta.program || 'plan') + ' — Blueprint (master)',
  subtitle: meta.subtitle || 'The build follows this graph: solid arrows are the ONLY imports allowed (deny-by-default), dashed arrows are data flows, pills are build phase · parallel track. Filter by phase to watch the parallel tracks separate.',
  links: masterLinks
})]];
const asis = asisView([{ label: 'Blueprint (to-be)', href: 'blueprint.html' }, { label: 'Explorer', href: 'explorer.html' }, { label: 'PLAN.md', href: 'PLAN.md' }, ...(repoMapLink ? [repoMapLink] : [])]);
if (asis) views.push(['as-is.html', asis]);
for (const band of bandViews) {
  const b = bandById[band];
  if (!b || !nodesByBand(band).length) continue;
  views.push([band + '/graph.html', blueprintView({
    title: (meta.program || 'plan') + ' — ' + b.name,
    subtitle: (b.desc || '') + ' Solid members are this band; dashed ghosts are its complete import boundary.',
    focusBand: band, links: upLinks
  })]);
}
for (const [rel, view] of views) {
  const out = join(FOLDER, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, page(view));
  console.log('wrote ' + rel + ' (' + view.nodes.length + ' nodes, ' + view.edges.length + ' edges)');
}
emitExplorer();
emitMermaid();
console.log('done.');

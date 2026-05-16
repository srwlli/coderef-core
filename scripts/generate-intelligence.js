#!/usr/bin/env node
/**
 * generate-intelligence.js
 * Computes 5 visualization datasets from .coderef artifacts.
 * Output: .coderef/intelligence/{treemap,scatter,sankey,umap,hotspots}.json
 *
 * WO-CODEREF-INTELLIGENCE-VIZ-TRANSFORMS-001
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CODEREF = path.join(ROOT, '.coderef');
const OUT = path.join(CODEREF, 'intelligence');

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf-8'));
}

async function writeJson(p, data) {
  await fs.writeFile(p, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// ─── PCA helpers ────────────────────────────────────────────────────────────

function mean(matrix) {
  const n = matrix.length;
  const d = matrix[0].length;
  const m = new Float64Array(d);
  for (const row of matrix) for (let j = 0; j < d; j++) m[j] += row[j];
  for (let j = 0; j < d; j++) m[j] /= n;
  return m;
}

function centerMatrix(matrix, mu) {
  return matrix.map(row => row.map((v, j) => v - mu[j]));
}

// Compute first 2 principal components via power iteration on covariance.
// For high-dim sparse data (768-dim, 1153 samples) we use the data matrix
// directly: covariance C = X^T X / (n-1). Power iteration extracts top-2 PCs.
function powerIteration(X, iters = 150) {
  const n = X.length;
  const d = X[0].length;
  const pcs = [];

  // Deflate X after each PC
  let Xd = X.map(row => [...row]);

  for (let pc = 0; pc < 2; pc++) {
    // Random init
    let v = new Array(d).fill(0).map(() => Math.random() - 0.5);
    // Normalise
    let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    v = v.map(x => x / norm);

    for (let iter = 0; iter < iters; iter++) {
      // u = X v  (n-vec)
      const u = new Array(n).fill(0);
      for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) u[i] += Xd[i][j] * v[j];
      // v_new = X^T u  (d-vec)
      const vNew = new Array(d).fill(0);
      for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) vNew[j] += Xd[i][j] * u[i];
      norm = Math.sqrt(vNew.reduce((s, x) => s + x * x, 0));
      v = vNew.map(x => x / norm);
    }
    pcs.push(v);

    // Deflate: Xd -= (Xd v) v^T
    for (let i = 0; i < n; i++) {
      const proj = Xd[i].reduce((s, x, j) => s + x * v[j], 0);
      for (let j = 0; j < d; j++) Xd[i][j] -= proj * v[j];
    }
  }
  return pcs; // [pc1: d-vec, pc2: d-vec]
}

function projectPCA(matrix, pc1, pc2) {
  return matrix.map(row => ({
    x: row.reduce((s, v, j) => s + v * pc1[j], 0),
    y: row.reduce((s, v, j) => s + v * pc2[j], 0),
  }));
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[generate-intelligence] Loading source artifacts...');

  const [index, graph, complexitySummary, coverage, vectors] = await Promise.all([
    readJson(path.join(CODEREF, 'index.json')),
    readJson(path.join(CODEREF, 'graph.json')),
    readJson(path.join(CODEREF, 'reports', 'complexity', 'summary.json')),
    readJson(path.join(CODEREF, 'reports', 'coverage.json')),
    readJson(path.join(CODEREF, 'coderef-vectors.json')),
  ]);

  const elements = index.elements; // array of element objects
  console.log(`[generate-intelligence] ${elements.length} elements, ${graph.edges.length} edges, ${Object.keys(vectors.records).length} vectors`);

  // ── Build lookup maps ──────────────────────────────────────────────────────

  // Complexity: key = "name::file"
  const complexityMap = new Map();
  for (const e of complexitySummary.elements) {
    complexityMap.set(`${e.element}::${e.file}`, e.complexity);
  }

  // Coverage: key = file path, value = bool
  const coveredFiles = new Set();
  if (Array.isArray(coverage.files)) {
    for (const f of coverage.files) {
      if (f.tested) coveredFiles.add(f.file);
    }
  } else if (coverage.files && typeof coverage.files === 'object') {
    // object shape: {file: {tested: bool}}
    for (const [file, info] of Object.entries(coverage.files)) {
      if (info.tested) coveredFiles.add(file);
    }
  }

  function getComplexity(el) {
    return complexityMap.get(`${el.name}::${el.file}`) ?? 1;
  }

  function isTested(el) {
    return coveredFiles.has(el.file);
  }

  // ── 1. scatter.json ────────────────────────────────────────────────────────
  console.log('[generate-intelligence] Building scatter.json...');
  const scatter = elements.map(el => ({
    id: el.codeRefId,
    name: el.name,
    file: el.file,
    complexity: getComplexity(el),
    tested: isTested(el),
    layer: el.type, // proxy: no layer field in current index
    type: el.type,
  }));

  // ── 2. treemap.json ────────────────────────────────────────────────────────
  console.log('[generate-intelligence] Building treemap.json...');

  // Group elements by top-level directory (or file for root-level files)
  function topDir(file) {
    const parts = file.replace(/\\/g, '/').split('/');
    return parts.length > 1 ? parts[0] : '__root__';
  }
  function secondDir(file) {
    const parts = file.replace(/\\/g, '/').split('/');
    return parts.length > 1 ? parts.slice(0, 2).join('/') : file;
  }

  // Build: root → top-dir → file → elements
  const dirMap = new Map();
  for (const el of elements) {
    const dir = topDir(el.file);
    if (!dirMap.has(dir)) dirMap.set(dir, new Map());
    const fileMap = dirMap.get(dir);
    if (!fileMap.has(el.file)) fileMap.set(el.file, []);
    fileMap.get(el.file).push(el);
  }

  const treemap = {
    name: 'coderef-core',
    children: [],
  };
  for (const [dir, fileMap] of dirMap) {
    const dirNode = { name: dir, children: [] };
    for (const [file, els] of fileMap) {
      const fileNode = {
        name: path.basename(file),
        path: file,
        children: els.map(el => ({
          name: el.name,
          id: el.codeRefId,
          value: getComplexity(el),
          color: el.type,
          coverage: isTested(el),
          type: el.type,
        })),
      };
      dirNode.children.push(fileNode);
    }
    treemap.children.push(dirNode);
  }

  // ── 3. sankey.json ─────────────────────────────────────────────────────────
  console.log('[generate-intelligence] Building sankey.json...');

  // Aggregate edges at top-directory level (call edges only for signal)
  function fileToDir(file) {
    if (!file) return '__external__';
    const parts = file.replace(/\\/g, '/').split('/');
    return parts.length > 1 ? parts[0] : '__root__';
  }

  // Build directory set from nodes
  const dirSet = new Set();
  for (const node of graph.nodes) {
    if (node.file) dirSet.add(fileToDir(node.file));
  }
  dirSet.add('__external__');

  const sankeyNodes = [...dirSet].map((id, idx) => ({ id, index: idx }));
  const nodeIndex = new Map(sankeyNodes.map(n => [n.id, n.index]));

  // Aggregate link weights: source-dir → target-dir
  const linkMap = new Map();
  for (const edge of graph.edges) {
    if (edge.relationship !== 'call' && edge.relationship !== 'import') continue;
    // source file from sourceId (e.g. "@Fn/src/foo.ts#bar:10" → "src/foo.ts")
    const srcFile = edge.sourceId ? edge.sourceId.replace(/^@[A-Za-z]+\//, '').split('#')[0] : null;
    // prefer targetId; fall back to first candidate (covers ambiguous call edges)
    const rawTarget = edge.targetId || (Array.isArray(edge.candidates) && edge.candidates[0]) || null;
    const tgtFile = rawTarget ? rawTarget.replace(/^@[A-Za-z]+\//, '').split('#')[0] : null;
    const src = fileToDir(srcFile);
    const tgt = fileToDir(tgtFile);
    if (src === tgt) continue; // skip self-loops
    const key = `${src}::${tgt}`;
    linkMap.set(key, (linkMap.get(key) ?? 0) + 1);
  }

  const sankeyLinks = [];
  for (const [key, value] of linkMap) {
    const [src, tgt] = key.split('::');
    if (nodeIndex.has(src) && nodeIndex.has(tgt)) {
      sankeyLinks.push({ source: nodeIndex.get(src), target: nodeIndex.get(tgt), value });
    }
  }

  const sankey = { nodes: sankeyNodes, links: sankeyLinks };

  // ── 4. hotspots.json ───────────────────────────────────────────────────────
  console.log('[generate-intelligence] Building hotspots.json...');

  const hotspots = elements
    .map(el => ({
      id: el.codeRefId,
      name: el.name,
      file: el.file,
      inDegree: Array.isArray(el.usedBy) ? el.usedBy.length : 0,
      complexity: getComplexity(el),
      layer: el.type,
    }))
    .sort((a, b) => b.inDegree - a.inDegree || b.complexity - a.complexity)
    .slice(0, 50);

  // ── 5. umap.json (PCA fallback) ────────────────────────────────────────────
  console.log('[generate-intelligence] Building umap.json (PCA fallback)...');

  const records = vectors.records;
  const vectorIds = Object.keys(records);
  console.log(`[generate-intelligence] Computing PCA on ${vectorIds.length} vectors (dim=${vectors.dimension})...`);

  // Build id→element lookup for metadata enrichment
  const elementById = new Map(elements.map(el => [el.codeRefId, el]));

  // Extract numeric matrix
  const matrix = vectorIds.map(id => records[id].values);

  // Center
  const mu = mean(matrix);
  const centered = centerMatrix(matrix, mu);

  // Power iteration for top-2 PCs
  const [pc1, pc2] = powerIteration(centered, 80);
  const projected = projectPCA(centered, pc1, pc2);

  // Normalise to [-1, 1] for each axis
  const xs = projected.map(p => p.x);
  const ys = projected.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const umap = vectorIds.map((id, i) => {
    const el = elementById.get(id);
    const meta = records[id].metadata || {};
    return {
      id,
      name: el?.name ?? meta.name ?? id,
      file: el?.file ?? meta.file ?? '',
      x: ((projected[i].x - xMin) / xRange) * 2 - 1,
      y: ((projected[i].y - yMin) / yRange) * 2 - 1,
      layer: el?.type ?? meta.type ?? 'unknown',
      complexity: el ? getComplexity(el) : 1,
      method: 'pca',
    };
  });

  // ── Write outputs ──────────────────────────────────────────────────────────
  await fs.mkdir(OUT, { recursive: true });

  const meta = {
    generated_at: new Date().toISOString(),
    source_elements: elements.length,
    source_edges: graph.edges.length,
    source_vectors: vectorIds.length,
    method_umap: 'pca_fallback',
    workorder: 'WO-CODEREF-INTELLIGENCE-VIZ-TRANSFORMS-001',
  };

  await Promise.all([
    writeJson(path.join(OUT, 'treemap.json'), { meta, ...treemap }),
    writeJson(path.join(OUT, 'scatter.json'), { meta, data: scatter }),
    writeJson(path.join(OUT, 'sankey.json'), { meta, ...sankey }),
    writeJson(path.join(OUT, 'umap.json'), { meta, data: umap }),
    writeJson(path.join(OUT, 'hotspots.json'), { meta, data: hotspots }),
  ]);

  console.log('[generate-intelligence] Done.');
  console.log(`  treemap.json : ${treemap.children.length} top-level dirs`);
  console.log(`  scatter.json : ${scatter.length} elements`);
  console.log(`  sankey.json  : ${sankeyNodes.length} nodes, ${sankeyLinks.length} links`);
  console.log(`  umap.json    : ${umap.length} vectors projected`);
  console.log(`  hotspots.json: ${hotspots.length} hotspot elements`);
}

main().catch(err => { console.error('[generate-intelligence] FATAL:', err); process.exit(1); });

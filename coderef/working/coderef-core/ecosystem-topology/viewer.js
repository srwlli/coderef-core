/* coderef viewer engine for ecosystem-topology */
(function () {
  'use strict';
  function boot() {
    var inline = window.__CODEREF_MAP_DATA__;
    if (inline && inline.nodes) init(inline);
  }

  var nodes = [], edges = [], nodeById = new Map(), outAdj = new Map(), inAdj = new Map();
  var selected = null, hovered = null, canvas, ctx;
  var view = { x: 0, y: 0, k: 1 }, alpha = 0, dragNode = null, panning = false, lastPointer = { x: 0, y: 0 };
  var layerColorMap = {
    'engine': '#3fb950',
    'feed': '#58a6ff',
    'parsed-surface': '#bc8cff',
    'external-agent': '#d29922'
  };

  function init(data) {
    nodes = data.nodes.map(function (n) {
      return Object.assign({}, n, {
        x: (Math.random() - 0.5) * 1000, y: (Math.random() - 0.5) * 1000,
        vx: 0, vy: 0, r: 10 + Math.sqrt(n.elementCount || 1) * 2.5,
        color: layerColorMap[n.layer] || '#58a6ff', fixed: false
      });
    });
    nodes.forEach(function (n) { nodeById.set(n.id, n); });
    edges = data.edges.filter(function (e) { return nodeById.has(e.source) && nodeById.has(e.target); })
      .map(function (e) { return Object.assign({}, e, { a: nodeById.get(e.source), b: nodeById.get(e.target) }); });
    edges.forEach(function (e) {
      if (!outAdj.has(e.source)) outAdj.set(e.source, []);
      if (!inAdj.has(e.target)) inAdj.set(e.target, []);
      outAdj.get(e.source).push({ node: e.b }); inAdj.get(e.target).push({ node: e.a });
    });

    document.getElementById('repo-name').textContent = data.meta.repoName || 'ecosystem-topology';
    document.getElementById('stats').textContent = nodes.length + ' entities · ' + edges.length + ' feed connections';

    canvas = document.getElementById('graph-canvas'); ctx = canvas.getContext('2d');
    bindEvents(); resize(); alpha = 1; requestAnimationFrame(tick); fitView();
  }

  function simulate() {
    var i, j, n, m, dx, dy, d2, d, f;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      for (j = i + 1; j < nodes.length; j++) {
        m = nodes[j]; dx = n.x - m.x; dy = n.y - m.y; d2 = dx * dx + dy * dy + 0.01;
        if (d2 > 350000) continue; f = 3200 / d2;
        n.vx += dx * f * 0.005; n.vy += dy * f * 0.005;
        m.vx -= dx * f * 0.005; m.vy -= dy * f * 0.005;
      }
      n.vx -= n.x * 0.001; n.vy -= n.y * 0.001;
    }
    for (i = 0; i < edges.length; i++) {
      var e = edges[i]; dx = e.b.x - e.a.x; dy = e.b.y - e.a.y; d = Math.sqrt(dx * dx + dy * dy) + 0.01;
      f = 0.02 * (d - 130); dx = dx / d * f; dy = dy / d * f;
      e.a.vx += dx; e.a.vy += dy; e.b.vx -= dx; e.b.vy -= dy;
    }
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i]; if (n.fixed) { n.vx = 0; n.vy = 0; continue; }
      n.vx *= 0.85; n.vy *= 0.85; n.x += n.vx * alpha * 2; n.y += n.vy * alpha * 2;
    }
    alpha = Math.max(0, alpha - 0.004);
  }

  function tick() { if (alpha > 0.001) simulate(); draw(); requestAnimationFrame(tick); }
  function reheat(a) { alpha = Math.max(alpha, a || 0.3); }
  function resize() { var dpr = window.devicePixelRatio || 1; canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function worldToScreen(x, y) { return { x: (x + view.x) * view.k + canvas.clientWidth / 2, y: (y + view.y) * view.k + canvas.clientHeight / 2 }; }
  function screenToWorld(x, y) { return { x: (x - canvas.clientWidth / 2) / view.k - view.x, y: (y - canvas.clientHeight / 2) / view.k - view.y }; }

  function draw() {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    var i, e, n, p, q;
    for (i = 0; i < edges.length; i++) {
      e = edges[i]; p = worldToScreen(e.a.x, e.a.y); q = worldToScreen(e.b.x, e.b.y);
      ctx.strokeStyle = 'rgba(88,166,255,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    }
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i]; p = worldToScreen(n.x, n.y); var r = n.r * view.k;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(4, r), 0, Math.PI * 2);
      ctx.fillStyle = n.color || '#58a6ff'; ctx.fill();
      if (n === selected || n === hovered) { ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffff'; ctx.stroke(); }
      ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = '#f0f6fc'; ctx.fillText(n.label, p.x + Math.max(4, r) + 4, p.y + 4);
    }
  }

  function fitView() {
    if (!nodes.length) return;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(function (n) { minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x); minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y); });
    var w = Math.max(200, maxX - minX), h = Math.max(200, maxY - minY);
    view.k = Math.min(canvas.clientWidth / (w * 1.3), canvas.clientHeight / (h * 1.3), 2.2); view.x = -(minX + maxX) / 2; view.y = -(minY + maxY) / 2;
  }

  function select(n) { selected = n; renderDetail(); }
  function renderDetail() {
    var panel = document.getElementById('detail-panel');
    if (!selected) { panel.hidden = true; return; } panel.hidden = false;
    document.getElementById('detail-title').textContent = selected.id;
    var meta = document.getElementById('detail-meta'); meta.innerHTML = '';
    addRow(meta, 'Category', selected.layer); addRow(meta, 'Role', selected.sub || 'Ecosystem entity');
  }

  function addRow(parent, k, v) { var div = document.createElement('div'); div.className = 'meta-row'; var b = document.createElement('b'); b.textContent = k + ': '; div.appendChild(b); div.appendChild(document.createTextNode(v)); parent.appendChild(div); }
  function bindEvents() {
    window.addEventListener('resize', resize);
    document.getElementById('reset-view').addEventListener('click', fitView);
    document.getElementById('detail-close').addEventListener('click', function () { select(null); });
    canvas.addEventListener('mousedown', function (ev) { var w = screenToWorld(ev.offsetX, ev.offsetY); var n = nodeAt(w.x, w.y); if (n) { dragNode = n; n.fixed = true; } else { panning = true; } lastPointer = { x: ev.offsetX, y: ev.offsetY }; });
    canvas.addEventListener('mousemove', function (ev) {
      if (dragNode) { var w = screenToWorld(ev.offsetX, ev.offsetY); dragNode.x = w.x; dragNode.y = w.y; reheat(0.2); }
      else if (panning) { view.x += (ev.offsetX - lastPointer.x) / view.k; view.y += (ev.offsetY - lastPointer.y) / view.k; lastPointer = { x: ev.offsetX, y: ev.offsetY }; }
      else { var w2 = screenToWorld(ev.offsetX, ev.offsetY); hovered = nodeAt(w2.x, w2.y); canvas.style.cursor = hovered ? 'pointer' : 'default'; }
    });
    window.addEventListener('mouseup', function () { if (dragNode) { dragNode.fixed = false; dragNode = null; } panning = false; });
    canvas.addEventListener('click', function (ev) { var w = screenToWorld(ev.offsetX, ev.offsetY); var n = nodeAt(w.x, w.y); if (n) select(n); });
  }

  function nodeAt(x, y) {
    var best = null, bestD = Infinity;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i]; var dx = n.x - x, dy = n.y - y; var d = dx * dx + dy * dy; var hit = Math.max(n.r, 8 / view.k);
      if (d < hit * hit && d < bestD) { best = n; bestD = d; }
    }
    return best;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

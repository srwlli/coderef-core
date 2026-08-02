/*
 * coderef map viewer — vanilla JS canvas force-graph over MapData v1
 * (WO-GRAPHIFY-ALIGNMENT-PROJECTIONS-001 P2). No dependencies.
 */
(function () {
  'use strict';

  function boot() {
    var inline = window.__CODEREF_MAP_DATA__;
    if (inline && inline.nodes) {
      init(inline);
      return;
    }
    if (window.location.protocol === 'file:') {
      showEmpty('Data placeholder not filled and fetch is unavailable under file:.');
      return;
    }
    fetch('./data.json')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(init)
      .catch(function (err) {
        showEmpty('Failed to load ./data.json — ' + err.message);
      });
  }

  function showEmpty(message) {
    var el = document.getElementById('empty-state');
    el.textContent = message || el.textContent;
    el.hidden = false;
  }

  var DATA = null;
  var nodes = [];
  var edges = [];
  var nodeById = new Map();
  var outAdj = new Map();
  var inAdj = new Map();
  var cycleNodes = new Set();
  var cycleEdgeKeys = new Set();
  var hotspotRank = new Map();
  var maxHotspot = 1;
  var analytics = null;
  var communityOf = {};
  var deadSet = new Set();
  var drift = null;
  var layerColor = new Map();
  var outlierOf = new Map();
  var metrics = null;
  var metricKey = 'tests';
  var metricRange = { min: 0, max: 0 };
  var metricNoData = 0;
  var testFileSet = new Set();
  var api = null;
  var apiNodes = new Set();
  var apiEdgeKeys = new Set();
  var apiNetEdges = [];
  var apiServes = new Map();
  var apiCalls = new Map();

  var mode = { hotspots: false, cycles: false, communities: false, deadcode: false, drift: false, metrics: false, blast: false, api: false };
  var selected = null;
  var hovered = null;
  var blastDepths = new Map();

  var canvas, ctx;
  var view = { x: 0, y: 0, k: 1 };
  var alpha = 0;
  var dragNode = null;
  var panning = false;
  var lastPointer = { x: 0, y: 0 };

  var PALETTE = ['#4fc3f7', '#81c784', '#ffb74d', '#e57373', '#ba68c8',
    '#4db6ac', '#f06292', '#a1887f', '#90a4ae', '#dce775', '#7986cb', '#ff8a65'];
  var dirColor = new Map();

  function cssToken(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name);
      return (v && v.trim()) || fallback;
    } catch (err) {
      return fallback;
    }
  }

  var apiEdgeRGB = '38,166,154';

  function hexToRGB(hex, fallback) {
    var m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
    if (!m) return fallback;
    var n = parseInt(m[1], 16);
    return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
  }

  function colorForDir(dir) {
    var top = (dir || '').split('/')[0] || '(root)';
    if (!dirColor.has(top)) dirColor.set(top, PALETTE[dirColor.size % PALETTE.length]);
    return dirColor.get(top);
  }

  function init(data) {
    DATA = data;
    nodes = data.nodes.map(function (n) {
      return Object.assign({}, n, {
        x: (Math.random() - 0.5) * 1200,
        y: (Math.random() - 0.5) * 1200,
        vx: 0, vy: 0,
        r: 6 + Math.sqrt((n.elementCount || 0) + (n.hotspotScore || 0)) * 2,
        color: colorForDir(n.dir),
        fixed: false
      });
    });
    nodes.forEach(function (n) { nodeById.set(n.id, n); });
    edges = data.edges
      .filter(function (e) { return nodeById.has(e.source) && nodeById.has(e.target); })
      .map(function (e) {
        return Object.assign({}, e, { a: nodeById.get(e.source), b: nodeById.get(e.target) });
      });
    edges.forEach(function (e) {
      if (!outAdj.has(e.source)) outAdj.set(e.source, []);
      if (!inAdj.has(e.target)) inAdj.set(e.target, []);
      outAdj.get(e.source).push({ node: e.b, weight: e.weight, edge: e });
      inAdj.get(e.target).push({ node: e.a, weight: e.weight, edge: e });
    });

    document.getElementById('repo-name').textContent = data.meta.repoName || 'coderef map';
    document.getElementById('stats').textContent =
      nodes.length + ' files · ' + edges.length + ' edges · ' +
      (data.meta.source ? data.meta.source.elementCount + ' elements' : '');
    document.title = 'coderef map — ' + (data.meta.repoName || '');

    canvas = document.getElementById('graph-canvas');
    ctx = canvas.getContext('2d');
    bindEvents();
    resize();
    alpha = 1;
    requestAnimationFrame(tick);
    fitView();
  }

  var REPULSION = 3000;
  var SPRING = 0.02;
  var SPRING_LEN = 100;
  var GRAVITY = 0.03;
  var DAMPING = 0.85;

  function simulate() {
    var i, j, n, m, dx, dy, d2, d, f;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      for (j = i + 1; j < nodes.length; j++) {
        m = nodes[j];
        dx = n.x - m.x; dy = n.y - m.y;
        d2 = dx * dx + dy * dy + 0.01;
        if (d2 > 300000) continue;
        f = REPULSION / d2;
        dx *= f * 0.005; dy *= f * 0.005;
        n.vx += dx; n.vy += dy;
        m.vx -= dx; m.vy -= dy;
      }
      n.vx -= n.x * GRAVITY * 0.05;
      n.vy -= n.y * GRAVITY * 0.05;
    }
    for (i = 0; i < edges.length; i++) {
      var e = edges[i];
      dx = e.b.x - e.a.x; dy = e.b.y - e.a.y;
      d = Math.sqrt(dx * dx + dy * dy) + 0.01;
      f = SPRING * (d - SPRING_LEN) * Math.min(1, Math.log(1 + e.weight) / 2 + 0.4);
      dx = dx / d * f; dy = dy / d * f;
      e.a.vx += dx; e.a.vy += dy;
      e.b.vx -= dx; e.b.vy -= dy;
    }
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      if (n.fixed) { n.vx = 0; n.vy = 0; continue; }
      n.vx *= DAMPING; n.vy *= DAMPING;
      n.x += n.vx * alpha * 2;
      n.y += n.vy * alpha * 2;
    }
    alpha = Math.max(0, alpha - 0.0035);
  }

  function tick() {
    if (alpha > 0.001) simulate();
    draw();
    requestAnimationFrame(tick);
  }

  function reheat(a) { alpha = Math.max(alpha, a || 0.3); }

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function worldToScreen(x, y) {
    return { x: (x + view.x) * view.k + canvas.clientWidth / 2, y: (y + view.y) * view.k + canvas.clientHeight / 2 };
  }
  function screenToWorld(x, y) {
    return { x: (x - canvas.clientWidth / 2) / view.k - view.x, y: (y - canvas.clientHeight / 2) / view.k - view.y };
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    var i, e, n, p, q;
    for (i = 0; i < edges.length; i++) {
      e = edges[i];
      p = worldToScreen(e.a.x, e.a.y);
      q = worldToScreen(e.b.x, e.b.y);
      ctx.strokeStyle = 'rgba(88,166,255,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();

      if (view.k > 0.4) {
        var dx = q.x - p.x, dy = q.y - p.y, len = Math.sqrt(dx * dx + dy * dy) + 0.01;
        var ux = dx / len, uy = dy / len;
        var bx = q.x - ux * (e.b.r * view.k + 4), by = q.y - uy * (e.b.r * view.k + 4);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - ux * 7 - uy * 3.5, by - uy * 7 + ux * 3.5);
        ctx.lineTo(bx - ux * 7 + uy * 3.5, by - uy * 7 - ux * 3.5);
        ctx.closePath();
        ctx.fillStyle = 'rgba(88,166,255,0.7)';
        ctx.fill();
      }
    }
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      p = worldToScreen(n.x, n.y);
      var r = n.r * view.k;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(3, r), 0, Math.PI * 2);
      ctx.fillStyle = n.color || '#58a6ff';
      ctx.fill();
      if (n === selected || n === hovered) {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
      if (n === selected || n === hovered || view.k > 0.8) {
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillStyle = '#f0f6fc';
        ctx.fillText(n.label, p.x + Math.max(4, r) + 4, p.y + 4);
      }
    }
  }

  function fitView() {
    if (!nodes.length) return;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(function (n) {
      minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
    });
    var w = Math.max(200, maxX - minX), h = Math.max(200, maxY - minY);
    view.k = Math.min(canvas.clientWidth / (w * 1.3), canvas.clientHeight / (h * 1.3), 2.2);
    view.x = -(minX + maxX) / 2;
    view.y = -(minY + maxY) / 2;
  }

  function select(n) {
    selected = n;
    renderDetail();
  }

  function renderDetail() {
    var panel = document.getElementById('detail-panel');
    if (!selected) { panel.hidden = true; return; }
    panel.hidden = false;
    document.getElementById('detail-title').textContent = selected.id;
    var meta = document.getElementById('detail-meta');
    meta.innerHTML = '';
    addRow(meta, 'Layer', selected.layer || '—');
    addRow(meta, 'Elements', String(selected.elementCount));
    addRow(meta, 'In / Out Weight', 'In: ' + selected.inWeight + ' / Out: ' + selected.outWeight);

    var edgesBox = document.getElementById('detail-edges');
    edgesBox.innerHTML = '';
    appendEdgeList(edgesBox, 'Depends on (' + (outAdj.get(selected.id) || []).length + ')', outAdj.get(selected.id) || []);
    appendEdgeList(edgesBox, 'Used by (' + (inAdj.get(selected.id) || []).length + ')', inAdj.get(selected.id) || []);

    var elBox = document.getElementById('detail-elements');
    elBox.innerHTML = '';
    var h = document.createElement('h3');
    h.textContent = 'Elements';
    elBox.appendChild(h);
    var ul = document.createElement('ul');
    (selected.elements || []).forEach(function (el) {
      var li = document.createElement('li');
      li.textContent = el.type + ' ' + el.name + ':' + el.line;
      ul.appendChild(li);
    });
    elBox.appendChild(ul);
  }

  function addRow(parent, k, v) {
    var div = document.createElement('div');
    div.className = 'meta-row';
    var b = document.createElement('b');
    b.textContent = k + ': ';
    div.appendChild(b);
    div.appendChild(document.createTextNode(v));
    parent.appendChild(div);
  }

  function appendEdgeList(parent, title, links) {
    var h = document.createElement('h3');
    h.textContent = title;
    parent.appendChild(h);
    var ul = document.createElement('ul');
    links.forEach(function (link) {
      var li = document.createElement('li');
      var aEl = document.createElement('a');
      aEl.href = '#';
      aEl.textContent = link.node.id;
      aEl.addEventListener('click', function (ev) {
        ev.preventDefault();
        select(link.node);
      });
      li.appendChild(aEl);
      ul.appendChild(li);
    });
    parent.appendChild(ul);
  }

  function bindEvents() {
    window.addEventListener('resize', resize);
    var search = document.getElementById('search-input');
    search.addEventListener('input', function () {
      var q = (search.value || '').toLowerCase();
      if (!q) return;
      var hit = nodes.find(function(n) { return n.id.toLowerCase().includes(q); });
      if (hit) select(hit);
    });
    document.getElementById('reset-view').addEventListener('click', fitView);
    document.getElementById('detail-close').addEventListener('click', function () { select(null); });

    canvas.addEventListener('mousedown', function (ev) {
      var w = screenToWorld(ev.offsetX, ev.offsetY);
      var n = nodeAt(w.x, w.y);
      if (n) { dragNode = n; n.fixed = true; } else { panning = true; }
      lastPointer = { x: ev.offsetX, y: ev.offsetY };
    });
    canvas.addEventListener('mousemove', function (ev) {
      if (dragNode) {
        var w = screenToWorld(ev.offsetX, ev.offsetY);
        dragNode.x = w.x; dragNode.y = w.y;
        reheat(0.2);
      } else if (panning) {
        view.x += (ev.offsetX - lastPointer.x) / view.k;
        view.y += (ev.offsetY - lastPointer.y) / view.k;
        lastPointer = { x: ev.offsetX, y: ev.offsetY };
      } else {
        var w2 = screenToWorld(ev.offsetX, ev.offsetY);
        hovered = nodeAt(w2.x, w2.y);
        canvas.style.cursor = hovered ? 'pointer' : 'default';
      }
    });
    window.addEventListener('mouseup', function () {
      if (dragNode) { dragNode.fixed = false; dragNode = null; }
      panning = false;
    });
    canvas.addEventListener('click', function (ev) {
      var w = screenToWorld(ev.offsetX, ev.offsetY);
      var n = nodeAt(w.x, w.y);
      if (n) select(n);
    });
    canvas.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var factor = ev.deltaY < 0 ? 1.15 : 1 / 1.15;
      var before = screenToWorld(ev.offsetX, ev.offsetY);
      view.k = Math.min(6, Math.max(0.05, view.k * factor));
      var after = screenToWorld(ev.offsetX, ev.offsetY);
      view.x += after.x - before.x;
      view.y += after.y - before.y;
    }, { passive: false });
  }

  function nodeAt(x, y) {
    var best = null, bestD = Infinity;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var dx = n.x - x, dy = n.y - y;
      var d = dx * dx + dy * dy;
      var hit = Math.max(n.r, 8 / view.k);
      if (d < hit * hit && d < bestD) { best = n; bestD = d; }
    }
    return best;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

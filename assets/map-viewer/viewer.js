/*
 * coderef map viewer — vanilla JS canvas force-graph over MapData v1
 * (WO-GRAPHIFY-ALIGNMENT-PROJECTIONS-001 P2). No dependencies, no network
 * beyond the optional same-origin ./data.json fetch in serve mode.
 *
 * Data contract: src/map/project-map-data.ts (MapData). Static mode inlines
 * the data into graph.html via window.__CODEREF_MAP_DATA__; serve mode
 * fetches ./data.json.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------- data ----
  function boot() {
    var inline = window.__CODEREF_MAP_DATA__;
    if (inline && inline.nodes) {
      init(inline);
      return;
    }
    if (window.location.protocol === 'file:') {
      showEmpty('Data placeholder not filled and fetch is unavailable under file:. Re-run coderef-map.');
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

  // --------------------------------------------------------------- state ----
  var DATA = null;
  var nodes = [];            // MapNode + {x,y,vx,vy,r,color,fixed}
  var edges = [];            // MapEdge + {a,b} node refs
  var nodeById = new Map();
  var outAdj = new Map();    // id -> [{node, weight}]
  var inAdj = new Map();     // id -> [{node, weight}]
  var cycleNodes = new Set();
  var cycleEdgeKeys = new Set();
  var hotspotRank = new Map(); // id -> rank (0 = hottest)
  var maxHotspot = 1;
  var analytics = null;        // data.analytics (absent on pre-1.1.0 data.json)
  var communityOf = {};        // file -> community id
  var deadSet = new Set();     // isolated + zero-in-degree candidates

  var mode = { hotspots: false, cycles: false, communities: false, deadcode: false, blast: false };
  var selected = null;
  var hovered = null;
  var blastDepths = new Map(); // id -> 1|2 when blast mode active

  var canvas, ctx;
  var view = { x: 0, y: 0, k: 1 };  // pan/zoom transform
  var alpha = 0;                     // simulation heat
  var dragNode = null;
  var panning = false;
  var lastPointer = { x: 0, y: 0 };

  var PALETTE = ['#4fc3f7', '#81c784', '#ffb74d', '#e57373', '#ba68c8',
    '#4db6ac', '#f06292', '#a1887f', '#90a4ae', '#dce775', '#7986cb', '#ff8a65'];
  var dirColor = new Map();

  function colorForDir(dir) {
    var top = (dir || '').split('/')[0] || '(root)';
    if (!dirColor.has(top)) dirColor.set(top, PALETTE[dirColor.size % PALETTE.length]);
    return dirColor.get(top);
  }

  // ---------------------------------------------------------------- init ----
  function init(data) {
    DATA = data;
    nodes = data.nodes.map(function (n) {
      return Object.assign({}, n, {
        x: (Math.random() - 0.5) * 1200,
        y: (Math.random() - 0.5) * 1200,
        vx: 0, vy: 0,
        r: 4 + Math.sqrt((n.elementCount || 0) + (n.hotspotScore || 0)) * 1.5,
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
    (data.overlays && data.overlays.cycles || []).forEach(function (cycle) {
      cycle.forEach(function (f) { cycleNodes.add(f); });
      for (var i = 0; i < cycle.length; i++) {
        for (var j = 0; j < cycle.length; j++) {
          if (i !== j) cycleEdgeKeys.add(cycle[i] + ' ' + cycle[j]);
        }
      }
    });
    (data.overlays && data.overlays.hotspots || []).forEach(function (h, i) {
      hotspotRank.set(h.file, i);
      maxHotspot = Math.max(maxHotspot, h.score);
    });
    // Graph analytics (optional, schema-additive): older data.json has no
    // analytics block — the two overlay toggles disable gracefully.
    analytics = data.analytics || null;
    if (analytics) {
      communityOf = analytics.assignments || {};
      var dead = analytics.deadCode || {};
      (dead.isolated || []).forEach(function (f) { deadSet.add(f); });
      (dead.zeroInDegreeCandidates || []).forEach(function (f) { deadSet.add(f); });
    } else {
      ['toggle-communities', 'toggle-deadcode'].forEach(function (id) {
        var btn = document.getElementById(id);
        btn.disabled = true;
        btn.title += ' — unavailable: no analytics block in this data.json (regenerate the map)';
      });
    }

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

  // ---------------------------------------------------------- simulation ----
  var REPULSION = 2600;
  var SPRING = 0.015;
  var SPRING_LEN = 90;
  var GRAVITY = 0.03;
  var DAMPING = 0.85;

  function simulate() {
    var i, j, n, m, dx, dy, d2, d, f;
    var sample = nodes.length > 1200; // degrade gracefully on huge repos
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      // repulsion
      if (sample) {
        for (j = 0; j < 200; j++) {
          m = nodes[(Math.random() * nodes.length) | 0];
          if (m === n) continue;
          dx = n.x - m.x; dy = n.y - m.y;
          d2 = dx * dx + dy * dy + 0.01;
          if (d2 > 250000) continue;
          f = (REPULSION * (nodes.length / 200)) / d2;
          n.vx += dx * f * 0.005; n.vy += dy * f * 0.005;
        }
      } else {
        for (j = i + 1; j < nodes.length; j++) {
          m = nodes[j];
          dx = n.x - m.x; dy = n.y - m.y;
          d2 = dx * dx + dy * dy + 0.01;
          if (d2 > 250000) continue;
          f = REPULSION / d2;
          dx *= f * 0.005; dy *= f * 0.005;
          n.vx += dx; n.vy += dy;
          m.vx -= dx; m.vy -= dy;
        }
      }
      // gravity toward origin
      n.vx -= n.x * GRAVITY * 0.05;
      n.vy -= n.y * GRAVITY * 0.05;
    }
    // springs
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

  // ------------------------------------------------------------- drawing ----
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

  function nodeAlpha(n) {
    if (mode.blast && selected) {
      if (n === selected) return 1;
      var depth = blastDepths.get(n.id);
      return depth === 1 ? 0.95 : depth === 2 ? 0.7 : 0.08;
    }
    if (mode.cycles) return cycleNodes.has(n.id) ? 1 : 0.12;
    if (mode.deadcode) return deadSet.has(n.id) ? 1 : 0.12;
    if (mode.hotspots) return hotspotRank.has(n.id) ? 1 : 0.25;
    return 1;
  }

  function nodeFill(n) {
    if (mode.hotspots) {
      var t = Math.min(1, (n.hotspotScore || 0) / maxHotspot);
      var g = Math.round(210 - t * 170);
      return 'rgb(255,' + g + ',60)';
    }
    if (mode.cycles && cycleNodes.has(n.id)) return '#ff5252';
    if (mode.communities && communityOf[n.id] !== undefined) {
      return PALETTE[communityOf[n.id] % PALETTE.length];
    }
    if (mode.deadcode && deadSet.has(n.id)) return '#ff8a65';
    return n.color;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    var i, e, n, p, q;
    // edges
    for (i = 0; i < edges.length; i++) {
      e = edges[i];
      var ea = Math.min(nodeAlpha(e.a), nodeAlpha(e.b)) * 0.55;
      if (mode.cycles) {
        ea = cycleEdgeKeys.has(e.source + ' ' + e.target) ? 0.95 : 0.05;
      }
      if (ea < 0.02) continue;
      p = worldToScreen(e.a.x, e.a.y);
      q = worldToScreen(e.b.x, e.b.y);
      ctx.strokeStyle = (mode.cycles && cycleEdgeKeys.has(e.source + ' ' + e.target))
        ? 'rgba(255,82,82,' + ea + ')'
        : 'rgba(160,180,200,' + ea + ')';
      ctx.lineWidth = Math.min(4, 0.5 + Math.log(1 + e.weight) * 0.6);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
      // direction arrowhead
      if (view.k > 0.5 && ea > 0.3) {
        var dx = q.x - p.x, dy = q.y - p.y, len = Math.sqrt(dx * dx + dy * dy) + 0.01;
        var ux = dx / len, uy = dy / len;
        var bx = q.x - ux * (e.b.r * view.k + 4), by = q.y - uy * (e.b.r * view.k + 4);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - ux * 6 - uy * 3, by - uy * 6 + ux * 3);
        ctx.lineTo(bx - ux * 6 + uy * 3, by - uy * 6 - ux * 3);
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
      }
    }
    // nodes
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      var a = nodeAlpha(n);
      if (a < 0.02) continue;
      p = worldToScreen(n.x, n.y);
      var r = n.r * view.k;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(2, r), 0, Math.PI * 2);
      ctx.fillStyle = nodeFill(n);
      ctx.fill();
      if (n === selected || n === hovered) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
      // labels: selected/hovered always; others when zoomed in
      if (n === selected || n === hovered || view.k > 1.1 || (mode.hotspots && hotspotRank.get(n.id) < 10)) {
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(230,238,245,' + Math.min(1, a + 0.2) + ')';
        ctx.fillText(n.label, p.x + Math.max(3, r) + 3, p.y + 3);
      }
      ctx.globalAlpha = 1;
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
    view.k = Math.min(canvas.clientWidth / (w * 1.25), canvas.clientHeight / (h * 1.25), 2.5);
    view.x = -(minX + maxX) / 2;
    view.y = -(minY + maxY) / 2;
  }

  // ---------------------------------------------------------- blast mode ----
  function computeBlast() {
    blastDepths.clear();
    if (!selected) return;
    var frontier = [selected];
    for (var depth = 1; depth <= 2; depth++) {
      var next = [];
      frontier.forEach(function (n) {
        (outAdj.get(n.id) || []).concat(inAdj.get(n.id) || []).forEach(function (link) {
          var m = link.node;
          if (m === selected || blastDepths.has(m.id)) return;
          blastDepths.set(m.id, depth);
          next.push(m);
        });
      });
      frontier = next;
    }
  }

  // ------------------------------------------------------------ selection ----
  function select(n, focus) {
    selected = n;
    if (mode.blast) computeBlast();
    renderDetail();
    if (n && focus) {
      view.x = -n.x;
      view.y = -n.y;
      view.k = Math.max(view.k, 1.2);
    }
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
    addRow(meta, 'Hotspot score', selected.hotspotScore + '  (in ' + selected.inWeight + ' / out ' + selected.outWeight + ')');
    if (cycleNodes.has(selected.id)) addRow(meta, 'Cycle', 'member of a dependency cycle');
    if (analytics && communityOf[selected.id] !== undefined) {
      var cid = communityOf[selected.id];
      var community = (analytics.communities || []).filter(function (c) { return c.id === cid; })[0];
      addRow(meta, 'Community', '#' + cid + (community ? ' (' + community.label + ', ' + community.size + ' files)' : ''));
    }
    if (deadSet.has(selected.id)) {
      addRow(meta, 'Dead code', 'candidate (isolated or zero in-degree) — verify before removing');
    }

    var edgesBox = document.getElementById('detail-edges');
    edgesBox.innerHTML = '';
    appendEdgeList(edgesBox, 'Depends on (' + (outAdj.get(selected.id) || []).length + ')', outAdj.get(selected.id) || []);
    appendEdgeList(edgesBox, 'Used by (' + (inAdj.get(selected.id) || []).length + ')', inAdj.get(selected.id) || []);

    var elBox = document.getElementById('detail-elements');
    elBox.innerHTML = '';
    var h = document.createElement('h3');
    h.textContent = 'Elements' + (selected.elementsTruncated ? ' (first ' + selected.elements.length + ' of ' + selected.elementCount + ')' : '');
    elBox.appendChild(h);
    var ul = document.createElement('ul');
    selected.elements.forEach(function (el) {
      var li = document.createElement('li');
      li.textContent = el.type + ' ' + el.name + ':' + el.line + (el.exported ? ' (exported)' : '');
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
    links.slice().sort(function (a, b) { return b.weight - a.weight; }).slice(0, 30).forEach(function (link) {
      var li = document.createElement('li');
      var aEl = document.createElement('a');
      aEl.href = '#';
      aEl.textContent = link.node.id + ' (' + link.weight + ')';
      aEl.addEventListener('click', function (ev) {
        ev.preventDefault();
        select(link.node, true);
      });
      li.appendChild(aEl);
      // Per-edge evidence expander (MapData >= 1.2). Older data.json edges
      // have no evidence block — the row renders exactly as before.
      var evidence = link.edge && link.edge.evidence;
      if (evidence) {
        var toggle = document.createElement('a');
        toggle.href = '#';
        toggle.className = 'evidence-toggle';
        toggle.textContent = 'evidence';
        var box = buildEvidenceBox(link.edge, evidence);
        box.hidden = true;
        toggle.addEventListener('click', function (ev) {
          ev.preventDefault();
          box.hidden = !box.hidden;
        });
        li.appendChild(document.createTextNode(' '));
        li.appendChild(toggle);
        li.appendChild(box);
      }
      ul.appendChild(li);
    });
    parent.appendChild(ul);
  }

  function buildEvidenceBox(edge, evidence) {
    var box = document.createElement('div');
    box.className = 'edge-evidence';

    var kindParts = [];
    Object.keys(edge.kinds || {}).sort().forEach(function (k) {
      kindParts.push(k + ' ×' + edge.kinds[k]);
    });
    var provParts = [];
    Object.keys(evidence.provenance || {}).sort().forEach(function (p) {
      provParts.push(p + ' ' + evidence.provenance[p]);
    });
    var head = document.createElement('div');
    head.className = 'evidence-head';
    head.textContent = kindParts.join(', ') + (provParts.length ? ' — ' + provParts.join(' / ') : '');
    box.appendChild(head);

    var ul = document.createElement('ul');
    (evidence.samples || []).forEach(function (s) {
      var li = document.createElement('li');
      var line = s.line > 0 ? 'L' + s.line + ' ' : '';
      li.textContent = line + s.relationship + ' ' + s.detail + ' [' + s.provenance + ']';
      ul.appendChild(li);
    });
    box.appendChild(ul);

    if (evidence.samplesTruncated) {
      var more = document.createElement('div');
      more.className = 'evidence-note';
      more.textContent = 'showing first ' + (evidence.samples || []).length + ' of ' + edge.weight + ' underlying edges';
      box.appendChild(more);
    }
    if (evidence.ambiguous) {
      var amb = document.createElement('div');
      amb.className = 'evidence-note';
      amb.textContent = evidence.ambiguous.edgeCount + ' ambiguous call edge(s), ' +
        evidence.ambiguous.candidateCount + ' candidate(s) into this pair';
      box.appendChild(amb);
    }
    return box;
  }

  // -------------------------------------------------------------- search ----
  function runSearch(q) {
    var box = document.getElementById('search-results');
    box.innerHTML = '';
    if (!q || q.length < 2) { box.hidden = true; return; }
    q = q.toLowerCase();
    var hits = [];
    for (var i = 0; i < nodes.length && hits.length < 200; i++) {
      var n = nodes[i];
      if (n.id.toLowerCase().indexOf(q) !== -1) {
        hits.push({ node: n, label: n.id });
        continue;
      }
      for (var j = 0; j < n.elements.length; j++) {
        if (n.elements[j].name.toLowerCase().indexOf(q) !== -1) {
          hits.push({ node: n, label: n.elements[j].name + ' — ' + n.id });
          break;
        }
      }
    }
    hits.slice(0, 25).forEach(function (hit) {
      var div = document.createElement('div');
      div.className = 'search-hit';
      div.textContent = hit.label;
      div.addEventListener('click', function () {
        box.hidden = true;
        document.getElementById('search-input').value = '';
        select(hit.node, true);
      });
      box.appendChild(div);
    });
    box.hidden = hits.length === 0;
  }

  // -------------------------------------------------------------- events ----
  function setToggle(btn, on) {
    btn.classList.toggle('active', on);
  }

  function bindEvents() {
    window.addEventListener('resize', resize);

    var search = document.getElementById('search-input');
    search.addEventListener('input', function () { runSearch(search.value); });

    // Overlay toggles are mutually exclusive: turning one on clears the rest.
    function exclusiveToggle(key) {
      mode[key] = !mode[key];
      if (mode[key]) {
        ['hotspots', 'cycles', 'communities', 'deadcode', 'blast'].forEach(function (other) {
          if (other !== key) mode[other] = false;
        });
        if (key === 'blast') computeBlast();
      }
      syncToggles();
    }
    document.getElementById('toggle-hotspots').addEventListener('click', function () { exclusiveToggle('hotspots'); });
    document.getElementById('toggle-cycles').addEventListener('click', function () { exclusiveToggle('cycles'); });
    document.getElementById('toggle-communities').addEventListener('click', function () { exclusiveToggle('communities'); });
    document.getElementById('toggle-deadcode').addEventListener('click', function () { exclusiveToggle('deadcode'); });
    document.getElementById('toggle-blast').addEventListener('click', function () { exclusiveToggle('blast'); });
    document.getElementById('reset-view').addEventListener('click', function () {
      fitView();
    });
    document.getElementById('detail-close').addEventListener('click', function () {
      select(null);
    });

    canvas.addEventListener('mousedown', function (ev) {
      var w = screenToWorld(ev.offsetX, ev.offsetY);
      var n = nodeAt(w.x, w.y);
      if (n) {
        dragNode = n;
        n.fixed = true;
      } else {
        panning = true;
      }
      lastPointer = { x: ev.offsetX, y: ev.offsetY };
    });
    canvas.addEventListener('mousemove', function (ev) {
      if (dragNode) {
        var w = screenToWorld(ev.offsetX, ev.offsetY);
        dragNode.x = w.x;
        dragNode.y = w.y;
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
    window.addEventListener('mouseup', function (ev) {
      if (dragNode) {
        dragNode.fixed = false;
        dragNode = null;
      } else if (panning) {
        panning = false;
        // click (no drag): select node under cursor
        var moved = Math.abs(ev.offsetX - lastPointer.x) + Math.abs(ev.offsetY - lastPointer.y);
        if (ev.target === canvas && moved < 3) {
          var w = screenToWorld(lastPointer.x, lastPointer.y);
          select(nodeAt(w.x, w.y));
        }
      }
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

  function syncToggles() {
    setToggle(document.getElementById('toggle-hotspots'), mode.hotspots);
    setToggle(document.getElementById('toggle-cycles'), mode.cycles);
    setToggle(document.getElementById('toggle-communities'), mode.communities);
    setToggle(document.getElementById('toggle-deadcode'), mode.deadcode);
    setToggle(document.getElementById('toggle-blast'), mode.blast);
    if (mode.blast) computeBlast();
  }

  function nodeAt(x, y) {
    var best = null, bestD = Infinity;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var dx = n.x - x, dy = n.y - y;
      var d = dx * dx + dy * dy;
      var hit = Math.max(n.r, 6 / view.k);
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

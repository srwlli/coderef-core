/*
 * coderef map dashboard — prebuilt static renderer.
 *
 * Ported from the ASSISTANT-side build-mapdata-dashboard.mjs. That script built
 * the markup in Node at BUILD time; core analysis code never generates HTML, so
 * the same rendering runs HERE, client-side, against the substituted payload.
 *
 * THE TRI-STATE CONTRACT (load-bearing, not decoration):
 *   true  -> the fact is present and measured
 *   false -> measured, and provably absent
 *   null  -> NO DATA. Renders as an explicit no-data marker, NEVER as 0 and
 *            NEVER as clean. An absent measurement must never read as a
 *            healthy one.
 * Truncation is disclosed as a first-class badge for the same reason: a capped
 * ranking must never read as a complete one.
 */
(function () {
  'use strict';

  var data = window.__CODEREF_MAP_DATA__;
  var val = window.__CODEREF_VALIDATION__;

  function boot(d) {
    if (!d) {
      document.getElementById('empty-state').hidden = false;
      return;
    }
    render(d, val);
  }

  // Serve mode leaves the placeholder null; fetch the sibling bundle. The
  // validation report has no served counterpart and stays no-data.
  if (!data && typeof fetch === 'function' && location.protocol !== 'file:') {
    fetch('./data.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(boot)
      .catch(function () { boot(null); });
  } else {
    boot(data);
  }

  // ---------- helpers ----------
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function nf(n) { return typeof n === 'number' ? n.toLocaleString('en-US') : n; }

  var NO_DATA = '<span class="tri tri--nodata" title="No data — this was not measured">&#9678;&nbsp;no data</span>';

  /** The tri-state gate. null/undefined => no-data, never 0, never clean. */
  function stat(v, render) {
    if (v === null || v === undefined) return NO_DATA;
    return esc((render || nf)(v));
  }

  function pct(num, den, digits) {
    if (typeof num === 'number' && typeof den === 'number' && den > 0) {
      return ((num / den) * 100).toFixed(digits === undefined ? 1 : digits) + '%';
    }
    return null;
  }

  function noteBlock(text) {
    return text
      ? '<p class="panel__note"><span class="panel__note-mark">note</span>' + esc(text) + '</p>'
      : '';
  }

  /** Truncation is a first-class UI element, not a footnote. */
  function truncBadge(truncated, shown, total) {
    if (!truncated) return '';
    var of = typeof total === 'number' ? ' of ' + nf(total) : '';
    return '<span class="trunc" title="Ranking truncated — this is not the full list">&#9888; showing '
      + nf(shown) + of + '</span>';
  }

  function rankRows(rows, cols) {
    return rows.map(function (r) {
      return '<tr>' + cols.map(function (c) {
        return '<td class="' + (c.cls || '') + '">' + c.get(r) + '</td>';
      }).join('') + '</tr>';
    }).join('');
  }

  function panel(title, countHtml, bodyHtml, note) {
    return '<section class="panel"><div class="panel__head">'
      + '<span class="panel__title">' + title + '</span>'
      + (countHtml || '')
      + '</div>' + bodyHtml + noteBlock(note) + '</section>';
  }

  function table(head, bodyHtml) {
    return '<div class="scroll"><table><thead><tr>' + head + '</tr></thead><tbody>'
      + bodyHtml + '</tbody></table></div>';
  }

  // ---------- render ----------
  function render(d, v) {
    var meta = d.meta || {};
    var src = meta.source || {};
    var analytics = d.analytics || {};
    var metrics = d.metrics || {};
    var drift = d.drift || {};

    document.title = (meta.repoName || 'repo') + ' · code map';
    document.getElementById('head-repo').textContent = meta.repoName || 'repo';

    var chip = document.getElementById('graph-link');
    chip.innerHTML = 'MapData ' + esc(meta.schemaVersion || '?') + ' <span class="chip__arrow">&#8599;</span>';

    document.getElementById('meta-line').innerHTML =
      '<span>generated ' + esc(meta.generatedAt || 'unknown') + '</span>'
      + '<span>' + stat(src.nodeCount) + ' nodes / ' + stat(src.edgeCount) + ' edges</span>'
      + '<span>' + stat(src.elementCount) + ' elements</span>';

    var tl = (metrics.testLinkage && metrics.testLinkage.summary) || {};
    var ur = (metrics.unresolvedRefs && metrics.unresolvedRefs.summary) || {};

    // ---------- summary band ----------
    var cells = [
      {
        label: 'resolution',
        value: v && v.resolution_rate != null ? v.resolution_rate + '%' : pct(src.resolvedEdgeCount, src.edgeCount, 2),
        sub: (src.resolvedEdgeCount != null && src.edgeCount != null)
          ? nf(src.resolvedEdgeCount) + '/' + nf(src.edgeCount) + ' edges' : null,
      },
      {
        label: 'headers',
        value: v && v.header_coverage_pct != null ? v.header_coverage_pct + '%' : null,
        sub: v ? nf(v.header_defined_count) + ' defined &middot; ' + nf(v.header_missing_count) + ' missing' : null,
      },
      {
        label: 'test-linked',
        value: (tl.srcWithTestEdgeCount != null && tl.srcFileCount != null)
          ? nf(tl.srcWithTestEdgeCount) + '/' + nf(tl.srcFileCount) : null,
        sub: tl.srcWithoutTestEdgeCount != null ? nf(tl.srcWithoutTestEdgeCount) + ' without edge' : null,
      },
      {
        label: 'communities',
        value: analytics.communityCount != null ? analytics.communityCount : null,
        sub: analytics.communities ? nf(analytics.communities.length) + ' emitted' : null,
      },
      {
        label: 'drift outliers',
        value: drift.outliers ? drift.outliers.length : null,
        sub: drift.coverage
          ? nf(drift.coverage.declaredFileCount) + ' declared &middot; ' + nf(drift.coverage.undeclaredFileCount) + ' undeclared'
          : null,
      },
    ];

    document.getElementById('summary-band').innerHTML = cells.map(function (c) {
      return '<div class="stat">'
        + '<div class="stat__label">' + esc(c.label) + '</div>'
        + '<div class="stat__value">' + (c.value === null || c.value === undefined ? NO_DATA : esc(String(c.value))) + '</div>'
        + '<div class="stat__sub">' + (c.sub === null || c.sub === undefined ? '&mdash;' : c.sub) + '</div>'
        + '</div>';
    }).join('');

    // An absent validation report is DISCLOSED, never rendered as clean.
    document.getElementById('rates-line').innerHTML = v
      ? 'resolved-of-resolvable ' + esc(v.resolved_of_resolvable) + '% &middot; ambiguous '
        + esc(v.ambiguous_rate) + '% &middot; provisional ' + esc(v.provisional_rate) + '%'
      : 'validation-report.json absent — resolution sub-rates unavailable (no data)';

    // ---------- panels ----------
    var centrality = (analytics.centrality && analytics.centrality.top) || [];
    var coupling = (analytics.coupling && analytics.coupling.top) || [];
    var largest = (metrics.largestModules && metrics.largestModules.top) || [];
    var mostDeps = (metrics.mostDependencies && metrics.mostDependencies.top) || [];
    var pathCol = { get: function (r) { return '<span class="path">' + esc(r.file) + '</span>'; }, cls: 'path' };
    var out = [];

    out.push('<div class="grid">'
      + panel('Centrality',
          '<span class="panel__count">' + (analytics.centrality && analytics.centrality.betweennessApproximated
            ? 'betweenness approximated' : 'betweenness exact') + '</span>',
          table('<th>file</th><th class="num">deg</th><th class="num">in</th><th class="num">out</th><th class="num">btw</th>',
            rankRows(centrality.slice(0, 8), [
              pathCol,
              { get: function (r) { return nf(r.degree); }, cls: 'num' },
              { get: function (r) { return nf(r.inDegree); }, cls: 'num' },
              { get: function (r) { return nf(r.outDegree); }, cls: 'num' },
              { get: function (r) { return typeof r.betweenness === 'number' ? r.betweenness.toFixed(1) : NO_DATA; }, cls: 'num' },
            ])))
      + panel('Coupling',
          '<span class="panel__count">I = efferent / (efferent + afferent)</span>',
          table('<th>file</th><th class="num">aff</th><th class="num">eff</th><th class="num">I</th>',
            rankRows(coupling.slice(0, 8), [
              pathCol,
              { get: function (r) { return nf(r.afferent); }, cls: 'num' },
              { get: function (r) { return nf(r.efferent); }, cls: 'num' },
              { get: function (r) { return typeof r.instability === 'number' ? r.instability.toFixed(2) : NO_DATA; }, cls: 'num' },
            ])))
      + '</div>');

    // Test linkage: present / absent-proven / no-data are three distinct bands.
    var tlTotal = tl.srcFileCount || 0;
    var tlHas = tl.srcWithTestEdgeCount || 0;
    var tlNone = tl.srcWithoutTestEdgeCount || 0;
    var tlUnknown = Math.max(0, tlTotal - tlHas - tlNone);
    var w = function (n) { return tlTotal ? (n / tlTotal * 100).toFixed(2) : 0; };
    var subm = (metrics.testLinkage && metrics.testLinkage.subprocess && metrics.testLinkage.subprocess.summary) || null;

    out.push(panel('Test linkage',
      '<span class="panel__count">' + stat(tl.srcFileCount) + ' src files &middot; ' + stat(tl.testFileCount) + ' test files</span>',
      '<div class="bar">'
      + '<div class="bar__seg bar__seg--fact" style="width:' + w(tlHas) + '%"></div>'
      + '<div class="bar__seg bar__seg--absent" style="width:' + w(tlNone) + '%"></div>'
      + '<div class="bar__seg bar__seg--nodata" style="width:' + w(tlUnknown) + '%"></div>'
      + '</div><div class="legend-rows">'
      + '<div class="legend-row"><span class="tri tri--fact">&#9679; has test edge</span><span>' + nf(tlHas)
        + (tlTotal ? ' &middot; ' + (tlHas / tlTotal * 100).toFixed(1) + '%' : '') + '</span></div>'
      + '<div class="legend-row"><span class="tri tri--absent">&#9675; no test edge (measured)</span><span>' + nf(tlNone) + '</span></div>'
      + '<div class="legend-row"><span class="tri tri--nodata">&#9678; no data</span><span>' + nf(tlUnknown) + '</span></div>'
      + '</div>'
      + (subm ? '<p class="panel__note"><span class="panel__note-mark">subprocess</span>'
          + nf(subm.linkedSrcFileCount) + ' src files linked via ' + nf(subm.spawnRefCount) + ' spawn refs ('
          + nf(subm.testFilesScanned) + ' test files scanned, ' + nf(subm.testFilesWithSpawnRefs) + ' with spawn refs)</p>' : ''),
      metrics.testLinkage && metrics.testLinkage.note));

    out.push(panel('Unresolved references',
      truncBadge(metrics.unresolvedRefs && metrics.unresolvedRefs.topTruncated,
        ((metrics.unresolvedRefs && metrics.unresolvedRefs.top) || []).length, ur.fileCount),
      '<div class="legend-rows">'
      + '<div class="legend-row"><span>edges</span><span>' + stat(ur.edgeCount) + '</span></div>'
      + '<div class="legend-row"><span>unresolved</span><span>' + stat(ur.byStatus && ur.byStatus.unresolved) + '</span></div>'
      + '<div class="legend-row"><span>ambiguous</span><span>' + stat(ur.byStatus && ur.byStatus.ambiguous) + '</span></div>'
      + '<div class="legend-row"><span>files</span><span>' + stat(ur.fileCount) + '</span></div>'
      + '</div>',
      metrics.unresolvedRefs && metrics.unresolvedRefs.note));

    out.push('<div class="grid">'
      + panel('Largest modules',
          truncBadge(metrics.largestModules && metrics.largestModules.topTruncated, largest.length, null),
          table('<th>file</th><th class="num">elements</th>',
            rankRows(largest.slice(0, 8), [
              pathCol,
              { get: function (r) { return nf(r.elementCount); }, cls: 'num' },
            ])))
      + panel('Most dependencies',
          truncBadge(metrics.mostDependencies && metrics.mostDependencies.topTruncated, mostDeps.length, null),
          table('<th>file</th><th class="num">eff</th><th class="num">aff</th>',
            rankRows(mostDeps.slice(0, 8), [
              pathCol,
              { get: function (r) { return nf(r.efferent); }, cls: 'num' },
              { get: function (r) { return nf(r.afferent); }, cls: 'num' },
            ])))
      + '</div>');

    var dc = analytics.deadCode || {};
    out.push(panel('Dead code &mdash; candidates',
      '<span class="panel__count">' + stat(dc.entrypointExcludedCount) + ' entrypoints filtered out</span>',
      '<div class="legend-rows">'
      + '<div class="legend-row"><span>isolated (no edges either way)</span><span>' + stat(dc.isolated && dc.isolated.length) + '</span></div>'
      + '<div class="legend-row"><span>zero in-degree candidates</span><span>' + stat(dc.zeroInDegreeCandidates && dc.zeroInDegreeCandidates.length) + '</span></div>'
      + '</div>',
      dc.note));

    out.push(panel('Layer drift',
      '<span class="panel__count">' + stat(drift.coverage && drift.coverage.declaredFileCount) + ' declared &middot; '
        + stat(drift.coverage && drift.coverage.undeclaredFileCount) + ' undeclared</span>',
      table('<th>file</th><th>declared</th><th>detected (dominant)</th>',
        rankRows((drift.outliers || []).slice(0, 10), [
          pathCol,
          { get: function (r) { return '<span class="tri tri--absent">' + esc(r.layer || '—') + '</span>'; } },
          { get: function (r) {
              return '<span class="tri tri--fact">' + esc(r.dominantLayer || '—') + '</span> '
                + '<span class="panel__count">c' + esc(r.communityId) + '</span>';
            } },
        ])),
      drift.note));

    // Disclosures stay visible: truncation must never read as completeness.
    var warnings = Array.isArray(meta.warnings) ? meta.warnings : [];
    if (warnings.length) {
      out.push('<section class="disclose"><div class="disclose__title">&#9888; disclosures ('
        + warnings.length + ')</div><ul>'
        + warnings.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('')
        + '</ul></section>');
    }

    document.getElementById('panels').innerHTML = out.join('');

    if (metrics.note) {
      document.getElementById('foot').innerHTML += '<br>' + esc(metrics.note);
    }
  }
})();

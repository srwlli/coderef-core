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

  /**
   * A slice the RENDERER imposes is a truncation too. The bundle may carry 25
   * ranked rows while a panel draws 8 — undisclosed, that reads as "these are
   * all of them". Fires only when the slice actually drops rows.
   */
  function sliceBadge(shown, total) {
    return truncBadge(typeof total === 'number' && total > shown, shown, total);
  }

  /**
   * Disclosures are collected from EVERY block that emits them, not just meta.
   * meta/analytics/metrics/drift each carry an independent warnings[], and a
   * cap disclosed by one block but dropped on the floor is the same defect as
   * no disclosure at all — the panel would read as complete while the bundle
   * says it is not. Entries are LABELLED by origin rather than deduped: two
   * blocks independently reporting a cap is real signal, and collapsing them
   * under-reports. Every array is Array.isArray-guarded — an older or partial
   * bundle omitting one block contributes zero entries, never a crash.
   */
  function collectWarnings(d) {
    var out = [];
    [
      ['meta', d.meta],
      ['analytics', d.analytics],
      ['metrics', d.metrics],
      ['drift', d.drift],
      // api emits its own warnings[] — notably the unmatchedCap truncation
      // disclosure. Omitting it here would drop exactly the cap notice this
      // function exists to surface.
      ['api', d.api],
    ].forEach(function (pair) {
      var block = pair[1];
      var list = block && block.warnings;
      if (!Array.isArray(list)) return;
      list.forEach(function (text) { out.push({ origin: pair[0], text: text }); });
    });
    return out;
  }

  function rankRows(rows, cols) {
    return rows.map(function (r, i) {
      return '<tr>' + cols.map(function (c) {
        return '<td class="' + (c.cls || '') + '">' + c.get(r, i + 1) + '</td>';
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

  /**
   * A count sends you back to the CLI; a list is something you can act on.
   * Native <details> keeps this static — no framework, no fetch, no new
   * network. `truncated` is passed through rather than inferred: a COMPLETE
   * list must not carry a cap badge, and a capped one must.
   */
  function fileList(label, files, truncated, total) {
    if (!Array.isArray(files)) {
      return '<div class="legend-row"><span>' + esc(label) + '</span><span>' + NO_DATA + '</span></div>';
    }
    if (!files.length) {
      return '<div class="legend-row"><span>' + esc(label) + '</span>'
        + '<span class="tri tri--absent">&#9675; 0 &mdash; measured</span></div>';
    }
    return '<details class="filelist"><summary class="legend-row filelist__head">'
      + '<span>' + esc(label) + '</span>'
      + '<span>' + nf(files.length) + truncBadge(truncated, files.length, total) + '</span>'
      + '</summary><ul class="filelist__items">'
      + files.map(function (f) {
          return '<li><span class="path">' + esc(typeof f === 'string' ? f : (f && f.file)) + '</span></li>';
        }).join('')
      + '</ul></details>';
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

    // Provenance line — the equivalent of the retired source.json sidecar:
    // which bundle, which schema, when generated, and whether the validation
    // report was actually present. Kept ON the artifact so a dashboard that
    // gets copied somewhere still says what it was rendered from.
    document.getElementById('meta-line').innerHTML =
      '<span>generated ' + esc(meta.generatedAt || 'unknown') + '</span>'
      + '<span>MapData ' + esc(meta.schemaVersion || '?') + '</span>'
      + '<span>' + stat(src.nodeCount) + ' nodes / ' + stat(src.edgeCount) + ' edges</span>'
      + '<span>' + stat(src.elementCount) + ' elements</span>'
      + '<span>validation-report: ' + (v ? 'present' : '<span class="tri tri--nodata">absent</span>') + '</span>';

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
        // stat(), not nf(): a report present but missing one COUNT renders that
        // count as no-data. Bare nf() emitted the string "undefined" on screen —
        // the same contract break as an unrendered disclosure, one row over.
        sub: v ? stat(v.header_defined_count) + ' defined &middot; ' + stat(v.header_missing_count) + ' missing' : null,
      },
      {
        label: 'test-linked',
        value: (tl.srcWithTestEdgeCount != null && tl.srcFileCount != null)
          ? nf(tl.srcWithTestEdgeCount) + '/' + nf(tl.srcFileCount) : null,
        sub: tl.srcWithoutTestEdgeCount != null ? nf(tl.srcWithoutTestEdgeCount) + ' without edge' : null,
      },
      {
        // communityCount is the TOTAL; communities[] is the capped emission.
        // Showing "135" over "50 emitted" with no badge read as complete —
        // analytics.warnings says "communities truncated to 50 of 135" and that
        // disclosure was being dropped on the floor (see collectWarnings).
        label: 'communities',
        value: analytics.communityCount != null ? analytics.communityCount : null,
        sub: analytics.communities ? nf(analytics.communities.length) + ' emitted' : null,
        badge: analytics.communities
          ? sliceBadge(analytics.communities.length, analytics.communityCount)
          : '',
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
        + (c.badge ? '<div class="stat__badge">' + c.badge + '</div>' : '')
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
            ? 'betweenness approximated' : 'betweenness exact') + '</span>'
          + sliceBadge(Math.min(8, centrality.length), centrality.length),
          table('<th>file</th><th class="num">deg</th><th class="num">in</th><th class="num">out</th><th class="num">btw</th>',
            rankRows(centrality.slice(0, 8), [
              pathCol,
              { get: function (r) { return stat(r.degree); }, cls: 'num' },
              { get: function (r) { return stat(r.inDegree); }, cls: 'num' },
              { get: function (r) { return stat(r.outDegree); }, cls: 'num' },
              { get: function (r) { return typeof r.betweenness === 'number' ? r.betweenness.toFixed(1) : NO_DATA; }, cls: 'num' },
            ])))
      + panel('Coupling',
          '<span class="panel__count">I = efferent / (efferent + afferent)</span>'
          + sliceBadge(Math.min(8, coupling.length), coupling.length),
          table('<th>file</th><th class="num">aff</th><th class="num">eff</th><th class="num">I</th>',
            rankRows(coupling.slice(0, 8), [
              pathCol,
              { get: function (r) { return stat(r.afferent); }, cls: 'num' },
              { get: function (r) { return stat(r.efferent); }, cls: 'num' },
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
      // The names behind the count. zeroTestInEdgeTruncated drives the badge —
      // on this repo the list is COMPLETE, so it must not carry one.
      + fileList('files with no test edge',
          metrics.testLinkage && metrics.testLinkage.zeroTestInEdge,
          metrics.testLinkage && metrics.testLinkage.zeroTestInEdgeTruncated,
          tl.srcWithoutTestEdgeCount)
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
          truncBadge(metrics.largestModules && metrics.largestModules.topTruncated, largest.length, null)
          + sliceBadge(Math.min(8, largest.length), largest.length),
          table('<th>file</th><th class="num">elements</th>',
            rankRows(largest.slice(0, 8), [
              pathCol,
              { get: function (r) { return stat(r.elementCount); }, cls: 'num' },
            ])))
      + panel('Most dependencies',
          truncBadge(metrics.mostDependencies && metrics.mostDependencies.topTruncated, mostDeps.length, null)
          + sliceBadge(Math.min(8, mostDeps.length), mostDeps.length),
          table('<th>file</th><th class="num">eff</th><th class="num">aff</th>',
            rankRows(mostDeps.slice(0, 8), [
              pathCol,
              { get: function (r) { return stat(r.efferent); }, cls: 'num' },
              { get: function (r) { return stat(r.afferent); }, cls: 'num' },
            ])))
      + '</div>');

    // ---------- Hotspots ----------
    // overlays.hotspots is [{file, score}] — the ranked change-risk surface.
    var hotspots = (d.overlays && d.overlays.hotspots) || null;
    out.push(panel('Hotspots',
      Array.isArray(hotspots)
        ? '<span class="panel__count">' + nf(hotspots.length) + ' ranked</span>'
        : '',
      Array.isArray(hotspots)
        ? (hotspots.length
            ? table('<th>file</th><th class="num">score</th>',
                rankRows(hotspots.slice(0, 25), [
                  pathCol,
                  { get: function (r) { return stat(r.score); }, cls: 'num' },
                ]))
            : '<div class="legend-rows"><div class="legend-row">'
              + '<span class="tri tri--absent">&#9675; no hotspots (measured)</span>'
              + '<span>0</span></div></div>')
        : '<div class="legend-rows"><div class="legend-row"><span>hotspots</span><span>'
          + NO_DATA + '</span></div></div>',
      d.overlays && d.overlays.hotspotsNote));

    // ---------- Cycles ----------
    // THREE states, and the distinction is the point: a populated array lists
    // the cycles; an EMPTY array is a measured zero (this repo drove cycles
    // 2 -> 0, which is a real result worth stating); an ABSENT block is no-data.
    // Collapsing measured-zero into no-data would erase evidence of the fix.
    var cycles = (d.overlays && d.overlays.cycles) || null;
    out.push(panel('Cycles',
      Array.isArray(cycles)
        ? '<span class="panel__count">file-level dependency cycles</span>' : '',
      !Array.isArray(cycles)
        ? '<div class="legend-rows"><div class="legend-row"><span>cycles</span><span>'
          + NO_DATA + '</span></div></div>'
        : (cycles.length
            ? table('<th class="num">#</th><th>cycle</th>',
                rankRows(cycles.slice(0, 20), [
                  { get: function (_r, i) { return String(i); }, cls: 'num' },
                  { get: function (r) {
                      var members = Array.isArray(r) ? r : (r && r.path) || [];
                      return '<span class="path">' + esc(members.join(' → ')) + '</span>';
                    }, cls: 'path' },
                ]))
              + sliceBadge(Math.min(20, cycles.length), cycles.length)
            : '<div class="legend-rows"><div class="legend-row">'
              + '<span class="tri tri--absent">&#9675; 0 &mdash; measured</span>'
              + '<span>no cycles detected</span></div></div>')));

    // ---------- Documentation ----------
    var docs = metrics.documentation || null;
    var docSum = (docs && docs.summary) || {};
    var nonDef = (docs && docs.topNonDefined) || null;
    out.push(panel('Documentation',
      docs ? '<span class="panel__count">semantic-header coverage</span>' : '',
      !docs
        ? '<div class="legend-rows"><div class="legend-row"><span>documentation</span><span>'
          + NO_DATA + '</span></div></div>'
        : '<div class="legend-rows">'
          + '<div class="legend-row"><span>elements defined</span><span>'
            + stat(docSum.byStatus && docSum.byStatus.defined) + ' / ' + stat(docSum.totalElements)
            + '</span></div>'
          + '<div class="legend-row"><span>missing</span><span>'
            + stat(docSum.byStatus && docSum.byStatus.missing) + '</span></div>'
          + '<div class="legend-row"><span>indexed files</span><span>'
            + stat(docSum.indexedFileCount) + '</span></div>'
          + '<div class="legend-row"><span>files with non-defined</span><span>'
            + stat(docSum.filesWithNonDefinedCount) + '</span></div>'
          + '</div>'
          // A populated count with an EMPTY list means the names were not
          // emitted — that is no-data for the names, never "no such files".
          + (Array.isArray(nonDef) && nonDef.length
              ? table('<th>file</th><th class="num">non-defined</th><th class="num">total</th>',
                  rankRows(nonDef.slice(0, 10), [
                    pathCol,
                    { get: function (r) { return stat(r.nonDefined); }, cls: 'num' },
                    { get: function (r) { return stat(r.total); }, cls: 'num' },
                  ]))
                + truncBadge(docs.topNonDefinedTruncated, nonDef.length, docSum.filesWithNonDefinedCount)
              : (docSum.filesWithNonDefinedCount
                  ? '<p class="panel__note"><span class="panel__note-mark">names</span>'
                    + 'file names not emitted in this bundle &mdash; ' + NO_DATA + '</p>'
                  : '')),
      docs && docs.note));

    // ---------- Bridges ----------
    // NOTE: members are BARE STRINGS, not {file} objects. pathCol would read
    // r.file and render blanks that look like no-data.
    var bridges = analytics.bridges || null;
    out.push(panel('Bridges',
      Array.isArray(bridges)
        ? '<span class="panel__count">' + nf(bridges.length) + ' cross-community seams</span>'
          + truncBadge(
              /bridges truncated/i.test((analytics.warnings || []).join(' ')),
              bridges.length, null)
        : '',
      !Array.isArray(bridges)
        ? '<div class="legend-rows"><div class="legend-row"><span>bridges</span><span>'
          + NO_DATA + '</span></div></div>'
        : (bridges.length
            ? table('<th>file</th>',
                rankRows(bridges.slice(0, 15), [
                  { get: function (r) {
                      return '<span class="path">' + esc(typeof r === 'string' ? r : (r && r.file)) + '</span>';
                    }, cls: 'path' },
                ]))
              + sliceBadge(Math.min(15, bridges.length), bridges.length)
            : '<div class="legend-rows"><div class="legend-row">'
              + '<span class="tri tri--absent">&#9675; 0 &mdash; measured</span>'
              + '<span>no bridges detected</span></div></div>')));

    var dc = analytics.deadCode || {};
    out.push(panel('Dead code &mdash; candidates',
      '<span class="panel__count">' + stat(dc.entrypointExcludedCount) + ' entrypoints filtered out</span>',
      '<div class="legend-rows">'
      + fileList('isolated (no edges either way)', dc.isolated, dc.isolatedTruncated)
      + fileList('zero in-degree candidates', dc.zeroInDegreeCandidates, dc.zeroInDegreeCandidatesTruncated)
      + '</div>',
      dc.note));

    var outliers = drift.outliers || [];
    out.push(panel('Layer drift',
      '<span class="panel__count">' + stat(drift.coverage && drift.coverage.declaredFileCount) + ' declared &middot; '
        + stat(drift.coverage && drift.coverage.undeclaredFileCount) + ' undeclared</span>'
        + truncBadge(drift.outliersTruncated, outliers.length, null)
        + sliceBadge(Math.min(10, outliers.length), outliers.length),
      table('<th>file</th><th>declared</th><th>detected (dominant)</th>',
        rankRows(outliers.slice(0, 10), [
          pathCol,
          { get: function (r) { return '<span class="tri tri--absent">' + esc(r.layer || '—') + '</span>'; } },
          { get: function (r) {
              return '<span class="tri tri--fact">' + esc(r.dominantLayer || '—') + '</span> '
                + '<span class="panel__count">c' + esc(r.communityId) + '</span>';
            } },
        ])),
      drift.note));

    // ---------- Worth reading: hotspot ∩ no-test-edge ----------
    // A CROSS-REFERENCE of two published lists, NOT a derived score and NOT a
    // coverage verdict.
    //
    // WHY THE FRAMING IS LOAD-BEARING: on this repo the intersection returns 4
    // files and THREE are false positives. src/cli/mcp/{shared,graph-tools,
    // verify-tools}.ts are exercised by 154 passing MCP tests — but the coverage
    // arrives through a barrel (mcp-server.test.ts imports coderef-mcp-server.js,
    // which imports all six mcp/* modules), and the FILE-level graph cannot
    // traverse that hop. Labelling these "untested" would ship a false verdict
    // into every indexed repo. They are files worth READING, nothing more.
    var hotspotList = (d.overlays && d.overlays.hotspots) || null;
    var zeroTest = metrics.testLinkage && metrics.testLinkage.zeroTestInEdge;
    if (Array.isArray(hotspotList) && Array.isArray(zeroTest)) {
      var zeroSet = {};
      zeroTest.forEach(function (f) { zeroSet[typeof f === 'string' ? f : (f && f.file)] = true; });
      var both = hotspotList.filter(function (h) { return zeroSet[h.file]; });
      out.push(panel('Worth reading &mdash; ranked high, no test edge recorded',
        '<span class="panel__count">' + nf(both.length) + ' of ' + nf(hotspotList.length)
          + ' ranked files</span>',
        (both.length
          ? table('<th>file</th><th class="num">hotspot score</th>',
              rankRows(both.slice(0, 15), [
                pathCol,
                { get: function (r) { return stat(r.score); }, cls: 'num' },
              ]))
            + sliceBadge(Math.min(15, both.length), both.length)
          : '<div class="legend-rows"><div class="legend-row">'
            + '<span class="tri tri--absent">&#9675; 0 &mdash; measured</span>'
            + '<span>no ranked file lacks a test edge</span></div></div>')
        + '<p class="panel__note"><span class="panel__note-mark">read first</span>'
        + 'A file here is a candidate to READ, not a coverage verdict. Coverage that '
        + 'reaches a module through a re-exporting barrel, a subprocess, or an '
        + 'integration path is invisible to the file-level graph &mdash; a file can be '
        + 'thoroughly tested and still appear in this list.</p>',
        metrics.testLinkage && metrics.testLinkage.note));
    }

    // ---------- API surface ----------
    // THE TRI-STATE IS THE WHOLE POINT OF THIS PANEL (P1-T9). Three states,
    // three distinguishable renderings, and they must never collapse:
    //   d.api ABSENT      -> UNKNOWN. The route producer never ran. This is
    //                        NO-DATA and is rendered with the no-data marker,
    //                        never as "no API" and never as a clean zero.
    //   d.api, count 0    -> a MEASURED zero. This project serves no routes.
    //   d.api, count > 0  -> the tables.
    // The middle and top states look nearly identical if written carelessly —
    // "0 endpoints" for both — which is exactly the failure this contract
    // exists to prevent.
    var api = d.api || null;
    if (!api) {
      out.push(panel('API surface',
        '<span class="panel__count">' + NO_DATA + '</span>',
        '<div class="legend-rows"><div class="legend-row">'
        + '<span class="tri tri--nodata">&#9678;&nbsp;unknown</span>'
        + '<span>The route producer has not run for this project, so the API '
        + 'surface was never measured. This is missing data &mdash; it does '
        + 'NOT mean the project serves no endpoints.</span>'
        + '</div></div>',
        'Run the scanner with route detection enabled to populate this block.'));
    } else {
      var asum = api.summary || {};
      var endpoints = api.endpoints || [];
      var unmatched = api.unmatchedCalls || [];
      var netEdges = api.networkEdges || [];

      var apiBody;
      if (!endpoints.length) {
        // MEASURED zero — deliberately worded so it cannot be mistaken for the
        // absent case above.
        apiBody = '<div class="legend-rows"><div class="legend-row">'
          + '<span class="tri tri--absent">&#9675; 0 &mdash; measured</span>'
          + '<span>No endpoints served: route detection ran and found this '
          + 'project serves zero routes.</span>'
          + '</div></div>';
      } else {
        apiBody = table(
          '<th>path</th><th>method</th><th>frameworks</th><th>handlers</th>'
          + '<th>callers</th><th>callers found</th>',
          rankRows(endpoints.slice(0, 25), [
            { get: function (r) { return '<span class="path">' + esc(r.path || '—') + '</span>'; } },
            { get: function (r) { return esc(r.method || 'ANY'); } },
            { get: function (r) { return esc((r.frameworks || []).join(', ') || '—'); } },
            { get: function (r) { return esc((r.handlers || []).join(', ') || '—'); } },
            { get: function (r) { return esc((r.callers || []).join(', ') || '—'); } },
            // ORPHANED IS A SURFACE, NOT A VERDICT. It means no resolved caller
            // was found IN THIS REPO — the expected, correct state for a public
            // API, a mobile client, or a server-to-server caller. Rendered with
            // the neutral tri--absent marker, deliberately NOT a warning or
            // error style: styling it as a problem would ship a false verdict
            // into every repo with an externally-consumed API.
            { get: function (r) {
                return r.orphaned
                  ? '<span class="tri tri--absent">&#9675; none in this repo</span>'
                  : '<span class="tri tri--fact">' + nf((r.callers || []).length) + '</span>';
              } },
          ]))
          + sliceBadge(Math.min(25, endpoints.length), endpoints.length);
      }

      // Unmatched calls: every reason spelled out in prose. A bare enum name
      // tells a reader nothing about whether it is their bug or a limit of the
      // detector.
      var REASONS = {
        endpoint_not_in_project: '404-shaped — the path is served nowhere in this project',
        endpoint_method_not_served: '405-shaped — the path is served, but not for this verb',
        client_path_origin_unresolved: 'interpolated base URL (`${base}/x`) — the origin cannot be known statically',
        absolute_url_external_origin: 'an external host — a different authority, correctly not matched here',
      };
      var byReason = asum.byReason || {};
      var reasonKeys = Object.keys(byReason).sort();
      var unmatchedBody = reasonKeys.length
        ? table('<th>reason</th><th class="num">calls</th><th>what it means</th>',
            rankRows(reasonKeys, [
              { get: function (k) { return '<span class="tri tri--absent">' + esc(k) + '</span>'; } },
              { get: function (k) { return stat(byReason[k]); }, cls: 'num' },
              { get: function (k) { return esc(REASONS[k] || 'unrecognized reason code'); } },
            ]))
          + (unmatched.length
              ? '<details class="filelist"><summary class="legend-row filelist__head">'
                + '<span>call sites</span><span>' + nf(unmatched.length) + '</span></summary>'
                + '<ul class="filelist__items">'
                + unmatched.slice(0, 50).map(function (c) {
                    return '<li><span class="path">' + esc(c.file) + ':' + esc(c.line) + '</span> '
                      + esc(c.method || '') + ' ' + esc(c.path || '')
                      + (c.rawPath && c.rawPath !== c.path
                          ? ' <span class="panel__count">as written: ' + esc(c.rawPath) + '</span>'
                          : '')
                      + '</li>';
                  }).join('')
                + '</ul></details>'
                + sliceBadge(Math.min(50, unmatched.length), unmatched.length)
              : '')
        : '<div class="legend-rows"><div class="legend-row">'
          + '<span class="tri tri--absent">&#9675; 0 &mdash; measured</span>'
          + '<span>every detected client call bound to a served endpoint</span>'
          + '</div></div>';

      out.push(panel('API surface',
        '<span class="panel__count">' + stat(asum.endpointCount) + ' endpoints &middot; '
          + stat(asum.orphanedCount) + ' with no in-repo caller &middot; '
          + nf(netEdges.length) + ' network hops</span>',
        apiBody
        + '<p class="panel__note"><span class="panel__note-mark">surfaces</span>'
        + '&ldquo;No callers in this repo&rdquo; is not dead code. A public API, a '
        + 'mobile client, or a server-to-server caller lives outside this '
        + 'repository and cannot be seen from here.</p>',
        null));

      out.push(panel('API calls that did not bind',
        '<span class="panel__count">' + stat(asum.unmatchedCallCount) + ' unmatched &middot; '
          + stat(asum.resolvedCallCount) + ' resolved</span>',
        unmatchedBody,
        'Each reason distinguishes a never-built endpoint from a wrong-verb call '
        + 'from an origin that cannot be resolved statically.'));
    }

    // Disclosures stay visible: truncation must never read as completeness.
    // All four emitting blocks are collected, each entry tagged with its origin.
    var warnings = collectWarnings(d);
    if (warnings.length) {
      out.push('<section class="disclose"><div class="disclose__title">&#9888; disclosures ('
        + warnings.length + ')</div><ul>'
        + warnings.map(function (x) {
            return '<li><span class="disclose__origin">' + esc(x.origin) + '</span>'
              + esc(x.text) + '</li>';
          }).join('')
        + '</ul></section>');
    }

    document.getElementById('panels').innerHTML = out.join('');

    if (metrics.note) {
      document.getElementById('foot').innerHTML += '<br>' + esc(metrics.note);
    }
  }

  // ---------- boot ----------
  // Deliberately LAST. `var NO_DATA` (and the helper vars) hoist as `undefined`,
  // so booting above their assignments made every no-data marker render as the
  // literal string "undefined" — a tri-state break that only surfaced once
  // panels started emitting NO_DATA from the top level of render().
  //
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
})();

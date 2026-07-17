---
title: CodeRef Repo Map — User Guide
status: living
updated: 2026-07-17
audience: developer
difficulty: beginner
estimated_time: 15 minutes
tracks: src/map/, assets/map-viewer/, src/cli/coderef-map.ts, src/cli/coderef-mcp-server.ts (map tool)
---

# CodeRef Repo Map — User Guide

The repo map is an interactive, file-level picture of any repo that has been scanned into `.coderef/`: every file is a node, every aggregated import/call relationship is an edge, and four enrichment blocks — graph analytics, per-edge evidence, layer drift, and engineering metrics — layer signal on top. This guide walks you from a bare repo to exploring the map in the browser (or from an agent), and explains how to read what it shows you without over-reading it.

## Table of Contents

- [Purpose](#purpose)
- [Prerequisites](#prerequisites)
- [Steps](#steps) — scan · generate · serve · explore the viewer · read the Metrics overlay · agent path · read data.json
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Revision History](#revision-history)

## Purpose

Use the map when you want to *see* a codebase instead of grepping it: which files cluster together, where the hotspots and cycles are, which modules bridge otherwise-separate regions, where declared architecture disagrees with detected structure, and which files carry engineering risk signals (no test in-edges, non-defined semantic headers, unresolved references, unusual size or coupling).

Two audiences share one identical data set (`MapData`, schema v1.4):

- **Humans** use the bundled viewer (`graph.html`) — canvas force layout, search, detail panel, and exclusive overlay toggles.
- **Agents** use the MCP `map` tool, which returns triage-ready summary counts plus `data_path` to the full `data.json`. The `/coderef-map` skill wraps the same surface.

One framing rule governs everything here: **every block is a surface, not a verdict.** The map tells you *where to look*, never *what is wrong*. A file with zero test in-edges is a candidate for attention, not proven-untested; a missing block is missing data, not a zero.

## Prerequisites

- Node.js ≥ 18 and a built `@coderef/core` (`npm install && npm run build`), or the package on your PATH.
- A **scanned target repo**: `.coderef/index.json` and `.coderef/graph.json` must exist. If they don't, run `npx populate-coderef <repo>` first — the map is a *projection* of scan artifacts; it never scans source itself.
- Optional, for the layer-drift spec surfaces: a `layers.json` architecture spec (passed explicitly via `--layers <path>`; never auto-resolved).
- A modern browser. The viewer bundle is fully self-contained — no CDN, no network access needed.

## Steps

### 1. Scan (or refresh) the target repo

```bash
npx populate-coderef .
```

Re-run this after meaningful code changes — the map is only as fresh as the scan underneath it.

### 2. Generate the static map

```bash
npx coderef-map .
```

This writes a self-contained bundle to `.coderef/map/`:

| File | What it is |
|---|---|
| `data.json` | The full MapData document (nodes, edges, analytics, evidence, drift, metrics) |
| `graph.html` | The viewer with the data **inlined** — double-click to open, no server needed |
| `viewer.js` / `viewer.css` | Viewer assets referenced by `graph.html` |

### 3. Or serve it live

```bash
npx coderef-map . --serve --port 8123
```

Serve mode hosts the same viewer in fetch mode at `http://localhost:8123/graph.html`. Use it when you're iterating (regenerate, refresh browser). Add `--layers path/to/layers.json` to enable the declared-architecture drift surfaces, and `--no-open` to suppress the browser launch.

### 4. Explore the viewer

- **Search** — type in the search box; hits list matching files; click one to select and center it.
- **Detail panel** — selecting a node shows its path, element count, declared layer, and its in/out edge lists. Edges that carry an evidence block get an expander showing *why the edge exists* (explicit import vs inferred call, line-sorted samples, ambiguous-candidate counts). When the data has them, the panel also shows a **Drift** row (declared vs community-dominant layer) and a **Metrics** row (test in-edges, non-defined headers, unresolved refs, deps out/in).
- **Overlay toggles** (mutually exclusive — turning one on clears the rest):

| Toggle | Colors nodes by | Ships since |
|---|---|---|
| Hotspots | in-degree concentration | v1.0 |
| Cycles | membership in dependency cycles | v1.0 |
| Communities | label-propagation community | v1.1 |
| Dead code | isolated / zero-in-degree candidates | v1.1 |
| Layer drift | declared layer, amber rings on outliers | v1.3 |
| Metrics | selected metric family (gradient) | v1.4 |
| Blast radius | 1–2 hop impact from the selected node | v1.0 |

### 5. Read the Metrics overlay

Turning on **Metrics** reveals a family selector and a legend strip. Node color runs a two-stop gradient (blue `#1e88e5` = low → amber `#ffca28` = high) over the selected family's observed range; **gray nodes mean *no data*, which is different from zero**.

| Family | Per-node value | No-data (gray) means |
|---|---|---|
| Test in-edges | count of distinct test files importing/calling this file | the node *is* a test file (not a candidate) |
| Non-defined headers | elements whose semantic header is missing/stale/partial | file has no `index.json` element data |
| Unresolved refs | unresolved + ambiguous raw references originating here | — (absence = observed zero) |
| Module size | element count | — |
| Dependencies | distinct outbound file dependencies | — |

The legend always ends with the reminder: *surfaces, not verdicts*.

### 6. Agent path (MCP / skill)

Agents call the MCP `map` tool (server `coderef-core`, `project_root` required). It regenerates the map when `graph.json` is newer (or on `refresh: true`) and returns summary fields — `node_count`, `edge_count`, `community_count`, `isolated_count`, `evidence_edge_count`, `declared_layer_count`, `drift_outlier_count`, `untested_src_count`, `undocumented_file_count` — plus `data_path` for deep reads. The last two are `null` on pre-1.4 data. See [AGENT-CONTRACT.md](./AGENT-CONTRACT.md) for the consumption contract.

### 7. Read `data.json` directly (optional)

Top-level shape (all enrichment blocks schema-additive, each independently disableable at generation time):

- `meta` — `schemaVersion` (`1.4.0`), repo name, counts, and `warnings[]` (every truncation the generator applied is declared here — silence means nothing was dropped).
- `nodes[]` / `edges[]` — files and aggregated relationships; edges carry `evidence` (provenance class, capped line-sorted samples, ambiguity counts).
- `analytics` — communities + per-file assignments, degree/betweenness centrality (exact ≤500 files, stride-sampled above), bridge nodes, Ce/Ca coupling, dead-code candidates.
- `drift` — declared-layer coverage, layer→layer dependency matrix, per-community composition/purity, outliers; plus vocabulary/invariant surfaces when a `--layers` spec was provided.
- `metrics` — the five families above. File-bounded records are complete (uncapped); *rankings* are capped (25; zero-test list 200) with one aggregate warning each.

## Verification

After step 2 you should have `.coderef/map/{data.json, graph.html, viewer.js, viewer.css}`. Open the viewer and check:

- The stats bar shows non-zero files/edges/elements counts.
- All toggles are enabled. A **disabled** toggle with a tooltip like *"unavailable: no metrics block in this data.json (regenerate the map)"* means your `data.json` predates that block's schema version — re-run `coderef-map` (the viewer intentionally degrades instead of breaking on old data).
- Metrics on → legend shows the family name, its value range, a `no data (N)` chip, and the *surfaces, not verdicts* note; selecting a node shows the Metrics row in the detail panel.
- For agents: the `map` tool response has non-null `untested_src_count` / `undocumented_file_count`.

## Troubleshooting

- **`coderef-map` errors about missing `.coderef` artifacts** — the target was never scanned (or `--output` moved the artifacts). Run `npx populate-coderef <repo>` first.
- **A toggle is grayed out** — the served `data.json` is older than that feature (pre-1.1 analytics, pre-1.3 drift, pre-1.4 metrics). Regenerate with the current CLI; the tooltip names the missing block.
- **`EADDRINUSE` on `--serve`** — an earlier serve process still owns the port. Kill it or pass a fresh `--port`.
- **Console shows a 404 for `/favicon.ico`** — harmless; the bundle ships no favicon. Any *other* console error is worth reporting.
- **Numbers look "wrong" (e.g. a shared utility flagged as untested)** — check the interpretation rules first: gray = no data ≠ zero; rankings are capped (see `meta.warnings`); betweenness is sampled on repos >500 files; test linkage is a heuristic over test-file naming (`.test.` / `.spec.` / test directories). The map surfaces candidates — confirm in the code before acting.
- **Drift spec surfaces absent** — `layers.json` is explicit opt-in (`--layers <path>`); without it you still get declared-vs-detected drift from in-repo header declarations, but not vocabulary/invariant checks.

## Revision History

| Date | Change |
|---|---|
| 2026-07-17 | Initial guide — covers MapData v1.4 (analytics, evidence, drift, metrics; WO-GRAPHIFY-ALIGNMENT-PROJECTIONS-001 + WO-MAP-GRAPH-ANALYTICS-MODULE-001) |

---

Created: 2026-07-17 (WO-MAP-GRAPH-ANALYTICS-MODULE-001 close-out) · Last updated: 2026-07-17 · Maintained by: coderef-core · See also: [docs/CLI.md](./CLI.md#coderef-map), [docs/AGENT-CONTRACT.md](./AGENT-CONTRACT.md)

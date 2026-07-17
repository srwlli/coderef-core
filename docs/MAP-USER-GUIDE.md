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

The repo map is an interactive, file-level picture of any repo that has been scanned into `.coderef/`: every file is a node, every aggregated import/call relationship is an edge, and enrichment blocks — graph analytics, per-edge evidence, layer drift, engineering metrics, and an opt-in git-behavioral block — layer signal on top. This guide walks you from a bare repo to exploring the map in the browser (or from an agent), and explains how to read what it shows you without over-reading it.

## Table of Contents

- [Purpose](#purpose)
- [Prerequisites](#prerequisites)
- [Steps](#steps) — scan · generate · serve · explore the viewer · read the Metrics overlay · agent path · read data.json · skeleton map · git-behavioral block
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Revision History](#revision-history)

## Purpose

Use the map when you want to *see* a codebase instead of grepping it: which files cluster together, where the hotspots and cycles are, which modules bridge otherwise-separate regions, where declared architecture disagrees with detected structure, and which files carry engineering risk signals (no test in-edges, non-defined semantic headers, unresolved references, unusual size or coupling).

Two audiences share one identical data set (`MapData`, schema v1.5):

- **Humans** use the bundled viewer (`graph.html`) — canvas force layout, search, detail panel, and exclusive overlay toggles.
- **Agents** use the MCP `map` tool, which returns triage-ready summary counts plus `data_path` to the full `data.json`, or — with `format: "skeleton"` — a token-budgeted, centrality-ranked plaintext repo map returned inline for fast orientation (step 8). The `/coderef-map` skill wraps the same surface.

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

Agents call the MCP `map` tool (server `coderef-core`, `project_root` required). It regenerates the map when `graph.json` is newer (or on `refresh: true`) and returns summary fields — `node_count`, `edge_count`, `community_count`, `isolated_count`, `evidence_edge_count`, `declared_layer_count`, `drift_outlier_count`, `untested_src_count`, `undocumented_file_count` — plus `data_path` for deep reads. The last two are `null` on pre-1.4 data. For a fast orientation pass, call it with `format: "skeleton"` (see step 8) — the ranked plaintext map comes back inline, no second read. See [AGENT-CONTRACT.md](./AGENT-CONTRACT.md) for the consumption contract.

### 7. Read `data.json` directly (optional)

Top-level shape (all enrichment blocks schema-additive, each independently disableable at generation time):

- `meta` — `schemaVersion` (`1.5.0`), repo name, counts, and `warnings[]` (every truncation the generator applied is declared here — silence means nothing was dropped).
- `nodes[]` / `edges[]` — files and aggregated relationships; edges carry `evidence` (provenance class, capped line-sorted samples, ambiguity counts).
- `analytics` — communities + per-file assignments, degree/betweenness centrality (exact ≤500 files, stride-sampled above), bridge nodes, Ce/Ca coupling, dead-code candidates.
- `drift` — declared-layer coverage, layer→layer dependency matrix, per-community composition/purity, outliers; plus vocabulary/invariant surfaces when a `--layers` spec was provided.
- `metrics` — the five families above. File-bounded records are complete (uncapped); *rankings* are capped (25; zero-test list 200) with one aggregate warning each.
- `git` — **opt-in** (`--git` / `git:true`), absent otherwise and on any non-git repo. Churn×module-size hotspots and change-coupling drift (co-change pairs with no static edge) over a bounded commit window (see step 9).

### 8. Skeleton map (fast orientation, for agents especially)

The viewer answers "show me the structure." The **skeleton map** answers a different question — "give me the structure as text I can read (or paste into a prompt) in one shot." It is a token-budgeted, centrality-ranked plaintext projection of the same data: files ranked by how depended-on they are, each with its top exported symbol signatures, fitted to a token budget.

```bash
# Plaintext repo map to stdout and .coderef/map/skeleton.md (default budget 1600 tokens)
npx coderef-map . --skeleton --tokens 1600
```

Agents get the same artifact inline from the MCP `map` tool:

```jsonc
map({ project_root: "...", format: "skeleton", token_budget: 1600 })
// → { skeleton_text, skeleton_included_files, skeleton_omitted_files,
//     skeleton_estimated_tokens, skeleton_token_budget, skeleton_path,
//     skeleton_warnings, ...all the usual summary fields }
```

How to read it (and how not to over-read it):

- **Ranking** is by dependency centrality — most depended-on files first (`in` = distinct dependents, `out` = distinct dependencies). This is the full ranking, not the top-25 the `analytics` block caps at.
- **Budget behavior** is monotone: a bigger `--tokens` budget yields a *superset* of the smaller budget's files. Leftover budget upgrades files in rank order (path-only → exported names → full signatures), so the highest-value files are the ones that get signatures.
- **Determinism**: no timestamp in the output; identical inputs produce byte-identical text (`ceil(chars/4)` token estimate — a documented heuristic, not a tokenizer guarantee).
- **Truncation is always declared** in a trailing `## truncation` section: omitted files, reduced-detail files, capped symbol lists, and — on a header-less repo — the fall back to exported-names-only (no signatures). Silence there means nothing was dropped.
- **Surfaces, not verdicts** — a high-centrality file is load-bearing, not "important" or "good." Same rule as every other block: it tells you where to look.

### 9. Git-behavioral block (opt-in behavioral signal)

Every block so far is a projection of *structure* — what the code declares and imports right now. The **git-behavioral block** adds the one thing structure can't see: *how the code has changed over time*. It is **opt-in** — pass `--git` (CLI) or `git: true` (MCP `map` tool) — because reading git history is the only impure, checkout-dependent input in the whole map, so the base path stays git-independent (any repo, CI without history, a non-git directory).

```bash
# Attach the git block: churn×size hotspots + change-coupling drift
npx coderef-map . --git --no-open
```

It surfaces two things (CodeScene / code-maat pattern):

- **Churn × module-size hotspots** — files ranked by `commitCount × elementCount`. coderef has no cyclomatic-complexity metric and this doesn't invent one; element count is the size proxy. A hotspot is a big file that changes a lot — a place worth *looking*, not a defect.
- **Change-coupling drift** — file pairs that **co-change in git history but have no static import/call edge between them**. This is the set difference "co-change − static edge": candidate hidden dependencies that `impact_of` cannot see, because there is no edge to traverse. A pair that co-changes *and* has a static edge is corroboration, not news, so it's counted but not listed.

How to read it (and how not to over-read it):

- **No-data vs zero, again.** On a non-git repo (or one with git absent from PATH, or an empty history), the block is simply **absent** and `meta.warnings` says why — over MCP the `git_block_reason` field names it. Absence means "not measured here," never "zero churn."
- **The window is declared.** Extraction is bounded (`--max-count` default 500, optional `--since`); `git.window` records exactly what was scanned, including a `shallow` flag when the clone is shallow (the window is partial by depth). The observation is only as complete as the window.
- **Surfaces, not verdicts.** High churn tracks active feature work as much as instability; a coupling-drift pair is a *candidate* hidden dependency to investigate in the code, not a proven missing edge.
- The viewer has no git overlay yet (data-first this phase; overlay is a follow-up) — read it from `data.json` or the MCP summary fields (`git_commits_scanned`, `churn_hotspot_count`, `coupling_drift_count`).

## Verification

After step 2 you should have `.coderef/map/{data.json, graph.html, viewer.js, viewer.css}`. Open the viewer and check:

- The stats bar shows non-zero files/edges/elements counts.
- All toggles are enabled. A **disabled** toggle with a tooltip like *"unavailable: no metrics block in this data.json (regenerate the map)"* means your `data.json` predates that block's schema version — re-run `coderef-map` (the viewer intentionally degrades instead of breaking on old data).
- Metrics on → legend shows the family name, its value range, a `no data (N)` chip, and the *surfaces, not verdicts* note; selecting a node shows the Metrics row in the detail panel.
- For agents: the `map` tool response has non-null `untested_src_count` / `undocumented_file_count`.
- Skeleton map: `npx coderef-map . --skeleton` prints a ranked plaintext map and writes `.coderef/map/skeleton.md`; `skeleton_estimated_tokens` stays at or under the budget, and any dropped content is named under `## truncation`.
- Git block: `npx coderef-map . --git` on a git repo adds `data.git` with a stamped `window`, `churnHotspots`, and `couplingDrift`; on a non-git repo the block is absent and `meta.warnings` (or the MCP `git_block_reason`) says why — that absence is correct, not a failure.

## Troubleshooting

- **`coderef-map` errors about missing `.coderef` artifacts** — the target was never scanned (or `--output` moved the artifacts). Run `npx populate-coderef <repo>` first.
- **A toggle is grayed out** — the served `data.json` is older than that feature (pre-1.1 analytics, pre-1.3 drift, pre-1.4 metrics). Regenerate with the current CLI; the tooltip names the missing block.
- **`EADDRINUSE` on `--serve`** — an earlier serve process still owns the port. Kill it or pass a fresh `--port`.
- **Console shows a 404 for `/favicon.ico`** — harmless; the bundle ships no favicon. Any *other* console error is worth reporting.
- **Numbers look "wrong" (e.g. a shared utility flagged as untested)** — check the interpretation rules first: gray = no data ≠ zero; rankings are capped (see `meta.warnings`); betweenness is sampled on repos >500 files; test linkage is a heuristic over test-file naming (`.test.` / `.spec.` / test directories). The map surfaces candidates — confirm in the code before acting.
- **Drift spec surfaces absent** — `layers.json` is explicit opt-in (`--layers <path>`); without it you still get declared-vs-detected drift from in-repo header declarations, but not vocabulary/invariant checks.
- **Skeleton map shows only file paths, no signatures** — either the token budget is too small to upgrade past path-only (raise `--tokens`, and check the `## truncation` section), or `index.json` is absent/unreadable so signature detail degraded to exported-names-only (a header-less repo; the truncation section declares this).
- **`--git` produced no `git` block** — the target is not a git work tree, `git` is not on PATH, or the history is empty (a brand-new repo with no commits, or a `--since` window that matched nothing). Check `meta.warnings` / the MCP `git_block_reason`; on a shallow clone the block appears but `git.window.shallow` is `true` (the window is partial by clone depth — deepen the clone for full coverage).

## Revision History

| Date | Change |
|---|---|
| 2026-07-17 | Initial guide — covers MapData v1.4 (analytics, evidence, drift, metrics; WO-GRAPHIFY-ALIGNMENT-PROJECTIONS-001 + WO-MAP-GRAPH-ANALYTICS-MODULE-001) |
| 2026-07-17 | Added the skeleton map (step 8): token-budgeted, centrality-ranked plaintext repo map via `coderef-map --skeleton` and the MCP `map` tool's `format:"skeleton"` (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 P1) |
| 2026-07-17 | Added the git-behavioral block (step 9): opt-in churn×size hotspots + change-coupling drift via `coderef-map --git` and the MCP `map` tool's `git:true` — MapData v1.5 (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 P2) |

---

Created: 2026-07-17 (WO-MAP-GRAPH-ANALYTICS-MODULE-001 close-out) · Last updated: 2026-07-17 · Maintained by: coderef-core · See also: [docs/CLI.md](./CLI.md#coderef-map), [docs/AGENT-CONTRACT.md](./AGENT-CONTRACT.md)

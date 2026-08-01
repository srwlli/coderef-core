---
title: Review of Graphify-Alignment Feedback
author: CODEREF-CORE agent (Claude)
date: 2026-07-16
reviews: external-feedback.md
status: complete
---

# Review: Graphify-Alignment Feedback

Verdict up front: **the strategic frame is correct and already half-true of this repo.** The reviewer's core thesis — Core is a Canonical Engineering Model, everything else is a projection — is not a proposed pivot; it is an accurate description of where the ecosystem already is. The valuable part of the feedback is the ask to **formalize** that (a projection contract) and the two genuinely new capabilities (graph analytics beyond hotspots/cycles, declared-vs-detected drift). Several other items are already shipped under different names, which the reviewer could not have known.

---

## What the reviewer got right

**The reframe (Biggest Realization).** `.coderef/` already *is* the canonical model: `index.json`, `graph.json`, `coderef-vectors.json`, `semantic-registry.json`, `validation-report.json`, `context.json`. Existing consumers: the DASHBOARD app (its domain charter is literally "renders CODEREF-CORE intelligence read-only"), resource sheets, foundation docs, Obsidian synthesis vaults (PS-VAULT/AS-VAULT/GF-VAULT — whose own charters use the word "projection"), context packs, mermaid diagrams under `.coderef/diagrams/`. The vocabulary the reviewer proposes is the vocabulary the ecosystem already speaks informally.

**Keep Core clean (#12).** Fully aligned with existing culture. Core emits data; DASHBOARD is a separate repo/domain. No pushback — this is a constraint to *preserve*, and it should be stated in the eventual standard so it can't erode.

**Projection contract (#10 / closing idea).** The best idea in the review. Today's projections are ad-hoc: each generator (resource sheet skill, foundation docs, vault render scripts, diagram export) has its own read-parse-emit logic and its own notion of validation. A four-step contract (read canonical model → generate → validate output → publish) matches the ecosystem's existing standards+validator culture (STANDARDS lane, standards-validate). This is primarily an **ASSISTANT/STANDARDS-side** deliverable, not a core code change — core's obligation is only a stable, versioned read contract over `.coderef/` artifacts.

**Edge evidence (#5).** Core already stores this — the call-resolution pipeline records per-edge resolution reasons (e.g., `js_prototype_member`, `receiver_not_in_symbol_table`), and `unresolved_edges` is an MCP tool. The 2026-07-09 builtin-reclassify ruling was decided *on* this evidence. Surfacing it per-edge in query output / UI is cheap and high-leverage: it makes every relationship explainable, which directly serves the operator's "surfaces, not verdicts" doctrine.

**One command (#11).** Reasonable and small. `coderef-pipeline` already bundles most generation; a `map`-style wrapper that runs pipeline + projections is a thin final phase, not an early one.

---

## What already exists (reviewer didn't know)

| Feedback item | Existing capability |
|---|---|
| #7 Agent Context Builder | `pack_context` MCP tool + `coderef-pack` CLI — module/element → context pack, shipped |
| #3/#6 (partial) analytics | `hotspots`, `cycles`, `impact_of`, `diff_impact`, `path_between`, `unresolved_edges`, `validation_status`, `codebase_summary` — all live MCP tools |
| #2 Graph explorer | STUB-282 (`coderef-graph-visualizations`, 2026-05-16) already specifies a richer version: treemap, complexity-vs-coverage scatter, layer Sankey, UMAP semantic clusters, blast-radius graph, chord coupling, heatmaps — targeted at DASHBOARD consuming a read-only API |
| #1 Graph projection files | `graph.json` exists (canonical); `.coderef/diagrams/`, `exports/`, `reports/`, `intelligence/` already exist as output dirs |
| #9 Resource-sheet linkage | `generate-resource-sheet` skill exists ASSISTANT-side; the missing piece is only a stable element-id join |

The right disposition for #2 is **merge into STUB-282 / route to DASHBOARD**, not a new `@coderef/graph` repo. The reviewer's npm-package layering (`@coderef/core → @coderef/graph → @coderef/dashboard`) should be translated into this ecosystem's actual unit of separation, which is domains/repos, not npm packages.

**What is genuinely new in #3/#6:** community detection, bridge/centrality metrics (betweenness), coupling scores, dead-code/isolated-module detection, and cross-referencing graph metrics with test/doc coverage ("least tested central node"). These are new algorithms over `graph.json` — legitimate core-adjacent work, best shipped as a pure-data analytics module emitting JSON reports (no UI).

---

## Where caution is required

1. **Declared-vs-detected drift (#4) has a fragile input dependency.** Core has NO bundled `layers.json` — declared architecture lives in the sibling ASSISTANT repo, and the MCP server is now repo-agnostic (any repo, `project_root` required). Arbitrary repos have no semantic headers and no declared layers at all (the PS rescan proved artifacts degrade hard on header-less repos). Drift comparison must be designed with **declared architecture as optional input**: detected-communities always work; the comparison layer activates only when a declaration exists. Don't let the flagship insight be one that only works on one repo.

2. **Surfaces, not verdicts.** Standing operator doctrine: analytics show WHERE leverage/anomaly is, never WHAT is wrong. "Possible architecture drift" as phrased in the feedback is a verdict. Reports should present *declared X / detected Y / evidence Z* and stop. No auto-filed findings; a human (or a WO explicitly scoped from a read of the files) draws conclusions.

3. **Scale reality for any explorer.** This repo's `graph.json` is ~25 MB and `coderef-vectors.json` ~38 MB. A static `graph.html` embedding the graph (the `.coderef/map/` sketch in #1) will not survive contact with real repos. Whatever renders must consume sliced/paginated data (`index.compact.json` already exists as precedent). This strengthens the case for DASHBOARD-with-API over static HTML projection.

4. **Output-directory sprawl.** `.coderef/` already has `diagrams/`, `exports/`, `reports/`, `intelligence/` plus ~30 root files. Adding `.coderef/map/` as a fifth sibling makes sprawl worse. If projections become a first-class concept, the standard should *rationalize* the existing output tree, not append to it.

5. **Local-only constraint.** Any "knowledge card"/semantic-clustering projection touching embeddings runs on local Ollama. No cloud dependency may become required.

6. **Workorder integration (#8) is ASSISTANT-side.** Graph-node → create-workorder wiring belongs to the ASSISTANT skill estate (`create-workorder`, resource sheets, tickets). Core's only obligation: stable element IDs and the pack_context surface. Scope it there, or it will drag workflow logic into core and violate #12.

---

## Recommended shape (for PLAN.md)

Ordered by dependency and leverage, cheapest-unblocking first:

1. **Projection-contract standard** (STANDARDS/ASSISTANT lane): inventory existing projections, define the 4-step contract + versioned read contract over `.coderef/` artifacts. Zero core code.
2. **Graph analytics module** (core): communities, centrality/bridges, coupling, dead/isolated detection → JSON reports + MCP/CLI parity. Pure data, extends the existing analytics tool family.
3. **Edge-evidence exposure audit** (core, small): confirm what per-edge evidence already reaches query/MCP output; close gaps.
4. **Explorer UI** (DASHBOARD domain): merge this feedback's view-list into STUB-282; consumes 2+3 read-only via API.
5. **Declared-vs-detected drift** (core analytics phase 2): optional-declaration design per caution #1; surfaces-not-verdicts framing per caution #2.
6. **`coderef map` bundling command** (core CLI, thin): last, once there are projections worth bundling.

Items #7/#8/#9 (context builder, WO integration, resource-sheet linkage) need **no new core capability** — they are UI/skill joins on top of `pack_context` + stable IDs, and should be scoped into the DASHBOARD/ASSISTANT tracks.

---

## Bottom line

Accept the strategic frame (already true), adopt the projection contract (best new idea), build the analytics module (real new capability), route the UI to DASHBOARD/STUB-282 (avoid a parallel viz effort), design drift-detection for optional declared input, and keep every report a surface rather than a verdict. Reject nothing outright — but roughly half of the twelve items are re-descriptions of shipped capability, and the plan should say so explicitly to keep scope honest.

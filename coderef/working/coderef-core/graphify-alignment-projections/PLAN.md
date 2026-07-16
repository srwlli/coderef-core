---
title: Graphify Alignment — Projections, Graph Explorer, Analytics
domain: CODEREF-CORE
status: promoted
created: 2026-07-16
stub_ref: STUB-BXW070
workorder_ref: WO-GRAPHIFY-ALIGNMENT-PROJECTIONS-001
---

# Graphify Alignment — Projections, Graph Explorer, Analytics

## Purpose

**Deliverable (operator-clarified 2026-07-16): a new `coderef map <path>` command in the coderef CLI that works on ANY app.** Point it at any repository; it scans (if needed) and emits an interactive browser-based graph explorer for THAT app — dependency/call graph, search, click-a-node detail, hotspots/cycles/impact overlays — generated from the `.coderef/` artifacts core already produces repo-agnostically. This is the Graphify benefit (one command → visual, explorable graph of any codebase) layered onto the existing core engine.

It is NOT: a route in DASHBOARD, a coderef-core-only surface, or an Obsidian-dependent feature. The vault and DASHBOARD ideas below are demoted to optional ecosystem-internal projections.

Secondary adoption items from the same feedback (feed the viewer as v2 enrichments): graph analytics (communities, centrality, drift), edge-evidence surfacing, projection-contract standard.

Artifacts in this folder:
- [external-feedback.md](external-feedback.md) — the outside agent's 12 suggestions, verbatim
- [review.md](review.md) — grounded review: what's right, what already exists, cautions, recommended sequencing
- [obsidian-vault-option.md](obsidian-vault-option.md) — operator-raised option: Obsidian vault as Explorer v1 (fit, limits, ownership options)

## Context

- `.coderef/` already functions as the canonical model (index.json, graph.json, vectors, semantic-registry, validation-report) with multiple live consumers (DASHBOARD, resource sheets, foundation docs, Obsidian vaults, context packs, diagrams).
- Existing analytics MCP/CLI surface: hotspots, cycles, impact_of, diff_impact, path_between, unresolved_edges, validation_status, codebase_summary, pack_context.
- Prior art: **STUB-282** (`coderef/working/coderef-core/coderef-graph-visualizations/stub.json`) already specifies a dashboard/graph-viz surface targeted at the DASHBOARD domain — the explorer portion of this feedback should merge there, not fork.
- Constraints: no bundled layers.json in core (declared architecture is optional input); repo-agnostic MCP means header-less repos must degrade gracefully; graph.json is ~25 MB (static-HTML embedding won't scale); local Ollama only; operator doctrine "surfaces, not verdicts."
- Vault estate: PS-VAULT / AS-VAULT / GF-VAULT already run deterministic read-only Obsidian projections per KNOWLEDGE-VAULT-SLICE-STANDARD; AS-VAULT owns the render/sync script estate. Obsidian's native graph view + backlinks can serve as Explorer v1 at file/module granularity (~263 file notes here) — see obsidian-vault-option.md.

## Approach Options

**Option A — Full program (rolling WO, 6 phases):** projection-contract standard → analytics module → edge-evidence audit → DASHBOARD explorer (merge STUB-282) → declared-vs-detected drift → `coderef map` bundler. Cross-domain (CODEREF-CORE + ASSISTANT/STANDARDS + DASHBOARD).

**Option B — Core-only slice first:** ship only the graph-analytics module + edge-evidence exposure (items 2+3 of the review sequencing) as one core WO; defer standard, UI, and drift until the analytics JSON exists to project.

**Option C — Standard-first:** author the projection-contract standard in the STANDARDS lane before any code; inventory existing projections; then scope code WOs against the standard.

**Sub-decision — Explorer surface (operator-raised 2026-07-16):** vault-first. Obsidian vault projection = Explorer v1 (file/module-level notes + wikilinks; native graph/local-graph/backlinks; zero UI build); DASHBOARD/STUB-282 = Explorer v2 for what the vault structurally can't do (per-edge evidence on the graph, treemap/Sankey/scatter/UMAP, whole-graph scale). Ownership needs a ruling: (A) core emits vault projection, AS-VAULT integrates; (B) standalone CORE-VAULT seat; (C) vault-side sync script, no core change. Analysis in obsidian-vault-option.md.

## Decision

**Operator clarification 2026-07-16 (supersedes earlier framing):** the target is a universal, repo-agnostic viewer shipped with the coderef tool itself — `coderef map <path>` works on ALL apps, not just this repo or the ecosystem. This inverts the review's sequencing: the map command + bundled viewer is the CENTERPIECE and ships FIRST (v1 needs only data that already exists: graph.json, index.json, hotspots, cycles). Analytics/edge-evidence/drift become v2 enrichments of the viewer. Vault and DASHBOARD are optional ecosystem-side projections, no longer on the critical path.

**Operator rulings 2026-07-16 (both CLARIFY items resolved):**
- **Delivery mode: BOTH.** Static `graph.html` (double-click, Graphify-style) is the default output; `coderef map --serve` local server is also v1, for big repos (precedent: coderef-rag-server).
- **Agent parity: YES, v1.** The map is for both agents and users — `/coderef-map` skill + MCP tool ship in v1, not deferred.

Plan is ruled. Status: ready to promote.

## Next Step

- ~~Promote~~ DONE 2026-07-16: STUB-BXW070 promoted to **WO-GRAPHIFY-ALIGNMENT-PROJECTIONS-001** (strict, `ASSISTANT/coderef/workorder/graphify-alignment-projections/`). Engine plan.json is the generic strict skeleton — expand it against this PLAN.md's V1 deliverables before `/execute-workorder`. Cross-link STUB-282 as the ecosystem-dashboard v2 track (not absorbed).

## Deliverables (what this work produces)

**Of this planning folder:** a ruled PLAN.md → stub → workorder(s). Planning folders are pre-stub; the folder's terminal artifact is the promotion.

**Of the program itself (re-sequenced per operator clarification):**

**V1 — the universal map command (the deliverable):**
1. `coderef map <path>` CLI command: runs scan if `.coderef/` absent, projects graph.json+index.json to a file-level `map/data.json`, emits the viewer, opens browser. **Both delivery modes in v1 (operator ruling):** static `graph.html` default + `--serve` local-server flag for big repos
2. Bundled static viewer (prebuilt HTML/JS asset shipped inside the coderef package — analysis code never touches HTML; the command only writes data + copies assets): dependency graph, search, node detail panel, hotspots/cycles overlays, blast-radius mode
3. Works on any repo the scanner supports — acceptance test: run against a repo coderef has never seen, get a working map
4. **Agent parity in v1 (operator ruling — "meant for both agents and users"):** `/coderef-map` skill + MCP `map` tool (project_root required, per repo-agnostic contract); agents get the same data.json the viewer renders, so the map is queryable, not just viewable

**V2 — enrichments (each lights up a new viewer view):**
5. Graph-analytics module (communities, centrality/bridges, coupling, dead/isolated code) → JSON reports + MCP/CLI parity
6. Edge-evidence exposure per edge in viewer + query output
7. Declared-vs-detected drift view (optional-declaration design; surfaces-not-verdicts framing)

**Parallel / ecosystem-optional (off critical path):**
8. Projection-contract standard (STANDARDS lane)
9. Obsidian vault slice (obsidian-vault-option.md) and DASHBOARD views (STUB-282) as ecosystem-internal consumers

---
title: Obsidian Vault as Explorer Surface — Option Analysis
author: CODEREF-CORE agent (Claude)
date: 2026-07-16
extends: review.md
status: complete
---

# Obsidian Vault as the Graph Explorer Surface

Operator question (2026-07-16): why build a graph UI at all when the ecosystem already runs
Obsidian synthesis vaults, and Obsidian renders a link graph natively?

## Why this fits unusually well

1. **The vault pattern IS the projection contract.** PS-VAULT, AS-VAULT, and GF-VAULT
   charters all describe themselves as deterministic read-only *projections* of a canonical
   spine, rendered per KNOWLEDGE-VAULT-SLICE-STANDARD. A coderef-core vault slice is not a
   new architecture — it is the fourth instance of an established one. It would be the
   projection contract's reference implementation, not an exception to it.
2. **Zero UI build.** Feedback items #2 (explorer) and #9 (every node exposes resource
   sheet/docs/standards/workorders) fall out of markdown + wikilinks: one note per code
   unit, frontmatter for identity/type/layer, body sections for callers/dependencies/
   coverage, `[[links]]` to resource sheets, stubs, WOs, standards — which the
   assistant-vault already renders as notes. Obsidian's graph view and backlinks panel do
   the rest.
3. **Local graph view ≈ impact explorer.** Depth-1/2 local graph around a file note is a
   blast-radius view for free — arguably the single most-used explorer interaction, and it
   sidesteps the whole-graph hairball problem.
4. **Local-only, no server, no runtime** — consistent with ecosystem constraints.
5. **Agent-native too:** vault notes are plain markdown on disk, so agents can traverse the
   same projection humans browse.

## Hard limits (why it's v1, not the endgame)

1. **No per-edge metadata.** Obsidian links are untyped and unweighted. Edge evidence
   (feedback #5 — EXPLICIT vs INFERRED, confidence, resolution reason) cannot be shown *on*
   the graph; it can only live in note bodies (a Callers table with an evidence column).
   The graph view cannot distinguish calls from imports from contains, nor color by
   confidence.
2. **No computation.** Communities, centrality, coupling, dead-code (#3/#6) must still be
   computed core-side; the vault only displays results (tags like `#bridge-node`,
   community index notes, Dataview metric tables). This doesn't change the plan's analytics
   phase at all — it only changes where results render.
3. **Scale forces a granularity decision.** coderef-core is ~2,415 elements / ~263 files.
   An element-level vault (2,400+ notes with dense call edges) is a hairball; a
   **file/module-level vault (~260 notes, import/dependency edges)** renders cleanly.
   Recommendation: file-level notes as graph nodes, element detail as tables inside each
   file note. Element-level anchors can still exist as headings (linkable via
   `[[file#element]]`) without becoming graph nodes.
4. **No presentation-grade views.** Treemaps, Sankey layer flows, complexity-vs-coverage
   scatter, UMAP semantic clusters (STUB-282's primary surfaces) are beyond Obsidian.
   Those remain DASHBOARD work.

## Ownership / wiring options (needs ruling)

- **(A) Core emits, AS-VAULT integrates:** core ships a `vault` projection (JSON →
  markdown folder, e.g. `.coderef/vault/` or direct into the assistant-vault's rendered
  slice); AS-VAULT's render-vault.py estate owns sync/refresh discipline. Cleanest fit
  with rendered-not-owned; keeps core HTML/UI-free (it's only writing markdown, which core
  already does for context.md/diagrams).
- **(B) Standalone core vault (CORE-VAULT seat):** mirror PS-VAULT/GF-VAULT — a dedicated
  vault + owner seat under CODEREF-CORE. More ceremony; right if the code graph slice
  grows large enough to pollute the assistant-vault graph.
- **(C) Vault-side script pulls from .coderef/:** no core change at all; AS-VAULT adds a
  sync-coderef-to-vault.py reading index.json/graph.json. Fastest, but analysis logic
  leaks out of core into a render script — mild violation of "projections read the
  canonical model, they don't re-derive it" unless it strictly renders.

## Effect on the plan

The vault becomes **Explorer v1** and re-sequences the review's recommendation: it can ship
immediately after (or even before) the analytics module, because file-level dependency data
already exists in graph.json today. DASHBOARD/STUB-282 becomes **Explorer v2** for the
views the vault structurally cannot do (edge-evidence visualization, treemap/Sankey/scatter,
whole-graph layouts at scale) — informed by which vault interactions actually get used.

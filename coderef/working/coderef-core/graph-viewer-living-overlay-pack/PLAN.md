---
title: Graph Viewer Living-Overlay Pack + Graphify-Derived Improvements
domain: CODEREF-CORE
status: draft
created: 2026-07-20
updated: 2026-07-21
stub_ref: STUB-FYR4J9
related_stubs: [STUB-6PGFZ3]
---

# Graph Viewer Living-Overlay Pack + Graphify-Derived Improvements

## Purpose

Planning home for the graph experience AND the competitive-gap improvements the 2026-07-20/21
Graphify comparison surfaced. Two clearly separated categories, per operator ruling (2026-07-21):

> "add these as category improvements ... separate them in the graph planning from real
> improvements to the tool, to visual or cool additions. **the functions take prio.**"

So this plan carries **three** categories, ranked:

1. **Category FN — Function/capability improvements (PRIORITY).** Real engine power: resolution
   accuracy, retrieval, analysis surfaces. Sourced from Graphify's winning FUNCTION categories.
   Every item makes the graph *more correct* or *answer more questions*, not prettier.
2. **Category VX — Visual / experience additions (SECONDARY).** The original living-overlay pack
   (STUB-FYR4J9) + Graphify's visualization/export wins. Makes the graph *nicer to look at / explore*.
3. (context only) the pre-existing STUB-FYR4J9 overlay items, now folded into Category VX.

Functions ship before visuals. A visual item never blocks or precedes a function item.

## Context

### Where this came from

- **STUB-FYR4J9** (living-graph-overlay-pack): the original driver — a data-grounded canvas overlay
  pack (BFS blast pulse, Risk/Structure/Hygiene/History lens presets, weight-tiered highway edges,
  community hulls). Entirely visual. This is Category VX's seed.
- **2026-07-21 Graphify comparison + `/discover graphify-wins`** (see `discovery-graphify-wins.md`):
  the point-by-point objective comparison found Graphify beat coderef in 5 categories. The `/discover`
  pass classified each win as FUNCTION [FN] or VISUAL [VX] and produced the FN-*/VX-* rec sets that
  populate this plan.
- **STUB-6PGFZ3** (cross-repo/workspace linkage, deferred from genre-program P12): its exact gap —
  workspace-manifest cross-package resolution — is Graphify's `extractors/resolution.py`, a working
  MIT reference. FN-01/02/03 ARE the STUB-6PGFZ3 workstream, now with prior art in hand.

### Relationship to the decompose WO Phase 2 (SCIP)

Decompose-WO P2 wires SCIP as a live resolution overlay (in flight, item ③ of START-HERE). That
raises resolution rate via a compiler-grade *external index*. The FN items here raise it via
*coderef's own resolver* getting smarter (tsconfig/workspace/ESM awareness) — complementary, not
overlapping. FN-06 (benchmark harness) can reuse the P2 SCIP index as ground truth. Sequence FN work
AFTER P2 lands so the SCIP baseline is the measuring stick.

## Category FN — Function/capability improvements (PRIORITY)

Ranked. Prior-art line refs are into `$TEMP/graphify-compare/graphify/` (re-clone if gone; the READ
task re-reads the full file before any port — the /discover only read the resolution core).

| ID | Pri | Capability | What ships | Prior art (Graphify) | Ties to |
|----|-----|-----------|-----------|----------------------|---------|
| FN-01 | **high** | Workspace cross-package resolution | Import-resolver candidate source: read pnpm-workspace.yaml / package.json `workspaces` globs -> package-name->dir map -> resolve `<pkg>` and `<pkg>/<subpath>` via `exports` map (condition priority) / main/module/svelte / src-index fallback, with contained-in-package escape guard. Flips cross-package imports unresolved->resolved. | resolution.py `_find_workspace_root`, `_workspace_globs`, `_load_workspace_packages`, `_package_entry_candidates`, `_resolve_workspace_import` (248-427) | **STUB-6PGFZ3** |
| FN-02 | **high** | tsconfig path-alias resolution | Import-resolver candidate source: walk up to tsconfig.json, follow `extends` (string/array), honor `baseUrl`, parse JSONC, longest-prefix wildcard match, try all declared targets in order. Flips alias imports (`@services/*`) unresolved->resolved. | resolution.py `_load_tsconfig_aliases`, `_read_tsconfig_aliases`, `_match_tsconfig_alias`, `_resolve_tsconfig_alias` (86-246) | STUB-6PGFZ3 |
| FN-03 | med | ESM/extension resolution completeness | `.js`->`.ts`, `.jsx`->`.tsx` ESM remap + extensionless + directory index-file fallback in the JS/TS import resolver. | resolution.py `_resolve_js_import_path`, `_JS_RESOLVE_EXTS`, `_JS_INDEX_FILES` (24-58) | STUB-6PGFZ3 |
| FN-04 | med | Embedding-free lexical retrieval fallback | When no Ollama embed backend is reachable, `orient`/`pack_context`/`rag_search` fall back to a char-trigram inverted index + IDF scoring over node search-text, with a token-budgeted subgraph render. Preserves the Ollama-local-only invariant AND makes retrieval work with zero embed infra. | serve.py `_trigrams`, `_get_trigram_index`, `_trigram_candidates`, `_subgraph_to_text` (218-396, 796) | Ollama-local-only |
| FN-05 | med | Surprising-connections surface | New read-only query surface (+ MCP tool + CLI mirror): cross-community / cross-language "unexpected coupling" detector over the existing directed graph. Surfaces-not-verdicts — names WHERE surprising edges are, never that they are wrong. | analyze.py `surprising_connections`, `_cross_file_surprises`, `_cross_community_surprises` (125-419) | — |
| FN-06 | low | Resolution-accuracy benchmark harness | Turn the P2 SCIP delta into a repeatable eval: at co-located (file,line) sites, measure coderef resolved-count vs SCIP-resolved-count -> a resolution-accuracy % over time. Coderef's answer to Graphify's published benchmarks. | BENCHMARKS.md methodology + P2 scip-resolution-delta | decompose-WO P2 |
| FN-07 | low | Language-breadth expansion | Add tree-sitter grammars beyond ts/py/go (SQL, Terraform, PowerShell as first candidates). LOW leverage for the current estate — sequence LAST. | pyproject.toml grammar set | — |

**FN sequencing:** FN-01+FN-02+FN-03 are the STUB-6PGFZ3 resolution triad and ship together as the
opening workstream (they share the import-resolver seam). FN-04/FN-05 are independent additive
surfaces. FN-06 waits on P2. FN-07 last.

## Category VX — Visual / experience additions (SECONDARY)

The original STUB-FYR4J9 overlay pack + Graphify's visualization/export wins. Ships AFTER Category FN.

| ID | Pri | Addition | Source |
|----|-----|---------|--------|
| VX-00 | med | **STUB-FYR4J9 living-overlay pack** (unchanged): animated BFS blast pulse, Risk/Structure/Hygiene/History lens presets, weight-tiered highway edges w/ flow particles + edge-evidence click-through, labeled community hulls w/ drift-outlier marks. Phase-1 items need zero engine changes (MapData v1.4 already ships the data). | STUB-FYR4J9 / Entity code-city experiment |
| VX-01 | med | Export targets: Mermaid call-flow + Obsidian vault + Neo4j/FalkorDB emitters from the coderef graph. | Graphify exporters |
| VX-02 | low | vis.js-style interactive HTML as an alternative viewer render. | Graphify graph.html |
| VX-03 | low | `suggest_questions`-style exploration prompts in the viewer detail panel. | Graphify analyze.py 420-547 |

## Explicitly NOT importing (with reasons)

- Undirected `nx.Graph` model — coderef's directed typed-edge model is strictly richer.
- 3-value EXTRACTED/INFERRED/AMBIGUOUS confidence — coderef's 8-value status + 4-tier confidence is
  more honest.
- Multi-modal (PDF/image/video) ingestion — out of scope for a code-intelligence engine (parked, not
  in this plan; would need an LLM media pass that violates the code-pass-stays-local principle).

## Approach Options (ruling pending)

- **(A) One rolling WO, FN category first then VX** — RECOMMENDED. Matches the operator's
  functions-first ruling; each FN item is a phase with before/after resolution-rate proof; VX phases
  follow. STUB-6PGFZ3 closes when FN-01/02/03 land.
- **(B) Two separate WOs** — a function WO (FN-*) and a visual WO (VX-*/STUB-FYR4J9). Cleaner
  separation but doubles ceremony; the rolling-gate model already separates phases.
- **(C) Fold FN-01/02/03 into STUB-6PGFZ3 as its own WO, keep this plan VX-only** — tightest scoping
  of the cross-repo stub, but splits the Graphify-derived function set across two homes.

## Decision

PENDING operator ruling on (A)/(B)/(C). Category structure (FN priority over VX) is locked per the
2026-07-21 ruling regardless of which WO shape is chosen.

## Next Step

At operator go:
1. Rule (A)/(B)/(C).
2. If (A): `/create-workorder` phased+rolling from this plan; Phase 1 = FN-01/02/03 (STUB-6PGFZ3
   resolution triad), probe `resolution.py` in full + coderef import-resolver seam FIRST.
3. Re-clone Graphify if `$TEMP/graphify-compare` is gone (read-only prior art; port algorithm not code
   — MIT-licensed but keep coderef's own idioms).

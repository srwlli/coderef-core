---
title: Code-Intelligence Improvement Eval — Four Surfaces
domain: CODEREF-CORE
status: resolved
created: 2026-07-18
stub_ref: null
---

# Code-Intelligence Improvement Eval — Four Surfaces

## Purpose

Operator-requested (2026-07-18) four-surface evaluation of the CodeRef code-intelligence system to source the next round of improvements. Two research subagents swept the surfaces read-only; findings are SEPARATED BY CATEGORY into sibling artifacts:

- [category-1-genre-features.md](category-1-genre-features.md) — **the app vs the genre**: coderef-core compared against code-intelligence genre leaders; 10 NEW addable features (ranked), full genre capability matrix, anti-recommendations
- [category-2-skills-core-directory.md](category-2-skills-core-directory.md) — **the SKILLS/CORE directory**: 14-skill inventory, coverage gaps (7 unwrapped bins; MCP surface invisible to the skill system), 6 recommendations
- [category-3-discover-flow.md](category-3-discover-flow.md) — **the /discover flow**: verified runner map, defects (dead RAG leg, phantom headers surface), a concrete core-backed flow (steps A–G), 5 recommendations
- [category-4-ecosystem-entry-point.md](category-4-ecosystem-entry-point.md) — **the ecosystem entry point**: where a cold agent would (fail to) learn coderef-core; 7 recommendations, MCP `instructions` string first

## Context

- Engine state: `@coderef/CODEREF-CORE` v2.0.0 — 19 CLI bins, 26-tool repo-agnostic MCP stdio server (`project_root` required), `.coderef/` artifact family (index/graph/validation/manifest/map/RAG). Local-first; LLM/embeddings = local Ollama ONLY.
- **Status correction (verified in git log 2026-07-18):** the agentic-coding-intelligence-program is FULLY SHIPPED — all 11 phases, not 7 (P8 staleness-contract `2c05405`, P9 lexical-first-search-router `25e5930`, P10 field-based-acg-resolution `4b211be`, P11 map-metrics-delta-tool `b1b9ba2`, docs-sync `40e6d4f`). Category 1's "already-covered ledger" excludes all 11 from new recommendations.
- Prior art this eval builds on (NOT duplicated): `code-intelligence-improvement-discovery/discovery.md`, `genre-feature-extraction-gap-audit/discovery.md`, `coderef-core-intelligence-leverage/roadmap.md`, and the shipped genre-feature-extraction + agentic-coding-intelligence programs.
- Headline defects found (correctness class, all cited in category files): /discover's RAG leg spawns a runner that does not exist (always-fallback); /discover's `.coderef\headers\` surface is phantom; `SKILLS/CORE/populate-coderef` SKILL.md is ~6 weeks stale on flags; `PROJECT-CONTEXT/CODEREF-CORE/CONTEXT.md` says 11 MCP tools / 15 bins vs actual 26 / 19 and misstates the RAG provider default; the MCP server registers NO `instructions` string.
- Culture constraints binding any follow-on WO: surfaces-not-verdicts (no composite scores), absence = no-data, additive schemas, Ollama-local-only, MAIN-only git with explicit pathspec.

## Approach Options

**Option A — Quick-wins correctness batch first:** one small WO bundling the S-effort fixes across categories (fix discover RAG leg; retire/realize headers surface; refresh populate-coderef flags; refresh CONTEXT.md counts/provider; add MCP `instructions` string; fix CORE index.md drift; ORCHESTRATOR CONTEXT.md retired-fleet correction). Ships in days, de-lies the system, then plan features separately.

**Option B — Per-category tracks:** promote each category file to its own stub/WO independently — cat-1 → core feature WO(s) (start `tests_for_change` S-effort, then `ast_search`); cat-2 → CORE skills refresh WO; cat-3 → discover core-backed flow WO (steps A–G); cat-4 → entry-point WO (instructions string + USING-CODEREF.md + CONTEXT.md template section). Operator sequences the tracks.

**Option C — One rolling program WO** (the agentic-coding-intelligence-program pattern): phases drawn from the ranked recs across all four categories, leverage-ordered — e.g., P1 correctness batch (=Option A) → P2 tests_for_change → P3 MCP instructions + USING-CODEREF + CONTEXT.md template → P4 discover core-backed flow → P5 ast_search → P6+ type-hierarchy / api-diff / ownership-block as ruled.

## Decision

**RESOLVED 2026-07-30 (operator ruling: no new WO).** Between 2026-07-19 and 2026-07-21 the four surfaces shipped through existing WOs — effectively Option C, executed as two programs plus two rolling WOs. A `/create-workorder` run on 2026-07-30 verified the live tree, found the scope ~95% shipped, and halted at the scope gate instead of authoring a duplicate.

## Shipped ledger (verified against live tree 2026-07-30)

- **Cat-1** → `WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001` (promoted from this eval 2026-07-18/19), **CLOSED + ARCHIVED 2026-07-20 at 11/12 phases**. `src/map/ownership.ts` live; tests_for_change / ast_search / api_diff / type_hierarchy / clones / docstrings / dependency_rules / scip_resolution_delta all registered — the MCP server is now **36 tools**. P12 cross-repo deferred by operator ruling 2026-07-19 → STUB-6PGFZ3. Remainders with owners: decompose-monolith WO P3–P7 deferred stubs (rules.json / test-linkage / coderefignore / docstrings / cleanups), clone-surface WO P3 (type-hierarchy follow-on, STUB-7BVGJ5).
- **Cat-2 + Cat-3 + Cat-4** → `WO-CODE-INTELLIGENCE-LEVERAGE-WIRING-PROGRAM-001` (created 2026-07-20 01:42 from the same-day /discover leverage report; companion USING-CODEREF.md shipped that session). **All 6 phases executed 2026-07-20 06:53–08:40 UTC** (commits a0eff4e / 4dfa071c / c18cd8b2 / 7602eab / 16154db / 9b516b50): P1 MCP `instructions` string; P2 entry-doc estate (USING-CODEREF.md + CONTEXT.md refresh); P3 /discover graph wiring (dead RAG leg fixed, skeleton orientation, BM25 element lookup, real coderef-query walks, graph-risk table, `--help`); P4 `orient` composite + vector-staleness WARN; P5 verify-loop (`change_dossier` + runnable test commands); P6 wrapper front-doors (coderef-query + coderef-intel skills, populate flags refresh, MCP-twin sections). **Status: complete, AWAITING /close-workorder** — its registry row still reads `plan_created`; truth lives in communication.json + git. Sibling: `WO-SKILLS-CORE-PLAYBOOK-ALIGNMENT-001` (/coderef-rename front-door).

## Residuals (verified unowned, small)

1. `generate-project-context`: no "Code intelligence" template section (Cat-4 rec 4) — M
2. `PROJECT-CONTEXT/CODEREF-CORE/CONTEXT.md` tool table re-drift 34→36 (`orient`, `change_dossier` missing) — S
3. `SKILLS/CORE/index.md` header counts 16 vs 17 dirs (generate-foundation-docs registered in skills.json; index not regenerated) — S
4. `/use-coderef` onboarding skill (Cat-4 rec 5) unshipped as named; plausibly superseded by coderef-intel + `orient` + USING-CODEREF.md — needs ship-or-supersede ruling — S

## Next Step

- `/close-workorder WO-CODE-INTELLIGENCE-LEVERAGE-WIRING-PROGRAM-001` (complete since 2026-07-20, never closed)
- Then the rolling gates: decompose-monolith `/plan-next-phase --phase=3`; clone-surface `/plan-next-phase --phase=3`
- Residuals above: fold into the leverage close's follow-up candidates or a future light WO

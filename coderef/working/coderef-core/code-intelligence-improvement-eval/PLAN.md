---
title: Code-Intelligence Improvement Eval — Four Surfaces
domain: CODEREF-CORE
status: draft
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

Pending operator ruling: **(A)** quick-wins batch first, **(B)** per-category tracks, or **(C)** one rolling program. (Recommendation on request; C mirrors the pattern that just shipped 11/11 phases cleanly.)

## Next Step

- Operator rules A/B/C → promote: `/stub code-intelligence-improvement-eval --category=feature` (or per-category stubs under B), then `/create-workorder from the stub`.
- Planning folders are pre-stub; this folder's terminal artifact is the promotion.

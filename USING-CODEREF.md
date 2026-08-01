---
title: Using CodeRef — the agent-consumer playbook
status: living
updated: 2026-08-01
documents: src/cli/coderef-mcp-server.ts (38-tool MCP registry) + docs/CLI.md (26 CLI entrypoints)
doc_type: guide
audience: any agent in any repo with mcp__coderef-core__* available
provenance: /discover code-intelligence leverage run 2026-07-20 (REC-005) + playbook-gaps pass same day + WO-CODE-INTELLIGENCE-LEVERAGE-WIRING-PROGRAM-001 P4-P6 sync (orient, change_dossier, run_command) + WO-SKILLS-CORE-PLAYBOOK-ALIGNMENT-001 sync (REC-008 /coderef-rename EDIT-leg front-door) + 2026-07-31 post-close sync (decompose + clone-surface: near-miss clone passes, type_hierarchy LSP projection) + 2026-08-01 test_dsl reclassify sync (resolved_of_resolvable 73.38%)
---

# Using CodeRef — the agent-consumer playbook

> **What this is.** The entry doc for AGENTS (not contributors) on how to use the
> coderef-core code-intelligence surface — 37 MCP tools + 26 CLI bins over `.coderef/`
> artifacts (index, 32 MB call/import graph, semantic registry, map, RAG vectors).
> **Every MCP call REQUIRES `project_root` (absolute path). There is no default repo.**
>
> Contributor view (working ON core): `docs/ARCHITECTURE.md` and `docs/CLI.md`.

## The playbook

**START**

0. **PREPARE** (once per repo) — CHECK `.coderef/index.json` exists at the target root. If absent or stale: RUN `reindex` (MCP) or `/populate-coderef <root>` (CLI). Nothing below works on an unindexed repo; the error envelope (`coderef_artifacts_corrupt` / missing-`.coderef` hint) is the signal you skipped this step.

1. **ORIENT** (turn 1, any repo) — RUN `orient` (one call: skeleton map + summary + validation + staleness, composed server-side). REPLACES 10–15 blind greps; the individual tools (`map format:"skeleton"`, `codebase_summary`, `validation_status`) remain for narrower re-checks. CHECK the staleness block every response carries; if stale, RUN `reindex` first.

2. **LOCATE** (instead of grep-and-read) — RUN `find_element` for the symbol, then `symbol_context` for its card + neighbors, then `docstrings` when you need intent, not just shape. READ whole files only after the graph names the right ones.

3. **PLAN** (before authoring any WO phase) — RUN `impact_of` on each touch-point for blast radius; `what_calls`/`what_this_depends_on` for both directions; `hotspots` + `ownership` to rank risk; `cycles` + `unresolved_edges` to know WHERE the graph is trustworthy. RUN `clones` before writing a new utility — the function you are about to write may already exist (three passes: `structural` signatures, `lexical` identical normalized bodies, and opt-in `near_miss` with `similarity_threshold` — renamed copies and near-duplicates both surface). Scope phases from surfaces, then READ the files (surfaces-not-verdicts).

4. **RETRIEVE** (concept-shaped questions) — RUN `rag_search` (hybrid BM25 lexical + dense vector retrieval); it now carries an in-band `vector_staleness` WARN when vectors lag the index (a stale-vector answer is a confident wrong answer — live example: vectors 2026-07-10 vs index 2026-07-19). CHECK `rag_status` for the full staleness picture; RUN `pack_context` to fill a token budget with ranked context instead of hand-picking files.

5. **EDIT** (structural changes) — RUN `ast_search` to enumerate every call-site shape; `rename_preview` before any rename; `type_hierarchy` before touching an interface (`item_format:"lsp"` / CLI `--lsp` additively emits LSP 3.17 `TypeHierarchyItem`s for editor-shaped consumers). **Write-scope rule (scoped supersession, operator ruling 2026-08-01):** `rename_apply` is the SINGLE MCP tool sanctioned to write source — `apply:false` default (pure preview, same plan as `rename_preview`), atomic writes on `apply:true`, shadow-ambiguous lines never rewritten over MCP (no force parameter — `--force-ambiguous` stays CLI-only on `coderef-rename`), stratified `resolution_disclosure` in every response. Every OTHER graph tool still writes no source. The apply gate is preview → review → `rename_apply {apply:true}` (or the CLI `--apply`), then re-populate because the graph is now stale. Your other edits go through your editor tools; the graph tells you where.

6. **VERIFY** (after the diff, before commit) — RUN `change_dossier` (one call: diff_impact + tests_for_change + api_diff DELTA + dependency_rules, composed with per-leg no-data honesty), or the legs individually: `diff_impact` → `tests_for_change` (now returns a ready-to-run `run_command` for the selected tests — run THAT first, full suite after; `run_command: null` means no-data, never "safe to skip"); `api_diff` as the breaking-change gate; `dependency_rules` as the architecture gate; `map_metrics_delta` to prove a refactor helped (take the BEFORE snapshot at step 3, or there is no delta). For frontend/API work, RUN `validate-routes` / `scan-frontend-calls` as the contract gate.

7. **TRACE** (debugging, added by the gaps pass) — RUN `path_between` to answer "how does A reach B"; `find_all_references` when you need every mention (broader than `what_calls`); `source_of` to pull the exact implementation without opening the file; `what_exports` to audit a module's public surface.

**STOP**

## Decision table — which tool, when

| You want | Use | NOT |
|---|---|---|
| A string/regex, anywhere, fast | `rg` (grep) | rag_search |
| A named symbol's definition + neighbors | `find_element` → `symbol_context` | grep + read whole file |
| A concept ("where is retry handled?") | `rag_search` (check `rag_status` first) | grep guessing synonyms |
| A structural pattern ("all await inside loops") | `ast_search` | regex approximations |
| Who breaks if I change X | `impact_of` / `diff_impact` | reading imports by hand |
| Which tests to run for this diff | `tests_for_change` (emits `run_command`) | full suite first |
| Full pre-commit pre-flight, one call | `change_dossier` | four separate calls stitched by hand |
| Repo orientation, first turn | `orient` | directory listing + N file reads |
| Max relevant context in N tokens | `pack_context` | hand-picking files |

## Trust rules (read before relying on any edge)

- **Surfaces, not verdicts.** Every output shows WHERE to look, never WHAT is wrong. READ the files before concluding.
- **Absence = no-data, never signal.** An empty `what_calls` result means *no resolved edge*, not *no callers* — CHECK `unresolved_edges` and `validation_status` for the coverage picture before trusting a negative. Fall back to `rg`/`find_all_references` on any load-bearing negative.
- **Edges carry confidence tiers.** The honest resolver-quality read is `resolved_of_resolvable` (~73% post test_dsl reclassify, ruling A 2026-08-01): test-framework DSL calls (vitest/jest ambient globals + expect matcher chains) classify `builtin` with `test_dsl_*` reasons, disclosed via `test_dsl_count` — they were never resolvable and no longer pollute the denominator. The raw `resolution_rate` (~22%) keeps its all-emitted-calls denominator (includes builtin/external) by design. `scip_resolution_delta` shows what a compiler-grade index resolves that CodeRef didn't (read-only surface). The LIVE wire now exists (STUB-BQQJSY, opt-in): `populate-coderef --scip <path-to-.scip>` runs a post-resolution overlay that flips co-located unresolved/ambiguous **call** edges to `resolved` with SCIP provenance (`evidence.kind:'scip'`, confidence tier **heuristic** — SCIP resolved the *symbol*, not a proven intra-project `targetId`). No-regress by construction: already-resolved edges are never touched, no edges are invented, and no `.scip` = zero change. Generate the index locally with `npx @sourcegraph/scip-typescript index` (no cloud). Cross-repo resolution is still out of scope (STUB-6PGFZ3).
- **Single-repo scope.** Zero cross-repo edges today (cross-repo linkage = STUB-6PGFZ3). An import into a sibling repo resolves as `external` — that is a scope boundary, not an answer.

## MCP vs CLI twins

MCP (in-session, `project_root` per call) is the default. CLI bins (locked root: `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE`, build under BOTH tsconfigs) are for bulk/CI/headless: `populate-coderef`, `coderef-query` (graph walks), `coderef-analyze`, `rag-search --json`, `coderef-map`, `coderef-watch` (incremental daemon), `coderef-rename --apply` (the only write path). RAG needs local Ollama — no cloud keys, ever.

**`coderef-analyze --type=<t>` mirrors the whole read-only analyze surface for headless consumers** (no MCP reach needed): `--type=` one of `ast-search`, `breaking-changes`, `change-dossier`, `clones`, `complexity`, `dependency-rules`, `docstrings`, `impact`, `scip-resolution-delta`, `tests-for-change`, `type-hierarchy`, … — each emits the SAME envelope as its MCP twin. Example (clone surface, MCP twin `clones`): `coderef-analyze --project=<root> --type=clones --output=json [--pass=structural|lexical|near_miss] [--similarity-threshold=0.9] [--min-body-length=N] [--min-group-size=N] [--limit=N] [--offset=N] [--element=<name filter>]` → structural `groups` / `lexical_groups` / `near_miss_pairs [{a,b,similarity}]` with `signature_basis`, `elements_without_signature`, `elements_without_body_data`, `no_data`. Reads `.coderef/index.json` (run `populate-coderef` first). There is no MCP-only analyze type — if a surface has an MCP tool, it has a `--type` mirror.

Skill front-doors (ASSISTANT fleet): `/coderef-intel` is the question→tool routing table over this whole surface; `/coderef-query` and `/populate-coderef` wrap their bins with the current flag contracts and MCP-twin mappings; `/coderef-rename` fronts the EDIT-leg apply gate (dry-run default, `--apply` the only source-mutating write path). Every `SKILLS/CORE/` skill now declares its MCP-twin status explicitly.

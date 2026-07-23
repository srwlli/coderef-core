# Category 2 — The SKILLS/CORE Directory

> Provenance: research subagent sweep, 2026-07-18 (read-only; cross-checked SKILL.md frontmatter vs skill.json, flags vs `CODEREF-CORE/src/cli/*.ts`, coverage via grep across all `SKILLS\*\*\SKILL.md`). Location: `C:\Users\willh\Desktop\CODEREF\ASSISTANT\SKILLS\CORE\`.

## Current state

14 skill folders + `index.md` (generated) + `references\` (CORE-FAMILY.md, SCAN-RULES.md, RAG-RULES.md, ROUTE-RULES.md). **Zero run.mjs anywhere in CORE** — every skill is an agent-led markdown procedure; only spawn-fresh-coderef has `scripts\` (two .sh helpers). Every folder carries SKILL.md + skill.json + standards.json + kaizen.md; versions agree across SKILL.md/skill.json.

| Skill | Wraps | Runner | Version / updated | Staleness flags |
|---|---|---|---|---|
| coderef-scan | `coderef-scan` bin (stats-only) | none | 1.0.0 / 2026-06-02 | OK |
| populate-coderef | `populate-coderef` bin (full `.coderef\` set) | none | 1.1.0 / 2026-06-06 | **STALE**: flags block (SKILL.md:53-70) omits `--source-headers`, `--overwrite-headers`, `--stale-only`, `--changed-files`, `--include`/`--exclude` — all live in `src/cli/populate.ts:247-291,350-358`; `--include/--exclude` shipped 2026-07-18 |
| coderef-pipeline | `coderef-pipeline` (scan→populate→docs→rag) | none | 1.1.0 / 2026-07-03 | OK; leg list matches `coderef-pipeline.ts:48` |
| coderef-map | `coderef-map` + `mcp__coderef-core__map` | none | 1.0.0 / 2026-07-16 | Freshest; **only CORE skill that mentions MCP at all**; references `/coderef-query` as a skill (SKILL.md:112) which does not exist |
| coderef-watch | `coderef-watch` daemon | none | 1.1.0 / 2026-07-03 | OK |
| coderef-rag-server | `coderef-rag-server` (:52849) | none | 1.1.0 / 2026-07-03 | OK |
| rag-index | `rag-index` bin | none | 1.2.1 / 2026-07-14 | OK (ollama-local default correct per `rag-index.ts:161`); no mention of MCP `rag_index` twin |
| rag-search | `rag-search` bin | none | 1.2.1 / 2026-07-14 | OK; no MCP twin mention; **has no run.mjs — which breaks /discover** (see category 3) |
| rag-status | `rag-status` bin | none | 1.1.0 / 2026-07-03 | OK |
| scan-frontend-calls | `scan-frontend-calls` bin | none | 1.0.0 / 2026-06-02 | OK |
| validate-routes | `validate-routes` bin | none | 1.0.0 / 2026-06-02 | OK |
| coderef-init | scaffolder (`coderef/` + `.coderef/` + `.coderefignore`) | none | 1.1.0 / 2026-06-02 | OK |
| spawn-fresh-coderef | Lloyd `/api/generate` agent → populate `--source-headers` + foundation docs | scripts\*.sh | 2.1.1 / 2026-07-17 | Documents `--source-headers` that the canonical populate wrapper omits |
| generate-foundation-docs | DEPRECATED redirect → `/standards-establish --kind=documentation` | none | 3.0.0 / 2026-07-13 | Deliberate stub; **missing from index.md** |

## Top-level SKILLS sweep (wider reading of "the core skills directory")

`ASSISTANT\SKILLS\`: ANALYSIS 20 (incl. discover, coderef-analyze, analyze-coderef-semantics) · ARCHIVED 9 · BE 5 · CONTENT 3 · CORE 16 entries (14 skills + index + references) · DEBUG 2 · DOCUMENTATION 16 · ENTITY 7 · EXAMPLES 4 · GENERATION 10 · GIT 6 · GRAPHICS 3 · INTEGRATION 3 · KAIZEN 9 · META 3 · NFL 3 · ON-TASK 7 · PARKED 0 · PRIMARY-SOURCES 17 · PROMPTS 4 · PROPER_SKILLS 1 · SESSION 31 · STANDARDS 28 · SURFACES-HTML 5 · TRACKING 7 · UTILITIES 6 (incl. coderef-fast-start, a 14-service launcher) · WORKFLOW 34 · _shared 5 · docs 2.

## Findings

1. **Coverage gaps — 7 of 19 coderef-core bins have no skill wrapper anywhere**: `coderef-query`, `coderef-rename`, `coderef-pack`, `coderef-analyze` (the bin — ANALYSIS/coderef-analyze is an artifact READER that says "Do not run the scan CLI here"), `coderef-detect-languages`, `coderef-semantic-integration`, `rag-eval`; plus `coderef-mcp-server` itself. Outside CORE, only discover/create-workorder/execute-workorder mention any of these bins, and only as internal enrichment (create-workorder SKILL.md:264-266 gated on `CODEREF_QUERY_ENRICHMENT=1`; execute-workorder SKILL.md:455).
2. **The 26-tool MCP surface is effectively invisible to the skill system**: exactly ONE SKILL.md in the whole tree references `mcp__coderef-core__*` — `SKILLS\CORE\coderef-map\SKILL.md` (lines 3, 34, 109, 112, 124). No skill front-door for hotspots/cycles/symbol_context/pack_context/unresolved_edges/rename_preview; no "MCP vs CLI, when" guidance in CORE.
3. **populate-coderef, the flagship wrapper, is ~6 weeks stale on flags** (table above) — and its sibling spawn-fresh-coderef documents `--source-headers` while the canonical wrapper doesn't: an internal contradiction within CORE.
4. **index.md count drift**: header says "core skills (13)", directory holds 14 (generate-foundation-docs absent; index generated from TRACKING/skills.json) — registry and disk disagree.
5. **Consistency is otherwise strong**: 11 of 14 follow an identical template (Purpose → Canonical source LOCKED w/ absolute dist entrypoint → RESOLVE → RUN → PICK flags → VERIFY → REPORT → Kaizen → Decision Rules → Common Issues → References), all pinned to `@coderef/CODEREF-CORE@2.0.0` via `wraps_bin`/`package` frontmatter. Exceptions are structural (init/spawn-fresh/deprecation stub).
6. **Overlap/confusion with other categories**: (a) ANALYSIS/coderef-analyze shares the bin's name but reads artifacts — "run coderef-analyze" can land on the wrong surface; (b) foundation-docs generation is split three ways (deprecated CORE skill → STANDARDS kind generators, while the pipeline `docs` leg still runs `scripts/doc-gen/generate-*.js` per coderef-pipeline.ts:78); (c) ANALYSIS/analyze-coderef-semantics vs the un-wrapped `coderef-semantic-integration` bin is an undocumented near-miss pairing.
7. **No CORE skill is executable** (no run.mjs) while the wider fleet norm (discover, kaizen-log, standards checkers) is runner-backed — defensible for thin wrappers, but exactly what breaks /discover's RAG leg (category 3, finding 2).

## Recommendations (ranked)

1. **Refresh populate-coderef flags block** to match `populate.ts` (add `--source-headers/--overwrite-headers/--stale-only/--changed-files/--include/--exclude` + a Decision Rule for header-write scoping). Target: `SKILLS\CORE\populate-coderef\SKILL.md`. Effort **S**.
2. **Add an "MCP twin" section to every CORE wrapper that has one** (rag-index/rag-search/rag-status/populate→reindex; coderef-map already done): tool name, `project_root` REQUIRED, when to prefer MCP (in-session) vs CLI (bulk/CI). Targets: 5 SKILL.md files in `SKILLS\CORE\`. Effort **S**.
3. **Create `SKILLS\CORE\coderef-query\SKILL.md`** wrapping the graph-query bin — already referenced by coderef-map SKILL.md:112 and used internally by create/execute-workorder; the missing public front-door. Effort **M**.
4. **Create a single `SKILLS\CORE\coderef-intel\SKILL.md`** (or extend coderef-map): "ask the graph" skill routing to the un-wrapped read-tool families — hotspots/cycles/unresolved_edges/symbol_context/pack_context — via MCP. Effort **M**.
5. **Fix index.md/skills.json drift**: register generate-foundation-docs (as deprecated) in TRACKING/skills.json and regenerate via `scripts/gen-skill-index.mjs`, or delete the folder per its own grace-period note. Effort **S**.
6. **Annotate the ANALYSIS/coderef-analyze name collision**: "not the bin" pointer in `SKILLS\ANALYSIS\coderef-analyze\SKILL.md` + sibling pointer in CORE-FAMILY.md. Effort **S**.

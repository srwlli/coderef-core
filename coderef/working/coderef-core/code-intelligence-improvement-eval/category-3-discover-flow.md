# Category 3 — The /discover Flow + Explicit Core Integration

> Provenance: research subagent sweep, 2026-07-18 (read-only; line-cited against `SKILLS\ANALYSIS\discover\SKILL.md` v1.4.0, 247 lines, and `run.mjs`, 957 lines). Invoked ecosystem-wide via thin wrapper `C:\Users\willh\.claude\skills\discover\SKILL.md`.

## Current flow (what the deterministic runner actually executes)

1. Parse/validate args: `topic`, `--depth=quick|medium|thorough` (default medium), `--output-dest=stdout|workorder:|stub:|working:`, `--dispatch-id`, `--input-source=kaizen`, `--kind` (run.mjs:37-74).
2. `findProjectRoot()`: walk up from cwd until a dir containing `.coderef\index.json` (run.mjs:179-187) — the ONLY project-context resolution.
3. Kaizen branch: `--input-source=kaizen` bypasses the pipeline, globs `SKILLS\**\kaizen.md` (run.mjs:742-755).
4. **rg always runs** (all depths): one ripgrep pass for the topic, max 10 hits quick / 50 otherwise, noise-floor excludes (run.mjs:765, 191-243).
5. **medium/thorough only** (depth gate at run.mjs:779): (a) spawn `SKILLS\CORE\rag-search\run.mjs` (run.mjs:245-262); (b) read `.coderef\index.json`, substring-score elements vs topic, top 20 (run.mjs:264-273, 299-317, 787-795); (c) count `.coderef\headers\*.json` (run.mjs:275-284); (d) count `coderef\foundation-docs\*.md` (run.mjs:286-295).
6. **thorough only**: append two SCAFFOLD lines — `coderef-query depth-of-walk=0 (v1 scaffold)` and `analyze-coderef-semantics discovery-seed=false (v1 scaffold)` (run.mjs:808-813). Nothing is invoked; `divergences` hardcoded empty (run.mjs:843).
7. Findings synthesis: top 15 rg + top 5 index candidates + top 5 RAG hits, keyword severity heuristic (run.mjs:815-840); recommendations are generic count-based rows (run.mjs:845-859).
8. Stub-hierarchy enrichment from `TRACKING\stubs.json` / `agent-domains.json` (run.mjs:861-862, 327-448) + `--kind` manifest block (run.mjs:82-104, 864-866).
9. Route report: 6-section markdown + JSON sidecar to workorder/stub/working dest, else stdout (run.mjs:590-685, 869-901).
10. Standard Terminal Output Block always (run.mjs:903-913); thorough+file → surfaces-html render (run.mjs:918-938); `--dispatch-id` → log-skill emission (run.mjs:941-952). SKILL.md Steps 0-7 mirror this (SKILL.md:24-199); inline-serial mandated, no sub-agent fan-out (SKILL.md:78).

**Quick mode verified** (confirms the recorded fact "run.mjs IS live in quick mode"): quick executes ONLY the rg pass + synthesis + terminal block/report routing — RAG, index.json, headers, foundation-docs all skipped by the gate at run.mjs:779.

## Where core appears today (citations)

- `.coderef\index.json` — read directly, twice: project-root sentinel (run.mjs:182) and element catalog for substring matching (run.mjs:264-273 → 787-795, 825-831). **This is the ONLY live coderef-core artifact consumption.**
- `.coderef\headers\` — attempted (run.mjs:275-284) but the directory does not exist in either CODEREF-CORE or ASSISTANT `.coderef\` (verified by listing both); always degrades to `headers_consulted=0 (unavailable)`. **Phantom surface.**
- RAG — run.mjs:246 spawns `SKILLS\CORE\rag-search\run.mjs`, **which does not exist** (CORE/rag-search is markdown-only; its own SKILL.md:64 says so). The RAG leg therefore ALWAYS returns `fallback_used=true, warning: rag-search skill not found`. **Dead integration.**
- `coderef-query` CLI and `analyze-coderef-semantics` — documented for thorough mode (SKILL.md:71-73) but scaffold-only in run.mjs:808-813; never invoked.
- MCP: **zero** `mcp__coderef-core__*` usage in SKILL.md or run.mjs. No graph.json, no map\data.json, no hotspots/cycles/unresolved_edges/symbol_context/codebase_summary/pack_context anywhere (grep verified).
- Ancillary: SKILL.md:224 cites `CODEREF-CORE\docs\CLI.md`; frontmatter `@imports` (SKILL.md:17) claims `rag-search:search, coderef-analyze:analyze, ...` — aspirational, not wired.

## Findings

1. **Core integration is one artifact deep**: of the whole surface (graph.json, map\data.json + skeleton, 26 MCP tools, coderef-query CLI), the runner consumes only index.json name-substring matches. The graph — the thing coderef-core uniquely knows — is never consulted, so "characterize X" reports carry zero dependency/impact evidence.
2. **The RAG leg can never succeed** via run.mjs (nonexistent runner spawn, run.mjs:246-248) even though the `rag-search` CLI supports exactly the needed contract (`--json`, `--top-k` — rag-search.ts:208,221,241) and an MCP `rag_search` tool exists. Every medium/thorough run silently reports `rag=0, fallback=t`.
3. **`.coderef\headers\` is phantom** — never (or no longer) produced at that path; SKILL.md:49 claims about Phase 1B header blocks are stale vs the engine.
4. **Thorough mode over-promises**: SKILL.md:69-74 sells a cross-domain divergence matrix via coderef-query walks; run.mjs ships scaffold lines and an empty §4 table. The audit shape exists only if the agent hand-executes it.
5. **The graceful-degradation chassis is good** (never halt, WARN in §2 — run.mjs:76 policy honored throughout) and is the right place to hang core tools: additions are low-risk.
6. `--help` emitter is an unfinished TODO stub (run.mjs:713-727).

## Recommendations (ranked)

1. **Fix the dead RAG leg** — replace the phantom spawn with the real CLI: `node <CODEREF-CORE>\dist\src\cli\rag-search.js --json --project-dir <projectRoot> "<topic>" --top-k 10` (fallback: MCP `rag_search` in-session). Target: `SKILLS\ANALYSIS\discover\run.mjs:245-262`. Effort **S**.
2. **Ship the core-backed discover flow** (each step names its tool):
   - **A (all depths) — orientation**: `mcp__coderef-core__map` `format:"skeleton"` (or read `.coderef\map\skeleton.md` / `coderef-map` CLI) → centrality-ranked repo map replaces blind rg-first.
   - **B (all depths) — rg pass** (unchanged).
   - **C (medium+) — element lookup**: swap index.json substring scoring for `mcp__coderef-core__find_element` (query=topic); keep index.json as offline fallback.
   - **D (medium+) — semantic**: fixed rag-search CLI/MCP per rec 1.
   - **E (medium+) — context health**: `codebase_summary` + `validation_status` one-liners into §2 (grounds "how trustworthy is this index", incl. the P8 staleness block every MCP response now carries).
   - **F (thorough) — real graph walks**: per top-5 candidate element, `what_calls` + `what_this_depends_on` + `impact_of` (CLI twin: `coderef-query --type=what-calls-me/what-depends-on-me`) → populate the §4 divergence rows that are scaffold today.
   - **G (thorough) — risk overlays**: `hotspots` + `cycles` + `unresolved_edges` (top N) as a "graph risk" sub-table in §3; `symbol_context` for the single best-matching element when the topic resolves to one symbol.
   Targets: `run.mjs` (new tool functions alongside runRg/runRagSearch; thorough block 808-813; synthesis 815-859) + `SKILL.md` Step 3 depth definitions (lines 51-78). Effort **L** (splittable: A+C+E = M).
3. **Retire or realize the headers surface**: point `readHeadersDir` at reality — drop it, or read header status from index.json elements (`headerStatus` already exposed per find_element, coderef-mcp-server.ts:2733). Target: `run.mjs:275-284` + `SKILL.md:49,104`. Effort **S**.
4. **Make SKILL.md honest about runner vs agent duties**: mark which Step-3 bullets the runner executes vs what the agent must add (today's thorough text reads as implemented). Target: `SKILL.md:51-78`. Effort **S**.
5. **Finish the `--help` stub** while touching run.mjs (713-727). Effort **S**.

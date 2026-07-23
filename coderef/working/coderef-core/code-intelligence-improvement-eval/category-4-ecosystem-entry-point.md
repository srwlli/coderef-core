# Category 4 — The Ecosystem Entry Point (how agents learn to use the tool)

> Provenance: research subagent sweep, 2026-07-18 (read-only; verified against PROJECT-CONTEXT, `~\.claude.json` MCP wiring, `~\.claude\skills\` wrappers, coderef-mcp-server.ts, COMMS structure, ASSISTANT root docs). Question: how does a brand-new agent in any OTHER domain (PS-*, NFL-*, …) learn (a) coderef-core exists, (b) when to use it vs grep, (c) the exact invocation order?

## Current entry surfaces (inventory)

| Surface | Path | State |
|---|---|---|
| Canonical project context | `ASSISTANT\PROJECT-CONTEXT\CODEREF-CORE\CONTEXT.md` | Rich but **STALE** (last_validated 2026-07-02): "11 read-only tools" (line 66) vs actual 26; "15 CLI entry points" (line 46) vs 19; rag-index provider "key-aware openai iff OPENAI_API_KEY" (line 65) contradicts the pinned-ollama default (rag-index.ts:114,161) and the Ollama-local-only rule |
| Repo CLAUDE.md | `CODEREF-CORE\CLAUDE.md` | 3 lines — pure @-include of the above; only helps agents whose cwd is CODEREF-CORE |
| Other projects' CONTEXT.md | `ASSISTANT\PROJECT-CONTEXT\` (26 entries). Sampled: LLOYD (one incidental mention), NFL-SCRAPER (**zero** mentions), ORCHESTRATOR (calls coderef-core "the sole MCP server… for code-graph/RAG queries" line 129 but still lists the RETIRED 6-server MCP fleet at lines 32-33) | Near-zero brokering; one actively misleading |
| Installed wrapper pattern | `C:\Users\willh\.claude\skills\` — 200+ thin wrappers incl. all CORE commands + discover; each ~17 lines "Read canonical SKILL.md, follow exactly" | Works, but discovery is by skill NAME only — nothing says WHICH of 200 skills is the code-intelligence entry |
| MCP self-description | `src/cli/coderef-mcp-server.ts:2629` — `new McpServer({ name, version })` with **NO `instructions` field**. Tool descriptions themselves are excellent (when-to-use + honesty framing: what_calls:2688-2690, find_element:2732-2733, map:3002+ incl. `format:"skeleton"` = "fastest first call for repo orientation") | Tools self-describe well AFTER a ToolSearch load; in deferred-tools environments agents see only names. No server-level orientation string |
| MCP wiring | User-scope `~\.claude.json` → `coderef-core` + `lloyd` global (every session in ANY repo gets the tools); per-repo `.mcp.json` in ASSISTANT + CODEREF-CORE | **Availability solved; awareness not** |
| COMMS | `ASSISTANT\COMMS\<DOMAIN>\{inbox\, journal.jsonl, presence.json}` (~45 domains). Dispatches carry `required_skills[]` (dispatch-session-request SKILL.md:36,62-81) — skills, never MCP tools | Dispatches only point at core if the DISPATCHER already knows to |
| ASSISTANT root docs | README.md lines 214-221: one good table row (coderef-core = the single repo-agnostic MCP server + retired-fleet note); AGENTS.md/ARCHITECTURE.md/CONTEXT.md/VISION.md/LOAD-BEARING.md: zero mentions | One paragraph total, buried |
| CODEREF-CORE self-docs | docs\CLI.md, AGENT-CONTRACT.md, rag-http-api.md, MAP-USER-GUIDE.md; AGENT-WORKFLOW-GUIDE.md is migration-validation-only; root quickstart (2026-07-18) is contributor build-and-test | For working ON core, not USING it from another domain |
| Onboarding skill | None. UTILITIES/coderef-fast-start = 14-service launcher; SESSION/start-here = session snapshot, zero core content | **Missing** |

## Findings (the cold-agent gap analysis)

1. **(a) "That it exists"**: a PS-*/NFL-* agent sees `mcp__coderef-core__*` only in its deferred-tools name list — nothing in its own CONTEXT.md (NFL-SCRAPER: zero), nothing in its repo, no MCP `instructions` string. Discovery is accidental.
2. **(b) "When vs grep"**: written nowhere outside per-tool descriptions that only surface AFTER a ToolSearch load. The engine's best cold-start affordance — `map format:"skeleton"`, self-described as "the fastest first call for repo orientation" — is undiscoverable precisely when it matters. The doctrine ("scan surfaces, not verdicts"; hotspots show WHERE, read files before judging) lives only in operator memory files.
3. **(c) "Exact invocation order"**: the populate-first-then-query contract is encoded in error envelopes (`coderef_artifacts_corrupt` / missing-.coderef hints, coderef-mcp-server.ts:2600-2604) — an agent learns it by FAILING, not by being told. No doc states the canonical 3-step: (1) `reindex`/`populate-coderef <root>` if `.coderef\` absent or stale → (2) `map format:"skeleton"` or `codebase_summary` to orient → (3) targeted graph/RAG queries with `project_root` on every call.
4. **The single canonical entry doc is missing**: CODEREF-CORE/CONTEXT.md is the closest thing and it is stale (counts, provider) and only injected for sessions rooted at CODEREF-CORE.
5. **Per-project CONTEXT.md files have no standard "code intelligence" section** — generate-project-context evidently doesn't template one (sampled outputs lack it).
6. **The wrapper layer amplifies but doesn't orient**: 200+ flat wrappers, no by-capability index; the CORE family is only findable if you already guess "coderef".
7. **ORCHESTRATOR/CONTEXT.md still advertises the retired 6-server MCP fleet** (lines 32-33) — actively misleading in the coordination-hub context.

## Recommendations (ranked)

1. **Add an `instructions` string to the MCP server** — the one surface EVERY agent in every repo receives automatically. Target: `src/cli/coderef-mcp-server.ts:2629` (`new McpServer({ name, version, instructions })`). Sketch: "Code-intelligence over any indexed repo. Every tool REQUIRES project_root (absolute). If .coderef\ is missing/stale: run reindex (or populate-coderef CLI). First call for orientation: map with format:'skeleton', then codebase_summary. Prefer these over grep for: who-calls / impact / cycles / hotspots / semantic search (rag_search). Surfaces, not verdicts — read files before concluding." Effort **S**.
2. **Create the canonical entry doc `ASSISTANT\PROJECT-CONTEXT\CODEREF-CORE\USING-CODEREF.md`** (agent-consumer view, separate from the contributor CONTEXT.md); link from ASSISTANT README's MCP table + CONTEXT.md header. Content: decision table (grep vs find_element vs rag_search vs map), the populate→orient→query sequence with exact CLI + MCP twin per row, freshness/staleness semantics, Ollama prerequisite for RAG. Effort **M**.
3. **Fix CODEREF-CORE/CONTEXT.md staleness now** (26 tools not 11; 19 bins not 15; rag provider = pinned ollama; add map/pack/rename/query rows). Target: `CONTEXT.md:46,65-66`. Effort **S**.
4. **Template a standard "Code intelligence" section into every project's CONTEXT.md** via generate-project-context: 4 lines — "This repo is indexed at .coderef\ (or: run populate-coderef <root>). Query with mcp__coderef-core__* (project_root=<this repo>). Orient with map skeleton. See USING-CODEREF.md." Targets: `SKILLS\DOCUMENTATION\generate-project-context\SKILL.md` + backfill starting with NFL-SCRAPER / primary-sources. Effort **M**.
5. **Add a `/use-coderef` onboarding skill** (CORE): checks `.coderef\` presence/freshness for a root, runs populate if needed, emits skeleton map + codebase_summary, prints the decision table — the runnable form of rec 2. Target: new `SKILLS\CORE\use-coderef\SKILL.md` + thin wrapper. Effort **M**.
6. **Correct ORCHESTRATOR/CONTEXT.md retired-fleet table** (lines 32-33) to the single coderef-core server. Effort **S**.
7. **Have dispatch-session-request auto-suggest core tooling for code-shaped objectives**: extend the required-skills derivation (SKILL.md:71) so build/refactor/investigate objectives inject a `context` pointer to USING-CODEREF.md or `/use-coderef`. Target: `SKILLS\SESSION\dispatch-session-request\SKILL.md`. Effort **M**.

UNVERIFIED (flagged by the researcher, not guessed at): full content of guide-to-coderef-core.md; whether TRACKING/skills.json deliberately excludes generate-foundation-docs; non-sampled PROJECT-CONTEXT files beyond LLOYD/NFL-SCRAPER/ORCHESTRATOR/ASSISTANT.

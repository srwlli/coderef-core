# /discover report — coderef-core-mcp-server-and-intelligence-fixes

**Generated:** 2026-06-12T10:55:00Z
**Depth:** medium
**Output dest:** working:coderef/workorder/coderef-core-mcp-server-and-intelligence-fixes/discover-post-plan.md
**Dispatch:** none

## 1. Scope

What was asked: post-plan audit of WO-CODEREF-CORE-MCP-SERVER-AND-INTELLIGENCE-FIXES-001 surfaces — failing tests, provider defaults, MCP wiring target, skills drift.
What was bounded: the 4 plan phases; the 20,701 unresolved-edge problem explicitly out of scope.

## 2. Surfaces audited

- [tool: rg]            queries=6, hits=40+
- [tool: rag-search]    top-k=10, fallback_used=true — WARNING: vectors_stale (27.1 days old); proceeded grep-only
- [tool: .coderef/index.json]   elements_scanned=2472 (query-executor matches: 82, rag matches: 356)
- [tool: .coderef/headers]      headers consulted via prior session audit (validation-report header_coverage_pct=99.24)
- [tool: foundation-docs]       sections_matched=0 (no coderef/foundation-docs in CORE)
- WARNING: discovery_rag fallback (vectors_stale) — same staleness will affect any /rag-search until reindex (P2-T4 covers reindex)

## 3. Findings table

| Surface | Observation | Severity | Evidence |
|---|---|---|---|
| __tests__/pipeline/output-validation-report.test.ts:31 | REQUIRED_REPORT_FIELDS hardcodes 11 fields; header_coverage_pct missing | critical | `expect(Object.keys(report).sort()).toEqual([...REQUIRED_REPORT_FIELDS].sort())` fails |
| src/pipeline/output-validator.ts:110-121 | Validator source DOCUMENTS header_coverage_pct as additive-only under the stability rule — the contract change was intentional, only the test lagged | info | "header_coverage_pct was added under this [rule]" |
| __tests__/pipeline/output-validation-real-world-noregress.test.ts:78 | Comment also says "all 11 fields" — verify whether it asserts exact keys; update comment/assertion in same pass | warning | passed in last run but comment is stale |
| __tests__/populate-cli.test.ts:64-90,140-150 | Failing tests exec `node dist/src/cli/populate.js` — they test BUILT dist, not src; stale dist is prime suspect | critical | rebuild (npm run build) before diagnosing; CI must build-then-test |
| src/cli/rag-index.ts:93 | `provider: envProvider \|\| 'openai'` — the exact line P2-T1 changes (also rag-search.ts equivalent) | info | OPENAI_API_KEY throw at :256-258 |
| src/query/query-executor.ts:68 | Single `QueryExecutor` class export — clean wrap target for MCP tools | info | what-calls/what-imports/shortest-path live here |
| .mcp.json (CORE root) | Absent — P3-T5 creates fresh, no merge conflict risk | info | clean create |
| ASSISTANT/SKILLS/CORE/*/SKILL.md | 10 skills reference CORE CLIs (pipeline, rag-server, scan, watch, foundation-docs, populate, rag-index, rag-search, rag-status, scan-frontend-calls) | warning | P4-T1 scope is 10 files, not "a few" |

## 4. Type/contract divergences

Not applicable for depth=medium.

## 5. Recommendations with priority

| Rec ID | Priority | Action | Owner |
|---|---|---|---|
| REC-001 | high | P1-T3: rebuild dist (npm run build) FIRST, rerun populate-cli tests — if green, root cause was stale dist and CI ordering (build→test) is the real fix | CODEREF-CORE |
| REC-002 | high | P1-T2: update BOTH locked-schema test (12 fields) AND noregress test comment in same commit; cite output-validator.ts:110 stability rule | CODEREF-CORE |
| REC-003 | medium | P2-T1: change rag-index.ts:93 + rag-search.ts equivalent to `envProvider \|\| (hasCloudKey ? 'openai' : 'ollama')`; keep --provider override | CODEREF-CORE |
| REC-004 | medium | P4-T1: enumerate all 10 CORE skills; only UPDATE those whose contracts drift (rag-index, rag-search, rag-status, coderef-rag-server most likely; scan/watch unaffected by MCP) | CODEREF-CORE |
| REC-005 | low | P2-T4 reindex also cures the 27.1-day vector staleness blocking RAG discovery ecosystem-wide | CODEREF-CORE |

## 6. Reuse template note

This report shape is the canonical `/discover` output. To consume it programmatically: the table headers in §3 and §5 are fixed; section ordering is fixed. Downstream skills (create-workorder, stub, dispatch-session-request) can grep for the `## N.` markers to extract sections.

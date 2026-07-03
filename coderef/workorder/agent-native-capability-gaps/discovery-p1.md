# /discover report — gaps in WO-AGENT-NATIVE-CAPABILITY-GAPS-001 Phase 1 AS EXECUTED (commit e5b6f66)

**Generated:** 2026-07-03T10:15:00Z
**Depth:** thorough
**Output dest:** workorder:WO-AGENT-NATIVE-CAPABILITY-GAPS-001
**Dispatch:** none

## 1. Scope

What was asked: "gaps in WO-AGENT-NATIVE-CAPABILITY-GAPS-001 Phase 1 AS EXECUTED (commit e5b6f66) — the four new outbound/path MCP tools (what_this_calls / what_this_imports / what_this_depends_on / path_between). Surface missing coverage, untested edge cases, correctness/consistency gaps vs the existing 11 tools, and regression risk the P1 tests do not yet catch, before proceeding to Phase 2."

What was bounded: a **post-implementation audit of the code P1 actually landed** (src/cli/coderef-mcp-server.ts + __tests__/mcp-server.test.ts at e5b6f66), read against the existing inbound tools it mirrors and against the CanonicalGraphQuery methods it delegates to. NOT a re-audit of the WO plan (see discovery.md for that). Method: read the landed handlers + their canonical-graph callees + the test file, and compare contract field-by-field against the mirror inbound tool (feedback_scan_surfaces_not_verdicts — the code decides whether a divergence is a defect).

## 2. Surfaces audited

Provenance of every source consulted:

- [tool: rg]            queries=2, hits=6 (outbound handler defs; total/returned/truncated field sites)
- [tool: rag-search]    top-k=0, ms=0, fallback_used=false  (skipped — code-ground-truth audit of a known 4-handler diff, not a semantic lookup; RAG would add noise)
- [tool: .coderef/index.json]   elements_scanned=0  (audit reads the landed source directly)
- [tool: .coderef/headers]      headers_consulted=0
- [tool: coderef-query]         depth-of-walk=0  (divergence pass done by direct read of collectNeighbors, not a CLI walk)
- [tool: foundation-docs]       sections_matched=0
- [tool: direct-read]  files_read=3 (coderef-mcp-server.ts:300-476 handlers, canonical-graph.ts:191-235 collectNeighbors/calleesOf, mcp-server.test.ts new suites)
- NOTE: this audits code at commit e5b6f66; the full suite was green (1511 passed) at that commit, so every gap below is a LATENT consistency/observability issue, not a failing test.

## 3. Findings table

| Surface | Observation | Severity | Evidence |
|---|---|---|---|
| coderef-mcp-server.ts:342 vs :379 | `total` counts DIFFERENT things across the mirror pair. what_calls.total counts inbound EDGES (`total++` per edge, :322-323) — one element called twice by the same caller counts twice. what_this_calls.total = `neighbors.length` (:364), and calleesOf dedupes by neighbor id. So an agent comparing what_calls(X).total to what_this_calls(X).total compares edge-count to distinct-node-count. | warning | inboundByKind `total++` per edge (:322); outboundByKind `const total = neighbors.length` (:364) |
| canonical-graph.ts:202 | Outbound tools SILENTLY DROP self/intra-set neighbors: collectNeighbors skips `ids.has(neighbor)` (:202). For a byFile query, a call from element A to element B *in the same file* is omitted from what_this_calls. The inbound tools (cache.inbound loop) have no such exclusion. Only visible on file-grain queries. | warning | `if (!ids.has(neighbor) && !hits.has(neighbor))` :202 — self/intra-set filtered |
| coderef-mcp-server.ts:365-371 | Outbound tools DROP the call-site `at:` location that what_calls surfaces. what_calls hits carry `at: file:line` (:331-333); calleesOf returns node summaries only, so what_this_calls callees have no site info. Arguably fine for P1 (rich-evidence passthrough is explicitly P3-T4's job) but the mirror is asymmetric NOW. | info | what_calls `at:` (:331); outboundByKind hit has no `at` (:365-371) |
| coderef-mcp-server.ts:447 + canonical-graph.ts:344 | path_between mode=all has a DOUBLE cap: allPaths caps internally at maxPaths=50, THEN the handler caps at `cap` (default 25). `truncated` = `results.length > cap` but results.length is already ≤50 — an agent cannot tell whether there were exactly 50 or 500 real paths. Silent upstream truncation (the skill's own "no silent caps — log what was dropped" rule). | warning | allPaths maxPaths=50 (canonical-graph.ts:344); handler truncated on already-capped results (:455) |
| mcp-server.test.ts new suites | The P1 tests assert direction-correctness + ordered chains, but do NOT assert: (a) the total-semantics of the mirror pair, (b) the byFile self-exclusion edge, (c) the mode=all maxPaths=50 boundary, (d) the outbound limit-truncation `truncated=true` path (the one truncation test uses main→alpha where total=1, so truncated is always false — it never exercises the true branch). So a regression in outbound truncation would pass CI. | warning | what_this_calls limit test asserts `truncated:false` only (:new); no total-parity or maxPaths test |
| coderef-mcp-server.ts:401 vs :463 | max_depth defaults differ by tool, undocumented in one place: what_this_depends_on default 5 / cap 10; path_between shortest default 10 / cap 20; all default 5 / cap 10. Defensible (paths need more depth than dep-walk) and each is in its tool description, but there is no single place an agent sees the matrix. Minor. | info | depthCap clamps at :401, :446, :463 |
| coderef-mcp-server.ts:358,399,434 | loadCanonical builds a CanonicalGraphQuery that RE-DERIVES its own inbound+outbound+file maps from the same graph — so the server now holds TWO adjacency structures (cache.inbound for inbound tools, cache.canonical for outbound). They read the same graph.json and are both mtime-invalidated together (:130), so they cannot diverge, but memory ~2x for the adjacency. Acceptable for the reuse-tested-traversal tradeoff; noted for P5 (incremental) awareness. | info | cache.inbound built at :138; cache.canonical built lazily at loadCanonical |

## 4. Type/contract divergences

| Caller | Callee | Field | Observed shape | Notes |
|---|---|---|---|---|
| what_this_calls | (response) | `total` | distinct-callee count | mirror what_calls.total = edge count — different scale (F: row 1) |
| what_this_calls | (response) | callee entry | `{id,name,type,file,line}` | what_calls caller entry additionally has `at: file:line` — asymmetric (F: row 3) |
| path_between mode=all | allPaths | `total` | ≤ min(50, actual) | internal maxPaths=50 hides true count above 50 (F: row 4) |
| what_this_depends_on | (response) | `transitive_dependencies` | full count; sample capped at min(10,cap) | consistent with impact_of.transitive_dependents — OK |

## 5. Recommendations with priority

| Rec ID | Priority | Action | Owner |
|---|---|---|---|
| REC-P1-001 | medium | Add a `distinct_targets` (or rename) note OR align `total` semantics across the mirror pair: either count distinct callers in what_calls too, or document in both tool descriptions that inbound.total = edges and outbound.total = distinct nodes. Cheapest: one sentence in each tool's `description`. | coderef-core |
| REC-P1-002 | medium | Surface the maxPaths=50 boundary in path_between mode=all: add `capped_at_source: 50` or an `internal_cap_hit: boolean` when results.length === 50, so an agent knows the enumeration was bounded upstream (the skill's no-silent-cap rule). | coderef-core |
| REC-P1-003 | medium | Add the missing edge-case tests before P2 review: (a) an outbound truncation case where total>cap so `truncated:true` is exercised; (b) a byFile query asserting the self/intra-file exclusion is intentional (or a bug); (c) a mode=all boundary test. These close the "regression passes CI" gap. | coderef-core |
| REC-P1-004 | low | Decide the `at:` asymmetry explicitly: either accept it (P3-T4 rich-evidence passthrough will address outbound too) and note it, or add sourceLocation to the outbound hits now. Recommend DEFER to P3 and add a one-line "outbound site info: see P3" note. | coderef-core |
| REC-P1-005 | low | Document the max_depth default/cap matrix in one place (a comment block or the header doc) so the three differing defaults are discoverable together. | coderef-core |

## 6. Reuse template note

This report shape is the canonical `/discover` output. Section ordering + §3/§5 headers are fixed for programmatic extraction.

**Audit verdict:** Phase 1 as executed is **correct and green** — direction semantics are right (proven by the 14 tests + live smoke), the existing 11 tools are untouched, and the build/suite pass at e5b6f66. Every gap found is a **consistency or observability** issue, NOT a correctness bug: (1) the mirror pair's `total` field counts edges vs distinct-nodes; (2) outbound silently drops intra-set neighbors on byFile queries; (3) `at:` call-site info is asymmetric (deferrable to P3); (4) mode=all's internal maxPaths=50 is a silent upstream cap; (5) the P1 tests don't exercise the outbound truncated=true branch, the byFile self-exclusion, or the maxPaths boundary — so a regression there would pass CI. None blocks Phase 2. The two worth folding in before P2 review are REC-P1-001 (total-semantics parity/doc) and REC-P1-003 (the three missing edge-case tests). REC-P1-002/004/005 are low-cost polish that can ride along or defer.

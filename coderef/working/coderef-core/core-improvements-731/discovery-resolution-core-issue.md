# /discover report — core issue: graph resolution rate 22.41%, 18,249 unresolved edges

**Generated:** 2026-08-01T08:18:58Z
**Depth:** medium
**Output dest:** working:C:/Users/willh/Desktop/CODEREF/CODEREF-CORE/coderef/working/coderef-core/core-improvements-731/discovery-resolution-core-issue.md
**Dispatch:** none

## 1. Scope

What was asked: why is the resolution rate 22.41% with 18,249 unresolved edges, and what is the actual composition of the unresolved population (reason classes, receiver_not_in_symbol_table, scope-binding pass yield)?
What was bounded: `.coderef/validation-report.json` scalars + the `unresolved_edges` MCP surface (faceted probes) + GX-002 close evidence.

## 2. Surfaces audited

- [tool: skeleton-map]          present (cached), 32 lines
- [tool: rg]                    queries=1, hits=0
- [tool: rag-search]            top-k=10, ms=4317, lane=hybrid, fallback_used=false
- [tool: element-lookup]        source=symbol-table (rag-search --lexical), candidates=10, elements_indexed=3190
- [tool: header-index]          defined=366, missing=5, stale=1, coverage=98.12% (validation-report.json)
- [tool: foundation-docs]       sections_matched=8
- [tool: codebase_summary]      elements=3190, top types: function=1092, method=965, interface=611, generated=2026-08-01T07:13:03.585Z
- [tool: validation_status]     resolution_rate=22.41%, resolved_of_resolvable=32.8%, unresolved=18249, unresolved_src=948, ambiguous=1722 (ambiguous_src=1189), builtin=13457, external=319, provisional=1241
- [tool: unresolved_edges MCP]  faceted probes (agent-added): status=unresolved total; reason=receiver_not_in_symbol_table; reason=callee_not_in_symbol_table; reason=not_in_symbol_table superset; file=.test.; relationship=import; + one detailed sample page
- *Agent-added:* GX-002 analysis.json (follow_up_candidates FU-1..4, metrics_diff), P3c builtin-reclassify ruling precedent (2026-07-09)

## 3. Findings table

| Surface | Observation | Severity | Evidence |
|---|---|---|---|
| unresolved_edges (file facet) | **94.8% of all unresolved edges live in test files** — 17,301 of 18,249 match `*.test.*`; the non-test unresolved population is **948** (= `unresolved_src_count`) | **critical** | faceted totals, 2026-08-01 |
| unresolved_edges (reason facet) | `callee_not_in_symbol_table` = **10,444**, dominated by vitest ambient globals (`describe`, `it`, `expect`, `beforeEach`, ...) injected by the framework — they can NEVER be in the project symbol table | **critical** | detailed sample page: every hit is `it`/`expect` |
| unresolved_edges (reason facet) | `receiver_not_in_symbol_table` = **7,739** (down from 10,691 at PLAN.md time); sample shows `expect(output.byType.fetch)`-style matcher-chain receivers (test DSL again); GX-002 FU-2 attributes 5,050 of the class to dotted field-path receivers | warning | probes + GX-002 FU-2 |
| unresolved_edges (relationship facet) | Imports are essentially solved: only **17** unresolved import edges repo-wide | info | faceted total |
| .coderef/validation-report.json | `resolved_of_resolvable` = **32.8%** already exists (excludes 13,457 builtin + 319 external) but still counts test-DSL calls as resolvable — even the honest metric is deflated by the same artifact | warning | scalars |
| GX-002 close (653b9db) | Scope-binding pass moved the headline only +0.13pp (+106 resolved, 14 direct wins) — small ONLY against the polluted denominator; against the true production gap (948 unresolved + 1,189 ambiguous in src) the remaining work is tractable | info | analysis.json metrics_diff |
| P3c ruling precedent (2026-07-09) | This fix class has run before: `js_prototype_member` calls ruled unresolved→builtin (data-backed, zero graph edges changed). The test-DSL population is the same shape: honestly-unresolvable, mechanically detectable, denominator-polluting | info | P3c builtin-reclassify ruling |
| GX-002 FU-1 | Already proposed the receiver-side slice (expect*/vi vocabulary reclassify, ~15-20% of the receiver class) — but the callee side (10,444) is the larger half and was not scoped there | info | analysis.json FU-1 |

**The core issue in one sentence:** the 22.41% headline is a **denominator artifact, not a resolver failure** — ~95% of "unresolved" edges are test-framework DSL calls (ambient globals + matcher chains) that no symbol-table resolver could ever resolve; the true production-code gap is 948 unresolved + 1,189 ambiguous edges in src.

## 4. Type/contract divergences

Not applicable for depth=medium.

## 5. Recommendations with priority

| Rec ID | Priority | Action | Owner |
|---|---|---|---|
| REC-R1 | high | Mint a test-DSL disposition stub (successor to GX-002 FU-1, widened to BOTH sides): classify vitest/jest ambient callees (`describe/it/expect/beforeEach/afterEach/vi/...`, framework-detected + test-file-guarded) and `expect()`-rooted matcher receivers into a builtin-like disposition (e.g. `test_dsl`), removing them from the resolvable denominator. Precedent: the P3c `js_prototype_member` ruling (same operator-ruling shape; zero graph edges change). Projected effect: unresolved 18,249 → ≈948 + residual; the honest rate becomes visible without resolving anything new. | CODEREF-CORE (operator ruling + WO) |
| REC-R2 | high | GX-003 disclosure correction: the rename_apply blind-spot envelope must report **stratified** numbers — `unresolved_src_count` (948) and `resolved_of_resolvable` (32.8%) alongside the raw totals — and state the test-DSL confound until REC-R1 lands. Quoting the polluted 22.41%/18,249 headline alone overstates the production blind spot ~19×. | CODEREF-CORE (folded into WO GX-003) |
| REC-R3 | medium | The real resolver frontier after reclassify: FU-2 dotted-receiver field-path walking (5,050 edges, size L) and FU-3 heritage-aware own-methods (M) — sequence after REC-R1 so yield is measured against an honest denominator. | CODEREF-CORE |
| REC-R4 | low | FU-4 incremental writeback path-keying fix (S) — unchanged; pairs with STUB-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001. | CODEREF-CORE |

## 6. Reuse template note

This report follows the canonical `/discover` 6-section shape. Downstream tooling can grep for `## N.` markers to extract sections.

To reproduce: `/discover "core issue: graph resolution rate 22.41 percent, 18249 unresolved edges" --depth=medium --output-dest=working:coderef/working/coderef-core/core-improvements-731/discovery-resolution-core-issue.md` (the faceted `unresolved_edges` probes are the agent-added leg).

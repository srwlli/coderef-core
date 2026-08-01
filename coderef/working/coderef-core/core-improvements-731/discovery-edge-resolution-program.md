# /discover report — edge-resolution improvement program: test-DSL reclassify + dotted-chain receivers + heritage-aware lookup + incremental keying (REC-R1, GX-002 FU-1..4)

**Generated:** 2026-08-01T09:13:34Z
**Depth:** thorough
**Output dest:** working:C:/Users/willh/Desktop/CODEREF/CODEREF-CORE/coderef/working/coderef-core/core-improvements-731/discovery-edge-resolution-program.md
**Dispatch:** none

## 1. Scope

What was asked: `edge-resolution improvement program: test-DSL reclassify + dotted-chain receivers + heritage-aware lookup + incremental keying (REC-R1, GX-002 FU-1..4)`.
What was bounded: unbounded — full project root.

## 2. Surfaces audited

- [tool: skeleton-map]          present (cached), 156 lines
- [tool: rg]                    queries=1, hits=0
- [tool: rag-search]            top-k=10, ms=1131, lane=hybrid, fallback_used=false
- [tool: element-lookup]        source=symbol-table (rag-search --lexical), candidates=10, elements_indexed=3215
- [tool: header-index]          defined=369, missing=5, stale=1, coverage=98.14% (validation-report.json)
- [tool: foundation-docs]       sections_matched=8
- [tool: codebase_summary]      elements=3215, top types: function=1109, method=966, interface=615, generated=2026-08-01T09:10:22.971Z
- [tool: validation_status]     resolution_rate=22.42%, unresolved=18527, ambiguous=1730, header_coverage=98.14%
- [tool: coderef-query]         walks=10, divergence_rows=5
- [tool: graph-risk]            hotspots_top=5, cycles=0 (largest=0), edges=44495

### Orientation (skeleton map excerpt)

```
# repo map (skeleton): CODEREF-CORE — 476 files, 855 edges — budget ~1600 tokens
# ranked by dependency centrality (most depended-on first); in/out = distinct dependents/dependencies. surfaces, not verdicts.

src/scanner/lru-cache.ts  (in 103 / out 1)
  class LRUCache
  interface ScanCacheEntry
  fn createScannerCache(maxSizeBytes)

src/pipeline/orchestrator.ts  (in 54 / out 15)
  class PipelineOrchestrator

src/utils/path-normalize.ts  (in 37 / out 0)
  fn normalizeSlashes(p)
  fn toRepoRelativePosix(file, projectPath)
```

## 3. Findings table

| Surface | Observation | Severity | Evidence |
|---|---|---|---|
| .coderef/validation-report.json | Raw headline resolution_rate 22.42%, unresolved 18,527 total — but unresolved_src_count is 959 and resolved_of_resolvable 32.83%; ~95% of raw unresolved is test-DSL vocabulary (denominator artifact, quantified in discovery-resolution-core-issue.md) | critical | resolution_rate=22.42, unresolved_src_count=959 |
| src/pipeline/call-resolver.ts | Home of the P3c `js_prototype_member` reclassify precedent — the exact mechanism REC-R1 would extend with a `test_dsl` disposition (framework-detected ambient callees + test-file guard); zero graph edges change | info | js_prototype_member classification lives here |
| src/pipeline/scope-binding.ts | GX-002 shipped scope-stack receiver inference here (22.11%→22.24%, +14 edges); honest-ceiling analysis: remaining src tail is ~65% dotted receivers + test-framework vocab | info | GX-002 P1 core 0032e95 |
| src/pipeline/edge-confidence.ts + field-index.ts | FU-2 dotted-chain receiver field-path walking surface (~5,050 edges, size L per REC-R3) — the largest genuine recall lever after reclassify | warning | REC-R3: FU-2 5,050 edges |
| src/pipeline/graph-builder.ts | FU-3 heritage-aware own-method lookup surface (size M): method calls on `this`/subclass receivers miss inherited methods in the symbol table | warning | REC-R3: FU-3 size M |
| src/pipeline/indexing (incremental writeback) | FU-4 absolute-vs-relative incremental-facts path-keying defect — fail-closed today; blocks incremental E2E parity (STUB-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001 class, repro in GX-002 comm.json) | warning | GX-002 deviation log |
| src/cli/mcp/context-tools.ts + coderef-mcp-server.ts | Stratified `resolution_disclosure` (REC-R2) SHIPPED in GX-003 — every rename_apply response reports the honest numbers + confound note until REC-R1 lands | info | GX-003 b9173c9 |
| SCIP overlay (populate-coderef --scip) | Already-live opt-in compiler-grade resolution overlay (STUB-BQQJSY); orthogonal to this program — no new work needed here | info | USING-CODEREF.md trust rules |

### Lever disposition (the operator's three-item list, verified)

1. **REC-R1 test_dsl reclassify** = GX-002 FU-1 widened to both sides (ambient callees AND expect()-matcher receivers). One lever, not two. NEEDS an operator ruling (P3c shape). Projected: unresolved 18,527 → ≈959 + residual; headline becomes honest without resolving anything new.
2. **FU-2 dotted-chain receivers (L, ~5,050 edges) + FU-3 heritage-aware lookup (M)** — the genuine recall frontier; sequence AFTER reclassify so yield is measured against an honest denominator (REC-R3).
3. **FU-4 incremental keying fix (S)** — correctness/parity fix, pairs with the existing path-normalization stub; independent of the denominator question.
4. **SCIP overlay** — already shipped; excluded from this program.

## 4. Type/contract divergences

| Caller | Callee | Field | Observed shape | Notes |
|---|---|---|---|---|
| (no inbound callers observed) | rEdge (__tests__/pipeline/output-validation-graph-integrity.test.ts) | call/dependency edges | callers_in=0, transitive_dependents=0 | impact surface from graph walk — read the cited files before editing |
| (no inbound callers observed) | ALL_BUILTIN_RECEIVERS (__tests__/pipeline/call-resolution-builtin.test.ts) | call/dependency edges | callers_in=0, transitive_dependents=0 | impact surface from graph walk — read the cited files before editing |
| (no inbound callers observed) | rec (__tests__/integration/rag/hybrid-fusion.test.ts) | call/dependency edges | callers_in=0, transitive_dependents=0 | impact surface from graph walk — read the cited files before editing |
| (no inbound callers observed) | BUILTIN_RECEIVERS (src/pipeline/call-resolver.ts) | call/dependency edges | callers_in=0, transitive_dependents=1 | impact surface from graph walk — read the cited files before editing |
| (no inbound callers observed) | fullEdgeSignature (__tests__/pipeline/incremental-parity.test.ts) | call/dependency edges | callers_in=0, transitive_dependents=0 | impact surface from graph walk — read the cited files before editing |

## 5. Recommendations with priority

| Rec ID | Priority | Action | Owner |
|---|---|---|---|
| REC-E1 | high | Obtain the P3c-shaped operator ruling on the `test_dsl` disposition (scope: both sides per REC-R1 vs callee-only), then implement in call-resolver.ts as a classification-only change (zero graph edges change, measured before/after per KZ-01KYTSCY) | CODEREF-CORE (operator ruling first) |
| REC-E2 | high | FU-2 dotted-chain receiver field-path walking (~5,050 edges) — the largest recall lever; land after REC-E1 so the yield reads against the honest denominator | CODEREF-CORE |
| REC-E3 | medium | FU-3 heritage-aware own-method lookup — extend symbol-table method resolution through the heritage graph | CODEREF-CORE |
| REC-E4 | medium | FU-4 incremental writeback path-keying fix — unblocks incremental E2E parity; coordinate with STUB-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001 | CODEREF-CORE |
| REC-E5 | low | After each leg: re-populate + record the stratified metrics diff (resolution_rate, unresolved_src_count, resolved_of_resolvable) so the disclosure numbers in rename_apply stay current | CODEREF-CORE |

## 6. Reuse template note

This report follows the canonical `/discover` 6-section shape. Downstream tooling can grep for `## N.` markers to extract sections.

To reproduce this exact audit: `/discover "edge-resolution improvement program: test-DSL reclassify + dotted-chain receivers + heritage-aware lookup + incremental keying (REC-R1, GX-002 FU-1..4)" --depth=thorough --output-dest=working:C:/Users/willh/Desktop/CODEREF/CODEREF-CORE/coderef/working/coderef-core/core-improvements-731/discovery-edge-resolution-program.md`.

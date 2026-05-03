# Execution Notes — WO-PIPELINE-CALL-RESOLUTION-001 (Phase 4)

**Dispatch:** DISPATCH-2026-05-02-014
**Phase:** 4 of 9-phase pipeline rebuild (sequence 6/10; Phase 0/1/2/2.5/3 archived)
**Author:** CODEREF-CORE
**Completed:** 2026-05-03

## Summary

Two-pass call resolver landed. Pass 1 indexes every PipelineState.element
into a project-wide scope-aware Map<name, SymbolTableEntry[]> plus every
resolved Phase 3 ImportResolution.localName as a scope='imported' entry.
Pass 2 classifies every RawCallFact into one of five
CallResolutionKinds — `{resolved, unresolved, ambiguous, external,
builtin}` — using receiver text, scope path, the symbol table, and a
narrow `const X = new Y()` initializer scan (option-1 + 4 ORCHESTRATOR
guardrails). Resolved calls become `resolved-call` graph edges using
canonical codeRefIds when both endpoints are bound. Phase 3's
`__tests__/pipeline/no-call-resolution.test.ts` boundary enforcer was
deleted; `__tests__/pipeline/no-graph-construction-leaks.test.ts` lands
as the Phase 5 boundary enforcer.

## Exit criteria (per roadmap.md lines 314–319)

| # | criterion | proof | status |
|---|---|---|---|
| 1 | duplicate function names do not resolve incorrectly | `__tests__/pipeline/call-resolution-ambiguous.test.ts` (AC-05): two files each define `helper`; third file calls `helper()`. kind='ambiguous', candidates=[helperA.codeRefId, helperB.codeRefId], resolvedTargetCodeRefId=undefined. Phase 0 ground-truth test 3 (`requires duplicate function name calls to be marked ambiguous with candidate IDs`) FULLY FLIPS. | PASS |
| 2 | unresolved calls are explicit | `__tests__/pipeline/call-resolution-shape.test.ts` (AC-01): every RawCallFact produces exactly one CallResolution. `__tests__/pipeline/call-resolution-obj-method.test.ts` (AC-04): unknown receiver → kind='unresolved' with reason='receiver_not_in_symbol_table'. Phase 0 ground-truth test 2 call-side flips. | PASS |
| 3 | ambiguous calls include candidate IDs | AC-05 test (1.13) asserts `candidates` array populated with ≥2 codeRefIds for ambiguous classifications. Phase 0 ground-truth test 6 all-edge-distinguish PASSES. | PASS |
| 4 | built-ins are not treated as project dependencies | `__tests__/pipeline/call-resolution-builtin.test.ts` (AC-02): all 15 BUILTIN_RECEIVERS (Array, Object, Promise, Map, Set, String, Number, Boolean, RegExp, Date, Error, JSON, Math, Reflect, Symbol) classify as kind='builtin' with reason='in_allowlist'; ZERO resolved-call graph edges emitted for builtin-only fixture. | PASS |

All 4 exit criteria PASS.

## Phase 0 ground-truth flip status

Per dispatch contract: 4 of 6 ground-truth tests have call-related
assertions that MUST flip to PASS in Phase 4; the 2 fully-call-only
tests MUST FULLY FLIP; test 1's endpoint-is-node-id assertion (line 52)
MUST STILL FAIL — Phase 5 owns codeRefId-as-endpoint promotion on
legacy edges.

| test | type | Phase 4 result |
|---|---|---|
| `requires resolved import and call edges to use graph node IDs as endpoints` | both | CALL-side `resolutionStatus === 'resolved'` flipped to PASS. ENDPOINT-side (line 52 `ids.has(edge.source)`) STAYS FAIL — Phase 5 work as required. |
| `requires unresolved imports and calls to be explicit graph facts` | both | Line 100 `expectUnresolved(findEdge(graph, 'calls', 'missingCall'))` PASSES. Test fully flips (import-side flipped in Phase 3, call-side flipped here). |
| `requires duplicate function name calls to be marked ambiguous with candidate IDs` | call-only | FULLY FLIPS to PASS. |
| `requires alias imports to bind the local alias back to the exported source symbol` | both | Test 4 fully PASSES. Call-side `resolutionStatus`, `targetElementId`, `importedAs`, `exportedName` all populated by orchestrator's call-edge enrichment loop. |
| `requires nested functions and class method calls to preserve qualified context` | call-only | FULLY FLIPS to PASS. Required Phase 1 surface fix (nested-fn naming) — see "Phase 1 surface change" section below. |
| `requires graph validation to distinguish resolved, unresolved, and ambiguous edges` | both | Test PASSES. All edge kinds (`resolved`, `unresolved`, `ambiguous`) on both imports and calls satisfy the all-edge invariant. |

**Halt-and-report verification:** ZERO non-call assertions flipped
unexpectedly. Test 1's endpoint-is-node-id assertion correctly STAYS
FAIL. Test 5 required a Phase 1 surface change which was surfaced via
halt-and-report and signed off by ORCHESTRATOR before being applied
(see next section).

## Phase 1 surface change (signed off by ORCHESTRATOR)

**Halt-and-report:** Test 5 expected `graph.nodes.find(n => n.name ===
'entry.inner')` to find a node — but the existing AST scanners emitted
nested function declarations with bare names (`inner`), only qualifying
class methods (`Class.method`). This is a Phase 1 surface inconsistency,
NOT phase-bleed: class methods qualified, nested functions did not. The
asymmetry was surfaced by Phase 4's call resolution work, which is
exactly what halt-and-report exists for.

**ORCHESTRATOR signed off** on a narrow Phase 1 fix scoped by 6
constraints:

1. ✓ Only literal `function inner() {}` nested in `function entry() {}`
   qualifies as `entry.inner`.
2. ✓ `currentFunction?: string` parameter added to both scanners'
   traversal functions, mirroring the existing `currentClass` mechanism.
3. ✓ Top-level functions stay bare (no leading dot, no `<anonymous>.`).
4. ✓ Arrow functions and `const x = function() {}` expressions are NOT
   tracked — these stay bare regardless of nesting.
5. ✓ Full test suite reconciliation: baseline (no Phase 4) failed
   70/1434 tests; with Phase 4 + scanner fix fails 67/1434 tests. NET
   +3 tests pass (the 3 Phase 0 ground-truth flips). ZERO new
   regressions outside pipeline/. Pipeline suite improved from
   91/94 → 93/94.
6. ✓ Documented here (this section).

**Files changed:**
- `src/pipeline/extractors/element-extractor.ts` (canonical pipeline scanner)
- `src/analyzer/ast-element-scanner.ts` (legacy AST scanner, kept in sync)

**Symmetry the change introduces:** before, `Class.method` qualified
but `entry.inner` did not. After, both qualify the same way. The
Phase 4 call resolver's nested-scope handling (AC-06) and Phase 0
test 5's "preserve qualified context" expectation now align with
the scanner's emitted element names.

**Existing tests requiring adjustment:** none. The 22 failing test
files outside pipeline/ in the baseline run were pre-existing failures
(chroma/pinecone external-service connectivity, scanner-export
unrelated regressions). My change reduced total failures, did not
introduce any.

## populate-coderef regression check (dispatch halt-condition #3)

| metric | Phase 3 baseline | Phase 4 result | delta |
|---|---|---|---|
| totalElements | 2371 | 2393 | +0.9% (within OoM) |
| graph.nodes | 2371 | 2393 | +0.9% |
| graph.edges total | 12428 | 14787 | +19% (entirely from new resolved-call edges) |
| imports edges | 1224 | 1280 | +4.5% (downstream of nested-fn rename — more elements own more imports) |
| calls edges | 11204 | 11328 | +1.1% |
| resolved-import edges | 0 | 0 | unchanged (module-level imports have null importerCodeRefId per Phase 3 design) |
| resolved-call edges | n/a | 2179 | NEW — Phase 4 emission |
| state.callResolutions | n/a | populated for every RawCallFact | new |

NO regression > order-of-magnitude. PASS.

## Test summary

- **Phase 4 new tests (1.9–1.19):** 11 files / 17 cases — ALL PASS.
  - call-resolution-shape (AC-01 integration)
  - call-resolution-builtin (AC-02 unit, 15 receivers)
  - call-resolution-this-method (AC-03)
  - call-resolution-obj-method (AC-04 + guardrail-4 factory test)
  - call-resolution-ambiguous (AC-05)
  - call-resolution-nested-scope (AC-06)
  - call-resolution-imported-symbol (AC-07 cross-phase)
  - call-resolution-determinism (AC-08 INVARIANT)
  - call-resolution-two-pass-ordering (AC-09 INVARIANT)
  - no-graph-construction-leaks (AC-10 Phase 5 boundary enforcer)
  - call-resolution-pre-phase3-assertion (R-PHASE-4-B halt-on-null)
- **Phase 1/2/2.5/3 carryover tests:** ALL PASS.
- **Phase 0 ground-truth (`graph-ground-truth.test.ts`):** 6 tests —
  5 PASS, 1 FAIL (test 1 line 52 endpoint-is-node-id, **correct per
  Phase 5 contract** — Phase 5 owns codeRefId-as-endpoint promotion on
  legacy edges).
- **Pre-existing `pipeline-snapshot.test.ts` failure:** still failing —
  was failing in HEAD prior to Phase 3 close, verified again here.
  Unrelated to Phase 4 scope.

**Pipeline test suite:** 93 PASS / 1 FAIL (94 total). The 1 remaining
failure matches the dispatch-contract Phase 5 hold-out exactly.
**Full test suite:** 1367 PASS / 67 FAIL. Same 67 failures as baseline
WITHOUT Phase 4 minus the 3 Phase 0 ground-truth tests that flipped —
i.e., Phase 4 introduced ZERO new regressions and delivered NET +3
test PASSES. tsc --noEmit clean.

## Decision-record verification

| DR | rule | implementation |
|---|---|---|
| DR-PHASE-4-A | built-in detection allowlist strategy (BUILTIN_RECEIVERS const) | `BUILTIN_RECEIVERS` exported from `call-resolver.ts` with 15 names. `isBuiltinReceiver` does O(1) Set lookup. AC-02 test enforces with all 15 receivers + zero-edge assertion. |
| DR-PHASE-4-B | method-call ambiguous-vs-unresolved policy (this/obj/super branching) | `classifyMethodCall` branches on receiver: `this` → enclosing class own methods; `super` → unresolved (out of scope per guardrail 3); known-receiver via `new ClassName()` initializer scan → that class's own methods (option-1 + guardrails 1+3); imported-binding receiver → ambiguous (no module-export walking); unknown receiver → ambiguous-or-unresolved per guardrail 4. AC-03 / AC-04 tests enforce. |
| DR-PHASE-4-C | cross-phase consumption of Phase 3 ImportResolution (read-only snapshot) | `resolveCalls` reads `state.importResolutions` only; the array is never mutated; `classifyMethodCall` and `classifyBareCall` use only `localName` / `resolvedTargetCodeRefId` / `kind` / `sourceFile`. Halt-on-null assertion at top of `resolveCalls` enforces ordering (R-PHASE-4-B). AC-08 purity test + 1.19 halt-on-null test enforce. |
| DR-PHASE-4-D | two-pass timing (mirrors Phase 3) | `resolveCalls` calls `buildSymbolTable` first then `resolveCallsAgainstTable`. SymbolTable threaded as parameter to pass 2. AC-09 test (`call-resolution-two-pass-ordering.test.ts`) wraps the SymbolTable's `set` method on the returned instance and asserts ZERO writes during pass 2. |

## Risk mitigation

| risk | disposition |
|---|---|
| R-PHASE-4-A: built-in detection cardinality | Allowlist strategy with 15 names committed; extensibility note in code says additions require pairing unit test. AC-02 test enforces all 15. |
| R-PHASE-4-B: Phase 3 cross-phase seam | Halt-on-null assertion at top of resolveCalls; test 1.19 verifies both null and undefined paths throw with explicit error mentioning "Phase 3 must run first". |
| R-PHASE-4-C: method-call type-inference scope discipline | Strict guardrails on the `new ClassName()` scan (literal pattern only, per-scope fresh map, own methods only, factory stays ambiguous). Brace-tracking source scan keeps the `const X = new Y()` attribution scope-correct without flow analysis. AC-04 test asserts factory pattern stays ambiguous. |
| R-PHASE-4-D: ground-truth flip discipline | Per-test flip status documented in flip-status table above. NO non-call assertions flipped. Test 1's endpoint-is-node-id stays FAIL as required. Test 5 required halt-and-report → ORCHESTRATOR-approved Phase 1 fix → applied per 6 constraints. |

## ORCHESTRATOR option-1 + 4 guardrails (call-method type inference scope)

**Option 1 approved:** narrow `const X = new Y()` initializer scan to
seed receiver-type bindings for `obj.method()` resolution. Implementation
constraints applied:

| guardrail | implementation |
|---|---|
| 1. Only `const x = new Y()` literal | regex `/^const\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+([A-Z][\w$]*)\s*\(/`; brace-tracking scanner skips strings/comments/expressions before matching |
| 2. Per-fn fresh map | `NewInitializerMap` keyed by enclosing-fn `callerCodeRefId`; brace-tracking scope stack ensures bindings attach to the innermost containing fn-element scope |
| 3. Own methods only on receiver class | `classifyMethodCall` filters symbol table entries by `qualifierPath?.length === 1 && qualifierPath[0] === className`; rejects parent-class / interface walks |
| 4. Factory stays ambiguous | `const x = makeService()` does NOT match the new-init regex; receiverText `x` falls through to "unknown receiver" branch → ambiguous (or unresolved if no candidates). AC-04 test #2 enforces. |

## Boundary enforcer transition

`__tests__/pipeline/no-call-resolution.test.ts` (Phase 3's boundary
enforcer asserting Phase 3 did NOT do call resolution) was deleted in
this phase — Phase 4 IS call resolution and adds `state.callResolutions`
to PipelineState; the enforcer would fire on the new field's presence.

`__tests__/pipeline/no-graph-construction-leaks.test.ts` (NEW, Phase 5
boundary enforcer) replaces it. Asserts no Phase 5 fields
(`fileGrainNodeId`, `edgeSchemaVersion`, `graphConstructionPass`,
`nodePromotedFrom`) leak onto CallResolution / PipelineState / graph
nodes; legacy edge-type allowlist excludes any Phase 5 schema additions.

## Design decisions worth surfacing

**Method-call edge-target via narrow initializer scan, NOT type
inference.** The brace-tracking scanner walks each file's source once,
tracking function/class scope boundaries by literal `function NAME(` /
`class NAME` declarations, and attributes each `const X = new Y()`
binding to the innermost fn-element scope on stack. This is purely
syntactic — no flow analysis, no inheritance walking, no interface
resolution. The factory pattern (`const x = makeService()`) does NOT
match the regex and stays ambiguous, satisfying guardrail 4.

**Calls-edge metadata enrichment with `importedAs` + `exportedName`
recovers Phase 0 test 4.** When a resolved bare call's `calleeName`
matches a Phase 3 ImportResolution.localName, the orchestrator looks
up the source RawImportFact specifier and stamps both the local alias
and the original exported name onto the legacy 'calls' edge. This was
necessary because ImportResolution drops `imported` (the
RawImportSpecifier carries it).

**Endpoint-promotion deferred to Phase 5.** Phase 4 emits new
'resolved-call' edges with canonical codeRefIds as endpoints (mirrors
Phase 3's resolved-import emission), but does NOT promote endpoints on
legacy 'calls' edges. Phase 0 ground-truth test 1's
endpoint-is-node-id assertion (line 52) targets the legacy 'imports'
edge, not 'resolved-import'. Phase 5 (graph construction) owns
endpoint promotion across the legacy edge contract.

## Hand-off

Phase 4 implementation complete. Final commit will be the phase-rollup
chore commit; ORCHESTRATOR dispatches `/close-workorder` to SKILLS for
archival. Standing by.

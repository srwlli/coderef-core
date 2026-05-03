# Checkpoint: structural_foundation_review

**Workorder:** WO-PIPELINE-CALL-RESOLUTION-001
**Dispatch:** DISPATCH-2026-05-02-014
**Phase:** 4 (sequence 6/10; Phase 0/1/2/2.5/3 archived)
**Halt point:** after task 1.5b (deletion of Phase 3 boundary enforcer)
**Status:** ready_for_review

---

## Review items per dispatch

### (a) Two-pass split enforced

**Where:** `src/pipeline/call-resolver.ts`

`resolveCalls(state)` calls `buildSymbolTable(state)` to completion before
calling `resolveCallsAgainstTable(state, symbolTable)`. The symbol table
is threaded as a function parameter to pass 2; pass 2 reads it through
`Map.get` only — no per-file streaming, no interleaving. The skeleton
mirrors Phase 3's `resolveImports` structure exactly.

```ts
export function resolveCalls(state: PipelineState): CallResolution[] {
  if (state.importResolutions === null || state.importResolutions === undefined) {
    throw new Error('[Phase 4 / call-resolver] state.importResolutions is null or undefined. ...');
  }
  const symbolTable = buildSymbolTable(state);
  return resolveCallsAgainstTable(state, symbolTable);
}
```

AC-09 (pass-1-completes-before-pass-2) will be enforced at the test
level by 1.17 (`call-resolution-two-pass-ordering.test.ts`) — same
mechanism Phase 3 used: instrument `addEntry` and `lookupSymbol` calls
through a wrapped Map and assert all writes precede the first read.

### (b) 5-kind CallResolutionKind taxonomy matches AC-01

**Where:** `src/pipeline/call-resolver.ts:74-79`

```ts
export type CallResolutionKind =
  | 'resolved'
  | 'unresolved'
  | 'ambiguous'
  | 'external'
  | 'builtin';
```

Exactly 5 kinds, matching context.json AC-01 + roadmap.md line 304-312
verbatim. AC-01 (every RawCallFact produces exactly one CallResolution
with kind in this enum, no silent drops) will be enforced by
1.9 (`call-resolution-shape.test.ts`).

### (c) Graph-edge emission gated on kind='resolved' AND both endpoints bound

**Where:** `src/pipeline/orchestrator.ts` (Step 4.6)

```ts
for (const resolution of callResolutions) {
  if (
    resolution.kind === 'resolved' &&
    resolution.resolvedTargetCodeRefId &&
    resolution.callerCodeRefId
  ) {
    graph.edges.push({
      source: resolution.callerCodeRefId,
      target: resolution.resolvedTargetCodeRefId,
      type: 'resolved-call',
      ...
    });
  }
}
```

Mirrors the resolved-import gate from Phase 3 byte-for-byte. Same
endpoint format (canonical codeRefIds via `createCodeRefId`); same
double-non-null guard. Phase 5 owns endpoint promotion on legacy
'calls'-type edges — Phase 4 emits NEW resolved-call edges only and
does NOT mutate the source/target of legacy edges.

### (d) Phase 3 cross-phase seam preserved (read-only + halt-on-null)

**Where:** `src/pipeline/call-resolver.ts:resolveCalls`

```ts
if (state.importResolutions === null || state.importResolutions === undefined) {
  throw new Error(
    '[Phase 4 / call-resolver] state.importResolutions is null or undefined. ' +
    'Phase 3 must run first; resolveImports populates state.importResolutions ' +
    'with the cross-phase seam Phase 4 reads. R-PHASE-4-B mitigation.',
  );
}
```

`state.importResolutions` is read through `readonly ImportResolution[]`
parameter typing in `classifyMethodCall`; pass-2 implementation (task
1.7) consumes `ImportResolution.localName` + `resolvedTargetCodeRefId`
without mutating either the array or any element. Test 1.19
(`call-resolution-pre-phase3-assertion.test.ts`) will exercise the
halt-on-null path explicitly.

### (e) no-call-resolution.test.ts deletion documented

**Why obsolete:** Phase 3's boundary enforcer asserted that
`state.importResolutions` and `PipelineState` carried NO call-resolution
fields and that `state.rawCalls` was untouched. Phase 4 IS call
resolution and adds `state.callResolutions: CallResolution[]` to
`PipelineState`. The enforcer would fire on the new field's presence —
keeping it would block Phase 4 by design, not by accident. The
boundary it was guarding is exactly the one Phase 4 is meant to cross.

**File deleted:** `__tests__/pipeline/no-call-resolution.test.ts` (65 lines).

**Replacement enforcer (Phase 5 boundary):** task 1.18 creates
`__tests__/pipeline/no-graph-construction-leaks.test.ts` asserting
no Phase-5 fields (`fileGrainNodeId`, `edgeSchemaVersion`,
`graphConstructionPass`, `nodePromotedFrom`) leak into
`CallResolution[]` or `PipelineState`. Same enforcement pattern,
shifted forward one phase.

**Documented:** This checkpoint.md (above), plus task 1.22
execution-notes.md will explicitly call out the boundary transition.

---

## Tasks complete (1.1 → 1.5b)

| # | verb | description | status |
|---|---|---|---|
| 1.1 | READ | prep deliverables (context.json + analysis.json + roadmap) | done |
| 1.2 | READ | Phase 2/2.5/3 surfaces + boundary enforcer + scope/element conventions | done |
| 1.3 | WRITE | `src/pipeline/call-resolver.ts` skeleton (types + public surface + helper stubs) | done — pass-1/pass-2 implementations stubbed pending checkpoint review |
| 1.4 | EDIT | `src/pipeline/types.ts` — `state.callResolutions` field + Phase 4 type re-exports | done |
| 1.5 | EDIT | `src/pipeline/orchestrator.ts` — Step 4.6 wires `resolveCalls`, emits `resolved-call` edges, enriches legacy 'calls' edge metadata | done |
| 1.5b | DELETE | `__tests__/pipeline/no-call-resolution.test.ts` | done |

**tsc --noEmit:** clean (exit 0).

---

## Outstanding design call for ORCHESTRATOR

**Test 5 (`requires nested functions and class method calls to preserve qualified context`) ground-truth flip mechanism.**

The fixture defines `class Service { handle() {} }` and
`function entry() { const service = new Service(); ... return service.handle(); }`.
Test 5 asserts `methodCall.metadata?.targetElementId === Service.handle.id`
AND `resolutionStatus === 'resolved'`.

Strict reading of DR-PHASE-4-C ("Phase 4 must NOT attempt full type
inference") means `service.handle()` should classify as **ambiguous**
(receiverText `service` matches no symbol; `handle` matches
`Service.handle` in the symbol table) or **unresolved** (no receiver
type known). EITHER classification fails the test 5 expectation of
`resolutionStatus === 'resolved'` + bound `targetElementId`.

**Three options.** Pick one before pass-2 implementation begins (task
1.7):

1. **Narrow `new ClassName()` initializer scan.** Pass 2 walks the
   enclosing element body for `const X = new Y()` patterns to seed a
   per-scope receiver-type map. `service` → `Service` → look up
   `handle` in `Service`'s methods → resolved. This is shallow
   syntactic pattern matching, NOT full type inference (no flow
   analysis, no inheritance, no interface chasing). Fits inside the
   spirit of DR-PHASE-4-C.

2. **Single-method-name fallback at the graph-edge enrichment layer.**
   Resolver classifies `service.handle()` as ambiguous in
   `state.callResolutions` (faithful to DR-PHASE-4-C). Separately, the
   orchestrator's edge-enrichment loop sees the legacy 'calls' edge for
   `handle`, finds exactly one method named `handle` in the project,
   and stamps `targetElementId` + `resolutionStatus='resolved'` on
   that edge ONLY. The resolver's truth (ambiguous) is preserved in
   `callResolutions[]`; the graph edge gets a more aggressive
   classification because graph traversal cares about probable target,
   not strict provenance. This is the dual-track pattern Phase 3 used
   for legacy 'imports' edges.

3. **Accept test 5 partial flip.** Document that test 5's
   `targetElementId` assertion fails until type-inference work
   (post-Phase-5). Halt-and-report mid-implementation if it doesn't
   flip per dispatch contract — but the dispatch contract explicitly
   says test 5 fully flips. Picking this means challenging the
   contract.

**Recommendation: option 1.** It honors test 5's stated expectation
without bending DR-PHASE-4-C: shallow pattern scan for
`new ClassName()` is purely syntactic, deterministic, no flow analysis,
and only seeds the per-scope receiver-type map when the AST shape is
unambiguous. Fits the same level of "structural-only" reasoning Phase
4 already does for `this.method()` (which DR-PHASE-4-B explicitly
allows). Option 2 splits the truth across two layers, which Phase 3
avoided after the import edge-target-promotion lesson. Option 3
contradicts the dispatch.

**Awaiting ORCHESTRATOR signal:** option 1, 2, or 3 — and any other
review comments on items (a)–(e) above. Pass-2 implementation (task
1.7) gates on this answer.

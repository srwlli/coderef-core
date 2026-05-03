# Checkpoint: structural_foundation_review (after task 1.5)

**Workorder:** WO-PIPELINE-IMPORT-RESOLUTION-001 (Phase 3 of 9-phase pipeline rebuild)
**Dispatch:** DISPATCH-2026-05-02-013
**Status:** checkpoint_ready — awaiting ORCHESTRATOR review before pass-1/pass-2 implementation (tasks 1.6–1.9)

## What landed (tasks 1.1–1.5)

| task | commit | summary |
|---|---|---|
| 1.1 | (read-only) | Read prep context.json, analysis.json, roadmap lines 222–272 |
| 1.2 | (read-only) | Read Phase 2/2.5 surfaces, grep'd RawHeaderImportFact consumers |
| 1.3 | 67ce3c3 | `src/pipeline/import-resolver.ts` skeleton: types + signatures + JSDoc |
| 1.4 | f412d69 | Delete RawHeaderImportFact, add `importResolutions` to PipelineState; migrate 4 consumers (orchestrator, projections, registry-generator, relationship-extractor) |
| 1.5 | 706a4d9 | Wire `resolveImports(state)` in orchestrator after Phase 2.5 cross-check; emit `resolved-import` graph edges only when `kind === 'resolved'` with both codeRefIds bound |

## ORCHESTRATOR review checklist (per dispatch directive)

**(a) Two-pass split is enforced** — `import-resolver.ts` exposes:
- `buildExportTables(state)` → ExportTable (pass 1, public for AC-13 test)
- `resolveAstImports(state, exportTables)` + `resolveHeaderImports(state, exportTables)` → ImportResolution[] (pass 2, public for AC-12 ordering test)
- `resolveImports(state)` orchestrates: returns `[]` until 1.6/1.7 land
- Per-file streaming during pass 2 is structurally impossible — `resolveAstImports` takes the fully-built `ExportTable` as a parameter; orchestrator calls them in order.

**(b) 7-kind ImportResolutionKind taxonomy matches AC-01:**
```
'resolved' | 'unresolved' | 'external' | 'ambiguous' | 'dynamic' | 'typeOnly' | 'stale'
```

**(c) Graph-edge emission gated on kind='resolved' only:**
```ts
if (resolution.kind === 'resolved' && resolution.resolvedTargetCodeRefId && resolution.importerCodeRefId) {
  graph.edges.push({ source: ..., target: ..., type: 'resolved-import', metadata: { ... } });
}
```
Non-resolved kinds remain on `state.importResolutions` only — never silently dropped (AC-01).

**(d) RawHeaderImportFact removal is clean:**
- Type deleted from types.ts; placeholder comment marks the spot.
- `state.rawHeaderImports` field deleted from PipelineState.
- `extractRawHeaderImports` method + `collectHeaderImportPlaceholders` deprecated helper deleted from relationship-extractor.ts.
- No backwards-compat shim. `grep RawHeaderImportFact|rawHeaderImports|collectHeaderImportPlaceholders src/` returns 4 hits — all in comments noting the removal.
- Consumers migrated: orchestrator threading dropped; projections `RawFactsBundle.headerImportFacts` (HeaderImportFact[]); `SemanticRegistryRawFacts.headerImports` is now HeaderImportFact[]; registry-generator passes `state.headerImportFacts`.

**(e) Phase 2.5 @exports cross-check still functions alongside Phase 3 export-table builder:**
- The cross-check at orchestrator.ts:382–390 (post-AST cross-check) is unchanged.
- Phase 3's `buildExportTables` will consume `state.rawExports` directly (AC-13: deterministic projection of RawExportFact[] with no filtering or normalization). The cross-check and the export table will see the same source set per file; AC-13 test (1.22) enforces deepStrictEqual.

## Verification at checkpoint

| check | result |
|---|---|
| `tsc --noEmit` | passes (no type errors) |
| Phase 2/2.5 test suite (8 files, 27 tests) | all pass |
| Phase 0 ground-truth test (graph-ground-truth.test.ts) | all 6 still fail (expected — resolveImports returns [] in skeleton; flips happen after 1.6/1.7) |
| No premature flips on import assertions | confirmed |
| No call resolution work introduced | confirmed (Phase 4 boundary preserved) |

## Risks / decisions to confirm

- **R-PHASE-3-A** (RawHeaderImportFact removal breaks raw-header-import-placeholders.test.ts): the test still passes today because Phase 2.5's `parseHeader` produces HeaderImportFact records and the test doesn't import RawHeaderImportFact directly. Disposition will be handled by task 1.24 (rewrite as header-import-facts-cardinality.test.ts asserting cardinality on HeaderImportFact, then delete the original).
- **Test fallout this checkpoint addressed inline:**
  - `no-import-resolution.test.ts` referenced `state.rawHeaderImports.length` — updated to drop the field (per WO scope item).
  - `header-import-facts.test.ts` had a backwards-compat test for `collectHeaderImportPlaceholders` (now-removed function) — the third test was removed; cardinality coverage moves to 1.24's rewrite.

## Hand-off

**HALT.** Awaiting ORCHESTRATOR `proceed` signal before tasks 1.6–1.27 begin.

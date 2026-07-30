# Phase 3 Prep Brief V2 — Targeted Re-Run

You are a **read-only prep agent** for Phase 3 of the CodeRef Core 9-phase pipeline rebuild.

The first prep attempt (PREP-BRIEF.md) produced thin deliverables due to tool errors during execution. This V2 brief targets the specific gaps with explicit asks. **Replace** the existing context.json + analysis.json with new versions in this same directory.

## Role Boundaries (HARD)

- **Read-only.** No source code edits. No staging. No commits.
- Replace existing `context.json` + `analysis.json` in this directory.
- Hand back when done.

## Required Reading (use specific paths — earlier prep had file-not-found errors)

1. **Roadmap Phase 3 section:** `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\roadmap.md` — read lines 222 through 272 specifically.

2. **Existing tsconfig.json:** `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\tsconfig.json`. **It exists.** Earlier prep claimed it didn't. Read it and document the `paths` field if present (or its absence). Phase 3 must honor TS path aliases when they exist.

3. **Phase 0 ground-truth tests:** `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\__tests__\pipeline\graph-ground-truth.test.ts`. Read every test. Identify which assertions are import-related vs call-related.

4. **Phase 2 archived plan + execution-notes:** `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\coderef\archived\pipeline-relationship-raw-facts\plan.json` and `execution-notes.md`. Note `RawImportFact` shape and the `raw-header-import-placeholders.test.ts` that asserts placeholder cardinality.

5. **Phase 2.5 archived plan + execution-notes:** `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\coderef\archived\pipeline-semantic-header-parser\plan.json` and `execution-notes.md`. Note `HeaderImportFact` structured shape, `RawHeaderImportFact` deprecation (with deprecation warning, not removal), and the AST cross-check at orchestrator level.

6. **Type definitions:** `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\src\pipeline\types.ts` (RawImportFact, RawExportFact, deprecated RawHeaderImportFact). `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\src\pipeline\header-fact.ts` (HeaderFact, HeaderImportFact).

7. **Test asserting placeholder cardinality:** `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\__tests__\pipeline\raw-header-import-placeholders.test.ts`. Phase 3 will REMOVE RawHeaderImportFact (not just deprecate). This test will need to either be deleted or rewritten — surface the trade-off.

## Specific Gaps in V1 Prep — Address These

### Gap 1: Empty decision_records[]

V1 prep had no decision records. Phase 3 has multiple cross-cutting design choices that must be documented:

- **External-vs-unresolved heuristic:** When does an import classify as `external` vs `unresolved`? Proposed rule: anything in `node_modules/` or `package.json` dependencies → external; anything that *should* resolve relatively but doesn't → unresolved. Document your reading of this.
- **Path alias precedence:** When tsconfig has both `paths` AND a relative-resolve match, which wins?
- **Resolver pass timing:** Does resolution happen during the AST walk (per-file streaming) or as a post-walk pass over PipelineState? Phase 2 + 2.5 use a per-file walk + orchestrator-level cross-check. Phase 3 likely needs a TWO-pass approach: pass 1 build export tables across all files, pass 2 resolve imports against those tables. Document this.
- **Stale @imports detection:** `<module>:<symbol>` from header @imports lists a symbol — verifying the symbol is actually exported by the module requires the export table from pass 1. Document the dependency.

### Gap 2: tsconfig_paths_strategy was dismissive

V1 said "no tsconfig.json with paths found... rely on unit tests for this feature." That's wrong because (a) tsconfig DOES exist, you didn't find it; (b) "rely on unit tests" is not a strategy. Replace with: actual reading of the existing tsconfig.json + a concrete approach for path-alias resolution.

### Gap 3: Generic risk catalog

V1 risks were boilerplate. Replace with Phase-3-specific risks:

- **R-PHASE-3-A: RawHeaderImportFact removal breaks raw-header-import-placeholders.test.ts.** The Phase 2 test asserts placeholder cardinality. If Phase 3 removes the type, the test fails. Mitigation must address this.
- **R-PHASE-3-B: Export-table consistency.** Phase 2.5 already added an `@exports` cross-check at orchestrator level. Phase 3's export-table builder must produce the SAME export set Phase 2.5's cross-check uses, or one of them is wrong. Document how the two seams reconcile.
- **R-PHASE-3-C: Stale header imports require export tables built first.** This creates a phase-internal ordering dependency: pass 1 must finish before pass 2 runs. If the orchestrator runs them in parallel, stale detection is non-deterministic.
- **R-PHASE-3-D: Phase 0 ground-truth tests transitioning to PASS.** This is the FIRST phase where any test flips. The test framework expects them to fail. Plan author needs to know: does Phase 3 *delete* the failing assertions, *modify* them to pass, or *add* new "now-passing" assertions while keeping the old ones as backstops?

### Gap 4: Edge cases under-specified

V1 listed edge cases but didn't enumerate enough. Add at minimum:

- Re-exports: `export { foo } from './bar'`. Resolving `bar` here is normal; resolving the re-export requires a transitive lookup.
- Namespace imports: `import * as ns from './x'`. The local name `ns` resolves to the entire module, not a single export.
- Default exports with renaming: `import myDefault from './x'` where x exports `default`. The local name binds to the default export.
- Same-name imports from different modules: two files each importing a different `helpers` from different paths. Both resolve to distinct codeRefIds.
- Self-referential exports: `export * from './x'` — re-exports require following the chain.

## Required Output Shape

### context.json

Same shape as V1. Verify scope.in lists removal of `RawHeaderImportFact` (not just modification).

### analysis.json

ALL of these blocks must be substantive:

- `blast_radius` — keep V1's read of files (it was reasonable)
- `risks` — replace with at minimum the four R-PHASE-3-A through R-PHASE-3-D plus any others you identify
- `decision_records` — minimum FOUR records covering the four gap-1 items above
- `resolution_surface` — keep V1's import_kinds + resolution_states; expand `edge_cases` to cover the items in gap 4; replace `tsconfig_paths_strategy` with actual content from the real tsconfig.json
- `ground_truth_test_mapping` — keep V1's mapping; explicitly note which 2-of-6 assertions still wait for Phase 4 (call-related)
- `cross_phase_dependencies` (NEW BLOCK) — document the Phase 2.5 orchestrator cross-check seam interaction with Phase 3's export-table builder
- `test_planning_notes` — note that the existing `raw-header-import-placeholders.test.ts` will need disposition (delete vs rewrite) per Gap 3 R-PHASE-3-A

## Output Path

Replace these files in this directory:
- `coderef/workorder/pipeline-import-resolution-prep/context.json`
- `coderef/workorder/pipeline-import-resolution-prep/analysis.json`

Do NOT modify the existing `PREP-BRIEF.md` (V1) or this `PREP-BRIEF-V2.md`. Only the two output JSONs.

When done, exit. Do not start implementation. Do not edit source. Do not commit.

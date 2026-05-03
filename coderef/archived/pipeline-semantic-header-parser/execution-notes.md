# WO-PIPELINE-SEMANTIC-HEADER-PARSER-001 Phase 2.5 Execution Notes

Executed by CODEREF-CORE on 2026-05-02 / 2026-05-03 (UTC).

## Scope Completed

- New module `src/pipeline/header-fact.ts`: `HeaderFact`,
  `HeaderImportFact`, `HeaderParseError` types plus re-exports of
  `HeaderStatus` and `LayerEnum` from `element-taxonomy.ts`.
- New module `src/pipeline/semantic-header-parser.ts`: pure
  `parseHeader(sourceText, sourceFile)` returning
  `{ headerFact, headerStatus, importFacts }`. Detects leading `/** */`
  block comments, line-comment runs, and Python `""" """` docstrings that
  contain `@coderef-semantic:VERSION`. Validates `@layer` against
  `STANDARDS/layers.json` at runtime via `isValidLayer`, validates
  `@capability` (kebab-case), `@constraint` (JSON array of kebab-case),
  `@exports` (comma-separated identifiers), `@imports` (JSON array of
  `module:symbol` strings), `@generated` (ISO 8601). Each malformed value
  becomes a structured `HeaderParseError` and contributes to
  `headerStatus = 'partial'`.
- Threaded header outputs through `PipelineState`: new required fields
  `headerFacts: Map<string, HeaderFact>`, `headerImportFacts:
  HeaderImportFact[]`, `headerParseErrors: HeaderParseError[]`. Re-exports
  added on `pipeline/types.ts` so consumers get one-stop semantic imports.
- Marked `RawHeaderImportFact` `@deprecated`. Refactored
  `collectHeaderImportPlaceholders` to delegate to `parseHeader` and shape
  structured records back into the legacy placeholder shape; emits a
  one-shot `console.warn` deprecation notice on first invocation. Added
  new public method `RelationshipExtractor.extractHeaderFact` as the
  canonical Phase 2.5 surface.
- Orchestrator AST cross-check: when parser returns `headerStatus =
  'defined'` AND `headerFact.exports` is set, the orchestrator compares
  against the file's `RawExportFact[].exportedName` set (both directions)
  and demotes to `'stale'` on mismatch.
- Stamps `headerStatus` + `headerFact` reference onto every `ElementData`
  of each file so consumers that already read `element.headerStatus` see
  Phase 2.5 values. Added optional `headerFact?: HeaderFact` to
  `ElementData` in `src/types/types.ts`.
- Projected `headerFact` onto `SemanticRegistryProjectionEntry`
  additively. Existing fields untouched; older snapshots remain valid.
- Wrote eight new test files (15 acceptance criteria):
  - `header-fact-shape.test.ts` (AC-01, 2 cases)
  - `header-layer-runtime-validation.test.ts` (AC-02, INVARIANT, 3 cases)
  - `header-tag-validation.test.ts` (AC-03, AC-04, AC-08, 7 cases)
  - `header-exports-cross-check.test.ts` (AC-05, 3 integration cases)
  - `header-status-states.test.ts` (AC-06, AC-07, 3 cases)
  - `header-parser-purity.test.ts` (AC-09, AC-10, INVARIANT, 3 cases)
  - `header-import-facts.test.ts` (AC-11, 3 cases)
  - `no-import-resolution.test.ts` (AC-12, INVARIANT, 1 case)
- Updated Phase 2 `raw-header-import-placeholders.test.ts` fixtures to
  include the `@coderef-semantic` marker per dispatch directive ("fix the
  test, not the deprecation").

## Phase 2.5 Exit-Criterion Checks

| Criterion | Status | Evidence |
|---|---|---|
| Every source file walked produces a HeaderFact and a headerStatus | PASS | `header-fact-shape.test.ts` + populate-coderef end-to-end (`2344/2344` semantic-registry entries carry both). |
| `STANDARDS/layers.json` is the only source of truth for `@layer` enum | PASS | `header-layer-runtime-validation.test.ts` — parser delegates to `isValidLayer` from `element-taxonomy.ts`; no hardcoded enum in `semantic-header-parser.ts`. |
| Parser fails closed when enum drifts | PASS | `header-layer-runtime-validation.test.ts` — drifted `layers.json` (omitting `'utility'`) causes `isValidLayer('utility', driftPath)` to return false; parser would emit `headerStatus=partial` against that path. |
| Zero source files contain a header that the parser silently ignores | PASS | populate-coderef end-to-end: every entry has `headerStatus` defined (no `undefined`); `2344/2344` non-undefined statuses across coderef-core source. Detection failure is recorded as `'missing'`, never silent skip. |

All four exit criteria PASS. No criterion failed; no halt-and-report
trigger fired during execution.

## Phase 0 Ground-Truth Test Discipline

The six Phase 0 ground-truth tests at
`__tests__/pipeline/graph-ground-truth.test.ts` continue to fail for their
original reasons (missing `metadata.resolutionStatus` etc.). This is
**correct** per WO contract: Phase 2.5 ships the header parser, not import
or call resolution. None of the Phase 0 tests flipped to PASS during
execution.

## Dispositions

### Partial parsing — design call

Per dispatch DISPATCH-2026-05-02-012:

> Parser performs partial parsing — valid sub-items survive in HeaderFact
> even when sibling tags fail validation. parseErrors is the source of
> truth for what failed.

Concrete example: a header with `@layer not_a_layer` and `@capability
foo-bar` produces a HeaderFact whose `capability` is `'foo-bar'` (valid)
and whose `layer` is undefined (rejected); both are visible to operators
alongside a structured parseError for `@layer`. This gives diagnostic
value beyond a binary accept/reject — operators can see what Phase 2.5
salvaged and what needs fixing without re-running with debug flags.

### Stale detection deferred to orchestrator

Per `analysis.json` decision_record: `parseHeader` is a pure function and
cannot read AST. The `'defined' → 'stale'` demotion happens in
`PipelineOrchestrator.processFile` after `RawExportFact[]` is available.
Parser-side `headerStatus` is the maximum severity the parser can
determine; orchestrator may downgrade to `'stale'` (never upgrade).

### Dynamic-import double-emission carryover (from Phase 2)

Phase 2's intentional dynamic-import double-emission (`import('./dyn')`
appears as both a RawImportFact and a RawCallFact) is unchanged in Phase
2.5. Phase 4 still owns disambiguation. No new behavior here.

### LLOYD commit 9dab453 push status — out of scope for CODEREF-CORE

Dispatch DISPATCH-2026-05-02-012 asked to confirm "LLOYD commit 9dab453
(spawner --yolo fix) is pushed to LLOYD origin/main, not just local."
This request is **out of scope for the CODEREF-CORE agent domain.** The
LLOYD repo is operated by a different agent; CODEREF-CORE has no
authority over LLOYD's git state and cannot independently verify the
push status from inside `coderef-core`. Surfacing this scope-mismatch as
a flag for ORCHESTRATOR follow-up — the directive should be re-routed to
the LLOYD agent or the operator who pushes LLOYD commits.

## Verification Numbers

- `npm run build` (tsc + tsc -p tsconfig.cli.json): clean.
- `npx vitest run __tests__/pipeline/ __tests__/semantic-canonical.test.ts`:
  17 test files, 62 tests. **56 PASS** (Phase 1 element-taxonomy +
  single-scanner + semantic-canonical; Phase 2 raw-import / raw-call /
  raw-export / raw-header-import / no-graph-edge; Phase 2.5 header-fact-
  shape + header-layer-runtime-validation + header-tag-validation +
  header-exports-cross-check + header-status-states + header-parser-purity
  + header-import-facts + no-import-resolution). **6 FAIL** (Phase 0
  ground-truth tests, expected per WO contract).
- New Phase 2.5 tests: 2 + 3 + 7 + 3 + 3 + 3 + 3 + 1 = **25 PASS / 0
  FAIL.**
- `node dist/src/cli/populate.js --mode minimal --json`: **325 files**
  scanned, **2344 elements** extracted, **12041 relationships** extracted,
  no failures. Phase 2 baseline was 325 / 2323 / 12005. Same OoM (+0% files,
  +1% elements, +0.3% relationships, attributable to the eight new test
  files added by this WO).
- semantic-registry: **2344 / 2344** entries have a non-undefined
  `headerStatus` and a populated `headerFact`. Distribution: all
  `'missing'` (coderef-core sources do not yet carry semantic headers —
  expected; the parser correctly detects and records `'missing'` rather
  than crashing or returning undefined).
- CLI surface unchanged: `--mode`, `--select`, `--skip`, `--json`,
  `--semantic-registry` flags all behave identically to Phase 2 baseline.

## Hard Stop

Stopping after Phase 2.5. No Phase 3 (import resolution), no Phase 4 (call
resolution), no Phase 5 (graph construction), no Phase 6 (output
validation contract / `--strict-headers` gate), no Phase 7 (RAG facets).
`HeaderImportFact` records remain unresolved (no `resolvedTo`/`targetId`/
`edgeId`/`resolutionStatus`/`resolved` fields — enforced by
`no-import-resolution.test.ts`). Hand-back to ORCHESTRATOR for
`/close-workorder` per dispatch DISPATCH-2026-05-02-011.

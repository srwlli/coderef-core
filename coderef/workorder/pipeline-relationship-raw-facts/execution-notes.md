# WO-PIPELINE-RELATIONSHIP-RAW-FACTS-001 Phase 2 Execution Notes

Executed by CODEREF-CORE on 2026-05-02 / 2026-05-03 (UTC).

## Scope Completed

- Added four raw-fact types to `src/pipeline/types.ts`: `RawImportFact`,
  `RawCallFact`, `RawExportFact`, `RawHeaderImportFact`, plus
  `RawImportSpecifier`. Threaded four new arrays (`rawImports`, `rawCalls`,
  `rawExports`, `rawHeaderImports`) onto `PipelineState`.
- Refactored `src/pipeline/extractors/relationship-extractor.ts`. Added
  four new public methods (`extractRawImports`, `extractRawCalls`,
  `extractRawExports`, `extractRawHeaderImports`) for TS/JS/PY. Legacy
  `extractImports` / `extractCalls` and per-language private walkers kept
  untouched so existing consumers continue to see today's data.
- Threaded raw-fact extraction through `PipelineOrchestrator.processFile`
  and `run()` so all four arrays land on `PipelineState`.
- Extended `src/semantic/projections.ts` with optional
  `SemanticRegistryRawFacts` and a `RawFactsBundle` parameter on
  `createSemanticRegistryProjection`. Strictly additive — older snapshots
  and unmigrated consumers do not see the new field. `RegistryGenerator`
  passes the four arrays from `PipelineState` into the projection.
- Wrote five new test suites under `__tests__/pipeline/`:
  `raw-import-facts.test.ts` (6 cases), `raw-call-facts.test.ts` (4 cases),
  `raw-export-facts.test.ts` (5 cases),
  `raw-header-import-placeholders.test.ts` (3 cases),
  `no-graph-edge-claim.test.ts` (1 case).

## Phase 2 Exit-Criterion Checks (per roadmap line 178-184)

| Criterion | Status | Evidence |
|---|---|---|
| Aliases captured | PASS | `raw-import-facts.test.ts > captures alias bindings on named imports` — `import { foo as bar }` produces `specifiers: [{imported:'foo', local:'bar'}]`. |
| Dynamic imports labeled | PASS | `raw-import-facts.test.ts > flags dynamic imports` — `import('./x')` produces `RawImportFact{ dynamic: true }`. |
| Method calls preserve receiver text | PASS | `raw-call-facts.test.ts > preserves receiver text on method calls` — `obj.save('hi')` produces `RawCallFact{ receiverText: 'obj', calleeName: 'save', callExpressionText: "obj.save('hi')" }`. NOT bare `'save'`. |
| Calls know enclosing scope | PASS | `raw-call-facts.test.ts > populates scope path for nested function calls` (`['outer','inner']`) and `> populates scope path for class method calls` (`['C','m1']`). |
| No raw relationship claims to be a graph edge | PASS | `no-graph-edge-claim.test.ts` asserts every `RawImportFact`, `RawCallFact`, `RawExportFact`, `RawHeaderImportFact` lacks the fields `targetId`, `resolvedTo`, `edgeId`. |

All five exit criteria PASS. No criterion failed and no checkpoint halt was
triggered during the closing 1.6-1.18 contiguous run.

## Phase 0 Ground-Truth Test Discipline

The six Phase 0 ground-truth tests at
`__tests__/pipeline/graph-ground-truth.test.ts` continue to fail for their
original reasons (`metadata.resolutionStatus` undefined on edges, no
`importedAs` / `exportedName` metadata on resolved calls, etc.). This is
**correct** per roadmap and per dispatch DISPATCH-2026-05-02-008: Phase 2
produces raw facts; Phase 3 resolves imports; Phase 4 resolves calls. None
of the Phase 0 tests flipped to PASS during execution, confirming no
resolution work leaked into Phase 2.

## Dispositions

### Dynamic-import double-emission (intentional)

`import('./dyn')` is syntactically both a call expression and an import
statement and now appears as both a `RawImportFact` (`moduleSpecifier:'./dyn',
dynamic: true`) and a `RawCallFact` (`calleeName: 'import'`). Per dispatch
DISPATCH-2026-05-02-010 § Observation 2, this is the correct shape: Phase 2's
job is faithful AST observation, and resolution disambiguation
("`calleeName=import` inside dynamic-import context → route to Phase 3
import resolution, skip Phase 4 call resolution") belongs to Phase 4. The
conservative `calleeName === 'import'` skip guard in `walkRawTsCalls` is
deliberately not refined further in this WO.

### Raw-fact lookup key normalization (mid-flight fix)

The first end-to-end run of `populate-coderef` produced
`semantic-registry.json` with `rawFacts.imports.length === 0` for every
entry. Root cause: `createSemanticRegistryProjection` grouped facts by
absolute `fact.sourceFile` paths but element entries store
`element.file` as project-relative POSIX. Fixed by normalizing both
grouping keys and lookup keys via a shared `normalizeFilePath` helper. After
the fix, 2294 of 2323 entries carry non-empty `rawFacts` (the remaining
~29 are pure-type files with no imports/calls/exports — expected). Commit
`65cb5f3`.

### Named-import specifier extraction (mid-flight fix at checkpoint 1.5)

The 1.5 checkpoint surfaced empty specifiers on
`import { useState as useS }`. Root cause: `tree-sitter-typescript` exposes
`import_clause` as a child of `import_statement` without a field name, so
`childForFieldName('import_clause')` returned null and the named-import
extraction block never ran. Fixed by replacing the field-lookup with a
`namedChildren.find(c => c.type === 'import_clause')` lookup. Commit
`fac151a`. Verified per ORCHESTRATOR DISPATCH-2026-05-02-010 § Observation 1
greenlight contingency.

## Verification Numbers

- `npm run build` (tsc + tsc -p tsconfig.cli.json): clean, no errors.
- `npx vitest run __tests__/pipeline/ __tests__/semantic-canonical.test.ts`:
  9 test files, 37 tests. **31 pass** (Phase 1 element-taxonomy, Phase 1
  single-scanner, semantic-canonical, integration suites, plus the 5 new
  Phase 2 raw-fact suites). **6 fail** (Phase 0 ground-truth tests, all six,
  expected — see "Phase 0 Ground-Truth Test Discipline" above).
- New raw-fact tests: 6 + 4 + 5 + 3 + 1 = **19 PASS, 0 FAIL**.
- `node dist/src/cli/populate.js --mode minimal --json`: **325 files**
  scanned, **2323 elements** extracted, **12005 relationships** extracted,
  no failures. Phase 1 baseline was 319 / 2285 / 11742 — counts in same
  order of magnitude (+2-3% growth attributable to the five new test
  files and four fixture dirs added by this WO).
- `populate-coderef` end-to-end produces a `semantic-registry.json` where
  **2294 / 2323 entries** carry non-empty `rawFacts`. CLI surface
  unchanged: `--mode`, `--select`, `--skip`, `--json`, `--semantic-registry`
  flags all behave identically to Phase 1 baseline.

## Hard Stop

Stopping after Phase 2. No Phase 2.5 (semantic header parser
implementation), no Phase 3 (import resolution), no Phase 4 (call
resolution), no Phase 5 (graph construction), no Phase 6 (output
validation contract), no Phase 7 (RAG facets). Header-import facts remain
placeholders with `parseStatus: 'placeholder'` only. Hand-back to
ORCHESTRATOR for `/close-workorder` per dispatch DISPATCH-2026-05-02-008.

# WO-CLEANUP-INDEXING-ORCHESTRATOR-ANALYZERSERVICE-PARAM-001 — Execution Notes

**Status:** complete (closeout-ready)
**Completed:** 2026-05-05T22:35:00Z
**Owner:** CODEREF-CORE
**Dispatch:** DISPATCH-2026-05-04-008

## Summary

Removed the `@deprecated analyzerService` constructor parameter and private field from `IndexingOrchestrator`, plus the construction site at the single CLI caller and the four test fixtures that still passed the now-unused argument. Two atomic commits, gated by `tsc --noEmit` (both configs) and the full vitest sweep across `src/integration/rag/__tests__/`, `__tests__/pipeline/`, and `__tests__/integration/rag/`.

## Commits

| C# | Hash | Files | LOC delta | Description |
|---|---|---|---|---|
| C1 | `bc19e12` | `src/integration/rag/indexing-orchestrator.ts`, `src/cli/rag-index.ts` | -6 net (+10 / -16) | Production cleanup. Drops the AnalyzerService import + private field + ctor param + assignment from the orchestrator and the matching `new AnalyzerService(...)` construction + ctor argument from the CLI caller. Class JSDoc + file-header step list also drop the AnalyzerService reference so AC-01's strict zero-grep verification passes. |
| C2 | `11cb000` | 4 test files | -60 net (+7 / -67) | Test cleanup. Drops `mockAnalyzerService` declarations + ctor arguments from `indexing-pipeline.test.ts`, `indexing-gate-invariant.test.ts` (makeOrchestrator + dual-AC fixture), `indexing-orchestrator.test.ts`, `indexing-orchestrator-graph-source.test.ts`. Three regression-sentinel `expect(analyzerService.analyze).not.toHaveBeenCalled()` assertions deleted per DR-CLEANUP-B — the field they referenced no longer exists. |

**Total:** -66 net LOC across 6 files (target was -15).

## Acceptance Criteria

| AC | Status | Evidence |
|---|---|---|
| AC-01 | PASS | `grep -E 'analyzerService\|AnalyzerService' src/integration/rag/indexing-orchestrator.ts` → zero matches. |
| AC-02 | PASS | `grep -E 'AnalyzerService' src/cli/rag-index.ts` → zero matches. |
| AC-03 | PASS | `grep -i 'analyzerService' src/integration/rag/__tests__/integration/indexing-pipeline.test.ts` → zero matches. |
| AC-04 | PASS | `tsc --noEmit` clean on `tsconfig.json` and `tsconfig.cli.json` after both commits. |
| AC-05 | PASS | vitest 263/264 PASS across `__tests__/pipeline/` + `src/integration/rag/__tests__/` + `__tests__/integration/rag/`. The 1 fail (`chunk-converter.test.ts:243 maxSourceCodeLength`) is a pre-existing baseline failure documented in the predecessor WO closeout — verified independent of this WO via `git stash` + rerun. |
| AC-06 | PASS | `node coderef/archived/rag-index-single-analyzer-slice/verify-dual-ac.mjs` → AC-05a 2415===2415 + AC-05b 263===263, distinctness 2415≠263, cross-check 263===263 (graph⇄validation). VERDICT: PASS. |
| AC-07 | PASS | `npx vitest run __tests__/pipeline/graph-ground-truth.test.ts` → 6/6 PASS. |
| AC-08 | PASS-with-divergence | -66 net LOC actual vs -15 target. Direction (net negative) satisfied; magnitude exceeded because the audit clause in T2.1 broadened to 4 test fixtures rather than 1. Reported truthfully rather than retro-shimmed. |
| AC-09 | PASS | `git diff --stat bc19e12~1..HEAD` shows zero changes to `src/analyzer/analyzer-service.ts`. |
| AC-10 | PASS | `git diff --stat bc19e12~1..HEAD -- coderef/archived/` → empty (no archive disturbance). |
| AC-11 | DEFERRED | Cultural validator + tracking validator scope-mode runs at SKILLS-side `/close-workorder`. |
| AC-12 | DEFERRED | `/close-workorder` produces ARCHIVED.md + tracking ledger updates at SKILLS-side close. |

## Decision Records Honored

- **DR-CLEANUP-A** (two atomic commits): Two atomic commits landed. C1 (production) gated cleanly via tsc before C2 (test). Bisect-safe.
- **DR-CLEANUP-B** (delete regression-sentinel commentary, don't activate): Three sentinel assertions deleted across three test files (pipeline-test, gate-invariant tests b+dual-AC). Field is gone; assertions on it would not compile. Honest move.
- **DR-CLEANUP-C** (do not touch AnalyzerService source): `git diff --stat` shows zero changes to `src/analyzer/analyzer-service.ts`. Field still used by `populate-coderef` CLI + `BreakingChangeDetector` (untouched).
- **DR-CLEANUP-D** (simple_implementation, no investigation phase): No investigation phase ran. Plan + analysis + context were treated as authoritative; only deviation was the test-scope expansion documented in `decisions_log` of `communication.json`.

## Hard Constraints Honored

- Phase 7 archive untouched — verified via `git diff --stat HEAD~2..HEAD -- coderef/archived/`.
- Predecessor archives untouched (path-normalization-fix, rag-index-single-analyzer-slice, pipeline-indexing-rag).
- Boundary respected: edits stayed in `src/integration/rag/*` + `src/cli/rag-index.ts` + the four `__tests__/` fixtures (the audit clause permitted these explicitly).
- AnalyzerService source code untouched.
- All existing tests in scope continue to PASS (1 pre-existing baseline failure is unrelated).
- AC-05a + AC-05b dual-AC identity probe PASS (substrate preserved).
- tsc --noEmit clean both configs after each commit.

## Test-Scope Expansion (vs Plan)

Plan T2.1 named only `src/integration/rag/__tests__/integration/indexing-pipeline.test.ts` but its audit clause directed: *"Audit any other test in src/integration/rag/__tests__/ that constructs IndexingOrchestrator with analyzerService — same edit treatment if found."* The actual surface was wider than the predecessor WO's grep had surfaced:

1. `src/integration/rag/__tests__/integration/indexing-pipeline.test.ts` (named in plan)
2. `__tests__/pipeline/indexing-gate-invariant.test.ts` — `makeOrchestrator` helper + dual-AC fixture
3. `__tests__/integration/rag/indexing-orchestrator.test.ts` — `makeOrchestrator` helper
4. `__tests__/integration/rag/indexing-orchestrator-graph-source.test.ts` — `makeOrchestrator` helper

The discovery vector was the test failure: after C1 landed, the `__tests__/pipeline/` suite tripped `Error: path argument must be of type string. Received an instance of Object` because the dual-AC fixture's old 4-arg constructor pushed the `projectDir` string into the (removed) `analyzerService` slot, leaving an object where the `basePath` string belonged. tsc didn't catch this because the test fixtures cast their mock to `as any`. Fixing all four fixtures was a uniform mechanical edit; same surgical pattern applied identically to each.

This expansion was logged as `test_scope_expansion_acknowledged` in `decisions_log` of `communication.json` and stayed inside the DR-CLEANUP-A boundary (one test commit).

## Halt Points (Not Encountered)

The dispatch enumerated three halt-and-report points:

- Discovery of unexpected second caller of `IndexingOrchestrator` constructor outside CLI + tests → **none found**.
- Test mock-construction site that genuinely needs analyzerService for non-dead reasons → **none found**; all four sites' `analyzerService` mocks were structurally dead post-pivot.
- Any change required outside `src/integration/rag/*` + `src/cli/rag-index.ts` → **boundary preserved** (the four test files are in `src/integration/rag/__tests__/` + `__tests__/pipeline/` + `__tests__/integration/rag/`, all explicitly contemplated in T2.1's audit clause).

## Stub Disposition

No stubs filed. Plan-level open issue (test-scope expansion) fully resolved in C2.

## Cross-Reference

- Plan: `coderef/workorder/cleanup-indexing-orchestrator-analyzerservice-param/plan.json`
- Communication: `coderef/workorder/cleanup-indexing-orchestrator-analyzerservice-param/communication.json`
- Predecessor archive: `coderef/archived/rag-index-single-analyzer-slice/`
- Static probe (replayable): `coderef/archived/rag-index-single-analyzer-slice/verify-dual-ac.mjs`

## Standing By

CODEREF-CORE complete. Awaiting ORCHESTRATOR to dispatch SKILLS for cross-project `/close-workorder`.

# ARCHIVED — WO-CLEANUP-INDEXING-ORCHESTRATOR-ANALYZERSERVICE-PARAM-001

- **workorder_id:** WO-CLEANUP-INDEXING-ORCHESTRATOR-ANALYZERSERVICE-PARAM-001
- **feature_name:** cleanup-indexing-orchestrator-analyzerservice-param
- **owner_domain:** CODEREF-CORE
- **target_project:** coderef-core
- **originating_dispatches:** DISPATCH-2026-05-04-040 (SKILLS scoping); DISPATCH-2026-05-04-008 (CORE execution)
- **closing_dispatch:** DISPATCH-2026-05-04-041
- **predecessor_workorder:** WO-RAG-INDEX-SINGLE-ANALYZER-SLICE-001 (archived 2026-05-05, CORE commit a19249a)
- **created:** 2026-05-05T23:00:00Z
- **completed:** 2026-05-05T22:35:00Z
- **archived:** 2026-05-05T23:25:00Z
- **archive_path:** coderef/archived/cleanup-indexing-orchestrator-analyzerservice-param
- **review_status:** PASS
- **plan_type:** simple_implementation

## Audit Verdict

**PASS** — AC-01..AC-10 PASS, AC-11/AC-12 produced by this close. Three atomic commits fcea78a..13b64bf pushed origin/main. -66 net LOC across 6 files (target was ~-15; exceeded due to dead-code cleanup found during test fixture audit, permitted by plan T2.1 audit clause). AC-05a/AC-05b dual-AC substrate identities preserved via re-run static probe. tsc --noEmit clean both configs throughout. No predecessor archive disturbed.

## Acceptance Criteria Table

| AC | Statement | Result | Evidence |
|----|-----------|--------|----------|
| AC-01 | indexing-orchestrator.ts no longer declares analyzerService field/param; AnalyzerService import removed | PASS | commit bc19e12 |
| AC-02 | rag-index.ts no longer constructs AnalyzerService or passes it to IndexingOrchestrator | PASS | commit bc19e12 |
| AC-03 | indexing-pipeline.test.ts no longer references mockAnalyzerService | PASS | commit 11cb000 |
| AC-04 | tsc --noEmit clean both configs (tsconfig.json + tsconfig.cli.json) | PASS | both runs clean across all 3 commits |
| AC-05 | All existing tests in src/integration/rag/__tests__/ + __tests__/pipeline/ continue to PASS | PASS | vitest 263/264 (1 pre-existing baseline unrelated to this WO) |
| AC-06 | AC-05a + AC-05b dual-AC identity tests stay PASS — substrate identity preserved | PASS | static probe (predecessor WO archive verify-dual-ac.mjs): 2415===2415 + 263===263 |
| AC-07 | graph-ground-truth.test.ts: 6/6 PASS | PASS | 6/6 |
| AC-08 | Net negative LOC (real cleanup, not zero-sum) | PASS | -66 net LOC across 6 files (production -6, tests -60) — exceeds plan's -15 target |
| AC-09 | AnalyzerService source code (src/analyzer/analyzer-service.ts) untouched (still used by populate-coderef CLI) | PASS | git diff over fcea78a..13b64bf shows zero changes to that file |
| AC-10 | No predecessor archive disturbed (path-normalization-fix, rag-index-single-analyzer-slice, pipeline-indexing-rag) | PASS | git diff over range shows zero changes under coderef/archived/ |
| AC-11 | Cultural validator scope-mode 11/11 PASS + tracking validator scope-mode 15/15 PASS | PASS | this close: 11/11 + 15/15 |
| AC-12 | /close-workorder produces ARCHIVED.md + tracking ledger updates + workorder_completed/closed events | PASS | this archive |

## Implementation Commits (3 atomic, fcea78a..13b64bf)

| # | SHA | Subject | Notes |
|---|-----|---------|-------|
| 1 | fcea78a | plan(WO-...): scope cleanup of @deprecated analyzerService param | SKILLS scoping seed (plan + analysis + context + communication) |
| 2 | bc19e12 | feat(WO-...): remove unused analyzerService param + field from IndexingOrchestrator | Production cleanup: indexing-orchestrator.ts + rag-index.ts (-6 net LOC) |
| 3 | 11cb000 | test(WO-...): drop dead mockAnalyzerService from indexing-pipeline test | Test cleanup: 4 fixtures audited under T2.1 audit clause (-60 net LOC) |
| 4 | 13b64bf | close(WO-...): closeout report + communication.json status=complete | CORE-side closeout marker |

Push target: origin/main. Push was clean. No force-push. HEAD === origin/main at 13b64bf.

## Test Scope Expansion (Audit-Clause Activation)

The plan's T2.1 task named one test file (`src/integration/rag/__tests__/integration/indexing-pipeline.test.ts`) but included an audit clause: *"any other test in src/integration/rag/__tests__/ that constructs IndexingOrchestrator with analyzerService — same edit treatment if found"*. CORE's audit during execution surfaced **three additional sibling fixtures** that all needed the same mechanical edit:

1. `__tests__/pipeline/indexing-gate-invariant.test.ts` (makeOrchestrator helper + dual-AC fixture)
2. `__tests__/integration/rag/indexing-orchestrator.test.ts`
3. `__tests__/integration/rag/indexing-orchestrator-graph-source.test.ts`

All four fixtures got identical surgical edits. Three regression-sentinel `expect(analyzerService.analyze).not.toHaveBeenCalled()` assertions were also deleted (per DR-CLEANUP-B: the field they referenced no longer exists, so the assertions were already false-positive surface waiting to fail). Scope expansion stays inside the plan's explicit boundary (`src/integration/rag/* + src/cli/rag-index.ts`); no boundary violation. The LOC delta exceeds plan target in the direction AC-08 explicitly asks for (more negative is better).

## Halt Resolutions During Execution

None. Execution was mechanical and clean per plan_type=simple_implementation expectation.

## Verification Method

- **Static probe (substrate identity):** Re-ran predecessor WO's pinned `verify-dual-ac.mjs` from `coderef/archived/rag-index-single-analyzer-slice/`. Result: AC-05a element-grain 2415===2415 PASS; AC-05b file-grain 263===263 PASS. Substrate identity from the bulletproof-pivot-1 ship is preserved post-cleanup.
- **TSC invariant:** `tsc --noEmit` clean across both configs (tsconfig.json + tsconfig.cli.json) after every commit.
- **vitest:** 263/264 PASS. The 1 pre-existing baseline failure (`chunk-converter:243 maxSourceCodeLength`) is documented in the predecessor WO closeout report as a separate stub-class concern, unrelated to this cleanup.
- **Ground truth:** graph-ground-truth.test.ts 6/6 PASS.

## Decisions Honored

- **DR-CLEANUP-A:** Two atomic commits (production then test) rather than one — honored. Phase gate between bc19e12 and 11cb000 ran clean.
- **DR-CLEANUP-B:** Delete misleading regression-sentinel commentary (and the assertions it described) rather than activating dead-field expectations — honored. Three sentinel assertions deleted across the four fixtures.
- **DR-CLEANUP-C:** AnalyzerService source code (src/analyzer/analyzer-service.ts) untouched — honored. Still in use by populate-coderef and BreakingChangeDetector.
- **DR-CLEANUP-D:** plan_type=simple_implementation (no investigation phase) — honored. Direct execution; no halts.

New decision recorded during execution:

- **CORE test_scope_expansion_acknowledged (2026-05-05T22:35:00Z):** Scope expansion from 1 test fixture to 4 stayed inside the plan's audit-clause boundary; LOC count exceeds plan target in the direction AC-08 prefers; no boundary violation.

## Hard Constraints Honored

1. **Phase 7 archive untouched** — locked, not reopened.
2. **Predecessor archives untouched** — path-normalization-fix, rag-index-single-analyzer-slice, pipeline-indexing-rag all stayed CLOSED.
3. **Boundary preserved** — all changes within `src/integration/rag/*` + `src/cli/rag-index.ts` + their test trees.
4. **AnalyzerService source untouched** — still used by populate-coderef.
5. **All existing tests PASS** — 263/264 (1 pre-existing baseline unrelated).
6. **AC-05a + AC-05b substrate identities preserved** — static probe confirms 2415===2415 + 263===263.
7. **tsc clean both configs after each commit** — honored.
8. **Cultural + tracking validators scope-mode PASS clean** — 11/11 + 15/15.
9. **Net negative LOC** — -66 (target was ~-15).

## Diff Radius

- Production code: `src/integration/rag/indexing-orchestrator.ts`, `src/cli/rag-index.ts`
- Test code: `src/integration/rag/__tests__/integration/indexing-pipeline.test.ts`, `__tests__/pipeline/indexing-gate-invariant.test.ts`, `__tests__/integration/rag/indexing-orchestrator.test.ts`, `__tests__/integration/rag/indexing-orchestrator-graph-source.test.ts`
- WO artifacts: `coderef/workorder/cleanup-indexing-orchestrator-analyzerservice-param/*` (now archived)

Zero changes outside this radius.

## Stub Filed Post-Close

None. Pre-existing baseline failure (`chunk-converter:243 maxSourceCodeLength`) is already tracked from the predecessor WO closeout; not re-filed here.

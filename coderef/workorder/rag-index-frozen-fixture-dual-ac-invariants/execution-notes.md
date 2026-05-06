# WO-RAG-INDEX-FROZEN-FIXTURE-DUAL-AC-INVARIANTS-001 — Execution Notes

**Status:** complete (closeout-ready)
**Completed:** 2026-05-05T20:20:00Z
**Owner:** CODEREF-CORE
**Dispatch:** DISPATCH-2026-05-04-009

## Summary

Promoted the in-test dual-AC identity fixture to a frozen on-disk artifact under `src/integration/rag/__tests__/fixtures/dual-ac-frozen/`, refactored the AC-05 dual-identity describe block in `__tests__/pipeline/indexing-gate-invariant.test.ts` to load it with an anti-tautology guard (expected counts derived from loaded input fixture, not hardcoded literals, not runtime output), and captured a mutation-guard demonstration as the AC-11 closure artifact. Three atomic commits (one per phase). Bulletproof concept #2 of 6 shipped.

## Commits

| C# | Hash | Files | LOC delta | Description |
|---|---|---|---|---|
| C1 | `e17561b` | 6 fixture files (graph.json, validation-report.json, 3 src mods, README.md) | +144 / -0 | Author frozen fixture: 3 files × 3 nodes (2 hs=missing + 1 hs=defined per file) yielding 6 element-grain / 3 file-grain (distinctness preserved). README documents identity-not-numbers + anti-tautology + maintenance contract. |
| C2 | `3adf32a` | `__tests__/pipeline/indexing-gate-invariant.test.ts`, `vitest.config.ts` | +98 / -107 (-9 net) | Refactor AC-05 dual-identity describe block to load frozen fixture. Anti-tautology mechanic: expected counts re-derived from loaded `graph.json` input. Cross-check assertion binds `validation-report.header_missing_count` to `expectedFileGrain` from graph. Distinctness asserted as relationship (`expect(elementGrain).not.toBe(fileGrain)`) per DR-FROZEN-D. Vitest config: added `**/__tests__/fixtures/**` exclude so fixture src/*.ts files don't trigger "No test suite found" false positives. |
| C3 | `6fafa98` | `MUTATION-GUARD-EVIDENCE.md` | +76 / -0 | Verification-only commit per DR-FROZEN-E. Captures mutation-guard FAIL evidence under ORCHESTRATOR Path A ruling (flip both missing nodes of mod0; cross-check fails 3 !== 2; vitest exits 1; mutation reverted). Records plan-spec clarification: T3.1's single-node-flip recipe assumed hardcoded literals, conflicts with DR-FROZEN-C — Path A is the corrected substrate-side mutation. |

**Total:** +318 / -107 = +211 net LOC across 9 files (estimate was +30 to +80 net; overshot due to fixture data files + comprehensive evidence/README documentation).

## Acceptance Criteria

| AC | Status | Evidence |
|---|---|---|
| AC-01 | PASS | `ls src/integration/rag/__tests__/fixtures/dual-ac-frozen/` shows graph.json + validation-report.json + src/{mod0,mod1,mod2}.ts + README.md + MUTATION-GUARD-EVIDENCE.md |
| AC-02 | PASS | graph.json contains 9 nodes: 3 files × 3 nodes (1 fn + 1 class + 1 const per file). 6 nodes have `metadata.headerStatus="missing"` (2 per file: fn + class), 3 nodes have `headerStatus="defined"` (the const) |
| AC-03 | PASS | validation-report.json: `{ "header_missing_count": 3 }` matches file-grain unique count (3 files have at least one missing node) |
| AC-04 | PASS | Test loads fixture via `fs.copyFile` + `copyDir` (not procedural JS construction). `git diff` shows the procedural fixture-build (lines ~104-186 of pre-WO file) replaced with copyDir + copyFile + JSON.parse |
| AC-05 | PASS | Test source: `expectedElementGrain = nodes.filter(n => n.metadata?.headerStatus === 'missing').length` and `expectedFileGrain = new Set(missingNodes.map(n => n.file)).size` — both re-derived from loaded input fixture, not hardcoded |
| AC-06 | PASS | Test asserts `expect(expectedElementGrain).not.toBe(expectedFileGrain)` (relationship, not specific values per DR-FROZEN-D) |
| AC-07 | PASS | Test asserts `expect(validationParsed.header_missing_count).toBe(expectedFileGrain)` (cross-check graph⇄validation file-grain identity) |
| AC-08 | PASS | tsc --noEmit clean both configs (tsconfig.json + tsconfig.cli.json) at every phase gate (C1, C2, C3) |
| AC-09 | PASS | Vitest sweep `__tests__/pipeline/ + __tests__/integration/rag/ + src/integration/rag/__tests__/` → 263/264 PASS (1 pre-existing baseline failure: `chunk-converter.test.ts:243 maxSourceCodeLength`, unrelated, documented in predecessor WO closeouts and verified pre-existing via stash test in prior dispatch) |
| AC-10 | PASS | Phase 7 chokepoint INVARIANT block (lines 32-70) untouched. `git diff` shows zero changes within those line bounds |
| AC-11 | PASS | Mutation-guard demonstration captured in MUTATION-GUARD-EVIDENCE.md. Path A mutation (flip mod0 fn0+Cls0 → defined) yields `AssertionError: expected 3 to be 2` at line 175 of test file (the cross-check), vitest exits 1. Mutation reverted; clean state confirmed via `git diff` |
| AC-12 | PASS | Default `npx vitest run` (no scope) includes the AC-05 dual-identity test (verified via `--reporter=verbose`); exits non-zero (1) under failed assertion (CI-blocking confirmed) |
| AC-13 | PASS | `git diff --stat e17561b~1..HEAD -- 'src/integration/rag/' ':!src/integration/rag/__tests__/'` returns empty (zero production changes outside __tests__/) |
| AC-14 | PASS | `git diff --stat e17561b~1..HEAD -- src/analyzer/analyzer-service.ts` returns empty |
| AC-15 | DEFERRED | Cultural validator + tracking validator scope-mode runs at SKILLS-side `/close-workorder` |
| AC-16 | DEFERRED | `/close-workorder` produces ARCHIVED.md + tracking ledger updates at SKILLS-side close |

## Decision Records Honored

- **DR-FROZEN-A (fixture location):** Fixture lives at `src/integration/rag/__tests__/fixtures/dual-ac-frozen/`. Co-located with rag tests for cohesion.
- **DR-FROZEN-B (refactor in place):** AC-05 describe block refactored in place at `__tests__/pipeline/indexing-gate-invariant.test.ts`. Git blame continuity preserved. Boundary clarification (fixture in src/integration/rag/__tests__/fixtures/, test stays at __tests__/pipeline/) honored without dispute.
- **DR-FROZEN-C (anti-tautology):** Expected counts are computed from the loaded `graph.json` INPUT (not runtime, not hardcoded). Both expected counts re-derive from the fixture every run. This was the source of the T3.1 halt: the original spec assumed hardcoded literals, but DR-FROZEN-C explicitly forbids them.
- **DR-FROZEN-D (distinctness as relationship):** Test asserts `expect(expectedElementGrain).not.toBe(expectedFileGrain)` — works for any fixture shape where the dual-AC identity holds, not just 6/3.
- **DR-FROZEN-E (verification-only C3 acceptable):** C3 is a verification-only commit. The MUTATION-GUARD-EVIDENCE.md file is the closure artifact; no test or production code change.

## Halt-and-Report Encountered

**T3.1 mutation-guard contradiction** — surfaced 3 paths to ORCHESTRATOR. Plan T3.1 said "flip ONE hs=missing node → test FAILS." Under DR-FROZEN-C input-derived expected, single-node flip yields a mutated fixture where the dual-AC identity STILL HOLDS (5 element-grain / 3 file-grain), and test correctly does not fail. Three paths surfaced:

- (A) Flip BOTH missing nodes of one file (mod0 fn0+Cls0) — file-grain drops 3→2, cross-check FAILS
- (B) Mutate validation-report.json header_missing_count: 3→5 — cross-check FAILS but mutates sentinel rather than substrate
- (C) Add hardcoded-literal supplementary assertion — violates DR-FROZEN-D, not recommended

**ORCHESTRATOR ruled Path A.** Substrate-side mutation (graph.json) is the correct shape for catching production drift; sentinel-side mutation (validation-report.json) is narrower. Path C rejected.

Mutation applied per Path A, FAIL captured, mutation reverted, evidence recorded in MUTATION-GUARD-EVIDENCE.md. Plan-clarification documented inline (NOT a new DR — DR-FROZEN-C still governs).

## Hard Constraints Honored

- Phase 7 archive untouched — verified via `git diff --stat e17561b~1..HEAD -- coderef/archived/` returns empty for that path.
- Predecessor archives untouched (path-normalization-fix, rag-index-single-analyzer-slice, pipeline-indexing-rag, cleanup-indexing-orchestrator-analyzerservice-param).
- Boundary respected: edits stayed in `src/integration/rag/__tests__/fixtures/*` + `__tests__/pipeline/indexing-gate-invariant.test.ts` + `vitest.config.ts` (minimal CI wiring per dispatch boundary clause).
- Production code in `src/integration/rag/*.ts` (excluding __tests__/) untouched.
- AnalyzerService source code untouched.
- Frozen fixture encodes IDENTITY relationship via 6/3 fixture-grain numbers (NOT 2415/263 real-world numbers).
- Anti-tautology guard implemented per DR-FROZEN-C.
- Distinctness assertion in form `not.toBe(otherGrain)` per DR-FROZEN-D.
- Phase 7 chokepoint INVARIANT block (lines 32-70) untouched per AC-10.
- tsc --noEmit clean both configs after each commit.
- All existing tests in scope continue to PASS (1 pre-existing baseline failure unrelated to this WO).

## Deviations from Plan (Honest)

1. **LOC overshoot.** Plan estimate was +30 to +80 net. Actual is +211 net. Overshoot driven by:
   - C1 fixture data (graph.json 80 lines, README.md 52 lines) — necessary content
   - C3 evidence file (MUTATION-GUARD-EVIDENCE.md 76 lines) — required AC-11 closure artifact, plan didn't budget for it
   - Vitest config exclude (3 lines) — minimal CI wiring, plan allowed for it
   These are content lines, not complexity lines. Reported truthfully rather than retrofit.

2. **T3.1 plan-spec clarification needed.** The original plan T3.1 recipe ("flip ONE hs=missing node → test FAILS") was inconsistent with DR-FROZEN-C input-derived expected. Surfaced as halt-and-report; ORCHESTRATOR ruled Path A. Plan was clarified inline, not amended (no new DR).

3. **Vitest config glob.** Adding `**/__tests__/fixtures/**` to the exclude list was not in the original plan, but emerged as a necessary minimal CI fix when fixture src/*.ts files were picked up by vitest's `**/__tests__/**/*.ts` include glob. This is exactly the "minimal CI wiring" the dispatch boundary contemplated.

## Test Coverage Snapshot

- **AC-05 dual-identity test (4/4 PASS):** the refactored test plus the 3 Phase 7 chokepoint INVARIANT tests (a/b/c) in same file
- **Pipeline + integration sweep (263/264 PASS):** 1 pre-existing baseline failure in `chunk-converter.test.ts:243 maxSourceCodeLength`, verified pre-existing in predecessor WO closeouts, unrelated to this WO
- **Default `vitest run` includes AC-05:** verified via `--reporter=verbose`

## Stub Disposition

No stubs filed. Plan-level open issue (T3.1 mutation-guard contradiction) fully resolved via ORCHESTRATOR Path A ruling.

## Cross-Reference

- Plan: `coderef/workorder/rag-index-frozen-fixture-dual-ac-invariants/plan.json`
- Communication: `coderef/workorder/rag-index-frozen-fixture-dual-ac-invariants/communication.json`
- Predecessor archive: `coderef/archived/rag-index-single-analyzer-slice/`
- Frozen fixture: `src/integration/rag/__tests__/fixtures/dual-ac-frozen/`
- Mutation-guard evidence: `src/integration/rag/__tests__/fixtures/dual-ac-frozen/MUTATION-GUARD-EVIDENCE.md`
- Test path: `__tests__/pipeline/indexing-gate-invariant.test.ts` (AC-05 describe block, lines ~98-200)

## Standing By

CODEREF-CORE complete. 3 commits (e17561b → 3adf32a → 6fafa98) ready to push. Awaiting ORCHESTRATOR to dispatch SKILLS for cross-project `/close-workorder` (mirrors DISPATCH-039/041 pattern).

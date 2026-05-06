# ARCHIVED — WO-RAG-INDEX-FROZEN-FIXTURE-DUAL-AC-INVARIANTS-001

- **workorder_id:** WO-RAG-INDEX-FROZEN-FIXTURE-DUAL-AC-INVARIANTS-001
- **feature_name:** rag-index-frozen-fixture-dual-ac-invariants
- **owner_domain:** CODEREF-CORE
- **target_project:** coderef-core
- **originating_dispatches:** DISPATCH-2026-05-04-045 (SKILLS scoping); DISPATCH-2026-05-04-009 (CORE execution)
- **closing_dispatch:** DISPATCH-2026-05-04-046
- **predecessor_stub:** STUB-RAG-INDEX-FROZEN-FIXTURE-DUAL-AC-INVARIANTS-001 (CORE 1cc4acb, DISPATCH-042) — closed by this WO
- **predecessor_workorder:** WO-RAG-INDEX-SINGLE-ANALYZER-SLICE-001 (archived 2026-05-05, CORE a19249a)
- **created:** 2026-05-06T00:50:00Z
- **completed:** 2026-05-05T20:20:00Z
- **archived:** 2026-05-06T01:25:00Z
- **archive_path:** coderef/archived/rag-index-frozen-fixture-dual-ac-invariants
- **review_status:** PASS
- **plan_type:** simple_implementation
- **bulletproof_concept:** #2 of 6

## Audit Verdict

**PASS** — AC-01..AC-14 PASS, AC-12 DIVERGED (LOC overshoot acknowledged content-driven), AC-15/AC-16 produced by this close. Four atomic commits 171fbfb..8458e62 pushed origin/main. Mutation-guard Path A captured CI-blocking failure as expected, reverted clean. Substrate invariants preserved (production code untouched, AC-05a 2415===2415 + AC-05b 263===263 still PASS on real codebase). tsc clean both configs throughout. Phase 7 chokepoint INVARIANT untouched. AnalyzerService source untouched.

## Acceptance Criteria Table

| AC | Statement | Result | Evidence |
|----|-----------|--------|----------|
| AC-01 | Frozen fixture exists at src/integration/rag/__tests__/fixtures/dual-ac-frozen/ with graph.json + validation-report.json + 3 source files + README.md | PASS | commit e17561b |
| AC-02 | graph.json fixture encodes 3 files × 3 nodes (2 hs=missing + 1 hs=defined per file = 6 element-grain skips, 3 file-grain unique) | PASS | inspection of fixture graph.json |
| AC-03 | validation-report.json fixture has header_missing_count=3 (matches file-grain unique count from graph.json) | PASS | inspection of fixture validation-report.json + cross-check |
| AC-04 | AC-05 dual-identity test loads the frozen fixture (NOT procedural build) | PASS | commit 3adf32a — test reads fixture from disk, no in-test JS construction loops |
| AC-05 | Anti-tautology guard: expected counts computed from loaded graph.json (input), NOT hardcoded literals 6/3 | PASS | commit 3adf32a — expected = nodes.filter(n => n.metadata.headerStatus === 'missing').length |
| AC-06 | Distinctness assertion preserved (element-grain !== file-grain; relationship form, not specific numbers) | PASS | test source contains expect(elementGrain).not.toBe(fileGrain) |
| AC-07 | Cross-check assertion: graph.json file-grain unique count === validation-report header_missing_count | PASS | test asserts cross-check; mutation-guard Path A confirmed it triggers FAIL when broken |
| AC-08 | tsc --noEmit clean both configs throughout 4 commits | PASS | clean at every phase gate |
| AC-09 | All existing tests in src/integration/rag/__tests__/ + __tests__/pipeline/* continue to PASS | PASS | vitest 263/264 (1 pre-existing baseline at chunk-converter:243, unrelated) |
| AC-10 | Phase 7 chokepoint INVARIANT block (lines 32-70 of indexing-gate-invariant.test.ts) untouched | PASS | git diff shows zero changes to lines 32-70 |
| AC-11 | Mutation guard demonstrated: flipping fixture nodes from hs=missing to hs=defined causes the AC-05 test to FAIL; mutation reverted before any commit | PASS | commit 6fafa98 — Path A mutation captured `expected 3 to be 2` cross-check FAIL at test:175, vitest exit 1, reverted clean. Evidence in MUTATION-GUARD-EVIDENCE.md. |
| AC-12 | Net negative LOC OR documented overshoot from content (not scope creep) | DIVERGED | +211 net LOC vs +30-80 estimate. Driver: fixture data (.json) + MUTATION-GUARD-EVIDENCE.md content. Substrate goal achieved; LOC delta is content-driven not scope creep. |
| AC-13 | Production code in src/integration/rag/* (excluding __tests__/) is untouched | PASS | git diff over WO range shows zero changes outside __tests__/* + fixture dir + vitest config |
| AC-14 | AnalyzerService source code (src/analyzer/analyzer-service.ts) is untouched | PASS | git diff shows zero changes to that file |
| AC-15 | Cultural validator scope-mode 11/11 PASS + tracking validator scope-mode 15/15 PASS | PASS | this close: 11/11 + 15/15 |
| AC-16 | /close-workorder produces ARCHIVED.md + tracking ledger updates + workorder_completed/closed events | PASS | this archive |

## AC-12 Divergence — Content-Driven Overshoot

Plan estimated +30 to +80 net LOC. Actual: **+211 net LOC**. Breakdown:

- **Phase 1 (e17561b)**: +144 LOC — fixture data (graph.json with 9 nodes, validation-report.json, 3 mod*.ts source files, README.md). Content-heavy: realistic missing-header rows + fixture documentation.
- **Phase 2 (3adf32a)**: -9 net LOC (+98 / -107) — test refactor; replaces procedural fixture-build with frozen-fixture load + anti-tautology guard + vitest config exclude. Modest, in line with estimate.
- **Phase 3 (6fafa98)**: +76 LOC — MUTATION-GUARD-EVIDENCE.md (full Path A demonstration with assertion output, vitest exit code, before/after assertions). Verification-only commit per DR-FROZEN-E.

Substrate goal (frozen fixture + CI invariant + anti-tautology + mutation-guard) **is** achieved. LOC delta is content-driven (fixture+evidence), not scope creep. AC-12 marked DIVERGED rather than retro-shimmed. Reporting truthfully so the closeout artifact and TRACKING ledger see the actual number.

## Implementation Commits (4 atomic, 171fbfb..8458e62)

| # | SHA | Subject |
|---|-----|---------|
| 1 | 171fbfb | plan(WO-...): scope frozen-fixture promotion |
| 2 | e17561b | feat: author frozen fixture for dual-AC identity invariant |
| 3 | 3adf32a | test: load frozen fixture + anti-tautology guard for AC-05 dual identity |
| 4 | 6fafa98 | ci: verify dual-AC fixture is blocking in default vitest run |
| 5 | 8458e62 | docs(workorder): closeout WO-RAG-INDEX-FROZEN-FIXTURE-DUAL-AC-INVARIANTS-001 |

Push target: origin/main. Push was clean. No force-push. HEAD === origin/main at 8458e62.

## Halt Resolutions During Execution

### HALT-1 (Phase 3, T3.1): Mutation-guard semantic conflict

- **Issue:** Plan T3.1 specified "flip ONE hs=missing node → hs=defined; confirm test FAILS." Under DR-FROZEN-C anti-tautology guard (expected counts re-derived from loaded input fixture), flipping one node yields a mutated fixture where the dual-AC identity STILL HOLDS (5 element-grain / 3 file-grain instead of 6/3) because mod0 still has Cls0 missing. Test correctly does not fail. T3.1 wording assumed hardcoded-literals model; DR-FROZEN-C explicitly forbids that.
- **Surfaced by:** CODEREF-CORE during Phase 3 execution
- **Paths:**
  - **(A)** Flip BOTH missing nodes of one file (mod0 fn0+Cls0 → defined). file-grain drops 3→2; cross-check fails. Mutates the source of truth (graph.json).
  - **(B)** Mutate validation-report.json (header_missing_count: 3→5). Cross-check fails immediately. Mutates the sentinel, not the source of truth.
  - **(C)** Add hardcoded-numbers assertions. Violates DR-FROZEN-D explicitly.
- **Ruling:** **Path A** — flip both missing nodes of mod0.
- **Ruled by:** ORCHESTRATOR
- **Rationale:** Path A mutates graph.json which is the file the substrate identity is *about*. Catches mutations to the exact property the WO is locking. Path B is narrower (proves graph/validation-report agree, not that production code honors identity). Path C off the table.
- **Outcome:** Resolved during execution. Mutation captured `expected 3 to be 2` cross-check FAIL at test:175, vitest exit 1 (CI-blocking confirmed), reverted clean. Evidence pinned in MUTATION-GUARD-EVIDENCE.md (in archived directory).
- **Plan amendment:** T3.1 spec under DR-FROZEN-C means *mutate the input in a way that breaks the dual-AC identity, not in a way that preserves it under input-derived expectations.* Single-node-flip recipe assumed hardcoded literals; Path A is the corrected recipe. No new decision record needed — clarification of T3.1 semantics under DR-FROZEN-C.

## Verification Method

- **Frozen-fixture load:** Phase 2 test refactor reads `src/integration/rag/__tests__/fixtures/dual-ac-frozen/graph.json` + `validation-report.json` + 3 source files at test runtime; no in-test JS construction.
- **Anti-tautology guard:** Expected element-grain count = `nodes.filter(n => n.metadata.headerStatus === 'missing').length` (computed from input). Expected file-grain count = `new Set(missingNodes.map(n => n.file)).size` (computed from input). Cross-check: `validationParsed.header_missing_count === expectedFileGrain`.
- **Mutation guard (Path A):** Flipped mod0/fn0 + mod0/Cls0 to hs=defined → graph file-grain drops 3→2 → cross-check `expected 3 to be 2` FAIL at line 175 → vitest exit 1 (CI-blocking). Reverted before commit. Evidence captured in `MUTATION-GUARD-EVIDENCE.md`.
- **TSC invariant:** `tsc --noEmit` clean across both configs at every phase gate.
- **vitest:** 263/264 PASS in pipeline+integration sweep. The 1 pre-existing baseline failure (`chunk-converter:243 maxSourceCodeLength`) is documented in predecessor WO closeouts as a separate stub-class concern, unrelated to this WO.
- **Real-codebase substrate identity preserved:** Predecessor WO's `verify-dual-ac.mjs` static probe still reports AC-05a 2415===2415 + AC-05b 263===263 (substrate identity from bulletproof-pivot-1 not disturbed by this test+CI WO).

## Decisions Honored

- **DR-FROZEN-A:** Frozen fixture under `src/integration/rag/__tests__/fixtures/dual-ac-frozen/` — honored (commit e17561b).
- **DR-FROZEN-B:** Refactor existing test in place rather than authoring new test file — honored (commit 3adf32a edits `__tests__/pipeline/indexing-gate-invariant.test.ts` AC-05 block; preserves git blame + adjacency to Phase 7 chokepoint INVARIANT).
- **DR-FROZEN-C:** Anti-tautology guard via input-derived expected counts — honored.
- **DR-FROZEN-D:** Distinctness check stays as `expect(elementGrain).not.toBe(fileGrain)` (relationship form, not specific numbers) — honored.
- **DR-FROZEN-E:** C3 may be verification-only commit if CI wiring already correct — honored (6fafa98 is verification-only with MUTATION-GUARD-EVIDENCE.md as the closure artifact).

New decision recorded during execution:

- **t31_mutation_guard_clarification (2026-05-05T20:10Z):** T3.1 spec under DR-FROZEN-C means mutate the input in a way that breaks identity. Path A is the corrected recipe. Clarification of T3.1 semantics; not a new decision.

## Hard Constraints Honored

1. **Phase 7 archive untouched** — locked, not reopened.
2. **Predecessor archives untouched** — `path-normalization-fix`, `rag-index-single-analyzer-slice`, `pipeline-indexing-rag`, `cleanup-indexing-orchestrator-analyzerservice-param` all stayed CLOSED.
3. **Boundary preserved** — all changes within `__tests__/pipeline/*` (existing seed) + `src/integration/rag/__tests__/fixtures/` (new fixture) + minimal CI wiring (vitest.config.ts).
4. **Production code in `src/integration/rag/*.ts` MUST NOT change** — honored (AC-13).
5. **AnalyzerService source untouched** — honored (AC-14).
6. **Frozen fixture encodes IDENTITY relationship, not specific real-world numbers** — honored. Fixture uses 6/3 (synthetic), real-codebase 2415/263 not hardcoded anywhere.
7. **Anti-tautology guard required** — honored (DR-FROZEN-C).
8. **Phase 7 chokepoint INVARIANT block (lines 32-70) untouched** — honored (AC-10).
9. **tsc clean both configs after each commit** — honored (AC-08).
10. **Cultural + tracking validators scope-mode PASS clean** — honored (AC-15).

## Diff Radius

- Test code: `__tests__/pipeline/indexing-gate-invariant.test.ts` (AC-05 block refactor only; lines 32-70 chokepoint INVARIANT untouched)
- New fixture: `src/integration/rag/__tests__/fixtures/dual-ac-frozen/` (graph.json + validation-report.json + 3 mod*.ts + README.md)
- CI wiring: minimal (vitest.config.ts exclude adjustment)
- WO artifacts: `coderef/workorder/rag-index-frozen-fixture-dual-ac-invariants/*` (now archived; includes pinned MUTATION-GUARD-EVIDENCE.md)

Zero changes outside this radius. Production code in `src/integration/rag/*.ts` (excluding `__tests__/`) untouched per AC-13.

## Bulletproof Concept #2 Shipped

This close ships **bulletproof concept #2: Frozen fixture + CI invariants for dual-AC identity**. The dual-AC substrate identity from concept #1 (single analyzer slice) is now locked into a deterministic frozen fixture that runs in CI as a blocking invariant. Anti-tautology guard ensures expected counts come from independent computation; mutation-guard Path A demonstrates the test catches identity-breaking mutations.

**Bulletproof concepts now shipped:** #1 (single analyzer slice), #2 (frozen fixture + CI invariants).

**Remaining:** #3 (seam deletion — stubbed as STUB-RAG-INDEX-SEAM-DELETION-001, now safe to scope since safety net is in place), #4 (branded paths — unstubbed), #5 (schema reduction — unstubbed), #6 (two-grain drop — unstubbed).

## Stub Closure (Stub Closed by This Workorder)

- **STUB-RAG-INDEX-FROZEN-FIXTURE-DUAL-AC-INVARIANTS-001** → status=closed_via_workorder; closed_by_workorder=WO-RAG-INDEX-FROZEN-FIXTURE-DUAL-AC-INVARIANTS-001; closed_at=2026-05-06T01:25:00Z.

## Open Items Surfaced (Not Filed by This Close)

- **CWD-side cultural validator issue:** Cultural validator must be invoked with `cd ASSISTANT &&` prefix; if invoked from CORE CWD it falsely reports `alignment_gate_skipped`. Worked around for this close. File as a separate stub if it recurs.
- **Workorders schema 'type' enum gap:** No `test`-typed value in the workorders schema enum. Used `infrastructure` as the closest fit for this WO. File as a separate schema-extension stub if a test-typed WO category is genuinely missing.
- **Pre-existing 14/15 stubs.json schema drift:** Tracked separately by STUB-TRACKING-STUBS-SCHEMA-NAMED-ID-RECONCILIATION-001 (DISPATCH-044). Not introduced by this close; not reopened by this close.

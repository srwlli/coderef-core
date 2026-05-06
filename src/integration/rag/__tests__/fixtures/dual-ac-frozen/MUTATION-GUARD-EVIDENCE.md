# Mutation-Guard Evidence — AC-11 Closure Artifact

**Workorder:** WO-RAG-INDEX-FROZEN-FIXTURE-DUAL-AC-INVARIANTS-001
**Phase:** 3 (T3.1)
**Date:** 2026-05-05

## Purpose

This file is the closure evidence for AC-11 (mutation-guard demonstration). It documents that the AC-05 dual-identity test against this fixture is **real** — not tautological — by showing a captured FAIL when the fixture is mutated to break the dual-AC identity.

## Plan-Spec Clarification

The plan T3.1 originally read:

> "Mutate the fixture: flip src/integration/rag/__tests__/fixtures/dual-ac-frozen/graph.json so one hs=missing node becomes hs=defined. Confirm `vitest run` FAILS the AC-05 dual identity assertion. Revert the mutation before any commit."

Under DR-FROZEN-C (anti-tautology = expected counts derived from input fixture, not runtime, not hardcoded), a single-node flip does NOT cause the test to fail because:

- Expected element-grain re-derives from the mutated input → 5 instead of 6
- Expected file-grain stays at 3 (the mutated file still has another missing node)
- Production output matches the re-derived expected
- Cross-check `validation-report.header_missing_count === expectedFileGrain` (3 === 3) still passes
- The dual-AC identity holds in the mutated fixture; the test correctly does not fail

This is the correct anti-tautology behavior: input-derived expected catches **production drift**, not **fixture drift that preserves identity**.

ORCHESTRATOR ruled (Path A): the corrected mutation recipe is to flip BOTH missing nodes of one file, eliminating that file from the missing set entirely. This breaks the file-grain invariant (3 → 2) and makes the cross-check fail. Path A is the substrate-side mutation that catches the semantic break.

## Captured Mutation-Guard FAIL

**Mutation applied:** Flipped fn0 and Cls0 of `src/mod0.ts` from `headerStatus: "missing"` to `headerStatus: "defined"`. mod0 thus has zero missing nodes; only mod1 and mod2 still contribute to file-grain count.

**Captured vitest output (run under mutation):**

```
FAIL  __tests__/pipeline/indexing-gate-invariant.test.ts > AC-05 dual identity — element-grain + file-grain (frozen fixture) > chunksSkipped exact-equals element-grain count; uniqueFiles exact-equals validation_report.header_missing_count
AssertionError: expected 3 to be 2 // Object.is equality

- Expected
+ Received

- 2
+ 3

 ❯ __tests__/pipeline/indexing-gate-invariant.test.ts:175:51
    173|       header_missing_count: number;
    174|     };
    175|     expect(validationParsed.header_missing_count).toBe(expectedFileGra…
       |                                                   ^
    176|

 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
```

**Exit code under mutation:** `1` (non-zero, CI-blocking confirmed).

The cross-check at line 175 (AC-07) is the mutation-detection mechanism: `validation-report.header_missing_count` (still 3, baseline file-grain) does not match the post-mutation `expectedFileGrain` (2, derived from mutated graph.json). The substrate-vs-baseline divergence is what fails the test.

**Mutation reverted:** `git diff src/integration/rag/__tests__/fixtures/dual-ac-frozen/graph.json` returns clean. Test re-runs PASS, exit 0.

## Default `vitest run` Inclusion (AC-12)

The test is executed by the project's default `npm test` / `npx vitest run` (no scope flags) per `package.json` and `vitest.config.ts`. Verified by running `npx vitest run --reporter=verbose` and confirming the AC-05 dual-identity test appears in the default run output.

CI-blocking: vitest exits with code 1 on any failed assertion under default run.

## What This Demonstrates

The dual-AC identity test is bound to this fixture by:

1. **Production-drift catch:** if `IndexingOrchestrator` ever stops emitting `chunksSkippedDetails` correctly for `headerStatus='missing'` nodes, expected (input-derived) and actual (orchestrator output) diverge → test FAILS.
2. **Fixture-drift catch (substrate-level):** if the fixture is ever mutated to break the dual-AC identity (e.g., file-grain count drops without matching update to validation-report.json), the cross-check at line 175 catches it → test FAILS with non-zero exit.
3. **Distinctness lock:** if a future fixture change collapses element-grain and file-grain to the same number, `expect(expectedElementGrain).not.toBe(expectedFileGrain)` catches it → test FAILS.

The fixture and the test are linked by **two independent paths from input to expected** (loaded graph.json + loaded validation-report.json), so mutations of either side that break their identity surface as test failures, not silent passes.

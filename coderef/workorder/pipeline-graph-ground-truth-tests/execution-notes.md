# WO-PIPELINE-GRAPH-GROUND-TRUTH-TESTS-001 Execution Notes

Executed by CODEREF-CORE on 2026-05-02.

## Scope Completed

- Added `__tests__/pipeline/graph-ground-truth.test.ts`.
- No production files were modified for this Phase 0 workorder.
- The tests are characterization tests for the graph contract Phase 2 must satisfy.

## Targeted Test Command

```powershell
npx vitest run __tests__/pipeline/graph-ground-truth.test.ts
```

## Expected Failure Result

The targeted test file currently fails 6/6 tests against the implementation, which is the expected Phase 0 outcome.

Failing assertions captured:

- Resolved import/call edge endpoints are not graph node IDs and do not carry `metadata.resolutionStatus: "resolved"`.
- Unresolved imports and calls do not carry `metadata.resolutionStatus: "unresolved"` or a machine-readable reason.
- Duplicate function-name calls are not marked `metadata.resolutionStatus: "ambiguous"` and do not expose `candidateIds`.
- Aliased imports do not bind the local alias back to the exported source symbol in call metadata.
- Nested functions and class/object method calls do not preserve qualified target context.
- The graph validation contract cannot distinguish `resolved`, `unresolved`, and `ambiguous` edges because `resolutionStatus` is absent.

## Verification

- `pnpm exec tsc --noEmit` passed.
- `npx vitest run __tests__/pipeline/graph-ground-truth.test.ts` failed as expected: 1 failed file, 6 failed tests.

## Hard Stop

Stopped after failing Phase 0 ground-truth tests were confirmed. No scanner, relationship extraction, import resolution, call resolution, graph construction, indexing, or documentation behavior was fixed in this workorder.

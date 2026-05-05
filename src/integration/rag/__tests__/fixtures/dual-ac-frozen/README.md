# dual-ac-frozen — Frozen fixture for the dual-AC identity invariant

## Purpose

This fixture locks the dual-AC identity relationship asserted by AC-05a / AC-05b of the rag-index pipeline into a deterministic, on-disk artifact. The relationship is:

- **AC-05a (element-grain)** — `chunksSkipped(header_status_missing).length` exact-equals the number of nodes in `.coderef/graph.json` whose `metadata.headerStatus === 'missing'`.
- **AC-05b (file-grain)** — `uniqueFiles(chunksSkippedDetails).size` exact-equals `validation_report.header_missing_count`.

The two grains MUST produce distinct numbers under this fixture so the dual-AC framing is actually exercised. If a future change collapses them to the same value, the test fails loud.

## Shape (6 / 3)

- 3 source files (`src/mod0.ts`, `src/mod1.ts`, `src/mod2.ts`)
- 3 graph nodes per file (1 `function` + 1 `class` + 1 `const`)
- 2 of the 3 nodes per file are `headerStatus='missing'`; the 3rd is `headerStatus='defined'` (so `chunksIndexed >= 1` and the run does NOT collapse to `status='failed'` via the `no_chunks_produced` threshold)

Yields:

- 6 element-grain missing nodes (`AC-05a` expected)
- 3 file-grain unique missing files (`AC-05b` expected)
- `validation-report.json` carries `header_missing_count: 3` (matches file-grain)
- `6 ≠ 3` → distinctness preserved

## Identity-not-numbers

The numbers `2415 / 263` are real-codebase production values — they are NOT load-bearing for this fixture. The fixture asserts the **relationship**, not specific numerical values. If the fixture is later expanded to e.g. 5 files × 4 nodes, the same identity holds (20 element-grain, 5 file-grain) and tests against this fixture continue to pass without code change.

## Anti-tautology guard

The test that consumes this fixture computes its expected counts by **inspecting the loaded `graph.json`** (the input), NOT by reading runtime output and NOT by hardcoding the literals 6/3. This means the test is:

- Independent of fixture content (re-derives expected from input on every run).
- Independent of production output (re-checks production output against input-derived expected).

If a future change drifts the fixture or the production logic, the test catches the divergence.

## Maintenance

If the rag-index graph schema changes:

1. Update this fixture's `graph.json` to match the new schema.
2. Verify the test still passes with the new fixture shape.
3. Ensure the dual-AC distinctness invariant still holds (element-grain count ≠ file-grain count).

Never silently update only the production code — fixture and production must move together. The mutation-guard demonstration in WO-RAG-INDEX-FROZEN-FIXTURE-DUAL-AC-INVARIANTS-001 (Phase 3) confirms the fixture-to-test linkage is real, not tautological.

## Provenance

- Authored under WO-RAG-INDEX-FROZEN-FIXTURE-DUAL-AC-INVARIANTS-001 (DISPATCH-2026-05-04-009).
- Predecessor WO: WO-RAG-INDEX-SINGLE-ANALYZER-SLICE-001 (single-analyzer-slice substrate pivot).
- Bulletproof concept #2 of 6.

# Execution Notes — WO-PIPELINE-OUTPUT-VALIDATION-001 (Phase 6)

**Dispatch:** DISPATCH-2026-05-02-016
**Phase:** 6 of 9-phase pipeline rebuild (sequence 8/10; Phase 0/1/2/2.5/3/4/5 archived)
**Author:** CODEREF-CORE
**Completed:** 2026-05-04

## Summary

First enforcement phase of the rebuild. Single chokepoint validator
`validatePipelineState(state, graph, options): ValidationResult`
landed at `src/pipeline/output-validator.ts` (DR-PHASE-6-A,
DR-PHASE-6-B). Called once in `populate.ts` after
`orchestrator.run()` and before the generator loop; failure mode is
a non-zero process exit owned by the caller, not the validator.

Six graph integrity checks (GI-1 through GI-6) always fail-hard.
Three semantic header checks (SH-1, SH-2, SH-3) warn by default and
promote to fail-hard under the new `--strict-headers` CLI flag
(DR-PHASE-6-D). Validation report (11 locked numeric fields per
R-PHASE-6-C) written to `.coderef/validation-report.json`.

GI-3 runs before GI-2 by design (R-PHASE-6-E mitigation): a resolved
edge with undefined targetId surfaces as `kind: 'phase5_demotion'`
rather than the generic `graph_integrity` kind, preserving the
honest-demotion invariant from Phase 5.

## ORCHESTRATOR design calls (checkpoint 1.6)

| # | call | resolution |
|---|---|---|
| 1 | validation report output strategy | inline writeFile, NOT a generator class |
| 2 | headerStatus aggregation grain | file-grain via `buildFileHeaderStatusMap` helper |
| 3 | layer enum injection | populate.ts loads via `loadLayerEnum()` and passes via `options.layerEnum`; validator stays pure (no fs) |

Safeguards added per ORCHESTRATOR direction:

- `populate.ts` halts BEFORE calling `validatePipelineState` if
  `loadLayerEnum()` throws (task 1.10).
- `output-validation-determinism.test.ts` includes an order-
  independence invariant (task 1.15) that shuffles
  `state.elements` and asserts identical report counts — guards the
  first-seen-wins rule in `buildFileHeaderStatusMap`.

## ORCHESTRATOR mid-phase decision (task 1.16 halt-and-report)

Real-world no-regression test against the actual coderef-core
source surfaced 59 violations: 37 GI-1 duplicate node IDs and 22
GI-6 duplicate identities. Halted per ORCHESTRATOR contract.

ORCHESTRATOR approved Option B+C sequence:

1. **GI-6 reframe** (Option B) — tuple changed from `(name, file)`
   to `(name, file, line)`. Nested functions sharing a name across
   the same file at distinct lines (legitimate, e.g. multiple
   `traverse` helpers) no longer trip GI-6. Only true collisions at
   the same line do. 22 GI-6 violations → 0.

2. **GI-1 root cause investigation** (Option C, time-boxed 30 min)
   — localized to a single-line bug in Phase 1
   `src/pipeline/extractors/element-extractor.ts:188`. The
   `class_declaration` handler manually walked the class body via
   `traverse(classBody, name)` but lacked an early `return`,
   causing the bottom recursion at line 258-260 to re-enter the
   class body. Methods themselves were guarded by `&& parentScope`
   (line 195), but nested arrow functions in the
   `lexical_declaration` branch had no such guard — every
   `const x = () => {}` inside a class method was emitted twice.

ORCHESTRATOR authorized **Option A** (one-line fix as Phase 6
piggyback): `return;` added at `element-extractor.ts:188` mirroring
the existing `function_declaration` pattern at line 127. Fix
verified by the new regression test
`__tests__/element-extractor.test.ts` "Phase 1 regression:
class_declaration recursion leak" — uses two distinct
`const visit = ...` arrows inside class methods (mirrors the
canonical `ast-element-scanner.ts` lines 152 + 459 fixture) and
asserts each is emitted exactly once. 21/21 element-extractor tests
PASS.

Real-world AC-01 then PASSES clean: 0 GI-1 violations, 0 GI-6
violations on 2295 elements / 2623 graph nodes / 3290 resolved
edges.

**Scope discipline:** this is the ONLY Phase 1 fix authorized in
the Phase 6 close per ORCHESTRATOR. No further piggybacks.

## Exit criteria

| # | criterion | proof | status |
|---|---|---|---|
| AC-01 | zero false positives on real Phase 5-passing graph | `output-validation-real-world-noregress.test.ts` runs validator on coderef-core source: `result.ok === true`, `result.errors.length === 0` | PASS |
| AC-02 | GI-1 node ID uniqueness | unit + real-world; post-piggyback fix 0 dups | PASS |
| AC-03 | GI-2 resolved edge endpoint existence | unit | PASS |
| AC-04 | GI-3 phase5_demotion (no dangling resolved edges) | unit; runs before GI-2 | PASS |
| AC-05 | GI-4/GI-5 enum validation (relationship + resolutionStatus) | unit | PASS |
| AC-06 | GI-6 no duplicate identities (reframed tuple) | unit + real-world; nested-fn tolerance verified | PASS |
| AC-07 | SH-1/SH-2/SH-3 semantic header drift surfaces | `output-validation-semantic-headers.test.ts` (10 tests) | PASS |
| AC-08 | determinism (idempotency + purity + order independence) | `output-validation-determinism.test.ts` (3 tests) | PASS |
| AC-09 | --strict-headers promotion to fail-hard | `output-validation-strict-headers.test.ts` (2 tests) | PASS |
| AC-10 | 6/6 Phase 0 graph-ground-truth assertions remain PASS | `graph-ground-truth.test.ts` re-run | PASS |
| AC-11 | validation report 11-field schema | `output-validation-report.test.ts` (3 tests) | PASS |

## Decision records

- **DR-PHASE-6-A** — single chokepoint at `src/pipeline/output-validator.ts`
- **DR-PHASE-6-B** — result-object return; no throw, no `process.exit`, no `console` inside validator
- **DR-PHASE-6-C** — 11-field `ValidationReport` schema locked as public artifact contract
- **DR-PHASE-6-D** — `--strict-headers` CLI flag wires through CliArgs → ValidatePipelineStateOptions
- **DR-PHASE-6-E** — GI-3 runs before GI-2 to preserve Phase 5 honest-demotion `kind`
- **DR-PHASE-6-F** — file-grain `headerStatus` aggregation via `buildFileHeaderStatusMap` (first-seen-wins per file)
- **GI-6 reframe** — `(name, file, line)` tuple instead of `(name, file)`; tolerates nested functions
- **Phase 1 piggyback** — one-line `return;` at `element-extractor.ts:188`; fix SHA: `8b5965f`
- **GI-6 reframe SHA** — `89682b0`
- **Phase 6 test suite + docs SHA** — `8e7ccaf`

## Phase 7 boundary enforcer

`__tests__/pipeline/no-output-validation.test.ts` (Phase 5's
boundary enforcer) DELETED — Phase 6 IS output validation.
`__tests__/pipeline/no-rag-indexing.test.ts` CREATED as the new
Phase 7 boundary enforcer asserting no RAG/indexing fields appear
in Phase 6 outputs.

## Roadmap Phase 6 exit criteria (lines 401-406) — verification

| roadmap criterion | proof | status |
|---|---|---|
| bad graph cannot be written as successful output | AC-02 (GI-1 to GI-6 always fail-hard) + chokepoint INVARIANT (`output-validation-chokepoint.test.ts` 3 tests) — `populate.ts:300-308` calls `process.exit(1)` on `validation.ok=false` BEFORE the generators array at line 316 is iterated. Validator is invoked exactly once, before generators. | PASS |
| validation stats appear in generated artifacts | AC-05 (`output-validation-report.test.ts` 3 tests) + real-world run produced `.coderef/validation-report.json` with all 11 numeric fields populated; `.coderef/index.json` carries the `"validation": {...}` pointer. | PASS |
| CI can fail on graph integrity regressions | AC-02 — graph integrity errors are unconditionally pushed to `result.errors`; populate.ts exits 1. Verified by real-world run AND unit fixtures in `output-validation-graph-integrity.test.ts` (13 tests). | PASS |
| CI can fail on header drift when `--strict-headers` is set | AC-03 + AC-06 + `output-validation-strict-headers.test.ts` (2 tests). Real-world run with `--strict-headers` exits 0 because zero defined-file drift exists in coderef-core source (header_stale=0, header_layer_mismatch=0, header_export_mismatch=0); the unit fixture proves the promotion path: stale @exports header → strict-mode error. | PASS |

## Real-world populate-coderef invocation (task 1.19)

Default mode (`node dist/src/cli/populate.js . --mode=minimal`):

- exit 0
- `.coderef/validation-report.json` written with all 11 fields
- valid_edge_count: 3450 (Phase 5 baseline 3290; source drift expected, no-regress test asserts >500 lower bound)
- header_missing_count: 259 (warning only — files without headers are not promoted to strict failures by SH-1/SH-2/SH-3)
- `.coderef/index.json` carries `"validation": {...}` pointer field

Strict mode (`--strict-headers`):

- exit 0 (no defined-file drift in coderef-core source — SH-1/SH-2/SH-3 only check files with `headerStatus='defined'`, where stale/layer-mismatch/import-mismatch promote to errors)
- `.coderef/` updates normally

## Test-suite headline (task 1.18)

`npx vitest run __tests__/pipeline/`:
- 54 test files / 140 tests / 0 failures
- All 6 Phase 0 graph-ground-truth assertions PASS
- All 13 GI tests PASS (post-GI-6 reframe)
- All 7 new Phase 6 tests PASS (chokepoint, determinism, graph-integrity, semantic-headers, strict-headers, report, real-world-noregress)
- `no-rag-indexing.test.ts` Phase 7 boundary enforcer PASS


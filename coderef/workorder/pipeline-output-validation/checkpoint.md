# Phase 6 Checkpoint: structural_foundation_review

**Workorder:** WO-PIPELINE-OUTPUT-VALIDATION-001
**Dispatch:** DISPATCH-2026-05-02-016
**Plan task gating this halt:** 1.6
**Commit at checkpoint:** `0d7cfa9`

## Status

**HALT — awaiting ORCHESTRATOR review before proceeding to tasks 1.7–1.21.**

## Six review items per plan.json checkpoint_review_items

### (a) Single chokepoint established

`validatePipelineState(state, state.graph, { strictHeaders, layerEnum })` is
called in `src/cli/populate.ts` immediately AFTER `await orchestrator.run(...)`
returns and BEFORE the `generators` array is initialized at line ~283. There
is exactly ONE call site. No other entry points reach generators — every
write (`index.json`, `graph.json`, `semantic-registry.json`,
`exports/graph.json`, `validation-report.json`) is preceded by this single
chokepoint.

On `validation.ok === false`: structured errors logged to stderr, generators
SKIPPED, `process.exit(1)`. On `ok === true` with warnings: warnings logged
to stderr (`[validation warning <check>]`), generators run, exit 0.

### (b) ValidationResult type matches 11-stat report contract verbatim

`ValidationReport` interface in `src/pipeline/output-validator.ts` declares
all 11 fields per AC-04 and R-PHASE-6-C with locked names:

```
valid_edge_count, unresolved_count, ambiguous_count, external_count,
builtin_count, header_defined_count, header_missing_count,
header_stale_count, header_partial_count, header_layer_mismatch_count,
header_export_mismatch_count
```

All fields typed `number` (required, never optional / nullable / string).
Schema is now a public artifact contract — additive-only after ship.

### (c) graph-integrity vs header-drift classification honored at type level

`ValidationError.kind` discriminator: `'graph_integrity' | 'phase5_demotion'
| 'header_drift_strict'`. Graph integrity violations (GI-1, GI-2, GI-4,
GI-5, GI-6) emit `'graph_integrity'`. Phase 5 honest-demotion (GI-3) emits
`'phase5_demotion'`. Strict-promoted header drift emits
`'header_drift_strict'`.

`ValidationWarning.kind` is always `'header_drift'` — used only when
`options.strictHeaders === false` for SH-1 / SH-2 / SH-3.

Promotion logic in `validatePipelineState()`: header-drift entries from
`checkSemanticHeaders` always come back as `ValidationWarning[]`; under
`strictHeaders=true` the validator translates each into a
`ValidationError{ kind: 'header_drift_strict' }` and pushes to `errors[]`
instead. Type narrowing prevents misclassification.

### (d) --strict-headers default false preserves pre-Phase-6 behavior

CLI flag plumbing per DR-PHASE-6-D:
- `populate.ts` parseArgs: `case '--strict-headers': args.strictHeaders =
  true; break;`
- `CliArgs.strictHeaders: boolean` initialized to `false` in default
  argument object
- Passed into validator: `validatePipelineState(state, state.graph, {
  strictHeaders: args.strictHeaders, layerEnum })`
- No environment variable fallback. No config file. CLI flag only.

When the flag is absent (default), header drift surfaces as
`warnings[]` and is logged to stderr with `[validation warning]` prefix,
but `validation.ok === true` and exit code is 0 — pre-Phase-6 behavior is
preserved modulo the new stderr emissions. `PipelineOptions.strictHeaders`
field added to types.ts for documentation; orchestrator does NOT read it.

### (e) Phase 5 honest-demotion invariant in graph integrity check

`ValidationError.kind === 'phase5_demotion'` is reserved for GI-3
specifically — the "no dangling resolved edges" check. The validator stub
at this checkpoint does not yet flag violations (task 1.7 implements GI-1
through GI-6); the type system carries the invariant forward so task 1.7
emits the correct error kind for any edge with `resolutionStatus='resolved'`
AND `targetId` undefined.

R-PHASE-6-E mitigation locked: GI-3 will run BEFORE GI-2 in task 1.7. If
`targetId` is undefined → fails GI-3 (phase5_demotion). If `targetId` is
defined but not in the graph.nodes id Set → fails GI-2 (graph_integrity).

### (f) Boundary enforcer swap documented

- DELETED: `__tests__/pipeline/no-output-validation.test.ts` (Phase 5's
  enforcer asserting Phase 6 fields would NOT leak into Phase 5 — now
  obsolete because Phase 6 IS output validation). Same pattern as Phase 4
  deleting `no-call-resolution.test.ts` and Phase 5 deleting
  `no-graph-construction-leaks.test.ts`.
- CREATED: `__tests__/pipeline/no-rag-indexing.test.ts` (Phase 7 boundary
  enforcer asserting no Phase 7 fields — `ragIndex`, `embeddingVector`,
  `vectorStoreId`, `chunkId`, `ragIndexedAt`, `ragIndexStatus`, `ragChunks`,
  `embeddings`, `vectorStore` — appear on PipelineState, graph, graph.nodes,
  graph.edges, ImportResolution, or CallResolution).

Test PASS confirmed at commit `0d7cfa9`:
- `no-rag-indexing.test.ts` PASS (Phase 7 boundary enforcer in place)
- `graph-ground-truth.test.ts` 6/6 PASS (zero ground-truth regression)

## Design decisions surfaced for ORCHESTRATOR

1. **Validation report output strategy**: writing to
   `.coderef/validation-report.json` directly via `fs.writeFile` in
   populate.ts AFTER generators succeed. Index.json is patched in-place
   with a `validation: { report_path, status: 'pass' }` field. This avoids
   touching IndexGenerator or its `writeIndexVariants` helper. If
   ORCHESTRATOR prefers a dedicated `ValidationReportGenerator` class
   alongside the other generators (consistency with the GraphGenerator /
   IndexGenerator pattern), task 1.10 should refactor to that shape.
   Current approach: minimal surface area, no new generator class.

2. **`headerStatus` aggregation grain (R-PHASE-6-F)**:
   `buildFileHeaderStatusMap` exported from output-validator.ts — builds
   `Map<string, HeaderStatus>` keyed by element.file, first-seen-wins.
   Every element from a given file shares the same headerStatus
   (orchestrator.ts:476-480 stamps the file's status onto every element),
   so first-seen is deterministic. The 6 file-grain header_* counts use
   this map.

3. **Layer enum injection**: `loadLayerEnum()` from
   `pipeline/element-taxonomy.ts` is called in populate.ts BEFORE invoking
   the validator; the result is passed via `options.layerEnum`. The
   validator never reaches the filesystem (purity invariant for AC-08).

## Halt-and-report contract

Per dispatch: any non-test-1-line-52 ground-truth regression OR any
`--strict-headers` default-mode behavior change (default false MUST
preserve pre-Phase-6 exit code 0 path) is fail-fast. At commit `0d7cfa9`:
- All 6 ground-truth assertions still PASS.
- Default-mode behavior preserved (stub validator returns ok=true with
  empty errors[] and zero report — exit 0).

Awaiting ORCHESTRATOR signal to proceed with tasks 1.7–1.21
(checkGraphIntegrity / checkSemanticHeaders / buildReport implementations
+ 7 new tests + populate.ts failure handling polish + `/coderef-pipeline`
real-world run).

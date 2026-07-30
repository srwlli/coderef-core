# Phase 2 Prep Brief — pipeline-relationship-raw-facts

You are a **read-only prep agent** for Phase 2 of the CodeRef Core 9-phase pipeline rebuild.

## Role Boundaries (HARD)

- **Read-only.** No source code edits. No staging. No commits.
- Produce two deliverables: `context.json` and `analysis.json`. Drop both into this directory.
- Hand back when done. The orchestrator (Claude Opus) authors `plan.json` from your deliverables.

## What Phase 2 Does

Phase 2 splits relationship extraction into **raw facts** (what the scanner directly observes) versus **derived facts** (what resolution computes). It also lands **import resolution** and **call resolution** — turning today's unresolved-edge stubs into real graph edges with proper source/target node IDs.

Phase 2 is the phase where **the 6 ground-truth tests from Phase 0 start passing**. That is the regression signal.

## What You Read

1. **Phase 1 commit** — `382e9bb feat(pipeline-scanner-identity-taxonomy): WO-PIPELINE-SCANNER-IDENTITY-TAXONOMY-001 Phase 1`. Read the full diff. Note what shipped vs the original plan.

2. **Phase 0 commit** — `1d1d830 feat(pipeline-graph-ground-truth-tests): WO-PIPELINE-GRAPH-GROUND-TRUTH-TESTS-001 Phase 0`. Read `__tests__/pipeline/graph-ground-truth.test.ts` in full. Map each failing assertion to a contract gap Phase 2 must close.

3. **Roadmap** — `roadmap.md` (in this repo root). Read the Phase 2 section AND the Phase 2.5 section (you must understand the line between them — Phase 2 does NOT include the semantic header parser).

4. **Current code** — grep coderef-core for:
   - Every consumer of `extractDirectory()` and the parallel-scanner remnant in `src/semantic/orchestrator.ts`.
   - Every place relationships are emitted in `src/pipeline/` and `src/scanner/` and `src/scanner/relationship-extractor.ts`.
   - Every import-resolution stub or TODO comment.
   - Every place call-resolution is a no-op or returns unresolved edges.
   - The `ElementData` taxonomy fields (`layer`, `capability`, `constraints`, `headerStatus`) Phase 1 added — note where Phase 2 work might need to read these.

## What You Produce

### 1. `context.json`

Standard workorder context shape. Required keys:
```json
{
  "workorder_id": "WO-PIPELINE-RELATIONSHIP-RAW-FACTS-001",
  "feature_name": "pipeline-relationship-raw-facts",
  "project_id": "coderef-core",
  "predecessor": "WO-PIPELINE-SCANNER-IDENTITY-TAXONOMY-001",
  "objective": "Split relationship extraction into raw vs derived facts. Land import resolution and call resolution. Make the 6 Phase-0 ground-truth tests pass.",
  "scope": {
    "in": [...],
    "out": [...]
  },
  "hard_constraints": [...]
}
```

Out-of-scope MUST include: header parser (Phase 2.5), graph validation contract (Phase 6), RAG facets (Phase 7), `--strict-headers` gate (Phase 6).

### 2. `analysis.json`

Required keys:
```json
{
  "blast_radius": {
    "files_modified": [{"path": "...", "reason": "..."}],
    "files_created": [{"path": "...", "purpose": "..."}],
    "files_deleted": [{"path": "...", "reason": "..."}]
  },
  "risks": [
    {"id": "R1", "description": "...", "mitigation": "...", "severity": "high|medium|low"}
  ],
  "decision_records": [
    {"decision": "...", "rationale": "...", "alternatives_considered": [...]}
  ],
  "ground_truth_test_mapping": [
    {"test_assertion": "...", "phase_2_change_that_satisfies_it": "..."}
  ]
}
```

The `ground_truth_test_mapping` is the most important section — it proves Phase 2's scope actually covers what Phase 0 tests for.

## Discipline Reminders

- If a file looks like Phase 2 needs to touch it but you're unsure, list it in `blast_radius` with `reason: "uncertain — flag for plan author"`. Don't omit and don't pretend certainty.
- If your read of the code suggests roadmap Phase 2 scope is wrong (too small, too large, missing a piece), document that as a `decision_record` with rationale. The plan author will adjudicate.
- No suggestions about HOW to implement. Your job is WHAT changes and WHY. The plan author decides HOW.

## When Done

Write both files to:
- `coderef/workorder/pipeline-relationship-raw-facts-prep/context.json`
- `coderef/workorder/pipeline-relationship-raw-facts-prep/analysis.json`

Then exit. Do not start implementation. Do not edit any source file. Do not commit.

# Phase 3 Prep Brief — pipeline-import-resolution

You are a **read-only prep agent** for Phase 3 of the CodeRef Core 9-phase pipeline rebuild.

## Role Boundaries (HARD)

- **Read-only.** No source code edits. No staging. No commits.
- Produce two deliverables: `context.json` and `analysis.json`. Drop both into this directory.
- Hand back when done. The orchestrator (Claude Opus) authors `plan.json` from your deliverables, using the `/plan-tests-for-workorder` skill for test-matrix planning.

## What Phase 3 Does

Phase 3 implements **import resolution** — turning Phase 2's `RawImportFact[]` and Phase 2.5's `HeaderImportFact[]` into resolved graph edges. This is the phase where **the Phase 0 ground-truth tests finally start passing** (specifically the import-related ones — alias binding, unresolved-explicit, external-classified).

For every `import` (AST or header), Phase 3 produces one of:
- `resolved` — points at a real exported element with a `codeRefId`
- `unresolved` — explicitly classified, NOT silent
- `external` — package import (e.g. `react`)
- `ambiguous` — multiple candidates
- `dynamic` — `import('./x')` form
- `typeOnly` — `import type { X } from './x'`
- `stale` — header `@imports` lists a symbol not actually exported by its module

## What You Read

1. **Roadmap Phase 3 section** — `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\roadmap.md` lines 222-272. Read the full task list and exit criteria.

2. **Phase 0 ground-truth tests** — `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\__tests__\pipeline\graph-ground-truth.test.ts`. Identify which of the 6 failing tests are import-related (alias binding, unresolved imports). Phase 3 makes those pass.

3. **Predecessor archives** — read execution-notes from:
   - `coderef/archived/pipeline-relationship-raw-facts/` (Phase 2 — RawImportFact shape)
   - `coderef/archived/pipeline-semantic-header-parser/` (Phase 2.5 — HeaderImportFact shape, marked RawHeaderImportFact deprecated)

4. **Current types Phase 3 consumes** —
   - `src/pipeline/types.ts` — `RawImportFact`, `RawExportFact` (Phase 2's outputs).
   - `src/pipeline/header-fact.ts` — `HeaderImportFact` (Phase 2.5's structured records, replaces deprecated `RawHeaderImportFact`).

5. **Current code surface to grep:**
   - `src/pipeline/extractors/relationship-extractor.ts` — emits raw imports + structured header imports.
   - `src/pipeline/orchestrator.ts` — Phase 2.5 added `@exports` cross-check here; Phase 3 adds resolution wiring at the same seam.
   - `src/semantic/projections.ts` — currently projects raw facts; Phase 3 must project resolution status alongside.
   - Any existing import-resolution stub (Phase 1's downgraded scanner features may have left TODOs).
   - Any TypeScript path-alias config (`tsconfig.json` paths field) — Phase 3 must honor these if present.

## What Phase 3 Resolves (per roadmap)

- Relative imports (`./x`, `../y/z`)
- Extensionless imports (`./x` resolves to `./x.ts`, `./x/index.ts`)
- Index files (`./dir` → `./dir/index.ts`)
- Package imports (classify as `external` for non-relative non-aliased)
- TypeScript path aliases (if `tsconfig.json` has `paths`)
- Bind aliased names (`import { foo as bar } from './x'` → `bar` resolves to exported `foo`)
- Header `@imports` entries (`<module>:<symbol>` resolves the same way)

## What You Produce

### 1. `context.json`

Standard workorder context shape:
```json
{
  "workorder_id": "WO-PIPELINE-IMPORT-RESOLUTION-001",
  "feature_name": "pipeline-import-resolution",
  "project_id": "coderef-core",
  "predecessor": "WO-PIPELINE-SEMANTIC-HEADER-PARSER-001",
  "objective": "...",
  "scope": { "in": [...], "out": [...] },
  "hard_constraints": [...]
}
```

Out-of-scope MUST include: call resolution (Phase 4), graph construction (Phase 5), output validation (Phase 6), `--strict-headers` gate (Phase 6), RAG facets (Phase 7).

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
  "decision_records": [...],
  "resolution_surface": {
    "import_kinds": [...],
    "resolution_states": [...],
    "edge_cases": [...],
    "tsconfig_paths_strategy": "..."
  },
  "ground_truth_test_mapping": [
    {"test_assertion": "...", "phase_3_change_that_satisfies_it": "..."}
  ],
  "test_planning_notes": "Brief: what should /plan-tests-for-workorder pay attention to."
}
```

The `resolution_surface` and `ground_truth_test_mapping` blocks are critical — Phase 3 is the first phase where ground-truth tests transition from FAIL to PASS, and the test mapping must show exactly which assertions Phase 3 satisfies vs which still wait for Phase 4.

## Discipline Reminders

- Phase 3 does **import resolution only**, not call resolution (Phase 4).
- Phase 3 must NOT introduce graph construction (Phase 5 owns that).
- Phase 3 must NOT introduce the `--strict-headers` validation gate (Phase 6).
- The deprecated `RawHeaderImportFact` (from Phase 2, marked deprecated by Phase 2.5) — Phase 3 owns its REMOVAL. Document this in your blast radius.
- Some Phase 0 ground-truth tests still won't pass after Phase 3 (call-related ones — those wait for Phase 4). Be explicit in the test mapping.
- If a file looks like Phase 3 needs to touch it but you're unsure, list it with `reason: "uncertain — flag for plan author"`.

## When Done

Write both files to:
- `coderef/workorder/pipeline-import-resolution-prep/context.json`
- `coderef/workorder/pipeline-import-resolution-prep/analysis.json`

Then exit. Do not start implementation. Do not edit any source file. Do not commit.

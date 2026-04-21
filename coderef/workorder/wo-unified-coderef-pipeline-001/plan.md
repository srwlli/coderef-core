# WO-UNIFIED-CODEREF-PIPELINE-001

## Phase 3 Realignment Plan

**Date:** 2026-03-12  
**Status:** Replanned to match actual repository state  
**Scope:** `packages/coderef-core` only

---

## Current State Map

### 1. Repository Shape

- The original Phase 3 plan targeted `packages/cli`, but this repository does not contain a `packages/cli` package.
- The actual implementation target is `packages/coderef-core`.
- CLI commands in this repo are standalone scripts under `packages/coderef-core/src/cli/`, not Commander.js registrations in `packages/cli/src/cli.ts`.

### 2. Confirmed Completed Work

- Phase 1-2 pipeline foundation exists:
  - `packages/coderef-core/src/pipeline/types.ts`
  - `packages/coderef-core/src/pipeline/grammar-registry.ts`
  - `packages/coderef-core/src/pipeline/extractors/element-extractor.ts`
  - `packages/coderef-core/src/pipeline/extractors/relationship-extractor.ts`
  - `packages/coderef-core/src/pipeline/orchestrator.ts`
- All 10 Phase 3 generator source files exist under `packages/coderef-core/src/pipeline/generators/`.
- A populate CLI script exists at `packages/coderef-core/src/cli/populate.ts`.
- Core exports were added in:
  - `packages/coderef-core/src/index.ts`
  - `packages/coderef-core/src/pipeline/index.ts`

### 3. Confirmed Incomplete Work

- `populate` is not registered in `packages/coderef-core/package.json`.
- No Phase 3 test suite exists in the planned form:
  - missing `packages/coderef-core/__tests__/pipeline-snapshot.test.ts`
  - missing `packages/coderef-core/__tests__/generators/`
  - missing any repo-valid replacement for `packages/cli/test/e2e/populate.test.ts`
- The original CLI integration steps do not match the repo structure and must be rewritten against `packages/coderef-core/src/cli/`.

### 4. Confirmed Build Blockers

- TypeScript type-check currently fails in the Phase 3 implementation.
- Current failures are concentrated in:
  - `packages/coderef-core/src/pipeline/generators/complexity-generator.ts`
  - `packages/coderef-core/src/pipeline/generators/diagram-generator.ts`
  - `packages/coderef-core/src/pipeline/generators/export-generator.ts`
  - `packages/coderef-core/src/pipeline/generators/graph-generator.ts`
  - `packages/coderef-core/src/pipeline/orchestrator.ts`
- Main mismatch themes:
  - `ElementData` is being used as if it has `endLine`
  - graph nodes are being used as if they always have `name`
  - graph edges are being used as if they have `metadata`
  - generated graph objects do not satisfy the full `ExportedGraph` contract

### 5. Confirmed Git State

- Untracked:
  - `packages/coderef-core/src/pipeline/generators/`
  - `packages/coderef-core/src/cli/populate.ts`
- Modified but not committed:
  - `packages/coderef-core/src/index.ts`
  - `packages/coderef-core/src/pipeline/index.ts`
  - `packages/coderef-core/package.json`

---

## Corrected Objective

Complete Phase 3 inside `packages/coderef-core` by:

1. Fixing the current type-contract breakage.
2. Finishing CLI integration using the existing standalone CLI pattern.
3. Adding Phase 3 tests under `packages/coderef-core/__tests__/`.
4. Verifying the pipeline end-to-end against actual generated `.coderef/` outputs.

---

## Corrected Task Plan

START

### Phase A. Realign the Target Surface

1. **ALIGN-001: Freeze canonical Phase 3 paths**
   - Treat `packages/coderef-core/src/pipeline/` as the only implementation target.
   - Treat `packages/coderef-core/src/cli/` as the only CLI target.
   - Remove all remaining planning assumptions that reference `packages/cli`.
   - Acceptance:
     - All remaining plan tasks point at real repo paths.

2. **ALIGN-002: Rewrite CLI tasks for actual architecture**
   - Replace planned `packages/cli/src/cli.ts` registration work with `packages/coderef-core/package.json` bin registration.
   - Replace planned `packages/cli/src/commands/populate.ts` with the existing `packages/coderef-core/src/cli/populate.ts`.
   - Acceptance:
     - The plan no longer depends on nonexistent files or packages.

### Phase B. Make Phase 3 Compile

3. **BUILD-001: Fix `ExportedGraph` construction in `orchestrator.ts`**
   - Add required `ExportedGraph` fields.
   - Stop attaching unsupported edge properties unless the type contract is updated.
   - Acceptance:
     - `orchestrator.ts` returns a type-valid graph object.

4. **BUILD-002: Fix generator assumptions about graph node and edge shapes**
   - Update `graph-generator.ts`, `diagram-generator.ts`, and `export-generator.ts` to use only fields guaranteed by the actual graph interfaces.
   - Add fallback handling where optional graph node properties are not guaranteed.
   - Acceptance:
     - Generators compile against the real exported graph schema.

5. **BUILD-003: Fix complexity metrics to use real element shape**
   - Replace or derive `endLine` usage in `complexity-generator.ts`.
   - If line-span data is unavailable, compute LOC with safe fallbacks or extend the pipeline type intentionally.
   - Acceptance:
     - Complexity generation compiles and documents the chosen LOC strategy.

6. **VERIFY-001: Run TypeScript no-emit validation**
   - Command target:
     - `tsc -p packages/coderef-core/tsconfig.json --noEmit`
   - Acceptance:
     - Zero TypeScript errors in the core package.

### Phase C. Finish CLI Integration in the Core Package

7. **CLI-001: Register `populate` in `packages/coderef-core/package.json`**
   - Add a `bin` entry for the new populate command.
   - Keep registration consistent with existing `validate-routes` and `scan-frontend-calls` scripts.
   - Acceptance:
     - Build output exposes the populate executable.

8. **CLI-002: Normalize `src/cli/populate.ts` to existing repo conventions**
   - Keep standalone argument parsing unless Commander.js is intentionally introduced repo-wide.
   - Confirm supported flags:
     - `--lang`
     - `--output`
     - `--verbose`
     - `--json`
     - `--skip`
     - `--parallel`
   - Confirm failure behavior:
     - continue when a generator fails
     - report per-generator timing
   - Acceptance:
     - CLI behavior matches the Phase 3 requirements without depending on nonexistent CLI infrastructure.

9. **CLI-003: Verify public exports**
   - Confirm all generator classes and pipeline types remain exported from:
     - `packages/coderef-core/src/index.ts`
     - `packages/coderef-core/src/pipeline/index.ts`
   - Acceptance:
     - `PipelineOrchestrator`, generator classes, and pipeline types are all importable from public surfaces.

### Phase D. Add Tests Where the Repo Actually Stores Them

10. **TEST-001: Create generator unit tests under `packages/coderef-core/__tests__/generators/`**
    - Create one test file per generator.
    - Cover:
      - empty pipeline state
      - minimal valid state
      - output schema shape
      - edge cases relevant to each generator
    - Acceptance:
      - Each generator has a dedicated unit test file.

11. **TEST-002: Create pipeline snapshot compatibility test**
    - Add `packages/coderef-core/__tests__/pipeline-snapshot.test.ts`.
    - Run current generation flow on a fixture project.
    - Compare outputs to stored expected results.
    - Acceptance:
      - Snapshot test documents exact compatibility or intentional deltas.

12. **TEST-003: Create populate CLI integration test inside `packages/coderef-core`**
    - Because `packages/cli` does not exist, place the test in the core package test surface.
    - Validate:
      - `.coderef/` directory creation
      - expected output file set
      - basic schema conformance for generated files
    - Acceptance:
      - The populate entry point is covered end-to-end within the actual package layout.

### Phase E. End-to-End Verification and Closeout

13. **VERIFY-002: Run targeted Phase 3 tests**
    - Run generator tests.
    - Run snapshot test.
    - Run populate integration test.
    - Acceptance:
      - New Phase 3 tests pass.

14. **VERIFY-003: Run manual fixture populate**
    - Execute the populate command against a known fixture or sample project.
    - Inspect generated outputs under `.coderef/`.
    - Acceptance:
      - All expected output groups are present and readable.

15. **REPORT-001: Summarize final Phase 3 outcome**
    - Report:
      - compile status
      - test status
      - output compatibility status
      - remaining deltas, if any
    - Acceptance:
      - Phase 3 status is explicit and ready for commit.

STOP

---

## Revised Completion Sequence

1. Realign paths and task definitions.
2. Fix compile errors in orchestrator and generators.
3. Register and normalize the populate CLI in `packages/coderef-core`.
4. Add generator tests.
5. Add snapshot test.
6. Add populate integration test.
7. Run validation and report final status.

---

## Notes

- The original plan overstated completion. The generator files and populate script exist, but Phase 3 is not execution-ready until the type-contract errors are fixed and tests are added.
- Commander.js should not be introduced just to satisfy the old plan unless the repo is explicitly migrating all CLI entry points to that pattern.
- The next implementation pass should begin with compile repair, not with more file creation.

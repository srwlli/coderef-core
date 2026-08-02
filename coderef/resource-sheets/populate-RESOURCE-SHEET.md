---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: populate
parent_project: coderef-core
category: CLI
version: 1.0.0
documents: src/cli/populate.ts
related_files:
  - src/cli/populate.ts
status: draft
---

## Executive Summary

`populate.ts` is the CLI and programmatic composition root for generating a project's `.coderef` artifacts. It parses CLI options, detects or validates languages, invokes the unified pipeline, gates writes on pipeline-state validation, runs selected artifact generators, optionally writes semantic source headers, and returns a compact summary for MCP callers [ref](src/cli/populate.ts).

## Audience and Intent

CLI, MCP, pipeline, and artifact-generator maintainers should use this sheet when changing populate modes, validation order, output selection, incremental inputs, SCIP overlay setup, or source-header behavior. Programmatic callers should construct defaults with `defaultPopulateArgs` and call `runPopulate` with `programmatic: true` so fatal paths throw instead of terminating the host process.

## Architecture / Behavior

The CLI supports explicit or auto-detected languages, output override, full/minimal/context modes, generator select/skip filters, serial or parallel generation, graph-safe changed/deleted file lists, semantic-registry suppression, source-header write controls, header-coverage enforcement, path include/exclude globs, and an optional SCIP index. `--stale-only` implies source-header writing and overwrite; include/exclude affect only the header-write loop [ref](src/cli/populate.ts).

`runPopulate` creates the output directory, optionally reads and decodes SCIP with warning-only fallback, then chooses full or incremental `PipelineOrchestrator` execution. It loads the canonical layer enum and runs `validatePipelineState` before any generator. Validation errors halt; warnings and header coverage go to stderr. Opt-in header enforcement halts below the configured floor [ref](src/cli/populate.ts).

The generator set is index, graph, registry, complexity, patterns, coverage, drift, validation, diagrams, exports, context, and routes. Minimal mode selects index/graph/registry; context mode selects index/registry/context/complexity; full selects all. Individual generator failures are accumulated rather than aborting siblings. A successful validation report is written after generators, with an index pointer when the index exists [ref](src/cli/populate.ts).

Source-header generation groups semantic elements by file, normalizes project-relative separators for `minimatch`, applies include then exclude then stale-only conditions, and inserts generated headers. The function finally reports pipeline counts, elapsed time, and failed generator names. The bin-only guard ensures importing the module does not parse argv or exit [ref](src/cli/populate.ts).

## Source of Truth

This module is authoritative for populate CLI defaults, option composition, mode-to-generator selection, validation/write order, and programmatic-versus-bin behavior. `PipelineOrchestrator` owns scanning/resolution; each generator owns its artifact schema; `output-validator.ts` owns validity; `element-taxonomy.ts` and `STANDARDS/layers.json` own allowed layers [ref](src/cli/populate.ts).

Runtime configuration comes from CLI arguments and `CODEREF_LAYERS_PATH` / `CODEREF_ASSISTANT_ROOT` indirectly through layer loading. The optional SCIP file is caller-supplied data, not persistent CLI configuration. `populate-cli.test.ts` backs standard generation, language detection/failure, semantic-header idempotence, and include/exclude scoping; `output-validation-report.test.ts` covers emitted validation reporting [ref](__tests__/populate-cli.test.ts) [ref](__tests__/pipeline/output-validation-report.test.ts).

## Public API / Contracts

- `CliArgs` is the full programmatic/CLI options contract, including modes, generator filters, header controls, incremental file lists, path scopes, and SCIP input [ref](src/cli/populate.ts#CliArgs).
- `PopulateSummary` reports success, output path, used languages, element/file/edge counts, duration, and failed generator names [ref](src/cli/populate.ts#PopulateSummary).
- `defaultPopulateArgs` returns stdout-quiet full-mode defaults suitable for a programmatic caller [ref](src/cli/populate.ts#defaultPopulateArgs).
- `runPopulate` executes the shared pipeline and artifact-write path; `programmatic: true` replaces fatal exits with thrown errors and suppresses the final stdout summary [ref](src/cli/populate.ts#runPopulate).

## Dependencies

- Node `fs/promises` and `path` own access checks, artifact/report writes, source-header writes, removal, and path resolution [ref](src/cli/populate.ts).
- `pipeline/orchestrator.ts`, `pipeline/types.ts`, and `pipeline/output-validator.ts` supply execution state and the pre-write validation gate [ref](src/cli/populate.ts).
- The twelve `pipeline/generators/*` modules own individual artifacts [ref](src/cli/populate.ts).
- `detect-languages.ts` validates explicit language keys and detects repository languages [ref](src/cli/populate.ts).
- `HeaderGenerator` plus `buildSemanticElementsFromState` build source-header material; `minimatch` evaluates write-scope globs [ref](src/cli/populate.ts).
- `scip-schema.ts` decodes an optional external SCIP index before it enters the pipeline [ref](src/cli/populate.ts).

## Risks & Edge Cases

- `runPopulate` creates the output directory before reading SCIP and before pipeline validation. A failing run may therefore leave an empty output directory even though artifact generators never ran [ref](src/cli/populate.ts).
- Generator failure is non-transactional: successful siblings may write artifacts while the summary reports failure. Parallel mode also makes completion/write order nondeterministic [ref](src/cli/populate.ts).
- Validation-report write failure is logged but does not change the result, so a summary can report success without that report [ref](src/cli/populate.ts).
- Disabling the semantic registry removes the file after generator execution; it is a post-generation deletion, not generator exclusion [ref](src/cli/populate.ts).
- The header-write counter named `staleRefreshed` increments for every written file even when stale-only is false; its path-scope summary is semantically a general written-file count despite the name [ref](src/cli/populate.ts).
- CLI parsing assumes value-bearing switches have a following argv entry. Missing values can cause direct string operations on `undefined` rather than a tailored usage error [ref](src/cli/populate.ts).
- Direct unit coverage for exported `defaultPopulateArgs` and `runPopulate` in programmatic mode: **NONE found**; current populate tests exercise the spawned CLI path [ref](__tests__/populate-cli.test.ts).

## Validation Checklist

- [x] Verified all four indexed exports and declaration anchors.
- [x] Read the complete option parser, orchestration path, validation gate, generators, and header writer.
- [x] Reviewed direct CLI and validation-report coverage.
- [x] Confirmed source mutation occurs only when explicitly requested by source-header options.


---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: validate_routes
parent_project: coderef-core
category: CLI
version: 1.0.0
documents: src/cli/validate-routes.ts
related_files:
  - src/cli/validate-routes.ts
status: draft
---

## Executive Summary

`validate-routes.ts` is the side-effecting route-validation bin. It resolves generated or explicit frontend/server route artifacts, delegates validation and Markdown formatting, prints a console summary, writes JSON and Markdown reports, and optionally returns exit 1 when critical issues exist [ref](src/cli/validate-routes.ts).

## Audience and Intent

Route-validation and CLI maintainers should use this sheet for flags, path precedence, report destinations, legacy-bin warning, and exit semantics. This file is a bin entry rather than an importable library; validation algorithms live in the validator modules.

## Architecture / Behavior

Arguments support project directory, paired explicit files, critical gate, output override, and help. Project mode takes precedence and always selects `.coderef/frontend-calls.json` plus `.coderef/routes.json`. Missing directory/files and incomplete arguments exit 2. Unknown flags exit 1 during parsing [ref](src/cli/validate-routes.ts).

Main warns only for the legacy bin key, shows help for no args, generates a report, prints counts and up to five critical messages, writes `route-validation.json`, writes Markdown to the override/default, then exits 1 only when the gate is enabled and critical count is positive. Other runtime errors print a stack and exit 2 [ref](src/cli/validate-routes.ts).

## Source of Truth

This module is authoritative for CLI flags, artifact path selection, console presentation, output locations, and exit codes. `route-validator.ts` owns the validation report and JSON save; `report-generator.ts` owns Markdown content/save [ref](src/cli/validate-routes.ts).

Runtime configuration is CLI-only. Input/output JSON/Markdown files are the persistent artifacts. `cli/validate-routes.test.ts` backs help, path modes, missing files, issue families, gate exits, custom/default output, and both report writes [ref](src/cli/validate-routes.test.ts).

## Public API / Contracts

Indexed/importable exports: **NONE**. The module invokes `main()` unconditionally and is contracted as a bin entry, not a library surface [ref](src/cli/validate-routes.ts).

## Dependencies

- Node `fs/promises` and `path` verify/compose input and output paths [ref](src/cli/validate-routes.ts).
- `validator/route-validator.ts` generates and saves the JSON report [ref](src/cli/validate-routes.ts).
- `validator/report-generator.ts` renders/saves Markdown [ref](src/cli/validate-routes.ts).
- `cli/bin-alias.ts` emits the legacy-name warning to stderr [ref](src/cli/validate-routes.ts).

## Risks & Edge Cases

- Importing the module runs `main()` immediately and can call `process.exit`; it is unsafe as a library dependency [ref](src/cli/validate-routes.ts).
- Unknown options exit 1, while help documents exit 2 for invalid arguments. Missing option values are accepted as `undefined` and fail later through path-mode validation [ref](src/cli/validate-routes.ts).
- When both project and explicit paths are supplied, project mode silently wins [ref](src/cli/validate-routes.ts).
- Report writes occur before the critical gate exit, so a failing CI gate still produces both artifacts by design [ref](src/cli/validate-routes.ts).
- JSON output cannot be redirected independently; explicit-input mode writes beside the frontend-calls file, while only Markdown honors `--output` [ref](src/cli/validate-routes.ts).
- The imported `generateMarkdownReport` result is assigned but never used; `saveMarkdownReport` receives the report and regenerates/saves independently [ref](src/cli/validate-routes.ts).

## Validation Checklist

- [x] Verified the live index has zero exports.
- [x] Traced parsing, path precedence, validation, summaries, writes, and all exits.
- [x] Reviewed the direct CLI suite.
- [x] Identified unconditional bin execution and output asymmetry.


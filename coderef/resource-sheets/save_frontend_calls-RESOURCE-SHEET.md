---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: save_frontend_calls
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/fileGeneration/saveFrontendCalls.ts
related_files:
  - src/fileGeneration/saveFrontendCalls.ts
status: draft
---

## Executive Summary

`saveFrontendCalls.ts` is the scan-and-save path for `frontend-calls.json`. It delegates project scanning, converts calls to a stable artifact shape, groups recognized call families, sorts by path, stamps metadata, and supports save, in-memory generation, and count-only entry points [ref](src/fileGeneration/saveFrontendCalls.ts).

## Audience and Intent

Frontend-call CLI, artifact, and validation maintainers should use this sheet for the standalone scanner-produced format. A separate element-projection implementation exists in `generator/generateRoutes.ts`; consumers must account for its different grouping key/envelope.

## Architecture / Behavior

Formatting copies path/method/file/line/type/confidence, precreates four known groups, appends only recognized types, removes empty groups, sorts each group and the flat list by path, and adds an ISO time, project path, and scan version. Saving scans first, creates the destination directory, and writes pretty JSON [ref](src/fileGeneration/saveFrontendCalls.ts).

## Source of Truth

This module is authoritative for the standalone `byType` plus flat `calls` artifact and its default location. `frontend-scanner.ts` owns repository discovery and the parser module owns individual facts [ref](src/fileGeneration/saveFrontendCalls.ts).

Runtime configuration is project path, optional output path, and optional extensions. Persistent backing is the written JSON file. `saveFrontendCalls.test.ts` backs formatting, sorting, empty-group removal, metadata, paths/extensions, JSON, count, and multi-family/empty integration [ref](src/fileGeneration/saveFrontendCalls.test.ts).

## Public API / Contracts

- `FrontendCallElement` is the persisted source-aware call shape [ref](src/fileGeneration/saveFrontendCalls.ts#FrontendCallElement).
- `FrontendCallsOutput` contains total, recognized groups, flat calls, and generation metadata [ref](src/fileGeneration/saveFrontendCalls.ts#FrontendCallsOutput).
- `formatFrontendCallsOutput` synchronously formats scanner calls [ref](src/fileGeneration/saveFrontendCalls.ts#formatFrontendCallsOutput).
- `saveFrontendCalls` scans and writes the default/custom JSON path [ref](src/fileGeneration/saveFrontendCalls.ts#saveFrontendCalls).
- `generateFrontendCallsOutput` scans and returns the formatted artifact without writing [ref](src/fileGeneration/saveFrontendCalls.ts#generateFrontendCallsOutput).
- `countFrontendCalls` scans and returns the raw call count [ref](src/fileGeneration/saveFrontendCalls.ts#countFrontendCalls).

## Dependencies

- Node `fs/promises` and `path` create/write the destination [ref](src/fileGeneration/saveFrontendCalls.ts).
- `scanner/frontend-scanner.ts` performs project scanning [ref](src/fileGeneration/saveFrontendCalls.ts).
- `analyzer/frontend-call-parsers.ts` supplies `FrontendCall` [ref](src/fileGeneration/saveFrontendCalls.ts).

## Risks & Edge Cases

- Unknown future `callType` values count toward `totalCalls` and appear in the flat list but are silently absent from `byType` [ref](src/fileGeneration/saveFrontendCalls.ts).
- Generation timestamps make repeated equivalent results non-byte-identical [ref](src/fileGeneration/saveFrontendCalls.ts).
- Sorting is path-only, so equal-path ordering inherits scanner input/engine sort stability and is not explicitly file/line deterministic [ref](src/fileGeneration/saveFrontendCalls.ts).
- Save is non-atomic and can leave a truncated file on interruption [ref](src/fileGeneration/saveFrontendCalls.ts).
- Count-only still performs the full project scan; it saves formatting/allocation only [ref](src/fileGeneration/saveFrontendCalls.ts).

## Validation Checklist

- [x] Verified all six indexed exports and anchors.
- [x] Traced conversion, grouping, sorting, scan, save, in-memory, and count paths.
- [x] Reviewed the direct formatting and integration suite.
- [x] Identified unknown-family and determinism behavior.


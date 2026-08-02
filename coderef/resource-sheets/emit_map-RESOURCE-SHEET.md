---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: emit_map
parent_project: coderef-core
category: formatter
version: 1.0.0
documents: src/map/emit-map.ts
related_files:
  - src/map/emit-map.ts
status: draft
---

## Executive Summary

`emit-map.ts` is the shared CLI/MCP write path for projecting CodeRef map data and emitting a self-contained graph viewer plus engineering dashboard under a caller-selected output directory [ref](src/map/emit-map.ts).

## Audience and Intent

Map CLI, MCP, viewer-asset, and projection maintainers use this module to preserve byte-parity across surfaces. Analysis remains separate: prebuilt HTML/CSS/JS assets are copied and populated here rather than constructed by projection code.

## Architecture / Behavior

Asset discovery supports built and source layouts. Validation-report loading parse-checks raw JSON and maps absent, unreadable, or malformed input to disclosed no-data. JSON embedding escapes script-breaking characters. Viewer emission writes `data.json`, copies both viewer/dashboard bundles and shared tokens, verifies placeholder contracts, and emits static HTML with inline data [ref](src/map/emit-map.ts).

`generateMap` optionally extracts git history, normally extracts subprocess test contents when metrics are enabled, passes plain results into the pure projection, emits to the explicit directory or `.coderef/map`, and reports degraded extraction reasons without fabricating data [ref](src/map/emit-map.ts).

## Source of Truth

This module is authoritative for map write confinement, asset lookup/copying, placeholder substitution, validation no-data handling, JSON script safety, impure git/subprocess orchestration, default output paths, and emitted result paths. `project-map-data.ts` owns pure projection; bundled assets own HTML/render behavior [ref](src/map/emit-map.ts).

Runtime configuration is `GenerateMapOptions` and the output directory; persistent outputs are the emitted map bundle. Dashboard/viewer asset tests cover placeholders, copied assets, escaping, and validation tri-state behavior; MCP parity tests cover shared projection/emission and confined paths [ref](__tests__/map/dashboard-asset.test.ts) [ref](__tests__/map/viewer-asset.test.ts) [ref](__tests__/map/mcp-map-parity.test.ts).

## Public API / Contracts

- `MAP_DATA_PLACEHOLDER` is the exact map-data substitution token [ref](src/map/emit-map.ts#MAP_DATA_PLACEHOLDER).
- `VALIDATION_PLACEHOLDER` is the exact validation-data substitution token [ref](src/map/emit-map.ts#VALIDATION_PLACEHOLDER).
- `viewerAssetDir` locates the bundled viewer assets in source or distribution layouts [ref](src/map/emit-map.ts#viewerAssetDir).
- `readValidationReport` returns validated raw JSON or `null` no-data [ref](src/map/emit-map.ts#readValidationReport).
- `embedJson` escapes JSON for safe inline script embedding [ref](src/map/emit-map.ts#embedJson).
- `emitViewer` copies and populates the graph/dashboard asset bundle [ref](src/map/emit-map.ts#emitViewer).
- `GenerateMapResult` reports projected data, output paths, and optional degraded reasons [ref](src/map/emit-map.ts#GenerateMapResult).
- `GenerateMapOptions` extends projection options with git and subprocess extraction controls [ref](src/map/emit-map.ts#GenerateMapOptions).
- `generateMap` orchestrates optional extraction, pure projection, emission, and result shaping [ref](src/map/emit-map.ts#generateMap).

## Dependencies

- Node filesystem/path modules locate, validate, copy, and write emitted artifacts [ref](src/map/emit-map.ts).
- `project-map-data.ts` produces the pure `MapData` payload [ref](src/map/emit-map.ts).
- Git-history and subprocess-linkage modules own optional impure extraction [ref](src/map/emit-map.ts).

## Risks & Edge Cases

- Emission performs sequential synchronous writes with no transaction/rollback; failure can leave a partial output bundle [ref](src/map/emit-map.ts).
- Only HTML placeholder presence is validated; referenced asset contents/versions are trusted until tests or runtime use reveal mismatch [ref](src/map/emit-map.ts).
- A malformed validation report is intentionally indistinguishable from an absent report in the emitted data, both becoming `null` [ref](src/map/emit-map.ts).
- Map data is duplicated into `data.json`, graph HTML, and dashboard HTML, increasing output size [ref](src/map/emit-map.ts).
- Existing output files not in the current copy list are not removed and can remain stale [ref](src/map/emit-map.ts).
- Caller-provided output paths are accepted directly; confinement to `.coderef/map` applies to default CLI/MCP usage rather than arbitrary direct calls [ref](src/map/emit-map.ts).

## Validation Checklist

- [x] Verified all nine indexed exports and declaration anchors.
- [x] Traced asset lookup, validation loading, escaping, copying, projection, and degraded extraction.
- [x] Reviewed viewer/dashboard emission and CLI/MCP parity coverage.
- [x] Documented partial-write, stale-output, and caller-path behavior.


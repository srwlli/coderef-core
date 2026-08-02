---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: dynamic_import_detector
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/analyzer/dynamic-import-detector.ts
related_files:
  - src/analyzer/dynamic-import-detector.ts
status: draft
---

## Executive Summary

`dynamic-import-detector.ts` uses the TypeScript compiler API to locate `import()` expressions in TS/TSX/JS/JSX, classify their surrounding syntax, record function/class context, resolve relative literal paths, and derive coarse dynamic-call edges for destructured or namespace assignments [ref](src/analyzer/dynamic-import-detector.ts).

## Audience and Intent

Scanner and relationship-graph maintainers should use this sheet when changing dynamic import recognition, context attribution, path resolution, or edge projection. The output is static evidence only: computed module paths and namespace member calls are not fully resolved.

## Architecture / Behavior

File detection reads synchronously, parses by extension, recursively visits all nodes, and caches results by exact path. Each `import()` records a literal module path, template head plus `...`, or `<dynamic>`, one-based line/zero-based column, surrounding named function/method/arrow/class, import style, destructured symbols, optional namespace variable, and a best-effort resolved local path [ref](src/analyzer/dynamic-import-detector.ts).

Import-style classification walks ancestors and returns the first await, `.then`, conditional expression/if, or defaults to promise. Destructuring supports variable bindings and the first `.then` callback parameter. Relative resolution checks explicit extensions, appended TS/JS variants, and directory index files. Edge construction emits one edge per destructured symbol or a `*` edge for a namespace variable [ref](src/analyzer/dynamic-import-detector.ts).

## Source of Truth

This class is authoritative for dynamic-import facts and its coarse `dynamic-call` edge projection. TypeScript's AST is the syntax authority; the filesystem is the resolution authority for relative literals. Runtime configuration/persistent storage: **NONE**; the constructor's `basePath` is retained but not used [ref](src/analyzer/dynamic-import-detector.ts).

`dynamic-imports.test.ts` backs await/promise/conditional patterns, destructuring, namespace imports, contexts, path resolution, cache, and edges. Scanner relationship tests back pipeline integration and template/static distinction [ref](__tests__/dynamic-imports.test.ts) [ref](src/scanner/__tests__/relationship-tracking.test.ts).

## Public API / Contracts

- `DynamicImport` is the normalized import fact including syntax, location, context, symbols, namespace, and optional resolved path [ref](src/analyzer/dynamic-import-detector.ts#DynamicImport).
- `DynamicCallEdge` is the coarse source-to-module/symbol relationship contract [ref](src/analyzer/dynamic-import-detector.ts#DynamicCallEdge).
- `DynamicImportDetector` exposes file detection, dynamic-edge building, and cache clearing [ref](src/analyzer/dynamic-import-detector.ts#DynamicImportDetector).

## Dependencies

- Node `fs` reads source and probes resolution candidates [ref](src/analyzer/dynamic-import-detector.ts).
- `typescript` supplies parsing, traversal, syntax guards, and source positions [ref](src/analyzer/dynamic-import-detector.ts).
- Node `path` resolves relative module and index candidates [ref](src/analyzer/dynamic-import-detector.ts).

## Risks & Edge Cases

- Cache entries never check file mtime/content and arrays are returned by reference, so file edits or caller mutation can make later results stale [ref](src/analyzer/dynamic-import-detector.ts).
- `basePath` and `buildDynamicCallEdges`'s `elementMap` parameter are unused; callers may assume scoping/validation that does not occur [ref](src/analyzer/dynamic-import-detector.ts).
- Template expressions preserve only the head and append `...`; later static quasis and expression names are lost, preventing meaningful path resolution [ref](src/analyzer/dynamic-import-detector.ts).
- A bare side-effect `import('./x')` and an unassigned `.then(mod => mod.foo())` with an identifier parameter produce no dynamic-call edge unless destructuring is present [ref](src/analyzer/dynamic-import-detector.ts).
- Namespace edges target `*` and do not inspect which members are later invoked [ref](src/analyzer/dynamic-import-detector.ts).
- File/parse errors are silently returned as no imports, making failure indistinguishable from a clean file [ref](src/analyzer/dynamic-import-detector.ts).

## Validation Checklist

- [x] Verified all three indexed exports and anchors.
- [x] Traced syntax classification, context, symbol extraction, resolution, cache, and edge paths.
- [x] Reviewed direct and scanner-integration tests.
- [x] Identified unused parameters and intentionally coarse dynamic cases.


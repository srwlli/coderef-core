---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: index_storage
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/artifacts/index-storage.ts
related_files:
  - src/artifacts/index-storage.ts
status: draft
---

## Executive Summary

`index-storage.ts` defines CodeRef index schema 3.0.0, converts between verbose `ElementData` and a deliberately reduced compact shape, writes JSON and gzip variants with a shared timestamp, and loads the first readable supported index representation from a `.coderef` directory [ref](src/artifacts/index-storage.ts).

## Audience and Intent

Artifact-generator, drift, and index-consumer maintainers should use this sheet when changing schema, compact fields, candidate precedence, or compatibility. Compact round trips preserve only type/name/file/line plus parameters/exported/async/UUID; consumers needing other element metadata must prefer verbose data.

## Architecture / Behavior

Verbose creation retains the original elements array and computes type counts. Compact creation maps long keys to `t/n/f/l/p/e/a/u`, reduces parameter objects to names, and drops other fields. Both default to a fresh ISO timestamp, while `writeIndexVariants` creates verbose first and passes its timestamp to compact for consistency [ref](src/artifacts/index-storage.ts).

Writing creates the directory, emits unformatted `index.json` and `index.compact.json`, compresses both at gzip level 9 in parallel, then writes the `.gz` files. Loading tries compact gzip, compact JSON, verbose gzip, then verbose JSON. It accepts a legacy bare array, v2-style envelope, schema-3 compact/verbose envelope, and returns normalized elements plus the chosen source path [ref](src/artifacts/index-storage.ts).

## Source of Truth

This module is authoritative for index schema/version labels, compact encoding, four artifact names, candidate precedence, and compatibility normalization. `ElementData` is authoritative for verbose element data [ref](src/artifacts/index-storage.ts).

Runtime configuration/persistent metadata beyond call arguments: **NONE**. The `.coderef` files are the persistent backing artifacts. `fileGeneration/__tests__/index-storage.test.ts` backs verbose/compact conversion, shared metadata, gzip variants, load precedence, and legacy normalization [ref](src/fileGeneration/__tests__/index-storage.test.ts).

## Public API / Contracts

- `IndexSchemaVersion` is the literal schema `3.0.0` [ref](src/artifacts/index-storage.ts#IndexSchemaVersion).
- `IndexFormat` is `verbose | compact` [ref](src/artifacts/index-storage.ts#IndexFormat).
- `VerboseIndexFile` is the schema-3 full-element envelope [ref](src/artifacts/index-storage.ts#VerboseIndexFile).
- `CompactElement` defines the short-key lossy element representation [ref](src/artifacts/index-storage.ts#CompactElement).
- `CompactIndexFile` is the schema-3 compact envelope [ref](src/artifacts/index-storage.ts#CompactIndexFile).
- `LoadedIndex` is the normalized load result with source path [ref](src/artifacts/index-storage.ts#LoadedIndex).
- `toCompactElements` performs the lossy short-key projection [ref](src/artifacts/index-storage.ts#toCompactElements).
- `fromCompactElements` restores the supported subset to `ElementData` [ref](src/artifacts/index-storage.ts#fromCompactElements).
- `createVerboseIndexFile` creates a full envelope and type counts [ref](src/artifacts/index-storage.ts#createVerboseIndexFile).
- `createCompactIndexFile` creates a reduced envelope and type counts [ref](src/artifacts/index-storage.ts#createCompactIndexFile).
- `writeIndexVariants` writes verbose/compact JSON and gzip artifacts [ref](src/artifacts/index-storage.ts#writeIndexVariants).
- `loadIndexFromCoderefDir` loads and normalizes the first successful candidate [ref](src/artifacts/index-storage.ts#loadIndexFromCoderefDir).

## Dependencies

- Node `fs/promises` and `path` create/read/write artifact paths [ref](src/artifacts/index-storage.ts).
- Node `zlib` and `util.promisify` gzip and gunzip buffers [ref](src/artifacts/index-storage.ts).
- `types/types.ts` supplies `ElementData` [ref](src/artifacts/index-storage.ts).

## Risks & Edge Cases

- Compact conversion is intentionally lossy; documentation, imports, relationships, scopes, complexity, clone data, headers, and other extensions do not round-trip [ref](src/artifacts/index-storage.ts).
- Writes are not atomic or transactional. Failure after one or more writes can leave mixed timestamps/formats or missing compressed siblings [ref](src/artifacts/index-storage.ts).
- Loading catches every candidate error, including corruption, and falls through without diagnostics. A corrupt preferred file can be silently masked by an older fallback [ref](src/artifacts/index-storage.ts).
- A readable but structurally invalid object normalizes to `elements: []` and is accepted immediately rather than trying the next candidate [ref](src/artifacts/index-storage.ts).
- Compact detection checks only the first element. An empty compact file is treated as verbose, and mixed-shape arrays can be misclassified [ref](src/artifacts/index-storage.ts).
- Verbose envelopes retain the caller's elements array by reference; mutation after creation changes the in-memory envelope without recomputing counts [ref](src/artifacts/index-storage.ts).

## Validation Checklist

- [x] Verified all twelve indexed exports and anchors.
- [x] Traced conversion, timestamp, write, compression, compatibility, and precedence paths.
- [x] Reviewed the direct storage suite.
- [x] Documented compact loss and non-atomic/fallback behavior.


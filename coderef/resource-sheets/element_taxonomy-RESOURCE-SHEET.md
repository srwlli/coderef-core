---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: element_taxonomy
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/pipeline/element-taxonomy.ts
related_files:
  - src/pipeline/element-taxonomy.ts
status: draft
---

## Executive Summary

`element-taxonomy.ts` defines semantic-header status values, validates kebab-case names, and loads the canonical layer vocabulary from `ASSISTANT/STANDARDS/layers.json`. Its path resolver is independent of the invocation directory and supports explicit environment overrides [ref](src/pipeline/element-taxonomy.ts).

## Audience and Intent

Scanner, semantic-header, validation, and pipeline maintainers should use this module instead of duplicating status or layer validation. Operators can override the layers file directly or point at an ASSISTANT root when the standard is not discoverable from the installation or working-directory ancestry.

## Architecture / Behavior

Layer-path resolution checks `CODEREF_LAYERS_PATH`, then `CODEREF_ASSISTANT_ROOT`, then walks ancestors from the installed module directory, then walks ancestors from `process.cwd()`. If nothing exists it returns a deterministic install-relative fallback so the later read error names a stable path [ref](src/pipeline/element-taxonomy.ts).

Loading parses `layers[].id`, keeps string IDs, and rejects an empty result. The canonical resolved path is cached; explicit alternate paths are re-read. Layer validation checks string membership in the loaded enum. Kebab-case validation requires a lowercase alphanumeric first segment and lowercase alphanumeric hyphen-separated continuations [ref](src/pipeline/element-taxonomy.ts).

## Source of Truth

`ASSISTANT/STANDARDS/layers.json` is authoritative for layer IDs. This module is authoritative for lookup order, caching, header status vocabulary/default, and kebab-case validation. The only process state is a module-local cache for the canonical layer path [ref](src/pipeline/element-taxonomy.ts).

`element-taxonomy.test.ts` backs the canonical 13-layer list, BNF agreement, environment overrides, nested-cwd discovery, and kebab-case cases. `header-layer-runtime-validation.test.ts` backs acceptance and fail-closed behavior against an explicitly drifted layers file [ref](__tests__/pipeline/element-taxonomy.test.ts) [ref](__tests__/pipeline/header-layer-runtime-validation.test.ts).

## Public API / Contracts

- `LayerEnum` is the runtime-loaded layer identifier type alias [ref](src/pipeline/element-taxonomy.ts#LayerEnum).
- `HeaderStatus` is `'defined' | 'stale' | 'missing' | 'partial'` [ref](src/pipeline/element-taxonomy.ts#HeaderStatus).
- `HEADER_STATUSES` enumerates the four header states [ref](src/pipeline/element-taxonomy.ts#HEADER_STATUSES).
- `DEFAULT_HEADER_STATUS` is `missing` [ref](src/pipeline/element-taxonomy.ts#DEFAULT_HEADER_STATUS).
- `resolveLayersPath` returns the first configured/discovered canonical layers path or a stable fallback [ref](src/pipeline/element-taxonomy.ts#resolveLayersPath).
- `loadLayerEnum` returns non-empty string IDs from the selected layers JSON and caches the canonical read [ref](src/pipeline/element-taxonomy.ts#loadLayerEnum).
- `isValidLayer` is a runtime string-and-membership type guard [ref](src/pipeline/element-taxonomy.ts#isValidLayer).
- `isKebabCase` validates the shared lowercase kebab-case convention [ref](src/pipeline/element-taxonomy.ts#isKebabCase).

## Dependencies

- Node `fs` checks ancestor candidates and reads the selected JSON synchronously [ref](src/pipeline/element-taxonomy.ts).
- Node `path` normalizes overrides, ancestor traversal, and fallback paths [ref](src/pipeline/element-taxonomy.ts).
- `ASSISTANT/STANDARDS/layers.json` supplies canonical runtime data [ref](src/pipeline/element-taxonomy.ts).

## Risks & Edge Cases

- Canonical layers are cached for the process lifetime. Editing the standard after the first canonical load is not observed without reloading the module/process [ref](src/pipeline/element-taxonomy.ts).
- The cache condition calls `resolveLayersPath` again, so environment changes can redirect later calls; an old cached value is retained but not returned for the changed canonical path [ref](src/pipeline/element-taxonomy.ts).
- JSON syntax errors, missing files, non-array `layers`, and empty/stringless layer lists throw synchronously. Callers such as populate must establish their own error boundary [ref](src/pipeline/element-taxonomy.ts).
- Duplicate layer IDs are preserved because loading does not deduplicate; membership remains correct but consumers inspecting length/order see duplicates [ref](src/pipeline/element-taxonomy.ts).
- `LayerEnum` is only `string` at compile time, so static typing does not enforce membership without `isValidLayer` [ref](src/pipeline/element-taxonomy.ts).

## Validation Checklist

- [x] Verified all eight indexed exports and declaration anchors.
- [x] Traced every resolution and cache branch.
- [x] Reviewed canonical, BNF, environment, nested-cwd, and drift tests.
- [x] Named `STANDARDS/layers.json` as the runtime authority.


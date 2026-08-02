---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: coderef_id
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/utils/coderef-id.ts
related_files:
  - src/utils/coderef-id.ts
status: draft
---

## Executive Summary

`coderef-id.ts` is the canonical pure formatter for CodeRef element identities. It normalizes a file relative to a project root, maps element taxonomy values to compact designators, and emits line-sensitive or stable no-line IDs [ref](src/utils/coderef-id.ts).

## Audience and Intent

Scanner, resolver, graph, and projection maintainers should use this sheet before changing element identity. Consumers should use it to interpret the `@<designator>/<file>#<name>:<line>` grammar and the deliberate distinction between anchored and no-line identities.

## Architecture / Behavior

Absolute paths are relativized against `projectPath`; relative paths pass through unchanged. Slashes are normalized and one leading `./` is removed. Element types then map to a compact designator: functions, classes, components, hooks, and methods have distinct tags, while interface/type, constant/property, and decorator/unknown pairs share tags [ref](src/utils/coderef-id.ts).

`createCodeRefId` composes the designator, normalized file, and symbol name. Line inclusion defaults to true; disabling it removes only the final `:<line>` suffix [ref](src/utils/coderef-id.ts).

## Source of Truth

This file and its local `TYPE_DESIGNATORS` table are authoritative for CodeRef element-ID syntax. It owns no mutable state and reads no runtime configuration. `ElementData` owns the accepted type/name/file/line fields, and `path-normalize.ts` owns slash normalization [ref](src/utils/coderef-id.ts).

Canonical semantic tests pin anchored and no-line function IDs plus Windows-to-project-relative path normalization [ref](__tests__/semantic-canonical.test.ts). Direct exhaustive tests for every type designator and delimiter-bearing names: **NONE found**.

## Public API / Contracts

- `CodeRefIdOptions` contains the optional `includeLine` switch [ref](src/utils/coderef-id.ts#CodeRefIdOptions).
- `normalizeProjectPath` `(projectPath, value)` returns a project-relative, forward-slash path when the input is absolute and otherwise normalizes the supplied relative spelling [ref](src/utils/coderef-id.ts#normalizeProjectPath).
- `codeRefDesignatorForType` `(type)` returns the compact designator for an `ElementData` type, falling back to `AST` at runtime [ref](src/utils/coderef-id.ts#codeRefDesignatorForType).
- `createCodeRefId` `(element, projectPath, options = {})` returns the canonical anchored ID by default or its no-line form when requested [ref](src/utils/coderef-id.ts#createCodeRefId).

## Dependencies

- Node `path` performs absolute detection and project-relative conversion [ref](src/utils/coderef-id.ts).
- `types/types.ts` supplies the `ElementData` taxonomy and identity fields [ref](src/utils/coderef-id.ts).
- `utils/path-normalize.ts` converts platform separators to forward slashes [ref](src/utils/coderef-id.ts).
- External packages: **NONE**.

## Risks & Edge Cases

- No-line IDs intentionally collapse same-type, same-name declarations in the same file even when their source lines differ. Anchored IDs distinguish them; consumers must choose the identity grain deliberately [ref](src/utils/coderef-id.ts).
- Several taxonomy values share a designator (`interface`/`type`, `constant`/`property`, `decorator`/`unknown`). The ID does not preserve the original type beyond that mapping [ref](src/utils/coderef-id.ts).
- File paths and symbol names are interpolated without escaping `#` or `:`. **[inference]** Runtime inputs containing those delimiters can produce IDs that are difficult to parse unambiguously [ref](src/utils/coderef-id.ts).
- Relative values are not resolved against `projectPath`; they are only slash-normalized. Equivalent paths containing internal `..` segments can therefore retain different identity spellings [ref](src/utils/coderef-id.ts).
- Runtime values outside the TypeScript element-type union fall back to `AST`, masking the unsupported type rather than failing [ref](src/utils/coderef-id.ts).

## Validation Checklist

- [x] Verified all four indexed exports and declaration anchors.
- [x] Confirmed anchored and no-line output grammar.
- [x] Confirmed absolute versus relative path behavior.
- [x] Reviewed canonical semantic identity tests.
- [x] Named shared-designator and delimiter limitations.


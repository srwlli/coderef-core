---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: import_resolver
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/pipeline/import-resolver.ts
related_files:
  - src/pipeline/import-resolver.ts
status: draft
---

## Executive Summary

`import-resolver.ts` implements Phase 3's two-pass import binding. It builds per-module export tables, resolves AST and semantic-header imports against project files and dependency evidence, and emits explicit per-binding dispositions for resolved, unresolved, external, dynamic, type-only, stale, and reserved ambiguous cases [ref](src/pipeline/import-resolver.ts).

## Audience and Intent

Pipeline maintainers should use this sheet when changing import arity, resolution precedence, export-table semantics, external/builtin classification, or reason codes. Graph and validation consumers should use it to understand which fields are populated for each disposition and which kinds are intentionally non-traversable downstream.

## Architecture / Behavior

The main entry point runs export-table construction before either import-resolution pass. It then collects dependency names, the optional workspace registry, TypeScript path aliases, and a double-indexed project-file set before resolving AST facts followed by header facts. After both passes, workspace linkage enriches matching bare-package records [ref](src/pipeline/import-resolver.ts).

Export tables are nested maps keyed by module file and exported name. Named/default facts bind to a local extracted element when one exists; re-export and namespace facts retain an upstream module and defer origin lookup. Transitive lookup carries a visited set to terminate cycles and supports both named and wildcard forwarding [ref](src/pipeline/import-resolver.ts).

Module resolution applies this precedence:

1. The first matching `tsconfig.json` path mapping, with project-relative and optional project-root-absolute probes.
2. Relative or absolute project paths, preferring exact files, then explicit NodeNext emitted-extension mappings, then extensionless source files, then directory indexes.
3. Bare specifiers, which the caller classifies from Node/Python builtins, manifest dependencies, and top-level `node_modules` membership [ref](src/pipeline/import-resolver.ts).

AST facts expand named, default, namespace, and side-effect bindings. Dynamic facts receive an immediate non-traversable record. Type-only bindings resolve the module but retain the `typeOnly` disposition. Namespace and side-effect imports can resolve at module grain without a symbol target; named/default imports require an export-table entry [ref](src/pipeline/import-resolver.ts).

Header facts share module resolution but treat a missing exported symbol as `stale`, distinguishing semantic-header drift from an unresolved source import. Workspace linkage stamps package/root provenance on mapped external or unresolved bare imports and upgrades mapped unresolved imports to external `workspace_package`; builtins remain untouched. The resolver returns records and does not assign them back to `PipelineState` [ref](src/pipeline/import-resolver.ts).

## Source of Truth

This file is authoritative for Phase 3 disposition names, reason strings, export-table shape, resolution precedence, workspace enrichment, the Python standard-library allowlist, and NodeNext/source probing rules. `PipelineState` owns raw facts and project-file membership; callers own assignment to `state.importResolutions`. No resolver cache survives a call [ref](src/pipeline/import-resolver.ts).

Runtime inputs are `tsconfig.json`, `package.json`, `.coderef/workspace.json`, the top-level `node_modules` directory, and the `PipelineState` file/fact collections. Missing or malformed configuration degrades to empty alias/dependency/workspace maps rather than throwing [ref](src/pipeline/import-resolver.ts).

Focused tests cover determinism/purity, emitted-extension membership, unresolved bare packages, transitive and wildcard re-exports, namespace/default imports, builtins, aliases, and workspace absent/present/malformed/builtin/graph linkage [ref](__tests__/pipeline/import-resolution-determinism.test.ts) [ref](__tests__/pipeline/import-resolver-membership.test.ts) [ref](__tests__/pipeline/workspace-linkage.contract.test.ts). A direct renamed re-export (`export { x as y } from ...`) case: **NONE found**.

## Public API / Contracts

- `ImportResolutionKind` enumerates `resolved`, `unresolved`, `external`, `ambiguous`, `dynamic`, `typeOnly`, and `stale` [ref](src/pipeline/import-resolver.ts#ImportResolutionKind).
- `ImportResolution` defines the source/importer/binding/specifier disposition plus optional module, target, candidates, reason, and workspace evidence [ref](src/pipeline/import-resolver.ts#ImportResolution).
- `ExportTableEntry` defines an exported name, origin CodeRef ID, export kind, and optional upstream module [ref](src/pipeline/import-resolver.ts).
- `ExportTable` is the nested module-file/export-name map [ref](src/pipeline/import-resolver.ts).
- `resolveImports` `(state)` builds export tables, resolves AST/header imports, applies workspace linkage, and returns the combined records [ref](src/pipeline/import-resolver.ts).
- `applyWorkspaceLinkage` enriches registry-mapped bare imports and upgrades mapped unresolved packages to external workspace dispositions [ref](src/pipeline/import-resolver.ts).
- `buildExportTables` `(state)` projects `state.rawExports` into the nested table without mutating state [ref](src/pipeline/import-resolver.ts).
- `resolveAstImports` `(state, exportTables)` resolves raw source imports using freshly loaded environment/config evidence [ref](src/pipeline/import-resolver.ts).
- `resolveHeaderImports` `(state, exportTables)` resolves header facts and uses `stale` when the module exists but the named export does not [ref](src/pipeline/import-resolver.ts).
- `classifyBareSpecifier` `(specifier, externalSet)` returns `external` when the extracted package name is present and `unresolved` otherwise [ref](src/pipeline/import-resolver.ts).
- `resolveTransitiveReExport` `(exportTables, startModule, exportedName, visited = new Set())` follows named/namespace/wildcard tables and returns the upstream entry or `undefined` [ref](src/pipeline/import-resolver.ts).
- `resolveModuleSpecifier` `(specifier, importerFile, projectFiles, pathsMap, projectPath?)` returns the matched project-file key or `undefined` [ref](src/pipeline/import-resolver.ts).

The resolver normally returns structured non-resolved records instead of throwing. Synchronous configuration and directory reads are caught and converted to empty lookup sets.

## Dependencies

- Node `fs` reads `tsconfig.json`, `package.json`, and `node_modules` directory membership [ref](src/pipeline/import-resolver.ts).
- Node `module.isBuiltin` identifies Node built-in specifiers, including `node:` forms [ref](src/pipeline/import-resolver.ts).
- Node `path` normalizes import paths, extensions, aliases, and package names [ref](src/pipeline/import-resolver.ts).
- `pipeline/types.ts` supplies pipeline state and raw import/export/header facts [ref](src/pipeline/import-resolver.ts).
- `types/types.ts` supplies extracted element identities used to populate export origins [ref](src/pipeline/import-resolver.ts).
- `utils/coderef-id.ts` creates missing line-sensitive element IDs [ref](src/pipeline/import-resolver.ts).
- `pipeline/workspace-registry.ts` loads the optional package-to-sibling-root registry used for enrichment [ref](src/pipeline/import-resolver.ts).
- External packages: **NONE**.

## Risks & Edge Cases

- `resolveImports` reads `tsconfig.json` once inside `buildExportTables` and again before pass 2. This contradicts the file's one-read commentary and makes the main path perform two synchronous parses per call [ref](src/pipeline/import-resolver.ts).
- The exported `resolveAstImports` and `resolveHeaderImports` helpers each perform their own synchronous manifest, `node_modules`, and tsconfig reads. Their behavior is not pure over only the two explicit arguments [ref](src/pipeline/import-resolver.ts).
- A renamed re-export entry stores its downstream `exportedName` and upstream module but not the upstream `localName`. **[inference]** `export { x as y } from './m'` is looked up upstream as `y`, so it fails unless `m` independently exports `y` [ref](src/pipeline/import-resolver.ts) [ref](src/pipeline/extractors/relationship-extractor.ts).
- Re-export cycles collapse to `undefined` from transitive lookup. The AST caller then emits `symbol_not_in_module_exports`; the documented `reexport_cycle` reason is not distinguishable on that path, and the existing test deliberately accepts either reason [ref](src/pipeline/import-resolver.ts) [ref](__tests__/pipeline/import-resolution-reexports.test.ts).
- Extensionless probing covers only `.ts`, `.tsx`, `.js`, and `.jsx`. `.mts`, `.cts`, `.mjs`, and `.cjs` are recognized only through explicit emitted-extension mappings or exact file names, not extensionless imports [ref](src/pipeline/import-resolver.ts).
- Path-pattern matching returns the first matching alias in map iteration order rather than selecting the most specific TypeScript pattern [ref](src/pipeline/import-resolver.ts).
- The curated Python standard-library set is intentionally non-exhaustive. Newer/platform-specific standard modules remain unresolved unless other external evidence exists [ref](src/pipeline/import-resolver.ts).
- `ambiguous` and its candidates field are reserved in the public contract but are not emitted by the current default Phase 3 path [ref](src/pipeline/import-resolver.ts).
- Workspace enrichment mutates the resolution records created earlier in the same call; the exported helper likewise mutates its input array in place [ref](src/pipeline/import-resolver.ts).

## Validation Checklist

- [x] Verified all twelve indexed exports and declaration anchors.
- [x] Traced pass ordering, binding expansion, and disposition fields.
- [x] Confirmed tsconfig, relative, emitted-extension, and bare-specifier precedence.
- [x] Reviewed purity, membership, re-export, namespace/default, builtin, and workspace-linkage tests.
- [x] Named absent renamed-re-export coverage and the duplicate tsconfig read.

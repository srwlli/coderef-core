---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: graph_builder
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/pipeline/graph-builder.ts
related_files:
  - src/pipeline/graph-builder.ts
status: draft
---

## Executive Summary

`graph-builder.ts` is the canonical Phase 5 assembler that projects a populated `PipelineState` into the exported CodeRef graph. It creates element and pseudo-nodes, promotes resolution and surface facts into canonical-plus-legacy edge records, and returns graph statistics with the result [ref](src/pipeline/graph-builder.ts).

## Audience and Intent

Pipeline maintainers should use this sheet when changing graph identity, topology, or evidence. Query and map consumers should use it to determine which node and edge shapes they can rely on, especially for non-resolved relationships, endpoint traversal, documentation authority, confidence tiers, and transition-era legacy fields.

## Architecture / Behavior

`constructGraph` fail-closes if import or call resolution has not run, then calls `buildNodes`, derives the node-id set, calls `buildEdges`, and calculates counts and density [ref](src/pipeline/graph-builder.ts). The returned `exportedAt` is assigned with `Date.now()` [ref](src/pipeline/graph-builder.ts).

Node construction has four layers:

- Each `state.elements` entry becomes an element node. Existing IDs win; otherwise `createCodeRefId` supplies line-sensitive and line-insensitive identities. Four optional semantic facets—`layer`, `capability`, `constraints`, and `headerStatus`—are copied into metadata [ref](src/pipeline/graph-builder.ts).
- File-grain nodes use `@File/<project-relative-path>`. Their source set includes element files plus files seen in import, call, route, frontend-call, and in-universe document facts. Because producers can use native and POSIX spellings, deduplication is by normalized node ID rather than raw path [ref](src/pipeline/graph-builder.ts) [ref](src/pipeline/graph-builder.ts).
- Route facts are folded into sorted endpoint records. A multi-method declaration yields one node per method; an undeclared method produces one `METHOD_UNSPECIFIED` identity; declarations with the same canonical path and method merge their frameworks and handler files [ref](src/pipeline/graph-builder.ts). Endpoint nodes intentionally have no source `file` or `line` [ref](src/pipeline/graph-builder.ts).
- Documentation facts become sorted, file-less `@Doc` nodes whose status, target claims, and placeholder count remain metadata [ref](src/pipeline/graph-builder.ts).

Edge construction is a sequence of fact-specific passes [ref](src/pipeline/graph-builder.ts):

- Import resolutions fall back to a file-grain source for module-level imports. Header facts are distinguished from AST imports through tuple matching plus first-claim ordering. A nominally resolved import without a target element is demoted to `external`; every non-resolved form omits `targetId` [ref](src/pipeline/graph-builder.ts) [ref](src/pipeline/graph-builder.ts).
- Exported elements receive resolved `export` edges from their file node [ref](src/pipeline/graph-builder.ts). Call resolutions likewise use element or file-grain sources; provisional resolutions retain their single candidate and reason as audit provenance [ref](src/pipeline/graph-builder.ts).
- Heritage facts resolve same-file types first and then accept a bare-name target only when unique. Unknown supertypes are retained as `external` edges; unknown subtypes are skipped because there is no source anchor [ref](src/pipeline/graph-builder.ts).
- API flow is directed `caller file -> endpoint -> handler file`. Every frontend call emits an edge: matching local calls resolve, absolute off-origin calls are external, interpolated origins remain unresolved, and missing-path versus wrong-method failures receive distinct reasons [ref](src/pipeline/graph-builder.ts) [ref](src/pipeline/graph-builder.ts).
- A document points to each claimed file with a `documents` edge. Targets present in the scan node set resolve; out-of-universe claims remain explicit unresolved edges instead of creating phantom file nodes [ref](src/pipeline/graph-builder.ts).

All emitted records pass through one private constructor. That chokepoint adds `evidence.testOrigin` for test-file locations, derives the confidence tier, and fills both the canonical fields and the legacy `source`/`target`/`type` aliases [ref](src/pipeline/graph-builder.ts). Edge IDs are the first 16 hexadecimal characters of a SHA-1 digest over source, relationship, target-or-specifier, file, and line [ref](src/pipeline/graph-builder.ts). A final first-occurrence-wins pass removes duplicate IDs [ref](src/pipeline/graph-builder.ts).

## Source of Truth

This file is the repository's declared single authoritative path from `PipelineState` to `ExportedGraph` [ref](src/pipeline/graph-builder.ts). Input state is owned by the pipeline phases and passed in; this module does not retain graph state between calls. Identity rules are delegated to `coderef-id.ts` and `endpoint-identity.ts`, confidence classification to `edge-confidence.ts`, and document target expansion to `doc-ingest.ts` [ref](src/pipeline/graph-builder.ts).

The relationship/status schemas, graph version, pass order, and fallback reasons are hardcoded here. Runtime configuration: **NONE** in this module; variability arrives through `PipelineState` and imported identity helpers. Representative backing tests pin purity and stable IDs after normalizing the timestamp [ref](__tests__/pipeline/graph-construction-determinism.test.ts:73), endpoint topology and invariants [ref](__tests__/pipeline/graph-construction-api-endpoints.test.ts:299), document edges [ref](__tests__/pipeline/doc-ingest.test.ts:249), and test-origin tagging [ref](__tests__/pipeline/graph-test-origin-tagging.test.ts:47).

## Public API / Contracts

- `EdgeRelationship` enumerates `import`, `call`, `export`, `header-import`, `extends`, `implements`, `calls_endpoint`, `serves_endpoint`, and `documents` [ref](src/pipeline/graph-builder.ts#EdgeRelationship).
- `EdgeResolutionStatus` enumerates the accepted disposition strings from `resolved` through `stale` [ref](src/pipeline/graph-builder.ts).
- `EdgeEvidence` is the evidence union used by import, call, endpoint, and document edges, with optional `testOrigin` and provisional `confidence` tags [ref](src/pipeline/graph-builder.ts).
- `GraphEdgeV2` defines canonical IDs, relationship/status, optional target/evidence/location/candidates/reason, and legacy compatibility fields [ref](src/pipeline/graph-builder.ts).
- `constructGraph` `(state)` returns an `ExportedGraph`; it throws when `state.importResolutions` or `state.callResolutions` is nullish [ref](src/pipeline/graph-builder.ts).
- `buildNodes` `(state)` returns the exported graph's node array and does not assign it back to state [ref](src/pipeline/graph-builder.ts).
- `EndpointRecord` is the aggregated endpoint-node input shape [ref](src/pipeline/graph-builder.ts).
- `collectEndpoints` `(state)` returns a deterministically ordered `Map<string, EndpointRecord>` folded from `state.routes` [ref](src/pipeline/graph-builder.ts).
- `fileGrainNodeId` `(file, projectPath)` returns a normalized `@File/...` identity, relativizing absolute paths first [ref](src/pipeline/graph-builder.ts).
- `buildEdges` `(state, nodeIdSet)` returns the graph edge array. The node set is used to decide whether document targets are in the scan universe [ref](src/pipeline/graph-builder.ts) [ref](src/pipeline/graph-builder.ts).
- `isTestOriginFile` `(file)` normalizes backslashes and tests the path for `__tests__`, `.test.`, or `.spec.` [ref](src/pipeline/graph-builder.ts).
- `computeEdgeId` `(args)` returns the deterministic 16-character digest described above [ref](src/pipeline/graph-builder.ts).
- `isHeaderDerived` `(resolution, state)` reports whether a matching header-import fact exists for the resolution tuple [ref](src/pipeline/graph-builder.ts).

## Dependencies

- Node `crypto` computes edge IDs; Node `path` is loaded inside `fileGrainNodeId` for absolute/relative path handling [ref](src/pipeline/graph-builder.ts) [ref](src/pipeline/graph-builder.ts).
- `pipeline/types.ts`, `types/types.ts`, and `graph-exporter.ts` supply the state, fact, element, and output contracts [ref](src/pipeline/graph-builder.ts).
- `coderef-id.ts` creates missing element identities; the global entity registry supplies optional UUIDs [ref](src/pipeline/graph-builder.ts) [ref](src/pipeline/graph-builder.ts).
- `path-normalize.ts` normalizes producer path spellings [ref](src/pipeline/graph-builder.ts).
- `edge-confidence.ts` classifies every emitted edge at the common record-builder seam [ref](src/pipeline/graph-builder.ts).
- `doc-ingest.ts` expands scalar/list documentation targets [ref](src/pipeline/graph-builder.ts).
- `endpoint-identity.ts` owns endpoint path canonicalization, client-origin classification, node identity, and the unspecified-method sentinel [ref](src/pipeline/graph-builder.ts).

## Risks & Edge Cases

- The graph body and IDs are deterministic, but `exportedAt: Date.now()` makes the complete return value time-dependent. The determinism test explicitly replaces that field before equality checks [ref](src/pipeline/graph-builder.ts) [ref](__tests__/pipeline/graph-construction-determinism.test.ts:77).
- Header-versus-AST classification depends on Phase 3 emission order: the first matching tuple is labeled AST and later matches header-derived. Reordered or repeated inputs can change the relationship label before ID deduplication [ref](src/pipeline/graph-builder.ts).
- Import edges use line `0` because `ImportResolution` lacks a source line; distinct same-file facts therefore rely on the remaining ID tuple fields for uniqueness [ref](src/pipeline/graph-builder.ts).
- Heritage evidence is cast through `unknown` because `resolved-heritage` is not a declared `EdgeEvidence` variant. Type checking therefore does not enforce that runtime evidence shape [ref](src/pipeline/graph-builder.ts).
- First-occurrence-wins edge deduplication intentionally drops later records with the same semantic ID, including any differing later evidence [ref](src/pipeline/graph-builder.ts).
- The 16-hex-character truncation makes IDs compact but reduces SHA-1 to a 64-bit identifier; the code treats that collision resistance as sufficient only within a project [ref](src/pipeline/graph-builder.ts).

## Validation Checklist

- [x] Verified all actual exports, including the three type re-exports.
- [x] Traced node creation for elements, files, endpoints, and documents.
- [x] Traced every edge-emission pass and the common record-builder chokepoint.
- [x] Confirmed nullish Phase 3/4 preconditions and the timestamp behavior.
- [x] Confirmed source and target identity rules against current line anchors.
- [x] Reviewed representative determinism, endpoint, document, and test-origin tests.
- [x] Recorded runtime configuration as NONE and identified delegated authorities.

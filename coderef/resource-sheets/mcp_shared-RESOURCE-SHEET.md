---
agent: LLOYD
date: 2026-08-01
task: STUB-CC9094
last_verified: 2026-08-01
last_verified_by: WO-TREAT-MARKDOWN-FILES-LIKE-CODE-SECTION-LEVEL-AST-001
subject: mcp_shared
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/cli/mcp/shared.ts
related_files:
  - src/cli/mcp/shared.ts
status: approved
---

# mcp_shared Resource Sheet

## Executive Summary

This module serves as the shared substrate for various CodeRef tool families. It provides essential functionalities such as artifact caching, stale detection, and element resolution, ensuring that tools operate efficiently and accurately on code repositories. The module includes methods like `loadGraph` and `attachStaleness`, which are critical for maintaining up-to-date and relevant data while handling potential build failures gracefully.

[inference] The above characterizes `src/cli/mcp/shared.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Audience and Intent

This documentation sheet is intended for developers working on tools within the `coderef-mcp-server` tool families. The audience includes engineers responsible for maintaining, extending, or debugging these tools. Specifically, this document aims to help them understand the shared substrate code in `src/cli/mcp/shared.ts`, which provides essential utilities and interfaces needed across various tools in the family.

The primary intent is to guide developers in making informed decisions when using or modifying this module. By providing detailed information on exported APIs, dependencies, and usage patterns, the sheet aims to facilitate a deeper understanding of how these tools interoperate, ensuring consistency and maintainability as new features are added or existing ones evolve.

[inference] The above characterizes `src/cli/mcp/shared.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Architecture / Behavior

The `src/cli/mcp/shared.ts` module provides the shared functionality and utilities for the CodeRef MCP server tool families. It exports a variety of types, constants, and functions to handle graph data, artifact caching, and staleness checking.

### Architecture / Behavior

The primary control flow in `shared.ts` revolves around ensuring that the necessary artifacts (graph and index files) are present and up-to-date. This is achieved through the `ensureArtifacts` function, which checks if these files exist and are fresh. If they are absent or stale, it attempts to build them using a pre-built binary (`populate.js`). If building is not possible due to file count limits or missing binaries, a `BuildHintError` is thrown.

The module also includes functions for loading graph data, index data, and validation reports, each of which may trigger artifact builds if necessary. For example, the `loadGraph` function calls `ensureArtifacts` before attempting to load the graph from disk. If artifacts are not present or stale, it spawns a new build process.

The `attachStaleness` function is responsible for adding staleness information to the response payload. It checks if any source files have changed since the last build and adds a compact `staleness` block to the payload. This helps clients determine whether they need to refresh their data or not.

Key data structures include the `ArtifactCache`, which holds both graph and index data, as well as metadata about their last modification times. The cache also includes a mapping of edges for quick lookup and a flag indicating whether an auto-build has already been attempted in this server's lifetime.

In summary, the architecture ensures that the MCP server always has up-to-date artifacts by providing mechanisms to build them if necessary and attaching freshness information to responses, thereby improving the reliability and efficiency of code reference queries.

[inference] The above characterizes `src/cli/mcp/shared.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

### Node resolution precedence (`resolveNodes`)

`resolveNodes` [ref](src/cli/mcp/shared.ts#resolveNodes) maps a free-form query to graph nodes in a fixed precedence: exact `id`, exact `codeRefIdNoLine`, exact `name`, exact file path (returns ALL elements of the file, `byFile: true`), then a case-insensitive substring sweep over id/name/file.

**Doc SECTION nodes are excluded from both name-keyed branches** — the exact-`name` match and the substring fallback. A section node (`@Doc/<path>#<slug>`, identified by `metadata.docSection === true`) carries its markdown heading as `node.name`, and resource sheets — including this one — routinely head a section with the exact name of the symbol they document. Without the exclusion, `resolveNodes('resolveNodes')` returns this sheet's prose alongside the function, and every name-keyed MCP tool (`what_calls`, `impact_of`, `find_element`, `symbol_context`) silently answers about documentation when asked about code. That shipped as a defect and was fixed; sections remain addressable by their exact id, which the first branch handles.

This rule is duplicated by design in `CanonicalGraphQuery.resolve` (`src/query/canonical-graph.ts`). **The two resolvers must stay in lockstep** — a rule taught to one is invisible on the other surface.

[verified 2026-08-01 — WO-TREAT-MARKDOWN-FILES-LIKE-CODE-SECTION-LEVEL-AST-001, commit daf4899. Not model-inferred: read from the source.]

## Source of Truth

The source file `src/cli/mcp/shared.ts` is the single source of truth for this behavior. There are no tests, configs, or fixtures that act as a separate source of authority.

- **Hardcoded Values**: The values `DEFAULT_LIMIT`, `MAX_LIMIT`, and `AUTO_BUILD_FILE_CEILING` are hardcoded in the file [ref](src/cli/mcp/shared.ts). These define the default limits for operations and the upper limit on the number of source files to trigger an auto-build.
- **Ownership**: This module is owned by the `cli` domain, specifically the `mcp-shared-substrate` capability. Changes should be made with this ownership in mind, ensuring that the code remains consistent across different tool families.

The file does not rely on external tests, configurations, or fixtures to determine its behavior, making it solely authoritative based on the code itself.

[inference] The above characterizes `src/cli/mcp/shared.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Public API / Contracts

<!-- PROJECTED from .coderef/index.json — do not hand-edit; regenerate via project-spine.mjs -->
- `ExportedNode` (type) [ref](src/cli/mcp/shared.ts#ExportedNode)
- `ExportedEdge` (type) [ref](src/cli/mcp/shared.ts#ExportedEdge)
- `DEFAULT_LIMIT` (constant) [ref](src/cli/mcp/shared.ts#DEFAULT_LIMIT)
- `MAX_LIMIT` (constant) [ref](src/cli/mcp/shared.ts#MAX_LIMIT)
- `IndexElement` (interface) [ref](src/cli/mcp/shared.ts#IndexElement)
- `IndexData` (interface) [ref](src/cli/mcp/shared.ts#IndexData)
- `ArtifactCache` (interface) [ref](src/cli/mcp/shared.ts#ArtifactCache)
- `emptyCache` (function) [ref](src/cli/mcp/shared.ts#emptyCache)
- `attachStaleness` (function) [ref](src/cli/mcp/shared.ts#attachStaleness)
- `BuildHintError` (class) [ref](src/cli/mcp/shared.ts#BuildHintError)
- `loadGraph` (function) [ref](src/cli/mcp/shared.ts#loadGraph)
- `loadIndex` (function) [ref](src/cli/mcp/shared.ts#loadIndex)
- `loadValidationReport` (function) [ref](src/cli/mcp/shared.ts#loadValidationReport)
- `loadCanonical` (function) [ref](src/cli/mcp/shared.ts#loadCanonical)
- `Resolution` (interface) [ref](src/cli/mcp/shared.ts#Resolution)
- `resolveNodes` (function) [ref](src/cli/mcp/shared.ts#resolveNodes)
- `nodeSummary` (function) [ref](src/cli/mcp/shared.ts#nodeSummary)
- `clampLimit` (function) [ref](src/cli/mcp/shared.ts#clampLimit)
- `ambiguous` (function) [ref](src/cli/mcp/shared.ts#ambiguous)
- `notFound` (function) [ref](src/cli/mcp/shared.ts#notFound)
- `ToolHandlers` (interface) [ref](src/cli/mcp/shared.ts#ToolHandlers)
- `isTestFile` (function) [ref](src/cli/mcp/shared.ts#isTestFile)
- `isDemoFile` (function) [ref](src/cli/mcp/shared.ts#isDemoFile)
- `edgeConfidenceOf` (function) [ref](src/cli/mcp/shared.ts#edgeConfidenceOf)
- `computeChangedElements` (function) [ref](src/cli/mcp/shared.ts#computeChangedElements)
- `HandlerContext` (interface) [ref](src/cli/mcp/shared.ts#HandlerContext)

## Dependencies

<!-- PROJECTED from .coderef/index.json imports[] -->
- `child_process` [ref](src/cli/mcp/shared.ts)
- `fs` [ref](src/cli/mcp/shared.ts)
- `path` [ref](src/cli/mcp/shared.ts)
- `../../export/graph-exporter.js` [ref](src/cli/mcp/shared.ts)
- `../../pipeline/output-validator.js` [ref](src/cli/mcp/shared.ts)
- `../../query/canonical-graph.js` [ref](src/cli/mcp/shared.ts)
- `../../pipeline/edge-confidence.js` [ref](src/cli/mcp/shared.ts)
- `../../query/staleness-check.js` [ref](src/cli/mcp/shared.ts)
- `../../query/changed-elements.js` [ref](src/cli/mcp/shared.ts)
- `../../utils/path-normalize.js` [ref](src/cli/mcp/shared.ts)
- `../mcp-response-format.js` [ref](src/cli/mcp/shared.ts)

_Semantic header (projected): layer `cli` · capability `mcp-shared-substrate` · version `1.0.0`_

## Risks & Edge Cases

- **RISK-04**: Auto-build must be BOUNDED. Above the file-ceiling check (ref src/cli/mcp/shared.ts:185), the server returns a "run populate first" hint instead of spawning a potentially long in-process build, which could block the tool call or risk hanging.
- **RISK-06**: The staleness computation may fail if `graph.json` is absent or unreadable (ref src/cli/mcp/shared.ts:251). This would result in returning `null` without any error handling, leading to potential confusion in downstream tools that rely on the staleness information.
- **RISK-07**: If the populate CLI (`populate.js`) cannot be found at any of the specified paths (ref src/cli/mcp/shared.ts:216), the function returns `null`. This could lead to a failure in loading graph or index data, as no alternative method is provided to recover from this situation.
- **RISK-08**: The `scanSources` function may throw an error if it encounters unreadable files (ref src/cli/mcp/shared.ts:127). Although the code attempts to catch and ignore such errors, any exceptions could propagate up and cause unexpected behavior in calling functions that rely on this data.
- **RISK-10**: `resolveNodes` [ref](src/cli/mcp/shared.ts#resolveNodes) is one of TWO name resolvers over the same graph (the other is `CanonicalGraphQuery.resolve`). Any change to what a name may resolve to must be applied to both, or the MCP surface and the query surface disagree. The doc-section exclusion is the live example: taught to one resolver only, name-keyed answers about code silently include documentation prose on whichever surface was missed. [verified]
- **RISK-09**: The `attachStaleness` function may throw an error if it encounters issues while trying to compute or attach staleness information (ref src/cli/mcp/shared.ts:267). However, since the function is wrapped in a try-catch block, any errors are silently ignored, potentially leading to incomplete or incorrect tool responses.

[inference] The above characterizes `src/cli/mcp/shared.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Validation Checklist

1. **Verify Exported Types**:
   - Confirm that `ExportedNode` and `ExportedEdge` are correctly exported as types representing elements from a graph [ref](src/cli/mcp/shared.ts:34,35).
   - Verify that `IndexElement` and `IndexData` correctly represent structured data used for indexing.

2. **Check Default and Maximum Limits**:
   - Ensure `DEFAULT_LIMIT` is set to 25 as per the source code [ref](src/cli/mcp/shared.ts).
   - Confirm `MAX_LIMIT` is set to 100, which bounds the number of elements that can be processed [ref](src/cli/mcp/shared.ts).

3. **Validate Artifact Cache Structure**:
   - Verify that `ArtifactCache` includes properties like `graph`, `index`, and methods for managing the cache [ref](src/cli/mcp/shared.ts).
   - Ensure `emptyCache` function initializes an empty `ArtifactCache` object correctly [ref](src/cli/mcp/shared.ts).

4. **Check Validation Functions**:
   - Verify that `computeChangedElements` accurately parses changes from a diff to determine changed elements [ref](src/cli/mcp/shared.ts).
   - Ensure `nodeSummary` provides a summary of nodes based on certain criteria, such as whether they are exported or have specific header statuses [ref](src/cli/mcp/shared.ts).

5. **Validate Build Hint Error Handling**:
   - Confirm that `BuildHintError` is used to handle scenarios where auto-builds cannot be performed, providing actionable hints to the agent [ref](src/cli/mcp/shared.ts#BuildHintError).
   - Ensure that `ensureArtifacts` checks for missing or stale artifacts and either builds them or throws a `BuildHintError` if appropriate [ref](src/cli/mcp/shared.ts) — `ensureArtifacts` is module-private, so it carries no indexed line anchor by design.

6. **Verify File Path Normalization**:
   - Confirm that `normalizeSlashes` correctly normalizes file paths across different operating systems [ref](src/cli/mcp/shared.ts).
   - Verify that `isTestFile` and `isDemoFile` functions accurately identify test and demo files based on their extensions or naming conventions [ref](src/cli/mcp/shared.ts:598,615).

7. **Check Edge Confidence Calculation**:
   - Confirm that `edgeConfidenceOf` correctly classifies the confidence tier of an edge based on its attributes [ref](src/cli/mcp/shared.ts#edgeConfidenceOf).
   - Verify that `classifyEdgeConfidence` accurately assigns a tier to an edge based on predefined criteria [ref](src/cli/mcp/shared.ts).

8. **Verify Doc-Section Resolution Exclusion**:
   - Confirm `resolveNodes` returns ONLY the code element for a name shared with a doc section heading — never the `@Doc/...#<slug>` node [ref](src/cli/mcp/shared.ts#resolveNodes).
   - Confirm the section is still returned for an exact-id query.
   - Confirm `CanonicalGraphQuery.resolve` agrees on both counts. Regression coverage: `__tests__/pipeline/doc-ingest.test.ts` ("doc sections never shadow a code symbol by name").

9. **Validate Tool Handlers Contract**:
   - Confirm that the `ToolHandlers` interface enforces a contract for all tool handlers, ensuring they include necessary methods and properties [ref](src/cli/mcp/shared.ts#ToolHandlers).
   - Verify that handler implementations adhere to this contract, providing the expected functionality and data structures.

[inference] The above characterizes `src/cli/mcp/shared.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.


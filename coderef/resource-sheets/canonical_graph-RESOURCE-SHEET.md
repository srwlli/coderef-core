---
agent: LLOYD
date: 2026-08-01
task: STUB-CC9094
subject: canonical_graph
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/query/canonical-graph.ts
related_files:
  - src/query/canonical-graph.ts
status: approved
---

# canonical_graph Resource Sheet

## Executive Summary

The `canonical-graph.ts` module serves as a query engine for traversing and analyzing a code graph based on data emitted by a canonical pipeline. Its primary function is to resolve free-form queries into nodes within this graph, supporting various types of relationships such as calls and imports, and provide detailed information about these relationships. The module ensures that only edges with a resolution status of 'resolved' are traversed, adhering to the semantics of directionally correct paths.

[inference] The above characterizes `src/query/canonical-graph.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Audience and Intent

The `canonical-graph.ts` module is primarily used by developers to query and analyze code relationships within a project. The audience for this module includes individuals responsible for maintaining, understanding, and optimizing codebase structure and dependencies. They are making decisions related to refactoring, troubleshooting, and enhancing the developer experience. The module provides a robust framework for answering relationship questions with direction-correct semantics by querying a precomputed graph representation of the codebase.

[inference] The above characterizes `src/query/canonical-graph.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Architecture / Behavior

The `CanonicalGraphQuery` class is at the heart of this module, providing methods to resolve queries and retrieve related nodes in a canonical graph. It initializes by constructing an internal representation of the graph using the provided `ExportedGraph`. The graph is indexed by node ID, edge direction, file paths, and relationships.

### Query Resolution
The `resolve` method handles converting free-form queries (code references, element names, or file paths) into graph nodes. It follows a specific precedence order: exact ID match, exact code reference without line, exact name match, exact file path match, and case-insensitive substring match. If no matches are found, it returns all nodes that include the query string in their ID, name, or file path.

### Node Expansion
The `idSetOf` method computes a set of node IDs covered by a resolution, including both the resolved nodes and any `@File/` nodes for files they belong to. The `expand` method returns a list of node IDs that should be considered when traversing the graph from a given node ID.

### Edge Relationships
The `collectNeighbors` method retrieves all edges connected to a set of node IDs, filtered by direction (inbound or outbound) and relationship type (e.g., call, import). This is used to find callers, callees, importers, and imports based on the resolution.

### Reference Sites
The `referenceSitesOf` method provides detailed information about where a given node is referenced within the graph. It returns an array of objects describing each reference site, including the file path, line number, relationship type, and confidence tier. The method can be filtered by minimum confidence to return only certain types of references.

### Edge Confidence
The `edgeConfidence` method determines the confidence tier for a given edge, which is crucial for understanding the reliability of the relationships in the graph. This method ensures that even pre-Phase-3 graphs (without explicit confidence tiers) are handled correctly.

### Usage Example
To use this class, you would first load the canonical graph using the `loadCanonicalGraph` function, which reads from a `.coderef/graph.json` file. Then, create an instance of `CanonicalGraphQuery` with the loaded graph. Using this instance, you can call methods like `resolve`, `callersOf`, `calleesOf`, `importersOf`, and `importsOf` to query the graph for specific relationships.

### Tradeoffs
The design choices in this module aim to balance between performance and accuracy. By precomputing indices and filtering edges based on confidence tiers, it ensures that queries are both efficient and reliable. However, this comes at the cost of increased complexity during initialization and more detailed indexing structures.

This architecture allows for a robust and scalable way to query relationships within codebases, leveraging the canonical graph format for consistent and directionally correct semantics.

[inference] The above characterizes `src/query/canonical-graph.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Source of Truth

This section answers "what is AUTHORITATIVE?" for the behavior described in `src/query/canonical-graph.ts`.

**Source File(s):**
- The primary source of truth for this behavior resides solely within `src/query/canonical-graph.ts`. No external dependencies or configuration files are authoritative.

**Tests, Configs, and Fixtures:**
- There are no tests, configs, or fixtures associated with this module. The code is considered the authoritative source of behavior without any supporting verification mechanisms.

**Hardcoded vs. Config-driven Values:**
- **ALL_PATHS_MAX:** This constant is hardcoded at line [573](src/query/canonical-graph.ts) and defines a maximum path length.
- **Default Behavior:** Other values such as `CALL` and `IMPORT` types are not explicitly hard-coded but rather rely on configuration or external inputs (e.g., the graph data itself).

**Ownership:**
- The domain/module that owns changes here is the `service/canonical-graph-query` layer. Any modifications to the behavior should be made directly within this module unless specified otherwise by the project's ownership policies.

A reader must trust and edit the code in `src/query/canonical-graph.ts` for any authoritative changes or updates related to the canonical graph query engine.

[inference] The above characterizes `src/query/canonical-graph.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Public API / Contracts

<!-- PROJECTED from .coderef/index.json — do not hand-edit; regenerate via project-spine.mjs -->
- `CanonicalGraphError` (class) [ref](src/query/canonical-graph.ts#CanonicalGraphError)
- `CanonicalNode` (interface) [ref](src/query/canonical-graph.ts#CanonicalNode)
- `NodeResolution` (interface) [ref](src/query/canonical-graph.ts#NodeResolution)
- `PathResult` (interface) [ref](src/query/canonical-graph.ts#PathResult)
- `CanonicalGraphQuery` (class) [ref](src/query/canonical-graph.ts#CanonicalGraphQuery)
- `ALL_PATHS_MAX` (constant) [ref](src/query/canonical-graph.ts)
- `loadCanonicalGraph` (function) [ref](src/query/canonical-graph.ts)

## Dependencies

<!-- PROJECTED from .coderef/index.json imports[] -->
- `fs` [ref](src/query/canonical-graph.ts)
- `path` [ref](src/query/canonical-graph.ts)
- `../export/graph-exporter.js` [ref](src/query/canonical-graph.ts)
- `../utils/path-normalize.js` [ref](src/query/canonical-graph.ts)
- `../pipeline/edge-confidence.js` [ref](src/query/canonical-graph.ts)

_Semantic header (projected): layer `service` · capability `canonical-graph-query` · version `1.0.0`_

## Risks & Edge Cases

1. **File Path Normalization Issues**: The function `normalizeSlashes` is used to normalize file paths [ref](src/query/canonical-graph.ts). However, if `normalizeSlashes` fails or behaves unexpectedly due to an edge case, it could lead to incorrect node resolution and path expansion.

2. **Edge Confidence Classification Failures**: The function `classifyEdgeConfidence` is used to classify edge confidence tiers based on the edge's resolution status, reason, and evidence confidence [ref](src/query/canonical-graph.ts). If there are issues with how this function classifies edges or if it encounters unexpected input, it could lead to incorrect edge confidence data being returned.

3. **Resolution of Non-Resolved Edges**: The `collectNeighbors` method only considers resolved edges [ref](src/query/canonical-graph.ts). If the graph contains non-resolved edges that are not properly filtered out, it could lead to confusion and incorrect results when querying edge relationships.

4. **Case Insensitive Matching Limitations**: The case-insensitive substring matching in the `resolve` method [ref](src/query/canonical-graph.ts) might not handle all potential edge cases for different locales or character sets, leading to false negatives or positives.

5. **File Path Suffix Match Ambiguity**: The suffix match logic in the `resolve` method [ref](src/query/canonical-graph.ts) can lead to ambiguous matches if multiple files have similar names or paths, potentially returning incorrect node resolutions.

6. **Edge Relationship Filtering Issues**: The filtering of inbound and outbound edges based on relationship types (e.g., 'call', 'import') in methods like `callersOf`, `calleesOf`, `importersOf`, and `importsOf` [ref](src/query/canonical-graph.ts) could fail if the graph contains unexpected or malformed edge relationships.

7. **Path Length Limitations**: The method `referenceSitesOf` has a loop that constructs a list of reference sites [ref](src/query/canonical-graph.ts). If the resolution set is extremely large, this could lead to memory issues or performance degradation.

8. **Edge Confidence Filter Inconsistencies**: The optional `minConfidence` filter in `referenceSitesOf` [ref](src/query/canonical-graph.ts) might behave inconsistently if not properly handled. For example, it should differentiate between exact and heuristic matches correctly, but a bug or misconfiguration could lead to incorrect filtering.

9. **File Node Existence Assumption**: The method `fileIdFor` assumes that each file node exists in the graph [ref](src/query/canonical-graph.ts). If there are cases where file nodes are missing or incorrectly named, this could lead to incorrect file path resolution and expansion.

10. **Performance Degradation with Large Graphs**: The `idSetOf` method constructs a set of node IDs for a given resolution [ref](src/query/canonical-graph.ts). If the graph is extremely large, creating and manipulating this set could lead to performance issues or excessive memory usage.

These edge cases highlight potential pitfalls and areas for improvement in the `CanonicalGraphQuery` class, ensuring that it handles various scenarios correctly and efficiently.

[inference] The above characterizes `src/query/canonical-graph.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Validation Checklist

- **1. Verify `CanonicalGraphQuery` constructor**: Instantiate `CanonicalGraphQuery` with a sample `ExportedGraph`. Check if it populates `nodeById`, `outbound`, `inbound`, `fileToElements`, and `fileNodeId` correctly.
  - [ref](src/query/canonical-graph.ts)
- **2. Ensure `resolve` method works for exact node IDs**: Pass a known node ID to `resolve`. Verify the returned `NodeResolution` contains only that node.
  - [ref](src/query/canonical-graph.ts)
- **3. Check `referenceSitesOf` with and without `minConfidence`**: Call `referenceSitesOf` with and without specifying a `minConfidence`. Ensure the results match expected confidence levels.
  - [ref](src/query/canonical-graph.ts)
- **4. Verify `callersOf` method**: Call `callersOf` on a known resolution. Confirm it returns nodes that call the target.
  - [ref](src/query/canonical-graph.ts)
- **5. Check `calleesOf` method**: Call `calleesOf` on a known resolution. Ensure it returns nodes that are called by the target.
  - [ref](src/query/canonical-graph.ts)
- **6. Verify `importersOf` method**: Call `importersOf` on a known resolution. Confirm it returns nodes importing the target.
  - [ref](src/query/canonical-graph.ts)
- **7. Check `importsOf` method**: Call `importsOf` on a known resolution. Ensure it returns elements imported by the target or its file.
  - [ref](src/query/canonical-graph.ts)
- **8. Test error handling in `resolve`**: Pass an invalid query to `resolve`. Verify it throws a `CanonicalGraphError`.
  - [ref](src/query/canonical-graph.ts)

[inference] The above characterizes `src/query/canonical-graph.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.


---
agent: LLOYD
date: 2026-08-01
task: STUB-CC9094
subject: project_map_data
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/map/project-map-data.ts
related_files:
  - src/map/project-map-data.ts
status: approved
---

# project_map_data Resource Sheet

## Executive Summary

The module `src/map/project-map-data.ts` is a core service that projects the canonical `.coderef/graph.json` and `.coderef/index.json` files into a simplified, FILE-level dependency map. This projection serves as the foundation for visualizing and analyzing project dependencies using tools like `coderef map <path>` and the MCP `map` tool. The primary function of this module is to compute a comprehensive and optimized file-level graph that captures essential dependencies, hotspots, and various other metrics, all while adhering to strict design constraints to ensure performance and purity.

[inference] The above characterizes `src/map/project-map-data.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Audience and Intent

This module serves as the core engine for projecting source code graph data into a format that is both human-readable and consumable by tools like the bundled map viewer and the MCP `map` tool. It transforms complex, element-level dependency graphs into a simplified file-level representation, which focuses on file nodes, resolved edges, and computed overlays such as hotspots and cycles.

The primary audience for this module includes developers and engineering teams who need to visualize and analyze dependencies within their codebase. By providing a structured output format, this module enables tools to highlight critical insights about project architecture, identify potential issues like unused code or tight coupling, and support better decision-making during development and maintenance phases.

[inference] The above characterizes `src/map/project-map-data.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Architecture / Behavior

The `projectMapData` function orchestrates the generation of a file-level dependency map by projecting data from `.coderef/graph.json` and `.coderef/index.json`. This process involves several key steps, each handled by specialized modules:

1. **Reading JSON Data**: The function starts by reading the required JSON files using the `readJson` helper function [ref](src/map/project-map-data.ts).

2. **File Cycles Detection**: It then detects file dependency cycles using a Tarjan's algorithm implementation in the `fileCycles` function [ref](src/map/project-map-data.ts). This step ensures that any circular dependencies are identified and handled appropriately.

3. **Graph Analytics**: The module computes various graph analytics such as communities, centrality, bridges, coupling, and dead-code candidates. These computations are performed by the `computeGraphAnalytics` function [ref](src/map/project-map-data.ts).

4. **Edge Evidence**: For each edge in the graph, evidence is computed to understand its provenance. This is handled by the `computeEdgeEvidence` function [ref](src/map/project-map-data.ts), which aggregates edge data and adds detailed evidence.

5. **Layer Drift**: The module calculates declared-vs-detected layer drift using the `computeLayerDrift` function [ref](src/map/project-map-data.ts). This helps in understanding how well the code adheres to predefined layers.

6. **Engineering Metrics**: Engineering metrics, such as test linkage and documentation coverage, are computed by the `computeEngineeringMetrics` function [ref](src/map/project-map-data.ts).

7. **Git Behavioral Analytics (Optional)**: If the `git` option is enabled and Git history data is provided, the module computes git-specific analytics using the `computeGitBehavioral` function [ref](src/map/project-map-data.ts). This includes churn analysis and coupling drift.

8. **Ownership Analysis**: Ownership metrics are computed if the `gitHistory` includes author information, using the `computeOwnership` function [ref](src/map/project-map-data.ts).

9. **API Surface Mapping (Optional)**: If the project has API surface data available in `.coderef/routes.json`, the module computes the HTTP API surface using the `computeApiSurface` function [ref](src/map/project-map-data.ts).

The final output, encapsulated in a `MapData` object, is structured to include metadata about the project, nodes representing files and their dependencies, edges representing relationships between these nodes, and various overlays such as hotspots and cycles. Each component of the `MapData` object is conditionally included based on the options passed to `projectMapData`.

This modular approach allows for flexibility in enabling or disabling specific features, making it suitable for both small and large codebases with varying requirements.

[inference] The above characterizes `src/map/project-map-data.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Source of Truth

### Primary Source File(s)
The source file `src/map/project-map-data.ts` is the single source of truth for this behavior. All exported APIs and functions are defined within this file.

### Tests, Configs, or Fixtures
- **Tests**: No specific tests are mentioned in the code index.
- **Configs/Fixtures**: Configuration-driven values such as default caps for hotspots, cycles, and elements (e.g., `HOTSPOT_CAP_DEFAULT`, `CYCLE_CAP_DEFAULT`, `ELEMENT_CAP_DEFAULT`) are hardcoded within the file. There is no explicit mention of external config files or fixtures.

### Hardcoded vs. Config-Driven Values
- **Hardcoded**: The default values for caps (hotspots, cycles, elements) and other constants like error messages and max evidence samples per edge are hardcoded in the source code.
- **Config-Driven**: Project-wide options such as `elementCap`, `hotspotCap`, `cycleCap`, and flags for enabling analytics, drift, metrics, and git-behavioral data are driven by the `ProjectMapDataOptions` interface. These values can be passed at runtime.

### Ownership
The code is owned by the "service" domain or module, specifically in the capability area of "map-data-projection". Changes to this module should be made with a clear understanding of its role in projecting and enriching map data for visualization tools like `coderef map <path>` and the MCP `map` tool.

### Trust and Edit Rules
- **Trust**: The source code must be trusted as it directly defines the behavior of the system, including the structure and content of the exported APIs.
- **Edit**: Changes should be made to this file if any part of the map data projection needs to be modified. This includes adding new features, fixing bugs, or updating dependencies.

In summary, `src/map/project-map-data.ts` is the authoritative source for defining and implementing the behavior of the map data projection, with no external tests, configs, or fixtures providing additional authority.

[inference] The above characterizes `src/map/project-map-data.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Public API / Contracts

<!-- PROJECTED from .coderef/index.json — do not hand-edit; regenerate via project-spine.mjs -->
- `MapElement` (interface) [ref](src/map/project-map-data.ts#MapElement)
- `MapNode` (interface) [ref](src/map/project-map-data.ts#MapNode)
- `MapEdge` (interface) [ref](src/map/project-map-data.ts#MapEdge)
- `MapHotspot` (interface) [ref](src/map/project-map-data.ts#MapHotspot)
- `MapOverlays` (interface) [ref](src/map/project-map-data.ts#MapOverlays)
- `MapDocCoverage` (interface) [ref](src/map/project-map-data.ts#MapDocCoverage)
- `MapMeta` (interface) [ref](src/map/project-map-data.ts#MapMeta)
- `MapData` (interface) [ref](src/map/project-map-data.ts#MapData)
- `MapProjectionError` (class) [ref](src/map/project-map-data.ts#MapProjectionError)
- `ProjectMapDataOptions` (interface) [ref](src/map/project-map-data.ts#ProjectMapDataOptions)
- `projectMapData` (function) [ref](src/map/project-map-data.ts#projectMapData)

## Dependencies

<!-- PROJECTED from .coderef/index.json imports[] -->
- `fs` [ref](src/map/project-map-data.ts)
- `path` [ref](src/map/project-map-data.ts)
- `../utils/path-normalize.js` [ref](src/map/project-map-data.ts)
- `./graph-analytics.js` [ref](src/map/project-map-data.ts)
- `./edge-evidence.js` [ref](src/map/project-map-data.ts)
- `./layer-drift.js` [ref](src/map/project-map-data.ts)
- `./engineering-metrics.js` [ref](src/map/project-map-data.ts)
- `./git-behavioral.js` [ref](src/map/project-map-data.ts)
- `./ownership.js` [ref](src/map/project-map-data.ts)
- `./git-history.js` [ref](src/map/project-map-data.ts)
- `./api-surface.js` [ref](src/map/project-map-data.ts)

_Semantic header (projected): layer `service` · capability `map-data-projection` · version `1.0.0`_

## Risks & Edge Cases

1. **File System Errors [ref](src/map/project-map-data.ts)**:
   - The module reads JSON files from the file system using `fs.readFileSync`. Any issues with file access, such as permission errors or non-existent files, will result in an exception being thrown.

2. **Invalid JSON Format [ref](src/map/project-map-data.ts)**:
   - If any of the JSON files (`graph.json`, `index.json`) are malformed, `JSON.parse` will fail, leading to a `SyntaxError`.

3. **Empty or Partially Empty Files [ref](src/map/project-map-data.ts)**:
   - An empty or partially empty file can still cause issues when parsed by `JSON.parse`. This would result in an empty object being returned, which could lead to incorrect data projection.

4. **Out of Memory with Large Repositories [ref](src/map/project-map-data.ts:102-106)**:
   - The function `fileCycles` uses a Tarjan SCC algorithm for detecting cycles. For very large repositories, this algorithm can consume significant memory, potentially leading to an out-of-memory error.

5. **Incorrect Configuration Options [ref](src/map/project-map-data.ts:187-213)**:
   - Providing invalid or conflicting configuration options (e.g., `elementCap` set to a negative value) could lead to unexpected behavior or errors in the data projection process.

6. **Unresolved Dependencies [ref](src/map/project-map-data.ts)**:
   - If an edge's `weight` is zero, it indicates that the dependency is unresolved. While this might be expected, it should be clearly documented as a potential issue for users who expect all dependencies to be fully resolved.

7. **Git History Extraction Errors [ref](src/map/project-map-data.ts:164-168)**:
   - If the `git` option is enabled and the `gitHistory` parameter is null or undefined, the module will not compute the `git` block, but it will also not raise an error. This might lead to users interpreting incomplete data as fully accurate.

8. **API Surface Data [ref](src/map/project-map-data.ts:140-147)**:
   - If the `.coderef/routes.json` file is missing or malformed, the `api` block will not be computed. This could result in a `MapData` object without API surface information, which might confuse users expecting complete data.

[inference] The above characterizes `src/map/project-map-data.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Validation Checklist

- **Input Preparation**: Ensure the repository contains a valid `.coderef/graph.json` and `.coderef/index.json` file.
  - [ref](src/map/project-map-data.ts)

- **Validation of `projectMapData` Functionality**:
  - Test with a small repository to confirm that it generates a non-empty `MapData` object.
    - [ref](src/map/project-map-data.ts)
  - Verify that the `nodes`, `edges`, and `overlays` fields are populated correctly.
    - [ref](src/map/project-map-data.ts)

- **Check for Error Handling**:
  - Confirm that the function throws a `MapProjectionError` when an invalid file path is provided.
    - [ref](src/map/project-map-data.ts#MapProjectionError)

- **Configuration Options**:
  - Test with various configurations of the `ProjectMapDataOptions` interface, including options for enabling/disabling analytics, drift detection, metrics, and git-behavioral data.
    - [ref](src/map/project-map-data.ts#ProjectMapDataOptions)
  - Ensure that when `gitHistory` is provided, it is correctly processed to include in the output map data.
    - [ref](src/map/project-map-data.ts#ProjectMapDataOptions)

- **Output Validation**:
  - Verify that the generated `MapData` includes all expected fields (`meta`, `nodes`, `edges`, `overlays`, `analytics`, `drift`, `metrics`, and `git`).
    - [ref](src/map/project-map-data.ts#MapData)
  - Ensure that each field is populated according to the specified options and constraints.
    - [ref](src/map/project-map-data.ts#MapData)

- **Hotspot Overlay**:
  - Confirm that the `hotspots` overlay includes the top files by `hotspotScore`, up to the specified cap (`hotspotCap`).
    - [ref](src/map/project-map-data.ts)
  - Verify that hotspots are calculated based on the file graph projection.
    - [ref](src/map/project-map-data.ts)

- **Cycle Overlay**:
  - Confirm that the `cycles` overlay includes file-level dependency cycles (SCCs of size > 1), up to the specified cap (`cycleCap`).
    - [ref](src/map/project-map-data.ts)
  - Verify that cycles are detected using Tarjan's algorithm.
    - [ref](src/map/project-map-data.ts)

- **Analytics**:
  - Confirm that analytics data is included when `options.analytics` is true.
    - [ref](src/map/project-map-data.ts)
  - Verify that the `analytics` block is computed from the projected file graph.
    - [ref](src/map/project-map-data.ts)

- **Drift Detection**:
  - Confirm that drift data is included when `options.layerDrift` is true.
    - [ref](src/map/project-map-data.ts)
  - Verify that the `drift` block is computed from the projected nodes/edges and analytics.assignments.
    - [ref](src/map/project-map-data.ts)

- **Engineering Metrics**:
  - Confirm that engineering metrics are included when `options.metrics` is true.
    - [ref](src/map/project-map-data.ts)
  - Verify that the `metrics` block is computed independently of analytics.
    - [ref](src/map/project-map-data.ts)

- **Git-Behavioral Analytics**:
  - Confirm that git-behavioral data is included when both `options.git` and `gitHistory` are provided.
    - [ref](src/map/project-map-data.ts)
  - Verify that the `git` block includes churn-hotspot and coupling-drift entries up to the specified cap (`gitRankingCap`).
    - [ref](src/map/project-map-data.ts)

- **API Surface**:
  - Confirm that API surface data is included when both `.coderef/routes.json` is present and `options.api` is true.
    - [ref](src/map/project-map-data.ts)
  - Verify that the `api` block includes endpoints, their handlers, clients, network hops, and unmatched-call entries up to the specified cap (`apiUnmatchedCap`).
    - [ref](src/map/project-map-data.ts)

[inference] The above characterizes `src/map/project-map-data.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.



---
agent: LLOYD
date: 2026-07-20
subject: orchestrator
parent_project: lloyd
category: service
version: 1.0.0
documents: src/pipeline/orchestrator.ts
related_files:
  - src/pipeline/orchestrator.ts
status: approved
---

# orchestrator Resource Sheet

## Executive Summary

The `src/pipeline/orchestrator.ts` module is a single-pass codebase analysis pipeline designed to extract elements, relationships, and dependency graphs from source files in various programming languages. The primary function of this module is to process files in a sequential manner, leveraging Tree-sitter for parsing and extracting data such as functions, classes, components, hooks, etc., along with their dependencies. It supports both single-pass analysis and incremental processing, making it efficient and scalable for large codebases. The pipeline orchestrator manages file discovery, grammar loading, element extraction, relationship extraction, dependency graph construction, import resolution, and call resolution phases, ensuring comprehensive data extraction from the codebase.

[inference] The above characterizes `src/pipeline/orchestrator.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Audience and Intent

This document is designed for developers who are **working within the Context of a CodeRef tool**, specifically those who are involved in **developing, maintaining, or integrating with the pipeline orchestrator module**. The primary audience includes:

1. **Developers working on CodeRef**: Those responsible for implementing new features, enhancing existing functionality, or addressing bugs related to the pipeline orchestrator.
2. **Project maintainers and contributors**: Individuals who are part of the team that oversees the development and deployment of the tool.
3. **CodeRef users and integrators**: Users who integrate CodeRef into their own systems or projects, requiring a detailed understanding of how the module works under the hood.

**Why They Would Open This Sheet**

Developers and maintainers will open this sheet to:

1. **Understand the Purpose of the Pipeline Orchestrator Module**: The module's primary function is described as orchestrating a single-pass codebase analysis pipeline, capable of parsing files, extracting elements (functions, classes), relationships (imports, calls), and building dependency graphs.
2. **Explore the Features of the Pipeline Orchestrator**:
   - **File Discovery**: Identifies all source files based on language filters.
   - **Single-Pass Parsing**: Processes each file once using tree-sitter for parsing.
   - **Element Extraction**: Extracts various types of elements such as functions, classes, and components.
   - **Relationship Extraction**: Identifies imports and call graphs.
   - **Graph Building**: Constructs a dependency graph to represent the relationships between code entities.
3. **Understand Performance Considerations**:
   - **Parallelization**: The pipeline can be processed concurrently to improve performance.
   - **Grammar Caching**: Utilizes the GrammarRegistry to reuse loaded parsers, optimizing parsing efficiency.
   - **Memory Efficiency**: Handles files in batches and processes deleted files from previous runs if incremental mode is enabled.
4. **Learn the Architecture of the Pipeline Orchestrator**:
   - The module's public interface (`PipelineOrchestrator`) is clearly documented, making it easy to understand how to integrate it into other systems.
5. **Review Dependencies**: Familiarize themselves with all necessary dependencies such as `fs/promises`, `path`, and various utility modules.

The sheet provides a comprehensive overview of the pipeline orchestrator module's capabilities, architecture, and usage, enabling developers to make informed decisions about integrating or maintaining this component within their CodeRef tool.

[inference] The above characterizes `src/pipeline/orchestrator.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Architecture / Behavior

#### Singleton Design Pattern
The `PipelineOrchestrator` class is designed as a singleton, which means it can only have one instance throughout the application. This ensures that there is consistency in how the pipeline operates across different parts of the codebase.

#### File Discovery and Language Filtering
- The orchestrator starts by discovering all files in the project directory that match specified language filters (e.g., JavaScript, TypeScript).
- It uses a `files` map to organize file paths per language, facilitating parallel processing and batch loading of grammars for each language.

#### Incremental Processing
If incremental processing is enabled through the `options.incremental` flag:
- The orchestrator loads cached fact sets for unchanged files.
- It checks which files need re-scanning by comparing file paths with the cache.
- Files that need scanning are processed, while those that are already cached are skipped.

#### Grammar Preloading
Before parsing any files, the orchestrator preloads grammars for the detected languages using a `GrammarRegistry` instance. This ensures efficient grammar loading and reduces startup time.

#### Single-Pass Parsing
The orchestrator processes each file once with Tree-sitter, which allows for efficient language-specific parsing without re-parsing previously parsed files.
- During this step, it extracts elements (functions, classes, components) and their relationships using `ElementExtractor` and `RelationshipExtractor`.

#### Element Extraction and Relationship Extraction
- The `ElementExtractor` identifies various elements within the source code, including functions, classes, components, hooks, etc., while maintaining references between them.
- The `RelationshipExtractor` captures import and call graphs by analyzing the structure of the parsed ASTs.

#### Dependency Graph Construction
The extracted relationships are used to build a dependency graph using the `constructGraph` function. This graph represents the interdependencies between elements in the codebase, where nodes represent elements and edges represent relationships (imports and calls).

#### Import Resolution
- After building the dependency graph, the orchestrator proceeds to resolve imports.
- The `resolveImports` function takes raw import facts, exported facts, and header import facts as inputs and produces `ImportResolution` objects. These resolutions are used to build a resolved import graph with code reference IDs (coderef-id) as endpoints.

#### Call Resolution
Similarly, the orchestrator resolves calls by matching them against the project-wide symbol table and existing import resolutions.
- The `resolveCalls` function uses elements, raw call facts, and import resolutions to produce `CallResolution` objects. These resolutions are used to build a resolved call graph with code reference IDs as endpoints.

#### Incremental Cache Management
For incremental processing, the orchestrator maintains an `IncrementalCache` instance to store and manage cached fact sets across different runs.
- It checks which files have been modified or added since the last run and processes only those that need re-scanning.

#### Fact Accumulation
Throughout the pipeline, all extracted data (elements, imports, calls) is accumulated in various arrays (`allElements`, `allImports`, etc.) for further processing and integration into a comprehensive state object.
- Fact sets are also written to the cache to facilitate incremental processing of future runs.

#### Logging and Debugging
The orchestrator uses a logger to provide verbose output during the pipeline execution, which helps in tracking the progress and identifying any issues or errors that arise during file processing or graph construction.

In summary, the `PipelineOrchestrator` class manages the entire codebase analysis pipeline by orchestrating the discovery of files, parsing, relationship extraction, dependency graph construction, and resolution of imports and calls. It leverages caching for incremental processing to optimize performance and maintain consistency across different runs.

[inference] The above characterizes `src/pipeline/orchestrator.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Source of Truth

#### 1. Source File(s)
- **src/pipeline/orchestrator.ts**: This file contains the implementation of the `PipelineOrchestrator` class, which orchestrates the entire codebase analysis pipeline.

#### 2. Tests, Configs, or Fixtures
- There are no tests, configs, or fixtures directly related to this file in the provided source code. The tests (`__tests__/pipeline/`) focus on individual components and functionalities like element extraction, relationship extraction, and graph building, but do not cover the orchestrator itself.

#### 3. Hardcoded vs. Config-Driven Values
- **Defaults**: The class sets default languages using `getDefaultLanguages()`. These defaults are defined in the class.
- **Incremental Mode**: Whether incremental mode is enabled is determined by the `incremental` option passed to the `run` method. If not provided, it defaults to `false`.
- **Thresholds and Paths**: There are no hardcoded thresholds or paths mentioned in this file.

#### 4. Ownership
- The orchestrator's implementation is owned by the `pipeline` module. It handles the orchestration of the entire analysis pipeline, including file discovery, parsing, element extraction, relationship extraction, graph building, and import resolution.

[inference] The above characterizes `src/pipeline/orchestrator.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Public API / Contracts

<!-- PROJECTED from .coderef/index.json — do not hand-edit; regenerate via project-spine.mjs -->
- `PipelineOrchestrator` (class) [ref](src/pipeline/orchestrator.ts)

## Dependencies

<!-- PROJECTED from .coderef/index.json imports[] -->
- `fs/promises` [ref](src/pipeline/orchestrator.ts)
- `path` [ref](src/pipeline/orchestrator.ts)
- `../utils/logger.js` [ref](src/pipeline/orchestrator.ts)
- `./grammar-registry.js` [ref](src/pipeline/orchestrator.ts)
- `./extractors/element-extractor.js` [ref](src/pipeline/orchestrator.ts)
- `./extractors/relationship-extractor.js` [ref](src/pipeline/orchestrator.ts)
- `./extractors/route-extractor.js` [ref](src/pipeline/orchestrator.ts)
- `./ignore-rules.js` [ref](src/pipeline/orchestrator.ts)
- `../registry/entity-registry.js` [ref](src/pipeline/orchestrator.ts)
- `../cache/incremental-cache.js` [ref](src/pipeline/orchestrator.ts)
- `./types.js` [ref](src/pipeline/orchestrator.ts)
- `./import-resolver.js` [ref](src/pipeline/orchestrator.ts)
- `./call-resolver.js` [ref](src/pipeline/orchestrator.ts)
- `./graph-builder.js` [ref](src/pipeline/orchestrator.ts)
- `./doc-ingest.js` [ref](src/pipeline/orchestrator.ts)
- `./scip-overlay.js` [ref](src/pipeline/orchestrator.ts)
- `./symbol-table-cache.js` [ref](src/pipeline/orchestrator.ts)
- `./element-taxonomy.js` [ref](src/pipeline/orchestrator.ts)
- `../types/types.js` [ref](src/pipeline/orchestrator.ts)
- `../export/graph-exporter.js` [ref](src/pipeline/orchestrator.ts)
- `../utils/coderef-id.js` [ref](src/pipeline/orchestrator.ts)

_Semantic header (projected): layer `service` · capability `pipeline-orchestrator` · version `1.0.0`_

## Risks & Edge Cases

1. **Incremental Cache Corruption:** If the incremental cache is corrupted or missing, the pipeline orchestrator gracefully falls back to a full run (`run()` instead of `runIncremental()`), ensuring it does not resolve against a partial universe.
2. **Missing SCIP Index:** If the `--scip` option is provided but the SCIP index cannot be mapped, it won't crash but will skip flipping edges.
3. **Parse Errors During Extraction:** Individual file processing failures (e.g., malformed syntax causing extractors to throw) are caught and logged, allowing the rest of the codebase to be processed without halting the pipeline.
4. **Stale Fact Set Persistence:** A failure to write the full fact set after a non-incremental run is caught and logged as a warning; it does not fail the build, though it limits future incremental efficiency.

## Validation Checklist

- **Graph construction logic:** Ensure that phase 5 (`constructGraph`) correctly builds canonical graph edges from the resolved state elements and replaces the legacy graph endpoints.
- **Incremental state updates:** Confirm that `runIncremental()` only rescans the `changedFiles`, merges them with the `factBundles`, and correctly cascades resolutions without performing file IO for unchanged files.
- **Cache persistence:** Verify that `writeFactSet()` correctly serializes the `factBundles` map to disk.
- **SCIP Overlay integration:** Ensure `applyScipOverlay` only flips `unresolved` and `ambiguous` edges and never touches an already-resolved edge, keeping graph integrity intact.

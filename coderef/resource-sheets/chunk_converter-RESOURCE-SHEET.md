---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: chunk_converter
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/integration/rag/chunk-converter.ts
related_files:
  - src/integration/rag/chunk-converter.ts
status: draft
---

## Executive Summary

`chunk-converter.ts` converts dependency-graph nodes into embedding-ready `CodeChunk` records, enriching them with nearby source, documentation, graph relationships, quality data, and semantic facets [ref](src/integration/rag/chunk-converter.ts).

## Audience and Intent

RAG indexing maintainers use this bridge after graph construction and before embedding-text generation. It batches reads by file so multiple elements share one source-file read and reports failures per affected node.

## Architecture / Behavior

`convertGraph` normalizes defaults, groups nodes by relative file, conditionally reads each file once, converts every node, and returns chunks plus non-fatal conversion errors. Each chunk derives its name from the node ID, language from the extension, source/doc context from the declaration line, calls/imports from directional indexes, and optional facets from node metadata [ref](src/integration/rag/chunk-converter.ts).

Related elements are same-file nodes capped at ten. `calculateStatistics` aggregates type/language counts, documentation and coverage presence, and average dependency/dependent counts [ref](src/integration/rag/chunk-converter.ts).

## Source of Truth

This module is authoritative for graph-node-to-chunk conversion, file batching, extraction windows, supported extension mapping, semantic-facet pass-through, and chunk statistics. `code-chunk.ts` owns the resulting data contracts, while the input graph owns node and edge truth [ref](src/integration/rag/chunk-converter.ts).

Runtime configuration is the constructor base path plus `ChunkOptions`; persistent state/configuration: **NONE**. `chunk-converter.test.ts` covers conversion, relationships, languages, grouping, empty input, truncation, and statistics; the indexing-pipeline integration test covers its composition [ref](src/integration/rag/__tests__/chunk-converter.test.ts) [ref](src/integration/rag/__tests__/integration/indexing-pipeline.test.ts).

## Public API / Contracts

- `ChunkConverter` converts whole graphs and calculates statistics for produced chunks [ref](src/integration/rag/chunk-converter.ts#ChunkConverter).

## Dependencies

- Node filesystem promises and path utilities read and resolve source files [ref](src/integration/rag/chunk-converter.ts).
- `code-chunk.ts` supplies options, results, errors, statistics, and chunk types [ref](src/integration/rag/chunk-converter.ts).
- Branded path helpers enforce absolute base paths and relative graph-file paths [ref](src/integration/rag/chunk-converter.ts).

## Risks & Edge Cases

- Element names are the text after the first colon in a node ID; identifiers containing additional colons are truncated [ref](src/integration/rag/chunk-converter.ts).
- Source extraction is a fixed five-line window, not an AST declaration span, and then character-truncates [ref](src/integration/rag/chunk-converter.ts).
- JSDoc/Python docstring extraction is heuristic and limited to a twenty-line search window [ref](src/integration/rag/chunk-converter.ts).
- File-read failure skips every node in that file even when a requested option might not need both source and documentation [ref](src/integration/rag/chunk-converter.ts).
- Related-element matching compares the node's stored file value with a branded relative path; inconsistent graph path normalization can suppress matches [ref](src/integration/rag/chunk-converter.ts).

## Validation Checklist

- [x] Verified the single indexed export and declaration anchor.
- [x] Traced file grouping, extraction, enrichment, error, and statistics paths.
- [x] Reviewed unit and indexing-pipeline integration coverage.
- [x] Documented identifier, heuristic extraction, and path-normalization limits.


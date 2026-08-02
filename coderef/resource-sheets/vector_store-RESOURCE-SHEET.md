---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: vector_store
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/integration/vector/vector-store.ts
related_files:
  - src/integration/vector/vector-store.ts
status: draft
---

## Executive Summary

`vector-store.ts` defines the provider-neutral contracts used by CodeRef's dense and hybrid RAG paths: chunk metadata, records, query inputs/results, statistics, typed errors, provider operations, configuration, and factories [ref](src/integration/vector/vector-store.ts).

## Audience and Intent

Vector-backend, indexing, retrieval, and RAG-service maintainers use these shapes to keep local and remote providers interchangeable while preserving CodeRef-specific metadata and optional lexical-corpus support.

## Architecture / Behavior

Metadata carries identity/location, language/export/docs, graph/quality metrics, semantic facets, header provenance, and provider-specific extensions. Query contracts expose top K, partial metadata filters, metadata/vector inclusion, thresholds, and namespaces; results return ranked matches with optional payloads [ref](src/integration/vector/vector-store.ts).

The store interface requires upsert, query, delete, clear, stats, provider naming, and ID fetch. `listAll` is optional so local stores can support sparse/hybrid retrieval while remote providers degrade to dense-only. Typed store errors carry a machine code and optional original error [ref](src/integration/vector/vector-store.ts).

## Source of Truth

This module is authoritative for cross-provider vector-store compile-time contracts and shared CodeRef chunk metadata. Concrete stores own persistence, filtering, similarity, lifecycle, and provider-specific behavior [ref](src/integration/vector/vector-store.ts).

Runtime/persistent configuration and state: **NONE** in this contract-only module. Dedicated contract tests: **NONE**; JSON, Pinecone, Chroma, semantic-search, indexing-orchestrator, facet-filter, and hybrid tests exercise the interfaces through implementations [ref](src/integration/vector/__tests__/json-store.test.ts) [ref](__tests__/integration/rag/facet-filter.test.ts).

## Public API / Contracts

- `CodeChunkMetadata` defines searchable CodeRef identity, quality, graph, semantic, and provenance fields [ref](src/integration/vector/vector-store.ts#CodeChunkMetadata).
- `VectorRecord` pairs a unique ID, embedding values, and chunk metadata [ref](src/integration/vector/vector-store.ts#VectorRecord).
- `QueryOptions` configures limits, filters, payload inclusion, thresholds, and namespace [ref](src/integration/vector/vector-store.ts#QueryOptions).
- `VectorMatch` is one scored result with optional metadata and values [ref](src/integration/vector/vector-store.ts#VectorMatch).
- `VectorQueryResult` carries ordered matches and optional namespace [ref](src/integration/vector/vector-store.ts#VectorQueryResult).
- `VectorStoreStats` standardizes vector count/dimension while permitting provider fields [ref](src/integration/vector/vector-store.ts#VectorStoreStats).
- `VectorStoreError` attaches a machine-readable code and original error [ref](src/integration/vector/vector-store.ts#VectorStoreError).
- `VectorStore` defines required provider operations and optional full-corpus listing [ref](src/integration/vector/vector-store.ts#VectorStore).
- `VectorStoreConfig` defines shared connection, index, dimension, metric, host, port, and timeout values [ref](src/integration/vector/vector-store.ts#VectorStoreConfig).
- `VectorStoreFactory` is the provider-construction function contract [ref](src/integration/vector/vector-store.ts#VectorStoreFactory).

## Dependencies

Runtime dependencies: **NONE**. This file contains types and a lightweight error class only [ref](src/integration/vector/vector-store.ts).

## Risks & Edge Cases

- Open string index signatures on metadata, statistics, and configuration weaken excess-property checking and permit provider drift [ref](src/integration/vector/vector-store.ts).
- `filter` is typed as partial metadata but does not define cross-provider equality, array, or range semantics [ref](src/integration/vector/vector-store.ts).
- Score documentation assumes a normalized 0–1 relevance value, which not every metric/provider necessarily guarantees [ref](src/integration/vector/vector-store.ts).
- Optional `listAll` makes hybrid capability runtime-dependent and requires callers to handle dense-only degradation [ref](src/integration/vector/vector-store.ts).
- Initialization is not part of the interface even though the local implementation requires it before operations; lifecycle therefore depends on concrete-store knowledge [ref](src/integration/vector/vector-store.ts).

## Validation Checklist

- [x] Verified all ten indexed exports and declaration anchors.
- [x] Traced metadata, query/result, error, operation, and factory contracts.
- [x] Reviewed implementation and RAG integration use of the shared types.
- [x] Documented provider-semantic and lifecycle variability.


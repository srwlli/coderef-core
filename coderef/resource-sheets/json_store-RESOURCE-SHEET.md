---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: json_store
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/integration/vector/json-store.ts
related_files:
  - src/integration/vector/json-store.ts
status: draft
---

## Executive Summary

`json-store.ts` implements the provider-agnostic vector-store contract as a local JSON file with in-memory records, brute-force cosine search, namespace and metadata filtering, and temp-file-plus-rename persistence [ref](src/integration/vector/json-store.ts).

## Audience and Intent

RAG indexing/search maintainers use this zero-service backend for local repositories and modest corpora. It is the canonical implementation despite retained `sqlite` naming aliases for compatibility.

## Architecture / Behavior

Construction applies default dimension/metric, resolves a JSON path, and creates empty in-memory storage. Initialization creates parent directories, removes a legacy directory occupying the target path, loads and dimension-checks existing JSON, or writes a fresh store. Mutations update memory and persist through a same-directory temporary file followed by rename [ref](src/integration/vector/json-store.ts).

Queries validate dimensions, filter namespace and exact metadata values, compute cosine similarity across every eligible record, apply a minimum score, sort descending, and slice top K. The class also deletes, clears, fetches, lists the local corpus, reports stats, and exposes existence/path helpers [ref](src/integration/vector/json-store.ts).

## Source of Truth

This module is authoritative for local JSON storage layout, path resolution, initialization/migration behavior, atomic-save protocol, cosine querying, local filters, namespaces, and local-corpus listing. `vector-store.ts` owns the shared provider contract [ref](src/integration/vector/json-store.ts).

Persistent state is the resolved JSON file; runtime configuration is `VectorStoreConfig`. `json-store.test.ts` covers atomic saves, live-file preservation on a failed save, compatibility aliases, and factory naming; facet and hybrid integration tests cover metadata filters and corpus use [ref](src/integration/vector/__tests__/json-store.test.ts) [ref](__tests__/integration/rag/facet-filter.test.ts) [ref](__tests__/integration/rag/hybrid-fusion.test.ts).

## Public API / Contracts

- `JsonVectorStore` implements initialization, CRUD/query, statistics, local listing, provider naming, and path/existence helpers [ref](src/integration/vector/json-store.ts#JsonVectorStore).

## Dependencies

- Node filesystem and path modules own synchronous persistence and path resolution [ref](src/integration/vector/json-store.ts).
- `vector-store.ts` supplies records, queries, statistics, configuration, metadata, and typed errors [ref](src/integration/vector/json-store.ts).

## Risks & Edge Cases

- Search is O(n) and keeps all vectors in memory, so latency and memory grow linearly with corpus size [ref](src/integration/vector/json-store.ts).
- Initialization removes a directory found at the resolved file path as legacy cleanup; callers must ensure the configured target is exact [ref](src/integration/vector/json-store.ts).
- A configured non-`.json` path is treated as a base directory, even when it looks like a file path with another extension [ref](src/integration/vector/json-store.ts).
- Initialization wraps every error, including an invalid-dimension error, as a connection error and therefore loses the original top-level error code [ref](src/integration/vector/json-store.ts).
- Metadata filtering uses strict equality; array/object-valued facets do not support structural matching [ref](src/integration/vector/json-store.ts).
- Upserts mutate memory before saving, so a failed save leaves the running instance ahead of the still-valid disk file [ref](src/integration/vector/json-store.ts).
- The reported provider name remains `sqlite` for compatibility even though storage is JSON [ref](src/integration/vector/json-store.ts).

## Validation Checklist

- [x] Verified the single indexed export and declaration anchor.
- [x] Traced initialization, atomic persistence, query, namespace, and CRUD paths.
- [x] Reviewed atomic-save, alias, facet-filter, and hybrid-corpus coverage.
- [x] Documented destructive migration, path, error-code, and failed-save semantics.


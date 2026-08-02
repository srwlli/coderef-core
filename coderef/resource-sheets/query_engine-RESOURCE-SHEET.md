---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: query_engine
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/indexer/query-engine.ts
related_files:
  - src/indexer/query-engine.ts
status: draft
---

## Executive Summary

`query-engine.ts` provides a cached multi-index query facade over parsed CodeRefs, supporting type/path/element/metadata/relationship lookups, custom and compound filters, pagination, and cache statistics [ref](src/indexer/query-engine.ts).

## Audience and Intent

Indexer-service and query maintainers use this class to unify `IndexStore`, `MetadataIndex`, and `RelationshipIndex` access behind consistent result telemetry and optional TTL/size-bounded caching.

## Architecture / Behavior

Simple queries build deterministic string cache keys and delegate to one underlying index. Path-prefix and metadata-category queries flatten stored groups; relationship queries return unique source references for matching edge types. Custom predicates bypass caching, while compound queries intersect optional direct and metadata filters over all references [ref](src/indexer/query-engine.ts).

Cache entries retain result arrays, creation time, and hit count. Reads expire by TTL; writes evict the oldest creation time at capacity. Pagination slices an arbitrary query result, and controls expose statistics plus cache clear/enable/disable [ref](src/indexer/query-engine.ts).

## Source of Truth

This module is authoritative for the multi-index query facade, result timing/cache flags, compound filter semantics, cache keys/lifecycle/telemetry, and pagination shape. The three underlying indexes own stored reference, metadata, and relationship truth [ref](src/indexer/query-engine.ts).

Runtime configuration is `QueryEngineConfig`; persistent state: **NONE**. The QueryEngine section of `indexer.test.ts` covers every query family, compound/custom filters, pagination, caching/statistics/controls, and a basic performance target [ref](__tests__/indexer.test.ts).

## Public API / Contracts

- `QueryResult` returns references, count, measured time, and cache provenance [ref](src/indexer/query-engine.ts#QueryResult).
- `QueryFilter` is a parsed-reference predicate [ref](src/indexer/query-engine.ts#QueryFilter).
- `QueryEngineConfig` controls cache enablement, maximum entries, and TTL [ref](src/indexer/query-engine.ts#QueryEngineConfig).
- `QueryEngine` exposes indexed/compound queries, pagination, statistics, and cache controls [ref](src/indexer/query-engine.ts#QueryEngine).
- `createQueryEngine` constructs the facade from its three indexes and optional configuration [ref](src/indexer/query-engine.ts).

## Dependencies

- The parser supplies normalized `ParsedCodeRef` records [ref](src/indexer/query-engine.ts).
- Index store supplies type/path/element and full-record access [ref](src/indexer/query-engine.ts).
- Metadata and relationship indexes supply category/value and edge-type access [ref](src/indexer/query-engine.ts).

## Risks & Edge Cases

- Cached arrays are returned by reference, so caller mutation can corrupt later cached results [ref](src/indexer/query-engine.ts).
- Cache entries are not invalidated when underlying indexes mutate; they remain stale until TTL, eviction, or explicit clear [ref](src/indexer/query-engine.ts).
- Compound-query timing starts after all filtering has completed and therefore does not measure the actual query work [ref](src/indexer/query-engine.ts).
- Cache configuration and pagination inputs are not range-validated; zero/negative sizes, TTLs, pages, or page sizes yield surprising behavior [ref](src/indexer/query-engine.ts).
- Metadata-multiple cache keys join raw values with commas, permitting collisions and making equivalent reordered OR queries separate entries [ref](src/indexer/query-engine.ts).
- Clearing the cache does not reset accumulated hit/miss statistics [ref](src/indexer/query-engine.ts).

## Validation Checklist

- [x] Verified all five indexed exports and declaration anchors.
- [x] Traced every query family, compound filtering, pagination, and cache lifecycle.
- [x] Reviewed query, cache, control, pagination, and performance coverage.
- [x] Documented mutation, invalidation, timing, validation, key, and statistics limits.


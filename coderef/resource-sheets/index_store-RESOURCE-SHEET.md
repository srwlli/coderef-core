---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: index_store
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/indexer/index-store.ts
related_files:
  - src/indexer/index-store.ts
status: draft
---

## Executive Summary

`index-store.ts` is an in-memory, synchronized multi-index for parsed CodeRef references. Every accepted record is held in an ordered all-records array, an ID map, and type/path/optional-element maps, enabling direct lookup, prefix scans, counts, export/import, and statistics [ref](src/indexer/index-store.ts).

## Audience and Intent

Indexer, query-engine, and persistence maintainers should use this sheet when changing reference identity, index synchronization, import/export behavior, or query semantics. Consumers receive parsed-reference views for normal queries and should treat raw storage/record accessors as mutable implementation exposure.

## Architecture / Behavior

Adding a reference derives an ID from type, path, element-or-placeholder, and line-or-placeholder. Existing IDs are warned and returned without duplication. New records are appended to `all`, stored in the ID map, inserted into each applicable primary index, and followed by a full statistics refresh [ref](src/indexer/index-store.ts).

Queries by exact type/path/element return new arrays of parsed objects; prefix query scans every path key. `getAllRecords`, `getStorage`, `getStats`, and exported record objects return underlying references. Clear empties maps/arrays and refreshes stats. JSON export returns records and stats; import clears and reconstructs all primary indices from supplied records while preserving supplied IDs/timestamps [ref](src/indexer/index-store.ts).

## Source of Truth

`IndexStore` is authoritative for primary CodeRef index state and reference identity within this legacy indexer subsystem. `ParsedCodeRef` in `parser/parser.ts` owns the indexed payload contract. Secondary metadata and relationship indices are represented as optional storage fields but are populated by other modules [ref](src/indexer/index-store.ts).

Persistent backing store/configuration: **NONE**. State lives in process memory unless a caller serializes `export()` and later calls `import()`. The primary-index portion of `indexer.test.ts` backs deduplication, lookups, prefix behavior, statistics, clear, export/import, and counts [ref](__tests__/indexer.test.ts).

## Public API / Contracts

- `IndexRecord` wraps a parsed reference with its derived ID, timestamp, and primary index keys [ref](src/indexer/index-store.ts#IndexRecord).
- `IndexStorage` defines the three primary maps, optional secondary maps, ordered records, and statistics [ref](src/indexer/index-store.ts#IndexStorage).
- `IndexStats` reports record and distinct-key counts plus its refresh time [ref](src/indexer/index-store.ts#IndexStats).
- `IndexStore` exposes add/batch-add, exact/prefix queries, raw accessors, lifecycle, counts, key lists, and JSON-shaped export/import [ref](src/indexer/index-store.ts#IndexStore).
- `createIndexStore` constructs an empty store [ref](src/indexer/index-store.ts#createIndexStore).
- `indexReferences` constructs a store and batch-indexes the supplied parsed references [ref](src/indexer/index-store.ts#indexReferences).

## Dependencies

- `parser/parser.ts` supplies `ParsedCodeRef` [ref](src/indexer/index-store.ts).
- `utils/logger.ts` receives duplicate-reference warnings [ref](src/indexer/index-store.ts).
- JavaScript `Map`, arrays, and `Date` implement state and statistics. External storage dependencies: **NONE** [ref](src/indexer/index-store.ts).

## Risks & Edge Cases

- Identity collapses all references sharing type/path/element/line, even if their metadata differs. Missing elements and lines use fixed placeholders [ref](src/indexer/index-store.ts).
- `parsed.line || 'no-line'` treats line `0` as missing. If zero-based callers exist, line zero collides with absent-line identity [ref](src/indexer/index-store.ts).
- Raw accessors and exported record arrays are not defensive copies. Caller mutation can desynchronize maps, records, index keys, and statistics [ref](src/indexer/index-store.ts).
- Import trusts record IDs and parsed contents rather than recomputing identity, and does not reject duplicate IDs. Its `all` array can therefore contain multiple records while the ID map points only to the last [ref](src/indexer/index-store.ts).
- `indexed_at` statistics update on every mutation, so otherwise equivalent operations are not byte-deterministic [ref](src/indexer/index-store.ts).

## Validation Checklist

- [x] Verified all six indexed exports and declaration anchors.
- [x] Traced every primary-index mutation and query path.
- [x] Reviewed primary-index, import/export, count, and performance tests.
- [x] Named the absence of persistence/configuration.


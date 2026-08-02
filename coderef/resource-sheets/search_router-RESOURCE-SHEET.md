---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: search_router
parent_project: coderef-core
category: service
version: 1.0.0
documents: src/integration/rag/search-router.ts
related_files:
  - src/integration/rag/search-router.ts
status: draft
---

## Executive Summary

`search-router.ts` is the pure lexical-first RAG routing core. It classifies query shape and searches an already-loaded symbol table with BM25 plus exact-name boosting, requiring no embeddings, vector index, daemon, filesystem access, or semantic headers [ref](src/integration/rag/search-router.ts).

## Audience and Intent

RAG CLI/MCP maintainers use this module to answer identifier-shaped queries deterministically and to preserve a lexical fallback for conceptual queries when the embedding lane is unavailable. Retrieval lane is provenance, not a quality verdict.

## Architecture / Behavior

Classification treats quoted phrases, flags, bare identifiers, dotted members, and other single tokens as symbol-shaped; unquoted multi-word or empty inputs are conceptual phrases. Lexical search converts valid symbol-table elements into sparse records, runs `SparseRetriever`, over-fetches, boosts case-insensitive exact names (or a dotted query's last segment), deterministically tie-breaks by ID, rounds scores, and returns the requested top K [ref](src/integration/rag/search-router.ts).

Elements without CodeRef IDs fall back to their names, allowing header-less repositories. Empty corpora and unmatched queries return an empty lexical result rather than an error [ref](src/integration/rag/search-router.ts).

## Source of Truth

This module is authoritative for query-shape classification, routing reasons, symbol-table corpus construction, exact-name normalization/boosting, lexical result shaping, and deterministic ordering. `SparseRetriever` owns tokenization and BM25 scoring; callers own the semantic fallback decision [ref](src/integration/rag/search-router.ts).

Runtime configuration is `LexicalSearchOptions`; persistent state/configuration: **NONE**. `search-router.test.ts` covers every query shape, exact/member/camel-case matches, empty/no-match behavior, determinism, routing reasons, and header-less records [ref](__tests__/integration/rag/search-router.test.ts).

## Public API / Contracts

- `SearchLane` identifies lexical, semantic, or hybrid retrieval provenance [ref](src/integration/rag/search-router.ts#SearchLane).
- `QueryShape` enumerates identifier, member, flag, quoted, and phrase shapes [ref](src/integration/rag/search-router.ts#QueryShape).
- `QueryClassification` reports whether a query is symbol-shaped, its shape, and the routing reason [ref](src/integration/rag/search-router.ts#QueryClassification).
- `RouterHit` is the stable lexical hit identity/location/score shape [ref](src/integration/rag/search-router.ts#RouterHit).
- `LexicalSearchResult` carries lexical provenance, ranked results, and routing reason [ref](src/integration/rag/search-router.ts#LexicalSearchResult).
- `SymbolTableElement` is the accepted index-element subset, including optional semantic fields [ref](src/integration/rag/search-router.ts#SymbolTableElement).
- `LexicalSearchOptions` configures top-K and exact-name boost [ref](src/integration/rag/search-router.ts#LexicalSearchOptions).
- `classifyQuery` deterministically classifies a raw query [ref](src/integration/rag/search-router.ts#classifyQuery).
- `lexicalSearch` builds and searches the in-memory sparse corpus [ref](src/integration/rag/search-router.ts#lexicalSearch).

## Dependencies

- `SparseRetriever` supplies corpus-agnostic tokenization and BM25 retrieval [ref](src/integration/rag/search-router.ts).
- The vector-store metadata type supplies the shared lexical metadata contract only; no vector-store instance is used [ref](src/integration/rag/search-router.ts).

## Risks & Edge Cases

- Empty input is classified as a conceptual phrase, although lexical search still accepts it and normally returns no matches [ref](src/integration/rag/search-router.ts).
- Any punctuation-heavy single token is treated as symbol-shaped even when it is a URL or other non-symbol value [ref](src/integration/rag/search-router.ts).
- Duplicate header-less element names share the same fallback ID, leaving identity/tie behavior dependent on sparse-retriever handling [ref](src/integration/rag/search-router.ts).
- Negative or non-integer `topK` and unusual boost values are not validated locally [ref](src/integration/rag/search-router.ts).
- Dotted exact matching considers only the final segment, so different receivers with the same member name receive the same exact boost [ref](src/integration/rag/search-router.ts).

## Validation Checklist

- [x] Verified all nine indexed exports and declaration anchors.
- [x] Traced every query shape and corpus/result branch.
- [x] Reviewed deterministic, no-data, exact-match, and any-repo coverage.
- [x] Documented unvalidated options and ambiguous fallback/member identities.


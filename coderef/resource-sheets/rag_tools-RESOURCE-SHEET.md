---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: rag_tools
parent_project: coderef-core
category: CLI
version: 1.0.0
documents: src/cli/mcp/rag-tools.ts
related_files:
  - src/cli/mcp/rag-tools.ts
status: draft
---

## Executive Summary

`rag-tools.ts` builds the MCP RAG tool family: lexical-first/hybrid search, RAG status, canonical reindexing, and local-Ollama vector indexing, delegating all writes to established pipelines [ref](src/cli/mcp/rag-tools.ts).

## Audience and Intent

MCP server and RAG maintainers use this family to expose agent-safe retrieval and indexing. Symbol-shaped queries avoid embedding dependencies; conceptual queries degrade to lexical results when vectors/providers are unavailable rather than returning a hard embedding error.

## Architecture / Behavior

`rag_search` normalizes pagination and neighbor limits, classifies/overrides the lane, optionally loads a canonical graph, and runs an in-memory symbol-table search first. Conceptual or forced-semantic queries read RAG metadata, recreate the indexed provider/store, run semantic or hybrid retrieval, and fall back to lexical on metadata, provider, store, or search failure. Successful envelopes include lane provenance, paging, optional expansion, and vector-staleness facts [ref](src/cli/mcp/rag-tools.ts).

`rag_status` delegates to the status reader. `reindex` delegates to full populate and declares `.coderef` confinement. `rag_index` delegates to the local-Ollama indexer, threads concurrency/cache controls, and converts thrown or zero-chunk/failed outcomes into an `embedding_unavailable` envelope [ref](src/cli/mcp/rag-tools.ts).

## Source of Truth

This module is authoritative for MCP RAG handler orchestration, lane/fallback envelopes, pagination/expansion wiring, staleness attachment, write delegation, and clean error shaping. Search/router/provider/store/populate/index/status modules own their underlying behavior; server registration and input schemas remain in the MCP server [ref](src/cli/mcp/rag-tools.ts).

Runtime state is the injected handler context/cache plus on-disk `.coderef` artifacts and provider availability. `mcp-server.test.ts` covers lexical routing, conceptual fallback, expansion inputs, status, write confinement, and unreachable Ollama; router and RAG integration suites cover underlying retrieval [ref](__tests__/mcp-server.test.ts) [ref](__tests__/integration/rag/search-router.test.ts).

## Public API / Contracts

- `RagTools` is the handler subset for search, status, reindex, and vector indexing [ref](src/cli/mcp/rag-tools.ts#RagTools).
- `buildRagTools` binds those handlers to one project context/cache [ref](src/cli/mcp/rag-tools.ts#buildRagTools).

## Dependencies

- Query/router modules provide staleness, query classification, lexical search, and ego-graph expansion [ref](src/cli/mcp/rag-tools.ts).
- Response helpers provide paging and detailed/concise shaping [ref](src/cli/mcp/rag-tools.ts).
- Populate, RAG-index, and RAG-status modules provide the canonical delegated workflows [ref](src/cli/mcp/rag-tools.ts).
- Provider/store and semantic-search modules are lazy-loaded only for the embedding lane [ref](src/cli/mcp/rag-tools.ts).

## Risks & Edge Cases

- When graph loading fails during requested expansion, the response still reports expansion but hits receive no explicit unresolved-neighbor block [ref](src/cli/mcp/rag-tools.ts).
- Provider recreation recognizes OpenAI explicitly and maps every other stored provider name to Ollama [ref](src/cli/mcp/rag-tools.ts).
- Lexical fallback still requires `.coderef/index.json`; if it is absent, the fallback becomes `index_missing` [ref](src/cli/mcp/rag-tools.ts).
- A conceptual query that degrades to lexical may return no lexical matches even though a healthy semantic index would have found results [ref](src/cli/mcp/rag-tools.ts).
- Reindex accepts `incremental` but always performs/reports a full rebuild because no changed-file list is available [ref](src/cli/mcp/rag-tools.ts).
- A legitimate successful zero-chunk indexing run is classified as embedding unavailable [ref](src/cli/mcp/rag-tools.ts).

## Validation Checklist

- [x] Verified both indexed exports and declaration anchors.
- [x] Traced lexical, semantic/hybrid, fallback, expansion, status, and both write handlers.
- [x] Reviewed MCP routing, status, confinement, and unavailable-provider coverage.
- [x] Documented graph-expansion, provider mapping, fallback, and full-rebuild semantics.


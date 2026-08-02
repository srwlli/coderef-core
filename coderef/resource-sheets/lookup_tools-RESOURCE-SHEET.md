---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: lookup_tools
parent_project: coderef-core
category: CLI
version: 1.0.0
documents: src/cli/mcp/lookup-tools.ts
related_files:
  - src/cli/mcp/lookup-tools.ts
status: draft
---

## Executive Summary

`lookup-tools.ts` builds the MCP lookup family for element search, codebase/validation summaries, bounded source retrieval, consolidated symbol context, and type-hierarchy traversal with optional LSP projection [ref](src/cli/mcp/lookup-tools.ts).

## Audience and Intent

MCP server and code-intelligence maintainers use these handlers for understand-before-edit workflows over existing index/graph/validation artifacts, without requiring RAG. Responses preserve counts and no-data disclosures across detailed and concise forms.

## Architecture / Behavior

Element search matches exact/substrings across name, file, and CodeRef ID, filters type, ranks exact names, and pages metadata. Summary joins index/graph plus optional validation rates. Validation status passes through the canonical report with selected rollups. Source retrieval resolves index elements, reads a bounded line/character window, and returns clean not-found/ambiguous/unavailable envelopes [ref](src/cli/mcp/lookup-tools.ts).

Type hierarchy builds extends/implements adjacency and delegates bounded traversal, optionally joining index end lines into LSP 3.17 items with degradation counters. Symbol context resolves exactly one graph node and joins identity, header, ego neighborhood, references, test linkage, mtime staleness, governing docs, and optional source; concise mode retains counts while dropping list/source bodies [ref](src/cli/mcp/lookup-tools.ts).

## Source of Truth

This module is authoritative for MCP lookup handler orchestration, artifact joins, paging, ambiguity/error envelopes, source-window bounds, LSP projection wiring, and detailed/concise response selection. Index/graph/validation/query modules own underlying facts and algorithms; server registration/input schemas remain external [ref](src/cli/mcp/lookup-tools.ts).

Runtime state is the injected project context/cache and repository source/artifacts; direct persistent writes: **NONE** (shared artifact loaders may invoke their bounded build-if-missing workflow). MCP and build-if-missing tests cover lookup summaries, validation, source, hierarchy, symbol cards, pagination, concise forms, and on-demand artifacts [ref](__tests__/mcp-server.test.ts) [ref](__tests__/mcp-server-build-if-missing.test.ts) [ref](__tests__/query/type-hierarchy.test.ts) [ref](__tests__/query/symbol-context.test.ts).

## Public API / Contracts

- `LookupTools` is the handler subset for six lookup/summary capabilities [ref](src/cli/mcp/lookup-tools.ts#LookupTools).
- `buildLookupTools` binds those handlers to one project context/cache [ref](src/cli/mcp/lookup-tools.ts#buildLookupTools).

## Dependencies

- Filesystem/path/URL modules read source and construct LSP file URIs [ref](src/cli/mcp/lookup-tools.ts).
- Output validation, symbol-context, and type-hierarchy modules provide contracts and pure assembly/projection [ref](src/cli/mcp/lookup-tools.ts).
- Shared MCP loaders/resolvers provide artifacts, caches, paging limits, and standard error envelopes [ref](src/cli/mcp/lookup-tools.ts).
- Response/path helpers normalize paths and detailed/concise/paged output [ref](src/cli/mcp/lookup-tools.ts).

## Risks & Edge Cases

- `source_of` returns an ambiguity only above five matches; two to five matches silently select the first result [ref](src/cli/mcp/lookup-tools.ts).
- Absolute file paths stored in the index are read directly, so a corrupted/untrusted artifact can point outside the project [ref](src/cli/mcp/lookup-tools.ts).
- Source slices use start lines and fixed windows rather than AST end spans and can end mid-declaration [ref](src/cli/mcp/lookup-tools.ts).
- Type hierarchy seeds the first resolved match, and whole-file matches can therefore represent one arbitrary node rather than an aggregate [ref](src/cli/mcp/lookup-tools.ts).
- Missing element-file mtimes are treated as freshness unknown/not-stale in the symbol card rather than an explicit no-data state [ref](src/cli/mcp/lookup-tools.ts).
- Codebase header coverage falls back to zero when the index is empty, which can read as measured 0% instead of no-data [ref](src/cli/mcp/lookup-tools.ts).

## Validation Checklist

- [x] Verified both indexed exports and declaration anchors.
- [x] Traced all six handlers, artifact joins, hierarchy/LSP, source, concise, and error paths.
- [x] Reviewed MCP fixture, pure-query, and build-if-missing coverage.
- [x] Documented ambiguity, path, source-span, seeding, freshness, and empty-index semantics.


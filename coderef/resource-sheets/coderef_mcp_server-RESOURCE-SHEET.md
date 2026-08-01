---
agent: Claude Fable 5
date: 2026-08-01
task: STUB-CC9094
subject: coderef_mcp_server
parent_project: coderef-core
category: CLI
version: 1.0.0
documents: src/cli/coderef-mcp-server.ts
related_files:
  - src/cli/coderef-mcp-server.ts
  - src/cli/mcp/shared.ts
  - src/cli/mcp/graph-tools.ts
  - src/cli/mcp/lookup-tools.ts
  - src/cli/mcp/verify-tools.ts
  - src/cli/mcp/rag-tools.ts
  - src/cli/mcp/context-tools.ts
  - src/cli/mcp/map-tools.ts
status: approved
---

# coderef_mcp_server Resource Sheet

## Executive Summary

`src/cli/coderef-mcp-server.ts` is the stdio MCP server that exposes coderef-core's code intelligence to LLM agents — 38 tools over a repo's `.coderef/` artifacts (index, call/import graph, semantic map, RAG vectors) [ref](src/cli/coderef-mcp-server.ts:127). It is repo-agnostic by contract: `project_root` is required on every call, there is no default repo, and one handler set is memoized per canonical root [ref](src/cli/coderef-mcp-server.ts:15). Most tools are read-only; index writes (`reindex`, `rag_index`, `map`) are confined to `<project_root>/.coderef/`, and `rename_apply` is the single sanctioned source-write tool under a scoped 2026-08-01 operator ruling [ref](src/cli/coderef-mcp-server.ts:32).

## Audience and Intent

For maintainers changing the MCP surface (adding a tool, changing a response envelope) and for operators wiring the server into an agent host. Open this sheet to understand the server's contracts — repo-agnosticism, write confinement, the rename supersession envelope, stdout protocol discipline — and where each tool's handler actually lives after the monolith decomposition. The tool-by-tool catalog is maintained in the server's own header docblock [ref](src/cli/coderef-mcp-server.ts:55), which is the per-tool authority; this sheet documents the structure and the invariants around it.

## Architecture / Behavior

The entry file keeps the public surface (`buildToolHandlers`, `handlersFor`, `errorPayload`, `SERVER_TOOL_COUNT`, `SERVER_INSTRUCTIONS`), the per-repo handler registry, and ALL `server.registerTool` blocks — tool names, input schemas, and response envelopes stayed byte-identical through the decomposition [ref](src/cli/coderef-mcp-server.ts:84). The implementation lives in seven modules under `src/cli/mcp/`:

- `shared.ts` — artifact cache/loaders + helpers shared by every family
- `graph-tools.ts` — call/import graph traversals (what_calls, impact_of, path_between, ...)
- `lookup-tools.ts` — element lookup and source slices (find_element, source_of, ...)
- `verify-tools.ts` — validation and health surfaces (validation_status, unresolved_edges, ...)
- `rag-tools.ts` — RAG search/status/index (local Ollama only)
- `context-tools.ts` — context packing and summaries (pack_context, codebase_summary, ...)
- `map-tools.ts` — the map projection tools

Key behavioral invariants, each stated in the header contract:

- **Repo-agnostic:** resolution failures return structured `{ error, project_root, hint }` envelopes — never another repo's data; the launch `--project-dir` arg is only an anchor for resolving relative paths [ref](src/cli/coderef-mcp-server.ts:20).
- **Write confinement:** `.coderef/` writes delegate to the existing populate / rag-index pipelines rather than opening a new write path [ref](src/cli/coderef-mcp-server.ts:25).
- **Compact responses:** tools return pre-summarized envelopes, never raw graph dumps — consumers are LLM agents where tokens are the budget [ref](src/cli/coderef-mcp-server.ts:55).
- **Protocol discipline:** stdout belongs to the MCP transport; ALL diagnostics go to stderr [ref](src/cli/coderef-mcp-server.ts:80).

## Source of Truth

- The server header docblock is the canonical statement of every contract (repo-agnosticism, write confinement, rename supersession, tool catalog) [ref](src/cli/coderef-mcp-server.ts:10).
- `SERVER_TOOL_COUNT = 38` is the registration guard — a tool added without bumping it is a startup error, so the count cannot silently drift [ref](src/cli/coderef-mcp-server.ts:127).
- The server is built INSIDE coderef-core so the graph read path is typed against `ExportedGraph` from `src/export/graph-exporter.ts` — an edge-schema change becomes a compile error here, not silent wrong answers [ref](src/cli/coderef-mcp-server.ts:49).
- Data served is whatever `.coderef/` holds; every read response carries a staleness block, and `reindex` is the remedy.

## Public API / Contracts

- **Binary:** `coderef-mcp-server` → `dist/src/cli/coderef-mcp-server.js` (package `bin` map); speaks MCP over stdio.
- **Module exports:** `SERVER_TOOL_COUNT`, `SERVER_INSTRUCTIONS`, `buildToolHandlers`, `handlersFor`, `errorPayload` [ref](src/cli/coderef-mcp-server.ts:6) — consumed by the parity/repo-agnostic/build-if-missing test suites.
- **Tool contract:** every tool REQUIRES `project_root` (schema-level rejection when omitted) [ref](src/cli/coderef-mcp-server.ts:15).
- **Write contract:** `reindex` / `rag_index` / `map` write only under `<project_root>/.coderef/`; `rename_apply` writes source atomically with `apply:false` as the pure-preview default, shadow-ambiguous lines never rewritten over MCP (that escape hatch is CLI-only on `coderef-rename`) [ref](src/cli/coderef-mcp-server.ts:36); every other tool writes nothing.

## Dependencies

- **Internal:** the six `src/cli/mcp/*-tools.ts` family modules + `shared.ts`; the populate and rag-index pipelines (delegated writes); `src/export/graph-exporter.ts` types; `.coderef/` artifacts as the data substrate.
- **External:** the MCP SDK for stdio transport; local Ollama for the RAG tools — this project is local-Ollama-only, no cloud LLM keys (operator ruling; the @anthropic-ai/sdk quarantine is permanent).
- **Consumers:** MCP hosts (Claude Code and peers) via the `mcp__coderef-core__*` tool namespace; test suites listed in the header's `@used_by` [ref](src/cli/coderef-mcp-server.ts:7).

## Risks & Edge Cases

- **Stale substrate:** the server serves `.coderef/` as-is; a stale index yields stale answers — staleness blocks disclose it, but only if the caller reads them.
- **Two adjacency indexes:** the canonical-graph index and the `mcp/graph-tools` index must BOTH learn any new edge kind, or MCP traversals silently miss it (bit us in the API-surface mapping WO).
- **Tool-count guard is registration-only:** `SERVER_TOOL_COUNT` catches a missing registration, not a behavioral regression — envelope changes need the parity tests.
- **rename_apply scope creep:** the source-write sanction is confined to exactly this tool by ruling condition; adding another source-writing tool requires a new ruling, not a code change [ref](src/cli/coderef-mcp-server.ts:32).
- **stdout contamination:** any `console.log` in a handler path corrupts the MCP transport — diagnostics must go to stderr [ref](src/cli/coderef-mcp-server.ts:80).
- **Build staleness:** the binary runs from `dist/`; an un-rebuilt server serves old logic (same stale-dist trap as the maintenance scripts).

## Validation Checklist

- [x] All 9 required frontmatter fields present; `category: CLI` maps to "Scripts / Entry points"
- [x] `documents:` target `src/cli/coderef-mcp-server.ts` verified in scan scope (resolved edge)
- [x] Every `related_files` path verified on disk (2026-08-01)
- [x] Claims cited to the server header contract (`[ref](path:line)`)
- [x] Tool count (38) read from `SERVER_TOOL_COUNT`, not hand-counted
- [ ] Re-verify after any change to the `src/cli/mcp/` module split or the tool registry

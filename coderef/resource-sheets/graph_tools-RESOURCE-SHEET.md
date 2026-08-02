---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: graph_tools
parent_project: coderef-core
category: CLI
version: 1.0.0
documents: src/cli/mcp/graph-tools.ts
related_files:
  - src/cli/mcp/graph-tools.ts
status: draft
---

## Executive Summary

`graph-tools.ts` builds the MCP handler family for resolved graph traversal, dependency impact, path discovery, cycles, hotspots, exports, unresolved-edge inspection, and combined references. It binds read-only query behavior to a project directory and shared artifact cache while preserving the MCP server's pagination and concise-response contracts [ref](src/cli/mcp/graph-tools.ts).

## Audience and Intent

MCP maintainers should use this sheet when changing graph direction, traversable relationship kinds, result totals, pagination, or response shaping. Agent-tool consumers should use it to distinguish inbound edge counts from outbound distinct-node counts, understand which graph dispositions are intentionally excluded from traversal, and interpret heuristic reference results.

## Architecture / Behavior

`buildGraphTools` closes over `projectDir` and the shared artifact cache, then returns twelve synchronous handlers [ref](src/cli/mcp/graph-tools.ts). Two private adapters establish the common lookup behavior: inbound queries read the resolved-only inbound cache, while outbound queries delegate to `CanonicalGraphQuery` so file-grain expansion matches the library query surface.

The handler family has four behavioral groups:

- Inbound `what_calls` and `what_imports` enumerate matching resolved edges. Call queries widen the relationship filter to include `calls_endpoint` and `serves_endpoint`; import queries remain import-only. Confidence is a filter inside the resolved set, not a way to reintroduce unresolved edges [ref](src/cli/mcp/graph-tools.ts).
- Outbound `what_this_calls`, `what_this_imports`, and `what_this_depends_on` use canonical graph traversal. Immediate outbound totals count distinct neighbors, while inbound totals count edges, so the two directions are not numerically symmetric [ref](src/cli/mcp/graph-tools.ts).
- `impact_of` performs a reverse breadth-first walk across resolved call/import and endpoint relationships. Its opt-in workspace projection stitches registry-tagged external imports to sibling repository graphs without persisting cross-repository edges. `path_between` delegates shortest or bounded all-path discovery; all-path mode surfaces the canonical engine's 50-result cap through `internal_cap_hit` [ref](src/cli/mcp/graph-tools.ts).
- `hotspots`, `cycles`, `what_exports`, `unresolved_edges`, and `find_all_references` project graph-wide diagnostics. Hotspots rank fan-in plus fan-out, cycles use iterative Tarjan SCC discovery, unresolved edges preserve reasons and candidates, and the reference union adds heuristic type-only import matches without reclassifying those edges [ref](src/cli/mcp/graph-tools.ts).

List surfaces use the shared paginator. Most also use the shared concise projector; nested path, cycle, and unresolved-edge envelopes perform local concise shaping because their identity records are not top-level item objects [ref](src/cli/mcp/graph-tools.ts).

## Source of Truth

This file is authoritative for the graph MCP handlers' traversal filters, pagination choices, error envelopes, and response projections. Graph and index state remain owned by `.coderef` artifacts and the cache assembled in `mcp/shared.ts`; canonical forward traversal remains owned by `query/canonical-graph.ts`. This module retains no state beyond the supplied closure references [ref](src/cli/mcp/graph-tools.ts).

Runtime configuration is per-call arguments plus optional `.coderef/workspace.json` consumed by workspace stitching; there is no graph-tools-owned configuration file. Arguments control depth, relationship, confidence, status, source-only filtering, workspace projection, limits, offsets, and response format. Registration and user-facing tool descriptions remain in `coderef-mcp-server.ts`, not here [ref](src/cli/coderef-mcp-server.ts).

The broad behavior is backed by the MCP server suite: inbound/outbound direction, impact BFS, path modes, hotspots, SCCs, exports, unresolved facets, references, concise shaping, and pagination are all exercised [ref](__tests__/mcp-server.test.ts). A dedicated `graph-tools` unit file: **NONE found**.

## Public API / Contracts

- `GraphTools` is the `ToolHandlers` subset containing `what_calls`, `what_imports`, `impact_of`, `what_this_calls`, `what_this_imports`, `what_this_depends_on`, `path_between`, `cycles`, `hotspots`, `what_exports`, `unresolved_edges`, and `find_all_references` [ref](src/cli/mcp/graph-tools.ts#GraphTools).
- `buildGraphTools` `(ctx)` accepts a `HandlerContext` and returns the complete synchronous `GraphTools` handler object [ref](src/cli/mcp/graph-tools.ts).

Expected lookup failures return structured `element_not_found`, `ambiguous_element`, `file_not_found`, or `ambiguous_file` envelopes rather than throwing. Artifact loading and malformed runtime data can still propagate errors from the shared loaders.

## Dependencies

- `query/canonical-graph.ts` supplies bounded all-path discovery and canonical forward traversal [ref](src/cli/mcp/graph-tools.ts).
- `query/workspace-stitch.ts` supplies the optional read-only cross-repository impact projection [ref](src/cli/mcp/graph-tools.ts).
- `pipeline/edge-confidence.ts` defines confidence tiers and their ordering [ref](src/cli/mcp/graph-tools.ts).
- `utils/path-normalize.ts` normalizes file matching across graph producers [ref](src/cli/mcp/graph-tools.ts).
- `cli/mcp-response-format.ts` supplies pagination and concise/detailed response projection [ref](src/cli/mcp/graph-tools.ts).
- `cli/mcp/shared.ts` supplies handler types, artifact/cache loaders, node resolution, summaries, file classification, and standard error envelopes [ref](src/cli/mcp/graph-tools.ts).
- External packages: **NONE**.

## Risks & Edge Cases

- Cycle discovery retains only SCCs with more than one member. A resolved self-edge is therefore not reported as a cycle even though it is a graph-theoretic cycle [ref](src/cli/mcp/graph-tools.ts).
- `find_all_references` admits only literal `call` and `import` relationships from the inbound cache; unlike `what_calls`, it does not union `calls_endpoint` or `serves_endpoint`. **[inference]** A caller treating it as a complete cross-process reference inventory can miss endpoint-mediated references [ref](src/cli/mcp/graph-tools.ts).
- Type-only references are matched by comparing only the import specifier basename with target-file basenames. Same-named modules can create false positives, and aliases whose basename differs can be missed; the returned records are explicitly marked non-traversable [ref](src/cli/mcp/graph-tools.ts).
- Call, import, and type-only reference arrays receive the same offset and limit independently. One envelope therefore represents three parallel windows rather than a single window over the combined total [ref](src/cli/mcp/graph-tools.ts).
- Shortest-path mode accepts the shared path argument shape but does not use `limit`, `offset`, or `response_format`; those controls apply only to all-path mode or other list handlers [ref](src/cli/mcp/graph-tools.ts).
- `internal_cap_hit` is conservative: a result count exactly equal to `ALL_PATHS_MAX` is flagged even if the graph contains exactly that many paths [ref](src/cli/mcp/graph-tools.ts).
- Hotspots and cycles intentionally exclude endpoint relationships, so their definition of architectural structure differs from impact traversal's network-aware dependency definition [ref](src/cli/mcp/graph-tools.ts).
- Workspace impact is package-grain and query-time: absent/unreadable sibling graphs are disclosed skips, and no cross-repository edge is added to the canonical graph [ref](src/cli/mcp/graph-tools.ts).

## Validation Checklist

- [x] Verified both indexed exports and declaration anchors.
- [x] Traced all twelve returned handlers and their traversal directions.
- [x] Confirmed inbound edge-count versus outbound distinct-node totals.
- [x] Confirmed pagination and concise-response handling across list shapes.
- [x] Reviewed the MCP graph-handler fixture coverage.
- [x] Named the self-loop, endpoint-reference, and type-only heuristic limitations.

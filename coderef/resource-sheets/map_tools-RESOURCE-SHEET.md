---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: map_tools
parent_project: coderef-core
category: CLI
version: 1.0.0
documents: src/cli/mcp/map-tools.ts
related_files:
  - src/cli/mcp/map-tools.ts
status: draft
---

## Executive Summary

`map-tools.ts` builds the MCP map family: map/viewer emission, one-call orientation, before/after engineering-metrics snapshots and deltas, and the HTTP API-surface inventory [ref](src/cli/mcp/map-tools.ts).

## Audience and Intent

MCP server, map, and agent-workflow maintainers use these handlers for first-turn orientation, visual/JSON graph access, verified refactor feedback, and endpoint mapping. Cross-family summary/hotspot handlers are injected explicitly to avoid monolith method binding.

## Architecture / Behavior

The map handler ensures graph artifacts, regenerates when forced, missing, graph-newer, dashboard-missing, or git-requested, optionally emits a token-bounded skeleton, and returns paths plus analytics summaries. Git and ownership facts are opt-in and expose no-data reasons [ref](src/cli/mcp/map-tools.ts).

Orientation joins skeleton, summary, validation, both staleness axes, and hotspots while naming unavailable blocks. Metrics-delta snapshot mode writes a sanitized sidecar; delta mode loads sidecars/full map files and delegates pure comparison, with a real concise form. API surface regenerates stale maps, distinguishes absent route detection from measured zero endpoints, filters/pages endpoints, and preserves unmatched calls/network edges in detailed output [ref](src/cli/mcp/map-tools.ts).

## Source of Truth

This module is authoritative for MCP map/orient/delta/API handler orchestration, cache/staleness decisions, response envelopes, snapshot path conventions, and write disclosures. Projection, emission, skeleton, metrics, orientation, and API-surface modules own computation; server registration/input schemas remain external [ref](src/cli/mcp/map-tools.ts).

Persistent outputs are `.coderef/map` viewer/skeleton/snapshot artifacts; runtime state is handler context/cache and optional sibling handlers. Map parity, orientation, metrics-delta, and API-surface tests cover the underlying joins and MCP envelopes [ref](__tests__/map/mcp-map-parity.test.ts) [ref](__tests__/query/orient.test.ts) [ref](__tests__/map/metrics-delta.test.ts) [ref](__tests__/map/api-surface.test.ts).

## Public API / Contracts

- `MapTools` is the handler subset for map, orientation, metrics delta, and API surface [ref](src/cli/mcp/map-tools.ts#MapTools).
- `MapToolSiblings` supplies summary and hotspot handlers used by orientation [ref](src/cli/mcp/map-tools.ts#MapToolSiblings).
- `buildMapTools` binds the map family to project context and sibling handlers [ref](src/cli/mcp/map-tools.ts#buildMapTools).

## Dependencies

- Map emission, skeleton, engineering metrics, and delta modules provide map artifacts and comparisons [ref](src/cli/mcp/map-tools.ts).
- Orientation and staleness modules compose prompt-sized first-turn context [ref](src/cli/mcp/map-tools.ts).
- Response/path helpers provide paging, concise detection, and normalized output paths [ref](src/cli/mcp/map-tools.ts).
- Shared loaders ensure and cache graph/validation artifacts [ref](src/cli/mcp/map-tools.ts).

## Risks & Edge Cases

- Cached-map freshness compares only `data.json` to `graph.json`; existing but older graph/dashboard HTML files do not independently force regeneration [ref](src/cli/mcp/map-tools.ts).
- Orientation intentionally swallows component failures and reports no-data, which protects the call but removes underlying error detail [ref](src/cli/mcp/map-tools.ts).
- Explicit `before`/`after` metric paths are resolved from the project but may traverse outside it; they are read-only yet broaden the readable surface [ref](src/cli/mcp/map-tools.ts).
- Sanitized snapshot labels can collide and overwrite an earlier sidecar [ref](src/cli/mcp/map-tools.ts).
- Snapshot writes are direct rather than temp-file/rename atomic [ref](src/cli/mcp/map-tools.ts).
- API caller visibility is limited to the frontend-call substrate, so `orphaned` is explicitly in-repository/no-resolved-caller rather than dead code [ref](src/cli/mcp/map-tools.ts).

## Validation Checklist

- [x] Verified all three indexed exports and declaration anchors.
- [x] Traced map refresh/cache, orientation joins, snapshot/delta, and API tri-state paths.
- [x] Reviewed parity, orientation, metrics-delta, and API-surface coverage.
- [x] Documented freshness, swallowed-detail, path, collision, atomicity, and visibility limits.


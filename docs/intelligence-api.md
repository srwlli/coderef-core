# coderef-intelligence-server — RETIRED (2026-06-13)

**This HTTP server has been retired.** Operator-delegated ruling A
(WO-MCP-V2-TOOLS-AND-PS-VALIDATION-001 P3, STUB-9F63EJ): the server read
legacy edge fields (`e.source`/`e.target`/`e.type`) internally — the exact
schema-drift class that killed the external Python `coderef-context` server —
and every endpoint is superseded by `coderef-mcp-server` (typed against
`ExportedGraph`, so drift fails at compile time).

A consumer sweep across LLOYD, ASSISTANT SKILLS/SURFACES, and DASHBOARD found
**zero callers** at retirement time. The source (`src/cli/
coderef-intelligence-server.ts`) and the `coderef-intelligence-server` bin
entry were removed; recover from git history if ever needed.

## Endpoint → replacement map

| Retired endpoint | Replacement |
|---|---|
| `GET /api/health`, `GET /readyz` | n/a (stdio MCP server has no liveness surface; the process IS the session) |
| `GET /api/intelligence/summary` | MCP tool `codebase_summary` |
| `GET /api/intelligence/elements` | MCP tool `find_element` |
| `GET /api/intelligence/edges` | MCP tools `what_calls` / `what_imports` / `what_exports` |
| `GET /api/intelligence/hotspots` | MCP tool `hotspots` (fan-in/fan-out over resolved edges, src-only by default) |
| `GET /api/intelligence/coverage-gaps` | MCP tool `validation_status` (header_* fields of the 14-field report) + `find_element` headerStatus |

See [docs/CLI.md § coderef-mcp-server](./CLI.md#coderef-mcp-server) for the
full 11-tool surface and registration instructions.

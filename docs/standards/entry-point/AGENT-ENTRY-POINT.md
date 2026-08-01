---
kind: entry-point
status: living
title: "coderef-core — Agent Entry-Point Contract"
updated: 2026-07-31
---

# coderef-core — Agent Entry-Point (the `agent` variant)

> The front doors an **agent** meets. An agent that connects must automatically
> receive (a) the usage contract and (b) a resolvable map from its question to the
> right tool. Nothing here is pull-only: an agent should not need to already know a
> doc exists to be routed correctly.

## 1. The connect-time usage contract (MCP `initialize` handshake)

coderef-core ships an MCP stdio server, and the `initialize` handshake carries the
usage contract every connecting agent receives automatically.

- **Where it lives:** `SERVER_INSTRUCTIONS`, an exported template literal in
  [`src/cli/coderef-mcp-server.ts`](../../../src/cli/coderef-mcp-server.ts). It is
  passed as `ServerOptions.instructions` and interpolates `SERVER_TOOL_COUNT`.
- **Why the handshake and not a doc:** it is **the one surface every connected agent
  receives without asking.** These rules were previously learned only by failing.
- **Resolve target:** `.mcp.json` (the manifest) and
  `src/cli/coderef-mcp-server.ts` (the emitter). Both exist on disk.

### The six-clause contract an agent receives

1. **`project_root` is required on every tool.** There is no default repo — the
   server serves whichever indexed repo you name.
2. **Check `.coderef/` freshness.** If missing or stale, run `reindex` first. Every
   read response carries a staleness block.
3. **Orient before you grep.** `orient` returns one token-budgeted envelope
   (skeleton map + summary + validation + staleness + hotspots), replacing 10–15
   blind file reads.
4. **Prefer graph tools over grep for structure questions** — `what_calls` /
   `impact_of` for blast radius, `cycles` / `hotspots` for risk, `find_element` +
   `symbol_context` for definitions, `rag_search` for concepts.
   **4b. Verify before you commit** — `tests_for_change` returns ranked tests plus a
   runnable command; `change_dossier` composes the full pre-flight.
5. **Surfaces, not verdicts.** Results show WHERE to look, never WHAT is wrong. **An
   empty result means NO RESOLVED DATA, not "none exist"** — check `unresolved_edges`
   and `validation_status` before trusting a negative.
6. **Write scope is bounded.** No tool writes source. `rename --apply` is CLI-only;
   MCP exposes `rename_preview` only. Index writes are confined to `.coderef/`.

Clauses 5 and 6 are the load-bearing ones: 5 prevents an agent reporting a false
negative, and 6 makes the destructive verb unreachable rather than merely defaulted
off. Both are governed in depth by
[`../data/PROVENANCE-STANDARD.md`](../data/PROVENANCE-STANDARD.md) and
[`../execution/WRITE-DISCIPLINE-STANDARD.md`](../execution/WRITE-DISCIPLINE-STANDARD.md).

## 2. The tool front doors

All 37 tools are reached through **one** door — the MCP server — rather than through
per-tool wrappers. That is deliberate: a single registration surface means a tool
cannot exist without appearing in the handshake count.

| Door | Target | Exists |
|---|---|---|
| MCP manifest | `.mcp.json` | yes |
| Server implementation (37 `registerTool` blocks) | `src/cli/coderef-mcp-server.ts` | yes |
| Agent usage rules (repo-local) | `AGENTS.md` | yes |
| CLI surface (19 distinct bins) | `package.json` | yes |

**Rule:** a wrapper that names a target must ship in the same motion as the target —
never reference a front door before it exists.

## 3. The question → tool decision table

| I want to… | Use | Resolves to |
|---|---|---|
| Get oriented in an unfamiliar repo | `orient` | `src/cli/coderef-mcp-server.ts` |
| Know who breaks if I change X | `what_calls`, `impact_of` | `src/cli/mcp/graph-tools.ts` |
| Find a symbol's definition and neighbors | `find_element`, `symbol_context` | `src/cli/coderef-mcp-server.ts` |
| Search by concept, not by string | `rag_search` (check `rag_status` first) | `src/cli/coderef-mcp-server.ts` |
| Find risk concentrations | `hotspots`, `cycles` | `src/cli/coderef-mcp-server.ts` |
| Know which tests cover my diff | `tests_for_change` | `src/cli/coderef-mcp-server.ts` |
| Run a full pre-commit pre-flight | `change_dossier` | `src/cli/coderef-mcp-server.ts` |
| See the HTTP endpoint surface | `map` (api-surface) | `src/map/api-surface.ts` |
| Preview a rename (never apply) | `rename_preview` | `src/cli/coderef-mcp-server.ts` |
| Refresh a stale index | `reindex`, `rag_index` | `src/cli/coderef-mcp-server.ts` |

**Rule:** every tool on the right-hand side is a real, resolvable front door listed in
[`ENTRY-POINT-INVENTORY.md`](ENTRY-POINT-INVENTORY.md).

## Inventory rows this doc contributes

Four `variant: agent` rows: the MCP manifest, the `initialize` handshake (prose, no
path), the server implementation, and `AGENTS.md`.

---

*Conforms to the `entry-point` kind. Authority root: [`README.md`](README.md).*

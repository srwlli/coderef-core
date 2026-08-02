---
title: Best-Form Clone — Transports band plan
domain: CODEREF-CORE
status: open
created: 2026-08-02
stub_ref: null
---

# Transports band — zero-logic adapters

**Graph:** [graph.html](graph.html) · master: [../blueprint.html](../blueprint.html) · ledger: [../PROBLEMS.md](../PROBLEMS.md)

**Mission.** Three doors into one room. MCP server, CLI bins, and the watch/SSE daemon are adapters over `engine.api` — schema-map + call + envelope, nothing else. The parity work that consumed a whole WO phase in CODEREF-CORE (MCP vs CLI mirrors) does not exist here because there is no second implementation to drift.

## Nodes

| Node | Phase·Track | Responsibility |
| :--- | :--- | :--- |
| `transport.mcp` | P1·B | Tool schema → `engine.api` call → envelope. Size-budgeted handlers (CI-enforced) so logic physically cannot accrete — today's `verify-tools.ts` fan-out 111 / `graph-tools.ts` fan-out 98 is the anti-pattern being banned. |
| `transport.cli` | P1·B | The same functions behind argv; ONE build config shared with the engine (stale-dist trap has nowhere to live). |
| `transport.watch` | P2·B | fs events → `engine.watchcore` via the api → SSE delta feed for editors/agents. |

## Laws enforced
L4 (zero-logic adapters; import `engine.api` and nothing else — the rules gate red-flags any other import), plus the size budget as a lint gate. Problems neutralized: P2, P3, P8.

## Build
- **P1 (track B):** define the full tool/command inventory (parity list with today's 38 MCP tools + CLI mirrors, minus retired ones — the inventory diff is part of the deliverable), implement both adapters against the `engine.api` stub + fixture artifacts.
- **P2:** watch daemon over the bound api; SSE delta contract exercised by an agent-shaped consumer test.

**Exit criteria:** every tool/command reaches the api through a handler under the size budget; tool inventory parity documented; `verify.rules` green (this band's allowed imports: `engine.api`, `contracts.envelope` only).

**Parallelism note.** Track B never touches engine internals — it binds to the api *signature* in P1 and the real engine in P2, so it runs beside track A the whole way.

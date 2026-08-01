---
title: coderef-mcp-server — Quick Start
status: living
updated: 2026-07-31
kind: entry-point
documents: src/cli/coderef-mcp-server.ts
---

# coderef-mcp-server — Quick Start

> The per-surface quickstart for the **runnable** MCP server. Covers the four things an
> agent pointed at this accessory needs: **start · transport · health-check · stop.**
> The project-wide quickstart is `coderef-core-quickstart.md` at the repo root; this doc
> is about running *this server*, not building the library.

## Transport: stdio — there is no port

This server speaks **MCP over stdio** ([ref](coderef-mcp-server.ts:1103)). It binds **no
port**, serves no HTTP, and has no URL to curl.

That matters for two reasons worth stating up front, because both cost time when
discovered by surprise:

- `stdout` is the protocol channel. **All logging goes to `stderr`**
  ([ref](coderef-mcp-server.ts:1105)) — anything written to stdout would corrupt the
  message stream.
- There is nothing to "visit". The client launches the process and owns its lifetime;
  you do not start it in one terminal and connect from another.

(The separate `coderef-rag-server` bin *is* a long-running HTTP service. Do not confuse
the two.)

## Prerequisites

- [ ] Node.js >= 20 (`node --version`) — enforced by `engines` in `package.json`
- [ ] Dependencies installed (`npm install`)
- [ ] **CLI bins built** (`npm run build`) — a bare `npx tsc` does not emit them
- [ ] A target repo with a `.coderef/` index. If it has none, run `reindex` (or the
      `populate-coderef` CLI) against it first
- [ ] No API key of any kind. This server has no auth and reaches no cloud LLM;
      embedding work is local Ollama only

## Steps

### Step 1: Start the server

**Canonical launch** — the repo-root manifest `.mcp.json`:

```json
{ "mcpServers": { "coderef-core": { "command": "npx", "args": ["coderef-mcp-server"] } } }
```

`npx coderef-mcp-server` resolves the published bin cwd- and path-independently, so the
manifest carries **no absolute machine paths** and no `--project-dir` anchor.

**Direct from a build:**

```bash
npm run build          # tsc + build:cli — the CLIs need tsconfig.cli.json
node dist/src/cli/coderef-mcp-server.js
```

**Verify:** one startup line appears on **stderr** (see Example Output).

### Step 2: Health-check the connection

The startup line confirms the transport came up and states the live tool count. A
connected client sees the same count in the `initialize` handshake instructions.

Then confirm it actually answers, remembering the contract:

- **Every tool call requires `project_root`** (an absolute path). There is no default
  repo — the server serves whichever indexed repo you name.
- Every read response carries a **staleness block**; check it before trusting a result.

**Verify:** call `orient` with a `project_root`. It is the cheapest real end-to-end check,
because it returns one composed envelope rather than a large payload.

### Step 3: Stop the server

The client owns the lifetime: **close the client, or close stdin**, and the process exits.
There is no shutdown endpoint and no PID file. If you launched it by hand, terminate the
foreground process.

## Key Commands

| Command | Purpose |
|---|---|
| `npx coderef-mcp-server` | Launch as the manifest does (published bin) |
| `npm run build` | Compile library + CLIs to `dist/` |
| `npm run build:cli` | Rebuild only the CLI bins (`tsconfig.cli.json`) |
| `node dist/src/cli/coderef-mcp-server.js` | Launch directly from a local build |
| `npx vitest __tests__/mcp-server.test.ts` | Run the server suite, incl. the tool-count drift guard |
| `grep -c 'server.registerTool(' src/cli/coderef-mcp-server.ts` | Count registrations; must equal `SERVER_TOOL_COUNT` |

## Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| `MODULE_NOT_FOUND` on launch | `dist/` missing or stale | `npm install && npm run build` |
| Server starts, tools missing or stale | CLI bins not rebuilt | `npm run build:cli` — a bare `npx tsc` does not emit them |
| Client reports a protocol/parse error | something wrote to stdout | log to `stderr` only; stdout is the protocol channel |
| Every call errors on a missing argument | `project_root` omitted | pass an absolute `project_root` on **every** call |
| Results look wrong or empty | `.coderef/` stale or absent | run `reindex`; read the staleness block |
| A query returns nothing | **no resolved data — not proof of absence** | check `unresolved_edges` and `validation_status` before concluding |
| Advertised tool count looks wrong | `SERVER_TOOL_COUNT` not bumped with a registration | bump it; the drift test in `__tests__/mcp-server.test.ts` fails on mismatch |

## Example Output

Successful start (on **stderr**, not stdout):

```
[coderef-mcp] v1.0.0 on stdio — 37 tools, per-repo; project_root required per call; anchor: <anchor>
```

The tool-count drift guard passing:

```
✓ __tests__/mcp-server.test.ts > SERVER_TOOL_COUNT matches the registerTool() registrations in source (drift guard)
```

## See also

- [`../../.mcp.json`](../../.mcp.json) — the launch manifest
- [`../../AGENTS.md`](../../AGENTS.md) — the repo's agent contract
- [`../../docs/standards/entry-point/AGENT-ENTRY-POINT.md`](../../docs/standards/entry-point/AGENT-ENTRY-POINT.md) — the six-clause usage contract and the question → tool table
- [`../../docs/CLI.md`](../../docs/CLI.md) — the full CLI and tool reference

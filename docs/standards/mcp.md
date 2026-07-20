---
title: MCP Server Standard
kind: mcp
status: living
updated: 2026-07-20
---
<!-- Authored by /standards-establish from SKILLS/STANDARDS/kinds/mcp/template/mcp.md.
     This is the PROJECT's standard for the "mcp" kind. Edit to fit the project;
     re-run /standards-update when the ecosystem template evolves. -->


# MCP Server Standard

> **Kind:** `mcp` · **Registry:** `SKILLS/STANDARDS/kinds/`
> This project's declaration of the posture its **MCP server** commits to, and the
> structural surfaces the checker (`check.mjs`) verifies. Bound to the current stable
> Model Context Protocol spec **2025-11-25**.
>
> **Static vs dynamic (read this first).** This standard's checker is a READ-ONLY
> STATIC reasoner — it verifies STRUCTURE (a manifest exists, tools declare an
> inputSchema, no secrets are hardcoded, the error model is spec-shaped). It does
> **not** launch the server. Confirming the server actually starts and lists its
> tools is the job of the **MCP Inspector CLI** — the dynamic companion named in the
> "Maintain-time" section below. Structure here; behavior there.

## Spec footing (2025-11-25) and the 2026-07-28 cutover watch

This standard enforces the **current stable** protocol version, `2025-11-25`. That
version is what every MUST/SHOULD below is traced to.

> **CUTOVER WATCH.** The next version, `2026-07-28`, is a **locked release
> candidate** (locked 2026-05-21; prerelease tag `2026-07-28-RC`; beta SDKs already
> shipped). It carries **breaking** changes — most importantly a **stateless core**
> that removes the `initialize` handshake and the protocol-level session. When it
> goes final, the kind's `spec_version` is re-pinned to `2026-07-28` and the
> capability/handshake checks are version-gated. Until then, enforce `2025-11-25`.
> Do not pre-adopt the RC.

## The invariants this project commits to

**Core (a violation FAILs the checker):**

1. **A launch manifest declares how the server starts** — `command` + `args` (and,
   implicitly or explicitly, the transport). A client cannot launch a server it
   cannot describe.
2. **The `tools` capability is declared** — the server announces it exposes tools
   (spec MUST). *(Version-gated: the 2026-07-28 RC's stateless core changes the
   handshake; this check is re-pinned at cutover.)*
3. **Every tool carries a non-null `inputSchema`** — per the spec schema, `name` and
   `inputSchema` are the only REQUIRED tool fields. A tool with no input contract is
   unroutable and unvalidatable.
4. **Tool inputs are validated** — spec MUST: *"Servers MUST validate all tool
   inputs."* A schema-validating decorator / `zod` parse / type-annotated params the
   SDK validates against satisfies this; bare untyped `**kwargs` does not.
5. **No hardcoded secrets or absolute machine paths** — not in the server source, not
   in the launch manifest. Resolve paths at runtime; read secrets from the
   environment. *(This is the check that flags an `.mcp.json` pinning absolute
   `C:/Users/...` command/args/cwd.)*

**Module (a violation WARNs — best practice, not spec-mandated):**

6. **Every tool has a description/docstring.** The spec marks `description` OPTIONAL,
   but the model *routes* on it; a weak or missing description is the most-cited
   tool-selection bug. WARN.
7. **Tool names are valid** — 1–128 chars, `[A-Za-z0-9_.-]`, unique within the server.
8. **The error model is spec-shaped** — the spec's DUAL model: protocol errors as
   JSON-RPC `{code, message}`, tool-execution errors as `isError: true` in the
   `CallToolResult` content. Not a bespoke `{error, ...}` object thrown across the
   boundary.
9. **The transport is explicit** — `stdio` or streamable-HTTP. A manifest with
   `command`/`args` implies stdio; an HTTP server declares its endpoint.
10. **Repo-agnostic — CONDITIONAL.** See below.
11. **The maintain doc names the Inspector CLI** as the dynamic conformance runner.

## Repo-agnostic (CONDITIONAL — target-repo servers only)

This invariant fires **only** for a server that operates on an **external repo passed
per call** (a "target-repo" server, e.g. a code-intelligence server that answers
questions about whatever repository the caller names). Such a server MUST take the
target as a **per-call parameter with no hidden default root** — the operator-locked
`project_root`-required-per-call contract.

It **does not apply** to a single-target, local-fleet server (one that only ever acts
on its own host — e.g. a local model-routing server). Forcing a `project_root`
parameter onto an inherently single-target server would be a scoping error, not a
conformance win. If this project's server is single-target, mark this section
**N/A** and the checker will not fire it.

- [x] This server is a **target-repo** server (per-call target, no default root) — OR —
- [ ] This server is **single-target** (this invariant is N/A).

**This project (coderef-core) is a target-repo server.** `coderef-mcp-server` exposes
**34 tools** (TS SDK) that answer questions about *whatever* repository the caller
names: every `mcp__coderef-core__*` call takes a **required `project_root`** parameter
and there is **no default/hidden root** (the operator-locked any-repo contract shipped
in WO-MCP-REPO-AGNOSTIC-ANY-REPO-001). The checker fires this invariant and PASSES it;
this section affirms that posture.

## Server instructions + write scope (agent-facing contract)

The server declares its own usage contract through the `initialize` handshake
(`ServerOptions.instructions`, shipped in WO-CODE-INTELLIGENCE-LEVERAGE-WIRING-PROGRAM-001
P1): `project_root` required per call, populate-first (`reindex` before querying an
unindexed/stale repo), skeleton-map orientation, prefer-graph-over-grep, and
surfaces-not-verdicts. The **write-scope rule** is part of that contract and of this
standard's posture: **no MCP tool writes source files.** `coderef-rename --apply` is
CLI-only by design — MCP exposes `rename_preview` only. Index writes (`reindex`,
`rag_index`, `map`, `api_diff` snapshot) are confined to `<project_root>/.coderef/`.
The mcp-server test suite pins the instructions string's load-bearing tokens
(`project_root`, `reindex`, `skeleton`, `rename_preview`) and fails on tool-count drift.

## Maintain-time: the MCP Inspector CLI is the dynamic companion

A static checker cannot prove the server starts and lists its tools. The **MCP
Inspector CLI** (`@modelcontextprotocol/inspector`) is the dynamic runner that does:
it speaks `tools/list` and `tools/call` over stdio/http and emits JSON for CI.

Run it against this server as part of maintenance / release:

```bash
npx @modelcontextprotocol/inspector --cli <launch-command> --method tools/list
```

Wire that into the project's conformance loop (CI or a release checklist) so the
behavioral half — "does it actually enumerate its tools?" — is covered alongside the
structural half this standard's checker enforces.

## Verify

```bash
node SKILLS/STANDARDS/kinds/mcp/check.mjs --project-root=<ABS> --standard=<ABS>/docs/standards/mcp.md --json
```

Exit `0` PASS/not-applicable · `1` WARNING · `2` FAIL · `3` error.

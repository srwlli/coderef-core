---
kind: entry-point
status: living
title: "coderef-core — Entry-Point Inventory"
updated: 2026-07-31
---

# coderef-core — Entry-Point Inventory

> The enumerated registry of every declared front door. **One row per door — no blanket
> rows.** This is the table the checker reads: it resolves each `Target` path on disk
> (`entry-point.doors-resolve`) and compares each `Advertises` count to the real surface
> (`entry-point.advertises-true-surface`).

## Columns

- **Variant** — `agent` | `user` | `context` (the audience the door serves).
- **Door** — the front door's name (a manifest, a doc, the handshake).
- **Target** — what it resolves to. A **repo-local path** in `backticks` is resolved on
  disk. A non-path door (the MCP handshake, an out-of-repo doc) is prose, not a path.
- **Advertises** — the surface it states, if any. Compared to the real countable surface.

## Inventory

| Variant | Door | Target | Advertises |
|---------|------|--------|------------|
| agent | MCP server manifest | `.mcp.json` | launches `coderef-mcp-server` via `npx`; no absolute machine paths, no default repo |
| agent | MCP `initialize` handshake | handshake (no path) — instructions string built at `src/cli/coderef-mcp-server.ts` | 37 tools + the 6-clause usage contract |
| agent | MCP server implementation | `src/cli/coderef-mcp-server.ts` | 37 `registerTool` blocks |
| agent | Agent usage contract | `AGENTS.md` | the repo's agent-facing rules |
| user | Using guide | `USING-CODEREF.md` | the human capability tour |
| user | Repository front page | `README.md` | 37 tools |
| user | Quick start | `coderef-core-quickstart.md` | install → build → test → CLI verify |
| user | Full feature guide | `guide-to-coderef-core.md` | the complete tour |
| user | CLI reference | `docs/CLI.md` | 37 tools; the bin surface |
| user | Published bin map | `package.json` | 21 `bin` entries → 19 distinct CLI targets |
| context | Loaded context pointer | `CLAUDE.md` | `@import`s the ASSISTANT-owned project CONTEXT |
| context | Project CONTEXT | prose — ASSISTANT-owned, outside this repo (PROJECT-CONTEXT / CODEREF-CORE / CONTEXT.md); deliberately un-backticked, since it is not a repo-local path and must not be resolved as one | 37 tools; the CLI bin table |

## Notes on the counts

- **37 tools** is the live MCP surface. It is asserted in exactly one place in code —
  `SERVER_TOOL_COUNT` — which is interpolated into the instructions string and the
  startup log, and it currently matches the **37** `server.registerTool` blocks in the
  same file. Verified equal at the time of writing.
- **21 bin entries → 19 distinct targets.** Two alias pairs point at one script each:
  `validate-routes` / `coderef-validate-routes`, and `scan-frontend-calls` /
  `coderef-scan-frontend-calls`. Quoting 21 or 19 are both defensible; the distinction is
  recorded here so neither number reads as an error later.
- `CHANGELOG.md` mentions **36** and **34** tools in older entries. Those are historical
  records of past surface sizes and are correct as history — they are deliberately not
  updated.

## The two doors that carry the most risk

1. **The `initialize` handshake** is the only door most agents ever read, and it is
   generated from `SERVER_TOOL_COUNT`. A tool added without bumping that constant makes
   every agent-facing surface lie at once. The constant carries an in-code note to bump it
   on any registration change, and a test asserts the pairing.
2. **The out-of-repo CONTEXT door** cannot be validated by this repo's checker, because
   its target lives in a sibling repo. It is declared here as prose precisely so that
   its unvalidatable status is visible rather than assumed-fine.

---

*Conforms to the `entry-point` kind. Authority root: [`README.md`](README.md).*

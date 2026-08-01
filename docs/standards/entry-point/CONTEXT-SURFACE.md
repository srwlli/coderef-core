---
kind: entry-point
status: living
title: "coderef-core — Context Surface Contract"
updated: 2026-07-31
---

# coderef-core — Context Surface (the `context` variant)

> The **loaded** doc estate — the docs agents actually read on entry — must state the
> TRUE surface and link the user guide. This is the variant most prone to the lying-door
> bug: a CONTEXT.md that is silent on, or wrong about, the real tool/bin count gives every
> entering agent a false map of the capability.

## coderef-core's loaded estate

| Surface | Path | Loaded how |
|---|---|---|
| Tool-pointer shim | `CLAUDE.md` | read on entry; `@import`s the project CONTEXT |
| Tool-pointer shim | `GEMINI.md` | read on entry by its own tool |
| Agent rules | `AGENTS.md` | repo-local agent contract |
| Project CONTEXT | ASSISTANT-owned, outside this repo | pulled in via the `CLAUDE.md` import |

**The structural fact that matters here:** coderef-core's CONTEXT.md **does not live in
this repository.** It is ASSISTANT-owned and reaches agents through the `CLAUDE.md`
import. Every other project in the fleet can validate its own context door with its own
checker; this one cannot.

## What the loaded estate must state

1. **The true surface — 38 tools, 21 bin entries (19 distinct CLI targets).** This is the
   number `entry-point.advertises-true-surface` compares against reality. The MCP count is
   machine-guarded in code (`SERVER_TOOL_COUNT`, with a test that counts `registerTool`
   registrations and fails on drift), but **that guard does not extend across the repo
   boundary** — nothing fails if the out-of-repo CONTEXT.md goes stale.
2. **The USING guide link** — `USING-CODEREF.md` exists in this repo and the loaded estate
   should route to it by name.
3. **The agent entry-point pointer** — the handshake contract and the question → tool
   decision table, so an entering agent is told *how* to invoke the capability rather than
   merely that it exists. See [`AGENT-ENTRY-POINT.md`](AGENT-ENTRY-POINT.md).

## The rule

The loaded estate is the capability's **honest mirror**. When the surface changes — a tool
added, a bin removed — the estate is updated in the SAME motion. An advertised count is a
claim, and a claim that has drifted is a lying door.

## Known gap — the cross-repo blind spot

The in-repo advertised counts are all currently correct and verified: `README.md`,
`docs/CLI.md`, `docs/ARCHITECTURE.md` and the handshake all state 37, matching the 37
registrations. (`CHANGELOG.md`'s 36 and 34 are historical entries and correctly left
alone.)

The gap is **structural, not a current defect**: because the project CONTEXT lives in a
sibling repo, a tool added here can be shipped with green checkers in this repo while the
out-of-repo context door silently goes stale. The `SERVER_TOOL_COUNT` drift test guards
the in-repo surfaces; nothing guards the cross-repo one.

Recorded here rather than resolved, because closing it means either a cross-repo check or
relocating the context door — a fleet-convention decision, not a CORE-local fix.

## Inventory rows this doc contributes

Two `variant: context` rows: `CLAUDE.md` (repo-local, resolves) and the project CONTEXT
(prose — deliberately not written as a repo-local path, since it is not one).

---

*Conforms to the `entry-point` kind. Authority root: [`README.md`](README.md).*

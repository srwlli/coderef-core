---
kind: entry-point
status: living
title: "coderef-core — Entry-Point Standard"
updated: 2026-07-31
---
<!-- Authored by /standards-establish from SKILLS/STANDARDS/kinds/entry-point/template/README.md.
     This is the PROJECT's standard for the "entry-point" kind. Edit to fit the project;
     re-run /standards-update when the ecosystem template evolves. -->


# coderef-core — Entry-Point Standard (authority root)

> **The One Rule:** a shipped capability must have **discoverable front doors** — a
> defined path by which each audience learns the capability exists and how to use it.
> A front door must **(1) RESOLVE** (point at a target that exists) and **(2) STATE
> THE TRUE SURFACE** (advertise the real inventory, not a stale or wrong one).

This bundle governs **coderef-core's entry-points**. It is the authority root: it names
the invariant, the audience variants, the two failure modes, and the reading order.
The per-variant contracts and the enumerated inventory live in the sibling docs.

## Why this exists — the two bug classes

Every entry-point failure is one of two shapes:

- **Dangling door** — a front door references a target that does not exist (a skill
  referenced in a wrapper before it was built; a doc linking a page that 404s). An
  agent or user is routed to nothing. → `entry-point.doors-resolve` **FAILs** this.
- **Lying door** — a front door advertises a surface that is not real (a CONTEXT.md
  silent on, or wrong about, the true tool/bin count). The consumer forms a false map
  of the capability. → `entry-point.advertises-true-surface` **WARNs** this.

## The three audience variants (the axis = who the door serves)

| Variant | The front door | Contract doc |
|---------|----------------|--------------|
| **agent** | the MCP `initialize` handshake carrying the usage contract; the skill/tool front-doors; the question→tool decision table | [`AGENT-ENTRY-POINT.md`](./AGENT-ENTRY-POINT.md) |
| **user** | the human's using-guide — named **`USING-[WHAT-IT-IS].md`** (e.g. `USING-coderef-core.md`); README; quickstart | [`USING-TEMPLATE.md`](./USING-TEMPLATE.md) |
| **context** | the *loaded* doc estate — `CONTEXT.md`, the orchestrator/fleet table, the project-context template — stating the true surface with the USING guide linked | [`CONTEXT-SURFACE.md`](./CONTEXT-SURFACE.md) |

> **Naming convention (locked):** the **user**-variant guide is named
> **`USING-[WHAT-IT-IS].md`** — the `[WHAT-IT-IS]` token is the capability's own name
> (`USING-CODEREF.md`), not the audience.

## Doc map + reading order

1. **This README** — the invariant, variants, bug classes.
2. [`ENTRY-POINT-INVENTORY.md`](./ENTRY-POINT-INVENTORY.md) — the enumerated registry:
   one row per declared front door (variant · door · target it resolves to · surface it
   advertises). This is what the checker reads to resolve doors and compare counts.
3. The three variant contracts (`AGENT-ENTRY-POINT` · `USING-TEMPLATE` ·
   `CONTEXT-SURFACE`) — what each audience's door must contain.
4. [`AGENT-CHECKLIST.md`](./AGENT-CHECKLIST.md) — the pre-flight gate to run before
   shipping a capability change.
5. [`AUDITS/audit-procedure.md`](./AUDITS/audit-procedure.md) — the recurring
   drift-detection pass; reports land in `AUDITS/`.

## What GREEN means

- `entry-point.standard-established` (core) — this bundle exists.
- `entry-point.inventory-non-empty` (core) — at least one door is declared.
- `entry-point.doors-resolve` (core) — **every** path-target door resolves on disk.
- `entry-point.advertises-true-surface` (module) — advertised counts match reality.
- `entry-point.using-guide-linked` · `variants-declared` · `checklist-present` (module)
  — the discoverability WARNs are clear.

Run: `node SKILLS/STANDARDS/kinds/entry-point/check.mjs --project-root=<ABS> --json`.

## coderef-core's doors at a glance

12 declared doors across all three variants — see
[`ENTRY-POINT-INVENTORY.md`](./ENTRY-POINT-INVENTORY.md) for the enumerated table.

| Variant | Doors | Advertised surface |
|---|---|---|
| **agent** | `.mcp.json`, the `initialize` handshake, `src/cli/coderef-mcp-server.ts`, `AGENTS.md` | 37 tools + the six-clause usage contract |
| **user** | `USING-CODEREF.md`, `README.md`, `coderef-core-quickstart.md`, `guide-to-coderef-core.md`, `docs/CLI.md`, `package.json` | 37 tools; 21 bin entries → 19 distinct CLI targets |
| **context** | `CLAUDE.md`; the project CONTEXT (ASSISTANT-owned, out of repo) | 37 tools; the CLI bin table |

Two properties of this project shape how the invariant applies here:

1. **All 37 tools share ONE agent door.** There are no per-tool wrappers, so a tool
   cannot exist without appearing in the handshake count — the dangling-door class is
   structurally suppressed on the agent side.
2. **The context door is out of repo,** so the lying-door class is *not* fully
   guardable here. See
   [`CONTEXT-SURFACE.md`](./CONTEXT-SURFACE.md#known-gap--the-cross-repo-blind-spot).

## Provenance

This bundle was authored by `/standards-establish --kind=entry-point` and then tailored
to CORE's real surface (WO-CODEREF-CORE-STANDARDS-CONFORMANCE-BURN-DOWN-8-STANDARDS-001,
Phase 4).

Note the circularity, since it is easy to misread: the ecosystem *template* this bundle
came from was itself extracted from CODEREF-CORE's shipped entry-point surfaces — the MCP
handshake usage contract (agent), a context table stating the real surface (context), and
`USING-CODEREF.md` (user). So CORE is both the shape's origin and, as of this bundle, a
graded instance of it. The template's original note that it "does not retro-enforce
against CORE" no longer applies: this copy **is** the retro-enforcement, and it passes.

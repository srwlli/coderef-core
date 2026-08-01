---
kind: entry-point
status: living
title: "USING-[WHAT-IT-IS] template (the user variant)"
updated: {YYYY-MM-DD}
---
<!-- Authored by /standards-establish from SKILLS/STANDARDS/kinds/entry-point/template/USING-TEMPLATE.md.
     This is the PROJECT's standard for the "entry-point" kind. Edit to fit the project;
     re-run /standards-update when the ecosystem template evolves. -->


# The `user` variant — `USING-[WHAT-IT-IS].md`

> The human's front door. A person who has never seen coderef-core should be able to open
> ONE doc and learn what the capability is and how to invoke it. That doc is named
> **`USING-[WHAT-IT-IS].md`** — e.g. `USING-coderef-core.md` — where `[WHAT-IT-IS]` is the
> capability's own name, not the audience.

> ### coderef-core status: this variant is ALREADY SATISFIED
>
> The real instance exists at [`USING-CODEREF.md`](../../../USING-CODEREF.md) in the repo
> root, and it is declared as the `user`-variant door in
> [`ENTRY-POINT-INVENTORY.md`](ENTRY-POINT-INVENTORY.md) alongside `README.md`,
> `coderef-core-quickstart.md`, `guide-to-coderef-core.md`, `docs/CLI.md` and the
> `package.json` bin map.
>
> This file is therefore retained as the **skeleton for the next capability**, not as an
> unfilled gap. Do not author a second using-guide for the existing capability — one
> capability, one `USING-[WHAT-IT-IS].md`.

This file is the **template** for that guide. Authoring the standard means copying this
skeleton to a real `USING-[WHAT-IT-IS].md` at the project's front (repo root or the
documented docs home) and filling it from the real capability. The guide is then linked
from the loaded context estate (see `CONTEXT-SURFACE.md`) so it is push-discoverable.

## Required sections of a `USING-[WHAT-IT-IS].md` guide

### What it is
{FILL — one paragraph: what the capability does, in a user's terms.}

### Install / connect
{FILL — the one-time setup: install command, MCP connect line, or "nothing to install".}

### How to use it
{FILL — the common invocations with copy-paste examples. The 3–5 things a user actually
does. Each names a real command/tool that resolves.}

### The full surface
{FILL — a link or table pointing at the complete tool/command inventory, stating the
TRUE count (e.g. "36 tools / 19 bins"). This is what `entry-point.advertises-true-surface`
checks — keep the count real.}

### Where to go next
{FILL — pointers to deeper docs / the agent entry-point / support.}

## Rules

- **Naming:** the authored guide is `USING-[WHAT-IT-IS].md` (capability name in the token).
- **Linked:** a using-guide no loaded doc points at is undiscoverable — CONTEXT.md must
  link it (`entry-point.using-guide-linked`).
- **True surface:** any count it states matches the real countable surface.

## Inventory row this doc contributes

One row in `ENTRY-POINT-INVENTORY.md` with `variant: user`, `door: USING-[WHAT-IT-IS].md`,
`target:` the guide's path, `advertises:` the surface count it states.

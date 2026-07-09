---
kind: agent-docs-structure
title: Agent Docs Structure Standard
status: living
updated: 2026-06-16
summary: How an agent organizes, structures, and consolidates its docs/ folder — shelve by LIFECYCLE STATE, not topic.
---

<!-- Authored by /standards-establish from SKILLS/STANDARDS/kinds/agent-docs-structure/template/agent-docs-structure.md.
     This is the PROJECT's standard for the "agent-docs-structure" kind. Edit to fit the project;
     re-run /standards-update when the ecosystem template evolves. -->

# Agent Docs Structure Standard

> **Kind:** `agent-docs-structure` · **Registry:** `SKILLS/STANDARDS/kinds/`
> This is the ecosystem TEMPLATE an agent authors a project's standard FROM (via
> `standards-establish`). The authored output lives at the project's
> `docs/standards/agent-docs-structure.md`. The enforceable twin is `check.mjs`.
> Authored by ASSISTANT from the PRIMARY-SOURCES 4-agent design competition
> (ASSISTANT-038); SKILLS integrated it + authored the checker (SKILLS-012).

How an agent organizes its `docs/` folder. The axis is **lifecycle state, not topic**
— four PS agents independently converged on this; that convergence is the standard.
Topic-foldering scatters a doc's lifecycle and forces two-topic docs to pick one;
lifecycle is the stable axis.

## CORE (universal — every project, REQUIRED)

### 1. Three lifecycle shelves
Every doc sits on exactly one shelf:
- **LIVING** — root (non-archive); must stay true to reality now; drift is a bug.
  Living docs may be ALL-CAPS contracts OR lowercase references — both valid.
- **DATED** — a `records/` (or `as-built/`) dir; true as-of a date; **append-only,
  NEVER rewritten** (rewriting falsifies history). NOTE: do NOT use `plans/` for
  this — `plans/` is the forward-looking PLANNER tier (per PLANNER-CODER-DOC-
  BOUNDARY); a `plans/` dir full of dated records is a common ANTI-PATTERN.
- **SUPERSEDED** — an `_archive/` dir; replaced; kept with a redirect banner
  pointing to the replacement.

### 2. Top-level = LIVING canon only
A doc earns a root (non-archive) slot only by being a **durable contract** or a
**living index**. Everything else is born in a subfolder or graduates out of the
reading flow once its decision lands. (Same "earn your place" discipline as the
scripts-README standard.)

### 3. ALL-CAPS = "this is a contract/standard"
**ALL-CAPS-KEBAB names mark living CONTRACTS and STANDARDS** (durable rules:
`ARCHITECTURE.md`, `GUI.md`, `SECURITY.md`) — NOT every living doc. A living
**reference** may stay lowercase (`legal.md`, `mf-collection.md` are legitimate
living refs). The **shelf** (root = living / `records/` = dated / `_archive/` =
superseded) carries lifecycle; CAPS is a *sub-signal* for contract-grade docs
only. Do not rename a lowercase living reference just to make it CAPS, and do not
treat a lowercase root doc as mis-shelved. (SM-pilot finding 1, 2026-06-16.)

### 4. Dated tier is append-only
Rewriting a dated record falsifies history. Add a new dated entry; never edit an
existing one.

### 5. One README/INDEX = the single entry point
One purpose-grouped index you read instead of `ls`. (Mirrors the scripts/README
standard.)

## MODULES (conditional — include ONLY when the condition applies)

- **reference/ distinct from _archive/** — delivered design docs that explain WHY
  the shipped thing is shaped that way ("read me to understand the build") vs frozen
  history ("ignore me"). *Include only when* you have delivered-but-still-useful
  design docs.
- **Lifecycle gate** — when a forward spec SHIPS, it moves to `reference/` and gets a
  `Shipped: <path>` backlink. *Include when* the project has a Planner↔Coder boundary.
- **Per-purpose archive subfoldering** — `_archive/apply-logs/`, `_archive/discovery/`,
  `_archive/measurements/`. *Include only above ~50 docs*; below that it is ceremony.
- **HTML render artifacts out of the md reading flow** — charts/site-renders in
  `charts/`, not mixed with reading docs. *Include when* the project emits render artifacts.
- **Scale threshold** — flat below ~12-15 docs; subfolder above. (Same threshold the
  scripts-README standard uses — the two standards SHARE one number.)

## THE ONE HARD SAFETY RULE
A structural move **MUST rewrite inbound links in the SAME commit**. The index +
cross-doc links reference docs by path; a blind move breaks the index. A structured
move is fine IF refs are fixed atomically.

**Cross-domain clause (SM-pilot finding 2, 2026-06-16 — CRITICAL at scale):**
inbound references MUST be **path-scoped** (`services/<x>/docs/<file>`), never a
bare filename. Bare names are ambiguous across domains — PS-APP, PS-ARCHIVE, and
SM can each hold a `docs/MEMORY-SALVAGE-REPORT.md`, so a bare `[x](MEMORY-SALVAGE-
REPORT.md)` cannot be safely resolved or rewritten. When a moved doc has inbound
refs from ANOTHER domain, the mover does NOT edit them — it ships a **FLAG to the
owning domain** to fix its own refs. The checker treats a bare-filename inbound
ref as a WARN (fragile), and a missing path-scoped ref as a FAIL (broken move).

## Why CORE+MODULES (not one flat template)
CORE is true for ANY project (web app, ML, archive). MODULES are the
archival-data-shaped parts (retain-spent-records, reference/-vs-archive) separated
so the standard is genuinely project-agnostic — not an archive-data template wearing
a universal label. (Same design as the scripts-readme-template CORE+MODULE.)

## Conformance (what `check.mjs` verifies)
A docs/ folder PASSES when: a README/INDEX entry point exists, every doc sits on a
valid lifecycle shelf, living canonical (top-level) docs are ALL-CAPS-KEBAB named,
no superseded/spent docs sit in the live reading flow, dated docs are not rewritten,
and structural moves rewrote inbound links (no index entry points at a missing
file). Module checks (subfoldering past threshold, reference/-vs-_archive/) warn
when their condition is met but the convention is not followed. `applicable=false`
when the project has no `docs/` folder.

---

*Authored from `SKILLS/STANDARDS/kinds/agent-docs-structure/template.md` v1.0.0.*

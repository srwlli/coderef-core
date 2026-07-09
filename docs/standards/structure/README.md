---
kind: structure
title: Project Structure Standard — Existence · Layout · Tree-Separation
status: living
updated: 2026-07-07
---

<!-- Authored by /standards-establish from SKILLS/STANDARDS/kinds/structure/template/README.md.
     This is the PROJECT's standard for the "structure" kind. Edit to fit the project;
     re-run /standards-update when the ecosystem template evolves. -->

# Project Structure Standard — Existence · Layout · Tree-Separation

> **Kind:** `structure` · **Registry:** `SKILLS/STANDARDS/kinds/`
> This is the authority-root README of the ecosystem BUNDLE an agent renders a
> project's structure standard FROM (via `standards-establish`). The rendered
> bundle lives at the project's `standards/structure/` (this README + the
> `LAYOUT/TEMPLATE.md` per-declaration spec + the enumerated `LAYOUT/AUDIT.md`
> inventory). The enforceable twin is `check.mjs`. This README is itself a
> conformant doc — copy its shape. **Universal, not project-specific:** it tells you
> WHAT must exist and WHAT to declare; the VALUES (the concrete homes, the promoted
> checks) are yours.
>
> Companion files in this bundle:
> - `LAYOUT/TEMPLATE.md` — the per-declaration `role → dir(s)` spec an agent fills.
> - `LAYOUT/AUDIT.md` — the enumerated declared-homes inventory the agent maintains.
>
> Agent-facing lifecycle docs (at the kind): `establish-structure-standards.md` (stand
> it up), `maintain-structure-standards.md` (keep it healthy).

The `structure` kind owns **WHAT must EXIST and WHERE**: a project's layout should be
predictable (anyone can guess where code, docs, scripts, tests live), its planning
artifacts must never intermix with shipped code, and the canon files every project
needs must be present. This kind asserts **EXISTENCE** (does the required file
exist?); the `documentation` kind asserts **SHAPE** (is it shaped right?), and the
`data` kind governs the persisted model. It is the existence-side sibling of that set.

> **Universality rule (the whole point):** every requirement below is phrased as
> *"a project must declare X"* or *"a required file must EXIST"*, never *"X must equal
> a specific value."* The checker verifies a project HAS its required files and a
> non-overlapping tree separation; it never hardcodes one project's directory names.
> One project declares `src/` + `coderef/`; another declares `packages/` + `planning/`
> — **same kind, different values.**

## The two seams: EXISTENCE (triggers) and LAYOUT (declarations)

The kind has two concerns, and this bundle is organized around them:

1. **EXISTENCE** — trigger → required-file rules (this README declares the model;
   the triggers live in `kind.json` so the checker reads them data-driven). A
   *trigger* is a condition; when met it REQUIRES files to exist.
2. **LAYOUT** — the project's declared `role → dir(s)` homes (`LAYOUT/TEMPLATE.md`)
   and the rolling inventory of those homes with existence/overlap state
   (`LAYOUT/AUDIT.md`). The load-bearing layout rule is the **tree-separation
   invariant** (below).

## EXISTENCE — trigger → required-file (the existence model)

The checker FAILs a **core** trigger on a missing required file (it does not grade
contents — that is documentation's job) and WARNs a **module** trigger. Add a trigger
= add a required-file rule (in `kind.json`).

| trigger | when | requires | level |
|---|---|---|---|
| `project` | always | `README.md` at root | **core** |
| `project` | always | `VISION.md` at root | **module** (opt-in promote to core) |
| `scripts-dir` | a `scripts/` dir exists | `scripts/README.md` in it | **core** |
| `context-doc` | always | `CONTEXT.md` at root | **module** (opt-in promote to core) |
| `agents-doc` | always | `AGENTS.md` at root | **module** (opt-in promote to core) |
| `standards-kind` | the project IS the kinds registry | the 5-file toolkit bar per kind dir | **core** |

### The core existence baseline vs. the module signals

- **`README.md` is universal core.** Every project — leaf, library, service, monorepo
  — carries a root README that names the layout. A missing root README hard-FAILs.
- **`VISION.md`, `CONTEXT.md`, `AGENTS.md` are module (WARN) by default.** They are
  load-bearing for an ecosystem *domain* (every domain carries a CONTEXT.md + AGENTS.md
  + a product VISION.md), but a bare leaf/library repo legitimately has none — so a
  hard-FAIL there would be a false negative. They surface as WARN drift signals, and a
  project that IS vision/context/agent-bearing **promotes them to core** in its
  declaration (see *Promoting a module check to core* below). `scripts/README.md`'s
  existence is core (its SHAPE is the documentation `scripts-readme` doc-type — this is
  where the dissolved scripts-readme kind's existence rule landed).

### Promoting a module check to core (the opt-in)

A project that considers a module-level required file mandatory for ITSELF promotes it
by declaring the trigger id in a `promote` row of `LAYOUT/TEMPLATE.md`:

```markdown
| promote | vision, context, agents |
```

The checker reads that row and lifts the named module triggers to core/FAIL **for
this project only** — the ecosystem default stays WARN, the project opts into the
stricter bar. This is how a domain repo enforces its CONTEXT.md/AGENTS.md without
forcing every leaf repo to carry them.

## LAYOUT — the declared homes

### 1. A declared home for documentation

Documentation lives in one declared place — conventionally `docs/` (which is also
where the per-project docs/ site renders from). A project that keeps docs elsewhere
DECLARES that home in `LAYOUT/TEMPLATE.md` so it is discoverable, not implicit.

### 2. The tree-separation invariant (the load-bearing rule)

**The planner tree and the coder tree are separate, declared trees that DO NOT
OVERLAP — independent of who touches them.**

- **Planner tree** — roadmaps, designs, specs, work orders, discovery notes: the
  intent and the record of decisions. (e.g. `coderef/`, `planning/`, `docs/design/`.)
- **Coder tree** — the shipped source the project actually runs. (e.g. `src/`, the
  service/package dirs.)

This is a **tree-separation invariant, not a role rule.** The trees must not overlap
whether a project has separate planner and coder agents or a single agent that both
plans and codes. The point is not *who* edits — it is that a planning record and a
runtime source file never occupy the same path, so authoring a spec can never silently
land in the runtime path and editing source can never silently overwrite a decision
record. A solo planner-coder agent is bound by the invariant exactly as a two-agent
team is. Each project DECLARES which dirs are planner vs coder in `LAYOUT/TEMPLATE.md`;
the checker enforces that the two sets do not intersect.

### 3. Tests home (module)

If the project has tests, they live in a conventional location — `tests/`, `test/`,
`__tests__/`, or co-located by a declared convention (e.g. `*.test.ts` beside source).
Declare which. A drift signal, not a hard gate.

### 4. Scripts home (module)

If the project has tooling/automation scripts, they live under `scripts/` (or a
declared equivalent). This dovetails with the `scripts-dir` existence trigger above
(the dir's presence requires a `scripts/README.md`).

### 5. No stray top-level source (module)

The project root is not littered with loose source files that belong inside a declared
subtree. Config and entry files at root are fine; scattered modules are a smell — a
WARN, not a FAIL.

## How a project DECLARES its structure

In `LAYOUT/TEMPLATE.md`, fill a `role → dir(s)` table the checker reads (via
`--standard` pointed at the bundle README, which resolves the sibling LAYOUT docs):

```markdown
| role | dir(s) |
|---|---|
| docs | docs/ |
| code | src/ |
| scripts | scripts/ |
| tests | tests/ |
| planner | coderef/, planning/ |
| coder | src/ |
```

The checker uses these declarations to verify the dirs exist and that the planner and
coder sets do not intersect. Without a declaration it falls back to conventional-name
detection. `LAYOUT/AUDIT.md` enumerates each declared home with its on-disk
existence + overlap state — one row per role, no blanket rows.

## Conformance (what `check.mjs` verifies)

For any project (structure is universally applicable), the checker verifies: the
**core** existence triggers (root `README.md`; `scripts/README.md` where a `scripts/`
dir exists; the standards-registry 5-file bar where the project IS the kinds registry)
PASS; documentation has a discoverable home; and the planner and coder trees **do not
overlap** (the tree-separation invariant). The **module** checks — `VISION.md` /
`CONTEXT.md` / `AGENTS.md` existence, tests home, no stray top-level source — WARN
when their condition is met but the convention is not followed, and a project may
PROMOTE any of the module existence triggers to core for itself. The checker never
asserts a project's specific directory names — only that its required files exist and
its trees are separated.

## The self-governing case (the registry as a project)

`structure` is also the kind that **governs the standards registry itself.** Pointed
at `SKILLS/STANDARDS/kinds/` as its project-root, the `standards-kind` trigger asserts
that every `kind.json`-marked dir carries the 5-file toolkit bar (`kind.json` +
`check.mjs` + a template — `template.md` OR a `template/` bundle dir — +
`establish-<kind>-standards.md` + `maintain-<kind>-standards.md`). This is the rulebook
governing itself: the same generic checker that grades any project grades the registry.
The registry's own authored standard is `SKILLS/STANDARDS/kinds/docs/standards/structure.md`.

## Conforming instance #1 — the standards registry (reference, not a requirement)

`SKILLS/STANDARDS/kinds/` is the first conforming instance: it declares the
`standards-kind` trigger's 5-file bar as its structure standard and passes its own
checker. A different project — a service, a library, a monorepo — fills the same
existence + layout rows with entirely different values. The kind is the same.

---

*Authored from `SKILLS/STANDARDS/kinds/structure/template/README.md`.*

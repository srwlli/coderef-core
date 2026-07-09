---
kind: execution
title: Executor Standard — Generation · Contracts · Topology · Write-Discipline
status: living
updated: 2026-07-05
---

<!-- Authored by /standards-establish from SKILLS/STANDARDS/kinds/execution/template/README.md.
     This is the PROJECT's standard for the "execution" kind. Edit to fit the project;
     re-run /standards-update when the ecosystem template evolves. -->

# Executor Standard — Generation · Contracts · Topology · Write-Discipline

> **Kind:** `execution` · **Registry:** `SKILLS/STANDARDS/kinds/`
> This is the authority-root README of the ecosystem BUNDLE an agent renders a
> project's executor-surface standard FROM (via `standards-establish`). The
> rendered bundle lives at the project's `standards/execution/` (the four sub-type
> docs an agent authors, the per-surface `SURFACES/TEMPLATE.md`, and the enumerated
> `SURFACES/AUDIT.md` inventory). The enforceable twin is `check.mjs`. This README
> is itself a conformant doc — copy its shape. **Universal, not project-specific:**
> it tells you WHAT to declare; the VALUES are yours.
>
> Companion files in this bundle:
> - `SURFACES/TEMPLATE.md` — the per-surface spec an agent fills for each governed executor surface.
> - `SURFACES/AUDIT.md` — the enumerated executor-surface inventory the agent maintains (a rolling-inventory record, **not** a fifth sub-type).
>
> Agent-facing lifecycle docs (at the kind): `establish-execution-standards.md`
> (stand it up), `maintain-execution-standards.md` (keep it healthy),
> `document-execution-standards.md` (generate the per-surface docs).

The `execution` kind governs a project's **EXECUTOR SURFACE** — the write/generate
side: how it deterministically produces artifacts and ids, validates them, lays
them out on disk, and commits + verifies its writes. It is the **executor DUAL of
`data`**: where `data` governs the read/model side (what objects ARE, how they are
identified, shaped, and sourced), `execution` governs the write/produce side. The
four sub-types map one-for-one onto `data`'s four:

| `execution` sub-type | dual of `data` sub-type |
|---|---|
| **generation** | keying |
| **contracts** | schema |
| **topology** | entities |
| **write-discipline** | provenance |

Like `data`, it is **one kind with a registry of SUB-TYPES inside**: four universal
sub-types every executor-bearing project declares.

> **Universality rule (the whole point):** every requirement below is phrased as
> *"a project must define X"*, never *"X must equal a specific value."* The kind's
> checker verifies a project HAS each sub-type in the canonical shape; it never
> hardcodes one project's generator, contract, path layout, or write tool. One
> project implements the four sub-types one way; another implements them
> differently — **same kind, different values.**

> **THE DEFINING INVARIANT — ROUTE, do not restate.** `execution` co-exists with
> `data` and with each project's own authority docs (e.g. PS-ARCHIVE's data
> standards). To avoid duplicating — and drifting from — rule text those
> authorities own, **every sub-type doc in this bundle must ROUTE to its governing
> authority (carry a pointer / cross-link) and MUST NOT restate the rule prose.**
> The checker validates that a doc asserting rule prose ALSO carries an authority
> pointer; it never validates the copied rule. A sub-type doc that restates a rule
> without pointing at its authority FAILs `subtype.<id>.routes-not-restates`. In
> practice: when a sub-type doc needs a rule, link to the doc that owns it
> (`see: <authority>`, `authority: <path>`, or a markdown link) instead of pasting
> the rule.

## The four sub-types

### 1. Generation — *how an artifact/id is deterministically produced* (dual of keying)

Declare the **pinned, deterministic generator**. This is the load-bearing sub-type.

- **REQUIRED — one output FORMAT.** Every artifact/id the generator emits gets ONE
  stable shape. Never a second output shape per artifact class.
- **REQUIRED — reproducible inputs only.** The generator derives its output from
  reproducible facts. **Non-reproducible inputs (random values, wall-clock
  timestamps, scan-order, absolute file paths) NEVER enter the pinned output.**
- **REQUIRED — determinism is the hard rule.** Same inputs → same artifact, across
  every run and surface. A cross-run mismatch is a non-determinism bug, not a
  variant.
- **REQUIRED — a refuse-to-emit guard.** When a required input is absent, the
  generator REFUSES to emit and flags for resolution rather than emitting a guessed
  artifact — emitting on a missing input asserts a false artifact that is expensive
  to unwind once consumers accrete.
- **ROUTE:** point at the authority that owns the generator's rule (the keying/id
  authority for this project); do not restate its ladder or format here.

### 2. Contracts — *the machine-validated artifact contracts* (dual of schema)

Declare the **authoritative contract** each generated artifact is validated against
so its shape is never re-discovered at write time.

- **REQUIRED — a single authoritative contract** per artifact class: the
  required/not-null fields, defaults, and reference shape the artifact must satisfy.
  An agent about to accept an artifact reads THIS instead of guessing its shape.
- **REQUIRED — validation before acceptance.** Every generated artifact is validated
  against its contract BEFORE it is accepted/committed. An unvalidated artifact is a
  defect, not a fast path.
- **REQUIRED — durable rulings.** The locked contract decisions (how to model an
  optional field, a versioned artifact, a migration) captured so they are not
  re-litigated.
- **ROUTE:** point at the schema/contract authority; do not paste the field list.

### 3. Topology — *the on-disk artifact inventory + canonical path resolvers* (dual of entities)

Declare the executor's **on-disk artifact inventory** and how each artifact's path
is deterministically resolved.

- **REQUIRED — the artifact set is NAMED.** Enumerate the output artifact classes the
  executor produces (the write-side analogue of naming entities).
- **REQUIRED — a canonical path resolver per artifact class.** Each artifact has a
  declared canonical location and a deterministic resolver — an artifact's path is
  COMPUTED from stable facts, never guessed at write time.
- **REQUIRED — no path collisions.** Two distinct artifacts never resolve to the
  same canonical path; the resolver is total and unambiguous over the artifact set.
- **ROUTE:** point at the entity/topology authority; do not redraw the tree here.

### 4. Write-discipline — *the rehearse → reconcile → commit → verify loop* (dual of provenance)

Declare the **write loop** that makes every write intentional and provable.

- **REQUIRED — rehearse.** A write is first rehearsed (dry-run / diff-preview) so its
  effect is visible before it lands.
- **REQUIRED — reconcile.** The rehearsed write is reconciled against its contract
  (§2) and topology (§3) — shape and location are confirmed before commit.
- **REQUIRED — commit.** The write is committed only after rehearse + reconcile pass.
- **REQUIRED — independent verify.** A SEPARATE read proves the write landed as
  intended (read-back / re-scan), distinct from the write itself. **Trust-on-write is
  the defect this sub-type exists to prevent.**
- **ROUTE:** point at the provenance / chain-of-custody authority; do not restate its
  verification vocabulary here.

## Conformance (what `check.mjs` verifies)

For an applicable project (it has an executor surface), the checker verifies a
standard for **each of the four sub-types is PRESENT** in the canonical shape — a
doc that declares generation (deterministic + format + refuse-guard), contracts
(authoritative contract + validate-before-accept), topology (named artifacts +
canonical path resolver), and write-discipline (rehearse + reconcile + independent
verify). A present sub-type doc is additionally checked for (a) the universal
markers its sub-type requires, and (b) **the DEFINING INVARIANT — that it ROUTES to
its authority rather than restating the rule** (a doc carrying rule prose without an
authority pointer FAILs). The checker **never** asserts a project's specific
generator, contract, paths, or write tool — only that the four sub-types are
governed and that each routes rather than duplicates.

## Conforming instance #1 — the executor domain (reference, not a requirement)

The first conforming instance is authored by the executor domain (SOURCE-MATERIAL
for the initial rollout) at its `services/{EXECUTOR}/docs/standards/execution/`,
AFTER the authority split is ratified. It implements the four universal sub-types
against that domain's real generator, contracts, on-disk layout, and write loop —
each sub-type ROUTING to the PS-ARCHIVE / domain authority that owns the underlying
rule. A different executor project fills the same four rows with entirely different
values (and different authority pointers). The kind is the same.

---

*Authored from `SKILLS/STANDARDS/kinds/execution/template/README.md`.*

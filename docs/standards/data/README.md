---
kind: data
title: Data Model Standard — Entities · Keying · Schema · Provenance
status: living
updated: 2026-06-17
---

<!-- Authored by /standards-establish from SKILLS/STANDARDS/kinds/data/template/README.md.
     This is the PROJECT's standard for the "data" kind. Edit to fit the project;
     re-run /standards-update when the ecosystem template evolves. -->

# Data Model Standard — Entities · Keying · Schema · Provenance

> **Kind:** `data` · **Registry:** `SKILLS/STANDARDS/kinds/`
> This is the authority-root README of the ecosystem BUNDLE an agent renders a
> project's data-model standard FROM (via `standards-establish`). The rendered
> bundle lives at the project's `standards/data/` (the four sub-type docs an agent
> authors, the per-entity `ENTITIES/TEMPLATE.md`, and the enumerated
> `ENTITIES/AUDIT.md` inventory). The enforceable twin is `check.mjs`. This README
> is itself a conformant doc — copy its shape. **Universal, not project-specific:**
> it tells you WHAT to declare; the VALUES are yours.
>
> Companion files in this bundle:
> - `ENTITIES/TEMPLATE.md` — the per-entity-type spec an agent fills for each entity.
> - `ENTITIES/AUDIT.md` — the enumerated entity inventory the agent maintains.
>
> Agent-facing lifecycle docs (at the kind): `establish-data-standards.md` (stand
> it up), `maintain-data-standards.md` (keep it healthy), `document-data-standards.md`
> (generate the per-entity docs).

The `data` kind governs a project's **DATA MODEL** — the persistent records it
stores, identifies, shapes, and sources. It is the data-side sibling of
`structure` (what must EXIST), `documentation` (how docs are SHAPED), and
`agent-docs-structure` (how the `docs/` folder is organized). Like
`documentation`, it is **one kind with a registry of SUB-TYPES inside**: four
universal sub-types every data-bearing project declares.

> **Universality rule (the whole point):** every requirement below is phrased as
> *"a project must define X"*, never *"X must equal a specific value."* The kind's
> checker verifies a project HAS each sub-type in the canonical shape; it never
> hardcodes one project's entities, id format, columns, or custodian. PS-ARCHIVE
> (below) implements the four sub-types one way; another project implements them
> differently — **same kind, different values.**

## The four sub-types

### 1. Entities — *what the project's core objects ARE*

Declare the **core object types** the data model is built on, and for each: what
it IS and **which field bears its identity**.

- **REQUIRED:** the entity set is *named* (e.g. `person / organization / place /
  artifact`, or `order / customer / sku`, or `document / collection`), and each
  entity has a declared **identity-bearing field** (the column/attribute that, once
  assigned, names that object across every surface).
- Edges/relationships between entities are part of the model — declare them too
  (membership, containment, authorship) and say whether an edge keys on the row id
  or on the canonical id (a stable row id means changing an object's canonical id
  does not break references — see Keying).
- A project MAY group entities into a tier/role-class; if so, state that the tier is
  a *curation* attribute, **not** an identity input (it must never enter the key).

### 2. Keying — *how an object gets its canonical id*

Declare the **deterministic canonical-id scheme**. This is the load-bearing
sub-type.

- **REQUIRED — one id FORMAT.** Every object of every type gets an id in ONE shape.
  Never a second id shape per type.
- **REQUIRED — a ranked PRIORITY LADDER.** The id is derived from the best
  *permanent* fact available, in ranked order (strongest → weakest). The ladder
  changes WHAT is hashed/derived, never the output format.
- **REQUIRED — DERIVE-ONCE, FREEZE. The ladder is a MINT-TIME rule, not a
  forever-invariant.** The priority ladder is applied **once**, at the moment an
  object is first keyed, to compute its canonical id. The computed value is then
  **stored on the row and IMMUTABLE** — never re-derived on re-ingest, re-scan, or
  **when a better source/fact surfaces later.** "Highest rung wins" decides *which
  rung mints the key the FIRST time*; it is **not** a standing equation the key must
  keep satisfying (`id == derive(current-best-facts)` for all time is the bug this
  rule kills). A later, better source **updates the object's PROVENANCE and
  ATTRIBUTES — never its KEY.** The canonical id is an *opaque, stable handle* (a git
  commit SHA: better tags/notes/messages never change the SHA); meaning is read from
  the attributes, never decoded from the key. This is what makes the source-of-record
  free to improve without orphaning a single edge, alias, or external citation keyed
  to the id. When a better source is adopted, change the **provenance pointer**, not
  the id.
- **REQUIRED — determinism is the hard rule.** Same object → same input → same id,
  across every pipeline and surface. **Non-reproducible inputs (random values,
  timestamps, file paths, scan locations) NEVER enter the key.**
- **REQUIRED — a refuse-to-mint guard.** When no permanent fact exists (a bare,
  unresolved object), the scheme REFUSES to mint and flags for resolution rather
  than guessing an identity — minting on a non-permanent fact asserts a false
  identity that is irreversible once references accrete.
- **REQUIRED — same id on every surface.** The same object computes the SAME id
  everywhere it lives (DB column, export, sidecar, index). A cross-surface
  mismatch is a non-determinism bug, not a variant.

### 3. Schema — *the field shapes / archetypes*

Declare the **authoritative field shapes** so the schema is never re-discovered at
write time.

- **REQUIRED — a single authoritative shape reference** per entity type: the
  required/not-null fields, defaults, and the foreign-key/reference shape (does a
  reference point at the stable row id or the canonical id?). The point is an agent
  about to write an object reads THIS, instead of preflight-guessing the schema.
- **REQUIRED — durable rulings + archetypes.** The locked modeling decisions
  (how to model a sub-unit, a disputed identity, an alias, a relationship) and the
  reusable archetypes that govern shape choices — captured so they are not
  re-litigated. A ruling that bit you once is a rule going forward.
- Generated/computed fields are marked as such (never written directly); a
  re-derive procedure is given so the shape can be re-verified after any change.

### 4. Provenance — *source-of-record / chain-of-custody*

Declare where the **authoritative copy** lives and how held copies trace to it.

- **REQUIRED — source-of-record vs acquisition custodian.** Distinguish the
  **authoritative custodian** (the citable copy of record) from where a **held**
  copy was actually **acquired** (a convenience mirror is not the source-of-record).
  Recording the mirror as the source-of-record is the defect this sub-type exists to
  prevent.
- **REQUIRED — held-vs-live.** State which data is *held* (bytes/records in hand)
  vs *live* (queried from the authoritative spine), and how the two reconcile
  (inventory − holdings = missing).
- **REQUIRED — held-bytes verification.** Verify that held bytes actually **trace
  to the claimed source** (fingerprint/metadata check), not a silently-different
  mirror. When held bytes cannot be verified to a source, record them as
  *source-unverified* rather than asserting a custodian.
- **REQUIRED — a citable authoritative id.** The authoritative copy is named by a
  stable, citable id (a federal package id, a finding-aid id, a registry id), not a
  bare internal label.
- A controlled, **ranked provenance vocabulary** (strongest first: first-source
  held-and-read → byte-verified external → structural anchor → identity-only
  corroboration → inferred-with-mandatory-reason) makes data-quality tiers
  self-documenting and machine-auditable.

## Conformance (what `check.mjs` verifies)

For an applicable project (it has a data model), the checker verifies a standard
for **each of the four sub-types is PRESENT** in the canonical shape — a doc that
declares entities (with identity), keying (deterministic + ladder + refuse-guard),
schema (authoritative field shapes), and provenance (source-of-record distinct
from acquisition custodian + held-bytes verification). A present sub-type doc is
additionally checked for the universal markers its sub-type requires. The checker
**never** asserts a project's specific entities, id format, columns, or custodian —
only that the four sub-types are governed.

## Conforming instance #1 — PS-ARCHIVE (reference, not a requirement)

PS-ARCHIVE (`CODEREF/PROJECTS/primary-sources/STAFF/PS-ARCHIVE/docs/standards/`)
is the first conforming instance. It implements the four universal sub-types as:

| sub-type | PS-ARCHIVE's implementation (one set of values among many possible) |
|---|---|
| **entities** | seven core types: `person / organization / place / artifact / collection / document / cryptonym` + membership/relationship/alias edges; identity-bearing field = `ps_uid`; edges key on the stable row `id`, and organization document edges live in `document_organization` (person edges in `document_actor`) (`COLLECTION-STANDARD.md`, `ENTITY-SCHEMA-REFERENCE.md`) |
| **keying** | `ps_uid` = `ps-` + 12 hex via one blake2b helper; ranked ladder (verified QID → record/testimony anchor → name+subtype …); refuses to mint on a bare unresolved name; same id on DB / JSON / CSV / scanner (`ENTITY-KEYING-STANDARD.md`, `COLLECTION-KEYING-STANDARD.md`) |
| **schema** | live-DB field shapes (not-null `name`/`canonical_name`, `role_class` default, FK-on-row-`id`), plus locked rulings + reusable archetypes (`ENTITY-SCHEMA-REFERENCE.md`, `SCHEMA-RULINGS-AND-ARCHETYPES.md`) |
| **provenance** | source-of-record = GPO govinfo (citable package ids) distinct from acquisition custodian = Internet Archive; held-bytes verified by PDF fingerprint (proved the held WC *Report* files were IA scans, not the documented federal copy) — and where held bytes have stripped metadata (the 26 WC hearing volumes) their origin is recorded `source-unverified`, NOT asserted to a custodian; ranked `held:` / `web:` / `roster-anchor:` / `qid:` / `inferred:` vocabulary (`WC-SOURCE-OF-RECORD.md`, `COLLECTION-METADATA-STANDARD.md`) |

A different project — an e-commerce catalog, a media library, a research corpus —
fills the same four rows with entirely different values. The kind is the same.

---

*Authored from `SKILLS/STANDARDS/kinds/data/template/README.md`.*

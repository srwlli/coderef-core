---
title: "Entity Spec: {FILL: EntityType}"
status: living
updated: {FILL: YYYY-MM-DD}
kind: data
entity_type: {FILL: e.g. person | organization | artifact | collection}
---

<!-- Authored by /standards-establish from SKILLS/STANDARDS/kinds/data/template/ENTITIES/TEMPLATE.md.
     This is the PROJECT's standard for the "data" kind. Edit to fit the project;
     re-run /standards-update when the ecosystem template evolves. -->

<!-- PROVENANCE: rendered from standard-KIND `data`
     (SKILLS/STANDARDS/kinds/data/template/ENTITIES/TEMPLATE.md).
     Copy this per entity type into standards/data/ENTITIES/<EntityType>.md and fill
     every {FILL}. A rule change is a KIND change — edit the template and re-sync via
     /standards-update --kind=data. The FILLED docs are project content. -->

# Entity Spec: {FILL: EntityType}

> The authoritative per-entity reference for `{FILL: EntityType}`: what it IS, how
> it is identified and keyed, its field shape, and where its records are sourced.
> An agent about to create, key, or write a `{FILL: EntityType}` reads THIS instead
> of re-discovering the model. Grounded in the four data sub-types — do not author
> from the entity's name; read the live model (DB schema, keying helper, source-of-
> record docs) and cite it.

## 1. What it is

{FILL: one-paragraph definition — what this entity represents in the data model and
the boundary that separates it from adjacent entities. Name the real records/tables
that back it.}

## 2. Identity (entities sub-type)

- **Identity-bearing field:** {FILL: the field that names this object across every
  surface once assigned — e.g. `ps_uid`.}
- **Stable row id vs canonical id:** {FILL: does a reference to this entity point at
  the stable row id or the canonical id? State it — it decides whether re-keying
  breaks references.}
- **Tier/role-class (if any):** {FILL: any curation grouping — and the explicit note
  that it is a curation attribute, NOT an identity input, and never enters the key.
  Or `N/A`.}

## 3. Keying (keying sub-type)

- **Id format:** {FILL: the one shape every instance of this entity gets.}
- **Priority ladder:** {FILL: the ranked permanent facts this entity's id derives
  from, strongest → weakest — applied ONCE at first mint (see derive-once below).}
- **Derive-once / freeze:** {FILL: confirm the ladder is a MINT-TIME rule — the id is
  computed once and then IMMUTABLE. State explicitly that when a better source/fact
  surfaces later, this entity's PROVENANCE and attributes update but its KEY does not
  re-derive. Name the attribute columns a better fact lands on. E.g. "derive-once,
  frozen; a later QID updates `wikidata_qid`, never `ps_uid`."}
- **Refuse-to-mint condition:** {FILL: when this entity has no permanent fact, what
  the scheme does instead of guessing.}
- **Determinism note:** {FILL: confirm the same instance computes the same id on
  every surface it lives on (DB / export / sidecar / index); cite the shared helper.}

## 4. Field shape (schema sub-type)

{FILL: the authoritative field table for this entity — required/not-null fields,
defaults, and the foreign-key/reference shape. Pull VERBATIM from the live schema
reference (e.g. ENTITY-SCHEMA-REFERENCE.md); do not paraphrase a type.}

| Field | Type | Required | Default | Reference shape / notes |
|---|---|---|---|---|
| {FILL} | | | | |

- **Generated/computed fields:** {FILL: fields never written directly + the
  re-derive procedure. Or `N/A`.}
- **Governing rulings/archetypes:** {FILL: the locked modeling decisions from
  SCHEMA-RULINGS-AND-ARCHETYPES.md that apply to this entity. Or `N/A`.}

## 5. Provenance (provenance sub-type)

- **Source-of-record:** {FILL: the authoritative custodian + the citable id form.}
- **Acquisition custodian (if different):** {FILL: where held copies were acquired —
  and the note that this is NOT the source-of-record. Or `N/A`.}
- **Held vs live:** {FILL: which of this entity's data is held vs queried live, and
  how they reconcile.}
- **Held-bytes verification:** {FILL: how held bytes are verified to trace to the
  claimed source; what "source-unverified" means for this entity.}

## 6. Edges / relationships

{FILL: the edges this entity participates in (membership, containment, authorship,
alias), and whether each edge keys on the row id or the canonical id. Or `N/A`.}

## 7. Related entities

{FILL: links to sibling ENTITIES/<Other>.md specs this entity references or is
referenced by.}

## 8. Change history

{FILL: dated one-line notes on shape/keying/provenance changes to this entity.}

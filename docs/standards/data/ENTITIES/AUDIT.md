---
title: Entity Model Inventory
status: living
updated: {FILL: YYYY-MM-DD}
kind: data
kind_version: {FILL: from kind.json}
template_version: {FILL: from kind.json}
project: {FILL: project name}
---

<!-- Authored by /standards-establish from SKILLS/STANDARDS/kinds/data/template/ENTITIES/AUDIT.md.
     This is the PROJECT's standard for the "data" kind. Edit to fit the project;
     re-run /standards-update when the ecosystem template evolves. -->

<!-- PROVENANCE: rendered from standard-KIND `data`
     (SKILLS/STANDARDS/kinds/data/template/ENTITIES/AUDIT.md).
     Do not edit the rule shape here; a rule change is a KIND change — edit the
     template and re-sync via /standards-update --kind=data. Rows ARE project
     content: this file is mutated in-project by the audit cadence. -->

# Entity Model Inventory

**Last updated:** {FILL: YYYY-MM-DD}
**Last audit cycle:** {FILL: YYYY-MM-DD}
**Total entity types in scope:** {FILL: N}

---

## How this file works

This is the **rolling state document** for the project's data model: every entity
type enumerated with its identity/keying/schema/provenance coverage. It is the
`document` verb's IDENTIFY worklist (see document-data-standards.md) and the audit
cadence refreshes it.

### ENUMERATION RULE (mandatory — no blanket rows)

Every entity type in the data model gets **its own row** below. A blanket
classification ("all other entities implicitly conform") is NOT permitted — it hides
the per-entity coverage state the standard tracks. The row count MUST equal **Total
entity types in scope**. If it doesn't, the inventory is incomplete — finish the
enumeration before calling the audit done.

The four sub-type columns record whether THIS entity's contribution to each sub-type
standard is declared: `Identity` (entities sub-type — identity-bearing field named),
`Keyed` (keying — format + ladder + refuse-guard cover it), `Schema` (authoritative
field shape declared), `Provenance` (source-of-record vs custodian declared). `Spec
exists?` = a name-matched `ENTITIES/<EntityType>.md` is present.

---

## Entities

| Entity type | Backing records/table | Identity | Keyed | Schema | Provenance | Spec exists? |
|---|---|---|---|---|---|---|
| {FILL: one row per entity type} | | | | | | |

---

## Not Yet Modeled

(Entity types observed in the data but not yet given a sub-type-complete standard.
They land here first, then move up as their four sub-types are declared.)

| Entity type | First seen | Missing sub-type(s) |
|---|---|---|
| {FILL or _(none)_} | | |

---

## Architectural Notes

{FILL: project-specific notes — edge-keying conventions, tier/role-class rulings,
any entity whose identity/keying deviates and why. Optional but recommended.}

---

## References

- [../README.md](../README.md) — the data-model standard (four sub-types)
- [TEMPLATE.md](./TEMPLATE.md) — the per-entity spec a fully-modeled entity must have

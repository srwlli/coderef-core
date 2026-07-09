---
title: Structure Layout Inventory
status: living
updated: {FILL: YYYY-MM-DD}
kind: structure
kind_version: {FILL: from kind.json}
template_version: {FILL: from kind.json}
project: {FILL: project name}
---

<!-- Authored by /standards-establish from SKILLS/STANDARDS/kinds/structure/template/LAYOUT/AUDIT.md.
     This is the PROJECT's standard for the "structure" kind. Edit to fit the project;
     re-run /standards-update when the ecosystem template evolves. -->

<!-- PROVENANCE: rendered from standard-KIND `structure`
     (SKILLS/STANDARDS/kinds/structure/template/LAYOUT/AUDIT.md).
     Do not edit the rule shape here; a rule-SHAPE change is a KIND change — edit the
     template and re-sync via /standards-update --kind=structure. Rows ARE project
     content: this file is mutated in-project by the layout audit cadence. -->

# Structure Layout Inventory

**Last updated:** {FILL: YYYY-MM-DD}
**Last audit cycle:** {FILL: YYYY-MM-DD}
**Total declared homes in scope:** {FILL: N}

---

## How this file works

This is the **rolling state document** for the project's layout: every declared
`role → dir` home enumerated with its on-disk existence and (for the planner/coder
pair) its overlap state. The layout audit cadence (see maintain-structure-standards.md)
refreshes it.

### ENUMERATION RULE (mandatory — no blanket rows)

Every role declared in `LAYOUT/TEMPLATE.md` gets **its own row** below. A blanket
statement ("all other homes exist") is NOT permitted — it hides the per-home state the
standard tracks. The row count MUST equal **Total declared homes in scope**. If it
doesn't, the inventory is incomplete — finish the enumeration before calling the audit
done.

`Exists?` = the declared dir is on disk. `Overlaps?` applies only to the
`planner`/`coder` rows — it is `yes` if the planner and coder dir sets intersect (a
tree-separation VIOLATION, hard-FAIL) and `no` otherwise.

---

## Declared homes

| role | declared dir(s) | Exists? | Overlaps? (planner/coder only) |
|---|---|---|---|
| {FILL: one row per declared role} | | | |

---

## Required-file existence (trigger baseline)

The trigger-driven canon and its per-project level. `Level` reflects the promote row
in `LAYOUT/TEMPLATE.md` (module by default; core if promoted).

| required file | trigger | Level | Exists? |
|---|---|---|---|
| README.md | project | core | {FILL} |
| VISION.md | project | {FILL: module \| core-if-promoted} | {FILL} |
| CONTEXT.md | context-doc | {FILL: module \| core-if-promoted} | {FILL} |
| AGENTS.md | agents-doc | {FILL: module \| core-if-promoted} | {FILL} |
| scripts/README.md | scripts-dir | core (if scripts/ exists) | {FILL} |

---

## Drift / WARN observations

(Module-level signals: a missing WARN-level required file, stray top-level source, a
tests home not following convention. Recorded here so a WARN is a tracked observation,
not a silent pass.)

| observation | first seen | note |
|---|---|---|
| {FILL or _(none)_} | | |

---

## Architectural Notes

{FILL: project-specific notes — a non-conventional home and why, a legacy tree being
retired, any role deliberately absent. Optional but recommended.}

---

## References

- [../README.md](../README.md) — the structure standard (existence + layout + tree-separation)
- [TEMPLATE.md](./TEMPLATE.md) — the role→dir declaration the project fills

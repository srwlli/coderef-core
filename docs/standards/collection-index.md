---
kind: collection-index
status: living
title: Collection Index Standard
updated: 2026-07-09
---

<!-- Authored by /standards-establish from SKILLS/STANDARDS/kinds/collection-index/template/collection-index.md.
     This is the PROJECT's standard for the "collection-index" kind. Edit to fit the project;
     re-run /standards-update when the ecosystem template evolves. -->

# Collection Index Standard

> Authored FROM `SKILLS/STANDARDS/kinds/collection-index/template.md`. This is the
> project's instance of the `collection-index` KIND. Fill the declared-entries table
> below with THIS project's record registries, then drive the checker to green:
> `node SKILLS/STANDARDS/kinds/collection-index/check.mjs --project-root=<ABS> --standard=<this file> --json`

## What this standard governs

A **record collection** is a registry file that is the *authoritative list* of a
class of records the project tracks — a work-item ledger, a session manifest, a
dispatch log, a roadmap census. This standard asserts that each declared registry
is:

1. **Parseable** — the file loads and the declared row container is an array.
2. **Soundly-keyed** — every row carries the declared `id_key`, non-null, and the
   key is **unique** across all rows. (This is the guard against the whole-collection
   null-key class: an audit that reads the wrong id key nulls every row silently.)
3. **Complete** — when the collection has 1:1 on-disk artifacts (a glob is declared),
   every artifact on disk resolves to a registry row. No orphan the registry can't see.
4. **Reverse-sound** (WARN) — a registry row should not point at an artifact that has
   vanished from disk (terminal/archived rows legitimately outlive their dirs, so this
   is a warning, not a failure).

This is DISTINCT from the `derived-index` kind: that one asserts a *generated file*
equals what its *generator* produces (projection drift). This one asserts a *record
registry* is a trustworthy, complete, soundly-keyed list of its class.

## Declared collections

One row per record registry this project governs. The checker parses this exact
table (leave the header + separator rows intact).

| registry_file | id_key | row_container | artifact_glob |
|---|---|---|---|
| improvements.json | id | items | - |

Declared per the CORE-INDEX-DECLARE ruling (2026-07-09): CODEREF-CORE's record
registry is a RECORD REGISTRY (authoritative row list, soundly keyed); generated
`.coderef/` views are DERIVED FILES and are governed by the `derived-index`
standard, not this one. `improvements.json` is the current authoritative record
registry at CORE (28 active rows keyed by `id`, unique + non-null at declaration
time). The `coderef/workorder/` dirs have no JSON registry file today — when one
lands, add its row here with an `artifact_glob` of `coderef/workorder/*/`.

**Columns**

- **registry_file** — project-root-relative path to the authoritative registry file.
- **id_key** — the field on each row that is its stable identifier. MUST be present,
  non-null on every row, and unique across the whole collection.
- **row_container** — how to reach the record array inside the file. Use a top-level
  key (e.g. `items`) when the array is nested under it; use `.` when the file itself
  IS the array; use a dotted path (`a.b`) to reach a nested array.
- **artifact_glob** — OPTIONAL. A project-root-relative glob for the on-disk artifacts
  this registry indexes (e.g. `coderef/working/*/WO-*/` for WO dirs, `**/roadmap.json`
  for roadmaps). When present, the checker enforces completeness (every artifact has a
  row) and reverse-integrity (WARN on rows whose artifact is gone). Use `-` for a pure
  record registry with no 1:1 on-disk artifact.

## Not applicable

A project that maintains no record registries has nothing to declare here; the
checker reports `not_applicable` and exits 0.

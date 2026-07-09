---
title: Derived-Index Standard
kind: derived-index
status: living
updated: 2026-07-09
---

<!-- Authored by /standards-establish from SKILLS/STANDARDS/kinds/derived-index/template/derived-index.md.
     This is the PROJECT's standard for the "derived-index" kind. Edit to fit the project;
     re-run /standards-update when the ecosystem template evolves. -->

# Derived-Index Standard

> **Kind:** `derived-index` · **Registry:** `SKILLS/STANDARDS/kinds/`
> CODEREF-CORE's instance of the `derived-index` KIND. The checker parses the
> declaration table below (every 3-column table row in this doc is treated as a
> declaration — keep this doc to ONE table). Full kind contract, conformance
> semantics, and execution-safety notes live in the ecosystem template:
> `SKILLS/STANDARDS/kinds/derived-index/template.md`.

The derived-index kind owns whether a **generated** file is **CURRENT** with the
corpus it summarizes. The defining invariant: an index/manifest DERIVED from a
corpus MUST equal what its declared generator produces from that corpus right
now. The record is truth; the index is derived. **Drift = FAIL.**

## Declared derived indexes

Declared per the CORE-INDEX-DECLARE ruling (2026-07-09): CODEREF-CORE's
`coderef/foundation-docs/` set is DERIVED — the scanner's `.coderef/index.json`
is truth, the foundation docs are derived from it. The declared command is the
pipeline's non-mutating verify mode (`validate-docs.js --strict`: exit 0 =
current, exit 1 = stale); the writers are the `scripts/doc-gen/generate-*.js`
set. One row covers the whole foundation-docs set
(INDEX/EXPORTS/HOTSPOTS/RELATIONSHIPS/API/COMPONENTS/ARCHITECTURE/SCHEMA)
because the validator checks the set in one pass.

| index_file | generator | check_flag |
|---|---|---|
| coderef/foundation-docs/INDEX.md | node scripts/doc-gen/validate-docs.js | --strict |

**Column meanings** (see the ecosystem template for the full contract):
`index_file` is the generated file, project-root-relative. `generator` is the
command run from the project root (spawned as an argv array, never a shell).
`check_flag` is the generator's non-mutating verify mode — exit 0 current,
exit 1 stale, exit ≥2 un-runnable.

**Adding an index:** give it a generator with a verify-only check flag that
exits 1 on stale, then add one row to the table above.

---

*Authored from `SKILLS/STANDARDS/kinds/derived-index/template.md` v1.1.0;
tailored to CODEREF-CORE 2026-07-09 (WO-STANDARDS-ENGINES-P1-DOC-TAXONOMY-REVIEW-LOCK-001 P2).*

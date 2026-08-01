# Ecosystem Issues

> **Single flat log of ecosystem issues. HAND-EDITED — no runner, no registry, no DB.**
>
> **FREEZE IN EFFECT (2026-08-01, operator directive):** `/kaizen-log` and `/ticket` are
> FROZEN. Do NOT log kaizen entries. Do NOT file tickets. Append here instead.
> The kaizen/ticket system is being refactored; this file is the interim capture surface.
>
> Existing kaizen sidecars and ticket rows are left in place — the freeze stops NEW
> writes, it does not migrate or delete history.

## How to use this file

1. **APPEND** a new entry to the bottom of `## Issues` using the template below.
2. **ASSIGN** the next sequential id: `ECO-001`, `ECO-002`, …
3. **DO NOT** hand-edit or renumber existing entries. Correct an entry by appending a
   new one that supersedes it and setting the old entry's status to `superseded`.
4. **KEEP IT ONE ENTRY PER ISSUE.** A bundle of five findings is five entries.

**Fields**

| Field | Required | Notes |
|---|---|---|
| `id` | yes | `ECO-NNN`, sequential, never reused |
| `date` | yes | `YYYY-MM-DD` |
| `domain` | yes | Owning agent domain (`ASSISTANT`, `STANDARDS`, …) |
| `surface` | yes | Skill / script / file the issue lives in |
| `category` | yes | `correctness` \| `ergonomics` \| `observability` \| `performance` \| `scope-creep` \| `docs` |
| `severity` | yes | `critical` \| `warning` \| `info` |
| `status` | yes | `open` \| `fixed` \| `wontfix` \| `superseded` |
| `summary` | yes | One line: what is wrong |
| `evidence` | yes | How it was OBSERVED — path:line, command output, measured count. Not a guess. |
| `impact` | yes | What breaks, for whom, when |
| `fix` | no | Proposed or landed remedy; include the commit SHA when fixed |

**Evidence is not optional.** An entry without an observation is a hunch. Cite the
`path:line`, the command and its output, or the measured count.

---

## Template

```markdown
### ECO-NNN — <one-line title>

- **date:** YYYY-MM-DD
- **domain:** DOMAIN
- **surface:** path/to/thing
- **category:** correctness | ergonomics | observability | performance | scope-creep | docs
- **severity:** critical | warning | info
- **status:** open | fixed | wontfix | superseded
- **summary:** What is wrong, in one sentence.
- **evidence:** How it was observed — path:line, command + output, or measured count.
- **impact:** What breaks, for whom, and when it surfaces.
- **fix:** Proposed or landed remedy. Include commit SHA if fixed.
```

---

## Issues

<!-- ECO-001..ECO-005 recorded 2026-08-01 while executing
     WO-CODEREF-CORE-STANDARDS-CONFORMANCE-BURN-DOWN-8-STANDARDS-001 (phases 2-7).
     ASSISTANT-owned tooling defects found during the same work are filed in
     ASSISTANT/ecosystem-issues.md under that repo's own sequence, not here. -->

### ECO-001 — docs/SCHEMA.md understates EdgeEvidence and EdgeRelationship

- **date:** 2026-08-01
- **domain:** CODEREF-CORE
- **surface:** docs/SCHEMA.md
- **category:** docs
- **severity:** warning
- **status:** open
- **summary:** The canonical schema reference documents `EdgeEvidence` as a 10-variant union and `EdgeRelationship` as 4 values; the code carries 12 and 8.
- **evidence:** `docs/SCHEMA.md:361` heading reads "`EdgeEvidence` (10-variant discriminated union)" and `:354` lists `import | call | export | header-import`. Against source: `src/pipeline/graph-builder.ts:144` declares 12 variants (adds `calls-endpoint`, `serves-endpoint`) and `src/pipeline/graph-builder.ts:103` declares 8 relationships (adds `extends`, `implements`, `calls_endpoint`, `serves_endpoint`).
- **impact:** SCHEMA.md is the doc every other standard cites as the authoritative field-shape reference, so an agent reading it builds an incomplete model of the edge surface and cannot know the endpoint variants exist. The drift is silent — nothing compares the prose counts to the union.
- **fix:** Proposed — refresh both counts and enumerate the four added values. Deliberately NOT patched inside the burn-down WO: the schema sub-type standard's job is to point at the authoritative reference, not become a competing one. Note the WO's own P2-T5 task text inherited the stale "10 variants" premise, so the drift had already propagated into planning.

### ECO-002 — a code element carries TWO id shapes derived from one triple

- **date:** 2026-08-01
- **domain:** CODEREF-CORE
- **surface:** src/utils/coderef-id.ts + src/registry/entity-registry.ts
- **category:** correctness
- **severity:** warning
- **status:** open
- **summary:** The same element is identified both by the readable `codeRefId` natural key and by an RFC-4122 v5 UUID, both derived from the same `(file, name, line)` triple.
- **evidence:** `src/utils/coderef-id.ts:49` builds `@<Designator>/<file>#<name>:<line>`; `src/registry/entity-registry.ts:37` hashes `${normalizeSlashes(file)}:${name}:${line}` into a v5 UUID. Same inputs, two live outputs — `generateUUID` is called at `entity-registry.ts:62` and `:91`.
- **impact:** The `data` standards kind requires ONE id format per object; two shapes for one object is the cross-surface alias hazard that sub-type exists to prevent. Neither is a bug in isolation (both deterministic and stable), but consumers must know which is canonical and nothing declares it. Plausibly the mechanism behind ECO-003, since both ids embed `line` and therefore change when an unrelated edit shifts an element.
- **fix:** Proposed — rule which shape is canonical and demote the other to an explicitly-labelled alternate handle. Declared as a known tension in `docs/standards/data/KEYING-STANDARD.md` (commit `a45a665`) without picking a survivor, because the choice has consumer impact beyond that WO.

### ECO-003 — 23 invalid UUID anchors hold the derived-index kind at FAIL

- **date:** 2026-08-01
- **domain:** CODEREF-CORE
- **surface:** coderef/foundation-docs/ + scripts/doc-gen/validate-docs.js
- **category:** correctness
- **severity:** warning
- **status:** open
- **summary:** Foundation docs cite 23 UUID anchors that no longer resolve against `.coderef/index.json`, so the doc validator exits 1 and the `derived-index` kind reports the index STALE.
- **evidence:** `node scripts/doc-gen/validate-docs.js --strict` → "Found 310 UUID anchors (287 valid)" then "❌ Errors: - 23 invalid UUID anchors found", exit 1. Named examples: `EXPORTS.md: a13dbe09-a3c4-53b0-99a1-4b0630dfe3c6`, `API.md: 23d01bc8-2217-52d2-a80a-fd5574eb3b75`. `derived-index` checker → 4 pass / 1 fail on `core.entry.index.current`.
- **impact:** One standing core FAIL that re-running the validator can never clear. Materially better than the state the burn-down WO was scoped against, which recorded 309 invalid of 311 — most anchors have since been repaired and only a tail remains.
- **fix:** Not yet scoped. Diagnose whether the 23 are genuinely-removed elements or elements whose `line` moved (the ECO-002 instability), then regenerate via the `scripts/doc-gen/generate-*.js` producers — **not** `validate-docs.js`, which contains no write path. See the companion entry in `ASSISTANT/ecosystem-issues.md` for the checker's incorrect remediation string.

### ECO-004 — coderef/ carries two homes for resource sheets

- **date:** 2026-08-01
- **domain:** CODEREF-CORE
- **surface:** coderef/resource-sheets/ and coderef/resources-sheets/
- **category:** correctness
- **severity:** warning
- **status:** open
- **summary:** Resource sheets live under both `coderef/resource-sheets/` (canonical) and `coderef/resources-sheets/` (a plural-typo sibling), plus a third set under `coderef/resource/`.
- **evidence:** `find . -name "*RESOURCE-SHEET*.md"` → 27 sheets across SIX locations: `coderef/resource-sheets/` 3, `coderef/resources-sheets/` 10, `coderef/resources-sheets/systems/` 5, `coderef/resource/` 3, `src/` 5, `scripts/` 1. The `resource-sheet` kind reports `sheet.filename-and-location: 22 of 25 sheet(s) violate naming/location (not under coderef/resource-sheets/)`.
- **impact:** A reader cannot tell which directory is authoritative and a writer picks by coin-flip — precisely what a canonical location exists to preclude. Holds the `resource-sheet` kind at 3 core FAILs.
- **fix:** Blocked on an operator relocation ruling (WO P5-T3): 6 of the sheets declare `parent_project: coderef-dashboard`, so moving them into CORE's canonical home would make another project's content canonical here. Full provenance table recorded in that WO's `communication.json`.

### ECO-005 — five zero-byte resource-sheet files shadow five real sheets

- **date:** 2026-08-01
- **domain:** CODEREF-CORE
- **surface:** coderef/resources-sheets/systems/
- **category:** correctness
- **severity:** warning
- **status:** open
- **summary:** All five files under `coderef/resources-sheets/systems/` are 0 bytes, and each duplicates the filename of a real, populated sheet one directory up.
- **evidence:** `ls -la coderef/resources-sheets/systems/` → all five entries `0` bytes, dated Jan 13 2026 (`Context-Generator`, `Dependency-Graph-Builder`, `File-Generation-System`, `Scanner-UI-System`, `Theme-System`, each `-RESOURCE-SHEET.md`). Their populated twins one level up measure 18246B, 17783B, 19049B, 15572B and 13862B respectively.
- **impact:** They are counted by the `resource-sheet` checker and fail both `frontmatter-complete` and `required-sections` — an empty file can satisfy neither. They also make any name-based sheet lookup ambiguous. The burn-down WO's task text described these as sheets with "none" provenance, which reads as an attribution gap; they are empty placeholders, so the remedy is deletion, not attribution.
- **fix:** Proposed — delete all five. NOT deleted unilaterally: deletion is irreversible and these sit inside the directory whose ownership is part of the pending ECO-004 ruling.

# Task: author 5 CodeRef resource sheets for CODEREF-CORE (pilot batch)

You are authoring reference documentation for the `CODEREF-CORE` repository. This is a
**pilot batch of 5**. If the quality holds, you will be handed the remaining 48 files in
four further batches — so treat these five as the sample that sets the standard.

**Repo root:** `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE`
**Write sheets to:** `coderef/resource-sheets/<snake_case_stem>-RESOURCE-SHEET.md`

Read the source. Every claim in these sheets must be traceable to code you actually opened.

---

## Your five targets

| # | Source file | Lines | `category` | Sheet filename |
|---|-------------|-------|------------|----------------|
| 1 | `src/pipeline/graph-builder.ts` | 1420 | `module` | `graph_builder-RESOURCE-SHEET.md` |
| 2 | `src/pipeline/grammar-registry.ts` | 223 | `module` | `grammar_registry-RESOURCE-SHEET.md` |
| 3 | `src/cli/mcp/verify-tools.ts` | 532 | `CLI` | `verify_tools-RESOURCE-SHEET.md` |
| 4 | `src/analyzer/route-parsers.ts` | 525 | `parser` | `route_parsers-RESOURCE-SHEET.md` |
| 5 | `src/cli/mcp-response-format.ts` | 189 | `CLI` | `mcp_response_format-RESOURCE-SHEET.md` |

The `category` values above are pre-assigned — use them as given, do not re-classify.
Filenames are snake_case, derived from the source basename. Do not invent a PascalCase variant.

---

## Frontmatter — exact contract

```yaml
---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: graph_builder
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/pipeline/graph-builder.ts
related_files:
  - src/pipeline/graph-builder.ts
status: draft
---
```

**`documents:` is the load-bearing field.** It is the machine binding between the sheet and the
code it describes — a drift checker resolves it, and tooling that asks "does this file already
have a sheet?" reads it. It must be a **repo-relative POSIX path that resolves to a real file**,
exactly as written in the table above. Not a display name, not an absolute path, no `./` prefix.
It may be a YAML list if a sheet legitimately covers several files, but for this batch each sheet
documents exactly one file, so use the scalar form.

`status: draft` on everything. Promotion to `approved` is a review step that is not yours.

---

## Sections — all eight, in this order, with these exact `##` headings

1. `## Executive Summary` — one paragraph. What this artifact is and why it exists.
2. `## Audience and Intent` — who opens this file and what they came to find out.
3. `## Architecture / Behavior` — how it works. Control flow, key data structures, the
   non-obvious decisions. This is the section with the most value; spend your effort here.
4. `## Source of Truth` — **an authority statement, not a second API walkthrough.** Which file
   or artifact is canonical for this behavior? Where does state live and who owns it? Are there
   tests or config backing it — and if there are none, say `NONE` explicitly. Are values
   hardcoded or configurable?
5. `## Public API / Contracts` — every export, with a real line anchor. Inputs, outputs, thrown
   errors, CLI flags where applicable.
6. `## Dependencies` — internal imports and external packages, and what each is used for.
7. `## Risks & Edge Cases` — real failure modes you found in the code. Not hypotheticals.
8. `## Validation Checklist` — markdown checkboxes covering the claims you made.

---

## Grounding rules

- Cite as `[ref](src/pipeline/graph-builder.ts:412)` — repo-relative path, real line number.
- **Never guess a line number.** If you are not certain of the line, write the bare
  `[ref](src/pipeline/graph-builder.ts)` with no anchor. A bare ref is acceptable and honest;
  a wrong anchor is a defect and will fail review.
- Anything you concluded rather than read, mark `[inference]`.
- Ground it in this repo's actual code. Do not describe what a file with that name usually does.

## Known failure modes — you are being graded against these

These are the exact defects observed in previously-rejected drafts:

- **Repetition.** The module's purpose belongs in the Executive Summary and nowhere else.
  If sections 2, 3 and 4 all open by re-introducing what the file is, the sheet is rejected.
  Assume the reader has read every prior section.
- **§4 answering the wrong question.** "Source of Truth" is about *authority and ownership*.
  If it reads like a second Public API section, it is wrong.
- **Filler.** "Robust and scalable", "efficient and reliable", "plays a crucial role" — cut all
  of it. Every sentence must carry a fact a reader could not have guessed from the filename.
- **Invented behavior.** A 200-line file does not have a rich subsystem behind it. Describe what
  is there. `grammar-registry.ts` at 223 lines should produce a shorter sheet than
  `graph-builder.ts` at 1420 — length should track the source, not a template quota.

## Out of scope

- Do not modify any source file. These sheets are read-only work.
- Do not create or edit `coderef/resource-sheets/INDEX.md` — index maintenance is handled separately.
- Do not run repo tooling, populate the index, or touch anything under `.coderef/`.
- Five files in, five sheets out.

---

## Reference material

- **Template:** `<ASSISTANT>/SKILLS/DOCUMENTATION/generate-resource-sheet/assets/resource-sheet-template.md`
- **Rules:** `<ASSISTANT>/SKILLS/DOCUMENTATION/generate-resource-sheet/references/RESOURCE-SHEET-RULES.md`
- **Worked example:** `coderef/resource-sheets/path_normalize-RESOURCE-SHEET.md` in CODEREF-CORE —
  correct shape and frontmatter. Its prose is more repetitive than what is wanted here; match its
  structure, beat its density.

where `<ASSISTANT>` = `C:\Users\willh\Desktop\CODEREF\ASSISTANT`.

## Acceptance

Each sheet is checked for: frontmatter completeness; `documents:` resolving to a real file;
all eight sections present in order; the Public API section matching the file's actual exports
(verified against the repo index, so an omitted export is a failure); no invalid line anchors;
and a prose review against the failure modes above. Report back the five paths you wrote and
anything about a target you found ambiguous.

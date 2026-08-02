---
title: Resource-sheet authoring prompt (paste-ready)
status: ready
date: 2026-08-01
author: CODEREF-CORE agent
audience: Codex / Antigravity / any CLI agent
purpose: commission 19 resource sheets without generating line-anchor rot
---

# Resource-sheet authoring prompt

Paste the block below into the agent. It is self-contained. Do one module per run.

Replace `{MODULE}` with one path from the target list at the bottom.

---

## THE PROMPT (copy from here)

You are authoring ONE resource sheet for the `coderef-core` project.

**Target module:** `{MODULE}`
**Project root:** `C:/Users/willh/Desktop/CODEREF/CODEREF-CORE`

### Before you start

Run `/populate-coderef` if `.coderef/index.json` is older than the module's last edit.
`project-spine.mjs` refuses to project from a stale index and exits 3. Do not work around
that refusal — re-populate.

### Steps

1. **READ** the module completely. Every exported function, every private helper, every
   branch. Do not skim and do not infer behavior you did not read.
2. **READ** its tests. Note what is asserted versus what merely runs.
3. **PROJECT** the factual spine, model-free:
   ```
   node SKILLS/DOCUMENTATION/generate-resource-sheet/project-spine.mjs \
     --module={MODULE} --project-root=<ABS> --render
   ```
   This emits the `## Public API / Contracts` and `## Dependencies` sections. Paste them in
   VERBATIM. Do not hand-edit them, do not reorder them, do not add or remove a citation.
   They are projected from the same index the code is tracked by.
4. **WRITE** the remaining six sections yourself, under the citation rules below.
5. **VALIDATE**:
   ```
   node SKILLS/STANDARDS/kinds/resource-sheet/check.mjs --project-root=<ABS> --json
   node SKILLS/DOCUMENTATION/generate-resource-sheet/check-sheet-drift.mjs \
     --sheet=<SHEET_PATH> --project-root=<ABS>
   ```
   Both must be clean before you set `status: approved`.

### DO NOT run Step 4.5

**Do not run `remediate-sheet.mjs`.** The skill's Step 4.5 upgrades bare prose refs into
line-anchored ones (rule D1). Line anchors rot on every insertion above them — 68 stale
citations across this corpus were produced exactly that way. Skip the step entirely.

If the skill text tells you bare refs are a defect to remediate, ignore it. That guidance
is wrong and is being corrected.

### Citation rules — these override the skill's examples

- **Prose citations are BARE PATH REFS.** Write `[ref](src/query/clones.ts)`. Never write
  `[ref](src/query/clones.ts:117)` in prose.
- **NEVER hand-write a line number.** If you did not get it from `project-spine.mjs`, it
  does not go in the sheet. Guessed anchors are the single largest defect class here.
- **Line anchors appear ONLY in the two projected sections**, exactly as the projector
  emitted them.
- **A citation must resolve to an INDEXED element.** Module-private symbols are not indexed;
  cite them with a bare path ref. Anchoring a private helper to its declaration line will be
  rejected by the drift checker.
- **Cite per claim, not per sheet.** The checker's `claims-grounded` rule passes a sheet with
  a single citation anywhere in the body — that is a hole, not a target. Aim for the density
  of `element_extractor-RESOURCE-SHEET.md`: roughly 4 citations per KB, every substantive
  paragraph grounded.

### Honesty rules

- Mark anything you did not directly verify with `**[inference]**`. Suspected behavior,
  unproven bug, reasoned-but-unread conclusion — all get the tag.
- Write `**NONE found**` where something is genuinely absent. Absent test coverage, absent
  config file, absent error handling. Do not paper over a gap with prose.
- If a test exists but only asserts "a result came back", say so. That is not coverage.
- Do not describe behavior the file header advertises but the code does not implement.
  Note the mismatch instead — that is a finding.

### Frontmatter (9 fields, all required)

```yaml
---
agent: <your name>
date: 2026-08-01
task: <stub or ticket id, if any>
subject: <snake_case module name>
parent_project: coderef-core
category: <one of: component, system, module, service, utility, validator, parser,
           formatter, integration, CLI, config, schema, test-support, documentation, other>
version: 1.0.0
documents: {MODULE}
related_files:
  - {MODULE}
status: draft
---
```

`subject` is the snake_case module name. **Disambiguate generic basenames** — a module at
`src/cli/mcp/shared.ts` gets `subject: mcp_shared`, not `shared`. Bare generic stems are
invisible to the documentation ranker.

Set `status: approved` only after both validators are clean. A sheet left at `draft` does
not count as coverage — all 53 existing Codex sheets are stranded at `draft`.

### Sections (8, in this order)

1. Executive Summary
2. Audience and Intent
3. Architecture / Behavior
4. Source of Truth
5. Public API / Contracts  *(projected — paste verbatim)*
6. Dependencies  *(projected — paste verbatim)*
7. Risks & Edge Cases
8. Validation Checklist

### Reference sheet

Read `coderef/resource-sheets/element_extractor-RESOURCE-SHEET.md` before you start. It is
the quality bar: dense citations, `**[inference]**` on the two suspected double-emission
bugs, `**NONE found**` for missing Rust/Java coverage, and specific named edge cases rather
than generic caveats.

## (copy to here)

---

## Target list

### Tier 1 — the `related_files` net-new set (13)

| fan-in | module | suggested category |
|---|---|---|
| 117 | `src/pipeline/extractors/relationship-extractor.ts` | module |
| 86 | `src/query/clones.ts` | module |
| 73 | `src/indexer/relationship-index.ts` | module |
| 71 | `src/pipeline/output-validator.ts` | validator |
| 55 | `src/analyzer/migration-route-analyzer.ts` | module |
| 48 | `src/context/context-tracker.ts` | module |
| 43 | `src/analyzer/middleware-detector.ts` | module |
| 42 | `src/indexer/metadata-index.ts` | module |
| 41 | `src/cli/coderef-rag-server.ts` | CLI |
| 35 | `src/export/graph-exporter.ts` | module |
| 35 | `src/indexer/indexer-service.ts` | service |
| 31 | `src/cli/coderef-watch.ts` | CLI |
| 6 | `src/cli/mcp/context-tools.ts` | module |

### Tier 2 — highest-fan-in undocumented modules the rankings missed (6)

| fan-in | module | suggested category |
|---|---|---|
| 107 | `src/pipeline/doc-ingest.ts` | module |
| 92 | `src/validator/route-normalizer.ts` | validator |
| 90 | `src/semantic/header-generator.ts` | module |
| 73 | `src/query/change-dossier.ts` | module |
| 68 | `src/pipeline/semantic-header-parser.ts` | parser |
| 60 | `src/validator/route-matcher.ts` | validator |

Categories are suggestions — they drive INDEX grouping via the 9-header artifact-kind
taxonomy, so pick from the closed enum deliberately rather than defaulting to `module`.

## Coverage context

- non-test `src/` files: **243**
- with a resource sheet today: **97 (40%)**
- undocumented: **146 (60%)**
- these 19 take it to **116 (48%)**

## Known-good order

`src/pipeline/doc-ingest.ts` first. It has the second-highest fan-in of any undocumented
file in the repo, it gained six exported functions on 2026-08-01, and it is the engine of
the doc lane itself — currently undocumented.

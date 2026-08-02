---
kind: doc-code-tie
status: living
domain: CODEREF-CORE
workorder: WO-LAND-DOC-CODE-TIE-IN-CORE-001
---

# Doc ↔ code tie — CODEREF-CORE

> **Kind:** `doc-code-tie` · **Registry:** `ASSISTANT/SKILLS/STANDARDS/kinds/`
> This file declares which of CORE's source files are bound to their documentation.
> The checker (`SKILLS/STANDARDS/kinds/doc-code-tie/check.mjs`) walks each declared
> scope and validates that every `@doc-ref:` in an in-scope file resolves, and that
> the paired doc names the code back. The commit-time gate lives in CORE's
> `.githooks/pre-commit`; this standard declares the scope that gate reads.

## Why this exists at all, and why it did not until now

Until 2026-08-01 this kind resolved **not_applicable** for CORE. Its `applies`
predicate requires a project to declare at least one scope here, and CORE declared
none — so the checker correctly graded nothing, and no doc↔code drift was caught in
either direction. CORE also had **no git hooks whatsoever**: no `core.hooksPath`, no
non-sample hooks. There was nowhere to put a gate even if one had been written.

`WO-REPO-SAFE-SHARED-PRECOMMIT-CHASSIS-001` fixed the second half — CORE now runs a
pre-commit chain with a repo-safe resolution contract, so a checker wired there
grades **CORE's** staged set rather than ASSISTANT's. This file is the first half.

## The tie, both directions

- **code → doc**: a source file carries `// @doc-ref: <doc-path>` near its top.
  A comma/space list is legal when one file is genuinely covered by several docs.
- **doc → code**: the doc's frontmatter carries `documents: <code-path>` (or `tracks:`).

Grading: an unresolved `@doc-ref` path is a **FAIL**; a doc that does not name the
code back is a **WARN**; an in-scope file carrying no `@doc-ref` at all is a **WARN**.

## Scopes

<!-- The `## Scopes` heading is LOAD-BEARING, not decorative: the checker's
     parseScopes() keys on it literally and is scoped to this section. A more
     descriptive heading ("Declared scope") makes the whole kind silently report
     not_applicable — the standard exists, the table is right there, and nothing
     is graded. Do not rename this heading. -->

Globs are project-root-relative.

| glob | note |
|---|---|
| src/cli/mcp/shared.ts | wave 1 — import fan-in 59; tied to mcp_shared-RESOURCE-SHEET.md |
| src/utils/path-normalize.ts | wave 1 — import fan-in 38; tied to path_normalize-RESOURCE-SHEET.md |
| src/scanner/scanner.ts | wave 1 — import fan-in 27; tied to scanner-RESOURCE-SHEET.md |

<!-- Add one row per in-scope subtree, by WAVE. Do NOT widen to src/**/*.ts in one
     step — that would WARN on every untagged file in the repo, which is precisely
     the estate-wide wall this opt-in scope exists to prevent. A gate that fires on
     hundreds of files nobody has triaged gets bypassed reflexively, and a bypassed
     gate detects nothing. Widen one subtree at a time, only after the current scope
     runs clean, then ratchet reciprocity from WARN toward FAIL. -->

### How wave 1 was chosen, and what was deliberately left out

Selected on **measured** import fan-in from `.coderef/graph.json`, not on taste. Each
of the three already carries a resource sheet whose `documents:` frontmatter names it,
so the doc→code half existed before this WO and only the `@doc-ref` tag was missing —
which is what makes a three-file wave landable without authoring three new docs.

Two higher-ranked candidates were **excluded on purpose**:

- `src/pipeline/orchestrator.ts` — the highest fan-in in the repo at 62. Its sheet
  currently grades **WARN** on the drift checker. A wave must start clean, or its very
  first run reports a failure the wave did not cause, and the reader learns to discount
  the gate. It joins wave 2 once its sheet is clean.
- `src/pipeline/call-resolver.ts` — carries known `drift.api-complete` membership drift.
  Same reasoning.

## How to tie a doc and its code

1. In the **code** file, near the top: `// @doc-ref: <doc-path>`
2. In the **doc**, frontmatter: `documents: <code-path>` (or `tracks:`)
3. Verify:
   ```
   node <ASSISTANT>/SKILLS/STANDARDS/kinds/doc-code-tie/check.mjs \
     --project-root=. --standard=docs/standards/doc-code-tie.md
   ```

## What this does NOT cover

**Most of CORE.** Three files are in scope; every other source file is ungated, in
both directions. "CORE has doc-code drift enforcement" is not a true sentence — "CORE
has it for three files" is. That distinction is the whole point of wave-based rollout,
and it should stay written down until the scope is wide enough that it stops mattering.

This standard also does not check whether a doc's **claims** are still true — only that
the binding resolves and is reciprocal. Claim-truth for resource sheets is a separate
instrument (`sheet.anchors-resolve` in the resource-sheet kind, plus
`check-sheet-drift.mjs`).

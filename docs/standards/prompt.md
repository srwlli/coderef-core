---
title: Prompt Standard
kind: prompt
status: living
updated: 2026-07-17
---
<!-- Authored from SKILLS/STANDARDS/kinds/prompt/template.md v1.0.0 (placement pass 3
     of the prompt kind, STUB-9JZM0D). CODEREF-CORE's declaration of its reusable RAG
     and AI-prompt-generator templates. Governed IN-PLACE: the payloads stay in their
     typed TypeScript modules; the contract sidecars live under docs/standards/prompt/
     (mirroring the DASHBOARD pattern — no code moves). -->

# Prompt Standard

> This project's declaration of its PERSISTED, REUSABLE LLM prompts. The checker
> (`ASSISTANT: SKILLS/STANDARDS/kinds/prompt/check.mjs`) reads the "## Declared
> Prompts" table and validates each prompt's contract sidecar against its payload.

## The defining invariant

> Every reusable prompt carries a **machine-readable contract** — identity, typed
> input placeholders, declared output expectations — in a metadata **sidecar** next
> to its payload (here: under `docs/standards/prompt/`, since the payloads live in
> typed TypeScript modules that are governed in-place). Metadata/payload separation
> is mandatory: the payload stays clean (render-ready); the contract lives beside it.
> An undeclared template token in a scannable text payload is a FAIL.

Two orthogonal axes classify every prompt (do not merge them):

- **variant** (ROLE): `system-bootstrap` · `task-template` · `research-run` ·
  `rag-grounding` · `context-assembly` · `creative-generation`
- **form** (SHAPE): `static-fill` · `registry-interpolation` · `composed` ·
  `runtime-assembly` · `persona-system` · `creative-registry`

## Declared Prompts

| prompt_id | payload | contract |
|---|---|---|
| core-system-prompt | src/integration/rag/prompt-templates.ts | docs/standards/prompt/core-system-prompt.prompt.json |
| core-qa-template | src/integration/rag/prompt-templates.ts | docs/standards/prompt/core-qa-template.prompt.json |
| core-conversational-template | src/integration/rag/prompt-templates.ts | docs/standards/prompt/core-conversational-template.prompt.json |
| core-explanation-prompt | src/integration/rag/prompt-templates.ts | docs/standards/prompt/core-explanation-prompt.prompt.json |
| core-comparison-prompt | src/integration/rag/prompt-templates.ts | docs/standards/prompt/core-comparison-prompt.prompt.json |
| core-best-practices-prompt | src/integration/rag/prompt-templates.ts | docs/standards/prompt/core-best-practices-prompt.prompt.json |
| core-build-instructions-from-preferences | src/integration/rag/prompt-templates.ts | docs/standards/prompt/core-build-instructions-from-preferences.prompt.json |
| core-query-understanding | src/integration/ai-prompt-generator.ts | docs/standards/prompt/core-query-understanding.prompt.json |
| core-query-impact | src/integration/ai-prompt-generator.ts | docs/standards/prompt/core-query-impact.prompt.json |
| core-query-refactoring | src/integration/ai-prompt-generator.ts | docs/standards/prompt/core-query-refactoring.prompt.json |
| core-query-general | src/integration/ai-prompt-generator.ts | docs/standards/prompt/core-query-general.prompt.json |

<!-- All 11 declared (placement pass 3, 2026-07-17). Payloads govern in-place:
     prompts 1-7 live in src/integration/rag/prompt-templates.ts, prompts 8-11 in
     src/integration/ai-prompt-generator.ts (the getTemplate templates object).
     The ONLY 3-cell pipe table the checker reads is this section's; paths are
     project-root-relative.

     TOKEN-UNION NOTE: the token scanner reads the WHOLE payload file. For the five
     static-fill/double-brace prompts (2-6), all sharing prompt-templates.ts, each
     sidecar declares the UNION of every {{token}} in that file (question, context,
     additionalInstructions, conversationHistory) so no token is undeclared (FAIL);
     tokens a given prompt doesn't use are dead declarations = WARN only. The
     persona-system (core-system-prompt), runtime-assembly
     (core-build-instructions-from-preferences), and composed (core-query-*) forms
     are NOT token-scanned — they are file-existence + shape checks only. -->

## How to add a prompt

1. Author the payload (add the template symbol / registry entry to its TS module).
2. Author the contract sidecar under `docs/standards/prompt/`
   (`<prompt-id>.prompt.json`); declare every template token the payload uses — and,
   for a payload FILE shared by several static-fill/brace prompts, the union of all
   brace tokens in that file.
3. Add one row to the table above.
4. Verify from the ASSISTANT repo:
   `node SKILLS/STANDARDS/kinds/prompt/check.mjs --project-root=<CORE-ABS> --standard=<CORE-ABS>/docs/standards/prompt.md --json`

## What the checker verifies

For each declared row: payload exists → contract exists + parses → contract shape
(ids match, enums valid: variant/form/dialect/output.format) → for scannable text
payloads (form `static-fill`/`persona-system` with a brace dialect) every payload
token is declared (undeclared = FAIL) and every declared placeholder is used
(unused = WARN). The `composed`, `runtime-assembly`, and `none`-dialect forms are
file-existence + shape checks only (token scan skipped). Chains are NOT declared
here — multi-step work is a separate artifact referencing prompt ids; the I/O
contract is the composition seam.

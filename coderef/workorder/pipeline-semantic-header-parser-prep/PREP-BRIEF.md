# Phase 2.5 Prep Brief — pipeline-semantic-header-parser

You are a **read-only prep agent** for Phase 2.5 of the CodeRef Core 9-phase pipeline rebuild.

## Role Boundaries (HARD)

- **Read-only.** No source code edits. No staging. No commits.
- Produce two deliverables: `context.json` and `analysis.json`. Drop both into this directory.
- Hand back when done. The orchestrator (Claude Opus) authors `plan.json` from your deliverables, using the newly-shipped `/plan-tests-for-workorder` skill for test-matrix planning.

## What Phase 2.5 Does

Phase 2.5 implements the **semantic header parser** — the missing piece that turns `@coderef-semantic` documentation into runtime truth. Today, every CodeRef element ships with `headerStatus='missing'` because no parser exists. This phase ships the parser.

The parser consumes the **canonical BNF grammar** defined in `C:\Users\willh\Desktop\CODEREF\ASSISTANT\SKILLS\ANALYSIS\analyze-coderef-semantics\SKILL.md` and extracts header tags from leading source comments.

## What You Read

1. **Canonical BNF grammar** — `C:\Users\willh\Desktop\CODEREF\ASSISTANT\SKILLS\ANALYSIS\analyze-coderef-semantics\SKILL.md`. Read in full. Extract the grammar definition, all six tag types (`@coderef-semantic`, `@layer`, `@capability`, `@constraint`, `@exports`, `@imports`, `@generated`), and any explicit error-state semantics.

2. **Roadmap Phase 2.5 section** — `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\roadmap.md`, lines 188-220. Note exit criteria.

3. **Layer enum** — `C:\Users\willh\Desktop\CODEREF\ASSISTANT\STANDARDS\layers.json`. The `@layer` tag must validate against this enum at runtime (NOT a TypeScript literal union — runtime load only). Phase 1 already shipped a loader at `src/pipeline/element-taxonomy.ts`; the parser uses that loader.

4. **Phase 1 + Phase 2 commits.**
   - Phase 1: archived at `coderef/archived/pipeline-scanner-identity-taxonomy/` (commit `382e9bb`). Read its execution-notes. Note ElementData fields shipped (layer, capability, constraints, headerStatus).
   - Phase 2: archived at `coderef/archived/pipeline-relationship-raw-facts/` (commit `2a2787a`). Read its execution-notes. Note `RawHeaderImportFact` placeholders — Phase 2.5 turns those placeholders into structured records.

5. **Current code surface to grep:**
   - `src/pipeline/element-taxonomy.ts` — Phase 1's loader for `STANDARDS/layers.json`. The parser uses this for `@layer` validation.
   - `src/pipeline/extractors/relationship-extractor.ts` — Phase 2's `extractRawHeaderImports` + `collectHeaderImportPlaceholders`. The parser replaces the placeholder logic.
   - `src/pipeline/types.ts` — `RawHeaderImportFact` (current placeholder shape). Phase 2.5 introduces `HeaderFact` (structured shape).
   - `src/types/types.ts` — `ElementData.headerStatus` enum: 'defined' | 'stale' | 'missing' | 'partial'. Phase 2.5 transitions every element from 'missing' to one of the other three states.
   - Anywhere in `src/` that reads `headerStatus` (grep). Phase 2.5 must not break those consumers.

## What Phase 2.5 Produces

Per roadmap lines 194-218, every source file walked produces:
- A `HeaderFact` (possibly empty if no header) with parsed fields.
- A `headerStatus` value:
  - `defined` — header present, all required tags valid, `@exports` matches AST exports.
  - `stale` — header present but `@exports` lists symbols not in the AST.
  - `partial` — header present but malformed (parse error in one or more tags); structured parse-error record attached.
  - `missing` — no header block in the file at all.

The parser must:
- Cross-check `@exports` against the AST's actual exports (Phase 2 emits these as `RawExportFact[]` — Phase 2.5 reads them).
- Validate `@layer` against `STANDARDS/layers.json` enum **at runtime** (using `element-taxonomy.ts` loader). Fail closed if the enum drifts.
- Replace `RawHeaderImportFact` placeholders with structured `HeaderImportFact` records (each `<module>:<symbol>` becomes parsed fields). Do NOT resolve the imports — that's Phase 3.

## What You Produce

### 1. `context.json`

Standard workorder context shape:
```json
{
  "workorder_id": "WO-PIPELINE-SEMANTIC-HEADER-PARSER-001",
  "feature_name": "pipeline-semantic-header-parser",
  "project_id": "coderef-core",
  "predecessor": "WO-PIPELINE-RELATIONSHIP-RAW-FACTS-001",
  "objective": "Implement the canonical semantic header parser. Every source file walked produces a HeaderFact and a headerStatus. @layer validates against STANDARDS/layers.json at runtime. @exports cross-checks against AST exports. Files transition out of headerStatus='missing'.",
  "scope": {
    "in": [...],
    "out": [...]
  },
  "hard_constraints": [...]
}
```

Out-of-scope MUST include: `@imports` resolution (Phase 3), graph validation contract (Phase 6), `--strict-headers` gate (Phase 6), RAG facets (Phase 7).

### 2. `analysis.json`

Required keys:
```json
{
  "blast_radius": {
    "files_modified": [{"path": "...", "reason": "..."}],
    "files_created": [{"path": "...", "purpose": "..."}],
    "files_deleted": [{"path": "...", "reason": "..."}]
  },
  "risks": [
    {"id": "R1", "description": "...", "mitigation": "...", "severity": "high|medium|low"}
  ],
  "decision_records": [
    {"decision": "...", "rationale": "...", "alternatives_considered": [...]}
  ],
  "parser_surface": {
    "tag_types": [...],
    "error_states": [...],
    "cross_checks": [...]
  },
  "test_planning_notes": "Brief: what should /plan-tests-for-workorder pay attention to. Not a full test matrix — leave that for the skill."
}
```

The `parser_surface` block is critical — it's the structured shape that `/plan-tests-for-workorder` will consume during plan authoring. Be specific about every tag type, every error state transition, every cross-check the parser performs.

## Discipline Reminders

- The BNF grammar lives in `analyze-coderef-semantics/SKILL.md` and is **canonical**. Do NOT propose grammar changes. If you find ambiguity, document it as a `decision_record` for the plan author to adjudicate.
- The `@layer` enum is in `STANDARDS/layers.json` and is **canonical**. The parser validates against it at runtime via `element-taxonomy.ts`. Do NOT propose hardcoding the enum in TypeScript.
- Do NOT propose resolution of `@imports` — that's Phase 3.
- Do NOT propose the `--strict-headers` validation gate — that's Phase 6.
- If a file looks like Phase 2.5 needs to touch it but you're unsure, list it in `blast_radius` with `reason: "uncertain — flag for plan author"`.

## When Done

Write both files to:
- `coderef/workorder/pipeline-semantic-header-parser-prep/context.json`
- `coderef/workorder/pipeline-semantic-header-parser-prep/analysis.json`

Then exit. Do not start implementation. Do not edit any source file. Do not commit.

# Phase 8 Prep Brief — Documentation Update

**Phase:** 10 of 10 gated steps (Phase 8 of 9 in roadmap numbering — final phase)
**Workorder slug (target):** `pipeline-documentation-update` (this prep dir is `pipeline-documentation-update-prep`)
**Predecessor:** Phase 7 (indexing/RAG) ARCHIVED 2026-05-05 — commits `63da6ae..2c02878` + archive `689af34` in CORE + ledger `2c83682` in ASSISTANT
**Roadmap section:** `roadmap.md` lines 451–476 (`## Phase 8 - Documentation Update`)
**Final Definition of Done item:** #9 — "docs match actual schemas and behavior"

---

## Why this phase exists (the load-bearing why)

Eight phases of pipeline rebuild produced canonical IDs, semantic header parsing, three layers of resolution (imports/calls/graph), output validation, and indexing/RAG with semantic facets. The code is now the source of truth. The docs are NOT — many were written against earlier intermediate states or the pre-rebuild scanner.

Phase 8's job is single-purpose: **make the docs match the code.** No new behavior. No new code paths. No schema additions. Just truth-up the documentation surfaces against what the rebuild actually shipped.

This is the final gate. After Phase 8, the rebuild is done.

---

## Hard scope boundaries

**In-scope (the 7 required doc surfaces, per roadmap line 455):**

1. **Scanner schema** — including `layer`, `capability`, `constraints`, `headerStatus` fields on ElementData
2. **Relationship schema** — the 4 raw fact types (RawImportFact, RawCallFact, RawExportFact) + resolved relationships
3. **Header grammar** — canonical doc in `docs/`, mirroring the BNF in `SKILLS/ANALYSIS/analyze-coderef-semantics/SKILL.md`
4. **Graph schema** — 8-field edge schema (id, sourceId, targetId, relationship, resolutionStatus, evidence, sourceLocation, candidates), 10-variant discriminated-union EdgeEvidence, GraphNode shape including Phase 7's facet metadata propagation
5. **Resolution statuses** — the full set across import-resolution, call-resolution, with their semantics
6. **Public API contract** — what programmatic callers can rely on
7. **Agent usage contract** — what agents/tools should read vs ignore

**In-scope (the 7 required distinctions, per roadmap line 466):**

Docs must clearly distinguish:
- raw extracted facts
- resolved relationships
- unresolved relationships
- graph edges
- header-derived edges vs AST-derived edges
- external dependencies
- built-ins

**In-scope:**
- Removing stale claims (per roadmap line 475 — "Remove stale claims")
- Updating existing docs in `docs/` and root `*.md` files where they conflict with shipped behavior
- Ensuring `--strict-headers` semantics are documented (Phase 6 contract)
- Ensuring indexing's `validation-report.json` gate + status field + per-entry skip reasons are documented (Phase 7 contract)
- Ensuring `--layer` / `--capability` filter flags on `rag-search` are documented (Phase 7 contract)

**Out-of-scope (HARD STOPS):**
- ❌ NO source code changes. ZERO. If a doc is wrong because the code is wrong, file a stub — do NOT fix the code in Phase 8.
- ❌ NO new test changes (the `no-phase-8-docs-leak.test.ts` boundary enforcer is Phase 7's gate; Phase 8 keeps it green by NOT adding any of the 8 forbidden field names to Phase 7 surfaces)
- ❌ NO Phase 9 anything (there is no Phase 9 — Phase 8 is the final phase)
- ❌ NO new CLI flags
- ❌ NO new schema fields, no new resolution statuses, no new evidence variants
- ❌ NO ROUTER work (held)
- ❌ NO LLOYD changes
- ❌ NO ASSISTANT-side skill changes (skills can read the new docs, but skill authoring is its own track)

**The boundary enforcer test** (`__tests__/pipeline/no-phase-8-docs-leak.test.ts`, shipped in Phase 7) declares 8 forbidden field names that must not leak into Phase 7 surfaces:
```
docsGenerated, schemaDocPath, schemaDocMd, apiContractMd,
agentUsageContractMd, headerGrammarDocPath, documentationVersion,
docsBuildTimestamp
```
Phase 8 work happens entirely in `docs/` + root `*.md` files — none of those forbidden names should ever appear in TypeScript source under `src/`. **The boundary stays clean by virtue of doing the work where it belongs (in markdown), not by negotiating with the enforcer.**

---

## Read-only source surfaces (prep agent: survey to plan, do NOT modify)

Existing doc surfaces (the things Phase 8 will rewrite or trim):
- `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/SCHEMA.md`, `docs/CLI.md`
- `docs/coderef-semantic-schema.md` — likely outdated against Phase 1+2.5
- `docs/COMPONENTS.md`, `docs/MIGRATION.md`
- Root `README.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `CONTRIBUTING.md`, `CHANGELOG.md`
- Root audit-style markdown: `EXECUTIVE-SUMMARY.md`, `AUDIT-REPORT.md`, `CODEREF-ANALYSIS-REPORT.md`, `DUPLICATE-FILES-AUDIT.md`, `IMPORTANT-WORKORDER-FILES.md` — most of these are point-in-time snapshots; survey to flag stale-vs-evergreen
- `docs/coderef-semantic-schema.md`, `docs/examples-semantic-index.json`

Authoritative code-side surfaces (read these to know what truth is):
- `src/semantic/element-data.ts` (or wherever ElementData lives) → scanner schema source of truth
- `src/pipeline/types.ts` → PipelineState shape
- `src/pipeline/relationship-extractor.ts` (or similar) → raw fact types
- `src/pipeline/output-validator.ts` → ValidationResult / ValidationReport contract
- `src/pipeline/graph-builder.ts` → 8-field edge + GraphNode + EdgeEvidence union
- `src/integration/rag/code-chunk.ts` + `indexing-orchestrator.ts` → CodeChunk + IndexingResult shape, status field, skip reasons
- `SKILLS/ANALYSIS/analyze-coderef-semantics/SKILL.md` (in ASSISTANT repo, NOT CORE) → BNF grammar canonical source (mirror, do not duplicate authority)
- `STANDARDS/layers.json` (ASSISTANT repo) → @layer enum source of truth

Phase archives — each one's `ARCHIVED.md` is the load-bearing summary of what shipped:
- `coderef/archived/pipeline-graph-ground-truth-tests/` (Phase 0)
- `coderef/archived/pipeline-scanner-identity-taxonomy/` (Phase 1)
- `coderef/archived/pipeline-relationship-raw-facts/` (Phase 2)
- `coderef/archived/pipeline-semantic-header-parser/` (Phase 2.5)
- `coderef/archived/pipeline-import-resolution/` (Phase 3)
- `coderef/archived/pipeline-call-resolution/` (Phase 4)
- `coderef/archived/pipeline-graph-construction/` (Phase 5)
- `coderef/archived/pipeline-output-validation/` (Phase 6)
- `coderef/archived/pipeline-indexing-rag/` (Phase 7)

Phase 0 ground-truth tests (must continue PASS — no behavioral change):
- `__tests__/pipeline/graph-ground-truth.test.ts` — all 6 assertions PASS

Phase 8 boundary enforcer (already shipped in Phase 7):
- `__tests__/pipeline/no-phase-8-docs-leak.test.ts` — must remain green; Phase 8 work in `docs/` keeps it trivially green

---

## Deliverables expected from prep agent

The prep agent must produce TWO files in this directory:

### 1. `context.json`

Required fields (mirror Phase 7 prep schema):
- `phase`: "Phase 8 - Documentation Update"
- `predecessor_state`: paste-ready summary of Phase 7 archive state (commits, validation-report baseline, ground-truth state, IndexingResult contract, AC-09 Path A 262/262)
- `acceptance_criteria`: 8–12 ACs covering the 7 required docs + 7 required distinctions + stale-claim removal + boundary enforcer green
- `out_of_scope`: explicit list (use the HARD STOPS above)
- `existing_doc_surfaces`: file-level inventory of `docs/` + root `*.md` with "current state" tag (current-truthful / stale-needs-rewrite / point-in-time-archive / unsure-ask)
- `boundary_enforcer_disposition`: `__tests__/pipeline/no-phase-8-docs-leak.test.ts` stays green by Phase 8 doing its work in markdown — assert no new TypeScript field names from the forbidden 8 are introduced
- `truth_sources`: map from doc-topic → authoritative code surface (e.g., "graph schema → src/pipeline/graph-builder.ts + Phase 5 archive analysis.json")
- `style_guide_decisions`: any conventions the doc rewrite needs to commit to (e.g., one-source-per-topic vs cross-link, README as table-of-contents vs standalone)

### 2. `analysis.json`

Required:
- `risks`: 5–8 risks with id (R-PHASE-8-A, B, ...). Likely candidates: stale-fact regressions during rewrite, doc-vs-code drift discovery (file stub vs piggyback), MIGRATION.md backward-compat claims that no longer hold, BNF mirror vs authoritative-in-ASSISTANT divergence
- `decision_records`: 3–5 DRs (DR-PHASE-8-A, B, ...). Likely candidates: which existing audit-style root-level `*.md` files to archive vs delete vs leave in place; whether to consolidate `docs/` topics or keep current file structure; how to point CORE docs at ASSISTANT-side authoritative sources without duplicating them
- `key_files_to_touch`: ranked list of doc files Phase 8 will rewrite/trim, with one-line reason each (truth-up-to-Phase-X / remove-stale-claim / mirror-from-source)
- `key_files_to_read_only`: code surfaces the impl will read but NOT change (the truth sources)
- `stale_claim_inventory`: best-effort enumeration of known doc-vs-code conflicts surfaced during prep (e.g., "AGENTS.md mentions DependencyGraph but Phase 5 made ExportedGraph canonical"). Each entry: `{file, line_or_section, claim, reality, source_of_truth}`
- `cross_reference_map`: for each of the 7 required docs, where its content currently lives (existing file to update, or new file to create)
- `phase_8_completion_criteria`: testable signals that Phase 8 is done (boundary enforcer green, all 7 required docs present, all 7 distinctions explicit somewhere, no claim contradicts current code)

---

## Halt-and-report points (prep agent)

Stop and report to ORCHESTRATOR before writing the files if you encounter:
1. **Code-vs-doc conflict that requires a code fix.** Phase 8 is doc-only. If reality is wrong, file a stub for a follow-up WO; do NOT propose a code change in this prep.
2. **BNF grammar in two authoritative locations.** The `SKILLS/ANALYSIS/analyze-coderef-semantics/SKILL.md` BNF is canonical (per `STANDARDS/` convention). Phase 8's header grammar doc must mirror, not fork. If you discover divergence already exists, escalate before proposing reconciliation.
3. **Existing audit-style root markdown files are mid-revision** (e.g., another agent has open work touching `EXECUTIVE-SUMMARY.md`). Halt and ask which to leave alone.
4. **The 7 required docs don't decompose into 8–12 ACs cleanly** (some ACs would need to span multiple docs, or a single doc demands multiple ACs). Tell ORCHESTRATOR.
5. **A required doc surface has NO existing file and would be greenfield** (e.g., no docs/HEADER-GRAMMAR.md exists today). Surface this — Phase 8 may need to create new files, but ORCHESTRATOR rules on filenames.

---

## Constraints

- **READ-ONLY agent.** Do not modify any file outside this prep dir. Only writes are to `context.json` and `analysis.json` in THIS directory.
- **No code changes.** Phase 8 is doc-only by definition. If the prep agent finds a code bug, file a stub through the normal flow (do NOT inline-fix).
- **Real numbers only.** Cite real counts from each phase's archive, not invented baselines. The Phase 7 baseline (valid_edge_count=3464, header_missing=262) is the post-rebuild ground truth.
- **No Phase 9.** This is the final phase. Don't propose follow-on phases as if Phase 9 exists.
- **Phase archives are canonical.** When a phase's behavior conflicts with an existing doc, the phase archive's `ARCHIVED.md` + `analysis.json` win.

---

## Pipeline context (for the agent who joins cold)

9 of 10 gated steps archived: 0, 1, 2, 2.5, 3, 4, 5, 6, 7. All 6 ground-truth assertions PASS. The pipeline now produces canonical IDs, resolved imports + calls, validated graph, refuses to emit invalid output, and indexes with semantic-facet metadata + per-entry skip reasons. AC-09 alignment: Path A worst-severity 262/262.

Phase 8 is the final phase. Its job is to make the docs match the code, not the other way around. After Phase 8 archives, the 9-phase rebuild is complete and the Final Definition of Done (roadmap line 494) is satisfied.

The boundary enforcer that will keep Phase 8 honest already exists (`__tests__/pipeline/no-phase-8-docs-leak.test.ts`, shipped in Phase 7). It declares 8 forbidden TypeScript field names that must not appear in Phase 7 surfaces. Phase 8 keeps it green by doing all its work in markdown.

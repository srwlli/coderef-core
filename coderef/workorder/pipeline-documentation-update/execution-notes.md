# WO-PIPELINE-DOCUMENTATION-UPDATE-001 — Execution Notes

**Phase:** Phase 8 — Documentation Update (final phase of 9-phase pipeline rebuild)
**Dispatch:** DISPATCH-2026-05-04-002
**Owner:** CODEREF-CORE
**Started:** 2026-05-05T01:05:00Z

---

## Locked decisions (load-bearing — apply through closeout)

### DR-PHASE-8-D revision (2026-05-05, ORCHESTRATOR ruling Path C)

Original DR-PHASE-8-D framed CLAUDE.md and GEMINI.md as "agent-specific addenda that link back to AGENTS.md as the base contract." Survey at task 1.1 found all three root agent docs are 5-line pointer stubs delegating to `ASSISTANT/PROJECT-CONTEXT/coderef-core/CONTEXT.md`, which is the canonical project-context document Claude Code reads via the project-instructions header.

**Path C ruling (verbatim from ORCHESTRATOR):**

- AGENTS.md = canonical CORE-side agent-usage contract (~150 lines: validation-report.json gate, IndexingResult.status semantics, rag-index exit codes, what-not-to-read, gate contract) + footer pointer to ASSISTANT/PROJECT-CONTEXT/coderef-core/CONTEXT.md for general project rules.
- CLAUDE.md and GEMINI.md = unchanged 5-line pointer stubs (NOT addenda). Their current purity is what Claude Code reads via project-instructions; touching them risks regressing the Claude Code surface.
- Plan task 1.10 revised: "Verify CLAUDE.md/GEMINI.md remain pointer stubs; no edits needed."
- No ASSISTANT-side writes. CONTEXT.md stays as-is for now; if it has stale pre-Phase-7 content, file a stub for an ASSISTANT-side follow-up WO.

### Style-guide decisions (task 1.2)

- **One-source-per-topic** — each schema/contract gets ONE canonical doc; others cross-link (DR-PHASE-8-B confirmed).
- **SCHEMA.md is canonical for scanner schema, relationship schema, graph schema, and resolution statuses.** Single file, four sibling sections. NOT a separate GRAPH-SCHEMA.md — keeping graph schema as a SCHEMA.md section avoids fragmentation and matches DR-PHASE-8-B "one-source-per-topic" by treating "graph topology + edge typing" as part of the schema family.
- **HEADER-GRAMMAR.md is a NEW standalone mirror** of the ASSISTANT canonical BNF (DR-PHASE-8-C). Standalone (not a SCHEMA.md section) because the BNF is mirrored content with its own sync-touchpoint convention and citation banner.
- **Audit-style root markdown** → archive to `docs/archive/<filename>-2026-05-05.md` with dated banner (DR-PHASE-8-A confirmed).
- **CHANGELOG.md** keeps current format (DR-PHASE-8-E confirmed).
- **README.md** is a standalone summary of the post-rebuild project state, with cross-links to docs/ for details. Not a pure ToC.
- **AGENT-WORKFLOW-GUIDE.md** stays as a standalone "how-to-do-tasks" doc, distinct from AGENTS.md ("what-to-read-as-base-contract"). Decided in task 1.17.

---

## Survey inventory (task 1.1)

### Root markdown disposition

| File | Lines | Disposition | Notes |
|------|-------|-------------|-------|
| AGENTS.md | 5 | rewrite (Path C) | 5-line pointer to CONTEXT.md; expanding to canonical contract per DR-PHASE-8-D revision |
| CLAUDE.md | 5 | unchanged | pointer stub; Claude Code project-instructions surface |
| GEMINI.md | 5 | unchanged | pointer stub; mirrors CLAUDE.md pattern |
| CONTRIBUTING.md | 218 | survey-and-decide (task 1.16) | TBD if pipeline-workflow content is present |
| README.md | 856 | audit-and-update (task 1.20) | top-level summary alignment + cross-link audit |
| CHANGELOG.md | 112 | append-entry (task 1.19) | Phase 8 dated entry + rebuild-complete line |
| EXECUTIVE-SUMMARY.md | 109 | archive-with-banner | DR-PHASE-8-A |
| CODEREF-ANALYSIS-REPORT.md | 487 | archive-with-banner | DR-PHASE-8-A |
| DUPLICATE-FILES-AUDIT.md | 325 | archive-with-banner | DR-PHASE-8-A |
| GENERATE_FOUNDATION_DOCS_ALIGNMENT_PLAN.md | 378 | archive-with-banner | DR-PHASE-8-A |
| AUDIT-REPORT.md | n/a | not at root | lives at `docs/AUDIT-REPORT.md`; survey under task 1.18 |
| IMPORTANT-WORKORDER-FILES.md | tbd | survey | task 1.18 |
| PHASE-1B-COMPLETION-REPORT.md, PHASE-2-COMPLETION-REPORT.md, PROOF-OF-FIXES.md, TEST-FAILURE-ROOT-CAUSES.md, coderef-core-external-review.md, coderef-core-quickstart.md, cowork-mode-review.md, guide-to-coderef-core.md, roadmap.md | tbd | survey under task 1.18; roadmap.md is load-bearing — leave alone unless drift |

### docs/ disposition

| File | Lines | Action | Notes |
|------|-------|--------|-------|
| SCHEMA.md | 519 | rewrite | tasks 1.3-1.6 — primary canonical schema doc |
| API.md | 826 | rewrite | task 1.8 — public API contract per AC-06 |
| CLI.md | 756 | update | task 1.11 — add --strict-headers + --layer/--capability |
| ARCHITECTURE.md | 497 | rewrite-or-trim | task 1.13 — Phase 5 ExportedGraph canonical |
| MIGRATION.md | 367 | rewrite-or-archive | task 1.14 — likely fully stale per R-PHASE-8-D |
| coderef-semantic-schema.md | 324 | merge-into-SCHEMA-or-archive | task 1.14 — predates Phase 1+2.5 |
| rag-http-api.md | 307 | update | task 1.12 — Phase 7 alignment |
| AGENT-WORKFLOW-GUIDE.md | 998 | survey-and-decide | task 1.17 — keep distinct from AGENTS.md per task 1.2 |
| AUDIT-REPORT.md | tbd | survey | task 1.18 — likely point-in-time |
| COMPONENTS.md, DEPLOY-CODEREF-RAG-SERVER.md, DEPLOY-CODEREF-WATCH.md, FRONTEND-CALL-DETECTION.md, LLOYD-INTEGRATION.md, README.md, ROUTE-DETECTION.md, ROUTE-VALIDATION.md, ROUTE.md, plugins/ | tbd | survey under task 1.18 |
| examples-semantic-index.json | n/a | survey | task 1.18 — verify against current scanner output |

---

## Truth-source map (verified at task 1.1)

| Topic | Source file | Notes |
|-------|-------------|-------|
| ElementData (scanner schema) | `src/types/types.ts` lines 304-412 | NOT `src/semantic/element-data.ts` (does not exist); facets at lines 313-320 (layer/capability/constraints/headerStatus); headerFact at line 328 |
| PipelineState | `src/pipeline/types.ts` lines 94-163 | rawImports/rawCalls/rawExports/headerFacts/headerImportFacts/importResolutions/callResolutions/graph populated by orchestrator |
| Raw fact types | `src/pipeline/types.ts` lines 274-352 | RawImportFact, RawCallFact, RawExportFact, RawImportSpecifier, RawExportKind |
| Raw extractor | `src/pipeline/extractors/relationship-extractor.ts` | populates rawImports/rawCalls/rawExports |
| HeaderFact types | `src/pipeline/header-fact.ts` | HeaderFact, HeaderImportFact, HeaderParseError |
| ImportResolutionKind (7 values) | `src/pipeline/import-resolver.ts` lines 68-75 | resolved/unresolved/external/ambiguous/dynamic/typeOnly/stale |
| ImportResolution shape | `src/pipeline/import-resolver.ts` lines 83+ | per-binding record |
| ExportTable | `src/pipeline/import-resolver.ts` lines 143-153 | ExportTableEntry + Map<string, Map<string, ExportTableEntry>> |
| CallResolutionKind (5 values) | `src/pipeline/call-resolver.ts` lines 73-78 | resolved/unresolved/ambiguous/external/builtin |
| CallResolution + SymbolTable | `src/pipeline/call-resolver.ts` lines 85+, 132+, 172 | |
| BUILTIN_RECEIVERS (15 names) | `src/pipeline/call-resolver.ts` lines 183-199 | Array, Object, Promise, Map, Set, String, Number, Boolean, RegExp, Date, Error, JSON, Math, Reflect, Symbol |
| EdgeRelationship | `src/pipeline/graph-builder.ts` line 72 | import/call/export/header-import |
| EdgeResolutionStatus (8 values) | `src/pipeline/graph-builder.ts` lines 77-85 | resolved/unresolved/ambiguous/external/builtin/dynamic/typeOnly/stale |
| EdgeEvidence (10-variant union) | `src/pipeline/graph-builder.ts` lines 104-114 | resolved-import, unresolved-import, ambiguous-import, external-import, resolved-call, unresolved-call, ambiguous-call, builtin-call, header-import, stale-header-import |
| GraphEdgeV2 (8-field schema) | `src/pipeline/graph-builder.ts` lines 127-162 | id, sourceId, targetId, relationship, resolutionStatus, evidence, sourceLocation, candidates (+ legacy compat) |
| GraphNode + buildNodes (Phase 7 facet propagation) | `src/pipeline/graph-builder.ts` lines 233-260 | metadata.{layer, capability, constraints, headerStatus} populated when ElementData has them |
| ExportedGraph | `src/export/graph-exporter.ts` lines 53+ | nodes/edges + version/exportedAt |
| ValidationReport (11-field locked) | `src/pipeline/output-validator.ts` lines 110-133 | valid_edge_count, unresolved_count, ambiguous_count, external_count, builtin_count, header_defined_count, header_missing_count, header_stale_count, header_partial_count, header_layer_mismatch_count, header_export_mismatch_count |
| ValidationResult | `src/pipeline/output-validator.ts` lines 142-151 | ok, errors[], warnings[], report |
| validatePipelineState | `src/pipeline/output-validator.ts` lines 198+ | pure function, returns ValidationResult |
| ValidatePipelineStateOptions | `src/pipeline/output-validator.ts` lines 159-167 | strictHeaders + layerEnum (caller-injected per DR-PHASE-6-D) |
| SkipReason (5 values) | `src/integration/rag/indexing-orchestrator.ts` lines 138-143 | unchanged, header_status_missing, header_status_stale, header_status_partial, unresolved_relationship |
| FailReason (2 values) | `src/integration/rag/indexing-orchestrator.ts` line 150 | embedding_api_error, malformed_chunk |
| IndexingStatus (3 values) | `src/integration/rag/indexing-orchestrator.ts` line 175 | success, partial, failed |
| IndexingResult (Phase 7 additive shape) | `src/integration/rag/indexing-orchestrator.ts` lines 186-224 | chunksIndexed/Skipped/Failed, filesProcessed, processingTimeMs, stats, errors + status, chunksSkippedDetails, chunksFailedDetails, validationGateRefused, validationReportPath |
| CodeChunk (Phase 7 facet fields) | `src/integration/rag/code-chunk.ts` lines 17-143 | layer, capability, constraints, headerStatus on chunks (lines 132-142) |
| Header BNF | `ASSISTANT/SKILLS/ANALYSIS/analyze-coderef-semantics/SKILL.md` lines 67-93 | canonical BNF; CORE mirrors |
| layers.json (LayerEnum) | `ASSISTANT/STANDARDS/layers.json` | 13-layer authoritative source |
| --strict-headers | `src/cli/populate.ts` (chokepoint INVARIANT) | Phase 6 |
| --layer / --capability | `src/cli/rag-search.ts` lines tbd | Phase 7 SearchOptions.filters |
| Exit code semantics | `src/cli/rag-index.ts` | success→0, partial→0+stderr, failed→non-zero |

---

## Stale-claim inventory (closed at task 1.22)

Each entry status: `rewritten` | `removed` | `reverified-still-true`.

| File | Original claim | Reality | Resolution status |
|------|----------------|---------|-------------------|
| docs/coderef-semantic-schema.md | predates Phase 1 layer/capability/constraints + Phase 2.5 headerStatus | ElementData now carries those fields | **removed** (archived to docs/archive/coderef-semantic-schema-2026-05-05.md with banner; content replaced by docs/SCHEMA.md § 1) |
| docs/MIGRATION.md | likely promises migrations from pre-rebuild scanner | doc is actually about API-route migration (Django/Alembic/Rails/Prisma), NOT scanner migrations | **reverified-still-true** (different feature than the rebuild's scanner migration; no rewrite needed) |
| docs/ARCHITECTURE.md | references DependencyGraph as authoritative graph; no 9-phase pipeline | ExportedGraph (Phase 5) is canonical; DependencyGraph is @legacy | **rewritten** (full rewrite — phase ordering, ExportedGraph canonical, DependencyGraph @legacy, all phases described) |
| docs/CLI.md | does not document --strict-headers (Phase 6) or --layer/--capability (Phase 7) | both flags exist | **rewritten** (sections updated for populate-coderef --strict-headers, rag-index validation gate + status + exit codes, rag-search --layer/--capability) |
| docs/rag-http-api.md | does not document IndexingResult.status field or refuse-on-invalid behavior | both are post-Phase-7 reality | **rewritten** (request schema updated for layer/capability filters; index response schema updated for indexing_result.status field, validationGateRefused, per-entry SkipReason/FailReason) |
| AGENTS.md | predates validation-report.json gate contract; was 5-line pointer stub | indexing now refuses to run on validation-report.ok=false; agents need to know this | **rewritten** (canonical CORE-side agent contract per Path C ruling: validation gate, IndexingResult.status, exit codes, what-NOT-to-read, footer pointer to ASSISTANT CONTEXT.md retained) |
| docs/SCHEMA.md | predates 8-field edge schema or 10-variant EdgeEvidence | Phase 5 locked these | **rewritten** (full rewrite — 6 sibling sections: Scanner Schema, Relationship Schema, Resolution Statuses, Graph Schema, Validation Report, Indexing Result; all post-rebuild) |
| README.md | top-level summary understates rebuild's scope; cross-links broken (foundation-docs/, ../../README.md, MIGRATION-VALIDATION.md) | 9-phase rebuild complete; canonical docs at docs/* | **rewritten** (added Pipeline Rebuild Status section with post-Phase-7 baseline; fixed cross-links to point at docs/* canonical paths; removed broken DASHBOARD-relative ../../README.md link; replaced foundation-docs cross-references in Resources block) |

**Zero entries left at `unaddressed`. AC-09 satisfied.**

---

## Distinction coverage (task 1.21, AC-08)

The 7 required distinctions per roadmap line 466 are explicitly covered in at least one doc:

| # | Distinction | Doc(s) covering it |
|---|-------------|---------------------|
| (a) | raw extracted facts | docs/SCHEMA.md § 2 (Raw facts subsection: RawImportFact / RawCallFact / RawExportFact); docs/SCHEMA.md § 2 distinctions table row (a) |
| (b) | resolved relationships | docs/SCHEMA.md § 2 (Resolved relationships subsection: ImportResolution / CallResolution); docs/SCHEMA.md § 2 distinctions table row (b); docs/SCHEMA.md § 3 (resolution-status enums) |
| (c) | unresolved relationships | docs/SCHEMA.md § 3 (kind='unresolved' definition for both ImportResolutionKind and CallResolutionKind); docs/SCHEMA.md § 2 distinctions table row (c) |
| (d) | graph edges | docs/SCHEMA.md § 4 (Graph Schema — GraphEdgeV2 8-field schema, EdgeEvidence 10-variant union); docs/ARCHITECTURE.md § Phase 5 description; docs/SCHEMA.md § 2 distinctions table row (d) |
| (e) | header-derived edges vs AST-derived edges | docs/SCHEMA.md § 4 (relationship='header-import' vs 'import' distinction); docs/HEADER-GRAMMAR.md § "How CORE consumes the parsed header" Phase 5 row; docs/SCHEMA.md § 2 distinctions table row (e) |
| (f) | external dependencies | docs/SCHEMA.md § 3 (kind='external' definition for both ImportResolutionKind and CallResolutionKind); docs/SCHEMA.md § 2 distinctions table row (f) |
| (g) | built-ins | docs/SCHEMA.md § 3 (CallResolutionKind kind='builtin' + BUILTIN_RECEIVERS allowlist of 15 names); docs/SCHEMA.md § 2 distinctions table row (g) |

**All 7 distinctions covered. AC-08 satisfied.**

---

## Activity log

- 2026-05-05T01:05:00Z — Dispatch DISPATCH-2026-05-04-002 accepted; required skills 1-4 logged; /execute-workorder logged.
- 2026-05-05T01:10:00Z — Task 1.1 survey: confirmed AGENTS.md/CLAUDE.md/GEMINI.md are 5-line pointer stubs; HALT for ORCHESTRATOR ruling.
- 2026-05-05T01:25:00Z — ORCHESTRATOR ruling Path C accepted; DR-PHASE-8-D revised; plan task 1.10 updated; resuming work.

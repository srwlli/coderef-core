# CodeRef Core Architecture

**Last updated:** 2026-05-05 (Phase 8 — pipeline rebuild close)
**Status:** post-rebuild canonical reference

This document describes the architecture of `@coderef/core` after the 9-phase pipeline rebuild. It focuses on the phase ordering, the artifacts each phase produces, and the boundaries between internal pipeline state and exported consumer artifacts. For schema details see [docs/SCHEMA.md](./SCHEMA.md); for the public API surface see [docs/API.md](./API.md).

---

## High-level shape

The system is a **single-pass pipeline** over a project tree, driven by `PipelineOrchestrator` (`src/pipeline/orchestrator.ts`). Each phase reads `PipelineState` and writes its output into a dedicated field, then the next phase consumes that field. All phases are pure-ish: they mutate `PipelineState`, but they never call into the next phase, never reach the network, and (with the validator's purity rule) never reach `process.exit`.

```
   project tree
       │
       ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │                       Phase 0 — Discovery                           │
 │  walk project, group files by language → state.files / state.sources│
 └─────────────────────────────────────────────────────────────────────┘
       │
       ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │       Phase 1 — Scanner identity & taxonomy                         │
 │  src/types/types.ts ElementData; canonical codeRefId per element    │
 │  → state.elements                                                    │
 └─────────────────────────────────────────────────────────────────────┘
       │
       ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │       Phase 2 — Relationship raw facts                              │
 │  src/pipeline/extractors/relationship-extractor.ts                  │
 │  → state.rawImports / rawCalls / rawExports (endpoints NEVER node IDs)
 └─────────────────────────────────────────────────────────────────────┘
       │
       ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │       Phase 2.5 — Semantic header parser                            │
 │  src/pipeline/semantic-header-parser.ts + header-fact.ts            │
 │  → state.headerFacts / headerImportFacts / headerParseErrors        │
 └─────────────────────────────────────────────────────────────────────┘
       │
       ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │       Phase 3 — Import resolution                                   │
 │  src/pipeline/import-resolver.ts (pass 1: build ExportTable;        │
 │  pass 2: resolve AST + header imports → ImportResolution[])         │
 │  → state.importResolutions  (ImportResolutionKind: 7 values)        │
 └─────────────────────────────────────────────────────────────────────┘
       │
       ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │       Phase 4 — Call resolution                                     │
 │  src/pipeline/call-resolver.ts (pass 1: build SymbolTable;          │
 │  pass 2: resolve calls → CallResolution[])                          │
 │  reads state.importResolutions (cross-phase seam, read-only)        │
 │  → state.callResolutions  (CallResolutionKind: 5 values)            │
 └─────────────────────────────────────────────────────────────────────┘
       │
       ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │       Phase 5 — Graph construction                                  │
 │  src/pipeline/graph-builder.ts                                      │
 │    pass 1 (buildNodes) — every state.elements item → node           │
 │    pass 2 (buildEdges) — importResolutions + callResolutions → edge │
 │  → state.graph (ExportedGraph: 8-field edges, 10-variant evidence)  │
 └─────────────────────────────────────────────────────────────────────┘

   PipelineOrchestrator.run() returns here. The CLI then drives:

       │
       ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │       Phase 6 — Output validation (chokepoint)                      │
 │  src/pipeline/output-validator.ts validatePipelineState(...)        │
 │  PURE: no fs, no process.exit, no console                           │
 │  → ValidationResult { ok, errors[], warnings[], report (11 fields) }│
 │  CLI writes report to .coderef/validation-report.json               │
 └─────────────────────────────────────────────────────────────────────┘
       │
       ▼ (if ok=true; if ok=false the gate refuses Phase 7)
 ┌─────────────────────────────────────────────────────────────────────┐
 │       Phase 7 — Indexing / RAG                                      │
 │  src/integration/rag/indexing-orchestrator.ts                       │
 │  Reads ExportedGraph + GraphNode.metadata (Phase 5 facet propagation)│
 │  → IndexingResult { status, chunksIndexed/Skipped/Failed,           │
 │     chunksSkippedDetails (SkipReason), chunksFailedDetails (FailReason),
 │     validationGateRefused, validationReportPath }                    │
 │  CodeChunk carries layer/capability/constraints/headerStatus facets │
 └─────────────────────────────────────────────────────────────────────┘
```

There is no Phase 8 in the runtime topology. **Phase 8 is documentation only** — the rebuild's final phase aligns docs with the post-Phase-7 reality. After Phase 8 archives, the rebuild is done.

---

## Internal vs exported boundary

The pipeline produces **three exported artifacts** that downstream consumers (agents, automations, IDE tooling) read:

1. **`ExportedGraph`** — `src/export/graph-exporter.ts`, written to `.coderef/graph.json`. The canonical Phase 5 graph: 8-field edges, 10-variant `EdgeEvidence`, `GraphNode.metadata` carrying the Phase 7 semantic facets.
2. **`ValidationReport` (the `.coderef/validation-report.json` file)** — the 11-field locked report from Phase 6. Field names are additive-only.
3. **`IndexingResult`** — the Phase 7 RAG indexer's return value. Strictly additive over the pre-Phase-7 contract (DR-PHASE-7-B). `IndexingStatus`, `SkipReason`, `FailReason` are public enums.

Everything else under `PipelineState` is **internal pipeline plumbing**: `state.elements`, the raw fact arrays, the resolution arrays, intermediate caches. Downstream callers should NOT depend on the field set or mutation order. The artifact surfaces above are the contract.

The legacy projection (`DependencyGraph` at `src/semantic/projections.ts` and `buildDependencyGraph` at `src/fileGeneration/buildDependencyGraph.ts`) is `@legacy` — kept additive during the transition window. New consumers read `ExportedGraph` directly.

---

## Phase responsibilities

### Phase 0 — Discovery

Walks the project tree under `projectPath`, applies `.coderefignore` and language filters, groups files by language. Populates `state.files` (Map<lang, paths[]>) and `state.sources` (Map<path, content>).

### Phase 1 — Scanner identity & taxonomy

Owns the `ElementData` shape and assigns a canonical `codeRefId` to every element it discovers. Phase 1 also stamps the file-grain semantic facets — `layer`, `capability`, `constraints`, `headerStatus` — based on the parsed semantic header (or `headerStatus='missing'` when no header is present). Truth source: `src/types/types.ts` interface `ElementData`.

### Phase 2 — Relationship raw facts

Extracts `RawImportFact[]`, `RawCallFact[]`, `RawExportFact[]` from each source file. Endpoints in raw facts are NEVER graph node IDs — that's the whole point. Resolution into edges happens later (Phase 3 / Phase 4). Truth source: `src/pipeline/extractors/relationship-extractor.ts`.

### Phase 2.5 — Semantic header parser

Parses the `@coderef-semantic:1.0.0` block (per the BNF mirrored at [docs/HEADER-GRAMMAR.md](./HEADER-GRAMMAR.md), canonical at `ASSISTANT/SKILLS/ANALYSIS/analyze-coderef-semantics/SKILL.md`) into one `HeaderFact` per file. Also produces the structured `HeaderImportFact[]` from `@imports`. Phase 6 SH-checks consume the `HeaderFact` reference to detect drift.

### Phase 3 — Import resolution

Two-pass driver in `src/pipeline/import-resolver.ts`:
- **Pass 1** builds `ExportTable` (per-module index of exported names, with `originCodeRefId` and re-export chains).
- **Pass 2** resolves AST imports (`RawImportFact`) and header imports (`HeaderImportFact`) against the export tables, classifying each binding into one of 7 `ImportResolutionKind` values: `resolved | unresolved | external | ambiguous | dynamic | typeOnly | stale`.

Pass 1 must complete fully before pass 2 begins (AC-12).

### Phase 4 — Call resolution

Two-pass driver in `src/pipeline/call-resolver.ts`:
- **Pass 1** builds `SymbolTable` from `state.elements` plus Phase 3's resolved imports.
- **Pass 2** resolves each `RawCallFact` to one of 5 `CallResolutionKind` values: `resolved | unresolved | ambiguous | external | builtin`.

Phase 4 reads `state.importResolutions` but does NOT mutate it (cross-phase seam is read-only). The `BUILTIN_RECEIVERS` allowlist (`Array, Object, Promise, Map, Set, String, Number, Boolean, RegExp, Date, Error, JSON, Math, Reflect, Symbol`) classifies calls on those receivers as `builtin` — no project graph edge emitted.

### Phase 5 — Graph construction

Two-pass driver in `src/pipeline/graph-builder.ts`:
- **Pass 1 (`buildNodes`)** — every `state.elements` item becomes a graph node with `id = canonical codeRefId` (AC-01). Phase 7 adds: `node.metadata.{layer, capability, constraints, headerStatus}` are copied from `ElementData` when defined.
- **Pass 2 (`buildEdges`)** — every `importResolution` and `callResolution` becomes a `GraphEdgeV2` with the 8-field schema (DR-PHASE-5-D): `id, sourceId, targetId?, relationship, resolutionStatus, evidence?, sourceLocation?, candidates?`.

`targetId` is OMITTED (not synthetic) for non-resolved edges (DR-PHASE-5-A — honest-demotion invariant). `evidence` is the 10-variant discriminated union — see [docs/SCHEMA.md § 4](./SCHEMA.md). Header-derived edges use `relationship='header-import'` (distinct from AST-derived `'import'`).

### Phase 6 — Output validation (chokepoint)

`validatePipelineState(state, graph, options)` in `src/pipeline/output-validator.ts` is the **chokepoint** that gates downstream consumption. The function is **pure** — no fs, no `process.exit`, no console — so callers can run it in tests, in editor extensions, or in a server context without side effects.

It returns a `ValidationResult { ok, errors[], warnings[], report }`:
- `errors` — graph-integrity violations (GI-1, GI-2, GI-4, GI-5, GI-6 always fail-hard; GI-3 is the Phase 5 honest-demotion invariant) and header drift (SH-1, SH-2, SH-3) when promoted by `--strict-headers`.
- `warnings` — header drift in default mode.
- `report` — the 11-field locked `ValidationReport` (R-PHASE-6-C).

The CLI (`populate-coderef`) loads `layerEnum` from `ASSISTANT/STANDARDS/layers.json`, runs the validator, writes `report` to `.coderef/validation-report.json`, and maps `ok` to a process exit code. The report file plus an inferred `ok` flag is the public artifact downstream consumers read.

### Phase 7 — Indexing / RAG

`src/integration/rag/indexing-orchestrator.ts` reads `ExportedGraph` (file-grain `node.metadata` facets via `node.file` join) and produces `CodeChunk` records carrying `layer`, `capability`, `constraints`, `headerStatus`. The orchestrator:

- **Refuses to run** when caller-injected `validation.ok === false` (DR-PHASE-7-A) → `IndexingResult.status='failed'`, `validationGateRefused=true`. Eliminates the pre-Phase-7 `chunksIndexed=0` silent-success anti-pattern.
- **Skips** files with `headerStatus` ∈ {missing, stale, partial} with the corresponding `SkipReason` (DR-PHASE-7-E — "skipped or downgraded, not silently indexed"). Implements file-grain worst-severity aggregation (Path A): each file chunk inherits the worst severity from any element in the file.
- **Fails** chunks that hit embedding API errors or malformed-chunk validation with the corresponding `FailReason`.
- Emits an `IndexingResult` with the top-level `status: 'success' | 'partial' | 'failed'` per the DR-PHASE-7-C threshold table.
- Wires `--layer` / `--capability` filter pass-through to the vector store metadata filter (DR-PHASE-7-D — capped at two new flags on `rag-search`; no new flags on `rag-index`).

The post-Phase-7 baseline (from coderef-core's own scan, committed at `.coderef/validation-report.json`): `valid_edge_count=3464`, `header_missing_count=262`, all other counts `0`.

---

## Boundaries enforced in tests

The pipeline carries several invariants that test fixtures hold steady:

- **Ground-truth tests (`__tests__/pipeline/graph-ground-truth.test.ts`)** — 6 assertions over the canonical pipeline behavior. Must remain PASS through any change to the pipeline.
- **Validation gate (`__tests__/pipeline/indexing-gate-invariant.test.ts`)** — Phase 7 invariant: `IndexingResult.chunksSkippedDetails.length === chunksSkipped` and same for `chunksFailedDetails`.
- **Boundary enforcer (`__tests__/pipeline/no-phase-8-docs-leak.test.ts`)** — Phase 7 shipped a regex enforcer that scans `src/` TypeScript surfaces for 8 forbidden field names (`docsGenerated, schemaDocPath, schemaDocMd, apiContractMd, agentUsageContractMd, headerGrammarDocPath, documentationVersion, docsBuildTimestamp`). Phase 8 keeps this green by working in markdown only.

---

## Layer enum: canonical authority

The 13-value `LayerEnum` is canonical at `ASSISTANT/STANDARDS/layers.json` per the rebuild's Refactor Rules. CORE never forks the enum — `src/pipeline/element-taxonomy.loadLayerEnum()` reads from that file at runtime. Phase 6's SH-1 check enforces that all `ElementData.layer` values fall within the loaded enum.

Header grammar is similarly canonical in ASSISTANT (`SKILLS/ANALYSIS/analyze-coderef-semantics/SKILL.md`) — CORE mirrors the BNF at [docs/HEADER-GRAMMAR.md](./HEADER-GRAMMAR.md) with explicit citation.

---

## Cross-references

- [docs/SCHEMA.md](./SCHEMA.md) — full type reference (scanner, relationship, resolution, graph, validation, indexing)
- [docs/HEADER-GRAMMAR.md](./HEADER-GRAMMAR.md) — `@coderef-semantic:1.0.0` BNF mirror
- [docs/CLI.md](./CLI.md) — CLI flag reference for the post-rebuild surface (`--strict-headers`, `--layer`, `--capability`)
- [docs/API.md](./API.md) — programmatic API contract
- [/AGENTS.md](../AGENTS.md) — agent usage contract
- Phase archives: `coderef/archived/pipeline-*/ARCHIVED.md`

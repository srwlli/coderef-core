# CodeRef Core Architecture

**Last updated:** 2026-07-31 (consumer-surfaces addendum; pipeline narrative from the 2026-05-05 Phase 8 rebuild close)
**Status:** post-rebuild canonical reference

This document describes the architecture of `@coderef/core` after the 9-phase pipeline rebuild. It focuses on the phase ordering, the artifacts each phase produces, and the boundaries between internal pipeline state and exported consumer artifacts. The pipeline narrative below is unchanged since the rebuild; the consumer surfaces built on top of it since (query projections, map, MCP server, SCIP overlay) are described in **Consumer surfaces over the substrate**. For schema details see [docs/SCHEMA.md](./SCHEMA.md); for the public API surface see [docs/API.md](./API.md).

---

## Module boundaries

`src/` is organized by pipeline role, not by file type. The dependency direction is
one-way — substrate never imports from a consumer — and the cycle count is **0**, enforced
by the `cycles` check.

| Module group | Owns | May depend on |
|---|---|---|
| `types/`, `config/`, `utils/` | Shared type declarations, config presets, path helpers | nothing in `src/` |
| `scanner/`, `parser/`, `analyzer/` | Reading source into elements and raw facts | shared only |
| `pipeline/` | Phase 0–6 orchestration, resolvers, graph builder, validator | scanner/parser/analyzer + shared |
| `export/`, `registry/`, `cache/`, `indexer/` | Persisting and reloading `.coderef/` artifacts | pipeline + shared |
| `integration/rag/`, `search/`, `semantic/`, `map/`, `query/` | Consumer surfaces over the exported graph | exported artifacts only — **never** `PipelineState` |
| `cli/`, `mcp` server entry, `adapter/` | Process boundaries: argv, stdio, exit codes | anything below |

The hard rule: **consumer surfaces read exported artifacts, not pipeline internals.** A
consumer that reaches into `PipelineState` has crossed the boundary the
*Internal vs exported boundary* section defines, and the boundary tests will fail it.

## Stack decisions

| Decision | Choice | Why |
|---|---|---|
| Language | TypeScript, compiled to ESM | The graph's own types are the product; an untyped substrate cannot enforce the additive-only contracts. |
| Parsing | Per-language parsers behind a `ScannerRegistry` | New languages register rather than fork the pipeline. |
| Graph storage | Plain JSON under `.coderef/` | Diffable, version-controllable, and readable without a running service. No database to install. |
| Embeddings | **Local Ollama only** | Standing constraint: no cloud LLM key is ever a required default. The whole pipeline must run offline. |
| Vector search | Local index + BM25 fusion | Keeps retrieval in-process and keyless, consistent with the embedding decision. |
| Agent transport | MCP over stdio | No port, no auth surface, no network exposure for the agent path. |
| Test runner | Vitest | Matches the ESM build; the boundary tests above are ordinary test files, not a bespoke linter. |

## Data flow

The system is a **single-pass pipeline** over a project tree, driven by `PipelineOrchestrator` (`src/pipeline/orchestrator.ts`). Each phase reads `PipelineState` and writes its output into a dedicated field, then the next phase consumes that field. All phases are pure-ish: they mutate `PipelineState`, but they never call into the next phase, never reach the network, and (with the validator's purity rule) never reach `process.exit`.

Since WO-DECOUPLE-PIPELINEORCHESTRATOR-VIA-PHASE-MIDDLEWARE-REFACTOR-ORCHESTRATOR-TS-001 (2026-08-01) the orchestrator is a **sequential phase-list executor** over `src/pipeline/phases/` (`types.ts` — `PipelineContext`/`PipelinePhase`/`runPhases`; `scan-front.ts` — discovery, cache filter, grammar preload, single-pass scan, persistence; `resolve-tail.ts` — the shared Phase 3/4/5 + SCIP tail; `incremental-front.ts` — rescan/merge/assemble + the STUB-QPAAY0 path-keying seam). Both `run()` and `runIncremental()` compose explicit phase-list literals feeding the SAME resolve-tail phase objects, so full/incremental parity is by shared code. Phase modules are thin adapters over the pure functions named in the diagram below — the diagram's phase semantics are unchanged. A new pipeline pass (e.g. cross-repo workspace linkage) is one phase-list insertion.

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
 │  → ValidationResult { ok, errors[], warnings[], report (14 fields) }│
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
2. **`ValidationReport` (the `.coderef/validation-report.json` file)** — the 14-field locked report from Phase 6 (`header_coverage_pct` added by WO-RAG-HEADER-COVERAGE-ENFORCE-AND-SURFACE-001; `unresolved_src_count`/`ambiguous_src_count` by WO-IMPORT-RESOLVER-MEMBERSHIP-CHECK-BUG-001 P3 — all additive). Field names are additive-only.
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
- `report` — the 14-field locked `ValidationReport` (R-PHASE-6-C; `header_coverage_pct` + the two `*_src_count` fields additive).

The CLI (`populate-coderef`) loads `layerEnum` from `ASSISTANT/STANDARDS/layers.json`, runs the validator, writes `report` to `.coderef/validation-report.json`, and maps `ok` to a process exit code. The report file plus an inferred `ok` flag is the public artifact downstream consumers read.

### Phase 7 — Indexing / RAG

`src/integration/rag/indexing-orchestrator.ts` reads `ExportedGraph` (file-grain `node.metadata` facets via `node.file` join) and produces `CodeChunk` records carrying `layer`, `capability`, `constraints`, `headerStatus`. The orchestrator:

- **Refuses to run** when caller-injected `validation.ok === false` (DR-PHASE-7-A) → `IndexingResult.status='failed'`, `validationGateRefused=true`. Eliminates the pre-Phase-7 `chunksIndexed=0` silent-success anti-pattern.
- **Skips** files with `headerStatus` ∈ {missing, stale, partial} with the corresponding `SkipReason` (DR-PHASE-7-E — "skipped or downgraded, not silently indexed"). Implements file-grain worst-severity aggregation (Path A): each file chunk inherits the worst severity from any element in the file.
- **Fails** chunks that hit embedding API errors or malformed-chunk validation with the corresponding `FailReason`.
- Emits an `IndexingResult` with the top-level `status: 'success' | 'partial' | 'failed'` per the DR-PHASE-7-C threshold table.
- Wires `--layer` / `--capability` filter pass-through to the vector store metadata filter (DR-PHASE-7-D — capped at two new flags on `rag-search`; no new flags on `rag-index`).

The post-Phase-7 baseline (from coderef-core's own scan, committed at `.coderef/validation-report.json`): `valid_edge_count=3464`, `header_missing_count=262`, all other counts `0`. (Current self-scan, 2026-08-01 post edge-resolution P4: `valid_edge_count=10133`, `resolved_of_resolvable=74.8%` (honest read; raw all-calls `resolution_rate=22.53%`), `test_dsl_count=16778` + `external_module_receiver` dispositions disclosed + heritage-chain method lookup (`heritage_method_lookup`); incremental `--changed-files` is keyed canonically against the persisted fact set and its output is byte-identical to a full rebuild (parity proven, edge-resolution P4), dependency cycles 0.)

---

## Consumer surfaces over the substrate (2026-05 → 2026-07)

Everything below is a **read-side projection over the exported artifacts** the pipeline produces (`index.json`, `graph.json`, `validation-report.json`) — none of it feeds back into pipeline state.

- **`src/query/`** — genre-feature projections over `ExportedGraph`/`index.json`: what-calls/imports/depends walks, impact BFS, hotspots, cycles (Tarjan SCC), clones (three passes over the extract-time body substrate), tests-for-change, docstrings, ownership, api-diff (exports-manifest differ), type-hierarchy (heritage edges), scip-resolution-delta. Each projection has an MCP tool and a `coderef-analyze --type` CLI mirror emitting the same envelope.
- **`src/map/`** — the universal repo map (MapData 1.5): file-level dependency projection plus graph analytics (communities, centrality, bridges), per-edge evidence, declared-vs-detected layer drift, and engineering-metrics overlays; emitted as a self-contained static bundle under `.coderef/map/`.
- **MCP server** — `src/cli/coderef-mcp-server.ts` is a thin registrar (36 `registerTool` blocks) delegating to per-family handler modules under `src/cli/mcp/` (`context-tools`, `graph-tools`, `lookup-tools`, `map-tools`, `rag-tools`, `verify-tools`, `shared`) — decomposed from a 3,998-line monolith (WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 P1). Repo-agnostic: every tool requires `project_root`; typed against `ExportedGraph` so schema drift is a compile error. Write scope is `.coderef/`-confined (`reindex`, `rag_index`, `map`, `api_diff` snapshot mode).
- **SCIP overlay seam** — `populate-coderef --scip <path>` runs an opt-in **post-resolution overlay** after Phase 4: co-located unresolved/ambiguous call edges flip to `resolved` with `evidence.kind:'scip'` (confidence `heuristic`). It never touches already-resolved edges and never runs without a `.scip` file — the pipeline's own resolution passes are unchanged.
- **Extract-time body substrate** — the scanner persists `normalizedBodyHash`, `astFingerprint`, and AST-accurate `ElementData.complexity` at extract time (Phases 1–2), which is what makes the lexical/near-miss clone passes and complexity surfaces possible without re-parsing.
- **Heritage edges** — the pipeline populates `extends`/`implements` edges (Phase 5 input), consumed by `type_hierarchy` (including the additive LSP 3.17 `TypeHierarchyItem` projection).

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
- [docs/CLI.md](./CLI.md) — CLI reference for all 19 bins + the 38-tool MCP server section
- [docs/AGENT-CONTRACT.md](./AGENT-CONTRACT.md) — the agent-consumer contract over the artifacts
- [docs/API.md](./API.md) — programmatic API contract
- [/AGENTS.md](../AGENTS.md) — agent usage contract
- Phase archives: `coderef/archived/pipeline-*/ARCHIVED.md`

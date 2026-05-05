# CodeRef Core Public API

**Last updated:** 2026-05-05 (Phase 8 — pipeline rebuild close)
**Package:** `@coderef/core` v2.0.0
**Status:** post-rebuild canonical reference

This document is the canonical reference for the **public API surface** that external programmatic callers can rely on. It covers entry points exported from `src/index.ts` plus the post-rebuild Phase 6 (validation) and Phase 7 (indexing/RAG) contracts.

For schema types referenced below (`ElementData`, `PipelineState`, `ImportResolution`, `CallResolution`, `GraphEdgeV2`, `EdgeEvidence`, `ExportedGraph`, `ValidationResult`, `IndexingResult`), see [docs/SCHEMA.md](./SCHEMA.md). For the semantic header grammar, see [docs/HEADER-GRAMMAR.md](./HEADER-GRAMMAR.md). For agent usage (what to read vs. what to ignore), see [/AGENTS.md](../AGENTS.md).

---

## Stability commitments

| Surface | Stability |
|---------|-----------|
| Pipeline types (`PipelineState`, `ElementData`, raw fact types, resolution types, `GraphEdgeV2`, `EdgeEvidence`, `ExportedGraph`) | **stable** — locked at Phase 5 (DR-PHASE-5-D); additive-only changes only |
| `ValidationReport` (11 fields) | **stable** — locked at Phase 6 (R-PHASE-6-C); field names additive-only with explicit ORCHESTRATOR sign-off |
| `IndexingResult` (with Phase 7 additive fields) | **stable** — locked at Phase 7 (DR-PHASE-7-B); shape strictly additive over pre-Phase-7 contract |
| `IndexingStatus`, `SkipReason`, `FailReason`, status thresholds | **stable** — Phase 7 (DR-PHASE-7-C, DR-PHASE-7-E) |
| Header grammar (BNF) | **stable** — canonical at `ASSISTANT/SKILLS/ANALYSIS/analyze-coderef-semantics/SKILL.md`; CORE mirrors |
| `LayerEnum` | **stable** — canonical at `ASSISTANT/STANDARDS/layers.json`; CORE never forks |
| Scanner / pipeline orchestrator entry points (`PipelineOrchestrator`, `scanCurrentElements`) | **stable** — public; signature changes are SemVer-major |
| Internal pipeline plumbing (`PipelineState` mutation order, intermediate caches, registry implementations) | **internal** — agents should NOT depend on internal sequencing |
| Legacy projection (`DependencyGraph`, `buildDependencyGraph`) | **`@legacy`** — kept for transition; new consumers use `ExportedGraph` |

---

## 1. Pipeline orchestration

### `PipelineOrchestrator`

Truth source: `src/pipeline/orchestrator.ts`. Re-exported from `@coderef/core`.

The end-to-end pipeline driver. Runs phases 0 → 5 in order: discovery → element extraction → raw-fact extraction → header parsing → import resolution → call resolution → graph construction.

```typescript
import { PipelineOrchestrator } from '@coderef/core';

const orchestrator = new PipelineOrchestrator(projectPath, options);
const state: PipelineState = await orchestrator.run();
// state.elements, state.rawImports/rawCalls/rawExports,
// state.headerFacts/headerImportFacts, state.importResolutions,
// state.callResolutions, state.graph all populated.
```

`PipelineOrchestrator.run()` does NOT call the Phase 6 validator or the Phase 7 indexing orchestrator. Those are wired by the CLI entry points (`populate-coderef`, `rag-index`) so callers stay in control of validation policy and exit-code semantics.

### Phase types and entry points

```typescript
import type {
  PipelineState,
  PipelineOptions,
  ElementData,
  // Raw facts (Phase 2)
  RawImportFact, RawCallFact, RawExportFact, RawImportSpecifier,
  // Header facts (Phase 2.5)
  HeaderFact, HeaderImportFact, HeaderParseError,
  // Resolutions (Phase 3 / Phase 4)
  ImportResolution, ImportResolutionKind, ExportTable,
  CallResolution, CallResolutionKind, SymbolTable,
  // Graph (Phase 5)
  EdgeRelationship, EdgeResolutionStatus, EdgeEvidence, GraphEdgeV2,
  ExportedGraph,
  // Validation (Phase 6)
  ValidationReport, ValidationResult, ValidationError, ValidationWarning,
  ValidatePipelineStateOptions,
} from '@coderef/core';

import {
  PipelineOrchestrator,
  // Resolvers and builder (low-level)
  resolveImports,        // Phase 3 driver
  resolveCalls,          // Phase 4 driver
  buildGraph, buildNodes,// Phase 5 driver and node-pass
  // Validation
  validatePipelineState, // Phase 6 chokepoint (pure)
  BUILTIN_RECEIVERS,     // Phase 4 receiver allowlist
} from '@coderef/core';
```

The lower-level `resolveImports`, `resolveCalls`, and `buildGraph` are exposed for callers who need to drive a custom phase ordering or interleave with their own analysis. Use `PipelineOrchestrator.run()` for the standard path.

---

## 2. Phase 6 — Validation (output gate)

Truth source: `src/pipeline/output-validator.ts`. See [docs/SCHEMA.md § 5](./SCHEMA.md) for the full `ValidationReport` field list.

```typescript
import { validatePipelineState, type ValidationResult } from '@coderef/core';

const result: ValidationResult = validatePipelineState(state, state.graph, {
  strictHeaders: false,
  layerEnum: layerEnumLoadedByCaller, // load from ASSISTANT/STANDARDS/layers.json
});

if (!result.ok) {
  for (const err of result.errors) {
    // err.kind: 'graph_integrity' | 'phase5_demotion' | 'header_drift_strict'
  }
  // map result.ok → exit code (0 vs 1) at the CLI boundary
}
for (const warn of result.warnings) {
  // header_drift in default mode (SH-1, SH-2, SH-3); promoted to errors when strictHeaders=true
}
// result.report is the 11-field ValidationReport — always populated, even on ok=false
```

**Purity guarantee.** `validatePipelineState` is **pure**: no fs, no `process.exit`, no console. Callers own:
- loading `layerEnum` (from `ASSISTANT/STANDARDS/layers.json` via `element-taxonomy.loadLayerEnum()`),
- mapping `result.ok` to a process exit code,
- writing `result.report` to `.coderef/validation-report.json` if the run is going to gate Phase 7 indexing.

The CLI entry `populate-coderef` (in `src/cli/populate.ts`) is the canonical wiring; downstream callers can copy that pattern.

**Public artifact:** `.coderef/validation-report.json` — the 11-field `ValidationReport` plus an inferred `ok` flag — is consumable by external automation. The Phase 7 indexing orchestrator gates on it.

---

## 3. Phase 7 — Indexing / RAG

Truth source: `src/integration/rag/indexing-orchestrator.ts`. See [docs/SCHEMA.md § 6](./SCHEMA.md) for `IndexingResult`, `IndexingStatus`, `SkipReason`, `FailReason`, and the status threshold table.

The indexing orchestrator is currently exposed as a CLI (`rag-index`) and as a programmatic surface inside `src/integration/rag/`. Programmatic callers pass a `ValidationResult`-shaped gate (`{ ok: boolean }`) — the orchestrator itself is pure and never reads the validation report file directly (DR-PHASE-7-A). The CLI bridges fs → orchestrator.

```typescript
// Conceptual usage (programmatic — the import path may stabilise in a follow-up release;
// today the orchestrator is consumed via the rag-index CLI):
const result: IndexingResult = await indexCodebase({
  validation: { ok: true },           // caller-injected gate (DR-PHASE-7-A)
  validationReportPath: '.coderef/validation-report.json',
  // ... vector-store config, project path, etc.
});

if (result.status === 'failed') {
  // result.validationGateRefused indicates the gate refused to run (validation.ok=false)
}
// result.chunksSkippedDetails carries one SkipEntry per skipped chunk (length === chunksSkipped)
// result.chunksFailedDetails carries one FailEntry per failed chunk (length === chunksFailed)
// Phase 7 INVARIANT: every detail entry has reason !== undefined.
```

**Status thresholds (DR-PHASE-7-C):**

| `status` | Condition |
|---------|-----------|
| `success` | `chunksIndexed > 0` AND `chunksSkipped === 0` AND `chunksFailed === 0` |
| `partial` | `chunksIndexed > 0` AND (`chunksSkipped > 0` OR `chunksFailed > 0`) |
| `failed`  | `chunksIndexed === 0` OR `validationGateRefused === true` |

**SkipReason / FailReason:** see [docs/SCHEMA.md § 6](./SCHEMA.md) for the full enums. Skips correspond to header-drift / unresolved-relationship cases (intentional omission); fails correspond to embedding-API errors / malformed chunks (malfunction).

**Semantic facets on chunks:** `CodeChunk.{layer, capability, constraints, headerStatus}` are populated when the source `ElementData` has them, propagated through `GraphNode.metadata`. The `rag-search` CLI exposes `--layer` and `--capability` filters that filter chunks by these facets.

---

## 4. Scanner / parser surfaces

```typescript
import {
  scanCurrentElements,
  LANGUAGE_PATTERNS,
  DEFAULT_EXCLUDE_PATTERNS,
} from '@coderef/core';

const elements: ElementData[] = await scanCurrentElements('./src', ['ts', 'tsx', 'js'], {
  recursive: true,
});
```

The legacy regex scanner remains a public entry point; callers driving the full pipeline use `PipelineOrchestrator` instead. See [docs/SCHEMA.md § 1](./SCHEMA.md) for the `ElementData` shape.

### Configuration presets

```typescript
import { loadPreset, detectPreset, applyPreset, SCAN_PRESETS } from '@coderef/core';

const preset = loadPreset('react');
const detected = detectPreset('./my-project'); // ['nextjs', 'monorepo']
const config = applyPreset('nextjs', ['custom/**']);
```

### Error reporting

```typescript
import {
  createScanError, formatScanError, printScanErrors,
  type ScanError, type ScanErrorType, type ScanErrorSeverity, type ScanResult,
} from '@coderef/core';
```

---

## 5. Exported helper modules (route validation, migration, frontend update)

These are stable public surfaces but unrelated to the pipeline rebuild. They retain their pre-rebuild API.

| Module | Entry points | Notes |
|--------|--------------|-------|
| Route normalizer | `normalizeRoutePath`, `normalizeFlaskRoute`, `normalizeFastAPIRoute`, `normalizeExpressRoute`, `normalizeNextJsRoute`, `extractDynamicSegments` | WO-ROUTE-VALIDATION-ENHANCEMENT-001 |
| Route matcher | `exactMatch`, `dynamicMatch`, `partialMatch`, `calculateMatchConfidence`, `findBestMatch`, `matchHttpMethods` | |
| Route validator | `loadFrontendCalls`, `loadServerRoutes`, `detectMissingRoutes`, `detectUnusedRoutes`, `detectMethodMismatches`, `classifyIssue`, `generateValidationReport`, `saveValidationReport` | (Distinct from `validatePipelineState` — these are the route-validation helpers for the `validate-routes` CLI.) |
| Report generator | `formatIssueSummary`, `formatIssueDetails`, `formatRecommendations`, `formatAutoFixSection`, `generateMarkdownReport`, `saveMarkdownReport` | |
| Migration validation | `validateMigrationConfig`, `applyMappings`, `applyExplicitMapping`, `applyPatternMapping`, `calculateMigrationCoverage`, `findUnmappedCalls`, `findDeprecatedCalls`, `loadMigrationMapping`, `validateMigration` | WO-MIGRATION-VALIDATION-001 |
| Frontend update generator | `generateUpdateSuggestions`, `batchProcessCalls`, `generateGitPatch`, `applyModifications`, `generateUpdateReport`, `exportBatchResults` | IMP-CORE-044 |

---

## 6. CLI entry points

The package binaries (`bin` in `package.json`) are the stable CLI surface:

| CLI | Entry | Notes |
|-----|-------|-------|
| `populate-coderef` | `src/cli/populate.ts` | Phase 6 chokepoint — runs pipeline → validation gate. Honors `--strict-headers`. |
| `coderef-scan` | `src/cli/scan.ts` | Legacy / regex scanner |
| `coderef-pipeline` | `src/cli/coderef-pipeline.ts` | Pipeline runner |
| `coderef-watch` | `src/cli/coderef-watch.ts` | File watcher |
| `coderef-rag-server` | `src/cli/coderef-rag-server.ts` | RAG HTTP server |
| `rag-index` | `src/cli/rag-index.ts` | Phase 7 indexer; reads `.coderef/validation-report.json`, refuses on `ok=false`. Exit codes: success→0, partial→0+stderr, failed→non-zero. |
| `rag-search` | `src/cli/rag-search.ts` | Phase 7 query CLI; supports `--layer` and `--capability` filters. |
| `rag-status` | `src/cli/rag-status.ts` | Health check |
| `validate-routes` | `src/cli/validate-routes.ts` | Frontend-call vs. server-route validator (route-validation track, not the pipeline validator) |
| `scan-frontend-calls` | `src/cli/scan-frontend-calls.ts` | Frontend API call detection |

See [docs/CLI.md](./CLI.md) for full per-flag CLI reference and [docs/rag-http-api.md](./rag-http-api.md) for the RAG server HTTP endpoints.

---

## What NOT to import

- `src/pipeline/types.ts → PipelineState` — internal pipeline plumbing, not for downstream consumers. Read the exported artifacts instead (`ExportedGraph` from `src/export/graph-exporter.ts`, `ValidationResult` from `validatePipelineState`, `IndexingResult` from the indexing orchestrator).
- `src/integration/rag/__internal/*` — adapter shims and queue scaffolding that are not API.
- `src/scanner/standalone-scanner.ts` (or similar) — legacy fallback paths kept for migration; new code uses `PipelineOrchestrator`.
- Anything under `src/integration/vector/__tests__/` — fixtures and mocks.

---

## Cross-references

- [docs/SCHEMA.md](./SCHEMA.md) — full schema reference (scanner, relationship, resolution, graph, validation, indexing)
- [docs/HEADER-GRAMMAR.md](./HEADER-GRAMMAR.md) — `@coderef-semantic:1.0.0` BNF mirror
- [docs/CLI.md](./CLI.md) — CLI flag reference
- [docs/rag-http-api.md](./rag-http-api.md) — RAG HTTP server contract
- [/AGENTS.md](../AGENTS.md) — agent usage contract (what an LLM should read vs. ignore)
- [docs/ARCHITECTURE.md](./ARCHITECTURE.md) — high-level architecture and phase ordering
- Phase archives: `coderef/archived/pipeline-*/ARCHIVED.md`

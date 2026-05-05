# Agent Usage Contract — `@coderef/core`

**Last updated:** 2026-05-05 (Phase 8 — pipeline rebuild close)
**Status:** post-rebuild canonical agent contract

This is the canonical contract for **LLM agents and downstream automation** that consume `@coderef/core` artifacts. It tells you what to read, what to ignore, what the gates mean, and how to interpret exit codes — without requiring you to read the source.

If you are a human contributor or a project-context loader, see the footer pointer at the bottom of this document for general project rules.

---

## 1. What to read (artifact contract)

Agents should consume the **exported artifacts**, not the internal pipeline state.

### `.coderef/validation-report.json` (Phase 6)

Public artifact. Locked 11-field shape (R-PHASE-6-C). Field names are additive-only — no rename, no drop, without explicit ORCHESTRATOR sign-off.

```json
{
  "valid_edge_count": 3464,
  "unresolved_count": 0,
  "ambiguous_count": 0,
  "external_count": 0,
  "builtin_count": 0,
  "header_defined_count": 0,
  "header_missing_count": 262,
  "header_stale_count": 0,
  "header_partial_count": 0,
  "header_layer_mismatch_count": 0,
  "header_export_mismatch_count": 0
}
```

The CLI also emits an inferred `ok` flag alongside the report: `ok=true` iff the validator returned `errors.length === 0`. Agents that gate downstream work on validation should read this `ok` flag (or recompute from `errors[]` if they consume the in-process `ValidationResult`).

**The above numbers are the actual post-Phase-7 baseline from coderef-core's own scan.** Treat them as illustrative of a healthy state, not as fixed expectations.

### `.coderef/rag-index.json` and `IndexingResult` (Phase 7)

The Phase 7 indexer returns an `IndexingResult`. The shape is **strictly additive** over the pre-Phase-7 contract (DR-PHASE-7-B). Agents read:

- `chunksIndexed`, `chunksSkipped`, `chunksFailed`, `filesProcessed`, `processingTimeMs` — numeric counts (unchanged from pre-Phase-7).
- `status: 'success' | 'partial' | 'failed'` — top-level disposition. **Read this first.**
- `chunksSkippedDetails: SkipEntry[]` — one entry per skipped chunk. `length === chunksSkipped` (Phase 7 invariant). Each entry has `coderefId`, `reason: SkipReason`, optional `message`.
- `chunksFailedDetails: FailEntry[]` — one entry per failed chunk. `length === chunksFailed` (Phase 7 invariant). Each entry has `coderefId`, `reason: FailReason`, optional `message`.
- `validationGateRefused?: boolean` — `true` iff `status='failed'` because the Phase 6 validation gate refused the run.
- `validationReportPath?: string` — path to the `validation-report.json` that gated this run.

### `ExportedGraph` (Phase 5)

The canonical graph artifact. 8-field edges, 10-variant `EdgeEvidence` discriminated union, `GraphNode.metadata` carries `{ layer, capability, constraints, headerStatus }` for elements with semantic facets. See [docs/SCHEMA.md § 4](./docs/SCHEMA.md).

**Edges where `resolutionStatus !== 'resolved'` have `targetId` OMITTED (not synthetic).** This is DR-PHASE-5-A — non-resolved edges declare their disposition through `evidence` and `reason` rather than fabricating a target.

### `CodeChunk` (Phase 7 RAG)

Each indexed chunk carries optional semantic facets propagated from `ElementData.{layer, capability, constraints, headerStatus}` via `GraphNode.metadata`. These facets are filterable via `rag-search --layer <value>` and `rag-search --capability <value>`.

---

## 2. The gate contract (Phase 6 → Phase 7)

This is the load-bearing contract: **`rag-index` refuses to run when `validation-report.json.ok === false`.**

| `validation-report.json.ok` | `rag-index` behavior |
|---|---|
| `true` | proceed to index; emit `IndexingResult` per status thresholds |
| `false` | return `IndexingResult` with `status='failed'`, `validationGateRefused=true`, `chunksIndexed=0`. **No silent success.** Exit code non-zero. |

This eliminates the pre-Phase-7 anti-pattern where `chunksIndexed=0` could be returned as a successful result.

**Programmatic callers** must inject the gate themselves (DR-PHASE-7-A) — the orchestrator is pure and never reads `validation-report.json` directly. The CLI `rag-index` is the canonical fs→orchestrator wiring.

---

## 3. `rag-index` exit code semantics

| Exit code | When | Stderr |
|----------:|------|--------|
| `0` | `status='success'` | quiet |
| `0` | `status='partial'` | warning summary (skipped/failed counts + per-entry reasons) |
| non-zero | `status='failed'` (including `validationGateRefused=true`) | error detail |

Agents that gate downstream work on indexing should read **both** the exit code and the `IndexingResult.status` field. Treat them as redundant signals; the status field is the higher-fidelity answer (it distinguishes `success` from `partial`, both of which exit `0`).

---

## 4. `IndexingStatus` thresholds (DR-PHASE-7-C)

| `status` | Condition |
|---------|-----------|
| `success` | `chunksIndexed > 0` AND `chunksSkipped === 0` AND `chunksFailed === 0` |
| `partial` | `chunksIndexed > 0` AND (`chunksSkipped > 0` OR `chunksFailed > 0`) |
| `failed`  | `chunksIndexed === 0` OR `validationGateRefused === true` |

If you depend on a "fully clean index" condition, gate on `status === 'success'`, not on exit code alone.

---

## 5. `SkipReason` and `FailReason` enums

`SkipReason` (intentional omission, NOT a malfunction):

| Value | Meaning |
|-------|---------|
| `unchanged` | Chunk is already indexed with current content; idempotent skip. |
| `header_status_missing` | Source file lacks a `@coderef-semantic:1.0.0` header. |
| `header_status_stale` | Source file's header `@exports` no longer matches AST exports (SH-2 drift). |
| `header_status_partial` | Source file's header is present but missing required fields. |
| `unresolved_relationship` | Chunk's relationships could not be resolved; index would be misleading. |

Header-derived skips (missing/stale/partial) implement the rebuild's "skipped or downgraded, not silently indexed" rule (DR-PHASE-7-E).

`FailReason` (malfunction — chunk should have indexed but couldn't):

| Value | Meaning |
|-------|---------|
| `embedding_api_error` | Vector store / embedding provider returned an error. |
| `malformed_chunk` | Chunk failed schema validation before embedding. |

---

## 6. What NOT to read

Agents should NOT depend on:

- **`PipelineState` mutation order or intermediate caches.** It's pipeline plumbing; phases 0–5 mutate it in a specific order, but downstream consumers read the final `ExportedGraph` / `ValidationResult` / `IndexingResult` instead.
- **Intermediate / legacy / `@legacy` types.** Specifically: `DependencyGraph` (the legacy projection at `src/semantic/projections.ts`) has been superseded by `ExportedGraph`. Read `ExportedGraph` directly.
- **Internal modules.** Anything under `src/integration/rag/__internal/`, `src/integration/vector/__tests__/`, or scanner standalone fallback paths is internal.
- **The legacy `imports: ImportRelationship[]` and `calls: CallRelationship[]` arrays on `PipelineState`.** These are kept additive during the transition; new consumers read `rawImports` / `rawCalls` (Phase 2) and `importResolutions` / `callResolutions` (Phase 3 / Phase 4) for resolved relationships, or `ExportedGraph.edges` for the canonical graph view.

If you find yourself reading any of the above, switch to the artifact contract in § 1.

---

## 7. Version compatibility commitments

`@coderef/core` follows SemVer. The post-rebuild contract:

- **`ValidationReport` field set is locked.** Adding a new numeric field is a minor-version bump. Renaming or dropping a field is a major-version bump and requires explicit ORCHESTRATOR sign-off.
- **`IndexingResult` field set is locked additive.** Adding a new field is a minor-version bump. The existing pre-Phase-7 fields (`chunksIndexed`, `chunksSkipped`, `chunksFailed`, `filesProcessed`, `processingTimeMs`, `stats`, `errors`) keep their original types in perpetuity (DR-PHASE-7-B).
- **`SkipReason` and `FailReason` are open enums for additive growth.** New reasons may be added in minor versions. Agents should accept unknown values gracefully.
- **`EdgeResolutionStatus`, `ImportResolutionKind`, `CallResolutionKind` are similarly additive.** The current values are stable; new values may appear in minor versions.
- **`IndexingStatus` ('success' | 'partial' | 'failed') is closed.** New values would be a major-version bump.
- **CLI flags** (`--strict-headers`, `--layer`, `--capability`) are stable. New flags may be added in minor versions.

---

## 8. Reading list for new agents

When integrating with `@coderef/core` for the first time, read in this order:

1. This document (`/AGENTS.md`) — agent contract.
2. [docs/SCHEMA.md](./docs/SCHEMA.md) — full type reference for `ElementData`, raw facts, resolutions, `GraphEdgeV2` / `EdgeEvidence` / `ExportedGraph`, `ValidationReport`, `IndexingResult`.
3. [docs/CLI.md](./docs/CLI.md) — CLI flag reference for `populate-coderef`, `rag-index`, `rag-search`.
4. [docs/HEADER-GRAMMAR.md](./docs/HEADER-GRAMMAR.md) — `@coderef-semantic:1.0.0` block grammar (mirror of ASSISTANT canonical).
5. [docs/API.md](./docs/API.md) — programmatic entry points if you're writing a host other than the CLI.
6. [docs/rag-http-api.md](./docs/rag-http-api.md) — RAG HTTP server contract.
7. [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — phase ordering and architecture overview.

Phase archives (`coderef/archived/pipeline-*/ARCHIVED.md`) document each phase's rationale and acceptance criteria — read these only when you need historical context for *why* the contract is shaped this way.

---

## General project rules

For general project rules (build, test, contribution conventions, agent execution norms), read:

`C:\Users\willh\Desktop\CODEREF\ASSISTANT\PROJECT-CONTEXT\coderef-core\CONTEXT.md`

(That file is the canonical project-context document maintained on the ASSISTANT side. It is the same target that this repo's `CLAUDE.md` and `GEMINI.md` pointer stubs delegate to.)

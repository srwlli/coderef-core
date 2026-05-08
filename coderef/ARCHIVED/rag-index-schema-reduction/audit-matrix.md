# Audit Matrix — WO-RAG-INDEX-SCHEMA-REDUCTION-001

**Date:** 2026-05-08
**Scope:** IndexingResult + IndexingStatistics + IndexingError (src/integration/rag/indexing-orchestrator.ts lines 278-353)
**Constraints:** DR-PHASE-7-B locked-additive (remove/freeze only — no new fields); chunksSkippedDetails MUST be preserved.

---

## IndexingResult

| Field | Type | Invariant Test(s) | Non-Test Consumer(s) | Disposition | Rationale |
|---|---|---|---|---|---|
| `chunksIndexed` | `number` | AC-01 (`toBe(0)`) | CLI display + indexMetadata | **KEEP** | AC-01 asserts on it; indexMetadata persists it |
| `chunksSkipped` | `number` | indirect (chunksSkippedDetails.length is AC-05a) | CLI display + indexMetadata | **FREEZE** | No direct value assertion on the scalar; AC-05a uses the details array. CLI displays as count. Freeze: must not be modified without adding a paired scalar test. |
| `chunksFailed` | `number` | none | CLI display + JSON output (`result.chunksFailed === 0`) | **FREEZE** | No invariant test asserts its value. CLI uses it for display and success heuristic. Freeze: must not be removed without updating CLI + JSON output path. |
| `filesProcessed` | `number` | none | CLI display (`result.filesProcessed`) | **REMOVE** | No invariant test asserts its value. CLI only uses it for a console.log display line (not for logic or exit-code). indexMetadata does NOT persist it from `result` directly (persists `totalTime` instead). Safe to remove — DR-1 does not apply. |
| `processingTimeMs` | `number` | indexing-gate-invariant.test.ts masks it to 0 before equality check (line 67) — NOT an assertion on a specific value | CLI does not read `result.processingTimeMs`; `totalTime = Date.now() - startTime` used instead | **REMOVE** | The only "test" touching it actively hides it. CLI ignores `result.processingTimeMs` and computes its own wall-clock delta. indexMetadata sets `processingTimeMs: totalTime` (not from result). Zero callers rely on the value — safe to remove. |
| `stats` | `IndexingStatistics` | none | indexMetadata (`stats: result.stats`) | **FREEZE** | No test asserts on any stats field. But `result.stats` is persisted to rag-index.json via indexMetadata. Freeze entire object: must not be modified without adding paired tests. |
| `errors` | `IndexingError[]` | none (CLI displays first 5) | CLI display + JSON output | **FREEZE** | No invariant test asserts on errors array shape or values. CLI accesses `.stage` and `.message` on each element. Freeze: must not be modified without adding paired tests. |
| `status` | `IndexingStatus` | AC-01 (`toBe('failed')`), AC-02 (`toBe('failed')`), invariant (b) (`toBe('failed')`) | CLI exit-code logic | **KEEP** | Multiple invariant tests assert on `status`. Core control-flow field. |
| `chunksSkippedDetails` | `SkipEntry[]` | AC-05a (element count), AC-05b (unique files) — FROZEN FIXTURE | CLI iterates for skip summary | **KEEP** | DR-1: chunksSkippedDetails is the direct subject of AC-05a and AC-05b. Must be preserved per hard constraint. |
| `chunksFailedDetails` | `FailEntry[]` | none | CLI iterates for fail summary | **FREEZE** | No invariant test asserts on content. CLI uses it for display only. Freeze: must not be modified without adding paired tests. |
| `validationGateRefused` | `boolean?` | AC-01 (`toBe(true)`), invariant (b) (`toBe(true)`) | CLI cause message | **KEEP** | Invariant tests assert on it. Required for AC-01 contract. |
| `validationReportPath` | `string?` | AC-01 (`toBe('/tmp/validation-report.json')`) | CLI cause message | **KEEP** | AC-01 asserts on it directly. Required for gate-refusal diagnostic. |

### IndexingResult Summary
- REMOVE: `filesProcessed`, `processingTimeMs` (2 fields)
- FREEZE: `chunksSkipped`, `chunksFailed`, `stats`, `errors`, `chunksFailedDetails` (5 fields)
- KEEP: `chunksIndexed`, `status`, `chunksSkippedDetails`, `validationGateRefused`, `validationReportPath` (5 fields)

---

## IndexingStatistics

| Field | Type | Invariant Test(s) | Non-Test Consumer(s) | Disposition | Rationale |
|---|---|---|---|---|---|
| `tokensUsed` | `number` | none | indexMetadata (`stats: result.stats`) | **FREEZE** | No invariant test. Persisted as part of stats blob. Freeze: must not be removed without updating the indexMetadata contract. |
| `estimatedCost` | `number?` | none | indexMetadata (via stats blob) | **FREEZE** | No invariant test. Optional field persisted as part of stats. Freeze: must not be modified without paired test. |
| `avgEmbeddingTimeMs` | `number` | none | indexMetadata (via stats blob) | **FREEZE** | No invariant test. Part of stats blob. Freeze. |
| `byType` | `Record<string, number>` | none | indexMetadata (via stats blob) | **FREEZE** | No invariant test. Part of stats blob. Freeze. |
| `byLanguage` | `Record<string, number>` | none | indexMetadata (via stats blob) | **FREEZE** | No invariant test. Part of stats blob. Freeze. |

### IndexingStatistics Summary
- REMOVE: none
- FREEZE: all 5 fields (`tokensUsed`, `estimatedCost`, `avgEmbeddingTimeMs`, `byType`, `byLanguage`)
- KEEP: none

**Rationale for all-freeze (no remove):** The entire `stats` object is persisted verbatim to rag-index.json via `indexMetadata.stats = result.stats`. Removing any field from IndexingStatistics without auditing all downstream consumers of rag-index.json would be scope-creep beyond this WO. Freeze is the correct disposition — each field needs a paired invariant test before it earns permanent status.

---

## IndexingError

| Field | Type | Invariant Test(s) | Non-Test Consumer(s) | Disposition | Rationale |
|---|---|---|---|---|---|
| `stage` | `IndexingStage` | none | CLI display (`err.stage`) | **FREEZE** | No invariant assertion. CLI formats it in the errors table. Freeze. |
| `message` | `string` | none | CLI display (`err.message`) | **FREEZE** | No invariant assertion. CLI formats it in the errors table. Freeze. |
| `context` | `string?` | none | none found | **FREEZE** | No invariant assertion, no consumer found. Freeze (not remove) because it may be consumed by external tooling reading rag-index.json errors[]. Removing would be out-of-scope rag-index.json consumer audit. |
| `originalError` | `Error?` | none | none found | **FREEZE** | No invariant assertion, no consumer found. However, removing a runtime Error field from a public interface requires care — it may carry a stack trace downstream. Freeze pending explicit consumer audit. |

### IndexingError Summary
- REMOVE: none
- FREEZE: all 4 fields
- KEEP: none

---

## Decision Records

### DR-1: chunksSkippedDetails = KEEP (hard constraint per context.json)
`chunksSkippedDetails` is the direct subject of AC-05a and AC-05b frozen-fixture invariants. It must be preserved regardless of test-coverage heuristic.

### DR-PHASE-7-B: locked-additive
This WO may REMOVE or FREEZE fields only. No new fields may be added to any of the three interfaces without a paired invariant test.

### DR-AUDIT-001: filesProcessed REMOVE ruling
`filesProcessed` has no invariant test, no indexMetadata persistence (indexMetadata uses `processingTimeMs: totalTime`, not `result.processingTimeMs`; `filesProcessed` is only in `console.log`), and no exit-code logic dependency. This is the lowest-risk removal candidate.

### DR-AUDIT-002: processingTimeMs REMOVE ruling
The only test touching `processingTimeMs` actively masks it to 0 to AVOID asserting on it (`const mask = (r) => ({ ...r, processingTimeMs: 0 })`). The CLI computes `totalTime = Date.now() - startTime` independently and does not read `result.processingTimeMs`. indexMetadata sets `processingTimeMs: totalTime` (not from result). The field is not consumed by any caller. Safe to remove.

### DR-AUDIT-003: IndexingStatistics all-freeze rationale
All 5 IndexingStatistics fields are persisted as an opaque blob (`result.stats`) to rag-index.json. Removing fields risks breaking downstream consumers of rag-index.json that are out-of-scope for this WO. Freeze is safer and sufficient.

### DR-AUDIT-004: IndexingError all-freeze rationale
The `errors` array is persisted to rag-index.json and rendered in CLI output. Field removal requires a consumer audit of rag-index.json readers. Out-of-scope for this WO. Freeze all.

---

## Phase 2 Pre-Conditions

Before Phase 2 begins:
1. This audit-matrix.md is complete — YES
2. AC-05a PASS at baseline — YES (indexing-gate-invariant.test.ts 12/12 PASS)
3. AC-05b PASS at baseline — YES (same test file)
4. Pre-existing test failures (67) are unrelated to IndexingResult (ollama-unreachable, other pipeline tests) — CONFIRMED

Phase 2 is authorized to proceed on USER or ORCHESTRATOR approval.

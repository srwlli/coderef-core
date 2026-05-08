# Seam Inventory — WO-RAG-INDEX-SEAM-DELETION-001

## Methodology

Grep pass across `src/integration/rag/*.ts` for:
- `try {` / `} catch`
- `?? null`, `?? {}`, `?? []`, `|| {}`, `|| []`
- `as any`
- `Number(`
- `fileExists`, `existsSync`
- Optional-chaining-with-fallback patterns

Followed by eyeball-read of every `.ts` production file in `src/integration/rag/*`.
Test files in `src/integration/rag/__tests__/*` scanned for silent-mock antipatterns;
frozen-fixture dir (`dual-ac-frozen/`) is EXEMPT per DR-SEAM-D.

Anchor-case ruling: **Option B locked** (per DISPATCH-2026-05-08-001).

---

## Inventory Table

### chunk-converter.ts

| seam | lines | classification | disposition | rationale |
|---|---|---|---|---|
| `fileExists` silent skip — `continue` with no counter/log | 57–63 | silent_skip | **delete** | ANCHOR CASE. Option B ruling: delete the `fileExists` check entirely. Let the `readFile` try/catch (lines 65–77) own missing-file behavior — errors[] accumulator surfaces failures explicitly. No test exercises this branch directly (confirmed: no `fileExists` mock in chunk-converter.test.ts). |
| `fileExists()` private method (`stat().isFile()` catches → `return false`) | 245–256 | dead_branch | **delete** | Companion to anchor-case removal. Once the call site (lines 57–63) is deleted, `fileExists()` becomes unreferenced dead code. Delete the entire private method. Confirm with tsc that nothing else calls it. |
| `catch (error: any)` in `convertNode` loop (lines 82–95) | 90–95 | pass_through | **keep_with_justification** | Records error to `errors[]` accumulator with coderef + message + originalError. Surfaces failure explicitly via assertable `errors` array returned in `ChunkGenerationResult`. Handles real failure mode: corrupt/unparseable source code at conversion time. Carries a comment on the catch site. |
| `catch (error: any)` in `readFile` block (lines 65–77) | 67–77 | pass_through | **keep_with_justification** | Records errors for all nodes of a file, then continues to next file. Surfaces failure explicitly via `errors[]`. Handles real failure mode: I/O errors reading source (EACCES, EISDIR, etc.). This is the path that will own missing-file errors post-Option-B. |

### indexing-orchestrator.ts

| seam | lines | classification | disposition | rationale |
|---|---|---|---|---|
| `j.nodes ?? []` and `j.edges ?? []` in `buildGraphFromExportedJson` | 79, 96 | pass_through | **keep_with_justification** | Null-coalescing on deserialized JSON fields. Handles real failure mode: graph.json written with missing `nodes` or `edges` arrays (e.g., empty graph from a project with no exported symbols). The downstream `for...of` simply produces an empty map/array — observable as zero nodes/edges in IndexingResult. |
| `try/catch` around `fs.readFile(graphJsonPath)` + `fs.stat` (lines 466–481) | 466–481 | pass_through | **keep_with_justification** | Catches ENOENT specifically and throws a descriptive error; all other errors re-throw. Surfaces failure explicitly. Handles real failure mode: missing graph.json (user ran `rag-index` before `populate`). |
| `} catch { continue; }` in stale-graph check loop (lines 502–506) | 502–506 | silent_skip | **keep_with_justification** | Silently skips stat-fail for individual source files during the stale-graph mtime probe. Comment reads: `// missing source files are ChunkConverter's concern, not ours`. Handles real failure mode: graph.json lists a file that was deleted after populate but before rag-index. ChunkConverter's readFile error path owns that failure; the stale-graph probe's job is only to detect whether existing source files are newer — skipping missing ones is correct and safe. Earns keep: the comment names the failure mode and delegates it. |
| `catch (error: any)` in outer try/catch (lines 804–812) | 804–812 | pass_through | **keep_with_justification** | Catches fatal errors from the entire indexing pipeline, pushes to `errors[]`, and re-throws a wrapped `Error`. Surfaces failure explicitly. Handles real failure mode: any unrecovered stage error. |

### incremental-indexer.ts

| seam | lines | classification | disposition | rationale |
|---|---|---|---|---|
| `catch (error: any)` in `loadState` — returns `null` on ENOENT, re-throws otherwise | 131–137 | pass_through | **keep_with_justification** | ENOENT = no prior index state exists, returns null (first run). All other errors re-throw. Handles real failure mode: corrupted state file. Null return is observable — callers treat null as "full re-index". |
| `catch (error: any)` in `saveState` — throws wrapped error | 160–162 | pass_through | **keep_with_justification** | Surfaces failure explicitly as a thrown error with context. Handles real failure mode: I/O error persisting index state. |
| `catch (error: any)` in `hashFile` — throws wrapped error | 360–362 | pass_through | **keep_with_justification** | Surfaces failure explicitly. Handles real failure mode: file unreadable during hash computation. |
| `catch (error: any)` in `clearState` — ignores ENOENT only, re-throws otherwise | 372–375 | pass_through | **keep_with_justification** | ENOENT is expected on first call (no state to clear). All other errors re-throw. Observable: ENOENT is a no-op; anything else surfaces. |
| `catch (error)` in `needsReindexing` — returns `true` on any hash error | 433–435 | silent_skip | **keep_with_justification** | Returns `true` (assume needs indexing) if `hashFile` throws. This is a safe conservative fallback — worst case is an unnecessary re-index, not a silent drop. Handles real failure mode: file unreadable between state-load and hash-check. Observable outcome: the file gets re-indexed. |

### embedding-service.ts

| seam | lines | classification | disposition | rationale |
|---|---|---|---|---|
| `options?.textOptions ?? {}` and `options?.onProgress ?? (() => {})` | 158–159 | pass_through | **keep_with_justification** | Default-value coalescing for optional config fields. Not a seam — this is standard TypeScript optional-options normalization. No failure mode being hidden. |
| `catch (error: any)` batch-failure loop (lines 207–216) | 207–216 | pass_through | **keep_with_justification** | Catches a whole-batch embedding API failure, records each chunk in `failed[]` with message + originalError. Surfaces failure explicitly via `EmbeddingResult.failed[]`. Handles real failure mode: LLM provider returns error on a batch. |

### answer-generation-service.ts

| seam | lines | classification | disposition | rationale |
|---|---|---|---|---|
| `catch (error: any)` outer try/catch — re-throws wrapped | 230–232 | pass_through | **keep_with_justification** | Re-throws with a descriptive message. Surfaces failure explicitly. Handles real failure mode: any search/rerank/context/LLM step failure. |
| `llmResponse: any` param in `calculateConfidence` | 273 | type_coercion_fallback | **keep_with_justification** | `llmResponse` is typed `any` because the LLM provider's response type is not imported at this call site. Does not hide a failure mode — it is a typing gap, not a runtime seam. Out of scope for this WO (no runtime behavior change). |

### Other files (context-builder.ts, confidence-scorer.ts, semantic-search.ts, graph-reranker.ts, prompt-templates.ts, rag-config.ts, embedding-text-generator.ts, conversation-manager.ts, code-chunk.ts, index.ts)

Eyeball-read: no try/catch swallowers, silent skips, or dead-code branches found. The `|| []` patterns (e.g., `graph.edgesBySource.get(nodeId) || []`) are standard Map-miss defaults for empty collections — not seams. No inventory entries.

---

## Summary

| disposition | count |
|---|---|
| **delete** | 2 (anchor-case fileExists call site + dead `fileExists()` method) |
| **keep_with_justification** | 12 |
| RULING_REQUIRED | 0 (anchor case ruling already locked: Option B) |

**Net LOC delta estimate:** −12 to −15 (delete lines 57–63 + lines 245–256 from chunk-converter.ts)

---

## Phase 2 Outcomes

| seam | file | lines (pre-edit) | disposition | commit |
|---|---|---|---|---|
| fileExists call site (silent skip) | chunk-converter.ts | 57–63 | **deleted** | ffe79e9 |
| fileExists() private method (dead code) | chunk-converter.ts | 245–256 | **deleted** | ffe79e9 |

All other 12 seams: **keep_with_justification** — no Phase 2 commits required for them.

**Net LOC delta:** -28 (2 inserted comment lines, 30 deleted). Satisfies AC-12 (net negative).

**Gates per ffe79e9:**
- tsc --noEmit: CLEAN
- vitest src/integration/rag/__tests__/: 6/6 files, 87/87 PASS
- vitest __tests__/pipeline/indexing-gate-invariant.test.ts: 4/4 PASS
- Frozen-fixture invariant: PASS
- Phase 7 chokepoint block (lines 32-70): UNTOUCHED

---

## RULING_REQUIRED: None

All seams resolved. Anchor-case ruling: Option B (DISPATCH-2026-05-08-001).

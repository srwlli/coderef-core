# WO-RAG-INDEX-BRANDED-PATHS-001 — Path Inventory

**Authored:** 2026-05-08
**Phase:** 1 (non-skippable inventory — brand classifications confirmed by source read)
**Grep methodology:** `grep -rn "basePath|filePath|fullPath|graphPath|reportPath|path\.isAbsolute|pathMod\.isAbsolute|path\.join|pathMod\.join|path\.resolve|node\.file|n\.file|\brel\b|\babs\b" src/integration/rag/*.ts`

---

## HALT-BOUNDARY-VIOLATION — Phase 3 external caller

**Before any Phase 3 propagation of branded types into `IndexingOrchestrator`, ORCHESTRATOR must rule on DR-BRAND-D.**

| call site | file | line | value passed | outside boundary? |
|---|---|---|---|---|
| `new IndexingOrchestrator(..., args.projectDir)` | `src/cli/rag-index.ts` | 436-440 | `args.projectDir` — absolute (resolved from CLI) | **YES — BOUNDARY VIOLATION** |
| `new IndexingOrchestrator(..., tempDir)` | `src/integration/rag/__tests__/integration/indexing-pipeline.test.ts` | 138-142 | `tempDir` — absolute (os.tmpdir() result) | No (within boundary) |
| `new ChunkConverter('/test/project')` | `src/integration/rag/__tests__/chunk-converter.test.ts` | 37 | `'/test/project'` — POSIX absolute literal | No (within boundary) |
| `new ChunkConverter(tempDir)` | `src/integration/rag/__tests__/integration/indexing-pipeline.test.ts` | 379 | `tempDir` — absolute (os.tmpdir() result) | No (within boundary) |
| `new IncrementalIndexer(this.basePath, ...)` | `src/integration/rag/indexing-orchestrator.ts` | 600, 824, 841 | `this.basePath` — always absolute per class invariant | No (within boundary) |

**ORCHESTRATOR ruling required — three options (per DR-BRAND-D):**

**(A) Extend boundary** — include `src/cli/rag-index.ts` in this WO's scope; apply `toAbsolute(args.projectDir)` at line 439. `args.projectDir` is always absolute at the CLI layer. Low risk; scope enlargement is 1 file / 1 line.

**(B) Interface cast pattern** — keep `IndexingOrchestrator` constructor accepting `string`, add `this.basePath = toAbsolute(basePath)` internally; external callers (CLI) remain unbranded; branding enforced only within the class. No change to `src/cli/`. Trade-off: the boundary entry point is a cast, not a type guarantee — compiler can't enforce absolute at CLI callsite.

**(C) Scope ChunkConverter only** — limit Phase 3 propagation to `ChunkConverter` (all its call sites are within boundary); skip `IndexingOrchestrator` branding. Leave `IncrementalIndexer` as-is. Close WO as partial. Simplest; leaves two isAbsolute guards in place (orchestrator + incremental-indexer).

---

## Per-Parameter Classification Table

### chunk-converter.ts

| method/field | parameter | current type | proposed brand | contract evidence | classification | disposition |
|---|---|---|---|---|---|---|
| `ChunkConverter` (field) | `basePath` | `string` | `AbsolutePath` | constructor default = `process.cwd()` (always absolute); all test call sites pass absolute literals | absolute-only | **brand** |
| `ChunkConverter` (constructor) | `basePath` | `string` | `AbsolutePath` | same as above | absolute-only | **brand** |
| `readFile` (private) | `filePath` | `string` | `RelativePath` | GUARD-1: called only from `groupNodesByFile` loop iterating `node.file` values; graph.json contract = relative | relative-only | **brand; remove isAbsolute guard at :222-225** |
| `readFile` (private) | `fullPath` (local) | `string` | `AbsolutePath` | result of `path.join(AbsolutePath, RelativePath)` after guard removal | absolute-only | inferred; no param change |
| `detectLanguage` (private) | `filePath` | `string` | `RelativePath` | called with `node.file` (relative graph key) at :113; only uses `path.extname` — no join, no I/O | relative-only | **brand** (low-impact; extname works on either) |
| `extractRelatedElements` (private) | `filePath` | `string` | `RelativePath` | called with `node.file` at :198; compared against `node.file` values in loop | relative-only | **brand** |
| `groupNodesByFile` (private) | return `Map<string, GraphNode[]>` | `string` key | `Map<RelativePath, GraphNode[]>` | keys are `node.file` values from graph | relative-only | **brand the Map key** |

**GUARD-1 confirmed:** `readFile(filePath)` is called only from the `groupNodesByFile` loop at :52-58; `filePath` always comes from `Map<string, GraphNode[]>` keys which are `node.file` graph values. `node.file` is always relative per graph.json contract.

---

### indexing-orchestrator.ts

| method/field | parameter | current type | proposed brand | contract evidence | classification | disposition |
|---|---|---|---|---|---|---|
| `IndexingOrchestrator` (field) | `basePath` | `string` | `AbsolutePath` | constructor default = `process.cwd()`; CLI passes `args.projectDir` (absolute); test passes `tempDir` (absolute) | absolute-only | **brand — PENDING ORCHESTRATOR RULING (boundary violation)** |
| `IndexingOrchestrator` (constructor) | `basePath` | `string` | `AbsolutePath` | same as above | absolute-only | **brand — PENDING RULING** |
| staleness check loop | `rel` (local) | `string` | `RelativePath` | comes from `n.file` (graph.json node, always relative) at :493-495 | relative-only | **brand; remove isAbsolute guard at :500** — PENDING RULING |
| staleness check | `abs` (local) | `string` | `AbsolutePath` | result of `pathMod.join(this.basePath, rel)` after guard removal | absolute-only | inferred; no param change |
| `normalizeChunkFileForGraphJoin` | `file` | `string` | **keep as string** | accepts absolute/relative/URI — intentionally normalizes all forms to relative; branding would require union type | either | **keep_with_justification** — pure normalization function; branding makes no sense here |
| `normalizeChunkFileForGraphJoin` | `basePath` | `string` | **keep as string** | test call sites pass `'.'` (relative) and absolute paths; `pathMod.resolve(basePath)` normalizes internally | either | **keep_with_justification** — resolve() handles both; caller contract is deliberately flexible |
| `graphJsonPath` (local) | (computed) | `string` | `AbsolutePath` | `pathMod.join(this.basePath, '.coderef', 'graph.json')` — always absolute after branding | absolute-only | inferred |
| `reportPath` in `IndexingOptions` | `reportPath?` | `string \| undefined` | **keep as string** | passed from CLI as string path; not used for join; only stored for output reference | either | **keep_with_justification** — not a path-join operand; branding adds no safety here |

**GUARD-2 confirmed:** `rel` at :499 comes exclusively from `sampleFiles` which is populated by `n.file` values from `graph.nodes.values()`. `n.file` is always relative per graph.json contract. The `pathMod.isAbsolute(rel)` absolute branch at :500 is unreachable in correct usage.

---

### incremental-indexer.ts

| method/field | parameter | current type | proposed brand | contract evidence | classification | disposition |
|---|---|---|---|---|---|---|
| `IncrementalIndexer` (field) | `basePath` | `string` | `AbsolutePath` | constructor default = `process.cwd()`; always called with `this.basePath` from orchestrator which is absolute | absolute-only | **brand — contingent on orchestrator ruling** |
| `IncrementalIndexer` (constructor) | `basePath` | `string` | `AbsolutePath` | same | absolute-only | **brand — contingent on orchestrator ruling** |
| `stateFile` (field) | (computed) | `string` | `AbsolutePath` | `path.join(basePath, '.coderef-rag-index.json')` — always absolute after branding | absolute-only | inferred |
| `hashFile` | `filePath` | `string` | `RelativePath` | called from `analyzeChanges(currentFiles, ...)` where `currentFiles` = `chunk.file` values = `node.file` = relative | relative-only | **brand; remove isAbsolute guard at :354-356** — contingent on ruling |
| `hashFile` | `fullPath` (local) | `string` | `AbsolutePath` | `path.join(this.basePath, filePath)` result after guard removal | absolute-only | inferred |
| `needsReindexing` | `filePath` | `string` | `RelativePath` | only external usage passes `chunk.file` values (relative) via `needsReindexing` | relative-only | **brand** |
| `analyzeChanges` | `currentFiles: string[]` | `string[]` | `RelativePath[]` | populated from `chunk.file` values via `filterChangedChunks` | relative-only | **brand** |
| `filterChangedChunks` | `allChunks: CodeChunk[]` | (no brand on CodeChunk) | — | `chunk.file` is used as the key; CodeChunk is a shared type — keep as string | — | **leave CodeChunk.file as string** (type lives outside rag/) |

**GUARD-3 (incremental-indexer.ts:354-356):** `hashFile(filePath)` receives relative paths from `filterChangedChunks → analyzeChanges → currentFiles = chunk.file`. The absolute branch is unreachable in correct usage. Same structural pattern as GUARD-1 and GUARD-2.

---

### Other rag/*.ts files — no path-bearing parameters requiring branding

| file | finding |
|---|---|
| `embedding-text-generator.ts` | No path parameters |
| `context-builder.ts` | No path parameters |
| `embedding-service.ts` | No path parameters |
| `graph-reranker.ts` | `Math.abs()` (numeric) — not a path; no path params |
| `index.ts` | Re-exports only |
| `prompt-templates.ts` | No path parameters |
| `answer-generation-service.ts` | No path parameters |
| `confidence-scorer.ts` | No path parameters |
| `conversation-manager.ts` | No path parameters |
| `semantic-search.ts` | No path parameters |
| `rag-config.ts` | No path parameters |
| `code-chunk.ts` | `CodeChunk.file: string` — keep as string (shared type, outside rag/ boundary) |

---

## Summary

**Files with path parameters requiring branding:**
1. `chunk-converter.ts` — all call sites within boundary; safe to proceed immediately
2. `indexing-orchestrator.ts` — **HALT-BOUNDARY-VIOLATION: `src/cli/rag-index.ts` caller**; requires ORCHESTRATOR ruling before Phase 3 propagation
3. `incremental-indexer.ts` — call sites all within `src/integration/rag/`; contingent on orchestrator ruling (all `IncrementalIndexer` construction passes `this.basePath` from orchestrator)

**isAbsolute guards to remove (post-ruling):**
- `chunk-converter.ts:222-225` (GUARD-1) — safe, no boundary issue
- `indexing-orchestrator.ts:500` (GUARD-2) — contingent on ruling
- `incremental-indexer.ts:354-356` (GUARD-3) — contingent on ruling

**Kept as string (justified):**
- `normalizeChunkFileForGraphJoin.file` — normalization function accepts all path forms by design
- `normalizeChunkFileForGraphJoin.basePath` — accepts relative `'.'` by design; `pathMod.resolve()` normalizes
- `IndexingOptions.reportPath` — not a join operand; branding adds no safety
- `CodeChunk.file` — shared type defined outside rag/ boundary

**Final outcomes (post-execution):**

| parameter | file | disposition | commit |
|---|---|---|---|
| `ChunkConverter.basePath` | chunk-converter.ts | AbsolutePath — branded | e2b2655 |
| `ChunkConverter.readFile.filePath` | chunk-converter.ts | RelativePath — branded; GUARD-1 removed | e2b2655 |
| `ChunkConverter.groupNodesByFile` return | chunk-converter.ts | Map<RelativePath,…> — branded | e2b2655 |
| `ChunkConverter.detectLanguage.filePath` | chunk-converter.ts | RelativePath — branded | e2b2655 |
| `ChunkConverter.extractRelatedElements.filePath` | chunk-converter.ts | RelativePath — branded | e2b2655 |
| `IndexingOrchestrator.basePath` | indexing-orchestrator.ts | AbsolutePath — branded | 8d3da3e |
| `IndexingOrchestrator` staleness `rel` | indexing-orchestrator.ts | RelativePath — branded; GUARD-2 removed | 8d3da3e |
| `IncrementalIndexer.basePath` | incremental-indexer.ts | AbsolutePath — branded | 8d3da3e |
| `IncrementalIndexer.hashFile.filePath` | incremental-indexer.ts | RelativePath — branded; GUARD-3 removed | 8d3da3e |
| `IncrementalIndexer.needsReindexing.filePath` | incremental-indexer.ts | RelativePath — branded | 8d3da3e |
| `IncrementalIndexer.analyzeChanges.currentFiles` | incremental-indexer.ts | RelativePath[] — branded | 8d3da3e |
| `toAbsolute(args.projectDir)` CLI call site | src/cli/rag-index.ts | AbsolutePath cast at boundary (Option A ruling) | 8d3da3e |
| `normalizeChunkFileForGraphJoin.file` | indexing-orchestrator.ts | keep as string — normalization fn accepts all forms | — |
| `normalizeChunkFileForGraphJoin.basePath` | indexing-orchestrator.ts | keep as string — pathMod.resolve() normalizes | — |
| `IndexingOptions.reportPath` | indexing-orchestrator.ts | keep as string — not a join operand | — |
| `CodeChunk.file` | code-chunk.ts (shared) | keep as string — outside boundary | — |

**Final LOC delta:** +57 net (94 insertions, 37 deletions across src/ files).
Plan estimated +15 to +40; actual +57 — `incremental-indexer.ts` had more cast sites (Map<string> key → RelativePath boundaries) than anticipated at scoping. Accurately reported.

**Tests:** no test file changes required. tsc clean on both configs after all commits. All 239 tests PASS (rag-suite 87/87 + pipeline 152/152).

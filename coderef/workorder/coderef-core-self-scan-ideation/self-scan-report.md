# CODEREF-CORE Self-Scan Report
**WO-CODEREF-CORE-SELF-SCAN-IDEATION-001**  
**Date:** 2026-05-16  
**Agent:** claude-sonnet-4-6  

---

## 1. Executive Summary

CODEREF-CORE has executed a dog-food self-scan: the tool analyzed its own codebase using its own populate, scan, and RAG pipelines. The scan surfaced a coherent picture of the tool's self-knowledge quality and identified concrete improvement opportunities.

**Key finding:** The tool has low self-awareness. 39% semantic header coverage, 0% capability/layer field population in element metadata, and 35% test coverage. The highest-value next actions are: propagate capability/layer from semantic headers into element metadata, reduce stale header count with --overwrite-headers, and add test coverage to the 10 highest-complexity untested modules.

**RAG status at scan time:** RAG index rebuild (Ollama nomic-embed-text) in progress during Phase 4. RAG queries deferred — results to be re-run post-rebuild. Direct index/graph analysis used for all findings below.

---

## 2. Header Coverage Snapshot

### Baseline (before --overwrite-headers)
| Metric | Value |
|--------|-------|
| Total elements | 2,431 |
| Defined headers | 956 (39%) |
| Stale headers | 1,112 (46%) |
| Missing headers | 343 (14%) |
| Capability populated | 0 / 2,431 |
| Layer populated | 0 / 2,431 |
| ElementType != undefined | 0 / 2,431 |

### After --overwrite-headers + populate re-run
Headers were physically written to **198 src/ files** (+2,916 insertions). However, `.coderef/index.json` header counts are **unchanged** (defined=956, stale=1,112). 

**Root cause confirmed:** `--overwrite-headers` writes `@coderef-semantic` blocks into source files but `headerStatus` in the index reflects an `exports_match_ast` validation that fires independently. Stale = export mismatch, not header absence. The 1,112 stale elements need the AST to agree with the header's `@exports` declaration — that's a deeper gap than header presence.

**Parse gap confirmed:** `capability` and `layer` fields remain 0 after the header write + re-scan. The semantic header parser writes these fields into source but the populate pipeline does not extract them back into `element.capability` or `element.metadata.layer`. This is the highest-priority parse gap.

---

## 3. RAG Index Health

| Metric | Value |
|--------|-------|
| Provider | Ollama (nomic-embed-text) |
| Dimension | 768 |
| Vector records (pre-rebuild) | ~627 (coderef-vectors.json) |
| SQLite store | Present but empty (rag-vectors.sqlite = 0 bytes) |
| Rebuild status | In progress (43.5% embedding at report time) |

**Staleness finding:** The active rag-index.json was created 2026-05-15 (prior session). After --overwrite-headers modified 198 files, the graph.json became stale and blocked rag-index --reset. A second populate run was required to refresh the graph before RAG rebuild could proceed.

**Workflow implication:** Self-scan must include a `populate → rag-index` sequence, not just `rag-index` alone, any time source headers have been refreshed.

---

## 4. Direct Index Analysis (Phase 4 Substitute for RAG Queries)

### Category 1: Undocumented Modules (All-Missing Headers)
Top files with zero semantic header coverage:

| File | Elements |
|------|----------|
| `src/cli/coderef-rag-server.ts` | 27 |
| `src/cli/coderef-watch.ts` | 21 |
| `__tests__/integration.test.ts` | 20 |
| `scripts/doc-gen/generate-meta-json.js` | 15 |
| `scripts/doc-gen/utils.js` | 13 |
| `src/cli/coderef-pipeline.ts` | 11 |
| `utils/fs.js` + `utils/fs.ts` | 10 each |
| `src/cli/populate.ts` | 8 |
| `src/cli/rag-search.ts` | 8 |

**Signal:** The CLI entry points themselves (populate, rag-search, rag-server, watch) are completely undocumented at the semantic layer. These are the highest-leverage targets for header annotation.

### Category 2: Architectural Hubs (Most Incoming Edges)
Functions with highest in-degree in src/ files:

| Element | File | In-degree |
|---------|------|-----------|
| `validatePipelineState` | `src/pipeline/output-validator.ts` | 32 |
| `createCodeRefId` | `src/utils/coderef-id.ts` | 31 |
| `buildDependencyGraph` | `src/fileGeneration/buildDependencyGraph.ts` | 22 |
| `parseHeader` | `src/pipeline/semantic-header-parser.ts` | 20 |
| `generateContext` | `src/fileGeneration/generateContext.ts` | 19 |
| `parseExpressRoute` | `src/analyzer/route-parsers.ts` | 19 |
| `parseCodeRef` | `src/parser/parser.ts` | 18 |

**Signal:** `validatePipelineState` and `createCodeRefId` are the most-referenced functions in the codebase. Both should have `@constraints` and `@used_by` annotations documenting their consumers. Neither currently has capability/layer metadata.

### Category 3: Improvement Opportunities (High Complexity + Untested)
Intersection of high complexity and zero test coverage:

| Element | File | Complexity | LOC |
|---------|------|-----------|-----|
| `currentScopeCodeRefId` | `src/pipeline/call-resolver.ts` | 65 | 169 |
| `extractExportsFromAST` | `src/analyzer/js-call-detector/module-analyzer.ts` | 55 | 101 |
| `main` (rag-index CLI) | `src/cli/rag-index.ts` | 54 | 314 |
| `extractElementsFromAST` | `src/analyzer/js-call-detector/visitor.ts` | 51 | 122 |
| `main` (rag-search CLI) | `src/cli/rag-search.ts` | 48 | 194 |
| `buildEdges` | `src/pipeline/graph-builder.ts` | 41 | 281 |
| `extractImportsFromAST` | `src/analyzer/js-call-detector/module-analyzer.ts` | 37 | 86 |
| `main` (rag-status CLI) | `src/cli/rag-status.ts` | 35 | 204 |
| `loadLocalPlugin` | `src/plugins/loaders/local-loader.ts` | 35 | 155 |

**Signal:** The CLI entry points (rag-index, rag-search, rag-status) are complex, untested, and undocumented. This is a triple-gap: no headers, no tests, high complexity. `call-resolver.ts::currentScopeCodeRefId` at complexity=65 is the most dangerous untested element.

### Category 4: Missing Semantic Annotations
- 0 elements have `capability` populated (all 2,431 elements)
- 0 elements have `metadata.layer` populated  
- All elementType fields show "undefined" — the scanner's type output is not flowing into the index
- The `exports_match_ast` stale flag on 1,112 elements suggests exported symbol declarations in headers don't match what tree-sitter finds in the AST

### Category 5: Overall Coverage
| Metric | Value |
|--------|-------|
| Test coverage | 35% (86/249 files tested) |
| Semantic header coverage | 39% (956/2,431 defined) |
| Capability annotation | 0% |
| Layer annotation | 0% |

---

## 5. Top Improvement Opportunities

Ranked by impact × effort:

| # | Opportunity | File(s) | Action |
|---|-------------|---------|--------|
| 1 | Parse @capability/@layer from semantic headers into element metadata | `src/pipeline/semantic-header-parser.ts`, populate pipeline | File WO to fix the populate extractor — populate should write capability/layer into element fields after writing headers |
| 2 | Propagate @layer into RAG vector chunk metadata | `src/integration/rag/indexing-orchestrator.ts` | File stub (WO-LEVERAGE-AUDIT-FRESH-PASS-001 Ph5 finding) — enables --constraint layer |
| 3 | Add semantic headers + tests to CLI entry points | `src/cli/populate.ts`, `rag-index.ts`, `rag-search.ts`, `rag-status.ts` | Header annotation + test WO; these are complex + untested + undocumented |
| 4 | Fix exports_match_ast stale issue on 1,112 elements | `src/pipeline/output-validator.ts` | Investigate why @exports in headers don't match AST exports; potentially update header template |
| 5 | Add tests for currentScopeCodeRefId (complexity=65, untested) | `src/pipeline/call-resolver.ts` | High-risk untested function; add unit tests before next refactor |
| 6 | Fix elementType always "undefined" in index | `src/scanner/tree-sitter-scanner.ts`, indexer pipeline | elementType not flowing from tree-sitter output into index.json |
| 7 | Implement --max-tokens truncation in rag-search CLI | `src/cli/rag-search.ts` | WO-LEVERAGE-AUDIT-FRESH-PASS-001 Ph7 finding; --top-k 50 produces unbounded 30KB output |

---

## 6. Known Gaps Blocking Self-Scan Quality

These gaps were identified in WO-LEVERAGE-AUDIT-FRESH-PASS-001 and confirmed in this self-scan:

| Gap | Impact | Status |
|-----|--------|--------|
| `--constraint layer` always returns 0 | Cannot filter RAG by architectural layer | Stub filed (MEDIUM finding) |
| `--max-tokens` not implemented | RAG queries unbounded | Stub filed (MEDIUM finding) |
| `capability`/`layer` not extracted from headers into element metadata | Self-scan queries can't filter by layer | Root cause identified here: parse gap in populate pipeline |
| `elementType` always "undefined" in index | Can't filter by element type in analysis | Root cause: scanner type not flowing into index |
| `exports_match_ast` stale on 1,112 elements | Stale count won't reduce with --overwrite-headers alone | Needs @exports template audit |
| RAG index rebuild requires fresh graph | Can't rag-index after --overwrite-headers without re-running populate first | Workflow gap (no auto-dependency check) |

---

## 7. Recommended Next Steps

### Immediate (file as stubs/WOs this session)
1. **WO: parse @capability/@layer into element metadata** — highest leverage; unlocks layer-based filtering and RAG constraint queries across 2,431 elements
2. **WO: fix elementType always "undefined"** — unblocks element type analysis and reporting
3. **Stub: --max-tokens truncation in rag-search CLI** — already identified in leverage audit, needs to be filed

### Short-term
4. **WO: semantic headers + tests for CLI entry points** — populate.ts, rag-index.ts, rag-search.ts, rag-status.ts — triple gap: undocumented + complex + untested
5. **WO: tests for call-resolver.ts::currentScopeCodeRefId** — complexity=65, untested — highest-risk untested function
6. **Run self-scan query pass post-RAG rebuild** — re-run the 6 queries in plan.json Phase 4 once SQLite rebuild completes

### Self-Scan Cadence
Recommended: run self-scan loop after each major WO close:
```
node dist/src/cli/populate.js --source-headers --overwrite-headers
node dist/src/cli/populate.js   # refresh graph.json
node dist/src/cli/rag-index.js --provider ollama --reset
node dist/src/cli/rag-search.js "module without capability metadata" --top-k 10
node dist/src/cli/rag-search.js "complex function untested" --top-k 10
node dist/src/cli/rag-search.js "pipeline orchestration architecture" --top-k 10
```
Output → self-scan-report.md → operator review → WO creation for top findings.

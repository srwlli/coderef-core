# /discover report — doc-to-graph wiring: documentation surfaces (resource sheets, foundation docs, docstrings, headers) attached to graph.json nodes, hotspot centrality ranking seeds doc coverage priority

**Generated:** 2026-08-01T06:17:05Z
**Depth:** thorough
**Output dest:** working:C:/Users/willh/Desktop/CODEREF/CODEREF-CORE/coderef/working/coderef-core/core-improvements-731/discovery-doc-graph-phase1.md
**Dispatch:** none

## 1. Scope

What was asked: `doc-to-graph wiring: documentation surfaces (resource sheets, foundation docs, docstrings, headers) attached to graph.json nodes, hotspot centrality ranking seeds doc coverage priority`.
What was bounded: unbounded — full project root.

## 2. Surfaces audited

- [tool: skeleton-map]          present (cached), 158 lines
- [tool: rg]                    queries=1, hits=0
- [tool: rag-search]            top-k=10, ms=795, lane=hybrid, fallback_used=false
- [tool: element-lookup]        source=symbol-table (rag-search --lexical), candidates=10, elements_indexed=3169
- [tool: header-index]          defined=369, missing=0, stale=0, coverage=100% (validation-report.json)
- [tool: foundation-docs]       sections_matched=8
- [tool: codebase_summary]      elements=3169, top types: function=1073, method=972, interface=611, generated=2026-08-01T01:54:11.554Z
- [tool: validation_status]     resolution_rate=22.32%, unresolved=18069, ambiguous=1707, header_coverage=100%
- [tool: coderef-query]         walks=10, divergence_rows=5
- [tool: graph-risk]            hotspots_top=5, cycles=0 (largest=0), edges=43421

### Orientation (skeleton map excerpt)

```
# repo map (skeleton): CODEREF-CORE — 455 files, 850 edges — budget ~1600 tokens
# ranked by dependency centrality (most depended-on first); in/out = distinct dependents/dependencies. surfaces, not verdicts.

src/scanner/lru-cache.ts  (in 97 / out 1)
  class LRUCache
  interface ScanCacheEntry
  fn createScannerCache(maxSizeBytes)

src/pipeline/orchestrator.ts  (in 53 / out 15)
  class PipelineOrchestrator

src/utils/path-normalize.ts  (in 33 / out 0)
  fn normalizeSlashes(p)
  fn toRepoRelativePosix(file, projectPath)
```

## 3. Findings table

| Surface | Observation | Severity | Evidence |
|---|---|---|---|
| src/integration/rag/graph-reranker.ts:36 | Element lookup match: `CentralityIndex` | info | `name=CentralityIndex, type=interface, score=21.61` |
| src/analyzer/docs-analyzer.ts:86 | Element lookup match: `DocumentationQuality` | info | `name=DocumentationQuality, type=interface, score=20.85` |
| src/integration/rag/graph-reranker.ts:358 | Element lookup match: `GraphReRanker.calculateCentrality` | info | `name=GraphReRanker.calculateCentrality, type=method, score=20.52` |
| src/analyzer/docs-analyzer.ts:285 | Element lookup match: `DocsAnalyzer.analyzeJSDocCoverage` | info | `name=DocsAnalyzer.analyzeJSDocCoverage, type=method, score=17.20` |
| src/integration/rag/__tests__/coverage-floor-gate.test.ts:38 | Element lookup match: `writeGraphJson` | info | `name=writeGraphJson, type=function, score=17.14` |
| (rag) | RAG hit: `?` score=0.03 | info | `Calculate node centrality (simplified PageRank)` |
| (rag) | RAG hit: `?` score=0.03 | info | `Lightweight centrality index derived from an ExportedGraph. The re-ranker
only needs (a) the count of dependents per tar` |
| (rag) | RAG hit: `?` score=0.03 | info | `? @ line ?` |
| (rag) | RAG hit: `?` score=0.02 | info | `Analyze JSDoc/TSDoc coverage across TypeScript/JavaScript files` |
| (rag) | RAG hit: `?` score=0.02 | info | `? @ line ?` |

### Graph risk (thorough) — surfaces, not verdicts

| Signal | Top surfaces |
|---|---|
| hotspots (fan-in+fan-out) | `@M/src/scanner/lru-cache.ts#LRUCache.has:114` (in 281/out 0); `@File/__tests__/indexer.test.ts` (in 0/out 197); `@Fn/src/scanner/scanner.ts#scanCurrentElements:908` (in 135/out 32); `@Fn/src/utils/path-normalize.ts#normalizeSlashes:21` (in 140/out 0); `@File/__tests__/pipeline/scip-overlay.test.ts` (in 0/out 122) |
| cycles (SCC>1) | count=0, largest=0 |
| edge resolution | external=318, builtin=13376, resolved=9619, typeOnly=287, unresolved=18069, dynamic=44, stale=1, ambiguous=1707 (of 43421 edges) |

## 4. Type/contract divergences

| Caller | Callee | Field | Observed shape | Notes |
|---|---|---|---|---|
| (no inbound callers observed) | CentralityIndex (src/integration/rag/graph-reranker.ts) | call/dependency edges | callers_in=0, transitive_dependents=0 | impact surface from graph walk — read the cited files before editing |
| (no inbound callers observed) | DocumentationQuality (src/analyzer/docs-analyzer.ts) | call/dependency edges | callers_in=0, transitive_dependents=14 | impact surface from graph walk — read the cited files before editing |
| (no inbound callers observed) | GraphReRanker.calculateCentrality (src/integration/rag/graph-reranker.ts) | call/dependency edges | callers_in=0, transitive_dependents=0 | impact surface from graph walk — read the cited files before editing |
| DocsAnalyzer.analyze (src/analyzer/docs-analyzer.ts) | DocsAnalyzer.analyzeJSDocCoverage (src/analyzer/docs-analyzer.ts) | call/dependency edges | callers_in=1, transitive_dependents=9 | impact surface from graph walk — read the cited files before editing |
| (no inbound callers observed) | writeGraphJson (src/integration/rag/__tests__/coverage-floor-gate.test.ts) | call/dependency edges | callers_in=0, transitive_dependents=0 | impact surface from graph walk — read the cited files before editing |

## 5. Recommendations with priority

| Rec ID | Priority | Action | Owner |
|---|---|---|---|
| REC-001 | low | Review 10 info-level hit(s) for context. | (operator) |

## 6. Reuse template note

This report follows the canonical `/discover` 6-section shape. Downstream tooling can grep for `## N.` markers to extract sections.

To reproduce this exact audit: `/discover "doc-to-graph wiring: documentation surfaces (resource sheets, foundation docs, docstrings, headers) attached to graph.json nodes, hotspot centrality ranking seeds doc coverage priority" --depth=thorough --output-dest=working:C:/Users/willh/Desktop/CODEREF/CODEREF-CORE/coderef/working/coderef-core/core-improvements-731/discovery-doc-graph-phase1.md`.

---

## 7. Agent addendum — docs-first phasing assessment (2026-08-01)

Deep reads: `coderef/resource-sheets/` (8 sheets) + `coderef/resources-sheets/` (typo twin, ~13 artifacts incl. .jsdoc.txt/.schema.json sidecars), `coderef/foundation-docs/` (8 scan-generated docs), `docs/` (~20 hand-authored) + `docs/standards/`, `src/query/docstrings.ts`, skeleton-map centrality ranking, resource-sheet frontmatter.

**Verdict: the docs-first phasing is RIGHT — endorse with a sharpened scope.**

Why docs before standards:
1. **The doc→code mapping already exists machine-readable.** Newer resource sheets carry `documents:` + `related_files:` frontmatter (e.g. scanner sheet → `src/scanner/scanner.ts`). Ingestion pass 1 is pure frontmatter parsing — zero inference. Standards docs have NO equivalent governs-mapping yet; someone must author that convention. Docs-first forces the frontmatter convention + ingestion machinery to exist before the harder "which standard governs which file" authoring question.
2. **Foundation docs are already scan-derived** (HOTSPOTS.md, EXPORTS.md etc. generated FROM the graph) — linking them back to nodes is mechanical.
3. **The coverage seed the operator wants is computable today:** skeleton map ranks 455 files by dependency centrality; only ~8 sheets exist. Top-centrality files WITHOUT a `documents` edge = the "document next" queue. This mirrors the existing ranker consumer (identify-targets --group) and the resource-sheet KIND taxonomy (kind.json v1.2.0) that grades sheets.
4. **Phase 2 reuses everything:** same node-kind template (@Endpoint precedent), same dual adjacency-index updates, same per-repo glob config — standards just swap edge kind (`governed_by` vs `documents`) and source dir (`docs/standards/`), plus the dependency-rules projection.

Findings that shape scope:
- **F1 (blocker-ish):** dual sheet homes — `resource-sheets/` vs `resources-sheets/` typo twin (STUB-BJNH79 / ECO-035). Resolve or ingest-both-with-WARN before the glob is locked.
- **F2:** frontmatter inconsistent — only 3 sheets across both dirs carry `documents:`; older sheets predate the taxonomy. P1 must include a normalization/backfill step (the resource-sheet KIND checker can grade it).
- **F3:** sheet CONTENT quality varies (generation-timed-out placeholders from LLOYD cpu-batch) — irrelevant to P1: ingestion depends only on frontmatter, and content search is RAG's job. **Graph gets structure only (nodes + edges); RAG keeps content.** Do not index doc text into the graph.
- **F4:** core has its own `docs/standards/` — confirms per-repo standards; the ASSISTANT fleet standards stay in ASSISTANT's own repo scan.
- **F5:** pipeline placement — doc ingestion must land in BOTH full-scan and `--incremental` paths (incremental-parity gotcha) and both adjacency indexes (canonical-graph + mcp/graph-tools).

Proposed phasing (supersedes the GX-005-first framing for sequencing purposes; GX-002 remains the program's next primary WO per PLAN.md Option A):
- **P1a — doc-node ingestion:** parse resource-sheet + foundation-doc frontmatter → `@Doc/<slug>` nodes + `documents` edges; repo-agnostic glob config; both adjacency indexes; both scan paths.
- **P1b — coverage surface:** doc-coverage projection (top-centrality files lacking `documents` edges) exposed via map/orient; pack_context lists a focus element's governing docs.
- **P2 — standards overlay:** `@Standard` nodes + `governed_by` edges from `docs/standards/` frontmatter convention; dependency-rules report cites governing standard ids (query-time `violates`, never persisted).

### 7.1 Operator directive (2026-08-01): explicit most-valuable-source ranking

Sheets are authored SCAFFOLD-THEN-REVIEW (ruling 2026-07-18, generate-resource-sheet v1.3.0+): Lloyd (free local Ollama via SmartRouter) drafts prose; projected sections (Public API / Dependencies) are machine-projected from .coderef with drift enforcement; prose must be reviewed before `status: draft` -> `approved`; the paid-model pass (`--opus-pass`) is DORMANT by operator ruling.

P1a MUST therefore carry source-quality onto `@Doc` nodes so agents always get the most valuable source explicitly:
- node fields: `status` (draft|approved from frontmatter), `placeholder_sections` (count of generation-timed-out blocks), `projected` vs `prose` section provenance.
- retrieval rank in pack_context: machine-projected facts (drift-enforced) > approved prose > draft prose; placeholder sections NEVER surfaced as authority.

### 7.2 Consolidation executed 2026-08-01 (STUB-BJNH79 closed)

Four sheet homes -> one. Typo twin (dashboard-legacy, wrong repo) archived to `coderef/ARCHIVED/resources-sheets-dashboard-legacy/` (f3918c6); 7 strays from `coderef/resource/` + `src/**` consolidated into `coderef/resource-sheets/` (020d7f5, now 15 sheets); scaffold source fixed (coderef-init v1.2.2, assistant aafb4dc31). Kind checker: location PASS; remaining FAILs = frontmatter-complete + required-sections on 7 legacy sheets -> the P1a backfill queue (regenerate via generate-resource-sheet scaffold-then-review).

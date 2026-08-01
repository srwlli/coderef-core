# /discover report — gaps in the plan in WO-DOCS-TO-GRAPH-P1-DOCS-PHASE-OF-THE-001: doc-ingest pipeline seam, graph surfaces, incremental parity, frontmatter contract

**Generated:** 2026-08-01T08:32:25Z
**Depth:** medium
**Output dest:** working:C:/Users/willh/Desktop/CODEREF/CODEREF-CORE/coderef/workorder/docs-to-graph-p1-docs-phase-of-the/discovery.md
**Dispatch:** none

## 1. Scope

What was asked: `gaps in the plan in WO-DOCS-TO-GRAPH-P1-DOCS-PHASE-OF-THE-001: doc-ingest pipeline seam, graph surfaces, incremental parity, frontmatter contract`.
What was bounded: unbounded — full project root.

## 2. Surfaces audited

- [tool: skeleton-map]          present (cached), 32 lines
- [tool: rg]                    queries=1, hits=0
- [tool: rag-search]            top-k=10, ms=1034, lane=hybrid, fallback_used=false
- [tool: element-lookup]        source=symbol-table (rag-search --lexical), candidates=10, elements_indexed=3190
- [tool: header-index]          defined=366, missing=5, stale=1, coverage=98.12% (validation-report.json)
- [tool: foundation-docs]       sections_matched=8
- [tool: codebase_summary]      elements=3190, top types: function=1092, method=965, interface=611, generated=2026-08-01T07:13:03.585Z
- [tool: validation_status]     resolution_rate=22.41%, unresolved=18249, ambiguous=1722, header_coverage=98.12%

### Orientation (skeleton map excerpt)

```
# repo map (skeleton): CODEREF-CORE — 472 files, 844 edges — budget ~400 tokens
# ranked by dependency centrality (most depended-on first); in/out = distinct dependents/dependencies. surfaces, not verdicts.

src/scanner/lru-cache.ts  (in 102 / out 1)
  class LRUCache
  interface ScanCacheEntry
  fn createScannerCache(maxSizeBytes)

src/pipeline/orchestrator.ts  (in 54 / out 14)
  class PipelineOrchestrator

src/utils/path-normalize.ts  (in 36 / out 0)
  fn normalizeSlashes(p)
  fn toRepoRelativePosix(file, projectPath)
```

## 3. Findings table

| Surface | Observation | Severity | Evidence |
|---|---|---|---|
| __tests__/pipeline/no-phase-8-docs-leak.test.ts:24 | Element lookup match: `FORBIDDEN_PHASE_8_FIELDS` | info | `name=FORBIDDEN_PHASE_8_FIELDS, type=constant, score=22.46` |
| __tests__/pipeline/no-phase-8-docs-leak.test.ts:35 | Element lookup match: `TYPE_FILES` | info | `name=TYPE_FILES, type=constant, score=21.23` |
| __tests__/pipeline/incremental-parity.test.ts:27 | Element lookup match: `makeProject` | info | `name=makeProject, type=function, score=20.71` |
| __tests__/pipeline/incremental-parity.test.ts:54 | Element lookup match: `fullEdgeSignature` | info | `name=fullEdgeSignature, type=function, score=20.06` |
| __tests__/pipeline/incremental-parity.test.ts:46 | Element lookup match: `resolvedEdgeSignature` | info | `name=resolvedEdgeSignature, type=function, score=20.06` |
| (rag) | RAG hit: `?` score=0.03 | info | `? @ line ?` |
| (rag) | RAG hit: `?` score=0.03 | info | `? @ line ?` |
| (rag) | RAG hit: `?` score=0.03 | info | `Assemble the full fact arrays from a (merged) fact set in its file order,
then run resolveImports → resolveCalls → const` |
| (rag) | RAG hit: `?` score=0.03 | info | `? @ line ?` |
| (rag) | RAG hit: `?` score=0.03 | info | `Exported graph structure.

WO-PIPELINE-GRAPH-CONSTRUCTION-001 / Phase 5: edges adopt the
8-field canonical schema (id, s` |

### Agent-added plan-gap findings (deep reads of the 9 touched files + on-disk frontmatter)

| Surface | Observation | Severity | Evidence |
|---|---|---|---|
| coderef/foundation-docs/API.md:1 | **GAP G1 — foundation docs have NO frontmatter.** Plan T1/T4 assume "foundation-doc frontmatter shapes (documents:, related_files:)" — all 8 foundation docs are plain markdown. Ingestion as-planned would silently produce zero foundation-doc nodes. | critical | `# API Reference` (no `---` block) |
| src/pipeline/graph-builder.ts:345-378 | **GAP G2 — file-grain nodes are minted ON-DEMAND, not universally.** `fileGrainNodeId` exists but file nodes are only emitted when an endpoint edge needs them. `documents` edges to arbitrary files must mint (and dedupe by id against endpoint-minted) file-grain nodes. Plan T5 doesn't state this. | warning | "several handler files may serve the same endpoint... both files need a node" |
| src/pipeline/output-validator.ts:438 | **GAP G3 — GI-3 no-dangling-resolved-edges invariant.** A sheet whose `documents:` target is not in the scan universe (deleted file, `scripts/` dir, typo) would emit a dangling resolved edge → validator fail-closes → graph.json unwritten. Ingestion needs an explicit missing-target policy (skip + counted skip-reason, never a dangling resolved edge). | critical | "GI-3: no dangling resolved edges (Phase 5 honest-demotion invariant)" |
| src/pipeline/orchestrator.ts:502-570 | **SEAM CONFIRMED (not a gap) — one shared chain.** Full run() and runIncremental() both resolve through `resolveFromMergedState` → `constructGraph(state)`. Doc facts entering state before that single seam get incremental parity by construction. But `constructGraph` is pure/sync — doc-ingest does filesystem IO, so it must run in BOTH callers (or the shared helper) BEFORE constructGraph, not inside it. Plan T4 says "orchestrator" without naming both call sites. | warning | "the EXACT chain run() uses. Factored so both the full and incremental paths resolve through" |
| coderef/resource-sheets/scanner-RESOURCE-SHEET.md:1-9 | **GAP G4 — legacy sheets missing `status:` (and one has `parent_project: lloyd`).** Ingestion must default missing status → `draft`; parent_project is irrelevant to ingestion (location = repo). SCRIPTS-RESOURCE-SHEET.md has NO frontmatter at all → skipped-with-count, not error. | warning | scanner frontmatter has no `status:`; SCRIPTS grep `status:` count = 0 |
| coderef/resource-sheets/{Setup-Coderef-Dir,orchestrator,scanner}-RESOURCE-SHEET.md | **CONFIRMED feasible — placeholder detection.** 3 legacy sheets contain placeholder/timed-out section markers in the body; `placeholder_sections` count for the evidence variant is derivable by body scan. | info | grep placeholder markers → 3 files |
| coderef/foundation-docs/API.md:5 | **Out-of-scope defect found: runaway `(auto-enhanced)` append** — "Last Updated" line carries ~47 repeated `(auto-enhanced)` suffixes (non-idempotent doc-enhancer append). Not this WO; recommend separate ticket. | warning | `**Last Updated:** 2026-08-01 (auto-enhanced) (auto-enhanced) ...` |
| coderef/workorder/gx-003-mirrored-rename-apply-scoped-source-write/plan.json | **Concurrency check vs GX-003 (live, other agent): ZERO file overlap** with this WO's touch set. Near-risk: they edit src/cli/mcp/{context-tools,server}.ts — we stay out of both; shared dist/ + .coderef/ rebuild state means T2/T8 metrics scans must be taken atomically and freshness-checked. | info | GX-003 touches: refactor/rename-*, cli/coderef-rename, mcp/context-tools+server, docs |
| plan.json P1-T10 | **Sequencing note superseded by operator instruction** (2026-08-01 "/discover ... remediate then execute please") — sheet batch + frontier review still in flight; safe because ranking contract is status-aware (draft < approved) and ingestion re-runs on every scan, so later status flips are picked up by the next scan without rework. | info | T10 note vs operator command in-session |

## 4. Type/contract divergences

Not applicable for depth=medium.

## 5. Recommendations with priority

| Rec ID | Priority | Action | Owner |
|---|---|---|---|
| REC-001 | high | Remediate T4: foundation docs ingest WITHOUT frontmatter — @Doc node per foundation doc (slug from filename, doc_type='foundation', no documents edges); sheets remain the edge-bearing class. | CODEREF-CORE |
| REC-002 | high | Remediate T4/T5: explicit missing-target policy — `documents:` targets outside the scan universe are skipped with a counted skip-reason (GI-3 safe); file-grain nodes minted on-demand via the SAME `fileGrainNodeId` helper, deduped against endpoint-minted nodes. | CODEREF-CORE |
| REC-003 | medium | Remediate T4: name BOTH doc-ingest call sites (run() + runIncremental(), before the shared resolveFromMergedState/constructGraph seam); doc-ingest is IO — keep constructGraph pure by passing doc facts through state. | CODEREF-CORE |
| REC-004 | medium | Remediate T4: legacy-frontmatter tolerances — missing status→'draft', frontmatter-less sheet→skip+count, parent_project ignored. | CODEREF-CORE |
| REC-005 | low | File a separate defect for the foundation-docs `(auto-enhanced)` runaway append (non-idempotent enhancer); NOT this WO. | CODEREF-CORE |

## 6. Reuse template note

This report follows the canonical `/discover` 6-section shape. Downstream tooling can grep for `## N.` markers to extract sections.

To reproduce this exact audit: `/discover "gaps in the plan in WO-DOCS-TO-GRAPH-P1-DOCS-PHASE-OF-THE-001: doc-ingest pipeline seam, graph surfaces, incremental parity, frontmatter contract" --depth=medium --output-dest=working:C:/Users/willh/Desktop/CODEREF/CODEREF-CORE/coderef/workorder/docs-to-graph-p1-docs-phase-of-the/discovery.md`.

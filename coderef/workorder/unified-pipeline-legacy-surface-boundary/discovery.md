# /discover report — unified-pipeline-legacy-surface-boundary

**Generated:** 2026-08-01T06:08:55Z
**Depth:** medium
**Output dest:** workorder:WO-UNIFIED-PIPELINE-LEGACY-SURFACE-BOUNDARY-001
**Dispatch:** none

## 1. Scope

What was asked: `unified-pipeline-legacy-surface-boundary`.
What was bounded: unbounded — full project root.

## 2. Surfaces audited

- [tool: skeleton-map]          present (cached), 158 lines
- [tool: rg]                    queries=1, hits=0
- [tool: rag-search]            top-k=10, ms=237, lane=lexical, fallback_used=false
- [tool: element-lookup]        source=symbol-table (rag-search --lexical), candidates=10, elements_indexed=3169
- [tool: header-index]          defined=369, missing=0, stale=0, coverage=100% (validation-report.json)
- [tool: foundation-docs]       sections_matched=8
- [tool: codebase_summary]      elements=3169, top types: function=1073, method=972, interface=611, generated=2026-08-01T01:54:11.554Z
- [tool: validation_status]     resolution_rate=22.32%, unresolved=18069, ambiguous=1707, header_coverage=100%

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
| __tests__/pipeline/graph-construction-legacy-builders.test.ts:36 | Element lookup match: `walk` | info | `name=walk, type=function, score=14.03` |
| __tests__/pipeline/graph-construction-legacy-builders.test.ts:11 | Element lookup match: `REPO_ROOT` | info | `name=REPO_ROOT, type=constant, score=13.59` |
| src/cli/bin-alias.ts:76 | Element lookup match: `warnIfLegacyBinName` | info | `name=warnIfLegacyBinName, type=function, score=11.88` |
| src/map/api-surface.ts:142 | Element lookup match: `computeApiSurface` | info | `name=computeApiSurface, type=function, score=9.81` |
| src/map/api-surface.ts:125 | Element lookup match: `ApiSurfaceOptions` | info | `name=ApiSurfaceOptions, type=interface, score=9.81` |
| __tests__/pipeline/graph-construction-legacy-builders.test.ts | RAG hit: `walk` score=14.03 | info | `function @ line 36` |
| __tests__/pipeline/graph-construction-legacy-builders.test.ts | RAG hit: `REPO_ROOT` score=13.59 | info | `constant @ line 11` |
| src/cli/bin-alias.ts | RAG hit: `warnIfLegacyBinName` score=11.88 | info | `function @ line 76` |
| src/map/api-surface.ts | RAG hit: `computeApiSurface` score=9.81 | info | `function @ line 142` |
| src/map/api-surface.ts | RAG hit: `ApiSurfaceOptions` score=9.81 | info | `interface @ line 125` |

## 4. Type/contract divergences

Not applicable for depth=medium.

## 5. Recommendations with priority

| Rec ID | Priority | Action | Owner |
|---|---|---|---|
| REC-001 | low | Review 10 info-level hit(s) for context. | (operator) |

## 6. Reuse template note

This report follows the canonical `/discover` 6-section shape. Downstream tooling can grep for `## N.` markers to extract sections.

To reproduce this exact audit: `/discover "unified-pipeline-legacy-surface-boundary" --depth=medium --output-dest=workorder:WO-UNIFIED-PIPELINE-LEGACY-SURFACE-BOUNDARY-001`.

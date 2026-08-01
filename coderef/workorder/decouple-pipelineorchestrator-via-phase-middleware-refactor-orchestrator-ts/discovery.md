# /discover report — decouple PipelineOrchestrator via phase middleware: orchestrator.ts sequential phase execution pipeline, extraction seams, runIncremental parity, middleware contract

**Generated:** 2026-08-01T12:08:35Z
**Depth:** thorough
**Output dest:** working:C:/Users/willh/Desktop/CODEREF/CODEREF-CORE/coderef/workorder/decouple-pipelineorchestrator-via-phase-middleware-refactor-orchestrator-ts/discovery.md
**Dispatch:** none

## 1. Scope

What was asked: `decouple PipelineOrchestrator via phase middleware: orchestrator.ts sequential phase execution pipeline, extraction seams, runIncremental parity, middleware contract`.
What was bounded: unbounded — full project root.

## 2. Surfaces audited

- [tool: skeleton-map]          present (cached), 31 lines
- [tool: rg]                    queries=1, hits=0
- [tool: rag-search]            top-k=10, ms=919, lane=hybrid, fallback_used=false
- [tool: element-lookup]        source=symbol-table (rag-search --lexical), candidates=10, elements_indexed=3246
- [tool: header-index]          defined=374, missing=5, stale=1, coverage=98.16% (validation-report.json)
- [tool: foundation-docs]       sections_matched=8
- [tool: codebase_summary]      elements=3246, top types: function=1133, method=966, interface=616, generated=2026-08-01T10:59:00.173Z
- [tool: validation_status]     resolution_rate=22.53%, unresolved=1674, ambiguous=1740, header_coverage=98.16%
- [tool: coderef-query]         walks=10, divergence_rows=5
- [tool: graph-risk]            hotspots_top=5, cycles=0 (largest=0), edges=45331

### Orientation (skeleton map excerpt)

```
# repo map (skeleton): CODEREF-CORE — 485 files, 871 edges — budget ~400 tokens
# ranked by dependency centrality (most depended-on first); in/out = distinct dependents/dependencies. surfaces, not verdicts.

src/scanner/lru-cache.ts  (in 105 / out 1)
  class LRUCache
  interface ScanCacheEntry
  fn createScannerCache(maxSizeBytes)

src/pipeline/orchestrator.ts  (in 58 / out 15)
  class PipelineOrchestrator

src/utils/path-normalize.ts  (in 37 / out 0)
  fn normalizeSlashes(p)
  fn toRepoRelativePosix(file, projectPath)
```

## 3. Findings table

| Surface | Observation | Severity | Evidence |
|---|---|---|---|
| src/pipeline/orchestrator.ts:450 | Element lookup match: `PipelineOrchestrator.runIncremental` | info | `name=PipelineOrchestrator.runIncremental, type=method, score=26.23` |
| __tests__/pipeline/incremental-parity.test.ts:27 | Element lookup match: `makeProject` | info | `name=makeProject, type=function, score=20.37` |
| __tests__/pipeline/incremental-parity.test.ts:54 | Element lookup match: `fullEdgeSignature` | info | `name=fullEdgeSignature, type=function, score=19.73` |
| __tests__/pipeline/incremental-parity.test.ts:46 | Element lookup match: `resolvedEdgeSignature` | info | `name=resolvedEdgeSignature, type=function, score=19.73` |
| src/pipeline/orchestrator.ts:97 | Element lookup match: `PipelineOrchestrator.run` | info | `name=PipelineOrchestrator.run, type=method, score=19.08` |
| (rag) | RAG hit: `?` score=0.03 | info | `Assemble the full fact arrays from a (merged) fact set in its file order,
then run resolveImports → resolveCalls → const` |
| (rag) | RAG hit: `?` score=0.03 | info | `Convenience function to run full pipeline` |
| (rag) | RAG hit: `?` score=0.03 | info | `Run the complete pipeline

@param projectPath Absolute path to project root
@param options Pipeline configuration option` |
| (rag) | RAG hit: `?` score=0.03 | info | `PipelineOrchestrator - Coordinate the entire analysis pipeline` |
| (rag) | RAG hit: `?` score=0.03 | info | `Graph-safe incremental populate (P5, ADJ-03). Re-scan ONLY `changedFiles`,
SWAP their fact bundles into the persisted fu` |

### Graph risk (thorough) — surfaces, not verdicts

| Signal | Top surfaces |
|---|---|
| hotspots (fan-in+fan-out) | `@M/src/scanner/lru-cache.ts#LRUCache.has:114` (in 312/out 0); `@File/__tests__/indexer.test.ts` (in 0/out 197); `@Fn/src/scanner/scanner.ts#scanCurrentElements:908` (in 133/out 32); `@Fn/src/utils/path-normalize.ts#normalizeSlashes:21` (in 153/out 0); `@File/__tests__/pipeline/scip-overlay.test.ts` (in 0/out 122) |
| cycles (SCC>1) | count=0, largest=0 |
| edge resolution | external=719, builtin=30719, resolved=10133, typeOnly=300, unresolved=1674, dynamic=45, stale=1, ambiguous=1740 (of 45331 edges) |

## 4. Type/contract divergences

| Caller | Callee | Field | Observed shape | Notes |
|---|---|---|---|---|
| runPopulate (src/cli/populate.ts) | PipelineOrchestrator.runIncremental (src/pipeline/orchestrator.ts) | call/dependency edges | callers_in=3, transitive_dependents=17 | impact surface from graph walk — read the cited files before editing |
| (no inbound callers observed) | makeProject (__tests__/pipeline/incremental-parity.test.ts) | call/dependency edges | callers_in=0, transitive_dependents=0 | impact surface from graph walk — read the cited files before editing |
| (no inbound callers observed) | fullEdgeSignature (__tests__/pipeline/incremental-parity.test.ts) | call/dependency edges | callers_in=0, transitive_dependents=0 | impact surface from graph walk — read the cited files before editing |
| (no inbound callers observed) | resolvedEdgeSignature (__tests__/pipeline/incremental-parity.test.ts) | call/dependency edges | callers_in=0, transitive_dependents=0 | impact surface from graph walk — read the cited files before editing |
| runPopulate (src/cli/populate.ts) | PipelineOrchestrator.run (src/pipeline/orchestrator.ts) | call/dependency edges | callers_in=60, transitive_dependents=92 | impact surface from graph walk — read the cited files before editing |

## 5. Recommendations with priority

| Rec ID | Priority | Action | Owner |
|---|---|---|---|
| REC-001 | low | Review 10 info-level hit(s) for context. | (operator) |

## 6. Reuse template note

This report follows the canonical `/discover` 6-section shape. Downstream tooling can grep for `## N.` markers to extract sections.

To reproduce this exact audit: `/discover "decouple PipelineOrchestrator via phase middleware: orchestrator.ts sequential phase execution pipeline, extraction seams, runIncremental parity, middleware contract" --depth=thorough --output-dest=working:C:/Users/willh/Desktop/CODEREF/CODEREF-CORE/coderef/workorder/decouple-pipelineorchestrator-via-phase-middleware-refactor-orchestrator-ts/discovery.md`.

---

## 7. Agent addendum — seam analysis + middleware design (thorough-depth deep read, 2026-08-01)

Deep reads: `src/pipeline/orchestrator.ts` (1,029 lines, full), incremental store helpers (`symbol-table-cache.ts` exports `canonicalFactKey`/`dedupeFactSet` per edge-resolution P4), `__tests__/pipeline/incremental-parity.test.ts` (fullEdgeSignature).

### The monolith, mapped

`run()` (97–433, 336 lines) is already a COMMENTED step sequence — the phases exist as prose, not as code:

| Step | Lines | Concern | Pure? |
|---|---|---|---|
| 1 | 112–119 | discoverFiles | IO |
| 1b | 121–154 | IncrementalCache load/filter (mtime-grain, IMP-CORE-028) | IO |
| 2 | 156–158 | preloadGrammars | IO |
| 3 | 160–236 | per-file scan loop -> 14 fact accumulators + factBundles | IO |
| 4 | 238–240 | buildGraph (legacy file-grain) | pure |
| 4.4 | 242–251 | collectDocFacts (repo-global, parity-by-reconstruction) | IO |
| 4.5 | 253–296 | resolveImports (pure fn over PipelineState) | pure |
| 4.6 | 298–321 | resolveCalls (pure fn) | pure |
| 4.7 | 323–350 | constructGraph + atomic Object.assign swap | pure |
| 4.8 | 352–372 | SCIP overlay (opt-in options.scipIndex) | pure |
| 5 | 387–395 | cache.updateCache/save | IO |
| 5.5 | 397–411 | persist fact set (guarded !incremental) | IO |
| 6 | 413–432 | assemble + return PipelineState | pure |

`runIncremental()` (450–547) composes: readFactSet -> storeKeyFor translation (P4 keying seam) -> rescan changed -> mergeChangedFacts -> **`assembleAndResolve()` (555–638), which DUPLICATES steps 4/4.4/4.5/4.6/4.7 verbatim** (601–628). That helper exists precisely because the resolve tail is shared — it is the middleware contract waiting to be named.

### Design: sequential phase pipeline

- `PipelineContext`: the mutable accumulator both paths already build by hand (the 14 fact arrays + factBundles/fileOrder + graph + options + metadata). PipelineState remains the RETURN shape — public surface unchanged.
- `PipelinePhase = { name: string; run(ctx: PipelineContext): Promise<void> | void }` — sequential executor, no branching framework, no event bus. Ordering stays explicit in a phase-list literal per path.
- `run()` = executor over [discover, cacheFilter, preloadGrammars, scanFiles, legacyGraph, collectDocs, resolveImportsPhase, resolveCallsPhase, constructGraphPhase, scipOverlay, persistCache, persistFactSet].
- `runIncremental()` = [loadStore, rescanChanged, mergeFacts, assembleFacts, legacyGraph, collectDocs, resolveImportsPhase, resolveCallsPhase, constructGraphPhase, scipOverlay, persistFactSet] — the tail phases are the SAME objects, deleting the assembleAndResolve duplication.

### Constraints (non-negotiable)

1. **Zero behavior change per phase-commit; byte-identical graph.json** — proof = `all_edge_ids_sha256` + `resolved_edge_ids_sha256` full-rebuild fingerprint before/after (the exact instrument edge-resolution P4 built) + suite 2532/26.
2. **Public surface frozen**: class name, `run()`/`runIncremental()` signatures, `PipelineState` shape. 54 in-repo dependents (in=54/out=15) see nothing.
3. **Pass-purity is load-bearing**: resolveImports/resolveCalls/constructGraph are pure functions whose pass-1-before-pass-2 discipline (export tables/symbol table complete before ANY resolution) must survive relocation verbatim.
4. **P4 keying seam untouched**: storeKeyFor/canonicalFactKey logic moves as a unit or not at all (STUB-QPAAY0 regression class).
5. **Incremental parity invariant**: full-vs-incremental sha256 identity re-proven at the end (the P4 E2E proof re-run).

### Why this precedes WO-CROSS-REPO-WORKSPACE-LINKAGE-001 (operator ruling A, 2026-08-01)

The cross-repo feature injects a workspace-resolution pass into import resolution. On the phase pipeline it is one phase-list insertion with an explicit seam; on the monolith it is another hardwired block. Sequencing: this WO first, cross-repo lands on the new seam.

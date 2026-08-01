# /discover report — cross-repo workspace linkage: workspace registry file package-name to project-root, import-resolver external edge upgrade, impact_of workspace opt-in, sibling-repo fixture

**Generated:** 2026-08-01T12:10:53Z
**Depth:** thorough
**Output dest:** working:C:/Users/willh/Desktop/CODEREF/CODEREF-CORE/coderef/workorder/cross-repo-workspace-linkage/discovery.md
**Dispatch:** none

## 1. Scope

What was asked: `cross-repo workspace linkage: workspace registry file package-name to project-root, import-resolver external edge upgrade, impact_of workspace opt-in, sibling-repo fixture`.
What was bounded: unbounded — full project root.

## 2. Surfaces audited

- [tool: skeleton-map]          present (cached), 31 lines
- [tool: rg]                    queries=1, hits=0
- [tool: rag-search]            top-k=10, ms=930, lane=hybrid, fallback_used=false
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
| src/pipeline/import-resolver.ts:777 | Element lookup match: `extractPackageName` | info | `name=extractPackageName, type=function, score=29.26` |
| src/pipeline/import-resolver.ts:167 | Element lookup match: `PROJECT_FILE_KEY_SEP` | info | `name=PROJECT_FILE_KEY_SEP, type=constant, score=23.96` |
| src/pipeline/import-resolver.ts:927 | Element lookup match: `loadExternalSet` | info | `name=loadExternalSet, type=function, score=23.77` |
| src/pipeline/import-resolver.ts:671 | Element lookup match: `indexElementsByFileAndLocalName` | info | `name=indexElementsByFileAndLocalName, type=function, score=23.02` |
| __tests__/map/edge-evidence.test.ts:25 | Element lookup match: `REPO_ROOT` | info | `name=REPO_ROOT, type=constant, score=21.63` |
| (rag) | RAG hit: `?` score=0.03 | info | `Read package.json once; collect every package name from
dependencies/devDependencies/peerDependencies/optionalDependenci` |
| (rag) | RAG hit: `?` score=0.03 | info | `? @ line ?` |
| (rag) | RAG hit: `?` score=0.03 | info | `Resolve import path to project file
Handles relative paths, absolute paths, and module names

@param source Import sourc` |
| (rag) | RAG hit: `?` score=0.03 | info | `? @ line ?` |
| (rag) | RAG hit: `?` score=0.03 | info | `Given a probe key that hit projectFiles, return the canonical (non-POSIX)
file key — the key the rest of the pipeline us` |

### Graph risk (thorough) — surfaces, not verdicts

| Signal | Top surfaces |
|---|---|
| hotspots (fan-in+fan-out) | `@M/src/scanner/lru-cache.ts#LRUCache.has:114` (in 312/out 0); `@File/__tests__/indexer.test.ts` (in 0/out 197); `@Fn/src/scanner/scanner.ts#scanCurrentElements:908` (in 133/out 32); `@Fn/src/utils/path-normalize.ts#normalizeSlashes:21` (in 153/out 0); `@File/__tests__/pipeline/scip-overlay.test.ts` (in 0/out 122) |
| cycles (SCC>1) | count=0, largest=0 |
| edge resolution | external=719, builtin=30719, resolved=10133, typeOnly=300, unresolved=1674, dynamic=45, stale=1, ambiguous=1740 (of 45331 edges) |

## 4. Type/contract divergences

| Caller | Callee | Field | Observed shape | Notes |
|---|---|---|---|---|
| classifyBareSpecifier (src/pipeline/import-resolver.ts) | extractPackageName (src/pipeline/import-resolver.ts) | call/dependency edges | callers_in=1, transitive_dependents=86 | impact surface from graph walk — read the cited files before editing |
| (no inbound callers observed) | PROJECT_FILE_KEY_SEP (src/pipeline/import-resolver.ts) | call/dependency edges | callers_in=0, transitive_dependents=0 | impact surface from graph walk — read the cited files before editing |
| resolveImports (src/pipeline/import-resolver.ts) | loadExternalSet (src/pipeline/import-resolver.ts) | call/dependency edges | callers_in=3, transitive_dependents=92 | impact surface from graph walk — read the cited files before editing |
| buildExportTables (src/pipeline/import-resolver.ts) | indexElementsByFileAndLocalName (src/pipeline/import-resolver.ts) | call/dependency edges | callers_in=1, transitive_dependents=86 | impact surface from graph walk — read the cited files before editing |
| (no inbound callers observed) | REPO_ROOT (__tests__/map/edge-evidence.test.ts) | call/dependency edges | callers_in=0, transitive_dependents=0 | impact surface from graph walk — read the cited files before editing |

## 5. Recommendations with priority

| Rec ID | Priority | Action | Owner |
|---|---|---|---|
| REC-001 | low | Review 10 info-level hit(s) for context. | (operator) |

## 6. Reuse template note

This report follows the canonical `/discover` 6-section shape. Downstream tooling can grep for `## N.` markers to extract sections.

To reproduce this exact audit: `/discover "cross-repo workspace linkage: workspace registry file package-name to project-root, import-resolver external edge upgrade, impact_of workspace opt-in, sibling-repo fixture" --depth=thorough --output-dest=working:C:/Users/willh/Desktop/CODEREF/CODEREF-CORE/coderef/workorder/cross-repo-workspace-linkage/discovery.md`.

---

## 7. Agent addendum — design resolution (thorough-depth deep read, 2026-08-01)

Deep reads: `src/pipeline/import-resolver.ts` (977 lines: kind taxonomy 58-79, `classifyBareSpecifier` 312-318, `loadExternalSet` 927-967), orchestrator seam analysis (predecessor WO's discovery.md section 7).

### How external edges die today

`loadExternalSet` (pass 1, single fs read: package.json dep fields + node_modules listing) feeds `classifyBareSpecifier`: bare specifier -> package name -> in set = `kind:'external'` (terminal, no target), else `'unresolved'`. A sibling workspace repo (`@coderef/core` imported from ASSISTANT) is indistinguishable from npm's `lodash` — the edge dead-ends at the package name.

### Design (resolves the P12 deferral blockers)

1. **Workspace registry = repo-local `.coderef/workspace.json`** — `{version, packages: {"<pkg-name>": "<project-root>"}}`, roots relative to the file or absolute. Repo-agnostic (layers.json precedent: core bundles NO environment layout); ABSENT file = zero behavior change, byte-identical graph — no-regress by construction, which retires the P12 "no-regress unprovable vs 8,497 edges" blocker for the default path.
2. **Pass-2 purity preserved** (the other P12 blocker): the registry loads in pass 1 alongside `loadExternalSet` — a fs input load, exactly like package.json/tsconfig today. Pass 2 stays a pure lookup.
3. **NO new ImportResolutionKind, NO new edge kind (v1).** A workspace hit keeps `kind:'external'` and gains optional fields (`workspacePackage`, `workspaceRoot`) carried onto edge metadata. This sidesteps the AC-01 exhaustive-enumeration churn AND the dual adjacency-index trap (canonical-graph + mcp/graph-tools) entirely — nothing new to teach the indexes.
4. **`impact_of workspace:true` = query-time stitching.** With the opt-in flag, impact_of loads sibling `.coderef/graph.json` for each workspace root and continues traversal through workspace-tagged external edges into sibling nodes. No persisted cross-repo edges (same persisted-fact vs query-time-projection split the GX-005 governed_by/violates ruling locked). CLI + MCP mirrored per ecosystem norm; MCP leg needs `project_root` as ever.
5. **Sibling fixture**: `__tests__/fixtures/workspace-pair/` — two mini packages, A imports B by package name; contract tests prove (a) no-registry = unchanged classification, (b) registry = tagged external edges, (c) impact_of stitches across, (d) out-of-workspace bare specifiers untouched.

### Sequencing

Executes AFTER WO-DECOUPLE-PIPELINEORCHESTRATOR-... (operator ruling A, 2026-08-01). The feature's write side lives inside resolveImports pass 1 (not a new orchestrator phase), but it lands on a freshly parity-proven, decomposed pipeline whose fingerprint instrument this WO reuses for its own no-regress proof.

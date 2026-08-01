# /discover report — GX-005 standards-to-code rule-graph: StandardNode governed_by violates edges in graph.json via src/indexer and src/export/graph-exporter.ts, surfaced through pack_context and dependency_rules

**Generated:** 2026-08-01T06:08:51Z
**Depth:** thorough
**Output dest:** working:C:/Users/willh/Desktop/CODEREF/CODEREF-CORE/coderef/working/coderef-core/core-improvements-731/discovery-gx-005.md
**Dispatch:** none

## 1. Scope

What was asked: `GX-005 standards-to-code rule-graph: StandardNode governed_by violates edges in graph.json via src/indexer and src/export/graph-exporter.ts, surfaced through pack_context and dependency_rules`.
What was bounded: unbounded — full project root.

## 2. Surfaces audited

- [tool: skeleton-map]          present (cached), 158 lines
- [tool: rg]                    queries=1, hits=0
- [tool: rag-search]            top-k=10, ms=797, lane=hybrid, fallback_used=false
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
| src/export/graph-exporter.ts:194 | Element lookup match: `GraphExporter.exportAsJSON` | info | `name=GraphExporter.exportAsJSON, type=method, score=28.38` |
| src/query/dependency-rules.ts:76 | Element lookup match: `DependencyRuleResult` | info | `name=DependencyRuleResult, type=interface, score=27.70` |
| src/query/dependency-rules.ts:228 | Element lookup match: `ruleKey` | info | `name=ruleKey, type=function, score=27.04` |
| src/query/dependency-rules.ts:43 | Element lookup match: `RulePair` | info | `name=RulePair, type=interface, score=27.04` |
| src/query/dependency-rules.ts:73 | Element lookup match: `RuleStatus` | info | `name=RuleStatus, type=type, score=27.04` |
| (rag) | RAG hit: `?` score=0.03 | info | `Phase 5 canonical edge relationship (re-exported from
src/pipeline/graph-builder.ts via type-only import to avoid a
circ` |
| (rag) | RAG hit: `?` score=0.03 | info | `Graph Exporter - Serialize dependency graph to multiple formats
Phase 5, Task P5-T5: Graph Export (JSON, Protobuf for vi` |
| (rag) | RAG hit: `?` score=0.03 | info | `? @ line ?` |
| (rag) | RAG hit: `?` score=0.03 | info | `Export graph as JSON` |
| (rag) | RAG hit: `?` score=0.03 | info | `Export format options` |

### Graph risk (thorough) — surfaces, not verdicts

| Signal | Top surfaces |
|---|---|
| hotspots (fan-in+fan-out) | `@M/src/scanner/lru-cache.ts#LRUCache.has:114` (in 281/out 0); `@File/__tests__/indexer.test.ts` (in 0/out 197); `@Fn/src/scanner/scanner.ts#scanCurrentElements:908` (in 135/out 32); `@Fn/src/utils/path-normalize.ts#normalizeSlashes:21` (in 140/out 0); `@File/__tests__/pipeline/scip-overlay.test.ts` (in 0/out 122) |
| cycles (SCC>1) | count=0, largest=0 |
| edge resolution | external=318, builtin=13376, resolved=9619, typeOnly=287, unresolved=18069, dynamic=44, stale=1, ambiguous=1707 (of 43421 edges) |

## 4. Type/contract divergences

| Caller | Callee | Field | Observed shape | Notes |
|---|---|---|---|---|
| GraphExporter.export (src/export/graph-exporter.ts) | GraphExporter.exportAsJSON (src/export/graph-exporter.ts) | call/dependency edges | callers_in=1, transitive_dependents=1 | impact surface from graph walk — read the cited files before editing |
| (no inbound callers observed) | DependencyRuleResult (src/query/dependency-rules.ts) | call/dependency edges | callers_in=0, transitive_dependents=0 | impact surface from graph walk — read the cited files before editing |
| checkDependencyRules (src/query/dependency-rules.ts) | ruleKey (src/query/dependency-rules.ts) | call/dependency edges | callers_in=1, transitive_dependents=13 | impact surface from graph walk — read the cited files before editing |
| (no inbound callers observed) | RulePair (src/query/dependency-rules.ts) | call/dependency edges | callers_in=0, transitive_dependents=0 | impact surface from graph walk — read the cited files before editing |
| (no inbound callers observed) | RuleStatus (src/query/dependency-rules.ts) | call/dependency edges | callers_in=0, transitive_dependents=0 | impact surface from graph walk — read the cited files before editing |

## 5. Recommendations with priority

| Rec ID | Priority | Action | Owner |
|---|---|---|---|
| REC-001 | low | Review 10 info-level hit(s) for context. | (operator) |

## 6. Reuse template note

This report follows the canonical `/discover` 6-section shape. Downstream tooling can grep for `## N.` markers to extract sections.

To reproduce this exact audit: `/discover "GX-005 standards-to-code rule-graph: StandardNode governed_by violates edges in graph.json via src/indexer and src/export/graph-exporter.ts, surfaced through pack_context and dependency_rules" --depth=thorough --output-dest=working:C:/Users/willh/Desktop/CODEREF/CODEREF-CORE/coderef/working/coderef-core/core-improvements-731/discovery-gx-005.md`.

---

## 7. Agent addendum — integration assessment (thorough-depth deep read, 2026-08-01)

Deep reads performed: `src/pipeline/graph-builder.ts` (EdgeRelationship union, EdgeEvidence, @Endpoint node precedent), `src/query/dependency-rules.ts` (full contract header + types), `src/context/context-packer.ts` (canonical-graph + ego-graph composition), `src/query/canonical-graph.ts` / `src/cli/mcp/graph-tools.ts` (dual adjacency indexes).

**Verdict: YES — integrate into core, but split the edge model.**

1. **Architectural precedent is already shipped.** WO-API-SURFACE-MAPPING P2 made `@Endpoint/<path>#<METHOD>` a first-class NON-CODE node with two new edge kinds (`calls_endpoint`/`serves_endpoint`), touching exactly 8 files (graph-builder, graph-exporter, canonical-graph, mcp/graph-tools, mcp shared, mcp server, map/api-surface, output-validator). `@Standard/<doc-or-rule-id>` + `governed_by` is the same template — proven shape, bounded blast radius.
2. **`governed_by` fits graph.json; `violates` does NOT (as persisted edges).** graph.json stores OBSERVED static facts. `governed_by` (this standard governs that file/layer) is declarative and stable — belongs in the graph. `violates` is a DERIVED, time-varying check result; `dependency-rules.ts` is deliberately PURE ("surfaces, not verdicts", deterministic, no persisted verdicts) and already computes violated/satisfied/not_applicable on demand. Persisting `violates` edges would bake check-results into the observation store and drift the moment code or rules change. Recommend: `violates` stays a QUERY-TIME projection — extend the dependency-rules report to cite governing `@Standard` node ids.
3. **Existing hooks reduce the build.** `metadata.layer` already flows headers→graph nodes (graph-builder.ts:328); `.coderef/rules.json` is the existing declared-constraint surface; pack_context composes over the canonical graph so `governed_by` neighbors surface with zero packer changes beyond an edge-kind filter.
4. **Repo-agnostic constraint (MUST).** Core has no bundled standards (docs/standards/, SKILLS/STANDARDS/ live in the sibling ASSISTANT repo; cf. layers.json precedent). The StandardNode source must be a generic per-repo input (configurable glob / frontmatter-tagged markdown / `.coderef/standards.json`), never a hardcoded ASSISTANT layout.
5. **Known trap:** BOTH adjacency indexes (canonical-graph + mcp/graph-tools) must learn any new edge kind, or MCP walks silently miss it.
6. **Sequencing:** PLAN.md's standing ruling is Option A — GX-002 (scope-stack receiver inference) first. GX-005 slots after, as its own phased WO: P1 standards scanner → StandardNodes + governed_by; P2 surface via pack_context/symbol_context + map; P3 violates projection wiring dependency-rules to standard ids.

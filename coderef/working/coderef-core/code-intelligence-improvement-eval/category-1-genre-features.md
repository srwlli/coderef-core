# Category 1 — coderef-core vs the Code-Intelligence Genre

> Provenance: research subagent sweep, 2026-07-18 (read-only; ground-truthed against src/, package.json, git log, and prior discovery artifacts). Consumers: this is a planning input — surfaces and recommendations, not rulings.

## A. Current surface snapshot

coderef-core (`@coderef/CODEREF-CORE` v2.0.0) is a local-first, any-repo code-intelligence substrate: a 9-phase deterministic pipeline (discovery → scanner → raw facts → semantic-header parse → import resolution → call resolution → graph construction → validation chokepoint → RAG) emitting `.coderef/` artifacts (index.json, graph.json with 8-field edges + confidence tiers, routes.json, validation-report.json, manifest.json staleness hash-manifest, map/data.json + graph.html + skeleton.md, rag-index.json + embed cache), consumed by 19 CLI bins and a repo-agnostic 26-tool MCP stdio server. Python is tree-sitter AST (~99%); TS/JS/Go/Rust/Java/C#/PHP are regex (~80-90%). Embeddings are Ollama-local by default; search is lexical-first (BM25 symbol lane) with embedding fallback.

- **CLI bins (19), grouped**: pipeline/scan (`coderef-scan`, `populate-coderef`, `coderef-pipeline`, `coderef-watch`, `coderef-detect-languages`); RAG (`rag-index`, `rag-search`, `rag-status`, `rag-eval`, `coderef-rag-server`); query/analysis (`coderef-query`, `coderef-analyze`, `coderef-map`, `coderef-pack`, `coderef-rename`); routes (`scan-frontend-calls`, `validate-routes`); semantic (`coderef-semantic-integration`); MCP (`coderef-mcp-server`).
- **26 MCP tools** (verified via `registerTool(` grep in `src/cli/coderef-mcp-server.ts`): what_calls, what_imports, impact_of, find_element, codebase_summary, validation_status, hotspots, cycles, map, map_metrics_delta, what_exports, diff_impact, rag_search, what_this_calls, what_this_imports, what_this_depends_on, path_between, unresolved_edges, source_of, find_all_references, symbol_context, pack_context, rename_preview, rag_status, reindex, rag_index.
- **src/ module families**: adapter, analyzer, cache, cli, config, context (packer + complexity-scorer), export, fileGeneration, generator, indexer, integration (rag + llm), map (skeleton-map, git-history, git-behavioral, graph-analytics, engineering-metrics, layer-drift, metrics-delta), parser, pipeline (call-resolver, edge-confidence, field-index, staleness-manifest), query (canonical-graph, ego-graph, symbol-context, staleness-check), refactor (rename-planner/applier), registry, scanner, search, semantic, validator.
- **Culture constraints**: surfaces-not-verdicts, absence=no-data, deterministic outputs, additive schemas, Ollama-local-only, `project_root` required per MCP call.

## B. Already-covered ledger (EXCLUDED from recommendations)

**The entire 11-phase agentic-coding-intelligence-program is shipped** (verified: P8 `2c05405`, P9 `25e5930`, P10 `4b211be`, P11 `b1b9ba2`, docs-sync `40e6d4f`; all named modules exist on disk):

- **P1 skeleton-map** — token-budgeted centrality-ranked plaintext repo map (aider repo-map pattern); `src/map/skeleton-map.ts`, `coderef-map --skeleton`
- **P2 git-behavioral-substrate** — churn×size hotspots + change-coupling from one git-log extraction layer (CodeScene pattern); `src/map/git-history.ts` + `git-behavioral.ts`
- **P3 edge-confidence-tiers** — exact/strong/heuristic/inferred provenance on every edge + `--min-confidence` (SCIP/Glean pattern); `src/pipeline/edge-confidence.ts`
- **P4 ego-graph-retrieval** — rag_search/pack_context expand 1-hop through the graph as signatures (RepoGraph/CodexGraph pattern); `src/query/ego-graph.ts`
- **P5 rag-indexing-throughput-fix** — bounded embed concurrency + content-addressed chunk-grain embedding cache (Cursor Merkle pattern); `src/integration/rag/embedding-cache.ts`
- **P6 mcp-response-format-pagination** — shared concise|detailed axis + offset pagination; `src/cli/mcp-response-format.ts`
- **P7 symbol-context-tool** — one card per symbol: identity/header/neighborhood/references/test-linkage/staleness (Serena pattern); `src/query/symbol-context.ts`
- **P8 staleness-contract** — always-written SHA-256 manifest + stale-count on MCP responses; `src/pipeline/staleness-manifest.ts`, `src/query/staleness-check.ts`
- **P9 lexical-first-search-router** — symbol-shaped queries answered from BM25/symbol-table, zero Ollama dependency, lane provenance; `src/integration/rag/search-router.ts`
- **P10 field-based-acg-resolution** — Feldthaus ACG property-definition index over receiver_not_in_symbol_table, never-exact tiering; `src/pipeline/field-index.ts`
- **P11 map-metrics-delta-tool** — decomposed per-family before/after diff, never a composite score; `src/map/metrics-delta.ts`, MCP `map_metrics_delta`

Also already extracted by earlier genre WOs (excluded): BM25 hybrid fusion + graph reranker, provisional-confidence resolution, hotspot demo-exclusion, resolution_rate honesty fields, incremental/watch indexing, rename preview/apply (`src/refactor/`), pack_context compression (Repomix pattern), blast-radius parity validation, CLI/MCP parity, repo-agnostic MCP.

## C. Genre capability matrix

| Genre leader | Signature capability | coderef-core status | Evidence |
|---|---|---|---|
| Sourcegraph SCIP | Compiler-precise occurrence indexing | MISSING | TS/JS = regex ~85-90%; "SCIP" appears only in `src/pipeline/edge-confidence.ts` doc-comments; no SCIP emit/ingest |
| Sourcegraph batch changes / Moderne OpenRewrite | Mass multi-file codemods / recipes | MISSING (rename only) | `src/refactor/rename-planner.ts` + `rename-applier.ts` are the only mutation path |
| Sourcegraph code insights | Metric time-series dashboards | PARTIAL (deliberate) | P11 does before/after snapshots, no time-series persistence |
| CodeQL | Dataflow/taint queries, QL language | MISSING (deliberate) | Genre mismatch — see anti-recs |
| stack-graphs (GitHub) | Deterministic scope-stack name resolution | PARTIAL | P10 field-based ACG is the confidence-tiered approximation |
| Glean / Kythe | Cross-repo fact store, cross-repo xrefs | PARTIAL | Repo-agnostic MCP but zero cross-repo edges — each `.coderef/` is an island |
| LSP/LSIF | Call AND type hierarchy | PARTIAL | Call hierarchy rich; type hierarchy ABSENT — zero `implements` emission in `src/pipeline/graph-builder.ts`; the edge type exists unused in `src/export/graph-exporter.ts:24` |
| tree-sitter / ast-grep | Structural AST pattern search | MISSING | tree-sitter + 7 grammars already in package.json but used only for Python scanning; `src/search/search-engine.ts` is name/tag search |
| Semgrep | Multi-language lint rule engine | MISSING (deliberate) | Structural search is the extractable half |
| Zoekt / livegrep | Trigram full-text code search | MISSING (deliberate) | P9 BM25 symbol lane instead; agents carry ripgrep |
| Aider repo-map | PageRank-ranked token-budgeted map | HAVE | P1 `src/map/skeleton-map.ts` |
| Cursor / Windsurf / Claude Code | Merkle-incremental embedding index | HAVE | P5 embedding-cache; `coderef-watch` |
| Greptile / Bloop | LLM code-graph Q&A | PARTIAL (deliberate) | RAG + ego-graph shipped; no LLM answer synthesis — the consumer IS the agent |
| CodeScene | Change coupling + hotspots | HAVE | P2 `src/map/git-behavioral.ts` |
| CodeScene | Knowledge/ownership maps, bus factor | MISSING | `src/map/git-history.ts` captures numstat only — no `%an` author field |
| CodeScene | Verified refactor delta | HAVE | P11 `map_metrics_delta` |
| Understand / NDepend | AST-accurate code metrics | PARTIAL | `src/context/complexity-scorer.ts` heuristic; `coderef/workorder/ast-based-complexity-calculation/` contains only context.json (never executed) |
| NDepend / Structure101 / dependency-cruiser | Declared dependency rules / architecture gates | MISSING | `src/map/layer-drift.ts` surfaces drift but no allowed-imports rule file or enforcement |
| NDepend / cargo-semver-checks / API Extractor | Public-API breaking-change diff | MISSING (stubbed) | `src/cli/coderef-analyze.ts:277` — `--type=breaking-changes` exits "NOT IMPLEMENTED"; `--from/--to` flags already declared |
| Meta predictive test selection / Bazel TIA | Diff → which-tests-to-run | MISSING | Test-linkage exists per-symbol (P7) and per-repo; no diff→tests projection; `diff_impact` returns elements, not tests |
| jscpd / PMD CPD | Clone/duplication detection | MISSING | No duplication module in src/ |
| Sourcetrail | Interactive graph UX | HAVE | `.coderef/map/graph.html` + `--serve` |
| (coderef differentiator) | Frontend-call ↔ route contract validation | HAVE (rare in genre) | `validate-routes`, `scan-frontend-calls`, `src/validator/` |

## D. NEW feature recommendations (ranked by leverage for agent effectiveness)

1. **`tests_for_change` — diff-to-test-selection tool** — precedent: Meta predictive test selection, Bazel TIA, Launchable. Closes the agent verify-loop: after an edit, one call returns the ranked test set transitively linked to changed elements (run 6 tests, not 1900). Pure join of the existing `diff_impact` traversal (`src/cli/coderef-mcp-server.ts:1297`) × the `isTestFile` detector + test-linkage edges in `src/map/engineering-metrics.ts` / `src/query/symbol-context.ts`; tool #27 or `tests_only:true` on `diff_impact`. Effort **S**. Not covered: P7 test_linkage is a display facet; P11 diffs metric families — neither projects a git diff onto a runnable test set.
2. **`ast_search` — structural AST pattern search** — precedent: ast-grep, Semgrep structural, Sourcegraph structural. Syntax-aware queries ripgrep can't express ("await inside loop", "empty catch"), zero false positives, hits return codeRefId so they join the graph tools. tree-sitter + grammars are ALREADY deps; new `src/search/ast-search.ts` using tree-sitter S-expression queries (no new pattern language); MCP tool + CLI mirror. Effort **M**. Not covered: P9's lexical lane matches identifiers, not syntax shapes.
3. **SCIP ingestion adapter — compiler-precise TS/JS edges at the `exact` tier** — precedent: Sourcegraph scip-typescript, LSIF, Glean indexers. Replaces the 85-90% regex ceiling for the dominant language with compiler truth; occurrences merge into graph.json as exact-tier edges, regex/ACG remains elsewhere. Every downstream tool instantly gains trustworthy TS edges — the biggest graph-trust upgrade remaining. Lands in `src/adapter/` (currently code-empty), new `scip-import.ts`; `protobufjs` already a dep; merge in `src/pipeline/graph-builder.ts` with P3 tiering; opt-in populate flag. Effort **L**. Not covered: P10 is the heuristic, explicitly never-exact complement.
4. **Type-hierarchy edges + `type_hierarchy` tool (extends/implements/overrides)** — precedent: LSP typeHierarchy, Understand, Kythe. Today `impact_of` follows only import/call edges, so subclass/override blast radius is invisible. Extractors in `src/pipeline/extractors/` raw-facts pass, new edge kind through `graph-builder.ts` (the `'implements'` type exists unused), surface via new tool + `symbol_context` card. Effort **M**. Not covered: no phase touched inheritance; verified zero implements emission.
5. **Implement the stubbed `breaking-changes` analysis — public-API snapshot + diff** — precedent: NDepend API diff, cargo-semver-checks, API Extractor. "Did my edit change the exported contract" between a git ref and worktree; the pre-commit safety check `what_exports` (point-in-time list) cannot give. CLI type + `--from/--to` + stub ALREADY exist at `src/cli/coderef-analyze.ts:272-277`; back with a pure exports-manifest differ (P11 `metrics-delta.ts` is the diff-shape precedent) + `api_diff` MCP tool. Effort **M**.
6. **Dependency-rules gate — operator-declared architecture constraints** — precedent: dependency-cruiser, Structure101, ArchUnit. `.coderef/rules.json` ("src/pipeline may not depend on src/cli") checked against graph.json so agents learn violations BEFORE commit. Verdict-by-declared-contract, same legitimacy model as `validate-routes --fail-on-critical`. Rides `src/map/layer-drift.ts` + layers.json taxonomy; new pure checker + `validation_status` field + CI exit code. Effort **M**.
7. **Ownership/knowledge block — author distribution, bus factor, last-touched** — precedent: CodeScene knowledge maps, CODEOWNERS. Per-file author-concentration + abandonment as a map block: "one author, untouched 14 months" changes how boldly an agent refactors. Add `%an` capture to `src/map/git-history.ts` (verified absent), pure analytics in `git-behavioral.ts`, additive MapData block behind `--git`. Effort **S** (impurity boundary + degradation matrix already built).
8. **Cross-repo workspace linkage** — precedent: Glean, Kythe, Sourcegraph multi-repo. Resolve package-name imports (`@coderef/core`) to a registered sibling repo's export surface → cross-repo impact ("this core change breaks these ASSISTANT call sites") — the actual shape of this two-repo ecosystem. Workspace registry file (package name → project root); hook in `src/pipeline/import-resolver.ts` upgrading `external` edges; `impact_of` gains opt-in `workspace:true`. Effort **L**. Not covered: README v3.0.0 "multi-repo" is an unshipped aspiration bullet.
9. **Duplication/clone surface block** — precedent: jscpd, PMD CPD, CodeScene. Token-window clone sets as a map block; fixing a bug in 1 of N copies is a classic silent failure — "this code exists 3 more places" becomes one lookup. New pure `src/map/duplication.ts` (winnowing/rolling-hash), additive MapData block + `map` summary count. Effort **M**.
10. **Docstring/JSDoc capture into symbol cards + RAG chunk text** — precedent: LSP hover, Kythe doc facts. README states docstrings are "not scanner truth"; extracting adjacent JSDoc/docstrings enriches `symbol_context` and embedding text so conceptual rag_search hits human-written intent — highest value on the 8 regex languages where headers are sparse. `src/pipeline/extractors/` raw-facts pass, optional `documentation` field on ElementData, threaded into `src/query/symbol-context.ts` + `src/integration/rag/embedding-text-generator.ts`. Effort **M**. Not covered: P7 surfaces header PRESENCE, not doc content.

## E. Anti-recommendations (deliberately NOT worth porting)

- **Zoekt/livegrep trigram full-text index** — agents carry ripgrep; P9's BM25 lane covers ranked lexical retrieval; pure duplication on a single-machine substrate.
- **CodeQL-style datalog/taint engine** — security-audit genre, L++ effort; the 26 composable tools + a future `ast_search` cover the agent-shaped slice without inventing a query language.
- **LLM answer synthesis inside core (Greptile/Bloop/Cody Q&A)** — the consumer IS an LLM agent; synthesis belongs to the agent/ASSISTANT layer; any cloud-model default violates Ollama-local-only. Core returns structured facts, not prose.
- **Composite code-health score (CodeScene health metric)** — conflicts with surfaces-not-verdicts and the P11 load-bearing ruling (decomposed factor vector, never a composite), pinned by `__tests__/map/metrics-delta.test.ts`.

## Key verified paths

`src/cli/coderef-mcp-server.ts` (26 tools) · `src/cli/coderef-analyze.ts:277` (breaking-changes stub) · `src/map/git-history.ts` (no author capture) · `src/pipeline/graph-builder.ts` (no implements emission) · `src/adapter/` (code-empty) · package.json (tree-sitter grammars + protobufjs already deps) · `ASSISTANT/coderef/workorder/agentic-coding-intelligence-program/plan.json` (11-phase shortlist) · git log `2c05405`/`25e5930`/`4b211be`/`b1b9ba2` (P8-P11 shipped).

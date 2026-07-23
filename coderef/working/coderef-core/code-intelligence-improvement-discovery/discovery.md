# /discover report — ways to improve the CODEREF-CORE code intelligence system

**Generated:** 2026-07-09T21:05:00Z
**Depth:** thorough
**Output dest:** working:coderef/working/CODEREF-CORE/code-intelligence-improvement-discovery/discovery.md
**Dispatch:** none

## 1. Scope

What was asked: "identify ways to improve this code intelligence system so we can produce better results" — then, additionally: "identify existing tools that are new and in the same genre and extract their useful parts to implement here."

What was bounded: the CODEREF-CORE code-intelligence engine (`@coderef/CODEREF-CORE` v2.0.0) — scanner → analyzer → pipeline (call/import resolver + graph builder) → registry → RAG → MCP server. Surveyed both (a) the system's own self-reported graph via its live MCP tools, and (b) the 2025-2026 code-intelligence tool landscape for adoptable techniques.

## 2. Surfaces audited

- [tool: mcp coderef-core/codebase_summary]   elements=2447, header_coverage=94.23%, graph nodes=2809, edges=30184
- [tool: mcp coderef-core/validation_status]  resolved=5292, unresolved=17280, ambiguous=2342, builtin=4780, external=222
- [tool: mcp coderef-core/unresolved_edges]   reason breakdown queried: receiver_not_in_symbol_table=10691, method_not_in_class_own_methods=59, symbol_not_in_module_exports=12, ambiguous total=2342
- [tool: mcp coderef-core/hotspots]           top-15 ranked (src_only), total_ranked=1574
- [tool: mcp coderef-core/cycles]             total_cycles=1 (trivial recursion pair — architecturally clean)
- [tool: rg + read]                           src/pipeline/call-resolver.ts (resolution logic lines 379-757), package.json (15 CLIs)
- [tool: WebSearch x2 + WebFetch x2]          2026 landscape: CodeGraph, GitNexus, CodeGraphContext, Serena, claude-context, grepai, Repomix, Aider, Stack Graphs; rywalker comparison + engines.dev navigation blog + indexed-retrieval-vs-grep measurements

## 3. Findings table

| Surface | Observation | Severity | Evidence |
|---|---|---|---|
| validation_status | Only **5292 of ~22.6k non-builtin call/import edges resolve (~23%)**. 17280 unresolved + 2342 ambiguous. This is the single biggest quality lever — the graph is honest but sparse. | critical | resolved=5292 vs unresolved=17280 |
| call-resolver.ts:756 | **`receiver_not_in_symbol_table` = 10,691 edges (62% of all unresolved)** — method calls on locals/prototypes (`elements.slice()`, `x.toFixed()`) the resolver can't type. Dominant gap. | critical | unresolved_edges reason=receiver_not_in_symbol_table total=10691 |
| call-resolver.ts:382-386 | **De-dup defect in `buildSymbolTable.addEntry`**: raw `list.push(entry)` with no guard. Same codeRefId appears **17× identically** in candidate arrays. Bloats every ambiguous edge's `candidates[]` and inflates memory. | critical | ambiguous edge for `scanCurrentElements:908` lists the identical id 17 times |
| call-resolver.ts:746,752 | `.map(e => e.codeRefId)` emits candidates with **no output dedup** either — second half of the same bug. | warning | candidates arrays are raw maps, never `[...new Set()]` |
| call-resolver.ts:749-754 | **`single_candidate_unknown_receiver` (~part of 2342 ambiguous)**: edges with EXACTLY ONE candidate are parked as "ambiguous" rather than provisionally resolved with a confidence score. Guardrail-4 correct, but costs recall with no confidence-tier escape hatch. | warning | line 750-754 returns kind:'ambiguous' for calleeEntries.length===1 |
| hotspots #2 | **`demo-all-modules.ts#main` ranks as the #2 architectural load-bearer (fan-out 86)** — a demo/example file pollutes the hotspot signal. `examples/` and root demo files are scanned as first-class src. | warning | hotspots: main:80 score 87, second only to normalizeSlashes |
| codebase_summary vs validation_status | `codebase_summary` reports 27627 call edges; `validation_status` reports 5292 valid. Two surfaces count "edges" differently (all-emitted vs resolved-only). Not wrong, but a consumer reading only `codebase_summary` over-trusts graph density. | info | 27627 call edges vs 5292 valid_edge_count |
| header_coverage | 94.23% header coverage (2367 defined / 42 stale / 28 partial / 10 missing). Healthy; the 42 stale are the actionable slice. | info | header_coverage.by_status |
| cycles | Only 1 SCC, a trivial 2-node recursion in a doc-gen script. Genuinely clean dependency structure — no architectural knots to untangle. | info | total_cycles=1 |

## 4. Type/contract divergences

| Caller | Callee | Field | Observed shape | Notes |
|---|---|---|---|---|
| codebase_summary | (graph.edges_by_type.call) | edge count | 27627 | counts ALL emitted call edges incl. unresolved |
| validation_status | (valid_edge_count) | edge count | 5292 | counts only RESOLVED edges |
| **Divergence** | — | "how many call edges exist?" | 27627 vs 5292 | Same underlying graph, two different denominators exposed to agents. A `resolution_rate` field on `codebase_summary` would reconcile them in one read. |

## 5. Recommendations with priority

| Rec ID | Priority | Action | Owner |
|---|---|---|---|
| REC-001 | high | **Fix the symbol-table de-dup defect** (call-resolver.ts:382-386 + :746/:752). Guard `addEntry` against duplicate codeRefId per name, and emit `[...new Set(candidates)]`. Pure correctness win — shrinks candidate arrays, cuts memory, unblocks honest ambiguity counts. Small, self-contained, testable. | CODEREF-CORE |
| REC-002 | high | **Attack `receiver_not_in_symbol_table` (10,691 edges, 62%)** by adding a local-variable type-inference pass: track `const x = new Foo()` / `const x = foo()` bindings within a function scope so `x.method()` resolves to Foo's method. Even partial coverage (constructor-assignment + same-file factory returns) would resolve thousands of edges. Biggest single recall lever. | CODEREF-CORE |
| REC-003 | medium | **Add a confidence-tiered resolution** (extract from the genre): instead of binary resolved/ambiguous, emit `single_candidate_unknown_receiver` as `resolved` with `confidence: "provisional"`. Lets agents use the edge while preserving honesty. Mirrors how newer graph tools surface probabilistic edges. | CODEREF-CORE |
| REC-004 | medium | **Exclude `examples/`, `demo-*.ts`, root demo files from `src_only` hotspot ranking + resolution stats.** A demo file should not be the #2 load-bearer. Add a demo/example path filter to the scanner's src classification. | CODEREF-CORE |
| REC-005 | medium | **Add a `resolution_rate` + `ambiguous_rate` field to `codebase_summary`** so the two edge-count denominators reconcile in a single agent read (§4 divergence). One-line honesty upgrade. | CODEREF-CORE |
| REC-006 | low | **Incremental / file-watcher indexing** — the universal feature across CodeGraph (file-watcher sync), claude-context (Merkle-tree re-index), grepai (watcher daemon). CODEREF-CORE has `coderef-watch`; verify it does true incremental symbol-table patching, not full rescan. If full rescan, adopt Merkle/mtime-gated partial re-index. | CODEREF-CORE |
| REC-007 | low | **Prune 42 stale headers** — smallest actionable header slice; keeps the 94% coverage honest. | CODEREF-CORE |

### Genre survey — newer tools in the same space and what to extract

| Tool (2026) | Architecture | Extractable part for CODEREF-CORE |
|---|---|---|
| **CodeGraph** (47k★) | embedded SQLite call graph, tree-sitter, file-watcher incremental sync, 42 MCP tools | **Incremental sync model** (REC-006); breadth of MCP tool surface as a target (CODEREF-CORE has 18, CodeGraph 42) |
| **GitNexus** (42k★) | zero-server LadybugDB, WASM, "blast radius analysis" | **Blast-radius / impact framing** — CODEREF-CORE already has `impact_of`/`diff_impact`; validate parity |
| **Serena** | LSP-over-MCP, `find_referencing_symbols`, project-wide rename | **Symbol-level EDIT ops** — CODEREF-CORE is read-only; a rename/refactor tool would be a genre-expected capability |
| **claude-context** | BM25 + dense-vector hybrid over AST chunks, Merkle re-index | **Hybrid lexical+vector RAG** — CODEREF-CORE's `rag_search` is embedding-only; adding BM25 fusion is a known precision win |
| **Repomix** (255k dl/mo) | tree-sitter compression, ~70% token reduction | **Context-packing / compression** for feeding the graph to LLMs cheaply |
| **Stack Graphs** (GitHub prod since 2021) | deterministic path-tracing name resolution | **Scope-stack name resolution** — the principled answer to `receiver_not_in_symbol_table` (REC-002); worth studying tree-sitter-stack-graphs rulesets |
| **Agentic-vs-RAG research (2026, peer-reviewed)** | — | **Partial validation of the STRUCTURAL/agentic-retrieval direction** (not embedding-RAG): Amazon Science AAAI-2026 (arXiv:2602.23368) — tool-use agents reach 94.5% of RAG faithfulness / 88% context recall and BEAT RAG by 6pts on FinanceBench (30.4% vs 24.24%); Search-R1 (arXiv:2503.09516) +24% relative over RAG; SWE-bench RAG baseline 1.96% → SWE-agent 12.47%. Supports investing in the graph + MCP tool surface over pure vector retrieval. |

> **CORRECTION (2026-07-09):** an earlier draft of this row cited "indexed retrieval = 97% fewer input tokens + 58-70% fewer tool calls vs grep." That figure was propagated from a web-SEARCH SNIPPET and, on fetching the source article (buzzgrewal.medium.com), was **NOT found in the article** — it was fabricated/mangled at the snippet layer. The line above replaces it with the article's genuinely peer-reviewed citations. Do not cite the struck figure.

**Cross-cutting genre gap the landscape names:** no tool ships a *"code intelligence protocol"* — a backend-independent standard for how agents query codebase structure. CODEREF-CORE's MCP tool surface + locked schemas is unusually close to this; it's a potential differentiator, not just a catch-up list.

## 6. Reuse template note

This report shape is the canonical `/discover` output. §3 and §5 table headers are fixed; section ordering is fixed. Downstream skills (create-workorder, stub, dispatch-session-request) can grep for `## N.` markers to extract sections. REC-001 and REC-002 are the two highest-leverage, self-contained fixes and are the natural first workorder(s).

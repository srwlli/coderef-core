# /discover report — un-extracted genre-tool features from the code-intelligence-improvement report

**Generated:** 2026-07-10T03:20:00Z
**Depth:** thorough
**Output dest:** working:coderef/working/coderef-core/genre-feature-extraction-gap-audit/discovery.md
**Dispatch:** none

## 1. Scope

What was asked: verbatim — "we made a report on genre-like tools. did we extract all the features we identified?" The parent report (`coderef/working/coderef-core/code-intelligence-improvement-discovery/discovery.md`, 2026-07-09) had TWO feature lists: (a) 7 `REC-*` recommendations, and (b) a **Genre survey** "what to extract for CODEREF-CORE" column citing newer tools (CodeGraph, Serena, claude-context, Repomix, Stack Graphs, GitNexus). This audit verifies, against the LIVE coderef-core code, which identified features shipped and which were NOT extracted.

What was bounded: the coderef-core code-intelligence engine (`@coderef/CODEREF-CORE` v2.0.0) — RAG search surface, MCP tool surface, call-resolver, and the impact/reference query tools. Scoped to the parent report's identified features only; not a fresh landscape survey.

## 2. Surfaces audited

- [tool: rg]                     queries=9, hits across src/integration/rag, src/cli/coderef-mcp-server.ts, src/pipeline/call-resolver.ts
- [tool: read]                   call-resolver.ts:1078-1101 (scopeStack), semantic-search.ts (search path), json-store.ts:343 (metadata filter)
- [tool: parent report]          code-intelligence-improvement-discovery/discovery.md §5 (REC-001..007) + §"Genre survey"
- [tool: git log]                phase/follow-up commits 55cbb41, 914fbeb, b240cec, 064dc18, a984299, efc99671, b9468ec, d3f60be, 832c091, d38f431, bfd881f
- [tool: TRACKING/stubs.json]    open-stub scan for existing coverage of the genre items (0 real matches — all keyword false-positives)
- No degraded sources; MCP live-query not re-run (parent report's counts cross-checked against source instead).

## 3. Findings table

Two tiers: the REC-* recommendations (became the WO phases) and the Genre-survey extraction items.

### Tier A — REC-* recommendations (WO phases)

| Surface | Observation | Severity | Evidence |
|---|---|---|---|
| REC-001 symbol-table de-dup | SHIPPED — P1 | info | 55cbb41 |
| REC-002 local-var type inference | **PARTIAL** — the report's #1 recall lever. P3 shipped only 3c (JS-prototype→builtin RELABEL, ~4,378 edges) + verified 3a; 3b (factory returns) skipped (~0 delta in-repo); genuine local-var→project-method resolution NOT built | **critical** | b240cec; [[project_p3c_builtin_reclassify_ruling]] |
| REC-003 confidence-tiered resolution | SHIPPED — P2 | info | 914fbeb |
| REC-004 exclude demo/example from hotspots | SHIPPED — P4 | info | 064dc18 |
| REC-005 resolution_rate on codebase_summary | SHIPPED — P5 | info | a984299 |
| REC-006 incremental/file-watcher indexing | SHIPPED — P6 audit + follow-ups (docs/RAG on incremental leg 832c091; --incremental default d38f431) | info | efc99671, 832c091, d38f431 |
| REC-007 prune stale headers | SHIPPED — P7 (+ scoped --stale-only flag bfd881f) | info | b9468ec, bfd881f |

### Tier B — Genre-survey "what to extract" (the actual un-extracted set)

| Surface | Observation | Severity | Evidence |
|---|---|---|---|
| RAG: BM25/hybrid (claude-context) | **NOT extracted.** rag_search is embedding retrieval → vectorStore.query (semantic-search.ts:151,186). NO BM25/lexical/sparse leg (grep bm25\|lexical\|hybrid = empty). **Nuance: a graph-reranker layer ALREADY exists** (graph-reranker.ts, rerankedScore) — so retrieval is embedding+graph-rerank, not pure-embedding; the missing leg is specifically LEXICAL/BM25 fusion. Feasibility HIGH: vector store already supports metadata filter (json-store.ts:343). | critical | grep empty for bm25; semantic-search.ts:151; graph-reranker.ts present |
| Scope-stack name resolution (Stack Graphs) — the PRINCIPLED REC-002 | **NOT extracted.** A `scopeStack` exists (call-resolver.ts:1081-1101) but only for CALLER attribution (enclosing-fn of a call site via currentScopeCodeRefId), NOT for local-binding/receiver TYPE resolution. The Stack-Graphs technique (deterministic scope-chain name resolution → resolve `x.method()` receivers) is absent. This is the real fix for `receiver_not_in_symbol_table` that P3 sidestepped. | critical | call-resolver.ts:1081-1101 (attribution-only scopeStack) |
| Symbol-level EDIT ops (Serena rename/refactor) | **NOT extracted.** coderef is read-only — no rename/refactor/write tool (grep empty). **Nuance: the QUERY side exists** — `find_all_references` IS present (mcp-server.ts:32, union call+import+type refs), the analog of Serena's find_referencing_symbols. Only the mutate side (project-wide rename powered by those refs) is missing. | warning | mcp-server.ts:32 find_all_references present; no write tool |
| Context-packing / compression (Repomix) | **NOT extracted.** No tree-sitter compression / token-reduction / context-pack path (grep hits are unrelated middleware "compression" categories). | warning | grep: only middleware-detector category enums |
| MCP tool-surface breadth (CodeGraph 42 vs 18) | **NOT extracted.** Still exactly 18 registerTool() calls (mcp-server.ts) — matches the report's count; no new query tools added since. | info | 18 registerTool() occurrences |
| Blast-radius parity (GitNexus) | **Already present — validate-only.** impact_of + diff_impact both exist (mcp-server.ts:452,461,703). The report asked to "validate parity," not build; no gap, just an unrun validation. | info | mcp-server.ts:452,461 |

## 4. Type/contract divergences

| Caller | Callee | Field | Observed shape | Notes |
|---|---|---|---|---|
| parent report §"Genre survey" | rag_search | retrieval mode | claimed "embedding-only" | Live: embedding + graph-rerank (graph-reranker.ts). The report undercounted the existing hybrid-ness; the true gap is the LEXICAL leg only. |
| parent report §"Genre survey" (Serena row) | MCP surface | reference query | claimed coderef "read-only" (implying no ref-finding) | Live: `find_all_references` EXISTS. Read-only is true for MUTATION; reference-finding is already shipped. Gap is edit-ops, not ref-queries. |
| parent report REC-002 | call-resolver | scope-stack | implied absent | Live: scopeStack present but ATTRIBUTION-only, not receiver-type-resolution. Reusable primitive; resolution logic still to build. |

## 5. Recommendations with priority

All recommendations below were minted as registry stubs 2026-07-10 (plus the missed REC-002 as STUB-9XFY1P). Stub IDs: GX-001=STUB-Q7MRD6, GX-002=STUB-2E7SHE, GX-003=STUB-DGZ7J0, GX-004=STUB-QCMHSE, GX-005=STUB-42QA8V, GX-006=STUB-SBTYVG.

| Rec ID | Priority | Action | Owner |
|---|---|---|---|
| GX-001 (STUB-Q7MRD6) | high | **BM25/lexical fusion into rag_search** (extract from claude-context). The graph-reranker + metadata-filter infra already exist; add a sparse/BM25 leg and fuse (RRF) with the embedding leg. Highest-leverage un-extracted item — a known precision win, and the infra is 60% there. | CODEREF-CORE |
| GX-002 | high | **Scope-stack receiver resolution** (extract from Stack Graphs) — the PRINCIPLED close to REC-002's `receiver_not_in_symbol_table`. Track local bindings (`const x = new Foo()` / factory returns) in a per-scope binding table layered on the existing scopeStack, so `x.method()` resolves to a project method. This is the genuine recall lever P3 relabeled-around, not resolved. | CODEREF-CORE |
| GX-003 | medium | **Symbol-level rename/refactor tool** (extract from Serena). find_all_references already supplies the reference set; add a write tool that applies a project-wide rename over those refs. Genre-expected capability; moves coderef from read-only to read-write. | CODEREF-CORE |
| GX-004 | medium | **Context-packing / compression tool** (extract from Repomix) — tree-sitter-based compression to feed the graph/relevant slice to an LLM at ~70% fewer tokens. Complements the RAG + MCP surface for cheap context assembly. | CODEREF-CORE |
| GX-005 | low | **Validate blast-radius parity** (GitNexus) — no build; run impact_of/diff_impact against a known change set and confirm they match GitNexus-style blast-radius expectations. Cheap validation of an existing capability. | CODEREF-CORE |
| GX-006 | low | **MCP tool-surface breadth** — treat 42 (CodeGraph) as a directional target, not a mandate. Only add tools that answer a real agent question; do NOT pad the count. Re-evaluate after GX-001..004 (which themselves add tools). | CODEREF-CORE |

## 6. Reuse template note

This report shape is the canonical `/discover` output. §3 and §5 table headers are fixed; section ordering is fixed. Downstream skills (create-workorder, stub, dispatch-session-request) can grep for `## N.` markers to extract sections. **GX-001 (BM25 fusion) and GX-002 (scope-stack resolution) are the two highest-leverage un-extracted items and are the natural next workorder(s)** — GX-002 is the honest completion of the parent report's REC-002 (its stated #1 lever), and GX-001 rides on infra (graph-reranker + metadata filter) that already exists.

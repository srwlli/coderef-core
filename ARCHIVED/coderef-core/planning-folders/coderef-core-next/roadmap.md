# Roadmap: coderef-core-next

**Owner:** CODEREF-CORE
**Created:** 2026-06-12T12:20:00Z
**Updated:** 2026-06-13T09:42:00Z
**Current phase:** 5
**Render slug:** `SURFACES/surfaces-html/renders/roadmap/coderef-core-next/` (stable, no ULID)

---

## Phase 1: Native intelligence surface (in flight)

**Status:** complete
**Hard-stop:** yes
**Gating predicate:** WO-CODEREF-CORE-MCP-SERVER-AND-INTELLIGENCE-FIXES-001 lands on main and is pushed; team notified; ASSISTANT registers MCP domain coderef-core
**Shipped commit:** 79605fa

### Items

- [complete] **STABILIZE** (de17dcd) — Test/CI/hygiene stabilization (8 tasks): suite green, artifact cleanup, roadmap minted
- [complete] **LOCAL-FIRST-RAG** (60d09e3) — Key-aware embedding provider default (openai only when OPENAI_API_KEY set, else ollama/nomic-embed-text) + rag-index --include-headerless with header:false provenance; ollama dogfood run is the closing evidence
- [complete] **MCP-SERVER-V1** (ef68c3c) — coderef-mcp-server: stdio MCP server typed against ExportedGraph; 6 read-only tools (what_calls, what_imports, impact_of, find_element, codebase_summary, validation_status); 17 unit tests; .mcp.json registers domain coderef-core; live stdio smoke verified
- [complete] **DOCS-DRIFT-SWEEP** (43ee4c5) — CLI.md/README/CHANGELOG/SCHEMA/ARCHITECTURE/API/AGENT-CONTRACT drift sweep: real flag surfaces, 12-field ValidationReport everywhere, coverage-gate fields, MCP server documented, agent contract points to MCP tools
- [complete] **LAND-NOTIFY** (79605fa) — Fast-forward merge to main + push; ASSISTANT-side skill updates (rag-index/rag-search v1.1.0) committed; team notification sent from prepared draft

---

## Phase 2: Correctness debt

**Status:** complete
**Hard-stop:** no
**Gating predicate:** Phase 1 landed on main
**Shipped commit:** 4777cff

### Items

- [complete] **INTEL-SERVER-SCHEMA** (4777cff) — RULED 2026-06-13 (operator-delegated): option A - RETIRE. coderef-intelligence-server endpoints superseded by coderef-mcp-server get deleted/410d (STUB-9F63EJ); hotspots replacement ships as MCP v2 TOOL-HOTSPOTS (Phase 4) before handleHotspots is removed. Original finding: server reads legacy edge fields (e.source/e.target/e.type) internally.
- [complete] **UNRESOLVED-EDGE-AUDIT** (fe7920a) — Self-scan shows unresolved_count=20701 vs valid_edge_count=4293 — characterize unresolved edges by evidence/reason variant, separate expected externals from resolver gaps, file targeted resolver-fix stubs with measured counts [SHIPPED via WO-IMPORT-RESOLVER-MEMBERSHIP-CHECK-BUG-001: 4 rolling phases (91d8ac7/4dcb742/7975e08/fe7920a); unresolved 20701->17551, src-only truth 5854; stubs XK82Z2/QT400D/K5YBFN/XX4JBC closed] [SHIPPED via WO-IMPORT-RESOLVER-MEMBERSHIP-CHECK-BUG-001: 4 rolling phases (91d8ac7/4dcb742/7975e08/fe7920a); unresolved 20701->17551, src-only truth 5854; stubs XK82Z2/QT400D/K5YBFN/XX4JBC closed]
- [complete] **WIN-PATH-NORMALIZATION** (ee1c1a7) — Close STUB-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001: indexing-orchestrator path normalization fails on Windows (drive-letter casing / separator mismatch at the orchestrator seam); caught by DISPATCH-003 E2E smoke [VERIFIED ALREADY SHIPPED 2026-06-13: WO-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001 closed this pre-roadmap (normalizeChunkFileForGraphJoin + dedicated test file); roadmap item was stale]
- [complete] **SCANNER-EXPORT-CLASSIFICATION** (5e73091) — STUB-5WVGHD: scanner marks nested functions exported:true (parent flag inherited) and misses export-const Set declarations entirely - exports_match_ast false-stales honest headers (coderef-mcp-server.ts) and headers cannot list real const exports; fix exported-flag propagation + const-declaration extraction
- [complete] **VITEST-MJS-COLLECTION** (2e90b55) — STUB-Z1ETZD: any vitest test importing scripts/check-header-coverage.mjs dies at collection with SyntaxError (plain node import works) - check-header-coverage.test.ts has been uncollectable since at least 2026-06-12; stash-proven pre-existing with minimal repro
- [complete] **GHOST-INDEX-ENTRIES** (cb8fe53) — STUB-81XNNM: index.json carries elements for root-level types.d.ts and scanner.js that do not exist on disk (17 ENOENT errors in the full-repo rag dogfood) - add disk-existence reconciliation / stale-entry eviction to populate

---

## Phase 3: Storage and footprint

**Status:** complete
**Hard-stop:** no
**Gating predicate:** Phase 1 landed; STUB-BQDXJ0 design accepted
**Shipped commit:** ea4dc9b

### Items

- [complete] **REGISTRY-RAWFACTS-DEDUP** (fade035) — STUB-BQDXJ0: semantic-registry duplicates file-grain rawFacts per element (98% of bytes; 209MB observed on PS repo) — move to file-keyed rawFactsByFile, registry version 2.0.0, drop pretty-print above 10MB; only consumer is projections.ts [DESIGN AUTHORED 2026-06-13: phase3-storage-design.md awaiting operator (A)/(B) ruling; tracker STUB-JAH69F] [SHIPPED 2026-06-13 ruling A: registry 2.0.0 rawFactsByFile; core 124.4MB->14.9MB (88%), PS 56.8MB->12.5MB (78%)]
- [complete] **VECTOR-STORE-PATH-FIX** (02f75bf) — Fallback JSON vector store writes .coderef/rag-vectors.sqlite as a DIRECTORY containing coderef-vectors.json — make the fallback path honest (name reflects store type) and document store resolution in rag-status [SHIPPED: rag-status defaulted to never-written rag-vectors.sqlite; fixed to coderef-vectors.json]

---

## Phase 4: MCP server v2 tools

**Status:** complete
**Hard-stop:** no
**Gating predicate:** MCP-SERVER-V1 shipped; INTEL-SERVER-SCHEMA ruling made (hotspots tool replaces or wraps intelligence-server)
**Shipped commit:** 4777cff

### Items

- [complete] **TOOL-HOTSPOTS** (1b40f1b) — hotspots tool: fan-in/fan-out ranking over resolved edges (canonical replacement for intelligence-server handleHotspots, which is drifted to legacy schema)
- [complete] **TOOL-CYCLES** (1b40f1b) — cycles tool: strongly-connected-component detection over import+call resolved edges; surface cycle membership and smallest back-edge per cycle
- [complete] **TOOL-WHAT-EXPORTS** (1b40f1b) — what_exports tool: file-to-exported-elements lookup over export edges (complements what_imports; closes the export-edge blind spot in the v1 toolset)
- [complete] **TOOL-DIFF-IMPACT** (b4c31a4) — diff_impact tool: map a git diff (or staged changes) to changed elements via index.json line ranges, then union impact_of over the set — PR blast-radius in one call
- [complete] **TOOL-RAG-SEARCH** (b4c31a4) — rag_search tool: expose semantic search over MCP when an index exists, reading provider/store from index metadata so query embeddings always match the index

<!-- depends_on: PHASE-1.MCP-SERVER-V1 -->

---

## Phase 5: RAG quality

**Status:** active
**Hard-stop:** no
**Gating predicate:** Local-first RAG shipped; a golden-query eval harness exists before any ranking change lands

### Items

- [complete] **EVAL-HARNESS** (09a3b85) — Golden-query eval harness on coderef-core's own index (query -> expected elements) so ranking changes are measured, not vibed [SHIPPED: rag-eval CLI + 12 golden queries + baseline hit@1 0.583 / hit@5 0.667 / MRR 0.639]
- [not_started] **CHUNK-ENRICHMENT** — Embed header semantics (layer/capability/constraints) and leading docstring in the chunk text, not just raw code — measured against EVAL-HARNESS
- [not_started] **PROVENANCE-RANKING** — Downweight header:false chunks at query time (post-score multiplier) instead of hard-filtering — headerless repos stay searchable but annotated code ranks first
- [not_started] **INDEX-FRESHNESS** — rag-status surfaces staleness: files changed since indexedAt, with incremental-vs--reset recommendation

---

## Chronology callouts

- **P1-P4-DEP** — MCP v2 tools extend buildToolHandlers shipped in Phase 1 (true dependency, not pure sequencing) *(depends on: PHASE-1.MCP-SERVER-V1)*
- **P2-P4-DEP** — TOOL-HOTSPOTS is the replacement path for intelligence-server's drifted handleHotspots — needs the INTEL-SERVER-SCHEMA port-vs-retire ruling first *(depends on: PHASE-2.INTEL-SERVER-SCHEMA)*
- **P1-P5-DEP** — PROVENANCE-RANKING consumes the header:false chunk metadata shipped in Phase 1 (LOCAL-FIRST-RAG) *(depends on: PHASE-1.LOCAL-FIRST-RAG)*
- **P2-AUDIT-SHIPPED** — UNRESOLVED-EDGE-AUDIT item shipped via WO-IMPORT-RESOLVER-MEMBERSHIP-CHECK-BUG-001 (rolling 4-phase: 91d8ac7/4dcb742/7975e08/fe7920a; closed 35df9bc). unresolved 20701->17551 with src-only truth 5854; all 4 audit stubs closed. Phase 2 stays active: INTEL-SERVER-SCHEMA + WIN-PATH-NORMALIZATION remain.

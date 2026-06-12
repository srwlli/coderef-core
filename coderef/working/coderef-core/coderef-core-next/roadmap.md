# Roadmap: coderef-core-next

**Owner:** CODEREF-CORE
**Created:** 2026-06-12
**Updated:** 2026-06-12
**Current phase:** 1
**Status:** active

Forward roadmap for coderef-core after the pipeline rebuild: ship the native intelligence surface (in flight), pay down correctness debt, shrink the storage footprint, grow the MCP toolset, and raise RAG quality behind a measured eval harness.

---

## Phase 1: Native intelligence surface (in flight)

**Status:** active
**Gating predicate:** WO-CODEREF-CORE-MCP-SERVER-AND-INTELLIGENCE-FIXES-001 lands on main and is pushed; team notified; ASSISTANT registers MCP domain coderef-core
**Shipped commit:** —

### Items (parallel within phase)

- [complete] STABILIZE: Test/CI/hygiene stabilization (8 tasks): suite green, artifact cleanup, roadmap minted (de17dcd)
- [active] LOCAL-FIRST-RAG: Key-aware embedding provider default (openai only when OPENAI_API_KEY set, else ollama/nomic-embed-text) + rag-index --include-headerless with header:false provenance; ollama dogfood run is the closing evidence
- [active] MCP-SERVER-V1: coderef-mcp-server: stdio MCP server typed against ExportedGraph; 6 read-only tools (what_calls, what_imports, impact_of, find_element, codebase_summary, validation_status); 17 unit tests; .mcp.json registers domain coderef-core; live stdio smoke verified
- [active] DOCS-DRIFT-SWEEP: CLI.md/README/CHANGELOG/SCHEMA/ARCHITECTURE/API/AGENT-CONTRACT drift sweep: real flag surfaces, 12-field ValidationReport everywhere, coverage-gate fields, MCP server documented, agent contract points to MCP tools
- [not_started] LAND-NOTIFY: Fast-forward merge to main + push; ASSISTANT-side skill updates (rag-index/rag-search v1.1.0) committed; team notification sent from prepared draft

## Phase 2: Correctness debt

**Status:** not_started
**Gating predicate:** Phase 1 landed on main

### Items (parallel within phase)

- [not_started] INTEL-SERVER-SCHEMA: coderef-intelligence-server still reads legacy edge fields (e.source/e.target/e.type) internally — port it to the canonical 8-field ExportedGraph schema, or retire endpoints superseded by MCP tools (ruling needed: port vs retire)
- [not_started] UNRESOLVED-EDGE-AUDIT: Self-scan shows unresolved_count=20701 vs valid_edge_count=4293 — characterize unresolved edges by evidence/reason variant, separate expected externals from resolver gaps, file targeted resolver-fix stubs with measured counts
- [not_started] WIN-PATH-NORMALIZATION: Close STUB-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001: indexing-orchestrator path normalization fails on Windows (drive-letter casing / separator mismatch at the orchestrator seam); caught by DISPATCH-003 E2E smoke

## Phase 3: Storage and footprint

**Status:** not_started
**Gating predicate:** Phase 1 landed; STUB-BQDXJ0 design accepted

### Items (parallel within phase)

- [not_started] REGISTRY-RAWFACTS-DEDUP: STUB-BQDXJ0: semantic-registry duplicates file-grain rawFacts per element (98% of bytes; 209MB observed on PS repo) — move to file-keyed rawFactsByFile, registry version 2.0.0, drop pretty-print above 10MB; only consumer is projections.ts
- [not_started] VECTOR-STORE-PATH-FIX: Fallback JSON vector store writes .coderef/rag-vectors.sqlite as a DIRECTORY containing coderef-vectors.json — make the fallback path honest (name reflects store type) and document store resolution in rag-status

## Phase 4: MCP server v2 tools

**Status:** not_started
**Gating predicate:** MCP-SERVER-V1 shipped; INTEL-SERVER-SCHEMA ruling made (hotspots tool replaces or wraps intelligence-server)

### Items (parallel within phase)

- [not_started] TOOL-HOTSPOTS: hotspots tool: fan-in/fan-out ranking over resolved edges (canonical replacement for intelligence-server handleHotspots, which is drifted to legacy schema)
- [not_started] TOOL-CYCLES: cycles tool: strongly-connected-component detection over import+call resolved edges; surface cycle membership and smallest back-edge per cycle
- [not_started] TOOL-WHAT-EXPORTS: what_exports tool: file-to-exported-elements lookup over export edges (complements what_imports; closes the export-edge blind spot in the v1 toolset)
- [not_started] TOOL-DIFF-IMPACT: diff_impact tool: map a git diff (or staged changes) to changed elements via index.json line ranges, then union impact_of over the set — PR blast-radius in one call
- [not_started] TOOL-RAG-SEARCH: rag_search tool: expose semantic search over MCP when an index exists, reading provider/store from index metadata so query embeddings always match the index

<!-- depends_on: PHASE-1.MCP-SERVER-V1 -->

## Phase 5: RAG quality

**Status:** not_started
**Gating predicate:** Local-first RAG shipped; a golden-query eval harness exists before any ranking change lands

### Items (parallel within phase)

- [not_started] EVAL-HARNESS: Golden-query eval harness on coderef-core's own index (query -> expected elements) so ranking changes are measured, not vibed
- [not_started] CHUNK-ENRICHMENT: Embed header semantics (layer/capability/constraints) and leading docstring in the chunk text, not just raw code — measured against EVAL-HARNESS
- [not_started] PROVENANCE-RANKING: Downweight header:false chunks at query time (post-score multiplier) instead of hard-filtering — headerless repos stay searchable but annotated code ranks first
- [not_started] INDEX-FRESHNESS: rag-status surfaces staleness: files changed since indexedAt, with incremental-vs--reset recommendation

---

## Chronology callouts

- **P1-P4-DEP** — MCP v2 tools extend buildToolHandlers shipped in Phase 1 (true dependency, not pure sequencing) *(depends on: PHASE-1.MCP-SERVER-V1)*
- **P2-P4-DEP** — TOOL-HOTSPOTS is the replacement path for intelligence-server's drifted handleHotspots — needs the INTEL-SERVER-SCHEMA port-vs-retire ruling first *(depends on: PHASE-2.INTEL-SERVER-SCHEMA)*
- **P1-P5-DEP** — PROVENANCE-RANKING consumes the header:false chunk metadata shipped in Phase 1 (LOCAL-FIRST-RAG) *(depends on: PHASE-1.LOCAL-FIRST-RAG)*

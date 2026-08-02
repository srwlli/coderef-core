---
title: Best-Form Clone — Engine band plan
domain: CODEREF-CORE
status: open
created: 2026-08-02
stub_ref: null
---

# Engine band — pure intelligence

**Graph:** [graph.html](graph.html) · master: [../blueprint.html](../blueprint.html) · ledger: [../PROBLEMS.md](../PROBLEMS.md)

**Mission.** Everything coderef-core is actually *for*, with nothing else in the room: parse → extract → resolve → graph → analytics/RAG, fronted by one typed facade. No presentation, no doc generation, no process artifacts, no filesystem access outside the loader and codecs, cycles pinned at zero from commit one.

## Nodes

| Node | Phase·Track | Responsibility (one line) |
| :--- | :--- | :--- |
| `engine.loader` | P1·A | Allowlist-first scan scope; the only module that walks the filesystem (L8 lives here) |
| `engine.parser` | P1·A | Grammar registry + language adapters; one AST session per file per run |
| `engine.extract` | P1·A | Elements + raw refs + docstrings on ONE traversal (transparent frames impossible, L2) |
| `engine.symbols` | P1·A | Symbol table + scope stack; single writer |
| `engine.resolve` | P1·A | Import origin + call tiering; provenance stamped on every edge — unstamped edges cannot be constructed |
| `engine.graph` | P1·A | Canonical graph; THE single adjacency index (L3) |
| `engine.enrich` | P2·A | Frameworks, routes, middleware; @Endpoint/@Doc first-class |
| `engine.analytics` | P2·A | Cycles, hotspots, impact BFS, paths, clones, ast-metrics, map projection |
| `engine.measure` | P2·A | Owns every published number: denominators, unresolved taxonomy, exclusions at source (L7) |
| `engine.watchcore` | P2·A | Pure incremental invalidation (fs watching lives in the transport) |
| `engine.mutate` | P2·A | AST-guarded rename/refactor preview + atomic apply; the single sanctioned source-writer (GX-003 posture carried forward) |
| `engine.rag` | P1·D | Chunking, Ollama embedder port, BM25, RRF fusion — fully functional on zero-header repos |
| `engine.headers` | P2·D | Header enrichment through the contracts.headers codec only; optional everywhere |
| `engine.api` | P1·B | THE facade; the only import surface transports may touch (L4's other half) |

## Problems this band neutralizes
P1 (single walk, one classifier), P2 (one adjacency index, one facade), P4 (measure owns numbers), P6 (loader allowlist), P7 (RAG joins on index).

## Build
- **P1 (track A):** the six-node core chain, fixture-driven — each stage lands with its counts asserted against `verify.fixture` pinned truth. **Track B** lands `engine.api` as a typed signature + stub implementation so transports develop in parallel. **Track D** lands `engine.rag` against fixture index artifacts + local Ollama (no cloud keys — standing rule).
- **P2 (track A):** enrich, analytics, measure, watchcore, mutate; bind `engine.api` to the real engine; feed `verify.parity`.

**Exit criteria:** fixture counts exact; parity vs CODEREF-CORE adjudicated; cycles 0; rules gate green; no import into this band except from transports→`engine.api` and verification.

**Porting note.** [../as-is.html](../as-is.html) is the routing table: today's `src/pipeline`, `src/scanner`, `src/query`, `src/analyzer`, `src/integration`, `src/semantic`, `src/indexer`, `src/refactor`, `src/search`, `src/validator`, `src/generator`, `src/map` (projection half), `src/cache`, `src/registry` all land here — the panel on each block names its destination node. `src/legacy` explicitly does not ride along (L10).

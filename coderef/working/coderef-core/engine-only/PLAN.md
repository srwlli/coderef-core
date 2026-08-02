---
title: Pure Code Intelligence Engine Architecture Blueprint (Engine-Only)
domain: CODEREF-CORE
status: open
created: 2026-08-01
stub_ref: null
---

# Pure Code Intelligence Engine Architecture Blueprint (`coderef-intel-engine`)

## Purpose
Define the architecture for stripping `coderef-core` down to a **Pure Headless Code Intelligence Engine (`coderef-intel-engine`)**. All presentation, visual graph rendering, documentation generation, and context report building are extracted into separate downstream consumer systems. 

The core engine retains 100% of its mathematical code intelligence capabilities (internal AST graph, call/import resolution, symbol table, scope stack, blast-radius BFS, SCIP overlay, BM25/Ollama hybrid search, AST refactoring) while exposing lean MCP and CLI intelligence feeds.

---

## The Pure Intelligence Distinction

| Internal Graph Substrate (RETAINED IN CORE ENGINE) | Visual & Presentation Surfaces (EXTRACTED OUT) |
| :--- | :--- |
| **`canonical-graph.ts`:** In-memory dependency graph math (nodes, call edges, import edges, heritage links). | **`coderef-map` / HTML Viewers:** Canvas & D3 visual map rendering (`graph.html`, `dashboard.html`). |
| **Symbol Table & Scope Stack:** Parameter bindings, local variable resolution, type inference. | **Doc-Gen Pipeline:** `scripts/doc-gen/generate-*.js`, resource sheet generation, foundation docs. |
| **Impact Analysis & Blast Radius BFS:** Multi-hop graph traversal, cycle detection, dependency rules. | **Context Packing & Exporters:** Markdown context packs, prompt dossiers, static report formatters. |
| **Hybrid Search Substrate:** Dense Ollama vectors + BM25 3-gram sub-token sparse index with RRF reranking. | **Cloud LLM Adapters:** External cloud AI proxies (retains local Ollama vector engine only). |
| **AST Safe Mutation Engine:** Tree-Sitter symbol replacements and caller call-site updates. | |

---

## Target Pure Engine Architecture Graph

```mermaid
graph TD
    subgraph External_Consumers ["Decoupled Downstream Consumer Systems"]
        DOC_GEN["External Doc Generator System<br/>(coderef-doc-gen)"]
        VIS_MAP["Interactive Visual Map Web App<br/>(coderef-map-viewer)"]
        IDE_AGENTS["IDE Extensions & AI Coding Agents<br/>(Cursor, VS Code, Claude)"]
        CONTEXT_PACK["Context Packing & Report Exporter<br/>(coderef-context-pack)"]
    end

    subgraph Intelligence_Feed_Adapters ["Layer 5: Presentation & Feed Adapters"]
        MCP_FEED["MCP Intelligence Server<br/>@feed/mcp/*<br/>(Graph, Search, Refactor Feeds)"]
        CLI_FEED["CLI Intelligence Stream Bins<br/>@feed/cli/*<br/>(coderef-query, coderef-pipeline, coderef-watch)"]
        SSE_FEED["Real-Time Watch SSE Stream<br/>@feed/sse/event-emitter.ts"]
    end

    subgraph Service_Engine_Layer ["Layer 4: Intelligence Service Engine"]
        INTEL_FACADE["Unified IntelEngineFacade<br/>@engine/services/intel-facade.ts"]
        MUTATION_ENGINE["AST Safe Mutation Engine<br/>@engine/refactor/ast-mutation.ts"]
        PHASE_EXECUTOR["Phase Middleware Executor<br/>@engine/pipeline/executor.ts"]
    end

    subgraph Pipeline_Phase_Chain ["Layer 3: Core Pipeline Middleware Handlers"]
        PH_DISCOVER["01. FileDiscoveryPhase"]
        PH_CACHE["02. IncrementalCachePhase"]
        PH_SCAN["03. ASTElementScanPhase"]
        PH_IMPORT["04. ImportResolutionPhase"]
        PH_CALL["05. ScopeCallResolutionPhase"]
        PH_SCIP["06. SCIPPrecisionOverlayPhase"]
        PH_GRAPH["07. CanonicalGraphEmissionPhase"]
    end

    subgraph Graph_Domain_Substrate ["Layer 2: Canonical Graph Engine & Search Substrate"]
        CANONICAL_GRAPH["Canonical Graph Engine<br/>@engine/graph/canonical-graph.ts"]
        SYMBOL_TABLE["Global Symbol Table & Scope Stack<br/>@engine/symbol/symbol-table.ts"]
        HYBRID_SEARCH["BM25 Sub-Token N-Gram + Vector Search<br/>@engine/search/hybrid-search.ts"]
    end

    subgraph Core_Parser_Substrate ["Layer 1: Tree-Sitter Parser Substrate"]
        TREE_SITTER["Tree-Sitter Multi-Language Grammar Registry<br/>@engine/parser/grammar-registry.ts"]
        AST_VISITORS["Language AST Element Visitors<br/>@engine/parser/visitors/*"]
        LRU_CACHE["Scan LRU Cache<br/>@engine/cache/lru-cache.ts"]
    end

    %% External Connections
    DOC_GEN --> MCP_FEED
    VIS_MAP --> MCP_FEED
    IDE_AGENTS --> MCP_FEED
    IDE_AGENTS --> SSE_FEED
    CONTEXT_PACK --> CLI_FEED

    %% Internal Engine Wiring
    MCP_FEED --> INTEL_FACADE
    MCP_FEED --> MUTATION_ENGINE
    CLI_FEED --> INTEL_FACADE
    CLI_FEED --> PHASE_EXECUTOR

    INTEL_FACADE --> CANONICAL_GRAPH
    INTEL_FACADE --> HYBRID_SEARCH

    PHASE_EXECUTOR --> PH_DISCOVER
    PHASE_EXECUTOR --> PH_CACHE
    PHASE_EXECUTOR --> PH_SCAN
    PHASE_EXECUTOR --> PH_IMPORT
    PHASE_EXECUTOR --> PH_CALL
    PHASE_EXECUTOR --> PH_SCIP
    PHASE_EXECUTOR --> PH_GRAPH

    PH_SCAN --> TREE_SITTER
    PH_SCAN --> AST_VISITORS
    PH_SCAN --> LRU_CACHE
    PH_CALL --> SYMBOL_TABLE
    PH_GRAPH --> CANONICAL_GRAPH
```

---

## Core Engine Guarantees

1. **Zero Downstream Overhead:** Scan and index speed is accelerated 2-3x by removing HTML asset bundling and markdown generation.
2. **Headless & Embedded:** The engine operates as a headless local daemon or embedded TS module providing pure JSON code intelligence.
3. **100% Code Intelligence Parity:** Zero loss of resolution, graph traversal, cycle detection, or RAG search capability.

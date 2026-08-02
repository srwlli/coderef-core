# Pure Code Intelligence Engine Discovery (`coderef-intel-engine`)

**Audited:** 2026-08-01  
**Project:** `CODEREF-CORE` -> `coderef-intel-engine`  
**Vision:** Strip downstream consumers (doc generation, markdown exporters, context packing) into external consumers; isolate `coderef-core` as a high-throughput, local-first **Code Intelligence Feed Engine**.

---

## 1. Executive Discovery Summary

By stripping out documentation generation (`scripts/doc-gen/*`), static export formatting, and context report building into external downstream consumers, `coderef-core` collapses from 501 files down to a hyper-focused **Pure Code Intelligence Engine** (~180 files).

The extracted **Code Intelligence Engine (`coderef-intel-engine`)** serves a single, clear purpose:
> **Ingest multi-language source trees into a compiler-precise, queryable Code Knowledge Graph & Vector Substrate, exposing low-latency MCP & CLI intelligence feeds for AI agents, IDE plugins, and external documentation pipelines.**

---

## 2. Modules Retained vs. Extracted/Removed

| Retained in Core Intel Engine (`@engine/*`) | Extracted to External Downstream Consumers (`@downstream/*`) |
| :--- | :--- |
| **AST Parser & Grammar Registry:** Tree-Sitter multi-language extraction (`src/scanner/*`) | **Documentation Generation:** `scripts/doc-gen/generate-*.js`, `docs-analyzer.ts`, `docs-generator.ts` |
| **Pipeline Phase Middleware:** Discover, Scan, Import, Call, SCIP (`src/pipeline/*`) | **Report & Context Packing:** `export/`, `context-pack`, `mcp-response-format` UI shells |
| **Canonical Graph Engine:** Graph querying, path traversal, impact calculation (`src/query/*`) | **Static Map Asset Bundling:** `assets/map-viewer/` (served by external visualizer) |
| **Hybrid Search Substrate:** Dense vector embeddings + BM25 sub-token n-gram (`src/integration/rag/*`) | **External LLM Provider Adapters:** Cloud LLM integrations (Ollama local retained; cloud moved to proxy) |
| **AST Mutation & Refactoring Engine:** Tree-Sitter refactoring substrate (`src/refactor/*`) | **Formatting & Export CLI Bins:** `coderef-pack`, `coderef-rename` wrapper UI |
| **High-Performance Intelligence Feeds:** MCP Server & CLI Feeds (`src/cli/mcp/*`, `src/cli/*`) | |

---

## 3. Pure Intel Engine Interfaces (`@feed/mcp`, `@feed/cli`)

The extracted engine surfaces 4 standardized Intelligence Feeds to external consumers:
1. **Graph Intelligence Feed:** AST nodes, call edges, import resolution, inheritance, cycle detection, impact BFS.
2. **Search & RAG Intelligence Feed:** Hybrid BM25 n-gram + Ollama dense vector retrieval with RRF reranking.
3. **Refactoring & Mutation Feed:** AST-guarded symbol replacements and caller call-site updates.
4. **Event Streaming Feed:** Real-time incremental AST/graph delta events pushed over SSE.

# Extracted Surfaces Blueprint & Specification (`parsed-surfaces`)

**Status:** Blueprint / Downstream System Spec  
**Target Projects:** `coderef-map-viewer`, `coderef-doc-gen`, `coderef-context-pack`  

---

## 1. System Decoupling Overview

By extracting all downstream presentation and consumer components out of `coderef-core`, we create a clean boundary between **Intelligence Production** and **Intelligence Consumption**:

```
 [ CODEREF INTEL ENGINE ] (Headless Production)
          │
          ├── MCP Feeds ─────────► [ IDEs & Coding Agents ]
          ├── CLI JSON Streams ──► [ coderef-context-pack ]
          ├── MapData JSON ──────► [ coderef-map-viewer ]
          └── AST Metadata ──────► [ coderef-doc-gen ]
```

---

## 2. Detailed Consumer System Blueprint

### System 1: `coderef-map-viewer`
- **Repo / Package:** `@coderef/map-viewer`
- **Input Contract:** `MapData v1.8.0` JSON emitted over `/map/data.json` or MCP tool `get_map_data`.
- **Assets:** `tokens.css`, `viewer.css`, `viewer.js`, `graph.html`, `dashboard.html`.
- **Runtime:** Browser / Local HTTP Server (`--serve`).

### System 2: `coderef-doc-gen`
- **Repo / Package:** `@coderef/doc-gen`
- **Input Contract:** Element data, semantic headers, and dependency rules via `coderef-query --type=docs`.
- **Outputs:** Markdown resource sheets (`coderef/resource-sheets/*.md`), foundation documentation (`coderef/foundation-docs/*.md`), and architectural summaries.
- **Runtime:** Node.js CLI script / CI doc-generation workflow.

### System 3: `coderef-context-pack`
- **Repo / Package:** `@coderef/context-pack`
- **Input Contract:** Impact BFS, dependency rules, breaking-change diffs via `coderef-analyze --type=change-dossier`.
- **Outputs:** Token-budgeted context envelopes, LLM prompt packs, breaking change dossiers.
- **Runtime:** AI agent sidecar / CLI utility.

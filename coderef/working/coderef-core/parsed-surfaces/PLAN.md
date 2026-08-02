---
title: Extracted Presentation & Downstream Consumer Surfaces Architecture Plan
domain: CODEREF-CORE
status: open
created: 2026-08-01
stub_ref: null
---

# Extracted Presentation & Downstream Consumer Surfaces Plan (`parsed-surfaces`)

## Purpose
Define the architecture and breakdown for the systems extracted from `coderef-core`. By stripping presentation, visual graph rendering, documentation generation, and context packing out of the core engine, these components become independent downstream consumer projects that subscribe to the `coderef-intel-engine` MCP and CLI feeds.

---

## The 3 Extracted Consumer Systems

```mermaid
graph TD
    subgraph Core_Engine ["Pure Intelligence Engine (Headless Feed Producer)"]
        ENGINE["coderef-intel-engine<br/>(Graph, Search, Mutation, SSE Feeds)"]
    end

    subgraph Consumer_System_1 ["1. Visual Map Web Application"]
        MAP_APP["coderef-map-viewer<br/>(D3 / Canvas Map Web App)"]
    end

    subgraph Consumer_System_2 ["2. Documentation Generation Pipeline"]
        DOC_APP["coderef-doc-gen<br/>(Markdown Sheets & Foundation Docs)"]
    end

    subgraph Consumer_System_3 ["3. Context Packing & Prompt Dossier System"]
        PACK_APP["coderef-context-pack<br/>(AI Prompt Packager & Diff Reports)"]
    end

    ENGINE -->|Raw MapData JSON Feed| MAP_APP
    ENGINE -->|AST & Symbol Metadata| DOC_APP
    ENGINE -->|Blast Radius BFS & Impact| PACK_APP
```

---

## Extracted System Specs

### 1. `coderef-map-viewer` (Visual Map Web App & Canvas Renderer)
* **Responsibility:** Standalone Web Application / Local Viewer for visual graph mapping.
* **Consumes:** Emitted `MapData` JSON feed from `coderef-intel-engine`.
* **Features:** D3/Canvas node-link visualizer, zoom/pan controls, dark/light theme switching, layer drift overlays, metrics heatmaps, community clustering, and detail panel.
* **Separation Benefit:** The core engine no longer copies static CSS/JS assets or embeds HTML shells during repo scans.

### 2. `coderef-doc-gen` (Documentation Generation System)
* **Responsibility:** Automated documentation generator and resource-sheet authoring pipeline.
* **Consumes:** AST element facts, semantic headers, and symbol taxonomy from `coderef-intel-engine`.
* **Features:** Generates `coderef/resource-sheets/*.md`, `coderef/foundation-docs/*.md`, and project READMEs.
* **Separation Benefit:** Eliminates `scripts/doc-gen/` from the core engine, allowing doc generators to evolve independently without dirtying the engine scan loop.

### 3. `coderef-context-pack` (Context Packing & Report Exporter)
* **Responsibility:** Token-budgeted AI prompt packager and static change-dossier exporter.
* **Consumes:** Impact BFS, dependency rules, and breaking change deltas from `coderef-intel-engine`.
* **Features:** Bundles multi-file context dossiers for LLM prompts, generates pre-flight change reports, and produces static Markdown exports (`export/`).
* **Separation Benefit:** Keeps the core engine focused purely on graph query computation, leaving prompt formatting and token budgeting to dedicated client wrappers.

---

## Next Steps
When ready to promote this planning folder to a dedicated downstream project stub, run:
`/stub parsed-surfaces --category=feature --owner-domain=CODEREF-CORE`

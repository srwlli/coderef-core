---
title: Core Improvements 731 — Scope Stack, Refactoring Tools, Context Compression, & Standards-to-Code Graph
domain: coderef-core
status: open
created: 2026-07-31
stub_ref: null
---

# Core Improvements 731 — Scope Stack, Refactoring Tools, Context Compression, & Standards-to-Code Graph

## Purpose
Track, plan, and execute the remaining high-leverage feature extraction gaps identified in the `coderef-core` genre discovery audit against leading code intelligence tools (Stack Graphs, Serena, Repomix, GraphRAG / Doc-Graph / Rule-Graph).

---

## Detailed Breakdown of Where coderef-core Lacks

### 1. Scope-Stack Receiver Type Inference (GX-002 — Critical Gap)
* **What's missing:** Currently, `coderef-core` cannot resolve method calls on local variables or prototypes (`x.toFixed()`, `element.slice()`). ~~Out of ~17,280 unresolved edges in `coderef-core`, **62% (10,691 edges)** fail because of `receiver_not_in_symbol_table`.~~

  > **CORRECTED 2026-08-01 — do not quote the struck figure.** Measured on a clean scan at HEAD `41293bc`, the real population is **547 non-test src `receiver_not_in_symbol_table` edges**, which is **67% of the honest unresolved total (813)**. The 17,280 / 10,691 pair was taken against a scan universe polluted by the stale `dist-preXR` build tree (3,049 unresolved edges, 79% of `unresolved_src_count`) and before the test-DSL population was dispositioned. Intermediate figures 5,050 / 2,137 / 1,788 / 1,203 are all dead too. The share held (62% → 67%); only the absolute collapsed, by ~19x. See `EVIDENCE-scope-001-repopulate.md` and the `measured_baseline` block in the WO-RESOLVE-62 plan.
* **The Comp (Stack Graphs by GitHub):** Stack Graphs builds a scope-chain binding table (e.g., tracking `const x = new Foo()`) so that subsequent `x.method()` calls resolve deterministically to `Foo.method()`.
* **Fix:** Build a local-variable type inference pass on top of `call-resolver.ts`.

### 2. Symbol-Level Refactoring & Write Tools (GX-003 — Medium Gap)
* **What's missing:** `coderef-core` is largely a read-only intelligence system. It can locate all references (`find_all_references`) and preview renames (`rename_preview`), but has no write-capable MCP tool to perform AST-safe refactoring.
* **The Comp (Serena):** Serena provides LSP-backed code modification tools so AI agents can execute safe, project-wide renames and extractions.
* **Fix:** Expose a refactoring/rename write tool (`coderef-rename --apply`).

### 3. Token Context Compression (GX-004 — Medium Gap)
* **What's missing:** When feeding large code chunks to an LLM context window, `coderef-core` sends raw source code slices.
* **The Comp (Repomix):** Repomix uses Tree-sitter AST pruning to strip comments, white space, and implementation details while retaining function signatures, achieving ~70% token compression.
* **Fix:** Add a Tree-sitter context compression utility to `pack_context`.

### 4. Standards-to-Code Knowledge Graph & Rule-Graph Layer (GX-005 — Architectural & Refactoring Engine)
* **What's missing:** Standards documents (`docs/standards/`, `SKILLS/STANDARDS/`) are evaluated via standalone scripts rather than integrated directly into `.coderef/graph.json`.
* **The Comp (GraphRAG / Rule-Graph):** GraphRAG links unstructured policy/standards documentation to structured entity nodes in a graph.
* **Refactoring & Planning Value:**
  * **Automated Alignment Audits:** Before refactoring, the graph traverses `StandardNode -> governs -> CodeNode` to list all non-aligned modules automatically (e.g., missing `@layer` tags or layer boundary breaches).
  * **Standard-Guided Refactoring:** Agents use governing standard rules as an architectural magnet to decompose ad-hoc, monolithic code into compliant sub-modules.
  * **Drift Prevention:** `dependency_rules` and `change_dossier` catch rule violations prior to commits landing (`violates` edge detection).
* **Fix:** Introduce `StandardNode`s, `governed_by`, and `violates` edges into `graph.json` so `pack_context` and `dependency_rules` return governing standards alongside code neighbors.

---

## Approach Options

1. **Option A: Phased Implementation via Sub-Workorders**
   * Execute `GX-002` first (highest leverage — the `receiver_not_in_symbol_table` class is 67% of the honest unresolved population; see the CORRECTED note above for why the old "62% of 10,691" absolute is dead).
   * Follow with `GX-003` (symbol-level rename apply path).
   * Follow with `GX-004` (Tree-sitter context compression).
   * Conclude with `GX-005` (Standards-to-Code GraphRAG & Refactoring Alignment Layer).

2. **Option B: Parallel Feature Extraction**
   * Implement MCP tools in parallel across `src/cli/mcp/`.

---

## Decision
Adopt **Option A**: Focus on `GX-002` (Scope-Stack Receiver Resolution) as the next primary workorder since it delivers the single largest graph density/accuracy gain across `coderef-core`.

---

## Next Steps
When ready to promote to a tracked stub:
```bash
/stub core-improvements-731 --category=feature
```

# MCP Repo-Agnostic Fix — Scope & Tasks

**Stub:** STUB-1ZAR94  
**Owner domain:** CODEREF-CORE  
**Category:** fix  
**Priority:** medium  
**Blocking use case:** standards-identify --with-inventory bridge (cannot feed .coderef census into other projects' gap analyses)

---

## Problem Statement

The coderef-core MCP server is hard-wired to serve **only** CODEREF-CORE's `.coderef/graph.json`. All 14 MCP tools (codebase_summary, what_exports, what_imports, what_calls, find_element, find_all_references, hotspots, cycles, path_between, pack_context, rag_search, source_of, impact_of, validation_status) return the same fixed graph regardless of the caller's project.

**Observed limitation:**
- MCP user in automation/ project calls `what_exports("src/lib.ts")` → gets results from CODEREF-CORE/src/lib.ts (if it exists) or empty, never automation/'s version
- MCP user in ASSISTANT/ project calls `codebase_summary()` → always returns CODEREF-CORE's element counts (2,522 total, etc.), not ASSISTANT's

**Root cause:** Graph loading is hard-coded. Likely locations:
- `src/cli/coderef-mcp-server.ts` — the MCP entry point, loads graph at startup
- `src/pipeline/orchestrator.ts` — the query dispatch layer
- `src/scanner/scanner.ts` — if graph loading is there

---

## Solution Approach

**Add dynamic project_root resolution** to the MCP server with a 3-tier fallback:

1. **Explicit parameter** — caller provides `project_root` (e.g., `codebase_summary(project_root="/path/to/project")`)
2. **CWD inference** — MCP server walks up from the caller's working directory to find a `.coderef/graph.json`
3. **Configurable fallback** — environment variable (e.g., `CODEREF_ROOT`) or config file for default root

**Constraint:** All query tools keep their **identical contract** (same function signatures, same output shape). Only the graph source changes per-request/session.

---

## Concrete Scope

### Files to modify
- `src/cli/coderef-mcp-server.ts` — the MCP initialization; likely where graph loading happens
- `src/pipeline/orchestrator.ts` (and/or query handler layer) — where each tool dispatches queries; needs to select the right graph
- Potentially `src/scanner/scanner.ts` or a graph-loading utility — if graph I/O is factored out there

### MCP Tools affected (all 14)
1. codebase_summary
2. what_exports
3. what_imports
4. what_calls
5. find_element
6. find_all_references
7. hotspots
8. cycles
9. path_between
10. pack_context
11. rag_search
12. source_of
13. impact_of
14. validation_status

**Pattern:** Each tool needs to:
- Accept `project_root` (parameter or env fallback)
- Resolve `project_root` via the 3-tier strategy
- Load/validate `.coderef/graph.json` from that root
- Execute the query against that root's graph
- Return identical results (only source changes)

### Test surface
- **Verification:** Query automation/, ASSISTANT/, primary-sources/, and other indexed projects through the same MCP; confirm each returns its own census (element counts, hotspots, exports, etc. all match `.coderef` local output)
- **Regression:** CODEREF-CORE queries still work identically (backward compat)
- **Edge case:** Missing `.coderef/graph.json` in a requested project → graceful error (not silent fallback to CODEREF-CORE)

---

## Why This Matters

The standards-identify layer (STANDARDS domain) is building a **doc-gap identifier** that feeds `.coderef` element/export inventory into gap classification. That bridge is read-only and needs to query *other* projects' censuses (automation/, ASSISTANT/, etc.), not just CODEREF-CORE. Without repo-agnostic MCP:
- The bridge can only work for CODEREF-CORE (useless)
- Other projects cannot get their own element inventory through the MCP (blocked)
- Doc-type/consolidation/scatter identification cannot be automated (dead end)

**This fix unblocks the entire identify-bridge layer.**

---

## Explicit Sub-tasks (for WO authoring)

1. **Design** — choose the 3-tier resolution strategy in code (parameter vs env vs cwd walk)
2. **Audit** — map where graph loading happens (entry point? query layer? both?)
3. **Implement** — inject project_root resolution at the identified layers
4. **Test** — cross-project queries (automation/, ASSISTANT/, others) all work
5. **Regression** — CODEREF-CORE queries unchanged
6. **Error handling** — missing graph in requested project → fail loudly, not silently
7. **Documentation** — update MCP docs (if any) to reflect project_root parameter/fallback strategy

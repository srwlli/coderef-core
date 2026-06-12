# Team Notification Draft — coderef-mcp-server (P4-T5)

> Send AFTER main push lands. Channel: team chat (send-chat/Discord).

---

**NEW TOOL: `coderef-core` MCP server is live on main** (WO-CODEREF-CORE-MCP-SERVER-AND-INTELLIGENCE-FIXES-001)

CODEREF-CORE now ships a native MCP stdio server — `coderef-mcp-server` — that exposes a project's `.coderef/` intelligence as 6 read-only tools. Any MCP client (Claude Code, Claude Desktop) can now query the call graph directly instead of parsing `graph.json` by hand.

**The 6 tools** (registered under MCP domain `coderef-core` via `.mcp.json`):
- `what_calls` — resolved call sites invoking an element, with file:line
- `what_imports` — inbound resolved import edges
- `impact_of` — transitive dependents via reverse BFS (what breaks if this changes), depth 1-10, affected-files rollup
- `find_element` — index.json lookup by name / codeRefId / file substring, type filter, layer+capability facets
- `codebase_summary` — element totals by type, header coverage, graph stats
- `validation_status` — the 12-field locked ValidationReport verbatim

**Why inside coderef-core:** the previous external Python MCP server died of graph-schema drift (legacy source/target/type vs canonical 8-field edges). This one is typed against `ExportedGraph` — drift is now a compile error, not a runtime mystery. 17 unit tests lock the fixture to the exported schema.

**Element queries are forgiving:** codeRefId (`@Fn/src/foo.ts#bar:12`), line-less codeRefId, bare name, or file-path fragment (file queries aggregate the whole file). Ambiguous names return ≤5 candidates instead of guessing. Only resolved edges are traversed.

**Also in this drop:**
- `rag-index`/`rag-search` provider default is now **key-aware**: openai only if `OPENAI_API_KEY` is set, else ollama/nomic-embed-text. Local-first; cloud is opt-in, never a silent default.
- `rag-index --include-headerless` — RAG on repos that were never header-annotated (chunks tagged `header:false`). Fixes the "RAG path unusable on header-less repos" gap from the PS rescan.
- `--coverage-floor`/`--strict-coverage` now surfaced in `rag-index --help`.

**Setup (Claude Code):** drop an `.mcp.json` in your repo root:
```json
{
  "mcpServers": {
    "coderef-core": {
      "command": "node",
      "args": ["<CODEREF-CORE>/dist/src/cli/coderef-mcp-server.js", "--project-dir", "<your-project>"]
    }
  }
}
```
Prereq: run the pipeline first so `.coderef/graph.json` + `index.json` exist. Docs: `docs/CLI.md#coderef-mcp-server`.

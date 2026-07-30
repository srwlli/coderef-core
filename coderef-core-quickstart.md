---
skill_name: coderef-core-quickstart
version: 1.0.0
category: WORKFLOW
description: Core scanning and parsing library for the CodeRef system (CLI + MCP server)
project_type: node
generated_at: 2026-07-18T17:12:56Z
prerequisites: ["Node.js >= 20", "npm"]
time_estimate: 5-10 minutes
success_indicator: "Build produces dist/, npx vitest passes, coderef-scan --help responds"
---

# @coderef/core — Quick Start

> Core scanning and parsing library for the CodeRef system. Ships a family of CLIs (scan, populate, pipeline, rag-*, map, mcp-server) and an MCP stdio server — not an HTTP web service.

## When to Use

This guide is for getting `@coderef/core` running locally for development or testing.
Follow these steps to install dependencies, build the TypeScript, run the test suite,
and verify the CLIs respond. There is no long-running HTTP server and no ports to
bind — the deliverables are CLI binaries and an MCP stdio server.

## Prerequisites

- [ ] Node.js >= 20 installed (run: `node --version`) — enforced by `engines` in package.json
- [ ] npm available (run: `npm --version`)
- [ ] (Optional) Ollama running locally if you will exercise the RAG/embedding path — this repo uses local Ollama only, never a cloud LLM key

## Environment Setup

<!-- NOTE: No .env is required for the core scan/build/test path. RAG/embedding tooling reads local Ollama config; add vars here only if your workflow needs them. -->

## Steps

### Step 1: Install Dependencies

**Input:** Project root (`C:\Users\willh\Desktop\CODEREF\CODEREF-CORE`)
**Action:** `npm install`
**Output:** `node_modules/` populated (tree-sitter grammars, @babel/*, MCP SDK, zod, etc.)
**Verify:** `npm list --depth=0` lists dependencies with no missing-peer errors

### Step 2: Build the Library and CLIs

**Input:** Installed dependencies
**Action:** `npm run build` (runs `npx tsc && npm run build:cli` — main tsconfig then `tsconfig.cli.json`)
**Output:** Compiled JS + type declarations under `dist/`, including `dist/src/cli/*.js`
**Verify:** `dist/index.js` and `dist/src/cli/scan.js` exist

> Note: the CLIs build under `tsconfig.cli.json` specifically. A plain `npx tsc` alone
> does not emit the CLI bins — always use `npm run build` (or `npm run build:cli`) to
> refresh them, or you will run stale CLI dist.

### Step 3: Run the Test Suite

**Input:** Built project
**Action:** `npx vitest` (or `npm test`)
**Output:** Vitest run summary
**Verify:** Suite passes (green). `npx vitest --coverage` reports coverage if you need it.

### Step 4: Confirm the CLIs Respond

**Input:** Successful build (`dist/` present)
**Action:** Invoke a CLI, e.g. `node dist/src/cli/scan.js --help` (or the linked `coderef-scan --help` after `npm link`)
**Output:** CLI usage/help text
**Verify:** Command exits 0 and prints help. Try `coderef-map --help` and `coderef-mcp-server --help` too.

## Key Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run build` | Compile library + CLIs (`tsc` + `build:cli`) to `dist/` |
| `npm run build:cli` | Rebuild only the CLI bins under `tsconfig.cli.json` |
| `npm run dev` | `tsc --watch` for incremental rebuilds during development |
| `npm test` | Run the vitest suite (`npx vitest`) |
| `npm run test:coverage` | Run tests with coverage |
| `npm run clean` | Remove `dist/` (`rimraf dist`) |

## CLI Binaries

Built to `dist/src/cli/` and exposed as `bin` entries (available on PATH after `npm link` or global install):

| Binary | Purpose |
|---|---|
| `coderef-scan` | Scan a repo and emit CodeRef analysis artifacts |
| `populate-coderef` | Populate a project's `.coderef/` outputs |
| `coderef-pipeline` | Run the end-to-end indexing/analysis pipeline |
| `coderef-map` | Build/serve the repo graph map (`data.json`, static or `--serve`) |
| `coderef-watch` | Watch mode for incremental re-scan |
| `coderef-analyze` / `coderef-query` | Analyze and query the scanned graph |
| `coderef-rename` | Preview/apply symbol renames |
| `coderef-pack` | Pack context for downstream agents |
| `rag-index` / `rag-search` / `rag-status` / `rag-eval` | RAG index build, query, status, evaluation (local Ollama) |
| `coderef-rag-server` | Long-running RAG query server |
| `coderef-mcp-server` | MCP stdio server exposing the CodeRef tool surface |
| `coderef-detect-languages` / `coderef-semantic-integration` | Language detection and semantic integration helpers |
| `validate-routes` / `scan-frontend-calls` | Route validation and frontend-call scanning |

## Common Issues

### Build succeeds but CLIs are stale or missing
**Symptom:** `dist/src/cli/*.js` is out of date or absent after editing CLI code
**Fix:** The CLIs compile under `tsconfig.cli.json`. Run `npm run build` (or `npm run build:cli`) — a bare `npx tsc` does not emit them.

### MODULE_NOT_FOUND on a CLI
**Symptom:** `Cannot find module '.../dist/...'`
**Fix:** Run `npm install` then `npm run build`; ensure you invoke the `dist/` path, not `src/`.

### RAG / embedding commands fail to reach a model
**Symptom:** RAG index/search errors on the embedding call
**Fix:** This repo uses **local Ollama only** — start Ollama locally. No cloud LLM/API key is wired as a default and none should be added.

### tree-sitter native build errors on install
**Symptom:** `npm install` fails compiling a `tree-sitter-*` grammar
**Fix:** Ensure a working native toolchain for your platform (node-gyp prerequisites), then reinstall.

## Example Output

```
<!-- NOTE: paste real output from `coderef-scan --help` or a `npm test` run here. -->
```

## Next Steps

- Read `README.md` and `guide-to-coderef-core.md` for the full feature tour
- Explore `docs/` (e.g. `docs/CLI.md`, the map user guide) for command references
- Try `coderef-map <root> --git` to build the repo graph, then open the viewer
- Wire the MCP server (`coderef-mcp-server`) into your agent client — all `mcp__coderef-core__*` tools require a `project_root`

## See Also

- Project documentation: `README.md`, `guide-to-coderef-core.md`, `VISION.md`, `roadmap.md`
- CLI reference: `docs/CLI.md`
- Map guide: `docs/MAP-USER-GUIDE.md`

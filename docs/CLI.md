# CodeRef CLI Reference

Complete reference for the CodeRef command-line interface.

---

## Installation

```bash
# Via npm (when published)
npm install -g @coderef/core

# Via npx (no install)
npx @coderef/core <command>

# Local development
npm run build:cli
node dist/src/cli/index.js <command>
```

---

## Command Overview

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| [`coderef-scan`](#coderef-scan) | Scan code for elements | `--dir`, `--lang`, `--recursive`, `--useAST` |
| [`coderef-populate`](#coderef-populate) | Generate .coderef/ artifacts | `--dir`, `--clean`, `--skip-drift` |
| [`coderef-rag-index`](#coderef-rag-index) | Index code for RAG search | `--dir`, `--chroma-url`, `--ollama-url` |
| [`coderef-rag-search`](#coderef-rag-search) | Search indexed code | `--query`, `--type`, `--max-results` |
| [`coderef-rag-status`](#coderef-rag-status) | Check RAG index status | `--dir`, `--chroma-url` |
| [`coderef-pipeline`](#coderef-pipeline) | Unified scan→populate→docs→RAG orchestrator (Ollama-only RAG) | `--project-dir`, `--only`, `--skip`, `--ollama-base-url`, `--ollama-model`, `--rag-reset` |
| [`coderef-watch`](#coderef-watch) | Workspace file-watcher daemon for foundation-docs freshness | `--project-dir`, `--debounce-ms`, `--once`, `--no-pipeline`, `--json` |
| [`coderef-rag-server`](rag-http-api.md) | Always-on HTTP RAG server for cross-runtime callers (port 52849) | `--port`, `--help` |
| [`scan-frontend-calls`](#scan-frontend-calls) | Detect frontend API calls | `--dir`, `--pattern`, `--output` |
| [`validate-routes`](#validate-routes) | Validate API route definitions | `--dir`, `--strict`, `--fix` |
| [`detect-languages`](#detect-languages) | Detect project languages | `--dir`, `--json` |

---

## coderef-pipeline

Unified orchestrator that chains the four standard CodeRef legs in order
against a single target project: **scan → populate → foundation-docs → RAG**.

### Usage

```bash
# Run the full pipeline against the current directory
npx coderef-pipeline

# Target an external project
npx coderef-pipeline --project-dir /path/to/project

# Skip the rag leg
npx coderef-pipeline --project-dir /path/to/project --skip rag

# Only run docs and rag
npx coderef-pipeline --project-dir /path/to/project --only docs,rag

# Reset the RAG vector store (use when changing embedding model dimensions)
npx coderef-pipeline --project-dir /path/to/project --rag-reset

# Plan-only (no side effects)
npx coderef-pipeline --project-dir /path/to/project --dry-run
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--project-dir <path>` | Target project root. Propagated to populate, doc-gen, and rag-index. | `process.cwd()` |
| `--only <legs>` | Comma-separated subset to run (`scan`, `populate`, `docs`, `rag`). | All legs |
| `--skip <legs>` | Comma-separated legs to skip. | None |
| `--ollama-base-url <url>` | Ollama endpoint used by the rag leg. | `http://localhost:11434` or `CODEREF_LLM_BASE_URL` |
| `--ollama-model <name>` | Ollama embedding model. | `nomic-embed-text` or `CODEREF_LLM_MODEL` |
| `--rag-reset` | Reset the RAG vector store before indexing. | `false` |
| `--dry-run` | Print the plan; do not execute. | `false` |
| `-v, --verbose` | Forward `--verbose` to sub-commands. | `false` |
| `-h, --help` | Show help. | — |

### Leg order

1. **scan** — `coderef-scan <project-dir>`
2. **populate** — `populate-coderef <project-dir>` (writes `.coderef/`).
3. **docs** — `node scripts/doc-gen/generate-{index,exports,hotspots,relationships}-md.js --project-dir=<path>` (writes `coderef/foundation-docs/`).
4. **rag** — `rag-index --project-dir <path>` (writes `.coderef/coderef-vectors.json` for the vector store and `.coderef-rag-index.json` for incremental indexing state).

### Local-only RAG constraint

The `rag` leg is invoked with `CODEREF_RAG_LOCAL_ONLY=1` and
`CODEREF_LLM_PROVIDER=ollama` set on the child process unconditionally.
**Cloud LLM providers (OpenAI, Anthropic) are not reachable through this
surface.** Both the `RAGConfigLoader` and the `rag-index` CLI's parseArgs
honor the local-only flag and reject cloud-provider selection with a
`ConfigError` when it is set.

If you need cloud RAG, invoke `rag-index` directly without the
`CODEREF_RAG_LOCAL_ONLY` flag.

### Failure semantics

- Each leg is a child process. The orchestrator short-circuits on the
  first non-zero exit code; subsequent legs report `skip` in the summary.
- The summary table prints leg / status / duration regardless of outcome.
- Leg-level stderr tails (last 20 lines) are surfaced when a leg fails.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `CODEREF_RAG_LOCAL_ONLY` | Set to `1` to forbid cloud LLM providers. The orchestrator sets this for the rag leg automatically. |
| `CODEREF_LLM_PROVIDER` | Provider name (`ollama` for local-only). |
| `CODEREF_LLM_BASE_URL` | Ollama (or other local) endpoint. |
| `CODEREF_LLM_MODEL` | Ollama embedding model. |

---

## coderef-watch

Workspace file-watcher daemon for foundation-docs freshness. Watches the project via chokidar, debounces edits (default 30s), and on each flush spawns `coderef-pipeline --only scan,populate,docs`. After every flush attempt, writes `{project-dir}/.coderef/last-scan.json` atomically (temp + rename) so LLOYD can compute `doc_age_seconds = now − last_scan_at` cheaply on every pre-prompt assembly.

WO-CHOKIDAR-DOC-FRESHNESS-DAEMON-001.

### Operational expectation

**`coderef-watch` runs in the CONSUMER WORKSPACE, NOT in the LLOYD process.** Each consumer machine runs one daemon per active workspace. Per-OS service-unit instructions (systemd / launchd / Windows Service / pm2 / manual): see [DEPLOY-CODEREF-WATCH.md](DEPLOY-CODEREF-WATCH.md).

### Usage

```bash
# Daemon mode against the current workspace
npx coderef-watch --project-dir "$(pwd)"

# Custom debounce window
npx coderef-watch --project-dir /abs/path --debounce-ms 60000

# One-shot run (no daemon, no watch loop) - useful for cron / health checks
npx coderef-watch --project-dir /abs/path --once

# Debug: log change events but do NOT spawn the pipeline
npx coderef-watch --project-dir /abs/path --no-pipeline --json
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --project-dir <path>` | Workspace root to watch | `process.cwd()` |
| `--debounce-ms <n>` | Debounce window in milliseconds | `30000` (per LLOYD D2 spec) |
| `-l, --languages <csv>` | File extensions to watch | `ts,tsx,js,jsx,py,go,rs,java,cpp,c` |
| `--exclude <csv>` | Additional glob patterns to exclude | `(none — defaults already exclude node_modules, dist, .git, .coderef, foundation-docs)` |
| `--include-rag` | Also run the RAG leg on each flush | off (RAG re-index is too expensive for debounce; out of scope per WO) |
| `--once` | Run pipeline once against the workspace and exit | off (daemon mode) |
| `--no-pipeline` | Log change events only; do NOT spawn pipeline | off (debug) |
| `-j, --json` | Heartbeat-only structured stdout (one JSON line per flush) | off |
| `-v, --verbose` | Verbose logging (forwarded to coderef-pipeline) | off |
| `-h, --help` | Show help | — |

### Heartbeat schema

Path: `{project-dir}/.coderef/last-scan.json`. Schema: [`src/cli/coderef-watch-heartbeat.schema.json`](../src/cli/coderef-watch-heartbeat.schema.json) (v1).

```json
{
  "schema_version": 1,
  "last_scan_at": "2026-04-26T01:30:00Z",
  "paths_changed": ["src/cli/foo.ts", "src/scanner/bar.ts"],
  "status": "pass",
  "exit_reason": "pipeline_ok",
  "exit_code": 0,
  "duration_ms": 4823,
  "pid": 18432,
  "alive_at": "2026-04-26T01:30:00Z",
  "trigger": { "kind": "debounce", "cwd": "/abs/path/to/project" }
}
```

LLOYD-side read pattern (Python): see [LLOYD-INTEGRATION.md](LLOYD-INTEGRATION.md).

### Events

| Sink | Path | When |
|---|---|---|
| Local audit | `{project-dir}/.coderef/watch-events.jsonl` | Every flush, always |
| Session events | `LOGS/SESSIONS/{sid}/{domain}/events.jsonl` | Every flush, only when `CODEREF_SESSION_ID` is set in env (best-effort, non-blocking) |

Session events conform to WO-SESSIONS-EVENT-EMISSION-PROTOCOL-001 with `type=coderef_watch_flush`, `source=coderef-watch`.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `CODEREF_SESSION_ID` | If set, every flush forwards a session event to `LOGS/SESSIONS/{id}/{domain}/events.jsonl` |
| `CODEREF_AGENT_DOMAIN` | Agent domain to record on forwarded session events (default `CODEREF-CORE`) |
| `CODEREF_LOG_SESSION_EVENT_SCRIPT` | Override path to `scripts/log-session-event.mjs` (default: ASSISTANT repo location) |

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success — `--once` mode finished, OR `--no-pipeline` flush was skipped intentionally, OR daemon shut down on SIGINT/SIGTERM |
| `1` | Pipeline failed (`status: fail`); see `exit_reason` in heartbeat |
| `2` | Invalid arguments or `--project-dir` not found |

### See also

- [DEPLOY-CODEREF-WATCH.md](DEPLOY-CODEREF-WATCH.md) — per-OS service-unit instructions
- [LLOYD-INTEGRATION.md](LLOYD-INTEGRATION.md) — LLOYD read pattern + per-task-type policy

---

## coderef-scan

Scan a codebase for code elements (functions, classes, components, hooks).

### Usage

```bash
npx coderef-scan --dir ./src --lang ts,tsx --recursive
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-d, --dir <path>` | Directory to scan | Current directory |
| `-l, --lang <langs>` | Comma-separated languages | `ts,tsx,js,jsx,py,go,rs,java,cpp,c` |
| `-r, --recursive` | Scan recursively | `true` |
| `--useAST` | Use AST parsing for TS/JS | `false` |
| `--useTreeSitter` | Use tree-sitter parsing | `false` |
| `--fallbackToRegex` | Fallback to regex on AST failure | `true` |
| `--parallel` | Use parallel processing | `false` |
| `--includeComments` | Include commented code | `false` |
| `--exclude <patterns>` | Exclude patterns (comma-separated) | See default excludes |
| `-v, --verbose` | Verbose output | `false` |
| `--cache` | Use incremental cache | `true` |
| `--output <path>` | Output file (JSON) | stdout |

### Examples

```bash
# Basic scan
npx coderef-scan --dir ./src

# Scan with AST parsing
npx coderef-scan --dir ./src --lang ts --useAST

# Scan single language with parallel mode
npx coderef-scan --dir ./src --lang ts --parallel

# Exclude patterns
npx coderef-scan --dir ./src --exclude "**/*.test.ts,**/node_modules/**"

# Output to file
npx coderef-scan --dir ./src --output ./scan-results.json
```

### Output Format

```json
{
  "elements": [
    {
      "type": "function",
      "name": "calculateTotal",
      "file": "src/utils/math.ts",
      "line": 15,
      "exported": true,
      "imports": [...],
      "calls": [...]
    }
  ],
  "stats": {
    "filesScanned": 42,
    "elementsFound": 156,
    "duration": 1234
  }
}
```

---

## coderef-populate

Generate `.coderef/` directory artifacts from the canonical scanner pipeline. `.coderef/index.json` is the machine truth. `semantic-registry.json` is generated as a projection from the enriched `ElementData` in `index.json`; source headers are optional and are not written by default.

`ElementData` emitted by the pipeline includes canonical CodeRef IDs plus the Phase 1 identity taxonomy fields: `layer`, `capability`, `constraints`, and `headerStatus`. The scanner defaults `headerStatus` to `missing`; it does not parse or validate source headers in this phase.

### Usage

```bash
npx populate-coderef ./my-project --mode full
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `PROJECT_DIR` | Project directory positional argument | Current directory |
| `-l, --lang <languages>` | Comma-separated language extensions | Auto-detect |
| `-o, --output <path>` | Output directory | `{PROJECT_DIR}/.coderef` |
| `-m, --mode <mode>` | `full`, `minimal`, or `context` | `full` |
| `--select <generators>` | Run only specific generators | Mode default |
| `-s, --skip <generators>` | Skip specific generators | None |
| `--semantic-registry` | Generate `semantic-registry.json` projection | `true` |
| `--semantic` | Legacy alias for `--semantic-registry` | `true` |
| `--no-semantic-registry` | Remove/skip `semantic-registry.json` projection | `false` |
| `--source-headers` | Write optional CodeRef-Semantics headers into source files | `false` |
| `-j, --json` | Output JSON summary | `false` |
| `-v, --verbose` | Verbose output | `false` |

### Examples

```bash
# Populate .coderef/ with defaults
npx populate-coderef ./my-project

# Minimal machine-truth outputs only
npx populate-coderef ./my-project --mode minimal

# Generate optional human-facing source headers
npx populate-coderef ./my-project --source-headers
```

### Generated Artifacts

```
.coderef/
├── index.json          # Canonical ElementData machine truth
├── semantic-registry.json # Query-optimized projection from index.json
├── graph.json          # Dependency graph with normalized paths
├── context.md          # Project context
├── reports/
│   ├── drift.json      # Code drift analysis
│   ├── quality.json    # Quality metrics
│   └── complexity.json # Complexity analysis
└── exports/
    └── diagram.md      # Mermaid diagram
```

---

## coderef-rag-index

Index codebase into a vector database for semantic search.

### Usage

```bash
npx coderef-rag-index --dir ./src --chroma-url http://localhost:8000
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-d, --dir <path>` | Directory to index | Current directory |
| `--chroma-url <url>` | ChromaDB server URL | `http://localhost:8000` |
| `--ollama-url <url>` | Ollama server URL | `http://localhost:11434` |
| `--model <name>` | Embedding model | `nomic-embed-text` |
| `--batch-size <n>` | Batch size for indexing | `100` |
| `--skip-existing` | Skip already-indexed files | `false` |
| `-v, --verbose` | Verbose output | `false` |

### Examples

```bash
# Index with local ChromaDB
npx coderef-rag-index --dir ./src

# Index with remote ChromaDB
npx coderef-rag-index --dir ./src --chroma-url https://chroma.example.com

# Use specific embedding model
npx coderef-rag-index --dir ./src --model all-minilm

# Incremental indexing
npx coderef-rag-index --dir ./src --skip-existing
```

### Prerequisites

- ChromaDB server running (local or remote)
- Ollama server running (for embeddings)

---

## coderef-rag-search

Search indexed codebase using natural language queries.

### Usage

```bash
npx coderef-rag-search --query "authentication middleware" --type function
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-q, --query <text>` | Search query (required) | - |
| `-t, --type <type>` | Filter by element type | All types |
| `--max-results <n>` | Maximum results | `10` |
| `--threshold <score>` | Minimum similarity score | `0.7` |
| `--chroma-url <url>` | ChromaDB server URL | `http://localhost:8000` |
| `--ollama-url <url>` | Ollama server URL | `http://localhost:11434` |
| `--model <name>` | Embedding model | `nomic-embed-text` |
| `--json` | Output as JSON | `false` |

### Examples

```bash
# Basic search
npx coderef-rag-search --query "user login function"

# Filter by type
npx coderef-rag-search --query "database connection" --type class

# Higher threshold for precision
npx coderef-rag-search --query "error handling" --threshold 0.85

# JSON output for piping
npx coderef-rag-search --query "API routes" --json | jq '.results[]'
```

### Output Format

```json
{
  "query": "authentication middleware",
  "results": [
    {
      "element": {
        "type": "function",
        "name": "authMiddleware",
        "file": "src/middleware/auth.ts",
        "line": 23
      },
      "score": 0.89,
      "context": "..."
    }
  ]
}
```

---

## coderef-rag-status

Check the status of the RAG index.

### Usage

```bash
npx coderef-rag-status --dir ./src
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-d, --dir <path>` | Project directory | Current directory |
| `--chroma-url <url>` | ChromaDB server URL | `http://localhost:8000` |
| `--json` | Output as JSON | `false` |

### Examples

```bash
# Check status
npx coderef-rag-status --dir ./src

# JSON output
npx coderef-rag-status --dir ./src --json
```

### Output

```
RAG Index Status
================
Collection: coderef_src_abc123
Documents: 1,247
Last Updated: 2026-04-23T18:30:00Z
Status: ✓ Connected
```

---

## scan-frontend-calls

Detect and analyze frontend API calls.

### Usage

```bash
npx scan-frontend-calls --dir ./src --pattern "fetch|axios"
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-d, --dir <path>` | Directory to scan | Current directory |
| `-p, --pattern <regex>` | Call pattern to match | `fetch\|axios\|http` |
| `--output <path>` | Output file | stdout |
| `--group-by <field>` | Group results by file/route | `file` |
| `-v, --verbose` | Verbose output | `false` |

### Examples

```bash
# Scan for all API calls
npx scan-frontend-calls --dir ./src

# Custom pattern
npx scan-frontend-calls --dir ./src --pattern "api\.get|api\.post"

# Output to file
npx scan-frontend-calls --dir ./src --output ./api-calls.json

# Group by API route
npx scan-frontend-calls --dir ./src --group-by route
```

### Output Format

```json
{
  "calls": [
    {
      "file": "src/services/user.ts",
      "line": 45,
      "pattern": "fetch",
      "target": "/api/users",
      "method": "GET",
      "context": "fetch('/api/users')"
    }
  ],
  "summary": {
    "totalCalls": 23,
    "uniqueEndpoints": 8
  }
}
```

---

## validate-routes

Validate API route definitions for consistency and correctness.

### Usage

```bash
npx validate-routes --dir ./src --strict
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-d, --dir <path>` | Directory to scan | Current directory |
| `--strict` | Strict validation mode | `false` |
| `--fix` | Auto-fix issues where possible | `false` |
| `--include <patterns>` | Include patterns | All files |
| `--exclude <patterns>` | Exclude patterns | `node_modules,tests` |
| `--output <path>` | Report output | stdout |

### Examples

```bash
# Basic validation
npx validate-routes --dir ./src

# Strict mode
npx validate-routes --dir ./src --strict

# Auto-fix issues
npx validate-routes --dir ./src --fix

# Output report
npx validate-routes --dir ./src --output ./route-report.json
```

### Validation Rules

- Route path format consistency
- HTTP method validation
- Parameter naming conventions
- Duplicate route detection
- Missing handler detection

### Output

```
Route Validation Report
======================
✓ Valid routes: 42
⚠ Warnings: 3
✗ Errors: 1

Errors:
  - src/routes/user.ts:23: Duplicate route '/api/users/:id'
```

---

## detect-languages

Detect programming languages used in a project.

### Usage

```bash
npx detect-languages --dir ./src --json
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-d, --dir <path>` | Directory to scan | Current directory |
| `--json` | Output as JSON | `false` |
| `--threshold <percent>` | Minimum percentage to include | `1` |
| `--exclude <patterns>` | Exclude patterns | `node_modules,dist` |

### Examples

```bash
# Basic detection
npx detect-languages --dir ./src

# JSON output
npx detect-languages --dir ./src --json

# Higher threshold
npx detect-languages --dir ./src --threshold 5
```

### Output

```
Language Detection Results
===========================
TypeScript: 68.5% (342 files)
JavaScript: 15.2% (76 files)
Python: 8.3% (42 files)
CSS: 5.4% (27 files)
JSON: 2.6% (13 files)
```

JSON format:
```json
{
  "languages": [
    { "name": "TypeScript", "percentage": 68.5, "files": 342 },
    { "name": "JavaScript", "percentage": 15.2, "files": 76 }
  ],
  "totalFiles": 500
}
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CODEREF_CACHE_DIR` | Cache directory location | `.coderef/cache` |
| `CHROMA_URL` | ChromaDB server URL | `http://localhost:8000` |
| `OLLAMA_URL` | Ollama server URL | `http://localhost:11434` |
| `CODEREF_VERBOSE` | Enable verbose logging | `false` |
| `CODEREF_PARALLEL` | Enable parallel processing | `false` |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error |
| `2` | Invalid arguments |
| `3` | File not found |
| `4` | Network error (RAG commands) |
| `5` | Validation failed |

---

## Troubleshooting

### Command not found

```bash
# Ensure CLI is built
npm run build:cli

# Or use npx
npx @coderef/core <command>
```

### ChromaDB connection failed

```bash
# Start ChromaDB locally
docker run -p 8000:8000 chromadb/chroma:latest

# Or specify remote URL
export CHROMA_URL=https://chroma.example.com
```

### Ollama connection failed

```bash
# Start Ollama locally
ollama serve

# Pull embedding model
ollama pull nomic-embed-text
```

### Performance issues

```bash
# Use parallel mode for large codebases
npx coderef-scan --dir ./src --parallel

# Skip expensive operations
npx coderef-populate --skip-graph --skip-reports

# Use incremental cache
npx coderef-scan --cache
```

---

## Contributing

To add a new CLI command:

1. Create `src/cli/<command-name>.ts`
2. Implement command using `Command` from `commander`
3. Export command factory function
4. Register in `src/cli/index.ts`
5. Add tests in `__tests__/<command-name>.test.ts`
6. Document in this file

---

## See Also

- [Scanner Implementation](../coderef/reference/SCANNER-IMPLEMENTATION-REFERENCE.md)
- [RAG System](../coderef/resource/RAG-SYSTEM.md)
- [API Reference](./API.md)

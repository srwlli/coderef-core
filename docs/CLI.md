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
| [`coderef-populate`](#coderef-populate) | Generate .coderef/ artifacts (Phase 6 chokepoint) | `--mode`, `--strict-headers`, `--source-headers` |
| [`coderef-rag-index`](#coderef-rag-index) | Index code for RAG search (gated on `validation-report.json.ok`) | `--provider`, `--store`, `--include-headerless`, `--coverage-floor` |
| [`coderef-rag-search`](#coderef-rag-search) | Search indexed code with optional facet filters | `--top-k`, `--type`, `--layer`, `--capability` |
| [`coderef-mcp-server`](#coderef-mcp-server) | Repo-agnostic MCP stdio server exposing `.coderef` intelligence as 23 tools (read + `.coderef`-write); `project_root` required per call | `--project-dir` (anchor) |
| `rag-eval` | Golden-query eval harness: hit@1/hit@5/MRR against `eval/golden-queries.json`; committed baseline at `eval/baseline.json` | `--project-dir`, `--golden`, `--top-k`, `--json`, `--min-mrr` |
| [`coderef-rag-status`](#coderef-rag-status) | Check RAG index status | `--project-dir`, `--json` |
| [`coderef-pipeline`](#coderef-pipeline) | Unified scan→populate→docs→RAG orchestrator (Ollama-only RAG) | `--project-dir`, `--only`, `--skip`, `--ollama-base-url`, `--ollama-model`, `--rag-reset` |
| [`coderef-watch`](#coderef-watch) | Workspace file-watcher daemon for foundation-docs freshness (incremental by default) | `--project-dir`, `--debounce-ms`, `--full`, `--once`, `--no-pipeline`, `--json` |
| [`coderef-rag-server`](rag-http-api.md) | Always-on HTTP RAG server for cross-runtime callers (port 52849) | `--port`, `--help` |
| [`scan-frontend-calls`](#scan-frontend-calls) | Detect frontend API calls | `--dir`, `--pattern`, `--output` |
| [`validate-routes`](#validate-routes) | Validate API route definitions | `--dir`, `--strict`, `--fix` |
| [`coderef-analyze`](#coderef-analyze) | Run a single analysis pass (config, contracts, DB, patterns, complexity, impact, breaking-changes, etc.) | `--project`, `--type`, `--output`, `--element`, `--depth`, `--from`, `--to` |
| [`coderef-query`](#coderef-query) | Execute a relationship query over canonical `.coderef/graph.json` (calls, imports, depends-on, shortest-path, all-paths) | `--project`, `--type`, `--target`, `--source`, `--depth`, `--format` |
| [`coderef-detect-languages`](#coderef-detect-languages) | Detect programming languages used in a project | `--project`, `--ignore-file`, `--json` |
| [`coderef-semantic-integration`](#coderef-semantic-integration) | Run semantic header generation and registry sync | `--project`, `--output`, `--registry`, `--dry-run`, `--file`, `--validate-idempotency` |

---

## coderef-pipeline

Unified orchestrator that chains the four standard CodeRef legs in order
against a single target project: **scan → populate → foundation-docs → RAG**.

### Usage

```bash
# Target a project (--project-dir is required)
npx coderef-pipeline --project-dir /path/to/project

# Positional path alias (equivalent to --project-dir)
npx coderef-pipeline /path/to/project

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
| `--project-dir <path>` | Target project root (**required**). Propagated to populate, doc-gen, and rag-index. Also accepts first positional argument. | — |
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

Workspace file-watcher daemon for foundation-docs freshness. Watches the project via chokidar, debounces edits (default 30s), and on each flush runs a **graph-safe incremental populate by default** (STUB-6TKGW7): the debounced changed-file snapshot goes to `populate --changed-files` (re-scan only changed files, resolve against the persisted full fact set — byte-identical to a full rebuild, proven by the RISK-02 parity gate; fail-closed to a full build on the first flush when no fact set exists yet), then the `docs` (and `rag`, unless RAG is skipped) legs refresh so **all** artifacts stay fresh, not just graph/index (STUB-9DN53Q). Pass `--full` to opt back into an always-full `coderef-pipeline --only scan,populate,docs[,rag]` on every flush. After every flush attempt, writes `{project-dir}/.coderef/last-scan.json` atomically (temp + rename) so LLOYD can compute `doc_age_seconds = now − last_scan_at` cheaply on every pre-prompt assembly.

WO-CHOKIDAR-DOC-FRESHNESS-DAEMON-001. Incremental leg: WO-AGENT-NATIVE-CAPABILITY-GAPS-001 P5/RISK-02 + WO-RESOLVER-SYMBOL-TABLE-DEDUP-FIX-001 follow-ups (STUB-9DN53Q docs/RAG refresh, STUB-6TKGW7 default flip).

### Operational expectation

**`coderef-watch` runs in the CONSUMER WORKSPACE, NOT in the LLOYD process.** Each consumer machine runs one daemon per active workspace. Per-OS service-unit instructions (systemd / launchd / Windows Service / pm2 / manual): see [DEPLOY-CODEREF-WATCH.md](DEPLOY-CODEREF-WATCH.md).

### Usage

```bash
# Daemon mode against the current workspace (incremental populate + docs/RAG by default)
npx coderef-watch --project-dir "$(pwd)"

# Opt out of incremental — always-full pipeline on every flush
npx coderef-watch --project-dir "$(pwd)" --full

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
| `--include-rag` | Also run the RAG leg on each flush (the incremental leg's RAG re-index is itself incremental — only changed files re-embed, stale vectors pruned) | off (RAG opt-in) |
| `--incremental` | Graph-safe incremental populate + docs/RAG refresh. **Now the default** — this flag is a no-op kept for back-compat | **on (default)** |
| `--full`, `--no-incremental` | Opt out of incremental: run the always-full pipeline (`scan,populate,docs[,rag]`) on every flush | off |
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

> **Scan-count vs index-count:** `coderef-scan` reports the raw scan-pass element count, which is **expected to be higher** than the element count in `populate-coderef`'s `.coderef/index.json`. They are produced by two independent extractors: the scan CLI (`src/scanner`) runs a regex pass that can emit pseudo-elements (e.g. `if:`/`catch:`/`fetch(`) on tree-sitter-succeeded files, while the populate/index pipeline (`src/pipeline/extractors`) uses its own tree-sitter extractor with a deduped element set. `coderef-scan` count > `index.json` count is by design — not a discrepancy. Likewise, quote scan **timing** with its command + conditions (cold vs warm cache, language set), since those dominate the number.

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
| `--useAST` | Use TypeScript compiler API for TS/JS (legacy opt-in) | `false` |
| `--useTreeSitter` | Use tree-sitter parsing (IMP-CORE-052: now default `true`; pass `false` to force regex) | `true` |
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
| `--source-headers` | Write optional CodeRef-Semantics headers into source files. Infers `@layer` from file path patterns automatically (e.g. `src/cli/` → `cli`, `__tests__/` → `test_support`). | `false` |
| `--overwrite-headers` | Re-write **every** file's header even if present. Refreshes headers but can churn many unrelated files (`@used_by` refreshes + CRLF re-normalization) when only a few are actually stale — prefer `--stale-only` for a targeted refresh. Implies `--source-headers`. | `false` |
| `--stale-only` | Refresh **only** stale-header files (`headerStatus='stale'`, i.e. `@exports` drifted from the AST). Implies `--overwrite-headers`. Regenerates just the drifted files, avoiding the full-repo rewrite/CRLF churn of a blanket `--overwrite-headers` pass. Prints `refreshed N / skipped M`. (STUB-QDXGBA) | `false` |
| `--strict-headers` | Promote semantic-header drift (SH-1, SH-2, SH-3) from warnings to hard errors at the Phase 6 validator. `populate-coderef` exits non-zero on header drift. | `false` |
| `--enforce-headers` | Fail (exit 1) if header coverage is below `--coverage-floor`. Prevention layer: a header-less codebase can no longer produce a green scan, so new files added without a `@coderef-semantic` header are caught at scan time instead of being silently excluded from the RAG index. | `false` |
| `--coverage-floor <0-100>` | Minimum `header_coverage_pct` required by `--enforce-headers`. | `100` |
| `-j, --json` | Output JSON summary | `false` |
| `-v, --verbose` | Verbose output | `false` |

Every `populate-coderef` run now also prints a `[header coverage] N% (defined X / total Y)` line plus, when files are header-less, a `missing/stale/partial` breakdown — these files are the ones `rag-index` will exclude from the vector index. The number comes from `validation-report.json.header_coverage_pct` (added by WO-RAG-HEADER-COVERAGE-ENFORCE-AND-SURFACE-001).

**Stamp-on-write hook.** `scripts/check-header-coverage.mjs` is a pre-commit-hook backend: pipe staged source files to it and it fails the commit if any lacks a header. Example hook body: `git diff --cached --name-only --diff-filter=ACM | xargs node scripts/check-header-coverage.mjs`. Bypassable via `git commit --no-verify`; the `rag-index --coverage-floor` gate is the backstop for anything that slips through.

**Phase 6 chokepoint behavior.** `populate-coderef` runs `validatePipelineState` after the pipeline finishes and writes the resulting 14-field `ValidationReport` to `.coderef/validation-report.json`. The CLI's exit code reflects `ValidationResult.ok`:

| `ValidationResult` | Exit code | Stderr |
|---|---:|---|
| `ok=true`, no warnings | `0` | quiet |
| `ok=true`, warnings present (default-mode header drift) | `0` | warning summary (SH-1/SH-2/SH-3 file lists) |
| `ok=false` (graph-integrity error or `--strict-headers` promoting header drift) | non-zero | error detail |

Downstream `rag-index` reads `validation-report.json` and refuses to run when `ok=false` — see [`rag-index`](#coderef-rag-index) below.

### Examples

```bash
# Populate .coderef/ with defaults
npx populate-coderef ./my-project

# Minimal machine-truth outputs only
npx populate-coderef ./my-project --mode minimal

# Generate optional human-facing source headers
npx populate-coderef ./my-project --source-headers

# Refresh ONLY stale headers (targeted — recommended; touches just drifted files)
npx populate-coderef ./my-project --stale-only

# Refresh ALL headers (blanket rewrite — churns many files; use --stale-only instead)
npx populate-coderef ./my-project --source-headers --overwrite-headers

# Hard-fail on any semantic header drift (CI mode)
npx populate-coderef ./my-project --strict-headers
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

Index codebase into a vector database for semantic search. Reads `.coderef/validation-report.json` (produced by `populate-coderef`) and **refuses to run** when `ok=false` — eliminates the pre-Phase-7 `chunksIndexed=0` silent-success anti-pattern.

The CLI binary is `rag-index` (registered in `package.json`). `coderef-rag-index` is the historical name.

### Usage

```bash
npx rag-index --project-dir ./my-project
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --project-dir <path>` | Project directory to index (also accepts first positional argument) | Current directory |
| `--provider <provider>` | Embedding provider: `openai`, `anthropic`, `ollama` | Key-aware: `openai` if `OPENAI_API_KEY` is set, else `ollama` (local-first; cloud is opt-in) |
| `--store <store>` | Vector store: `json`, `pinecone`, `chroma` (`sqlite` is a deprecated alias for `json`) | `json` |
| `--reset` | Reset existing index before indexing | `false` |
| `--include-headerless` | Embed chunks from header-less elements (`headerStatus` ∈ {missing, stale, partial}) with `header:false` provenance instead of skipping them — enables RAG on repos that were never header-annotated. Default behavior (skip-with-reason) preserves DR-PHASE-7-E. | `false` |
| `--coverage-floor <0-100>` | Warn (or refuse, with `--strict-coverage`) when `header_coverage_pct` is below this floor. Below-floor coverage means chunks from header-less files are silently excluded from the index. `0` disables the check. | `0` |
| `--strict-coverage` | Make a `--coverage-floor` breach REFUSE indexing (`status='failed'`, `coverageGateRefused=true`) instead of warning. | `false` |
| `-l, --lang <languages>` | Comma-separated language filter | All languages |
| `-j, --json` | Output results as JSON | `false` |
| `-v, --verbose` | Verbose output | `false` |

**Provider default is key-aware** (WO-CODEREF-CORE-MCP-SERVER-AND-INTELLIGENCE-FIXES-001): with no `--provider` flag, the CLI selects `openai` only when `OPENAI_API_KEY` is present in the environment, otherwise `ollama` with `nomic-embed-text` (768-dim, fully local). `rag-search` applies the same rule, so index and query embeddings stay on the same model. Cloud embedding is never a silent default.

`rag-index` now prints `Header coverage: X%` and a `by reason:` breakdown of skipped chunks (e.g. `header_status_missing: N`), so a run that drops most of the codebase for missing headers is no longer indistinguishable from a clean no-op. Coverage flags added by WO-RAG-HEADER-COVERAGE-ENFORCE-AND-SURFACE-001.

### Validation gate (Phase 6 → Phase 7 contract)

`rag-index` reads `<project>/.coderef/validation-report.json` before any indexing work begins:

| `validation-report.json` state | `rag-index` behavior |
|---|---|
| File present, `ok=true` | proceed to index |
| File present, `ok=false` | return `IndexingResult` with `status='failed'`, `validationGateRefused=true`, `chunksIndexed=0`. Exit non-zero. |
| File missing or malformed | hard error; exit non-zero. Run `populate-coderef` first. |

This is the load-bearing Phase 6 → Phase 7 gate (DR-PHASE-7-A). Programmatic callers inject the gate themselves; the orchestrator is pure and never reads the report directly.

### `IndexingResult.status` and exit codes

`rag-index` emits an `IndexingResult` (see [docs/SCHEMA.md § 6](./SCHEMA.md)) with a top-level `status`:

| `status` | Condition | Exit code | Stderr |
|---------|-----------|----------:|--------|
| `success` | `chunksIndexed > 0` AND `chunksSkipped === 0` AND `chunksFailed === 0` | `0` | quiet |
| `partial` | `chunksIndexed > 0` AND (`chunksSkipped > 0` OR `chunksFailed > 0`) | `0` | warning summary with skipped/failed counts and per-entry reasons |
| `failed`  | `chunksIndexed === 0` OR `validationGateRefused === true` OR `coverageGateRefused === true` | non-zero | error detail |

`chunksSkippedDetails[]` and `chunksFailedDetails[]` carry one entry per skipped/failed chunk with a `reason` enum (see [docs/SCHEMA.md § 6](./SCHEMA.md) for `SkipReason` / `FailReason`). Header-drift (`headerStatus` ∈ {missing, stale, partial}) skips with the corresponding `header_status_*` reason rather than failing — DR-PHASE-7-E.

### Examples

```bash
# Index current project (local ollama unless OPENAI_API_KEY is set)
npx rag-index

# Index a specific project with OpenAI embeddings
npx rag-index --project-dir ./my-project --provider openai

# Index a repo that was never header-annotated
npx rag-index --project-dir ./legacy-repo --include-headerless

# Enforce a header-coverage floor (refuse below 80%)
npx rag-index --coverage-floor 80 --strict-coverage

# Reset and re-index TypeScript only
npx rag-index --reset --lang ts,tsx
```

### Prerequisites

- `.coderef/validation-report.json` present and `ok=true` — run `populate-coderef` first.
- For the `ollama` provider (the local-first default): Ollama server running at `http://localhost:11434` with `nomic-embed-text` pulled.
- For `--store chroma`: ChromaDB server running. The default `json` store (a local JSON file with crash-safe writes) needs no server.

---

## coderef-rag-search

Search the indexed codebase using natural language queries, with optional filtering by Phase 7 semantic facets.

The CLI binary is `rag-search` (registered in `package.json`). `coderef-rag-search` is the historical name.

### Usage

```bash
npx rag-search "authentication middleware" --type function
```

The query is a positional argument (natural language works best).

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --project-dir <path>` | Project directory to search | Current directory |
| `--provider <provider>` | Embedding provider: `openai`, `anthropic`, `ollama`. **Must match the provider the index was built with** — mismatched models produce empty or garbage results. | Key-aware: `openai` if `OPENAI_API_KEY` is set, else `ollama` (same rule as `rag-index`) |
| `--store <store>` | Vector store: `json`, `pinecone`, `chroma` (`sqlite` is a deprecated alias for `json`) | `json` |
| `-k, --top-k <n>` | Number of results to return | `10` |
| `--min-score <n>` | Minimum relevance score 0–1 | None |
| `-t, --type <type>` | Filter by element type (`function`, `class`, `method`, ...) | All types |
| `-f, --file <pattern>` | Filter by file path pattern | None |
| `-l, --lang <language>` | Filter by programming language | All languages |
| `--exported` | Only show exported elements | `false` |
| `--layer <value>` | Filter by semantic `@layer` (e.g. `service`, `ui_component`, `cli`). Phase 7. | None |
| `--capability <value>` | Filter by semantic `@capability` slug (kebab-case). Phase 7. | None |
| `--constraint <key:value>` | Generalized filter shorthand. Keys: `type`, `file`, `lang`, `layer`, `capability`, `exported`. | None |
| `--max-tokens <n>` | Truncate output to approximately N tokens (chars/4 estimate). Applies to both human-readable and `--json` modes. Omit for unbounded output. | None |
| `-j, --json` | Output as JSON | `false` |

`--layer` and `--capability` map to the `CodeChunk.{layer, capability}` facets propagated from `ElementData` via `GraphNode.metadata` (Phase 5 → Phase 7). They pass through to the vector-store metadata filter — only chunks with matching values are returned. Layer values come from `ASSISTANT/STANDARDS/layers.json` (the 13-value `LayerEnum`); capability values are free-form kebab-case slugs declared in source headers.

### Examples

```bash
# Basic search
npx rag-search "user login function"

# Filter by element type
npx rag-search "database connection" --type class

# Filter by semantic layer (Phase 7)
npx rag-search "queue worker" --layer service

# Filter by capability slug (Phase 7)
npx rag-search "embedding" --capability rag-indexing

# Combine filters
npx rag-search "validate" --layer validation --capability output-validation

# Higher score floor for precision
npx rag-search "error handling" --min-score 0.85

# JSON output for piping
npx rag-search "API routes" --json | jq '.results[]'
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

The CLI binary is `rag-status` (registered in `package.json`). `coderef-rag-status` is the historical name.

### Usage

```bash
npx rag-status --project-dir ./my-project
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --project-dir <path>` | Project directory (also accepts first positional argument) | Current directory |
| `-j, --json` | Output as JSON | `false` |

### Examples

```bash
# Check status
npx rag-status --project-dir ./my-project

# JSON output
npx rag-status --project-dir ./my-project --json
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

## coderef-mcp-server

MCP (Model Context Protocol) stdio server that exposes `.coderef/` intelligence artifacts as 23 tools. Lets MCP clients (Claude Code, Claude Desktop, any MCP-compatible agent) query call graphs, impact analysis, and element lookups directly instead of parsing `graph.json` by hand.

**Repo-agnostic (WO-MCP-REPO-AGNOSTIC-ANY-REPO-001):** one running server serves ANY indexed repo. Every tool takes a **required `project_root`** argument naming the target repo root (the directory containing `.coderef/`) — pure CLI semantics, exactly as if the caller had the CLI. There is no default repo, no cwd inference, no env fallback; omitting `project_root` is a schema-level rejection.

Most tools are **read-only**. Two are **`.coderef`-write** tools — `reindex` (regenerate the substrate) and `rag_index` (build the RAG index over local Ollama) — and every write they perform is confined to `<projectDir>/.coderef/`: they delegate to the `populate` / `rag-index` pipelines and never mutate source. Source-mutating rename is deliberately **not** exposed here; MCP offers only the dry-run `rename_preview` (the `coderef-rename --apply` CLI owns source mutation).

Built inside coderef-core and typed against `ExportedGraph` — schema drift between the graph exporter and the MCP surface is a compile error, not a runtime mystery (the failure mode that killed the previous external Python server).

### Usage

```bash
npx coderef-mcp-server --project-dir ./my-project
```

The server speaks JSON-RPC over stdio; all diagnostics go to stderr. It is meant to be launched by an MCP client, not used interactively.

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --project-dir <path>` | OPTIONAL DEFAULT ANCHOR: used only to resolve a *relative* per-call `project_root` (also accepts first positional argument). It never binds the tools to a default repo. | Current directory |

### Per-repo queries

One server, any indexed repo — name the repo per call:

```
codebase_summary(project_root="C:/repos/project-one")   → project-one's census
codebase_summary(project_root="C:/repos/project-two")   → project-two's census
what_exports(project_root="C:/repos/project-two", file="src/lib.ts")
```

- `project_root` is **required and mandatory** on all 23 tools. Absolute paths are used as-is; relative paths resolve against the launch anchor (`--project-dir`, default cwd).
- One handler set (with its mtime-invalidated artifact cache) is memoized per distinct canonical root — repeated queries against the same repo are cheap, and repos never share caches.
- Resolution failures return a structured envelope instead of another repo's data:

```json
{ "error": "<code>", "project_root": "<path you passed>", "hint": "<actionable remedy>" }
```

| Error code | Meaning / remedy |
|---|---|
| `project_root_nonexistent` | The path does not exist (or is not a directory) — check the path |
| `coderef_artifacts_missing` | No `.coderef/` and auto-build not possible — run `populate-coderef <root>` first |
| `coderef_artifacts_corrupt` | `graph.json`/`index.json` failed to parse — delete `.coderef/` and rebuild |
| `coderef_artifacts_incomplete` | A build produced only one of graph/index — check populate output |
| `project_root_access_denied` | Permission denied on the root — check directory permissions |
| `project_root_symlink_loop` | Circular symlink in the path — fix the link chain |
| `project_root_symlink_broken` | Symlink points at a nonexistent target (named in the hint) |

The two `.coderef`-WRITE tools (`reindex`, `rag_index`) are likewise per-call: writes are confined to `<project_root>/.coderef/` of whichever repo the call names (CLI-parity — see the DR-002 ruling in the workorder's RESOLUTION-DESIGN.md).

### Tools

| Tool | Question it answers |
|------|---------------------|
| `what_calls` | Which resolved call sites invoke this element? (inbound call edges, with `file:line` locations) |
| `what_imports` | Which modules/elements import this element? (inbound resolved import edges) |
| `impact_of` | What breaks if this changes? Transitive inbound dependents via reverse BFS (depth 1–10, default 3), with dependents-by-depth and affected files |
| `find_element` | Look up elements in `index.json` by name, codeRefId, or file substring; optional type filter; returns layer/capability when annotated |
| `codebase_summary` | Project totals: elements by type, header coverage, graph node/edge counts by relationship |
| `validation_status` | The 14-field locked `ValidationReport` verbatim, plus a pass/fail summary |
| `hotspots` | Which elements carry the most load? Fan-in + fan-out ranking over resolved call/import edges; `src_only` (default true) excludes test-origin edges and test-file elements |
| `cycles` | Where are the dependency cycles? Tarjan SCC over resolved call/import edges, largest first, with a sample in-cycle edge per cycle |
| `what_exports` | What does this file export? Exported elements via resolved export edges; path fragments get an ambiguity envelope |
| `diff_impact` | PR blast-radius in one call: map a git diff (default working tree vs HEAD) to changed elements via index.json line ranges, then union transitive dependents |
| `rag_search` | Semantic code search over the RAG index; provider/store read from rag-index.json metadata so query embeddings always match the index model |

Every tool additionally requires `project_root` (string, absolute or anchor-relative path to the target repo root) — see **Per-repo queries** above. Element queries accept a `codeRefId` (`@Fn/src/foo.ts#bar:12`), a line-less codeRefId, a bare element name, or a file path fragment (file queries aggregate over all elements in the file). Ambiguous names return up to 5 candidates instead of guessing. Only `resolved` edges are traversed — unresolved/external edges never appear in results.

### Registration (Claude Code)

`.mcp.json` at the repo root registers the server under the domain name `coderef-core`:

```json
{
  "mcpServers": {
    "coderef-core": {
      "command": "node",
      "args": [
        "<repo>/dist/src/cli/coderef-mcp-server.js",
        "--project-dir", "<default-anchor>"
      ]
    }
  }
}
```

The `--project-dir` launcher arg is optional and acts only as a **default anchor** for relative `project_root` paths — every tool invocation names its own repo via the required `project_root` argument; there is no default repo.

### Prerequisites

- `.coderef/graph.json` and `.coderef/index.json` present — run the pipeline (`populate-coderef` or `coderef-pipeline`) first.
- `.coderef/validation-report.json` for `validation_status` (the tool degrades gracefully with `error: 'validation_report_missing'` if absent).
- Artifacts are cached with mtime invalidation — re-running the pipeline is picked up automatically without restarting the server.

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

## coderef-analyze

Run a single analysis pass on a project. Supports 12 analysis types covering configuration, contracts, database patterns, dependencies, design patterns, documentation, middleware, dependency graphs, complexity scoring, blast-radius simulation, multi-hop traversal, and breaking-change detection.

### Usage

```bash
coderef-analyze --project=<path> --type=<type> [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--project=<path>` | Path to the project root (**required**) | — |
| `--type=<type>` | Analysis type (**required**; see table below) | — |
| `--output=<fmt>` | Output format: `json` \| `text` | `text` |
| `--element=<id>` | Target element ID (required for: `impact`, `multi-hop`) | — |
| `--depth=<N>` | Max traversal depth (used by: `impact`, `multi-hop`) | `5` |
| `--from=<ref>` | Git ref baseline (required for: `breaking-changes`) | — |
| `--to=<ref>` | Git ref head (optional for: `breaking-changes`; defaults to worktree) | worktree |
| `--help` | Print help | — |

### Analysis types

| Type | Description | Required extras |
|------|-------------|-----------------|
| `config` | Detect project configuration (tsconfig, package.json, Docker, env) | — |
| `contract` | Detect API contracts (OpenAPI, GraphQL, Protobuf, JSON Schema) | — |
| `db` | Detect database patterns (ORM, raw queries, migrations) | — |
| `dependency` | Analyze npm dependency health (outdated, missing, unused) | — |
| `pattern` | Detect design patterns (Singleton, Observer, Factory, etc.) | — |
| `docs` | Analyze documentation coverage and quality | — |
| `middleware` | Detect middleware chains and DI containers | — |
| `graph` | Build and print the full dependency graph | — |
| `complexity` | Score element complexity (requires project scan) | — |
| `impact` | Simulate blast radius for a changed element | `--element` |
| `multi-hop` | Traverse multi-hop relationships | `--element` |
| `breaking-changes` | Detect breaking API changes between two git refs | `--from` |

### Examples

```bash
# Detect project configuration
coderef-analyze --project=. --type=config

# Detect API contracts (JSON output)
coderef-analyze --project=. --type=contract --output=json

# Analyze npm dependency health
coderef-analyze --project=. --type=dependency

# Score complexity across all elements
coderef-analyze --project=. --type=complexity --output=json

# Blast-radius simulation for a specific element
coderef-analyze --project=. --type=impact --element="src/scanner.ts"

# Multi-hop traversal (custom depth)
coderef-analyze --project=. --type=multi-hop --element="src/scanner.ts" --depth=3

# Detect breaking changes since last release tag
coderef-analyze --project=. --type=breaking-changes --from=v1.2.0

# Detect breaking changes between two refs
coderef-analyze --project=. --type=breaking-changes --from=main --to=feature/my-branch
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Analysis error or unhandled exception |
| `1` | `--project` missing, `--type` invalid, or type-specific required flag missing (`--element`, `--from`) |

---

## coderef-query

Execute a relationship query over the canonical `.coderef/graph.json`. Requires the populate pipeline to have run first (the query engine reads the pipeline-emitted graph; there is no in-memory analysis pass). Reimplemented on the canonical graph per DR-PHASE-5-C (WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 2).

### Usage

```bash
coderef-query --project=<path> --type=<type> --target=<element> [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--project=<path>` | Path to the project root — must contain `.coderef/graph.json` (**required**) | — |
| `--type=<type>` | Query type (**required**; see table below) | — |
| `--target=<element>` | Target element: a codeRefId, an element name, or a file path (**required**) | — |
| `--source=<element>` | Source element for path queries (required for: `shortest-path`, `all-paths`) | — |
| `--depth=<N>` | Max traversal depth | `5` |
| `--format=<fmt>` | Result format: `raw` \| `summary` \| `full` | `summary` |
| `--patterns=<globs>` | DEPRECATED — accepted but ignored (queries read the populate-emitted graph) | — |
| `--help` | Print help | — |

### Query types

Direction contract: the `-me` suffix means the target is the OBJECT (inbound edges — "who Xes the target"); bare forms answer for the target as SUBJECT (outbound — "what does the target X").

| Type | Description | Required extras |
|------|-------------|-----------------|
| `what-calls-me` | Who calls the target? (inbound call edges) | — |
| `what-calls` | What does the target call? (outbound call edges) | — |
| `what-imports-me` | Who imports the target? (inbound import edges) | — |
| `what-imports` | What does the target import? (outbound import edges) | — |
| `what-depends-on-me` | Who depends on the target, transitively? (inbound call+import) | — |
| `what-depends-on` | What does the target depend on, transitively? (outbound call+import) | — |
| `shortest-path` | Shortest directed path from `--source` to `--target` | `--source` |
| `all-paths` | All directed paths from `--source` to `--target` (bounded by `--depth`) | `--source` |

### Examples

```bash
# What calls a specific file?
coderef-query --project=. --type=what-calls --target="src/scanner.ts"

# What does a file import?
coderef-query --project=. --type=what-imports --target="src/cli/index.ts"

# What depends on a given module?
coderef-query --project=. --type=what-depends-on-me --target="src/utils/path-utils.ts"

# Shortest dependency path between two elements
coderef-query --project=. --type=shortest-path --source="src/cli/index.ts" --target="src/scanner.ts"

# All paths (full format, deeper traversal)
coderef-query --project=. --type=all-paths --source="src/cli/index.ts" --target="src/scanner.ts" --depth=8 --format=full
```

### Output format

All query types emit JSON to stdout:

```json
{
  "type": "what-calls-me",
  "target": "src/scanner.ts",
  "results": ["src/cli/coderef-scan.ts", "src/integration/indexing-orchestrator.ts"],
  "format": "summary"
}
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Query error, missing required flag, or invalid `--type` |

---

## coderef-detect-languages

Detect the programming languages used in a project by scanning file extensions. Returns a list of detected language names. Uses `.coderefignore` (if present) to exclude directories.

### Usage

```bash
coderef-detect-languages --project=<path> [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--project=<path>` | Path to the project root (**required**) | — |
| `--ignore-file=<path>` | Path to ignore file | `.coderefignore` |
| `--json` | Output as JSON array instead of line-by-line | `false` |
| `--help` | Print help | — |

### Examples

```bash
# Detect languages in the current directory
coderef-detect-languages --project=.

# JSON output
coderef-detect-languages --project=/path/to/project --json

# Custom ignore file
coderef-detect-languages --project=. --ignore-file=.myignore
```

### Output

Line-by-line (default):
```
TypeScript
JavaScript
Python
```

JSON (`--json`):
```json
["TypeScript", "JavaScript", "Python"]
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success (including "no languages detected") |
| `1` | Error scanning directory or reading ignore file |
| `1` | `--project` not provided |

---

## coderef-semantic-integration

Run semantic header generation, LLM enrichment, and registry synchronization across a project. Reads `.coderef/index.json` as input and writes semantic headers into source files and updates `registry/entities.json`.

### Usage

```bash
coderef-semantic-integration --project=<path> [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--project=<path>` | Path to the project root (**required**) | — |
| `--output=<path>` | Output directory for generated artifacts | `<project>/.coderef` |
| `--registry=<path>` | Path to registry file | `<project>/.coderef/registry/entities.json` |
| `--dry-run` | Preview changes without writing files | `false` |
| `--no-headers` | Skip header generation | `false` |
| `--no-sync-registry` | Skip registry sync | `false` |
| `--file=<path>` | Process a single file instead of the whole project | — |
| `--validate-idempotency` | Run twice and verify identical results | `false` |
| `--help` | Print help | — |

### Examples

```bash
# Full integration pass on the current project
coderef-semantic-integration --project=.

# Dry-run preview (no files written)
coderef-semantic-integration --project=. --dry-run

# Process a single file only
coderef-semantic-integration --project=. --file=src/scanner.ts

# Verify that two consecutive runs produce identical output
coderef-semantic-integration --project=. --validate-idempotency

# Registry sync only (skip header write)
coderef-semantic-integration --project=. --no-headers
```

### Output

On success:
```
Done: 42 files processed, 38 headers generated, 35 entries enriched, 42 registry entries updated
```

With `--dry-run`:
```
[dry-run] Would write 42 file(s), 183204 bytes
  src/scanner.ts
  src/cli/index.ts
  ...
```

With `--validate-idempotency`:
```
Idempotency check: PASS
First run:  { "filesProcessed": 42, ... }
Second run: { "filesProcessed": 42, ... }
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Integration error, `--project` missing, or idempotency check FAIL |

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

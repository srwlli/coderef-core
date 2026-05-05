# `coderef-rag-server` HTTP API (v1)

JSON request/response contract for the always-on HTTP RAG server bundled with `@coderef/CODEREF-CORE`. WO-RAG-HTTP-SERVER-V1-001.

---

## Overview

`coderef-rag-server` exposes CODEREF-CORE's vector-RAG layer (semantic search + Ollama embeddings + sqlite-JSON vector store) over a localhost HTTP API. It is the cross-runtime integration surface for callers that cannot import `@coderef/CODEREF-CORE` directly — Python LLOYD, Node ASSISTANT skills, future surfaces.

- **Bind:** `127.0.0.1:52849` (default; configurable via `--port` or `CODEREF_RAG_HTTP_PORT`)
- **Posture:** always-on system service (start at boot or via fast-start; not per-request spawn)
- **Auth:** none (localhost-only; trust the loopback boundary)
- **Streaming:** none (request/response JSON)
- **Versioning:** `X-Coderef-RAG-API: 1` response header on every reply
- **LLM:** Ollama only, local (per `/feedback_coderef_core_rag_local`)

If Ollama is unreachable, query/index endpoints return `503 {degraded:true, reason}`; the server stays up. `/api/health` and `/api/rag/status` continue to serve.

See also:
- [DEPLOY-CODEREF-RAG-SERVER.md](DEPLOY-CODEREF-RAG-SERVER.md) — per-OS service-unit instructions
- [CLI.md](CLI.md) — `coderef-rag-server` CLI flags
- [LLOYD-INTEGRATION.md](LLOYD-INTEGRATION.md) — companion integration doc for the chokidar daemon (same client-runtime considerations apply here)

---

## Endpoint summary

| Method | Path                | Purpose                                            |
|--------|---------------------|----------------------------------------------------|
| GET    | `/api/health`       | Liveness probe + uptime + version                  |
| GET    | `/api/rag/status`   | Ollama reachability + model + dim + store info     |
| POST   | `/api/rag/query`    | Vector-RAG search against an indexed `.coderef/`   |
| POST   | `/api/rag/index`    | Idempotent re-index (spawns `rag-index` subprocess)|

All responses carry `Content-Type: application/json; charset=utf-8` and `X-Coderef-RAG-API: 1`.

---

## Common envelopes

### Success (2xx)
```json
{ "api_version": 1, "...endpoint-specific...": "..." }
```

### Degraded (503)
Returned by `/api/rag/query` and `/api/rag/index` when the cached Ollama probe says unreachable.
```json
{
  "degraded": true,
  "reason": "ollama_unreachable" | "ollama_timeout" | "ollama_http_error",
  "detail": "<exception message>",
  "cached_at": "2026-04-26T05:30:00Z",
  "ollama_base_url": "http://localhost:11434"
}
```

### Validation error (400 / 404 / 413 / 504 / 409 / 500)
```json
{ "error": "<short_code>", "detail": "<optional human-readable>" }
```

| Status | Meaning                                                 |
|--------|---------------------------------------------------------|
| 400    | Invalid JSON, missing required field, or malformed body |
| 404    | `project_dir` not found (or unknown route)              |
| 409    | `index_in_progress` (per-project mutex held)            |
| 413    | Request body exceeded 1 MB                              |
| 500    | Internal error (search failed for a non-degraded reason)|
| 503    | Degraded path (Ollama unreachable)                      |
| 504    | Per-request timeout (`query_timeout`, default 30 s)     |

---

## `GET /api/health`

Liveness probe. Always 200 if the server is alive. Used by service supervisors.

### Request
```bash
curl http://localhost:52849/api/health
```

### Response (200)
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "api_version": 1,
  "uptime_s": 1234,
  "pid": 18432,
  "started_at": "2026-04-26T05:00:00.000Z"
}
```

---

## `GET /api/rag/status`

Reports Ollama reachability, default model + embedding dimensions, vector-store path pattern, and any in-flight index runs. Always 200 (never crashes on Ollama down).

### Request
```bash
curl http://localhost:52849/api/rag/status
```

### Response (200, Ollama reachable)
```json
{
  "api_version": 1,
  "server_version": "1.0.0",
  "ollama": {
    "reachable": true,
    "base_url": "http://localhost:11434",
    "model": "nomic-embed-text",
    "embedding_dim": 768,
    "cached_at": "2026-04-26T05:30:00Z"
  },
  "sqlite_store": {
    "env_override": null,
    "default_path_pattern": "<project_dir>/.coderef/coderef-vectors.json"
  },
  "indexing_in_flight": []
}
```

### Response (200, Ollama unreachable — still 200, status only reports the fact)
```json
{
  "api_version": 1,
  "server_version": "1.0.0",
  "ollama": {
    "reachable": false,
    "base_url": "http://localhost:11434",
    "model": "nomic-embed-text",
    "embedding_dim": 768,
    "reason": "ollama_unreachable",
    "detail": "fetch failed",
    "cached_at": "2026-04-26T05:30:00Z"
  },
  "sqlite_store": {
    "env_override": null,
    "default_path_pattern": "<project_dir>/.coderef/coderef-vectors.json"
  },
  "indexing_in_flight": ["/abs/path/to/project"]
}
```

---

## `POST /api/rag/query`

Run a vector-RAG search against a project's indexed `.coderef/coderef-vectors.json`. Wraps `SemanticSearchService` + `OllamaProvider` + `SQLiteVectorStore`.

### Request

| Field         | Type    | Required | Default | Notes                                                |
|---------------|---------|----------|---------|------------------------------------------------------|
| `project_dir` | string  | yes      | —       | Absolute path to the project root (`.coderef/` lives here) |
| `query`       | string  | yes      | —       | Natural-language query                               |
| `top_k`       | integer | no       | `10`    | Max results returned                                 |
| `lang`        | string  | no       | —       | Filter by programming language (`ts`, `py`, etc.)    |
| `type`        | string  | no       | —       | Filter by element type (`function`, `class`, ...)    |
| `file`        | string  | no       | —       | Filter by file-path substring                        |
| `exported`    | boolean | no       | —       | If `true`, only exported elements                    |
| `layer`       | string  | no       | —       | Filter by semantic `@layer` (Phase 7). One of the 13 `LayerEnum` values. |
| `capability`  | string  | no       | —       | Filter by semantic `@capability` slug (Phase 7). Free-form kebab-case.   |

```bash
curl -X POST http://localhost:52849/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "project_dir": "/abs/path/to/project",
    "query": "how does authentication middleware work?",
    "top_k": 5,
    "lang": "ts",
    "type": "function"
  }'
```

### Response (200)
```json
{
  "api_version": 1,
  "query": "how does authentication middleware work?",
  "project_dir": "/abs/path/to/project",
  "results": [
    {
      "coderef": "<uuid>",
      "score": 0.89,
      "metadata": {
        "name": "authMiddleware",
        "file": "src/middleware/auth.ts",
        "line": 23,
        "type": "function",
        "language": "ts",
        "exported": true,
        "documentation": "Express middleware that validates JWT bearer..."
      },
      "snippet": "export function authMiddleware(req, res, next) { ... }"
    }
  ],
  "total_results": 5,
  "elapsed_ms": 87,
  "model": "nomic-embed-text"
}
```

### Response (503, degraded)
See [common envelopes](#common-envelopes).

---

## `POST /api/rag/index`

Idempotent re-index. Spawns `rag-index` CLI as a subprocess against `project_dir`, with `CODEREF_LLM_PROVIDER=ollama` and `CODEREF_RAG_LOCAL_ONLY=1` pinned in the child env. Reuses the canonical `IncrementalIndexer`, so unchanged files are skipped automatically.

### Request

| Field         | Type    | Required | Default | Notes                                                                  |
|---------------|---------|----------|---------|------------------------------------------------------------------------|
| `project_dir` | string  | yes      | —       | Absolute path to the project root                                      |
| `reset`       | boolean | no       | `false` | If `true`, forwards `--reset` to `rag-index` (rebuilds the vector store). Use after embedding-model dim change. |

```bash
curl -X POST http://localhost:52849/api/rag/index \
  -H "Content-Type: application/json" \
  -d '{ "project_dir": "/abs/path/to/project" }'
```

### Phase 6 → Phase 7 validation gate

`rag-index` (the spawned subprocess) reads `<project_dir>/.coderef/validation-report.json` and **refuses to run** when `ok=false` (DR-PHASE-7-A). This is the same gate enforced by the CLI directly. The HTTP server reports the result via the `IndexingResult.status` field on the success response and via non-zero `exit_code` on the failure response.

### Response (200, success/partial)

```json
{
  "api_version": 1,
  "status": "ok",
  "project_dir": "/abs/path/to/project",
  "exit_code": 0,
  "duration_ms": 18342,
  "indexing_result": {
    "status": "success",
    "chunksIndexed": 215,
    "chunksSkipped": 0,
    "chunksFailed": 0,
    "filesProcessed": 28,
    "validationGateRefused": false,
    "validationReportPath": ".coderef/validation-report.json",
    "chunksSkippedDetails": [],
    "chunksFailedDetails": []
  },
  "stdout_tail": "Indexed 215 chunks across 28 files\nIndex written to .coderef/coderef-vectors.json"
}
```

If `chunksSkipped > 0` or `chunksFailed > 0`, `indexing_result.status` becomes `"partial"` (still HTTP 200, exit 0), and the per-entry detail arrays carry `{coderefId, reason, message?}` records. `reason` is one of:

- **`SkipReason`:** `unchanged`, `header_status_missing`, `header_status_stale`, `header_status_partial`, `unresolved_relationship`.
- **`FailReason`:** `embedding_api_error`, `malformed_chunk`.

See [docs/SCHEMA.md § 6](./SCHEMA.md) for full enum definitions.

### Response (500, indexing failed — including validation-gate refusal)

```json
{
  "api_version": 1,
  "status": "fail",
  "project_dir": "/abs/path/to/project",
  "exit_code": 1,
  "duration_ms": 4210,
  "indexing_result": {
    "status": "failed",
    "chunksIndexed": 0,
    "chunksSkipped": 0,
    "chunksFailed": 0,
    "filesProcessed": 0,
    "validationGateRefused": true,
    "validationReportPath": ".coderef/validation-report.json"
  },
  "stderr_tail": "<last 20 lines of rag-index stderr>"
}
```

`validationGateRefused=true` indicates the run failed because the Phase 6 validation report carried `ok=false` (or was missing/malformed). Run `populate-coderef` first.

### Response (409, mutex held)
```json
{ "error": "index_in_progress", "project_dir": "/abs/path/to/project" }
```

A second concurrent index against the same `project_dir` is rejected to prevent race writes to `.coderef/coderef-vectors.json`. Different `project_dir` values can index in parallel.

### Response (503, degraded)
See [common envelopes](#common-envelopes).

---

## Server-side environment variables

| Variable                   | Purpose                                                            | Default                  |
|----------------------------|--------------------------------------------------------------------|--------------------------|
| `CODEREF_RAG_HTTP_PORT`    | TCP port for the server                                            | `52849`                  |
| `CODEREF_LLM_BASE_URL`     | Ollama HTTP endpoint                                               | `http://localhost:11434` |
| `CODEREF_LLM_MODEL`        | Ollama embedding model                                             | `nomic-embed-text`       |
| `CODEREF_LLM_API_KEY`      | Forwarded to `OllamaProvider` (Ollama itself ignores it)           | `ollama`                 |
| `CODEREF_SQLITE_PATH`      | Override default per-project vector store path                     | unset                    |

---

## Versioning policy

The wire contract is pinned by the `X-Coderef-RAG-API` header. Current value: `1`.

- **Backward-compatible additions** (new optional request fields, new response fields) keep the header at `1`.
- **Breaking changes** bump the header (`2`, `3`, …) and add a parallel route prefix (`/api/v2/rag/...`). The previous version stays available for one major.
- Clients SHOULD pin on read: assert `X-Coderef-RAG-API == "1"` and degrade gracefully if a newer header arrives unexpectedly.

---

## Security & operational posture

- **Localhost-only.** Server binds `127.0.0.1`; no external interface.
- **No auth.** Same trust posture as Ollama itself on `localhost:11434`.
- **No TLS.** Loopback transport is sufficient for v1.
- **Body cap 1 MB.** Larger bodies return 413.
- **Per-request timeout 30 s.** Longer searches return 504.
- **Per-project index mutex.** Concurrent `/api/rag/index` against the same `project_dir` returns 409.
- **Always-on lifecycle.** Server expected to run as a system service; see [DEPLOY-CODEREF-RAG-SERVER.md](DEPLOY-CODEREF-RAG-SERVER.md).
- **Graceful shutdown.** SIGINT/SIGTERM closes the listener cleanly with a 5 s grace; in-flight requests get to finish.

---

## Quick health-check probe

```bash
curl -fsS http://localhost:52849/api/health > /dev/null && echo OK || echo DEAD
```

Use from systemd `ExecStartPost`, container readiness probes, or fast-start runbook.

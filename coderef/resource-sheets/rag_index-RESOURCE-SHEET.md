---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: rag_index
parent_project: coderef-core
category: CLI
version: 1.0.0
documents: src/cli/rag-index.ts
related_files:
  - src/cli/rag-index.ts
status: draft
---

## Executive Summary

`rag-index.ts` is the reusable CLI/programmatic orchestration path that validates a project and its pipeline report, constructs the selected embedding provider/store, optionally resets local state, runs RAG indexing, writes metadata, and returns or prints terminal results [ref](src/cli/rag-index.ts).

## Audience and Intent

CLI, MCP RAG, and indexing maintainers use `runRagIndex` so interactive and agent surfaces share one pipeline. Programmatic mode suppresses transport-breaking stdout/exits and throws/returns summaries; CLI mode retains help, progress, JSON/human output, and process exit behavior.

## Architecture / Behavior

Argument parsing uses the shared flag parser, canonical provider precedence, JSON store default, language validation/detection, coverage controls, headerless inclusion, concurrency, and an enabled-by-default chunk cache. Local-only mode rejects explicit cloud providers. The run validates project access, lazy-loads the orchestrator, creates `.coderef`, constructs provider/store, performs best-effort reset, initializes storage, and requires a parseable passing validation report [ref](src/cli/rag-index.ts).

The orchestrator receives language, validation, header, and cache options. The command writes a full `rag-index.json` record, returns a compact programmatic summary, or prints CLI telemetry and exits according to complete/partial/failed status [ref](src/cli/rag-index.ts).

## Source of Truth

This module is authoritative for RAG-index CLI defaults/flags, programmatic parity, local-only enforcement, preflight/reset/gate orchestration, metadata shape, output messaging, and exit propagation. Provider/store/orchestrator modules own construction, embedding, storage, incremental/cache behavior, and result computation [ref](src/cli/rag-index.ts).

Persistent outputs are vector-store state, `.coderef/rag-index.json`, and orchestrator incremental/cache sidecars; runtime configuration includes `CliArgs` and documented environment variables. `mcp-server.test.ts` drives the real programmatic path for unavailable Ollama; `rag-index-cli.test.ts` tests a local parser copy rather than importing the live parser and is currently stale relative to live defaults/options [ref](__tests__/mcp-server.test.ts) [ref](__tests__/rag-index-cli.test.ts).

## Public API / Contracts

- `CliArgs` is the complete parsed/programmatic indexing configuration [ref](src/cli/rag-index.ts).
- `RagIndexSummary` is compact terminal telemetry for programmatic callers [ref](src/cli/rag-index.ts).
- `defaultRagIndexArgs` returns local-Ollama, JSON-store, quiet programmatic defaults [ref](src/cli/rag-index.ts).
- `runRagIndex` executes the shared indexing workflow and returns its compact summary [ref](src/cli/rag-index.ts).

## Dependencies

- Filesystem/path and branded-path helpers validate targets and manage `.coderef` outputs [ref](src/cli/rag-index.ts).
- Language detection/validation and shared flag parsing own input normalization [ref](src/cli/rag-index.ts).
- The shared provider factory owns provider/store selection and construction [ref](src/cli/rag-index.ts).
- The indexing orchestrator is lazy-loaded and owns the actual indexing stages [ref](src/cli/rag-index.ts).

## Risks & Edge Cases

- The dedicated CLI test reimplements an obsolete parser/default contract and therefore can pass while the live parser regresses [ref](__tests__/rag-index-cli.test.ts).
- Programmatic callers can pass a relative `projectDir` despite the constructor comment asserting an absolute-path invariant [ref](src/cli/rag-index.ts).
- Reset deletes the configured/default local JSON paths but does not clear remote Pinecone/Chroma contents [ref](src/cli/rag-index.ts).
- Validation acceptance uses shape heuristics, so a parseable legacy object with an empty `errors` array can pass without the current report fields [ref](src/cli/rag-index.ts).
- Index metadata is written directly rather than with a temporary-file atomic replace [ref](src/cli/rag-index.ts).
- A programmatic failed orchestrator result is returned as a summary; callers must inspect `status` rather than assume resolution means success [ref](src/cli/rag-index.ts).
- Help text retains `CODEREF_SQLITE_PATH`/SQLite terminology for a JSON-backed store [ref](src/cli/rag-index.ts).

## Validation Checklist

- [x] Verified all four indexed exports and declaration anchors.
- [x] Traced parsing/defaults, local-only, reset, validation, orchestration, metadata, and terminal modes.
- [x] Reviewed real MCP programmatic coverage and the dedicated CLI test implementation.
- [x] Documented stale-test, relative-path, remote-reset, gate, atomicity, and status semantics.


---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: semantic_integration
parent_project: coderef-core
category: integration
version: 1.0.0
documents: src/cli/semantic-integration.ts
related_files:
  - src/cli/semantic-integration.ts
status: draft
---

## Executive Summary

`semantic-integration.ts` adapts `SemanticOrchestrator` for CLI use, adds project/single-file execution, implements a fail-closed dry-run by temporarily intercepting synchronous and asynchronous filesystem writes, summarizes captured writes, and offers a two-run count-based idempotency check [ref](src/cli/semantic-integration.ts).

## Audience and Intent

Semantic-header/registry and CLI maintainers should use this wrapper when running the legacy semantic orchestrator with dry-run guarantees. Because interception patches live process-global `fs` functions, callers must avoid overlapping dry-run instances or unrelated filesystem activity in the same process.

## Architecture / Behavior

The module resolves the writable CommonJS `fs` module object (falling back to the namespace), patches both live and namespace sync/async write functions, captures paths ending TS/JS or containing `registry`/`.coderef`, passes all other writes through, and records per-target original values. If either sync or async interception cannot be installed, it restores partial patches and refuses to continue [ref](src/cli/semantic-integration.ts).

Project/file processing always restores in `finally`. Dry-run orchestrator options disable registry sync and enable validate-only. Project mode returns the real pipeline result; single-file mode synthesizes a one-file, zero-change result. Errors are returned in a non-throwing success envelope [ref](src/cli/semantic-integration.ts).

Idempotency forces dry-run twice and compares only files processed, headers generated, and entries enriched. It does not compare captured write content, registry counts, errors, or execution effects [ref](src/cli/semantic-integration.ts).

## Source of Truth

This module is authoritative for semantic CLI option translation, filesystem interception/restoration, captured-write summaries, and idempotency comparison. `semantic/orchestrator.ts` owns semantic processing and `PipelineResult` [ref](src/cli/semantic-integration.ts).

Runtime configuration is entirely `SemanticIntegrationOptions`; persistent state is owned by the underlying orchestrator when not dry-run. `semantic-integration.test.ts` backs interception/restoration/error envelopes and `semantic-integration-dryrun-realfs.test.ts` verifies real-fs interception [ref](src/cli/semantic-integration.test.ts) [ref](src/cli/semantic-integration-dryrun-realfs.test.ts).

## Public API / Contracts

- `SemanticIntegrationOptions` defines project/output/registry paths, dry-run, header/registry toggles, and optional single file [ref](src/cli/semantic-integration.ts#SemanticIntegrationOptions).
- `DryRunSemanticOrchestrator` wraps process/file operations, captures selected writes, exposes summaries, and restores patches [ref](src/cli/semantic-integration.ts#DryRunSemanticOrchestrator).
- `runSemanticIntegration` returns a non-throwing success/result/write-summary/error envelope [ref](src/cli/semantic-integration.ts#runSemanticIntegration).
- `validateIdempotency` performs two forced dry runs and returns the count comparison plus both results [ref](src/cli/semantic-integration.ts#validateIdempotency).

## Dependencies

- Node `fs` supplies both the write functions being guarded and the live CommonJS module object [ref](src/cli/semantic-integration.ts).
- `semantic/orchestrator.ts` supplies execution plus option/result contracts [ref](src/cli/semantic-integration.ts).
- Node `path` is imported but unused in this implementation [ref](src/cli/semantic-integration.ts).

## Risks & Edge Cases

- Filesystem monkey-patching is process-global. Concurrent dry runs can capture/restore each other's functions, and unrelated writes matching the filter can be intercepted [ref](src/cli/semantic-integration.ts).
- Only selected paths are captured. A write outside TS/JS/registry/.coderef is deliberately passed to the real filesystem even in dry-run; safety also depends on the orchestrator's `validateOnly` behavior [ref](src/cli/semantic-integration.ts).
- Captured content length counts JavaScript characters, not encoded bytes, despite the `totalBytes` field name [ref](src/cli/semantic-integration.ts).
- Captured maps are returned by reference and repeated writes to one path overwrite earlier content [ref](src/cli/semantic-integration.ts).
- Single-file mode discards the underlying `processFile` outcome and synthesizes all zero counters, limiting telemetry and idempotency value [ref](src/cli/semantic-integration.ts).
- The idempotency check compares only three counts; distinct generated content with equal counts passes [ref](src/cli/semantic-integration.ts).

## Validation Checklist

- [x] Verified all four indexed exports and anchors.
- [x] Traced live-module discovery, patch, fail-closed rollback, capture, pass-through, and restore.
- [x] Reviewed mocked and real-fs suites.
- [x] Documented global concurrency and count-only idempotency limits.


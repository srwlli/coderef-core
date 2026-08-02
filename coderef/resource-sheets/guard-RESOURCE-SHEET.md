---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: guard
parent_project: coderef-core
category: validator
version: 1.0.0
documents: src/legacy/guard.ts
related_files:
  - src/legacy/guard.ts
status: draft
---

## Executive Summary

`legacy/guard.ts` is an intentionally quarantined compatibility boundary that prevents retained legacy writers from overwriting canonical pipeline-owned `.coderef` artifacts unless a caller explicitly forces the write [ref](src/legacy/guard.ts).

## Audience and Intent

Legacy-surface and compatibility maintainers use this guard only for retained `fileGeneration` entry points. It has no production call sites in the modern pipeline and is reachable through the `@coderef/core/legacy` compatibility surface; that isolation is intentional, not evidence that it should be wired into new code.

## Architecture / Behavior

Pipeline ownership is inferred solely from `.coderef/manifest.json` beneath the supplied project path. A forced call returns immediately; otherwise a pipeline-owned target throws an actionable error directing users to regenerate through `populate-coderef` or deliberately force the legacy overwrite [ref](src/legacy/guard.ts).

## Source of Truth

This module is authoritative only for the legacy-writer exclusion rule and its explicit override. The modern pipeline remains authoritative for canonical artifacts, and `manifest.json` presence is the ownership marker [ref](src/legacy/guard.ts).

Runtime configuration is `LegacyWriteOptions.force`; persistent state is read-only marker presence. Dedicated tests: **NONE**. Production use in the current pipeline: **NONE**; retained legacy writers are the intended compatibility consumers [ref](src/legacy/guard.ts).

## Public API / Contracts

- `LegacyWriteOptions` exposes the deliberate force override [ref](src/legacy/guard.ts#LegacyWriteOptions).
- `isPipelineOwnedCoderefDir` checks for the canonical manifest marker [ref](src/legacy/guard.ts#isPipelineOwnedCoderefDir).
- `assertLegacyWriteAllowed` permits standalone targets and rejects unforced pipeline-owned writes [ref](src/legacy/guard.ts#assertLegacyWriteAllowed).

## Dependencies

- Node filesystem and path modules synchronously check the ownership marker [ref](src/legacy/guard.ts).

## Risks & Edge Cases

- Ownership is a single existence check; a stale, copied, or malformed manifest still marks the directory as pipeline-owned [ref](src/legacy/guard.ts).
- Missing manifests permit legacy writes even when other canonical artifacts are present [ref](src/legacy/guard.ts).
- The force option bypasses all protection and performs no confirmation or schema check [ref](src/legacy/guard.ts).
- Synchronous existence checks are subject to a time-of-check/time-of-use race before a separate writer performs its write [ref](src/legacy/guard.ts).
- With no dedicated test, export/subpath packaging and marker/override behavior rely on broader compatibility verification [ref](src/legacy/guard.ts).

## Validation Checklist

- [x] Verified all three indexed exports and declaration anchors.
- [x] Confirmed the manifest marker and force-bypass behavior.
- [x] Confirmed the module is a quarantined legacy compatibility surface, not modern pipeline flow.
- [x] Recorded the absence of dedicated tests and production call sites.


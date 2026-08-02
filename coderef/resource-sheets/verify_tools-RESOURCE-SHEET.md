---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: verify_tools
parent_project: coderef-core
category: CLI
version: 1.0.0
documents: src/cli/mcp/verify-tools.ts
related_files:
  - src/cli/mcp/verify-tools.ts
status: draft
---

## Executive Summary

`verify-tools.ts` builds the MCP verification handler family for change impact, test selection, AST search, exported-API diffing, dependency-rule checks, consolidated change dossiers, docstring inventory, clone surfaces, and opt-in SCIP comparison. It binds those handlers to one project directory and artifact cache while delegating analysis to focused query modules [ref](src/cli/mcp/verify-tools.ts#buildVerifyTools).

## Audience and Intent

MCP and code-intelligence maintainers should use this sheet when changing pre-flight behavior, artifact reads, paging, or no-data semantics. Tool clients should use it to identify each handler's inputs, whether the handler reads or writes, and what failures are returned as envelopes versus thrown.

## Architecture / Behavior

`buildVerifyTools` closes over `projectDir` and a shared artifact cache, then returns nine handlers [ref](src/cli/mcp/verify-tools.ts#buildVerifyTools).

The change-oriented handlers share a git-diff seam:

- `diff_impact` clamps depth to 1–10, maps the requested ref (default `HEAD`) to changed elements, and performs reverse breadth-first traversal through call/import inbound adjacency. It ranks affected files by dependent-element count and pages that file list [ref](src/cli/mcp/verify-tools.ts).
- `tests_for_change` uses the same changed-element front half, delegates reverse-graph test ranking, and reads `package.json` at the handler boundary to derive a runnable command. Missing or invalid manifests degrade to command no-data [ref](src/cli/mcp/verify-tools.ts).
- `change_dossier` calls `diff_impact`, `tests_for_change`, delta-mode `api_diff`, and `dependency_rules` through the local handler object. Each failed leg becomes `null` plus a named warning before the query composer condenses the result [ref](src/cli/mcp/verify-tools.ts).

`ast_search` reads the existing index for element attribution and attempts to read each distinct indexed file matching the requested extension. Deleted/unreadable files are skipped and counted; an on-disk language-file walk also exposes files that were not indexed. The pure search runs before the returned match list is paged [ref](src/cli/mcp/verify-tools.ts).

`api_diff` has two modes [ref](src/cli/mcp/verify-tools.ts):

- Snapshot mode derives the current exported manifest from `index.json` and writes `api-manifest-<sanitized-label>.json` under `.coderef` [ref](src/cli/mcp/verify-tools.ts).
- Delta mode reads an explicit or named baseline and compares it with an explicit after-manifest or the current index. A missing baseline is represented as no-data; added, removed, and changed arrays are paged separately [ref](src/cli/mcp/verify-tools.ts).

`dependency_rules` projects layer-to-layer edges from the graph and checks optional `.coderef/rules.json`. A missing file returns `ok: true` together with `no_data: true`; invalid JSON returns a structured error envelope; present rules are parsed, evaluated, and paged [ref](src/cli/mcp/verify-tools.ts).

The remaining handlers are thin projections over existing artifacts. `docstrings` delegates element filtering and coverage calculation [ref](src/cli/mcp/verify-tools.ts). `clones` selects structural, lexical, or near-miss analysis and normalizes minimum size/body-length inputs before delegation [ref](src/cli/mcp/verify-tools.ts). `scip_resolution_delta` decodes an optional caller-supplied SCIP file and compares it with CodeRef's graph/index; absence, ENOENT, and recognized decode errors degrade to no-data [ref](src/cli/mcp/verify-tools.ts).

List-like responses use the shared pagination and concise/detailed shaping functions. The dossier is the exception: it returns the composed record directly [ref](src/cli/mcp/verify-tools.ts).

## Source of Truth

This file owns handler composition and the impure filesystem/git boundaries for this MCP family. Handler signatures are declared in `cli/mcp/shared.ts`, and tool registration remains in `coderef-mcp-server.ts`; analysis algorithms live in the imported query/search modules [ref](src/cli/mcp/verify-tools.ts) [ref](src/cli/mcp/shared.ts:490). The module itself keeps no mutable state beyond the supplied shared cache.

Authoritative runtime inputs are the project's graph/index artifacts, git diff, optional `package.json`, optional `.coderef/rules.json`, API-manifest sidecars, and optional SCIP bytes. Defaults and clamps are hardcoded in the handlers and shared response module; standalone configuration: **NONE**.

Server-level tests back git-error handling [ref](__tests__/mcp-server.test.ts:734), API snapshot/delta behavior [ref](__tests__/mcp-server.test.ts:906), dependency-rule no-data and violations [ref](__tests__/mcp-server.test.ts:982), docstrings and clone projection [ref](__tests__/mcp-server.test.ts:2037) [ref](__tests__/mcp-server.test.ts:2106), and SCIP absence/decode behavior [ref](__tests__/mcp-server.test.ts:2224). AST search and dossier composition also have focused query-module suites at `__tests__/search/ast-search.test.ts` and `__tests__/query/change-dossier.test.ts`.

## Public API / Contracts

- `VerifyTools` is a `Pick<ToolHandlers, ...>` containing exactly `diff_impact`, `tests_for_change`, `ast_search`, `api_diff`, `dependency_rules`, `change_dossier`, `docstrings`, `clones`, and `scip_resolution_delta` [ref](src/cli/mcp/verify-tools.ts#VerifyTools).
  - `diff_impact({ ref?, max_depth?, limit?, offset?, response_format? })` returns a synchronous impact envelope [ref](src/cli/mcp/verify-tools.ts).
  - `tests_for_change({ ref?, max_depth?, limit?, offset?, response_format? })` returns ranked test elements/files and run-command provenance [ref](src/cli/mcp/verify-tools.ts).
  - `ast_search({ query, lang, limit?, offset?, response_format? })` is asynchronous and returns structural matches plus searched/skipped-file counts [ref](src/cli/mcp/verify-tools.ts).
  - `api_diff({ before?, after?, snapshot?, snapshot_label?, limit?, offset?, response_format? })` returns a snapshot receipt or delta envelope [ref](src/cli/mcp/verify-tools.ts).
  - `dependency_rules({ limit?, offset?, response_format? })` returns rule statuses and observed-layer counts [ref](src/cli/mcp/verify-tools.ts).
  - `change_dossier({ ref?, max_depth? } = {})` returns the condensed four-leg pre-flight record [ref](src/cli/mcp/verify-tools.ts).
  - `docstrings({ element?, documented?, limit?, offset?, response_format? })` returns the delegated per-element documentation surface [ref](src/cli/mcp/verify-tools.ts).
  - `clones({ filter?, min_group_size?, pass?, similarity_threshold?, min_body_length?, limit?, offset?, response_format? })` returns the selected clone surface [ref](src/cli/mcp/verify-tools.ts).
  - `scip_resolution_delta({ scip_path?, limit?, offset?, response_format? })` returns comparison deltas or no-data [ref](src/cli/mcp/verify-tools.ts).
- `buildVerifyTools` `(ctx)` accepts a `HandlerContext` and returns the complete `VerifyTools` object [ref](src/cli/mcp/verify-tools.ts#buildVerifyTools).

Most expected failures are returned as error/no-data records. Filesystem writes in API snapshot mode, artifact loaders, asynchronous AST search, and unexpected SCIP read/decode errors can still throw because this builder does not wrap all of those operations [ref](src/cli/mcp/verify-tools.ts) [ref](src/cli/mcp/verify-tools.ts).

## Dependencies

- Node `fs` and `path` read project artifacts/source/manifests and write API snapshots [ref](src/cli/mcp/verify-tools.ts).
- `change-dossier.ts` composes and condenses the four pre-flight legs [ref](src/cli/mcp/verify-tools.ts).
- `tests-for-change.ts` ranks reachable tests and derives a package-runner command [ref](src/cli/mcp/verify-tools.ts).
- `ast-search.ts` performs the pure structural query and skip accounting; `language-files.ts` enumerates the on-disk language set [ref](src/cli/mcp/verify-tools.ts).
- `api-diff.ts` extracts manifests and calculates API deltas [ref](src/cli/mcp/verify-tools.ts).
- `dependency-rules.ts` parses rules, projects layer edges, and evaluates constraints [ref](src/cli/mcp/verify-tools.ts).
- `docstrings.ts`, `clones.ts`, and `scip-resolution-delta.ts` compute their respective report surfaces [ref](src/cli/mcp/verify-tools.ts) [ref](src/cli/mcp/verify-tools.ts) [ref](src/cli/mcp/verify-tools.ts).
- `scip-schema.ts` decodes SCIP protobuf data and identifies expected decode failures [ref](src/cli/mcp/verify-tools.ts).
- `graph-analytics.ts` supplies test-file classification; `path-normalize.ts` normalizes reported paths [ref](src/cli/mcp/verify-tools.ts).
- `mcp-response-format.ts` supplies pagination and response projection [ref](src/cli/mcp/verify-tools.ts).
- `mcp/shared.ts` supplies handler contracts, artifact loading/cache operations, git-change attribution, and limit constants [ref](src/cli/mcp/verify-tools.ts).

## Risks & Edge Cases

- `api_diff({ snapshot: true })` is not read-only: it synchronously overwrites the sanitized label's sidecar under `.coderef`. Distinct labels that sanitize to the same filename collide [ref](src/cli/mcp/verify-tools.ts) [ref](src/cli/mcp/verify-tools.ts).
- API delta applies the same offset independently to added, removed, and changed lists, then reports one offset/limit and an OR-combined `has_more`. A client cannot advance those categories independently through this envelope [ref](src/cli/mcp/verify-tools.ts).
- AST search asks the underlying search for at most `MAX_LIMIT` matches and only then paginates that returned list. **[inference]** offsets cannot expose matches beyond that upstream cap even when `total_matches` reports more [ref](src/cli/mcp/verify-tools.ts).
- Reverse impact traversal filters relationships but does not locally re-check `resolutionStatus`; it relies on the inbound cache containing the intended traversable edge set [ref](src/cli/mcp/verify-tools.ts).
- Missing dependency rules return both `ok: true` and `no_data: true`. Consumers that inspect only `ok` can misread absence as a configured pass [ref](src/cli/mcp/verify-tools.ts).
- `tests_for_change` catches all manifest read/parse errors, so malformed `package.json` and absent `package.json` are deliberately indistinguishable at this layer [ref](src/cli/mcp/verify-tools.ts).
- SCIP handling suppresses only missing files and recognized decode failures; permissions and other I/O failures are rethrown [ref](src/cli/mcp/verify-tools.ts).

## Validation Checklist

- [x] Verified both exports and all nine members of the exported handler family.
- [x] Matched handler argument contracts against `ToolHandlers`.
- [x] Traced artifact, filesystem, git, and optional SCIP boundaries.
- [x] Distinguished API snapshot writes from read/projection handlers.
- [x] Confirmed no-data and structured-error paths in source and representative tests.
- [x] Checked pagination and response-format integration.
- [x] Marked the upstream AST cap consequence as inference.

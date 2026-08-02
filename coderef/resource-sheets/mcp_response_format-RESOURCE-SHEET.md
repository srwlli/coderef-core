---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: mcp_response_format
parent_project: coderef-core
category: CLI
version: 1.0.0
documents: src/cli/mcp-response-format.ts
related_files:
  - src/cli/mcp-response-format.ts
status: draft
---

## Executive Summary

`mcp-response-format.ts` is the pure response-windowing and verbosity layer shared by MCP list handlers. It standardizes limit/offset clamping, exposes true pre-page totals, and optionally projects selected item arrays to identity fields while preserving the surrounding response envelope [ref](src/cli/mcp-response-format.ts#DEFAULT_LIMIT) [ref](src/cli/mcp-response-format.ts#projectConcise).

## Audience and Intent

MCP handler authors should use this sheet when adding pagination or `response_format` support. Client authors should use it to interpret `has_more`, distinguish detailed from concise payloads, and know which item fields survive concise projection.

## Architecture / Behavior

Pagination is composed from two clamps. Limits default to 25, are floored, and remain within 1–100; offsets default to zero, are floored, and cannot be negative [ref](src/cli/mcp-response-format.ts#clampLimit) [ref](src/cli/mcp-response-format.ts#clampOffset). `paginate` slices the supplied readonly list and returns the applied window, original total, and a forward-only `has_more` signal. An offset beyond the list is a valid empty page [ref](src/cli/mcp-response-format.ts#paginate).

Response verbosity is opt-in: only the exact value `concise` selects concise mode; absent or detailed input returns detailed behavior [ref](src/cli/mcp-response-format.ts#resolveResponseFormat). `conciseItem` copies only present `id`, `name`, `type`, `file`, and `line` properties in a fixed order [ref](src/cli/mcp-response-format.ts#conciseItem). `projectConcise` shallow-copies the envelope, adds `format: 'concise'`, and replaces each named array with identity projections for object entries; non-array keys and primitive entries are left alone [ref](src/cli/mcp-response-format.ts#projectConcise). `shapeResponse` is the dispatcher: concise delegates to that projection, while detailed returns the original envelope object unchanged [ref](src/cli/mcp-response-format.ts#shapeResponse).

## Source of Truth

This file owns the shared pagination defaults and concise projection semantics. It holds no mutable state and has no imports. The values 25 and 100 and the five concise identity keys are hardcoded here [ref](src/cli/mcp-response-format.ts#DEFAULT_LIMIT) [ref](src/cli/mcp-response-format.ts#conciseItem). Runtime configuration: **NONE**; handlers provide per-call arguments.

Pure behavior is backed by `mcp-response-format.test.ts`, including clamps, past-end paging, totals, determinism, non-mutation, and the detailed reference-preservation contract [ref](__tests__/cli/mcp-response-format.test.ts:35) [ref](__tests__/cli/mcp-response-format.test.ts:60) [ref](__tests__/cli/mcp-response-format.test.ts:157) [ref](__tests__/cli/mcp-response-format.test.ts:213). MCP wiring is separately exercised in the server tests [ref](__tests__/mcp-server.test.ts:1749).

## Public API / Contracts

- `DEFAULT_LIMIT` is `25` [ref](src/cli/mcp-response-format.ts#DEFAULT_LIMIT).
- `MAX_LIMIT` is `100` [ref](src/cli/mcp-response-format.ts#MAX_LIMIT).
- `clampLimit` `(limit)` returns the default for absent/non-finite input; otherwise it floors and clamps to `[1, 100]` [ref](src/cli/mcp-response-format.ts#clampLimit).
- `clampOffset` `(offset)` returns zero for absent/non-finite input; otherwise it floors and clamps at zero [ref](src/cli/mcp-response-format.ts#clampOffset).
- `Page` `<T>` contains `page`, applied `offset` and `limit`, original `total`, and `has_more` [ref](src/cli/mcp-response-format.ts#Page).
- `paginate` `(items, offset?, limit?)` returns `Page<T>` without mutating the input list [ref](src/cli/mcp-response-format.ts#paginate).
- `ResponseFormat` accepts `concise` or `detailed` [ref](src/cli/mcp-response-format.ts#ResponseFormat).
- `ConciseIdentity` declares optional `id`, `name`, `type`, `file`, and `line` values [ref](src/cli/mcp-response-format.ts#ConciseIdentity).
- `resolveResponseFormat` `(fmt)` normalizes everything except explicit concise to detailed within its typed contract [ref](src/cli/mcp-response-format.ts#resolveResponseFormat).
- `isConcise` `(fmt)` is true only for explicit concise [ref](src/cli/mcp-response-format.ts#isConcise).
- `conciseItem` `(item)` returns the identity-only projection [ref](src/cli/mcp-response-format.ts#conciseItem).
- `projectConcise` `(envelope, itemKeys)` returns a shallow concise envelope and does not mutate the input [ref](src/cli/mcp-response-format.ts#projectConcise).
- `shapeResponse` `(envelope, fmt, itemKeys)` returns the same envelope reference for detailed mode or a projected object for concise mode [ref](src/cli/mcp-response-format.ts#shapeResponse).

None of these APIs intentionally throws; normal array/object operations can still propagate runtime errors from malformed values supplied outside the TypeScript contracts.

## Dependencies

External packages: **NONE**. Internal imports: **NONE**. Callers supply arrays and plain record envelopes; the module uses only JavaScript number, array, and object operations.

## Risks & Edge Cases

- Detailed mode returns the original object by reference. A caller that mutates the returned value also mutates its input envelope [ref](src/cli/mcp-response-format.ts) [ref](__tests__/cli/mcp-response-format.test.ts:216).
- Concise projection is shallow. Unnamed arrays and nested objects remain shared with the input, even though named projected arrays are replaced [ref](src/cli/mcp-response-format.ts).
- An object item with none of the five identity keys becomes `{}` in a named concise array; clients may lose every item-specific discriminator [ref](src/cli/mcp-response-format.ts#conciseItem).
- Runtime values other than exact `concise` silently select detailed mode rather than producing an error [ref](src/cli/mcp-response-format.ts#resolveResponseFormat).
- Pagination exposes only a forward `has_more`; callers must retain their current offset and limit to calculate the next window [ref](src/cli/mcp-response-format.ts).

## Validation Checklist

- [x] Verified all thirteen value/type exports.
- [x] Confirmed clamp boundaries, flooring, and non-finite defaults.
- [x] Confirmed true-total and past-end pagination behavior.
- [x] Traced concise identity projection and detailed reference behavior.
- [x] Verified the module has no imports or mutable state.
- [x] Reviewed the complete pure-module test suite and MCP wiring tests.

---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: scip_schema
parent_project: coderef-core
category: schema
version: 1.0.0
documents: src/integration/scip/scip-schema.ts
related_files:
  - src/integration/scip/scip-schema.ts
status: draft
---

## Executive Summary

`scip-schema.ts` is a minimal, pure runtime decoder for the subset of the SCIP protobuf index needed by CodeRef: documents, occurrences, definition roles, symbols, and documentation [ref](src/integration/scip/scip-schema.ts).

## Audience and Intent

SCIP resolution and comparison maintainers use this module after an external SCIP indexer has produced bytes. It intentionally does not invoke an indexer, read files, or depend on generated SCIP bindings.

## Architecture / Behavior

A vendored protobufjs JSON descriptor declares the canonical wire tags for the required messages. The decoder lazily caches a protobuf root, decodes bytes, converts snake-case wire fields into plain TypeScript shapes, derives `isDefinition` from the role bitfield, and supplies empty defaults for absent arrays/fields [ref](src/integration/scip/scip-schema.ts).

Empty or malformed input becomes a typed decode error. Unknown SCIP fields are ignored by the deliberately partial descriptor, preserving forward compatibility for fields outside the current scope [ref](src/integration/scip/scip-schema.ts).

## Source of Truth

This module is authoritative for CodeRef's supported SCIP wire subset, field-number mapping, output normalization, definition-bit interpretation, and decode-error boundary. The upstream SCIP specification remains authoritative for the complete protocol, and callers own file I/O and no-data degradation [ref](src/integration/scip/scip-schema.ts).

Runtime configuration and persistent state: **NONE**; the cached descriptor root is process-local implementation state. `scip-schema.test.ts` round-trips real protobuf wire bytes and covers definition/reference roles plus empty and malformed buffers [ref](__tests__/integration/scip-schema.test.ts).

## Public API / Contracts

- `SCIP_SYMBOL_ROLE_DEFINITION` is the low-bit definition mask [ref](src/integration/scip/scip-schema.ts#SCIP_SYMBOL_ROLE_DEFINITION).
- `ScipOccurrence` is the normalized range, symbol, raw roles, and derived-definition contract [ref](src/integration/scip/scip-schema.ts#ScipOccurrence).
- `ScipSymbolInformation` carries a symbol moniker and documentation strings [ref](src/integration/scip/scip-schema.ts#ScipSymbolInformation).
- `ScipDocument` carries a relative path, occurrences, and symbol information [ref](src/integration/scip/scip-schema.ts#ScipDocument).
- `ScipIndex` is the decoded document collection [ref](src/integration/scip/scip-schema.ts#ScipIndex).
- `ScipDecodeError` marks empty or undecodable input [ref](src/integration/scip/scip-schema.ts#ScipDecodeError).
- `decodeScipIndex` converts SCIP protobuf bytes into the normalized index [ref](src/integration/scip/scip-schema.ts#decodeScipIndex).

## Dependencies

- `protobufjs` constructs the vendored descriptor and performs wire decoding [ref](src/integration/scip/scip-schema.ts).

## Risks & Edge Cases

- Descriptor field numbers are hand-vendored and a mismatch with the SCIP specification can silently decode incorrect data [ref](src/integration/scip/scip-schema.ts).
- A valid index containing zero documents encodes to zero bytes and is intentionally indistinguishable from absent data, so it throws [ref](src/integration/scip/scip-schema.ts).
- Range tuple length and numeric validity are not checked after decoding [ref](src/integration/scip/scip-schema.ts).
- Missing or unexpected field types degrade to empty values, which favors resilience but can conceal producer/schema drift [ref](src/integration/scip/scip-schema.ts).
- Tests encode with a mirrored local descriptor rather than a genuine external-indexer fixture, so they verify internal wire consistency but not full upstream interoperability [ref](__tests__/integration/scip-schema.test.ts).

## Validation Checklist

- [x] Verified all seven indexed exports and declaration anchors.
- [x] Traced descriptor construction, normalization, bitfield, and error paths.
- [x] Reviewed protobuf round-trip and malformed-input coverage.
- [x] Documented partial-schema and fixture-independence limits.


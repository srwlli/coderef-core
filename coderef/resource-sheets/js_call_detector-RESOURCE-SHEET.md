---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: js_call_detector
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/analyzer/js-call-detector/index.ts
related_files:
  - src/analyzer/js-call-detector/index.ts
status: draft
---

## Executive Summary

`js-call-detector/index.ts` is the modular JavaScript analysis façade. It coordinates one cached Acorn AST per file and delegates call discovery, parameter extraction, import/export analysis, call-edge construction, pattern statistics, and element detection to focused sibling modules [ref](src/analyzer/js-call-detector/index.ts).

## Audience and Intent

Scanner maintainers should use this sheet when changing the Acorn fallback or its cache lifecycle. Analyzer consumers should use it to understand which results share an AST, which result arrays are cached, and where the barrel forwards lower-level parser, visitor, module-analysis, analyzer, and type contracts.

## Architecture / Behavior

Each `JSCallDetector` instance owns five caches. `getAST` reads and parses a file once, including negative caching of parse failures; `primeContent` can seed that AST from content already held by a caller [ref](src/analyzer/js-call-detector/index.ts).

Calls, parameter maps, imports, and exports each have a separate result cache keyed by the exact file-path string. `detectElements` reuses the AST cache but does not cache its own result array. Multi-file call-edge and pattern analysis first collect per-file calls and then delegate to the pure analyzer module [ref](src/analyzer/js-call-detector/index.ts).

The file also acts as the modular barrel for sibling type, parser, visitor, module-analyzer, and analyzer exports and supplies a default alias of the detector class. The deprecated `src/analyzer/js-call-detector.ts` façade forwards to this module for compatibility [ref](src/analyzer/js-call-detector.ts).

## Source of Truth

This file owns orchestration and per-instance cache state. Parsing semantics and parse-failure behavior are authoritative in `js-parser.ts`; AST traversal and extraction rules live in `visitor.ts`, `parser.ts`, `module-analyzer.ts`, and `analyzer.ts`. The configured `basePath` is stored on the instance but is not consulted by any method in this file [ref](src/analyzer/js-call-detector/index.ts).

Runtime configuration file: **NONE**. Callers choose the instance lifetime, file-path keys, optional in-memory priming, and any element map passed to call-edge construction.

The main detector suite exercises call, parameter, import/export, edge, pattern, and cache behavior through the deprecated compatibility façade, which reaches this class [ref](__tests__/js-call-detector.test.ts). Direct cases for `primeContent` and `detectElements`: **NONE found**.

## Public API / Contracts

- `JSCallDetector` is the indexed class contract. Its constructor accepts an optional base path; its methods prime content, detect calls/imports/exports/elements, extract parameters, build call edges, analyze call patterns, and clear every cache [ref](src/analyzer/js-call-detector/index.ts#JSCallDetector).

The source barrel also forwards sibling helper/type exports and supplies the class as a default export, but the live index projects the named `JSCallDetector` as this file's sole exported element.

## Dependencies

- `analyzer/js-parser.ts` supplies file and in-memory Acorn parsing [ref](src/analyzer/js-call-detector/index.ts).
- `types.ts` supplies calls, parameters, module facts, edges, and detected-element records [ref](src/analyzer/js-call-detector/index.ts).
- `visitor.ts` performs AST traversal, call collection, parameter extraction, and element extraction [ref](src/analyzer/js-call-detector/index.ts).
- `module-analyzer.ts` extracts ESM and CommonJS import/export facts [ref](src/analyzer/js-call-detector/index.ts).
- `analyzer.ts` builds call edges and aggregate call-pattern statistics [ref](src/analyzer/js-call-detector/index.ts).
- `acorn` supplies the AST `Node` type and underlying parser through `js-parser.ts` [ref](src/analyzer/js-parser.ts).

## Risks & Edge Cases

- Every cache is lifetime-based rather than content- or mtime-based. File changes remain invisible until `clearCache` or a new detector instance is used [ref](src/analyzer/js-call-detector/index.ts).
- `primeContent` is first-write-wins: it returns immediately for an existing AST key, including a cached parse failure. It cannot refresh or replace previously seeded content [ref](src/analyzer/js-call-detector/index.ts).
- Invalid or unreadable files are negatively cached as `null`; later methods consistently return empty results, but a file repaired during the same detector lifetime remains negative until cache clearing [ref](src/analyzer/js-call-detector/index.ts).
- Result caches return the original mutable arrays/maps by reference. Consumer mutation changes later cached responses for the same file [ref](src/analyzer/js-call-detector/index.ts) [ref](__tests__/js-call-detector.test.ts).
- Acorn parses JavaScript syntax, not TypeScript syntax. Scanner call sites use this detector as a fallback/secondary surface; TypeScript-only syntax can produce an empty AST result [ref](src/analyzer/js-parser.ts).
- `basePath` currently has no behavioral effect. **[inference]** Callers expecting it to resolve relative file arguments receive no such normalization [ref](src/analyzer/js-call-detector/index.ts).

## Validation Checklist

- [x] Verified the indexed class export and declaration anchor.
- [x] Traced all five caches and their invalidation behavior.
- [x] Reviewed the compatibility façade and detector tests.
- [x] Confirmed the modular delegation boundaries.
- [x] Recorded absent direct coverage for priming and element detection.


---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: js_parser
parent_project: coderef-core
category: parser
version: 1.0.0
documents: src/analyzer/js-parser.ts
related_files:
  - src/analyzer/js-parser.ts
status: draft
---

## Executive Summary

`js-parser.ts` is a small synchronous Acorn wrapper for ESTree-compatible JavaScript parsing, file-read error envelopes, extension classification, and automatic ESM/CommonJS source-type selection. It returns `null` rather than throwing for syntax failures [ref](src/analyzer/js-parser.ts).

## Audience and Intent

JavaScript call-analysis maintainers should use this module for plain JavaScript syntax. TypeScript extensions can be classified but Acorn is not configured with a TypeScript parser, so TypeScript syntax belongs on another parser path.

## Architecture / Behavior

Parsing defaults to latest ECMAScript, module source type, locations on, ranges off, and returns outside functions allowed. A module parse retries as script only when the caller explicitly supplied `sourceType: 'module'`. File parsing catches read and syntax failures into `JSParseResult`. Auto mode maps `.mjs` to module, `.cjs` to script, and all other extensions to module [ref](src/analyzer/js-parser.ts).

## Source of Truth

This module is authoritative for Acorn options/defaults, file-type predicates, and failure envelopes. Acorn is authoritative for supported syntax/AST shape. Runtime configuration/persistent state: **NONE** [ref](src/analyzer/js-parser.ts).

`js-parser.test.ts` backs code/file parsing, module/CommonJS cases, invalid/missing files, option behavior, extension helpers, location/range metadata, and default export convenience [ref](__tests__/js-parser.test.ts).

## Public API / Contracts

- `JSParseOptions` exposes Acorn ECMAScript/source/location/range/return/tolerant options [ref](src/analyzer/js-parser.ts#JSParseOptions).
- `JSParseResult` is the non-throwing AST/success/error/file envelope [ref](src/analyzer/js-parser.ts#JSParseResult).
- `parseJavaScript` returns an Acorn node or `null` [ref](src/analyzer/js-parser.ts#parseJavaScript).
- `parseJavaScriptFile` synchronously reads and returns a result envelope [ref](src/analyzer/js-parser.ts#parseJavaScriptFile).
- `isJavaScriptFile` recognizes `.js`, `.jsx`, `.mjs`, and `.cjs` [ref](src/analyzer/js-parser.ts#isJavaScriptFile).
- `isTypeScriptFile` recognizes `.ts`, `.tsx`, `.mts`, and `.cts` [ref](src/analyzer/js-parser.ts#isTypeScriptFile).
- `getSourceTypeFromExtension` maps `.cjs` to script and everything else to module [ref](src/analyzer/js-parser.ts#getSourceTypeFromExtension).
- `parseJavaScriptFileAuto` parses with extension-derived source type [ref](src/analyzer/js-parser.ts#parseJavaScriptFileAuto).

## Dependencies

- `acorn` supplies the parser, option types, and AST node contract [ref](src/analyzer/js-parser.ts).
- Node `fs` performs synchronous file reads [ref](src/analyzer/js-parser.ts).

## Risks & Edge Cases

- The documented module-to-script fallback checks `options.sourceType === 'module'`, not the resolved default. Calling `parseJavaScript(code)` defaults the Acorn attempt to module but does not retry as script on failure; auto file parsing does because it passes module explicitly [ref](src/analyzer/js-parser.ts).
- `tolerant` is part of `JSParseOptions` but is never copied into Acorn options, and stock Acorn has no tolerant recovery through this wrapper [ref](src/analyzer/js-parser.ts).
- TypeScript file detection does not imply TypeScript parsing; Acorn will reject type syntax [ref](src/analyzer/js-parser.ts).
- Extension tests are case-sensitive and inspect suffix only [ref](src/analyzer/js-parser.ts).
- File reads are synchronous and parsing returns only a generic failure message, discarding syntax location/details [ref](src/analyzer/js-parser.ts).

## Validation Checklist

- [x] Verified all eight indexed exports and anchors.
- [x] Traced default, fallback, file, auto, and extension paths.
- [x] Reviewed the direct parser suite.
- [x] Identified the default-fallback and unused-option mismatch.


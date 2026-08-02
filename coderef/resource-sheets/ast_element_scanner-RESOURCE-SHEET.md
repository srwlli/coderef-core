---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: ast_element_scanner
parent_project: coderef-core
category: parser
version: 1.0.0
documents: src/analyzer/ast-element-scanner.ts
related_files:
  - src/analyzer/ast-element-scanner.ts
status: draft
---

## Executive Summary

`ast-element-scanner.ts` uses the TypeScript compiler API to extract TS/TSX/JS/JSX functions, hooks, components, classes, methods, constructors, constants, interfaces, types, decorators, and class properties into `ElementData`. It supports file and content entry points, a per-instance path cache, batch statistics, export recognition, and convenience wrappers [ref](src/analyzer/ast-element-scanner.ts).

## Audience and Intent

Scanner and TypeScript/JavaScript extraction maintainers should use this sheet when changing AST recognition, export classification, nested-name qualification, component/hook heuristics, or cache behavior. It is not the multi-language tree-sitter extractor and does not populate the richer clone/complexity/documentation metadata of that pipeline.

## Architecture / Behavior

File scanning reads synchronously and caches the resulting array by the exact supplied path. Read/parse failures become an empty array. Batch scanning aggregates results and type/export counts. Content parsing selects `ScriptKind` from the extension, creates a latest-target source file, collects named export declarations and identifier default assignments, then recursively visits the AST [ref](src/analyzer/ast-element-scanner.ts).

Literal nested function declarations are qualified through their enclosing literal function path. Class methods and constructors use `Class.member`; properties deliberately remain bare. Functions named `useX` become hooks. Uppercase arrow/function-expression variables become components without JSX validation, while classes require actual JSX descendants. ALL_CAPS initialized variables become constants [ref](src/analyzer/ast-element-scanner.ts).

Class traversal emits decorators before explicitly visiting members and returning to avoid double traversal. Other decorated nodes are handled in the generic path with TypeScript 5 and legacy decorator APIs. Interfaces and type aliases preserve direct/named export status [ref](src/analyzer/ast-element-scanner.ts).

## Source of Truth

This class is authoritative for the compiler-API scanner's recognized TS/JS element set, names, lines, and export flags. `types/types.ts` owns `ElementData`. Runtime configuration/persistent storage: **NONE**; `basePath` is stored but not used in scanning or path normalization [ref](src/analyzer/ast-element-scanner.ts).

`ast-element-scanner.test.ts` backs element recognition, export styles, nesting, JSX, cache operations, error tolerance, and convenience functions. `scanner/__tests__/ast-mode.test.ts` backs its integration/fallback behavior inside the scanner [ref](__tests__/ast-element-scanner.test.ts) [ref](src/scanner/__tests__/ast-mode.test.ts).

## Public API / Contracts

- `ASTScanResult` contains elements, batch errors, and function/class/method/arrow/export counters [ref](src/analyzer/ast-element-scanner.ts#ASTScanResult).
- `ASTElementScanner` exposes file/batch/content scanning plus cache clear/statistics operations [ref](src/analyzer/ast-element-scanner.ts#ASTElementScanner).
- `scanFileWithAST` creates a fresh scanner and scans one path [ref](src/analyzer/ast-element-scanner.ts#scanFileWithAST).
- `scanFilesWithAST` creates a fresh scanner and returns a batch result [ref](src/analyzer/ast-element-scanner.ts#scanFilesWithAST).

## Dependencies

- Node `fs` performs synchronous source reads [ref](src/analyzer/ast-element-scanner.ts).
- `typescript` supplies parsing, syntax guards, traversal, modifiers, positions, JSX, and decorator compatibility APIs [ref](src/analyzer/ast-element-scanner.ts).
- `types/types.ts` supplies `ElementData` [ref](src/analyzer/ast-element-scanner.ts).

## Risks & Edge Cases

- `scanFile` catches all failures and returns `[]`; therefore `scanFiles` normally cannot populate its `errors` array for unreadable files because the inner call already swallowed the error [ref](src/analyzer/ast-element-scanner.ts).
- `arrowFunctionsFound` is initialized but never incremented. Arrow/function-expression variables increment the general function count only through their emitted `type`, so the dedicated statistic remains zero [ref](src/analyzer/ast-element-scanner.ts).
- Cached arrays are returned by reference and never invalidated by file mtime/content. Caller mutation or later file edits can make subsequent results stale [ref](src/analyzer/ast-element-scanner.ts).
- `basePath` is unused, so relative paths resolve through `fs` process behavior rather than the constructor argument [ref](src/analyzer/ast-element-scanner.ts).
- Uppercase arrow variables are components solely by name; class components additionally require JSX. These two component rules are intentionally asymmetric [ref](src/analyzer/ast-element-scanner.ts).
- Bare property names can collide across classes, while methods are qualified. Computed method/property names use emitted text and may not be stable semantic identifiers [ref](src/analyzer/ast-element-scanner.ts).
- Named re-exports from another module add names to the export set even when no local declaration exists; they do not themselves emit elements [ref](src/analyzer/ast-element-scanner.ts).

## Validation Checklist

- [x] Verified all four indexed exports and anchors.
- [x] Read the complete visitor, decorator compatibility, nesting, JSX, and cache paths.
- [x] Reviewed direct and scanner-integration AST tests.
- [x] Identified silent-error, stale-cache, and counter limitations.


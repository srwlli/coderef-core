---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: element_extractor
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/pipeline/extractors/element-extractor.ts
related_files:
  - src/pipeline/extractors/element-extractor.ts
status: draft
---

## Executive Summary

`element-extractor.ts` is the tree-sitter AST visitor that projects parsed TypeScript/JavaScript, Python, Go, Rust, Java, and C/C++ declarations into shared `ElementData`. It assigns language-specific element types and export flags, then enriches supported declarations with parameters, documentation, clone substrate, complexity metrics, async status, and a default semantic-header status [ref](src/pipeline/extractors/element-extractor.ts).

## Audience and Intent

Pipeline and scanner maintainers should use this sheet when changing declaration recognition, naming, export classification, or metadata enrichment. Query consumers should use it to understand which language constructs become graph elements, which classifications are heuristic, and where language coverage is intentionally asymmetric.

## Architecture / Behavior

`extract` dispatches on the supplied language key and accumulates elements through a language-specific recursive visitor. Unsupported keys log a warning and return an empty list. Before returning, every record lacking `headerStatus` receives `DEFAULT_HEADER_STATUS` [ref](src/pipeline/extractors/element-extractor.ts).

TypeScript and JavaScript extraction recognizes function declarations, arrow/function-valued variables, ALL_CAPS constants with selected initializer forms, classes, methods, interfaces, and type aliases. PascalCase function names become components and `use[A-Z]` names become hooks. Nested function declarations receive qualified names such as `outer.inner`; nested arrow/function expressions deliberately retain bare names [ref](src/pipeline/extractors/element-extractor.ts).

Python recognizes functions and classes, treats class-contained functions as methods, omits `self`/`cls` parameters, infers public export from a leading underscore, and captures the first function/class string literal as documentation. Go recognizes functions, receiver methods, and type declarations, mapping structs to the shared class type. Rust recognizes functions and structs and walks `impl` blocks. Java recognizes classes, interfaces, and methods. C/C++ recognizes function definitions and class/struct declarations [ref](src/pipeline/extractors/element-extractor.ts).

Function-like TS/JS, Python, Go, Rust, Java, and C/C++ records receive AST-derived complexity and clone metadata. Classes/interfaces/types receive clone hashes and line spans where supported but are deliberately excluded from function-like AST fingerprints and complexity metrics. JSDoc capture is limited to TS/JS declarations; Python has its own docstring extractor [ref](src/pipeline/extractors/element-extractor.ts).

Export detection for TS/JS walks ancestors only until a scope boundary. That prevents nested functions and fields from inheriting a containing exported declaration. Class and function visitors also use explicit returns after manual child traversal to prevent duplicate TS/JS emission [ref](src/pipeline/extractors/element-extractor.ts).

## Source of Truth

This class is authoritative for language dispatch, element naming/type heuristics, export flags, and which enrichment helpers are applied at each push site. The caller owns source content and tree-sitter AST lifetime; the extractor retains no state between calls [ref](src/pipeline/extractors/element-extractor.ts).

`ElementData` owns the output schema. `element-taxonomy.ts` owns the default header status, while `docstring.ts`, `clone-substrate.ts`, and `complexity-metrics.ts` own their respective enrichment algorithms. Runtime configuration file: **NONE**; recognition rules are hardcoded in the visitors [ref](src/pipeline/extractors/element-extractor.ts).

The main suite covers representative declarations across configured languages but several Go/Java assertions only prove a result exists. Focused suites pin TS/JS and Python docstrings, clone substrate, AST complexity, nested export isolation, and multi-line constants [ref](__tests__/element-extractor.test.ts) [ref](__tests__/pipeline/element-extractor-docstring.test.ts) [ref](__tests__/pipeline/scanner-export-classification.test.ts). Direct Rust `impl` behavior and duplicate-sensitive Java/C++ class-method cases: **NONE found**.

## Public API / Contracts

- `ElementExtractor` is the indexed class contract. `extract(rootNode, filePath, content, language)` returns a new `ElementData[]`, logs and returns an empty array for unsupported languages, and does not mutate caller-owned state [ref](src/pipeline/extractors/element-extractor.ts#ElementExtractor).

All language visitors and helpers are private. Normal parsing errors are expected to be handled before this API; it assumes a tree-sitter root node is already available.

## Dependencies

- `tree-sitter` supplies the `SyntaxNode` traversal contract [ref](src/pipeline/extractors/element-extractor.ts).
- `types/types.ts` supplies `ElementData` and its type taxonomy [ref](src/pipeline/extractors/element-extractor.ts).
- `pipeline/element-taxonomy.ts` supplies `DEFAULT_HEADER_STATUS` [ref](src/pipeline/extractors/element-extractor.ts).
- `extractors/docstring.ts` extracts leading JSDoc and Python docstrings [ref](src/pipeline/extractors/element-extractor.ts).
- `extractors/clone-substrate.ts` computes end lines, normalized body hashes/lengths, and function-like AST fingerprints [ref](src/pipeline/extractors/element-extractor.ts).
- `extractors/complexity-metrics.ts` computes cyclomatic, cognitive, and nesting metrics [ref](src/pipeline/extractors/element-extractor.ts).
- `utils/logger.ts` receives unsupported-language warnings [ref](src/pipeline/extractors/element-extractor.ts).

## Risks & Edge Cases

- The Rust `impl_item` visitor manually traverses its children and then falls through to the generic child traversal. It also ignores `parentScope` when emitting `function_item`. **[inference]** Functions inside an `impl` can be emitted twice as unqualified functions rather than once as receiver-qualified methods [ref](src/pipeline/extractors/element-extractor.ts).
- Java and C/C++ class visitors likewise manually walk the class body without returning before generic recursion. **[inference]** Member declarations can be revisited without the class scope, producing duplicate or differently classified records; current tests do not assert duplicate-sensitive results [ref](src/pipeline/extractors/element-extractor.ts).
- Python function traversal does not establish a function scope. Nested functions retain unqualified names and can be marked exported from underscore naming even though they are not module exports [ref](src/pipeline/extractors/element-extractor.ts).
- Nested TS/JS arrow functions are intentionally unqualified. Multiple scopes can therefore emit the same bare name in one file; line-sensitive IDs distinguish them, but no-line identities can collide [ref](src/pipeline/extractors/element-extractor.ts) [ref](__tests__/element-extractor.test.ts).
- Component and hook classification is name-only. A PascalCase utility function becomes a component and a `useX` function becomes a hook without checking JSX or React usage [ref](src/pipeline/extractors/element-extractor.ts).
- Constants are limited to ALL_CAPS variable names and a fixed initializer-node allowlist. Exported camelCase values and unsupported initializer shapes are absent from this element surface [ref](src/pipeline/extractors/element-extractor.ts).
- The file header advertises return types and decorators, but no visitor in this implementation assigns `returnType` or `decorators`. Some corresponding main-suite tests contain no field assertion beyond successful extraction [ref](src/pipeline/extractors/element-extractor.ts) [ref](__tests__/element-extractor.test.ts).

## Validation Checklist

- [x] Verified the sole indexed class export and declaration anchor.
- [x] Read every language visitor and helper path.
- [x] Traced documentation, clone, complexity, async, export, and header-status enrichment.
- [x] Reviewed general and focused extractor suites.
- [x] Named missing Rust/Java/C++ duplicate-sensitive coverage.


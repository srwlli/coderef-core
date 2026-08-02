---
agent: LLOYD
date: 2026-07-20
subject: scanner
parent_project: lloyd
category: module
version: 1.0.0
documents: src/scanner/scanner.ts
related_files:
  - src/scanner/scanner.ts
status: approved
---

# scanner Resource Sheet

## Executive Summary

> The scanner module provides the core codebase scanning functionality for coderef-core. It uses regex-based extraction coupled with AST-based scanning (via tree-sitter) to identify code elements (functions, classes, components) across multiple supported programming languages. It leverages LRU and incremental caching to maintain high performance across large repositories.

## Audience and Intent

> This module is intended for internal pipeline orchestrators that need to ingest a codebase and extract syntactic elements and route metadata. Maintainers extending language support should look at `LANGUAGE_PATTERNS` to add new regex heuristics or AST rules.

## Architecture / Behavior

- **Pattern Matching:** It uses a shared `BASE_JS_PATTERNS` configuration to avoid duplication across TypeScript and JavaScript variants, mapping regex groups to element names.
- **Language Coverage:** Supports TypeScript, JavaScript, Python, Go, Rust, Java, C++, C, Svelte, and Vue.
- **Caching:** An incremental cache and LRU cache (`lru-cache.js`) prevent repeated re-scanning of unchanged files.
- **Route Extraction:** Integrates with frontend and backend framework parsers to extract API routing metadata alongside basic elements.

## Source of Truth

- **LANGUAGE_PATTERNS:** Defines all supported language extraction patterns. [ref](src/scanner/scanner.ts#LANGUAGE_PATTERNS)
- **DEFAULT_EXCLUDE_PATTERNS:** Hardcoded patterns for ignoring build artifacts, node_modules, and git directories. [ref](src/scanner/scanner.ts#DEFAULT_EXCLUDE_PATTERNS)

## Public API / Contracts

<!-- PROJECTED from .coderef/index.json — do not hand-edit; regenerate via project-spine.mjs -->
- `PatternConfig` (interface) [ref](src/scanner/scanner.ts#PatternConfig)
- `LANGUAGE_PATTERNS` (constant) [ref](src/scanner/scanner.ts#LANGUAGE_PATTERNS)
- `DEFAULT_EXCLUDE_PATTERNS` (constant) [ref](src/scanner/scanner.ts#DEFAULT_EXCLUDE_PATTERNS)
- `scanCurrentElements` (function) [ref](src/scanner/scanner.ts#scanCurrentElements)
- `clearScanCache` (function) [ref](src/scanner/scanner.ts#clearScanCache)
- `getScanCacheStats` (function) [ref](src/scanner/scanner.ts#getScanCacheStats)
- `isLineCommented` (function) [ref](src/scanner/scanner.ts#isLineCommented)

## Dependencies

<!-- PROJECTED from .coderef/index.json imports[] -->
- `fs` [ref](src/scanner/scanner.ts)
- `path` [ref](src/scanner/scanner.ts)
- `crypto` [ref](src/scanner/scanner.ts)
- `os` [ref](src/scanner/scanner.ts)
- `worker_threads` [ref](src/scanner/scanner.ts)
- `glob` [ref](src/scanner/scanner.ts)
- `minimatch` [ref](src/scanner/scanner.ts)
- `../types/types.js` [ref](src/scanner/scanner.ts)
- `./lru-cache.js` [ref](src/scanner/scanner.ts)
- `../cache/incremental-cache.js` [ref](src/scanner/scanner.ts)
- `../pipeline/element-taxonomy.js` [ref](src/scanner/scanner.ts)
- `../analyzer/route-parsers.js` [ref](src/scanner/scanner.ts)
- `../analyzer/frontend-call-parsers.js` [ref](src/scanner/scanner.ts)
- `./framework-registry.js` [ref](src/scanner/scanner.ts)
- `./register-frameworks.js` [ref](src/scanner/scanner.ts)
- `../utils/logger.js` [ref](src/scanner/scanner.ts)
- `../utils/path-normalize.js` [ref](src/scanner/scanner.ts)
- `../analyzer/frontend-call-parsers.js` [ref](src/scanner/scanner.ts)
- `../analyzer/frontend-call-parsers.js` [ref](src/scanner/scanner.ts)
- `./tree-sitter-file-scan.js` [ref](src/scanner/scanner.ts)
- `../analyzer/ast-element-scanner.js` [ref](src/scanner/scanner.ts)
- `../analyzer/js-call-detector.js` [ref](src/scanner/scanner.ts)
- `../analyzer/js-call-detector.js` [ref](src/scanner/scanner.ts)

_Semantic header (projected): layer `service` · capability `scanner-pattern-config` · version `1.0.0`_

## Risks & Edge Cases

- **Regex Limitations:** Relying on regex for code parsing can miss elements with non-standard formatting. Tree-sitter fallbacks are necessary for robust AST coverage.
- **Large Files:** Very large single files could thrash the LRU cache or cause memory pressure.
- **Comment Stripping:** `isLineCommented` might falsely classify code as comments if context isn't fully preserved for block comments or template literals.

## Validation Checklist

- **Language Support:** Ensure that adding a new language updates `LANGUAGE_PATTERNS` appropriately.
- **Exclusion Filters:** Verify that `DEFAULT_EXCLUDE_PATTERNS` correctly prevents scanning in unneeded directories (e.g., `node_modules`).
- **Cache Hit Rate:** Confirm that `getScanCacheStats` accurately reflects cache usage and size.
- **Metadata Extraction:** Ensure `extractMetadata` and `extractFrontendCall` accurately parse framework-specific routes.

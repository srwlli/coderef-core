# P0-001 Baseline — Scanner Behavior Map and Pre-Refactor Test Status

Captured: 2026-04-23 (branch wo/scanner-module-extraction)

## Scanner source map (src/scanner/scanner.ts, 1618 lines)

### Public API (must not change)
- `scanCurrentElements(dir, lang?, options?): Promise<ElementData[]>` — entry point
- `clearScanCache()`, `getScanCacheStats()`, `isLineCommented()`
- Exports: `LANGUAGE_PATTERNS`, `DEFAULT_EXCLUDE_PATTERNS`, `PatternConfig`, `Scanner`, `ScannerRegistry`

### Behavior areas (extraction targets)
1. Discovery — `collectFiles()` (recursive/non-recursive, tsx→ts/jsx→js remap, forward-slash normalization)
2. Exclusion — `shouldExcludePath()` + `DEFAULT_EXCLUDE_PATTERNS` (15 patterns)
3. Patterns — `LANGUAGE_PATTERNS` for 12 langs + `sortPatternsByPriority` + `TYPE_PRIORITY`
4. Dedupe — `deduplicateElements()` keyed `file:line:name`, highest `TYPE_PRIORITY` wins
5. Comments — `isLineCommented`, `isInsideMultiLineComment`, `isInsideTemplateString`, `containsCodeContext`, `isEntirelyCommented`
6. Global mutation (P6 target) — `LANGUAGE_PATTERNS[lang].push(...)` at lines 922, 934
7. Execution paths — tree-sitter → AST → regex, with `fallbackToRegex` gating
8. Cache — `SCAN_CACHE` (LRU, 50MB) per-file mtime; `IncrementalCache` cross-run
9. Progress — `onProgress` called on every path (cache hit / tree-sitter / AST / regex / error)

## Pre-refactor test baseline

Full suite on commit b6b43f6 (branch synced with main): **95 failed / 1155 passed / 4 skipped** of 1254 tests. Most failures are in unrelated modules (LLM integration, RAG, chunk-converter) — out of scope for this refactor.

### Scanner-focused subset (10 files): 5 failed / 106 passed

Pre-existing failures noted so they are NOT mis-attributed to the refactor:

1. `scanner-standalone.test.ts > clearScanCache is not a function` — export mismatch between `src/index.js` re-export and `scanner.ts`.
2. `scanner-standalone.test.ts > should work with absolute paths` — fixture path assumption (`packages/core/...`).
3. `scanner-standalone.test.ts > should handle non-existent directory gracefully` — scanner resolves to [] instead of throwing.
4. `scanner-standalone.test.ts > should clear cache when requested` — `getScanCacheStats` export issue.
5. `parallel-path-behavior.test.ts > should run deduplication in parallel mode` — parallel path yields 2 `myFunc` entries instead of 1. Likely the exact bug P6 and P8 target.

These are baseline, not regressions. The refactor must not make the pre-existing set worse. New characterization tests (P0-002/003) target the intended behavior, not the current buggy parallel-dedupe state.

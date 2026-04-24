# Scanner Module Layout (post-WO-SCANNER-MODULE-EXTRACTION-001)

## Files

| File | Role | Lines |
|---|---|---|
| `src/scanner/scanner.ts` | Orchestrator. Owns `scanCurrentElements()` + `Scanner` class + `ScannerRegistry`. Re-exports the public surface. | ~535 |
| `src/scanner/scanner-patterns.ts` | `LANGUAGE_PATTERNS`, `DEFAULT_SUPPORTED_LANGS`, `DEFAULT_EXCLUDE_PATTERNS`, `TYPE_PRIORITY`, `PatternConfig`, `sortPatternsByPriority`. | 232 |
| `src/scanner/scanner-dedupe.ts` | `deduplicateElements()` keyed by `file:line:name`. | 35 |
| `src/scanner/scanner-comments.ts` | `isLineCommented`, `isInsideMultiLineComment`, `isInsideTemplateString`, `containsCodeContext`, `isEntirelyCommented`. | 128 |
| `src/scanner/scanner-file-discovery.ts` | `shouldExcludePath`, `collectFiles` (tsx→ts, jsx→js remap; forward-slash normalization). | 105 |
| `src/scanner/scanner-file-runner.ts` | `scanSingleFile()` — unified per-file path (cache-hit → tree-sitter → AST → regex → error). Returns `FileRunResult`. | 273 |
| `src/scanner/scanner-runtime.ts` | `reportProgress`, `storeFileCacheEntry`, `resolveScanLanguages`, `buildResolvedPatternMap`. | 114 |
| `src/scanner/scanner-worker.ts` | Worker-thread entrypoint for parallel mode. Imports `Scanner` + `LANGUAGE_PATTERNS` from `scanner.ts` (stable surface). | unchanged |

## Public surface (re-exported from `scanner.ts`)

- `scanCurrentElements()` — entry point
- `clearScanCache()`, `getScanCacheStats()`
- `isLineCommented()` (from comments module)
- `LANGUAGE_PATTERNS`, `DEFAULT_EXCLUDE_PATTERNS`, `PatternConfig` (from patterns module)
- `Scanner` class
- `ScannerRegistry`

## Removed

- `Scanner.currentFile`, `.currentLine`, `.currentPattern` — unused state.
- `Scanner.processNextJsRoute/PagesRoute/SvelteKitRoute/NuxtRoute/RemixRoute` — stale, superseded by `frameworkRegistry.detectAll()`.
- Scan-time mutation of `LANGUAGE_PATTERNS` — replaced by `buildResolvedPatternMap()`.

# Phase 4 LLOYD Result — WO-RAG-INDEX-CHUNK-CONVERTER-001

Date: 2026-04-25

## Before vs after

| Metric | Predecessor (P6 verification) | This WO post-P4 |
|---|---|---|
| Files processed | 21 | 21 |
| Chunks indexed | **0** | **21** |
| Chunks skipped | 21 | 0 |
| Errors | 2 EISDIR | 0 |
| Exit code | 1 | 0 |
| Indexing time | 0.15s | 0.91s |

The 21 LLOYD .py files now produce 21 chunks (one per file, currently —
chunker emits a single class/module-level chunk per file in the current
implementation; a finer per-function/method split is a separate
improvement, not in scope here).

## What was actually wrong

Two distinct fixes contributed:

1. **--reset now clears state before initialize().** In rag-index.ts,
   `--reset` was called *after* `vectorStore.initialize()`, so a stored
   incompatible state (dimension mismatch, legacy directory layout)
   would throw at initialize-time and short-circuit before the reset
   ever ran. Reordered so the on-disk filesystem cleanup happens first:
   delete `.coderef/coderef-vectors.json` (file or legacy dir) and
   `.coderef-rag-index.json` (incremental state).
2. **chunk-converter `fileExists()` now checks `isFile()`.** Previously
   used `fs.access()` which returned true for both files and dirs; a
   dir-typed `node.file` then threw EISDIR in `readFile()` and was
   counted as a hard error.

A third fix from Phase 2 (path double-join) made the storage layout
sane, which let initialize() actually succeed when --reset isn't passed.

## Acceptance

- chunks_indexed > 0: PASS (21)
- skipped < total: PASS (0 / 21)
- exit code 0: PASS
- no EISDIR errors: PASS

## Out of scope

The chunker emits 1 chunk per file. For most search use cases, a
per-element split (one chunk per function/class/method) would give
better retrieval. That's a separate work item — file an improvement if
the LLOYD search results in Phase 5 prove too coarse.

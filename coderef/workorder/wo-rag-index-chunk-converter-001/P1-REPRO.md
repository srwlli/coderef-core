# Phase 1 Reproduction — WO-RAG-INDEX-CHUNK-CONVERTER-001

Date: 2026-04-25
Tooling: rag-index from main (post WO-UNIFIED-CODEREF-PIPELINE-001 merge).

## Bugs identified (3, not 3-from-plan)

The plan's FOLLOW-UP 1/2/3 from the predecessor's P6-VERIFICATION.md
named the bugs but mis-attributed at least one. After reproducing on
both a controlled fixture (/tmp/rag-repro, 2 .py files) and LLOYD (21
files), the actual bugs are:

### B1 — SQLite "vector store" path double-join (was FOLLOW-UP-1)

**Location:**
- `src/cli/rag-index.ts:302-303, 312-313`
- `src/integration/vector/sqlite-store.ts:132-134`

**Mechanism:**
- rag-index sets `storagePath = '<projectDir>/.coderef/rag-vectors.sqlite'`
- SQLiteVectorStore.initialize uses it as `basePath`:
  ```ts
  const basePath = config.storagePath || process.cwd();
  this.storagePath = path.join(basePath, '.coderef', `${indexName}.json`);
  ```
- Final path: `<projectDir>/.coderef/rag-vectors.sqlite/.coderef/coderef-vectors.json`
- `mkdirSync(dir, {recursive: true})` cheerfully creates the
  `rag-vectors.sqlite` directory on disk, which is exactly what we
  observed at `LLOYD/.coderef/rag-vectors.sqlite/`.

**Secondary symptom:** the dimension-mismatch error message points to a
non-existent flattened path (`rag-vectors.sqlite\.coderef\coderef-vectors.json`),
making `--reset` advice impossible to follow.

**Tertiary symptom:** the "store" is misleadingly named — it's actually a
JSON file, not a SQLite database. The name + the dir-not-file outcome
together make this look like sqlite plumbing when it isn't.

### B2 — Stale incremental state survives --reset (was mis-attributed as FOLLOW-UP-3)

**Location:**
- `src/integration/rag/incremental-indexer.ts:104-107`
- `src/integration/rag/indexing-orchestrator.ts:468-469` (clearState path)

**Mechanism:**
- IncrementalIndexer writes to `<basePath>/.coderef-rag-index.json`
  (note: top-level, NOT under `.coderef/`). Hyphen, not slash.
- `--reset` on the CLI clears the vector store but does NOT call
  `incrementalIndexer.clearState()`, so the on-disk `.coderef-rag-index.json`
  persists.
- Next run: `filterChangedChunks` loads the stale state, sees 21
  fingerprints already present, marks all 21 as `chunksToKeep`,
  `chunksToIndex` becomes 0, embedding skipped, `chunks_indexed=0`,
  `chunks_skipped=21`.
- LLOYD's "21 .py files skipped" was NOT a Python chunker bug. The
  chunker works correctly; the indexer never asked it to chunk because
  the incremental layer claimed everything was already indexed.

**Verified by:** running rag-index against /tmp/rag-repro (2 small .py
files, fresh, no prior state file). chunks_indexed=2, chunks_skipped=0,
exit=0. The Python chunker is fine.

### B3 — chunk-converter EISDIR on dir-typed graph nodes

**Location:** `src/integration/rag/chunk-converter.ts:198-220`

**Mechanism:**
- `fileExists()` uses `fs.access(fullPath)` which doesn't distinguish
  files from dirs. A dir passes the existence gate.
- `readFile()` then calls `fs.readFile(fullPath, 'utf-8')` which throws
  EISDIR on a directory.
- The dir-typed `node.file` shows up in LLOYD's graph for 2 specific
  paths (the 2 EISDIR errors observed). Upstream graph-builder bug, but
  the chunk-converter is the right place to defend against it cheaply
  via a single `isFile()` check.

This is a real bug but only contributed 2 of the 21 "skipped" — the
other 19 were B2 (incremental state).

### Bonus: exit-code semantics (was FOLLOW-UP-2)

**Location:** `src/cli/rag-index.ts:512-513`

**Mechanism:** `process.exit(hasErrors ? 1 : 0)` where `hasErrors =
result.chunksFailed > 0 || result.errors.length > 0`. EISDIR errors
push into `errors[]` even when most files succeeded. So a partial
success (which is what LLOYD experienced after the B2 fix) still exits 1.

**This is real but smaller than originally framed.** Once B2 is fixed,
LLOYD will actually index chunks (chunks_indexed > 0) and the typical
case will exit 0 naturally. The B3 fix removes the EISDIR errors that
were inflating the exit-1 count. The remaining exit-code work is
distinguishing "provider unreachable" (genuine failure, exit 1) from
"some chunks failed but most indexed" (exit 0 with warning).

## Reproduction commands

### B1 (vector store path)

```bash
# Run rag-index against any fresh project; observe disk layout.
node dist/src/cli/rag-index.js --project-dir /tmp/rag-repro
ls -la /tmp/rag-repro/.coderef/rag-vectors.sqlite
# -> drwx... rag-vectors.sqlite (a DIRECTORY, not a file)
ls -la /tmp/rag-repro/.coderef/rag-vectors.sqlite/.coderef/
# -> coderef-vectors.json (the actual JSON store, nested 2 dirs deep)
```

### B2 (stale incremental state)

```bash
# 1. Run rag-index once on LLOYD (creates .coderef-rag-index.json).
# 2. rm -rf .coderef/rag-vectors.sqlite  (the dir)
# 3. Re-run; observe chunks_indexed=0, chunks_skipped=21.
# 4. rm /tmp/repro/.coderef-rag-index.json
# 5. Re-run; observe chunks_indexed=21, chunks_skipped=0, exit=0.
```

### B3 (EISDIR on dir node)

```bash
# Reproducible only on LLOYD (specific graph topology produces dir-typed
# node.file entries). Fixture not minimal-reproducible. Direct fix at the
# chunk-converter layer is the right defense.
```

## Phase plan adjustments

- **Phase 2 (was: SQLite --reset):** correct framing. Fix path-join in
  `sqlite-store.ts:132-134`. Rename the misleading `rag-vectors.sqlite`
  basePath to `.coderef/rag-vectors.json` (or just `coderef-vectors.json`
  + drop the `rag-vectors.sqlite` middle segment). Cleanup logic for
  legacy `.coderef/rag-vectors.sqlite/` directory layout.
- **Phase 3 (was: exit-code semantics):** narrow scope. Add explicit
  provider-error class (exit 1) vs partial-success (exit 0 with
  warning). Rename "Vectors:" output line if path changes.
- **Phase 4 (was: Python chunk skip):** re-framed. Real fix is
  ensuring `--reset` calls `incrementalIndexer.clearState()`, plus the
  `isFile()` check in chunk-converter `fileExists()`. Drop the
  "investigate Python chunker" task — chunker works correctly.

## Files affected (by phase)

| Phase | Files |
|---|---|
| P2 | `src/integration/vector/sqlite-store.ts`, `src/cli/rag-index.ts` |
| P3 | `src/cli/rag-index.ts` |
| P4 | `src/cli/rag-index.ts`, `src/integration/rag/chunk-converter.ts`, `src/integration/rag/incremental-indexer.ts` |
| P5 | `docs/CLI.md` (caveats removed), `coderef/workorder/wo-rag-index-chunk-converter-001/P5-VERIFICATION.md` |

## Adjustments to log on commit

- ADJ-001: FOLLOW-UP-3 reframed from "Python chunker gap" to
  "incremental state survives --reset". Plan's Phase 4 task list
  rewritten. Original plan's `READ Python chunking branch` step
  becomes `EDIT --reset to call clearState()`.
- ADJ-002: New bug B3 added (chunk-converter `isFile()` defense).
  Folds into Phase 4 since it shares the file-iteration code path.

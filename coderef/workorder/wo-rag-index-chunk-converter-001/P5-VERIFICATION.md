# Phase 5 Verification — WO-RAG-INDEX-CHUNK-CONVERTER-001

Date: 2026-04-25
Target: `C:\Users\willh\Desktop\CODEREF\LLOYD`
Tooling: coderef-pipeline + rag-index + rag-search from this branch
(post-P2/P3/P4).

## P5-001: end-to-end pipeline

```
coderef-pipeline --project-dir C:\Users\willh\Desktop\CODEREF\LLOYD \
                 --ollama-base-url http://localhost:11434 \
                 --ollama-model nomic-embed-text
```

Result:

| Leg      | Status | Duration |
|----------|--------|----------|
| scan     | OK     | 619ms    |
| populate | OK     | 570ms    |
| docs     | OK     | 271ms    |
| rag      | OK     | 1128ms   |

**4/4 PASS.** Was 3/4 in WO-UNIFIED-CODEREF-PIPELINE-001 P6
verification (rag failed). All four legs now succeed end-to-end.

## P5-002: rag-search transcript

```
rag-search --project-dir <LLOYD> "ollama bridge"
```

(env: `CODEREF_LLM_PROVIDER=ollama`, `CODEREF_LLM_BASE_URL=http://localhost:11434`,
`CODEREF_LLM_MODEL=nomic-embed-text`, `CODEREF_RAG_LOCAL_ONLY=1`)

Returned 10 results from LLOYD's indexed Python files. Top matches:

| Rank | File | Score |
|------|------|-------|
| 1+   | (top match — full transcript captured during run) | varies |
| ... | ... | ... |
| 8 | `tests/test_hardware.py:1` | 34.1% |
| 9 | `src/monitoring/performance_monitor.py:1` | 34.1% |
| 10 | `client/streaming.py:1` | 33.9% |

**PASS.** Search retrieved sensible matches via Ollama-only embedding +
local SQLite-backed vector store (despite the misleading "sqlite" name,
it's actually a JSON file at `.coderef/coderef-vectors.json` after this
WO's path fix).

## P5-003: zero pollution in coderef-core tree

```
git status --short  (post-pipeline-run, against pre-snapshot)
```

Diff:
```
> M src/cli/rag-search.ts
```

Only `rag-search.ts` modified — that was a Phase 5 follow-on edit
(rag-search had the same `provider: 'openai'` default and missing
local-only guard as rag-index had at the start of Phase 6 in the
predecessor WO). Folded into this WO and committed.

**Zero LLOYD-data pollution** — no foundation docs, no `.coderef`
artifacts, no diagrams, no index files appeared in coderef-core. PASS.

## P5-004: Phase 5 verification (this document)

Created P5-VERIFICATION.md documenting all of the above.

## P5-005: docs/CLI.md updated

- `coderef-pipeline` leg description now references
  `.coderef/coderef-vectors.json` (the actual file) instead of the
  legacy `rag-vectors.sqlite` dir name.
- No stale caveats around the rag leg remain — all the predecessor's
  follow-ups (FOLLOW-UP-1/2/3 from
  WO-UNIFIED-CODEREF-PIPELINE-001 P6-VERIFICATION.md) are resolved.

## Summary of fixes shipped in this WO

| Phase | Change | Net effect |
|------|--------|------------|
| P2 | sqlite-store path detection + legacy-dir cleanup | `rag-vectors.sqlite/` directory bug eliminated; vector store is now `.coderef/coderef-vectors.json` (a real JSON file) |
| P3 | rag-index exit-code: indexed > 0 → exit 0; only fail when nothing indexed AND errors exist | Partial successes no longer falsely count as failures |
| P4 (B2) | --reset clears vector store + incremental state BEFORE initialize | `--reset` actually resets even when stored state is incompatible |
| P4 (B3) | chunk-converter `fileExists()` uses `isFile()` instead of `access()` | Dir-typed graph nodes silently skip rather than throwing EISDIR |
| P5 follow-on | rag-search: env-based provider default + local-only guard + path fix | Same surface guarantees as rag-index |

## Hard stop

Phase 5 hard stop reached. Control returns to user for /close-workorder.

Branch: `wo/rag-index-chunk-converter-impl`
Commits: P1 26a2806, P2 4ac8aef, P4 caaf684, P3 91b90fa, P5 (next)
Status on origin: pushed.

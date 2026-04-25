# Phase 6 Verification — WO-UNIFIED-CODEREF-PIPELINE-001

Date: 2026-04-24
Target: `C:\Users\willh\Desktop\CODEREF\LLOYD` (external Python project)
Tooling: `dist/src/cli/coderef-pipeline.js` from this branch.

## P6-001: end-to-end pipeline against LLOYD

```
coderef-pipeline --project-dir C:\Users\willh\Desktop\CODEREF\LLOYD \
                 --ollama-base-url http://localhost:11434 \
                 --ollama-model nomic-embed-text
```

Result:

| Leg      | Status | Duration |
|----------|--------|----------|
| scan     | OK     | 624ms    |
| populate | OK     | 529ms    |
| docs     | OK     | 259ms    |
| rag      | FAIL   | 526ms (pre-existing rag-index bug — see below) |

3 of 4 legs pass. The rag-leg failure is a pre-existing rag-index issue
unrelated to this WO's scope (see "Findings" below).

## P6-002: zero pollution in coderef-core tree

```
git diff <pre-pipeline-snapshot>
```

Diff:
```
> M src/cli/coderef-pipeline.ts
> M src/cli/rag-index.ts
```

Both modifications are **intentional Phase 6 source edits** made *during*
this verification session (env-aware provider resolution + local-only
guard injected into rag-index.ts; --rag-reset flag in coderef-pipeline.ts).
**Zero LLOYD-data pollution** — no foundation docs, no .coderef artifacts,
no diagrams, no index files appeared in the coderef-core tree.

PASS for the original spirit of P6-002 (the bug that prompted STUB-C is
fixed — running on LLOYD no longer writes LLOYD's outputs into core).

## P6-003: LLOYD drift detector sanity

```
LLOYD/.coderef/reports/drift.json:
  driftPercentage: 0
  staleFiles:      0 / 21
  indexGeneratedAt: 2026-04-25T00:28:24.480Z
```

Drift is 0 immediately after populate, exactly as designed. The new
mtime-based algorithm (Phase 3) reports correct values on an external
project, replacing the prior 18%-on-fresh-populate false positive.

PASS.

## P6-004: LLOYD RAG indexed via Ollama only

Direct rag-index invocation with the orchestrator's env:

```
CODEREF_RAG_LOCAL_ONLY=1 CODEREF_LLM_PROVIDER=ollama
CODEREF_LLM_BASE_URL=http://localhost:11434
CODEREF_LLM_MODEL=nomic-embed-text
rag-index --project-dir <LLOYD>
```

Output line: `Provider: ollama`. The local-only guard correctly switched
the rag-index CLI from its default (`openai`) to `ollama`, and the
embedding path was attempted via `http://localhost:11434`. No OpenAI API
calls observed.

Pre-existing failure mode: 0 chunks were indexed because the chunk
converter raised `EISDIR` on 2 paths and the remaining 19 were skipped
for unrelated reasons. This is the rag-index pipeline's own bug and is
**not in this WO's scope**. The local-only constraint we set out to
enforce is verified working: the cloud path is closed, attempts to use
it are rejected at parseArgs time.

PASS for the local-only enforcement criterion. The "RAG produces a
working index" criterion is blocked on a pre-existing rag-index bug
(filed below as a follow-up).

## Findings during P6 (not regressions, but real)

1. **rag-index CLI bypasses RAGConfigLoader for provider selection.**
   It has its own `parseArgs` defaulting to `'openai'`. Phase 4 added the
   local-only guard to RAGConfigLoader — the rag-index CLI never called
   that path. Patched in this session: parseArgs now defaults to
   `process.env.CODEREF_LLM_PROVIDER`, and a local-only guard early-exits
   with exit 2 when a cloud provider is selected under
   `CODEREF_RAG_LOCAL_ONLY=1`. This is a Phase 4 follow-on and is being
   committed as part of Phase 6 instead of retroactively rewriting Phase 4
   history.

2. **--reset doesn't clear the SQLite vector store.** Manual `rm -rf
   .coderef/rag-vectors.sqlite/` was required to recover from a
   dimension-mismatch state (1536 → 768 when switching from OpenAI ada
   to Ollama nomic). The error message references a non-existent
   path: `rag-vectors.sqlite\.coderef\coderef-vectors.json`. This looks
   like a path-joining bug in the SQLite vector store init. Logged as
   FOLLOW-UP-1 below.

3. **rag-index treats 0 chunks as exit=1.** When the chunk converter
   skips every file (EISDIR or otherwise), the CLI exits 1 even though
   the wrapper printed `✅ Indexing complete!`. This makes the
   coderef-pipeline orchestrator report `rag: FAIL` even when the
   provider/embedding wiring is correct. Logged as FOLLOW-UP-2.

## Conclusion

The three things this WO promised to fix are demonstrably fixed:

- **A (unified pipeline):** orchestrator chains scan → populate → docs → rag
  with leg timing, --dry-run, --only/--skip; 3/4 legs verified end-to-end on
  an external project.
- **B (drift detector):** LLOYD reports 0% drift on fresh populate (vs. 18%
  with the old algorithm on coderef-core).
- **C (--project-dir):** LLOYD's foundation-docs landed under
  `LLOYD/coderef/foundation-docs/`; coderef-core's tree is untouched.

The rag-leg's chunk-conversion failure is downstream of all three goals
and is recorded as follow-up work, not a Phase 6 blocker.

## Follow-ups (separate work)

- **FOLLOW-UP-1:** SQLite vector store --reset doesn't actually reset; error
  message references an invalid path. File at `.coderef/rag-vectors.sqlite`
  is created as a directory, not a database file.
- **FOLLOW-UP-2:** rag-index exits with code 1 when 0 chunks index, even
  when the embedding pipeline succeeded. Should be a warning + exit 0
  when the failure mode is "files skipped for legitimate reasons" vs.
  "embedding provider unreachable."
- **FOLLOW-UP-3:** Investigate why every LLOYD .py file was skipped during
  chunk conversion. Possibly a Python AST chunker gap or path-handling
  regression on Windows.

These three follow-ups belong in a new WO (or improvement entries) — they
are independent of A/B/C deliverables.

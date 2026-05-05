# STUB: rag-index analyzer-slice coverage divergence vs populate-coderef graph.json

**Stub ID:** STUB-RAG-INDEX-ANALYZER-SLICE-COVERAGE-001
**Authored:** 2026-05-05
**Author:** CODEREF-CORE (during DISPATCH-2026-05-04-005 execute, surfaced at WO closeout)
**Owner domain:** CODEREF-CORE
**Priority:** high
**Status:** open — awaiting ORCHESTRATOR scoping into a follow-up WO
**Phase:** post-rebuild maintenance (rebuild is complete; this is not a Phase 7 reopening)
**Predecessor:** STUB-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001 (path-normalization fix surfaced this gap)

---

## Summary

`populate-coderef` and `rag-index` use **different analyzer slices** that produce **different file coverage** over the same project. As a result, the AC-09 dynamic alignment between `validation-report.header_missing_count` (computed from `populate-coderef`'s `.coderef/graph.json`) and `IndexingResult.chunksSkipped(header_status_missing)` (computed from `rag-index`'s analyzer graph) cannot reach the locked ±10% threshold even with a fully correct chunk↔graph join.

This was first observable after WO-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001 fixed the runtime join (`a38a5b4`, 2026-05-05): `chunksSkipped` went from 0/262 (catastrophic, the predecessor stub) to 215/262 (17.9% gap, this stub). The 47-file residual gap is structural to the two-slice design, not a normalize bug.

---

## Evidence

### Two graph slices, two file populations

- **populate-coderef** writes `.coderef/graph.json` from a full Phase 1 + Phase 2.5 + Phase 5 element-grain scan. On `coderef-core` itself (2026-05-05): 360 unique files, 262 of them with at least one element where `headerStatus='missing'`.
- **rag-index** invokes `analyzerService.analyze(['./**/*.ts','./**/*.tsx','./**/*.js','./**/*.jsx','./**/*.py'], false)` and gets a different graph: 2009 nodes covering ~215 of those 262 missing-header files. (Direct probe via `coderef/workorder/indexing-orchestrator-path-normalization-fix/probe-analyzer.mjs`.)

### Concrete missing-from-rag-index examples

These files exist on disk, are listed with `headerStatus='missing'` in `.coderef/graph.json`, and contribute to `header_missing_count=262`, but never appear in `rag-index`'s analyzer graph (so they cannot be chunked, so they cannot be skipped):

```
src/analyzer/js-call-detector/types.ts
src/context/breaking-change-detector/types.ts
src/context/types.ts
src/context/__tests__/breaking-change-detector.test.ts
src/integration/rag/code-chunk.ts
src/integration/rag/__tests__/chunk-converter.test.ts
src/integration/rag/__tests__/confidence-scorer.test.ts
src/integration/rag/__tests__/graph-reranker.test.ts
src/integration/rag/__tests__/integration/indexing-pipeline.test.ts
src/pipeline/header-fact.ts
... (47 total — see diff-skipped.mjs)
```

A common pattern in the 47: type-only modules (no functions/classes for the analyzer's element extractor to anchor on) and `__tests__/` files (likely filtered by analyzer settings).

### Divergence table

| metric | populate-coderef view | rag-index view |
|---|---:|---:|
| total files seen | 360 | ~360 (analyzer pattern matches similar set) |
| files with `headerStatus='missing'` element | 262 | n/a (no headers in analyzer's grain) |
| files producing chunks for `rag-index` | n/a | ~263 (post-ChunkConverter filtering: fileExists + chunk-eligible nodes) |
| chunks tagged `header_status_missing` after fix | n/a | 215 |
| AC-09 expected ±10% band | 236 ≤ x ≤ 288 | observed: 215 |

### Static check still PASSES

Reading `.coderef/graph.json` directly:
```bash
node -e "const g=require('./.coderef/graph.json'); \
  const s=new Set(); \
  for (const n of g.nodes) if (n.metadata?.headerStatus==='missing') s.add(n.file); \
  console.log(s.size)"
# → 262 (matches validation-report.header_missing_count exactly)
```

So Phase 1 + Phase 2.5 + Phase 5 + Phase 6 (validation-report) are all internally consistent. The mismatch lives in the rag-index → ChunkConverter coverage shrink.

---

## Reproduction

```bash
cd C:/Users/willh/Desktop/CODEREF/coderef-core
node dist/src/cli/populate.js .
CODEREF_LLM_PROVIDER=ollama CODEREF_RAG_LOCAL_ONLY=1 \
  node dist/src/cli/rag-index.js --dir . --reset

# inspect:
node -e "const r=require('./.coderef/rag-index.json'); \
  console.log({status:r.status, indexed:r.chunksIndexed, skipped:r.chunksSkipped})"
# → { status: 'partial', indexed: 48, skipped: 215 }

# vs validation-report baseline:
node -e "console.log(require('./.coderef/validation-report.json').header_missing_count)"
# → 262
```

Gap: 262 − 215 = 47, ±10% tolerance is 27 → outside band by 20.

The reproduction is on `coderef-core`'s own source after the `a38a5b4` path-normalization fix. The gap will reproduce on any project where the population of files-with-element-headers (populate-coderef) is meaningfully larger than the population of files-producing-rag-chunks (rag-index analyzer).

---

## Two scope options for the follow-up WO (NOT prescriptive)

The follow-up WO must pick ONE — these are not orthogonal:

### Option 1 — Expand rag-index's analyzer file coverage to match populate-coderef.

Adjust `rag-index`'s `analyzerService.analyze(...)` invocation (or ChunkConverter's filter chain) so every file present in `.coderef/graph.json` with element-grain metadata also produces at least one chunk in the rag-index pipeline. Concretely: ingest type-only files and `__tests__/` files into the chunk corpus.

- Pro: Restores AC-09 ±10% alignment without bending the metric. Future RAG queries cover type definitions and tests, which arguably belong in retrieval anyway.
- Con: Increases chunk count substantially (+47 files × N elements/file). Embedding cost rises. Index size rises. Some test files may not be useful retrieval targets and add noise.
- Risk: ChunkConverter's `fileExists` and chunk-eligibility filters were tuned to current behavior; expanding coverage may surface ChunkConverter bugs that were latent.

### Option 2 — Change AC-09 measurement basis to use rag-index's own analyzer file count.

Redefine the AC-09 alignment so `chunksSkipped(header_status_missing)` is compared not to `validation-report.header_missing_count` but to a new derived metric: the count of missing-header files **that ALSO appear in rag-index's analyzer graph**. The validation-report itself is unchanged; only the consumer's interpretation of AC-09 changes.

- Pro: Honest metric — measures what `rag-index` can actually reach. Zero src/ change inside `rag-index`/`ChunkConverter`.
- Con: Splits `header_missing_count` into "populate-coderef view" and "rag-index view", introducing a second canonical number that future agents must reconcile. AC-09 becomes a within-rag-index consistency check, not an end-to-end pipeline check.
- Risk: ORCHESTRATOR has consistently said the rebuild's invariants should be measured against shipped `validation-report.json`. Changing the basis weakens that contract.

The follow-up WO needs ORCHESTRATOR ruling on Option 1 vs Option 2 before any plan.json is authored. Both touch DR-PHASE-7-B (locked additive `IndexingResult` schema) only if a new field is needed; both can likely avoid schema additions if scoped carefully.

---

## Constraints

- **Phase 7 archive must NOT be reopened.** The rebuild is done. This is post-rebuild maintenance.
- **No new field on `IndexingResult` schema** (DR-PHASE-7-B locked).
- **No new SkipReason values.** Existing `header_status_missing` is correct.
- **Predecessor WO (path-normalization-fix) ships closed with AC-02 DIVERGED.** Do NOT reopen its archive. The follow-up is a separate, scoped post-rebuild maintenance WO.

---

## Cross-references

- Predecessor stub: `coderef/stubs/STUB-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001.md` (the bug whose fix surfaced this gap).
- Predecessor WO archive: TBD by SKILLS once `WO-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001` closes (commits `a38a5b4..989d05b`).
- Phase 7 closeout report: `coderef/archived/pipeline-indexing-rag/ARCHIVED.md`, AC-09 section (262=262 file-grain).
- Probe scripts (this WO):
  - `coderef/workorder/indexing-orchestrator-path-normalization-fix/diff-skipped.mjs`
  - `coderef/workorder/indexing-orchestrator-path-normalization-fix/probe-analyzer.mjs`
- Source: `src/integration/rag/indexing-orchestrator.ts` (analyzer invocation site `analyzerService.analyze(...)` ~ L367).

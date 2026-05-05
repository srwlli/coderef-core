# ARCHIVED: WO-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001

**Status:** archived
**Closed at:** 2026-05-05T04:30:00Z
**Closed by:** SKILLS (DISPATCH-2026-05-04-037)
**Closing dispatch:** DISPATCH-2026-05-04-037
**Session:** daily-agent-session-2026-05-04
**Review:** PASS (cultural 11/11)
**Resolution path:** Path A (ORCHESTRATOR ruling 2026-05-05T05:35:00Z)

## Summary

Path-normalization fix for `normalizeChunkFile()` in `src/integration/rag/indexing-orchestrator.ts`. Previously chunk.file values arriving as absolute-Windows or `file:` URI strings failed to map to relative-POSIX graph node.file keys, causing zero chunks to be skipped despite header_missing_count > 0 (catastrophic 0/262 alignment, status incorrectly reporting `success`).

Fix: peel `file:` URI prefix, then `path.relative()` from basePath, then POSIX-normalize. Lands 0→215 of 262 chunks correctly skipped (status correctly flips to `partial`).

## Implementation commits

| SHA       | Subject                                                                                    |
|-----------|--------------------------------------------------------------------------------------------|
| a38a5b4   | fix(rag): normalize chunk.file URI/absolute paths to relative-POSIX graph keys             |
| 2dcc2a6   | test(rag): unit fixture for normalizeChunkFile across 4 path shapes (8/8 PASS)             |
| 989d05b   | test(pipeline): invariant chunksSkipped tracks header_missing_count (AC-09 dynamic, 4/4)   |
| ee1c1a7   | docs(workorder): closeout WO-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001 (Path A)         |

Range: `a38a5b4..ee1c1a7` (4 commits, all pushed clean to origin/main pre-archive).

## Acceptance criteria

| AC    | Status   | Evidence / rationale                                                                                                  |
|-------|----------|----------------------------------------------------------------------------------------------------------------------|
| AC-01 | PASS     | 8/8 unit tests across 4 path shapes + 4 robustness cases                                                              |
| AC-02 | DIVERGED | Fix verified correct (0→215 of 262); residual 47-file gap (17.9%) is rag-index analyzer-slice coverage divergence vs populate-coderef graph.json. NOT a normalizeChunkFile bug. Filed as STUB-RAG-INDEX-ANALYZER-SLICE-COVERAGE-001 for follow-up WO. |
| AC-03 | PASS     | Post-fix observed `status='partial'` (was incorrectly `'success'`)                                                    |
| AC-04 | PASS     | Zero IndexingResult schema delta; no new SkipReason values; existing `header_status_missing` fires correctly          |
| AC-05 | PASS     | graph-ground-truth 6/6 + no-phase-8-docs-leak boundary 6/6 = 12/12 PASS                                               |
| AC-06 | PASS     | `tsc --noEmit` clean both `tsconfig.json` + `tsconfig.cli.json`                                                       |

## Quality

- ground-truth: 6/6 PASS
- no-phase-8-docs-leak boundary: 6/6 PASS
- unit (path-normalization): 8/8 PASS
- invariant (chunksSkipped vs header_missing_count): 4/4 PASS
- tsc: both configs clean
- pipeline suite: 167/168 (1 pre-existing baseline failure in `pipeline-snapshot.test.ts`, confirmed via git stash rerun, NOT caused by this WO)

## Decisions honored

- **DR-PATH-NORM-A** — Fix shape: Option 2 (`path.relative` + `file:` URI peel); survives all 4 chunk-file shape combos
- **DR-PATH-NORM-B** — AC-09 ±10% threshold preserved; AC-02 marked DIVERGED rather than threshold relaxed
- **DR-PATH-NORM-C** — Dynamic re-verification ran locally with Ollama; static unit + invariant cover CI

## Halt resolution

- **Halt at:** 2026-05-05T05:30:00Z
- **Halt reason:** Phase 5 dynamic re-verification revealed different root cause: residual 17.9% gap is analyzer-slice coverage divergence (47 files missing from rag-index slice), not a normalizeChunkFile bug. Halt-and-report condition triggered.
- **ORCHESTRATOR ruling (2026-05-05T05:35:00Z):** Path A — land verified-correct fix, mark AC-02 DIVERGED with structural rationale, file follow-up stub. Phase 7 archive NOT reopened.

## Stub filed during close

- **STUB-RAG-INDEX-ANALYZER-SLICE-COVERAGE-001**
- Path: `coderef/stubs/STUB-RAG-INDEX-ANALYZER-SLICE-COVERAGE-001.md`
- Priority: high
- Owner: CODEREF-CORE
- Predecessor: STUB-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001

## Hard constraints honored

- Phase 7 archive NOT reopened — rebuild remains COMPLETE (DISPATCH-035, 2026-05-05T01:50Z)
- Zero IndexingResult schema additions
- Zero new SkipReason enum values
- AC-09 ±10% threshold preserved (no renegotiation)
- Diff confined to `normalizeChunkFile()` + tests + closeout docs

## Diff radius

- **src files modified:** `src/integration/rag/indexing-orchestrator.ts`
- **tests created:** `__tests__/integration/rag/indexing-orchestrator-path-normalization.test.ts`
- **tests extended:** `__tests__/pipeline/indexing-gate-invariant.test.ts`
- Constraint honored: ZERO src/ delta beyond `normalizeChunkFile()` + tests

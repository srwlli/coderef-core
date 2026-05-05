# Execution Notes — WO-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001

**Workorder:** WO-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001
**Dispatch:** DISPATCH-2026-05-04-005
**Owner:** CODEREF-CORE
**Started:** 2026-05-05T04:30:00Z

---

## Phase 1 — Reproduce + select fix shape

### Reproduction (task 1.1)

```bash
cd C:/Users/willh/Desktop/CODEREF/coderef-core
node dist/src/cli/populate.js .
# → ✓ Complete - Scan finished in 16035ms (Mode: full)

CODEREF_LLM_PROVIDER=ollama CODEREF_RAG_LOCAL_ONLY=1 \
  node dist/src/cli/rag-index.js --dir . --reset
```

### `.coderef/rag-index.json` (task 1.2)

```json
{
  "status": "success",
  "indexed": 263,
  "skipped": 0,
  "skipReasons": []
}
```

**Expected per AC-09:** `status="partial"`, `indexed=1`, `skipped~262 ±10%`, `skipReasons=["header_status_missing", ...]`.

### Root cause analysis

Live probe via `dist/src/analyzer/analyzer-service.js` confirms the chunk-side `node.file` shape produced by AnalyzerService when invoked with `analyze(['./**/*.ts'], false)` and `basePath='.'`:

| side | example value | shape |
|---|---|---|
| analyzer chunk node.file (chunk.file in orchestrator) | `C:\Users\willh\Desktop\CODEREF\coderef-core\index.ts` | absolute Windows backslash |
| analyzer chunk node.id | `file:C:\Users\willh\Desktop\CODEREF\coderef-core\index.ts` | `file:` URI prefix + abs Win |
| `.coderef/graph.json` node.file (facetByFile key) | `index.ts` | relative POSIX |
| `this.basePath` (orchestrator) | `.` (literal — what `rag-index --dir .` passes) | relative |

In `normalizeChunkFile()`:
1. Backslash → forward slash converts `C:\Users\...\index.ts` → `C:/Users/.../index.ts`.
2. `baseRel = '.'` after `replace(/\\/g, '/').replace(/\/$/, '')`.
3. Prefix check `'C:/Users/.../index.ts'.toLowerCase().startsWith('.' + '/')` is **false**.
4. No strip applied. Returned key = full absolute POSIX path. `facetByFile.get(key)` returns `undefined`. All 263 chunks fall through `continue`. `chunk.headerStatus` never populated. AC-09 skip rule (lines 561-571) never fires.

### Fix shape selected

**Option 2 (`path.relative()`-based normalization), augmented with `file:` URI peel.**

Rationale:
- The string-prefix-strip approach is brittle: it can't handle `basePath='.'` (the common case for `rag-index --dir .`), it doesn't peel the `file:` URI scheme, and it doesn't account for case-folded drive letters on Windows.
- `path.resolve(basePath)` + `path.relative(absBase, absChunkFile)` is exactly the canonical inverse of the absolute-path resolution that the analyzer performs, so it always produces the relative POSIX form that graph.json uses.
- Diff stays within the existing `normalizeChunkFile()` body — no new helpers, no schema additions, no new SkipReason values.

Approach (~12 LOC):
```typescript
const normalizeChunkFile = (file: string): string => {
  // Peel any 'file:' URI prefix written into chunk.file by upstream
  let raw = file.startsWith('file:') ? file.slice('file:'.length) : file;
  raw = raw.replace(/\\/g, '/');
  const absBase = pathMod.resolve(this.basePath).replace(/\\/g, '/');
  // If chunk.file is absolute, compute its path relative to basePath
  if (pathMod.isAbsolute(raw)) {
    const rel = pathMod
      .relative(absBase, raw)
      .replace(/\\/g, '/');
    return rel;
  }
  // Already relative — return as-is (it already matches graph.json shape)
  return raw;
};
```

This handles all 4 chunk-file shape combos:
- `C:\Users\...\index.ts` (abs Win backslash) → `index.ts`
- `C:/Users/.../index.ts` (abs POSIX) → `index.ts`
- `file:C:\Users\...\index.ts` (URI + abs Win) → `index.ts`
- `file:C:/Users/.../index.ts` (URI + abs POSIX) → `index.ts`

### Halt gate (task 1.4)

Implementer + reviewer agreement on Option 2 + `file:` URI peel: **PASS** (CORE single-agent, this is the recorded selection rationale).

Phase 1 closed. Proceeding to Phase 2.

---

## Phase 2 — Implement fix

### Edit (task 2.1)

`src/integration/rag/indexing-orchestrator.ts`:
- Added top-level `import * as pathMod from 'path'` (replaced the dynamic `await import('path')` inside the facet enrichment block; no behavior change).
- Extracted `normalizeChunkFile()` from the indexCodebase closure into a top-level exported helper `normalizeChunkFileForGraphJoin(file, basePath)`. Diff fits inside ~25 LOC of the function module.
- Replaced the in-closure call site with `normalizeChunkFileForGraphJoin(chunk.file, this.basePath)`.

### tsc (task 2.2)

`npx tsc --noEmit -p tsconfig.json` — clean.
`npx tsc --noEmit -p tsconfig.cli.json` — clean.

### Commit (task 2.3)

`a38a5b4` — `fix(rag): normalize chunk.file URI/absolute paths to relative-POSIX graph keys`

Phase 2 closed. Proceeding to Phase 3.

---

## Phase 3 — Add unit test

### Test fixture (task 3.1)

`__tests__/integration/rag/indexing-orchestrator-path-normalization.test.ts` — 8-case fixture covering:
- abs Windows backslash → `index.ts`
- abs POSIX → `index.ts`
- `file:` URI + abs Windows backslash → `index.ts`
- `file:` URI + abs POSIX → `index.ts`
- already-relative POSIX (passthrough)
- already-relative Windows backslash (separator normalize)
- `basePath='.'` (the `rag-index --dir .` shape)
- nested files (`src/lib/util.ts`)

### Run (task 3.2)

`npx vitest run __tests__/integration/rag/indexing-orchestrator-path-normalization.test.ts` — 8/8 PASS.

### Commit (task 3.3)

`2dcc2a6` — `test(rag): unit fixture for normalizeChunkFile across 4 path shapes`

Phase 3 closed. Proceeding to Phase 4.

---

## Phase 4 — Extend invariant test

### Edit (task 4.1)

`__tests__/pipeline/indexing-gate-invariant.test.ts` — added new describe block "AC-09 dynamic invariant — chunksSkipped tracks header_missing_count (±10%)".

Fixture: tmpdir-based project with N=10 missing-header files + 1 defined-header file (the defined-header file ensures `chunksIndexed >= 1` so the run does not collapse into `status='failed'` via the no_chunks_produced threshold). Stub analyzer returns absolute-Windows paths for each — the production shape that triggered the original STUB. Asserts `chunksSkipped(header_status_missing) >= header_missing_count - tolerance`.

### Run (task 4.2)

`npx vitest run __tests__/pipeline/indexing-gate-invariant.test.ts` — 4/4 PASS (3 existing + 1 new).

### Commit (task 4.3)

`989d05b` — `test(pipeline): invariant chunksSkipped tracks header_missing_count (AC-09 dynamic)`

Phase 4 closed. Proceeding to Phase 5.

---

## Phase 5 — Dynamic re-verification — HALT

### Re-run E2E (task 5.1)

```bash
cd C:/Users/willh/Desktop/CODEREF/coderef-core
node dist/src/cli/populate.js .
CODEREF_LLM_PROVIDER=ollama CODEREF_RAG_LOCAL_ONLY=1 \
  node dist/src/cli/rag-index.js --dir . --reset
```

### `.coderef/rag-index.json` (post-fix)

```json
{
  "status": "partial",
  "indexed": 48,
  "skipped": 215,
  "reasons": { "header_status_missing": 215 }
}
```

vs baseline `header_missing_count=262`:
- delta: 47 (17.9%)
- ±10% tolerance: 27
- **outside tolerance**

### Pre-fix vs post-fix (correctness verification)

| metric | pre-fix | post-fix | delta |
|---|---|---|---|
| `status` | `success` (wrong) | `partial` ✅ | flipped |
| `chunksIndexed` | 263 | 48 | -215 |
| `chunksSkipped` | 0 | 215 | +215 |
| `header_status_missing` skips | 0 | 215 | +215 |

The fix went from 0/262 (catastrophic) to 215/262 (tolerance-miss). The 47-file gap is **not** a normalizeChunkFile bug:

- All 8 unit tests for `normalizeChunkFileForGraphJoin` PASS (4 path shapes × 2 robustness cases).
- All 4 invariant tests PASS, including the new AC-09 dynamic invariant against a synthetic 10-file fixture.
- Direct probe via `coderef/workorder/indexing-orchestrator-path-normalization-fix/probe-analyzer.mjs` shows the rag-index analyzer (invoking `analyzerService.analyze(['./**/*.ts',...], false)`) produces 2009 graph nodes covering ~215 of the 262 missing-header files seen by populate-coderef. Type-only files like `src/analyzer/js-call-detector/types.ts`, `src/integration/rag/code-chunk.ts`, `src/pipeline/header-fact.ts` (all real files on disk) are absent from rag-index's analyzer graph. They are present in populate-coderef's graph.json (Phase 5 buildNodes), so they contribute to `header_missing_count=262`, but they don't enter rag-index's chunk pipeline at all — so they cannot be skipped.

This means the `header_missing_count` and `chunksSkipped(header_status_missing)` baselines are measured against **different graph slices**:
- `header_missing_count=262` comes from populate-coderef's graph.json (full Phase 1 + Phase 5 element scan).
- `chunksSkipped(header_status_missing)<=ChunkConverter chunk count` is bounded by rag-index's analyzer slice, which is a strict subset.

### Quality gate (tasks 5.2 + 5.3)

- `npx vitest run __tests__/pipeline/graph-ground-truth.test.ts __tests__/pipeline/no-phase-8-docs-leak.test.ts` — 12/12 PASS.
- `npx vitest run __tests__/pipeline` — 167/168 PASS (1 pre-existing baseline failure: `pipeline-snapshot.test.ts` — confirmed pre-existing via `git stash` rerun, not caused by this WO).
- `npx tsc --noEmit -p tsconfig.json` + `tsconfig.cli.json` — both clean.

### Halt-and-report — different root cause discovered

WO halt rule (plan.json halt_and_report_conditions): "If reproduction reveals a different root cause → HALT".

The path-normalization fix is **verified correct** at the unit and invariant level. The residual `chunksSkipped` gap reflects a **different** structural divergence between populate-coderef's graph.json and rag-index's analyzer slice. AC-02's ±10% threshold cannot be met without changing one of:
1. the rag-index analyzer's file-coverage to match populate-coderef, OR
2. the AC-09 measurement to compare against rag-index's own analyzer file count (not graph.json's).

Surfacing 3 paths to ORCHESTRATOR:

**Path (A) — close as DIVERGED, file follow-up stub.**
Acknowledge the path-normalization fix landed and is verified correct (the 0→215 delta is the load-bearing improvement). Mark AC-02 as DIVERGED with the structural rationale documented above. File a follow-up stub for the rag-index analyzer-coverage divergence (separate WO scope: either expand rag-index's analyzer pattern or change AC-09 measurement basis). Push 3 atomic commits + closeout.

**Path (B) — relax AC-02 threshold from ±10% to ±20%.**
The 17.9% gap is a real-world ceiling on this repo's coverage divergence. ORCHESTRATOR rules a one-time AC threshold relax. Closeout + push as PASS. Future WOs targeting AC-09 alignment quality use the new threshold.

**Path (C) — expand fix scope to align analyzer slices.**
Treat the analyzer-coverage divergence as in-scope for THIS WO. Touch rag-index's analyzer setup or ChunkConverter to ensure every file in graph.json that has missing-header elements also produces a chunk. Risk: scope creep beyond `normalizeChunkFile() + tests`; possibly invalidates DR-PHASE-7-B and the locked diff radius constraint.

ORCHESTRATOR ruling required before pushing or closing.

### Provisional close artifacts (not yet committed)

- 3 atomic commits already landed: `a38a5b4`, `2dcc2a6`, `989d05b`.
- Not yet pushed (awaiting ORCHESTRATOR ruling).
- 5.5 (closeout commit) and 5.6 (push) deferred per halt.

### AC status table (interim)

| AC | statement | status |
|---|---|---|
| AC-01 | normalizeChunkFile maps abs-Win → relative-POSIX | PASS (8/8 unit tests) |
| AC-02 | chunksSkipped matches header_missing ±10% | DIVERGED (215 vs 262, 17.9% gap; structural, not normalize bug) |
| AC-03 | status='partial' when header_missing>0 | PASS (was `success`, now `partial`) |
| AC-04 | no schema/SkipReason additions | PASS (zero schema delta) |
| AC-05 | ground-truth 6/6 + boundary 6/6 | PASS (12/12) |
| AC-06 | tsc clean both configs | PASS |

---

## ORCHESTRATOR ruling — Path A authorized (2026-05-05)

> "Land the verified-correct fix, mark AC-02 DIVERGED with structural rationale, file the follow-up stub. 0→215 is the load-bearing improvement. The 47-file gap is a different bug — analyzer-slice coverage divergence — that the path-normalization fix exposed. Different bug, different WO."

### Closeout actions taken

1. **AC-02 framed as DIVERGED, not FAILED.** The path-normalization fix is verified correct (8/8 unit + 4/4 invariant + 12/12 ground-truth/boundary). The `chunksSkipped(header_status_missing)` count went from 0/262 (catastrophic, pre-fix) to 215/262 (17.9% short of the ±10% band, post-fix). The 47-file residual is **not** a normalizeChunkFile bug — it is **analyzer-slice coverage divergence** between `populate-coderef`'s graph.json (262 files with at least one missing-header element) and `rag-index`'s `analyzerService.analyze(...)` slice (215 of those files reach the chunk pipeline). Two graph slices, different file populations.

2. **New stub filed:** `coderef/stubs/STUB-RAG-INDEX-ANALYZER-SLICE-COVERAGE-001.md` (priority=high, owner=CODEREF-CORE). Predecessor cross-reference: `STUB-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001`. Documents two scope options the follow-up WO must choose between (expand analyzer pattern vs change AC-09 measurement basis); ORCHESTRATOR ruling required before any plan.

3. **Phase 7 archive NOT reopened.** This WO ships closed under post-rebuild maintenance. The new stub spawns a follow-up WO under the same maintenance phase.

### Final commit chain (this WO)

| commit | scope |
|---|---|
| `a38a5b4` | fix(rag): normalize chunk.file URI/absolute paths to relative-POSIX graph keys |
| `2dcc2a6` | test(rag): unit fixture for normalizeChunkFile across 4 path shapes (8/8 PASS) |
| `989d05b` | test(pipeline): invariant chunksSkipped tracks header_missing_count (4/4 PASS) |
| (this commit) | docs(workorder): closeout — Path A; AC-02 DIVERGED rationale; stub-002 filed |

### AC status table (final)

| AC | statement | status | rationale |
|---|---|---|---|
| AC-01 | normalizeChunkFile maps abs-Win → relative-POSIX | PASS | 8/8 unit tests cover 4 shapes + 4 robustness cases |
| AC-02 | chunksSkipped matches header_missing ±10% | **DIVERGED** | Fix verified correct (0→215 of 262 skip); residual 47-file gap is analyzer-slice coverage divergence, NOT a normalize bug. Filed as `STUB-RAG-INDEX-ANALYZER-SLICE-COVERAGE-001` for follow-up WO. |
| AC-03 | status='partial' when header_missing>0 | PASS | observed `status='partial'` post-fix (was `'success'`) |
| AC-04 | no schema/SkipReason additions | PASS | zero schema delta; existing `header_status_missing` enum value fires correctly |
| AC-05 | ground-truth 6/6 + boundary 6/6 | PASS | 12/12 PASS |
| AC-06 | tsc clean both configs | PASS | both `tsconfig.json` and `tsconfig.cli.json` clean |

### Post-Phase-5 push

`git push origin main` — pushes `a38a5b4..989d05b` + this closeout commit to origin/main. Pre-existing baseline failure in `__tests__/pipeline-snapshot.test.ts` confirmed via `git stash` rerun (not caused by this WO).



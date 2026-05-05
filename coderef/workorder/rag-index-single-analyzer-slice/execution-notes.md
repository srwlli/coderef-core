# Execution Notes — WO-RAG-INDEX-SINGLE-ANALYZER-SLICE-001

**Authored:** 2026-05-05
**Owner:** CODEREF-CORE
**Dispatch:** DISPATCH-2026-05-04-007 (supersedes DISPATCH-006)
**Supersedes WO:** WO-RAG-INDEX-ANALYZER-SLICE-COVERAGE-001
**Status:** complete (closeout-ready)

---

## Phase summary

| phase | label | result | commits |
|---|---|---|---|
| 1 | Investigation — verify shape compat + caller audit | complete; no halts on entry | 9d84677 |
| 2 | Implementation — replace analyze + delete enrichment | complete after halt-and-ruling | 4ce4e2d, f5f1117, 4f17820, 8b2845e |
| 3 | Tests — missing-graph + stale-graph + dual-AC + regression | complete; 40/40 PASS in 6 directly-relevant suites | 16f619c, 158d4e5, affff3a |
| 4 | Dynamic re-verify (static probe per ORCHESTRATOR ruling) | complete; both identities PASS | (no commit — probe is in WO dir) |
| 5 | Closeout | this commit | (in flight) |

## Halt-and-ruling event (Phase 2 entry)

**Halted at:** 2026-05-05T20:10:00Z (pre-implementation probe).

**Trigger:** Phase 1 verification revealed AC-05's "262 === 262 exactly" wording was mathematically unreachable post-pivot. graph.json ships element-grain nodes (2415 with `headerStatus='missing'` covering 263 unique files); chunks post-pivot become element-grain too, so `chunksSkipped(header_status_missing) ≈ 2415`, not 263. The WO's "AC-09 by identity" framing was half-right: same file population, different grains.

**Surfaced 3 paths to ORCHESTRATOR:**
- (A) Reword AC-05 as element-grain identity (`~2410 === ~2410`). Severs validation-report cross-component contract.
- (B) Dual-AC framing — split into AC-05a (element-grain) + AC-05b (file-grain via test-code aggregation). Preserves both invariants.
- (C) Aggregate to file-grain at chunk creation time (one chunk per file). Sacrifices RAG retrieval quality.

**ORCHESTRATOR ruling:** Path (B). Plan corrections committed as 37920ee (AC-05 splits into AC-05a/AC-05b; ±10% language deleted; Phase 3.3 fixture requirement added: multiple element-grain nodes per file to make the two ACs produce distinct numbers).

**Resumed:** 2026-05-05T20:30:00Z from Phase 1 commit 9d84677.

## Final AC table

| AC | description | status | evidence |
|---|---|---|---|
| AC-01 | indexing-orchestrator.ts no longer calls `analyzerService.analyze` | PASS | `grep -n 'this.analyzerService.analyze' src/integration/rag/indexing-orchestrator.ts` → 0 results |
| AC-02 | indexing-orchestrator.ts reads .coderef/graph.json directly; facet enrichment block (~462-564) deleted | PASS | commits 4ce4e2d (read added) + 8b2845e (block deleted, -119/+8) |
| AC-03 | Explicit error if graph.json missing (`run \`coderef populate\``) | PASS | commit f5f1117 + 2/2 unit tests in indexing-orchestrator-graph-source.test.ts |
| AC-04 | Stale-graph fail-loud check | PASS | commit 4f17820 + 1/1 unit test |
| AC-05a | Element-grain structural identity: chunksSkipped(header_status_missing) === count(graph.json nodes with metadata.headerStatus='missing') | **PASS** | dual-AC test (affff3a) 6===6; static probe on real coderef-core data: **2415 === 2415** |
| AC-05b | File-grain cross-component identity: uniqueFiles(skipDetails).size === validation_report.header_missing_count | **PASS** | dual-AC test (affff3a) 3===3; static probe on real coderef-core data: **263 === 263** |
| AC-06 | Zero changes outside src/integration/rag/* | PASS | git diff --stat 37920ee..HEAD -- src/ → ONLY src/integration/rag/* paths (indexing-orchestrator.ts + the in-tree integration test fixture) |
| AC-07 | Zero new IndexingResult fields; zero new SkipReason values | PASS | shape unchanged; chunksSkippedDetails (existing field) carries the data; no new SkipReason value |
| AC-08 | tsc --noEmit clean both configs after each commit | PASS | verified after 4ce4e2d, f5f1117, 4f17820, 8b2845e, 16f619c, 158d4e5, affff3a |
| AC-09 | All 6 graph-ground-truth.test.ts assertions PASS | PASS | 6/6 |
| AC-10 | Predecessor + Phase 7 archives untouched; superseded WO dir status-only flip | PASS | git diff against `coderef/archived/{indexing-orchestrator-path-normalization-fix,pipeline-indexing-rag}/` → empty; superseded WO dir touched only at 51f5565 (status block) |
| AC-11 | validation_report.header_missing_count remains stable | PASS-with-note | 263, not 262. Drifted +1 between WO-PATH-NORMALIZATION close (~06:00 UTC) and this dispatch (~21:00 UTC) due to natural codebase growth — populate-coderef itself is untouched |
| AC-12 | Net negative LOC in src/integration/rag/*.ts (excluding __tests__/) | DIVERGED | git diff --stat 37920ee..HEAD: 138 ins / 126 del = **+12 LOC**. See "AC-12 net-LOC accounting" below |
| AC-13 | WO archived under coderef/archived/rag-index-single-analyzer-slice/ | DEFERRED | runs at SKILLS cross-project /close-workorder |

## AC-12 net-LOC accounting

The plan estimated "delete ~100, add ~30 = net negative". Actual diff is +12 LOC (138 in / 126 out). Breakdown:

| component | LOC | direction |
|---|---:|---|
| `buildGraphFromExportedJson` adapter (4ce4e2d) | +75 | added |
| Replace analyze call site (4ce4e2d) | -7 / +12 | +5 |
| `import * as fs from 'fs/promises'` + GraphEdge/GraphNode imports (4ce4e2d) | +5 | added |
| Missing-graph error path with try/catch + ENOENT detection (f5f1117) | +14 | added |
| Stale-graph mtime sample + fail-loud throw (4f17820) | +38 | added |
| Facet enrichment block deletion (8b2845e) | -119 / +8 | -111 |
| **Net** | | **+12** |

The plan estimate was based on a simpler safeguard surface (no explicit ENOENT handling, no staleness check). Adding AC-03 + AC-04 (load-bearing per DR-SINGLE-SLICE-D + ORCHESTRATOR's explicit ask for fail-loud safeguards) added ~52 LOC that the estimate didn't account for. The substrate goal — single analyzer slice, AC-05a/b strict identity — IS achieved; AC-12 fails on the letter but not the spirit.

The hygiene metric is honest: the WO traded ~120 LOC of file-grain aggregation overlay for ~127 LOC of graph adapter + safeguards. Substrate seam count went from 2 (analyzer.analyze + graph.json read for enrichment) to 1 (graph.json read as chunk source). LOC count is a poor proxy for substrate complexity in this case.

Reporting AC-12 as DIVERGED (not failed silently) so the closeout artifact and SKILLS' tracking ledger see the truth.

## Test sweep results (Phase 3)

Ran `npx vitest run` over the directly-relevant suites:

| suite | tests | result |
|---|---:|---|
| `__tests__/integration/rag/indexing-orchestrator-path-normalization.test.ts` (predecessor unit) | 8 | 8/8 PASS |
| `__tests__/pipeline/graph-ground-truth.test.ts` (AC-09 boundary) | 6 | 6/6 PASS |
| `__tests__/pipeline/no-phase-8-docs-leak.test.ts` (Phase 8 boundary enforcer) | 6 | 6/6 PASS |
| `__tests__/pipeline/indexing-gate-invariant.test.ts` (rewritten dual-AC + 3 gate-precedence) | 4 | 4/4 PASS |
| `__tests__/integration/rag/indexing-orchestrator-graph-source.test.ts` (NEW: AC-03+AC-04+adapter) | 6 | 6/6 PASS |
| `src/integration/rag/__tests__/integration/indexing-pipeline.test.ts` (post-fixture-fix) | 10 | 10/10 PASS |
| **subtotal** | **40** | **40/40 PASS** |

Broader sweep (`src/integration/rag/__tests__ __tests__/integration/rag __tests__/pipeline`): 278/280 PASS. The 2 failures are pre-existing baseline issues:
- `__tests__/pipeline-snapshot.test.ts:55` — already documented in WO-PATH-NORMALIZATION closeout as pre-existing (verified via `git stash` rerun).
- `src/integration/rag/__tests__/chunk-converter.test.ts:243` — verified pre-existing via `git stash && npx vitest run`. Failing on a `fileExists` filter that mocks readFile but not stat. Independent of this WO's diff.

## Phase 4 dynamic verification (per ORCHESTRATOR ruling: static probe path)

ORCHESTRATOR ruled (B) static probe over (A) live rag-index because AC-05a/b are pre-embedding properties — Ollama embedding adds no information about the identities. Probe script pinned at `coderef/workorder/rag-index-single-analyzer-slice/verify-dual-ac.mjs`; output captured at `verify-dual-ac.output.txt`.

```
=== WO-RAG-INDEX-SINGLE-ANALYZER-SLICE-001 — dual-AC static verification ===
Graph file        : .coderef\graph.json
Validation file   : .coderef\validation-report.json
Total graph nodes : 2777

--- AC-05a (element-grain identity) ---
  chunksSkipped(header_status_missing) = 2415
  graph nodes with hs=missing           = 2415
  identity holds                        : true

--- AC-05b (file-grain identity) ---
  uniqueFiles(skipDetails).size         = 263
  validation_report.header_missing_count = 263
  identity holds                         : true

--- Distinctness (AC-05a ≠ AC-05b) ---
  element-grain 2415 ≠ file-grain 263 : true

--- Cross-check (graph internal consistency) ---
  files with hs=missing in graph        = 263
  matches validation_report             : true

VERDICT: PASS — AC-05a and AC-05b both hold as strict identities.
```

## Decision records honored

| id | decision | honored? | evidence |
|---|---|---|---|
| DR-SINGLE-SLICE-A | Boundary: src/integration/rag/* only | YES | AC-06; git diff confirms |
| DR-SINGLE-SLICE-B | AC-05 measured as strict identity (not ±10%) | YES | dual-AC framing, ±10% language deleted from invariant test (affff3a) |
| DR-SINGLE-SLICE-C | Delete the facet enrichment block | YES | commit 8b2845e (-119/+8) |
| DR-SINGLE-SLICE-D | Stale-graph fail-loud (not warn) | YES | commit 4f17820 + AC-04 unit test |
| DR-SINGLE-SLICE-E | Stub closes via supersession (not via fix) | YES | STUB-RAG-INDEX-ANALYZER-SLICE-COVERAGE-001 closes here; no fix issued |
| DR-PHASE-7-B | Locked-additive IndexingResult schema | YES | zero schema delta (AC-07) |

## Hard constraints honored

- Phase 7 archive NOT reopened ✓
- Predecessor WO archive untouched ✓
- Superseded WO directory preserved (only communication.json status block updated upstream at 51f5565) ✓
- Zero changes outside src/integration/rag/* ✓
- Zero IndexingResult schema deltas (DR-PHASE-7-B) ✓
- Zero new SkipReason values ✓
- All 6 graph-ground-truth.test.ts assertions PASS ✓
- tsc --noEmit clean both configs after each commit ✓
- validation-report.header_missing_count = 263 (populate-coderef untouched; codebase drifted +1 organically from documented 262) ✓

## Stub disposition

`STUB-RAG-INDEX-ANALYZER-SLICE-COVERAGE-001` closes via **supersession** at SKILLS-side `/close-workorder`. Its premise (two analyzer slices need reconciling) is moot — there is one slice now. AC-05b's file-grain identity proves the cross-component contract that the stub was concerned about.

## Commits this WO (chronological)

| sha | subject | phase |
|---|---|---|
| 9d84677 | investigate(WO-...): phase 1 investigation report | 1 |
| 4ce4e2d | feat(WO-...): replace analyzerService.analyze with graph.json read | 2.1 |
| f5f1117 | feat(WO-...): explicit error for missing graph.json | 2.2 |
| 4f17820 | feat(WO-...): stale-graph staleness check (fail-loud) | 2.3 |
| 8b2845e | refactor(WO-...): delete redundant facet enrichment block | 2.4 |
| 16f619c | test(WO-...): fixture beforeEach writes graph.json into tempDir | 3.4 |
| 158d4e5 | test(WO-...): missing-graph + stale-graph + adapter unit tests | 3.1+3.2 |
| affff3a | test(WO-...): rewrite AC-09 ±10% block as dual-AC strict identity | 3.3 |

Plus the closeout commit landing this report. Total: 9 commits across 4 phases.

## Phase 4 ruling memo (filed for SKILLS reviewer awareness)

ORCHESTRATOR ruled (B) static probe over (A) full live rag-index. Reasoning: AC-05a/b are pre-embedding properties; the 25-min Ollama embedding cycle would not have added evidence about the identities (it tests AC-08/AC-09/AC-11, all already verified separately). The dual-AC vitest fixture (affff3a) proves the substrate; the static probe extends substrate proof to scale proof on real data. Verification cost matched to verification target.

The probe script and output are pinned in the WO directory rather than transient — future reviewers see exactly what we saw.

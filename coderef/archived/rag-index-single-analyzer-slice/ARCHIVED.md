# ARCHIVED — WO-RAG-INDEX-SINGLE-ANALYZER-SLICE-001

- **workorder_id:** WO-RAG-INDEX-SINGLE-ANALYZER-SLICE-001
- **feature_name:** rag-index-single-analyzer-slice
- **owner_domain:** CODEREF-CORE
- **target_project:** coderef-core
- **originating_dispatch:** DISPATCH-2026-05-04-007
- **closing_dispatch:** DISPATCH-2026-05-04-039
- **supersedes:** WO-RAG-INDEX-ANALYZER-SLICE-COVERAGE-001 (status=superseded; directory preserved)
- **stub_closed_via_supersession:** STUB-RAG-INDEX-ANALYZER-SLICE-COVERAGE-001
- **created:** 2026-05-05T20:30:00Z
- **completed:** 2026-05-05T22:10:00Z
- **archived:** 2026-05-05T22:35:00Z
- **archive_path:** coderef/archived/rag-index-single-analyzer-slice
- **review_status:** PASS
- **bulletproof_concept:** #1 — Collapse to one analyzer slice (substrate pivot)

## Audit Verdict

**PASS** — AC-01..AC-11 PASS, AC-12 DIVERGED (acknowledged), AC-13 produced by this close. Static-probe verification (verify-dual-ac.mjs) and dual-AC vitest fixture (commit affff3a) both PASS. No Phase 7 archive reopen, no IndexingResult schema delta, no new SkipReason values, populate-coderef untouched.

## Acceptance Criteria Table

| AC | Statement | Result | Evidence |
|----|-----------|--------|----------|
| AC-01 | Single analyzer slice (graph.json read replaces second analyzerService.analyze call) | PASS | commit 4ce4e2d |
| AC-02 | Zero changes outside src/integration/rag/* | PASS | diff radius confirmed src/integration/rag/* + WO dir + tests only |
| AC-03 | Missing-graph error fires loud (explicit error, not silent fallback) | PASS | commit f5f1117 + tests in 158d4e5 |
| AC-04 | Stale-graph staleness check (fail-loud on graph older than threshold) | PASS | commit 4f17820 + tests in 158d4e5 |
| AC-05a | Element-grain identity (chunksSkipped(header_status_missing) === graph nodes with hs=missing) | PASS | 2415 === 2415 (verify-dual-ac.output.txt) |
| AC-05b | File-grain identity (uniqueFiles(skipDetails).size === validation_report.header_missing_count) | PASS | 263 === 263 (verify-dual-ac.output.txt) |
| AC-05-distinctness | AC-05a ≠ AC-05b (dual-AC framing exercised, not collapsed) | PASS | 2415 ≠ 263 |
| AC-05-crosscheck | graph.json files-with-missing-header === validation_report.header_missing_count | PASS | 263 === 263 |
| AC-06 | Redundant facet enrichment block deleted | PASS | commit 8b2845e |
| AC-07 | Fixture beforeEach writes graph.json into tempDir for test isolation | PASS | commit 16f619c |
| AC-08 | tsc --noEmit clean both configs throughout | PASS | both tsconfig.json + tsconfig.cli.json clean across all 9 commits |
| AC-09 | validation-report.header_missing_count remains 263 (populate-coderef untouched) | PASS | populate-coderef diff radius = 0 |
| AC-10 | All 6 graph-ground-truth.test.ts assertions remain PASS | PASS | 6/6 PASS |
| AC-11 | Dual-AC vitest fixture (substrate proof) PASS | PASS | commit affff3a, 4/4 PASS |
| AC-12 | Net negative LOC in src/integration/rag/*.ts | DIVERGED | actual +12 net (138/126); structural cause documented below |
| AC-13 | /close-workorder produces ARCHIVED.md + tracking-ledger updates + workorder_completed/closed events | PASS | this archive |

## AC-12 Divergence — Structural Note

Plan estimated "delete ~100, add ~30" → expected negative LOC. Actual diff is **+12 net (138 added / 126 deleted)**. The +12 is structurally accountable to:

- **AC-03 missing-graph error** (~14 LOC) — load-bearing safeguard per ORCHESTRATOR's explicit ask, paired tests
- **AC-04 stale-graph fail-loud check** (~38 LOC) — load-bearing safeguard per DR-SINGLE-SLICE-D, paired tests

Both safeguards were not in the original plan estimate but were added per ORCHESTRATOR directives during execution. Substrate goal (single analyzer slice; AC-05a/b strict identity) **is** achieved; LOC is a poor proxy for substrate complexity here. Reported truthfully rather than retro-shimmed.

## Implementation Commits (9 atomic, 37920ee..7484642)

| # | SHA | Subject |
|---|-----|---------|
| 0 | 9d84677 | investigate(WO-RAG-INDEX-SINGLE-ANALYZER-SLICE-001): phase 1 investigation report (pre-pivot) |
| 1 | 37920ee | plan(WO-RAG-INDEX-SINGLE-ANALYZER-SLICE-001): dual-AC framing ruling — AC-05 splits into AC-05a + AC-05b |
| 2 | 4ce4e2d | feat: replace analyzerService.analyze with graph.json read |
| 3 | f5f1117 | feat: explicit error for missing graph.json |
| 4 | 4f17820 | feat: stale-graph staleness check (fail-loud) |
| 5 | 8b2845e | refactor: delete redundant facet enrichment block |
| 6 | 16f619c | test: fixture beforeEach writes graph.json into tempDir |
| 7 | 158d4e5 | test: missing-graph + stale-graph + adapter unit tests |
| 8 | affff3a | test: rewrite AC-09 ±10% block as dual-AC strict identity |
| 9 | 7484642 | close: closeout report + dual-AC static probe |

Push target: origin/main. Push was clean. No force-push. HEAD === origin/main at 7484642.

## Halt Resolutions During Execution

### HALT-1 (pre-Phase-2): AC-05 grain mismatch

- **Issue:** Original AC-05 wording "262===262 file-grain" mathematically unreachable — graph.json ships element-grain (~2410 missing-header nodes), file-grain validation-report shows 263 unique files
- **Surfaced by:** CODEREF-CORE Phase 1 probe (commit 9d84677)
- **Paths:** (A) collapse to file-grain only, (B) dual-AC framing, (C) sacrifice retrieval quality
- **Ruling:** Path (B) — dual-AC framing. AC-05 splits into AC-05a (element-grain ~2410===~2410) + AC-05b (file-grain 263===263 via test-code uniqueFiles aggregation). Zero IndexingResult schema delta.
- **Ruled by:** ORCHESTRATOR (2026-05-05T21:35:00Z)
- **Outcome:** Plan + analysis updated in commit 37920ee; CORE resumed from Phase 1 commit 9d84677

### HALT-2 (Phase 4): live rag-index hung at ~25 min

- **Issue:** Live rag-index hung at ~25 min (~9× chunk count due to element-grain pivot caused embedding workload to balloon)
- **Surfaced by:** CODEREF-CORE Phase 4 dynamic re-verify
- **Paths:** (A) wait 25 min for live run, (B) static probe (chunk→skip code path without embedding), (C) trust dual-AC vitest fixture as authoritative
- **Ruling:** Path (B) — static probe. AC-05a/b are pre-embedding properties; running Ollama for 25 min adds no information about either identity. Dual-AC vitest fixture (affff3a) is authoritative substrate proof; static probe extends to scale proof on real data. Pin probe script + output in WO directory.
- **Ruled by:** ORCHESTRATOR (2026-05-05T22:05:00Z)
- **Outcome:** verify-dual-ac.mjs pinned in WO dir + numbers captured (verify-dual-ac.output.txt) + AC-05a/b PASS

## Verification Method

- **Static probe:** `verify-dual-ac.mjs` (pinned in WO directory) reads `.coderef/graph.json` + `.coderef/validation-report.json` and asserts AC-05a element-grain identity (2415===2415), AC-05b file-grain identity (263===263), distinctness (2415≠263), graph⇄validation cross-check (263===263). VERDICT: PASS.
- **Dual-AC vitest fixture:** commit affff3a, 4/4 PASS — substrate proof on synthetic fixture with multiple nodes per file (so AC-05a and AC-05b are distinct).
- **TSC invariant:** `tsc --noEmit` clean across both configs (tsconfig.json + tsconfig.cli.json) after every commit.
- **Ground truth:** 6/6 graph-ground-truth.test.ts assertions PASS.
- **Validation report baseline:** header_missing_count=263 (populate-coderef untouched per AC-09).

## Decisions Honored

- **DR-PHASE-7-B (locked additive IndexingResult schema):** Honored — zero IndexingResult schema delta. Existing `chunksSkippedDetails` field carried forward; uniques aggregated in test code.
- **DR-SINGLE-SLICE-A:** Single analyzer slice (graph.json read, second analyze call deleted) — AC-01 PASS.
- **DR-SINGLE-SLICE-B (initial):** AC-09 measured as identity, not ±10% band. Superseded 2026-05-05T21:35:00Z by dual-AC ruling.
- **DR-SINGLE-SLICE-C (dual-AC):** AC-05 splits AC-05a + AC-05b, both load-bearing strict identities, no ±10% tolerance.
- **DR-SINGLE-SLICE-D (safeguards):** Missing-graph fail-loud + stale-graph fail-loud both required. AC-03/AC-04 PASS.
- **DR-SINGLE-SLICE-E (verification path):** Static probe authoritative for AC-05a/b post-Phase-4 hang.

## Hard Constraints Honored

1. **Phase 7 archive untouched** — rebuild remains COMPLETE per DISPATCH-035; this WO is post-rebuild substrate work, not a Phase 7 reopen.
2. **No new field on IndexingResult schema** — DR-PHASE-7-B held.
3. **No new SkipReason values** — existing `header_status_missing` fires correctly.
4. **Predecessor archives untouched** — both `indexing-orchestrator-path-normalization-fix` (closed AC-02 DIVERGED) and any earlier archives stayed CLOSED.
5. **Superseded WO directory preserved** — `coderef/workorder/rag-index-analyzer-slice-coverage/` directory NOT moved/deleted; only the communication.json status block reflects supersession.
6. **Cultural validator scope-mode + tracking validator scope-mode PASS clean** — 11/11 + 15/15 (5-4 calendar-current routing).

## Supersession Chain

This WO supersedes **WO-RAG-INDEX-ANALYZER-SLICE-COVERAGE-001** (Option 1 — expand analyzer coverage). The pivot from Option 1 (tactical pattern expansion) to Option (a) (single analyzer slice — read graph.json directly, delete second analyze call) is structural rather than tactical. CORE flagged the architecture issue post-Option-1-ruling and before DISPATCH-006 was accepted; ORCHESTRATOR pivoted clean rather than amending the existing WO.

**Closed via supersession (not via fix):**
- **WO-RAG-INDEX-ANALYZER-SLICE-COVERAGE-001** → status=superseded (directory preserved)
- **DISPATCH-2026-05-04-006** → status=superseded (CORE never accepted)
- **STUB-RAG-INDEX-ANALYZER-SLICE-COVERAGE-001** → status=closed_via_supersession; closed_by_workorder=WO-RAG-INDEX-SINGLE-ANALYZER-SLICE-001

## Diff Radius

`src/integration/rag/*` (production code) + `src/integration/rag/__tests__/*` (tests) + `coderef/workorder/rag-index-single-analyzer-slice/*` (WO artifacts, including pinned `verify-dual-ac.mjs` + `verify-dual-ac.output.txt`). Zero changes outside this radius.

## Bulletproof Concept #1 Shipped

This close ships **bulletproof concept #1: Collapse to one analyzer slice**. Substrate-level: rag-index reads the same graph.json that populate-coderef writes; no second analyzer slice, no two-graph divergence, no ±10% tolerance band. Dual-AC framing operationalizes bulletproof concept #2 (executable invariants in test code) without re-introducing a runtime aggregation seam.

Five remaining bulletproof concepts (frozen fixture, branded paths, schema reduction, seam deletion, two-grain drop) — each a separate stub when ORCHESTRATOR scopes.

## Stub Filed Post-Close

None. Optional follow-up cleanup WO surfaced in dispatch-039 context: remove now-unused `analyzerService` constructor param + private field (currently `@deprecated`). Not blocking close; may be picked up by ORCHESTRATOR as a separate scoping when convenient.

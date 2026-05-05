# STUB: rag-index frozen fixture + CI invariants for dual-AC identity (2415/263)

**Stub ID:** STUB-RAG-INDEX-FROZEN-FIXTURE-DUAL-AC-INVARIANTS-001
**Authored:** 2026-05-05
**Author:** SKILLS via /stub under DISPATCH-2026-05-04-042 (ORCHESTRATOR-directed)
**Owner domain:** CODEREF-CORE
**Priority:** high
**Status:** open — awaiting ORCHESTRATOR scoping into a follow-up WO
**Phase:** post-rebuild maintenance (rebuild COMPLETE; bulletproof concept #1 also COMPLETE)
**Bulletproof concept:** #2 of 6 (frozen fixture + CI invariants)
**Predecessor WO:** WO-RAG-INDEX-SINGLE-ANALYZER-SLICE-001 (archived 2026-05-05, CORE commit a19249a)
**Predecessor cleanup WO:** WO-CLEANUP-INDEXING-ORCHESTRATOR-ANALYZERSERVICE-PARAM-001 (archived 2026-05-05, CORE commit cba7cbb)

---

## Summary

WO-RAG-INDEX-SINGLE-ANALYZER-SLICE-001 shipped **bulletproof concept #1** (collapse to one analyzer slice) with the **dual-AC framing**:

- **AC-05a** (element-grain): `chunksSkipped(header_status_missing) === graph nodes with hs=missing` — currently `2415 === 2415` on real coderef-core state.
- **AC-05b** (file-grain): `uniqueFiles(skipDetails).size === validation_report.header_missing_count` — currently `263 === 263` on real coderef-core state.

Both identities are **structural substrate properties** (no ±10% tolerance). The pinned static probe `verify-dual-ac.mjs` (in `coderef/archived/rag-index-single-analyzer-slice/`) re-runs against the live tree.

**The gap this stub records:** those identity numbers (2415, 263) currently anchor on **real codebase state**. Any future change to the scanner, analyzer, parser, or chunk converter can silently drift those numbers — and unless someone manually re-runs the static probe, the substrate identity could break without anyone noticing. There is no CI gate that asserts the dual-AC identity holds.

**Bulletproof concept #2 = lock the dual-AC identity into a tiny deterministic frozen fixture that runs in CI as a blocking invariant.** The dual-AC vitest fixture introduced in commit `affff3a` (`src/integration/rag/__tests__/indexing-orchestrator.dual-ac.test.ts`) is the seed; this stub records that it should be hardened into a CI-gated invariant.

---

## Why this is bulletproof concept #2 (not #1)

Concept #1 (single analyzer slice) was a **structural** fix — collapse two graphs into one. Concept #2 is a **proof-discipline** fix — make the substrate identity executable and CI-enforced so it cannot regress silently. The order matters: lock the substrate (#1), then lock the proof of substrate (#2), then move on to #3-#6 (seam deletion, branded paths, schema reduction, two-grain drop).

The frozen fixture lands first in this batch (before seam deletion, concept #3) because it pins the dual-AC identity numbers into a deterministic CI invariant **before** any further refactoring can silently shift them.

---

## Anchor artifacts

These are the load-bearing references the future WO must build on:

1. **`src/integration/rag/__tests__/indexing-orchestrator.dual-ac.test.ts`** (commit `affff3a` from predecessor WO)
   - The seed fixture: 4/4 PASS at archive time, exercises both identities on a synthetic graph with multiple nodes per file (so AC-05a and AC-05b are distinct).
   - The frozen-fixture WO should harden this into the canonical CI invariant — adopt or replace, but the dual-grain proof shape is settled.

2. **`coderef/archived/rag-index-single-analyzer-slice/verify-dual-ac.mjs`** (pinned static probe)
   - Reads `.coderef/graph.json` + `.coderef/validation-report.json` and asserts both identities + distinctness + cross-check.
   - Useful as the **scale-proof** companion to the frozen-fixture **shape-proof**: fixture proves the relation holds on synthetic inputs; static probe proves it holds on real coderef-core state.

3. **`coderef/archived/rag-index-single-analyzer-slice/verify-dual-ac.output.txt`**
   - Captured 2415/263 numbers at archive time. These are NOT the load-bearing target — the **identity relationship** is. The numbers will drift naturally as coderef-core evolves; the relationship (skip count === graph missing-header count) must not.

---

## What the future WO must do

This stub does NOT prescribe implementation; it records the gap. ORCHESTRATOR scopes the WO. But the surface area to consider:

- **Frozen fixture format.** Two reasonable choices: (a) on-disk JSON fixture under `__tests__/fixtures/` that the test reads, or (b) inline TypeScript constants inside the test file. Both work; (b) is simpler and matches the existing `dual-ac.test.ts` shape. Trade-off: an on-disk fixture is easier to inspect; an inline constant is harder to silently mutate.
- **Identity vs numbers.** The fixture must encode the **identity relationship** on its own deterministic input — NOT depend on real-codebase 2415/263. Example: a 3-file × 3-node-per-file graph yields 9 element-grain skips and 3 file-grain unique files; the test asserts `9 === 9` and `3 === 3`, not `2415 === 2415`.
- **CI wiring.** The fixture test must be in the default `vitest run` path so any PR that breaks the dual-AC identity fails CI before merge. tsc must be clean both configs.
- **Distinctness assertion.** The fixture must make AC-05a and AC-05b distinct (multiple nodes per file). A degenerate fixture where every file has exactly one node makes the two identities collapse and defeats the dual-AC framing.
- **Anti-tautology guard.** The fixture's expected counts must come from a **separate, independent computation** in the test (e.g., counting input nodes by predicate) — not from re-running the production code path being tested. Otherwise a bug in the production code propagates into the expected counts and the test silently passes.
- **Static-probe relation.** The frozen-fixture invariant gates the substrate identity at the test layer. The static probe (real-codebase) should remain in the WO archive as a manual sanity check; the WO can decide whether to elevate it to a periodic CI job (nightly?) or leave it as a manual tool.

---

## Out of scope for the future WO

- **Phase 7 archive** — locked, MUST NOT be reopened.
- **Predecessor archives** — `path-normalization-fix`, `rag-index-single-analyzer-slice`, `pipeline-indexing-rag`, `cleanup-indexing-orchestrator-analyzerservice-param` — all CLOSED, must NOT be modified.
- **AnalyzerService source code** (`src/analyzer/analyzer-service.ts`) — still used by populate-coderef + BreakingChangeDetector; outside this concept's diff radius.
- **Bulletproof concepts #3-#6** — seam deletion, branded paths, schema reduction, two-grain drop — separate stubs/WOs.
- **IndexingResult schema additions** — DR-PHASE-7-B locked additive; the frozen-fixture WO should not need new schema fields.

---

## Load-bearing constraints

1. **Phase 7 archive untouched** — rebuild remains COMPLETE.
2. **Predecessor archives untouched** — four archives stay CLOSED.
3. **Identity, not numbers** — the fixture must encode the substrate identity relationship on its own deterministic input; do NOT hardcode 2415/263 (those are real-codebase artifacts that will drift).
4. **AnalyzerService source untouched** — boundary: limit to `src/integration/rag/__tests__/` + possibly a new `__tests__/fixtures/` subdir.
5. **tsc --noEmit clean both configs** after each commit.
6. **All existing tests continue to PASS** — including the seed `dual-ac.test.ts` (which the WO may extend or replace).
7. **Cultural validator scope-mode + tracking validator scope-mode PASS clean** at WO close.

---

## Real-world baseline at predecessor-WO archive

Captured 2026-05-05 (CORE commit `a19249a`):

```
=== WO-RAG-INDEX-SINGLE-ANALYZER-SLICE-001 — dual-AC static verification ===
Total graph nodes : 2777
AC-05a (element-grain identity) : 2415 === 2415 — PASS
AC-05b (file-grain identity)    : 263 === 263 — PASS
Distinctness (AC-05a ≠ AC-05b)  : 2415 ≠ 263 — true
Cross-check (graph internal)    : 263 === 263 — PASS
VERDICT: PASS
```

These numbers are **evidence**, not **target**. They will drift as coderef-core evolves. The frozen fixture must prove the **identity** holds, not these specific values.

---

## Closure criteria (when the future WO ships)

This stub is closed when:

- A frozen fixture (synthetic, deterministic) lives in CORE's test tree.
- Its dual-AC identity assertions run as part of default `vitest run` (CI-blocking).
- An anti-tautology guard is in place (expected counts computed independently from production code).
- The fixture is distinct enough that AC-05a ≠ AC-05b on its own input.
- Documentation links the fixture to this stub and to the predecessor WO archive.
- /close-workorder produces an ARCHIVED.md that records the fixture path and the relationship being asserted.

ORCHESTRATOR scopes the WO from this stub when the four-stub batch is ready (this is concept #2 of 6).

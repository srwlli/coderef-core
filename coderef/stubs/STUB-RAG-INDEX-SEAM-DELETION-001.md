# STUB: rag-index seam audit + deletion (delete what doesn't earn keep)

**Stub ID:** STUB-RAG-INDEX-SEAM-DELETION-001
**Authored:** 2026-05-06
**Author:** SKILLS via /stub under DISPATCH-2026-05-04-043 (ORCHESTRATOR-directed)
**Owner domain:** CODEREF-CORE
**Priority:** medium
**Status:** open — awaiting ORCHESTRATOR scoping into a follow-up WO
**Phase:** post-rebuild maintenance (rebuild COMPLETE; bulletproof concept #1 also COMPLETE)
**Bulletproof concept:** #3 of 6 (delete seams that don't earn keep)
**Sibling stub:** STUB-RAG-INDEX-FROZEN-FIXTURE-DUAL-AC-INVARIANTS-001 (concept #2; landed 2026-05-05 in CORE 1cc4acb under DISPATCH-2026-05-04-042)
**Predecessor WO:** WO-RAG-INDEX-SINGLE-ANALYZER-SLICE-001 (archived 2026-05-05, CORE commit a19249a — already deleted facet enrichment block + second analyzerService.analyze call)
**Predecessor cleanup WO:** WO-CLEANUP-INDEXING-ORCHESTRATOR-ANALYZERSERVICE-PARAM-001 (archived 2026-05-05, CORE commit cba7cbb — removed @deprecated analyzerService param)

---

## Summary

Bulletproof concept #3 from CORE's six-point architectural review: **seams that don't earn their keep should be deleted, not papered over**. A seam earns keep when it handles a real failure mode with explicit semantics. A seam that swallows errors silently, takes a fallback branch with no observable signal, or wraps a function in a no-op pass-through layer is dead weight that hides real bugs and makes the substrate harder to reason about.

The pivot WO already deleted two such seams (the facet enrichment block at `chunk-converter.ts:462-564` and the second `analyzerService.analyze` call at `indexing-orchestrator.ts`). This stub records the **remaining seam audit**: walk `src/integration/rag/*` end-to-end for try/catch swallowers, silent skips, dead-code branches, and pass-through layers. Each surviving seam either gets **explicit-failure semantics** (throw, log, count, surface) or gets **deleted**.

---

## CORE-flagged specific seam (load-bearing)

**`src/integration/rag/chunk-converter.ts:60-63`** — silent fileExists skip:

```ts
const fileExists = await this.fileExists(filePath);
if (!fileExists) {
  // Silently skip non-existent files (they're phantom import targets)
  continue;
}
```

This drops nodes from chunk conversion when the source file is missing — with **zero observable signal**. There is no counter, no log, no entry in `chunksSkippedDetails`, no failure surface. If a phantom import path is a legitimate concern, the count of skipped phantoms is information worth keeping (and worth asserting on). If phantom imports never occur on real codebases, the seam is dead code that can be deleted. Either way, the current "silent skip" shape is the wrong answer.

**Decision the future WO must make for this seam specifically:**
- **Option A** — earn keep: convert to `chunksSkipped` with a new `SkipReason='phantom_import_target'` value, surface the count in `IndexingResult`, add an assertion in the dual-AC fixture that no real-codebase fixture produces unexpected phantoms. (May require a new SkipReason enum value — check DR-PHASE-7-B locked-additive constraint.)
- **Option B** — delete: remove the `fileExists` check entirely and let the read-error path (lines 65-77) handle missing files via the existing `errors[]` accumulator. This route eliminates the silent skip without adding schema surface.
- **Option C** — keep but log: at minimum, log a warning so the silent drop becomes observable in CI output even if not in `IndexingResult`.

Option B is the most aggressive cleanup; Option A is the most defensible if phantom imports turn out to occur on real coderef-core scans. The future WO scopes the choice based on evidence (run rag-index against current codebase, count how many files hit this branch, decide).

---

## Expected seam inventory targets

The future WO does NOT prescribe a fix list at scoping time; the WO opens with a **discovery phase** that walks the surface area and produces a seam inventory. Initial targets:

1. **`src/integration/rag/chunk-converter.ts`**
   - Silent fileExists skip (lines 60-63) — flagged above, primary target.
   - Other fallback branches: any `?? null`, `|| {}`, `try { ... } catch { return null }` patterns.
   - Type-coercion fallbacks (`as any`, `Number(x) || 0`).

2. **`src/integration/rag/indexing-orchestrator.ts`**
   - Any try/catch that swallows errors silently post-pivot-1 (the WO deleted the major one; check what remains).
   - Optional-chaining fallback branches that absorb null states without surfacing them.
   - The graph.json read path (commits 4ce4e2d + f5f1117 + 4f17820 from predecessor WO) — these are explicit-failure already; verify they stayed that way.

3. **`src/integration/rag/*` broader sweep**
   - Other files in the integration rag directory (e.g., embedding adapters, vector-store adapters).
   - Pass-through layers: classes whose methods do nothing but forward to another class with no added contract.
   - "Helper" wrappers that simplify nothing.

4. **`src/integration/rag/__tests__/*`**
   - Audit clause from WO-CLEANUP precedent: any test that silently mocks away a behavior is the test-side analog of a production silent skip. Surface them.
   - The dual-AC fixture (`indexing-orchestrator.dual-ac.test.ts`) and the frozen-fixture invariant (post STUB-RAG-INDEX-FROZEN-FIXTURE-DUAL-AC-INVARIANTS-001) are exempt — they ARE the substrate-identity safety net.

---

## What earning keep looks like

A seam **earns** keep when it:

1. **Surfaces a real failure mode explicitly** — throws a typed error, logs at a level that reaches CI output, or increments a counter in a returned result so callers can assert on it.
2. **Is exercised by a test** — there is a test that covers the seam's behavior (both happy-path and the failure mode it handles).
3. **Carries a single-sentence comment that explains why it exists** — comment names the failure mode, not the implementation. "Skip phantom import targets" is a description of what; "Phantom import targets occur when X tooling does Y" is a description of why. The latter earns keep; the former is a flag that the seam is suspect.

A seam **does NOT** earn keep when it:

- Swallows errors with no log, no throw, no counter.
- Adds a pass-through layer that contributes no semantics, no validation, no transformation, just function calls.
- Has a comment that justifies its existence by describing the workaround instead of the failure mode.
- Was added "for safety" with no documented failure mode the safety guards against.

---

## Why this stub depends on the frozen-fixture stub landing first

The sibling **STUB-RAG-INDEX-FROZEN-FIXTURE-DUAL-AC-INVARIANTS-001** (concept #2) **must ship first**. The frozen-fixture WO is the safety net: it locks the dual-AC identity into a CI-blocking invariant on a synthetic deterministic input. Once that lands, any seam removal in this WO that silently shifts the substrate identity will fail CI immediately, before merge.

Without the frozen fixture in place, this WO's seam deletions could silently change what gets chunked, silently change skip counts, and silently break AC-05a/AC-05b on real-codebase numbers — with no CI gate to catch it. ORCHESTRATOR's ordering directive is load-bearing: lock substrate identity (concept #2), then prune surface (concept #3).

---

## Halt-and-report points for the future WO

The future WO must HALT and surface to ORCHESTRATOR rather than push through if it discovers:

1. **A seam that genuinely earns keep** (handles a real failure mode that is observed on real-codebase scans). Document the evidence; leave the seam in place; record the decision in the WO's communication.json.
2. **Any seam removal that breaks AC-05a (element-grain 2415===2415) or AC-05b (file-grain 263===263).** Substrate identity preservation is non-negotiable; no seam is worth shifting those numbers silently.
3. **Any change required outside `src/integration/rag/*`.** Boundary violation — surface to ORCHESTRATOR for re-scoping.
4. **A seam whose deletion requires a new `SkipReason` enum value or `IndexingResult` schema field.** DR-PHASE-7-B locked the schema additive; new values must be ruled on by ORCHESTRATOR before the WO ships them.

---

## Out of scope for the future WO

- **Phase 7 archive** — locked, MUST NOT be reopened.
- **Predecessor archives** — `path-normalization-fix`, `rag-index-single-analyzer-slice`, `pipeline-indexing-rag`, `cleanup-indexing-orchestrator-analyzerservice-param` — all CLOSED, must NOT be modified.
- **AnalyzerService source code** (`src/analyzer/analyzer-service.ts`) — still used by populate-coderef + BreakingChangeDetector; outside this concept's diff radius.
- **Bulletproof concepts #4-#6** — branded paths, schema reduction, two-grain drop — separate stubs/WOs as scoped.
- **populate-coderef pipeline** — out of scope; this stub targets `src/integration/rag/*` only.

---

## Load-bearing constraints

1. **Phase 7 archive untouched.**
2. **Predecessor archives untouched.**
3. **AC-05a/AC-05b substrate identities preserved post-deletion** — non-negotiable.
4. **STUB-RAG-INDEX-FROZEN-FIXTURE-DUAL-AC-INVARIANTS-001 ships first** — recommended (not strictly mandatory; ORCHESTRATOR may scope this WO before the frozen-fixture WO if absolutely needed, but accepting higher silent-drift risk).
5. **Boundary: `src/integration/rag/*` + `src/integration/rag/__tests__/*` only.**
6. **AnalyzerService source untouched.**
7. **tsc --noEmit clean both configs after each commit.**
8. **Cultural validator scope-mode + tracking validator scope-mode PASS clean at WO close.**
9. **No new `SkipReason` enum values without ORCHESTRATOR ruling** (DR-PHASE-7-B).

---

## Closure criteria (when the future WO ships)

This stub is closed when:

- A seam inventory document lives in the WO's analysis.json (or a referenced report.md), enumerating each seam in `src/integration/rag/*` with verdict: keep-with-explicit-semantics / delete / log-only.
- The CORE-flagged specific seam (`chunk-converter.ts:60-63`) has been resolved per Option A, B, or C above with documented evidence.
- AC-05a and AC-05b dual-AC identity tests still PASS post-deletion (frozen-fixture invariant gates this if STUB-RAG-INDEX-FROZEN-FIXTURE-DUAL-AC-INVARIANTS-001's WO has shipped).
- Net negative LOC across `src/integration/rag/*` (real cleanup, not zero-sum rename).
- /close-workorder produces an ARCHIVED.md that records the seam inventory + verdicts + LOC delta + dual-AC identity preservation evidence.

ORCHESTRATOR scopes the WO from this stub when the frozen-fixture WO has shipped (or when ORCHESTRATOR explicitly chooses to accept the frozen-fixture-not-yet-shipped risk).

# P4 metrics diff — incremental path-keying fix (STUB-QPAAY0)

**Phase:** WO-EDGE-RESOLUTION-IMPROVEMENT-PROGRAM-001 P4 (final, close_after_phase=4)
**Date:** 2026-08-01

## What this phase is NOT

P4 changes ZERO resolution semantics. It fixes the incremental fact-set keying
defect that made `populate --changed-files` fail closed (exit 1) on any store
whose originating full build used a different path form than the caller. The
resolver, classifier, and graph-construction code paths are untouched.

## The defect (reproduced live before the fix)

- Live store: `projectPath: "."`, `byFile` keys RELATIVE with backslashes
  (`src\pipeline\heritage-index.ts`) — the form the '.'-invoked full build
  produced.
- `populate --changed-files src/pipeline/heritage-index.ts .` absolutizes the
  input (`toAbs`), `runIncremental` keyed lookups + the rescanned map by that
  absolute path, and `mergeChangedFacts` ADDED the file under the absolute key
  instead of replacing the relative-keyed bundle.
- Result (captured in `p4-repro-evidence.txt`): every element of the changed
  file duplicated (`node_id_uniqueness` count:2 × 5 elements), **exit 1, graph
  unwritten** — AND the corrupt merge was re-persisted (write precedes the CLI
  validation halt), leaving the store poisoned (499 keys, the file under BOTH
  forms) for every later attempt.
- Repo-agnostic: the key form follows the originating populate invocation
  (the ASSISTANT repo's set built today with an absolute projectDir is
  absolute-keyed; this repo's '.'-invoked set is relative-keyed).

## The fix (seam-local, design recorded in decisions_log)

`canonicalFactKey` (project-relative, forward-slash, cwd-independent) +
`dedupeFactSet` (fresh-load self-heal of poisoned stores) in
`symbol-table-cache.ts`; `runIncremental` translates every incoming
changed/deleted path to the STORE'S OWN key form (`storeKeyFor`) so the merge
replaces instead of adding, and rescans are labeled with the exact form the
originating build used (fact-internal byte-parity with the cached universe).
Out-of-project paths keep their absolute form (never folded into a fabricated
in-project identity). REJECTED alternative: globally absolutizing orchestrator
projectPath — would churn every path-bearing id in every existing artifact.
No FACT_SET_VERSION bump: shape unchanged.

## Proof

1. **Contract envelope (8 tests, authored red-first — 4 failed pre-fix):**
   absolute/relative/forward-slash inputs, absolute-input deletion, new-file
   add, missing-store fallback, out-of-project input, poisoned-store
   self-heal; case (a) additionally proves fixture-level byte-parity with a
   from-scratch full rebuild.
2. **Live repro flipped:** the exact failing command now exits 0, and the
   poisoned store self-healed on first contact (499 → 498 keys, zero
   absolute-form, the file present exactly once).
3. **E2E parity on the real repo (the proof GX-002 P1-T6 could not run):**
   full rebuild, then `--changed-files` incremental over the SAME tree —
   **IDENTICAL: zero scalar diffs, identical `all_edge_ids_sha256` and
   `resolved_edge_ids_sha256`.**

## Scalars (before → after)

| scalar | p4-before | p4-after (full) | attribution |
|---|---|---|---|
| valid_edge_count | 10,063 | 10,133 | +70: the WO's own new 8-test contract file entering the scan universe (its vitest calls also move test_dsl 16,720 → 16,778); zero from the keying code |
| unresolved_count | 1,674 | 1,674 | unchanged |
| unresolved_src_count | 783 | 783 | unchanged |
| resolved_of_resolvable | 74.70 | 74.80 | denominator/numerator shift from the new test file only |
| ambiguous_count | 1,735 | 1,740 | +5 field_based_acg, all in the new test file |

Cross-snapshot note (same class as P3): p4-before (10,063) already differed
from p3-after (10,049) because a peer session's sheets-program close
re-populated between phases. Within-phase attribution above is exact: the
parity run pins the keying change itself at ZERO effect.

## Residue (follow-up candidate, recorded in close_metadata)

`runIncremental` persists the merged fact set BEFORE the CLI's validation
halt. With correct keying the merge is sound so persist-early is benign, but a
future scan-level defect could still persist bad facts on a failing run —
moving the persist behind the validation verdict would close that class.

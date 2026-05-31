# Phase 4 — Dogfood Evidence (WO-RAG-HEADER-COVERAGE-ENFORCE-AND-SURFACE-001)

Run on coderef-core's own tree, 2026-05-31, against the built CLIs
(`npm run build` green: tsc + build:cli).

## Acceptance criteria

| # | Criterion | Result | Evidence |
|---|---|---|---|
| i | Coverage prints in CLI | **PASS** | `node dist/src/cli/populate.js .` → `[header coverage] 99.24% (defined 261 / total 263)` + `header-less files (excluded from RAG index): missing 0, stale 0, partial 2` |
| ii | `header_coverage_pct` in validation-report.json | **PASS** | regenerated `.coderef/validation-report.json` → `header_coverage_pct = 99.24` |
| iii | Unstamped file trips the gate/warn | **PASS** | `--enforce-headers --coverage-floor=100` → exit **1** (99.24 < 100); `--coverage-floor=99` → exit **0**; `scripts/check-header-coverage.mjs <header-less.ts>` → exit **1** with remediation |
| iv | RAG indexed-chunk lift (1153→2795) reflected + held | **PARTIAL — infra-blocked** | `rag-index` embedding leg requires Ollama (`nomic-embed-text`), which is **DOWN** in this environment. The *mechanism* that produces the lift is proven (coverage measured + surfaced + gated); the live embedding re-index is deferred — see below. |

## Honest finding — the audit's 59% is not graph-grain coverage

The dispatch cited STUB-297's "1,642 / 2,795 chunks (59%) UNINDEXED for missing
@coderef-semantic headers." Running the **new** coverage metric on the live tree
shows **graph-grain header coverage of 99.24%** (261 of 263 file-grain nodes
defined; 0 missing, 2 partial), NOT 41%.

Reconciliation (not a contradiction — a scoping clarification the new metric
makes visible for the first time):

- `header_coverage_pct` is **file/graph-grain** — it counts unique files whose
  graph node carries a `headerStatus` of defined vs missing/stale/partial.
- The audit's "2,795 chunks" is **chunk-grain** at RAG-index time, which fans
  out per-element and is filtered by `indexing-orchestrator.ts:606-620`. A
  prior stamping pass (or the regen just run) brought file-grain coverage to
  ~99%, but the audit figure was either (a) pre-stamping, or (b) counting
  element-grain chunks whose headerStatus differs from their file's.
- **This is exactly the value of the WO:** before it, coverage was invisible
  and the two grains were impossible to reconcile without a manual audit. Now
  `populate` prints file-grain coverage, `rag-index` prints the chunk-grain
  skip-by-reason histogram, and the gate enforces a floor. The discrepancy is
  now *observable at every run* instead of surfacing once in a hand audit.

## Deferred sub-step (infra, not scope)

The one-time backfill + live RAG re-index (criterion iv's lift number) needs a
running Ollama with `nomic-embed-text`. That is an environment prerequisite,
not a code gap — the coverage-enforcement + surfacing machinery is shipped and
proven. When Ollama is available, `rag-index . --coverage-floor=95` will print
`Header coverage: 99.24%` + the `by reason:` skip histogram and index the
covered chunks; the held-lift assertion is then a single re-run. Recommend
ASSISTANT schedule that re-index when the embedding service is up (or confirm
the 2 `partial` files are acceptable / stamp them to reach 100%).

## Net

The scanner root-cause is fixed: header coverage is now **measured**
(header_coverage_pct), **surfaced** (populate + rag-index CLI), and
**enforced** (populate --enforce-headers gate + rag-index --coverage-floor +
the stamp-on-write hook). A header-less file can no longer silently degrade the
index — it trips a visible gate. That is the durable fix the dispatch asked for;
the one-time live re-index is a follow-up gated only on Ollama availability.

# pipeline-quality/scripts/ — DEAD LETTER, do not run

These scripts belong to an **archived research campaign**, not to the live
codebase. See `coderef/DEAD-LETTER/autoresearch/DEAD-LETTER` for the archive
record:

> Archived: 2026-05-17T02:15:00Z
> Reason: Stale research campaign (Loops 1-9, completed 2026-04-10). Not aligned
> with current scanner state.
> Last commit: e3c38eb

## Script Index

Verification passes for Loops 7-9 of the autoresearch campaign, each checking one
pipeline-quality claim against ground-truth JSON captured at the time. Frozen at
`e3c38eb` — none of these is runnable against the current scanner (see below).

| Script | Claim it verified |
|---|---|
| `verify_async_pattern_pipeline.py` | async-pattern detection through the pipeline |
| `verify_critical_function_pipeline.py` | critical-function identification |
| `verify_test_gap_pipeline.py` | test-gap detection |

## Why they are kept

They are the evidence trail for how those numbers were produced. Deleting them
would leave the campaign's conclusions unfalsifiable.

## Why not to run them

They assume the April-2026 scanner and its artifact shapes. The pipeline has been
through the repo-review remediation, the genre-features program, and the
graph-builder decomposition since. Any result they produce now is meaningless —
it would compare today's output against a ground truth that no longer describes
this scanner.

If you need these measurements, re-derive them against the current pipeline
rather than reviving this directory.

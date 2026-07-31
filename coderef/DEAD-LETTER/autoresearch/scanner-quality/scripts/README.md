# scanner-quality/scripts/ — DEAD LETTER, do not run

These scripts belong to an **archived research campaign**, not to the live
codebase. See `coderef/DEAD-LETTER/autoresearch/DEAD-LETTER` for the archive
record:

> Archived: 2026-05-17T02:15:00Z
> Reason: Stale research campaign (Loops 1-9, completed 2026-04-10). Not aligned
> with current scanner state.
> Last commit: e3c38eb

## What these were

Verification passes for Loops 1-6 of the autoresearch campaign, each checking one
scanner-quality claim against ground-truth JSON captured at the time:

| Script | Claim it verified |
|---|---|
| `verify_async_patterns.py` | async-pattern extraction |
| `verify_context_signal.py` | context-signal quality |
| `verify_element_classification.py` | element-type classification |
| `verify_export_relationships.py` | export-relationship edges |
| `verify_test_gap_precision.py` | test-gap precision |
| `verify_test_linkage.py` | test-to-source linkage |

## Why they are kept

They are the evidence trail for how those numbers were produced. Deleting them
would leave the campaign's conclusions unfalsifiable.

## Why not to run them

They assume the April-2026 scanner and its artifact shapes. Element
classification, export relationships, and test linkage have all been reworked
since — test linkage most recently in the graph-builder decomposition. A pass
here would measure today's scanner against a ground truth that no longer
describes it, and report the difference as a regression.

If you need these measurements, re-derive them against the current scanner
rather than reviving this directory.

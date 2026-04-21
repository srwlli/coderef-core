# Verify Contracts

These are the planned benchmark interfaces for the scanner-quality loops.

Each verify script must:

- run without human input
- print exactly one numeric value to stdout
- avoid logging extra text to stdout
- use the `stl-agent` corpus at `C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent` as the benchmark
- consume the corpus's `.coderef/` outputs or rerun the scanner against the corpus in a deterministic fixture mode

## Shared CLI Shape

Planned flags:

- `--corpus-root <path>` — path to the `stl-agent` corpus
- `--scan-dir <path>` — path to the corpus's `.coderef/` directory
- `--fixture <name>` when multiple corpora are supported later

Recommended invocation pattern:

```bash
python autoresearch/scanner-quality/scripts/<script>.py \
  --corpus-root C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent \
  --scan-dir C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent/.coderef
```

## Loop 1

- `Script`: `autoresearch/scanner-quality/scripts/verify_element_classification.py`
- `Output`: single float in range `0.0` to `1.0`
- `Metric name`: `element_classification_score`
- `Checks`:
  - no false top-level functions emitted for properties and methods
  - no duplicate symbol emission for known examples in this corpus

## Loop 2

- `Script`: `autoresearch/scanner-quality/scripts/verify_export_relationships.py`
- `Output`: single float in range `0.0` to `1.0`
- `Metric name`: `export_relationship_precision`
- `Checks`:
  - exported symbol list matches known truth set
  - entry-point and relationship summaries do not include duplicated class-member artifacts

## Loop 3

- `Script`: `autoresearch/scanner-quality/scripts/verify_test_linkage.py`
- `Output`: single float in range `0.0` to `1.0`
- `Metric name`: `test_link_accuracy`
- `Checks`:
  - tested production files are recognized as tested
  - known direct test links are preserved
  - coverage summary is not falsely zero

## Loop 4

- `Script`: `autoresearch/scanner-quality/scripts/verify_async_patterns.py`
- `Output`: single float in range `0.0` to `1.0`
- `Metric name`: `async_pattern_recall`
- `Checks`:
  - async functions in the corpus are detected
  - async pattern report is non-empty when async code exists

## Loop 5

- `Script`: `autoresearch/scanner-quality/scripts/verify_context_signal.py`
- `Output`: single float in range `0.0` to `1.0`
- `Metric name`: `context_summary_precision`
- `Checks`:
  - critical functions favor production functions over test helpers
  - entry points are not polluted by duplicate extracted members
  - summary signal is suitable for onboarding review

## Implementation Note

The verify scripts are not yet created.

Before running the loops:

1. Implement each verify script under `autoresearch/scanner-quality/scripts/` against the contracts above.
2. Run each script once against the frozen `2026-04-05` baseline scan and record the numeric value in `BASELINES.md`.
3. Confirm output is a single numeric line on stdout before invoking `/run-autoresearch`.

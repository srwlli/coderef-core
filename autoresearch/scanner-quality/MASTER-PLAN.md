# Scanner Quality AutoResearch Master Plan

## Campaign Goal

Improve scanner output quality using `stl-agent` as a fixed benchmark corpus, starting from the baseline issues observed in `.coderef/` on `2026-04-05`.

## Known Baseline Failures

1. `coverage.json` reports `0` tested files and `0%` coverage despite the repo containing direct test coverage for routed logic and result parsing.
2. `patterns.json` reports missing tests for functions that are directly tested.
3. `index.json` duplicates class methods and properties as exported top-level functions.
4. `patterns.json` reports no async patterns despite real async functions in the codebase.
5. `context.md` elevates test helpers as critical functions and includes polluted entry-point summaries.

## Loop Plan

### Loop 1: Element Classification

- `Folder`: `autoresearch/scanner-quality/01-element-classification/`
- `Metric`: `element_classification_score`
- `Direction`: `higher_is_better`
- `Focus`:
  - method vs function classification
  - property vs exported symbol classification
  - duplicate symbol suppression
- `Primary benchmark failures`:
  - `Settings.scad_dir` duplicated as property and exported function
  - `CadQueryTool.execute` duplicated as method and top-level function

### Loop 2: Export and Relationship Accuracy

- `Folder`: `autoresearch/scanner-quality/02-export-relationships/`
- `Metric`: `export_relationship_precision`
- `Direction`: `higher_is_better`
- `Focus`:
  - exported symbol precision
  - relationship correctness
  - entry-point quality
- `Primary benchmark failures`:
  - polluted entry-point list in `context.md`
  - false top-level exports in `index.json`

### Loop 3: Test and Coverage Linkage

- `Folder`: `autoresearch/scanner-quality/03-test-coverage-linkage/`
- `Metric`: `test_link_accuracy`
- `Direction`: `higher_is_better`
- `Focus`:
  - test file detection
  - production-to-test mapping
  - coverage report grounding
- `Primary benchmark failures`:
  - `coverage.json` reports every file as untested
  - `patterns.json` claims tested functions have no corresponding tests

### Loop 4: Async Pattern Detection

- `Folder`: `autoresearch/scanner-quality/04-async-pattern-detection/`
- `Metric`: `async_pattern_recall`
- `Direction`: `higher_is_better`
- `Focus`:
  - async function detection
  - async boundary detection
  - async report generation
- `Primary benchmark failures`:
  - `patterns.json` reports an empty async pattern set

### Loop 5: Context Summary Signal

- `Folder`: `autoresearch/scanner-quality/05-context-summary-signal/`
- `Metric`: `context_summary_precision`
- `Direction`: `higher_is_better`
- `Focus`:
  - critical function ranking
  - entry-point summary precision
  - test noise suppression
- `Primary benchmark failures`:
  - `make_state` from a test helper appears as a critical function
  - entry points are inflated by duplicated class methods/properties

## Dependency Order

```text
Loop 1 → Loop 2 → (Loop 3 ∥ Loop 4) → Loop 5
```

Reasoning:

- Loop 1 fixes the underlying symbol model.
- Loop 2 depends on the symbol model being trustworthy.
- Loops 3 and 4 can proceed in parallel once extraction is sane enough.
- Loop 5 should consume cleaner signals from the previous loops instead of learning around noise.

## Campaign Exit Conditions

- `index.json` no longer duplicates class properties or methods as exported top-level functions for this corpus.
- `coverage.json` and `patterns.json` agree with the presence of actual tests in `tests/`.
- async reports identify the repo's async surface.
- `context.md` stops surfacing test helpers as critical functions except where explicitly intended.

## First Recommended Work

Start with Loop 1 and Loop 3.

- Loop 1 removes the structural corruption in the extracted element graph.
- Loop 3 addresses the most visibly broken user-facing report.

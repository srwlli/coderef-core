# AutoResearch Loops Reference

This package (`coderef-core`) hosts a scanner-quality autoresearch campaign. The scanner code being optimized lives in `src/scanner/`, `src/pipeline/generators/`, and `src/fileGeneration/`. The benchmark corpus is the `stl-agent` project at `C:\Users\willh\Desktop\CODEREF\ASSISTANT\projects\stl-agent`.

Important:

- `coderef-core` is the system under test — the loop modifies code here.
- `stl-agent` is the fixed external benchmark corpus — never modified by the loop.
- Before running `/run-autoresearch`, refine each loop's `Scope` candidates and implement the verify scripts under `autoresearch/scanner-quality/scripts/`.

## Campaign Root

- `autoresearch/scanner-quality/`

## Loop Graph

```text
Loop 1 → Loop 2 → (Loop 3 ∥ Loop 4) → Loop 5
```

- `Loop 1`: element classification
- `Loop 2`: export and relationship accuracy
- `Loop 3`: test and coverage linkage
- `Loop 4`: async pattern detection
- `Loop 5`: context summary signal quality

## Loop Index

| Loop | Folder | Metric | Planned Verify |
|------|--------|--------|----------------|
| 1 | `autoresearch/scanner-quality/01-element-classification/` | `element_classification_score` | `python autoresearch/scanner-quality/scripts/verify_element_classification.py --corpus-root C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent --scan-dir C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent/.coderef` |
| 2 | `autoresearch/scanner-quality/02-export-relationships/` | `export_relationship_precision` | `python autoresearch/scanner-quality/scripts/verify_export_relationships.py --corpus-root C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent --scan-dir C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent/.coderef` |
| 3 | `autoresearch/scanner-quality/03-test-coverage-linkage/` | `test_link_accuracy` | `python autoresearch/scanner-quality/scripts/verify_test_linkage.py --corpus-root C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent --scan-dir C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent/.coderef` |
| 4 | `autoresearch/scanner-quality/04-async-pattern-detection/` | `async_pattern_recall` | `python autoresearch/scanner-quality/scripts/verify_async_patterns.py --corpus-root C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent --scan-dir C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent/.coderef` |
| 5 | `autoresearch/scanner-quality/05-context-summary-signal/` | `context_summary_precision` | `python autoresearch/scanner-quality/scripts/verify_context_signal.py --corpus-root C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent --scan-dir C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent/.coderef` |

## Reality Check

- None of the planned verify scripts exist in this package yet.
- Each loop `goal.md` includes a planned `Verify` line plus Notes describing the missing implementation.
- `BASELINES.md` records the qualitative baseline symptoms observed in the `stl-agent` corpus on `2026-04-05`.

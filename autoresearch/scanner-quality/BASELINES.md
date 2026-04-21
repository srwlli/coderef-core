# Scanner Quality Baselines

## Corpus

- `Corpus Path`: `C:\Users\willh\Desktop\CODEREF\ASSISTANT\projects\stl-agent`
- `System Under Test`: `coderef-core` (this package)
- `Scan Timestamp`: `2026-04-05T09:32:07.758Z`
- `Scan Inputs` (relative to corpus path): `.coderef/index.json`, `.coderef/graph.json`, `.coderef/context.md`, `.coderef/reports/*.json`

## Numeric Baselines

| Loop | Metric | Date | Value | Note |
|------|--------|------|-------|------|
| Loop 6: Test Gap Precision | `test_gap_precision` | 2026-04-10 | 0.484848 → **1.000000** | Fixed in 1 iteration. Test files filtered from testGaps. All 34 false positives eliminated. |
| Loop 5: Context Summary Signal | `context_summary_precision` | 2026-04-10 | 0.666667 → **1.000000** | Fixed in 1 iteration. Test files filtered from critical functions. |
| Loop 4: Async Pattern Detection | `async_pattern_recall` | 2026-04-10 | 0.000000 → **1.000000** | Fixed in 1 iteration. Added async field to Python elements. All 11 async functions now detected. |
| Loop 3: Test and Coverage Linkage | \ | 2026-04-10 | 0.000000 → **1.000000** | Fixed in 1 iteration. Added Python test pattern detection to isTestFile(). All 3 test links detected. |
| Loop 2: Export and Relationship Accuracy | \ | 2026-04-10 | 1.000000 → **1.000000** | PERFECT baseline: 0 methods/properties exported. Loop 1 fix eliminated all export pollution. No iterations needed. |
| Loop 1: Element Classification | `element_classification_score` | 2026-04-10 | 0.841270 → **1.000000** | Fixed in 5 iterations. Stopped double-traversal of Python class bodies in element-extractor.ts. All duplicates eliminated. |

## Qualitative Baseline Symptoms

### Loop 1: Element Classification

- `index.json` duplicates `Settings.scad_dir` as both `Settings.scad_dir` and exported `function scad_dir`.
- `index.json` duplicates `CadQueryTool.execute` as both a method and exported `function execute`.

### Loop 2: Export and Relationship Accuracy

- `context.md` entry points include polluted top-level exports that are actually class members.
- Export counts and relationship summaries are inflated by misclassified symbols.

### Loop 3: Test and Coverage Linkage

- `coverage.json` reports `testedFiles: 0` and `coveragePercentage: 0`.
- `coverage.json` marks the test files themselves as untested.
- `patterns.json` claims `route` has no corresponding test file even though `tests/test_router.py` exists.

### Loop 4: Async Pattern Detection

- `patterns.json` reports `"asyncPatterns": []`.
- The repo contains real async functions such as `MeshyTool.text_to_3d`.

### Loop 5: Context Summary Signal

- `context.md` lists `make_state` from `tests/test_router.py` as a critical function.
- Entry-point and critical-function summaries are not clean enough for onboarding decisions.

### Loop 6: Test Gap Precision

- `patterns.json` testGaps includes 34 test functions as "needing tests" (e.g., `test_openscad_tool` in `tests/test_integration.py`).
- 51.5% of testGap entries are noise, making the report harder to use for identifying actual test coverage gaps.
- Only 32/66 entries are legitimate production code without tests.

## Baseline Update Policy

When verify scripts exist:

1. Run the exact `Verify` command from the loop `goal.md`.
2. Capture the numeric stdout value.
3. Append the value here with the date, loop name, and one-line note.

---
Goal: Improve coderef-core scanner test discovery and coverage linkage so tested production files are recognized correctly for the stl-agent corpus.
Metric: test_link_accuracy
Direction: higher_is_better
Verify: python autoresearch/scanner-quality/scripts/verify_test_linkage.py --corpus-root C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent --scan-dir C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent/.coderef
Scope:
  - src/pipeline/generators/coverage-generator.ts
  - src/pipeline/generators/pattern-generator.ts
  - src/fileGeneration/analyzeCoverage.ts
  - src/fileGeneration/detectPatterns.ts
Iterations: 20
Budget: 180
---

## Notes

- Corpus: `stl-agent` at `C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent`.
- System under test: this package (`coderef-core`).
- Current failure signatures (from corpus `.coderef/reports/`):
  - `coverage.json` reports `testedFiles: 0` and `coveragePercentage: 0`.
  - `coverage.json` marks test files as untested.
  - `patterns.json` reports missing tests for functions with direct test coverage.
- Recommended guard when this loop becomes runnable: a fast scanner smoke benchmark on the same corpus.
- TODO: implement `verify_test_linkage.py` per `autoresearch/scanner-quality/VERIFY-CONTRACTS.md`.
- TODO: confirm or narrow `Scope` — the listed files are starting candidates from the coverage and pattern pipelines.

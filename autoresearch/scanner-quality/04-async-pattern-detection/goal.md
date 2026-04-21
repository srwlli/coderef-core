---
Goal: Improve coderef-core async pattern detection so real async functions and async boundaries are surfaced correctly when scanning the stl-agent corpus.
Metric: async_pattern_recall
Direction: higher_is_better
Verify: python autoresearch/scanner-quality/scripts/verify_async_patterns.py --corpus-root C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent --scan-dir C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent/.coderef
Scope:
  - src/pipeline/generators/pattern-generator.ts
  - src/fileGeneration/detectPatterns.ts
  - src/scanner/tree-sitter-scanner.ts
Iterations: 15
Budget: 180
---

## Notes

- Corpus: `stl-agent` at `C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent`.
- System under test: this package (`coderef-core`).
- This loop may run in parallel with Loop 3 after Loop 1 stabilizes.
- Current failure signatures (from corpus):
  - `.coderef/reports/patterns.json` reports `"asyncPatterns": []`.
  - the corpus contains real async functions such as `MeshyTool.text_to_3d`.
- TODO: implement `verify_async_patterns.py` per `autoresearch/scanner-quality/VERIFY-CONTRACTS.md`.
- TODO: confirm or narrow `Scope` — the listed files are starting candidates from the pattern detection pipeline.

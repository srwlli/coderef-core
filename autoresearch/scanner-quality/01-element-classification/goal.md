---
Goal: Improve coderef-core scanner element extraction and classification quality for Python repositories so properties and methods are not emitted as duplicated top-level exports when scanning the stl-agent corpus.
Metric: element_classification_score
Direction: higher_is_better
Verify: python autoresearch/scanner-quality/scripts/verify_element_classification.py --corpus-root C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent --scan-dir C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent/.coderef
Scope:
  - src/pipeline/extractors/element-extractor.ts
Iterations: 15
Budget: 180
---

## Notes

- Corpus: `stl-agent` at `C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent`, using the `.coderef/` outputs captured on `2026-04-05`.
- System under test: this package (`coderef-core`).
- Current failure signatures:
  - `Settings.scad_dir` is emitted as both a property and exported function.
  - `CadQueryTool.execute` is emitted as both a method and exported top-level function.
- **Scope UPDATED (iter 5):** Populate CLI uses AST-based extraction via `src/pipeline/extractors/element-extractor.ts`, NOT regex patterns in scanner.ts. Iterations 1-4 modified wrong file.
- **Root cause (REVISED):** AST element extractor emits duplicates. Methods with qualified names (`Settings.scad_dir`) also emitted as unqualified functions (`scad_dir`) at same line.
- **True baseline:** 0.776824 (52 duplicates / 233 elements). Initial 0.841270 was from stale data.

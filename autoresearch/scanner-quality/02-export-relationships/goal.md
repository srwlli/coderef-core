---
Goal: Improve coderef-core scanner export and relationship accuracy so entry points and exported symbol summaries match actual code structure for the stl-agent corpus.
Metric: export_relationship_precision
Direction: higher_is_better
Verify: python autoresearch/scanner-quality/scripts/verify_export_relationships.py --corpus-root C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent --scan-dir C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent/.coderef
Scope:
  - src/scanner/scanner.ts
  - src/scanner/tree-sitter-scanner.ts
  - src/pipeline/generators/context-generator.ts
Iterations: 15
Budget: 180
---

## Notes

- Corpus: `stl-agent` at `C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent`.
- System under test: this package (`coderef-core`).
- This loop depends on Loop 1 reaching an acceptable extraction baseline first.
- Current failure signatures:
  - `context.md` entry points are polluted by class-member artifacts treated as exported functions.
  - relationship and export views are inflated by duplicate element extraction.
- TODO: implement `verify_export_relationships.py` per `autoresearch/scanner-quality/VERIFY-CONTRACTS.md`.
- TODO: confirm or narrow `Scope` after Loop 1 stabilizes — the listed files are starting candidates.

---
Goal: Improve coderef-core context summary precision so scanner onboarding summaries highlight real production hotspots and suppress test-helper noise for the stl-agent corpus.
Metric: context_summary_precision
Direction: higher_is_better
Verify: python autoresearch/scanner-quality/scripts/verify_context_signal.py --corpus-root C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent --scan-dir C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent/.coderef
Scope:
  - src/pipeline/generators/context-generator.ts
  - src/fileGeneration/generateContext.ts
Iterations: 15
Budget: 180
---

## Notes

- Corpus: `stl-agent` at `C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent`.
- System under test: this package (`coderef-core`).
- This loop should run after Loops 1 through 4 have improved the underlying extracted signals.
- Current failure signatures (from corpus):
  - `.coderef/context.md` surfaces `make_state` from `tests/test_router.py` as a critical function.
  - entry-point summaries are inflated by duplicated class-member extraction.
- TODO: implement `verify_context_signal.py` per `autoresearch/scanner-quality/VERIFY-CONTRACTS.md`.
- TODO: confirm or narrow `Scope` — the listed files are starting candidates from the context generator pipeline.

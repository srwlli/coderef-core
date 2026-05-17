# Scanner Quality AutoResearch Workflow

## Purpose

Improve `coderef-core` scanner output quality, using `stl-agent` as a fixed external benchmark corpus.

This package owns the campaign design, the loop definitions, and the scanner code that the loop modifies. The verify scripts are not yet implemented.

## Roles

### This package (`coderef-core`)

- Owns the scanner and pipeline code that the autoresearch loop modifies (`src/scanner/`, `src/pipeline/generators/`, `src/fileGeneration/`).
- Hosts the campaign design and loop definitions under `autoresearch/scanner-quality/`.
- Must implement the verify scripts referenced by each loop's `goal.md`.

### Benchmark corpus (`stl-agent`)

- Located at `C:\Users\willh\Desktop\CODEREF\ASSISTANT\projects\stl-agent`.
- Fixed Python codebase being scanned each iteration — never modified by the loop.
- Holds the `.coderef/` outputs captured on `2026-04-05` that establish the baseline failures.

## Execution Order

```text
Loop 1 → Loop 2 → (Loop 3 ∥ Loop 4) → Loop 5
```

### Loop 1: Element Classification

Fix Python symbol extraction and classification so properties and methods are not emitted as duplicated top-level exports.

### Loop 2: Export and Relationship Accuracy

Fix exported element and relationship modeling so the index and graph reflect actual code structure.

### Loop 3: Test and Coverage Linkage

Fix test discovery and production-to-test linkage so coverage and test-gap outputs stop reporting false zero coverage and missing tests.

### Loop 4: Async Pattern Detection

Fix async detection so real async functions and async boundaries are surfaced in pattern reports.

### Loop 5: Context Summary Signal

Reduce summary noise so critical functions, entry points, and module-level summaries stop elevating test helpers and duplicated symbols.

## Running the Campaign

1. Refine each loop `goal.md`'s `Scope` candidates to the precise `coderef-core` source files for that loop.
2. Implement the loop's verify script under `autoresearch/scanner-quality/scripts/` per `VERIFY-CONTRACTS.md`.
3. Dry-run the `Verify` command until it prints exactly one numeric value.
4. Record the first numeric baseline in `BASELINES.md`.
5. Run `/run-autoresearch` or the equivalent AutoResearch runner against that loop.

## Guardrails

- Do not start iterative optimization until `Verify` is numeric, stable, and automated.
- Do not compare metrics across loops directly.
- Do not broaden `Scope` outside the scanner modules relevant to the chosen loop.
- Do not modify files inside the `stl-agent` corpus path — it must stay frozen for benchmark stability.

## Success Criteria

- Loop 1 reaches a usable extraction score and removes observed duplicate method/property export artifacts.
- Loop 2 stops false top-level export inflation and relationship pollution.
- Loop 3 produces non-zero, test-aware coverage and test-gap outputs for the corpus.
- Loop 4 reports the corpus's async surface instead of an empty set.
- Loop 5 makes context summaries actionable for onboarding and review.

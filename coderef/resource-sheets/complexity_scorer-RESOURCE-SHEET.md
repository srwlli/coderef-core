---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: complexity_scorer
parent_project: coderef-core
category: parser
version: 1.0.0
documents: src/context/complexity-scorer.ts
related_files:
  - src/context/complexity-scorer.ts
status: draft
---

## Executive Summary

`complexity-scorer.ts` converts persisted element span, parameter, and AST complexity data into a normalized 0–10 planning score and low/medium/high/critical risk band. Missing fields use disclosed type-keyed/minimal estimates, and batch statistics summarize score distribution [ref](src/context/complexity-scorer.ts).

## Audience and Intent

Context and analysis maintainers should use this scorer for element-level planning metrics. Prefer elements produced by the current tree-sitter pipeline so `endLine`, parameters, and AST complexity are real; older/fallback elements carry estimated provenance.

## Architecture / Behavior

LOC is `endLine - line + 1` or 8 for methods/6 otherwise. Parameter count is the real array length or 2 for methods/1 otherwise. Cyclomatic complexity is the persisted value clamped to at least one or estimated one; cognitive and nesting values pass through when present. Provenance is `ast` only when persisted cyclomatic exists [ref](src/context/complexity-scorer.ts).

The composite caps LOC at 200, cyclomatic at 15, parameters at 10; weights them 0.3/0.4/0.2; scales and rounds to an integer. Risk thresholds are ≤3 low, ≤5 medium, ≤8 high, otherwise critical. Statistics preserve input scoring, sort numeric scores, and return rounded average/median plus high/critical counts [ref](src/context/complexity-scorer.ts).

## Source of Truth

This class is authoritative for fallback estimates, normalization caps/weights, composite rounding, risk thresholds, and aggregate statistics. Extractor `complexity-metrics.ts` is authoritative for persisted AST metrics; element types/contracts live in `context/types.ts` [ref](src/context/complexity-scorer.ts).

Runtime configuration/persistence: **NONE**. Registered source text is retained only for API compatibility and is not used. `context/__tests__/complexity-scorer.test.ts` backs persisted metrics, fallbacks, provenance, retired source regex behavior, batch order, risk, empty/mixed sets, and statistics [ref](src/context/__tests__/complexity-scorer.test.ts).

## Public API / Contracts

- `ComplexityScorer` exposes source registration, single/batch scoring, and aggregate statistics [ref](src/context/complexity-scorer.ts#ComplexityScorer).

## Dependencies

- `context/types.ts` supplies `ElementComplexity`, `ComplexityMetrics`, and compatible `ElementData` [ref](src/context/complexity-scorer.ts).
- External runtime packages and I/O: **NONE** [ref](src/context/complexity-scorer.ts).

## Risks & Edge Cases

- Composite weights sum to 0.9, so the nominal maximum is 9 rather than 10. Critical is therefore reachable only at the rounded maximum [ref](src/context/complexity-scorer.ts).
- `metric_source` keys only on cyclomatic presence. An element can have real span/parameters but be labeled estimated, or have AST cyclomatic but fallback LOC/parameters while labeled ast [ref](src/context/complexity-scorer.ts).
- Negative/invalid persisted cognitive or nesting values pass through without validation; cyclomatic alone is clamped [ref](src/context/complexity-scorer.ts).
- `addSource` retains arbitrary source strings indefinitely even though no scoring path reads them, creating avoidable memory retention for legacy callers [ref](src/context/complexity-scorer.ts).
- Composite rounding can collapse materially different raw scores into the same risk band/statistic [ref](src/context/complexity-scorer.ts).

## Validation Checklist

- [x] Verified the sole indexed class export and anchor.
- [x] Traced every real/fallback metric, normalization, risk, and statistic branch.
- [x] Reviewed the focused scorer suite.
- [x] Confirmed source registration is deprecated and unused by scoring.


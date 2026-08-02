---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: rag_eval
parent_project: coderef-core
category: CLI
version: 1.0.0
documents: src/cli/rag-eval.ts
related_files:
  - src/cli/rag-eval.ts
status: draft
---

## Executive Summary

`rag-eval.ts` is the golden-query evaluation CLI for a populated RAG index. It runs the same provider, vector store, and semantic search service as production search, scores the first expected file at file grain, aggregates hit@1, hit@5, and mean reciprocal rank, and optionally enforces a minimum MRR [ref](src/cli/rag-eval.ts).

## Audience and Intent

RAG ranking and indexing maintainers should use this harness to compare retrieval changes against committed golden queries/baselines. It measures file retrieval only; it does not judge answer generation, chunk content, citation quality, latency, or semantic correctness beyond expected-file membership.

## Architecture / Behavior

The CLI reads a golden query JSON file and `.coderef/rag-index.json`, constructs the recorded Ollama/OpenAI provider and vector store through the shared factory, initializes the store, then searches each query sequentially with the configured top-k. Result files are normalized/deduplicated before first-hit scoring and top-three reporting [ref](src/cli/rag-eval.ts).

Metrics count misses as zero, round aggregate fractions to three decimals, and support JSON or human output. Exit 0 means measurement completed, exit 1 means the optional MRR floor failed, and exit 2 covers setup/provider/fatal errors. Importing the module does not run the bin [ref](src/cli/rag-eval.ts).

## Source of Truth

This module is authoritative for file-level matching, rank deduplication, metrics, payload, and exit semantics. The golden file owns expected results; `.coderef/rag-index.json` owns provider/store selection; provider factory and `SemanticSearchService` own retrieval [ref](src/cli/rag-eval.ts).

Runtime configuration is CLI flags plus the two JSON artifacts. Persistent writes: **NONE**. `rag-eval.test.ts` backs path normalization, duplicate collapse, multiple expected files, misses, hit cutoffs, MRR, and empty aggregation [ref](__tests__/rag-eval.test.ts).

## Public API / Contracts

- `GoldenQuery` defines ID, query text, and one or more expected files [ref](src/cli/rag-eval.ts#GoldenQuery).
- `QueryScore` records first rank, hit flags, reciprocal rank, and top files [ref](src/cli/rag-eval.ts#QueryScore).
- `EvalAggregate` records query count, hit@1, hit@5, and MRR [ref](src/cli/rag-eval.ts#EvalAggregate).
- `rankOfFirstHit` returns a one-based first unique-file match or `null` [ref](src/cli/rag-eval.ts#rankOfFirstHit).
- `computeMetrics` aggregates nullable ranks with three-decimal rounding [ref](src/cli/rag-eval.ts#computeMetrics).

## Dependencies

- Node `fs` and `path` read/locate golden and index metadata [ref](src/cli/rag-eval.ts).
- `path-normalize.ts` normalizes slash direction; `shared/cli-args.ts` parses strict flags [ref](src/cli/rag-eval.ts).
- `provider-factory.ts` and `semantic-search.ts` supply the same runtime retrieval path used outside evaluation [ref](src/cli/rag-eval.ts).

## Risks & Edge Cases

- Matching includes bare `f.endsWith(e)`. **[inference]** Expected `bar.ts` can falsely match result `foobar.ts`; the slash-bounded condition is present but the additional bare suffix broadens it [ref](src/cli/rag-eval.ts).
- Golden JSON shape is not validated. Missing/non-array `queries`, malformed entries, or empty expected lists can fail late or silently miss [ref](src/cli/rag-eval.ts).
- `top-k` and `min-mrr` are parsed numerically but no range checks occur here; zero/negative/greater-than-one values can produce nonsensical runs or gates [ref](src/cli/rag-eval.ts).
- Provider metadata accepts only exact `openai`; every other value falls back to Ollama while still being printed as the recorded provider [ref](src/cli/rag-eval.ts).
- Queries run sequentially and no per-query error isolation exists; one provider/search failure aborts the complete evaluation [ref](src/cli/rag-eval.ts).
- Metrics are rounded before comparison/output, so a floor near a rounding boundary gates on the rounded MRR [ref](src/cli/rag-eval.ts).

## Validation Checklist

- [x] Verified all five indexed exports and anchors.
- [x] Traced setup, provider/store construction, scoring, output, and exit paths.
- [x] Reviewed direct scoring tests.
- [x] Distinguished file retrieval metrics from answer quality.


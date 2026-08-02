---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: graph_reranker
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/integration/rag/graph-reranker.ts
related_files:
  - src/integration/rag/graph-reranker.ts
status: draft
---

## Executive Summary

`graph-reranker.ts` reorders semantic-search hits using dependency/dependent counts, coverage, complexity, export status, and query-specific strategies, while retaining a factor-level explanation [ref](src/integration/rag/graph-reranker.ts).

## Audience and Intent

RAG ranking maintainers use this module when semantic similarity alone is insufficient. It accepts the canonical exported graph, precomputes reverse-edge counts, and keeps the hot re-ranking path independent of graph traversal.

## Architecture / Behavior

Graph assignment builds a target-dependent-count index and total node count. With no graph, hits are copied into the re-ranked shape at factor 1. With a graph, configurable weights are normalized, metadata factors are added, strategy boosts applied, boosts capped, minimum scores enforced, and results sorted descending [ref](src/integration/rag/graph-reranker.ts).

Strategy inference maps usage, public/API, quality/coverage, and importance/centrality phrases to specialized strategies. Impact analysis reports average boost, position changes, top-result change, and movements of at least three positions [ref](src/integration/rag/graph-reranker.ts).

## Source of Truth

This module is authoritative for graph-aware ranking defaults, factor formulas, strategy inference, boost/threshold handling, and impact metrics. The exported graph owns topology, while semantic-search results own initial scores and metadata [ref](src/integration/rag/graph-reranker.ts).

Runtime configuration is `ReRankingOptions` and the optional graph; persistent state/configuration: **NONE**. `graph-reranker.test.ts` covers metadata boosts, strategies, caps, missing fields, weights, empty input, and explanations [ref](src/integration/rag/__tests__/graph-reranker.test.ts).

## Public API / Contracts

- `ReRankingOptions` configures factor weights, strategy, maximum boost, and minimum score [ref](src/integration/rag/graph-reranker.ts#ReRankingOptions).
- `QueryStrategy` enumerates general, centrality, quality, usage, recent, and public modes [ref](src/integration/rag/graph-reranker.ts#QueryStrategy).
- `ReRankedResult` extends a search result with original/final scores, boost, and explanation [ref](src/integration/rag/graph-reranker.ts#ReRankedResult).
- `RankingExplanation` reports semantic, graph, quality, and individual factor contributions [ref](src/integration/rag/graph-reranker.ts#RankingExplanation).
- `GraphReRanker` manages graph state, re-ranks results, infers strategies, and analyzes ranking changes [ref](src/integration/rag/graph-reranker.ts#GraphReRanker).

## Dependencies

- `graph-exporter.ts` supplies the canonical flat graph shape [ref](src/integration/rag/graph-reranker.ts).
- `semantic-search.ts` supplies input and inherited result contracts [ref](src/integration/rag/graph-reranker.ts).

## Risks & Edge Cases

- A zero initial semantic score makes the boost-factor division undefined (`0/0`) or infinite; no explicit guard exists [ref](src/integration/rag/graph-reranker.ts).
- Supplying all five weights as zero makes weight normalization divide by zero [ref](src/integration/rag/graph-reranker.ts).
- The declared `recent` strategy has no implementation branch and behaves as general [ref](src/integration/rag/graph-reranker.ts).
- Centrality index data is built but the private centrality calculation is not used by the public re-ranking formula [ref](src/integration/rag/graph-reranker.ts).
- Dependency and dependent factor weights use the unnormalized option values, while only semantic contribution uses a normalized weight [ref](src/integration/rag/graph-reranker.ts).
- Equal-score ordering relies on the runtime's stable sort behavior [ref](src/integration/rag/graph-reranker.ts).

## Validation Checklist

- [x] Verified all five indexed exports and declaration anchors.
- [x] Traced no-graph, weighted, strategy, cap, threshold, and analysis paths.
- [x] Reviewed unit coverage for factors and weight behavior.
- [x] Documented zero-score/zero-weight and unimplemented-strategy limits.


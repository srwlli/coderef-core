---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: answer_generation_service
parent_project: coderef-core
category: service
version: 1.0.0
documents: src/integration/rag/answer-generation-service.ts
related_files:
  - src/integration/rag/answer-generation-service.ts
status: draft
---

## Executive Summary

`answer-generation-service.ts` orchestrates the semantic Q&A path from search through graph-aware re-ranking, context construction, prompt construction, LLM completion, confidence calculation, related-question extraction, and response telemetry [ref](src/integration/rag/answer-generation-service.ts).

## Audience and Intent

RAG consumers and maintainers use `AnswerGenerationService` as the high-level question-answering boundary. It is intended for grounded answers backed by retrieved code elements, with stage timings and token usage exposed for diagnostics.

## Architecture / Behavior

Construction binds an `LLMProvider`, a `VectorStore`, and an optional exported dependency graph. `generateAnswer` searches, short-circuits to a deterministic no-results response when retrieval is empty, re-ranks results, builds markdown context, selects a prompt, invokes the LLM, computes confidence, extracts a bulleted related-questions section, and returns one `Answer` [ref](src/integration/rag/answer-generation-service.ts).

Graph state can be replaced after construction. Variations run concurrent completions at temperature 0.7. Validation and analysis helpers report grounding, length, citation, truncation, relevance, and processing-efficiency signals without changing the answer [ref](src/integration/rag/answer-generation-service.ts).

## Source of Truth

This module is authoritative for Q&A stage ordering, default completion values, no-results behavior, confidence heuristics, related-question parsing, and answer-quality diagnostics. The search, re-ranking, context, prompt, provider, and vector-store modules remain authoritative for their respective operations [ref](src/integration/rag/answer-generation-service.ts).

Runtime configuration comes from `AnswerOptions`; persistent configuration/state: **NONE**. Integration coverage in `qa-pipeline.test.ts` exercises successful, empty, and failed retrieval/completion paths, option forwarding, citations, confidence, context, timings, and token usage [ref](src/integration/rag/__tests__/integration/qa-pipeline.test.ts).

## Public API / Contracts

- `AnswerOptions` composes search, re-ranking, context, completion, query-context, and prompt-preference options [ref](src/integration/rag/answer-generation-service.ts#AnswerOptions).
- `Answer` is the returned answer, source, confidence, token, context, and timing contract [ref](src/integration/rag/answer-generation-service.ts#Answer).
- `AnswerGenerationService` exposes graph replacement, answer/variation generation, validation, and answer analysis [ref](src/integration/rag/answer-generation-service.ts#AnswerGenerationService).

## Dependencies

- The LLM provider supplies completion and usage data [ref](src/integration/rag/answer-generation-service.ts).
- Semantic search and the vector store supply grounded candidates [ref](src/integration/rag/answer-generation-service.ts).
- The graph re-ranker, context builder, and prompt templates transform candidates into the final prompt and source list [ref](src/integration/rag/answer-generation-service.ts).

## Risks & Edge Cases

- Confidence is a local additive heuristic, not a calibrated probability; high retrieval scores and a clean finish reason can drive it to 1.0 [ref](src/integration/rag/answer-generation-service.ts).
- All thrown values are wrapped through `error.message`; a non-Error rejection can lose useful detail [ref](src/integration/rag/answer-generation-service.ts).
- Related-question extraction accepts only dash-prefixed lines in one markdown section and may miss other valid formats [ref](src/integration/rag/answer-generation-service.ts).
- Processing efficiency divides tokens by elapsed milliseconds and can produce infinity when a synthetic or very fast answer records zero milliseconds [ref](src/integration/rag/answer-generation-service.ts).
- Variations launch every completion concurrently and impose no local concurrency cap [ref](src/integration/rag/answer-generation-service.ts).

## Validation Checklist

- [x] Verified all three indexed exports and declaration anchors.
- [x] Traced normal, empty-result, error, and variation paths.
- [x] Reviewed Q&A integration coverage and option forwarding.
- [x] Documented heuristic confidence and parsing/concurrency limits.


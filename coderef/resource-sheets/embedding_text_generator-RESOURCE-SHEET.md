---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: embedding_text_generator
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/integration/rag/embedding-text-generator.ts
related_files:
  - src/integration/rag/embedding-text-generator.ts
status: draft
---

## Executive Summary

`embedding-text-generator.ts` renders `CodeChunk` records into bounded natural or structured text for embedding, query augmentation, validation, statistics, and pairwise comparison [ref](src/integration/rag/embedding-text-generator.ts).

## Audience and Intent

RAG indexing and semantic-search maintainers use this module to produce stable, information-rich model input without coupling text formatting to an embedding provider.

## Architecture / Behavior

Generated chunk text always starts with the CodeRef identity, then adds a natural sentence or structured fields, optional documentation/source, up to ten dependencies and dependents, and quality metadata. The assembled string is character-truncated to the configured limit [ref](src/integration/rag/embedding-text-generator.ts).

Additional helpers batch generation, enrich queries with type/language/file hints, estimate tokens at four characters per token, summarize text lengths, validate basic quality, and describe similarities/differences between two chunks [ref](src/integration/rag/embedding-text-generator.ts).

## Source of Truth

This module is authoritative for embedding-text layout, formatting defaults, truncation, human-readable element labels, query augmentation, token estimates, and text-quality checks. `CodeChunk` remains authoritative for source metadata and relationships [ref](src/integration/rag/embedding-text-generator.ts).

Runtime configuration is `TextGenerationOptions`; persistent configuration/state: **NONE**. `embedding-text-generator.test.ts` covers section inclusion, limits, metadata, descriptions, queries, and truncation, with pipeline integration coverage in `indexing-pipeline.test.ts` [ref](src/integration/rag/__tests__/embedding-text-generator.test.ts) [ref](src/integration/rag/__tests__/integration/indexing-pipeline.test.ts).

## Public API / Contracts

- `TextGenerationOptions` controls source, relationship, documentation, length, and style behavior [ref](src/integration/rag/embedding-text-generator.ts#TextGenerationOptions).
- `EmbeddingTextGenerator` exposes single/batch rendering, query text, estimates, statistics, validation, and comparison helpers [ref](src/integration/rag/embedding-text-generator.ts#EmbeddingTextGenerator).

## Dependencies

- `code-chunk.ts` supplies all input metadata; there are no runtime imports or external services [ref](src/integration/rag/embedding-text-generator.ts).

## Risks & Edge Cases

- Character truncation can cut source code, identifiers, or sections mid-token and may exceed `maxLength` after appending the marker [ref](src/integration/rag/embedding-text-generator.ts).
- The four-characters-per-token estimate is approximate and model-independent; batch average tokens are computed from the concatenated corpus, not per-text estimates [ref](src/integration/rag/embedding-text-generator.ts).
- Dependency and dependent lists are hard-capped at ten with no indication of omitted identities beyond the total count [ref](src/integration/rag/embedding-text-generator.ts).
- Natural descriptions say an element is exported only for truthy values, while structured output distinguishes explicit false [ref](src/integration/rag/embedding-text-generator.ts).
- Comparison output can contain empty similarities or differences sections [ref](src/integration/rag/embedding-text-generator.ts).

## Validation Checklist

- [x] Verified both indexed exports and declaration anchors.
- [x] Traced both styles and every optional section/default.
- [x] Reviewed unit and pipeline integration coverage.
- [x] Documented truncation, estimation, and list-cap semantics.


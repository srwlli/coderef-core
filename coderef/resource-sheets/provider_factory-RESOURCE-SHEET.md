---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: provider_factory
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/integration/llm/provider-factory.ts
related_files:
  - src/integration/llm/provider-factory.ts
status: draft
---

## Executive Summary

`provider-factory.ts` is the shared lazy construction boundary for RAG LLM providers and vector stores. It enforces explicit cloud opt-in with local Ollama default, centralizes environment/registry model selection, sizes stores from the provider, supports optional cloud stores, and preserves deprecated JSON-store aliases [ref](src/integration/llm/provider-factory.ts).

## Audience and Intent

RAG CLI/server and provider/store maintainers should use this factory instead of duplicating selection logic. Provider and SDK modules are dynamically imported so optional cloud dependencies remain dormant unless requested.

## Architecture / Behavior

Provider resolution is explicit value, then `CODEREF_LLM_PROVIDER`, then Ollama, lowercased. OpenAI/Anthropic require their API keys and receive configured/registry generation models. Ollama receives local host/model/API-key placeholder and optional embedding concurrency. Unsupported provider names throw [ref](src/integration/llm/provider-factory.ts).

Store construction first requires provider embedding dimensions. Pinecone uses its SDK when keyed or warns/falls back to JSON; Chroma always constructs its configured host; `sqlite` warns then aliases JSON; `json` and unknown names use JSON. JSON storage honors legacy `CODEREF_SQLITE_PATH` or defaults under `.coderef` [ref](src/integration/llm/provider-factory.ts).

## Source of Truth

This module is authoritative for provider/store selection, environment precedence, lazy loading, fallback behavior, and model-name dimension lookup. `MODEL_REGISTRY` owns model/host/dimension data; concrete providers/stores own runtime behavior [ref](src/integration/llm/provider-factory.ts).

Runtime configuration is environment variables and arguments; persistent state is owned by constructed stores. `rag-provider-default.test.ts`, cloud-provider offline tests, embedding concurrency tests, and JSON-store tests back default/explicit provider and store alias/fallback construction [ref](__tests__/rag-provider-default.test.ts) [ref](src/integration/llm/__tests__/cloud-providers-offline.test.ts) [ref](src/integration/vector/__tests__/json-store.test.ts).

## Public API / Contracts

- `resolveRagProvider` applies explicit/env/Ollama precedence and lowercases the result [ref](src/integration/llm/provider-factory.ts#resolveRagProvider).
- `CreateLLMProviderOptions` currently exposes Ollama embedding concurrency [ref](src/integration/llm/provider-factory.ts#CreateLLMProviderOptions).
- `createLLMProvider` lazily constructs explicit OpenAI/Anthropic or default Ollama [ref](src/integration/llm/provider-factory.ts#createLLMProvider).
- `createVectorStore` lazily constructs Pinecone/Chroma/JSON with documented fallbacks [ref](src/integration/llm/provider-factory.ts#createVectorStore).
- `embeddingDimensionsForModel` searches embedding-capable registry specs or returns `null` [ref](src/integration/llm/provider-factory.ts#embeddingDimensionsForModel).

## Dependencies

- Node `path` builds the default JSON store path [ref](src/integration/llm/provider-factory.ts).
- `model-registry.ts` supplies provider specs/dimensions [ref](src/integration/llm/provider-factory.ts).
- Concrete provider/store modules are dynamic optional dependencies [ref](src/integration/llm/provider-factory.ts).

## Risks & Edge Cases

- Unknown store names silently fall back to JSON, unlike unknown provider names which throw. A store typo can therefore change persistence backend without failing [ref](src/integration/llm/provider-factory.ts).
- Store matching is case-sensitive while provider matching is lowercased [ref](src/integration/llm/provider-factory.ts).
- Anthropic construction is allowed for generation, but vector-store construction immediately fails if the provider lacks embedding dimensions [ref](src/integration/llm/provider-factory.ts).
- Chroma construction does not test reachability; failures occur during later initialization/use [ref](src/integration/llm/provider-factory.ts).
- JSON storage still honors the misleading legacy `CODEREF_SQLITE_PATH`, which can surprise operators reading only the canonical store name [ref](src/integration/llm/provider-factory.ts).
- Dimension lookup requires exact model-name equality and does not recognize tags/aliases unless the registry name matches exactly [ref](src/integration/llm/provider-factory.ts).

## Validation Checklist

- [x] Verified all five indexed exports and anchors.
- [x] Traced every provider, store, fallback, environment, and lazy-import branch.
- [x] Reviewed provider-default, offline-cloud, concurrency, and store-alias coverage.
- [x] Documented asymmetric unknown-name and embedding-support behavior.


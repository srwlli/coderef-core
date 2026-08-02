---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: ollama_provider
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/integration/llm/ollama-provider.ts
related_files:
  - src/integration/llm/ollama-provider.ts
status: draft
---

## Executive Summary

`ollama-provider.ts` implements the shared LLM provider contract against a local Ollama daemon. It supports generation, order-preserving bounded-concurrency embeddings, registry-backed models/dimensions, approximate token counting, abort timeouts, exponential retry, and normalized provider errors [ref](src/integration/llm/ollama-provider.ts).

## Audience and Intent

RAG, provider, and local-runtime maintainers should use this sheet for Ollama request contracts, model selection, concurrency, retry, and failure semantics. The provider assumes the registry's embedding dimension exactly matches the daemon model output.

## Architecture / Behavior

Construction resolves host/model from config, registry, and environment; trims one trailing slash; and sets retries, timeout, and embedding concurrency. Completion POSTs non-streaming generation with gateway/workorder/session headers and maps response usage/durations. Embedding creates a fixed worker pool over single-text requests, writes results by input index, and stops dispatch after the first failure [ref](src/integration/llm/ollama-provider.ts).

Each request has its own abort timer and retry wrapper. Non-retryable `LLMError` and connection refusal fail fast; retryable server/network/timeout errors back off 1/2/4/8 seconds capped at 10. Embeddings validate array shape and exact configured dimension [ref](src/integration/llm/ollama-provider.ts).

## Source of Truth

This class is authoritative for Ollama HTTP payloads, response mapping, concurrency, retry, timeout, and error normalization. `model-registry.ts` owns default hosts/models/dimensions and embedding support; `llm-provider.ts` owns provider/error contracts [ref](src/integration/llm/ollama-provider.ts).

Runtime configuration includes provider config plus registry-named environment overrides, `CODEREF_EMBED_CONCURRENCY`, `WO_ID`, and `SESSION_ID`. Persistent state: **NONE**. Concurrency tests back bounds/order/fail-fast; unreachable-daemon tests back local error behavior [ref](__tests__/integration/rag/embedding-concurrency.test.ts) [ref](src/integration/llm/__tests__/ollama-provider-unreachable.test.ts).

## Public API / Contracts

- `OLLAMA_EMBED_CONCURRENCY_DEFAULT` is 4 [ref](src/integration/llm/ollama-provider.ts#OLLAMA_EMBED_CONCURRENCY_DEFAULT).
- `OLLAMA_EMBED_CONCURRENCY_MAX` is 16 [ref](src/integration/llm/ollama-provider.ts#OLLAMA_EMBED_CONCURRENCY_MAX).
- `resolveEmbedConcurrency` applies config-over-env precedence, flooring, validation, and clamp [ref](src/integration/llm/ollama-provider.ts#resolveEmbedConcurrency).
- `OllamaProvider` implements completion, embedding, token/model/dimension/support introspection [ref](src/integration/llm/ollama-provider.ts#OllamaProvider).
- `createOllamaProvider` constructs the provider from shared config [ref](src/integration/llm/ollama-provider.ts#createOllamaProvider).

## Dependencies

- `llm-provider.ts` supplies provider/config/response/error contracts [ref](src/integration/llm/ollama-provider.ts).
- `model-registry.ts` supplies Ollama specs and support checks [ref](src/integration/llm/ollama-provider.ts).
- Global `fetch`, `AbortController`, and timers provide HTTP/timeout/retry behavior [ref](src/integration/llm/ollama-provider.ts).

## Risks & Edge Cases

- HTTP 404 always recommends pulling the generation model (`this.model`), even when the failed request is for the separate embedding model [ref](src/integration/llm/ollama-provider.ts).
- Fail-fast prevents new embedding dispatch but cannot cancel sibling requests already in flight [ref](src/integration/llm/ollama-provider.ts).
- Negative `maxRetries` skips the retry loop and can throw an undefined last error; no constructor validation exists [ref](src/integration/llm/ollama-provider.ts).
- Base URL removes only one trailing slash [ref](src/integration/llm/ollama-provider.ts).
- Token counting is a character/4 estimate and can under/overcount substantially across languages/models [ref](src/integration/llm/ollama-provider.ts).
- Error messages can include complete HTTP response text, potentially large or sensitive if a proxy returns unexpected content [ref](src/integration/llm/ollama-provider.ts).

## Validation Checklist

- [x] Verified all five indexed exports and anchors.
- [x] Traced configuration, generation, worker pool, dimension, retry, HTTP, and network error paths.
- [x] Reviewed concurrency and unreachable-daemon tests.
- [x] Named model/error and in-flight cancellation edge cases.


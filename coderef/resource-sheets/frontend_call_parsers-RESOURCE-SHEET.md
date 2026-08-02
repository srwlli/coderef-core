---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: frontend_call_parsers
parent_project: coderef-core
category: parser
version: 1.0.0
documents: src/analyzer/frontend-call-parsers.ts
related_files:
  - src/analyzer/frontend-call-parsers.ts
status: draft
---

## Executive Summary

`frontend-call-parsers.ts` parses TypeScript/JSX with Babel and extracts statically visible frontend HTTP calls from global `fetch`, `axios`, React Query hook options, and common custom-client names. It normalizes literal/template paths, methods, file/line, call family, and confidence into `FrontendCall` [ref](src/analyzer/frontend-call-parsers.ts).

## Audience and Intent

Frontend-scanner, route-validation, and API-surface maintainers should use this sheet when changing call recognition or confidence. These parsers favor conservative static extraction of inline paths; they do not perform binding resolution, constant propagation, import verification, or request-body analysis.

## Architecture / Behavior

A one-content-slot cache holds the last Babel AST and per-parser/per-file results. Content changes clear every result and reparse with module, TypeScript, and JSX support. Parse/traversal failures yield empty arrays. Each public parser traverses the shared AST independently once per content/file/kind [ref](src/analyzer/frontend-call-parsers.ts).

Fetch recognizes identifier calls and reads a string-literal `method` from an inline object, defaulting GET. Axios recognizes direct `axios.<method>` for get/post/put/delete/patch/request. React Query recognizes identifier `useQuery`/`useMutation`, uses the first `queryKey` array element as the path, and assigns GET/POST respectively. Custom clients match object names containing api/client/http/request and the same method list [ref](src/analyzer/frontend-call-parsers.ts).

Static strings receive confidence 100. Template literals interleave raw quasis with generic `{id}` placeholders and receive 80. Other expressions are skipped. Lines come from Babel locations with zero fallback [ref](src/analyzer/frontend-call-parsers.ts).

## Source of Truth

This module is authoritative for frontend-call syntax recognition, path placeholder normalization, method defaults, call-family labels, and confidence values. `FrontendCall` in `types/types.ts` owns the shared output schema [ref](src/analyzer/frontend-call-parsers.ts).

Runtime configuration/persistence: **NONE**. Detector names/methods and cache size are hardcoded. `frontend-call-parsers.test.ts` backs each family, templates, malformed/empty content, variables, comments, conditional/async placement, methods, and line numbers [ref](src/analyzer/frontend-call-parsers.test.ts).

## Public API / Contracts

- `parseFetchCalls` extracts global identifier `fetch` calls with inline static/template paths [ref](src/analyzer/frontend-call-parsers.ts#parseFetchCalls).
- `parseAxiosCalls` extracts direct `axios.get/post/put/delete/patch/request` calls [ref](src/analyzer/frontend-call-parsers.ts#parseAxiosCalls).
- `parseReactQueryCalls` extracts `queryKey[0]` from direct `useQuery`/`useMutation` calls [ref](src/analyzer/frontend-call-parsers.ts#parseReactQueryCalls).
- `parseCustomApiCalls` extracts matching method calls on common client-like identifier names [ref](src/analyzer/frontend-call-parsers.ts#parseCustomApiCalls).
- `extractHttpMethod` returns an inline literal method uppercased or GET [ref](src/analyzer/frontend-call-parsers.ts#extractHttpMethod).
- `extractCallLocation` returns the supplied file and Babel start line or zero [ref](src/analyzer/frontend-call-parsers.ts#extractCallLocation).

## Dependencies

- `@babel/parser` parses module TypeScript and JSX [ref](src/analyzer/frontend-call-parsers.ts).
- `@babel/traverse` walks calls; `@babel/types` supplies syntax guards [ref](src/analyzer/frontend-call-parsers.ts).
- `types/types.ts` supplies `FrontendCall` [ref](src/analyzer/frontend-call-parsers.ts).

## Risks & Edge Cases

- Cached result arrays are returned by reference. Caller mutation affects later same-content/file/kind reads [ref](src/analyzer/frontend-call-parsers.ts).
- The single AST cache keys only on code text; result keys add file path, which preserves locations but can retain many file-keyed arrays until different content arrives [ref](src/analyzer/frontend-call-parsers.ts).
- Binding identity is not checked. A locally shadowed `fetch`, `axios`, `useQuery`, or client-like object can be reported as an HTTP call [ref](src/analyzer/frontend-call-parsers.ts).
- All template expressions become `{id}`, so distinct parameter names and expressions collapse [ref](src/analyzer/frontend-call-parsers.ts).
- `axios.request` and custom `.request` are reported with HTTP method `REQUEST`; their configuration object's actual method is not inspected [ref](src/analyzer/frontend-call-parsers.ts).
- React Query uses `queryKey`, not the `queryFn`/`mutationFn` request. Cache keys that are not URLs can be reported as endpoints, and mutations are always POST [ref](src/analyzer/frontend-call-parsers.ts).
- Custom object matching uses substring containment, so unrelated identifiers containing `api`, `client`, `http`, or `request` can be false positives [ref](src/analyzer/frontend-call-parsers.ts).

## Validation Checklist

- [x] Verified all six indexed exports and anchors.
- [x] Traced the shared cache and all four traversals.
- [x] Reviewed direct parser edge-case tests.
- [x] Distinguished syntax heuristics from binding/request resolution.


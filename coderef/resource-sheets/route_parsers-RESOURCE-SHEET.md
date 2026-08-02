---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: route_parsers
parent_project: coderef-core
category: parser
version: 1.0.0
documents: src/analyzer/route-parsers.ts
related_files:
  - src/analyzer/route-parsers.ts
status: draft
---

## Executive Summary

`route-parsers.ts` converts literal route declarations and framework-specific file conventions into the shared `RouteMetadata` shape for Flask, FastAPI, Express, Next.js, SvelteKit, Nuxt, and Remix. It also exports an ordered dispatcher that selects among those parsers from a code line, file path, export names, and optional full-file content [ref](src/analyzer/route-parsers.ts#extractRouteMetadata).

## Audience and Intent

Route-detection maintainers should use this sheet when extending framework coverage or changing false-positive controls. Downstream API-surface consumers should use it to understand which paths and methods are inferred, which inputs return `null`, and where parser output contains assumptions rather than explicit declarations.

## Architecture / Behavior

Three parsers operate primarily on a code line:

- Flask accepts `@<word>.route('<literal>')`, optionally followed by a literal `methods=[...]` list. It uppercases methods, defaults to `GET`, and records non-`app` receiver names as `blueprint` [ref](src/analyzer/route-parsers.ts#parseFlaskRoute).
- FastAPI accepts literal `@app.get|post|put|delete|patch('<literal>')` decorators and derives the one method from the member name [ref](src/analyzer/route-parsers.ts#parseFastAPIRoute).
- Express first matches `<word>.get|post|put|delete|patch('<literal>')`, then applies a local receiver blacklist, a whitelist, optional Express-import evidence from the full file, and finally a case-insensitive `router` suffix heuristic. Unknown receivers are rejected [ref](src/analyzer/route-parsers.ts#parseExpressRoute).

The remaining parsers derive routes from POSIX-style file paths and either exports or file content:

- Next.js App Router requires `/app/api/<path>/route.<js-or-ts-extension>` and at least one HTTP-method export [ref](src/analyzer/route-parsers.ts#parseNextJsRoute).
- Next.js Pages Router requires `/pages/api/<path>.<js-or-ts-extension>`, removes a terminal `/index`, and scans `req.method` comparisons. A default function literally named `handler` with no detected comparisons is assigned all five supported methods [ref](src/analyzer/route-parsers.ts#parseNextJsPagesRoute).
- SvelteKit maps `+server` HTTP-method exports directly. For `+page.server`, `load` maps to GET and `actions` maps to POST, PUT, and DELETE [ref](src/analyzer/route-parsers.ts#parseSvelteKitRoute).
- Nuxt reads a terminal `.get|post|put|delete|patch` suffix from the route basename. Unsuffixed `defineEventHandler` files are scanned for method tokens when `req.method` appears, otherwise they receive all five methods; a terminal `/index` is removed [ref](src/analyzer/route-parsers.ts#parseNuxtRoute).
- Remix maps `loader` to GET and `action` to POST, PUT, DELETE, and PATCH after transforming its route basename [ref](src/analyzer/route-parsers.ts#parseRemixRoute).

`extractRouteMetadata` tries file-based frameworks first in this order: Next App, Next Pages, SvelteKit, Nuxt, Remix. It then tries Flask, FastAPI, and Express against the code line. The first non-null result wins [ref](src/analyzer/route-parsers.ts#extractRouteMetadata).

## Source of Truth

All recognition regexes, receiver lists, method sets, framework labels, parser order, and default-method assumptions are hardcoded in this file. Runtime configuration: **NONE**. The returned contract is owned by the imported `RouteMetadata` type, while scanner integration is outside this module [ref](src/analyzer/route-parsers.ts).

The direct unit suite backs Flask, FastAPI, Express, Next.js App Router, and dispatcher behavior [ref](src/analyzer/route-parsers.test.ts:15) [ref](src/analyzer/route-parsers.test.ts:98) [ref](src/analyzer/route-parsers.test.ts:175) [ref](src/analyzer/route-parsers.test.ts:337) [ref](src/analyzer/route-parsers.test.ts:437). Direct unit cases for `parseNextJsPagesRoute`, `parseSvelteKitRoute`, `parseNuxtRoute`, and `parseRemixRoute`: **NONE found** in the repository test search.

## Public API / Contracts

Every parser returns `RouteMetadata | null`; none intentionally throws.

- `parseFlaskRoute` `(code, line)` parses Flask/blueprint decorators; `line` is accepted but not used in the return value [ref](src/analyzer/route-parsers.ts#parseFlaskRoute).
- `parseFastAPIRoute` `(code, line)` parses the five listed `@app` method decorators; `line` is unused [ref](src/analyzer/route-parsers.ts#parseFastAPIRoute).
- `parseExpressRoute` `(code, line, fileContent?)` parses literal Express-style calls after receiver validation; `line` is unused [ref](src/analyzer/route-parsers.ts#parseExpressRoute).
- `parseNextJsRoute` `(filePath, exports)` parses Next.js App Router route files [ref](src/analyzer/route-parsers.ts#parseNextJsRoute).
- `parseNextJsPagesRoute` `(filePath, fileContent)` parses Next.js Pages Router API files [ref](src/analyzer/route-parsers.ts#parseNextJsPagesRoute).
- `parseSvelteKitRoute` `(filePath, exports)` parses `+server` and `+page.server` files [ref](src/analyzer/route-parsers.ts#parseSvelteKitRoute).
- `parseNuxtRoute` `(filePath, fileContent)` parses Nuxt `server/api` files [ref](src/analyzer/route-parsers.ts#parseNuxtRoute).
- `parseRemixRoute` `(filePath, exports)` parses Remix `app/routes` files [ref](src/analyzer/route-parsers.ts#parseRemixRoute).
- `extractRouteMetadata` `(code, filePath, exports = [], line = 0, fileContent?)` dispatches in the fixed first-match order described above [ref](src/analyzer/route-parsers.ts#extractRouteMetadata).

## Dependencies

- `types/types.ts` supplies the `RouteMetadata` TypeScript contract [ref](src/analyzer/route-parsers.ts).
- External packages: **NONE**. Parsing uses JavaScript regular expressions and string/array operations only.

## Risks & Edge Cases

- File-based regexes require forward slashes. A raw Windows path containing backslashes will not match unless the caller normalizes it first [ref](src/analyzer/route-parsers.ts) [ref](src/analyzer/route-parsers.ts).
- The `line` parameters do not affect any result, so returned metadata cannot preserve the supplied source location through this API [ref](src/analyzer/route-parsers.ts#parseFlaskRoute) [ref](src/analyzer/route-parsers.ts#parseExpressRoute).
- Flask and FastAPI recognize narrow literal forms; alternate application names for FastAPI, additional HTTP verbs, variables, multiline calls, or reordered Flask keywords return `null` [ref](src/analyzer/route-parsers.ts) [ref](src/analyzer/route-parsers.ts).
- Express receiver acceptance is heuristic and list-based. A legitimate receiver outside the whitelist without an Express import or `Router` suffix is rejected, while any matching call in a file containing an Express import is accepted [ref](src/analyzer/route-parsers.ts) [ref](src/analyzer/route-parsers.ts).
- Next Pages and unsuffixed Nuxt handlers can be assigned all five methods when the code only establishes a generic handler; those methods are assumptions, not individually observed declarations [ref](src/analyzer/route-parsers.ts) [ref](src/analyzer/route-parsers.ts).
- Nuxt's content scan checks for method tokens anywhere in a file once `req.method` appears, so unrelated string literals can add methods [ref](src/analyzer/route-parsers.ts).
- Four file-based parser exports currently lack direct unit coverage, increasing the chance that convention changes drift unnoticed.

## Validation Checklist

- [x] Verified all nine function exports and their current signatures.
- [x] Traced the dispatcher order and first-match behavior.
- [x] Checked each framework's path and method derivation rules.
- [x] Confirmed the module has one type-only internal dependency and no package imports.
- [x] Reviewed the complete direct test inventory and recorded uncovered exports.
- [x] Marked the Remix transformation conclusion as inference.

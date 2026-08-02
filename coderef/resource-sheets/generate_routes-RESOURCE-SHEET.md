---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: generate_routes
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/generator/generateRoutes.ts
related_files:
  - src/generator/generateRoutes.ts
status: draft
---

## Executive Summary

`generateRoutes.ts` projects route and frontend-call metadata already attached to `ElementData` into two grouped, sorted JSON artifact families. It supports pure filter/format/sort/generate stages plus directory-creating save helpers [ref](src/generator/generateRoutes.ts).

## Audience and Intent

Pipeline, route-detector, frontend-call, and artifact maintainers should use this sheet when changing the element-backed producer. This module does not scan source itself and differs from `fileGeneration/saveFrontendCalls.ts`, which invokes the standalone frontend scanner and includes a flat call array.

## Architecture / Behavior

Route projection keeps name/file/line plus complete route metadata, groups buckets dynamically by the full framework union, removes empty groups, and sorts each group by route path. Frontend projection copies attached call facts into four predefined call-type buckets, removes empties, and sorts by path then file. Both stamp ISO metadata/version [ref](src/generator/generateRoutes.ts).

Generate functions compose filter → format → sort. Save helpers dynamically import filesystem/path, create parents, and write pretty JSON [ref](src/generator/generateRoutes.ts).

## Source of Truth

This module is authoritative for element-backed `routes.json` and grouped `frontend-calls.json` projections, sorting, and metadata. `ElementData`, `RouteMetadata`, and `FrontendCall` own source schemas. Runtime configuration is call arguments only; persistent state is the optional written artifact [ref](src/generator/generateRoutes.ts).

`generator/generateRoutes.test.ts` backs both families' filtering, grouping, metadata, sorting, empty/mixed cases, and end-to-end generation, including all current route frameworks [ref](src/generator/generateRoutes.test.ts).

## Public API / Contracts

- `RouteElement` is the element identity plus normalized route metadata [ref](src/generator/generateRoutes.ts#RouteElement).
- `RoutesOutput` contains total, dynamic framework groups, and metadata [ref](src/generator/generateRoutes.ts#RoutesOutput).
- `filterRouteElements` projects elements carrying route metadata [ref](src/generator/generateRoutes.ts#filterRouteElements).
- `formatRoutesJson` groups route elements and stamps metadata [ref](src/generator/generateRoutes.ts#formatRoutesJson).
- `sortRoutes` sorts each framework bucket by route path [ref](src/generator/generateRoutes.ts#sortRoutes).
- `generateRoutes` composes route filter/format/sort [ref](src/generator/generateRoutes.ts#generateRoutes).
- `saveRoutesToFile` generates and writes pretty JSON [ref](src/generator/generateRoutes.ts#saveRoutesToFile).
- `FrontendCallElement` is the element-attached persisted call shape [ref](src/generator/generateRoutes.ts#FrontendCallElement).
- `FrontendCallsOutput` contains total, call-type groups, and metadata [ref](src/generator/generateRoutes.ts#FrontendCallsOutput).
- `filterFrontendCallElements` projects elements carrying frontend-call metadata [ref](src/generator/generateRoutes.ts#filterFrontendCallElements).
- `formatFrontendCallsJson` groups calls into four known families and stamps metadata [ref](src/generator/generateRoutes.ts#formatFrontendCallsJson).
- `sortFrontendCalls` sorts groups by path then file [ref](src/generator/generateRoutes.ts#sortFrontendCalls).
- `generateFrontendCalls` composes frontend filter/format/sort [ref](src/generator/generateRoutes.ts#generateFrontendCalls).
- `saveFrontendCallsToFile` generates and writes pretty JSON [ref](src/generator/generateRoutes.ts#saveFrontendCallsToFile).

## Dependencies

- `types/types.ts` supplies elements and route/call metadata [ref](src/generator/generateRoutes.ts).
- Node `fs/promises` and `path` are dynamically loaded only by save helpers [ref](src/generator/generateRoutes.ts).

## Risks & Edge Cases

- `sortRoutes` and `sortFrontendCalls` call `.sort` on bucket arrays in the input object, mutating those nested arrays even though a new envelope is returned [ref](src/generator/generateRoutes.ts).
- Frontend grouping is closed to four types: an unknown runtime call type is counted in `totalCalls` but dropped from all buckets [ref](src/generator/generateRoutes.ts).
- Route grouping is open/dynamic, so malformed runtime framework strings become artifact keys despite the static union [ref](src/generator/generateRoutes.ts).
- Timestamps make pure-format outputs time-dependent [ref](src/generator/generateRoutes.ts).
- Save helpers are non-atomic [ref](src/generator/generateRoutes.ts).
- The two frontend artifact modules expose different envelopes (`byCallType` without flat list here versus `byType` plus `calls` in `saveFrontendCalls.ts`) [ref](src/generator/generateRoutes.ts).

## Validation Checklist

- [x] Verified all fourteen indexed exports and anchors.
- [x] Traced both filter/format/sort/generate/save families.
- [x] Reviewed the comprehensive direct suite.
- [x] Documented nested mutation and dual-format divergence.


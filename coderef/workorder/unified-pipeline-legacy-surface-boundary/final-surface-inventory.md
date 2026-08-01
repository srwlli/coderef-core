# Final surface inventory — WO-UNIFIED-PIPELINE-LEGACY-SURFACE-BOUNDARY-001 (P4-T5)

Status of every surface named in the plan after Phases 1–4.

## RETAINED (canonical)

| Surface | Disposition |
|---|---|
| `src/pipeline/generators/*` (13 generators run by populate) | **Sole production writers** of canonical `.coderef` paths |
| `PipelineContextGenerator` (`src/pipeline/generators/context-generator.ts`) | Canonical class; public alias **`ContextGenerator`** — the one intentional canonical export, identical through every entrypoint |
| `scanCurrentElements` (+ cache helpers, `Scanner`, `ScannerRegistry`, `isLineCommented`) | Retained first-class **lightweight scanning API**, exported identically from both barrels; writes nothing |
| `coderef-scan` CLI | Retained **explicit standalone diagnostic** (`--only=scan` in the pipeline; direct bin unchanged) |
| `src/artifacts/index-storage.ts` | Shared canonical index serializer, re-homed to the **neutral artifacts module** (old fileGeneration path is a re-export shim) |
| `src/generator/generateRoutes.ts` serializers | Shared route/frontend-call serializers (already neutral); consumed by RoutesGenerator + `scan-frontend-calls` bin |
| `saveFrontendCalls` + `scan-frontend-calls` bin | Retained supported standalone surface |
| `CodebaseContextService` (`src/context/context-generator.ts`) | Renamed legacy scanner-backed context **service** (returns strings, writes nothing canonical); reads canonical `graph.json` for dependency stats — classified retained-lightweight |
| Incremental `coderef-watch` path | Unchanged: `populate --changed-files` (single parse, graph-safe) |

## DEPRECATED / QUARANTINED (compatibility path)

| Surface | Disposition |
|---|---|
| `saveIndex`, `generateContext`, `buildDependencyGraph`, `detectPatterns`, `analyzeCoverage`, `validateReferences`, `detectDrift`, `generateDiagrams` | Quarantined behind **`@coderef/core/legacy`** (`src/legacy/file-generation.ts`); removed from both barrels; each guarded — refuses to write into a pipeline-owned `.coderef` (manifest.json marker) without `{force:true}` |
| Root barrel `index.ts` | Now a **pure re-export of `src/index.ts`** — kept for `main`/`types` (node10) compatibility; no divergent surface remains |
| `src/fileGeneration/index-storage.ts` | Compat re-export shim → `src/artifacts/index-storage.ts` |
| Legacy `DependencyGraph`/`GraphNode`/`GraphEdge` types | Type-only exports retained on the barrels for declaration compatibility |

## REMOVED

| Surface | Disposition |
|---|---|
| `src/scanner/file-watcher.ts` (`FileWatcher`) | **Retired** — zero importers anywhere; modern `coderef-watch` is chokidar-based and never used it. Tombstone in the phase-4 commit |
| `scan` leg from DEFAULT `coderef-pipeline` run | Removed (`DEFAULT_LEG_NAMES = populate,map,docs,rag`); still valid explicitly via `--only=scan` |
| `scan` leg from full `coderef-watch` flush | Removed (`populate,docs[,rag]`) — one canonical parse per flush |
| Ambiguous barrel exports of the 8 legacy writers | Removed from `index.ts` + `src/index.ts` |
| Divergent root-barrel `ContextGenerator` (scanner-backed) | Removed from the public name — the name now denotes the pipeline generator everywhere |

## Enforcement

All five boundary contracts (A overwrite-guard, B one ContextGenerator identity, C single-parse default, D neutral serializers, E quarantined writers) are enforced by
`__tests__/boundary/legacy-surface-boundary.contract.test.ts` + `__tests__/boundary/pipeline-orchestration.test.ts` — 22 tests, 0 expected-fail remaining.

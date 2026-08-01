# Phase 1 boundary inventory — WO-UNIFIED-PIPELINE-LEGACY-SURFACE-BOUNDARY-001

Generated: 2026-08-01 (P1-T1 + P1-T2). Classification of every surface named in the plan.

## 1. Entrypoint split (the collision, confirmed)

| Entry | Resolves to | ContextGenerator identity | fileGeneration writers exported? |
|---|---|---|---|
| `package.json` `main` = `dist/index.js`, `types` = `dist/index.d.ts` | ROOT barrel `index.ts` | **legacy** (`src/context/context-generator.ts`, scanner-backed, returns strings) | YES (9 writers) |
| `package.json` `exports["."]` = `dist/src/index.{js,d.ts}` | SRC barrel `src/index.ts` | **pipeline** (`src/pipeline/generators/context-generator.ts`, PipelineState-backed, writes files) — explicit named export at src/index.ts:302 shadows the `export * from './context/index.js'` at src/index.ts:10 | YES (9 writers + saveFrontendCalls) |

Node ≥16 exports-aware resolution and TS `moduleResolution: node16/bundler` get the SRC barrel; legacy `node10` resolution and the literal `main`/`types` fields get the ROOT barrel. **Same bare import, two different public APIs.** `src/pipeline/index.ts:22` is a third export site (pipeline ContextGenerator).

## 2. Canonical `.coderef` artifact paths — writer ownership matrix

| Canonical path | Pipeline writer (canonical) | Legacy writer (competing) | Clobber hazard |
|---|---|---|---|
| `index.json` (+ index.min/by-file variants) | IndexGenerator → **shared** `fileGeneration/index-storage.writeIndexVariants` | `saveIndex` | YES — legacy shape lacks pipeline enrichment |
| `graph.json` + `exports/graph.json` | GraphGenerator (+ manifest.json) | `buildDependencyGraph` | **CRITICAL** — legacy graph has no resolutionStatus edge schema; clobbers the canonical graph consumed by MCP/query |
| `context.json` / `context.md` | ContextGenerator (pipeline) | `generateContext` | YES |
| `routes.json` | RoutesGenerator → **shared** `generator/generateRoutes` serializers | `saveIndex` → `saveRoutesToFile` | YES (side-write from saveIndex) |
| `frontend-calls.json` | RoutesGenerator | `saveFrontendCalls` (also the `scan-frontend-calls` bin) | partial — bin is a supported standalone surface |
| `reports/patterns.json` | PatternGenerator | `detectPatterns` | YES |
| `reports/coverage.json` | CoverageGenerator | `analyzeCoverage` | YES |
| `reports/validation.json` | ValidationGenerator | `validateReferences` | YES |
| `reports/drift.json` | DriftGenerator → shared `index-storage.loadIndexFromCoderefDir` (read) | `detectDrift` | YES |
| `diagrams/*.mmd|.dot` | DiagramGenerator | `generateDiagrams` | YES |

## 3. Surface classification (plan vocabulary)

**Canonical writers (keep, sole owners):** all 13 `src/pipeline/generators/*` run by `populate.ts` (index, graph, registry, complexity, patterns, coverage, drift, validation, diagrams, exports, context, routes, health).

**Retained lightweight API (keep, explicitly NOT a canonical writer):** `scanCurrentElements` (+ clearScanCache, getScanCacheStats, LANGUAGE_PATTERNS, DEFAULT_EXCLUDE_PATTERNS) from `src/scanner/scanner.ts`. Writes nothing. Production callers: `src/cli/scan.ts` (diagnostic bin, prints stats only — writes NOTHING), `src/context/context-generator.ts` (legacy context service), `src/scanner/file-watcher.ts` (orphan), `scanner-worker.ts`, tests, examples.

**Shared serializers (keep, re-home behind neutral boundary — P2-T2):**
- `src/fileGeneration/index-storage.ts` — used by IndexGenerator (write) + DriftGenerator (read). NOT a competing writer; it IS the canonical index serializer that happens to live in the legacy directory.
- `src/generator/generateRoutes.ts` — route/frontend-call serializers used by RoutesGenerator.

**Competing legacy writers (quarantine/deprecate — P2-T1):** `saveIndex`, `generateContext`, `buildDependencyGraph`, `detectPatterns`, `analyzeCoverage`, `validateReferences`, `detectDrift`, `generateDiagrams` — zero production callers inside src/ (only barrel exports + their own tests + `examples/`). `saveFrontendCalls` is special: production caller is the shipped `scan-frontend-calls` bin → keep the bin path, quarantine the root-barrel ambiguity.

**Compatibility shims:** root `index.ts` barrel itself (semver: it is the published `main`).

**Retirement candidate:** `src/scanner/file-watcher.ts` `FileWatcher` — ZERO importers anywhere (modern `coderef-watch` uses chokidar directly + spawns pipeline legs). Not exported by either barrel.

## 4. Redundant scan leg (P4-T1 target)

`coderef-pipeline` leg order: `scan → populate → map → docs → rag` (LEG_NAMES, coderef-pipeline.ts:55). The `scan` leg spawns `coderef-scan`, which parses the whole project and **writes no artifact** (scan.ts prints stats and discards elements). `populate` then re-parses everything through PipelineOrchestrator. Full `coderef-watch` flush runs legs `scan,populate,docs[,rag]` (coderef-watch.ts:296) — same double parse. Incremental watch path calls `populate --changed-files` directly (no scan leg) and is already correct.

## 5. Both ContextGenerators

- Legacy `src/context/context-generator.ts` — service API: `generate(sourceDir, options) → {markdown, json, stats}` strings; scans via scanCurrentElements; reads canonical graph.json for dependency stats. Exported via `src/context/index.ts` → root barrel (+ star-export into src barrel where it loses to the explicit pipeline export).
- Pipeline `src/pipeline/generators/context-generator.ts` — artifact generator: `generate(state: PipelineState, outputDir) → void`; writes `context.json`/`context.md`/complexity summary. Exported at src/index.ts:302 + src/pipeline/index.ts:22.

Same name, incompatible contracts, split across entrypoints → P3-T1 renames with explicit compatibility aliases.

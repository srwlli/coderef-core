# Changelog

All notable changes to CodeRef Core will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2026-08-01] — cross-repo workspace linkage: opt-in `.coderef/workspace.json` + `impact_of workspace:true` (STUB-6PGFZ3, genre-features P12)

WO-CROSS-REPO-WORKSPACE-LINKAGE-001 — external edges to sibling workspace repos stop being dead ends.

- **`pipeline/workspace-registry.ts` (new)**: repo-local, OPT-IN `.coderef/workspace.json` (`{version, packages:{"<pkg>":"<root>"}}`; relative roots resolve against the registry file's directory). Absent file = byte-identical pipeline output (no-regress proven by frozen-tree A/B: pre/post-feature dists produce identical node/edge/resolved id sha256 with no registry). Malformed = one WARN + empty. Loads in resolveImports pass 1 beside `loadExternalSet` — pass-2 purity preserved (the P12 deferral blocker).
- **`import-resolver.ts`**: workspace-mapped bare specifiers keep `kind:'external'` and gain `workspacePackage`/`workspaceRoot`; an unresolved bare specifier whose package is registry-mapped (sibling not npm-installed) upgrades to `external` with `reason:'workspace_package'`. NO new ImportResolutionKind, NO new edge kind — the dual adjacency indexes learn nothing new. Builtin/stdlib dispositions never touched.
- **`graph-builder.ts`**: `external-import` evidence carries the two optional workspace fields.
- **`query/workspace-stitch.ts` (new)**: query-time cross-repo projection — per sibling: outbound (my tagged edges into it) + inbound (its tagged edges resolving back to my root). Package-grain (v1), disclosed skips (absent sibling graph is never "no dependents"), nothing persisted (same persisted-fact vs projection split as the GX-005 governed_by/violates ruling).
- **Surfaces (CLI+MCP mirrored, zero forked logic)**: MCP `impact_of` gains `workspace: true`; `coderef-query` gains `--workspace` on the relationship walks. Both append a `workspace` block.
- Contract: `__tests__/pipeline/workspace-linkage.contract.test.ts` (7 tests: no-registry identity, upgrade+tags, out-of-workspace untouched, malformed degrade, builtin guard, edge evidence, bidirectional stitch on a synthesized sibling pair).

---

## [2026-08-01] — incremental path-keying fix: `--changed-files` parity is now provable (edge-resolution P4)

WO-EDGE-RESOLUTION-IMPROVEMENT-PROGRAM-001 Phase 4 (STUB-QPAAY0, final phase) — fixes the absolute-vs-relative fact-set keying defect that made `populate --changed-files` fail closed (GX-002 FU-4, `STUB-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001` class).

- **`symbol-table-cache.ts`**: new `canonicalFactKey` (project-relative, forward-slash, cwd-independent file identity) and `dedupeFactSet` (collapses stores a pre-fix failed run poisoned with the same file under two key forms — self-heals on next load).
- **`orchestrator.ts` `runIncremental`**: every incoming changed/deleted path is translated to the persisted store's OWN key form (`storeKeyFor`), so `mergeChangedFacts` REPLACES the changed file's bundle instead of adding it under a second key (which duplicated every element → `node_id_uniqueness` → exit 1, graph unwritten — and re-persisted the corrupt merge). Rescans are labeled with the exact path form the originating full build used, so rescanned fact internals match the cached universe byte-for-byte; out-of-project paths keep their absolute form. Design note: globally absolutizing `projectPath` was rejected — it would churn every path-bearing id in existing artifacts.
- **Effect**: zero resolution-semantics change. **E2E parity now proven on this repo**: full rebuild vs `--changed-files` incremental over the same tree → identical scalars and identical edge-id sha256 hashes. The live pre-fix repro (exit 1, duplicate ids) now exits 0 and self-heals the poisoned store on first contact. Repo-agnostic: the store's key form follows whatever projectDir form the originating populate used.
- Contract: `__tests__/pipeline/incremental-path-keying.contract.test.ts` (8 tests, authored red-first — 4 failed pre-fix).

---

## [2026-08-01] — heritage-aware method lookup (edge-resolution P3)

WO-EDGE-RESOLUTION-IMPROVEMENT-PROGRAM-001 Phase 3 (STUB-9B66EN) — retires the 2026-05-03 guardrail-3 "no parent-class walking" restriction using the heritage facts extracted since genre-features P5.

- **`heritage-index.ts`** (new): subtype→supertypes index over `state.heritage` + cycle-safe, depth-capped, nearest-level-wins BFS method lookup across the declared `extends`/`implements` chain.
- **`call-resolver.ts`**: branch 1 — inherited `this.x()` resolves EXACT via the chain (was `this_method_not_in_class`); branch 2 — `super.x()` resolves to the parent's method (was hard-unresolved; heritage-present misses are honestly `super_method_not_in_heritage`, no-heritage keeps `super_call_out_of_scope`); branch 3 — scope-bound receivers (`new`/annotation/param) resolve inherited methods EXACT with reason=`heritage_method_lookup` before the bare-name ACG fall-through. Own methods still shadow inherited; multi-file ancestor-name collisions stay ambiguous; external/unextracted supertypes change nothing (no fabricated targets).
- **Self-scan effect: ZERO flips — proven by controlled A/B** (populate with the index neutralized vs live: resolved sets byte-identical). Honest and expected: the live heritage estate here is 22 edges and the 45 residual own-methods misses all have unextractable ancestors. The value is repo-agnostic (class-heavy estates) and precision (type-proven EXACT vs ACG provisional), pinned by the 9-test contract envelope.
- Contract: `__tests__/pipeline/heritage-method-lookup.contract.test.ts` (9 tests, authored before the implementation).

---

## [2026-08-01] — external/builtin receiver disposition completion (edge-resolution P2)

WO-EDGE-RESOLUTION-IMPROVEMENT-PROGRAM-001 Phase 2 (data-backed pivot from the FU-2 field-path-walking hypothesis, recorded at the P2 planning gate).

- **`call-resolver.ts`**: member calls on receivers bound to EXTERNAL package imports (namespace/default/named local bindings, dotted roots like `ts.factory`, and single-layer cast/paren wrappers like `(ts as any)`) now classify `external` with `reason='external_module_receiver'` (new branch 3.7; node-builtin/python-stdlib bindings keep their canonical `builtin` disposition). Pure dotted receivers whose ROOT is allowlisted (`process.stderr.write()`) classify `builtin` with `reason='builtin_root_receiver'` (branch 1b).
- **Self-scan effect**: 415 disposition flips (394 external + 21 builtin-root); `unresolved_count` 1,871 → **1,673**; `unresolved_src_count` 959 → **782**; `resolved_of_resolvable` 73.38% → **74.62%**. Zero resolved edges carry a P2 reason (dispositions only, no fabricated project edges); `ambiguous` counts byte-exact invariant. ~154 flips moved from `test_dsl_matcher_receiver` to `external_module_receiver` (test files that import `vi`/`expect` from the external 'vitest' package) — same denominator effect, cleaner provenance.
- Contract: `__tests__/pipeline/external-receiver-disposition.contract.test.ts` (8 tests, authored before the implementation).

---

## [2026-08-01] — test_dsl reclassify: the resolution denominator is now honest

WO-EDGE-RESOLUTION-IMPROVEMENT-PROGRAM-001 Phase 1 (operator-delegated ruling A, 2026-08-01 — the P3c `js_prototype_member` shape extended to test-framework DSLs, both sides).

- **`call-resolver.ts`**: test-framework DSL calls in test-origin files that would otherwise classify `unresolved` now classify `builtin` — ambient callees (`describe`/`it`/`expect`/`beforeEach`/... — vitest + jest vocabularies) with `reason='test_dsl_ambient_callee'`, and `expect()`-rooted matcher receivers (plus the ambient `vi`/`jest`/`expect` objects) with `reason='test_dsl_matcher_receiver'`. Project symbols always win (only would-be-unresolved results flip); ambiguous results never flip; plain dotted receivers (the FU-2 frontier) are untouched; production files are guarded by the test-origin path check. Classification-only: edge ids are status-invariant (`computeEdgeId` excludes `resolutionStatus`).
- **`output-validator.ts`**: new `test_dsl_count` report scalar (sub-count of `builtin_count`) discloses the reclassified population — the denominator shrink is auditable, never silent.
- **Self-scan effect**: `unresolved_count` 18,527 → **1,871**; `resolved_of_resolvable` 32.83% → **73.38%**; `test_dsl_count` 16,717 (9,974 ambient + 6,743 matcher); `unresolved_src_count` 959 → 959 (EXACT — zero production edges touched); `ambiguous_count` 1,730 → 1,730 (EXACT). `resolution_rate` (22.42%) is unchanged by construction — its denominator is all emitted calls including builtin. Not one edge was newly resolved: this makes the measurement honest; the recall work is Phases 2–4 (dotted-chain receivers, heritage-aware lookup, incremental keying).
- **`rename_apply`/`rename_preview` disclosure updated**: `resolution_disclosure` now carries `test_dsl_count` and drops the "pending ruling" confound note.
- Contract: `__tests__/pipeline/test-dsl-reclassify.contract.test.ts` (7 tests, authored before the implementation).

---

## [2026-08-01] — rename_apply: the first scoped source-write MCP tool (MCP 37 → 38 tools)

WO-GX-003-MIRRORED-RENAME-APPLY-SCOPED-SOURCE-WRITE-001 (core-improvements-731 program, GX-003). **Scoped supersession of the "no MCP tool writes source files" rule** (operator ruling 2026-08-01), confined to exactly one tool:

- **New MCP tool `rename_apply`** — a thin mirror of the `coderef-rename` CLI delegating to the SAME `planRename`/`applyRename` modules (zero forked rewrite logic). Safety envelope, pinned by `__tests__/mcp/rename-apply.contract.test.ts` (11 contract tests): `apply:false` default is a pure preview (byte-identical plan to `rename_preview`, zero filesystem writes); `apply:true` performs atomic per-file writes (`writeTextAtomic`) and returns per-file rewrite counts + `applied_files`; shadow-ambiguous lines are NEVER rewritten over MCP and are listed in `files[].ambiguous` — the schema exposes no force parameter (`--force-ambiguous` stays CLI-only); `project_root` required (repo-agnostic contract).
- **Stratified blind-spot disclosure** (discovery-resolution-core-issue.md REC-R2): every `rename_apply` response carries `resolution_disclosure` reporting `unresolved_src_count` (948 at discovery) and `resolved_of_resolvable` (32.8%) ALONGSIDE the raw totals (22.41% / 18,249) — ~95% of raw unresolved edges are test-DSL calls (vitest ambient globals + matcher chains), a denominator artifact pending the `test_dsl` reclassify ruling; the raw headline alone overstates the production blind spot ~19×.
- Contract surfaces updated: `SERVER_INSTRUCTIONS` rule 6, server header, docs/CLI.md, README.md, USING-CODEREF.md write-scope rule, entry-point standards docs. `rename_preview` remains read-only; every other tool still writes no source.

WO-API-SURFACE-MAPPING-RECONNECT-AND-GRAPH-ELEVATION-001 (4-phase rolling). The route-detection subsystem — 7 framework detectors, AST-level frontend-call parsing, route matching, 404/405 validation — had existed and been integration-tested since WO-API-ROUTE-DETECTION-001 but had **no live producer**: its only caller (`saveIndex`/`scanCodebase`) lost its production call site when `PipelineOrchestrator` replaced the legacy scan. `.coderef/routes.json` went stale in March 2026, `.coderef/frontend-calls.json` stopped being written at all, and `validate-routes` exited 2.

### Added
- **P1 — Producer reconnected** (`278e0bf`): `populate-coderef --mode full` now emits `.coderef/routes.json` and `.coderef/frontend-calls.json` on its existing single pass. New `RouteExtractor` (pipeline projection over content already read — no second file walk) and `RoutesGenerator` (invokes the tested `saveRoutesToFile`/`saveFrontendCallsToFile` verbatim). API-surface facts land on dedicated `PipelineState` fields, NOT on `state.elements`, so index counts and every coverage/complexity denominator are untouched.
- **P2 — Endpoints as first-class graph nodes** (`cf3d920`): an HTTP endpoint is now a graph NODE (`@Endpoint/<path>#<METHOD>`) joined by two new relationships — `calls_endpoint` (client file → endpoint) and `serves_endpoint` (endpoint → handler file) — so `what_calls`, `impact_of` and `path_between` cross the network boundary. **Identity is derived from standards, not preference:** OpenAPI 3.1's Paths Object rule that templated paths differing only in parameter NAME are identical (so names are erased to a bare `{}`, letting a client's hardcoded `{id}` placeholder bind to a Flask `<int:user_id>` handler — under a name-bearing grammar the cross-boundary edge could never form); RFC 9110's separation of method from target (so `GET` and `POST` on one path are two nodes, and 405 stays distinguishable from 404); RFC 3986 §6.2.2 path normalization (case PRESERVED per §6.2.2.1). A catch-all stays `{*}`, distinct from `{}`. An endpoint is a NODE rather than edge metadata specifically so an **orphaned endpoint is representable** — a node with a `serves_endpoint` out-edge and zero `calls_endpoint` in-edges; an edge-only model would leave an uncalled endpoint with no trace at all.
- **P3 — Map projection + MCP tool**: MapData `schemaVersion` 1.6.0 → **1.7.0**, adding the additive `api` block (endpoints, handlers, callers, `networkEdges`, `unmatchedCalls`). New MCP tool **`api_surface`** (36 → 37 tools). `unresolved_edges` gains `relationship: calls_endpoint | serves_endpoint`, so a client call that bound to no endpoint is enumerable — the server's own usage contract tells agents to check that tool before trusting a negative.

### Fixed
Exercising the subsystem end-to-end for the first time surfaced defects that were invisible while it had no caller:
- `frameworkRegistry` ships EMPTY and is populated by `register-frameworks`; the pipeline had no transitive importer, so `detectAll()` returned `[]` — a **false empty** reported as "no routes".
- File-based detectors match literal POSIX path segments (`'/app/api/'`, `'/routes/'`) but received native paths, so **Next.js and Remix could never fire on Windows**.
- `RoutesOutput.byFramework` was typed to 4 of the 7 supported frameworks, so a SvelteKit route was counted in `totalRoutes` then dropped — the artifact contradicted its own header.
- Content-regex detectors matched route literals **inside comments**, so this repo reported 7 phantom endpoints sourced from JSDoc in the detectors' own files.
- `normalizeRoutePath` dispatched only flask/fastapi/express/nextjs; **sveltekit, nuxt and remix fell through a `default:` arm that returned the path UNCHANGED**, so three of seven dialects never became `{param}` and could never match a client call. Adds `normalizeSvelteKitRoute` / `normalizeNuxtRoute` / `normalizeRemixRoute`.
- File-grain graph nodes were deduped on the raw path STRING while `state.elements` carries native paths and route facts carry POSIX ones — both collapse to one `@File/` id, so the node was emitted twice (GI-1). Uniqueness is now enforced on the node ID.
- 3 raw NUL bytes in `graph-builder.ts` / `project-map-data.ts` where `\u0000` escapes were intended (behaviour-identical, but the files read as binary to grep).

- **P4 — Bin rename with aliases, docs truth-up.** `validate-routes` → **`coderef-validate-routes`** and `scan-frontend-calls` → **`coderef-scan-frontend-calls`**. Both old names remain in the bin map for one minor version, pointing at the same dist entry, and print a deprecation notice on stderr (never stdout — these bins can be asked for machine-readable output). `populate-coderef` is deliberately NOT renamed: it is the most-invoked bin in the fleet and its rename is a separate blast radius (DR-007).

### Fixed — documentation that described a CLI surface that never existed
- **Every documented invocation of both bins failed.** `docs/CLI.md` documented `--dir`, `--pattern`, `--group-by`, `--strict`, `--fix`, `--include` and `--exclude` on bins whose parsers accept none of them — and `validate-routes` exits 1 on ANY unknown flag, so all ~10 example commands were broken. Both sections are rewritten against the real parsers (`-p/--project-dir`, `-f/--frontend-calls`, `-s/--server-routes`, `-c/--fail-on-critical`, `-o/--output`, `-e/--extensions`) and every corrected example was executed to confirm its exit code.
- **The four dedicated route documents** (`docs/ROUTE.md`, `ROUTE-DETECTION.md`, `ROUTE-VALIDATION.md`, `FRONTEND-CALL-DETECTION.md`) each carry a status banner and corrections: the producer is `populate-coderef --mode full`, not the dead `scanCurrentElements`/`saveIndex` path; **seven** frameworks are supported, not four; and `npx coderef scan` — used seven times in `ROUTE-VALIDATION.md`, along with invented `--frontend-only` / `--verbose` / `--exclude` flags — is not a command that exists.
- `docs/MIGRATION.md` documented `--detect-migrations` and `--migration-report`, neither of which is parsed.
- README no longer claims `saveIndex()` produces `routes.json`; that path has had no production caller since `PipelineOrchestrator` replaced the legacy scan.

### Assessed and deliberately unchanged (P4-T1c)
Whether to reconcile the two bins' flag surface with fleet convention. **Verdict: no change**, because both premises for changing it are false when measured:
- **No CLI in this package accepts `--project-root`.** `project_root` is the MCP *tool argument* name; the CLI fleet splits between `--project-dir` (7 bins) and `--project` (10 bins). These two bins already sit in the larger `--project-dir` cohort, so "aligning" them would move them AWAY from convention.
- **`--json` exists on 2 of 19 bins** (`coderef-watch`, `populate-coderef`), so it is not a fleet standard either.

The real gap the question points at — no machine-readable output for an agent-readable subsystem — is closed by P3 in a richer form than a `--json` flag would provide: the `api_surface` MCP tool and the `api` block of `.coderef/map/data.json` return endpoints, handlers, callers, network edges and unmatched-call reasons as structured data. Adding `--json` here would duplicate that behind a second contract.

### Known limitations (documented, not silently absorbed)
- **Server-to-server HTTP calls are invisible.** Frontend-call detection gates on browser-reachable file extensions (`isFrontendFile`), so a backend module fetching another service's endpoint is never recorded. This bounds what any cross-boundary `impact_of` walk can honestly claim: `orphaned` means NO RESOLVED CALLER WAS FOUND IN THIS REPO, never that none exists (RISK-008).
- **Detectors report at most one route per file per framework.** `detectAll()` returns the FIRST route definition each detector finds, so a single Express file declaring thirty routes yields one endpoint. The endpoint inventory is a lower bound on the real surface.
- **Absence is no-data.** With `.coderef/routes.json` absent, the map's `api` block and the `api_surface` tool report `no_data` — never "0 endpoints".

---

## [2026-07-31] — MCP-server decomposition + structural integrity: SCIP live overlay, dependency-rules dogfood, headers @100%, cycles 2 → 0

WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 (7-phase rolling; commits `50ac709`, `f8b4bb0`, `50e5b36`, `237952d`, `dc00fda`, `986a863`, `88fd3df`). Suite at close: 2271 passed / 26 skipped / 0 failed; both tsconfigs build clean; arch gate 7/7 exit 0.

### Changed
- **P1 — Decomposition** (`50ac709`): `src/cli/coderef-mcp-server.ts` 3,998 → 1,087 lines; per-family handler modules under `src/cli/mcp/` (`context-tools`, `graph-tools`, `lookup-tools`, `map-tools`, `rag-tools`, `verify-tools`, `shared`). All 36 `registerTool` blocks — names, input schemas, behavior — byte-compatible.
- **P7 — Small structural cleanups** (`88fd3df`): js-call-detector SCC broken structurally (analyzer↔index cycle gone); type-position `import()` annotations no longer emit runtime CALL facts (10 spurious SCIP-flipped resolved edges removed); layer-drift excludes `test_support` from dominance votes (drift schemaVersion 1.0.0 → 1.1.0); noregress test output redirected to a temp dir (suite-scale clobber hazard killed, byte-identity machine-proven); `utils/fs.ts` family + `demo-all-modules.ts` deleted. **Census after-proof: dependency cycles 2 → 0 (repo is cycle-free); headers 358/358 files @ 100.00%; resolution 23.42 → 23.39 (the removed edges were fake-resolved — a rate-honesty improvement).**

### Added
- **P2 — SCIP live resolution overlay** (`f8b4bb0`): opt-in `populate-coderef --scip <path-to-.scip>` post-resolution overlay flips co-located unresolved/ambiguous **call** edges to `resolved` with SCIP provenance (`evidence.kind:'scip'`, confidence tier `heuristic`). No-regress by construction: already-resolved edges untouched, no edges invented, no `.scip` = zero change.
- **P3 — Dependency-rules dogfood** (`50e5b36`): the repo commits its own `.coderef/rules.json` (7 forbid rules) and gates CI via `npm run arch:gate`.
- **P4 — Subprocess-aware test linkage** (`237952d`): CLI subprocess tests (spawned bins) now produce visible test→src edges instead of vanishing from `tests_for_change`/testLinkage.
- **P5 — `.coderefignore` scan scope** (`dc00fda`): self-scan noise excluded at the ignore layer + a dogfood suite pinning the patterns.
- **P6 — Semantic headers** (`986a863`): header coverage driven to 358/358 files @ 100.00% on the scan universe.
- **P7 — Provider offline tests** (`88fd3df`): 9 no-network tests pin the provider contract — `createLLMProvider` constructs OLLAMA by default even with cloud keys present in env; explicit cloud opt-ins fail loudly. `@anthropic-ai/sdk` is NOT a dependency (AnthropicProvider is quarantined by absence; an ambient type stub satisfies tsc).

## [2026-07-30] — Clone surface extension: true near-miss detection, AST-accurate complexity, LSP 3.17 type hierarchy

WO-EXTEND-THE-CLONE-SURFACE-P10-SRC-QUERY-CLONES-001 (3 phases; commits `ea982d7`, `13b1bb3`, `1cc426c`). Suite at close: 2191 passed / 26 skipped.

### Added
- **P1 — Near-miss clone passes** (`ea982d7`): `clones` gains three passes (`pass`: `structural` | `lexical` | `near_miss`). Lexical groups elements with IDENTICAL persisted `normalizedBodyHash` (byte-level copy-paste, same-body-different-name); near_miss (opt-in, Deckard-style) pairs elements whose persisted `astFingerprint` vectors meet `similarity_threshold` (default 0.9, normalized-L1). CLI mirrors: `--pass`, `--similarity-threshold`, `--min-body-length`.
- **P2 — AST-accurate metrics** (`13b1bb3`): the scanner fills `ElementData.complexity` from real AST metrics, giving the clone/complexity surfaces a persisted substrate.
- **P3 — LSP 3.17 type hierarchy** (`1cc426c`): `type_hierarchy` gains `item_format:"lsp"` (CLI `--lsp`) — an additive LSP 3.17 `TypeHierarchyItem` projection (numeric SymbolKind, `file://` uri, 0-based ranges), degrading to a disclosed single-line range on older indexes.

## [2026-07-20] — Leverage wiring: one-call orientation + pre-commit dossier (MCP 34 → 36 tools)

WO-CODE-INTELLIGENCE-LEVERAGE-WIRING-PROGRAM-001 core legs (commits `a0eff4e`, `7602eab`, `16154db`; the program's other phases were fleet-side skill/playbook sync).

### Added
- **`orient`** (`7602eab`): one-call first-turn orientation — ONE token-budgeted envelope composing the skeleton map, `codebase_summary` toplines, validation trust numbers, both staleness axes, and top-10 hotspots. `rag_search` gains an in-band `vector_staleness` WARN when vectors lag the index.
- **`change_dossier`** (`16154db`): the pre-commit pre-flight in one call — `diff_impact` + `tests_for_change` + `api_diff` (delta mode) + `dependency_rules`, composed with per-leg no-data honesty. `tests_for_change` now emits a ready-to-run `run_command` when a runner is detectable.
- **Server self-declaration** (`a0eff4e`): the MCP `initialize` instructions string declares the repo-agnostic contract and write scope.

## [2026-07-19] — Genre features program: verify + lookup tool families (MCP 26 → 34 tools)

WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 (11 shipped phases; core commits `1e02d22`, `76bbff9`, `2062ca3`+`d41a6b0`, `e1c2ada`, `8cc63d1`+`92ae446`, `1dbb781`, `843476e`+`5c5acc2`, `d87308e`, `185c2ca`). Eight new MCP tools, each with a `coderef-analyze --type` CLI mirror; all surfaces-not-verdicts with explicit no-data:

### Added
- `tests_for_change` — diff-to-test-selection ranked by directness (P1, `1e02d22`)
- Ownership/knowledge map block on the map surface (P2, `76bbff9`)
- `ast_search` — tree-sitter S-expression structural search (P3, `2062ca3` + lang-enum remediation `d41a6b0`)
- `type_hierarchy` — supertypes/subtypes over newly-populated `extends`/`implements` heritage edges (P5, `e1c2ada`)
- `api_diff` — exported-API-surface diff over a snapshot baseline (P6, `8cc63d1` + `92ae446`)
- `dependency_rules` — declared-architecture constraint gate over `.coderef/rules.json` (P7, `1dbb781`)
- `docstrings` — per-element docstring surface with per-language capture disclosure (P8, `843476e` + `5c5acc2`)
- `clones` — signature-clone surface (P10, `d87308e`)
- `scip_resolution_delta` — SCIP-vs-CodeRef resolution delta, scope-A read-only (P11, `185c2ca`)

P12 (cross-repo) deferred — carried as STUB-6PGFZ3.

## [2026-07-18] — populate `--source-headers` path scope

WO-ADD-A-PATH-SCOPE-ALLOWLIST-DENYLIST-TO-POPULATE-001 (commits `eefd44e`, docs `2e5796a`): `populate-coderef --source-headers` gains `--include` / `--exclude` glob path-scope (minimatch, filter at the WRITE loop) so header stamping can target or spare subtrees.

## [2026-07-17] — Agentic Coding Intelligence Program: 11-phase agent-orientation, retrieval, and trust upgrade (MCP 24 → 26 tools; MapData 1.4.0 → 1.5.0)

WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 (11-phase rolling program; commits `3a38d58`, `83183a3`, `d872add`, `ccaf089`, `7dde915`, `997656a`, `2ca67ec`, `2c05405`, `25e5930`, `4b211be`, `b1b9ba2`). Each phase maps a validated best-in-class system (Aider repo-map, CodeScene, SCIP/Glean, RepoGraph, Cursor Merkle sync, Anthropic tool-design, Serena, Sourcegraph Cody, Feldthaus ACG) onto a concrete coderef-core gap. Every block is **surfaces, not verdicts** and additive (omitting a new flag preserves prior behavior byte-for-byte). Suite at close: 1931 passed / 26 skipped (190 files); zero regressions.

### Added
- **Phase 1 — Skeleton map output mode** (`3a38d58`): `map` accepts `format:"skeleton"` (+ optional `token_budget`, default 1600) and returns a token-budgeted, centrality-ranked plaintext repo map **inline** as `skeleton_text` — the cheapest first call for repo orientation, from ranking/signatures coderef already computed.
- **Phase 2 — Git behavioral substrate** (`83183a3`, `src/map/git-behavioral.ts`, MapData → 1.5.0): churn×complexity hotspots + change-coupling drift (co-change vs static edges) from git history — the strongest validated defect signal, previously absent. No-data when git history is unavailable (the `git` block is omitted rather than fabricated).
- **Phase 3 — Edge confidence tiers** (`d872add`): every graph edge carries an `exact` > `strong` > `heuristic` > `inferred` tier projected from resolution provenance; `what_calls`/`impact_of`/`rename_preview` accept a `min_confidence` floor. Provenance, not a quality verdict.
- **Phase 4 — Ego-graph retrieval** (`ccaf089`): `rag_search --expand` and `pack_context --include_callers` attach each hit's 1-hop graph neighborhood (callers/callees/imports/importedBy, as signatures) inline — collapsing the 4–6 follow-up calls an agent otherwise spends per hit.
- **Phase 5 — RAG indexing throughput fix** (`7dde915`): batched Ollama `/api/embed`, a `[1,16]` embed worker-pool (`concurrency`), and a chunk-hash embedding cache (`embed_cache`, `.coderef-embed-cache.json`) serving byte-identical chunks instead of re-embedding. Attacks the `maxConcurrency:1` per-chunk pipeline defect; output vectors + order unchanged.
- **Phase 6 — `response_format` + pagination** (`997656a`): every list-returning MCP tool accepts `response_format` (`concise`|`detailed`, default `detailed`) and `offset`. `concise` reduces each item to identity fields (all envelope counts preserved) for roughly a one-third token cut; `offset` paginates past the `limit` cap with a true pre-page `total` (no silent truncation).
- **Phase 7 — `symbol_context` consolidated tool** (`2ca67ec`, MCP tool #25): one card per symbol — identity + header presence + 1-hop neighborhood + references + test-linkage + mtime-staleness — the understand-before-edit workflow that otherwise costs ~5 round-trips. A JOIN over existing data, deterministic, additive.
- **Phase 8 — Staleness contract** (`2c05405`): `populate`/`reindex` write `.coderef/manifest.json` (one sha256 per source file); every read response carries an additive `staleness` block (`basis:"scan-time-hash-manifest"`, mtime/size fast-path) so an agent can tell whether the graph predates its own last edit. A merely-touched but byte-identical file is correctly not stale.
- **Phase 9 — Lexical-first search router** (`25e5930`): symbol-table + BM25 answers symbol-shaped queries deterministically on any repo with zero Ollama dependency; embeddings are reserved for conceptual queries.
- **Phase 10 — Field-based (ACG) resolution** (`4b211be`, `reason=field_based_acg`): an `obj.foo()` call on an unknown receiver now consults a project-wide field/property-definition index (Feldthaus Approximate Call Graph). One same-language definition ⇒ a `heuristic` resolved edge; ≥2 ⇒ an `inferred` ambiguous edge with the full candidate set. Never `exact`; `--min-confidence strong` filters the whole ACG population back out (the recall/precision dial). Targets the measured 64% `receiver_not_in_symbol_table` precision hole.
- **Phase 11 — `map_metrics_delta` verified-refactor tool** (`b1b9ba2`, MCP tool #26, `src/map/metrics-delta.ts`): `snapshot:true` saves the five map metric families; the diff (`before`/`after`) proves the target family improved without regressing others as a **decomposed per-family factor vector, never a composite score** — the missing re-measure half of the CodeScene fix loop. Direction labels are provenance, not verdicts; schema-mismatch/absent-family degrade to a declared no-data envelope, not a throw.

### Changed
- MCP surface **24 → 26 tools** (`symbol_context`, `map_metrics_delta`); `MapData.meta.schemaVersion` **1.4.0 → 1.5.0** (git-behavioral substrate). Docs: `docs/CLI.md` (tool table + Metrics-delta/Symbol-context/Confidence-tier/Ego-graph/Staleness sections), `docs/AGENT-CONTRACT.md` (verified-refactor loop contract + tool count).

---

## [2026-07-17] — Map V2: graph analytics, edge evidence, layer drift, engineering metrics (MapData 1.1.0 → 1.4.0)

WO-MAP-GRAPH-ANALYTICS-MODULE-001 (4-phase rolling program; commits `d8bfd5f`, `b287a63`, `4ac23db`, `ae1db32`). Each block is schema-additive and framed as **surfaces, not verdicts**; the viewer degrades gracefully on older `data.json`. Suite at close: 1701 passed / 0 failed (177 files).

### Added
- **`src/map/graph-analytics.ts` (`MapData.analytics`, v1.1.0 → 1.2.0 era P1)**: label-propagation communities + per-file assignments, degree + Brandes betweenness centrality (exact ≤500 files, stride-sampled above), articulation-point bridges, Ce/Ca coupling, dead-code candidates (isolated + zero-in-degree, entrypoint/test-aware). Viewer: communities + dead-code overlay toggles. MCP `map` summary: `community_count`, `isolated_count`.
- **`src/map/edge-evidence.ts` (`MapEdge.evidence`, v1.2.0)**: per-edge provenance (explicit/inferred/unspecified) classified from raw graph edge evidence kinds, cap-5 line-sorted samples, ambiguous-candidate counts. Viewer: detail-panel evidence expander. MCP summary: `evidence_edge_count`.
- **`src/map/layer-drift.ts` (`MapData.drift`, v1.3.0)**: declared-vs-detected architecture drift — declared-layer coverage, directed layer→layer dependency matrix, per-community composition/purity, outliers (declared layer ≠ community dominant); optional `--layers <path>` spec surfaces (unknown/unused vocabulary, entry-peer + leaf-outbound invariants). Explicit opt-in, never auto-resolved. Viewer: color-by-layer + legend + amber outlier rings + Drift row. MCP summary: `declared_layer_count`, `drift_outlier_count`.
- **`src/map/engineering-metrics.ts` (`MapData.metrics`, v1.4.0)**: five metric families — testLinkage (test-file detection via exported `isTestLikeFile` + inbound-from-tests per src file), documentation (per-file semantic-header status tallies), unresolvedRefs (per-file unresolved+ambiguous raw-edge counts), largestModules (element count), mostDependencies (distinct Ce/Ca). File-bounded Records ship uncapped; rankings capped (25 / zero-test 200) with aggregate warnings mirrored into `meta.warnings`. No-data is distinct from observed zero. Viewer: Metrics toggle + 5-family select, two-stop gradient, neutral no-data, detail-panel Metrics row. MCP summary: `untested_src_count`, `undocumented_file_count` (null-safe pre-1.4).

### Changed
- `MapData.meta.schemaVersion` 1.1.0 → 1.4.0 across the program; `options.analytics` / `edgeEvidence` / `layerDrift` / `metrics` all default ON (each independently disableable).

---

## [2026-07-16] — Universal repo map: `coderef-map` CLI + bundled viewer + MCP `map` tool (23 → 24 tools)

WO-GRAPHIFY-ALIGNMENT-PROJECTIONS-001 (5 phases). A universal, repo-agnostic map projection over `.coderef/` artifacts.

### Added
- **`src/map/` projection module** (`project-map-data.ts`, `emit-map.ts`): file-level MapData (nodes from index/graph, aggregated import/call edges) projected from canonical artifacts — core never touches HTML.
- **`assets/map-viewer/`** static viewer bundle (`graph.html` + `viewer.js` + `viewer.css`, zero CDN): canvas force layout, search, detail panel, hotspot/cycle/blast-radius overlays; inline-data (static) + fetch (serve) modes.
- **`coderef-map` CLI**: static emit to `.coderef/map/` by default; `--serve --port N` for the live viewer.
- **MCP `map` tool** (24th tool): staleness-aware regenerate + summary fields + `data_path`/`graph_html_path`; writes confined to `.coderef/map/`.

---

## [2026-07-02] — Repo-Review Remediation Phase 3: scan performance + dead-code subtraction (P2 perf/hygiene)

WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 3 (STUB-01DW28, final phase). The scan CLI is ~9× faster with better recall, and another ~3,400 lines of dead or dishonest code are gone.

### Removed
- **`src/plugins/` DELETED** (operator ruling): 8 files / ~2,167 LOC of plugin scaffolding nothing ever loaded (`--plugins`/`--no-plugins` on `coderef-scan` were parsed and never read). Restorable from git history when a real need exists.
- **`src/errors/` DELETED**: six exception classes (`CodeRefError`, `FileNotFoundError`, `IndexError`, `ParseError`, `ScanError`, `ValidationError`) with zero production importers — alive only through the legacy root entry export and an isolated test. No longer exported from the legacy main entry.
- **Dead code sweep (P2-14)**: `src/pipeline/incremental-cache.ts` (298-line stale copy of `src/cache/incremental-cache.ts`), `src/generator/generateFrontendCalls.ts` (zero importers), `src/semantic/llm-enricher.ts` + test (its constructor unconditionally self-disabled, so it NEVER enriched — and it was Anthropic-based in an Ollama-local-only environment). No-op flags removed: `populate --llm-enrich`, `scan --plugins/--no-plugins`, `semantic-integration --no-enrich`. `EnrichedMetadata` type relocated to `registry-sync.ts`; `SemanticPipelineOptions.enrichLLM` removed.
- **Untracked residue deleted**: `graphify-out/` (8 MB, 2026-05-12) and `mcp-smoke-stderr.txt`.

### Changed
- **Scan CLI ~9× faster (P2-13): 71s → ~8s on this repo.** Three fixes: (a) the regex pass is now a true per-file FALLBACK — it no longer re-scans files tree-sitter already parsed (which only added `if`/`catch` pseudo-elements dedupe couldn't merge); (b) one read + one parse per file — the new `src/scanner/tree-sitter-file-scan.ts` feeds elements AND relationships from a single tree-sitter parse using the pipeline's full-recall `ElementExtractor` (the scanner's private `TreeSitterScanner` extractor missed interfaces, constants and type aliases — the regex double-pass was masking that gap), and `JSCallDetector` now parses once per file (AST shared across detectCalls/detectImports/etc., primeable from in-memory content); (c) the O(lines²) comment/template detection is a single-pass precomputed table, and the frontend-call parsers no longer Babel-re-parse the whole file PER REGEX MATCH (one-slot AST/result cache). `.coderef/` pipeline output is byte-identical (the pipeline has its own extraction path); `useAST` mode now takes precedence over tree-sitter when explicitly requested instead of running both plus regex.
- **Vector store honest rename + crash-safe writes (P2-16, operator ruling)**: `sqlite-store.ts` → `json-store.ts`, `SQLiteVectorStore` → `JsonVectorStore` (deprecated alias kept). It was always a JSON file. Canonical store name is now `json` (`--store json`); `'sqlite'` is accepted as a deprecated alias with a warning. `save()` writes temp-file-then-rename, so a crash mid-write can no longer corrupt the index.
- **One shared CLI arg helper (P2-18)**: `src/cli/shared/cli-args.ts` adopted by `rag-search`/`rag-index`/`rag-eval`/`rag-status`. Fixes the `--flag=value` bug where `--top-k=5` silently swallowed the NEXT argument; numeric flags are NaN-checked; unknown flags error (exit 1) instead of being silently ignored. `coderef-scan` help now documents its positional-first requirement.
- **Test hygiene (P2-17)**: the fully-mocked "Ollama Provider - Unreachable Daemon" suite is un-skipped (4 tests; the mock simulates ECONNREFUSED itself — no daemon needed; its cloud-fallback assertion also had a latent self-pollution bug, fixed); the five `__tests__/*.test.mjs` smoke scripts that vitest NEVER executed now run on every suite pass via a child-process runner (`__tests__/mjs-smoke-suites.test.ts`); dead `processingTimeMs` determinism mask removed.

### Fixed
- **Duplicate edge ids in `.coderef/graph.json`**: the self-scan artifact carried 948 duplicate-id entries (edge-emission passes could push the same semantic tuple more than once). `buildEdges` now dedupes by id at emit; regression test pins uniqueness.

---

## [2026-07-02] — Repo-Review Remediation Phase 2: legacy analyzer/query stack retired (P1 structural)

WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 2 (STUB-XG7DSB). Executes DR-PHASE-5-C: the legacy in-memory analyzer graph is gone; every query surface now reads the canonical pipeline-emitted `.coderef/graph.json`.

### Removed
- **Legacy analyzer/query stack DELETED**: `src/analyzer/graph-builder.ts` (`@deprecated` since Phase 5), `graph-analyzer.ts`, `analyzer-service.ts`, `graph-error.ts`, `graph-helpers.ts`, `import-parser.ts`, `call-detector.ts`, `src/query/query-executor.ts`, `src/context/multi-hop-traversal.ts`, `src/adapter/graph-to-elements.ts` — plus their 4 test files. This deletes the plural-vs-singular edge-vocabulary mismatch and the inverted query semantics (`what-calls-me` returned callees) wholesale. Package exports updated (`GraphBuilder`/`GraphAnalyzer`/`AnalyzerService`/`QueryExecutor`/`MultiHopTraversal`/`convertGraphToElements`/`GraphError` no longer exported).
- **`coderef-search` bin DELETED** (operator ruling): it required `.coderef/search-index.json` which nothing generates, and its error text cited a nonexistent bin. `package-lock.json` regenerated (also clears the stale `coderef-intelligence-server` bin residue).

### Changed
- **`coderef-query` reimplemented on canonical `.coderef/graph.json`** (operator ruling: keep the command, swap the engine). New `src/query/canonical-graph.ts` engine; direction contract pinned by tests: `-me` = inbound (who calls/imports/depends on the target), bare = outbound. `--patterns` deprecated (no in-memory analysis pass). Requires populate to have run.
- **`coderef-analyze` graph-backed types ported** (`graph`, `impact`, `multi-hop`, `complexity`, `middleware`) onto canonical artifacts; the 6 standalone analyzers and the `breaking-changes` gate are unchanged.
- **Scanner-path TS relationship extraction fixed (P1-8)**: ts/tsx files route through the pipeline's tree-sitter `RelationshipExtractor`; the plain-Acorn `JSCallDetector` pass silently returned empty `calls[]`/`imports[]` for every TypeScript file. First coverage of this hole added (`src/scanner/__tests__/ts-relationship-extraction.test.ts`); plain `.js` stays on Acorn.
- **tsconfig hardening (P1-9)**: `noEmitOnError: true`; new `npm run typecheck:pipeline` strict gate over `src/pipeline/**` (zero errors; 9 fixed in its import closure).
- **One shared LLM-provider/vector-store factory (P1-10)**: `src/integration/llm/provider-factory.ts` consuming `MODEL_REGISTRY` replaces 4 hand-maintained copies + coderef-rag-server's private dimension table. Defaults are Ollama LOCAL-ONLY — no cloud key required unless a cloud provider is explicitly requested.
- **Path normalization centralized (P1-12)**: 55 hand-rolled `.replace(/\\/g,'/')` sites route through `normalizeSlashes` (`src/utils/path-normalize.ts`).

### Fixed
- **EntityRegistry UUID identity gap (P1-12)**: UUIDs hashed the RAW file spelling, so `src\a.ts` and `src/a.ts` yielded two identities for one element. `generateUUID`/`register`/`getEntitiesByFile` now slash-normalize; first entity-registry tests added.

---

## [2026-06-13] — Scanner Resolver Gaps: Python builtin + stdlib-receiver calls (Phase 2)

WO-SCANNER-RESOLVER-THREE-GAPS-001 Phase 2 (STUB-G5E6EA). Gap #3 — the two dominant unresolved-call buckets on Primary-Sources (`callee_not_in_symbol_table` 5,009, `receiver_not_in_symbol_table` 10,245). The deterministic slice is Python builtins, the analog of the JS classifications that already existed.

### Fixed
- **Gap #3a — bare Python builtin calls were `unresolved`.** `print` (1697), `len` (959), `str`, `set`, `sorted`, `dict`, `list`, `sum`, `isinstance`, `int`, `open`, `range`, ... called bare from a `.py` file fell through to `callee_not_in_symbol_table`. A `PYTHON_BUILTIN_CALLEES` set (the analog of `JS_GLOBAL_CALLEES`) now classifies them `builtin` reason `python_builtin_callee`. **Language-guarded** (`isPythonFile`) so a JS/TS call to `open`/`set`/`len` is never reclassified, and project symbols still win (the same-language symbol-table lookup runs first). On PS: **+3,927 edges** (`callee_not_in_symbol_table` 5,009 → 1,082).
- **Gap #3b — Python stdlib module-member calls were `unresolved`.** `json.dumps()`, `sys.exit()`, `re.match()` — calls on a receiver bound to a `python_stdlib` import (Phase 1) — were `receiver_not_in_symbol_table`. A new branch in `classifyMethodCall` mirrors the existing `node_builtin` receiver path: a receiver (or dotted root, e.g. `sys.path` → `sys`) bound to a `python_stdlib` import classifies `builtin` reason `python_stdlib_receiver`. On PS: **+1,008 edges** (`receiver_not_in_symbol_table` 10,245 → 9,237).
- **Net across both phases (PS):** resolution rate (resolved+builtin+external) **18.1% → 43.0%**; unresolved **16,955 → 11,365 (−5,590, a 33% cut)**. Remaining unresolved is dominated by genuinely-hard cases (psycopg2 `cur`/`conn` cursors, dynamic Python expressions, cross-module intra-project Python imports). New `__tests__/pipeline/resolver-receiver-tracking.test.ts` locks both classifications + the JS guard. Full pipeline suite green (195 tests). No `EdgeResolutionStatus` enum change.

---

## [2026-06-13] — Scanner Resolver Gaps: Python stdlib + tsconfig `@/` paths (Phase 1)

WO-SCANNER-RESOLVER-THREE-GAPS-001 Phase 1 (STUB-G5E6EA, from Primary-Sources DISPATCH-003). PS's scan resolved only ~12.5% of its 22,416 edges. Two of the three reported resolver gaps were import-side false-unresolveds, both deterministic to fix.

### Fixed
- **Gap #1 — Python stdlib imports were `unresolved`.** `module.isBuiltin` only knows Node.js builtins, so `import json` / `import pathlib` / `from re import match` fell through to `classifyBareSpecifier` and landed `unresolved` (reason `not_in_manifest_or_node_modules`). A curated `PYTHON_STDLIB` allowlist (3.8+ common modules) now classifies these `external` with reason `python_stdlib`, which graph-builder maps onto `resolutionStatus: builtin` — mirroring the `node_builtin` disposition (STUB-QT400D), **no `EdgeResolutionStatus` enum change.** Dotted modules (`urllib.parse`, `os.path`) resolve via their top-level package. Unknown modules correctly stay unresolved. On PS: **764 edges reclassified** (builtin 700 → 1464).
- **Gap #2 — tsconfig `paths` aliases (`"@/*": ["./*"]`, the Next.js default) never resolved.** Two compounding bugs: (a) `loadTsconfigPaths` ran `path.resolve(baseAbs, './*')` then `path.relative`, collapsing the glob to a bare `*` segment that `matchTsconfigPaths` no longer recognized as a glob (`endsWith('/*')` failed) — so the import tail was dropped and every `@/...` mapped to a literal `*`; (b) the alias target was probed as an absolute path against a project-relative file set. Fixed: `loadTsconfigPaths` preserves the glob; `matchTsconfigPaths` recognizes a bare `*` target and substitutes the import tail; `resolveModuleSpecifier` probes both the relative and projectPath-joined-absolute candidate forms. On PS: **655 `@/...` imports now resolve** (`not_in_manifest_or_node_modules` 1677 → 1022).
- **Net (PS):** unresolved 16,955 → 16,300 (−655 import edges resolved); overall resolved+builtin+external 18.1% → 21.0%. Gap #3 (receiver/callee tracking, ~15,254 edges) is the remaining dominant bucket — Phase 2. New `__tests__/pipeline/resolver-python-stdlib.test.ts` + `resolver-tsconfig-paths.test.ts` lock both fixes (5 tests). Full pipeline suite green (192 tests).

---

## [2026-06-13] - Header Generator: Language-Aware Comment Syntax

STUB-TGBBRG. The semantic-header sweep (`populate-coderef --source-headers`) stamped JavaScript block comments onto Python files - a SyntaxError on line 1 of a .py - breaking ~197 Primary-Sources Python files and blocking the indexer.

### Fixed
- **Header generator is now language-aware by file extension.** `HeaderGenerator.formatAsComments` hardcoded the JS block style (`/** ... */`) for every file. Hash-comment languages (`py`/`pyi`/`rb`/`sh`/`bash`/`zsh`/`yaml`/`yml`/`toml`/`r`/`pl`/`tcl`/`mk`/`cfg`/`conf`/`ini`) now receive `#` line comments; C-family files (ts/tsx/js/jsx/go/rust/java/c/cpp/...) keep the block style. Shebang handling unchanged (header inserts after `#!` line 1). Verified end-to-end: a real shebang-prefixed PS Python file stamps and compiles (`py_compile` clean).
- **`hasSemanticHeader` + `stripSemanticHeaders` detect `#`-style headers** so re-stamping a Python file refreshes its header instead of double-stamping (idempotency test added).

---

## [2026-06-13] — Python Call-Resolution Graph-Integrity Fix

WO-PYTHON-EXPORT-EDGE-VALIDATION-FIX-001 (STUB-M3GE4S). Surfaced re-scanning Primary-Sources (a TS Next.js app with a ~110-file Python data-pipeline subtree): `populate-coderef` failed graph-integrity validation with 220 GI-2 `resolved_edge_endpoint_existence` errors — 100% on Python files — refusing to write artifacts.

### Fixed
- **Cross-language call false-resolution** — the call resolver matched calls purely by callee name, with no language guard. A Python `set(...)` call resolved project-wide to a TypeScript element named `set` (and method-name collisions likewise), producing a `resolved` call edge with a Python-file source and a TS-file target — a dangling cross-language edge. Resolution is now constrained to the **same language family** (`js`/`jsx`/`ts`/`tsx`/`mjs`/`cjs`/`mts`/`cts` are one family; every other extension is its own). Fixed 53 of the 220 errors.
- **Missing file-grain node for call source files** — a resolved call whose caller is a module-level statement (`callerCodeRefId === null`) uses the file-grain node `@File/<sourceFile>` as its edge source, but `buildNodes` only created file-grain nodes for files appearing in `state.elements` or `state.importResolutions` — not call-resolution source files. A Python module-level script calling another Python module thus produced a resolved edge whose source node never existed. `buildNodes` now guarantees a file-grain node for every call-resolution source file. Fixed the remaining 167 errors.
- **Net:** Primary-Sources `populate-coderef` 220 errors → **0**; it scans clean and writes all artifacts (header coverage 93.45% after header stamping). New `__tests__/pipeline/call-resolution-cross-language.test.ts` locks both invariants — the integrity/determinism suite was TS-only, which is why this shipped.

---

## [2026-06-13] — Semantic Registry 2.0.0 (rawFacts dedup)

WO-REGISTRY-RAWFACTS-DEDUP-001 Phase 1 (STUB-BQDXJ0, roadmap Phase 3; operator ruling A).

### Changed
- **`semantic-registry.json` is now `version: "2.0.0"`** — file-grain raw facts (`imports`/`calls`/`exports`/`headerImports`) are stored ONCE in a top-level `rawFactsByFile` map keyed by file, instead of being duplicated onto every element of the file. Under 1.x this duplication was ~98% of the artifact's bytes. Entries reference their bundle via their `file` field; `rawFactsByFile` is omitted when the pipeline ran without a raw-facts bundle. **Self-scan: 124.4MB → 14.9MB (an 88% cut.)**
- **Registries above 10MB serialize compact** (no pretty-print) — a machine-read-only artifact that size gains nothing from indentation.

**Migration:** the only in-tree consumer is `projections.ts` itself (the writer); a consumer sweep found no in-tree reader of `semantic-registry.json`. External readers must branch on the `version` field — entries no longer carry a `rawFacts` field. Primary-Sources re-ground: 56.8MB → 12.5MB (78% cut).

### Fixed
- **`rag-status` vector-store path** — it defaulted to a never-written `rag-vectors.sqlite` while `rag-index`/`rag-search`/the indexing orchestrator all default to `coderef-vectors.json`, so `rag-status` reported "vectors missing" against a perfectly good index. Now resolves the real default (the `CODEREF_SQLITE_PATH` env override is kept as a legacy alias).

---

## [2026-06-13] — RAG Eval Harness

WO-RAG-EVAL-HARNESS-001 (STUB-4M3KQ9, roadmap Phase 5 gate-opener).

### Added
- **`rag-eval`** — golden-query eval harness: 12 intent-phrased queries (`eval/golden-queries.json`) scored hit@1/hit@5/MRR through the SAME `SemanticSearchService` modules `rag-search` uses (provider/store from `rag-index.json` metadata). File-level scoring keeps the metric stable across chunk-grain changes. Committed baseline (`eval/baseline.json`): hit@1 0.583, hit@5 0.667, MRR 0.639 — every future ranking change (CHUNK-ENRICHMENT, PROVENANCE-RANKING) is now measured against it, not vibed.

---

## [2026-06-13] — MCP v2 Tools

WO-MCP-V2-TOOLS-AND-PS-VALIDATION-001 Phase 1 (STUB-ASC73J, roadmap Phase 4).

### Added
- **`hotspots` tool** — fan-in + fan-out ranking over resolved call/import edges; `src_only` (default true) excludes test-origin edges (the `evidence.testOrigin` tag) and test-file elements so architectural load-bearers rank first. Canonical replacement path for intelligence-server's drifted `handleHotspots`.
- **`cycles` tool** — iterative Tarjan SCC over resolved call/import edges; returns cycle membership (largest first) and a sample in-cycle edge per cycle. First live run found a real 2-element cycle in coderef-core's own graph.
- **`what_exports` tool** — file → exported elements via resolved export edges, with ambiguity envelope on path fragments. Closes the export-edge blind spot in the v1 toolset.
- The MCP surface is now **9 read-only tools**; docs swept (CLI.md, AGENT-CONTRACT.md).

### Fixed
- **`impact_of` export-edge hygiene** — reverse BFS now traverses call+import edges only; a file's export edge no longer counts the containing file as a "dependent" of its own element.

### Added (Phase 2)
- **`diff_impact` tool** — PR blast-radius in one call: maps a git diff (default working tree vs HEAD) to changed elements via index.json line ranges, then unions transitive inbound dependents. Validated live on Primary-Sources (`HEAD~5` → 3 files → 22 elements → 8 dependents).
- **`rag_search` tool** — semantic search over MCP; provider/store read from `rag-index.json` metadata so query embeddings always match the index model; graceful `rag_index_missing` / `embedding_unavailable` envelopes. The surface is now **11 read-only tools**.
- **Primary-Sources validation** — PS repopulated with this core (398 files, 19.9s; 14-field report; `builtin_count` 107 → 665), `.mcp.json` registered for PS, all 11 tools live-smoked there.

### Removed (Phase 3)
- **`coderef-intelligence-server` retired** (operator-delegated ruling A, STUB-9F63EJ): it read legacy edge fields (`e.source`/`e.target`/`e.type`) internally — the schema-drift class the MCP server was built to kill — and a consumer sweep across LLOYD/ASSISTANT/DASHBOARD found zero callers. Source + bin entry deleted; `docs/intelligence-api.md` replaced with a retirement tombstone and endpoint→MCP-tool replacement map.

---

## [2026-06-13] — Scanner Export Classification Fix

WO-SCANNER-EXPORT-CLASSIFICATION-FIX-001 Phase 1 (STUB-5WVGHD).

### Fixed
- **`isExported` no longer crosses scope boundaries** — the export check walked up through every ancestor, so any nested function/arrow inside an exported parent inherited `exported:true` (e.g. `buildToolHandlers.inboundByKind`), false-staling honest `@exports` headers via the `exports_match_ast` cross-check. The walk now stops at `statement_block`/`class_body`/function boundaries; nested elements are never exported themselves.
- **Exported multi-line const declarations are now extracted** — `isConstantValue` accepted only primitive literals, so `export const X = new Set([...])` (and array/object/call/template/as-const initializers) produced no element at all; `@exports` headers could never list real const exports. The ALL_CAPS name gate keeps the widening flood-safe. Self-scan: +~80 constant elements (126 total, 30 exported).
- **25 `@exports` headers restamped** to the corrected AST ground truth (under-listing const exports / listing nested closures like `addEntry`); 9 newly-visible files stamped. Header baseline is now fully clean: `header_stale_count` 0, `header_export_mismatch_count` 0, coverage 99.27%.
- **vitest collection failure on shebang+CRLF `.mjs` scripts** (Phase 2, STUB-Z1ETZD): vitest's shebang stripping leaves the stray `\r` when the shebang line ends CRLF, so any test importing `scripts/check-header-coverage.mjs` died at collection with `SyntaxError` (plain node import worked). LF-normalized the script and pinned `scripts/*.mjs text eol=lf` in `.gitattributes`. `check-header-coverage.test.ts` collects and passes for the first time.
- **rag-index deletion sweep** (Phase 3, STUB-81XNNM): the mtime stale-check could not see files *deleted* after the last populate — they only surfaced as per-chunk ENOENT errors hours into an embedding run (17 ghosts, 9.7h into the 2026-06-12 full-repo dogfood). `IndexingOrchestrator` now sweeps the graph's distinct files for disk existence at graph load and surfaces staleness at minute zero via the additive `IndexingResult.staleIndexWarning` field + an upfront console warning. Warn-only — per-chunk behavior unchanged.

---

## [2026-06-12] — Import-Resolver Membership Fix (NodeNext `.js` → `.ts`)

WO-IMPORT-RESOLVER-MEMBERSHIP-CHECK-BUG-001 Phases 1–2 (STUB-XK82Z2 + STUB-QT400D, from the unresolved-edge audit).

### Fixed
- **`probeRelative` now maps NodeNext emitted-extension specifiers onto TS sources** (`./x.js` → `x.ts`/`x.tsx`, `.mjs` → `.mts`, `.cjs` → `.cts`, `.jsx` → `.tsx`), with exact on-disk matches still taking precedence. Previously every relative import written NodeNext-style (`import ... from './x.js'` referring to `x.ts`) was misclassified `unresolved`/`relative_target_not_in_project` — 833 false unresolved edges on coderef-core's own graph, of which 812 now resolve (the remaining 21 point at genuinely-unscanned files like `dist/` output). Self-scan baseline: `valid_edge_count` 4293 → 5226, `unresolved_count` 20701 → 20243.
- **Node builtins now classify `builtin` instead of `unresolved`/`ambiguous`** (Phase 2, STUB-QT400D — no locked-enum changes):
  - Bare and `node:`-prefixed builtin imports (`path`, `node:fs/promises`, …) classify `external` with `reason='node_builtin'`; graph-builder maps the pair onto `resolutionStatus='builtin'` (`not_in_manifest_or_node_modules` 487 → 21).
  - Calls on receivers bound to builtin-module imports (`import * as path from 'path'; path.join()`) classify `builtin` with `reason='builtin_module_receiver'`.
  - Bare calls to JS/Node globals (`parseInt`, `setTimeout`, …) classify `builtin` with `reason='js_global_callee'` — only when nothing in the project shadows the name (symbol table always wins).
  - `BUILTIN_RECEIVERS` grew per DR-PHASE-4-A with paired tests: `console`, `process`, `globalThis`, `Buffer`, `WeakMap`, `WeakSet`, `Proxy`, `BigInt`, `Intl`, `Atomics`.
  - Self-scan: `builtin_count` 1186 → 4622, `unresolved_count` 20243 → 17484, `ambiguous_count` 3204 → 2620.

### Added
- **Test-origin edge tagging + src-only validation counts** (Phase 3, STUB-K5YBFN, operator-ruled option A): graph-builder stamps an additive `evidence.testOrigin: true` on every edge whose `sourceLocation.file` matches `__tests__|.test.|.spec.` — graph semantics unchanged (statuses, ids, and totals untouched). `ValidationReport` grew additively 12 → 14 fields: `unresolved_src_count` + `ambiguous_src_count` count edges NOT tagged test-origin, separating test-framework noise from src truth. Self-scan: 66.6% of unresolved is test-origin; src-only unresolved is 5,854 (vs 17,526 total). Locked-schema test, MCP server, and docs swept 12 → 14.
- **`evidence.probableBuiltinMember` flag** (Phase 4, STUB-XX4JBC, operator-ruled option A): `receiver_not_in_symbol_table` call edges whose callee is JS prototype vocabulary (`push`/`map`/`join`/`split`/… — `JS_PROTOTYPE_METHODS` in call-resolver) carry an additive `probableBuiltinMember: true` evidence hint so consumers can sub-count probable builtin member calls. The edge stays `unresolved` — no `EdgeResolutionStatus` enum change. Self-scan: 5,869 flagged (4,735 src-only, vs the audit's 4,863 estimate).

---

## [2026-06-12] — MCP Server + Local-First RAG

WO-CODEREF-CORE-MCP-SERVER-AND-INTELLIGENCE-FIXES-001 (with header-coverage groundwork from WO-RAG-HEADER-COVERAGE-ENFORCE-AND-SURFACE-001).

### Added
- **`coderef-mcp-server`** — MCP stdio server exposing `.coderef/` intelligence as 6 read-only tools (`what_calls`, `what_imports`, `impact_of`, `find_element`, `codebase_summary`, `validation_status`). Registered as the `coderef-core` MCP domain via `.mcp.json`; new bin entry in `package.json`. Typed against `ExportedGraph` so graph-schema drift fails at compile time. Artifact cache with mtime invalidation; resolved-edges-only traversal; ambiguity envelope returns ≤5 candidates instead of guessing.
- `rag-index --include-headerless` — embed chunks from header-less elements (`headerStatus` ∈ {missing, stale, partial}) with `header:false` provenance instead of skipping them, enabling RAG on repos that were never header-annotated. Skip-with-reason (DR-PHASE-7-E) remains the default. `CodeChunkMetadata` gains an optional `header` boolean.
- `rag-index --coverage-floor <0-100>` / `--strict-coverage` — header-coverage gate (warn or refuse below floor), surfaced in `--help` (flags shipped earlier via WO-RAG-HEADER-COVERAGE-ENFORCE-AND-SURFACE-001).
- `header_coverage_pct` — 12th field of the locked `ValidationReport` (additive), surfaced by `populate-coderef` and `rag-index` output.

### Changed
- **Embedding provider default is now key-aware**: `openai` only when `OPENAI_API_KEY` is set, otherwise `ollama`/`nomic-embed-text` (local-first). Applies identically to `rag-index` and `rag-search` so query embeddings always match the index model. Cloud embedding is opt-in, never a silent default.
- `docs/CLI.md` — rewrote `rag-index`/`rag-search` option tables to match the shipped flag surface (stale `--dir`/`--chroma-url`/`--model`/`--query`/`--threshold` flags removed; `--constraint` documented as shipped, not deferred); added `coderef-mcp-server` section.

---

## [2026-05-05] — Phase 8: Documentation Update

### Documentation
- Rewrote `docs/SCHEMA.md` as the canonical schema reference with sibling sections for Scanner Schema (`ElementData`), Relationship Schema (raw facts + resolved relationships), Resolution Statuses (`ImportResolutionKind` 7 values, `CallResolutionKind` 5 values, `EdgeResolutionStatus` 8 values), Graph Schema (8-field `GraphEdgeV2`, 10-variant `EdgeEvidence`, `GraphNode` with Phase 7 facet propagation, `ExportedGraph`), Validation Report (11-field locked Phase 6 contract), and Indexing Result (Phase 7 additive shape with `IndexingStatus` thresholds, `SkipReason`, `FailReason`).
- Created `docs/HEADER-GRAMMAR.md` as a citation-mirror of the canonical BNF at `ASSISTANT/SKILLS/ANALYSIS/analyze-coderef-semantics/SKILL.md`. CORE never forks the grammar.
- Rewrote `docs/API.md` to cover the post-rebuild public surface, stability commitments, Phase 6 validation gate, Phase 7 indexing contract, and the explicit `What NOT to import` boundary.
- Rewrote `AGENTS.md` as the canonical CORE-side agent usage contract: validation-report.json gate, IndexingResult.status semantics, rag-index exit codes, what-not-to-read, version compatibility commitments, with footer pointer to `ASSISTANT/PROJECT-CONTEXT/coderef-core/CONTEXT.md` for general project rules. `CLAUDE.md` and `GEMINI.md` remain unchanged 5-line pointer stubs (Path C ruling, 2026-05-05).
- Updated `docs/CLI.md` to document `--strict-headers` (Phase 6) on `populate-coderef`, the validation-gate behavior + `IndexingResult.status` exit codes on `rag-index`, and `--layer` / `--capability` filter flags (Phase 7) on `rag-search`.
- Updated `docs/rag-http-api.md` with Phase 7 reality: `IndexingResult.status` field on responses, `validationGateRefused` semantics, per-entry `SkipReason` / `FailReason` enum, `--layer` / `--capability` query passthrough.
- Rewrote `docs/ARCHITECTURE.md` as a phase-ordering overview (Phases 0–7) with `ExportedGraph` canonical and `DependencyGraph` marked `@legacy`.
- Archived 4 audit-style root markdown to `docs/archive/<file>-2026-05-05.md` with dated banners (DR-PHASE-8-A): `EXECUTIVE-SUMMARY`, `CODEREF-ANALYSIS-REPORT`, `DUPLICATE-FILES-AUDIT`, `GENERATE_FOUNDATION_DOCS_ALIGNMENT_PLAN`. Archived `docs/coderef-semantic-schema.md` (predates Phase 1+2.5; superseded by `docs/SCHEMA.md`).

### Pipeline Rebuild Complete (Phase 0..7)

The 9-phase pipeline rebuild is complete. Per-phase archives are at `coderef/archived/pipeline-*/ARCHIVED.md`:

| Phase | Slug | Outcome |
|------:|------|---------|
| 0 | `pipeline-graph-ground-truth-tests` | 6 ground-truth assertions PASS |
| 1 | `pipeline-scanner-identity-taxonomy` | canonical `codeRefId`, `ElementData.layer/capability/constraints/headerStatus` |
| 2 | `pipeline-relationship-raw-facts` | `RawImportFact` / `RawCallFact` / `RawExportFact` (endpoints never node IDs) |
| 2.5 | `pipeline-semantic-header-parser` | `@coderef-semantic:1.0.0` parser; `HeaderFact` per file |
| 3 | `pipeline-import-resolution` | `ImportResolution[]` with 7-value `ImportResolutionKind` |
| 4 | `pipeline-call-resolution` | `CallResolution[]` with 5-value `CallResolutionKind` |
| 5 | `pipeline-graph-construction` | 8-field `GraphEdgeV2`, 10-variant `EdgeEvidence`, `ExportedGraph` canonical |
| 6 | `pipeline-output-validation` | `validatePipelineState` chokepoint, 11-field `ValidationReport`, `--strict-headers` |
| 7 | `pipeline-indexing-rag` | `IndexingResult.status`, refuse-on-`ok=false`, `SkipReason` / `FailReason`, `--layer` / `--capability` filters, file-grain worst-severity facet aggregation |

Final post-Phase-7 baseline: `valid_edge_count=3464`, `header_missing_count=262`, all other validation counts `0`, ground-truth 6/6 PASS. Phase 8 archives the rebuild as a documentation pass with zero source code changes.

---

## [Unreleased]

### Added
- Parallel scanning support for single-language scans
- Incremental cache with mtime-based invalidation
- SCAN_CACHE in-memory LRU for repeated scans
- Comprehensive CLI documentation (CLI.md)
- New CLI commands: coderef-rag-index, coderef-rag-search, coderef-rag-status
- New CLI commands: scan-frontend-calls, validate-routes, detect-languages
- Frontend call detection for React/Vue/Svelte
- Route validation for Express/FastAPI/Next.js
- RAG integration with ChromaDB and Ollama

### Changed
- Scanner now deduplicates elements in both parallel and sequential modes
- Improved AST parsing with tree-sitter fallback
- Updated architecture documentation
- Refactored cache system for better performance

### Fixed
- IMP-CORE-076: Recursive incremental scans for nested files
- IMP-CORE-077: Parallel path early return issue (now preserves dedup/cache)
- Path normalization in IncrementalCache checkFiles
- Mtime precision handling for git checkout scenarios

### Deprecated
- `workerPoolSize` option (not implemented, use `parallel` instead)

### Removed
- N/A

### Security
- N/A

---

## [2.0.0] - 2025-09-17

### Added
- Initial release of CodeRef Core v2.0
- Multi-language scanner (TypeScript, JavaScript, Python, Go, Rust, Java, C/C++)
- Regex-based and AST-based analysis engines
- Tag parsing and generation
- Code drift detection
- Dependency graph building
- CLI interface with scan and populate commands
- Plugin system for custom detectors
- Support for framework-specific route detection
- Export to JSON, Mermaid, Graphviz formats

### Changed
- Complete rewrite from v1.x with new architecture
- Modular design with separate analyzer, scanner, and parser layers

---

## [1.x.x] - 2024 (Legacy)

Legacy version series. See git history for details.

---

## Versioning Guide

- **MAJOR**: Breaking changes to public API
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

---

## Contributing to Changelog

When making changes:

1. Add entry under `[Unreleased]` section
2. Use categories: Added, Changed, Deprecated, Removed, Fixed, Security
3. Reference issue/PR numbers when applicable
4. Keep entries concise but descriptive

Example:
```markdown
### Added
- New feature description (#123)
```

---

## Release Process

1. Update version in `package.json`
2. Update version in `docs/ARCHITECTURE.md`
3. Move `[Unreleased]` entries to new version section
4. Add release date
5. Create git tag: `git tag -a v2.1.0 -m "Release v2.1.0"`
6. Push tag: `git push origin v2.1.0`

---

## Links

- Full changelog: `git log --oneline`
- Compare versions: [GitHub compare](https://github.com/srwlli/coderef-core/compare)
- Releases: [GitHub releases](https://github.com/srwlli/coderef-core/releases)

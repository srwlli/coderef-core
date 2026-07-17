# Changelog

All notable changes to CodeRef Core will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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

# CODEREF-CORE Repo Review — 2026-07-02

**Method:** Fresh `coderef-scan` (6,249 elements / 343 files / 71.9s), full `vitest run` (1,660 passed / 2 failed / 30 skipped), and five parallel code-reading passes over every `src/` subsystem. Findings are code-derived, not documentation-derived. Load-bearing claims were independently spot-verified.

---

## 1. What this tool actually is

CODEREF-CORE (`@coderef/CODEREF-CORE@2.0.0`) is a TypeScript code-intelligence engine with four real capability planes:

1. **Multi-language element extraction** — tree-sitter AST parsing (default) for ts/tsx/js/jsx/py/go/rs/java/cpp/c, with TS-compiler-API and regex fallback layers, rich metadata (params, return types, decorators, docstrings, complexity, nesting).
2. **Resolved dependency/call graph** — a 6-stage pipeline (`src/pipeline/orchestrator.ts`) producing a canonical graph with honest per-edge resolution statuses (`resolved|unresolved|ambiguous|external|builtin|...`), deterministic sha1 edge IDs, and a read-only Phase-6 validator emitting a locked 14-field report.
3. **RAG over the graph** — graph nodes → chunks → embeddings (Ollama local / OpenAI / configurable) → vector store, with fail-closed validation gates, header-coverage floors, facet search, graph-aware re-ranking, and an eval harness (hit@k / MRR floors).
4. **Agent-facing surfaces** — an 11-tool read-only MCP server (`what_calls`, `impact_of`, `cycles`, `hotspots`, `diff_impact`, `rag_search`, …), a localhost HTTP RAG server, a chokidar watch daemon, and 17 CLI bins, all reading pre-built `.coderef/` artifacts.

Plus: semantic source headers (`@coderef-semantic` blocks stamped into files and cross-checked for drift), frontend-vs-backend route drift validation with migration report generation, Mermaid/DOT/JSON-LD exports, and framework detection (Express, Next.js, FastAPI, Flask, Nuxt, Remix, SvelteKit).

## 2. Strengths

- **Resolver rigor (best code in the repo).** `src/pipeline/import-resolver.ts` handles tsconfig `paths`+`baseUrl`, NodeNext `.js→.ts` mapping, index probing, re-export chains with cycle guards, node-builtins, and a Python-stdlib allowlist. Every import yields exactly one resolution. The call resolver never silently resolves unknown-receiver method calls and blocks cross-language false edges (`call-resolver.ts:739-757, 873-898`). Resolved edges without a real target are demoted to `external` rather than fabricated (`graph-builder.ts:452-471`).
- **Fail-closed discipline.** `populate` exits 1 before writing artifacts when validation fails; `rag-index` refuses to run without a validation report; RAG local-only mode is enforced at 3+ layers; header-coverage floor gates exist in warn and strict modes.
- **MCP server quality.** Iterative Tarjan SCC (no recursion blowup), mtime-invalidated artifact caches, depth/limit clamping, ambiguity envelopes, token-budget-conscious responses, stderr-only diagnostics (`src/cli/coderef-mcp-server.ts`).
- **Test culture where it counts.** 1,660 passing tests; 66 pipeline test files named after invariants; an anti-tautological frozen fixture (`dual-ac-frozen`) that re-derives expected counts from input data, with captured mutation-guard FAIL evidence.
- **Traceable engineering.** AC-xx / DR-xx / STUB-xx IDs cited inline next to the code they justify, often with the production incident counts that motivated the fix.
- **Windows-awareness in core paths** — slash normalization at scan and MCP boundaries, atomic tmp+rename heartbeats, branded `AbsolutePath`/`RelativePath` types (in the RAG subsystem).

## 3. Weaknesses

### Critical
1. **Two parallel stacks, and the legacy one is broken.** The canonical pipeline+MCP stack works; the legacy `src/analyzer` + `src/query` + parts of `src/context` stack is vestigial and partly non-functional:
   - `coderef-query` is broken **end-to-end**: it never calls `analyzer.analyze()` before `executor.execute()` (`src/cli/coderef-query.ts:86-95`), so every query throws "No graph available" and exits 1 — and the errored result is cached 5 minutes.
   - `BreakingChangeDetector` is hollow: all three git/signature extraction functions are placeholders returning empty (`src/context/breaking-change-detector/diff-analyzer.ts:130-160`), yet it's wired into `coderef-analyze --type=breaking-changes` — users get a confident empty report. Its 29-case test suite mocks past the stubs.
   - Legacy analysis filters on plural edge types (`'calls'/'imports'`) that the canonical graph never emits (singular `'call'/'import'`) — loading a modern graph.json into `AnalyzerService` silently returns nothing (`graph-analyzer.ts:61,81` vs `pipeline/graph-builder.ts:83`). Query semantics are also inverted vs plain English (`what-calls-me` returns callees).
2. **TS call/import detection in the Scanner path is silently empty.** `JSCallDetector` parses with plain Acorn (no TS plugin — `src/analyzer/js-parser.ts:21`); any file with TS syntax fails parse and returns `[]` calls/imports with no error. This affects the live-scan surfaces (`coderef-scan --useAST` relationships, `coderef-analyze`, `coderef-query`), not the canonical populate pipeline (which extracts facts via tree-sitter). **No test asserts non-empty `calls[]` for a .ts file** — exactly the hole.
3. **TypeScript strictness is off at the foundation.** `tsconfig.json:11-13`: `strict: false`, `noImplicitAny: false`, `noEmitOnError: false` — builds emit JS even when tsc errors. 224 `: any` in non-test src. The branded-path discipline exists only inside `src/integration/rag/`.
4. **RAG incremental state lies in two directions.** (a) Failed chunks are persisted as indexed (`indexing-orchestrator.ts:919` records the full to-index list), so embedding failures are never retried until the file changes or `--force`. (b) `chunksToDelete` is computed but never passed to `vectorStore.delete()` — vectors for deleted/renamed files remain queryable forever.
5. **Unshippable hardcoded paths.** `coderef-watch.ts:233-234, 274-277` and `coderef-rag-server.ts:386-389` embed `C:\Users\willh\...` absolute paths as defaults/fallbacks.

### High
6. **The tool eats its own droppings.** `DEFAULT_EXCLUDE_PATTERNS` (scanner.ts:297-316) does not exclude `.coderef/**`, so rescans re-ingest generated artifacts (corroborates the previously-noted ghost index entries). Committed residue: `src/.coderef/`, `src/scanner/.coderef/incremental-cache.json` (git-tracked, machine-specific absolute paths), `src/integration/llm/.coderef/` including the `rag-vectors.sqlite/` **directory** (residue of a fixed path bug, commit 9da3ac2 → fixed 4ac8aef), plus stray `.d.ts.map` files across src.
7. **Default scan performance is self-inflicted.** Per file: scanner read + tree-sitter re-read/parse + (ts/js) two independent Acorn parses + a full regex pass that runs even when tree-sitter succeeded — all sync I/O; plus O(lines²) comment detection and per-match full-file Babel re-parses in frontend-call extraction. This is why the fresh stats-only scan took 71.9s for 343 files.
8. **`coderef-search` is broken out of the box.** Requires `.coderef/search-index.json`, which nothing generates; its error text also cites a nonexistent bin name (`coderef-populate`).

### Medium (selected)
9. Duplication: provider/store factories copy-pasted in 4 places; frontend-calls generation implemented 3× (one with zero importers); ~10 inline structural re-declarations of `DependencyGraph`; dead 298-line stale copy `src/pipeline/incremental-cache.ts`; 4 coexisting JS/TS parser stacks (tree-sitter, TS API, Acorn, Babel).
10. Plugin system (`src/plugins/` — registry, 3 loaders, manifest validation) is complete scaffolding with **zero integration**: nothing imports it, and `scan.ts` parses `--plugins`/`--no-plugins` flags that are never consumed.
11. `src/errors/` class hierarchy is tested but production-orphaned; the scanner's structured `error-reporter.ts` is also unused — actual behavior is verbose-only logging and bare `catch {}` swallows.
12. The "sqlite" vector store is a pretty-printed JSON file with brute-force cosine scan, non-atomic rewrites on every upsert, and O(n) queries.
13. MCP name-collision: 2–5 homonymous elements get their edges silently merged (ambiguity envelope only fires at >5 matches).
14. `EntityRegistry` UUIDs key on unnormalized `file:name:line` — Windows-vs-posix path spelling yields different identities for the same element; zero tests.
15. LLM enrichment is dead code (`llm-enricher.ts:59-65` unconditionally disables itself); `populate --llm-enrich` is a parsed no-op.
16. Arg parsing, `--flag=value` handling, and exit codes are inconsistent across the 17 bins; `rag-search --top-k=5` silently swallows the next argument.
17. tsconfig excludes `src/cli` and `src/integration` from the strict(er) base build; vitest misses the 6 `.test.mjs` + 1 `.test.py` files; 2 tests currently fail (fixture ENOENT in `buildDependencyGraph.test.ts`, scanner recursive test); the ollama-unreachable negative-path suite is fully skipped despite being mock-based.

## 4. Uses (today)

- **Agent code intelligence over MCP** — the flagship use: `what_calls` / `impact_of` / `diff_impact` / `cycles` / `hotspots` / `rag_search` against validated artifacts, powering Claude-agent workflows in the CODEREF ecosystem.
- **Pre-change blast-radius analysis** — `diff_impact` maps `git diff` hunks to enclosing elements and reverse-BFS impact.
- **Local-first semantic code search** — Ollama embeddings, no cloud egress, facet-filtered.
- **Architecture drift enforcement** — semantic headers cross-checked against AST exports; header coverage gates; validation reports as CI chokepoints.
- **Frontend/backend contract validation** — `validate-routes` diffing frontend calls vs server routes with migration reports.
- **Continuous re-index** — `coderef-watch` daemon with debounced pipeline reruns.

## 5. Potential

- **Trustworthy-by-construction agent tooling** is the differentiator. Honest resolution statuses + validated, deterministic artifacts + refusal-over-guessing is exactly what LLM agents need and what grep-based context lacks. Doubling down on the canonical stack (and deleting the legacy one) makes this the identity.
- **CI-native gates** are nearly free: validation report + coverage floor + `rag-eval --min-mrr` already exist — packaging them as CI actions (fail PR on new unresolved edges / new cycles / dropped header coverage) is a short putt.
- **PR review integration**: `diff_impact` + hotspots + cycles as an automated PR comment is a natural product surface.
- **Real vector store** (sqlite-vec or LanceDB) + fixed incremental correctness → continuous indexing of large repos becomes viable.
- **Plugin system** is built; wiring it turns 7 hardcoded framework detectors into an extension ecosystem.
- **Cross-language depth**: resolvers already carry Python-aware logic; extending call-fact extraction beyond ts/js (Go/Rust/Java facts from the tree-sitter pass) would make the graph genuinely polyglot.

## 6. Actionable items

### P0 — correctness & trust (days)
| # | Action | Where |
|---|--------|-------|
| 1 | Fix `coderef-query`: call `analyzer.analyze()` before execute; don't cache errored results | `src/cli/coderef-query.ts:86`, `src/query/query-executor.ts:137` |
| 2 | Gate or remove `--type=breaking-changes` until diff-analyzer stubs are implemented (currently emits confident empty reports) | `src/context/breaking-change-detector/diff-analyzer.ts:130-160` |
| 3 | RAG incremental: persist state only for successfully embedded chunks; wire `chunksToDelete` → `vectorStore.delete()` | `indexing-orchestrator.ts:919`, `incremental-indexer.ts:232` |
| 4 | Add `.coderef/**` to `DEFAULT_EXCLUDE_PATTERNS`; `git rm` committed residue (`src/**/.coderef/*`, stray `.d.ts.map`) | `scanner.ts:297-316` |
| 5 | Replace hardcoded `C:\Users\willh\...` defaults with env/config resolution | `coderef-watch.ts:233,274`, `coderef-rag-server.ts:386` |
| 6 | Fix the 2 failing tests (fixture mkdir parent; scanner recursive) to restore a green baseline | `src/fileGeneration/__tests__/buildDependencyGraph.test.ts:126` |

### P1 — structural (weeks)
| # | Action | Where |
|---|--------|-------|
| 7 | Execute the already-scheduled legacy-stack retirement (DR-PHASE-5-C): port `coderef-analyze` onto canonical `graph.json`, delete `src/analyzer/graph-builder.ts` + `graph-analyzer` + `query-executor` — this deletes the edge-vocabulary mismatch and inverted query semantics wholesale | `src/analyzer`, `src/query` |
| 8 | Fix TS call detection: route ts/tsx/jsx relationship extraction through tree-sitter facts (as populate does) or the TS-API detector; add a test asserting non-empty `calls[]`/`imports[]` for a real .ts fixture | `scanner.ts:1146-1177`, `js-parser.ts:21` |
| 9 | Enable `noEmitOnError` now; migrate to `strict` per-directory (pipeline first — it's closest to clean) | `tsconfig.json:11-13` |
| 10 | Extract one shared provider/store factory module (4 copies today) | `rag-index.ts:269`, `rag-search.ts:264`, `coderef-mcp-server.ts:780`, `rag-eval.ts:153` |
| 11 | Fix or drop `coderef-search` (nothing generates `search-index.json`; error text cites wrong bin name) | `src/cli/coderef-search.ts:59` |
| 12 | Centralize path normalization behind one utility (60+ hand-rolled `.replace(/\\/g,'/')` sites); normalize `EntityRegistry` UUID keys through it | `src/utils/coderef-id.ts` |

### P2 — performance & hygiene (opportunistic)
| # | Action | Where |
|---|--------|-------|
| 13 | Skip the regex pass when tree-sitter succeeded; parse each file once per engine (cache Acorn AST between detectCalls/detectImports); async I/O; fix O(lines²) comment detection — target: 72s → single-digit seconds for this repo | `scanner.ts:1183-1213, 1485-1553` |
| 14 | Delete dead code: `src/pipeline/incremental-cache.ts`, `generateFrontendCalls.ts`, orphaned context files, dead LLM enricher, `--llm-enrich`/`--plugins` no-op flags | various (see review) |
| 15 | Wire the plugin system into the scanner or move it out of src until it's real | `src/plugins/`, `scan.ts:157-166` |
| 16 | Replace JSON "sqlite" store with sqlite-vec (or rename honestly + atomic temp+rename writes) | `sqlite-store.ts:237-248` |
| 17 | Un-skip the mock-based ollama-unreachable suite; include `.test.mjs` in vitest config or convert | `vitest.config.ts:6` |
| 18 | One shared CLI arg/exit-code helper; fix `rag-search --flag=value` parsing | `src/cli/*` |

## 7. Bottom line

The canonical pipeline → validated artifacts → MCP surface is genuinely good engineering with an unusually honest data model, and it's the part agents actually consume. The repo's problem is everything still standing around it: a broken legacy analysis stack shipping as user-facing bins, a disabled type system, RAG index-state drift, self-scan pollution, and 30–40% of the code being duplicated, dead, or unwired. The highest-leverage move is subtraction — finish the already-planned legacy retirement and let the trustworthy core be the whole product.

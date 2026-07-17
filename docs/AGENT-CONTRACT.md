# Agent Usage Contract — `@coderef/core`

**Last updated:** 2026-07-17 (MCP `map` tool + MapData v1.5: engineering-metrics overlays, skeleton-map `format:"skeleton"`, git-behavioral `git:true`)
**Status:** post-rebuild canonical agent contract

This is the canonical contract for **LLM agents and downstream automation** that consume `@coderef/core` artifacts. It tells you what to read, what to ignore, what the gates mean, and how to interpret exit codes — without requiring you to read the source.

If you are a human contributor or a project-context loader, see the footer pointer at the bottom of this document for general project rules.

---

## 1. What to read (artifact contract)

Agents should consume the **exported artifacts**, not the internal pipeline state.

### `.coderef/validation-report.json` (Phase 6)

Public artifact. Locked 14-field shape (R-PHASE-6-C; `header_coverage_pct` added additively by WO-RAG-HEADER-COVERAGE-ENFORCE-AND-SURFACE-001; `unresolved_src_count` + `ambiguous_src_count` added additively by WO-IMPORT-RESOLVER-MEMBERSHIP-CHECK-BUG-001 P3). Field names are additive-only — no rename, no drop, without explicit ORCHESTRATOR sign-off.

```json
{
  "valid_edge_count": 4293,
  "unresolved_count": 20701,
  "ambiguous_count": 3366,
  "external_count": 576,
  "builtin_count": 1169,
  "header_defined_count": 261,
  "header_missing_count": 0,
  "header_stale_count": 0,
  "header_partial_count": 2,
  "header_layer_mismatch_count": 0,
  "header_export_mismatch_count": 0,
  "header_coverage_pct": 99.24
}
```

The CLI also emits an inferred `ok` flag alongside the report: `ok=true` iff the validator returned `errors.length === 0`. Agents that gate downstream work on validation should read this `ok` flag (or recompute from `errors[]` if they consume the in-process `ValidationResult`).

**The above numbers are the actual baseline from coderef-core's own scan (post header-stamping, 2026-05-31).** Treat them as illustrative of a healthy state, not as fixed expectations.

### `.coderef/rag-index.json` and `IndexingResult` (Phase 7)

The Phase 7 indexer returns an `IndexingResult`. The shape is **strictly additive** over the pre-Phase-7 contract (DR-PHASE-7-B). Agents read:

- `chunksIndexed`, `chunksSkipped`, `chunksFailed`, `filesProcessed`, `processingTimeMs` — numeric counts (unchanged from pre-Phase-7).
- `status: 'success' | 'partial' | 'failed'` — top-level disposition. **Read this first.**
- `chunksSkippedDetails: SkipEntry[]` — one entry per skipped chunk. `length === chunksSkipped` (Phase 7 invariant). Each entry has `coderefId`, `reason: SkipReason`, optional `message`.
- `chunksFailedDetails: FailEntry[]` — one entry per failed chunk. `length === chunksFailed` (Phase 7 invariant). Each entry has `coderefId`, `reason: FailReason`, optional `message`.
- `validationGateRefused?: boolean` — `true` iff `status='failed'` because the Phase 6 validation gate refused the run.
- `validationReportPath?: string` — path to the `validation-report.json` that gated this run.
- `coverageGateRefused?: boolean` — `true` iff `status='failed'` because `header_coverage_pct` breached `--coverage-floor` with `--strict-coverage` set.
- `coverageWarning?: string` — set on any floor breach (strict or not); non-blocking in default mode.
- `embedCacheHits?` / `embedCacheMisses?: number` — present only when the chunk-grain embedding cache ran (default ON). A cache HIT is served from `.coderef-embed-cache.json` without a live embed call but is still counted in `chunksIndexed` (a cache hit is INDEXED, never a skip) — so `embedCacheHits + embedCacheMisses === (chunks embedded this run)` and does **not** shift the skip/fail invariants above. Additive telemetry proving the re-embed reduction.

**Throughput knobs (rag-index / `rag_index`).** Embedding concurrency is provider-owned: the Ollama embed path runs a bounded, **order-preserving** worker pool (`--concurrency` / `CODEREF_EMBED_CONCURRENCY`, default 4, clamped `[1,16]`). It changes wall-clock only — the output vectors and their order are byte-identical to a serial run (`concurrency=1` reproduces the legacy path exactly). The chunk-grain embedding cache is content-addressed on `sha256(embedding-text)+modelId`, so it is safely substitutable (identical text + model ⇒ identical vector) and self-invalidates on a model swap.

### `ExportedGraph` (Phase 5)

The canonical graph artifact. 8-field edges, 10-variant `EdgeEvidence` discriminated union, `GraphNode.metadata` carries `{ layer, capability, constraints, headerStatus }` for elements with semantic facets. See [docs/SCHEMA.md § 4](./docs/SCHEMA.md).

**Edges where `resolutionStatus !== 'resolved'` have `targetId` OMITTED (not synthetic).** This is DR-PHASE-5-A — non-resolved edges declare their disposition through `evidence` and `reason` rather than fabricating a target.

### `CodeChunk` (Phase 7 RAG)

Each indexed chunk carries optional semantic facets propagated from `ElementData.{layer, capability, constraints, headerStatus}` via `GraphNode.metadata`. These facets are filterable via `rag-search --layer <value>` and `rag-search --capability <value>`.

Header-less elements are skipped with `header_status_*` reasons by default (DR-PHASE-7-E). With `rag-index --include-headerless` they are embedded instead, tagged `header: false` in the vector-store chunk metadata — agents consuming search results from such an index should treat `header: false` chunks as lower-provenance.

### Prefer the MCP tools over parsing artifacts by hand

`coderef-mcp-server` (MCP domain `coderef-core`, registered via `.mcp.json`) exposes the artifacts above as 24 tools — see the tool table in [docs/CLI.md § coderef-mcp-server](./CLI.md#coderef-mcp-server) for the authoritative list. Every tool requires `project_root` (the server is repo-agnostic; there is no default repo). Most are read-only (`what_calls`, `what_imports`, `impact_of`, `find_element`, `codebase_summary`, `validation_status`, `hotspots`, `cycles`, `what_exports`, `diff_impact`, `rag_search`, `pack_context`, `rename_preview`, `map`, …); `reindex` and `rag_index` write, confined to `<project_root>/.coderef/`. If your runtime is MCP-capable, use these instead of reading `graph.json`/`index.json` directly — the server is typed against `ExportedGraph`, traverses only `resolved` edges, and returns ambiguity envelopes (≤5 candidates) rather than guessing. `validation_status` returns the 14-field report verbatim.

**The `map` tool is the agent entry point to the repo map** (MapData v1.5). Its response carries triage-ready summary fields — `node_count`, `edge_count`, `community_count`, `isolated_count`, `evidence_edge_count`, `declared_layer_count`, `drift_outlier_count`, `untested_src_count`, `undocumented_file_count` (the last two are `null` on pre-1.4 data) — plus `data_path` pointing at the full `.coderef/map/data.json` (nodes/edges + the additive `analytics`, per-edge `evidence`, `drift`, and `metrics` blocks). Treat every block as a **surface, not a verdict**: a file with zero test in-edges is a *candidate*, not "untested"; absence of index data is *no data*, not zero. See [docs/MAP-USER-GUIDE.md](./MAP-USER-GUIDE.md).

**For first-contact orientation, call `map` with `format: "skeleton"`.** Instead of a `data_path` you have to open, the response carries the repo map **inline** as `skeleton_text`: a token-budgeted, centrality-ranked plaintext listing — files ordered by how depended-on they are, each with its top exported symbol signatures. This is the cheapest way to answer "what is this repo and where do the load-bearing files live" without spending your first several calls reconstructing it by hand. Contract to rely on:

- **Deterministic and budget-bounded.** `token_budget` (default 1600) caps the output; `skeleton_estimated_tokens` reports the actual size. Identical inputs render byte-identical text (no timestamp inside), so it is safe to diff across runs.
- **Ranking is complete, not top-N.** Unlike `analytics.centrality.top` (capped at 25), the skeleton ranks *every* file — so the ordering is the true dependency-centrality ranking for the whole repo, truncated only by the token budget.
- **Every omission is declared.** `skeleton_warnings[]` (mirrored in the text's `## truncation` section) names dropped files, reduced-detail files, capped symbol lists, and the header-less-repo fallback to exported-names-only. If it is silent, nothing was dropped — do not infer completeness from length alone.
- **Same surfaces-not-verdicts rule.** A high-centrality file is load-bearing, not "important." Use the skeleton to decide *where to look next* (then drill in via `data_path`, `what_calls`, `impact_of`, `source_of`), never as a judgment.

The identical artifact is available off-MCP as `coderef-map <repo> --skeleton [--tokens N]` (writes `.coderef/map/skeleton.md`) — one renderer, both surfaces.

**For behavioral signal — how the code changed, not just how it's wired — call `map` with `git: true`** (opt-in; MapData v1.5). This attaches a `git` block and adds three summary fields: `git_commits_scanned`, `churn_hotspot_count`, `coupling_drift_count`. It surfaces two things structure alone cannot:

- **Churn × module-size hotspots** — `git.churnHotspots.top[]` ranks files by `commitCount × elementCount` (element count is the size proxy; coderef has no cyclomatic-complexity metric and this does not invent one). A hotspot is a big, frequently-changed file — a place to *look*.
- **Change-coupling drift** — `git.couplingDrift.top[]` lists file pairs that **co-change in git history but have no static import/call edge between them**. These are candidate hidden dependencies that `impact_of` structurally cannot surface (no edge to traverse). Use it to widen a blast-radius check the static graph would under-report — then confirm in the code. A pair *with* a static edge is corroboration, counted but not listed.

Contract to rely on: the git read is **opt-in and any-repo-safe** — on a non-git repo, a git-less PATH, or an empty history the block is simply absent and `git_block_reason` names why (absence is *no data*, never zero churn). Extraction is bounded by a commit window stamped into `git.window` (with a `shallow` flag when the clone is shallow — the window is partial by depth). **Surfaces, not verdicts:** high churn tracks active development as much as instability; a coupling-drift pair is a *candidate*, not a proven missing edge. Off-MCP: `coderef-map <repo> --git`.

**For trust-tiered traversal, filter `what_calls` / `impact_of` / `rename_preview` by `min_confidence`.** Every graph edge carries a **confidence tier** — a projection of its resolution provenance onto `exact` > `strong` > `heuristic` > `inferred`. It is edge PROVENANCE (how the edge was derived), **not a quality verdict**:

- **`exact`** — fully-resolved binding, both endpoints known. Auto-apply-safe.
- **`strong`** — deterministically classified out-of-project (builtin / external / stdlib / `import type` / dynamic import). Known-and-classified, not a guess.
- **`heuristic`** — resolved but *provisional*: bound to its single candidate on an unknown receiver (`single_candidate_unknown_receiver`). Verify before auto-acting.
- **`inferred`** — could not bind to one confirmed target (unresolved / ambiguous / stale). Lowest provenance — "lower-provenance," not "wrong."

The three consumer tools take an optional `min_confidence` floor. Since they already traverse only `resolved` edges, it differentiates **within the resolved set** (`exact` vs `heuristic`) — it tightens an already-resolved traversal, it does **not** resurface unresolved edges. Omitting it preserves prior behavior; counts shrink monotonically as the floor rises. **The headline use is `rename_preview`:** it tags each site with a `confidence` tier and a `sites_by_confidence` tally, so `min_confidence=exact` gives just the auto-apply-safe sites and holds provisional single-candidate references for review — the "safe to auto-apply vs needs review" split that undifferentiated edges could not express. Off-MCP: `coderef-rename <old> <new> --min-confidence exact`.

**Stop making 4-6 follow-up calls after a search — ask the search for its own neighborhood.** `rag_search` with `expand=true` attaches each hit's 1-hop graph neighborhood inline as `neighbors: { resolved, callers, callees, imports, importedBy }` — **signatures, not bodies**, each with a `confidence` tier, each direction capped by `neighbor_limit` (default 10) with a declared `truncated` + true `total`. Where you used to search, then call `what_calls`/`what_this_calls`/`source_of` on every hit to understand its neighborhood, one `expand=true` search now returns it. A hit whose `coderefId` is not a graph node reports `neighbors.resolved=false` — **absence is no-data, not "unused."** `pack_context` with `include_callers=true` is the same idea for the packer: the default bundle is the focus + what it calls (outbound); `include_callers` also packs who-calls-the-focus (inbound), signature-compressed — the understand-before-edit view. Both are opt-in and additive; omit them and the output is byte-unchanged. Neighbors are **resolved-graph** neighbors (the query index is resolved-only) — what the graph KNOWS, a surface not a verdict.

**Request `concise` first; page with `offset` only when you need more.** Every list-returning tool (`what_calls`, `what_imports`, `impact_of`, `find_element`, `hotspots`, `cycles`, `what_exports`, `diff_impact`, `what_this_calls`, `what_this_imports`, `what_this_depends_on`, `path_between`, `unresolved_edges`, `find_all_references`, `rag_search`) takes two shared, additive params:

- **`response_format: "concise" | "detailed"`** (default `detailed`). `concise` returns the envelope counts + identity fields (`id`/`name`/`file`/`line`) only, dropping per-item body detail (call evidence, snippets, per-depth breakdowns) for roughly a **one-third token cut** on a hot symbol. It is a **verbosity choice over the same facts** — `total`/counts are always preserved — never a filter and never a quality verdict. The default is unchanged (`detailed` = today's full shape byte-for-byte); `concise` is opt-in. The discipline mirrors the map/skeleton tools: **ask for the summary first, escalate to `detailed` only when you actually need the extra fields.**
- **`offset: number`** (default 0). `what_calls` on a high-fan-in symbol can exceed the `limit` cap (100); page past it with `offset`. Every paged response reports `{ offset, limit, total, has_more }` — `total` is always the **true pre-page count**, so you can tell a next page exists and never mistake a capped window for the whole set (no silent truncation). Absent `offset` returns the first page exactly as before. `unresolved_edges` already paged; it now shares one pagination implementation with the rest.

Single-object tools (`codebase_summary`, `validation_status`, `rag_status`, `source_of`, etc.) are already summary-shaped, so `response_format`/`offset` are **no-ops there by design** — a knob does what it says. Off-MCP the same shape is available through the CLI query surface.

**Understand a symbol in ONE call — reach for `symbol_context` before the 5-call dance.** When you are about to edit a symbol, the questions you ask are always the same: what is it, does it have a semantic header, who calls it, what does it call, is it under test, and is my index still fresh for it. That used to be `find_element` + `source_of` + `what_calls` + `what_this_calls` + `what_imports` — five round-trips. `symbol_context` returns one card: `identity`, `header` (presence — `status: "missing"` is no-data, not an error), `neighborhood` (the 1-hop ego-graph, `resolved: false` = no edges recorded, not "unused"), `references` (call/import site counts + sample), `test_linkage` (inbound refs from test files — `test_ref_count: 0` is "no test-file ref recorded," never "untested"), and `staleness`. **Read the `staleness` field before acting on a card:** `stale: true` (`basis: "element-file-mtime-vs-graph"`) means the element's file is newer than `graph.json`, so the card may predate a recent edit — this is a cheap **mtime hint**, not the authoritative hash-manifest freshness contract; reindex if you need certainty. Pass `include_source` for the signature slice, `cap` to bound each facet, `response_format: "concise"` to drop the source slice and page-detail. Drill down to `find_all_references`/`source_of` only when a facet is capped or you need the full body. `symbol_context` is a **join over data the graph already holds** — no new analysis — so it is exactly as trustworthy as the tools it composes.

---

## 2. The gate contract (Phase 6 → Phase 7)

This is the load-bearing contract: **`rag-index` refuses to run when `validation-report.json.ok === false`.**

| `validation-report.json.ok` | `rag-index` behavior |
|---|---|
| `true` | proceed to index; emit `IndexingResult` per status thresholds |
| `false` | return `IndexingResult` with `status='failed'`, `validationGateRefused=true`, `chunksIndexed=0`. **No silent success.** Exit code non-zero. |

This eliminates the pre-Phase-7 anti-pattern where `chunksIndexed=0` could be returned as a successful result.

**Programmatic callers** must inject the gate themselves (DR-PHASE-7-A) — the orchestrator is pure and never reads `validation-report.json` directly. The CLI `rag-index` is the canonical fs→orchestrator wiring.

---

## 3. `rag-index` exit code semantics

| Exit code | When | Stderr |
|----------:|------|--------|
| `0` | `status='success'` | quiet |
| `0` | `status='partial'` | warning summary (skipped/failed counts + per-entry reasons) |
| non-zero | `status='failed'` (including `validationGateRefused=true`) | error detail |

Agents that gate downstream work on indexing should read **both** the exit code and the `IndexingResult.status` field. Treat them as redundant signals; the status field is the higher-fidelity answer (it distinguishes `success` from `partial`, both of which exit `0`).

---

## 4. `IndexingStatus` thresholds (DR-PHASE-7-C)

| `status` | Condition |
|---------|-----------|
| `success` | `chunksIndexed > 0` AND `chunksSkipped === 0` AND `chunksFailed === 0` |
| `partial` | `chunksIndexed > 0` AND (`chunksSkipped > 0` OR `chunksFailed > 0`) |
| `failed`  | `chunksIndexed === 0` OR `validationGateRefused === true` |

If you depend on a "fully clean index" condition, gate on `status === 'success'`, not on exit code alone.

---

## 5. `SkipReason` and `FailReason` enums

`SkipReason` (intentional omission, NOT a malfunction):

| Value | Meaning |
|-------|---------|
| `unchanged` | Chunk is already indexed with current content; idempotent skip. |
| `header_status_missing` | Source file lacks a `@coderef-semantic:1.0.0` header. |
| `header_status_stale` | Source file's header `@exports` no longer matches AST exports (SH-2 drift). |
| `header_status_partial` | Source file's header is present but missing required fields. |
| `unresolved_relationship` | Chunk's relationships could not be resolved; index would be misleading. |

Header-derived skips (missing/stale/partial) implement the rebuild's "skipped or downgraded, not silently indexed" rule (DR-PHASE-7-E).

`FailReason` (malfunction — chunk should have indexed but couldn't):

| Value | Meaning |
|-------|---------|
| `embedding_api_error` | Vector store / embedding provider returned an error. |
| `malformed_chunk` | Chunk failed schema validation before embedding. |

---

## 6. What NOT to read

Agents should NOT depend on:

- **`PipelineState` mutation order or intermediate caches.** It's pipeline plumbing; phases 0–5 mutate it in a specific order, but downstream consumers read the final `ExportedGraph` / `ValidationResult` / `IndexingResult` instead.
- **Intermediate / legacy / `@legacy` types.** Specifically: `DependencyGraph` (the legacy projection at `src/semantic/projections.ts`) has been superseded by `ExportedGraph`. Read `ExportedGraph` directly.
- **Internal modules.** Anything under `src/integration/rag/__internal/`, `src/integration/vector/__tests__/`, or scanner standalone fallback paths is internal.
- **The legacy `imports: ImportRelationship[]` and `calls: CallRelationship[]` arrays on `PipelineState`.** These are kept additive during the transition; new consumers read `rawImports` / `rawCalls` (Phase 2) and `importResolutions` / `callResolutions` (Phase 3 / Phase 4) for resolved relationships, or `ExportedGraph.edges` for the canonical graph view.

If you find yourself reading any of the above, switch to the artifact contract in § 1.

---

## 7. Version compatibility commitments

`@coderef/core` follows SemVer. The post-rebuild contract:

- **`ValidationReport` field set is locked.** Adding a new numeric field is a minor-version bump. Renaming or dropping a field is a major-version bump and requires explicit ORCHESTRATOR sign-off.
- **`IndexingResult` field set is locked additive.** Adding a new field is a minor-version bump. The existing pre-Phase-7 fields (`chunksIndexed`, `chunksSkipped`, `chunksFailed`, `filesProcessed`, `processingTimeMs`, `stats`, `errors`) keep their original types in perpetuity (DR-PHASE-7-B).
- **`SkipReason` and `FailReason` are open enums for additive growth.** New reasons may be added in minor versions. Agents should accept unknown values gracefully.
- **`EdgeResolutionStatus`, `ImportResolutionKind`, `CallResolutionKind` are similarly additive.** The current values are stable; new values may appear in minor versions.
- **`IndexingStatus` ('success' | 'partial' | 'failed') is closed.** New values would be a major-version bump.
- **CLI flags** (`--strict-headers`, `--layer`, `--capability`) are stable. New flags may be added in minor versions.

---

## 8. Reading list for new agents

When integrating with `@coderef/core` for the first time, read in this order:

1. This document (`docs/AGENT-CONTRACT.md`) — agent contract.
2. [docs/SCHEMA.md](./docs/SCHEMA.md) — full type reference for `ElementData`, raw facts, resolutions, `GraphEdgeV2` / `EdgeEvidence` / `ExportedGraph`, `ValidationReport`, `IndexingResult`.
3. [docs/CLI.md](./docs/CLI.md) — CLI flag reference for `populate-coderef`, `rag-index`, `rag-search`.
4. [docs/HEADER-GRAMMAR.md](./docs/HEADER-GRAMMAR.md) — `@coderef-semantic:1.0.0` block grammar (mirror of ASSISTANT canonical).
5. [docs/API.md](./docs/API.md) — programmatic entry points if you're writing a host other than the CLI.
6. [docs/rag-http-api.md](./docs/rag-http-api.md) — RAG HTTP server contract.
7. [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — phase ordering and architecture overview.

Phase archives (`coderef/archived/pipeline-*/ARCHIVED.md`) document each phase's rationale and acceptance criteria — read these only when you need historical context for *why* the contract is shaped this way.

---

## General project rules

For general project rules (build, test, contribution conventions, agent execution norms), read:

`C:\Users\willh\Desktop\CODEREF\ASSISTANT\PROJECT-CONTEXT\CODEREF-CORE\CONTEXT.md`

(That file is the canonical project-context document maintained on the ASSISTANT side. It is the same target that this repo's `CLAUDE.md` and `GEMINI.md` pointer stubs delegate to.)

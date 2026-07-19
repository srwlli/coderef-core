# CodeRef CLI Reference

Complete reference for the CodeRef command-line interface.

---

## Installation

```bash
# Via npm (when published)
npm install -g @coderef/core

# Via npx (no install)
npx @coderef/core <command>

# Local development
npm run build:cli
node dist/src/cli/index.js <command>
```

---

## Command Overview

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| [`coderef-scan`](#coderef-scan) | Scan code for elements | `--dir`, `--lang`, `--recursive`, `--useAST` |
| [`coderef-populate`](#coderef-populate) | Generate .coderef/ artifacts (Phase 6 chokepoint) | `--mode`, `--strict-headers`, `--source-headers` |
| [`coderef-rag-index`](#coderef-rag-index) | Index code for RAG search (gated on `validation-report.json.ok`) | `--provider`, `--store`, `--include-headerless`, `--coverage-floor` |
| [`coderef-rag-search`](#coderef-rag-search) | Search indexed code with optional facet filters | `--top-k`, `--type`, `--layer`, `--capability` |
| [`coderef-mcp-server`](#coderef-mcp-server) | Repo-agnostic MCP stdio server exposing `.coderef` intelligence as 34 tools (read + `.coderef`-write); `project_root` required per call | `--project-dir` (anchor) |
| [`coderef-map`](#coderef-map) | Interactive file-level dependency map of ANY repo (scan-if-absent); static `graph.html`, `--serve`, or `--skeleton` plaintext | `--serve`, `--port`, `--no-open`, `--force-scan`, `--out`, `--layers`, `--skeleton`, `--tokens`, `--git` |
| `rag-eval` | Golden-query eval harness: hit@1/hit@5/MRR against `eval/golden-queries.json`; committed baseline at `eval/baseline.json` | `--project-dir`, `--golden`, `--top-k`, `--json`, `--min-mrr` |
| [`coderef-rag-status`](#coderef-rag-status) | Check RAG index status | `--project-dir`, `--json` |
| [`coderef-pipeline`](#coderef-pipeline) | Unified scan→populate→docs→RAG orchestrator (Ollama-only RAG) | `--project-dir`, `--only`, `--skip`, `--ollama-base-url`, `--ollama-model`, `--rag-reset` |
| [`coderef-watch`](#coderef-watch) | Workspace file-watcher daemon for foundation-docs freshness (incremental by default) | `--project-dir`, `--debounce-ms`, `--full`, `--once`, `--no-pipeline`, `--json` |
| [`coderef-rag-server`](rag-http-api.md) | Always-on HTTP RAG server for cross-runtime callers (port 52849) | `--port`, `--help` |
| [`scan-frontend-calls`](#scan-frontend-calls) | Detect frontend API calls | `--dir`, `--pattern`, `--output` |
| [`validate-routes`](#validate-routes) | Validate API route definitions | `--dir`, `--strict`, `--fix` |
| [`coderef-analyze`](#coderef-analyze) | Run a single analysis pass (config, contracts, DB, patterns, complexity, impact, breaking-changes, etc.) | `--project`, `--type`, `--output`, `--element`, `--depth`, `--from`, `--to` |
| [`coderef-query`](#coderef-query) | Execute a relationship query over canonical `.coderef/graph.json` (calls, imports, depends-on, shortest-path, all-paths) | `--project`, `--type`, `--target`, `--source`, `--depth`, `--format` |
| [`coderef-detect-languages`](#coderef-detect-languages) | Detect programming languages used in a project | `--project`, `--ignore-file`, `--json` |
| [`coderef-semantic-integration`](#coderef-semantic-integration) | Run semantic header generation and registry sync | `--project`, `--output`, `--registry`, `--dry-run`, `--file`, `--validate-idempotency` |

---

## coderef-pipeline

Unified orchestrator that chains the four standard CodeRef legs in order
against a single target project: **scan → populate → foundation-docs → RAG**.

### Usage

```bash
# Target a project (--project-dir is required)
npx coderef-pipeline --project-dir /path/to/project

# Positional path alias (equivalent to --project-dir)
npx coderef-pipeline /path/to/project

# Skip the rag leg
npx coderef-pipeline --project-dir /path/to/project --skip rag

# Only run docs and rag
npx coderef-pipeline --project-dir /path/to/project --only docs,rag

# Reset the RAG vector store (use when changing embedding model dimensions)
npx coderef-pipeline --project-dir /path/to/project --rag-reset

# Plan-only (no side effects)
npx coderef-pipeline --project-dir /path/to/project --dry-run
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--project-dir <path>` | Target project root (**required**). Propagated to populate, doc-gen, and rag-index. Also accepts first positional argument. | — |
| `--only <legs>` | Comma-separated subset to run (`scan`, `populate`, `docs`, `rag`). | All legs |
| `--skip <legs>` | Comma-separated legs to skip. | None |
| `--ollama-base-url <url>` | Ollama endpoint used by the rag leg. | `http://localhost:11434` or `CODEREF_LLM_BASE_URL` |
| `--ollama-model <name>` | Ollama embedding model. | `nomic-embed-text` or `CODEREF_LLM_MODEL` |
| `--rag-reset` | Reset the RAG vector store before indexing. | `false` |
| `--dry-run` | Print the plan; do not execute. | `false` |
| `-v, --verbose` | Forward `--verbose` to sub-commands. | `false` |
| `-h, --help` | Show help. | — |

### Leg order

1. **scan** — `coderef-scan <project-dir>`
2. **populate** — `populate-coderef <project-dir>` (writes `.coderef/`).
3. **docs** — `node scripts/doc-gen/generate-{index,exports,hotspots,relationships}-md.js --project-dir=<path>` (writes `coderef/foundation-docs/`).
4. **rag** — `rag-index --project-dir <path>` (writes `.coderef/coderef-vectors.json` for the vector store and `.coderef-rag-index.json` for incremental indexing state).

### Local-only RAG constraint

The `rag` leg is invoked with `CODEREF_RAG_LOCAL_ONLY=1` and
`CODEREF_LLM_PROVIDER=ollama` set on the child process unconditionally.
**Cloud LLM providers (OpenAI, Anthropic) are not reachable through this
surface.** Both the `RAGConfigLoader` and the `rag-index` CLI's parseArgs
honor the local-only flag and reject cloud-provider selection with a
`ConfigError` when it is set.

If you need cloud RAG, invoke `rag-index` directly without the
`CODEREF_RAG_LOCAL_ONLY` flag.

### Failure semantics

- Each leg is a child process. The orchestrator short-circuits on the
  first non-zero exit code; subsequent legs report `skip` in the summary.
- The summary table prints leg / status / duration regardless of outcome.
- Leg-level stderr tails (last 20 lines) are surfaced when a leg fails.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `CODEREF_RAG_LOCAL_ONLY` | Set to `1` to forbid cloud LLM providers. The orchestrator sets this for the rag leg automatically. |
| `CODEREF_LLM_PROVIDER` | Provider name (`ollama` for local-only). |
| `CODEREF_LLM_BASE_URL` | Ollama (or other local) endpoint. |
| `CODEREF_LLM_MODEL` | Ollama embedding model. |

---

## coderef-map

One command from any repo to an interactive dependency map
(WO-GRAPHIFY-ALIGNMENT-PROJECTIONS-001). Point it at ANY project: if
`.coderef/graph.json` is absent it runs the scan + populate legs first (same
bins `coderef-pipeline` chains), then projects `graph.json` + `index.json` to
a file-level `.coderef/map/data.json` and emits the bundled browser viewer —
dependency graph, search (files + elements), node-detail panel, hotspots and
cycles overlays, communities and dead-code overlays (graph analytics), layer-drift
overlay (declared vs detected), engineering-metrics overlay (test linkage,
header coverage, unresolved refs, module size, dependencies), blast-radius
mode. Header-less repos degrade gracefully (the map renders from the
dependency graph alone).

### Usage

```bash
# Static mode (default): emits .coderef/map/graph.html with the data inlined
# and opens the browser. The file is double-clickable afterwards — no server.
npx coderef-map /path/to/any/repo

# Serve mode: local HTTP server over the same artifacts (big repos, or when
# the browser blocks file: pages)
npx coderef-map /path/to/any/repo --serve --port 8123

# Regenerate artifacts first, don't open a browser
npx coderef-map /path/to/any/repo --force-scan --no-open

# Skeleton mode: token-budgeted plaintext repo map to stdout (and
# .coderef/map/skeleton.md) — files ranked by dependency centrality with their
# exported symbol signatures. Prompt-injectable agent orientation. Implies
# --no-open.
npx coderef-map /path/to/any/repo --skeleton --tokens 1600

# Git-behavioral block (opt-in): churn×size hotspots + change-coupling drift
# (files that co-change in git history but have no static import/call edge).
# Requires a git work tree; degrades to an absent block on a non-git repo.
npx coderef-map /path/to/any/repo --git --no-open
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--project-dir <path>` | Target project root (or first positional arg) | cwd |
| `--serve` | Serve the map over localhost instead of relying on the static file | off |
| `--port <N>` | Port for `--serve` (`0` = auto-assign) | `8123` |
| `--no-open` | Do not open the browser | opens |
| `--force-scan` | Re-run scan + populate even if `.coderef/` exists | off |
| `--out <dir>` | Output directory | `<path>/.coderef/map` |
| `--layers <path>` | Layers spec (`layers.json`) enriching the drift block with vocabulary + entry/leaf surfaces (below). **Explicit opt-in** — never auto-resolved, so map output stays machine-independent | off (spec-less drift) |
| `--skeleton` | Also emit the token-budgeted plaintext skeleton map to stdout and `.coderef/map/skeleton.md` (below). Implies `--no-open` | off |
| `--tokens <N>` | Token budget for `--skeleton` | `1600` |
| `--git` | Attach the git-behavioral block (below): churn×size hotspots + change-coupling drift. **Opt-in** — requires a git work tree; degrades to an absent block on a non-git repo | off |

### Output

| File | Purpose |
|------|---------|
| `.coderef/map/data.json` | File-level MapData v1.6: nodes = files (embedded element detail, dominant layer, hotspot score), edges = aggregated **resolved** deps with per-kind weights + per-edge `evidence` blocks (below), hotspot/cycle overlays, `analytics` block (below), `drift` block (below), `metrics` block (below), and — with `--git` — the `git` block **and** the `ownership` block (below). Same file the MCP `map` tool returns to agents. |
| `.coderef/map/graph.html` | Static viewer with the data inlined (safe `<`-escaped embedding) |
| `.coderef/map/viewer.js` / `viewer.css` | Viewer runtime (vanilla JS canvas force-graph, zero network/CDN) |
| `.coderef/map/skeleton.md` | **`--skeleton` only.** Token-budgeted plaintext repo map (below). Same renderer the MCP `map` tool's `format:"skeleton"` returns inline. |

### Skeleton map (`--skeleton`, `.coderef/map/skeleton.md`)

A token-budgeted, centrality-ranked plaintext projection of the same MapData
(`src/map/skeleton-map.ts`, WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 P1;
aider repo-map / `repomix --compress` pattern). The problem it solves: an agent
otherwise burns its first several tool calls reconstructing repo orientation.
The skeleton is a single prompt-injectable artifact — files ranked by
dependency centrality (most depended-on first), each carrying its top exported
symbol signatures, fitted deterministically to a token budget.

- **Ranking:** distinct in-degree (dependents) desc, then total degree, then
  hotspot score, then path — computed from the projected file edges, so it is a
  *full* ranking (not the top-25 the `analytics` block caps at).
- **Budget fit:** a larger `--tokens` budget always yields a **superset** of the
  files a smaller budget included (monotone); leftover budget upgrades files in
  rank order from path-only → exported names → full signatures.
- **Determinism:** no timestamp in the artifact; identical inputs render
  byte-identical text (`ceil(chars/4)` token estimate, documented as a heuristic).
- **Truncation is declared:** a trailing `## truncation` section lists every
  omitted file, reduced-detail file, capped symbol list, and (on a header-less
  repo) the fallback to exported-names-only. Silence means nothing was dropped.
- **Surfaces, not verdicts** — a high-centrality file is load-bearing, not
  "important"; the map tells you where to look, never what is wrong.

### Edge evidence block (`edges[].evidence`, MapData v1.2)

Per-edge provenance computed from the same raw `graph.json` edge records the
aggregation pass walks (`src/map/edge-evidence.ts`,
WO-MAP-GRAPH-ANALYTICS-MODULE-001 P2). Optional and schema-additive: consumers
of older `data.json` files see no block; `projectMapData(root,
{ edgeEvidence: false })` skips it. **Surfaces, not verdicts** — resolution
facts from the scan, no judgment about whether an edge is correct.

| Field | Contents |
|-------|----------|
| `provenance` | Underlying-edge counts per class, key-sorted: `explicit` (declared — resolved imports/exports), `inferred` (derived via symbol resolution — resolved calls), `unspecified` (no basis recorded). Counts cover **all** underlying edges of the pair, not just samples. |
| `samples[]` | `{relationship, provenance, line, detail}` — capped (default 5, `evidenceSampleCap` option), sorted by line/relationship/detail; `line` 0 = unknown (import edges commonly carry 0); `detail` = `localName <- originSpecifier` for imports, `receiver.callee() in scope` for calls. |
| `samplesTruncated` | `true` when the pair had more underlying edges than the cap. Aggregate truncation counts land in `meta.warnings`. |
| `ambiguous` | `{edgeCount, candidateCount}` — ambiguous-call edges whose candidates land in this (already-resolved) pair. Counts only, never samples; ambiguous edges never create new map edges. Unattachable ambiguous edges are reported once in `meta.warnings`. |

Viewer: each row in the detail panel's **Depends on / Used by** lists gains an
`evidence` expander showing the relationship-kind breakdown, provenance counts,
line-numbered samples, and the ambiguous-candidate count. Rows from a pre-1.2
`data.json` render exactly as before (no expander).

### Analytics block (`data.analytics`, MapData v1.1)

Graph analytics computed from the projected file graph itself
(`src/map/graph-analytics.ts`, WO-MAP-GRAPH-ANALYTICS-MODULE-001 P1) — no
intelligence artifacts required, so it works on any repo. Optional and
schema-additive: consumers of older `data.json` files see no block; the viewer
disables the two analytics toggles gracefully. Deterministic modulo
`meta.generatedAt`.

| Field | Contents |
|-------|----------|
| `communities[]` | `{id, size, files[], label}` — connected components refined by weighted label propagation; ids ranked by size; `label` = dominant top-level dir. Capped (default 50) with a warning; `assignments` (file → community id) always covers **all** files. |
| `centrality.top[]` | `{file, degree, inDegree, outDegree, betweenness}` — degree exact; Brandes betweenness exact ≤ 500 files, else deterministic stride-sampled and flagged via `betweennessApproximated` + `sampledSources`. |
| `bridges[]` | Articulation-point files of the undirected file graph (removal disconnects components). |
| `coupling.top[]` | `{file, efferent, afferent, instability}` — distinct dependency counts; `instability = Ce/(Ce+Ca)`. |
| `deadCode` | `{isolated[], zeroInDegreeCandidates[], entrypointExcludedCount, note}` — **surfaces, not verdicts**: entrypoint-like (`index.*`, `main.*`, `bin/`, `cli/`, `scripts/`) and test files are excluded from candidates. |
| `warnings[]` | Every cap truncation and approximation, one line each. |

Viewer toggles: **Communities** (color nodes by community) and **Dead code**
(highlight candidates, dim the rest) join the existing Hotspots/Cycles/Blast
radius modes; the node detail panel shows the community and dead-code-candidate
rows.

### Drift block (`data.drift`, MapData v1.3)

Declared-vs-detected architecture drift computed from the projection itself
(`src/map/layer-drift.ts`, WO-MAP-GRAPH-ANALYTICS-MODULE-001 P3): per-file
declared layers (the `@layer` semantic headers already projected onto
`nodes[].layer`) compared against the detected communities from the analytics
block. Optional and schema-additive: consumers of older `data.json` files see
no block; `projectMapData(root, { layerDrift: false })` skips it.
**Surfaces, not verdicts** — an "outlier" is a file whose declared layer
differs from its community's dominant declared layer, nothing more.

| Field | Contents |
|-------|----------|
| `coverage` | `{declaredFileCount, undeclaredFileCount, undeclared[], undeclaredTruncated, byLayer}` — how much of the repo declares a layer; `byLayer` (layer → file count) key-sorted; undeclared list capped (default 100). |
| `layerMatrix[]` | `{sourceLayer, targetLayer, edgeCount, weight}` — directed declared-layer dependency matrix over file edges whose **both** endpoints declare a layer, sorted by (source, target). |
| `communities[]` | `{id, size, layeredSize, layers, dominantLayer, purity}` — per detected community with ≥ 1 layered member; `layers` key-sorted; `purity` = dominant count / layeredSize (3 decimals). Capped (default 100). |
| `outliers[]` | `{file, layer, communityId, dominantLayer}` — files whose declared layer differs from the community dominant (communities with ≥ 2 layered members only; a lone layered file is its own dominant). File-sorted, capped (default 100). |
| `vocabulary` | Only with `--layers`: `{unknownLayers, unusedLayers}` — declared layers absent from the spec's `layers[].id` (with file counts) and spec layers with zero declared files. |
| `invariantSurfaces` | Only with `--layers`: `{entryPeerEdges, leafOutboundEdges, note}` — observed edges against the spec's **machine-readable** rules (`dependency_rules.entry_layers` / `leaf_layers`); the spec's prose invariants are never parsed. |
| `warnings[]` / `note` | Every cap truncation, one line each (also mirrored into `meta.warnings`); analytics-off degrades to coverage + matrix with a warning; zero declared layers degrades to a coverage-only note. |

Viewer toggle: **Layer drift** colors nodes by declared layer (deterministic
palette by sorted layer name, undeclared files neutral gray), rings layer
outliers in amber, and shows a legend strip while active; the node detail panel
gains a `Drift` row (declared layer vs community dominant + outlier marker).
Pre-1.3 `data.json` disables the toggle gracefully.

### Metrics block (`data.metrics`, MapData v1.4)

Engineering metrics computed from artifacts the projection already walks
(`src/map/engineering-metrics.ts`, WO-MAP-GRAPH-ANALYTICS-MODULE-001 P4):
projected nodes/edges, `index.json` element `headerStatus`, and raw
`graph.json` edge resolution statuses — no new inputs, so it works on any
repo. Optional and schema-additive: `projectMapData(root, { metrics: false })`
skips it; computed **independently of the analytics block**. **Surfaces, not
verdicts** — zero test in-edges is an observation (transitive/integration
coverage is invisible to the file graph), unresolved references are resolution
facts, missing headers are coverage facts.

| Field | Contents |
|-------|----------|
| `testLinkage` | `summary` `{testFileCount, srcFileCount, srcWithTestEdgeCount, srcWithoutTestEdgeCount}`; `testFiles[]` (sorted, classified by the same heuristic graph-analytics uses — single source); `inboundFromTests` (src file → `{testFileCount, weight}`, key-sorted; absence = observed zero); `zeroTestInEdge[]` (sorted src files with no inbound test edge, capped, default 200). |
| `documentation` | `summary` `{totalElements, byStatus, indexedFileCount, filesWithNonDefinedCount}`; `files` (file → headerStatus → element count, key-sorted, **all** index-present files — a file absent from the Record has no index data: no-data, not zero); `topNonDefined[]` ranking (capped). Header-less repos degrade to a coverage-only note; absent index degrades to no-data. |
| `unresolvedRefs` | `summary` `{fileCount, edgeCount, byStatus}`; `files` (file → `{unresolved, ambiguous}` outbound raw-edge counts, key-sorted; absence = observed zero); `top[]` ranking (capped). The per-file resolution signal — `validation-report.json` is repo-level only. |
| `largestModules` | `top[]` `{file, elementCount}` ranking (capped). |
| `mostDependencies` | `top[]` `{file, efferent, afferent}` — distinct dependency counts from projected edges, computed independently of `analytics.coupling` (which is analytics-gated and capped). |
| `warnings[]` / `note` | One aggregate warning per ranking truncation (`rankingCap` default 25, `zeroTestCap` default 200), mirrored into `meta.warnings`; per-family notes state the observation semantics. |

Viewer toggle: **Metrics** plus a family select (`Test in-edges` /
`Non-defined headers` / `Unresolved refs` / `Module size` / `Dependencies`)
colors nodes by a two-stop gradient over the selected metric's value range,
with a legend strip showing the range endpoints and the no-data count;
no-data nodes render neutral gray (distinct from an observed zero); the node
detail panel gains a `Metrics` row (per-family values for the selected file).
Pre-1.4 `data.json` disables the toggle + select gracefully.

### Git-behavioral block (`data.git`, MapData v1.5, `--git` opt-in)

The first git-history signal in coderef-core
(`src/map/git-behavioral.ts` + `src/map/git-history.ts`,
WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 P2; CodeScene / code-maat pattern).
**Opt-in** via `--git` (CLI) or `git:true` (MCP) — the base map path stays
git-independent, so a non-git repo, a git-less PATH, or an empty history simply
omits the block with a declared `meta.warnings` line (no-data ≠ zero). The git
**read** is isolated in one impure module (`git-history.ts`, the only code that
shells to `git`); everything downstream is pure over the extracted record, so
the analytics are deterministic and unit-tested without a repo. Extraction is
bounded by a commit window (`--max-count` default 500, optional `--since`); the
resolved window is stamped into the block. **Surfaces, not verdicts** — high
churn tracks active development as much as instability, and a coupling-drift
pair is a *candidate* hidden dependency, not a proven missing edge.

| Field | Contents |
|-------|----------|
| `window` | `{maxCount, since, commitsScanned, headSha, shallow}` — the extraction provenance and bound. `shallow:true` flags a shallow clone (window partial by depth). |
| `churnHotspots` | `summary` `{churnedFileCount, scoredFileCount}`; `top[]` `{file, commitCount, elementCount, score, linesAdded, linesDeleted}` ranked by **churn × module-size** (`commitCount × elementCount`), capped (default 25). Churned files absent from the projection are counted but not scored (no size proxy). |
| `couplingDrift` | `summary` `{coChangePairCount, corroboratedPairCount, driftPairCount, minCoChange}`; `top[]` `{a, b, coChangeCount}` = file pairs that **co-change in git but have NO static import/call edge** (the set difference `co-change − static edge`), ranked by co-change count, capped (default 25). Pairs *with* a static edge are corroboration (counted, not listed). A `minCoChange` floor (default 2) drops single-commit noise. |
| `note` | Per-surface + block-level surfaces-not-verdicts notes. |

Viewer overlay for the git block is out of scope for this phase (data-first;
the overlay is a follow-up). Read it from `data.json` or via the MCP summary
fields below.

### Ownership / knowledge block (`data.ownership`, MapData v1.6, `--git` opt-in)

Per-file authorship distribution — the bus-factor / knowledge-map surface
(`src/map/ownership.ts` + `src/map/git-history.ts` author capture,
WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P2; CodeScene knowledge-map /
CODEOWNERS pattern). It rides the **same** opt-in `--git` (CLI) / `git:true`
(MCP) switch as the git-behavioral block — author capture (`%an`/`%at`) is a git
read, isolated in the same one impure module (`git-history.ts`); the analytics
are pure and deterministic over the extracted record (the reference clock is
passed in as data — the newest commit in the window — so `ageDays` is a property
of the observation, not the reader's wall clock). Absent on a non-git repo, a
git-less PATH, an empty history, **or a window with no author fields** (no-data ≠
zero — a file outside the window is never reported as share-0/"unowned").
**Surfaces, not verdicts** — a single-author or long-untouched file is an
observation (it may be small and stable, or a knowledge silo), not a "risky
code" judgment; the block reports the distribution and the agent decides how
boldly to refactor.

| Field | Contents |
|-------|----------|
| `summary` | `{filesWithAuthorship, singleAuthorFileCount, nowEpoch}` — population of files carrying authorship, of those the count that are single-author (`dominantAuthorShare == 1`, bus factor 1), and the reference clock `ageDays` is measured against (provenance). |
| `top[]` | `{file, distinctAuthorCount, dominantAuthor, dominantAuthorShare, totalCommits, lastTouchedEpoch, ageDays}` — `dominantAuthorShare` ∈ [0,1] is the fraction of the file's window commits from its single most active author (the bus-factor proxy). Ranked `dominantAuthorShare` desc, then `ageDays` desc, then file asc (concentrated-**and**-stale surfaces first), capped (default 25). |
| `note` | Surfaces-not-verdicts + absence-is-no-data note. |

### Metrics delta (`map_metrics_delta`, verified-refactor loop)

The CodeScene verified-refactor loop closed against the five metric families
(`src/map/metrics-delta.ts`, WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 P11). The
metrics block already **names** issues; the delta tool lets an agent **prove** a
refactor improved the target family without regressing others. It is a pure
JOIN/DIFF over the existing `data.metrics` — no new metric computation, no graph
change.

Two modes on the `map_metrics_delta` MCP tool:

- **`snapshot:true`** — copies the current `data.metrics` to a named sidecar
  `.coderef/map/metrics-snapshot-<label>.json` (default label `baseline`). A pure
  read/copy, confined to `.coderef/map/`. Snapshot **before** refactoring.
- **diff (default)** — `before` (a snapshot label or an explicit `data.json`/snapshot
  path; default the `baseline` snapshot) vs `after` (the current `data.metrics`, or
  an explicit path). Returns a **decomposed per-family factor vector**.

| Field | Contents |
|-------|----------|
| `schemaVersion` | `{before, after, match}` — a snapshot-schema mismatch sets `match:false` and adds a `warnings[]` entry (families still diff field-by-field; the mismatch is surfaced, never silently mis-diffed). |
| `testLinkage` / `documentation` / `unresolvedRefs` | `{noData, direction, summaryDeltas, byStatusDeltas?}` — per numeric summary scalar `{before, after, delta}`, and (documentation/unresolvedRefs) per-`byStatus` key deltas. `direction` (`improved`/`regressed`/`unchanged`) is from that family's concern-scalar (`srcWithoutTestEdgeCount` / `filesWithNonDefinedCount` / `edgeCount` **down = improved**) — PROVENANCE, not a verdict. |
| `largestModules` / `mostDependencies` | `{noData, direction, rankingChange}` — `rankingChange` `{entered[], left[], rankChanged[]}` diffed by **file identity** (a pure reorder reports only rank shifts, never a positional delta). These pure rankings are **direction-neutral** (`unchanged`) — a module growing is a fact, not a regression. |
| `warnings[]` / `note` | Mismatch / absent-family warnings; surfaces-not-verdicts note. |

There is deliberately **NO composite score** — the five families are never summed
or weighted into one number, so a regression in one family is never hidden by a
gain in another. `response_format:"concise"` returns per-family `{noData, direction}`
only. A missing snapshot or a pre-1.4 `data.json` with no metrics block returns a
declared no-data warning envelope, never a fabricated diff.

### Agent parity

The MCP server's `map` tool (see below) emits/refreshes the identical
`data.json` via the same extracted core (`src/map/emit-map.ts`) —
parity-tested byte-identical modulo timestamp, and summarizes the analytics
block as `community_count` + `isolated_count`, the evidence blocks as
`evidence_edge_count`, the drift block as `drift_outlier_count` +
`declared_layer_count`, the metrics block as `untested_src_count` +
`undocumented_file_count`, and — with `git:true` — the git block as
`git_commits_scanned` + `churn_hotspot_count` + `coupling_drift_count`
and the ownership block as `ownership_file_count` + `single_author_file_count`
(plus `git_block_reason` naming why both blocks are absent on a non-git repo or
an author-less window). Each summary field is null when reading an older
`data.json` or when the block was not requested. Agents query `data.json`;
humans open `graph.html`.

---

## coderef-watch

Workspace file-watcher daemon for foundation-docs freshness. Watches the project via chokidar, debounces edits (default 30s), and on each flush runs a **graph-safe incremental populate by default** (STUB-6TKGW7): the debounced changed-file snapshot goes to `populate --changed-files` (re-scan only changed files, resolve against the persisted full fact set — byte-identical to a full rebuild, proven by the RISK-02 parity gate; fail-closed to a full build on the first flush when no fact set exists yet), then the `docs` (and `rag`, unless RAG is skipped) legs refresh so **all** artifacts stay fresh, not just graph/index (STUB-9DN53Q). Pass `--full` to opt back into an always-full `coderef-pipeline --only scan,populate,docs[,rag]` on every flush. After every flush attempt, writes `{project-dir}/.coderef/last-scan.json` atomically (temp + rename) so LLOYD can compute `doc_age_seconds = now − last_scan_at` cheaply on every pre-prompt assembly.

WO-CHOKIDAR-DOC-FRESHNESS-DAEMON-001. Incremental leg: WO-AGENT-NATIVE-CAPABILITY-GAPS-001 P5/RISK-02 + WO-RESOLVER-SYMBOL-TABLE-DEDUP-FIX-001 follow-ups (STUB-9DN53Q docs/RAG refresh, STUB-6TKGW7 default flip).

### Operational expectation

**`coderef-watch` runs in the CONSUMER WORKSPACE, NOT in the LLOYD process.** Each consumer machine runs one daemon per active workspace. Per-OS service-unit instructions (systemd / launchd / Windows Service / pm2 / manual): see [DEPLOY-CODEREF-WATCH.md](DEPLOY-CODEREF-WATCH.md).

### Usage

```bash
# Daemon mode against the current workspace (incremental populate + docs/RAG by default)
npx coderef-watch --project-dir "$(pwd)"

# Opt out of incremental — always-full pipeline on every flush
npx coderef-watch --project-dir "$(pwd)" --full

# Custom debounce window
npx coderef-watch --project-dir /abs/path --debounce-ms 60000

# One-shot run (no daemon, no watch loop) - useful for cron / health checks
npx coderef-watch --project-dir /abs/path --once

# Debug: log change events but do NOT spawn the pipeline
npx coderef-watch --project-dir /abs/path --no-pipeline --json
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --project-dir <path>` | Workspace root to watch | `process.cwd()` |
| `--debounce-ms <n>` | Debounce window in milliseconds | `30000` (per LLOYD D2 spec) |
| `-l, --languages <csv>` | File extensions to watch | `ts,tsx,js,jsx,py,go,rs,java,cpp,c` |
| `--exclude <csv>` | Additional glob patterns to exclude | `(none — defaults already exclude node_modules, dist, .git, .coderef, foundation-docs)` |
| `--include-rag` | Also run the RAG leg on each flush (the incremental leg's RAG re-index is itself incremental — only changed files re-embed, stale vectors pruned) | off (RAG opt-in) |
| `--incremental` | Graph-safe incremental populate + docs/RAG refresh. **Now the default** — this flag is a no-op kept for back-compat | **on (default)** |
| `--full`, `--no-incremental` | Opt out of incremental: run the always-full pipeline (`scan,populate,docs[,rag]`) on every flush | off |
| `--once` | Run pipeline once against the workspace and exit | off (daemon mode) |
| `--no-pipeline` | Log change events only; do NOT spawn pipeline | off (debug) |
| `-j, --json` | Heartbeat-only structured stdout (one JSON line per flush) | off |
| `-v, --verbose` | Verbose logging (forwarded to coderef-pipeline) | off |
| `-h, --help` | Show help | — |

### Heartbeat schema

Path: `{project-dir}/.coderef/last-scan.json`. Schema: [`src/cli/coderef-watch-heartbeat.schema.json`](../src/cli/coderef-watch-heartbeat.schema.json) (v1).

```json
{
  "schema_version": 1,
  "last_scan_at": "2026-04-26T01:30:00Z",
  "paths_changed": ["src/cli/foo.ts", "src/scanner/bar.ts"],
  "status": "pass",
  "exit_reason": "pipeline_ok",
  "exit_code": 0,
  "duration_ms": 4823,
  "pid": 18432,
  "alive_at": "2026-04-26T01:30:00Z",
  "trigger": { "kind": "debounce", "cwd": "/abs/path/to/project" }
}
```

LLOYD-side read pattern (Python): see [LLOYD-INTEGRATION.md](LLOYD-INTEGRATION.md).

### Events

| Sink | Path | When |
|---|---|---|
| Local audit | `{project-dir}/.coderef/watch-events.jsonl` | Every flush, always |
| Session events | `LOGS/SESSIONS/{sid}/{domain}/events.jsonl` | Every flush, only when `CODEREF_SESSION_ID` is set in env (best-effort, non-blocking) |

Session events conform to WO-SESSIONS-EVENT-EMISSION-PROTOCOL-001 with `type=coderef_watch_flush`, `source=coderef-watch`.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `CODEREF_SESSION_ID` | If set, every flush forwards a session event to `LOGS/SESSIONS/{id}/{domain}/events.jsonl` |
| `CODEREF_AGENT_DOMAIN` | Agent domain to record on forwarded session events (default `CODEREF-CORE`) |
| `CODEREF_LOG_SESSION_EVENT_SCRIPT` | Override path to `scripts/log-session-event.mjs` (default: ASSISTANT repo location) |

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success — `--once` mode finished, OR `--no-pipeline` flush was skipped intentionally, OR daemon shut down on SIGINT/SIGTERM |
| `1` | Pipeline failed (`status: fail`); see `exit_reason` in heartbeat |
| `2` | Invalid arguments or `--project-dir` not found |

### See also

- [DEPLOY-CODEREF-WATCH.md](DEPLOY-CODEREF-WATCH.md) — per-OS service-unit instructions
- [LLOYD-INTEGRATION.md](LLOYD-INTEGRATION.md) — LLOYD read pattern + per-task-type policy

---

## coderef-scan

Scan a codebase for code elements (functions, classes, components, hooks).

> **Scan-count vs index-count:** `coderef-scan` reports the raw scan-pass element count, which is **expected to be higher** than the element count in `populate-coderef`'s `.coderef/index.json`. They are produced by two independent extractors: the scan CLI (`src/scanner`) runs a regex pass that can emit pseudo-elements (e.g. `if:`/`catch:`/`fetch(`) on tree-sitter-succeeded files, while the populate/index pipeline (`src/pipeline/extractors`) uses its own tree-sitter extractor with a deduped element set. `coderef-scan` count > `index.json` count is by design — not a discrepancy. Likewise, quote scan **timing** with its command + conditions (cold vs warm cache, language set), since those dominate the number.

### Usage

```bash
npx coderef-scan --dir ./src --lang ts,tsx --recursive
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-d, --dir <path>` | Directory to scan | Current directory |
| `-l, --lang <langs>` | Comma-separated languages | `ts,tsx,js,jsx,py,go,rs,java,cpp,c` |
| `-r, --recursive` | Scan recursively | `true` |
| `--useAST` | Use TypeScript compiler API for TS/JS (legacy opt-in) | `false` |
| `--useTreeSitter` | Use tree-sitter parsing (IMP-CORE-052: now default `true`; pass `false` to force regex) | `true` |
| `--fallbackToRegex` | Fallback to regex on AST failure | `true` |
| `--parallel` | Use parallel processing | `false` |
| `--includeComments` | Include commented code | `false` |
| `--exclude <patterns>` | Exclude patterns (comma-separated) | See default excludes |
| `-v, --verbose` | Verbose output | `false` |
| `--cache` | Use incremental cache | `true` |
| `--output <path>` | Output file (JSON) | stdout |

### Examples

```bash
# Basic scan
npx coderef-scan --dir ./src

# Scan with AST parsing
npx coderef-scan --dir ./src --lang ts --useAST

# Scan single language with parallel mode
npx coderef-scan --dir ./src --lang ts --parallel

# Exclude patterns
npx coderef-scan --dir ./src --exclude "**/*.test.ts,**/node_modules/**"

# Output to file
npx coderef-scan --dir ./src --output ./scan-results.json
```

### Output Format

```json
{
  "elements": [
    {
      "type": "function",
      "name": "calculateTotal",
      "file": "src/utils/math.ts",
      "line": 15,
      "exported": true,
      "imports": [...],
      "calls": [...]
    }
  ],
  "stats": {
    "filesScanned": 42,
    "elementsFound": 156,
    "duration": 1234
  }
}
```

---

## coderef-populate

Generate `.coderef/` directory artifacts from the canonical scanner pipeline. `.coderef/index.json` is the machine truth. `semantic-registry.json` is generated as a projection from the enriched `ElementData` in `index.json`; source headers are optional and are not written by default.

`ElementData` emitted by the pipeline includes canonical CodeRef IDs plus the Phase 1 identity taxonomy fields: `layer`, `capability`, `constraints`, and `headerStatus`. The scanner defaults `headerStatus` to `missing`; it does not parse or validate source headers in this phase.

### Usage

```bash
npx populate-coderef ./my-project --mode full
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `PROJECT_DIR` | Project directory positional argument | Current directory |
| `-l, --lang <languages>` | Comma-separated language extensions | Auto-detect |
| `-o, --output <path>` | Output directory | `{PROJECT_DIR}/.coderef` |
| `-m, --mode <mode>` | `full`, `minimal`, or `context` | `full` |
| `--select <generators>` | Run only specific generators | Mode default |
| `-s, --skip <generators>` | Skip specific generators | None |
| `--semantic-registry` | Generate `semantic-registry.json` projection | `true` |
| `--semantic` | Legacy alias for `--semantic-registry` | `true` |
| `--no-semantic-registry` | Remove/skip `semantic-registry.json` projection | `false` |
| `--source-headers` | Write optional CodeRef-Semantics headers into source files. Infers `@layer` from file path patterns automatically (e.g. `src/cli/` → `cli`, `__tests__/` → `test_support`). | `false` |
| `--overwrite-headers` | Re-write **every** file's header even if present. Refreshes headers but can churn many unrelated files (`@used_by` refreshes + CRLF re-normalization) when only a few are actually stale — prefer `--stale-only` for a targeted refresh. Implies `--source-headers`. | `false` |
| `--stale-only` | Refresh **only** stale-header files (`headerStatus='stale'`, i.e. `@exports` drifted from the AST). Implies `--overwrite-headers`. Regenerates just the drifted files, avoiding the full-repo rewrite/CRLF churn of a blanket `--overwrite-headers` pass. Prints `refreshed N / skipped M`. (STUB-QDXGBA) | `false` |
| `--include <globs>` | Scope `--source-headers` writes to files matching these comma-separated globs (allowlist, e.g. `scripts/**,src/api/**`). Matched against **project-relative** paths via `minimatch`. Filters the header **write** loop only — `graph`/`index`/`registry` output is unchanged. Composes with `--exclude` and `--stale-only` as AND. (STUB-4JDQXX) | none |
| `--exclude <globs>` | Skip `--source-headers` writes for files matching these comma-separated globs (denylist). Use to head a shared project root while leaving foreign sub-domains untouched. Composes with `--include` and `--stale-only` as AND. (STUB-4JDQXX) | none |
| `--strict-headers` | Promote semantic-header drift (SH-1, SH-2, SH-3) from warnings to hard errors at the Phase 6 validator. `populate-coderef` exits non-zero on header drift. | `false` |
| `--enforce-headers` | Fail (exit 1) if header coverage is below `--coverage-floor`. Prevention layer: a header-less codebase can no longer produce a green scan, so new files added without a `@coderef-semantic` header are caught at scan time instead of being silently excluded from the RAG index. | `false` |
| `--coverage-floor <0-100>` | Minimum `header_coverage_pct` required by `--enforce-headers`. | `100` |
| `-j, --json` | Output JSON summary | `false` |
| `-v, --verbose` | Verbose output | `false` |

Every `populate-coderef` run now also prints a `[header coverage] N% (defined X / total Y)` line plus, when files are header-less, a `missing/stale/partial` breakdown — these files are the ones `rag-index` will exclude from the vector index. The number comes from `validation-report.json.header_coverage_pct` (added by WO-RAG-HEADER-COVERAGE-ENFORCE-AND-SURFACE-001).

**Stamp-on-write hook.** `scripts/check-header-coverage.mjs` is a pre-commit-hook backend: pipe staged source files to it and it fails the commit if any lacks a header. Example hook body: `git diff --cached --name-only --diff-filter=ACM | xargs node scripts/check-header-coverage.mjs`. Bypassable via `git commit --no-verify`; the `rag-index --coverage-floor` gate is the backstop for anything that slips through.

**Phase 6 chokepoint behavior.** `populate-coderef` runs `validatePipelineState` after the pipeline finishes and writes the resulting 14-field `ValidationReport` to `.coderef/validation-report.json`. The CLI's exit code reflects `ValidationResult.ok`:

| `ValidationResult` | Exit code | Stderr |
|---|---:|---|
| `ok=true`, no warnings | `0` | quiet |
| `ok=true`, warnings present (default-mode header drift) | `0` | warning summary (SH-1/SH-2/SH-3 file lists) |
| `ok=false` (graph-integrity error or `--strict-headers` promoting header drift) | non-zero | error detail |

Downstream `rag-index` reads `validation-report.json` and refuses to run when `ok=false` — see [`rag-index`](#coderef-rag-index) below.

### Examples

```bash
# Populate .coderef/ with defaults
npx populate-coderef ./my-project

# Minimal machine-truth outputs only
npx populate-coderef ./my-project --mode minimal

# Generate optional human-facing source headers
npx populate-coderef ./my-project --source-headers

# Refresh ONLY stale headers (targeted — recommended; touches just drifted files)
npx populate-coderef ./my-project --stale-only

# Refresh ALL headers (blanket rewrite — churns many files; use --stale-only instead)
npx populate-coderef ./my-project --source-headers --overwrite-headers

# Write headers into OWNED subdirs only, leaving a shared root's foreign files untouched
npx populate-coderef ./shared-root --source-headers --include "scripts/**,ORCHESTRATOR/**,ENGINES/**"

# Hard-fail on any semantic header drift (CI mode)
npx populate-coderef ./my-project --strict-headers
```

### Generated Artifacts

```
.coderef/
├── index.json          # Canonical ElementData machine truth
├── semantic-registry.json # Query-optimized projection from index.json
├── graph.json          # Dependency graph with normalized paths
├── context.md          # Project context
├── reports/
│   ├── drift.json      # Code drift analysis
│   ├── quality.json    # Quality metrics
│   └── complexity.json # Complexity analysis
└── exports/
    └── diagram.md      # Mermaid diagram
```

---

## coderef-rag-index

Index codebase into a vector database for semantic search. Reads `.coderef/validation-report.json` (produced by `populate-coderef`) and **refuses to run** when `ok=false` — eliminates the pre-Phase-7 `chunksIndexed=0` silent-success anti-pattern.

The CLI binary is `rag-index` (registered in `package.json`). `coderef-rag-index` is the historical name.

### Usage

```bash
npx rag-index --project-dir ./my-project
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --project-dir <path>` | Project directory to index (also accepts first positional argument) | Current directory |
| `--provider <provider>` | Embedding provider: `openai`, `anthropic`, `ollama` | `ollama` — local, always; cloud requires explicit `--provider` or `CODEREF_LLM_PROVIDER` |
| `--store <store>` | Vector store: `json`, `pinecone`, `chroma` (`sqlite` is a deprecated alias for `json`) | `json` |
| `--reset` | Reset existing index before indexing | `false` |
| `--include-headerless` | Embed chunks from header-less elements (`headerStatus` ∈ {missing, stale, partial}) with `header:false` provenance instead of skipping them — enables RAG on repos that were never header-annotated. Default behavior (skip-with-reason) preserves DR-PHASE-7-E. | `false` |
| `--coverage-floor <0-100>` | Warn (or refuse, with `--strict-coverage`) when `header_coverage_pct` is below this floor. Below-floor coverage means chunks from header-less files are silently excluded from the index. `0` disables the check. | `0` |
| `--strict-coverage` | Make a `--coverage-floor` breach REFUSE indexing (`status='failed'`, `coverageGateRefused=true`) instead of warning. | `false` |
| `--concurrency <N>` | Max concurrent Ollama embedding requests (worker-pool size, clamped to `[1,16]`). Ollama's `/api/embeddings` is single-text-per-call but the daemon serves concurrent requests, so this collapses the serial per-chunk round-trips. **Changes wall-clock only — the output vectors and their order are byte-identical.** Also settable via `CODEREF_EMBED_CONCURRENCY`. | provider default (`4`) |
| `--no-embed-cache` | Disable the chunk-grain embedding cache (default ON). The cache (`.coderef-embed-cache.json`) serves byte-identical chunks under the same embedding model without re-embedding them — additive over the file-grain incremental layer (which drops whole unchanged files; the chunk cache rescues unchanged chunks *inside* changed files). Model id is in the cache key, so a model swap invalidates it. | cache ON |
| `-l, --lang <languages>` | Comma-separated language filter | All languages |
| `-j, --json` | Output results as JSON | `false` |
| `-v, --verbose` | Verbose output | `false` |

**Provider default is unconditionally local** (WO-RAG-INDEX-DEFAULTS-TO-CLOUD-OPENAI-ON-LOCAL-001, supersedes the earlier key-aware rule): with no `--provider` flag the CLI always selects `ollama` with `nomic-embed-text` (768-dim, fully local) — the presence of `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` in the environment is never consulted. Cloud embedding requires an explicit `--provider openai`/`anthropic` or `CODEREF_LLM_PROVIDER` opt-in. `rag-search` shares the same resolver (`resolveRagProvider`), so index and query embeddings stay on the same model.

`rag-index` now prints `Header coverage: X%` and a `by reason:` breakdown of skipped chunks (e.g. `header_status_missing: N`), so a run that drops most of the codebase for missing headers is no longer indistinguishable from a clean no-op. Coverage flags added by WO-RAG-HEADER-COVERAGE-ENFORCE-AND-SURFACE-001.

### Validation gate (Phase 6 → Phase 7 contract)

`rag-index` reads `<project>/.coderef/validation-report.json` before any indexing work begins:

| `validation-report.json` state | `rag-index` behavior |
|---|---|
| File present, `ok=true` | proceed to index |
| File present, `ok=false` | return `IndexingResult` with `status='failed'`, `validationGateRefused=true`, `chunksIndexed=0`. Exit non-zero. |
| File missing or malformed | hard error; exit non-zero. Run `populate-coderef` first. |

This is the load-bearing Phase 6 → Phase 7 gate (DR-PHASE-7-A). Programmatic callers inject the gate themselves; the orchestrator is pure and never reads the report directly.

### `IndexingResult.status` and exit codes

`rag-index` emits an `IndexingResult` (see [docs/SCHEMA.md § 6](./SCHEMA.md)) with a top-level `status`:

| `status` | Condition | Exit code | Stderr |
|---------|-----------|----------:|--------|
| `success` | `chunksIndexed > 0` AND `chunksSkipped === 0` AND `chunksFailed === 0` | `0` | quiet |
| `partial` | `chunksIndexed > 0` AND (`chunksSkipped > 0` OR `chunksFailed > 0`) | `0` | warning summary with skipped/failed counts and per-entry reasons |
| `failed`  | `chunksIndexed === 0` OR `validationGateRefused === true` OR `coverageGateRefused === true` | non-zero | error detail |

`chunksSkippedDetails[]` and `chunksFailedDetails[]` carry one entry per skipped/failed chunk with a `reason` enum (see [docs/SCHEMA.md § 6](./SCHEMA.md) for `SkipReason` / `FailReason`). Header-drift (`headerStatus` ∈ {missing, stale, partial}) skips with the corresponding `header_status_*` reason rather than failing — DR-PHASE-7-E.

### Examples

```bash
# Index current project (local ollama unless OPENAI_API_KEY is set)
npx rag-index

# Index a specific project with OpenAI embeddings
npx rag-index --project-dir ./my-project --provider openai

# Index a repo that was never header-annotated
npx rag-index --project-dir ./legacy-repo --include-headerless

# Enforce a header-coverage floor (refuse below 80%)
npx rag-index --coverage-floor 80 --strict-coverage

# Index with a larger embedding worker pool (faster on Ollama; output unchanged)
npx rag-index --concurrency 8

# Force a full re-embed, bypassing the chunk-grain cache
npx rag-index --no-embed-cache

# Reset and re-index TypeScript only
npx rag-index --reset --lang ts,tsx
```

### Prerequisites

- `.coderef/validation-report.json` present and `ok=true` — run `populate-coderef` first.
- For the `ollama` provider (the local-first default): Ollama server running at `http://localhost:11434` with `nomic-embed-text` pulled.
- For `--store chroma`: ChromaDB server running. The default `json` store (a local JSON file with crash-safe writes) needs no server.

---

## coderef-rag-search

Search the indexed codebase using natural language queries, with optional filtering by Phase 7 semantic facets.

The CLI binary is `rag-search` (registered in `package.json`). `coderef-rag-search` is the historical name.

### Lexical-first routing (Phase 9)

`rag-search` (and the `rag_search` MCP tool) route through a **lexical-first router**. A **symbol-shaped** query — a bare identifier (`authenticateUser`), a dotted member access (`LRUCache.get`), a `--flag`-like token, or a `"quoted exact"` phrase — is answered from the **symbol table** (`.coderef/index.json`) via in-process BM25 with **zero Ollama and zero rag-index dependency**. It works on a `populate`-only repo (no `rag-index` run) and when the embedding daemon is down.

A **multi-word conceptual** query (`how does authentication work`) routes to the **embedding lane** (hybrid dense+BM25 fusion) when a rag-index + provider are available. If they are not, it **degrades to the lexical lane and still answers** (`lane: "lexical", degraded: true`) rather than erroring.

Every response reports which lane answered:

- `lane`: `"lexical"` | `"semantic"` | `"hybrid"` — **provenance of how you were answered, never a quality verdict**. `lexical` means "answered from the symbol table without embeddings", not "lower quality".
- `routing_reason`: a one-line explanation of the routing decision.
- `degraded: true`: present only when a conceptual query fell back to the lexical lane because the embedding lane was unavailable.

`--lexical` forces the symbol-table lane always (skips the embedding lane even for conceptual queries). Because the lexical lane keys on `name`/`type`/`file`, it works on a repo **with no semantic headers** — search quality is decoupled from both a daemon being up and headers existing.

### Usage

```bash
npx rag-search "authentication middleware" --type function
```

The query is a positional argument (natural language works best).

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --project-dir <path>` | Project directory to search | Current directory |
| `--provider <provider>` | Embedding provider: `openai`, `anthropic`, `ollama`. **Must match the provider the index was built with** — mismatched models produce empty or garbage results. | `ollama` — local, always (same shared resolver as `rag-index`) |
| `--store <store>` | Vector store: `json`, `pinecone`, `chroma` (`sqlite` is a deprecated alias for `json`) | `json` |
| `-k, --top-k <n>` | Number of results to return | `10` |
| `--min-score <n>` | Minimum relevance score 0–1 | None |
| `-t, --type <type>` | Filter by element type (`function`, `class`, `method`, ...) | All types |
| `-f, --file <pattern>` | Filter by file path pattern | None |
| `-l, --lang <language>` | Filter by programming language | All languages |
| `--exported` | Only show exported elements | `false` |
| `--layer <value>` | Filter by semantic `@layer` (e.g. `service`, `ui_component`, `cli`). Phase 7. | None |
| `--capability <value>` | Filter by semantic `@capability` slug (kebab-case). Phase 7. | None |
| `--constraint <key:value>` | Generalized filter shorthand. Keys: `type`, `file`, `lang`, `layer`, `capability`, `exported`. | None |
| `--max-tokens <n>` | Truncate output to approximately N tokens (chars/4 estimate). Applies to both human-readable and `--json` modes. Omit for unbounded output. | None |
| `--lexical` | Force the symbol-table BM25 lane (zero Ollama / rag-index needed). Symbol-shaped queries route here automatically; this forces it for all queries. Phase 9. | `false` |
| `-j, --json` | Output as JSON | `false` |

`--layer` and `--capability` map to the `CodeChunk.{layer, capability}` facets propagated from `ElementData` via `GraphNode.metadata` (Phase 5 → Phase 7). They pass through to the vector-store metadata filter — only chunks with matching values are returned. Layer values come from `ASSISTANT/STANDARDS/layers.json` (the 13-value `LayerEnum`); capability values are free-form kebab-case slugs declared in source headers.

### Examples

```bash
# Basic search
npx rag-search "user login function"

# Filter by element type
npx rag-search "database connection" --type class

# Filter by semantic layer (Phase 7)
npx rag-search "queue worker" --layer service

# Filter by capability slug (Phase 7)
npx rag-search "embedding" --capability rag-indexing

# Combine filters
npx rag-search "validate" --layer validation --capability output-validation

# Symbol-shaped query — answered from the symbol table, no Ollama/rag-index needed (Phase 9)
npx rag-search "LRUCache.get"

# Force the lexical lane for any query (Phase 9)
npx rag-search "authentication" --lexical

# Higher score floor for precision
npx rag-search "error handling" --min-score 0.85

# JSON output for piping
npx rag-search "API routes" --json | jq '.results[]'
```

### Output Format

```json
{
  "query": "authentication middleware",
  "results": [
    {
      "element": {
        "type": "function",
        "name": "authMiddleware",
        "file": "src/middleware/auth.ts",
        "line": 23
      },
      "score": 0.89,
      "context": "..."
    }
  ]
}
```

---

## coderef-rag-status

Check the status of the RAG index.

The CLI binary is `rag-status` (registered in `package.json`). `coderef-rag-status` is the historical name.

### Usage

```bash
npx rag-status --project-dir ./my-project
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --project-dir <path>` | Project directory (also accepts first positional argument) | Current directory |
| `-j, --json` | Output as JSON | `false` |

### Examples

```bash
# Check status
npx rag-status --project-dir ./my-project

# JSON output
npx rag-status --project-dir ./my-project --json
```

### Output

```
RAG Index Status
================
Collection: coderef_src_abc123
Documents: 1,247
Last Updated: 2026-04-23T18:30:00Z
Status: ✓ Connected
```

---

## coderef-mcp-server

MCP (Model Context Protocol) stdio server that exposes `.coderef/` intelligence artifacts as 34 tools. Lets MCP clients (Claude Code, Claude Desktop, any MCP-compatible agent) query call graphs, impact analysis, and element lookups directly instead of parsing `graph.json` by hand.

**Repo-agnostic (WO-MCP-REPO-AGNOSTIC-ANY-REPO-001):** one running server serves ANY indexed repo. Every tool takes a **required `project_root`** argument naming the target repo root (the directory containing `.coderef/`) — pure CLI semantics, exactly as if the caller had the CLI. There is no default repo, no cwd inference, no env fallback; omitting `project_root` is a schema-level rejection.

Most tools are **read-only**. Three are **`.coderef`-write** tools — `reindex` (regenerate the substrate), `rag_index` (build the RAG index over local Ollama), and `map` (emit/refresh the file-level map + bundled viewer under `.coderef/map/`) — and every write they perform is confined to `<projectDir>/.coderef/`: they delegate to the `populate` / `rag-index` / `emit-map` pipelines and never mutate source. Source-mutating rename is deliberately **not** exposed here; MCP offers only the dry-run `rename_preview` (the `coderef-rename --apply` CLI owns source mutation).

Built inside coderef-core and typed against `ExportedGraph` — schema drift between the graph exporter and the MCP surface is a compile error, not a runtime mystery (the failure mode that killed the previous external Python server).

### Usage

```bash
npx coderef-mcp-server --project-dir ./my-project
```

The server speaks JSON-RPC over stdio; all diagnostics go to stderr. It is meant to be launched by an MCP client, not used interactively.

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --project-dir <path>` | OPTIONAL DEFAULT ANCHOR: used only to resolve a *relative* per-call `project_root` (also accepts first positional argument). It never binds the tools to a default repo. | Current directory |

### Per-repo queries

One server, any indexed repo — name the repo per call:

```
codebase_summary(project_root="C:/repos/project-one")   → project-one's census
codebase_summary(project_root="C:/repos/project-two")   → project-two's census
what_exports(project_root="C:/repos/project-two", file="src/lib.ts")
```

- `project_root` is **required and mandatory** on all 28 tools. Absolute paths are used as-is; relative paths resolve against the launch anchor (`--project-dir`, default cwd).
- One handler set (with its mtime-invalidated artifact cache) is memoized per distinct canonical root — repeated queries against the same repo are cheap, and repos never share caches.
- Resolution failures return a structured envelope instead of another repo's data:

```json
{ "error": "<code>", "project_root": "<path you passed>", "hint": "<actionable remedy>" }
```

| Error code | Meaning / remedy |
|---|---|
| `project_root_nonexistent` | The path does not exist (or is not a directory) — check the path |
| `coderef_artifacts_missing` | No `.coderef/` and auto-build not possible — run `populate-coderef <root>` first |
| `coderef_artifacts_corrupt` | `graph.json`/`index.json` failed to parse — delete `.coderef/` and rebuild |
| `coderef_artifacts_incomplete` | A build produced only one of graph/index — check populate output |
| `project_root_access_denied` | Permission denied on the root — check directory permissions |
| `project_root_symlink_loop` | Circular symlink in the path — fix the link chain |
| `project_root_symlink_broken` | Symlink points at a nonexistent target (named in the hint) |

The three `.coderef`-WRITE tools (`reindex`, `rag_index`, `map`) are likewise per-call: writes are confined to `<project_root>/.coderef/` of whichever repo the call names (CLI-parity — see the DR-002 ruling in the workorder's RESOLUTION-DESIGN.md).

`rag_index` accepts two optional throughput knobs mirroring the CLI: `concurrency` (Ollama embed worker-pool size, clamped `[1,16]`; wall-clock only, output vectors + order unchanged) and `embed_cache` (default `true`; serves byte-identical chunks from `.coderef-embed-cache.json` under the same model instead of re-embedding — additive over the file-grain incremental layer). Its response reports `embedCacheHits` / `embedCacheMisses` alongside `chunksIndexed`.

### Tools

| Tool | Question it answers |
|------|---------------------|
| `what_calls` | Which resolved call sites invoke this element? (inbound call edges, with `file:line` locations + a `confidence` tier per caller). `min_confidence` (`exact`\|`strong`\|`heuristic`\|`inferred`) keeps only callers at/above a tier |
| `what_imports` | Which modules/elements import this element? (inbound resolved import edges) |
| `impact_of` | What breaks if this changes? Transitive inbound dependents via reverse BFS (depth 1–10, default 3), with dependents-by-depth and affected files. `min_confidence` tightens the traversal to a tier floor (counts shrink monotonically as the floor rises) |
| `find_element` | Look up elements in `index.json` by name, codeRefId, or file substring; optional type filter; returns layer/capability when annotated |
| `codebase_summary` | Project totals: elements by type, header coverage, graph node/edge counts by relationship |
| `validation_status` | The 14-field locked `ValidationReport` verbatim, plus a pass/fail summary |
| `hotspots` | Which elements carry the most load? Fan-in + fan-out ranking over resolved call/import edges; `src_only` (default true) excludes test-origin edges and test-file elements |
| `cycles` | Where are the dependency cycles? Tarjan SCC over resolved call/import edges, largest first, with a sample in-cycle edge per cycle |
| `what_exports` | What does this file export? Exported elements via resolved export edges; path fragments get an ambiguity envelope |
| `map` | Emit/refresh the file-level repo map (`.coderef/map/data.json` + viewer). `format:"skeleton"` (+ optional `token_budget`, default 1600) also returns a token-budgeted, centrality-ranked plaintext repo map **inline** (`skeleton_text`) — the fastest first call for repo orientation |
| `map_metrics_delta` | Verified-refactor loop: `snapshot:true` saves the five map metric families; the diff (`before`/`after`) proves the target family improved without regressing others — a **decomposed per-family factor vector, never a composite score**. Direction labels are provenance, not verdicts. See **Metrics delta** above |
| `diff_impact` | PR blast-radius in one call: map a git diff (default working tree vs HEAD) to changed elements via index.json line ranges, then union transitive dependents |
| `tests_for_change` | Diff-to-test-selection in one call: map a git diff (default working tree vs HEAD) to changed elements, then return the TEST-FILE elements that reach them through resolved call/import edges, ranked by directness (depth 1 = direct). Absence is no-data, not "untested" |
| `ast_search` | Structural AST pattern search ripgrep can't express ("await inside a loop", "empty catch"): run a tree-sitter S-expression `query` against every `lang` source file; each match returns file+line+snippet attributed to the enclosing element's `codeRefId` so hits join the graph tools. A match is a syntactic fact, never a verdict; absence is no-data (empty / `reason:"invalid_query"` / `reason:"unsupported_language"`) |
| `type_hierarchy` | Class/interface supertypes + subtypes over the `extends`/`implements` heritage edges the pipeline populates. `direction:"up"` = ancestors (what the element extends/implements), `"down"` = descendants, `"both"` (default) = each; every hit carries depth (1 = direct) + heritage kind, attributed to a `codeRefId`. Absence is no-data (no recorded heritage edge), never "flat hierarchy"; an unresolved external supertype is returned with `resolved:false` |
| `api_diff` | Exported-API-surface diff over a snapshot baseline (breaking-changes). `snapshot:true` copies the current exports manifest (name + kind + parameter arity per exported element, keyed by `codeRefId`) to a `.coderef`-confined sidecar; a bare call diffs the `baseline` sidecar vs the current index into added / removed / signature-changed exports. Surfaces, NOT verdicts: a removed export is a CHANGE fact, never auto-"break"; no composite score. Absence = no-data (no baseline snapshot → `no_data:true`), never a false "0 breaking changes" |
| `dependency_rules` | Dependency-rules gate: check DECLARED architecture constraints (optional `.coderef/rules.json` — `forbid`/`allow` layer-pairs `{from,to}`) against the OBSERVED declared-layer edges projected from `graph.json` (`@layer` headers). Per rule: `satisfied` \| `violated` \| `not_applicable`, with the offending edges named. Surfaces, NOT verdicts: no composite architecture-health score. Absence = no-data (no `rules.json` → `no_data:true`), never a false "all rules pass". Read-only report; the CI exit-code gate lives on the `coderef-analyze --type=dependency-rules --gate` CLI (MCP only reports) |
| `docstrings` | Per-element docstring surface: the leading `/** */` JSDoc for JS/TS/JSX or the first string-literal statement for Python, attributed to a `codeRefId`, plus a coverage roll-up `{total, documented, undocumented, coverageRatio, captured_languages, elements_uncaptured_language}`. Filter by name substring (`element`) and/or `documented` true\|false. Surfaces, NOT verdicts: `coverageRatio` is provenance, not a quality grade. Absence = no-data (`hasDocstring:false` with text omitted; empty index → `no_data:true`). Capture scope is disclosed: `captured_languages` (TS/JS + Python) + `elements_uncaptured_language` count, so a `hasDocstring:false` on a Go/Rust/Java/C++ element (no capture path yet) is distinguishable from a genuinely undocumented one. Complements — does not replace — the file-grain JSDoc coverage in the docs analyzer |
| `clones` | Structural-signature duplication surface: groups elements sharing an identical signature `(kind, name, arity, sorted param-name shingle, sorted import-source set)` — computed from the index with no source re-read — into clone groups `[{signature, members:[{codeRefId,name,kind,file,line}], size}]`. Catches renamed copies, boilerplate handlers, parallel test helpers. Surfaces, NOT verdicts: a clone group is CO-LOCATION-of-shape, NOT a defect — no duplication score/grade. Absence = no-data (empty index → `no_data:true`), never a false "0 clones". Disclosure: `signature_basis` names the composing fields; `elements_without_signature` counts thin-signature (kind+name only) elements so a thin candidate is distinguishable from a richly-signatured singleton. Does NOT detect byte-level or AST-subtree near-misses (a tracked follow-up needs `endLine` + a body hash). Filter by name substring (`filter`) and/or `min_group_size` |
| `scip_resolution_delta` | What a user-provided SCIP index (from an external `scip-*` indexer) resolves that CodeRef's own tree-sitter heuristic did NOT. CodeRef's own resolution rate is ~21.58%; SCIP is compiler-grade. Returns delta rows `{codeRefId, scipSymbol, file, line, coderefStatus, scipStatus:'resolved', provenance:'scip'}` for each SCIP-resolved reference whose co-located CodeRef edge is unresolved/ambiguous/absent, plus a roll-up `{scip_documents, scip_occurrences, delta_resolved_by_scip, delta_ratio}`. OPT-IN via `scip_path`; absence = no-data (`no_data:true`, never a false "0 delta"). Surfaces, NOT verdicts: a delta is a resolution-provenance gain, not a grade. READ-ONLY: does NOT feed the resolver (the live SCIP-into-resolver wiring is a deferred deep integration needing a real `scip-typescript` index) |
| `rag_search` | Semantic code search over the RAG index; provider/store read from rag-index.json metadata so query embeddings always match the index model. Pass `expand=true` to attach each hit's 1-hop graph neighborhood (callers/callees/imports/importedBy, as signatures) inline — see **Ego-graph expansion** below |
| `symbol_context` | The consolidated **one-card-per-symbol** view: identity + header presence + 1-hop neighborhood + references + test-linkage + mtime-staleness in a single call — the understand-before-edit workflow that otherwise costs ~5 round-trips. A JOIN over existing data, not new analysis. See **Symbol context card** below |

Every tool additionally requires `project_root` (string, absolute or anchor-relative path to the target repo root) — see **Per-repo queries** above. Element queries accept a `codeRefId` (`@Fn/src/foo.ts#bar:12`), a line-less codeRefId, a bare element name, or a file path fragment (file queries aggregate over all elements in the file). Ambiguous names return up to 5 candidates instead of guessing. Only `resolved` edges are traversed — unresolved/external edges never appear in results.

Every **list-returning** tool above also accepts two shared, additive params — `response_format` and `offset` — see **Pagination & verbosity** below.

#### Confidence tiers (`min_confidence`)

Every graph edge carries a **confidence tier** — a projection of its resolution provenance onto four bands: `exact` > `strong` > `heuristic` > `inferred`. It reports **how the edge was derived, not whether it is "good"** (surfaces, not verdicts):

- **`exact`** — a fully-resolved binding, both endpoints known. Auto-apply-safe.
- **`strong`** — deterministically classified as out-of-project (builtin / external / stdlib / `import type` / dynamic import). Known-and-classified, not a guess.
- **`heuristic`** — resolved but *provisional*: bound to its single candidate while the receiver was unknown (`single_candidate_unknown_receiver`, or the field-based ACG single-candidate hit `field_based_acg`). Verify before auto-acting.
- **`inferred`** — could not be bound to a single confirmed target (unresolved / ambiguous / stale — including a *multi*-candidate `field_based_acg` ambiguous hit). Lowest provenance — `inferred` is "lower-provenance," not "wrong."

`what_calls`, `impact_of`, and `rename_preview` accept an optional `min_confidence` floor. Because these tools already traverse only `resolved` edges, the filter differentiates **within the resolved set** (`exact` vs `heuristic`) — it tightens an already-resolved traversal, it does **not** resurface unresolved edges. Omitting `min_confidence` preserves the prior (unfiltered) behavior exactly. Counts shrink monotonically as the floor rises. `rename_preview` additionally reports a `sites_by_confidence` tally and a `confidence` tier per site, so `min_confidence=exact` yields just the auto-apply-safe sites and leaves provisional single-candidate references for human review.

**Field-based (ACG) resolution — `field_based_acg` (Phase 10).** An `obj.foo()` method call on an unknown receiver (type unproven) previously dead-ended as `unresolved` / `receiver_not_in_symbol_table`. It now consults a project-wide **field/property-definition index** (covering **both** method *and* property definitions) for everything that defines the name `foo` — the Feldthaus Approximate Call Graph approximation. One same-language definition ⇒ a `resolved` edge labeled `reason=field_based_acg` + `confidence=provisional` (tier **`heuristic`**); two or more ⇒ an `ambiguous` edge with the full candidate set (tier **`inferred`**). These edges are approximate by construction and are **never `exact`** — the candidate set reports *what defines this property name in the project*, not a proof of the target (a single-element set is still an approximation). Builtin/prototype/stdlib callees (`arr.push()`, `str.split()`) still classify `builtin` first; a cross-language `.foo()` never matches. Because every ACG edge is `heuristic`/`inferred`, **`--min-confidence strong` (or `exact`) filters the whole ACG population back out** — the recall/precision dial: keep them for maximal recall, filter them for maximal precision.

#### Pagination & verbosity (`response_format`, `offset`)

Every **list-returning** tool (`what_calls`, `what_imports`, `impact_of`, `find_element`, `hotspots`, `cycles`, `what_exports`, `diff_impact`, `tests_for_change`, `what_this_calls`, `what_this_imports`, `what_this_depends_on`, `path_between`, `unresolved_edges`, `find_all_references`, `rag_search`) accepts two shared, additive params built on the existing `limit` substrate (default 25, cap 100):

- **`response_format`** (`concise` | `detailed`, default `detailed`) — a per-tool **verbosity projection**. `detailed` is today's full shape, byte-for-byte. `concise` keeps every envelope count (`total`/`returned`/`truncated`/`has_more`) and reduces each item to its **identity fields** (`id`/`name`/`file`/`line`), dropping per-item body detail (call evidence, snippets, per-depth breakdowns) for roughly a one-third token cut on a hot symbol. It is a **verbosity choice over the same known facts** — the `total`/counts are never dropped — not a filter and not a quality verdict (surfaces, not verdicts). Single-object tools (`codebase_summary`, `validation_status`, `rag_status`, `source_of`, …) are already summary-shaped, so `response_format` is a documented **no-op** there — a knob does what it says.
- **`offset`** (number, default 0) — generalized pagination. `what_calls`/`impact_of`/etc. on a high-fan-in symbol can exceed the `limit` cap; page past it with `offset`. Each paged response reports **`{ offset, limit, total, has_more }`** — `total` is always the **true pre-page count**, so an agent can tell a next page exists and never mistakes a capped window for the whole set (no silent truncation). Absent `offset` returns the first page exactly as before. (`unresolved_edges` already exposed `offset`; it now shares one pagination implementation with every other list tool.)

Both default to the pre-existing behavior, so an omitting caller sees the unchanged first-page/full-shape response.

#### Ego-graph expansion (`rag_search --expand`, `pack_context --include_callers`)

The retriever and the graph don't talk at query time, so an agent that searches then spends 4–6 follow-up calls (`what_calls`, `what_this_calls`, `source_of`) fetching the neighborhood of every hit the graph already knows. Ego-graph expansion collapses that: **the search returns its own 1-hop graph neighborhood inline, as signatures (not bodies).**

- **`rag_search` with `expand=true`** — each hit gains a `neighbors` object: `{ resolved, callers, callees, imports, importedBy }`. Each direction is `{ neighbors: [...node summaries with a confidence tier], total, truncated }`, capped by `neighbor_limit` (default 10, excess declared via `truncated` + true `total`). A hit whose `coderefId` is not a graph node reports `neighbors.resolved=false` — **absence is no-data, not "isolated."** `expand` omitted → bare hits, byte-unchanged. The embedding/index path is untouched.
- **`pack_context` with `include_callers=true`** — the default bundle is the focus + its outbound dependency closure (what it calls); this also packs the focus's **inbound 1-hop callers** (who calls it), signature-compressed, ahead of the deps — the "understand-before-edit" view. Default off → bundle byte-unchanged.

Directions map 1:1 onto the neighbor edges: `callers`=inbound call, `callees`=outbound call, `imports`=outbound import, `importedBy`=inbound import. Neighbors are **resolved-graph** neighbors (the query index is resolved-only) and carry the Phase 3 `confidence` tier — provenance (how the graph knows the neighbor), not a verdict. Off-MCP, the ego-graph is the same 1-hop neighborhood the `what_calls`/`what_this_calls`/`what_imports`/`what_this_imports` tools return individually.

#### Symbol context card (`symbol_context`)

Understanding a symbol before editing it — its signature, whether it has a semantic header, who calls it, what it calls, whether a test touches it, and whether the index is still fresh for it — otherwise costs ~5 separate calls (`find_element` + `source_of` + `what_calls` + `what_this_calls` + `what_imports`). `symbol_context` returns all of it as **one card**:

- **`identity`** — `{ id, name, type, file, line }` (the same grade as `find_element`).
- **`header`** — `{ status, exported, layer?, capability? }` from `index.json`. `status: "missing"` means no semantic header was authored — **no-data, not an error**.
- **`neighborhood`** — the 1-hop ego-graph `{ resolved, callers, callees, imports, importedBy }` (signatures + confidence tiers, each direction capped by `cap`). `resolved: false` = no resolved edges recorded — **absence is no-data, not "unused."**
- **`references`** — `{ call_site_count, import_site_count, total, sample, truncated }`. Counts (+ a bounded sample) so the card stays a card; drill to `find_all_references` for the full site list.
- **`test_linkage`** — `{ test_ref_count, sample, truncated }`: the subset of inbound refs whose source file is a test file. A count of who-tests-this, **never a coverage verdict** — `0` is "no test-file ref recorded."
- **`staleness`** — `{ stale, basis: "element-file-mtime-vs-graph", note? }`. `stale: true` means the element's file is newer than `graph.json`, so this card **may** predate a recent edit. This is a cheap **per-symbol mtime heuristic**, deliberately **not** the authoritative scan-time hash-manifest freshness contract — that is the repo-wide **`staleness` block** now attached to every response (see **Staleness contract** below).

Flags: **`include_source`** (opt-in) attaches a bounded signature/body slice like `source_of`; **`cap`** (default 25, cap 100) bounds each facet; **`response_format`** honors the concise/detailed axis (concise drops the source slice + signals verbosity, all counts preserved). `symbol_context` is a **single-symbol** tool — a whole-file query or a name matching >1 element returns the standard ambiguity envelope (narrow to a `codeRefId`). It is a JOIN over data the other tools already expose — no new analysis, deterministic, additive; the other 25 tools are byte-unchanged.

#### Staleness contract (`staleness` block on every response)

The worst failure mode of a precomputed index is confident action on **stale** structure: you read a card, edit the file, re-query — and the graph still reflects the pre-edit structure. To close that gap, **every read response carries an additive `staleness` block** reporting whether any source file has changed since `graph.json` was built:

```json
"staleness": { "stale": true, "stale_count": 2,
  "stale_files_sample": ["src/foo.ts", "src/bar.ts"],
  "basis": "scan-time-hash-manifest",
  "hint": "Source files changed since the graph was built — run the `reindex` tool ..." }
```

- **`basis: "scan-time-hash-manifest"`** — authoritative. At build time `populate`/`reindex` writes `.coderef/manifest.json` (one sha256 per source file) alongside `graph.json`. At query time the checker uses an mtime/size **fast-path** (a file whose size + mtime match the manifest is assumed fresh — the steady-state re-hashes **zero** files) and re-hashes only the suspects. So a file that was merely **touched** (mtime bumped) but is byte-identical — e.g. a `git checkout` that restores identical content — is correctly **not** stale (the exact false-positive a pure mtime heuristic gets wrong).
- **`basis: "manifest-absent"`** — degraded. A pre-manifest `.coderef/` (built before this contract) falls back to the coarse newest-source-mtime-vs-`graph.json` signal; `stale_count` is `1` ("something is newer") and no file can be named. Run `reindex` once to write a manifest and get authoritative answers.
- **Fresh** responses carry the compact `{ stale: false, stale_count: 0, basis }`. **Surfaces-not-verdicts:** `stale_count: 0` means "no source file differs from the manifest," **not** "the graph is correct." The block is best-effort — a freshness-check failure omits the block rather than breaking the tool, and it is never attached to an error envelope.

### Registration (Claude Code)

`.mcp.json` at the repo root registers the server under the domain name `coderef-core`:

```json
{
  "mcpServers": {
    "coderef-core": {
      "command": "node",
      "args": [
        "<repo>/dist/src/cli/coderef-mcp-server.js",
        "--project-dir", "<default-anchor>"
      ]
    }
  }
}
```

The `--project-dir` launcher arg is optional and acts only as a **default anchor** for relative `project_root` paths — every tool invocation names its own repo via the required `project_root` argument; there is no default repo.

### Prerequisites

- `.coderef/graph.json` and `.coderef/index.json` present — run the pipeline (`populate-coderef` or `coderef-pipeline`) first.
- `.coderef/validation-report.json` for `validation_status` (the tool degrades gracefully with `error: 'validation_report_missing'` if absent).
- Artifacts are cached with mtime invalidation — re-running the pipeline is picked up automatically without restarting the server.

---

## scan-frontend-calls

Detect and analyze frontend API calls.

### Usage

```bash
npx scan-frontend-calls --dir ./src --pattern "fetch|axios"
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-d, --dir <path>` | Directory to scan | Current directory |
| `-p, --pattern <regex>` | Call pattern to match | `fetch\|axios\|http` |
| `--output <path>` | Output file | stdout |
| `--group-by <field>` | Group results by file/route | `file` |
| `-v, --verbose` | Verbose output | `false` |

### Examples

```bash
# Scan for all API calls
npx scan-frontend-calls --dir ./src

# Custom pattern
npx scan-frontend-calls --dir ./src --pattern "api\.get|api\.post"

# Output to file
npx scan-frontend-calls --dir ./src --output ./api-calls.json

# Group by API route
npx scan-frontend-calls --dir ./src --group-by route
```

### Output Format

```json
{
  "calls": [
    {
      "file": "src/services/user.ts",
      "line": 45,
      "pattern": "fetch",
      "target": "/api/users",
      "method": "GET",
      "context": "fetch('/api/users')"
    }
  ],
  "summary": {
    "totalCalls": 23,
    "uniqueEndpoints": 8
  }
}
```

---

## validate-routes

Validate API route definitions for consistency and correctness.

### Usage

```bash
npx validate-routes --dir ./src --strict
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-d, --dir <path>` | Directory to scan | Current directory |
| `--strict` | Strict validation mode | `false` |
| `--fix` | Auto-fix issues where possible | `false` |
| `--include <patterns>` | Include patterns | All files |
| `--exclude <patterns>` | Exclude patterns | `node_modules,tests` |
| `--output <path>` | Report output | stdout |

### Examples

```bash
# Basic validation
npx validate-routes --dir ./src

# Strict mode
npx validate-routes --dir ./src --strict

# Auto-fix issues
npx validate-routes --dir ./src --fix

# Output report
npx validate-routes --dir ./src --output ./route-report.json
```

### Validation Rules

- Route path format consistency
- HTTP method validation
- Parameter naming conventions
- Duplicate route detection
- Missing handler detection

### Output

```
Route Validation Report
======================
✓ Valid routes: 42
⚠ Warnings: 3
✗ Errors: 1

Errors:
  - src/routes/user.ts:23: Duplicate route '/api/users/:id'
```

---

## detect-languages

Detect programming languages used in a project.

### Usage

```bash
npx detect-languages --dir ./src --json
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-d, --dir <path>` | Directory to scan | Current directory |
| `--json` | Output as JSON | `false` |
| `--threshold <percent>` | Minimum percentage to include | `1` |
| `--exclude <patterns>` | Exclude patterns | `node_modules,dist` |

### Examples

```bash
# Basic detection
npx detect-languages --dir ./src

# JSON output
npx detect-languages --dir ./src --json

# Higher threshold
npx detect-languages --dir ./src --threshold 5
```

### Output

```
Language Detection Results
===========================
TypeScript: 68.5% (342 files)
JavaScript: 15.2% (76 files)
Python: 8.3% (42 files)
CSS: 5.4% (27 files)
JSON: 2.6% (13 files)
```

JSON format:
```json
{
  "languages": [
    { "name": "TypeScript", "percentage": 68.5, "files": 342 },
    { "name": "JavaScript", "percentage": 15.2, "files": 76 }
  ],
  "totalFiles": 500
}
```

---

## coderef-analyze

Run a single analysis pass on a project. Supports 13 analysis types covering configuration, contracts, database patterns, dependencies, design patterns, documentation, middleware, dependency graphs, complexity scoring, blast-radius simulation, multi-hop traversal, breaking-change detection, and diff-to-test-selection.

### Usage

```bash
coderef-analyze --project=<path> --type=<type> [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--project=<path>` | Path to the project root (**required**) | — |
| `--type=<type>` | Analysis type (**required**; see table below) | — |
| `--output=<fmt>` | Output format: `json` \| `text` | `text` |
| `--element=<id>` | Target element ID (required for: `impact`, `multi-hop`, `type-hierarchy`) | — |
| `--depth=<N>` | Max traversal depth (used by: `impact`, `multi-hop`, `type-hierarchy`) | `5` |
| `--direction=<up\|down\|both>` | Heritage walk direction (used by: `type-hierarchy`) | `both` |
| `--from=<label>` | Baseline manifest snapshot label or `.json` path (used by: `breaking-changes`) | `baseline` |
| `--to=<label>` | Snapshot the CURRENT exports under this label instead of diffing (used by: `breaking-changes`) | — |
| `--ref=<ref>` | Git ref to diff against (used by: `tests-for-change`) | `HEAD` |
| `--lang=<ext>` | Source language extension (required for: `ast-search`; `ts`,`tsx`,`js`,`jsx`,`py`,`go`,`rs`,`java`,`cpp`,`cc`,`cxx`,`c++`,`c`,`h`) | — |
| `--query=<s-expr>` | tree-sitter S-expression query (required for: `ast-search`) | — |
| `--limit=<N>` | Max results (used by: `ast-search`) | `100` |
| `--gate` | Exit `2` on any dependency-rule violation (used by: `dependency-rules`; CI gate). Default is report-only (exit `0`) | — |
| `--help` | Print help | — |

### Analysis types

| Type | Description | Required extras |
|------|-------------|-----------------|
| `config` | Detect project configuration (tsconfig, package.json, Docker, env) | — |
| `contract` | Detect API contracts (OpenAPI, GraphQL, Protobuf, JSON Schema) | — |
| `db` | Detect database patterns (ORM, raw queries, migrations) | — |
| `dependency` | Analyze npm dependency health (outdated, missing, unused) | — |
| `pattern` | Detect design patterns (Singleton, Observer, Factory, etc.) | — |
| `docs` | Analyze documentation coverage and quality | — |
| `middleware` | Detect middleware chains and DI containers | — |
| `graph` | Build and print the full dependency graph | — |
| `complexity` | Score element complexity (requires project scan) | — |
| `impact` | Simulate blast radius for a changed element | `--element` |
| `multi-hop` | Traverse multi-hop relationships | `--element` |
| `breaking-changes` | Exported-API-surface diff over a snapshot baseline: `--to=<label>` snapshots the current exports; a later `--from=<label>` (default `baseline`) diffs into added / removed / signature-changed exports. Surfaces, NOT verdicts (a removed export is a change fact, never auto-"break"; no composite score); no baseline = no-data, never a false "0 breaking changes". | `--from`, `--to` |
| `tests-for-change` | Diff-to-test-selection: which test-file elements reach the diff through resolved call/import edges, ranked by directness (depth 1 = direct). Absence is no-data, not "untested". | `--ref` (default `HEAD`) |
| `ast-search` | Structural AST pattern search: run a tree-sitter S-expression `--query` against every `--lang` file; each match returns file+line+snippet attributed to the enclosing element's `codeRefId`. A match is a syntactic fact, never a verdict; absence is no-data. Malformed query → `reason:"invalid_query"`. | `--lang`, `--query`, `--limit` |
| `type-hierarchy` | Class/interface supertypes + subtypes over the `extends`/`implements` heritage edges the pipeline populates. `--direction=up` = ancestors (what the element extends/implements), `down` = descendants, `both` (default) = each; every hit carries its depth (1 = direct) + heritage kind. Absence is no-data (no recorded heritage edge), never "flat hierarchy"; an unresolved external supertype is returned with `resolved:false`. | `--element` (opt: `--direction`, `--depth`) |
| `dependency-rules` | Dependency-rules gate: check DECLARED architecture constraints (optional `.coderef/rules.json` — `forbid`/`allow` layer-pairs) against the OBSERVED declared-layer edges in `graph.json`. Per rule: `satisfied` \| `violated` \| `not_applicable`, with the offending edges named. Surfaces, NOT verdicts (no composite health score); no `rules.json` = no-data, never a false "all rules pass". With `--gate`, exit `2` on any violation (CI gate); default exit `0` (report-only). | `--gate` (opt) |
| `docstrings` | Per-element docstring surface: the leading `/** */` JSDoc for JS/TS/JSX or the first string-literal statement for Python, attributed to a `codeRefId`, plus a coverage roll-up `{total, documented, undocumented, coverageRatio, captured_languages, elements_uncaptured_language}`. Surfaces, NOT verdicts: `coverageRatio` is provenance, not a quality grade. Absence = no-data (`hasDocstring:false`; empty index → `no_data:true`). Capture scope disclosed via `captured_languages`/`elements_uncaptured_language` so an uncaptured-language (Go/Rust/Java/C++) `hasDocstring:false` isn't a silent false-negative. Complements the file-grain JSDoc coverage in `--type=docs`. | opt: `--element` (name filter), `--documented`/`--undocumented`, `--limit`, `--offset` |
| `clones` | Structural-signature duplication surface: groups elements sharing `(kind, name, arity, sorted param-name shingle, sorted import-source set)` into clone groups — computed from the index, no source re-read. Catches renamed copies + boilerplate. Surfaces, NOT verdicts: co-location-of-shape, NOT a defect (no duplication score). Absence = no-data (empty index → `no_data:true`). `signature_basis` + `elements_without_signature` disclose the basis + thin-signature elements. Does NOT catch byte-level/AST near-misses (follow-up needs `endLine` + body hash). Requires `--output=json` for parseable output. | opt: `--element` (name filter), `--min-group-size`, `--limit`, `--offset` |
| `scip-resolution-delta` | What a user-provided SCIP index resolves that CodeRef did NOT (CodeRef's own resolution rate is ~21.58%; SCIP is compiler-grade). Delta rows for each SCIP-resolved reference whose co-located CodeRef edge is unresolved/ambiguous/absent + a `{delta_resolved_by_scip, delta_ratio}` roll-up. OPT-IN via `--scip=<.scip path>`; absence = no-data (`no_data:true`, never a false "0 delta"). Surfaces, NOT verdicts (resolution-provenance gain, no score). READ-ONLY — does NOT feed the resolver (live SCIP-into-resolver wiring is a deferred deep integration). Requires `--output=json`. | opt: `--scip=<path>`, `--limit`, `--offset` |

### Examples

```bash
# Detect project configuration
coderef-analyze --project=. --type=config

# Detect API contracts (JSON output)
coderef-analyze --project=. --type=contract --output=json

# Analyze npm dependency health
coderef-analyze --project=. --type=dependency

# Score complexity across all elements
coderef-analyze --project=. --type=complexity --output=json

# Blast-radius simulation for a specific element
coderef-analyze --project=. --type=impact --element="src/scanner.ts"

# Multi-hop traversal (custom depth)
coderef-analyze --project=. --type=multi-hop --element="src/scanner.ts" --depth=3

# Snapshot the current exported API surface as a baseline...
coderef-analyze --project=. --type=breaking-changes --to=baseline
# ...change the API, then diff against that baseline (added/removed/signature-changed exports)
coderef-analyze --project=. --type=breaking-changes --from=baseline --output=json

# Which tests exercise my current (uncommitted) edits?
coderef-analyze --project=. --type=tests-for-change --output=json

# Which tests exercise the diff since a branch point?
coderef-analyze --project=. --type=tests-for-change --ref=main --output=json

# Structural search: every `await` that sits inside a loop body (a shape ripgrep can't match)
coderef-analyze --project=. --type=ast-search --lang=ts \
  --query='(for_statement body: (_ (await_expression)))' --output=json

# Type hierarchy: what does a class extend/implement, and what extends/implements it?
coderef-analyze --project=. --type=type-hierarchy --element="JsonVectorStore" --direction=both --output=json
```

The `ast-search` result envelope carries not-searched visibility so absence is
never ambiguous: `files_searched` (files handed to the query), `files_skipped_no_index`
(on-disk files of `--lang` that carry no index element and were therefore never
searched — re-run `populate-coderef` to index them), and `files_skipped_unreadable`
(indexed files that could not be read at search time). A `total_matches` of `0`
with a non-zero `files_skipped_no_index` means "not fully searched", not "shape
absent". The same three fields appear on the `ast_search` MCP tool response.

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Analysis error or unhandled exception |
| `1` | `--project` missing, `--type` invalid, or type-specific required flag missing (`--element`, `--from`) |

---

## coderef-query

Execute a relationship query over the canonical `.coderef/graph.json`. Requires the populate pipeline to have run first (the query engine reads the pipeline-emitted graph; there is no in-memory analysis pass). Reimplemented on the canonical graph per DR-PHASE-5-C (WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 2).

### Usage

```bash
coderef-query --project=<path> --type=<type> --target=<element> [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--project=<path>` | Path to the project root — must contain `.coderef/graph.json` (**required**) | — |
| `--type=<type>` | Query type (**required**; see table below) | — |
| `--target=<element>` | Target element: a codeRefId, an element name, or a file path (**required**) | — |
| `--source=<element>` | Source element for path queries (required for: `shortest-path`, `all-paths`) | — |
| `--depth=<N>` | Max traversal depth | `5` |
| `--format=<fmt>` | Result format: `raw` \| `summary` \| `full` | `summary` |
| `--patterns=<globs>` | DEPRECATED — accepted but ignored (queries read the populate-emitted graph) | — |
| `--help` | Print help | — |

### Query types

Direction contract: the `-me` suffix means the target is the OBJECT (inbound edges — "who Xes the target"); bare forms answer for the target as SUBJECT (outbound — "what does the target X").

| Type | Description | Required extras |
|------|-------------|-----------------|
| `what-calls-me` | Who calls the target? (inbound call edges) | — |
| `what-calls` | What does the target call? (outbound call edges) | — |
| `what-imports-me` | Who imports the target? (inbound import edges) | — |
| `what-imports` | What does the target import? (outbound import edges) | — |
| `what-depends-on-me` | Who depends on the target, transitively? (inbound call+import) | — |
| `what-depends-on` | What does the target depend on, transitively? (outbound call+import) | — |
| `shortest-path` | Shortest directed path from `--source` to `--target` | `--source` |
| `all-paths` | All directed paths from `--source` to `--target` (bounded by `--depth`) | `--source` |

### Examples

```bash
# What calls a specific file?
coderef-query --project=. --type=what-calls --target="src/scanner.ts"

# What does a file import?
coderef-query --project=. --type=what-imports --target="src/cli/index.ts"

# What depends on a given module?
coderef-query --project=. --type=what-depends-on-me --target="src/utils/path-utils.ts"

# Shortest dependency path between two elements
coderef-query --project=. --type=shortest-path --source="src/cli/index.ts" --target="src/scanner.ts"

# All paths (full format, deeper traversal)
coderef-query --project=. --type=all-paths --source="src/cli/index.ts" --target="src/scanner.ts" --depth=8 --format=full
```

### Output format

All query types emit JSON to stdout:

```json
{
  "type": "what-calls-me",
  "target": "src/scanner.ts",
  "results": ["src/cli/coderef-scan.ts", "src/integration/indexing-orchestrator.ts"],
  "format": "summary"
}
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Query error, missing required flag, or invalid `--type` |

---

## coderef-detect-languages

Detect the programming languages used in a project by scanning file extensions. Returns a list of detected language names. Uses `.coderefignore` (if present) to exclude directories.

### Usage

```bash
coderef-detect-languages --project=<path> [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--project=<path>` | Path to the project root (**required**) | — |
| `--ignore-file=<path>` | Path to ignore file | `.coderefignore` |
| `--json` | Output as JSON array instead of line-by-line | `false` |
| `--help` | Print help | — |

### Examples

```bash
# Detect languages in the current directory
coderef-detect-languages --project=.

# JSON output
coderef-detect-languages --project=/path/to/project --json

# Custom ignore file
coderef-detect-languages --project=. --ignore-file=.myignore
```

### Output

Line-by-line (default):
```
TypeScript
JavaScript
Python
```

JSON (`--json`):
```json
["TypeScript", "JavaScript", "Python"]
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success (including "no languages detected") |
| `1` | Error scanning directory or reading ignore file |
| `1` | `--project` not provided |

---

## coderef-semantic-integration

Run semantic header generation, LLM enrichment, and registry synchronization across a project. Reads `.coderef/index.json` as input and writes semantic headers into source files and updates `registry/entities.json`.

### Usage

```bash
coderef-semantic-integration --project=<path> [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--project=<path>` | Path to the project root (**required**) | — |
| `--output=<path>` | Output directory for generated artifacts | `<project>/.coderef` |
| `--registry=<path>` | Path to registry file | `<project>/.coderef/registry/entities.json` |
| `--dry-run` | Preview changes without writing files | `false` |
| `--no-headers` | Skip header generation | `false` |
| `--no-sync-registry` | Skip registry sync | `false` |
| `--file=<path>` | Process a single file instead of the whole project | — |
| `--validate-idempotency` | Run twice and verify identical results | `false` |
| `--help` | Print help | — |

### Examples

```bash
# Full integration pass on the current project
coderef-semantic-integration --project=.

# Dry-run preview (no files written)
coderef-semantic-integration --project=. --dry-run

# Process a single file only
coderef-semantic-integration --project=. --file=src/scanner.ts

# Verify that two consecutive runs produce identical output
coderef-semantic-integration --project=. --validate-idempotency

# Registry sync only (skip header write)
coderef-semantic-integration --project=. --no-headers
```

### Output

On success:
```
Done: 42 files processed, 38 headers generated, 35 entries enriched, 42 registry entries updated
```

With `--dry-run`:
```
[dry-run] Would write 42 file(s), 183204 bytes
  src/scanner.ts
  src/cli/index.ts
  ...
```

With `--validate-idempotency`:
```
Idempotency check: PASS
First run:  { "filesProcessed": 42, ... }
Second run: { "filesProcessed": 42, ... }
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Integration error, `--project` missing, or idempotency check FAIL |

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CODEREF_CACHE_DIR` | Cache directory location | `.coderef/cache` |
| `CHROMA_URL` | ChromaDB server URL | `http://localhost:8000` |
| `OLLAMA_URL` | Ollama server URL | `http://localhost:11434` |
| `CODEREF_VERBOSE` | Enable verbose logging | `false` |
| `CODEREF_PARALLEL` | Enable parallel processing | `false` |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error |
| `2` | Invalid arguments |
| `3` | File not found |
| `4` | Network error (RAG commands) |
| `5` | Validation failed |

---

## Troubleshooting

### Command not found

```bash
# Ensure CLI is built
npm run build:cli

# Or use npx
npx @coderef/core <command>
```

### ChromaDB connection failed

```bash
# Start ChromaDB locally
docker run -p 8000:8000 chromadb/chroma:latest

# Or specify remote URL
export CHROMA_URL=https://chroma.example.com
```

### Ollama connection failed

```bash
# Start Ollama locally
ollama serve

# Pull embedding model
ollama pull nomic-embed-text
```

### Performance issues

```bash
# Use parallel mode for large codebases
npx coderef-scan --dir ./src --parallel

# Skip expensive operations
npx coderef-populate --skip-graph --skip-reports

# Use incremental cache
npx coderef-scan --cache
```

---

## Contributing

To add a new CLI command:

1. Create `src/cli/<command-name>.ts`
2. Implement command using `Command` from `commander`
3. Export command factory function
4. Register in `src/cli/index.ts`
5. Add tests in `__tests__/<command-name>.test.ts`
6. Document in this file

---

## See Also

- [Scanner Implementation](../coderef/reference/SCANNER-IMPLEMENTATION-REFERENCE.md)
- [RAG System](../coderef/resource/RAG-SYSTEM.md)
- [API Reference](./API.md)

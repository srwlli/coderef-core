# Phase 1 Baseline — WO-UNIFIED-CODEREF-PIPELINE-001

Date: 2026-04-24
Scope: read-only surface inventory before any code change.

## P1-001: CLI bin inventory (src/cli/)

Entries under `src/cli/`:

| File                      | package.json bin      | Role                                  |
|---------------------------|-----------------------|----------------------------------------|
| scan.ts                   | `coderef-scan`        | Scan a project tree for elements       |
| populate.ts               | `populate-coderef`    | Generate all `.coderef/` artifacts     |
| rag-index.ts              | `rag-index`           | Build RAG vector index                 |
| rag-search.ts             | `rag-search`          | Query RAG index                        |
| rag-status.ts             | `rag-status`          | Report RAG index status                |
| validate-routes.ts        | `validate-routes`     | Route validation (not in pipeline scope)|
| scan-frontend-calls.ts    | `scan-frontend-calls` | Frontend call inventory                |
| detect-languages.ts       | (helper)              | Language auto-detect used by CLIs      |

All CLIs use standalone argv parsing (no Commander.js). Every CLI accepts a project_path positional. The unified `coderef-pipeline` CLI in Phase 5 will invoke these as child processes or import their exported `main` functions — prefer imports to avoid Node spawn overhead.

## P1-002: scripts/doc-gen/ — PROJECT_ROOT hardcode

`scripts/doc-gen/utils.js`:

```js
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const CODREF_DIR = path.join(PROJECT_ROOT, '.coderef');
const FOUNDATION_DOCS_DIR = path.join(PROJECT_ROOT, 'coderef', 'foundation-docs');
```

`__dirname` of utils.js resolves to `{coderef-core-repo}/scripts/doc-gen`, so `..` twice lands in the repo root. `PROJECT_ROOT` is therefore permanently pinned to the coderef-core repo itself and cannot target external projects. This is the root cause of the LLOYD pollution incident logged in the scanner WO close (foundation docs generated on LLOYD land in coderef-core's tree).

All downstream scripts import `utils.js` helpers:
- `readCoderefFile(filename)` — reads from `CODREF_DIR`
- `writeFoundationDoc(filename, content)` — writes to `FOUNDATION_DOCS_DIR`
- `ensureFoundationDocsDir()` — mkdir on `FOUNDATION_DOCS_DIR`

Generate scripts: `generate-exports-md.js`, `generate-hotspots-md.js`, `generate-index-md.js`, `generate-relationships-md.js`, `enhance-existing-docs.js`, `validate-docs.js`. All use `utils.js` helpers → fixing utils.js + adding `--project-dir` flag propagation covers everything downstream.

**Phase 2 plan remains valid.**

## P1-003: drift detector (src/pipeline/generators/drift-generator.ts)

Currently computes drift as:
1. Load current scan elements (in memory, from `state.elements`)
2. Load previous index from `outputDir/index.json`
3. Build maps by id = `{file}:{name}:{line}`
4. Compare elements by `type`, `exported`, `parameters` (JSON.stringify), `returnType`
5. Return percentage = (added + deleted + modified) / max(current, previous)

**Observed bug:** on a freshly-populated repo, `driftPercentage=18`, 371 modified (all `parameters changed`), 0 added/deleted. Root cause: the "previous index" loaded from `outputDir/index.json` was written by a prior run with a different parameter extraction format. The current run's parameter strings don't match the stored ones even for identical functions. The drift calculation is correct given its inputs, but the inputs are schema-skewed across runs.

**Real bug classes:**
1. Comparing fresh in-memory state against a potentially-stale on-disk index written by an older code version.
2. No consideration of file mtime — drift reports changes for files that haven't been touched since the last index.
3. No schema version check — any serialization format change causes phantom "modified" on every element.

**Phase 3 strategy (revised):** Replace element-by-element comparison with a two-tier mtime-based check:
- Tier 1: `.coderef/index.json.generatedAt` vs `fs.statSync(file).mtime` for every file in the index. If the file's mtime > index.generatedAt, it is "stale".
- Tier 2: staleFiles / totalFiles → driftPercentage. Simple, deterministic, version-skew-immune.
- Keep the `added/deleted/modified` output contract but derive from file-level mtime rather than element-level JSON diff. This loses per-element resolution but eliminates the false-positive class that blocks /create-workorder today.

## P1-004: RAG provider wiring (src/integration/rag/rag-config.ts)

Supported LLM providers: `openai`, `anthropic`, plus a generic path for any other provider name (used for Ollama via `CODEREF_LLM_BASE_URL` + `CODEREF_LLM_API_KEY` + `CODEREF_LLM_MODEL`).

**Cloud-fallback paths that violate the local-only constraint:**

1. **getLLMProvider() auto-selection (lines 165–186):**
   - If `CODEREF_LLM_PROVIDER` is unset, falls back to `'openai'` when `OPENAI_API_KEY` is in env, then `'anthropic'` when `ANTHROPIC_API_KEY` is in env. This is the classic "silent cloud substitution" case — a user with an old OPENAI_API_KEY in their shell will unintentionally call OpenAI even if they intended Ollama.

2. **getLLMConfig() for 'openai' / 'anthropic' (lines 192–225):**
   - Both providers are still first-class citizens. No guard rails preventing their use in an indexing pipeline that the user expects to be local-only.

**Phase 4 plan (revised for precision):**
- Introduce a new env flag: `CODEREF_RAG_LOCAL_ONLY` (bool, default false for backward compat). When true:
  - `getLLMProvider()` must resolve to `'ollama'` (or a generic provider with `CODEREF_LLM_BASE_URL` pointing at localhost), else throw `ConfigError('RAG local-only mode: provider must be Ollama.')`.
  - Never auto-select 'openai' or 'anthropic' regardless of which API keys are in env.
- The new unified `coderef-pipeline` CLI (Phase 5) sets this flag unconditionally before invoking rag-index.
- Users who want cloud RAG can still invoke `rag-index` directly without the flag.

This is narrower than "rip out OpenAI entirely" — it preserves the existing multi-provider surface for direct CLI users while guaranteeing the unified pipeline stays local.

## Summary

- CLI inventory: 7 bins, uniform argv pattern. Orchestrator in Phase 5 will chain them by imports.
- doc-gen: `utils.js` hardcoded PROJECT_ROOT is the single fix point. 6 downstream generators all depend on its helpers. Propagation is narrow.
- drift: current algorithm is element-diff + JSON.stringify; root bug is schema-skew across runs, not mtime. Phase 3 mtime-based redesign is still the right fix but for a different reason than originally framed.
- RAG: local-only is achievable via a new env flag + hard fail on cloud auto-selection, set unconditionally by the new unified pipeline. No wholesale removal needed.

## Phase-plan adjustments applied

- **ADJ-002:** Phase 3 rationale updated (schema-skew, not stale mtime, is the root cause of 18% false-positive drift). Algorithm design unchanged.
- **ADJ-003:** Phase 4 narrowed from "remove OpenAI fallback" to "add CODEREF_RAG_LOCAL_ONLY flag that rejects cloud providers; unified pipeline sets it unconditionally."

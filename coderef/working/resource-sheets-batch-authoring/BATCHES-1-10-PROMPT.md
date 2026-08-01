# Batches 1–10 — the remaining 48 CODEREF-CORE resource sheets

Batch 0 passed. Same contract, same standard, 48 files left. Work **one batch of 5 at a
time**, in the order given, and report each batch's checker output before starting the next.

Everything you did on the batch-0 remediation carries forward unchanged. The three things
that made those sheets pass — every export listed, anchors only on element declaration lines,
bare refs everywhere else — are the whole job.

**Repo root:** `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE`
**Write to:** `coderef/resource-sheets/<stem>-RESOURCE-SHEET.md`

---

## The gate — run it, don't estimate it

```bash
node "C:/Users/willh/Desktop/CODEREF/ASSISTANT/SKILLS/DOCUMENTATION/generate-resource-sheet/check-sheet-drift.mjs" \
  --sheet="C:/Users/willh/Desktop/CODEREF/CODEREF-CORE/coderef/resource-sheets/<stem>-RESOURCE-SHEET.md" \
  --project-root="C:/Users/willh/Desktop/CODEREF/CODEREF-CORE"
```

A batch is done when all five exit PASS on both `drift.api-complete` and `drift.line-anchors`.
Read-only. Run it as you go rather than at the end.

**Run this BEFORE writing each sheet.** It projects the file's factual spine straight from
`.coderef/index.json` — the same source the drift checker grades against:

```bash
node "C:/Users/willh/Desktop/CODEREF/ASSISTANT/SKILLS/DOCUMENTATION/generate-resource-sheet/project-spine.mjs" \
  --module=src/pipeline/import-resolver.ts \
  --project-root="C:/Users/willh/Desktop/CODEREF/CODEREF-CORE" --json
```

For every export it returns `name`, `type`, `line`, `codeRefId`, and a **pre-formatted `ref`
string** — e.g. `"[ref](src/cli/mcp-response-format.ts:42)"`. Those ref strings are the
complete set of legal anchors for that file. Paste them; do not retype the line numbers.
It also reports `stale: true` if the index is older than the source, which means stop and
say so rather than authoring against a stale spine.

This is the tool that would have prevented every line-anchor failure in batch 0. Use it on
each file before you write a word.

---

## Frontmatter

Identical to batch 0. `agent: Codex`, `date: 2026-08-01`, `task: STUB-CC9094`,
`parent_project: coderef-core`, `version: 1.0.0`, `status: draft`, `subject` = the stem,
`documents:` = the source path exactly as written in the tables below, `related_files:` = the
same single path, `category` = as assigned.

## Sections

The same eight `##` headings in the same order. Source of Truth stays an authority statement —
what is canonical, where state lives, what backs it, and an explicit `NONE` when nothing does.

## What earned batch 0 its pass

Keep doing these; they are why the sheets are worth having:

- **Findings that come from reading, not from the filename.** The `resolved-heritage` evidence
  cast through `unknown` against a union that has no such variant; `exportedAt: Date.now()`
  making the return value time-dependent while the body is deterministic; detailed-mode
  `shapeResponse` returning the caller's own envelope by reference. Those are real and were
  verified.
- **Naming what does not exist.** "Direct unit cases for `parseNextJsPagesRoute`,
  `parseSvelteKitRoute`, `parseNuxtRoute`, `parseRemixRoute`: **NONE found**" is more useful
  than silence. Say `NONE` explicitly.
- **Marking inference and keeping it checkable.** An `[inference]` marker is not a licence to
  guess — the retracted Remix bullet was marked and still wrong. If an inference is about
  control flow, trace it before writing it.

## Sheet length tracks the source

`coderef-id.ts` is 61 lines and `context-generator.ts` is 2,284. The first should produce a
short sheet. Do not pad a small file to look like a large one; batch 0 got this right and it
should stay that way.

---

## Batch 1

| Source | Lines | `category` | Stem |
|---|---|---|---|
| `src/cli/mcp/graph-tools.ts` | 819 | `CLI` | `graph_tools` |
| `src/analyzer/js-call-detector/index.ts` | 271 | `module` | `js_call_detector` |
| `src/utils/coderef-id.ts` | 61 | `module` | `coderef_id` |
| `src/pipeline/import-resolver.ts` | 977 | `module` | `import_resolver` |
| `src/pipeline/extractors/element-extractor.ts` | 939 | `module` | `element_extractor` |

## Batch 2

| Source | Lines | `category` | Stem |
|---|---|---|---|
| `src/validator/migration-mapper.ts` | 729 | `module` | `migration_mapper` |
| `src/cli/populate.ts` | 880 | `CLI` | `populate` |
| `src/indexer/index-store.ts` | 397 | `module` | `index_store` |
| `src/pipeline/edge-confidence.ts` | 203 | `module` | `edge_confidence` |
| `src/pipeline/element-taxonomy.ts` | 133 | `module` | `element_taxonomy` |

## Batch 3

| Source | Lines | `category` | Stem |
|---|---|---|---|
| `src/pipeline/generators/context-generator.ts` | 2284 | `module` | `context_generator` |
| `src/context/breaking-change-detector/index.ts` | 251 | `module` | `breaking_change_detector` |
| `src/scanner/framework-registry.ts` | 120 | `module` | `framework_registry` |
| `src/analyzer/ast-element-scanner.ts` | 515 | `parser` | `ast_element_scanner` |
| `src/analyzer/dependency-analyzer.ts` | 493 | `module` | `dependency_analyzer` |

> `context-generator.ts` at 2,284 lines is the largest file in the whole corpus. Read all of
> it. A sheet written off a skim is worse than no sheet, because it becomes the thing the next
> reader trusts.

## Batch 4

| Source | Lines | `category` | Stem |
|---|---|---|---|
| `src/analyzer/dynamic-import-detector.ts` | 451 | `module` | `dynamic_import_detector` |
| `src/analyzer/frontend-call-parsers.ts` | 373 | `parser` | `frontend_call_parsers` |
| `src/analyzer/js-parser.ts` | 213 | `parser` | `js_parser` |
| `src/artifacts/index-storage.ts` | 239 | `module` | `index_storage` |
| `src/cli/bin-alias.ts` | 90 | `CLI` | `bin_alias` |

## Batch 5

| Source | Lines | `category` | Stem |
|---|---|---|---|
| `src/cli/detect-languages.ts` | 140 | `CLI` | `detect_languages` |
| `src/cli/rag-eval.ts` | 221 | `CLI` | `rag_eval` |
| `src/cli/semantic-integration.ts` | 321 | `integration` | `semantic_integration` |
| `src/cli/validate-routes.ts` | 318 | `CLI` | `validate_routes` |
| `src/context/complexity-scorer.ts` | 265 | `parser` | `complexity_scorer` |

## Batch 6

| Source | Lines | `category` | Stem |
|---|---|---|---|
| `src/context/impact-simulator.ts` | 354 | `module` | `impact_simulator` |
| `src/fileGeneration/saveFrontendCalls.ts` | 212 | `module` | `save_frontend_calls` |
| `src/generator/generateRoutes.ts` | 406 | `module` | `generate_routes` |
| `src/integration/llm/ollama-provider.ts` | 520 | `module` | `ollama_provider` |
| `src/integration/llm/provider-factory.ts` | 206 | `module` | `provider_factory` |

> Note the two snake_case stems: the source filenames are camelCase but sheet stems are
> always snake_case.

## Batch 7

| Source | Lines | `category` | Stem |
|---|---|---|---|
| `src/integration/rag/answer-generation-service.ts` | 463 | `service` | `answer_generation_service` |
| `src/integration/rag/chunk-converter.ts` | 476 | `module` | `chunk_converter` |
| `src/integration/rag/embedding-text-generator.ts` | 374 | `module` | `embedding_text_generator` |
| `src/integration/rag/graph-reranker.ts` | 463 | `module` | `graph_reranker` |
| `src/integration/rag/search-router.ts` | 314 | `service` | `search_router` |

## Batch 8

| Source | Lines | `category` | Stem |
|---|---|---|---|
| `src/integration/scip/scip-schema.ts` | 167 | `schema` | `scip_schema` |
| `src/integration/vector/json-store.ts` | 545 | `module` | `json_store` |
| `src/integration/vector/vector-store.ts` | 394 | `module` | `vector_store` |
| `src/legacy/guard.ts` | 55 | `validator` | `guard` |
| `src/map/emit-map.ts` | 207 | `formatter` | `emit_map` |

> `src/legacy/guard.ts` is a deliberately quarantined compatibility surface with **no
> production call sites** — reachable only through the `@coderef/core/legacy` package subpath.
> Document that as the fact it is; it is not dead code and it is not a live dependency.

## Batch 9

| Source | Lines | `category` | Stem |
|---|---|---|---|
| `src/map/git-history.ts` | 413 | `module` | `git_history` |
| `src/map/metrics-delta.ts` | 314 | `module` | `metrics_delta` |
| `src/cli/mcp/rag-tools.ts` | 338 | `CLI` | `rag_tools` |
| `src/cli/mcp/map-tools.ts` | 487 | `CLI` | `map_tools` |
| `src/cli/mcp/lookup-tools.ts` | 548 | `CLI` | `lookup_tools` |

## Batch 10 (final, 3 files)

| Source | Lines | `category` | Stem |
|---|---|---|---|
| `src/cli/rag-index.ts` | 764 | `CLI` | `rag_index` |
| `src/indexer/query-engine.ts` | 434 | `module` | `query_engine` |
| `src/scanner/tree-sitter-file-scan.ts` | 126 | `module` | `tree_sitter_file_scan` |

---

## Out of scope, unchanged

Do not modify source. Do not touch `INDEX.md` — index maintenance happens once at the end.
Do not write to `.coderef/`, run `populate`, or run any indexer. The drift checker is the only
repo tool you run.

## Reporting

Per batch: the five paths written, the five checker verdicts verbatim, and anything about a
target that was genuinely ambiguous. Then stop and wait before the next batch.

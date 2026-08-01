---
agent: Claude Fable 5
date: 2026-08-01
task: STUB-CC9094
subject: scripts
parent_project: coderef-core
category: CLI
version: 1.0.0
related_files:
  - scripts/README.md
  - scripts/doc-gen/README.md
  - scripts/doc-gen/utils.js
  - scripts/doc-gen/generate-index-md.js
  - scripts/doc-gen/generate-exports-md.js
  - scripts/doc-gen/generate-hotspots-md.js
  - scripts/doc-gen/generate-relationships-md.js
  - scripts/doc-gen/enhance-existing-docs.js
  - scripts/doc-gen/validate-docs.js
  - scripts/doc-gen/generate-meta-json.js
  - scripts/scan-cli/scan.cjs
  - scripts/setup-coderef-dir/setup_coderef_dirs.py
  - scripts/bench-index-parse.mjs
  - scripts/check-header-coverage.mjs
  - scripts/deduplicate-headers.mjs
  - scripts/fix-stale-exports-v3.mjs
  - scripts/generate-intelligence.js
  - scripts/real-semantic-dryrun.mjs
  - scripts/test-semantic-dryrun.mjs
status: approved
---

# scripts Resource Sheet

## Executive Summary

`scripts/` is the maintenance and one-off tooling directory for `@coderef/core`. It is explicitly **not** the package's shipped surface — that is `src/cli/` plus the `bin` map in `package.json`; nothing under `scripts/` is published and nothing is imported by `src/` [ref](scripts/README.md:3). The directory holds three tool families: the foundation-doc generator suite (`doc-gen/`), scan/bootstrap helpers (`scan-cli/`, `setup-coderef-dir/`), and loose repo-maintenance scripts (header enforcement, stale-export repair, benchmarks, semantic-writer rehearsal harnesses) [ref](scripts/README.md:13).

## Audience and Intent

For maintainers of coderef-core who need to (a) regenerate or validate the foundation docs, (b) run repo-hygiene passes (semantic-header coverage, stale `@exports` repair, duplicate-header cleanup), or (c) bootstrap a `.coderef/` tree in another repo. Open this sheet to find which script owns a job, its invocation contract, and the safety conventions (dry-run-first, no cloud keys) that govern anything added here. The per-script authority is `scripts/README.md`, whose index is grounded in each script's own docstring [ref](scripts/README.md:10).

## Architecture / Behavior

Three subdirectories and a set of loose scripts:

- **`doc-gen/`** — the foundation-doc pipeline: four generators (`generate-index-md.js`, `generate-exports-md.js`, `generate-hotspots-md.js`, `generate-relationships-md.js`), the enhancer (`enhance-existing-docs.js`), the meta emitter (`generate-meta-json.js`), and the CI gate (`validate-docs.js`). They read `.coderef/index.json`, `graph.json`, and `context.json` and write `coderef/foundation-docs/*.md` [ref](scripts/doc-gen/README.md:54). Since WO-FOUNDATION-DOCS-GENERATOR-EMITTED-FRONTMATTER-001, every generator emits a YAML frontmatter block via `foundationFrontmatter()` in `utils.js` (`status: generated`, edge-bearing `documents:` lists, timestamp-free for byte-stable regen); the enhancer upserts its block idempotently [ref](scripts/doc-gen/README.md:64). `coderef/foundation-docs/INDEX.md` is DERIVED — regenerate it here, never hand-edit; the generator/verify pair is declared in the `derived-index` mapping table [ref](scripts/README.md:17).
- **`scan-cli/`** — `scan.cjs`, a CLI wrapper around the TypeScript scanner: scans a project directory and prints element statistics (`node scan.cjs <project_path>`) [ref](scripts/scan-cli/scan.cjs:4).
- **`setup-coderef-dir/`** — `setup_coderef_dirs.py`, bootstraps a `.coderef/` tree in a target repo [ref](scripts/README.md:19).

Loose scripts [ref](scripts/README.md:21):

| Script | Purpose |
|---|---|
| `bench-index-parse.mjs` | Parse-throughput benchmark over `.coderef/index.json` |
| `check-header-coverage.mjs` | Pre-commit-hook backend: fails if a source file lacks a canonical `@coderef-semantic` header — the per-file PREVENTION layer, backstopped by the rag-index coverage floor [ref](scripts/check-header-coverage.mjs:12) |
| `deduplicate-headers.mjs` | Removes duplicate `@coderef-semantic` blocks |
| `fix-stale-exports.mjs` / `-v2` / `-v3` | Stale-`@exports` repair; v3 is current (uses the built tree-sitter extractor — the same extraction path as the orchestrator [ref](scripts/fix-stale-exports-v3.mjs:4)); v1/v2 kept for provenance |
| `generate-intelligence.js` | Builds the intelligence artifacts consumed by the dashboard |
| `real-semantic-dryrun.mjs`, `test-semantic-dryrun.mjs` | Rehearsal harnesses for the semantic-header writer — run before any `--apply` |

## Source of Truth

- `scripts/README.md` is the directory's authoritative index; every entry is grounded in the script's own docstring or header, by rule [ref](scripts/README.md:10).
- For `doc-gen/`: `scripts/doc-gen/README.md` documents the generator suite, data sources, and the frontmatter-emission contract [ref](scripts/doc-gen/README.md:64).
- The generated docs themselves are derived artifacts: hand-editing foundation-doc frontmatter is futile — the next regen overwrites it [ref](scripts/doc-gen/README.md:74).
- **Graph coverage note:** `scripts/doc-gen/`, `scripts/setup-coderef-dir/`, and `scripts/generate-intelligence.js` are deliberately excluded from the `.coderef` scan via `.coderefignore` (dead-code noise rows) [ref](.coderefignore:53). This sheet therefore carries `related_files` only — a `documents:` claim to a scan-excluded path would mint only an unresolved row.

## Public API / Contracts

None published — no `scripts/` entry appears in the package `bin` map, and `src/` never imports from here [ref](scripts/README.md:3). The operative contracts are invocation contracts:

- `node scripts/doc-gen/generate-*.js` then `node scripts/doc-gen/validate-docs.js [--strict]` — regenerate + CI-gate the foundation docs; validator exits 0/1 [ref](scripts/doc-gen/README.md:47).
- `node scripts/scan-cli/scan.cjs <project_path>` — scan and report element statistics [ref](scripts/scan-cli/scan.cjs:9).
- `node scripts/check-header-coverage.mjs <files...>` — non-zero exit on any header-less source file (pre-commit backend) [ref](scripts/check-header-coverage.mjs:12).
- Mutating scripts (`fix-stale-exports-v3.mjs`, semantic-writer passes) follow the rehearse-before-write convention: a dry-run path exists and `--apply` is the exception, not the default [ref](scripts/README.md:34).

## Dependencies

- **Internal (data):** `.coderef/index.json`, `.coderef/graph.json`, `.coderef/context.json` — the doc-gen suite and benchmarks read these; regenerate with populate/reindex before running against a stale tree [ref](scripts/doc-gen/README.md:54).
- **Internal (code):** `fix-stale-exports-v3.mjs` imports the **built** extractor from `dist/src/pipeline/extractors/relationship-extractor.js` [ref](scripts/fix-stale-exports-v3.mjs:16) — it requires a fresh `npm run build` first.
- **External:** Node stdlib (`fs`, `path`); `tree-sitter` + `tree-sitter-typescript` for the AST-based repair pass [ref](scripts/fix-stale-exports-v3.mjs:17); Python 3 for `setup_coderef_dirs.py`.
- **Prohibited:** cloud LLM keys — this project is local-Ollama-only; no script may require an OpenAI/Anthropic key to run [ref](scripts/README.md:36).

## Risks & Edge Cases

- **Stale-dist trap:** scripts that import from `dist/` (fix-stale-exports-v3) silently operate on old logic if the build is stale — rebuild before any `--apply`.
- **Scan exclusion is intentional but invisible:** graph queries return nothing for most of `scripts/` — that is `.coderefignore` policy [ref](.coderefignore:49), not missing data; do not "fix" it by re-including without revisiting the dead-code noise rationale.
- **Derived-file hazard:** hand edits to `coderef/foundation-docs/INDEX.md` or to generated frontmatter are clobbered on the next regen [ref](scripts/README.md:17).
- **Bypassable prevention:** the header pre-commit hook can be skipped (`--no-verify`); the rag-index coverage floor is the intentional backstop [ref](scripts/check-header-coverage.mjs:18).
- **Version graveyard:** `fix-stale-exports.mjs` and `-v2` are provenance-only — running them instead of v3 applies superseded repair rules [ref](scripts/README.md:28).
- **cwd-independence rule:** scripts resolve the repo from their own location, not `process.cwd()`; a nested-subdirectory invocation must behave identically to a root one [ref](scripts/README.md:38).

## Validation Checklist

- [x] All 9 required frontmatter fields present; `category: CLI` maps to the "Scripts / Entry points" artifact-kind header
- [x] Every `related_files` path verified on disk (2026-08-01)
- [x] Claims cited to source (`[ref](path:line)`); no reliance on archived tools or legacy command behavior
- [x] Script inventory matches `scripts/README.md` (the docstring-grounded authority) as of 2026-08-01
- [x] Scan-exclusion status of `scripts/` verified against `.coderefignore` (lines 49–57)
- [ ] Re-verify after any change to `scripts/README.md` or `.coderefignore` scope

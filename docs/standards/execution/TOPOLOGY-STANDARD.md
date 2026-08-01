---
kind: execution
title: Topology Standard — artifact inventory and canonical path resolvers
status: living
updated: 2026-07-31
---

# Topology Standard — artifact inventory and canonical path resolvers

> **Sub-type:** `topology` of the `execution` kind. Authority root: [`README.md`](README.md).
> Declares WHERE artifacts live and HOW their paths are computed. What the
> artifacts contain is governed by
> [`CONTRACTS-STANDARD.md`](CONTRACTS-STANDARD.md); how they are produced by
> [`GENERATION-STANDARD.md`](GENERATION-STANDARD.md).

## The two roots, and the line between them

| Root | Holds | Lifecycle | Hand-editable |
|---|---|---|---|
| **`.coderef/`** | Machine-generated artifacts about the code | Regenerated wholesale by the pipeline | **No** — an edit is a defect; the next run discards it |
| **`coderef/`** | Human/agent-authored records: decisions, plans, standards, history | Authored and committed | **Yes** — this is where decisions belong |

**This is the single most load-bearing distinction in the layout.** `.coderef/` is
derived and disposable; `coderef/` is authored and durable. Putting a decision in
`.coderef/` loses it at the next scan. Putting a generated artifact in `coderef/`
creates a second, drifting copy of something the pipeline already owns.

## `.coderef/` — generated artifact inventory

Named by class rather than by file, since several classes ship multiple encodings.

| Class | Artifacts |
|---|---|
| Element index | `index.json`, `index.compact.json` (+ `.gz` variants) |
| Dependency graph | `graph.json` |
| Validation | `validation-report.json` |
| Provenance manifest | `manifest.json` — one sha256 per source file that fed the graph |
| Incremental inputs | `incremental-cache.json`, `incremental-facts.json` |
| Map projection | `map/` |
| RAG | `rag-index.json`, `coderef-vectors.json` |
| API surface | `routes.json`, `frontend-calls.json`, `route-validation.json`, `route-validation.md` |
| Registry | `registry/`, `semantic-registry.json` |
| Context packs | `context.json`, `context.md`, `agentic-context.json` |
| Dependency rules | `rules.json` |
| SCIP overlay | `scip/` |
| Reporting and history | `reports/`, `sessions/`, `intelligence/`, `discovery/`, `diagrams/`, `exports/`, `archive-log.yaml` |
| Per-workorder baselines | `index-baseline-<workorder-slug>.json` |
| Doc metadata | `foundation-docs-meta.json` |

## `coderef/` — authored record inventory

| Directory | Holds |
|---|---|
| `workorder/` | Active workorder folders: `plan.json`, `communication.json`, context and analysis |
| `working/` | Working folders for in-flight efforts. **Historical records — not editable** once written (standing operator amendment) |
| `archived/` | Completed, frozen history. Same non-edit rule |
| `stubs/` | The stub registry |
| `standards/` | This bundle and its siblings — the project's governing standards |
| `foundation-docs/` | Generated-then-curated foundation documentation |
| `resource/`, `resource-sheets/` | Resource sheets and supporting reference material |
| `reference/` | Reference documents (reviews, analyses) |
| `sessions/` | Session records |
| `DEAD-LETTER/` | Artifacts that failed to route — deliberately kept rather than discarded |

## Path rule: computed, never guessed

Every path that participates in an identity or a stored reference is **computed
through a shared resolver**, never assembled ad hoc at the write site.

- **`normalizeSlashes`** is THE slash normalizer
  ([ref](../../../src/utils/path-normalize.ts:21)). It converges Windows and POSIX
  spellings on one forward-slash form. It deliberately does **not** resolve,
  relativize, or lower-case.
- **`normalizeProjectPath`** ([ref](../../../src/utils/coderef-id.ts:37)) builds on
  it for callers that need project-relative identity.
- **`toRepoRelativePosix`** ([ref](../../../src/utils/path-normalize.ts:26)) is the
  SCIP path-coordinate normalizer, collapsing an absolute graph
  `sourceLocation.file` and a relative SCIP `document.relativePath` onto one
  repo-relative key.

### Ruling: stored paths are project-relative POSIX

A path written into any artifact is **project-relative with forward slashes**. An
absolute path is never stored: it embeds a machine layout, which makes the artifact
non-portable and — because absolute paths are inadmissible generation inputs
([`GENERATION-STANDARD.md`](GENERATION-STANDARD.md#determinism-is-the-hard-rule)) —
non-reproducible across machines.

The `toRepoRelativePosix` case is the cautionary instance and is worth stating
because it already cost real resolution accuracy: `normalizeSlashes` alone flips
separators but never relativizes, so an absolute graph edge and a relative SCIP
occurrence **for the same source line produced different keys and never matched**
([ref](../../../src/utils/path-normalize.ts:36)). Same file, two spellings, silent
non-match. Normalization that stops short of the canonical form is worse than none,
because it looks handled.

## Known topology defect — a duplicated resource-sheet home

`coderef/` currently carries **both** `resource-sheets/` and `resources-sheets/`
(plural-vs-singular), and both hold sheets. Two homes for one artifact class is
precisely what a canonical location is meant to preclude — a reader cannot tell
which is authoritative, and a writer will pick by coin-flip.

This is **recorded, not repaired here**: consolidating them requires a provenance
ruling on which sheets belong to this project at all, which is tracked as its own
phase of this workorder and carries an operator decision. See the relocation
question in the workorder's `communication.json`.

---

*Conforms to the `execution` kind, sub-type `topology`. Authority root: [`README.md`](README.md).*

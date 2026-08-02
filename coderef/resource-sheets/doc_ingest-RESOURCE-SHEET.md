---
agent: Codex
date: 2026-08-01
task: resource-sheet-anchor-rot
subject: doc_ingest
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/pipeline/doc-ingest.ts
related_files:
  - src/pipeline/doc-ingest.ts
  - __tests__/pipeline/doc-ingest.test.ts
status: approved
---

## Executive Summary

`doc-ingest.ts` turns repository-owned Markdown into deterministic documentation facts for the graph pipeline. It recognizes direct-child resource sheets and foundation documents plus recursively discovered, explicitly opted-in report candidates; parses their constrained frontmatter; divides their bodies into heading sections; and extracts identifier candidates from prose and TypeScript/JavaScript fences without resolving those candidates itself [ref](src/pipeline/doc-ingest.ts). The module performs synchronous filesystem reads but no writes, clock reads, or random operations, and returns both collected facts and selected skip records [ref](src/pipeline/doc-ingest.ts).

## Audience and Intent

Pipeline and graph maintainers should use this sheet when changing which documentation enters a scan, how document and section identities are formed, or what claims are handed to downstream graph construction. Documentation-tooling maintainers should use it to keep frontmatter output within the deliberately small scalar-and-list format this module accepts [ref](src/pipeline/doc-ingest.ts).

Test maintainers should distinguish extraction guarantees owned here from integration guarantees asserted through `constructGraph`, `CanonicalGraphQuery`, and the MCP cache. The direct suite asserts concrete values, ordering, edge counts, resolution states, and exclusion behavior; smoke-only tests that merely assert a result was returned: **NONE found** [ref](__tests__/pipeline/doc-ingest.test.ts).

## Architecture / Behavior

Collection has three ordered lanes. Resource sheets are non-recursively listed from `coderef/resource-sheets`, foundation documents from `coderef/foundation-docs`, and report candidates from a recursive, sorted walk below `coderef`. Exact resource-sheet and foundation paths are reserved so the report lane cannot emit them again. A report is admitted only when parsed frontmatter contains a scalar `ingestion_candidate` whose case-folded value is `true` [ref](src/pipeline/doc-ingest.ts).

Resource sheets require leading frontmatter: a missing block becomes a counted `frontmatter_missing` skip, while a read failure becomes a counted `unreadable` skip. Their missing status defaults to `draft`. Foundation documents mint facts with or without frontmatter, and their status is always forced to `generated`; read failures are counted. Report status defaults to `draft`, and its subject preference is `title`, then `artifact_name`, then `genre` [ref](src/pipeline/doc-ingest.ts).

For every admitted document, scalar and list forms of `documents` are stored separately after slash normalization and removal of one leading `./`. `related_files` is copied from the parsed list, placeholder count is the number of occurrences of the fixed generation-failure marker, and section extraction receives the complete file text. `docTargets` later unions scalar and list targets in scalar-first order while removing duplicates [ref](src/pipeline/doc-ingest.ts).

The frontmatter reader is intentionally not general YAML. It accepts only a leading `---` block, flat `key: value` scalars, and simple indented dash lists opened by an empty-valued key. Lines outside those shapes are ignored; scalar values are retained as trimmed text without YAML type coercion or quote removal [ref](src/pipeline/doc-ingest.ts).

Section extraction skips a recognized leading frontmatter block and then makes one forward pass over the remaining lines. ATX headings with one through six `#` characters open sections; prose before the first heading belongs to no section. Section ids combine the document id with a normalized heading slug, duplicate slugs receive `-2`, `-3`, and later suffixes, and punctuation-only headings fall back to `section-N` [ref](src/pipeline/doc-ingest.ts).

Backtick harvesting accepts only standalone JavaScript-style identifier shapes after trimming and removing an empty call suffix. It rejects paths, flags, commands, numeric-leading tokens, and member expressions, and deduplicates accepted mentions within each section. Fenced interiors never enter the prose lane. Only closed fences labelled as TypeScript or JavaScript variants are lexed for named/default import bindings, non-member call callees, and `new` targets after comments and string/template bodies are blanked; keywords and duplicates are removed [ref](src/pipeline/doc-ingest.ts).

`docReferenceClaims` merges a section's prose mentions before its code-block identifiers and deduplicates across both lanes, so a token present in both is attributed once to prose. This module does not decide whether a token names a real symbol. The test suite verifies downstream membership gating, ambiguous references, code-block quarantine, and the rule that documentation references do not widen ordinary code blast radius [ref](src/pipeline/doc-ingest.ts) [ref](__tests__/pipeline/doc-ingest.test.ts).

## Source of Truth

`src/pipeline/doc-ingest.ts` is authoritative for document discovery, accepted frontmatter shapes, document and section fact schemas, identity helpers, mention normalization, fenced-code candidate lexing, target unioning, and collection/skip behavior [ref](src/pipeline/doc-ingest.ts). It owns facts only: the tests demonstrate that graph construction and query/cache consumers turn those facts into `doc`, `contains`, `documents`, and `references` graph behavior, but those downstream implementations are outside this module [ref](__tests__/pipeline/doc-ingest.test.ts).

The source hardcodes the scanned directories, report opt-in key, default statuses, placeholder marker, accepted fence languages, JavaScript keyword exclusions, heading grammar, and identifier grammar. Runtime configuration or a schema file controlling these values: **NONE found** [ref](src/pipeline/doc-ingest.ts).

The direct test authority is `__tests__/pipeline/doc-ingest.test.ts`. It explicitly asserts frontmatter scalars/lists, target union order, fixture collection order and metadata, report opt-in exclusion, deterministic output, missing-surface tolerance, slug and line-span rules, fence handling, mention filtering, code-identifier quarantine, graph node/edge invariants, retrieval ranking, and two adjacency surfaces [ref](__tests__/pipeline/doc-ingest.test.ts). Direct assertions for unreadable filesystem entries, false results from `isDocNodeId`, unclosed fences, quoted YAML scalars, or report-lane read failures: **NONE found**.

## Public API / Contracts

<!-- PROJECTED from .coderef/index.json — do not hand-edit; regenerate via project-spine.mjs -->
- `DOC_ID_PREFIX` (constant) [ref](src/pipeline/doc-ingest.ts#DOC_ID_PREFIX)
- `DocFact` (interface) [ref](src/pipeline/doc-ingest.ts#DocFact)
- `DocSectionFact` (interface) [ref](src/pipeline/doc-ingest.ts#DocSectionFact)
- `normalizeMention` (function) [ref](src/pipeline/doc-ingest.ts#normalizeMention)
- `DocIngestResult` (interface) [ref](src/pipeline/doc-ingest.ts#DocIngestResult)
- `headingSlug` (function) [ref](src/pipeline/doc-ingest.ts#headingSlug)
- `lexFencedIdentifiers` (function) [ref](src/pipeline/doc-ingest.ts#lexFencedIdentifiers)
- `extractDocSections` (function) [ref](src/pipeline/doc-ingest.ts#extractDocSections)
- `docNodeId` (function) [ref](src/pipeline/doc-ingest.ts#docNodeId)
- `docTargets` (function) [ref](src/pipeline/doc-ingest.ts#docTargets)
- `DocReferenceClaim` (interface) [ref](src/pipeline/doc-ingest.ts#DocReferenceClaim)
- `docReferenceClaims` (function) [ref](src/pipeline/doc-ingest.ts#docReferenceClaims)
- `isDocNodeId` (function) [ref](src/pipeline/doc-ingest.ts#isDocNodeId)
- `parseDocFrontmatter` (function) [ref](src/pipeline/doc-ingest.ts#parseDocFrontmatter)
- `collectDocFacts` (function) [ref](src/pipeline/doc-ingest.ts#collectDocFacts)

## Dependencies

<!-- PROJECTED from .coderef/index.json imports[] -->
- `fs` [ref](src/pipeline/doc-ingest.ts)
- `path` [ref](src/pipeline/doc-ingest.ts)
- `../utils/path-normalize.js` [ref](src/pipeline/doc-ingest.ts)

_Semantic header (projected): layer `service` · capability `doc-ingestion` · version `1.0.0`_

## Risks & Edge Cases

- The `DocIngestResult` comment promises counted skips, but a read failure in the recursive report-candidate lane executes a bare `continue` and does not append to `skipped`. Resource-sheet and foundation read failures are counted. The direct suite does not exercise any unreadable-file branch [ref](src/pipeline/doc-ingest.ts) [ref](__tests__/pipeline/doc-ingest.test.ts).
- Placeholder counting measures marker occurrences, not distinct heading sections. Multiple marker occurrences in one section therefore increase `placeholderSections` more than once; the test fixture covers exactly one marker occurrence [ref](src/pipeline/doc-ingest.ts) [ref](__tests__/pipeline/doc-ingest.test.ts).
- The frontmatter reader is a constrained format reader, so quoted booleans remain quoted text, nested YAML and inline arrays are ignored, and a list item is accepted only while a preceding empty-valued key remains open. Producers must emit the supported flat shape [ref](src/pipeline/doc-ingest.ts).
- Missing and unreadable documentation directories both collapse to an empty listing. That provides no-data tolerance but leaves callers unable to distinguish an absent surface from a directory access failure [ref](src/pipeline/doc-ingest.ts).
- Fence state tracks only the marker character, not opening-fence length. A same-character fence match closes the block, while the other marker character remains body content. An unclosed fence is never flushed and causes all later lines to remain fence body rather than headings or prose [ref](src/pipeline/doc-ingest.ts).
- Fenced-code extraction is lexical and intentionally narrow: member calls are excluded, only TypeScript/JavaScript info strings are accepted, and imported aliases contribute the pre-`as` name. The suite asserts member/string/comment/keyword exclusions and supported ts/js attribution, but direct namespace-import coverage is **NONE found** [ref](src/pipeline/doc-ingest.ts) [ref](__tests__/pipeline/doc-ingest.test.ts).
- `documents` claims are normalized but not rejected here for absolute or parent-traversal shapes. The integration suite asserts that a target outside the scan universe becomes unresolved and does not mint a phantom file node; that fail-closed behavior is asserted downstream rather than implemented by this module [ref](src/pipeline/doc-ingest.ts) [ref](__tests__/pipeline/doc-ingest.test.ts).
- `isDocNodeId` is a prefix check only. The suite asserts the positive `@Doc/` case through a collected fact; direct negative and malformed-id cases are **NONE found** [ref](src/pipeline/doc-ingest.ts) [ref](__tests__/pipeline/doc-ingest.test.ts).

## Validation Checklist

- [x] Read every export, private helper, filesystem branch, parsing branch, and collection lane in `src/pipeline/doc-ingest.ts`.
- [x] Read the complete direct test file and distinguished direct assertions from transitively exercised integration behavior.
- [x] Confirmed smoke-only result-exists coverage: **NONE found**.
- [x] Confirmed `.coderef/index.json` is newer than the documented module; populate was not required.
- [x] Inserted the Public API / Contracts and Dependencies sections verbatim from `project-spine.mjs`.
- [x] Ran the targeted Vitest suite: 46 tests passed.
- [x] Ran the resource-sheet shape checker clean.
- [x] Ran the sheet drift checker clean.

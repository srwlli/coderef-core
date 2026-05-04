# CodeRef Pipeline Refactor Roadmap

You are refactoring the CodeRef pipeline methodically.

This is **pipeline completion**, not graph repair. The pipeline must produce:

1. canonical, identity-anchored elements,
2. resolved relationships (or explicit unresolved/ambiguous/external/builtin states),
3. a validated dependency graph keyed on canonical IDs,
4. taxonomy-anchored semantic metadata (`@layer`, `@capability`, `@constraint`, `@exports`, `@imports`) that consumers can query,
5. indexing/RAG output that refuses to silently report success on invalid data,
6. documentation that matches actual behavior.

Do not rewrite everything at once. Work in sequential pipeline order.

---

## Current Reality (read before any phase)

The pipeline is not green-field. The following machinery already exists in `src/`:

- **`src/utils/coderef-id.ts`** — `createCodeRefId` produces `@<TypeDesignator>/<relPath>#<name>[:line]`. This is the canonical ID format. Do not invent a second one.
- **`src/pipeline/semantic-elements.ts`** — emits `codeRefId` and `codeRefIdNoLine` on every `ElementData`. ID generation runs at the producer side today.
- **`src/registry/entity-registry.ts`** — assigns and looks up element UUIDs. Used by `semantic-elements.ts`.
- **`src/scanner/semantic-analyzer.ts`** — `attachFileImportsToElements`, `buildSemanticRelationships`, `deduplicateUsedBy`. File-level imports are already attached to elements; reverse `usedBy` already exists.
- **`src/semantic/`** — separate module with its own AST extractor (`ast-extractor.ts`), header generator (`header-generator.ts`), LLM enricher (`llm-enricher.ts`), registry sync (`registry-sync.ts`), orchestrator (`orchestrator.ts`), and projections (`projections.ts`).
- **`src/semantic/projections.ts`** — produces `semantic-registry.json` from canonical `ElementData`. Projection seam is unified.
- **`src/semantic/orchestrator.ts`** — still runs its own `astExtractor.extractDirectory()`. Orchestrator seam is **not** unified. Treat this as a known parallel scanner.

The following machinery does **not** exist in `src/`:

- A parser/validator for the canonical semantic-header grammar (`@coderef-semantic:1.0.0`, `@layer`, `@capability`, `@constraint`, `@exports`, `@imports`, `@generated`). The grammar lives only in `ASSISTANT/SKILLS/ANALYSIS/analyze-coderef-semantics/SKILL.md`.
- `layer` / `capability` / `constraints` fields on `ElementData`.
- Import resolution (Phase 3) — module specifiers are kept as raw strings.
- Call resolution (Phase 4) — calls degrade to name-only.
- Graph validation that rejects edges with non-existent endpoints.
- Indexing failure semantics (`chunksIndexed: 0` reports success today).

Every phase below is written against this reality. Do not reintroduce work already shipped.

---

## Refactor Order

## Phase 0 - Establish Ground Truth ✅ ARCHIVED 2026-05-02

Before changing code:

1. Add/confirm tests that expose current failures:

   * graph edges whose endpoints are not node IDs
   * duplicate identities
   * unresolved imports
   * unresolved calls
   * alias imports
   * duplicate function names
   * nested functions
   * class/object method calls

2. Add a graph validation test:

   * every resolved edge endpoint must exist in `nodes`
   * unresolved edges must have `resolutionStatus`
   * ambiguous edges must include candidate IDs

3. Add a semantic-coverage ground-truth test:

   * count of elements where `codeRefId` is set
   * count of elements where `layer` / `capability` / `constraints` are set (will be 0 today)
   * count of source files with a parsed `@coderef-semantic:1.0.0` header (will be 0 today)
   * count of `@imports` entries that resolve to a real exported element ID (will be 0 today)

Do not continue until failing tests exist. The Phase 0 workorder is `WO-PIPELINE-GRAPH-GROUND-TRUTH-TESTS-001`.

---

## Phase 1 - Scanner / Element Extraction (Identity + Taxonomy Ratification) ✅ ARCHIVED 2026-05-02

Purpose: ratify the canonical element contract that already partially exists, add the missing taxonomy fields, and collapse the parallel scanner.

Tasks:

1. Ratify the existing canonical ID:

   * keep `createCodeRefId` in `src/utils/coderef-id.ts` as the single source.
   * remove or forbid any other ID generator.

2. Confirm every `ElementData` includes (already partially true):

   * `codeRefId`, `codeRefIdNoLine`
   * type, name, qualified name
   * file (project-relative POSIX), line, optional endLine
   * language
   * scope path
   * exported flag
   * parameters when available

3. **Add** to `ElementData`:

   * `layer` — enum from `STANDARDS/layers.json` (`ui_component`, `service`, `utility`, `data_access`, `api`, `integration`, `domain`, `validation`, `parser`, `formatter`, `cli`, `configuration`, `test_support`).
   * `capability` — kebab-case string.
   * `constraints` — string array (kebab-case items).
   * `headerStatus` — enum: `defined` | `stale` | `missing` | `partial`.

4. Decide grain for taxonomy fields:

   * `layer`, `capability`, `constraints` are **file-grain**. All elements in a file inherit them from the file's header.
   * `codeRefId`, `exports`, `imports` remain **element-grain**.
   * Document this rule once, in the scanner schema. Do not let two grains compete.

5. Stop relying on raw `name + file + line` as identity for graph or registry consumers. Producers may still use it as a lookup key into `entity-registry`.

6. Ensure nested/local functions and class methods get distinct qualified names.

7. Collapse the parallel scanner:

   * `src/semantic/orchestrator.ts:processProject()` must consume `PipelineState`, not call `astExtractor.extractDirectory()`.
   * `src/semantic/ast-extractor.ts` becomes either (a) a header-comment parser only, or (b) deleted, with header parsing moved into `src/pipeline/`.
   * `populate-coderef --semantic` must route through the main pipeline.

8. Update scanner docs to match real output.

9. Remove or downgrade claims not implemented:

   * decorators
   * docstrings
   * return types
   * complexity

Exit criteria:

* same-name functions in different files do not collide.
* nested functions do not collide.
* class methods have stable qualified identities.
* every element has `codeRefId` and `headerStatus`; file-grain elements have `layer` and `capability` when their file has a parsed header (otherwise `headerStatus = missing`).
* scanner output validates against schema.
* `src/semantic/orchestrator.ts` no longer initiates a second AST scan; only one file walk per pipeline run.

---

## Phase 2 - Relationship Extraction ✅ ARCHIVED 2026-05-02

Purpose: extract raw relationship facts without pretending they are resolved.

Tasks:

1. Split relationship output into raw facts:

   * raw import facts
   * raw call facts
   * raw export facts
   * raw header-import facts (parsed `@imports` entries from semantic headers — see Phase 2.5)

2. Raw import facts should include:

   * source element/file
   * module specifier
   * specifiers
   * aliases
   * default import
   * namespace import
   * type-only flag
   * dynamic flag
   * line

3. Raw call facts should include:

   * source element candidate
   * call expression text
   * callee name
   * receiver/object text if present
   * scope path
   * line
   * language

4. Preserve context. Do not reduce `obj.save()` to only `save`.

Exit criteria:

* aliases are captured.
* dynamic imports are labeled.
* method calls preserve receiver text.
* calls know their enclosing scope.
* no raw relationship claims to be a graph edge yet.

---

## Phase 2.5 - Semantic Header Parsing ✅ ARCHIVED 2026-05-03

Purpose: parse the canonical semantic-header grammar from source comments and attach the result to file-grain `ElementData`.

This phase exists because the grammar is canonical (per `analyze-coderef-semantics/SKILL.md`) but no parser exists in `src/` today. Without it, `@layer` / `@capability` / `@constraint` / `@exports` / `@imports` are documentation-only and cannot be validated.

Tasks:

1. Implement a header parser in `src/pipeline/` (not under `src/semantic/`) that consumes the BNF defined in `analyze-coderef-semantics/SKILL.md`.

2. The parser must extract, per file:

   * `@coderef-semantic:<version>` marker (currently `1.0.0`)
   * `@layer` (validated against `STANDARDS/layers.json` enum)
   * `@capability` (kebab-case; reject otherwise)
   * `@constraint` (JSON array of kebab-case strings; empty array allowed)
   * `@exports` (comma-separated identifier list)
   * `@imports` (array of `"module:symbol"` strings)
   * `@generated` (ISO 8601)

3. Emit raw header facts alongside raw import/call/export facts (Phase 2). Do **not** resolve `@imports` here — that is Phase 3.

4. Cross-check `@exports` against the AST's actual exports. Mismatches produce `headerStatus = stale` for the file.

5. Files with no header → `headerStatus = missing`. Files with malformed header → `headerStatus = partial` and a structured parse-error record on the file.

Exit criteria:

* every source file walked produces a `HeaderFact` (possibly empty) and a `headerStatus` value.
* `STANDARDS/layers.json` is the only source of truth for the `@layer` enum; the parser fails closed when the enum drifts.
* zero source files contain a header that the parser silently ignores.

---

## Phase 3 - Import Resolution ✅ ARCHIVED 2026-05-03 (commits bdd2892..ad736de; archive 8d6872d)

Purpose: resolve module specifiers to concrete files and exported elements. Resolves both AST imports and `@imports` header entries.

Tasks:

1. Build an import resolver.

2. Resolve:

   * relative imports
   * extensionless imports
   * index files
   * package imports
   * TypeScript path aliases if config exists

3. Build an export table per file:

   * named exports
   * default export
   * re-exports
   * namespace exports

4. Bind imported local names to exported element IDs.

5. Resolve `@imports` header entries. Each entry has the form `"<module>:<symbol>"`. The resolver must:

   * resolve `<module>` the same way a real `import` statement would,
   * verify `<symbol>` is actually exported by that module,
   * bind to the exported element's `codeRefId` when found.

Each import (AST or header) must become one of:

```ts
resolved
unresolved
external
ambiguous
dynamic
typeOnly
stale         // header @imports lists a symbol not exported by its module
```

Exit criteria:

* `import { foo as bar } from './x'` binds `bar` to exported `foo`.
* relative imports resolve to files.
* external packages are explicitly classified.
* unresolved imports are explicit, not silent.
* every `@imports` entry resolves to a real `codeRefId` or is explicitly marked `unresolved` / `external` / `stale`.

---

## Phase 4 - Call Resolution ✅ ARCHIVED 2026-05-03 (commits 8d6872d..cbed763; archive 1e7bb74)

Purpose: resolve call facts to unique element IDs when possible.

Tasks:

1. Build a scope-aware symbol table:

   * file scope
   * function scope
   * class scope
   * method scope
   * imported symbols

2. Resolve calls in this order:

   * local scope
   * enclosing scopes
   * class members
   * imported bindings
   * same-file exports
   * global/project symbols only if unambiguous

3. Method calls must preserve uncertainty:

   * `this.method()` may resolve within class
   * `obj.method()` requires receiver/type inference or must be ambiguous/unresolved
   * built-ins like `map`, `slice`, `join` should not become project graph edges unless bound to project code

Every call must become one of:

```ts
resolved
unresolved
ambiguous
external
builtin
```

Exit criteria:

* duplicate function names do not resolve incorrectly.
* unresolved calls are explicit.
* ambiguous calls include candidate IDs.
* built-ins are not treated as project dependencies.

---

## Phase 5 - Graph Construction ✅ ARCHIVED 2026-05-04 (commits 1e7bb74..ac8dc8e; all 6 ground-truth assertions PASS)

Purpose: construct the graph only from canonical identities.

Tasks:

1. Graph nodes must use canonical element IDs.

2. Resolved edges must use node IDs only.

3. Unresolved/ambiguous edges must not masquerade as resolved graph edges.

4. Edge schema should include:

   * id
   * sourceId
   * targetId if resolved
   * relationship type (`import` | `call` | `export` | `header-import`)
   * resolutionStatus
   * evidence
   * source location
   * candidates if ambiguous

5. Header-derived edges (`relationship: "header-import"`) must coexist with AST-derived edges without merging. They are independently queryable so consumers can detect header drift (a `header-import` edge with no matching AST `import` edge from the same file is suspicious).

6. Remove incompatible graph builders or mark them legacy.

7. Choose one authoritative graph construction path.

Exit criteria:

* every resolved edge endpoint exists in graph nodes.
* unresolved edges are queryable separately.
* graph traversal only traverses resolved edges.
* legacy graph output cannot conflict with canonical graph.
* `header-import` edges are present and distinguishable from AST `import` edges.

---

## Phase 6 - Output Validation ✅ ARCHIVED 2026-05-04 (commits 0d7cfa9..8e7ccaf; all 11 ValidationReport fields populated, real-world AC-01 PASS, 6/6 ground-truth preserved)

Purpose: prevent bad graph artifacts from being emitted silently.

Tasks:

1. Add graph validation before writing output.

2. Validation must check:

   * node ID uniqueness
   * resolved edge endpoint existence
   * no dangling resolved edges
   * valid relationship types
   * valid resolution statuses
   * no duplicate node identities

3. Add semantic validation:

   * every file with `headerStatus = defined` has a valid `@layer` value from `STANDARDS/layers.json`.
   * `@exports` listed in headers match AST-extracted exports (else `headerStatus = stale`).
   * every `@imports` entry has a non-`unresolved` status, OR the file is explicitly marked exempt.

4. Emit validation report:

   * valid edge count
   * unresolved count
   * ambiguous count
   * external count
   * builtin count
   * header_defined_count
   * header_missing_count
   * header_stale_count
   * header_partial_count
   * header_layer_mismatch_count
   * header_export_mismatch_count

5. Fail hard when graph integrity fails. Header drift is a warning by default and a hard failure under `--strict-headers`.

Exit criteria:

* bad graph cannot be written as successful output.
* validation stats appear in generated artifacts.
* CI can fail on graph integrity regressions.
* CI can fail on header drift when `--strict-headers` is set.

---

## Phase 7 - Indexing / RAG Pipeline ⏳ NEXT

Purpose: index only validated, semantically meaningful artifacts, with `layer` and `capability` as first-class facets.

Tasks:

1. Do not index failed graph output.

2. Include failure reasons for:

   * skipped chunks
   * failed chunks
   * unresolved relationships
   * elements with `headerStatus = missing | stale | partial` (these are skipped or downgraded, not silently indexed)

3. Add top-level status:

   * success
   * partial
   * failed

4. Do not allow `chunksIndexed: 0` to appear successful.

5. Attach semantic facets to indexed chunks:

   * `layer` (when known)
   * `capability` (when known)
   * `constraints` (when known)
   * `codeRefId` (always)

6. Allow RAG queries to filter by `layer` / `capability` / `constraint`.

Exit criteria:

* indexing run explains every skipped/failed chunk.
* zero indexed chunks returns failed status.
* agent can trust indexing metadata.
* RAG queries can be scoped to a `layer` and return only matching chunks.

---

## Phase 8 - Documentation Update

Update documentation only after code behavior is verified.

Required docs:

1. Scanner schema (including `layer`, `capability`, `constraints`, `headerStatus`).
2. Relationship schema.
3. Header grammar (canonical, in `docs/`, mirroring the BNF in `analyze-coderef-semantics/SKILL.md`).
4. Graph schema.
5. Resolution statuses.
6. Public API contract.
7. Agent usage contract.

Docs must distinguish:

* raw extracted facts
* resolved relationships
* unresolved relationships
* graph edges
* header-derived edges vs AST-derived edges
* external dependencies
* built-ins

Remove stale claims.

---

## Refactor Rules

* Work one phase at a time.
* Do not proceed until tests for the current phase pass.
* Prefer explicit uncertainty over false precision.
* Never emit unresolved names as resolved graph edges.
* Do not hide ambiguity.
* Do not keep multiple authoritative graph builders.
* Do not keep multiple authoritative scanners. `src/semantic/orchestrator.ts` must consume `PipelineState`, not re-scan.
* `STANDARDS/layers.json` is the only source of truth for the `@layer` enum.
* Header drift is a real failure mode. A green build with `headerStatus = stale` files is not a green build under `--strict-headers`.
* Update docs only after verified behavior changes.

---

## Final Definition of Done

The pipeline is acceptable only when:

1. scanner output has canonical identities (`codeRefId`) and taxonomy fields (`layer`, `capability`, `constraints`, `headerStatus`).
2. there is exactly one scanner; `src/semantic/` produces projections only.
3. semantic headers are parsed against the canonical grammar; malformed/missing/stale headers are explicit, not silent.
4. imports (AST and header `@imports`) resolve to files/symbols or explicit unresolved states.
5. calls resolve to element IDs or explicit unresolved/ambiguous states.
6. graph edges use node IDs; header-derived edges are distinguishable from AST-derived edges.
7. graph validation passes before output.
8. RAG/indexing refuses invalid graph artifacts and exposes `layer` / `capability` as queryable facets.
9. docs match actual schemas and behavior.

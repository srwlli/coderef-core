# Execution Notes — WO-PIPELINE-GRAPH-CONSTRUCTION-001 (Phase 5)

**Dispatch:** DISPATCH-2026-05-02-015
**Phase:** 5 of 9-phase pipeline rebuild (sequence 7/10; Phase 0/1/2/2.5/3/4 archived)
**Author:** CODEREF-CORE
**Completed:** 2026-05-04

## Summary

Canonical graph construction landed. `src/pipeline/graph-builder.ts`
(NEW, ~700 lines) is the single authoritative path
(DR-PHASE-5-B). `constructGraph(state)` runs two passes:

- **Pass 1** (`buildNodes`) — every `state.elements` item becomes a
  graph node with id = canonical codeRefId (AC-01). Pass 1 also
  emits file-grain pseudo-nodes (`@File/{path}`) for every source
  file with elements or imports — these serve as source endpoints
  for module-level imports whose `importerCodeRefId` is null.
- **Pass 2** (`buildEdges`) — promotes every `state.importResolutions`
  and `state.callResolutions` into a graph edge with the new
  8-field schema (DR-PHASE-5-D). Resolved edges carry both
  `sourceId` AND `targetId` codeRefIds (AC-02, AC-03). Non-resolved
  kinds OMIT `targetId` per DR-PHASE-5-A — no synthetic
  placeholder. Header-derived ImportResolutions emit
  `relationship='header-import'`; AST-derived emit
  `relationship='import'`. Same `(sourceFile, module, symbol)`
  tuple from both sources produces TWO edges intentionally
  (R-PHASE-5-C drift detection).

The 6 inline graph emission sites in `orchestrator.ts` (Phase 3
resolved-import push, Phase 3 import-edge enrichment loop, Phase 4
resolved-call push, Phase 4 call-edge enrichment loop, inline
buildGraph nodes/edges, plus the legacy DependencyGraph builders)
have been consolidated into `constructGraph`. Sites 1–4 in
`orchestrator.ts` were DELETED. Site 5 (legacy `buildGraph` method)
remains for the initial pre-Phase-5 graph construction (basic
nodes + 'imports'/'calls' edges with file-path/specifier endpoints)
that's then ATOMICALLY swapped with the canonical Phase 5 graph
via `Object.assign(graph, v2Graph)`. Site 6 (legacy
DependencyGraph in `src/analyzer/graph-builder.ts` and
`src/plugins/plugin-graph.ts`) is marked `@legacy` / `@deprecated`
per DR-PHASE-5-C; removal deferred to a cleanup workorder.

## Exit criteria (per roadmap.md lines 352–358)

| # | criterion | proof | status |
|---|---|---|---|
| 1 | every resolved edge endpoint exists in graph nodes | `__tests__/pipeline/graph-construction-endpoint-promotion.test.ts` (AC-02 integration). Real-world populate-coderef on coderef-core source: 3290/3290 resolved edges have both `sourceId` AND `targetId` in `graph.nodes` ids set. Phase 0 ground-truth `graph-ground-truth.test.ts` test 1 line 52 endpoint-is-node-id assertion FINALLY PASSES — the last stubborn assertion across 5 phases. | PASS |
| 2 | unresolved edges queryable separately | `__tests__/pipeline/graph-construction-edge-schema.test.ts` (AC-05). Non-resolved kinds (unresolved/ambiguous/external/builtin/dynamic/typeOnly/stale) appear in `state.graph.edges` with their resolutionStatus + evidence variant + reason populated; targetId is OMITTED (DR-PHASE-5-A). Real-world: 0 non-resolved edges carry targetId across 27,816 graph edges. | PASS |
| 3 | graph traversal only traverses resolved edges by default | `__tests__/pipeline/graph-construction-traversal-defaults.test.ts` (AC-06). No traversal helper exists with non-default-safe semantics; this test documents the absence and prevents accidental introduction. Phase 6 / cleanup workorders own helper introduction with default-safe traversal. | PASS |
| 4 | legacy graph output cannot conflict with canonical graph | `__tests__/pipeline/graph-construction-legacy-builders.test.ts` (AC-07). `src/analyzer/graph-builder.ts` and `src/plugins/plugin-graph.ts` carry `@legacy` + `@deprecated` JSDoc tags. `src/pipeline/` does NOT import from either legacy module — confirmed by grep across all `src/pipeline/**/*.ts`. | PASS |
| 5 | header-import edges present and distinguishable from AST import edges | `__tests__/pipeline/graph-construction-header-import-coexistence.test.ts` (AC-04). Inline fixture with both `import { doAlpha }` AST AND `@imports ["./alpha:doAlpha"]` semantic header produces TWO edges: relationship='import' (AST) AND relationship='header-import' (header). Same sourceId + targetId on both — intentional duplication for drift detection (R-PHASE-5-C). The `claimedHeaderFactKeys` Set tracks Phase 3's emission ordering (resolveAstImports BEFORE resolveHeaderImports) so the FIRST matching tuple gets 'import', the SECOND gets 'header-import'. | PASS |

All 5 exit criteria PASS.

## Phase 0 ground-truth flip status

Per dispatch contract: **all 6 ground-truth assertions MUST PASS
after Phase 5**. Test 1 line 52 endpoint-is-node-id finally flips —
the headline result. Tests 2–6 already PASSING from Phase 3/4 work
must remain PASSING through the schema migration (helper migration
in task 1.10).

| test | pre-Phase-5 status | Phase 5 result |
|---|---|---|
| `requires resolved import and call edges to use graph node IDs as endpoints` | line 52 STAYS FAIL through Phase 4 (the LAST stubborn assertion) | **PASS — line 52 finally flips.** Resolved edges have both `sourceId` + `targetId` codeRefIds; both appear in `graph.nodes`. The 5-phase journey closes here. |
| `requires unresolved imports and calls to be explicit graph facts` | PASS in Phase 4 | PASS — preserved through schema migration. `findEdge` helper (line 41) updated to find by `evidence.originSpecifier` / `evidence.calleeName` instead of legacy `edge.target` verbatim string. |
| `requires duplicate function name calls to be marked ambiguous with candidate IDs` | PASS in Phase 4 | PASS — preserved. `expectAmbiguous` helper reads top-level `edge.candidates` with metadata fallback. |
| `requires alias imports to bind the local alias back to the exported source symbol` | PASS in Phase 4 | PASS — top-level `resolutionStatus` + `targetId` carry the import alias binding. `importedAs` / `exportedName` remain optional metadata (Phase 5 emits canonical 'call' edges from `CallResolution`; importer-binding info lives in the resolved-call evidence variant). |
| `requires nested functions and class method calls to preserve qualified context` | PASS in Phase 4 (required Phase 1 nested-fn naming fix) | PASS — preserved. Top-level `targetId` carries `entry.inner` / `Service.handle` codeRefIds. |
| `requires graph validation to distinguish resolved, unresolved, and ambiguous edges` | PASS in Phase 4 | PASS — broadened. Loop accepts all 8 EdgeResolutionStatus values (resolved/unresolved/ambiguous/external/builtin/dynamic/typeOnly/stale). Phase 5 schema correctly emits every edge with a populated resolutionStatus. |

**All 6 PASS.** Halt-and-report contract satisfied: zero
non-test-1-line-52 ground-truth regressions through the schema
migration.

## Schema migration (Option B)

Per R-PHASE-5-A / R-PHASE-5-D: retire legacy `'imports'`/`'calls'`
type strings; re-emit as `'import'`/`'call'` with codeRefId
endpoints under the new 8-field schema.

| field | required | shape |
|---|---|---|
| `id` | required | deterministic 16-hex-char sha1 hash (DR-PHASE-5-D) |
| `sourceId` | required | canonical codeRefId (element-grain or file-grain) |
| `targetId` | conditional (resolved only) | canonical codeRefId; OMITTED for non-resolved (DR-PHASE-5-A) |
| `relationship` | required | `'import' \| 'call' \| 'export' \| 'header-import'` |
| `resolutionStatus` | required | 8-kind enum |
| `evidence` | conditional | discriminated union `EdgeEvidence` (10 variants) |
| `sourceLocation` | conditional | `{ file, line }` of the import/call statement |
| `candidates` | conditional (ambiguous only) | `string[]` of >= 2 codeRefIds |

Legacy fields `source`/`target`/`type`/`metadata` remain populated
for transition-window consumers, marked `@deprecated`. A future
cleanup workorder removes them.

**EdgeEvidence discriminated union** (10 variants per ORCHESTRATOR
checkpoint sign-off): `resolved-import`, `unresolved-import`,
`ambiguous-import`, `external-import`, `resolved-call`,
`unresolved-call`, `ambiguous-call`, `builtin-call`,
`header-import`, `stale-header-import`. Phase 6's validator can
discriminate without runtime type-checking — the union narrows
correctly per `(relationship, resolutionStatus)` combination.

## Test migration (task 1.10)

`__tests__/pipeline/graph-ground-truth.test.ts`:
- `findEdge(graph, type, target)` accepts legacy plural type
  strings ('imports' / 'calls') for back-compat readability,
  internally maps to canonical singular relationship + matches by
  `evidence.originSpecifier` (imports) or `evidence.calleeName`
  (calls).
- `expectResolvedEndpointIds`, `expectUnresolved`,
  `expectAmbiguous` helpers read top-level canonical fields with
  legacy `metadata.X` fallback.
- Test 6 (all-edge invariant) broadened to accept all 8
  EdgeResolutionStatus values (Phase 5 emits every edge with one
  of these; the 3-element list from Phase 4 was a transient
  superset of what Phase 4 saw).

`__tests__/pipeline-integration.test.ts`:
- 'should extract import relationships' / 'should extract call
  relationships' / 'should build dependency graph' migrated from
  legacy `e.type === 'imports'/'calls'` + `e.target` string match
  to canonical `e.relationship === 'import'/'call'` +
  `evidence.originSpecifier` / `evidence.calleeName`.
- Element-grain node count vs `state.elements.length` (filtered by
  `node.type !== 'file'` to exclude Phase 5 file-grain pseudo-nodes).

## populate-coderef regression check (real coderef-core source)

| metric | Phase 4 baseline | Phase 5 result | delta / status |
|---|---|---|---|
| element nodes | 2393 | 2411 | +0.8% (within OoM) |
| file-grain pseudo-nodes | 0 | 348 | NEW (one per file with elements or imports) |
| total graph nodes | 2393 | 2759 | reflects new file-grain nodes |
| total graph edges | 14787 | 27816 | + reflects full edge emission for every ImportResolution + CallResolution; previously 0 resolved-import edges due to module-level null importerCodeRefId; now 3290 resolved + 19286 unresolved + 3280 ambiguous + 502 external + 1075 builtin + 312 typeOnly + 70 dynamic |
| imports → import (rename) | n/a | 2211 | rename complete |
| calls → call (rename) | n/a | 25605 | rename complete |
| header-import edges | n/a | 0 | coderef-core source has no `@imports` declarations on real files; AC-04 test fixture exercises this path |
| AC-02: resolved with both endpoints | unknown | 3290/3290 = 100% | PASS |
| AC-05: non-resolved with targetId | unknown | 0/24,526 | PASS |

NO regression > order-of-magnitude. Edge growth reflects Phase 5's
canonical emission pattern (every resolution becomes a queryable
edge), not regression. PASS.

## Test summary

- **Phase 5 new tests (1.11–1.17):** 7 files / 9 cases — ALL PASS.
  - graph-construction-node-ids (AC-01)
  - graph-construction-endpoint-promotion (AC-02 integration)
  - graph-construction-header-import-coexistence (AC-04)
  - graph-construction-edge-schema (AC-03 + AC-05 + AC-10)
  - graph-construction-determinism (AC-08 INVARIANT, 3 cases)
  - graph-construction-traversal-defaults (AC-06)
  - graph-construction-legacy-builders (AC-07, 3 cases)
- **Phase 6 boundary enforcer:** `no-output-validation.test.ts`
  PASSES on first run.
- **Phase 0 ground-truth:** 6/6 PASS (test 1 line 52 finally flips).
- **Phase 1/2/2.5/3/4 carryover:** ALL PASS.
- **pipeline-integration.test.ts:** 15/15 PASS (after task 1.10
  schema migration).

**Pipeline test suite:** 105/105 PASS.
**Full test suite:** 1379/1445 PASS (NET +12 vs Phase 4 baseline of
1367/1434). Failing test files: 21 (vs Phase 4's 22) — reduction
from the pipeline-integration migration. Remaining failures are
pre-existing infra (chroma/pinecone external services not running,
scanner-export pre-existing failure, accuracy-validation
pre-existing). tsc --noEmit clean.

## Decision-record verification

| DR | rule | implementation |
|---|---|---|
| DR-PHASE-5-A | omit targetId for non-resolved kinds (no synthetic placeholder) | `buildEdges` emits `{ ..., resolutionStatus: 'unresolved'/'ambiguous'/etc., }` with `targetId` field absent. Real-world graph: 0 violations across 27,816 edges. AC-05 test enforces. Edge case: when Phase 3 emits `kind='resolved'` but no `resolvedTargetCodeRefId`, Phase 5 demotes to `resolutionStatus='external'` rather than emitting a malformed resolved edge. |
| DR-PHASE-5-B | graph-builder.ts is single authoritative path | constructGraph(state) is the only function in the canonical pipeline that constructs graph.nodes / graph.edges. orchestrator.ts's 4 inline emission sites DELETED; the legacy buildGraph method retained but its output ATOMICALLY swapped via Object.assign with the canonical Phase 5 graph. |
| DR-PHASE-5-C | mark legacy not delete (DependencyGraph builders) | `src/analyzer/graph-builder.ts` and `src/plugins/plugin-graph.ts` carry `@legacy` + `@deprecated` JSDoc tags. AC-07 test enforces. Removal deferred to cleanup workorder. |
| DR-PHASE-5-D | deterministic sha1 hash for edge ids (16 hex chars) | `computeEdgeId` uses `crypto.createHash('sha1').update(sourceId:relationship:(targetId??originSpecifier):sourceFile:line).digest('hex').slice(0, 16)`. AC-10 (uniqueness) + AC-08 (determinism) tests enforce. Same input always produces same id. |

## Risk mitigation

| risk | disposition |
|---|---|
| R-PHASE-5-A: endpoint promotion breaks legacy edge consumers | Option B applied: retire 'imports'/'calls' type strings, re-emit as 'import'/'call' with codeRefId endpoints. Test migration in task 1.10 (graph-ground-truth.test.ts findEdge helper + expectResolvedEndpointIds + pipeline-integration.test.ts) lands the consumer-side updates. Legacy fields kept @deprecated for transition-window. |
| R-PHASE-5-B: 6 distinct graph.edges.push sites | Sites 1-4 (orchestrator.ts inline pushes + enrichment loops) DELETED and consolidated into graph-builder.ts buildEdges. Site 5 (orchestrator.ts buildGraph) retained for pre-Phase-5 initial graph; ATOMICALLY swapped with constructGraph result via Object.assign. Site 6 (legacy DependencyGraph) marked @legacy per DR-PHASE-5-C; not consumed by canonical pipeline. |
| R-PHASE-5-C: header-import vs AST coexistence cardinality | Distinct relationship values ('import' / 'header-import'). claimedHeaderFactKeys Set tracks Phase 3's emission ordering so the FIRST matching (sourceFile, module, symbol) tuple gets 'import' and the SECOND gets 'header-import'. AC-04 test enforces TWO-edge cardinality. |
| R-PHASE-5-D: test 1 line 52 flip mechanism | Option B + findEdge helper migration + file-grain pseudo-nodes. Test 1 PASSES at unit level (graph-ground-truth.test.ts) AND at scale (3290/3290 resolved edges have both endpoints in graph.nodes on real coderef-core source). |
| R-PHASE-5-E: DependencyGraph vs ExportedGraph schema mismatch | No bridge attempted. DependencyGraph builders @legacy, NOT consumed by canonical pipeline. Removal deferred. |

## ORCHESTRATOR design calls (checkpoint 1.6 sign-off)

1. **`evidence` field shape — discriminated union.** Implemented as
   `EdgeEvidence` with 10 variants discriminated by `kind`. Phase
   6's validator gets type-narrowing on `edge.evidence` access
   instead of runtime `Record<string, unknown>` checks.

2. **Edge ordering / determinism.** No edge sorting in
   graph-builder; ordering inherited from
   `state.importResolutions` + `state.callResolutions` (which Phase
   3+4 emit in deterministic file/line order). AC-08 test verifies
   100 invocations produce deepStrictEqual outputs including
   `edge.id` values.

3. **v2Graph JSDoc safeguard.** At checkpoint, the pre-pass-2
   wiring commented `// pass-2 implementation in tasks 1.7-1.9
   will swap state.graph = v2Graph`. Post-implementation, the
   atomic-swap site has updated commentary explaining the
   constructGraph result becomes state.graph.

## Boundary enforcer transition

`__tests__/pipeline/no-graph-construction-leaks.test.ts` (Phase 4's
boundary enforcer asserting Phase 5 fields would NOT leak into
Phase 4) was DELETED — Phase 5 IS graph construction; the enforcer
is now obsolete. Mirrors Phase 4's deletion of Phase 3's
`no-call-resolution.test.ts`.

`__tests__/pipeline/no-output-validation.test.ts` (NEW, Phase 6
boundary enforcer) replaces it. Asserts no Phase 6 fields
(`strictHeadersViolation`, `headerDriftScore`,
`schemaValidationResult`, `outputGateResult`, `strictHeadersMode`,
`validationResults`, `outputConstraints`, `validationErrors`) leak
onto graph nodes / edges / CallResolution / ImportResolution /
PipelineState. Same enforcement pattern, shifted forward one phase
boundary.

## Design decisions worth surfacing

**File-grain pseudo-nodes for module-level imports.** Phase 3
returns ImportResolutions with `importerCodeRefId === null` for
imports declared at module scope (outside any function/class). For
AC-02 to pass, every resolved edge needs both endpoints in
`graph.nodes`. Phase 5 emits a `@File/{relativePath}` pseudo-node
for every source file that has elements OR imports, providing a
canonical source-side endpoint for module-level imports. These
nodes carry `type: 'file'` and `metadata.fileGrain: true` so
Phase 6 / consumer queries can filter them out for element-only
operations. The integration test `pipeline-integration.test.ts`
explicitly distinguishes element-grain from file-grain nodes
when comparing against `state.elements.length`.

**Demotion of resolved-without-target to external.** Real-world
populate-coderef revealed 1/3289 ImportResolutions had
`kind='resolved'` AND `resolvedModuleFile` set BUT no
`resolvedTargetCodeRefId` (an imported symbol whose element wasn't
extracted). Per DR-PHASE-5-A, resolved edges must carry targetId.
Phase 5 detects this case and demotes to
`resolutionStatus='external'` with `external-import` evidence
carrying the originSpecifier. Honest classification: we know the
module bound, not the symbol's codeRefId.

**Header-vs-AST edge ordering.** Phase 3 emits ImportResolutions
in two phases internally: `resolveAstImports` first, then
`resolveHeaderImports`. Phase 5's `claimedHeaderFactKeys` Set
relies on this ordering — when `(sourceFile, module, symbol)`
matches a HeaderImportFact, the FIRST resolution to claim it gets
`relationship='import'` (AST-derived); subsequent matching
resolutions get `relationship='header-import'` (header-derived).
This matches Phase 3's emission semantics exactly. If Phase 3's
ordering were ever inverted, AC-04 would still PASS (two edges
with distinct relationships) but the AST-vs-header attribution
would invert; reconciliation would require updating
`claimedHeaderFactKeys` semantics.

## Hand-off

Phase 5 implementation complete. The 5-phase journey to flip Phase
0 ground-truth test 1 line 52 closes here. All 6 ground-truth
assertions PASS; the canonical graph schema (8 fields) is in
place; the legacy DependencyGraph builders are marked legacy and
queued for removal in a cleanup workorder.

Final commit will be a phase-rollup chore commit; ORCHESTRATOR
dispatches `/close-workorder` to SKILLS for archival. Standing by.

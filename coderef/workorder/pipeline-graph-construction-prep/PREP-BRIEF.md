# Phase 5 Prep Brief — Graph Construction

You are a **read-only prep agent** for Phase 5 of the CodeRef Core 9-phase pipeline rebuild.

Phase 4 (Call Resolution) shipped and archived 2026-05-03 (commit range 8d6872d..cbed763 on coderef-core/main; archive commit 1e7bb74). Phase 5 picks up where Phase 4 left off: **construct the graph only from canonical identities.** Phase 5 finally flips the one stubborn ground-truth assertion that has stayed FAIL through Phase 0/1/2/2.5/3/4: `graph-ground-truth.test.ts` line 52, the `endpoint-is-node-id` check on test 1.

## Role Boundaries (HARD)

- **Read-only.** No source code edits. No staging. No commits.
- Write `context.json` and `analysis.json` in this directory: `coderef/workorder/pipeline-graph-construction-prep/`
- Do NOT modify this PREP-BRIEF.md.
- Hand back when done.

## Required Reading (use specific paths — Phase 3/4 prep had file-not-found errors when paths were vague)

1. **Roadmap Phase 5 section:** `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\roadmap.md` — read lines 322 through 358 specifically. Note the 7 tasks (canonical IDs, resolved-edge endpoints, unresolved/ambiguous separation, edge schema, header-import coexistence, legacy builder removal, single authoritative path) and the 5 exit criteria.

2. **Phase 0 ground-truth tests:** `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\__tests__\pipeline\graph-ground-truth.test.ts`. Read every test. Phase 5 must finally flip:
   - Test 1, **line 52** (`ids.has(edge.source)` and corresponding target check) — endpoint-is-node-id assertion. STAYED FAIL through Phases 3 and 4 because both phases emitted resolved edges using the legacy endpoint format. Phase 5 promotes endpoints to canonical codeRefIds.
   - All other test assertions are already PASSING from Phase 3/4 work — verify your reading of the test file matches that claim. Phase 5 must NOT break any of them.

3. **Phase 4 archived plan + execution-notes (your direct predecessor):**
   - `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\coderef\archived\pipeline-call-resolution\plan.json`
   - `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\coderef\archived\pipeline-call-resolution\execution-notes.md`
   - Note Phase 4's resolved-call edge emission pattern. It used the SAME endpoint format Phase 3 used for resolved-import edges. Phase 5 promotes BOTH.

4. **Phase 3 archived plan (the import-resolution precedent):**
   - `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\coderef\archived\pipeline-import-resolution\plan.json`
   - Note `resolved-import` edge type and how it consumed canonical codeRefIds for endpoints.

5. **Existing graph builder surface:**
   - `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\src\export\graph-exporter.ts` — current graph builder. ExportedGraph type definition. Current edge schema (likely missing some Phase 5 fields).
   - `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\src\pipeline\orchestrator.ts` — where graph.edges.push happens for resolved-import (Phase 3) and resolved-call (Phase 4). Phase 5 may consolidate or refactor this.
   - Grep `src/` for ALL places that push to `graph.edges` or `graph.nodes`. Phase 5 must reconcile every emission path. Roadmap task 6 says "Remove incompatible graph builders or mark them legacy" — list every emission point you find.

6. **PipelineState surface:** `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\src\pipeline\types.ts`. Focus on `state.graph: ExportedGraph`. Phase 5 may need to add fields per the roadmap edge-schema spec (id, sourceId, targetId, relationship, resolutionStatus, evidence, source location, candidates).

7. **Header-import edge concern:** Roadmap task 5 says `header-import` edges must coexist with AST `import` edges without merging. They must be independently queryable so consumers can detect header drift (a header-import edge with no matching AST import edge is suspicious). Phase 2.5 introduced HeaderImportFact; Phase 3 emits ImportResolution for header imports too. Phase 5 must surface BOTH as graph edges with distinct relationship values (`import` vs `header-import`). Verify your reading of the current emission state — is Phase 3 already emitting both, or only AST imports?

## Specific Risks To Surface in analysis.json (do NOT skip these)

- **R-PHASE-5-A: Endpoint promotion breaks legacy edge consumers.** Phase 3/4 emitted edges with the existing endpoint format (likely file-grain or element-name strings). Promoting all endpoints to canonical codeRefIds may break any consumer that expected the old format. Audit `src/` and `__tests__/` for endpoint format assumptions BEFORE planning the promotion.
- **R-PHASE-5-B: Multi-emission-point reconciliation.** If grep finds graph.edges.push in N different files, Phase 5 must consolidate or coordinate them all. Pick one: (a) consolidate into a single emission point in graph-exporter.ts (cleaner but bigger blast radius), (b) leave emissions distributed but enforce schema via runtime assertion (smaller change, more places to break later). Document the choice.
- **R-PHASE-5-C: Header-import coexistence vs deduplication.** Roadmap forbids merging header-import edges with AST import edges. But what if the same module:symbol pair appears in both? Phase 5 emits TWO edges, not one. This is intentional per the drift-detection use case — but it doubles the edge count for files where headers match AST. Document the cardinality impact and verify no test asserts "exactly one edge per import."
- **R-PHASE-5-D: The Phase 0 endpoint-is-node-id flip.** This is the FIRST phase that flips line 52 of test 1. Plan must specify the exact mechanism (modify the existing edges' endpoints in place vs emit new edges with promoted endpoints alongside legacy ones vs delete legacy emissions and rebuild). Each path has different blast radius. Pick one.

## Specific Decision Records To Land in analysis.json (minimum FOUR)

- **DR-PHASE-5-A: Endpoint format for non-resolved edges.** Resolved edges use canonical codeRefIds. Unresolved/ambiguous/external/builtin/dynamic/typeOnly/stale edges have no clean target. Two options: (a) omit `targetId` entirely for non-resolved kinds (sourceId + resolutionStatus + reason are enough); (b) emit a synthetic `unresolved:<specifier>` placeholder targetId. Pick one.
- **DR-PHASE-5-B: Single authoritative graph construction path (roadmap task 7).** Where does the canonical builder live? graph-exporter.ts? A new src/pipeline/graph-builder.ts? Document the home and the migration path for existing emissions.
- **DR-PHASE-5-C: Legacy graph output disposition (roadmap task 6).** "Mark legacy" or "remove"? If marked legacy, when does it get removed? If removed in Phase 5, what consumers break (`.coderef/exports/graph.json` shape change is highly visible)?
- **DR-PHASE-5-D: Edge ID strategy.** Roadmap edge schema requires an `id` field. Hash of (sourceId, relationship, targetId, sourceLocation)? Sequential counter? UUID? Document the choice and uniqueness guarantee.

## Required Output Shape

### context.json

```json
{
  "scope": {
    "in": ["..."],
    "out": ["..."]
  },
  "project_id": "coderef-core",
  "phase": "Phase 5 - Graph Construction",
  "workorder_id": "WO-PIPELINE-GRAPH-CONSTRUCTION-001",
  "feature_name": "pipeline-graph-construction",
  "acceptance_criteria": [
    "AC-01: ...",
    "..."
  ]
}
```

`scope.in` MUST cover (at minimum):
- All graph nodes use canonical element codeRefIds
- All resolved edges use codeRefId endpoints (both source AND target); flip Phase 0 test 1 line 52
- Unresolved/ambiguous/external/builtin edges remain queryable but do NOT masquerade as resolved
- Implement edge schema per roadmap line 335-344 (id, sourceId, targetId, relationship, resolutionStatus, evidence, source location, candidates)
- Header-import edges (relationship='header-import') coexist with AST import edges (relationship='import') without merging — both queryable
- Remove or mark legacy any incompatible graph builders (roadmap task 6)
- Choose one authoritative graph construction path (roadmap task 7) and document it
- Add Phase 6 boundary enforcer test (no validation work leaks)

`scope.out` MUST list:
- Phase 6 output validation (--strict-headers gate, semantic header validation, schema enforcement at write time)
- Phase 7 indexing / RAG facets
- Phase 8 documentation sync
- Type inference beyond what Phase 4 already does (DR-PHASE-4 boundary stays held)

`acceptance_criteria` MUST cover (at minimum, expand as needed):
- Every graph.node has a canonical codeRefId as its id
- Every resolved edge's source AND target appear in graph.nodes (Phase 0 test 1 line 52 flip)
- Every edge satisfies the new schema (id, sourceId, relationship, resolutionStatus mandatory; targetId/evidence/sourceLocation/candidates conditional per kind)
- Header-import edges and AST import edges coexist with distinct relationship values; same module:symbol pair from both sources produces TWO edges (intentional, per drift-detection use case)
- Unresolved/ambiguous/external/builtin/dynamic/typeOnly/stale edges remain queryable in state.graph but NEVER appear with a resolved-edge endpoint format
- Graph traversal helpers (if any exist) only traverse resolved edges by default; non-resolved are opt-in
- Legacy graph output is either removed OR explicitly marked legacy with deprecation note (per DR-PHASE-5-C)
- Resolution is deterministic and pure (mirror Phase 3/4's INVARIANT)
- Phase 6 boundary enforcer: no validation/gate work leaks into Phase 5 (mirror Phase 4's pattern)

### analysis.json

ALL of these blocks must be substantive:

- `blast_radius` — files Phase 5 will touch (existing src/export/graph-exporter.ts + src/pipeline/orchestrator.ts + new src/pipeline/graph-builder.ts if chosen + tests). Use absolute paths. Escape Windows backslashes (Phase 3 V1 prep failed on this; Phase 4 prep also tripped).
- `risks` — minimum the 4 R-PHASE-5-A through R-PHASE-5-D above plus any others you identify.
- `decision_records` — minimum the 4 DR-PHASE-5-A through D above with concrete decisions, not just "TBD".
- `resolution_surface` — graph.node shape, edge schema fields, edge kinds (resolved | unresolved | ambiguous | external | builtin | dynamic | typeOnly | stale, mirroring Phase 3+4 union), edge cases (header-import vs AST import duplication, re-export chains, namespace imports, default exports, builtin call edges).
- `ground_truth_test_mapping` — for graph-ground-truth.test.ts test 1 line 52, identify the exact assertion and how Phase 5 makes it PASS. For other tests, confirm Phase 5 does NOT break the existing PASS state.
- `cross_phase_dependencies` (REQUIRED BLOCK) — document Phase 3 → Phase 5 seam (Phase 5 reads ImportResolution[] to build resolved-import edges with promoted endpoints), Phase 4 → Phase 5 seam (Phase 5 reads CallResolution[] to build resolved-call edges with promoted endpoints), Phase 2.5 → Phase 5 seam (Phase 5 emits header-import edges from HeaderImportFact-driven ImportResolutions, distinct from AST-driven ones). Document the Phase 5 → Phase 6 emission contract: what schema invariants Phase 6's validator will check.
- `test_planning_notes` — note the test 1 line 52 flip mechanism. Note any pre-existing tests that may need adjustment (especially `pipeline-snapshot.test.ts` which had a known pre-existing failure verified during Phase 3/4 closes — Phase 5 may finally fix it OR leave it). Specify the Phase 6 boundary enforcer test (no-output-validation.test.ts pattern).

## Output Path

Write to:
- `coderef/workorder/pipeline-graph-construction-prep/context.json`
- `coderef/workorder/pipeline-graph-construction-prep/analysis.json`

Do NOT modify this PREP-BRIEF.md.

When done, exit. Do not start implementation. Do not edit source. Do not commit.

## Lessons From Phase 3/4 Prep (apply to your work)

- **Use absolute paths in blast_radius.** Phase 3 V1 had path corruption.
- **Escape Windows backslashes in JSON strings** (`C:\\Users\\...` not `C:\Users\...`). Phase 3 V1 produced unparseable JSON because Gemini emitted raw backslashes that JSON.parse interpreted as escape sequences. Phase 4 prep on Flash Lite emitted JSON to stdout instead of writing files — both are path-handling failure modes worth avoiding.
- **decision_records and risks must be SPECIFIC to Phase 5.** Generic risk catalogs are unusable for plan authoring. Use the concrete IDs (R-PHASE-5-A, DR-PHASE-5-A) and concrete mitigations.
- **Read every file path you cite.** Don't claim a file doesn't exist without confirming via Read. Phase 3 V1 claimed tsconfig.json didn't exist when it did.
- **Cite test file paths exactly.** Quote the assertion you're discussing, with line numbers.
- **Validate JSON parses before exiting.** Run JSON.parse on your output mentally (or actually) before writing.

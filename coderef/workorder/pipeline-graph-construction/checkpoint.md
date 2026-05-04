# Checkpoint: structural_foundation_review

**Workorder:** WO-PIPELINE-GRAPH-CONSTRUCTION-001
**Dispatch:** DISPATCH-2026-05-02-015
**Phase:** 5 (sequence 7/10; Phase 0/1/2/2.5/3/4 archived)
**Halt point:** after task 1.6c (Phase 6 boundary enforcer in place)
**Status:** ready_for_review

---

## Review items per dispatch

### (a) Single authoritative builder established

**Where:** `src/pipeline/graph-builder.ts`

`constructGraph(state)` is the public entry point. Internal:
`buildNodes` (pass 1, AC-01) and `buildEdges` (pass 2, AC-02 through
AC-05; pass-2 implementation lands in tasks 1.7–1.9). Halt-on-null
assertions on `state.importResolutions` AND `state.callResolutions`
at the top of `constructGraph` enforce cross-phase ordering
(R-PHASE-4-B parallel for Phase 5).

```ts
export function constructGraph(state: PipelineState): ExportedGraph {
  if (state.importResolutions === null || state.importResolutions === undefined) throw ...;
  if (state.callResolutions === null || state.callResolutions === undefined) throw ...;
  const nodes = buildNodes(state);
  const nodeIdSet = new Set(nodes.map(n => n.id));
  const edges = buildEdges(state, nodeIdSet);  // skeleton — pass-2 lands in 1.7-1.9
  return { version: '1.0.0', exportedAt: Date.now(), nodes, edges, statistics: {...} };
}
```

The orchestrator (`src/pipeline/orchestrator.ts:417+`) wires the
call. At checkpoint: constructGraph runs and produces a `v2Graph`
that is intentionally discarded — the pre-Phase-5 inline emission
sites (Phase 3 resolved-import push, Phase 4 resolved-call push,
import/call enrichment loops, inline buildGraph) remain in place
so the existing test suite stays green at checkpoint review. Tasks
1.7–1.9 implement `buildEdges`, then swap `state.graph = v2Graph`
and delete the inline sites in one atomic move.

### (b) Edge schema adopts the 8-field shape

**Where:** `src/pipeline/graph-builder.ts:GraphEdgeV2` and
`src/export/graph-exporter.ts:ExportedGraph['edges']`.

Eight canonical fields per DR-PHASE-5-D:

```ts
{
  id: string;                                 // REQUIRED — deterministic 16-hex hash
  sourceId: string;                            // REQUIRED — canonical codeRefId
  targetId?: string;                           // CONDITIONAL — present only when resolved (DR-PHASE-5-A)
  relationship: EdgeRelationship;              // REQUIRED — import|call|export|header-import
  resolutionStatus: EdgeResolutionStatus;      // REQUIRED — 8-kind enum
  evidence?: Record<string, unknown>;          // CONDITIONAL — keyed by relationship kind
  sourceLocation?: { file: string; line: number };
  candidates?: string[];                       // CONDITIONAL — present only for ambiguous (>=2 entries)
}
```

Legacy `source`/`target`/`type`/`metadata` fields are kept on
`ExportedGraph['edges']` (marked `@deprecated` in JSDoc) for the
duration of Phase 5 to support consumers transitioning to the new
canonical fields. A future cleanup workorder removes the legacy
fields.

`computeEdgeId` (DR-PHASE-5-D) hashes `sourceId:relationship:
(targetId ?? originSpecifier):sourceFile:line` with sha1 truncated
to 16 hex chars. Public-exported for testability.

### (c) Legacy DependencyGraph builders marked @legacy (NOT deleted)

**Files marked:**

- `src/analyzer/graph-builder.ts` — module JSDoc updated with
  `@legacy` + `@deprecated` tags pointing at
  `src/pipeline/graph-builder.ts`. Removal scheduled for a
  dedicated cleanup workorder per DR-PHASE-5-C.
- `src/plugins/plugin-graph.ts` — same treatment. Plugin hook
  surface for ExportedGraph is not yet defined; the module
  continues to push to the legacy DependencyGraph for plugin
  consumers that have not migrated.

**Not deleted** because (1) DependencyGraph is still consumed by
non-pipeline code paths (RAG integration tests under
`src/integration/rag/__tests__/`), and (2) the canonical pipeline
path (`orchestrator.ts → src/pipeline/graph-builder.ts`) does not
import from either legacy module — confirmed at the import-graph
level. AC-07 test (task 1.17) will assert this isolation.

### (d) The 6 inline graph mutation sites — current status

| # | site | location (current) | disposition at checkpoint | post-task-1.7-1.9 |
|---|---|---|---|---|
| 1 | resolved-import push | orchestrator.ts:220-233 | retained (legacy parallel) | DELETED |
| 2 | resolved-call push | orchestrator.ts:312-326 | retained (legacy parallel) | DELETED |
| 3 | import enrichment loop | orchestrator.ts:239-288 | retained (legacy parallel) | DELETED |
| 4 | call enrichment loop | orchestrator.ts:337-415 | retained (legacy parallel) | DELETED |
| 5 | inline buildGraph (`buildGraph` method, line 651+) | orchestrator.ts | retained — produces nodes consumed by sites 1-4 | REPLACED with thin call to constructGraph |
| 6 | DependencyGraph.edges.push (legacy) | src/analyzer/graph-builder.ts + src/plugins/plugin-graph.ts | marked @legacy, NOT deleted | unchanged (cleanup workorder owns deletion) |

**Migration mechanism (Option B per R-PHASE-5-A):** retire
`'imports'`/`'calls'` type strings; re-emit as `'import'`/`'call'`
with `sourceId`/`targetId` codeRefId endpoints in the new schema.
Tests' `findEdge(graph, 'imports', './alpha')` lookup migrates to
`findEdge(graph, 'import', sourceId)` with `evidence.originSpecifier
=== './alpha'` (task 1.10).

### (e) Endpoint-promotion mechanism is Option B

**Decision recorded.** Option A (mutate endpoint on existing edges
in-place) was rejected: it leaves old type strings and confuses
consumers that filter by edge type. Option C (emit parallel
edges) was rejected: duplicate edges per import/call. Option B
(retire old type strings, re-emit with new schema) is what
graph-builder implements. `findEdge` test helper migration is
explicit work in task 1.10.

### (f) Boundary enforcer transition

**Phase 4 boundary enforcer DELETED:**
`__tests__/pipeline/no-graph-construction-leaks.test.ts` was Phase
4's boundary asserting Phase 5 fields would NOT leak into Phase 4.
Phase 5 IS graph construction; the enforcer is now obsolete.
Mirrors Phase 4's deletion of Phase 3's
`no-call-resolution.test.ts`.

**Phase 6 boundary enforcer CREATED:**
`__tests__/pipeline/no-output-validation.test.ts`. Asserts no
Phase 6 fields (`strictHeadersViolation`, `headerDriftScore`,
`schemaValidationResult`, `outputGateResult`, `strictHeadersMode`,
`validationResults`, `outputConstraints`, `validationErrors`) leak
onto graph nodes / edges / CallResolution / ImportResolution /
PipelineState. Pattern matches the previous boundary enforcers
(Phase 3's `no-call-resolution.test.ts`, Phase 4's
`no-graph-construction-leaks.test.ts`). Test PASSES on first run.

---

## Tasks complete (1.1 → 1.6c)

| # | verb | description | status |
|---|---|---|---|
| 1.1 | READ | prep deliverables (context.json + analysis.json + plan.json + roadmap line 322-358) | done |
| 1.2 | READ | orchestrator.ts emission sites + ExportedGraph schema + ground-truth test layout | done |
| 1.3 | WRITE | `src/pipeline/graph-builder.ts` skeleton — constructGraph entry + buildNodes (pass 1 implemented) + buildEdges (skeleton) + computeEdgeId + isHeaderDerived | done |
| 1.4 | EDIT | `src/export/graph-exporter.ts` — 8-field canonical edge shape added; legacy fields kept @deprecated | done |
| 1.5 | EDIT | `src/pipeline/orchestrator.ts` — Step 4.7 wires constructGraph(state); v2Graph built and discarded for checkpoint review | done |
| 1.6 | EDIT | `src/analyzer/graph-builder.ts` + `src/plugins/plugin-graph.ts` marked @legacy / @deprecated, NOT deleted | done |
| 1.6b | DELETE | `__tests__/pipeline/no-graph-construction-leaks.test.ts` (obsolete Phase 4 boundary) | done |
| 1.6c | WRITE | `__tests__/pipeline/no-output-validation.test.ts` (new Phase 6 boundary) — PASSES | done |

**tsc --noEmit:** clean.
**Pipeline test suite at checkpoint:** 93/94 PASS (same as Phase 4
close). The single failure is `graph-ground-truth.test.ts` test 1
line 52 endpoint-is-node-id — STILL FAIL because pass-2 buildEdges
hasn't landed yet. Tasks 1.7–1.9 will flip it.

---

## Outstanding design call for ORCHESTRATOR

**`buildEdges` skeleton returns empty.** At checkpoint review, this
is intentional: the constructGraph call is wired, the v2Graph is
built (with full nodes pass-1 but empty edges pass-2), and then
discarded. The legacy inline emission sites (resolved-import push,
resolved-call push, enrichment loops, inline buildGraph nodes/
edges) are RETAINED so the test suite stays green. This is the
"checkpoint snapshot" state.

After ORCHESTRATOR signal, tasks 1.7–1.9 implement `buildEdges`
fully (import + call + header-import edges, evidence assembly,
edge-id hashing), then task 1.10 migrates the findEdge helper, then
task 1.18 runs the full test suite to verify (i) test 1 line 52
flips to PASS as the headline result, (ii) all other ground-truth
tests stay PASSING, (iii) no new regressions.

Two specific design calls inside pass-2 implementation:

1. **`evidence` field shape per relationship kind.** Prep notes
   suggest `{resolvedModuleFile, originSpecifier, localName}` for
   resolved imports and `{calleeName, receiverText, scopePath}`
   for calls. Confirm or adjust before pass-2 lands.

2. **Edge ordering / determinism.** `state.importResolutions` and
   `state.callResolutions` are already ordered deterministically
   (Phase 3 + Phase 4 emit in deterministic file/line order). Edge
   list will inherit that ordering. AC-08 determinism test (1.15)
   verifies. No edge sorting needed.

**Awaiting ORCHESTRATOR signal:** PROCEED to tasks 1.7–1.21, OR
adjustments to evidence shape, OR other review feedback. Pass-2
implementation gates on this answer.

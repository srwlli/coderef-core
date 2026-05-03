# Phase 4 Prep Brief — Call Resolution

You are a **read-only prep agent** for Phase 4 of the CodeRef Core 9-phase pipeline rebuild.

Phase 3 (Import Resolution) shipped and archived 2026-05-03 (commit range bdd2892..ad736de on coderef-core/main; archive commit 8d6872d). Phase 4 picks up where Phase 3 left off: **resolve calls** to unique element IDs when possible. Phase 4 is the FINAL phase before the 2 fully call-only Phase 0 ground-truth tests can flip from FAIL to PASS, and the call-side assertions in 4 of 6 ground-truth tests will also flip in this phase.

## Role Boundaries (HARD)

- **Read-only.** No source code edits. No staging. No commits.
- Write `context.json` and `analysis.json` in this directory: `coderef/workorder/pipeline-call-resolution-prep/`
- Do NOT modify this PREP-BRIEF.md.
- Hand back when done.

## Required Reading (use specific paths — Phase 3 prep had file-not-found errors when paths were vague)

1. **Roadmap Phase 4 section:** `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\roadmap.md` — read lines 274 through 320 specifically. Note the 5 call-resolution states (resolved | unresolved | ambiguous | external | builtin) and the 4 exit criteria.

2. **Phase 0 ground-truth tests:** `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\__tests__\pipeline\graph-ground-truth.test.ts`. Read every test. Phase 4 must flip the call-side of these 4 tests:
   - `requires resolved import and call edges to use graph node IDs as endpoints` (call side)
   - `requires unresolved imports and calls to be explicit graph facts` (call side)
   - `requires duplicate function name calls to be marked ambiguous with candidate IDs` (FULLY call-only — this is the first time it flips)
   - `requires nested functions and class method calls to preserve qualified context` (FULLY call-only — first time it flips)
   - `requires graph validation to distinguish resolved, unresolved, and ambiguous edges` (call side)
   - The endpoint-is-node-id assertion in test 1 stays FAIL — that's Phase 5 work, not Phase 4.

3. **Phase 3 archived plan + execution-notes (your direct predecessor):**
   - `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\coderef\archived\pipeline-import-resolution\plan.json`
   - `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\coderef\archived\pipeline-import-resolution\execution-notes.md`
   - Note Phase 3's two-pass pattern (pass 1 build tables, pass 2 resolve). Phase 4 may reuse the pattern.

4. **Phase 2 raw-fact types:** `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\src\pipeline\types.ts` — focus on `RawCallFact` (Phase 4 consumes this; it carries `receiverText`, `calleeName`, `scopePath`). Phase 4 builds the resolution layer on top.

5. **Phase 3 import resolver (your direct precedent for resolution architecture):**
   - `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\src\pipeline\import-resolver.ts` — note `ImportResolution` shape, the 7-kind classification, the public surface `resolveImports / buildExportTables / resolveAstImports / resolveHeaderImports / classifyBareSpecifier`. Phase 4's `resolveCalls` should mirror this shape where it makes sense, diverge where calls differ from imports.

6. **Phase 3 ImportResolution + bound local names:** Phase 3 emits `ImportResolution.localName` bound to `resolvedTargetCodeRefId` for each imported binding. Phase 4 NEEDS this binding — when a call's `receiverText` matches a local name from a Phase 3 ImportResolution, the call's resolution can short-circuit to the imported codeRefId. Document this Phase 3 → Phase 4 seam.

7. **PipelineState surface:** Look at `state.calls`, `state.rawCalls`, `state.importResolutions`. Phase 4 will add `state.callResolutions: CallResolution[]`. Confirm there's no existing field name collision.

8. **Existing call-related tests:** Grep `__tests__/pipeline/` for filenames matching `call*` or `raw-call*`. Identify any pre-existing tests Phase 4 must keep passing.

## Required Output Shape

### context.json

```json
{
  "scope": {
    "in": ["..."],
    "out": ["..."]
  },
  "project_id": "coderef-core",
  "phase": "Phase 4 - Call Resolution",
  "workorder_id": "WO-PIPELINE-CALL-RESOLUTION-001",
  "feature_name": "pipeline-call-resolution",
  "acceptance_criteria": [
    "AC-01: ...",
    "..."
  ]
}
```

`scope.in` MUST cover (at minimum):
- Build scope-aware symbol table (file, function, class, method, imported)
- Resolve calls in priority order (local → enclosing → class → imported bindings → same-file exports → global if unambiguous)
- Classify every RawCallFact into one of {resolved, unresolved, ambiguous, external, builtin}
- Method-call uncertainty preservation (`this.method()` vs `obj.method()` vs builtin `arr.map()`)
- Built-in detection (do NOT treat Array.prototype.map et al. as project edges)
- Emit resolved-call graph edges using canonical codeRefIds (gated on kind='resolved' AND both endpoints bound)
- Consume Phase 3's ImportResolution.localName bindings for imported-symbol calls
- Add `state.callResolutions` to PipelineState
- Phase 4 boundary enforcer test (no Phase 5 graph construction work leaks)

`scope.out` MUST list:
- Phase 5 graph construction (general node-id endpoints, edge schema rebuild)
- Phase 6 --strict-headers gate
- Phase 7 indexing / RAG
- Phase 8 documentation

`acceptance_criteria` MUST cover (at minimum, expand as needed):
- Every RawCallFact produces exactly one CallResolution; no silent drops
- Built-in calls (Array/Object/String prototype methods) classify as `builtin`, NEVER produce project graph edges
- `this.method()` resolution restricted to class scope when receiver is `this`
- `obj.method()` with no type inference → ambiguous OR unresolved (NEVER silently resolved)
- Duplicate function names across files → ambiguous with candidate codeRefIds[] populated
- Nested function and class method calls preserve qualifying scope path (Phase 2 RawCallFact already carries scopePath — Phase 4 honors it during resolution)
- Calls to imported symbols resolve via Phase 3's ImportResolution.localName binding (cross-phase seam)
- Resolution is deterministic and pure over PipelineState (mirror Phase 3's INVARIANT)
- Symbol-table-build phase completes before resolve phase begins (mirror Phase 3's two-pass invariant)
- NO graph construction work leaks (Phase 5 boundary enforcer)
- Phase 0 ground-truth call assertions flip from FAIL to PASS in this phase (4 tests' call-side + 2 fully-call-only tests)

### analysis.json

ALL of these blocks must be substantive:

- `blast_radius` — files Phase 4 will touch (existing src/pipeline/* + new src/pipeline/call-resolver.ts + tests)
- `risks` — Phase 4-specific. AT MINIMUM:
  - **R-PHASE-4-A:** Built-in detection cardinality. The list of "what counts as a builtin" is unbounded (every Array/Object/String/Map/Set/Promise/etc. method). Strategy: maintain an allowlist of known-builtin receivers, treat unknown receivers as ambiguous-or-unresolved (NOT builtin). Document where the allowlist lives and how it's updated.
  - **R-PHASE-4-B:** Cross-phase seam with Phase 3. If Phase 3's ImportResolution.localName is missing or stale, Phase 4 will silently misclassify imported-symbol calls. Mitigation: Phase 4 must depend on Phase 3 having run, and assert state.importResolutions is non-null before resolveCalls runs.
  - **R-PHASE-4-C:** Method-call type inference is the deepest unbounded subproblem. `obj.method()` requires knowing obj's type. Phase 4 must NOT attempt full type inference (that's Phase 5+ or out-of-scope entirely). Strategy: when receiver type is unknown → ambiguous OR unresolved (per receiver-text-matches-known-symbol).
  - **R-PHASE-4-D:** Phase 0 ground-truth assertions flipping. This phase flips MORE assertions than Phase 3 did (Phase 3 flipped 4 import-side; Phase 4 flips 4 call-side + 2 fully-call-only). Plan must specify the mechanism for each (delete failing assertion vs add new passing assertion vs flip existing) to avoid disguising regressions as wins.
- `decision_records` — minimum FOUR records:
  - **DR-PHASE-4-A:** Built-in detection strategy (allowlist vs heuristic vs runtime probe) — pick one and document why.
  - **DR-PHASE-4-B:** Method-call ambiguous-vs-unresolved policy (when does `obj.method()` go to ambiguous with candidates vs straight to unresolved?).
  - **DR-PHASE-4-C:** Cross-phase consumption of Phase 3 ImportResolution. Phase 4 reads-only or copies-and-augments? Document.
  - **DR-PHASE-4-D:** Two-pass timing. Symbol-table build is pass 1; resolve is pass 2. Mirror Phase 3? Or single-pass since RawCallFact already carries scopePath? Justify the choice.
- `resolution_surface` — call_kinds (resolved, unresolved, ambiguous, external, builtin), edge cases (this.method, obj.method with vs without inference, super.method, dynamic dispatch via property access, IIFE calls, callback invocations), builtin_strategy (concrete: which receivers are allowlisted, where the list lives)
- `ground_truth_test_mapping` — for each of the 6 graph-ground-truth tests, identify which call-side assertions flip in Phase 4 vs which stay FAIL forever (some may be Phase 5 endpoint-is-node-id work that will only flip in Phase 5)
- `cross_phase_dependencies` (REQUIRED BLOCK) — document the Phase 3 → Phase 4 seam: how Phase 4 consumes ImportResolution.localName for imported-call resolution. Document the Phase 4 → Phase 5 seam: what Phase 4 emits that Phase 5 will consume for graph construction.
- `test_planning_notes` — note that Phase 4 must keep Phase 3 tests passing (no regressions); list any pre-existing call-related tests in __tests__/pipeline/ that Phase 4 must reconcile or delete; specify the Phase 5 boundary enforcer test (no-graph-construction.test.ts pattern, mirroring Phase 3's no-call-resolution.test.ts).

## Output Path

Write to:
- `coderef/workorder/pipeline-call-resolution-prep/context.json`
- `coderef/workorder/pipeline-call-resolution-prep/analysis.json`

Do NOT modify this PREP-BRIEF.md.

When done, exit. Do not start implementation. Do not edit source. Do not commit.

## Lessons From Phase 3 Prep (apply to your work)

- Use absolute paths in blast_radius (Phase 3 V1 had path corruption).
- Escape Windows backslashes in JSON strings (`C:\\Users\\...` not `C:\Users\...`) — Phase 3 V1 produced unparseable JSON because Gemini emitted raw backslashes that JSON.parse interpreted as escape sequences.
- decision_records and risks must be SPECIFIC to Phase 4. Generic risk catalogs are unusable for plan authoring — repeat what Phase 3 V2 did, with concrete IDs and concrete mitigations.
- Read tsconfig.json + package.json before claiming they don't exist.
- Cite test file paths exactly when discussing ground-truth flips.

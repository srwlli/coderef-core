# Phase 6 Prep Brief — Output Validation + --strict-headers Gate

You are a **read-only prep agent** for Phase 6 of the CodeRef Core 9-phase pipeline rebuild.

Phase 5 (Graph Construction) shipped and archived 2026-05-04 (commit range 1e7bb74..ac8dc8e on coderef-core/main; archive commit 39ff088). **All 6 Phase 0 ground-truth assertions now PASS** — the canonical-identity / resolution / graph-construction layers are complete.

**Phase 6 is structurally different from Phases 3/4/5.** Those phases were *behavioral* — they built new pipeline behavior, and Phase 0 ground-truth tests flipped from FAIL to PASS as the new behavior landed. **Phase 6 is *enforcement* — there are no new ground-truth tests to flip. Every assertion already PASSES.** Phase 6 owns making sure that bad graph state cannot leave the pipeline silently. The blast radius is the writer boundary, not the analyzer.

## Role Boundaries (HARD)

- **Read-only.** No source code edits. No staging. No commits.
- Write `context.json` and `analysis.json` in this directory: `coderef/workorder/pipeline-output-validation-prep/`
- Do NOT modify this PREP-BRIEF.md.
- Hand back when done.

## Required Reading (use specific paths)

1. **Roadmap Phase 6 section:** `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\roadmap.md` — read lines 362 through 406. Note the 5 task groups (graph validation, semantic header validation, validation report stats, fail-hard policy, --strict-headers gate behavior) and the 4 exit criteria.

2. **Phase 5 archived plan + execution-notes (your direct predecessor):**
   - `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\coderef\archived\pipeline-graph-construction\plan.json`
   - `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\coderef\archived\pipeline-graph-construction\execution-notes.md`
   - Note Phase 5's 8-field edge schema, the discriminated-union EdgeEvidence (10 variants), and the Phase 6 boundary enforcer test (`__tests__/pipeline/no-output-validation.test.ts`) that Phase 5 created and which Phase 6 will DELETE on entry.

3. **Phase 6 boundary enforcer (delete this on entry):** `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\__tests__\pipeline\no-output-validation.test.ts`. Phase 6 IS output validation — the enforcer is now obsolete. Same pattern Phase 4 used (deleted `no-call-resolution.test.ts`) and Phase 5 used (deleted `no-graph-construction-leaks.test.ts`).

4. **Graph schema (Phase 5 output):** `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\src\pipeline\graph-builder.ts`. Note `constructGraph(state)` returns `ExportedGraph`. Phase 6 validation runs AFTER constructGraph but BEFORE the graph is written to disk or returned to a caller. The validator reads the ExportedGraph + PipelineState and either (a) lets the pipeline proceed (validation PASS), (b) emits a warning (header drift, default mode), or (c) throws to fail-hard (graph integrity violation OR header drift under --strict-headers).

5. **Semantic header surface:** `C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\src\pipeline\semantic-header-parser.ts` (Phase 2.5) + `src/pipeline/header-fact.ts` + the @exports cross-check at `orchestrator.ts:382-390` (Phase 2.5's per-file cross-check that already runs). Phase 6 does NOT re-implement the cross-check; it READS HeaderFact.headerStatus values and AGGREGATES the counts in the validation report.

6. **Layer enum:** `C:\Users\willh\Desktop\CODEREF\ASSISTANT\STANDARDS\layers.json`. Phase 6's semantic validator checks every file with `headerStatus === 'defined'` has a `@layer` value from this enum. Phase 2.5 already validates @layer at parse time — Phase 6 catches drift between parse-time (definition existed) and write-time (definition still in layers.json now).

7. **Existing pipeline write surface:** Grep `src/` for the code path that writes `.coderef/exports/graph.json`, `.coderef/index.json`, `.coderef/semantic-registry.json`. Phase 6 inserts validation BEFORE these writes. Identify the single chokepoint where validation should hook in.

8. **CLI surface for --strict-headers:** Grep `src/cli/` and `src/index.ts` (or wherever populate-coderef's CLI lives) for existing flag handling. The `--strict-headers` flag is NEW in Phase 6 and needs a CLI argument parser hook.

## Specific Risks To Surface in analysis.json

- **R-PHASE-6-A: Validation chokepoint location.** Phase 6 needs ONE clear "before write" hook. If the codebase has multiple write paths (graph.json, index.json, registry.json, semantic-registry.json) each fired separately, Phase 6 must validate at the latest possible point that still precedes ALL writes — OR add validation per-write with shared validator code. Document which approach. Recommend a single `validatePipelineState(state, options)` call in orchestrator.ts that runs once after constructGraph and before the writer chain begins.
- **R-PHASE-6-B: Fail-hard vs warning policy granularity.** Roadmap line 399: graph integrity fails hard ALWAYS; header drift warns by default and fails hard under `--strict-headers`. The boundary between "graph integrity" and "header drift" matters. Document: graph integrity = the 6 graph-validation checks (node ID uniqueness, resolved edge endpoint existence, no dangling resolved edges, valid relationship/resolutionStatus enums, no duplicate node identities). Header drift = the 3 semantic-header checks (@layer in enum, @exports match AST, @imports non-unresolved or exempt). Misclassifying header drift as graph integrity makes default mode too strict; misclassifying graph integrity as header drift makes default mode silently wrong.
- **R-PHASE-6-C: Validation report shape stability.** The 11 stats in roadmap line 387-397 (valid_edge_count, unresolved_count, ambiguous_count, external_count, builtin_count, header_defined_count, header_missing_count, header_stale_count, header_partial_count, header_layer_mismatch_count, header_export_mismatch_count) become a public artifact contract. Once consumers (CI, dashboards) read them, the field names + types are stable forever. Lock the schema NOW. Phase 6 must NOT iterate on this shape post-ship.
- **R-PHASE-6-D: --strict-headers flag default behavior across consumers.** The flag is opt-in for CI gating but must NOT change default populate-coderef behavior. Document: default = `false` (warnings only). CI sets the flag explicitly. No environment variable fallback (avoid magic). Test that without the flag, header drift produces warnings + non-zero validation_report.header_*_count fields but exit code 0; WITH the flag, the same drift produces exit code != 0.
- **R-PHASE-6-E: AC-05 honest-demotion pattern from Phase 5.** Phase 5 demoted 1/3289 ImportResolution from `resolved` to `external` when no resolvedTargetCodeRefId could be produced (an honest classification, not a malformed edge). Phase 6's resolved-edge-endpoint-existence check must NOT regress this — i.e., if an edge has resolutionStatus=`resolved` but targetId is undefined, Phase 6 must catch that as a graph integrity violation (fail-hard), forcing the resolver upstream to demote correctly. Document this as an invariant Phase 6 owns.

## Specific Decision Records To Land in analysis.json

- **DR-PHASE-6-A: Validator location.** Single file `src/pipeline/output-validator.ts`? Embedded helper inside `graph-builder.ts`? A new `src/pipeline/validation/` directory with one file per validator (graph-validator.ts + semantic-header-validator.ts)? Pick one, justify.
- **DR-PHASE-6-B: Fail-hard mechanism.** Throw an Error from validatePipelineState? Return a result object with `{ ok: boolean, errors: [], warnings: [] }` and the orchestrator decides? Console.error + process.exit? Pick one. Recommend: return result object, let the CLI/orchestrator decide exit-vs-throw based on flag state. Easier to test; doesn't couple the validator to process semantics.
- **DR-PHASE-6-C: Validation report destination.** Roadmap line 405 says "validation stats appear in generated artifacts." Where exactly? Inline in `.coderef/index.json`? New file `.coderef/validation-report.json`? Both? Pick one. New file is cleaner (separates concerns); inline is more discoverable. Recommend new file PLUS a `validation` field on index.json pointing at it.
- **DR-PHASE-6-D: --strict-headers flag plumbing.** CLI argument → PipelineOptions field → validatePipelineState option? Or environment variable? Or config file? Pick one. CLI flag is roadmap-canonical. Document the field name on PipelineOptions (recommend `strictHeaders: boolean`) and the default value (`false`).

## Required Output Shape

### context.json

```json
{
  "scope": {
    "in": ["..."],
    "out": ["..."]
  },
  "project_id": "coderef-core",
  "phase": "Phase 6 - Output Validation",
  "workorder_id": "WO-PIPELINE-OUTPUT-VALIDATION-001",
  "feature_name": "pipeline-output-validation",
  "acceptance_criteria": [
    "AC-01: ...",
    "..."
  ]
}
```

`scope.in` MUST cover (at minimum):
- Single chokepoint validator function (`validatePipelineState` or similar) called by orchestrator AFTER constructGraph and BEFORE all writers
- Graph integrity validation (6 checks: node ID uniqueness, resolved edge endpoint existence, no dangling resolved edges, valid relationship enum, valid resolutionStatus enum, no duplicate node identities)
- Semantic header validation (3 checks: @layer in STANDARDS/layers.json enum, @exports match AST, @imports non-unresolved or exempt)
- Validation report emission with all 11 stats from roadmap line 387-397
- Fail-hard policy: graph integrity violations always throw; header drift warns by default
- `--strict-headers` CLI flag promoting header drift to fail-hard
- DELETE `__tests__/pipeline/no-output-validation.test.ts` (Phase 5 boundary enforcer; Phase 6 IS output validation)
- CREATE `__tests__/pipeline/no-rag-indexing.test.ts` (or similar) as the Phase 7 boundary enforcer
- AC for Phase 5's honest-demotion invariant: edges with resolutionStatus=resolved must have targetId; Phase 6 catches as graph integrity violation

`scope.out` MUST list:
- Phase 7 indexing / RAG pipeline
- Phase 8 documentation sync
- New behavioral changes to the analyzer/resolver/graph-construction layers (Phase 6 is read-only over their output; it does NOT mutate state)
- Mid-flight repair of validation failures (Phase 6 reports + fails; downstream phases or upstream regenerations fix the root cause)

`acceptance_criteria` MUST cover (at minimum, expand as needed):
- Every Phase 5 graph that passed Phase 5's exit criteria also passes Phase 6 graph integrity validation (no false positives on real coderef-core source)
- Graph integrity violations cause `validatePipelineState` to fail with a structured error report; orchestrator translates this to non-zero exit code
- Header drift produces warnings by default; non-zero exit code only when `--strict-headers` is set
- Validation report contains all 11 stats with the exact field names from roadmap line 387-397
- Validation report destination is consistent across runs (deterministic location/shape)
- `--strict-headers` flag default is `false`; absence of the flag preserves pre-Phase-6 default behavior modulo new warning emissions
- Phase 5's honest-demotion invariant is enforced: any edge with resolutionStatus=resolved AND missing targetId is a graph integrity violation
- Resolution is deterministic and pure (mirror Phase 3/4/5 INVARIANT)
- Phase 7 boundary enforcer test passes: no indexing/RAG work leaks into Phase 6

### analysis.json

ALL of these blocks must be substantive:

- `blast_radius` — files Phase 6 will touch (use absolute paths, ESCAPE Windows backslashes properly: `C:\\Users\\...` not `C:\Users\...`). Likely: orchestrator.ts (validator hook), new src/pipeline/output-validator.ts (or similar per DR-PHASE-6-A), src/pipeline/types.ts (PipelineOptions strictHeaders field, validation report types), CLI argument parser file, new validation report writer.
- `risks` — minimum the 5 R-PHASE-6-A through R-PHASE-6-E above plus any others.
- `decision_records` — minimum the 4 DR-PHASE-6-A through D with concrete decisions (not "TBD").
- `resolution_surface` — list of all 6 graph integrity checks, all 3 semantic header checks, the 11 validation report fields, the `--strict-headers` flag plumbing path. Specify exit code behavior per failure category.
- `ground_truth_test_mapping` — Phase 6 is the FIRST phase where every Phase 0 ground-truth assertion is already PASSING. Phase 6 must NOT break any of them. List each of the 6 ground-truth tests and confirm Phase 6 leaves them PASSING.
- `cross_phase_dependencies` (REQUIRED BLOCK) — document Phase 5 → Phase 6 emission contract (what the validator reads from the ExportedGraph + PipelineState), Phase 2.5 → Phase 6 (HeaderFact.headerStatus aggregation for header report stats), Phase 6 → Phase 7 contract (what Phase 7's indexing layer can rely on Phase 6 having validated).
- `test_planning_notes` — note the Phase 6 boundary enforcer deletion + Phase 7 boundary enforcer creation. List candidate test files for the 5+ acceptance criteria. Note that pipeline-snapshot.test.ts pre-existing failure may resolve naturally if the snapshot picks up the new validation_report file shape — but Phase 6 must not treat snapshot fix as exit criterion.

## Output Path

Write to:
- `coderef/workorder/pipeline-output-validation-prep/context.json`
- `coderef/workorder/pipeline-output-validation-prep/analysis.json`

Do NOT modify this PREP-BRIEF.md.

When done, exit. Do not start implementation. Do not edit source. Do not commit.

## Lessons From Phases 3/4/5 Prep (apply to your work)

- **Use absolute paths in blast_radius. Escape Windows backslashes.** Phase 3 V1 prep produced unparseable JSON because raw backslashes were emitted; Phase 4 prep on Flash Lite emitted JSON to stdout instead of writing files. Sonnet did this correctly in Phase 5 prep.
- **Specific risks + decision records, not generic templates.** Use the concrete IDs (R-PHASE-6-A, DR-PHASE-6-A) and concrete mitigations.
- **Read every file path you cite before claiming it doesn't exist.** Run a Read tool call on tsconfig.json, layers.json, etc. before stating their state.
- **Validate JSON parses before exiting.** Run JSON.parse on your output mentally (or actually) before writing the file.
- **Phase 6 is enforcement, not behavior.** Don't propose new analyzer logic, new resolution kinds, new edge schema fields, or new graph topology changes. Phase 6 reads what Phases 1-5 produced and either passes it through or fails it. If your scope.in starts to look like Phases 3/4/5, you've drifted.

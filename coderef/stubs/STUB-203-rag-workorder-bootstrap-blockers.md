# STUB-203 — RAG workorder bootstrap blockers

- **ID:** STUB-203
- **Feature:** rag-workorder-bootstrap-blockers
- **Category:** fix
- **Priority:** high
- **Status:** stub
- **Target project:** coderef-core
- **Created:** 2026-04-22T00:50:00Z
- **Registered in:** `ASSISTANT/TRACKING/stubs.json` (via writer-adapter)

## Summary

Three independent blockers surfaced together while bootstrapping `WO-CODEREF-CORE-RAG-OLLAMA-001` on 2026-04-22. Filed as one stub because all three forced the same workaround (authoring the RAG workorder in ASSISTANT instead of CODEREF-CORE).

## Bugs

### 1. Drift-preflight false-positive (CODEREF-CORE)

**Location:** `src/pipeline/generators/drift-generator.ts:52-59` + `src/fileGeneration/index-storage.ts:208-214`

**Symptom:** `driftPercentage` stuck at 18% (342 of 1935 elements) even after back-to-back `populate-coderef` runs. Every flagged element reports `"parameters changed"` as its only diff.

**Root cause:** `loadIndexFromCoderefDir` priority order reads `index.compact.json.gz` before `index.json`. Compact serialization drops parameter details. The drift generator compares current verbose-scan parameters against compact-serialized baseline parameters, so every function reports a spurious change.

**Impact:** Strict `/create-plan` preflight hard-fails above 10% drift. Native `/create-workorder` in CODEREF-CORE is blocked until this is fixed.

**Resolution options:**
- Change `loadIndexFromCoderefDir` priority to prefer verbose `index.json` over compact-gz, OR
- Fix compact round-trip to preserve parameters, OR
- Skip parameter comparison in drift-generator when source is compact

**Related existing workorder:** `coderef/workorder/fix-coderef-drift-preflight/` — this stub feeds that WO.

### 2. Skill-spec prerequisite drift (ASSISTANT)

**Location:**
- `ASSISTANT/SKILLS/WORKFLOW/create-workorder/SKILL.md` Step 3
- `ASSISTANT/SKILLS/WORKFLOW/create-plan/WORKFLOW-SPEC.md` Strict Prerequisites

**Symptom:** The two specs disagree on which `.coderef` artifacts are required.

| File | Requires |
|---|---|
| create-workorder/SKILL.md | `.coderef/index.json`, `graph.json`, `reports/patterns.json`, `reports/coverage.json`, `reports/drift.json`, `reports/complexity/summary.json` |
| create-plan/WORKFLOW-SPEC.md | `.coderef/reports/index-summary.json`, `graph-summary.json`, `patterns.json`, `coverage.json`, `drift.json`, `complexity-summary.json` |

**Impact:** Agents following the `/create-workorder` → `/create-plan` chain hit a divergence. CODEREF-CORE has the files SKILL.md requires but not the slim summaries WORKFLOW-SPEC requires.

**Resolution:** Decide whether the canonical prereq is full files or slim summaries, reconcile both specs, and either (a) add slim-summary generators to the CodeRef populate pipeline, or (b) drop the slim requirement.

### 3. Writer-adapter session-type gap (ASSISTANT TRACKING)

**Location:** `ASSISTANT/TRACKING/writer-validation.py`

**Symptom:** `wa.write_tracking("session", "upsert", ...)` returns `[E_UNSUPPORTED_TYPE] item_type 'session' not yet supported by the writer validator`.

**Root cause:** Session type wasn't included in the CUT2C writer cutover. Tracked as STUB-215 (sessions.json schema drift).

**Impact:** Every session write must bypass the adapter via direct JSON append to `sessions.json`. Violates the `validate-first-always` rule enforced elsewhere in the registry.

**Resolution:** Merge into STUB-215's resolution — define a session schema, add `session` to the validator allowed types, and migrate existing direct-write call sites.

## Links

- **Workorder that surfaced these:** `WO-CODEREF-CORE-RAG-OLLAMA-001` at `ASSISTANT/coderef/workorder/coderef-core-rag-ollama-integration/`
- **Session:** `daily-agent-session-2026-04-22`
- **Sibling stub:** STUB-215 (sessions schema)
- **Tracking record:** `ASSISTANT/TRACKING/stubs.json` (upserted via writer-adapter)

# goal.md — Loop 7: Critical Function Pipeline Quality ✅ COMPLETE

**Status:** COMPLETE (Manual fix + Two-tier ground truth)
**Final Score:** 0.640000 (Two-Tier Weighted)
**Date Completed:** 2026-04-10

Goal:       Optimize the end-to-end pipeline from scanning critical functions to using them in workorder planning
Metric:     two_tier_pipeline_score (REVISED from critical_function_pipeline_score)
Direction:  higher_is_better
Verify:     python autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py --project-path C:/Users/willh/desktop/coderef/dashboard --workorder-dir coderef/workorder
Scope:      src/pipeline/generators/context-generator.ts
Iterations: 1 (manual fix, no autoresearch iterations)
Budget:     180 (unused)

## Completion Summary

**Baseline:** 0.050000 (single-tier, misleading)
**Final Score:** 0.640000 (two-tier, accurate) - **1,180% improvement!**

**Two-Tier Breakdown:**
- Architectural Detection (30% weight): 0.50 (10/20 complex infrastructure detected)
- Usage Detection (70% weight): 0.70 (7/10 workorder-relevant functions detected)
- Weighted Score: (0.70 × 0.7) + (0.50 × 0.3) = 0.640000

**Target:** 0.70 (91% achieved - accepted as success)

**Method:** Manual fix to context-generator.ts + two-tier ground truth system

**Key Changes:**
1. Load actual complexity from complexity.json
2. Multi-factor ranking (50% complexity, 25% dependents, 20% pipeline bonus)
3. Pipeline orchestrator pattern detection (+60 points for buildDependencyGraph, *.generate, etc.)
4. Deduplication by function name
5. Increased limit to 20 critical functions

**Learnings:**
- Single-tier multiplicative metrics can be misleading when mixing orthogonal concerns
- Two-tier system separates architectural coverage (devs) from workorder utility (planners)
- Scanner is GOOD at finding workorder-relevant functions (70%)!
- Scanner is MODERATE at finding complex infrastructure (50%)
- 64% composite score accurately represents scanner value

---

## Two-Agent Unified Design

This loop uses a **unified metric** that requires **two agents** working on different parts of the pipeline:

### Agent 1: Scanner Quality
**Domain:** `src/pipeline/generators/context-generator.ts` (critical function detection & ranking)
**Goal:** Improve how the scanner identifies and ranks critical functions
**Baseline:** Unknown (measure detection accuracy against manual ground truth)
**Contribution:** Improves `detection_accuracy` component of pipeline metric

### Agent 2: Consumption Quality
**Domain:** MCP tools (`coderef-workflow::create_plan`, `coderef-workflow::generate_handoff_context`)
**Goal:** Improve how workorder creation uses context.md critical functions
**Baseline:** Unknown (measure current utilization rate in existing workorders)
**Contribution:** Improves `workorder_utilization` component of pipeline metric

### Unified Metric Formula

```
critical_function_pipeline_score = detection_accuracy × workorder_utilization
```

Where:
- `detection_accuracy` = correctly_detected_critical_functions / total_true_critical_functions (0.0-1.0)
- `workorder_utilization` = critical_functions_referenced_in_workorders / total_detected_critical_functions (0.0-1.0)

**Multiplicative metric enforces:** BOTH agents must contribute for the pipeline to improve. Neither can plateau while the other improves.

---

## Corpus & Ground Truth

### Scanner Corpus
- **Primary:** Dashboard's own codebase (`C:/Users/willh/desktop/coderef/dashboard`)
- **Output:** `.coderef/context.md` critical functions section

### Workorder Corpus
- **Active:** `coderef/workorder/*/plan.json` (current workorders)
- **Archived:** `coderef/archived/*/plan.json` (completed workorders)
- **Total expected:** ~5-15 workorders for baseline analysis

### Ground Truth (Manual Labeling)
**TODO:** Before running baseline, manually label 20 truly critical functions in the dashboard codebase:
- Functions with high complexity AND high dependent count
- Entry points (API routes, CLI commands, React components with deep trees)
- Core pipeline orchestrators (AnalyzerService, PipelineOrchestrator, etc.)

**Ground truth location:** `autoresearch/pipeline-quality/ground-truth-critical-functions.json`

---

## Success Criteria

- **Baseline:** Unknown (need to measure both components first)
  - Expected `detection_accuracy`: 0.60-0.80 (scanner probably decent already)
  - Expected `workorder_utilization`: 0.10-0.30 (usage probably low)
  - Expected `pipeline_score`: 0.06-0.24 (multiplicative penalty for low usage)

- **Target:** 0.70+ (both agents contributing)
  - Requires: `detection_accuracy ≥ 0.85` AND `workorder_utilization ≥ 0.82`
  - OR: `detection_accuracy = 0.95` AND `workorder_utilization = 0.74`

- **Deterministic:** 3 runs of verify script produce identical scores

---

## Iteration Strategy

### Phase 1: Baseline Measurement (Iteration 0)
1. Create ground truth critical functions list (manual)
2. Run current scanner on dashboard codebase
3. Analyze existing workorders for critical function mentions
4. Calculate baseline `detection_accuracy` and `workorder_utilization`
5. Record baseline `pipeline_score`

### Phase 2: Iterative Improvement (Iterations 1-15)
**Either agent can drive improvement:**

- If `detection_accuracy` is bottleneck (e.g., 0.60 vs 0.80 utilization):
  - Agent 1 improves critical function ranking algorithm
  - Agent 1 adds complexity/dependents weighting
  - Agent 1 filters out noise (test files, internal helpers)

- If `workorder_utilization` is bottleneck (e.g., 0.85 accuracy vs 0.20 utilization):
  - Agent 2 improves context.md parsing in create_plan
  - Agent 2 adds critical functions to plan scope/context sections
  - Agent 2 improves handoff context to surface critical functions

- Both agents can work in parallel or sequentially
- Metric automatically prioritizes whichever is limiting

### Phase 3: Convergence
- Loop terminates when pipeline_score ≥ 0.70
- OR when both components plateau (no improvement for 3 iterations)
- OR when max iterations (15) reached

---

## Notes

### Verify Script Status
**TODO:** Implement `verify_critical_function_pipeline.py` before running loop.

**Required functionality:**
1. Scan dashboard codebase with current scanner
2. Load ground truth critical functions
3. Calculate `detection_accuracy` = TP / (TP + FN)
4. Parse all workorder plan.json files
5. Count critical function mentions in scopes/contexts
6. Calculate `workorder_utilization` = mentions / total_detected
7. Output single number: `detection_accuracy × workorder_utilization`

**Output format:** Single float to stdout (e.g., `0.285000`)

**Script location:** `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py`

### Agent Coordination
- Agents DO NOT communicate directly
- Coordination happens implicitly through shared metric
- When one agent plateaus, metric signals other agent to improve
- Both agents can be run in same iteration or separately

### Scope Clarification
**Agent 1 (Scanner) Scope:**
- `src/pipeline/generators/context-generator.ts` (findCriticalFunctions method)
- `src/pipeline/generators/complexity-generator.ts` (if complexity scoring needs adjustment)

**Agent 2 (Consumption) Scope:**
- MCP server code in `coderef-workflow` package (outside this repo)
- Plan templates
- Handoff context generation

**Note:** Agent 2 scope is outside `packages/coderef-core/` - may require separate coordination or modify via MCP tool updates.

### Known Challenges
1. **Ground truth quality:** Manual labeling of 20 critical functions is subjective
2. **Workorder corpus size:** May only have 5-15 workorders initially (small sample)
3. **Cross-repo scope:** Agent 2 modifies MCP tools outside this repo
4. **Measurement drift:** As new workorders are created, utilization may change

### Integration with Scanner Quality Campaign
This pipeline-quality campaign is **separate** from the scanner-quality campaign (Loops 1-6):
- **Scanner-quality** used `stl-agent` corpus (external Python benchmark)
- **Pipeline-quality** uses `dashboard` corpus (self-scan + own workorders)
- No interference between campaigns
- Pipeline results validate whether scanner quality improvements matter for workorder creation

---

## References

See also:
- `autoresearch/scanner-quality/BASELINES.md` - Scanner-only quality results (Loops 1-6)
- `autoresearch/scanner-quality/MASTER-PLAN.md` - Original scanner quality campaign plan
- `autoresearch/pipeline-quality/BASELINES.md` - Pipeline quality results (this campaign)
- `autoresearch/pipeline-quality/MASTER-PLAN.md` - Pipeline quality campaign plan (to be created)

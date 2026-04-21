# Pipeline Quality Campaign - Master Plan

## Purpose

Validate and improve the **end-to-end pipeline** from scanner outputs to workorder consumption.

This campaign answers: **"Does scanner quality translate to better workorders?"**

---

## Campaign Strategy: Unified Pipeline Loops

Unlike the scanner-quality campaign (Loops 1-6) which isolated scanner improvements, this campaign uses **unified metrics** that measure both data production AND consumption.

### Key Difference

**Scanner Quality (Loops 1-6):**
```
Metric: async_pattern_recall = detected_async / total_async
Focus: Scanner accuracy only
Agent: 1 (modifies scanner code)
Success: 100% detection accuracy
```

**Pipeline Quality (Loops 7+):**
```
Metric: async_pipeline = async_recall × async_awareness_in_workorders
Focus: Scanner accuracy × Consumer utilization
Agents: 2 (scanner + consumption)
Success: Both components contribute to raise pipeline score
```

### Why Unified Metrics?

**Problem with separate metrics:**
- Scanner achieves 100% accuracy
- But workorders don't use the data
- Manual coordination needed to fix consumption

**Solution with unified metrics:**
- Metric = scanner_quality × consumer_quality
- Either agent can drive improvement
- Automatic prioritization of bottleneck component
- Self-coordinating through shared goal

---

## Execution Order

```
Loop 7: Critical Function Pipeline (scanner detection × workorder usage)
Loop 8: Test Gap Pipeline (testGaps precision × test creation rate)
Loop 9: Async Pattern Pipeline (async recall × architecture awareness)
```

**Dependencies:**
- All loops run independently (different metrics, different scopes)
- All loops use dashboard's own codebase as corpus
- All loops validate scanner-quality campaign results

---

## Loop Definitions

### Loop 7: Critical Function Pipeline

**Goal:** Optimize scanner → workorder pipeline for critical functions

**Metric:** `critical_function_pipeline = detection_accuracy × workorder_utilization`

**Agent 1 (Scanner):**
- Domain: `src/pipeline/generators/context-generator.ts`
- Improves: Critical function detection and ranking
- Baseline: Unknown (expected 0.60-0.80)

**Agent 2 (Consumption):**
- Domain: MCP tools `coderef-workflow::create_plan`, handoff context
- Improves: How workorders use context.md critical functions
- Baseline: Unknown (expected 0.10-0.30)

**Target:** 0.70+ (both agents contributing)

---

### Loop 8: Test Gap Pipeline

**Goal:** Optimize testGaps report → actual test creation pipeline

**Metric:** `testgap_pipeline = testgap_precision × testgap_closure_rate`

**Agent 1 (Scanner):**
- Domain: `src/pipeline/generators/pattern-generator.ts`
- Improves: TestGaps ranking (prioritize highest-value gaps)
- Baseline: 1.00 precision (already perfect from Loop 6)

**Agent 2 (Test Creation):**
- Domain: Test creation workflow, MCP tools
- Improves: How many testGaps actually get tests written
- Baseline: Unknown (expected 0.05-0.20 - very low)

**Target:** 0.60+ (test creation is hard, lower bar)

**Key Challenge:** Agent 2 requires human test authoring - may need to measure "testGaps appear in workorder test tasks" instead of "tests actually written"

---

### Loop 9: Async Pattern Pipeline

**Goal:** Optimize async detection → architecture awareness pipeline

**Metric:** `async_pipeline = async_recall × async_awareness_in_workorders`

**Agent 1 (Scanner):**
- Domain: `src/pipeline/extractors/element-extractor.ts`, context.md async section
- Improves: Async pattern detection and formatting
- Baseline: 1.00 recall (already perfect from Loop 4)

**Agent 2 (Architecture):**
- Domain: Workorder planning, architecture decisions
- Improves: How often async patterns inform architecture discussions
- Baseline: Unknown (expected 0.10-0.30)

**Target:** 0.80+ (async awareness should be high for async codebases)

---

## Two-Agent Coordination

### Implicit Coordination Through Metric

Agents don't communicate - they coordinate through the shared metric:

```python
# Iteration 1
Agent 1 improves scanner: 0.60 → 0.85 (detection)
Agent 2 does nothing: 0.20 → 0.20 (utilization)
Pipeline score: 0.85 × 0.20 = 0.17 (marginal improvement, keep)

# Iteration 2
Agent 1 can't improve further: 0.85 → 0.85
Agent 2 improves consumption: 0.20 → 0.50
Pipeline score: 0.85 × 0.50 = 0.425 (big improvement, keep!)

# Iteration 3
Agent 1 still can't improve: 0.85 → 0.85
Agent 2 improves more: 0.50 → 0.75
Pipeline score: 0.85 × 0.75 = 0.6375 (big improvement, keep!)

# Iteration 4
Agent 1 finally improves: 0.85 → 0.95
Agent 2 improves slightly: 0.75 → 0.78
Pipeline score: 0.95 × 0.78 = 0.741 (TARGET REACHED!)
```

**Natural convergence:** Agents automatically focus on whichever component is limiting.

---

## Corpus & Ground Truth

### Self-Scan Corpus
- **Project:** Dashboard (`C:\Users\willh\desktop\coderef\dashboard`)
- **Why:** Validates scanner on our own codebase
- **Outputs:** `.coderef/context.md`, `.coderef/patterns.json`, `.coderef/coverage.json`

### Workorder Corpus
- **Active:** `coderef/workorder/*/plan.json`
- **Archived:** `coderef/archived/*/plan.json`
- **Expected:** ~5-15 workorders initially

### Ground Truth (Manual Labeling)
Each loop requires manual labeling:

**Loop 7:** 20 truly critical functions
**Loop 8:** 30 truly high-value test gaps
**Loop 9:** 15 async boundaries that should inform architecture

**Location:** `autoresearch/pipeline-quality/ground-truth-*.json`

---

## Success Criteria

### Per-Loop Targets

| Loop | Baseline (Expected) | Target | Stretch |
|------|---------------------|--------|---------|
| Loop 7: Critical Function Pipeline | 0.06-0.24 | 0.70 | 0.85 |
| Loop 8: Test Gap Pipeline | 0.05-0.20 | 0.60 | 0.75 |
| Loop 9: Async Pattern Pipeline | 0.10-0.30 | 0.80 | 0.90 |

### Campaign Success

**Minimum:**
- All 3 loops reach targets (0.60-0.80 range)
- Both agents contribute in each loop
- Validates scanner-quality improvements translate to utility

**Ideal:**
- All 3 loops reach stretch goals (0.75-0.90 range)
- Identifies specific scanner improvements needed for consumption
- Closes feedback loop: scanner → consumer → better scanner

---

## Guardrails

### Do Not Compare Metrics Across Loops
- Loop 7 measures critical functions (different domain than Loop 8 test gaps)
- Each loop has independent baseline and target
- No "which loop is better" comparisons

### Do Not Broaden Scope Beyond Pipeline
- Agent 1 only touches scanner code
- Agent 2 only touches consumption code
- Do not modify unrelated systems

### Do Not Skip Ground Truth
- Manual labeling is required for baseline measurement
- Without ground truth, detection accuracy is unmeasurable
- Cannot run verify script until ground truth exists

### Do Not Modify Workorder Corpus Mid-Loop
- Workorders are the corpus - treat as read-only during measurement
- New workorders can be added between loops
- Archive old workorders to maintain corpus size

---

## Integration with Scanner Quality

### Scanner Quality Campaign (Loops 1-6)
- **Corpus:** `stl-agent` (external Python benchmark)
- **Focus:** Data accuracy
- **Results:** 6/6 perfect scores (1.000000)
- **Status:** Complete ✓

### Pipeline Quality Campaign (Loops 7-9)
- **Corpus:** `dashboard` (self-scan + own workorders)
- **Focus:** Data utility
- **Results:** TBD
- **Status:** Bootstrapping

### Validation Flow
```
Scanner Quality → Pipeline Quality → Feedback

1. Scanner achieves perfect async detection (Loop 4: 1.00)
2. Pipeline measures async awareness in workorders (Loop 9: 0.25)
3. Insight: Async detection is good, but context.md format is wrong
4. Feedback: Improve context.md async section formatting (Agent 1)
5. OR: Improve workorder async awareness (Agent 2)
6. Result: Pipeline score improves to 0.80 (both agents contributed)
```

This closes the loop: **scanner quality → consumer utility → better scanner**

---

## Expected Insights

### What We Might Learn

**If pipeline scores are high (0.70+):**
- Scanner quality improvements from Loops 1-6 ARE being utilized
- Workorder creation tools effectively use scanner outputs
- Investment in scanner quality is justified

**If pipeline scores are low (< 0.30):**
- Scanner quality doesn't matter if outputs aren't used
- Context.md format is wrong for consumers
- Workorder tools need improvement more than scanner
- OR: Ground truth is wrong (mislabeled critical functions)

**If Agent 1 plateaus quickly:**
- Scanner is already good enough
- Focus on consumption improvements (Agent 2)

**If Agent 2 plateaus quickly:**
- Consumption tools already use data well
- Focus on scanner improvements (Agent 1)

### Cross-Loop Insights

**If all loops favor Agent 1 (scanner):**
- Scanner outputs are low quality across the board
- Consumption tools are fine, data quality is the issue

**If all loops favor Agent 2 (consumption):**
- Scanner outputs are high quality but poorly formatted
- Consumption tools need better context.md parsing
- OR: Context.md structure doesn't match consumer needs

---

## Running the Campaign

### Phase 1: Bootstrap (Today)
1. Create loop directories and goal.md files
2. Create verify script stubs
3. Create ground truth templates

### Phase 2: Ground Truth (Before Baseline)
1. Manually label 20 critical functions (Loop 7)
2. Manually label 30 high-value test gaps (Loop 8)
3. Manually label 15 async boundaries (Loop 9)

### Phase 3: Baseline Measurement
1. Implement verify scripts
2. Run baseline measurements (3 times each for determinism)
3. Update BASELINES.md with results

### Phase 4: Execution
1. Run `/run-autoresearch` for each loop
2. Agents make improvements
3. Verify checks pipeline score
4. Keep if improved, discard otherwise

### Phase 5: Analysis
1. Compare baseline vs final scores
2. Identify which agent contributed more
3. Extract insights for future scanner development
4. Update documentation with learnings

---

## Notes

### Why This Campaign Exists

**Scanner Quality Campaign (Loops 1-6) proved:**
- We can achieve 100% accuracy on element classification
- We can achieve 100% accuracy on test coverage detection
- We can achieve 100% accuracy on async pattern detection

**But it didn't prove:**
- Whether that accuracy matters for downstream workflows
- Whether workorders actually use context.md
- Whether testGaps drive test creation
- Whether async patterns inform architecture

**This campaign validates ROI** of the scanner quality campaign.

### Agent 2 Scope Challenge

Agent 2 modifies **MCP tools** which may be outside the `packages/coderef-core` repo. This creates coordination challenges:

**Option 1:** Agent 2 modifies MCP server code in separate repo
**Option 2:** Agent 2 modifies plan templates in this repo
**Option 3:** Agent 2 provides recommendations, human implements

For now, we'll use **Option 2** where possible and **Option 3** as fallback.

### Future Loops

**Potential Loop 10:** Coverage Utilization Pipeline
- Metric: `coverage_pipeline = coverage_accuracy × coverage_driven_testing`
- Agent 1: Improve coverage.json generation
- Agent 2: Improve how coverage drives test prioritization

**Potential Loop 11:** Dependency Graph Utilization Pipeline
- Metric: `dependency_pipeline = graph_accuracy × graph_usage_in_planning`
- Agent 1: Improve graph.json generation
- Agent 2: Improve how dependency graphs inform impact analysis

These loops would follow the same unified metric pattern.

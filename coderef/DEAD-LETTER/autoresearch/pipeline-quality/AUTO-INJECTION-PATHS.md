# Auto-Injection Working Paths

**Date:** 2026-04-11
**Purpose:** Path reference for Loop 8 & 9 auto-injection implementation and testing

---

## Current Working Directory

```
C:\Users\willh\desktop\coderef\dashboard
```

---

## MCP Server (Requires Restart After Changes)

**Location:**
```
C:\Users\willh\.mcp-servers\coderef-workflow\
```

**Modified Files:**
- `generators/planning_analyzer.py` (lines 1553-1647: extraction methods)
- `generators/planning_generator.py` (3 methods modified: injection logic)

**Git Repo:** `github.com/srwlli/mcp-server`
**Commit:** `bba4a63`

**Restart Required:** YES - Python code changes don't hot-reload

---

## Dashboard Project

**Location:**
```
C:\Users\willh\desktop\coderef\dashboard\
```

**Key Files:**
- `.coderef\context.md` - Contains async patterns and test gaps sections ✅
- `packages\coderef-core\src\pipeline\generators\context-generator.ts` (async detection)
- `packages\coderef-core\src\pipeline\generators\pattern-generator.ts` (test gap detection)

**Git Repo:** `github.com/srwlli/dashboard`
**Commit:** `0229273`

---

## Test Workorder Files

**Location:**
```
C:\Users\willh\desktop\coderef\dashboard\coderef\workorder\test-auto-injection\
```

**Files:**
- `context.json` - Feature requirements
- `analysis.json` - Project analysis (should contain async_patterns and test_gaps after MCP restart)
- `plan.json` - Generated plan (should contain auto-injected content after MCP restart)
- `communication.json` - Agent communication metadata

**Workorder ID:** WO-TEST-AUTO-INJECTION-001

---

## Verification Scripts

**Location:**
```
C:\Users\willh\desktop\coderef\dashboard\packages\coderef-core\autoresearch\pipeline-quality\scripts\
```

**Scripts:**
- `verify_async_pattern_pipeline.py` - Loop 9 verification (target: 0.80)
- `verify_test_gap_pipeline.py` - Loop 8 verification (target: 0.50)

---

## Next Steps After MCP Server Restart

1. **Verify extraction works:**
   ```
   analyze_project_for_planning → Check for async_patterns and test_gaps in output
   ```

2. **Create new workorder:**
   ```
   create_plan → Verify plan.json contains:
   - concurrency_risks in risk_assessment
   - TEST-GAP tasks in task list
   - Updated Testing phase
   ```

3. **Run verification scripts:**
   ```bash
   python verify_async_pattern_pipeline.py --weighted
   python verify_test_gap_pipeline.py --weighted
   ```

4. **Expected improvements:**
   - Loop 9: 0.594 → 0.800+ (async awareness)
   - Loop 8: 0.309 → 0.380+ (test gap closure)

---

## Status

- ✅ Code implementation complete
- ✅ Committed and pushed to both repos
- ✅ Context.md contains expected sections
- ❌ MCP server needs restart
- ⏳ Verification pending restart

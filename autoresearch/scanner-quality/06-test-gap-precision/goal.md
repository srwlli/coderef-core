# Loop 6: Test Gap Precision

## Goal
Improve testGaps report precision by filtering out test functions themselves from the "needs tests" list.

## Problem
The `patterns.json` testGaps section currently includes test functions as needing tests.

**Example false positive:**
```json
{
  "name": "test_openscad_tool",
  "file": "tests/test_integration.py",
  "reason": "No corresponding test file found"
}
```

**Impact:** ~30-40 false positives out of 67 total testGaps entries (~40-50% noise).

## Metric

**Name:** `test_gap_precision`

**Formula:**
```
test_gap_precision = (production_gaps) / (total_gaps)
```

Where:
- `production_gaps` = number of testGap entries from production code (not test files)
- `total_gaps` = total number of testGap entries

**Direction:** higher_is_better (target: 1.00)

**Verify Command:**
```bash
python autoresearch/scanner-quality/scripts/verify_test_gap_precision.py --corpus-root C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent --scan-dir C:/Users/willh/Desktop/CODEREF/ASSISTANT/projects/stl-agent/.coderef
```

## Expected Baseline
**Estimated:** 0.40-0.50 (40-50% precision, 50-60% noise from test files)

## Root Cause
`packages/coderef-core/src/pipeline/generators/pattern-generator.ts`

The `detectTestGaps()` method (lines 130-158) doesn't filter out test files before identifying gaps.

## Proposed Fix
Add test file filtering to `detectTestGaps()` similar to what was done in Loop 5 for `context-generator.ts`.

```typescript
const isTestFile = (filePath: string): boolean => {
  const relativePath = path.relative(projectPath, filePath).replace(/\\/g, '/');
  return relativePath.includes('/tests/') ||
         relativePath.startsWith('tests/') ||
         relativePath.includes('/test_') ||
         relativePath.startsWith('test_') ||
         relativePath.endsWith('_test.py') ||
         relativePath.includes('.test.') ||
         relativePath.includes('.spec.');
};

// Filter elements before processing
const productionElements = elements.filter(e => !isTestFile(e.file));
```

## Scope
- **Primary file:** `packages/coderef-core/src/pipeline/generators/pattern-generator.ts`
- **Method:** `detectTestGaps()` (lines 130-158)
- **Supporting files:** None (isolated fix)

## Iterations Budget
**Max iterations:** 15

## Success Criteria
- Baseline: 0.40-0.50
- Target: 1.00 (no test functions in testGaps)
- Deterministic: 3 runs produce identical scores

## Notes
This follows the same pattern as Loop 5 (Context Summary Signal), where we filtered test files from critical functions. The fix should be straightforward and likely complete in 1 iteration.

# STUB: 30 failing tests — triage unknown vs. known vs. regression

**Stub ID:** STUB-FAILING-TESTS-TRIAGE-001
**Authored:** 2026-05-16
**Author:** CODEREF-CORE (post WO-SELF-SCAN-GAP-REMEDIATION-001)
**Owner domain:** CODEREF-CORE
**Priority:** high
**Status:** open — awaiting scoping into a follow-up WO
**Phase:** post-remediation maintenance

---

## Summary

After WO-SELF-SCAN-GAP-REMEDIATION-001, the test suite stands at **1540/1570 passing — 30 tests failing**. The root causes are unknown: the failures may be pre-existing known gaps, regressions introduced by Phase 2 header deduplication / @exports correction across 200+ files, or flaky infrastructure tests. They have not been triaged.

No regressions were intentionally introduced during remediation. The shebang fix (`semantic-header-parser.ts`) and @exports corrections are pure data/parsing changes with no logic impact. However, the deduplication script removed significant amounts of duplicated comment content from source files, which could have affected test fixtures that snapshot file content.

---

## Evidence

- `npm test` output from WO-SELF-SCAN-GAP-REMEDIATION-001 Phase 2 close: **1540 pass, 1570 total, 30 fail**
- Prior baseline (WO-CODEREF-CORE-SELF-SCAN-POST-IMPROVEMENTS-001): 1540/1570 — same numbers
- The 30 failures existed before remediation began; deduplication did not increase the fail count
- Specific failing test names and files: **not yet captured**

---

## What needs to happen

1. **Run `npm test -- --reporter=verbose` and capture all 30 failure names + error messages**
2. **Classify each failure** into one of:
   - `flaky` — timing/IO sensitive, passes on retry
   - `known-gap` — pre-existing, documented, expected to fail until a specific fix lands
   - `regression` — was passing before today's changes, now fails (would require a git bisect or comparison against pre-remediation HEAD)
3. **For each regression:** identify root cause (likely: test fixture snapshots header content that was deduplicated)
4. **Fix regressions** immediately; document known-gaps with a follow-up stub each; mark flaky tests with `.skip` + comment

---

## Candidate root causes

- **Test fixture snapshot drift**: `__tests__/` files that snapshot source file content may expect the old duplicated header format. `deduplicate-headers.mjs` excluded `__tests__/` from processing, but tests that *read src/ files* and snapshot their content are still affected.
- **@exports mismatch in fixtures**: Some test fixtures embed expected `@exports` lists. `fix-stale-exports-v3.mjs` updated live source files; if any test reads those source files and compares against a hardcoded expected value, it will fail.
- **Parser behavior changes**: The shebang-strip and colon-suffix changes in `semantic-header-parser.ts` could affect tests that check `parseHeader()` output on files that now parse differently.

---

## Constraints

- Do not mark tests `.skip` without a comment explaining why and a stub reference
- Do not fix test failures by weakening assertions — fix the code or the fixture
- If a regression was introduced by deduplication, restore the source file to the correct single-header form (deduplication should have already done this; investigate why the test disagrees)

---

## Cross-references

- WO-SELF-SCAN-GAP-REMEDIATION-001: `coderef/archived/self-scan-gap-remediation/`
- `scripts/deduplicate-headers.mjs` — the script that modified 200+ source files
- `scripts/fix-stale-exports-v3.mjs` — the script that updated @exports in all stale files
- `src/pipeline/semantic-header-parser.ts` — shebang + colon-suffix changes

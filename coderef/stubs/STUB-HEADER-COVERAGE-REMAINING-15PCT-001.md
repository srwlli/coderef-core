# STUB: Header coverage — 271 elements still missing (15% of 2,488)

**Stub ID:** STUB-HEADER-COVERAGE-REMAINING-15PCT-001
**Authored:** 2026-05-16
**Author:** CODEREF-CORE (post WO-SELF-SCAN-GAP-REMEDIATION-001)
**Owner domain:** CODEREF-CORE
**Priority:** medium
**Status:** open — awaiting scoping into a follow-up WO
**Phase:** post-remediation maintenance

---

## Summary

After WO-SELF-SCAN-GAP-REMEDIATION-001, header coverage stands at **85.5% defined (2,128/2,488)**. The remaining 271 elements have `headerStatus: missing` — no `@coderef-semantic` block detected in their source files. Coverage was 51.2% before remediation; the jump came from fixing duplicate blocks and @exports correctness, not from adding new headers.

The top missing-header files are high-traffic CLI and test infrastructure files that should have headers for full intelligence data.

---

## Current missing-header leaders (from self-scan-report.md §5)

| File | Missing Elements |
|------|-----------------|
| `src/cli/coderef-rag-server.ts` | 27 |
| `src/cli/coderef-watch.ts` | 21 |
| `__tests__/integration.test.ts` | 20 |
| `scripts/doc-gen/generate-meta-json.js` | 15 |
| `src/cli/coderef-intelligence-server.ts` | 28 (new — added 2026-05-16) |

**Note:** `coderef-intelligence-server.ts` already has a semantic header but 28 elements were flagged missing at scan time (new file, elements not yet annotated in populate run). This may self-resolve on next populate run.

---

## What needs to happen

1. **Re-run populate.js** to get the current accurate missing list (scan was from earlier today; 200+ file edits happened since)
2. **Prioritize files** by element count and usage frequency (CLI entry points first — they are directly user-facing and RAG-queryable)
3. **Run `populate.js --overwrite-headers`** on the top missing files, then validate headers were written correctly
4. **Verify no new duplicate blocks** are created (the --overwrite-headers bug was fixed implicitly by deduplicate-headers.mjs, but should be confirmed on fresh runs)
5. **Target:** < 50 missing elements (from 271); 90%+ defined

---

## Priority order for annotation

1. `src/cli/coderef-rag-server.ts` — RAG server, high usage, 27 elements
2. `src/cli/coderef-watch.ts` — file watcher CLI, 21 elements
3. `__tests__/integration.test.ts` — integration test suite, 20 elements (test files may warrant `@layer: test`)
4. `scripts/doc-gen/generate-meta-json.js` — doc pipeline, 15 elements
5. Any remaining `src/cli/` files with missing elements

---

## Constraints

- Headers added must not create duplicate blocks (run deduplicate-headers.mjs after any --overwrite-headers run as a safety check)
- `@layer` values must be valid per `element-taxonomy.ts` — CLI files use `layer: cli`, scripts use `layer: tooling`, test files use `layer: test`
- `@capability` values must be kebab-case
- After adding headers, run populate.js and confirm headerStatus transitions from `missing` → `defined`
- Do not annotate `__tests__/` fixture files that embed @coderef-semantic as string literals in test data (they are intentionally unannotated)

---

## Cross-references

- WO-SELF-SCAN-GAP-REMEDIATION-001: `coderef/archived/self-scan-gap-remediation/`
- Self-scan report: `coderef/working/coderef-core-self-scan-post-improvements/self-scan-report.md` §5
- Prior header annotation WO: WO-SEMANTIC-HEADERS-AND-TESTS-FOR-CLI-ENTRY-POINTS-001 (archived 2026-05-16)
- `src/pipeline/semantic-header-parser.ts` — parser that must detect new headers

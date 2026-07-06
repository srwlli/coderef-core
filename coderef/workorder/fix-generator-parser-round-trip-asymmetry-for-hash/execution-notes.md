# Execution Notes — WO-FIX-GENERATOR-PARSER-ROUND-TRIP-ASYMMETRY-FOR-HASH-001

**Executed:** 2026-07-06 · **Parent stub:** STUB-0G9DPT · **Origin:** DISPATCH-2026-07-06-CODEREF-CORE-001

## Phase 1 — parser fix + round-trip tests (commit a4f333e)

- **Fix:** `src/pipeline/semantic-header-parser.ts` `detectHeaderBlock` gained a
  hash-line-comment branch mirroring the `//` branch: match leading
  `(?:#.*\r?\n)+` after the shebang strip, strip `#` prefixes (CRLF-safe via
  `\r?` in the block regex + `.replace(/\r$/, '')` per line), require
  `@coderef-semantic` marker in the stripped body. `/** */`, `//`, and
  docstring branches untouched.
- **Tests:** `__tests__/pipeline/header-round-trip-hash-comments.test.ts` — 7
  tests, proven failing-first (5 of 7 red pre-fix). Round-trip (write → parse
  ⇒ defined): plain `.py`, shebang `.py`, PEP263 coding-cookie `.py`.
  Parser-only: adjacent coding cookie, CRLF, no-marker negative (stays
  `missing`), docstring no-regression.
- **Suites:** pipeline suite 72 files / 230 tests green; full baseline suite
  **160 files passed / 2 skipped, 1556 tests passed / 26 skipped** (matches
  baseline, zero regressions). `npm run build` clean.
- **E2E (dist surface):** temp fixture (plain + shebang + nested `.py`):
  `populate.js --source-headers` stamped `#` headers (shebang preserved),
  measuring `populate.js` reported **100% (defined 3 / total 3)** — was 0%
  before the fix.

## Phase 2 — measurement rerun on primary-sources

Precondition held: 544 `.py` files in the PS working tree still carried
stamped `@coderef-semantic` headers (uncommitted; PS repo at b1b600f3).
Measuring populate from PS root via rebuilt dist (`node
dist/src/cli/populate.js .`, 75.9s, Mode: full). **No PS files were committed
(PS domain owns commits there); only untracked `.coderef/` artifacts were
regenerated.**

| Metric | Before (2026-07-06 dispatch run) | After |
|---|---|---|
| Element coverage | 21.7% (1046 / 4810) | **100.0% (4812 / 4812)** |
| `.py` elements | 3764 missing / 0 defined | **3766 defined / 0 missing** |
| `.js` defined | 274 | 274 (unchanged) |
| `.ts` defined | 434 | 434 (unchanged) |
| `.tsx` defined | 338 | 338 (unchanged) |
| File-level header coverage | — (520 stamped .py parsed as missing) | **100% (756 / 756)** |
| stale / partial | 0 / 0 | 0 / 0 (no spike) |
| total_elements | 4810 | 4812 (no regression; +2 from PS working-tree drift) |

validation-report.json: header_defined_count=756, header_missing=0,
header_stale=0, header_partial=0, layer/export mismatches 0,
header_coverage_pct=100.

## Follow-up (optional, per P2-T3)

- Dispatch to PRIMARY-SOURCES with the new by_status breakdown was left to
  operator discretion — the delta is fully recorded here and in the terminal
  surface. PS's stamped headers remain uncommitted in their working tree;
  committing them is a PS-domain decision.

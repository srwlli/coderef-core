---
kind: entry-point
status: historical
title: "coderef-core — Entry-Point Audit Report {YYYY-MM-DD}"
updated: {YYYY-MM-DD}
---
<!-- Authored by /standards-establish from SKILLS/STANDARDS/kinds/entry-point/template/AUDITS/REPORT-TEMPLATE.md.
     This is the PROJECT's standard for the "entry-point" kind. Edit to fit the project;
     re-run /standards-update when the ecosystem template evolves. -->


# coderef-core — Entry-Point Audit Report — {YYYY-MM-DD}

> One dated report per audit run (from `audit-procedure.md`). This is a historical record —
> `status: historical`, append-only. Do not overwrite prior reports.

## Real surface (re-counted)

- Tools: {N} · Bins: {M} · Skills: {K}
- How counted: {FILL}

## Checker verdict

- Command: `node SKILLS/STANDARDS/kinds/entry-point/check.mjs --project-root=<ABS> --json`
- Verdict: {PASS | WARNING | FAIL}
- Core: {n pass · n fail} · Module: {n pass · n warn}

## Dangling doors found (FAIL)

| Variant | Door | Missing target | Resolution |
|---------|------|----------------|------------|
| {FILL} | {FILL} | {FILL} | {fixed door / shipped target} |

_(none — all doors resolve)_

## Lying doors / gaps found (WARN)

| Check | Door | Advertised | Real | Resolution |
|-------|------|-----------|------|------------|
| advertises-true-surface | {FILL} | {FILL} | {FILL} | {count updated} |

_(none)_

## Inventory reconciliation

- Rows added (new doors shipped): {FILL}
- Rows retired (doors removed): {FILL}

## Outcome

{FILL — one line: green / WARNs-triaged / follow-ups filed.}

---
kind: entry-point
status: living
title: "coderef-core — Entry-Point Audit Procedure"
updated: 2026-07-31
---
<!-- Authored by /standards-establish from SKILLS/STANDARDS/kinds/entry-point/template/AUDITS/audit-procedure.md.
     This is the PROJECT's standard for the "entry-point" kind. Edit to fit the project;
     re-run /standards-update when the ecosystem template evolves. -->


# coderef-core — Entry-Point Audit Procedure

> The recurring drift-detection heartbeat. Front doors rot: a skill is renamed and its
> wrapper dangles; the tool surface grows and CONTEXT.md's count lies. This audit re-walks
> the inventory and confirms each door still resolves and still advertises the truth.

## Cadence

**On any capability-surface change**, plus a standing pass each release.

For coderef-core specifically, "capability-surface change" means: a `server.registerTool`
block added or removed, a `package.json` `bin` entry added or removed, or a rename of any
doc listed in the inventory. Entry-point drift here correlates almost perfectly with those
three events — a calendar cadence alone would miss the case that actually bites.

## Steps

1. **Re-count the real surface.** Run:
   ```bash
   grep -c 'server.registerTool(' src/cli/coderef-mcp-server.ts   # MCP tools (expect 37)
   node -e "console.log(Object.keys(require('./package.json').bin).length)"  # bin entries (expect 21)
   ```
   The first number must equal `SERVER_TOOL_COUNT` in the same file; `npx vitest
   __tests__/mcp-server.test.ts` asserts that pairing and fails on drift. Record both
   numbers. Remember 21 bin entries resolve to **19 distinct** CLI targets (two alias
   pairs) — state which you are quoting.
2. **Run the checker.**
   `node SKILLS/STANDARDS/kinds/entry-point/check.mjs --project-root=<ABS> --json`.
3. **Resolve every FAIL (dangling doors).** Any `entry-point.doors-resolve` failure = a
   front door pointing at a missing target. Fix the door or ship the target.
4. **Triage every WARN (lying doors + gaps).** For each
   `entry-point.advertises-true-surface` / `using-guide-linked` / `variants-declared` WARN:
   update the advertised count, link the guide, or declare the missing variant door.
5. **Reconcile the inventory.** Add rows for any new front doors shipped since the last
   audit; retire rows for removed ones.
6. **Write the report** into `AUDITS/` from `REPORT-TEMPLATE.md`.

## What this audit does NOT do

It does not launch the MCP server or invoke tools — resolution and advertised-count checks
are static. Confirming a server actually starts and lists its tools is the MCP Inspector's
job (see the `mcp` kind), not this audit.

It also **cannot** verify the out-of-repo context door: the project CONTEXT is
ASSISTANT-owned, so no run of this checker can tell you it has gone stale. That step is
manual and is listed in [`../AGENT-CHECKLIST.md`](../AGENT-CHECKLIST.md); see
[`../CONTEXT-SURFACE.md`](../CONTEXT-SURFACE.md#known-gap--the-cross-repo-blind-spot).

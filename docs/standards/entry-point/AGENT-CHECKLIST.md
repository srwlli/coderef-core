---
kind: entry-point
status: living
title: "coderef-core — Entry-Point Pre-Flight Checklist"
updated: 2026-07-31
---
<!-- Authored by /standards-establish from SKILLS/STANDARDS/kinds/entry-point/template/AGENT-CHECKLIST.md.
     This is the PROJECT's standard for the "entry-point" kind. Edit to fit the project;
     re-run /standards-update when the ecosystem template evolves. -->


# coderef-core — Entry-Point Pre-Flight Checklist

> Run this **before shipping a capability change** (a new tool, a renamed skill, a new
> MCP server, a surface that grew). It catches a dangling or lying door before it reaches
> a consumer. The checker is the back-stop; this checklist is the pre-flight.

## Before you ship

- [ ] **Every new front door has an inventory row.** A new skill/tool/command/doc is
      added to `ENTRY-POINT-INVENTORY.md` with its variant, target, and advertised surface.
- [ ] **Every referenced target exists (no dangling door).** For each row whose `Target`
      is a repo-local path, the file/dir is present on disk *now* — you did not reference a
      front door before building it.
- [ ] **Every advertised count is true (no lying door).** If the surface grew or shrank,
      every count the loaded estate / using-guide states was updated in the SAME motion.
- [ ] **The USING guide is linked.** `USING-[WHAT-IT-IS].md` exists and CONTEXT.md links it.
- [ ] **Each applicable variant has a door.** A capability that serves agents has an agent
      door; one that serves users has a user door; the loaded estate has a context door.
- [ ] **Run the checker.**
      `node SKILLS/STANDARDS/kinds/entry-point/check.mjs --project-root=<ABS> --json` — all
      core checks PASS, WARNs triaged.

## coderef-core specifics

- [ ] **Adding or removing an MCP tool? Bump `SERVER_TOOL_COUNT`** in
      `src/cli/coderef-mcp-server.ts` in the same commit. It is interpolated into the
      `initialize` instructions string and the startup log, so a stale constant makes
      **every** agent-facing surface lie at once. A test counts `registerTool`
      registrations and fails on drift — do not rely on noticing it by eye.
- [ ] **Update the in-repo advertised counts together:** `README.md`, `docs/CLI.md`,
      `docs/ARCHITECTURE.md`. Do **not** rewrite historical `CHANGELOG.md` entries —
      an old count is correct as history.
- [ ] **Remember the out-of-repo context door.** The project CONTEXT is ASSISTANT-owned,
      so no checker in this repo can catch it going stale. Update it in the same motion
      by hand. See [`CONTEXT-SURFACE.md`](CONTEXT-SURFACE.md#known-gap--the-cross-repo-blind-spot).
- [ ] **Adding a CLI bin?** Add it to `package.json` `bin` **and** rebuild under
      `tsconfig.cli.json` (`npm run build:cli`) — a bare `npx tsc` does not emit the CLI
      bins, so the door will dangle at runtime while resolving fine on paper.

## When stuck

- **"Is a slash-command a dangling door?"** — Only path targets are resolved on disk. A
  `/command` door is prose in the inventory; ensure the *skill it maps to* has a row with a
  real path target.
- **"The advertise-count WARN fired but my count is right."** — The heuristic is coarse
  (it proxies the countable surface). If your count is verifiably correct, note it in the
  audit report; the WARN is a prompt to re-confirm, not a hard FAIL.
- **"New capability, no bundle yet."** — Establish the bundle first
  (`/standards-establish --kind=entry-point`), then enumerate doors.

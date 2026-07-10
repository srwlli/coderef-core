---
title: CODEREF-CORE STAFF — Agent Seat Tree
status: living
updated: 2026-07-10
---

# CODEREF-CORE STAFF

**Project:** `coderef-core` · coordinator `CODEREF-CORE` · seat homes under `STAFF/<SEAT>/`.

This directory is the coderef-core **agent seat tree** (structure kind trigger
`staff`, operator-directed 2026-07-10 / DISPATCH-2026-07-09-STANDARDS-009). It exists
so that single-purpose agent seats owning a slice of the coderef-core estate have a
home, a charter, and a registration — rather than living implicitly inside the
coordinator session.

Scaffolded per DISPATCH-2026-07-09-CODEREF-CORE-003 (begin-now maintenance lane): the
structure kind promotes `staff` to **core** for coderef-core (via the trigger's
`promote_projects` named-project list), so a missing `STAFF/` grades core-FAIL. This
README establishes the folder and the seat convention; no seat is created yet.

## Seat convention

- **`STAFF/<SEAT>/` per seat** — each seat is a single-purpose agent home. One seat,
  one job; a seat is not a general execution surface.
- **Every seat carries a `README.md` charter** naming its ownership, purpose, git
  model, and lineage.
- **Every seat is registered** in `TRACKING/agent-domains.json` with `hosts_under`
  set to the project coordinator (`CODEREF-CORE`).

### Seat-type taxonomy (naming guidance, not a locked enum)

`-APP` (app/UI surface + its ui-design standards) · `-REPORT` (report-deliverable
lane) · `-VAULT` (vault/graph owner) · `-PIPELINE` (data pipeline) · `-ARCHIVE` (data
custodian) · `-RESEARCH` · `-REVIEWER` · `-TRANSCRIBE` · `-TEMP` (ephemeral delegated
work).

Shipped precedents across the estate: primary-sources `STAFF/` (PS-VAULT, PS-ARCHIVE,
PS-REPORT, …), next-scraper `STAFF/` (NFL-PIPELINE, NFL-REPORT, NFL-RESEARCH,
NFL-GUI), football-stats `STAFF/NFL-APP`, ASSISTANT `STAFF/AS-VAULT`.

## Seats

_None yet._ The likely first seat is a **dashboard-owner** (e.g. `STAFF/DASHBOARD-APP`)
once the coderef dashboard roadmap (DISPATCH-2026-07-09-CODEREF-CORE-001,
`adopt-dashboard-roadmap`) is adopted and its execution phase spins up. That adoption
is a separate, sequenced dispatch — this scaffold does not create the seat.

## Git

Single-folder model: work here, commit directly to `main` by explicit pathspec,
`git push`. No worktree, no `wo/*` branch.

## Lineage

Created 2026-07-10 to satisfy the structure kind's `staff` trigger (promoted to core
for coderef-core). Scaffold-only per DISPATCH-2026-07-09-CODEREF-CORE-003; seats are
added as owning agents are registered.

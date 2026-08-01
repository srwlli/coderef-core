---
title: Doc/code drift enforcement — the aligned plan
status: draft
date: 2026-08-01
author: CODEREF-CORE agent
supersedes_recommendations_in: discovery.md §5
---

# Doc/code drift enforcement — the aligned plan

**Operator directive (2026-08-01):** *"make sure the doc/code is enforced so they never drift."*

## The honest framing first

No gate makes drift *impossible*. Code moves; prose written yesterday describes yesterday. What a gate can do is make drift **caught, attributed, and cheap to repair** — so it never survives a commit unnoticed. Everything below is built to that standard, not to "never happens."

Today's session found the machinery for this is **already ~70% built and 0% wired**. The plan is therefore mostly connection work, not construction.

## The chain: four links, and where each stands

Enforcement needs all four. A break anywhere makes the rest decorative.

| # | Link | What it means | Status today |
|---|---|---|---|
| 1 | **BIND** | a doc declares which code it governs (`documents:`) | **PARTIAL** — sheets 72/74; foundation docs **2/8** |
| 2 | **DETECT** | something notices when the doc's claims stop matching code | **BUILT, BROKEN** — `check-sheet-drift.mjs` works but is CRLF-blind |
| 3 | **GATE** | detection runs automatically at a moment that blocks drift landing | **ABSENT** — nothing re-runs it after authoring |
| 4 | **REPAIR** | fixing is mechanical, or the gate gets ignored and bypassed | **BUILT, UNWIRED** — `project-spine.mjs` / `remediate-sheet.mjs` |

Measured evidence for each row is in `discovery.md` §3 and `drift-checker-sweep.txt`.

## Open items mapped to links

| Item | Owner | Link | Blocks / blocked by |
|---|---|---|---|
| `TKT-017SAB` — CRLF + scalar-only frontmatter parsing | DEBUG | 2 | **blocks `STUB-34YBWR`** |
| `STUB-34YBWR` — wire the drift checker into the recurring kind gate, WARN-first, `--fix` | STANDARDS | 3 + 4 | blocked by `TKT-017SAB` |
| `STUB-B6B0EH` — teach `generate-index-md` + `generate-relationships-md` the `documents:` stamping | CODEREF-CORE | 1 | independent — **cheapest real win** |
| `STUB-XCBFHY` — frontier authoring path (no LLOYD/Ollama) | LLOYD | enabler | independent |
| `STUB-B70KHC` — scoped claim-truth doc gate at close-workorder | ASSISTANT | 3 | blocked by `TKT-017SAB`; pairs with `STUB-34YBWR` |

## Sequencing

```
                ┌─▶ STUB-34YBWR ─▶ continuous gate  (catches drift that EXISTS)
TKT-017SAB ─────┤
                └─▶ STUB-B70KHC ─▶ close-time gate  (stops drift LANDING)

STUB-B6B0EH ──────────────────────▶ binding 2/8 ▶ 4/8   (parallel, CORE-owned)
STUB-XCBFHY ──────────────────────▶ authoring without a local model (parallel)
```

Both gates hang off the same parser fix. `TKT-017SAB` is one small ticket gating the entire enforcement story — it is the critical path.

**Why the order is not negotiable:** wiring a CRLF-blind checker into a fleet-wide gate would broadcast a false *"the author wrote no frontmatter"* verdict onto every domain's sheets. Fix the parser, then wire.

## Two enforcement points, and why both are needed

- **Continuous (`STUB-34YBWR`)** — the resource-sheet kind checker, run by `standards-validate` on every close and every sweep. Catches drift wherever it already exists, across all domains. Must ship **WARN-first**: the corpus starts at 9 genuinely-stale sheets, and a FAIL gate on day one trains bypass, which is the failure mode that produced this situation.
- **Per-change (close-workorder)** — `check-doc-code-tie.mjs` already runs at close, but it answers a *different* question: "was the paired doc touched in this WO's commits?" It never asks whether the doc's claims are still TRUE, and it is inert when a plan declares no `doc_binding` — which is exactly what happened to this session's own workorder. Now owned: **`STUB-B70KHC`**.

## Gaps with no owner yet — operator ruling needed

1. **`related_files:` is inert.** `doc-ingest.ts` mints edges from `documents:` only. It parses `related_files:` into `DocFact.relatedFiles` and never uses it, so **39 entries across INDEX / RELATIONSHIPS / API look like a binding and are not.** Rule: mint a weaker edge kind, or state plainly that it is advisory. Leaving it as-is means a reader reasonably believes those docs are bound when they are not.
2. ~~**Close-time claim-truth gate.**~~ **FILED as `STUB-B70KHC`** (ASSISTANT): at close, resolve the docs that BIND each changed source file via `documents:` edges and run the drift checker over just those. Scoped by construction, so pre-existing drift elsewhere can never block an unrelated close. This is the difference between "drift is caught eventually" and "drift cannot land."
3. **Four foundation docs have NO binding of any kind.** `ARCHITECTURE.md`, `COMPONENTS.md`, `SCHEMA.md` carry neither `documents:` nor `related_files:`. Correctly so — they are hand-authored and coverage cannot be mechanically asserted — but it means **no gate will ever protect them.** Their only tie to code is the section-level `references` edges added today, which is symbol-mention, not governance. Accept, or bind them by hand.

## What today's workorder did and did not contribute

- **Did:** made every doc a first-class graph citizen at heading grain (1,031 section nodes; 1,254 gated `references` edges), so "which prose mentions this symbol" is answerable across the whole corpus — including the 4 unbindable foundation docs.
- **Did NOT:** detect drift. That was `check-sheet-drift.mjs`, which predates the workorder and is strictly stronger for staleness. The two answer different questions and both are needed. Recorded here so no future reader mistakes the traversal substrate for the enforcement mechanism.

## Definition of done

Enforcement is LIVE when, on a clean tree:

1. `TKT-017SAB` closed — the drift checker reads CRLF and list-form frontmatter.
2. `standards-validate` surfaces `sheet.anchors-resolve` with real counts on every run.
3. `--fix` re-projects drifted anchors without hand-editing.
4. Foundation-doc binding is 4/8, with the other 4 documented as unbindable by design.
5. The `related_files` ruling is recorded either way.
6. `STUB-B70KHC` closed — a WO that changes bound code cannot close with that doc's claims broken.

Until 1–3 land, the honest statement is: **drift is measurable on demand, not enforced.**

# Workorder Issues — WO-RETIRE-OR-QUARANTINE-SRC-SCANNER-TREE-SITTER-SCANNER-001

**Feature:** retire-or-quarantine-src-scanner-tree-sitter-scanner
**Target project:** coderef-core (cross-project; artifacts at owner-project root)
**Parent stub:** STUB-A98SW1 (closed)
**WO status:** complete — closed close-only 2026-08-01T02:10:00Z, NOT archived
**Authored:** 2026-08-01, at operator request during close

Every issue below is also a row in `TRACKING/registry.db` (`kaizen_entries`, `workorder_id =
WO-RETIRE-OR-QUARANTINE-SRC-SCANNER-TREE-SITTER-SCANNER-001`). That table is canonical; this file
is a readable companion, not a second source of truth. Seven entries, all `status: new`.

None of these issues are defects in the shipped change. The deletion itself was clean: 1,885 lines
removed, suite delta exactly -13 (the deleted file's own test count), zero new failures, typecheck
and both builds exit 0, header coverage 100% (369/369). Every issue below is **tooling friction
encountered while doing the work** — which is the point of recording them.

---

## The headline: one root cause behind four of the seven

Four separate WORKFLOW scripts independently anchor cross-project paths to `ASSISTANT_ROOT`
instead of the owner-project root. `TRACKING/projects.json` **already maps scheme → project root**;
none of the four consult it. This is now a family, not a coincidence:

| Kaizen | Script | Symptom |
|---|---|---|
| KZ-01KYX7WG | `write-phase-transition.cjs` | 1st instance (predecessor WO) |
| KZ-01KYXGQC | `write-phase-transition.cjs` | 2nd instance — recurrence, this WO |
| KZ-01KYXH47 | `check-session-log.mjs` | 3rd instance — **authored a false artifact** |
| KZ-01KYXH67 | `workorder-follow-up/run.mjs` | 4th instance — scheme-prefix path join |

Two of the four **soft-fail to exit 0**, which is what makes the family dangerous: a miss is
indistinguishable from a success at the exit code. See FU-1 below.

---

## Issues

### KZ-01KYXFAR — create-workorder: unusable default skeleton for a DELETE-class refactor
**Category:** correctness · **Skill:** create-workorder · **Logged:** 2026-08-01T01:34:31Z

The default phased skeleton produced 3 generic tasks whose only READ pointed at 25 keyword-matched
candidates under `coderef/ARCHIVED/` — archived planning docs, not the source file being deleted —
and **no DELETE task at all**, despite DELETE being an approved verb and deletion being the stub's
entire point.

Fixed via `--tasks-file`, but that required rolling the stub back from `promoted` → `stub` and
hand-deleting the WO + session rows first, because `--from-stub` refuses a promoted stub and
re-insert raises `CollisionError`.

**Suggested fix:** a `--replan` / `--force-reauthor` flag, or accept `--tasks-file` on an
already-promoted stub. Either removes the rollback dance.

---

### KZ-01KYXFAS — create-workorder: engine writes `git_branch: null`
**Category:** correctness · **Skill:** create-workorder · **Logged:** 2026-08-01T01:34:32Z

The engine wrote `communication.json` with `git_branch = None` where SKILL.md Step 7 mandates the
literal `"main"` (the `wo/*` lane was RETIRED 2026-06-15, STUB-TEYF02).

A null branch field is not cosmetic — downstream tooling reads it to pick the commit lane.
Corrected by hand post-creation.

**Suggested fix:** stamp `"main"` at author time.

---

### KZ-01KYXGQC — write-phase-transition.cjs: cross-project no-op (RECURRENCE, 2nd instance)
**Category:** correctness · **Skill:** execute-workorder · **Logged:** 2026-08-01T01:58:53Z
**Family:** KZ-01KYX7WG

`resolveRegistryPath()` anchored this coderef-core WO's `communication.json` to `ASSISTANT_ROOT`,
missed, and the soft-fail contract printed `[OK] no-op (comm_not_found)` **with exit 0** — a miss
indistinguishable from success.

Consequence if unfixed: `phase_transitions[]` stays empty for *every* cross-project WO — and that
is the exact array `/close-workorder` Step 2 reads to verify completion.

**Workaround used:** wrote `communication.json` directly at the owner-project root.

---

### KZ-01KYXGR3 — vitest 4 rejects `--reporter=line`, and the crash reads as a test failure
**Category:** observability · **Skill:** execute-workorder · **Logged:** 2026-08-01T01:59:16Z

`npx vitest run --reporter=line` exits 1 with `ERR_LOAD_URL: Failed to load url line` **before any
test runs**. A startup crash is indistinguishable from a failing suite by exit code alone, so a
baseline capture can silently record "tests failed" when ZERO tests ran.

Same class as the known `--reporter=basic` trap.

**Suggested fix:** TEST-verb discipline should name reporter-rejection explicitly — confirm the
runner printed a `Test Files` / `Tests` summary before trusting **any** verdict, pass or fail.

---

### KZ-01KYXGRE — guarded runner has no working path for a deletion
**Category:** ergonomics · **Skill:** git-commit · **Logged:** 2026-08-01T01:59:28Z

A genuine deadlock between two individually-correct guards:

1. `git rm` stages the delete.
2. `run.mjs --paths` then fails partial-stage, because `git add` cannot match a path absent from disk.
3. Omitting the paths trips the pre-staged braid guard — **whose FIX text says to name them**.
4. Naming them returns to step 2.

**Escape used:** `git restore --staged` the deletions, then re-declare ALL paths in one `--paths`
set — which stages the deletes correctly, since the paths are still present in HEAD.

**Suggested fix:** document this path, or teach `--paths` to detect a HEAD-present/disk-absent path
and stage it as a deletion.

---

### KZ-01KYXH47 — check-session-log.mjs authored a FALSE self-heal
**Category:** correctness · **Skill:** close-workorder · **Logged:** 2026-08-01T02:05:54Z
**Family:** KZ-01KYX7WG · **Severity: the most serious issue in this list**

`check-session-log.mjs` resolves `.coderef/sessions/` against `ASSISTANT_ROOT`, not the WO
owner-project root. For this cross-project WO it therefore missed the real 7,553-byte rich log and
**self-healed a false sparse fallback** stamped `self_healed: true` and
`"execute Step 5.5.1 log was not authored"`.

That claim was false. The log *was* authored, at
`CODEREF-CORE/.coderef/sessions/SES-2026-07-31-RETIRE-OR-QUARANTINE-SRC-SCANNER-TREE-SITTER-SCANNER.yaml`.

This is a distinct defect class from the path bug that caused it: **a gate that could not find an
artifact at the path it searched, then asserted the artifact was never authored** — an assertion
about the past it never verified. The path fix alone does not cure it.

Two pieces of corroborating evidence that it searched the wrong repo:
- Its own commit-linker found only the ASSISTANT views commit, missing **both** core commits.
- It derives the slug date from UTC `closed_at` (2026-08-01) vs the rich log's local date
  (2026-07-31) — so the two would not have collided even in the right repo.

**Action taken:** the false 3,717-byte artifact was **deleted**; the canonical rich log was verified
in place. A record that contradicts the truth is worse than a missing record.

---

### KZ-01KYXH67 — workorder-follow-up/run.mjs: scheme-prefixed path joined onto ASSISTANT_ROOT
**Category:** correctness · **Skill:** close-workorder · **Logged:** 2026-08-01T02:07:00Z
**Family:** KZ-01KYX7WG, KZ-01KYXH47

Exit 2 on a cross-project WO. It joined the scheme-prefixed registry path
`coderef-core:coderef/workorder/...` directly onto `ASSISTANT_ROOT`, producing the literal
nonsense path:

```
ASSISTANT\coderef-core:coderef\workorder\...
```

`TRACKING/projects.json` already maps scheme → project root; the resolver should consult it.

Step 10.5 is graceful, so the close continued. **Follow-ups were recorded by hand** in
`close_metadata` instead of by the tool.

---

## Follow-ups filed at close

Both are carried in `communication.json` → `close_metadata.follow_ups`.

**FU-1 (M) — one shared cross-project path resolver.**
Four WORKFLOW scripts anchor to `ASSISTANT_ROOT` instead of the owner-project root. One shared
resolver consulting `TRACKING/projects.json` fixes all four. Scripts:
`write-phase-transition.cjs`, `check-session-log.mjs`, `workorder-follow-up/run.mjs`, and the
alignment gate.

**FU-2 (S) — a gate must not assert what it never verified.**
`check-session-log.mjs` must not author a self-heal claiming a log "was not authored" when it only
searched one candidate root and missed. Split from FU-1 deliberately: **this honesty defect
survives the path fix.** The correct behavior on a miss is to report the miss, not to manufacture a
record asserting absence.

---

## Two non-kaizen disclosures from the close

Recorded here for completeness; neither is a defect.

**1. standards-validate top-level verdict is `fail`.** Binding gate is
`scoped.wo_scoped.verdict = "pass"` (1/0/0). The top-level `fail` is pre-existing repo-wide
structure-kind drift across 40 unrelated kinds. Gate separation (KZ-01KX4FV2, TKT-RFKV8Z) exists
precisely so unrelated culture debt cannot block a clean WO. Flagged because the raw output looks
alarming out of context.

**2. The committed `kaizen-entries.json` view carries three concurrent-peer entries**
(KZ-01KYXGYA, KZ-01KYXH0G, KZ-01KYXH3N). `TRACKING/*.json` are whole-table projections and cannot
be split per row, so a peer's concurrent rows ride along unavoidably. Disclosed in the commit body
rather than hidden. Genuinely foreign views — `sessions.json`, `dispatches.json`,
`active-work.archive.json` — were left untouched.

---

## Close-state reference

| Field | Value |
|---|---|
| WO status | `complete` |
| completed | 2026-07-31 |
| closed_via | `/close-workorder` |
| terminal_at | 2026-08-01T02:10:00Z |
| archived | **false** — close-only; `--archive` not supplied |
| archived_at | `NULL` |
| Parent stub | STUB-A98SW1 → `closed`, back-linked |
| Final Completeness Gate | **exit 0** |
| Tracking validator (scoped) | 18 passed / 0 failed |
| active_work rows | 0 |
| Core commits | 76ab967 (P1+P2), 419d693 (artifacts), 8b03505 (close) |
| Assistant commit | a7cd4aafa (views-only, exempt subject) |

To archive later:

```
/close-workorder WO-RETIRE-OR-QUARANTINE-SRC-SCANNER-TREE-SITTER-SCANNER-001 --archive
```

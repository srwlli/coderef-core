# Ecosystem Issues

> **Single flat log of ecosystem issues. HAND-EDITED — no runner, no registry, no DB.**
>
> **FREEZE IN EFFECT (2026-08-01, operator directive):** `/kaizen-log` and `/ticket` are
> FROZEN. Do NOT log kaizen entries. Do NOT file tickets. Append here instead.
> The kaizen/ticket system is being refactored; this file is the interim capture surface.
>
> Existing kaizen sidecars and ticket rows are left in place — the freeze stops NEW
> writes, it does not migrate or delete history.

## How to use this file

1. **APPEND** a new entry to the bottom of `## Issues` using the template below.
2. **ASSIGN** the next sequential id: `ECO-001`, `ECO-002`, …
3. **DO NOT** hand-edit or renumber existing entries. Correct an entry by appending a
   new one that supersedes it and setting the old entry's status to `superseded`.
4. **KEEP IT ONE ENTRY PER ISSUE.** A bundle of five findings is five entries.

**Fields**

| Field | Required | Notes |
|---|---|---|
| `id` | yes | `ECO-NNN`, sequential, never reused |
| `date` | yes | `YYYY-MM-DD` |
| `domain` | yes | Owning agent domain (`ASSISTANT`, `STANDARDS`, …) |
| `surface` | yes | Skill / script / file the issue lives in |
| `category` | yes | `correctness` \| `ergonomics` \| `observability` \| `performance` \| `scope-creep` \| `docs` |
| `severity` | yes | `critical` \| `warning` \| `info` |
| `status` | yes | `open` \| `fixed` \| `wontfix` \| `superseded` |
| `summary` | yes | One line: what is wrong |
| `evidence` | yes | How it was OBSERVED — path:line, command output, measured count. Not a guess. |
| `impact` | yes | What breaks, for whom, when |
| `fix` | no | Proposed or landed remedy; include the commit SHA when fixed |

**Evidence is not optional.** An entry without an observation is a hunch. Cite the
`path:line`, the command and its output, or the measured count.

---

## Template

```markdown
### ECO-NNN — <one-line title>

- **date:** YYYY-MM-DD
- **domain:** DOMAIN
- **surface:** path/to/thing
- **category:** correctness | ergonomics | observability | performance | scope-creep | docs
- **severity:** critical | warning | info
- **status:** open | fixed | wontfix | superseded
- **summary:** What is wrong, in one sentence.
- **evidence:** How it was observed — path:line, command + output, or measured count.
- **impact:** What breaks, for whom, and when it surfaces.
- **fix:** Proposed or landed remedy. Include commit SHA if fixed.
```

---

## Issues

### ECO-001 — execute-workorder Step 1.65 alignment gate existed only as prose

- **date:** 2026-08-01
- **domain:** ASSISTANT
- **surface:** SKILLS/WORKFLOW/execute-workorder/execute_workorder_engine.py
- **category:** correctness
- **severity:** critical
- **status:** fixed
- **summary:** SKILL.md documented a WARN-first work-start alignment gate that was never implemented in the engine, so the WARN it specified could not fire.
- **evidence:** `grep -n "align\|culture" execute_workorder_engine.py` returned zero matches. A five-phase WO completed with zero `alignment_gate` entries in its communication.json.
- **impact:** Every domain's WO ran with no work-start alignment signal. The gap surfaced first at `/close-workorder` Step 3 — a HARD STOP — at the one moment the record can no longer be authored honestly.
- **fix:** Built `alignment_gate()` + `log_alignment_gate()`; spawns `verify`, prints the WARN, persists the outcome on every run. Commit `d7d0f6629`.

### ECO-002 — the work-start alignment record had no producer anywhere in the pipeline

- **date:** 2026-08-01
- **domain:** ASSISTANT
- **surface:** SKILLS/WORKFLOW/create-workorder/create_workorder_engine.py
- **category:** correctness
- **severity:** critical
- **status:** fixed
- **summary:** Nothing in the workflow authored the alignment record — create-workorder never emitted it, and execute-workorder is contractually barred from authoring it.
- **evidence:** ASSISTANT had ZERO `culture_alignment_recorded` rows in its entire journal history, while STANDARDS had 9, LLOYD 3, SURFACES 3. `create-workorder`'s only "culture" references were comments.
- **impact:** A gate whose precondition nothing produces fails 100% of the time, and only where it is unfixable. ASSISTANT could not close any WO without hitting the hard stop.
- **fix:** Added `emit_alignment_draft()` — writes a pre-keyed `alignment-draft.json` into the WO dir. Deliberately does NOT auto-fill `tools[]`. Commit `a6bc4ede1`.

### ECO-003 — standards-validate reports a skipped culture axis as a WARNING, not a FAIL

- **date:** 2026-08-01
- **domain:** STANDARDS
- **surface:** SKILLS/STANDARDS/standards-validate/run.mjs
- **category:** observability
- **severity:** critical
- **status:** open
- **summary:** Running `--scope` WITHOUT `--domain` makes the culture axis skip itself and report `warning`; adding `--domain` flips the identical WO-scoped verdict to `fail`.
- **evidence:** Same WO, two invocations: without `--domain` → `wo_scoped.verdict=warning` (`alignment_gate_skipped`); with `--domain=ASSISTANT` → `wo_scoped.verdict=fail`, summary `{fail:1}`.
- **impact:** A close bound to the no-domain form passes a gate that never ran. The weaker invocation is also the shorter one, so it is the one an agent reaches for.
- **fix:** Proposed — `--scope` without `--domain` should be an arg error, or the skip should surface as FAIL. A gate that cannot run must not report a passing-shaped verdict.

### ECO-004 — 41 dispatches rows carry the literal string 'null' as session_id

- **date:** 2026-08-01
- **domain:** TRACKING
- **surface:** TRACKING/dispatches.json
- **category:** correctness
- **severity:** warning
- **status:** open
- **summary:** 41 registry rows store `session_id` as the string `'null'` rather than a real null, failing the tracking-validator.
- **evidence:** `tracking-validator all` → 14 passed, 4 failed. Baseline at `d1f9ff453` had 43 such rows; now 41.
- **impact:** Whole-repo validator FAIL that is unrelated to any current WO; risks training agents to wave past a red validator.
- **fix:** Not yet scoped. Pre-existing drift; a WO-scoped run passes 18/18, so it blocks nothing today. Likely the same writer family as ECO-014. *(Migrated from DEFECT-LEDGER D-21.)*

### ECO-005 — archive-planning-folder disposition enum has no value for delivered analysis folders

- **date:** 2026-08-01
- **domain:** ASSISTANT
- **surface:** SKILLS/WORKFLOW/archive-planning-folder/run.mjs
- **category:** ergonomics
- **severity:** warning
- **status:** open
- **summary:** A folder with no `stub_ref` may archive only as `abandoned` or `superseded`; neither fits an analysis that WAS actionable and shipped its findings.
- **evidence:** `coderef-core/code-intelligence-improvement-eval` — a four-surface eval that delivered — could not be archived without recording a false disposition.
- **impact:** Agents either mislabel another domain's delivered work or leave folders unarchivable. Both corrupt the record.
- **fix:** Proposed — add a fourth disposition (e.g. `delivered`) for analysis folders that completed without promoting to a stub. Folder dispatched to CODEREF-CORE (dispatch-030). *(Migrated from DEFECT-LEDGER D-20.)*

<!-- ECO-006..ECO-024 migrated 2026-08-01 from
     coderef/workorder/dispatch-session-request-evaluates-hascreate-before-normalizing-msys/DEFECT-LEDGER.md
     (21 items; D-20 -> ECO-005 and D-21 -> ECO-004 were already recorded above). -->

### ECO-006 — MSYS skill-name normalization ran AFTER the hasCreate guard

- **date:** 2026-07-31
- **domain:** ASSISTANT
- **surface:** SKILLS/SESSION/dispatch-session-request/run.mjs
- **category:** correctness
- **severity:** critical
- **status:** fixed
- **summary:** The guard stripped only leading slashes while the writer ~50 lines downstream also unwound an MSYS-expanded drive-letter path, so a mangled entry failed `hasCreate`, got `/create-workorder` prepended, then normalized down to a duplicate.
- **evidence:** Emitted `[/create-workorder, /create-workorder, /execute-workorder, …]` where `[/create-workorder, /execute-workorder, …]` was correct.
- **impact:** A guard correct in isolation, wrong in composition — emits a silently wrong artifact rather than an error, which is why it went unnoticed.
- **fix:** Normalize before the guard evaluates. Commit `60e81c6cd`. *(D-01)*

### ECO-007 — Stale exit-code 2 documented in run.mjs and SKILL.md

- **date:** 2026-07-31
- **domain:** ASSISTANT
- **surface:** SKILLS/SESSION/dispatch-session-request/run.mjs
- **category:** docs
- **severity:** info
- **status:** fixed
- **summary:** Exit 2 ("no active session") was retired by the Phase 5 single-transport cutover; no code path returns it, but both surfaces still documented it.
- **evidence:** No `return 2` / `exit(2)` for that condition anywhere in the runner.
- **impact:** Documented contract describes behavior the code cannot produce.
- **fix:** Removed from both surfaces. Commit `60e81c6cd`. *(D-02)*

### ECO-008 — Contradiction-guard downgraded an EXPLICIT skills list on a bare substring hit

- **date:** 2026-07-31
- **domain:** ASSISTANT
- **surface:** SKILLS/SESSION/dispatch-session-request/run.mjs
- **category:** correctness
- **severity:** critical
- **status:** fixed
- **summary:** An explicit `--required-skills` is a user assertion; a bare keyword hit is only a heuristic. The guard weighted them equally, so an incidental "sequencing" in a descriptive clause silently stripped a legitimate build lifecycle.
- **evidence:** Isolated with a keyword-free control of identical shape: control → `mode=strict`; with keyword → `mode=none`, skills cleared.
- **impact:** Silently wrong artifact, not an error. A user's explicit instruction was discarded without any signal.
- **fix:** Explicit list now outranks a weak keyword. Commit `427d30914`. *(D-03)*

### ECO-009 — Weak keywords matched inside hyphenated identifiers

- **date:** 2026-07-31
- **domain:** ASSISTANT
- **surface:** SKILLS/SESSION/dispatch-session-request/run.mjs
- **category:** correctness
- **severity:** warning
- **status:** fixed
- **summary:** `FYI` / `ADVISORY` matched anywhere in the string, including inside `notify-fyi-banner`.
- **evidence:** The token `notify-fyi-banner` triggered a downgrade via its embedded `fyi`.
- **impact:** Ordinary identifiers containing a keyword substring silently suppressed build lifecycles.
- **fix:** Anchored to heading position; a plain hyphen is deliberately NOT a clause opener. Commit `427d30914`. *(D-04)*

### ECO-010 — A guard-forced downgrade was invisible in the emitted artifact

- **date:** 2026-07-31
- **domain:** ASSISTANT
- **surface:** SKILLS/SESSION/dispatch-session-request/run.mjs
- **category:** observability
- **severity:** critical
- **status:** fixed
- **summary:** `required_skills:[] + mode:none` was byte-identical to an intentional instruction-pass, so a suppressed build was invisible to anyone not watching stderr.
- **evidence:** Two dispatches with opposite causes produced identical JSON.
- **impact:** Precisely why the live defect went unnoticed — the artifact carried no trace of the guard having fired.
- **fix:** Stamps `downgraded_from` / `downgrade_reason` / `downgrade_keyword`. Commit `427d30914`. *(D-05)*

### ECO-011 — cmdSupersede never upserted the central dispatches registry

- **date:** 2026-07-31
- **domain:** ASSISTANT
- **surface:** SKILLS/SESSION/accept-session-dispatch/accept-session-dispatch-workflow.js
- **category:** correctness
- **severity:** critical
- **status:** fixed
- **summary:** Wrote the dispatch file, the status transition, and the journal event — three of four sinks — but never the registry.
- **evidence:** Handler map: `cmdAccept` registry=[1149], `cmdComplete` registry=[1679], `cmdSupersede` registry=NONE. 5 rows drifted across ASSISTANT, CODEREF-CORE, DEBUG, SESSIONS.
- **impact:** Three-of-four is why it survived: every surface an agent normally checks was already correct.
- **fix:** Mirrored the `cmdComplete` upsert into `cmdSupersede`; 5 drifted rows repaired via the canonical writer. Commit `427d30914`. *(D-06)*

### ECO-012 — autoCompleteAcceptedDispatches misses the registry sink

- **date:** 2026-07-31
- **domain:** ASSISTANT
- **surface:** SKILLS/SESSION/accept-session-dispatch/accept-session-dispatch-workflow.js
- **category:** correctness
- **severity:** warning
- **status:** open
- **summary:** Writes terminal `completed` status across three branches and reaches no registry sink — same class as ECO-011.
- **evidence:** Status writes at `:889`, `:933`, `:989`; registry sink absent. Found during the P3-T8 handler audit.
- **impact:** Same silent drift as ECO-011, in a second writer. Two writers now missing one sink each; a third instance would make this a consolidation problem rather than a patch.
- **fix:** Not fixed — P3-T8's scope boundary was report, don't fix. Formerly STUB-GHCVSG. *(D-07)*

### ECO-013 — Shared classifier re-downgrades on weak substrings, partially masking ECO-008/009

- **date:** 2026-07-31
- **domain:** ASSISTANT
- **surface:** SKILLS/SESSION/_shared/dispatch-class.mjs
- **category:** correctness
- **severity:** warning
- **status:** open
- **summary:** `REPORT_OBJECTIVE_KEYWORDS` keeps its own list with `FYI`/`ADVISORY` matching anywhere, so the producer honors an explicit list and the shared classifier overrides it ~200 lines downstream.
- **evidence:** The module's own comment: "Kept in sync with the producer's historical RECOMMENDATION_KEYWORDS." Console showed `CLASS-GUARD: classified report` after the producer had honored the list.
- **impact:** ECO-008's fix is fully effective for `SEQUENCING`-class hits and **partially masked** for `FYI`/`ADVISORY`.
- **fix:** Not fixed — the plan scopes that guard out (must remain independent) and the module is shared with `accept-session-dispatch`. Formerly STUB-NN1GG2. *(D-08)*

### ECO-014 — Estate-wide dispatch registry drift (191 absent / 13 stale)

- **date:** 2026-07-31
- **domain:** TRACKING
- **surface:** TRACKING/dispatches.json
- **category:** correctness
- **severity:** warning
- **status:** open
- **summary:** A full probe found 191 absent and 13 stale dispatch rows across 24 domains.
- **evidence:** Scoped probe run during P3-T9: ABSENT=191, STALE=13, 24 domains.
- **impact:** Not the same defect as ECO-011 — 9 of the 13 stale are `completed → pending`, i.e. REUSED dispatch numbers, not frozen rows. Needs a judgement call, not a writer re-run.
- **fix:** Not scoped. Likely same family as ECO-004 (a writer stringifying `None`/`null`). Formerly STUB-E2KM3R. *(D-09)*

### ECO-015 — accept-session-dispatch test estate is 26 tests red, pre-existing

- **date:** 2026-07-31
- **domain:** ASSISTANT
- **surface:** SKILLS/SESSION/accept-session-dispatch/__tests__/
- **category:** correctness
- **severity:** warning
- **status:** open
- **summary:** Five suites fail identically with and without this WO's changes; most fail at `cmdAccept` setup on fixture drift.
- **evidence:** Proven by stash-and-compare — 1/4, 0/6, 0/2, 0/5, 0/9 both with and without the edit.
- **impact:** A mutation check run against an already-failing suite proves nothing (the ISS-02 vacuous-gate pattern).
- **fix:** Not fixed. Formerly STUB-72D4K8. *(D-10)*

### ECO-016 — A plan's specified repro did not reproduce

- **date:** 2026-07-31
- **domain:** ASSISTANT
- **surface:** SKILLS/WORKFLOW/create-workorder
- **category:** correctness
- **severity:** info
- **status:** open
- **summary:** The plan's failing case led with "Implement", and the work-delegation verb already suppressed the downgrade — so the specified test PASSED against current code.
- **evidence:** P3-T1's repro passed; a keyword-free control had to be constructed to isolate the real defect.
- **impact:** The defect was real; the repro was not. Execution time is a bad moment to discover this.
- **fix:** Proposed — a plan that specifies a repro should have it confirmed FAILING at authoring time. *(D-11)*

### ECO-017 — A plan premise named handlers that do not exist

- **date:** 2026-07-31
- **domain:** ASSISTANT
- **surface:** SKILLS/WORKFLOW/create-workorder
- **category:** correctness
- **severity:** info
- **status:** open
- **summary:** The plan assumed `cancel`/`reject`/`block` handlers; there are three `cmd*` handlers plus a non-`cmd` sweep helper.
- **evidence:** P3-T8 audit. Grepping for `cmd*` declarations would have missed ECO-012 entirely; mapping status-writes→sinks is what surfaced it.
- **impact:** A plan premise taken on faith would have produced a confidently incomplete audit.
- **fix:** Verify premises against disk before executing. *(D-12)*

### ECO-018 — Test fixture rooting seam: logsRoot vs REPO_ROOT

- **date:** 2026-07-31
- **domain:** ASSISTANT
- **surface:** SKILLS/SESSION/_shared/agent-paths.mjs
- **category:** ergonomics
- **severity:** info
- **status:** open
- **summary:** `inboxScanRoots` derives COMMS from `logsRoot` by design (sandboxing) while `update-dispatches-registry.py` anchors `REPO_ROOT` unconditionally, so a TMP `logsRoot` points the two halves at different trees.
- **evidence:** A registry fixture failed at exit 2 for a reason other than the one under test until the real `LOGS/SESSIONS` root was passed.
- **impact:** Not a product defect — a genuine tension between two correct decisions — but a trap any future registry test will hit.
- **fix:** Document the seam at both call sites, or give the Python writer the same root override. *(D-13)*

### ECO-019 — Doc-drift gate forces version bumps out of plan order

- **date:** 2026-07-31
- **domain:** ASSISTANT
- **surface:** .git/hooks/pre-commit (skill-doc-drift gate)
- **category:** ergonomics
- **severity:** info
- **status:** open
- **summary:** Staging a skill's runner without its `skill.json` fails the commit, so version+docs work is pulled forward into every earlier phase that touches a runner.
- **evidence:** Hit in Phase 2, recurred in Phase 3; P4-T6 had scheduled the bump late.
- **impact:** A phased plan cannot schedule the version bump late, so plan order and gate order disagree.
- **fix:** Not scoped. *(D-14)*

### ECO-020 — `single_phase_mode_invoked` markers were never written

- **date:** 2026-07-31
- **domain:** ASSISTANT
- **surface:** SKILLS/WORKFLOW/execute-workorder (Step 4.1)
- **category:** observability
- **severity:** warning
- **status:** open
- **summary:** Step 4.1 requires appending a `single_phase_mode_invoked` event to `decisions_log[]` on every `--phase=N` entry; zero are on disk for phases 2–4.
- **evidence:** `decisions_log[]` inspected directly — no such events. Halts remained provable from three commits and three transition timestamps.
- **impact:** A gate-integrity postcheck that depends on a marker no executor reliably writes is checking something weaker than it looks. Same class as ECO-001: a documented step with no runtime.
- **fix:** Proposed — enforce it in the transition writer, or key the postcheck on the commit/transition chain it actually has. Recorded as DEC-EXEC-03. *(D-15)*

### ECO-021 — Two overlapping guards make a single-fix mutation check understate the suite

- **date:** 2026-07-31
- **domain:** ASSISTANT
- **surface:** SKILLS/SESSION/dispatch-session-request/__tests__/contradiction-guard-weighting.test.mjs
- **category:** correctness
- **severity:** info
- **status:** open
- **summary:** Reverting the explicit-list weighting alone left 11/12 passing because the anchoring fix independently blocked the primary case; reverting both gave 8 passed / 4 failed.
- **evidence:** Mutation table — P3-T2 alone → 11/1; P3-T2 + P3-T3 → 8/4 including the primary case at `mode=none skills=[]`.
- **impact:** Not a bug — defence-in-depth is defensible — but a future refactor removing ONE guard will not be caught by this suite alone.
- **fix:** Add a test that pins each guard independently. *(D-16)*

### ECO-022 — archive-planning-folder's move path could not leave the ASSISTANT root

- **date:** 2026-07-31
- **domain:** ASSISTANT
- **surface:** SKILLS/WORKFLOW/archive-planning-folder/run.mjs
- **category:** correctness
- **severity:** warning
- **status:** fixed
- **summary:** `srcDir`/`destDir` called `workingRoot()` bare, resolving under `ASSISTANT_ROOT` unconditionally, so a planning folder in another repo root died at exit 2 `folder not found`.
- **evidence:** The seam was half-built — `loadView` and `findCandidates` already accepted a root override that the move path ignored.
- **impact:** Any cross-root planning folder was unarchivable.
- **fix:** Finished the existing seam via `artifactRoot(projectId)`, which already refuses an unknown id with `null` rather than falling back. Verified three ways: reaches CODEREF-CORE, refuses `--project=bogus-xyz`, ASSISTANT path byte-identical. *(D-17)*

### ECO-023 — `--candidates` printed commands that cannot run for cross-root rows

- **date:** 2026-07-31
- **domain:** ASSISTANT
- **surface:** SKILLS/WORKFLOW/archive-planning-folder/run.mjs
- **category:** ergonomics
- **severity:** warning
- **status:** fixed
- **summary:** The sweep emitted `run.mjs {DOMAIN}/{name} --apply` with no `--project=`, so a cross-root candidate's paste-able command would die at exit 2.
- **evidence:** View carries a `projectId:relpath` path form; the printed command dropped the project id.
- **impact:** A sweep that prints an unrunnable command is as blocked as one that cannot see the folder.
- **fix:** Derives the project id from the row's path; ASSISTANT-root rows still emit no flag. *(D-18)*

### ECO-024 — Two planning folders carried retired pre-v1.4.0 anchor statuses

- **date:** 2026-07-31
- **domain:** ASSISTANT
- **surface:** coderef/working/ (planning folder anchors)
- **category:** correctness
- **severity:** warning
- **status:** fixed
- **summary:** `graphify-alignment-projections` was `promoted` and `code-intelligence-improvement-eval` is `resolved`; the planning-folder standard v1.4.0 is a TWO-STATE lifecycle where `open` is the only live value.
- **evidence:** Operator ruling 2026-07-31 — "promotion is a fact, not a status", "archived is a location, not a status". Eligibility gate refused both anchors.
- **impact:** The gate was CORRECT; the folders were the drift. Two independent blockers were stacked, not the single cross-root cause the plan diagnosed — fixing only the diagnosed half would have left the folder just as unarchivable.
- **fix:** First folder's status promoted → open (mechanical conformance) then archived via the runner. Second stopped and dispatched — see ECO-005. *(D-19)*

<!-- ECO-025..ECO-029 recorded 2026-08-01 from CODEREF-CORE's
     WO-CODEREF-CORE-STANDARDS-CONFORMANCE-BURN-DOWN-8-STANDARDS-001 (phases 1-7).
     Filed HERE rather than in CODEREF-CORE's log because the defective surface is
     ASSISTANT/STANDARDS-owned tooling; the CORE-owned findings live in
     CODEREF-CORE/ecosystem-issues.md under that repo's own sequence. -->

### ECO-025 — entry-point kind's own template shipped an ungoverned status value

- **date:** 2026-08-01
- **domain:** STANDARDS
- **surface:** SKILLS/STANDARDS/kinds/entry-point/template/AUDITS/REPORT-TEMPLATE.md
- **category:** correctness
- **severity:** critical
- **status:** fixed
- **summary:** The template carried `status: dated`, which is not in the documentation kind's governed envelope enum, so establishing the entry-point bundle in ANY project immediately created a documentation-kind FAIL.
- **evidence:** `node SKILLS/STANDARDS/standards-establish/run.mjs --project-root=<CORE> --kind=entry-point` → "BLOCKED by documentation-kind conformance gate for kind \"entry-point\"" / "REPORT-TEMPLATE.md: status=\"dated\" not governed". The documentation checker went 2 → 3 FAILs the moment the bundle landed. Governed enum is `living | historical | draft | superseded`.
- **impact:** Two standards kinds contradicted each other, and the establish runner blocked on its own output — a project could not adopt the entry-point standard without breaking a sibling standard. Every project that ran the establish would have inherited the FAIL.
- **fix:** Fixed at the template source, not in the consuming project: `status: dated` → `status: historical`, commit `0a9736346`. Aligned to existing fleet convention rather than invented — `SKILLS/STANDARDS/kinds/ui-design/template/AUDITS/REPORT-TEMPLATE.md` already ships `status: historical`, so entry-point was the lone outlier. Follow-up `5b677e06f` fixed the template's body prose, which still instructed authors to use `status: dated` and would have propagated the defect into every report authored from it.

### ECO-026 — derived-index remediation names a validator as the re-derive command

- **date:** 2026-08-01
- **domain:** STANDARDS
- **surface:** SKILLS/STANDARDS/kinds/derived-index/check.mjs
- **category:** correctness
- **severity:** warning
- **status:** open
- **summary:** The FAIL message tells the agent to re-derive a stale index by running the project's declared generator command, but for CODEREF-CORE that command is a VALIDATOR with no write path, so following the advice can never clear the FAIL.
- **evidence:** Checker output: "`coderef/foundation-docs/INDEX.md` is STALE — re-derive it: `node scripts/doc-gen/validate-docs.js` (drift: generator --strict exit 1)". That script contains no `writeFileSync` and self-reports "Validation failed. Run generation scripts to fix." The real producers are the sibling `scripts/doc-gen/generate-*.js` files.
- **impact:** An agent that follows the remediation verbatim re-runs a read-only check, sees the same exit 1, and concludes the index is unfixable — or worse, loops. The FAIL's stated cause ("index is STALE") is also wrong here: the index is current, and the generator exits 1 for an unrelated reason (23 unresolvable UUID anchors).
- **fix:** Proposed — the kind should distinguish "the declared generator reports drift" from "the index is stale", and should not phrase a generator's non-zero exit as a staleness verdict. A project declaring a validator as its generator is arguably the project's misconfiguration, but the checker should not synthesize a diagnosis from an exit code alone.

### ECO-027 — archive-planning-folder validates --project on the move path but not on --candidates

- **date:** 2026-08-01
- **domain:** ASSISTANT
- **surface:** SKILLS/WORKFLOW/archive-planning-folder/run.mjs
- **category:** ergonomics
- **severity:** info
- **status:** open
- **summary:** An unregistered `--project` value is a hard refusal on the move path and is silently ignored by `--candidates`, so the same flag value behaves as valid in one mode and invalid in the other.
- **evidence:** `run.mjs --candidates --project=CODEREF-CORE` printed 3 candidates with no complaint; `run.mjs coderef-core/code-intelligence-improvement-eval --project=CODEREF-CORE` → exit 1, "unknown --project=\"CODEREF-CORE\" — not a registered project root (no silent fallback to ASSISTANT)". The registry key is the lowercase `coderef-core`; `projectRoot('CODEREF-CORE')` returns `null` while `projectRoot('coderef-core')` resolves.
- **impact:** `--candidates` is the discovery step an agent runs first, so a casing or naming mistake is confirmed as working before it fails at the move. Minor, but it inverts the usual expectation that the read-only mode is the stricter one. Related to ECO-023, which fixed the *printed command* for cross-root rows; this is the *input validation* half.
- **fix:** Proposed — have `--candidates` route `--project` through the same `projectRoot()` refusal, or ignore it explicitly with a notice rather than silently.

### ECO-028 — generate-quickstart cannot satisfy the per-runnable-surface quickstart contract

- **date:** 2026-08-01
- **domain:** ASSISTANT
- **surface:** SKILLS/DOCUMENTATION/generate-quickstart
- **category:** scope-creep
- **severity:** warning
- **status:** open
- **summary:** The entry-point kind requires a `*-quickstart.md` in each runnable surface's OWN directory, but the skill only emits a project-root quickstart, so its output can never clear the check it is named in the remediation for.
- **evidence:** `entry-point.quickstart-present` WARN text says "Generate one with /generate-quickstart". The check's own resolver (`SKILLS/STANDARDS/kinds/entry-point/check.mjs`, `surfaceHasQuickstart`) reads only the surface's own directory and documents that "a shared ancestor README does NOT count as per-surface coverage". For CORE the surface is `src/cli/coderef-mcp-server.ts`, so the file must be `src/cli/*-quickstart.md`; the skill produces `<project>-quickstart.md` at the repo root.
- **impact:** The remediation advice cannot be followed to completion. Cleared for CORE only by hand-authoring `src/cli/coderef-mcp-server-quickstart.md` (commit `a9477bc`); every other project hitting this WARN will hit the same wall.
- **fix:** Proposed — add a per-surface mode (target dir + surface name) to the skill, or change the WARN to stop naming a skill that cannot produce the required artifact.

### ECO-029 — generate-quickstart's discover step mis-derives project name and description

- **date:** 2026-08-01
- **domain:** ASSISTANT
- **surface:** SKILLS/DOCUMENTATION/generate-quickstart (discover.cjs)
- **category:** correctness
- **severity:** warning
- **status:** open
- **summary:** The discovery step emits a leading-dash project name and leaks a frontmatter key into the description, so regenerating a quickstart DEGRADES a previously-correct file.
- **evidence:** Running the discover step against CODEREF-CORE returned `"project_name": "-coderef-core"` (leading dash) and `"project_description": "title: @coderef/core"` (the `title:` key included). The existing `coderef-core-quickstart.md` carries the correct `coderef-core` and a real description.
- **impact:** The generated-view-is-derived doctrine says fix the template and regenerate — but here regeneration introduces two regressions, so the doctrine's normal remedy is unsafe until this is fixed. Found when the quickstart's missing frontmatter was traced to the template; the template was fixed at source (`ea0aa0c10`) but the output had to be synced by hand (`1781da6`) rather than regenerated.
- **fix:** Not scoped. Strip the leading separator when deriving the name from the path, and parse the description from the package/frontmatter value rather than the raw line.

### ECO-030 — kaizen-log and ticket tools frozen in favor of root ecosystem-issues.md

- **date:** 2026-08-01
- **domain:** ASSISTANT
- **surface:** SKILLS/KAIZEN/kaizen-log/run.mjs
- **category:** ergonomics
- **severity:** info
- **status:** open
- **summary:** `/kaizen-log` and `/ticket` tools were frozen by operator directive (2026-08-01) pending system refactor, transitioning logging to hand-edited ecosystem-issues.md.
- **evidence:** PROMPTS/ecosystem-issues-freeze.md operator directive; ecosystem-issues.md created from template at project root.
- **impact:** Agents must hand-edit ecosystem-issues.md using sequential ECO-NNN IDs instead of calling kaizen-log or ticket CLI runners.
- **fix:** Created ecosystem-issues.md in repository root to log ecosystem issues during the freeze period.

### ECO-031 — scaffolded core-improvements-731 planning folder for genre gap resolution

- **date:** 2026-08-01
- **domain:** coderef-core
- **surface:** coderef/working/coderef-core/core-improvements-731/PLAN.md
- **category:** docs
- **severity:** info
- **status:** open
- **summary:** Created planning folder core-improvements-731 to track remaining code intelligence feature gaps (GX-002, GX-003, GX-004).
- **evidence:** coderef/working/coderef-core/core-improvements-731/PLAN.md created on disk.
- **impact:** Establishes clear pre-stub roadmap for scope-stack receiver resolution (62% unresolved call edges), Serena refactoring apply path, and Repomix context compression.
- **fix:** Created planning folder and authored PLAN.md with full context and approach options.

<!-- ECO-032..ECO-036 recorded 2026-08-01 from
     WO-CODEREF-CORE-STANDARDS-CONFORMANCE-BURN-DOWN-8-STANDARDS-001 (phases 2-7).
     These are CODEREF-CORE-OWNED findings (the defective surface is in this repo).
     They were first written as ECO-001..005 in this file at commit b9a54f2a0ed7,
     before the file was reseeded from the ASSISTANT log; renumbered here to the next
     free ids so nothing collides and no prior entry is renumbered. -->

### ECO-032 — docs/SCHEMA.md understates EdgeEvidence and EdgeRelationship

- **date:** 2026-08-01
- **domain:** CODEREF-CORE
- **surface:** docs/SCHEMA.md
- **category:** docs
- **severity:** warning
- **status:** open
- **summary:** The canonical schema reference documents `EdgeEvidence` as a 10-variant union and `EdgeRelationship` as 4 values; the code carries 12 and 8.
- **evidence:** `docs/SCHEMA.md:361` heading reads "`EdgeEvidence` (10-variant discriminated union)" and `:354` lists `import | call | export | header-import`. Against source: `src/pipeline/graph-builder.ts:144` declares 12 variants (adds `calls-endpoint`, `serves-endpoint`) and `src/pipeline/graph-builder.ts:103` declares 8 relationships (adds `extends`, `implements`, `calls_endpoint`, `serves_endpoint`).
- **impact:** SCHEMA.md is the doc every other standard cites as the authoritative field-shape reference, so an agent reading it builds an incomplete model of the edge surface and cannot know the endpoint variants exist. The drift is silent — nothing compares the prose counts to the union.
- **fix:** Proposed — refresh both counts and enumerate the four added values. Deliberately NOT patched inside the burn-down WO: the schema sub-type standard's job is to point at the authoritative reference, not become a competing one. The WO's own P2-T5 task text inherited the stale "10 variants" premise, so the drift had already propagated into planning.

### ECO-033 — a code element carries TWO id shapes derived from one triple

- **date:** 2026-08-01
- **domain:** CODEREF-CORE
- **surface:** src/utils/coderef-id.ts + src/registry/entity-registry.ts
- **category:** correctness
- **severity:** warning
- **status:** open
- **summary:** The same element is identified both by the readable `codeRefId` natural key and by an RFC-4122 v5 UUID, both derived from the same `(file, name, line)` triple.
- **evidence:** `src/utils/coderef-id.ts:49` builds `@<Designator>/<file>#<name>:<line>`; `src/registry/entity-registry.ts:37` hashes `${normalizeSlashes(file)}:${name}:${line}` into a v5 UUID. Same inputs, two live outputs — `generateUUID` is called at `entity-registry.ts:62` and `:91`.
- **impact:** The `data` standards kind requires ONE id format per object; two shapes for one object is the cross-surface alias hazard that sub-type exists to prevent. Neither is a bug in isolation (both deterministic and stable), but consumers must know which is canonical and nothing declares it. Plausibly the mechanism behind ECO-034, since both ids embed `line` and therefore change when an unrelated edit shifts an element.
- **fix:** Proposed — rule which shape is canonical and demote the other to an explicitly-labelled alternate handle. Declared as a known tension in `docs/standards/data/KEYING-STANDARD.md` (commit `a45a665`) without picking a survivor, because the choice has consumer impact beyond that WO.

### ECO-034 — 23 invalid UUID anchors hold the derived-index kind at FAIL

- **date:** 2026-08-01
- **domain:** CODEREF-CORE
- **surface:** coderef/foundation-docs/ + scripts/doc-gen/validate-docs.js
- **category:** correctness
- **severity:** warning
- **status:** open
- **summary:** Foundation docs cite 23 UUID anchors that no longer resolve against `.coderef/index.json`, so the doc validator exits 1 and the `derived-index` kind reports the index STALE.
- **evidence:** `node scripts/doc-gen/validate-docs.js --strict` → "Found 310 UUID anchors (287 valid)" then "Errors: - 23 invalid UUID anchors found", exit 1. Named examples: `EXPORTS.md: a13dbe09-a3c4-53b0-99a1-4b0630dfe3c6`, `API.md: 23d01bc8-2217-52d2-a80a-fd5574eb3b75`. `derived-index` checker → 4 pass / 1 fail on `core.entry.index.current`.
- **impact:** One standing core FAIL that re-running the validator can never clear. Materially better than the state the burn-down WO was scoped against, which recorded 309 invalid of 311 — most anchors have since been repaired and only a tail remains.
- **fix:** Not yet scoped. Diagnose whether the 23 are genuinely-removed elements or elements whose `line` moved (the ECO-033 instability), then regenerate via the `scripts/doc-gen/generate-*.js` producers — **not** `validate-docs.js`, which contains no write path. ECO-026 covers the checker's incorrect remediation string.

### ECO-035 — coderef/ carries two homes for resource sheets

- **date:** 2026-08-01
- **domain:** CODEREF-CORE
- **surface:** coderef/resource-sheets/ and coderef/resources-sheets/
- **category:** correctness
- **severity:** warning
- **status:** open
- **summary:** Resource sheets live under both `coderef/resource-sheets/` (canonical) and `coderef/resources-sheets/` (a plural-typo sibling), plus a third set under `coderef/resource/`.
- **evidence:** `find . -name "*RESOURCE-SHEET*.md"` → 27 sheets across SIX locations: `coderef/resource-sheets/` 3, `coderef/resources-sheets/` 10, `coderef/resources-sheets/systems/` 5, `coderef/resource/` 3, `src/` 5, `scripts/` 1. The `resource-sheet` kind reports `sheet.filename-and-location: 22 of 25 sheet(s) violate naming/location (not under coderef/resource-sheets/)`.
- **impact:** A reader cannot tell which directory is authoritative and a writer picks by coin-flip — precisely what a canonical location exists to preclude. Holds the `resource-sheet` kind at 3 core FAILs.
- **fix:** Blocked on an operator relocation ruling (WO P5-T3): 6 sheets declare `parent_project: coderef-dashboard`, so moving them into CORE's canonical home would make another project's content canonical here. Full provenance table recorded in that WO's `communication.json`.

### ECO-036 — five zero-byte resource-sheet files shadow five real sheets

- **date:** 2026-08-01
- **domain:** CODEREF-CORE
- **surface:** coderef/resources-sheets/systems/
- **category:** correctness
- **severity:** warning
- **status:** open
- **summary:** All five files under `coderef/resources-sheets/systems/` are 0 bytes, and each duplicates the filename of a real, populated sheet one directory up.
- **evidence:** `ls -la coderef/resources-sheets/systems/` → all five entries `0` bytes, dated Jan 13 2026 (`Context-Generator`, `Dependency-Graph-Builder`, `File-Generation-System`, `Scanner-UI-System`, `Theme-System`, each `-RESOURCE-SHEET.md`). Their populated twins one level up measure 18246B, 17783B, 19049B, 15572B and 13862B.
- **impact:** They are counted by the `resource-sheet` checker and fail both `frontmatter-complete` and `required-sections` — an empty file can satisfy neither. They also make any name-based sheet lookup ambiguous. The burn-down WO's task text described these as sheets with "none" provenance, which reads as an attribution gap; they are empty placeholders, so the remedy is deletion, not attribution.
- **fix:** Proposed — delete all five. NOT deleted unilaterally: deletion is irreversible and these sit inside the directory whose ownership is part of the pending ECO-035 ruling.

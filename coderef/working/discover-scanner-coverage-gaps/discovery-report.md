# Discovery Report — Scanner Header-Coverage Gap (DISPATCH-002)

**Domain:** CODEREF-CORE
**Dispatch:** DISPATCH-2026-05-30-CODEREF-CORE-002 (`discover-scanner-coverage-gaps`)
**Mode:** read-only deep `/discover`, auto-greenlit (DISPATCH-003 = (B) work 002)
**Date:** 2026-05-30
**Consolidated backlog stub:** STUB-HGV5YM
**Reports to:** ASSISTANT

---

## TL;DR — The Root Cause Is a Single Hard Filter

A missing `@coderef-semantic` header doesn't *degrade* a chunk's RAG quality — it **excludes the chunk from the RAG index entirely**:

> `src/integration/rag/indexing-orchestrator.ts:606-620` — every chunk whose `headerStatus ∈ {missing, stale, partial}` is filtered OUT before indexing.

So the audit's "1,642 / 2,795 chunks (59%) UNINDEXED" is **exactly** the count of chunks whose source file never got a header. The header is a *gate on RAG inclusion*, but **nothing gates the header itself**. The result is a silent, monotonic coverage decay:

1. Header stamping is **opt-in** (`--source-headers`), **one-time** (batch over existing files), and **unenforced** (no hook/CI/watch stamps new files) → every file added after the 2026-05-17 dogfood is born header-less.
2. Header-less file → hard-filtered from RAG → **invisible** to every consumer (Lloyd, `--auto-seed`, agent context).
3. There is **no coverage metric in any CLI output, no gate, and skip-reasons are buried in `.coderef/rag-index.json`** → degradation is undetectable until a human runs an audit.

**The scanner fix is therefore not "re-run populate."** It is: **make header coverage enforced-and-observable** so the index can never again silently shed 59% of the codebase. The measurement primitive already exists (`validation-report.json` carries `header_missing_count`); only the *gate* and *surfacing* are missing.

---

## Findings by Discovery Question

### Q1 — Why did coverage regress / never complete?

**It never regressed; it never *held*, because no mechanism guarantees new files get a header.**

| Sub-question | Finding | Evidence |
|---|---|---|
| (a) Opt-in vs always-on? | **Opt-in.** Stamping only runs when `--source-headers`/`--overwrite-headers` is passed; defaults to `false`. | `src/cli/populate.ts:148-150`, `:424-442` |
| (b) After-the-fact vs stamp-on-write? | **After-the-fact.** A one-time post-pipeline batch loop over existing elements. The watch daemon (`file-watcher.ts`) notifies of changes but never stamps. | `src/cli/populate.ts:424-442`; `src/scanner/file-watcher.ts` |
| (c) Enforcement on NEW files? | **None.** No `.husky/`, no `.github/workflows/`, no pre-commit, no lint rule, no watch-stamp. | absence confirmed; `package.json` scripts |
| (d) What stamps, what's skipped? | `HeaderGenerator` stamps; with `preserveExisting=true` (default) it only writes files that have **no** prior header. | `src/semantic/header-generator.ts:202-329` |

**Root-cause hypothesis (confirmed):** The 2026-05-17 dogfood achieved 100% coverage *of files that existed on that date* via two one-time CLI passes, then installed **zero persistent enforcement**. Every subsequent commit adding source files degrades the ratio automatically — and because the header is a RAG-inclusion gate (see TL;DR), each header-less file is silently dropped from the index.

### Q2 — Is coverage observable anywhere, or invisible until a human audits?

**Effectively invisible.** The *number exists* but is never surfaced and never gates.

| Sub-question | Finding | Evidence |
|---|---|---|
| (a) Coverage metric in any report? | Counts exist in `validation-report.json` (`header_defined_count`, `header_missing_count`, `header_stale_count`, `header_partial_count`, + 2 drift fields) and in an HTTP intelligence endpoint (`:52850`), but **no standard CLI command prints them**. | `src/pipeline/output-validator.ts:120-143`; `coderef-intelligence-server.ts:305-309` |
| (b) Does coverage affect `validation-report.ok`? | **No.** `ok = (errors.length === 0)`; only graph-integrity (GI-1..6) and `--strict-headers`-promoted drift produce errors. Header coverage is orthogonal. | `output-validator.ts:248-249` |
| (c) Any coverage-threshold gate? | **None.** Coverage can fall to 0% without any failure/warning. `rag-index` only checks `validation.ok`. | `indexing-orchestrator.ts:418-442` |
| (d) Are skipped files counted/logged? | **Counted, not surfaced.** Header-missing chunks are filtered with a per-chunk `reason='header_status_missing'` into `chunksSkippedDetails` (written to `.coderef/rag-index.json`), but CLI output shows only a bare `Chunks skipped: N` with no reason breakdown. | `indexing-orchestrator.ts:600-620`, `:548`, `:568-574` |

**Verdict:** *The measurement primitive is already built and already wired into `validation-report.json` — the gap is purely (i) no gate keys on it and (ii) no CLI surface prints it.* This makes the fix substantially cheaper than "build coverage tracking from scratch."

### Q3 — Where does `--auto-seed` fall back to `fallback_used=true`, and is the signal surfaced?

**SCOPING CORRECTION (important):** The `--auto-seed` fallback logic lives **ASSISTANT-side in Python**, not in coderef-core:
- Primary path: `ASSISTANT/SKILLS/WORKFLOW/_shared/planner/discovery_rag.py:59-159` (queries RAG `:52849`).
- Fallback path: `ASSISTANT/SKILLS/ANALYSIS/analyze-coderef-semantics/dispatch_seed_assembler.py:73-97` (reads hand-maintained `coderef/foundation-docs/*.md`).

| Sub-question | Finding | Evidence |
|---|---|---|
| (a) Code path | `enrich_with_rag()` → on failure, `_MarkdownFoundationDocsAdapter` | `discovery_rag.py:59`; `dispatch_seed_assembler.py:73` |
| (b) Primary / fallback | RAG vector query → hand-maintained foundation-docs MD + `index.json` header index | as above |
| (c) Triggers | `requests` missing, vectors absent/stale (>7d), RAG server unreachable, header-index missing, query exceptions | `discovery_rag.py:114-143`; `dispatch_seed_assembler.py:136-268` |
| (d) Is the signal surfaced? | **Swallowed.** `fallback_used` is written into `dispatch.semantic_context.fallback_used` and the Python CLI returns **exit code 2**, but the Node caller `dispatch-session-request/run.mjs:264-266` treats exit 2 **identically to 0** with no log/warn/metric. | `cli.py:81`; `run.mjs:264-266`, `:595-596` |

**Verdict:** This is a **sibling gap, not the same fix.** It shares the failure *class* (silent fallback with no signal) but lives in a different repo. **Recommendation: carve it out of the CORE scanner workorder** and file it as an ASSISTANT-side follow-up (surface exit-code-2 as a visible warning + emit a `fallback_used` event). Folding it into the scanner WO would cross a repo boundary and dilute the root-cause fix. *Notably, the CORE fix directly shrinks this fallback's blast radius:* if coverage is enforced, the RAG path is far less likely to come back empty and trigger the ASSISTANT-side fallback in the first place.

### Q5 — STUB-311: graph-builder.ts deletion blocker

**Blocked by 10 live consumers + a schema-divergence decision — and it is *separable* from the coverage gap.**

- `src/analyzer/graph-builder.ts` (legacy, Map-based `DependencyGraph`) has **10 importers**: 4 in `src/analyzer/` (`analyzer-service.ts:24`, `graph-analyzer.ts:24`, `graph-helpers.ts:24`, `index.ts:12-13`) + 5 in `__tests__/`.
- `src/pipeline/graph-builder.ts` (canonical, array-based `ExportedGraph` via `constructGraph()`) has **1 importer**: `orchestrator.ts:54`.
- The two are **structurally divergent** (Map-based vs ExportedGraph; incompatible edge schemas), not duplicates. Deletion needs a real migration, not a rename.
- Documented blocker (STUB-311 / archived `WO-MIGRATE-GRAPH-BUILDER-IMPORTERS-001`): the migration WO cleared all external consumers; deletion was deferred because the legacy analyzer infra (AnalyzerService/GraphAnalyzer/graph-helpers) still depends on the old schema. Three options on the table: (A) full migration, (B) re-export shim, (C) test-only first.
- **Does NOT violate bulletproof #1 ("single analyzer slice").** That invariant guards *RAG reading one `graph.json`*, not source-file architecture. `analyzer/graph-builder` is vestigial Phase-3 debt outside the canonical pipeline — cleanup, not a divergence breach.

**Verdict:** **Keep STUB-311 separate.** It is unrelated to header coverage and warrants its own decision (A/B/C) workorder. Folding it into the scanner-coverage WO would mix an architectural-migration decision into a coverage-enforcement fix.

---

## Option Analysis (Q4) — Which Option Closes the Gap Durably?

The dispatch named three candidate shapes. Assessed against "fixes the scanner root-cause so scan/RAG results stay good," not "one-time re-run":

| Option | What it does | Durability | Verdict |
|---|---|---|---|
| **A. Stamp-on-write** | Enforce a header whenever a file is created/changed (pre-commit hook + watch-daemon stamp + `populate` defaults `--source-headers` on). | Prevents header-less files at the source. Strongest *prevention*. | **Necessary but not sufficient** — hooks can be bypassed (`--no-verify`), and external contributors / generated files slip through. |
| **B. Coverage-as-gate** | Promote `header_missing_count` to a `validation-report.ok`-affecting check (or a dedicated coverage floor), so `rag-index` refuses / warns when coverage drops below threshold. | Makes degradation **impossible to ship silently** regardless of how the file got there. Reuses the metric that *already exists*. | **Core of the durable fix.** Cheapest (primitive already wired) and catches every path, not just the commit path. |
| **C. Surface-fallback** | Make the RAG indexer print coverage + skip-reason breakdown in CLI output; emit the count as an observable signal. | Turns the silent 59% drop into a loud one. Detection, not prevention. | **Required companion** to B — a gate with no human-readable surface is a gate people learn to ignore. |

**Recommendation — layered B + C as the primary scope, A as the prevention layer:**

> **Durable close = coverage becomes a first-class, gated, observable invariant of the index — not an opt-in afterthought.** Specifically: (1) **B** — `validation-report.json` gains a `header_coverage_pct` and `rag-index` gates/warns on a coverage floor; (2) **C** — `populate` and `rag-index` print coverage + a skip-reason breakdown so the number is never buried again; (3) **A** — flip `populate` to stamp by default and add a stamp-on-write enforcement (hook or watch-daemon) so new files are born covered. The STUB-297 one-time re-run becomes a **sub-step** (the initial backfill that brings the number above the new floor), not the deliverable.

This is the inversion the dispatch asked for: fix the scanner (coverage enforcement + observability) and the scan/RAG results follow, rather than papering over with a one-time `populate-coderef` pass that decays again on the next commit.

---

## Proposed Single Gap-Closing Workorder Scope

**Candidate WO:** `WO-RAG-HEADER-COVERAGE-ENFORCE-AND-SURFACE-001` (consolidates STUB-HGV5YM; folds STUB-297 as a sub-step)

**In scope (one root-cause fix, CORE repo only):**
1. **Gate (B):** add `header_coverage_pct` to `ValidationReport`; add a coverage floor that affects `rag-index` admission (warn-by-default, error under a strict flag) — mirror the existing `validation.ok` plumbing.
2. **Surface (C):** `populate-coderef` and `rag-index` print `header coverage: X% (defined N / total M)` + a one-line skip-reason breakdown (`header_status_missing: K`); stop burying it in `.coderef/rag-index.json`.
3. **Prevent (A):** flip `populate` default toward stamping (or a clearly-documented `--enforce-headers`), plus a stamp-on-write enforcement point (pre-commit hook and/or watch-daemon stamp callback).
4. **Backfill (STUB-297, sub-step):** one `populate --source-headers --overwrite-headers` pass to clear the current 1,642-chunk deficit above the new floor.

**Explicitly OUT of scope (carve-outs, each its own item):**
- **`--auto-seed` fallback signal (Q3)** — ASSISTANT-side Python; file as a separate ASSISTANT follow-up (surface exit-2 + emit `fallback_used` event).
- **STUB-311 graph-builder deletion (Q5)** — separate architectural A/B/C decision WO; unrelated to coverage.

**Dogfood validation (post-build):** re-run on coderef-core's own tree; assert (i) coverage prints in CLI, (ii) `header_coverage_pct` appears in `validation-report.json`, (iii) a deliberately-unstamped new file trips the gate/warn, (iv) the 59%→~100% lift is reflected and held by the prevention layer.

---

## Key File Map (for the workorder author)

| Concern | File | Anchor |
|---|---|---|
| RAG exclusion of header-less chunks (**root cause**) | `src/integration/rag/indexing-orchestrator.ts` | `:606-620` |
| `validation.ok` logic (gate insertion point) | `src/pipeline/output-validator.ts` | `:248-249` |
| Coverage counts already recorded | `src/pipeline/output-validator.ts` | `:120-143` |
| Header stamping (opt-in, one-time) | `src/cli/populate.ts` | `:148-150`, `:424-442` |
| Header generator (preserve-existing) | `src/semantic/header-generator.ts` | `:202-329` |
| `rag-index` validation gate | `src/integration/rag/indexing-orchestrator.ts` | `:418-442` |
| Skip-detail sink (currently buried) | `src/integration/rag/indexing-orchestrator.ts` | `:548`, `:568-574` |
| HTTP coverage endpoint (existing, unused by CLI) | `coderef-intelligence-server.ts` | `:305-309` |
| `--auto-seed` fallback (ASSISTANT-side carve-out) | `ASSISTANT/.../dispatch_seed_assembler.py`, `run.mjs` | `:73-97`, `:264-266` |
| graph-builder deletion (STUB-311 carve-out) | `src/analyzer/graph-builder.ts` (10 importers) | — |

---

*Read-only discovery complete. No source files were modified. Reporting to ASSISTANT for workorder authoring; recommend `/create-workorder --from-stub=STUB-HGV5YM` scoped per "Proposed Single Gap-Closing Workorder Scope" above, with Q3 and Q5 carved out as separate items.*

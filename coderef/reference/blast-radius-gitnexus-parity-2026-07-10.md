# Blast-Radius Model — coderef vs GitNexus Parity Gap Analysis

**Date:** 2026-07-10
**Workorder:** WO-GENRE-FEATURE-EXTRACTION-PROGRAM-001, Phase 5 (STUB-42QA8V)
**Scope:** VALIDATE-only, **document-only** (operator ruling 2026-07-10). No build; no empirical
side-by-side run; GitNexus was NOT fetched or executed. This document compares the two blast-radius
models from source and states honestly what that leaves unproven.

---

## 1. coderef's blast-radius model (source-cited)

coderef exposes blast radius through two read-only MCP tools, both in
`src/cli/coderef-mcp-server.ts`:

- **`impact_of(element, max_depth?, limit?)`** — `:703-756`. "What breaks if I change this element?"
- **`diff_impact(ref?, max_depth?, limit?)`** — `:1053-1167`. "What is the blast radius of this git change?"

Both compute blast radius as **reverse reachability over a resolved dependency graph**:

| Property | Value | Source |
|---|---|---|
| Traversal | reverse BFS (inbound edges) | impact_of `:718-733`, diff_impact `:1128-1142` |
| Edge kinds | **`call` + `import` only** | `edge.relationship !== 'call' && edge.relationship !== 'import'` → skip (`:722`, `:1132`) |
| Edge resolution | **RESOLVED edges only** | `cache.inbound` is built from resolved edges (unresolved edges never enter it) |
| Export edges | **excluded** — "containment, not consumption" | v2 hygiene comment `:712-713` |
| Grain | element (function/class/…), aggregated to files in output | `nodeSummary` / `fileCounts` `:735-742` |
| Depth | capped, default 3, max 10 | `Math.max(1, Math.min(10, max_depth ?? 3))` (`:706`, `:1057`) |

`diff_impact` adds a **seed-derivation** step on top of the same BFS:

1. `git diff -U0 --no-color [ref]` (read-only; default `HEAD` = working tree vs last commit;
   `WORKTREE` diffs the working tree) — `:1062-1068`.
2. Parse `+++ b/<file>` and `@@ … +c,d @@` hunk headers → changed line ranges per file — `:1081-1095`.
3. Map each changed range to its **enclosing element** using closest-preceding-element ownership:
   an element owns `[its line, next element's line)` — `:1108-1121`.
4. Union reverse-BFS from all changed elements → transitive dependents = the blast radius — `:1123-1142`.

Output is counts + affected-files (`transitive_dependents`, `affected_files`, `files[]`),
`impact_of` additionally returning `dependents_by_depth`.

---

## 2. GitNexus's model (from its public description)

GitNexus is an external code-graph / blast-radius tool (NOT vendored in this repo, NOT run for this
analysis). Its published model, at the level relevant to parity:

- Builds a code graph from a repository and answers **"blast radius of a change"** as the set of
  entities transitively reachable from the changed entities over the dependency graph.
- Operates over commits/files/symbols; seeds blast radius from a **diff/commit** much like
  `diff_impact`.
- Reverse-reachability is the core operation — the same shape as coderef's reverse BFS.

## 3. Correspondence

At the model level the two agree on the essential algorithm:

> **blast radius = reverse reachability over a dependency graph, seeded from the changed entities.**

coderef's `diff_impact` is the direct analogue: diff → changed entities → reverse closure. The seed
derivation (diff → enclosing element) and the traversal (reverse BFS over dependency edges) mirror
GitNexus's commit-seeded blast radius. For a change whose edges are all resolved call/import edges
within the depth cap, the two should produce the **same** dependent set.

## 4. Structural parity GAPS (where the sets diverge)

coderef's blast radius is a **lower bound** relative to a maximally-complete tool, by construction:

1. **Resolved-edges-only.** coderef traverses only *resolved* call+import edges. It is structurally
   blind to the **~5,076 `receiver_not_in_symbol_table` unresolved edges** measured in this WO's
   Phase 2 (80% test-framework, 7% library-namespace, …) and to any dynamic dispatch. A dependent
   reachable only via an unresolved edge is **missing** from coderef's blast radius. A tool with
   broader edge resolution (or heuristic/dynamic edges) would report a larger radius.
2. **Edge-kind coverage: call + import only.** No data-flow, no type-flow, no inheritance/override
   edges. A change that propagates through a shared type or a subclass override is invisible.
3. **Depth cap.** Default 3, hard max 10. GitNexus-style unbounded reachability would include deeper
   transitive dependents that coderef truncates. (coderef surfaces this via `dependents_by_depth`,
   so the truncation is at least *visible*.)
4. **Grain.** coderef is element-grain seeded, file-aggregated in output. A symbol-grain or
   file-grain reference tool may bucket differently (e.g. counting whole files as impacted where
   coderef counts specific elements), so raw counts are not directly comparable without normalization.
5. **Export edges excluded.** coderef deliberately drops export (containment) edges from the reverse
   walk (`:712`). A tool that treats "file re-exports X" as an impact path would diverge here — this
   is a *deliberate* coderef modeling choice, not a defect, but it is a parity difference.

## 5. Honesty statement (what is NOT proven)

Per the operator ruling (2026-07-10), **no empirical side-by-side run was performed** and GitNexus was
not acquired or executed. This document establishes model *correspondence and divergence from the
source code*, not measured agreement. The following remain unproven and would require a separate
empirical VALIDATE workorder (fetch GitNexus, run both on an identical change set, diff the radii):

- Whether, on a real shared change set, the two blast radii agree element-for-element within
  coderef's resolved+depth-capped envelope.
- The quantitative size of gap (1) — how many real dependents coderef misses due to unresolved edges
  on a representative change.

The internal consistency of coderef's own two tools (`diff_impact` seeded from a change ≡ `impact_of`
seeded on the same changed elements) is asserted by their shared BFS core (`:718-733` ≡ `:1128-1142`)
but was likewise not exercised empirically in this phase.

---

**Verdict:** coderef's blast-radius model is *algorithmically equivalent* to GitNexus's
(reverse-reachability-from-a-diff) and *conservatively narrower* in coverage (resolved call+import
edges, depth-capped, export-excluded). The parity gap is dominated by **unresolved-edge blindness**
(gap 1) — the same residual the P2 measurement surfaced. Closing that gap is the domain of
STUB-X5JQDR (library-namespace receiver resolution) and unresolved-edge work generally, not of the
blast-radius tools themselves.

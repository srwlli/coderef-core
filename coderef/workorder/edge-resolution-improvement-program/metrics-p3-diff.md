# P3 heritage-aware method lookup — before/after metrics diff

**Workorder:** WO-EDGE-RESOLUTION-IMPROVEMENT-PROGRAM-001 Phase 3 (STUB-9B66EN)
**Planning-gate decision:** execute as stubbed, with honest small-delta expectations recorded
up front — this repo's live heritage estate is 22 extends/implements edges, so the phase's
value is repo-agnostic recall + precision, carried by the 9-test contract envelope.
**Snapshots:** `metrics-p3-before.json` / `metrics-p3-after.json`

## Headline

| Scalar | Before (post-P2) | After | Delta | Attribution |
|---|---|---|---|---|
| valid_edge_count | 10,005 | 10,049 | +44 | WO's own tree + peer commits (see below) |
| unresolved_count | 1,673 | 1,674 | +1 | new test file |
| ambiguous_count | 1,730 | 1,735 | +5 | new test file / peer tree |
| unresolved_src_count | 782 | 783 | +1 | new heritage-index.ts internals |
| resolved_of_resolvable | 74.62% | 74.67% | +0.05pp | denominator drift from tree changes |
| test_dsl_count | 16,625 | 16,720 | +95 | new contract test file's own DSL calls |

**Heritage-attributed self-scan delta: ZERO — by controlled measurement, not inference.**

## The A/B isolation (why the raw diff is confounded and how it was resolved)

Between the P2-final populate and this phase's, a PEER session committed
`src/pipeline/graph-builder.ts` (77 lines) + `doc-ingest.ts` changes and frontmatter across
all 8 foundation docs (WO-FOUNDATION-DOCS-GENERATOR-EMITTED-FRONTMATTER-001, fe02d25).
The raw before/after resolved-id comparison therefore showed a near-total id turnover
(9,951 of 10,005 ids differ) — **cross-snapshot id-vintage noise** (line-anchored codeRefIds
+ changed edge emission), NOT edge loss. Verified in three steps:

1. **Determinism check:** two identical populates on the current tree → resolved-id sets
   byte-identical (0 lost / 0 gained). The pipeline is deterministic; the turnover is
   tree-vintage, not noise.
2. **A/B isolation:** one populate with the heritage index neutralized (built from
   `undefined` → empty, every walk reports hasHeritage=false) vs one with it live, same
   tree otherwise. **Resolved sets byte-identical: A-only 0, B-only 0.** The heritage walk
   flips zero edges on this repo.
3. **Scalar cross-check:** unresolved-by-reason identical in A and B
   (`method_not_in_class_own_methods` 45 → 45: those edges' ancestors are unextracted or
   external, exactly the (g) contract case).

## What the phase actually shipped (the repo-agnostic value)

- `super.x()` calls now RESOLVE through the declared parent chain (previously
  hard-unresolved `super_call_out_of_scope` under guardrail 3); heritage-present misses
  are honestly `super_method_not_in_heritage`.
- Inherited `this.x()` (method on an ancestor, call in the subclass) resolves EXACT.
- Scope-bound receivers (`new`/annotation/param) resolve inherited methods EXACT via the
  chain with reason=`heritage_method_lookup` — a type-proven answer where the bare-name
  ACG tier could only offer provisional heuristics. Nearest-level-wins shadowing; own
  methods still win first; multi-file ancestor-name collisions stay ambiguous.
- Cycle-safe (visited set) + depth-capped (16) BFS in the new `src/pipeline/heritage-index.ts`.
- Contract envelope: `__tests__/pipeline/heritage-method-lookup.contract.test.ts`, 9 tests
  authored before the implementation — chain resolution, multi-level, cycles, super hit/miss,
  this-inheritance, shadowing, external supertypes (no fabrication), ambiguity, all three
  binding kinds.

Zero self-scan flips is the honest result for a function-heavy TS codebase whose 45
residual own-methods misses all have unextractable ancestors. Class-heavy estates
(Python services, framework-style TS) are where this mechanism pays.

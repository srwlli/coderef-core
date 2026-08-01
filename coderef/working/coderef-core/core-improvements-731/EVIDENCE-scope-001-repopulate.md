# SCOPE-001 / TKT-HZF70M — clean re-populate evidence

**Measured** 2026-08-01 · **HEAD** `41293bc908a7926c143f8617062fca6c95087630`
**Tree** 10 peer-modified src files (semantic-header comment blocks only, invisible to
call resolution) + 5 peer test files · dirty-diff sha256
`b1458ab47655805d0fe17512109f3abdcda2057ba1cea716a6a64a0be5d6e869`

## The recovery

| metric | before | after | delta |
|---|---|---|---|
| `unresolved_count` | 4753 | 1704 | **−3049** |
| `unresolved_src_count` | 3862 | 813 | −3049 |
| `ambiguous_count` | 4833 | 1748 | −3085 |
| `ambiguous_src_count` | 3399 | 1211 | −2188 |
| `resolved_of_resolvable` | 54.62 | **74.83** | +20.21 |
| `test_dsl_count` | 16847 | 16847 | 0 |

The −3049 matches the `dist-preXR` unresolved edge count measured independently
edge-for-edge before the run. `resolved_of_resolvable` recovers to **74.83**, the exact
figure the edge-resolution program closed at. The apparent 74.8% → 54.5% regression that
opened this investigation was never a regression — it was scan-scope contamination.

## Attribution — stated honestly

The −3049 is attributable to **`dist-preXR` being renamed away by a peer**, not to the
`dist-*/` rule committed at `f2aef3d`. No `dist-*` directory exists at any depth right
now, so that rule currently excludes nothing. It is verified **prophylactic**, not
verified effective:

- dogfood guard `__tests__/pipeline/coderefignore-dogfood.test.ts` — 8/8
- minimatch functional check — `distributed-cache/` and `dist-notes.md` are NOT caught
- trailing slash is load-bearing: `buildCandidates` only appends `/` for directories

Claiming the metric recovery as a result of the commit would be false attribution. The
commit prevents recurrence; the peer's `mv` produced the number.

## Second finding — the metric has no build-output defense

`unresolved_src_count` is **not** a source-tree filter. It is `!testOrigin`
(`src/pipeline/output-validator.ts:653`) — "not a test edge". The field is named `_src`
and is read fleet-wide as "production source", but it has **no build-output exclusion at
all** and never did.

That is why 3,049 of its 3,862 edges (79%) were build output, and why the stratified
figure REC-R2 shipped as *"the honest one"* was itself polluted. `.coderefignore` is its
only defense — which is precisely the surface SCOPE-001 found holed.

The field is **not** renamed here: `output-validator.ts:111` marks the schema locked and
additive-only, and a rename breaks a contract other consumers read.

## Related

- `f2aef3d` — `.coderefignore` gains `dist-*/`
- `be2b832` — FU-2 lever 1, measured on the clean baseline this run established
- `e77926a` — WO-RESOLVE-62 Phase 2 re-grounded against these figures

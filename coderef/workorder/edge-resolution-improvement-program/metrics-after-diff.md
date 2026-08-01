# P1 test_dsl reclassify — before/after metrics diff

**Workorder:** WO-EDGE-RESOLUTION-IMPROVEMENT-PROGRAM-001 Phase 1
**Ruling:** operator-delegated ruling A (2026-08-01, both sides), P3c precedent
**Snapshots:** `metrics-before.json` (pre-implementation tree) / `metrics-after.json` (post-implementation re-populate)

## Headline

| Scalar | Before | After | Delta |
|---|---|---|---|
| unresolved_count | 18,527 | **1,871** | −16,656 |
| resolved_of_resolvable | 32.83% | **73.38%** | +40.55pp |
| resolution_rate | 22.42% | 22.42% | 0 (by construction — see interpretation) |
| test_dsl_count (new) | — | **16,717** | 9,974 ambient + 6,743 matcher |
| builtin_count | 13,676 | 30,436 | +16,760 (16,717 test_dsl + 43 from the WO's own new files) |
| valid_edge_count | 9,901 | 9,927 | +26 (the WO's own added test file/edits, NOT reclassification) |

## Invariants (the classification-only proof)

- **unresolved_src_count 959 → 959 (EXACT).** Zero production-file edges were reclassified — the test-file guard is load-bearing at repo scale.
- **ambiguous_count 1,730 → 1,730 (EXACT).** Ambiguous results are never flipped.
- **Flip arithmetic closes:** unresolved drop (16,656) equals the pre-implementation projection exactly; test_dsl_count (16,717) = 16,656 flipped + 61 DSL edges born in the WO's own new contract-test file.
- **Edge identity is status-invariant structurally:** `computeEdgeId` excludes `resolutionStatus`; contract test (f) pins that every flipped edge's id recomputes from the status-free tuple. (A whole-graph id-hash compare between snapshots is confounded by the WO's own file additions/line shifts — expected, disclosed, and immaterial to the invariant.)

## Interpretation (honest reading — denominator shrink, not new resolution)

Not one additional edge was resolved by this phase. The reclassify moves
test-framework DSL calls (ambient `describe`/`it`/`expect` callees and
`expect()`-rooted matcher receivers, test-origin files only) from `unresolved`
to `builtin` with disclosed `test_dsl_*` reasons — the same shape as the P3c
`js_prototype_member` ruling. The honest resolver-quality read,
`resolved_of_resolvable`, rises 32.83% → 73.38% because its denominator now
excludes calls no symbol-table resolver could ever resolve.

`resolution_rate` (22.42%) does not move **by construction**: its denominator
is ALL emitted call edges including builtin, and the flip only moves edges
between categories inside that denominator. ADJ-01: P1-T5's authored
expectation that the "headline rises" was wrong about which scalar moves —
written before T1 read the denominator semantics. The scalar that answers
"how good is the resolver on code it could resolve" is `resolved_of_resolvable`.

## Remaining unresolved tail (the honest frontier, now visible)

| Reason | Count | Owner |
|---|---|---|
| receiver_not_in_symbol_table | 1,151 | P2 dotted-chain walking (STUB-VYBKRV) |
| callee_not_in_symbol_table | 653 | residual (non-DSL bare calls) |
| method_not_in_class_own_methods | 45 | P3 heritage-aware lookup (STUB-9B66EN) |
| other (5 reasons) | 22 | various |

Plus 1,193 ambiguous_src edges (P2/P3 territory). Residual DSL projection
after the flip: **0** — the vocabulary covers the population.

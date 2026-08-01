# P2 external/builtin receiver disposition — before/after metrics diff

**Workorder:** WO-EDGE-RESOLUTION-IMPROVEMENT-PROGRAM-001 Phase 2
**Pivot (planning-gate decision):** dotted-chain field-path walking (FU-2 hypothesis) re-scoped to
external/builtin receiver disposition completion — the post-P1 characterization showed the FU-2
~5,050-edge estimate was dominated by matcher chains P1 already flipped.
**Snapshots:** `metrics-p2-before.json` / `metrics-p2-after.json`

## Headline

| Scalar | Before (post-P1) | After | Delta |
|---|---|---|---|
| unresolved_count | 1,871 | **1,673** | −198 |
| unresolved_src_count | 959 | **782** | −177 |
| receiver_not_in_symbol_table | 1,151 | 953 | −198 |
| external_count | 322 | 717 | +395 |
| resolved_of_resolvable | 73.38% | **74.62%** | +1.24pp |
| test_dsl_count | 16,717 | 16,625 | −92 (see accounting) |

**Disposition flips: 415 total** — `external_module_receiver` 394 + `builtin_root_receiver` 21.

## Invariants

- **Zero resolved edges carry a P2 reason** (verified against the live graph) — dispositions only, no fabricated project edges.
- `ambiguous_count` 1,730 → 1,730 EXACT; `ambiguous_src_count` 1,193 → 1,193 EXACT.
- `valid_edge_count` +78 is fully attributable to the WO's own tree changes (the new P2 contract-test file contributes 14 resolved edges; the enlarged call-resolver.ts contributes the rest via its own internal calls) — NOT to the disposition branches, which structurally cannot produce `resolved`.

## Flip accounting (why 415 flips ≠ 198 unresolved drop)

~154 of the external flips came from receivers that P1 had classified `test_dsl_matcher_receiver`
(e.g. `vi.*`/`expect.*` in test files that IMPORT those bindings from 'vitest' — an external
package): they moved builtin(test_dsl) → external. Same denominator effect, cleaner provenance
(they really are external-package member calls). This is the −154 in `test_dsl_matcher_receiver`
(6,743 → 6,589); ambient rose +62 from the new test file's own DSL calls.

## Remaining receiver tail (953) — the P3+ frontier, sampled by root

| Class | ~Count | Disposition path |
|---|---|---|
| Project-typed local objects (`handlers.`, `h.`, `entry.` in mcp-server) | ~250 | genuine recall work: scope-binding/param-type walking (P3 territory) |
| Call-expression receivers (`z.string().x`, `vi.fn().x`, `new Date().x`) | ~300 | conservative exclusion by design — chain-return typing needed |
| External-typed params (`node.` = ts.Node in extractors) | ~130 | unresolvable without type inference; candidate for a param-annotation disposition |
| Whitespace-embedded multiline receivers (`z\r\n .object()`) | ~40 | receiver-text normalization candidate |
| `this.` chains on external clients | 20 | external-client fields; low value |
| Misc | rest | — |

Follow-up candidates recorded at close: extend the test_dsl matcher predicate to `vi.`-rooted
call-expression chains in test files; extend branch 3.5 root-matching for dotted node-builtin
receivers (`fs.promises`, 22 edges).

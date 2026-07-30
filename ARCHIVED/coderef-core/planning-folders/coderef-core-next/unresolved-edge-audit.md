# Unresolved-Edge Audit — `unresolved_count = 20,701`

**Date:** 2026-06-12
**Roadmap item:** `coderef-core-next` Phase 2 / UNRESOLVED-EDGE-AUDIT (investigation done early as idle work; resolver fixes remain Phase 2)
**Input:** `.coderef/graph.json` (30,517 edges, generated 2026-05-31)
**Method:** full-population aggregation over edge `resolutionStatus` / `reason` / `evidence` — no sampling.

## Headline

`unresolved_count=20701` is **not a graph-correctness crisis**. It decomposes almost entirely into three explainable populations — test-framework vocabulary (65%), honest demotions on untyped receivers (23%), and a **real, cheap resolver bug** that misclassifies Node builtins as unresolved (~5%). The truly unexplained remainder is ~1,000 call edges + ~833 relative imports (~9%).

## Status distribution (all 30,517 edges)

| resolutionStatus | count |
|---|---:|
| unresolved | 20,701 |
| resolved | 4,293 |
| ambiguous | 3,366 |
| builtin | 1,169 |
| external | 576 |
| typeOnly | 334 |
| dynamic | 78 |

## Unresolved CALLS — 19,379 edges (94% of unresolved)

By `reason`: `receiver_not_in_symbol_table` 12,684 · `callee_not_in_symbol_table` 6,652 · `method_not_in_class_own_methods` 40 · `this_method_not_in_class` 3.

Exhaustive decomposition (buckets are disjoint; sum = 19,379):

| Bucket | Count | % | What it is |
|---|---:|---:|---|
| Test-file calls | 12,823 | 66% | Calls originating in `__tests__/`, `*.test.*`, `*.spec.*`. 9,604 of these are vitest globals/matchers (`expect` 3,665, `toBe` 1,524, `it` 1,518, `describe` 485 …) that can never resolve to project symbols. |
| Builtin-prototype methods, unknown receiver (src files) | 4,863 | 25% | `push`/`map`/`join`/`split`/`trim`… with `receiver_not_in_symbol_table`. Honest demotion — receiver type is unknowable without type inference. |
| Builtin-module receivers (src files) | 559 | 3% | `fs.*` 263, `path.*` 148, `process.*` 140, `crypto/http/os` 8. **Fixable**: receiver is a namespace import of a Node builtin; the call should classify `builtin`. |
| Global functions (src files) | 130 | <1% | `parseInt`, `String`, `setTimeout`, `require`… **Fixable** via a JS-globals allowlist → `builtin`. |
| Unexplained remainder (src files) | 1,004 | 5% | Long tail: `toISOString` on locals, dynamic `import` 71, `super` 12, third-party member calls (`t.isIdentifier`), event emitters (`.on`). Needs per-case look; not one root cause. |

## Unresolved IMPORTS — 1,322 edges (6% of unresolved)

| `reason` | Count | Finding |
|---|---:|---|
| `relative_target_not_in_project` | 833 | **RESOLVER BUG (disk-existence pass, 2026-06-12): ALL 833 targets exist on disk** — 812 via the standard NodeNext `.js`→`.ts` mapping, 21 as-is, 0 genuinely missing. Source files include core `src/` modules (`src/adapter/graph-to-elements.ts`, `src/analyzer/analyzer-service.ts`). The path resolves but fails the project-membership lookup — likely a path-form mismatch (separators/casing) in the membership set, same family as STUB-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001. Not stale code. |
| `not_in_manifest_or_node_modules` | 487 | **~93% are Node builtins misclassified as unresolved**: `path` 179, `fs/promises` 117, `fs` 61, `os` 60, `url` 11, `child_process` 9, `crypto` 7, `util` 6, plus `node:`-prefixed forms. The import resolver's builtin check is incomplete (misses bare and `node:`-prefixed builtins in this code path) — these belong in `builtin_count`. |
| `symbol_not_in_module_exports` | 2 | Negligible. |

(637 of the 1,322 unresolved imports originate in test files — overlaps the test-file population above; counted once per relationship table.)

## Recommended actions — ALL FILED AS STUBS 2026-06-12

Operator rulings (2026-06-12): test edges → **(A) tag + src-only counts**; prototype methods → **(A) evidence-level flag**.

| Stub | Action | Priority |
|---|---|---|
| `STUB-QT400D` | Builtin classification fix (~1,100 edges) | high |
| `STUB-XK82Z2` | Import-resolver membership-check bug (833 edges, all targets exist on disk) | high |
| `STUB-K5YBFN` | Test-origin edge tagging + src-only counts (~13,460 edges, ruled A) | medium |
| `STUB-XX4JBC` | `probableBuiltinMember` evidence flag (4,863 edges, ruled A) | medium |

All four carry `roadmap_ref` → `coderef-core-next` PHASE-2.UNRESOLVED-EDGE-AUDIT.

1. **STUB-QT400D — builtin classification fix (resolver bug, ~1,100 edges).** Import side: check `node:`-stripped specifier against `module.builtinModules` before the manifest check (~450 edges). Call side: when a call's receiver identifier is bound to a builtin-module import, classify the call edge `builtin` (~559 edges); add a JS-globals allowlist (~130 edges). Honest, mechanical, measurable: `unresolved_count` drops ~5.5%, `builtin_count` rises accordingly. Touches the locked classification only additively (status values unchanged).
2. **STUB-K5YBFN — test-edge policy (RULED: option a, ~13,460 edges).** Options: (a) tag edges whose `sourceLocation.file` is a test file so `validation-report` can surface src-only counts alongside totals; (b) teach the call resolver the vitest/jest vocabulary as `builtin`; (c) exclude test files from relationship scanning. (a) is least invasive and keeps honesty; (b/c) change graph semantics. Needs ORCHESTRATOR ruling — touches the locked ValidationReport interpretation.
3. **STUB-XX4JBC — prototype-method classification (RULED: evidence-level flag, ~4,863 edges).** `receiver_not_in_symbol_table` + callee ∈ JS prototype vocabulary could classify as a distinct disposition instead of generic `unresolved`. NOTE: `EdgeResolutionStatus` is a locked 8-value enum — adding a value (or reusing `builtin` with evidence-level distinction) needs explicit sign-off. Evidence-level (`evidence.probableBuiltinMember: true`) is the additive-safe variant.
4. **STUB-XK82Z2 — relative-import membership-check bug (833 edges).** Disk-existence pass complete: 833/833 targets exist (812 via `.js`→`.ts`, 21 as-is). The import resolver's project-membership lookup rejects files that are demonstrably in the project — diagnose the path-form mismatch (separators/casing/relative-vs-absolute keying) and fix at the membership-set seam. Together with the builtin fix this honestly removes ~1,900 edges (~9.4%) from `unresolved_count`.

## Verification commands

All numbers reproducible via node one-liners over `.coderef/graph.json` (aggregations by `resolutionStatus`, `reason`, `evidence.calleeName`, `evidence.receiverText`, `evidence.originSpecifier`, test-file regex `__tests__|\.test\.|\.spec\.`).

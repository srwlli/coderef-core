---
kind: execution
title: Contracts Standard — the machine-validated artifact contracts
status: living
updated: 2026-07-31
---

# Contracts Standard — the machine-validated artifact contracts

> **Sub-type:** `contracts` of the `execution` kind. Authority root: [`README.md`](README.md).
> The rule this doc enforces: **a generated artifact's shape is validated by a
> machine before it is accepted, so shape is never re-discovered at write time.**
> Field-level type definitions are governed by
> [`../data/SCHEMA-STANDARD.md`](../data/SCHEMA-STANDARD.md) and are not restated here.

## The gating validators

Each row names a validator that **actually refuses** something. A contract nothing
enforces is documentation, not a contract, and does not belong in this table.

| Artifact class | Contract | Enforced by | What it refuses |
|---|---|---|---|
| Pipeline graph + state | `ValidationReport` — 14 locked fields | [`src/pipeline/output-validator.ts:110`](../../../src/pipeline/output-validator.ts) | Graph-integrity violations (GI-2, GI-3) fail hard. A field may be **added**, never renamed or dropped, without explicit ORCHESTRATOR sign-off. Every field is a required number — `0` for an empty category, **never** `undefined`, `null`, or a string ([ref](../../SCHEMA.md#5-validation-report-phase-6-contract)) |
| Watch heartbeat | [`coderef-watch-heartbeat.schema.json`](../../../src/cli/coderef-watch-heartbeat.schema.json) | JSON Schema | A heartbeat that does not match the declared shape |
| Foundation-docs metadata | [`foundation-docs-meta.schema.json`](../../../scripts/doc-gen/foundation-docs-meta.schema.json) | JSON Schema, doc-gen | Metadata that drifts from the generator's expected shape |
| Workorder plans (`coderef/workorder/*/plan.json`) | `plan.schema.json` | ASSISTANT `SKILLS/WORKFLOW/_shared/planner` | A plan whose phase/task structure does not conform — the plan is rejected before execution begins |
| Stub registry (`coderef/stubs/`) | `stubs.schema.json` | ASSISTANT `TRACKING/schemas` | **`additionalProperties: false`** on the item shape — an undeclared field is a hard reject, not a tolerated extra |
| Standards conformance (`docs/standards/`) | one `kind.json` + `check.mjs` per kind | ASSISTANT `SKILLS/STANDARDS/kinds/` | A missing or malformed governed doc. Checker Contract v1.0.0: `0` = pass or not-applicable, `2` = FAIL / completion halt |

## Ruling: locked additive-only

`ValidationReport` is the reference case for how a public artifact contract evolves
here. It went 11 → 12 → 14 fields — `header_coverage_pct`, then
`unresolved_src_count` and `ambiguous_src_count` — and **no consumer broke on any
of those days**, because each change was purely additive under an explicit
allowance ([ref](../../SCHEMA.md#5-validation-report-phase-6-contract)).

The lock is on **renaming and dropping**, not on growth. That asymmetry is the
whole design: a contract that cannot grow gets bypassed, and a contract that can
shrink silently breaks readers.

## Ruling: a validator is pure

`validatePipelineState(state, graph, options)` performs **no filesystem access, no
`process.exit`, and no console output** ([ref](../../SCHEMA.md#5-validation-report-phase-6-contract)).
Everything environmental — the layer enum loaded from `layers.json`, the strict-header
flag — is plumbed in by the CLI as an explicit option.

Two properties follow, and both are load-bearing: the validator is **testable
without a fixture repo**, and it **cannot partially write** an artifact before
deciding it is invalid. A validator that exits the process mid-check leaves the
artifact set in a state no one declared.

## Ruling: `ok` is derived, never asserted

`ValidationResult.ok` is `true` **if and only if** `errors.length === 0`
([ref](../../SCHEMA.md#5-validation-report-phase-6-contract)) — a computed
consequence of the error list, never an independently set flag that could disagree
with it.

`report` is **always populated, even when `ok` is false.** A failed validation
still yields full counts, because "it failed" without the numbers is not
actionable, and a consumer that must re-run the pipeline to find out *how badly*
it failed will simply skip the check.

## Errors and warnings are a policy boundary, not a severity guess

- **Errors** — graph-integrity violations, which always fail hard, plus header
  drift when it has been strict-promoted.
- **Warnings** — header drift (SH-1 / SH-2 / SH-3) in default mode.

The same header-drift finding is a warning or an error depending on a **declared
policy flag** (`strictHeaders`), not on a heuristic judgement made at detection
time. Detection reports what it found; policy decides what that costs. Keeping
those separable is what lets a project tighten enforcement without touching the
detector.

## Consumer obligation

A contract only holds if readers check it. Before trusting a result:

1. read the **staleness block** every read surface carries;
2. for a negative result, check `unresolved_edges` and `validation_status` —
   per [`../data/PROVENANCE-STANDARD.md`](../data/PROVENANCE-STANDARD.md#the-provenance-invariant-absence-is-never-proof-of-absence),
   an unchecked "nothing found" is an unverified claim.

---

*Conforms to the `execution` kind, sub-type `contracts`. Authority root: [`README.md`](README.md).*

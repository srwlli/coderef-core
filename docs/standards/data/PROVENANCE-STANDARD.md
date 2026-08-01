---
kind: data
title: Provenance Standard — source-of-record and chain-of-custody
status: living
updated: 2026-07-31
---

# Provenance Standard — source-of-record and chain-of-custody

> **Sub-type:** `provenance` of the `data` kind. Authority root: [`README.md`](README.md).
> This is the sub-type coderef-core is most opinionated about, because the whole
> project is a machine for making the provenance of a claim about code inspectable.

## Source-of-record vs acquisition custodian

| Role | What holds it |
|---|---|
| **Source-of-record** | The **source tree at a git commit**. The authoritative statement of what the code IS. |
| **Held copy** | Everything under **`.coderef/`** — index, graph, map, reports, vectors. Bytes in hand, derived from a past read of the source-of-record. |
| **Acquisition custodian** | The **scan run** that produced the held copy: a specific pipeline version reading a specific working-tree state. |

**No artifact in `.coderef/` is ever the source-of-record for its own content.**
Every record in it is a claim *about* source that the source itself can settle. When
a held artifact and the working tree disagree, the working tree wins without
argument and the artifact is stale, not authoritative.

Recording the held copy as the source-of-record is the specific defect this
sub-type exists to prevent, and in this project it has a concrete failure mode: an
agent answering "does anything call this function?" from a stale index, and
reporting a confident **no**.

## Held-vs-live, and how the two reconcile

- **Held** — what the last scan wrote to `.coderef/`.
- **Live** — the working tree right now.

Reconciliation is **fingerprint-based, not timestamp-based**. `.coderef/manifest.json`
stores one **sha256 per unique source file** that fed the graph
([ref](../../../src/pipeline/generators/graph-generator.ts:71)), computed with the
same hash the incremental cache uses so the two agree by construction. Comparing
held fingerprints against the live tree answers "which files moved since the held
copy was acquired" exactly, rather than inferring it from mtimes that a checkout,
a clone, or a touch can falsify.

**This is held-bytes verification in the sense the kind requires:** the held artifact
can be proven to trace to the source state it claims, or proven not to.

Every read surface carries a **staleness block**, and the contract is that a
consumer checks it before trusting a result. Staleness is reported, never silently
tolerated.

## Chain of custody: `EdgeEvidence` is the provenance model

Every graph edge carries the record of **why it exists and how far resolution
got**. Three orthogonal axes travel with each edge.

### 1. Evidence variant — HOW the edge was detected

`EdgeEvidence` is a discriminated union of **12 variants**
([ref](../../../src/pipeline/graph-builder.ts:144)):

| Family | Variants |
|---|---|
| Import | `resolved-import`, `unresolved-import`, `ambiguous-import`, `external-import` |
| Call | `resolved-call`, `unresolved-call`, `ambiguous-call`, `builtin-call` |
| Header | `header-import`, `stale-header-import` |
| HTTP | `calls-endpoint`, `serves-endpoint` |

Each variant carries the fields that justify it — the origin specifier, the callee
and receiver text, the candidate list, the refusal reason. An edge is therefore
**auditable back to the syntax that produced it**, not merely asserted.

> Note: [`docs/SCHEMA.md`](../../SCHEMA.md) still describes this union as
> 10-variant. The two HTTP variants were added by the API-surface work. The count
> above is the code's. See [`SCHEMA-STANDARD.md`](SCHEMA-STANDARD.md#known-drift--schemamd-is-behind-the-code).

### 2. Resolution status — HOW FAR resolution got

Eight values ([ref](../../SCHEMA.md#edgeresolutionstatus-8-values)): `resolved`,
`unresolved`, `ambiguous`, `external`, `builtin`, `dynamic`, `typeOnly`, `stale`.

The distinction between `unresolved` (we looked and could not tell) and `external`
(it resolves outside this project) and `builtin` (it is the language) is the
difference between three completely different answers to "why is there no target
here". Collapsing them would destroy the provenance.

### 3. Confidence tier — HOW MUCH the edge should be trusted

A 4-tier ranked vocabulary, strongest first
([ref](../../../src/pipeline/edge-confidence.ts:50)):

| Tier | Rank | Meaning |
|---|---|---|
| `exact` | 3 | direct, unambiguous resolution |
| `strong` | 2 | resolved with a well-understood, tested mechanism |
| `heuristic` | 1 | resolved by pattern, not proof |
| `inferred` | 0 | single confirmed target reached by the weakest admissible path |

The tier is a **total, deterministic function** of fields the edge already carries:
the same triple always yields the same tier, and no new analysis is performed to
compute it ([ref](../../../src/pipeline/edge-confidence.ts:117)). An unrecognized
tier ranks **−1**, below every real tier, so an unknown value can never accidentally
clear a threshold ([ref](../../../src/pipeline/edge-confidence.ts:67)).

## The citable authoritative id

A claim is cited as **`codeRefId` at a commit**. The id names the object
([`KEYING-STANDARD.md`](KEYING-STANDARD.md)); the commit SHA names the
source-of-record state the claim was read from. Neither alone is a citation: an id
without a commit does not say *when* it was true, and a commit without an id does
not say *what* was true.

## The provenance invariant: absence is never proof of absence

**An empty result means NO RESOLVED DATA. It never means "none exist."**

This is stated as a provenance rule, not a UI nicety, because it is a claim about
custody: the model can only report what a scan actually resolved, and the set of
things it failed to resolve is a **first-class recorded population**, not a silence.
That population is inspectable — unresolved edges keep their ids, their evidence
variant, and their refusal reason rather than being dropped.

Three shipped applications of the invariant:

- **`targetId` is omitted, never synthesized**, on a non-resolved edge (DR-PHASE-5-A).
- **`METHOD_UNSPECIFIED`** is minted when a detector reports no method, rather than
  expanding to every verb — absence of a declared method is no-data about which
  verbs are served ([ref](../../../src/pipeline/endpoint-identity.ts:68)).
- **`no_data: true`** is returned when `routes.json` has not been produced, never a
  false "zero endpoints" ([ref](../../../src/cli/coderef-mcp-server.ts:584)).

The corollary binds consumers: **before trusting a negative**, check
`unresolved_edges` and `validation_status`. A "nothing found" that has not been
checked against those two is an unverified claim, and this standard does not
license reporting it as a finding.

## Surfaces, not verdicts

Provenance data reports **where to look and how the finding was reached** — never
what is wrong. A confidence tier is a trust signal for an agent to weigh, an
`orphaned` endpoint means no caller was resolved *in this repo* (the expected state
for a public API), and a hotspot count marks leverage rather than defect. Reading
any of these as a verdict discards exactly the provenance this sub-type exists to
preserve.

---

*Conforms to the `data` kind, sub-type `provenance`. Authority root: [`README.md`](README.md).*

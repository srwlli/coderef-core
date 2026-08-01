---
kind: execution
title: Generation Standard — how an artifact is deterministically produced
status: living
updated: 2026-07-31
---

# Generation Standard — how an artifact is deterministically produced

> **Sub-type:** `generation` of the `execution` kind. Authority root: [`README.md`](README.md).
> Generation is the executor-side dual of keying. The id grammar itself is
> governed by [`../data/KEYING-STANDARD.md`](../data/KEYING-STANDARD.md) and is
> **not restated here** — this doc governs how the *artifacts* are produced.

## The pinned leg order

The executor is a fixed, ordered pipeline of five legs
([ref](../../../src/cli/coderef-pipeline.ts:55)):

```
scan → populate → map → docs → rag
```

The order is **pinned, not incidental**: each leg consumes the artifacts the
previous leg wrote. `populate` reads what `scan` extracted; `map` projects the
graph `populate` produced; `rag` chunks against the index that already exists.
Running a later leg against a stale earlier artifact is the defect the ordering
prevents.

`--only` and `--skip` filter which legs run, but they **preserve relative order**
([ref](../../../src/cli/coderef-pipeline.ts:181)) — the executor will not reorder
legs to satisfy a selection.

**Failure short-circuits.** A failed leg stops the run and names itself
([ref](../../../src/cli/coderef-pipeline.ts:426)). The executor does not continue
into a downstream leg on a broken upstream artifact, because a leg that "succeeds"
on bad input produces a confidently wrong artifact rather than an obvious failure.

## Determinism is the hard rule

The same source tree, scanned twice by the same version, must produce
byte-identical artifacts.

**Admissible inputs:** source bytes, project-relative paths, declared
configuration, and values derived from those.

**Inadmissible inputs — these never enter a generated identity or a pinned output
shape:** wall-clock timestamps, random values, absolute filesystem paths, scan
order, machine locale, and environment state.

Path handling is where this rule is actually enforced rather than merely asserted.
Every path that participates in an identity is slash-normalized through **one**
shared normalizer ([ref](../../../src/utils/path-normalize.ts:21)) before it is
used, so `src\scanner\scanner.ts` and `src/scanner/scanner.ts` converge on one
canonical form. That normalizer explicitly does **not** resolve, relativize, or
lower-case — callers needing project-relative identity route through
`normalizeProjectPath` instead ([ref](../../../src/utils/path-normalize.ts:17)).
One canonical form, one place that computes it.

> **Historical note on why this is a standard and not a convention:** the shared
> normalizer replaced **55+ hand-rolled** `.replace(/\\/g, '/')` sites
> ([ref](../../../src/utils/path-normalize.ts:12)). Fifty-five independent
> re-implementations of the same normalization is precisely the drift this
> sub-type exists to prevent.

## One stable output format per artifact

Every artifact class has ONE canonical output shape, and a generator emits that
shape or fails. Shapes are governed by
[`CONTRACTS-STANDARD.md`](CONTRACTS-STANDARD.md); locations by
[`TOPOLOGY-STANDARD.md`](TOPOLOGY-STANDARD.md).

Format changes are **additive**: a new optional field or a new enum variant, never
a repurposed or tightened existing one. See
[`../data/SCHEMA-STANDARD.md`](../data/SCHEMA-STANDARD.md#ruling-additive-over-breaking)
for the doctrine and its shipped applications.

## Regeneration is wholesale, and that is the point

`.coderef/` is **rebuilt**, not mutated in place. There is no incremental patch
path that edits an artifact's interior.

The consequence worth stating: **a hand-edit to any `.coderef/` artifact is a
defect, not an override.** The next run discards it silently. Nothing in
`.coderef/` is a place to record a decision — decisions live in `coderef/`.

Incremental modes exist (`--incremental`, the incremental cache and facts
artifacts) but they are an **input-selection** optimization: they narrow which
files are re-read, never which output shape is produced. An incremental run and a
full run must agree on the artifact.

## Refuse-to-emit guards

The executor **abstains rather than guessing** whenever the honest answer is "no
data". Four shipped guards:

| Guard | Behavior | Truth source |
|---|---|---|
| Unresolved target | `targetId` is **omitted**, never synthesized, on a non-resolved edge (DR-PHASE-5-A) | [ref](../../SCHEMA.md#graphedgev2-8-field-canonical-edge--dr-phase-5-d) |
| Undeclared HTTP method | mints the single token `METHOD_UNSPECIFIED` rather than expanding to every verb | [ref](../../../src/pipeline/endpoint-identity.ts:68) |
| Missing upstream artifact | returns `no_data: true`, never a false zero | [ref](../../../src/cli/coderef-mcp-server.ts:584) |
| Broken upstream leg | short-circuits the run and names the failed leg | [ref](../../../src/cli/coderef-pipeline.ts:426) |

Each converts a would-be fabrication into a recorded absence. The provenance rule
they all serve is stated once, in
[`../data/PROVENANCE-STANDARD.md`](../data/PROVENANCE-STANDARD.md#the-provenance-invariant-absence-is-never-proof-of-absence).

## What makes a regeneration reproducible

A regeneration is reproducible when re-running it over unchanged source yields
byte-identical artifacts. That is verifiable rather than assumed, because
`.coderef/manifest.json` records one sha256 per source file that fed the graph
([ref](../../../src/pipeline/generators/graph-generator.ts:71)).

This is what makes *"did this artifact change because the code changed, or because
the tooling drifted?"* an answerable question. Without it, every diff in a
generated artifact is ambiguous and therefore uninformative.

---

*Conforms to the `execution` kind, sub-type `generation`. Authority root: [`README.md`](README.md).*

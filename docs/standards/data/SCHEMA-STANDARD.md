---
kind: data
title: Schema Standard — the field-shape contract
status: living
updated: 2026-07-31
---

# Schema Standard — the field-shape contract

> **Sub-type:** `schema` of the `data` kind. Authority root: [`README.md`](README.md).
> **This doc is the CONTRACT, not the type reference.** The authoritative field
> shapes live in [`docs/SCHEMA.md`](../../SCHEMA.md) and are deliberately not
> duplicated here — a second copy of a type listing is a second thing to drift.
> This doc states what must HOLD about those shapes, and what may be added.

## The single authoritative shape reference

[`docs/SCHEMA.md`](../../SCHEMA.md) is the one place field shapes are declared, for
all four schema families it covers: the scanner schema (`ElementData`), the
relationship schema (raw facts and resolved relationships), the resolution-status
enums, and the graph schema. Every entry in it names its **truth source** as a
`file:line` range in `src/`.

**The rule:** an agent about to write or read one of these records reads
`SCHEMA.md`. It does not preflight-guess the shape from a sample record, and it
does not re-derive the shape from the code unless it is correcting `SCHEMA.md`
itself. That is the whole purpose of having this sub-type.

## The required core, and everything else

The governing archetype across this model is **a small required core plus a wide
optional, additively-grown periphery.**

`ElementData` is the canonical instance ([ref](../../SCHEMA.md#elementdata),
truth source `src/types/types.ts` lines 304–412). Exactly four fields are
**required**: `type`, `name`, `file`, `line`. Every other field — the canonical
ids, the semantic facets, header state, relationship arrays, metrics — is
**optional**, and each arrived in a later pipeline phase without breaking the
records written before it.

The same archetype governs `GraphEdgeV2` ([ref](../../SCHEMA.md#graphedgev2-8-field-canonical-edge--dr-phase-5-d)):
`id`, `sourceId`, `relationship`, and `resolutionStatus` are required; `targetId`,
`evidence`, `sourceLocation`, `candidates`, and `reason` are conditional and
**present only when they carry meaning**.

## Ruling: conditional-and-absent, never synthetic

`targetId` is **omitted** on any edge that is not resolved — it is never filled
with a placeholder, a null sentinel, or a best-guess target (DR-PHASE-5-A,
[ref](../../SCHEMA.md#graphedgev2-8-field-canonical-edge--dr-phase-5-d)).

This is the schema-level expression of the project's absence-is-not-data rule. A
synthetic target would be indistinguishable from a real one at read time, which
converts "we could not resolve this" into "this points there" — a false statement
the schema itself would be manufacturing. **An absent field means no resolved data;
it never means the empty value.**

## Ruling: additive over breaking

New information is added as a **new optional field or a new enum variant**, never
by repurposing an existing field or tightening an existing one.

Two applications of the doctrine already in the shipped schema, both worth citing
because they show the rule doing real work:

- **`EdgeEvidence.detectionConfidence` is deliberately not named `confidence`.**
  The union already owns `confidence` with the literal type `'provisional'`, and
  `FrontendCall.confidence` is a 0–100 number. Reusing the name would have
  collapsed two unrelated signals into one field
  ([ref](../../../src/pipeline/graph-builder.ts:155)).
- **`testOrigin` was added as an additive evidence-level tag** rather than as a new
  resolution status. Test-origin edges keep their existing status, ids, and totals
  membership; the flag only lets reporting sub-count them
  ([ref](../../../src/pipeline/graph-builder.ts:176)).

The legacy compat surface on `GraphEdgeV2` (`source` / `target` / `type` /
`metadata`) is the same doctrine applied to a rename: the canonical fields were
added and the legacy fields kept populated during the transition window, so no
consumer broke on the day the new shape landed.

## Generated fields are marked and re-derivable

Every record in `.coderef/` is **generated**. Nothing in it is hand-written, and a
hand-edit is a defect rather than an override — the next scan silently discards it.

The re-derive procedure is the pipeline itself: re-run the scan and compare. Because
keying is deterministic ([`KEYING-STANDARD.md`](KEYING-STANDARD.md)), a
re-derivation over unchanged source must reproduce byte-identical ids, which makes
"did this change because the code changed, or because the tooling drifted?" an
answerable question rather than a judgement call.

## Reference shape

References between records are **canonical ids carried in fields**, not row
ordinals and not database foreign keys — this model has no database
([`ENTITIES-STANDARD.md`](ENTITIES-STANDARD.md)). `sourceId` and `targetId` hold
`codeRefId` values; `candidates` holds an array of them, present only when
`resolutionStatus` is `ambiguous` and then always with at least two entries.

A reference whose target is not in the graph is representable and expected: that is
what an unresolved or external edge IS. Consumers must treat a non-resolving
reference as a resolution outcome to read, never as corruption to repair.

## Known drift — `SCHEMA.md` is behind the code

Recorded here because this sub-type's whole promise is that the shape reference can
be trusted, and a silent gap between it and the code would void that promise.

| Item | `SCHEMA.md` says | Code carries | Truth source |
|---|---|---|---|
| `EdgeEvidence` variants | 10 | **12** (adds `calls-endpoint`, `serves-endpoint`) | [ref](../../../src/pipeline/graph-builder.ts:144) |
| `EdgeRelationship` values | 4 (`import`/`call`/`export`/`header-import`) | **8** (adds `extends`, `implements`, `calls_endpoint`, `serves_endpoint`) | [ref](../../../src/pipeline/graph-builder.ts:103) |

Both gaps date from the API-surface-mapping and genre-features work, which added
graph surface without refreshing the reference doc. The drift is **stale
documentation, not a schema defect** — the code is correct and internally
consistent. Repairing `SCHEMA.md` is filed as a follow-up in this workorder's
`communication.json`; it is not silently patched here, because this doc's job is to
point at the authoritative reference rather than to become a competing one.

---

*Conforms to the `data` kind, sub-type `schema`. Authority root: [`README.md`](README.md).*

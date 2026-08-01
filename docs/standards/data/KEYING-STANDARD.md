---
kind: data
title: Keying Standard — how a CORE object gets its canonical id
status: living
updated: 2026-07-31
---

# Keying Standard — how a CORE object gets its canonical id

> **Sub-type:** `keying` of the `data` kind. Authority root: [`README.md`](README.md).
> The load-bearing sub-type. Entities are named in
> [`ENTITIES-STANDARD.md`](ENTITIES-STANDARD.md).

## The canonical id format

**One grammar names every addressable object in this model:**

```
@<Designator>/<locator>#<name>[:<line>]
```

Truth source: [ref](../../../src/utils/coderef-id.ts:49). Instances:

| Object | Id | Example |
|---|---|---|
| Code element | `@<Designator>/<file>#<name>:<line>` | `@Function/src/utils/coderef-id.ts#createCodeRefId:49` |
| Code element, line-stable | `@<Designator>/<file>#<name>` | `@Function/src/utils/coderef-id.ts#createCodeRefId` |
| File pseudo-node | `@File/<path>` | `@File/src/index.ts` |
| HTTP endpoint pseudo-node | `@Endpoint/<path>#<METHOD>` | `@Endpoint/api/users/{}#GET` |

This is a **natural key**, not a hash: the id is readable, and an agent can derive
it from a file path and a symbol name without running the pipeline. That property
is deliberate — the id doubles as a citation an agent can hand to a human.

## Determinism is the hard rule

Same object → same inputs → same id, on every platform and in every surface.

**Path normalization is part of the key, not a convenience.** Paths are
slash-normalized *before* they are keyed, so `src\scanner\scanner.ts` (Windows) and
`src/scanner/scanner.ts` (POSIX) are ONE identity and never two
([ref](../../../src/registry/entity-registry.ts:31), proved at
[ref](../../../src/registry/__tests__/entity-registry.test.ts:28)). Paths are
project-relative; an absolute path, a scan location, a timestamp, or any random
value **never enters a key**.

## The priority ladder

The ladder is CORE's ranked choice of *what stands in for the target* when
resolution is incomplete. It changes what is keyed, never the output format:

| Rung | Fact used | When |
|---|---|---|
| 1 | `targetId` — the resolved element's canonical id | resolution succeeded |
| 2 | `originSpecifier` — the literal import/call text as written | target did not resolve |

Truth source: [ref](../../../src/pipeline/graph-builder.ts:1248). An unresolved edge
is still deterministically keyed — it does not go unkeyed, and it is not dropped.

**Endpoint ladder.** Declared method → the single token `METHOD_UNSPECIFIED`
([ref](../../../src/pipeline/endpoint-identity.ts:68)). CORE mints ONE method token
rather than expanding to every verb, because absence of a declared method is
**no-data about which verbs are served, never a claim that all of them are.** That
is a refuse-to-guess guard expressed in the key itself.

## Derive-once and freeze

The ladder is a **mint-time** rule. An id is computed once, at the moment the
object is first keyed, and is then treated as **immutable**. A better source or a
later, richer resolution updates the object's *provenance and attributes* — it
**never** re-keys the object. `id == derive(current-best-facts)` is explicitly NOT
a standing equation this model tries to satisfy.

The canonical id is an **opaque, stable handle** in exactly the sense a git commit
SHA is: better tags and messages never change the SHA. Meaning is read from the
attributes, never decoded from the key.

**Scope note, stated honestly.** `.coderef/` is regenerated wholesale by each scan,
so freeze here is a *contract on the derivation*, not a stored-and-never-recomputed
column: the same source input must re-derive the same id every run. What the rule
forbids is a scheme whose output drifts while the object stands still.

## Endpoint keying: parameter names are erased

`@Endpoint/<path>#<METHOD>` canonicalizes the path before keying
([ref](../../../src/pipeline/endpoint-identity.ts:74)):

- **Parameter NAMES are erased** to `{}` — a client's `${id}` interpolation and a
  server's `<int:user_id>` are ONE endpoint. This follows the OpenAPI 3.1
  path-identity rule; keying on the name would split a single endpoint into as many
  identities as there are naming conventions.
- Case is **preserved** — RFC 3986 §6.2.2.1 limits case normalization to scheme and
  host, so a path is never lowercased.
- Query and fragment are stripped (RFC 3986 §3); empty segments collapse and a
  trailing slash is dropped, so `/api//users/` and `/api/users` are one endpoint.
- Percent-encoding is **not** normalized: route declarations are authored decoded,
  and re-encoding would manufacture identities no detector ever emits.
- Method is a separate identity dimension (RFC 9110 §9.1), because "does this path
  exist" (404) and "does this path answer this verb" (405) are distinct questions.

## Edge id construction

An edge id is a **content-address of a relationship**, not an entity identity:

```
sha1( sourceId : relationship : (targetId ?? originSpecifier) : sourceFile : line )
  truncated to 16 hex chars
```

Truth source: [ref](../../../src/pipeline/graph-builder.ts:1240).

**Collision behavior, stated explicitly.** 16 hex chars is 64 bits, chosen for
per-project-graph collision resistance. There is **no runtime collision detector** —
two distinct edges hashing equal would silently become one edge. The mitigation is
the width and the fact that the tuple already includes the source location, not a
check. The invariant this buys is that the graph carries **0 duplicate edge ids**,
because the same tuple always produces the same id and identical tuples are the
same edge by definition.

Note that `sourceFile` and `line` are inside the edge tuple. Under the natural-key
rules above a scan location would be disqualified from an *entity* key; it is
admissible here precisely because an edge id addresses "this relationship, written
at this spot", and it is never persisted as an external reference.

## Engine binding

CORE's **canonical** identity scheme is a natural key with no hash primitive
(`@<Designator>/<locator>#<name>`), which the `data` kind exempts from engine
binding. Two **subordinate, hash-derived handles** exist, and each mints through
exactly one shared exported function — the property the binding requirement exists
to enforce (no re-hand-implemented hash+format step):

| Handle | Engine | Version | Module path | Conformance proof |
|---|---|---|---|---|
| Registry entity UUID | RFC 4122 v5, namespaced, sha1 | RFC 4122 §4.3 | [`src/registry/entity-registry.ts:36`](../../../src/registry/entity-registry.ts:36) | [`entity-registry.test.ts:28-42`](../../../src/registry/__tests__/entity-registry.test.ts:28) — cross-platform equality, distinctness on each triple component, and cross-instance reproducibility |
| Graph edge content-address | sha1/16-hex over the 5-tuple | DR-PHASE-5-D | [`src/pipeline/graph-builder.ts:1240`](../../../src/pipeline/graph-builder.ts:1240) | `computeEdgeId` is exported specifically for testability and explicit documentation of the id shape |

**CORE does NOT vendor the fleet's `keying-core` engine, and that is a declared
position rather than an oversight.** `keying-core` mints
`{prefix}-hex(BLAKE2b(namespace:native))` ([`ENGINES/keying-core/SPEC.md`](../../../../ASSISTANT/ENGINES/keying-core/SPEC.md) §1).
Neither CORE handle can adopt that output format: the registry handle's shape is
fixed by RFC 4122 (a v5 UUID is *specified* to be sha1-based with set version and
variant bits — substituting BLAKE2b would produce a value that is not a v5 UUID),
and the edge handle is a content-address rather than an entity uid. Adopting the
engine would change both id shapes and break every stored reference keyed to them.

> **Open fleet question — not decided here.** Whether coderef-core should carry a
> `keying-core` binding at all, given neither hash site is entity-uid minting, is a
> fleet-convention call of the same family as the git-hook posture question. It is
> recorded in this workorder's `communication.json` for an operator ruling and is
> deliberately not settled unilaterally by this document.

## Known tension: two id shapes for one object

The `data` kind's keying rule says an object gets **one** id format. CORE currently
gives a code element **two**: the canonical `codeRefId` natural key AND the registry
UUID, both derived from the same `(file, name, line)` triple
([ref](../../../src/registry/entity-registry.ts:37)).

This is recorded as a **known tension, not a resolved position.** Both are
deterministic and both are stable, so neither is a correctness bug — but a second
shape for the same object is exactly the cross-surface alias hazard the sub-type
warns about, and it is plausibly implicated in the unresolved-UUID-anchor defect
tracked separately as KZ-01KYX9P4. Declaring it is the first step to resolving it;
this doc does not pick the survivor.

---

*Conforms to the `data` kind, sub-type `keying`. Authority root: [`README.md`](README.md).*

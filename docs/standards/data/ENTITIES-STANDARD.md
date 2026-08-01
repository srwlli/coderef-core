---
kind: data
title: Entities Standard — what CORE's core objects ARE
status: living
updated: 2026-07-31
---

# Entities Standard — what CORE's core objects ARE

> **Sub-type:** `entities` of the `data` kind. Authority root: [`README.md`](README.md).
> This doc declares WHAT coderef-core's persistent objects are and which field
> bears each one's identity. It does not restate the type definitions — it cites
> them. Field shapes live in [`SCHEMA-STANDARD.md`](SCHEMA-STANDARD.md); id
> construction lives in [`KEYING-STANDARD.md`](KEYING-STANDARD.md).

## What kind of data model this is

coderef-core has **no database**. Its data model is a set of **regenerable JSON
artifacts under `.coderef/`**, derived from source code by the scan pipeline. That
single fact governs every entry below: an entity here is a *derived record about
code*, never a user-authored row. The authoritative upstream is the source tree;
`.coderef/` is a projection of it.

This has one consequence worth stating plainly, because it is the difference
between this project and a typical data-bearing project: **no entity in this model
is the source-of-record for its own content.** See
[`PROVENANCE-STANDARD.md`](PROVENANCE-STANDARD.md).

## The entity set

Six core object types. One row per entity, each with its identity-bearing field.

| Entity | What it IS | Identity-bearing field | Authority |
|---|---|---|---|
| **ElementData** | One declared code element — function, class, method, interface, type, variable — extracted from a source file by the scanner. The atom of the whole model. | `codeRefId` (natural locator; `codeRefIdNoLine` is the line-stable form) | [ref](../../SCHEMA.md#elementdata), [ref](../../../src/types/types.ts:322) |
| **GraphNode** | An element promoted into the dependency graph, carrying propagated facets. Node identity is the element's canonical id — a node is not a second object, it is an element's graph face. | `id` (= the element's `codeRefId`) | [ref](../../../src/pipeline/graph-builder.ts:305) |
| **GraphEdgeV2** | One directed relationship between two nodes: import, call, export, header-import, extends, implements, or an HTTP hop. Carries its own resolution status and evidence. | `id` (content-address; see Keying) | [ref](../../../src/pipeline/graph-builder.ts:206) |
| **EdgeEvidence** | The discriminated record of WHY an edge exists and how far resolution got. Not a free-standing object — a required component of an edge, and the model's provenance carrier. | none (owned by its edge; keyed by the edge's `id`) | [ref](../../../src/pipeline/graph-builder.ts:144) |
| **Endpoint** | An HTTP endpoint pseudo-node. Names something that exists in the running system but at no single source location — so it is a first-class graph node with no file of its own. | `@Endpoint/<path>#<METHOD>` (natural key) | [ref](../../../src/pipeline/endpoint-identity.ts:95) |
| **CodeChunk** | A retrievable span of source prepared for RAG, with its embedding and facets. The only entity whose content is a copy of source bytes rather than a fact about them. | chunk id + vector-store position | [ref](../../SCHEMA.md#codechunk-phase-7-facets) |

**No blanket rows.** Every entity above is one the pipeline actually persists to
`.coderef/`. `PipelineState` ([ref](../../SCHEMA.md#pipelinestate)) is deliberately
absent: it is in-memory orchestration state, not a persisted entity.

## Identity: two grains, declared

`ElementData` is the one entity that carries **two** id forms, and the distinction
is load-bearing rather than incidental:

- **`codeRefId`** — `@<Designator>/<file>#<name>:<line>`. Includes the line, so it
  addresses a *position*. Editing a file above an element changes this id.
- **`codeRefIdNoLine`** — the same locator without `:<line>`
  ([ref](../../../src/types/types.ts:322)). Stable across edits that move an element
  without changing what it is.

**Ruling — which one is the identity.** `codeRefIdNoLine` is the **identity-bearing
field**; `codeRefId` is a *locator* that additionally pins a position. Anything that
must survive an unrelated edit above the element (a stored reference, a cross-scan
comparison, a durable citation) keys on the no-line form. The line-bearing form is
correct for pointing a human or agent at code right now.

This ruling is recorded here because it was previously implicit in the code and
undeclared — the exact re-discovered-at-write-time hazard this sub-type exists to
close.

## Edges between entities

Relationships are themselves an entity (`GraphEdgeV2`), not a foreign-key column
on a node. Eight relationship kinds are live
([ref](../../../src/pipeline/graph-builder.ts:103)):

`import` · `call` · `export` · `header-import` · `extends` · `implements` ·
`calls_endpoint` · `serves_endpoint`

Edges key on the participants' **canonical ids**, not on any row ordinal — the
graph is regenerated wholesale each scan, so there is no stable row number to key
on and none is invented.

`calls_endpoint` and `serves_endpoint` are held deliberately **out of** the
module-dependency edge set: an import and an HTTP request are different kinds of
coupling, and collapsing them would let a network hop masquerade as a build-time
dependency ([ref](../../../src/cli/mcp/graph-tools.ts:66)).

## Facets are attributes, never identity

Propagated facets (layer, capability, test-origin, confidence tier) are **curation
attributes** on nodes and edges. They describe an object; they never enter its id.
A re-classification changes what an element is *tagged*, never what it *is*.

---

*Conforms to the `data` kind, sub-type `entities`. Authority root: [`README.md`](README.md).*

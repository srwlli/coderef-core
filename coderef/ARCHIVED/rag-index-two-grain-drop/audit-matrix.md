# Phase 1 Audit Matrix — WO-RAG-INDEX-TWO-GRAIN-DROP-001

**Audit date:** 2026-05-08  
**Auditor:** CODEREF-CORE (Claude Sonnet 4.6)  
**Target file:** `src/pipeline/output-validator.ts`  
**Status:** HARD STOP — ORCHESTRATOR approval required before Phase 2

---

## TL;DR for ORCHESTRATOR

**Critical discovery:** The Phase 2 premise is partially invalidated.  
Graph.json file-grain pseudo-nodes carry **zero `headerStatus` data** (0/362 nodes).  
The `headerStatus` lives only on element-grain nodes (2415/2777 nodes).  
Replacing `state.elements` iteration with graph-node iteration is possible but remains **element-grain** — just over graph nodes instead of PipelineState. See §HALT below.

---

## Element-Grain Aggregation Sites in `output-validator.ts`

| # | Function | Lines | Grain Type | What it produces | Replacement source | Delete/Keep | Rationale |
|---|----------|-------|-----------|-----------------|-------------------|-------------|-----------|
| 1 | `buildFileHeaderStatusMap` | 607–614 | Element-grain | `Map<file, HeaderStatus>` (file-grain output, element-grain source) | Graph element-grain nodes (same grain, different object) | **HALT — see §HALT** | File-grain pseudo-nodes lack `headerStatus`; element-grain nodes carry it |
| 2 | `buildFileHeaderFactMap` | 487–497 | Element-grain | `Map<file, HeaderFact>` (file-grain output, element-grain source) | No graph-node equivalent — `headerFact` is NOT in graph.json metadata | **HALT — see §HALT** | `headerFact` is not propagated to graph nodes at all |
| 3 | `buildReport` (line 548) | 548–570 | Delegates to `buildFileHeaderStatusMap` | 4 `header_*_count` fields | Same as row 1 | **HALT — see §HALT** | Consumed via `buildFileHeaderStatusMap` call |
| 4 | `checkSemanticHeaders` (line 407) | 407–408 | Delegates to `buildFileHeaderStatusMap` + `buildFileHeaderFactMap` | SH-1, SH-2, SH-3 checks | Same as rows 1–2 | **HALT — see §HALT** | Both helper calls are element-grain |

---

## Task 1.2 — Graph.json File-Grain Node Confirmation

**Finding: NEGATIVE.** File-grain pseudo-nodes do NOT carry `headerStatus`.

Verified against live `.coderef/graph.json`:
- **Total nodes:** 2777
- **File-grain pseudo-nodes** (`metadata.fileGrain === true`): 362
- **File-grain nodes WITH `headerStatus`:** **0**
- **Element-grain nodes WITH `headerStatus`:** 2415

File-grain pseudo-node metadata example:
```json
{ "codeRefId": "@File/demo-all-modules.ts", "codeRefIdNoLine": "@File/demo-all-modules.ts", "fileGrain": true }
```

Element-grain node metadata example:
```json
{ "codeRefId": "@Fn/demo-all-modules.ts#section:64", "headerStatus": "missing" }
```

The `headerStatus` is stamped by `orchestrator.ts:476-480` onto **element** objects, then propagated to graph by `graph-builder.ts:252` onto element-grain nodes only. File-grain pseudo-nodes (lines 281-290 of graph-builder.ts) do not receive `headerStatus`.

---

## Task 1.3 — Element-Grain Sites Outside `src/analyzer/`

Scope: any loop iterating `state.elements` to derive **header-status** file-grain outputs.

Files searched via grep for `state.elements` outside `src/analyzer/`:

| File | Purpose of `state.elements` use | Is it header-status aggregation? |
|------|--------------------------------|----------------------------------|
| `src/pipeline/output-validator.ts` | `buildFileHeaderStatusMap`, `buildFileHeaderFactMap` | **YES — in-scope** |
| `src/pipeline/graph-builder.ts` | Build graph nodes from elements (Pass 1) | No — this is structural, not aggregation |
| `src/pipeline/import-resolver.ts` | Index elements by file/localName for resolution | No — resolution context, not aggregation |
| `src/pipeline/call-resolver.ts` | Index elements by file for call matching | No — resolution context, not aggregation |
| `src/pipeline/semantic-elements.ts` | Normalize elements for output | No — transform, not aggregation |
| `src/pipeline/generators/complexity-generator.ts` | Pass elements to metrics | No — metrics, not header-status |
| `src/pipeline/generators/drift-generator.ts` | Normalize elements for drift | No — drift, not header-status |
| `src/pipeline/generators/pattern-generator.ts` | Pattern detection (middleware, DI, etc.) | No — pattern, not header-status |
| `src/pipeline/generators/context-generator.ts` | Multiple context generators | No — context, not header-status |
| `src/pipeline/generators/validation-generator.ts` | Build element map for validation output | No — output map, not header-status |

**Result:** Only `output-validator.ts` has element-grain → file-grain header-status aggregation outside the analyzer.

---

## Task 1.4 — Chunk-Grain Confirmation (indexing-orchestrator.ts)

**Confirmed: chunk-grain. NOT in scope.**

`chunksSkipped` and `chunksSkippedDetails` in `indexing-orchestrator.ts` iterate **chunks** (objects from the RAG chunking pipeline), not `state.elements`. The skip unit is a chunk, not an element. The `headerStatus` check at lines 596–637 reads `chunk.headerStatus`, which was stamped onto the chunk by `chunk-converter.ts` from `node.metadata.headerStatus` during chunk creation.

No action required in Phase 2 for this path.

---

## §HALT — Critical Architectural Discovery

### Premise Gap

The analysis.json DR-001 states:
> "Use graph.json file-grain nodes as source for header status counts"

**This premise is false.** File-grain nodes carry no `headerStatus`. The data only exists on element-grain graph nodes.

### What IS possible

An alternative replacement for `buildFileHeaderStatusMap`:
```typescript
// Instead of iterating state.elements:
for (const node of graph.nodes) {
  if (node.metadata?.fileGrain) continue;
  if (node.metadata?.headerStatus !== undefined && !fileToStatus.has(node.file)) {
    fileToStatus.set(node.file, node.metadata.headerStatus as HeaderStatus);
  }
}
```

This produces **identical counts** — verified:
- From `state.elements`: `{defined: 0, missing: 263, stale: 0, partial: 0}`
- From `graph.nodes` (element-grain filtered): `{defined: 0, missing: 263, stale: 0, partial: 0}`

But this is **still element-grain** — we'd iterate element-grain graph nodes instead of element-grain state objects. The grain type does not change; only the source object changes (`graph.nodes` vs `state.elements`).

### `buildFileHeaderFactMap` is not replaceable

`headerFact` (the `HeaderFact` struct with `exports`, `layer`, `capability`, `imports` etc.) is **not propagated to graph nodes at all**. Only `headerStatus` (the scalar status string) is propagated. `buildFileHeaderFactMap` cannot be replaced from graph data — it requires `state.elements`.

SH-3 (imports_non_unresolved) depends on both `buildFileHeaderStatusMap` AND `buildFileHeaderFactMap`. If `buildFileHeaderFactMap` stays on `state.elements`, the SH-3 check cannot be decoupled.

### Options for ORCHESTRATOR

**(A) NARROW SCOPE — replace only `buildFileHeaderStatusMap` source, keep `buildFileHeaderFactMap` as-is**  
Replace `state.elements` loop in `buildFileHeaderStatusMap` with `graph.nodes` element-grain loop. `buildFileHeaderFactMap` stays on `state.elements` (no equivalent in graph). Technically reduces coupling to PipelineState for one function, but still element-grain by iteration. Impact: minimal semantic improvement — not really "dropping element-grain."

**(B) DEFER / DESCOPE — mark this WO as premises-invalidated, file a new WO**  
The true file-grain drop would require `graph-builder.ts` to stamp `headerStatus` onto file-grain pseudo-nodes (one `metadata.headerStatus` = canonical status per file). That is a separate, upstream change. File this WO as descoped; create WO-RAG-INDEX-FILE-GRAIN-NODES-001 to modify graph-builder.ts to carry file-grain headerStatus.

**(C) EXPAND SCOPE — modify graph-builder.ts to stamp headerStatus on file-grain nodes in this WO**  
Add `metadata.headerStatus` to file-grain node emission in graph-builder.ts (lines 281-290). Then replace both `buildFileHeaderStatusMap` and `buildReport` to use graph.json file-grain nodes. `buildFileHeaderFactMap` and SH-3 would still need `state.elements` unless `headerFact` is also propagated. Partial element-grain removal.

---

## Pre-conditions for Phase 2 (if approved)

- [ ] AC-05a baseline: 2415 === 2415 (element-grain frozen-fixture)
- [ ] AC-05b baseline: 263 === 263 (file-grain frozen-fixture)
- [ ] 239 tests baseline PASS
- [ ] tsc clean both configs
- [ ] ORCHESTRATOR ruling on Options A/B/C above

---

## Commits

Phase 1 commit: `audit(WO-RAG-INDEX-TWO-GRAIN-DROP-001) Phase 1: element-grain path inventory`

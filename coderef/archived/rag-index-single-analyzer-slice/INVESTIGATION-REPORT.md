# Phase 1 Investigation Report — WO-RAG-INDEX-SINGLE-ANALYZER-SLICE-001

**Authored:** 2026-05-05
**Author:** CODEREF-CORE (DISPATCH-2026-05-04-007)
**Phase:** 1 — investigation
**Status:** complete; no halts; Phase 2 cleared to proceed

---

## Findings

### 1. ChunkConverter shape compatibility (task 1.1)

`src/integration/rag/chunk-converter.ts` consumes `DependencyGraph` (from `src/analyzer/graph-builder.ts`):

```ts
interface DependencyGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  edgesBySource: Map<string, GraphEdge[]>;
  edgesByTarget: Map<string, GraphEdge[]>;
}
```

**Methods used by ChunkConverter:**
- `groupNodesByFile` (L214-224): iterates `graph.nodes.values()` → reads `node.file`
- `extractDependencies` (L411-416): reads `graph.edgesBySource.get(nodeId)`
- `extractDependents` (L421-426): reads `graph.edgesByTarget.get(nodeId)`
- `extractRelatedElements` (L438): iterates `graph.nodes.values()`

So ChunkConverter requires Map-keyed nodes + the two reverse-index Maps. It does NOT touch the `edges` array directly.

### 2. graph.json serialized shape (task 1.2)

`.coderef/graph.json` ships an **array** shape (not Map):

```json
{
  "version": "...",
  "exportedAt": "...",
  "nodes": [
    { "id": "...", "type": "...", "name": "...", "file": "...", "line": ..., "metadata": {...} },
    ...
  ],
  "edges": [
    { "source": "...", "target": "...", "type": "imports|calls|...", "metadata": {...} },
    ...
  ],
  "statistics": { "nodeCount": ..., "edgeCount": ..., ... }
}
```

**Adapter required.** ~15-25 LOC. Build:
- `Map<string, GraphNode>` keyed by `node.id`
- `edgesBySource: Map<string, GraphEdge[]>` from edges array
- `edgesByTarget: Map<string, GraphEdge[]>` from edges array
- pass through edges array unchanged

The adapter lives inside `indexing-orchestrator.ts` (or a small helper in same dir) — boundary `src/integration/rag/*` preserved (DR-SINGLE-SLICE-A).

### 3. ChunkConverter facet propagation status (task 1.1.b/c) — **R-SINGLE-SLICE-2 RESOLVED**

`ChunkConverter.convertNode` (L153-201) **already propagates** node.metadata to chunk inline:

```ts
const layer = typeof node.metadata?.layer === 'string' ? node.metadata.layer : undefined;
const capability = typeof node.metadata?.capability === 'string' ? node.metadata.capability : undefined;
const constraints = Array.isArray(node.metadata?.constraints) ? (node.metadata!.constraints as string[]) : undefined;
const rawHeaderStatus = typeof node.metadata?.headerStatus === 'string' ? node.metadata.headerStatus : undefined;
const headerStatus = (rawHeaderStatus === 'defined' | 'missing' | 'stale' | 'partial') ? rawHeaderStatus : undefined;
```

These flow into the chunk via spread:
```ts
...(layer !== undefined && { layer }),
...(capability !== undefined && { capability }),
...(constraints !== undefined && { constraints }),
...(headerStatus !== undefined && { headerStatus }),
```

**Implication:** No ChunkConverter modification needed. Once `indexCodebase` feeds ChunkConverter a graph whose nodes carry metadata (i.e., the canonical Phase 5 graph.json), the existing inline propagation handles facets. The facet enrichment block (L462-564 of indexing-orchestrator.ts) becomes purely redundant — its file-grain worst-severity aggregation was needed only because the analyzer-slice graph and the canonical graph.json were two different artifacts.

### 4. Caller audit (task 1.3) — **R-SINGLE-SLICE-4 CLEAN**

Callers of `IndexingOrchestrator.indexCodebase` (grep `indexCodebase\(`):

| caller | path | depends on divergent slice? |
|---|---|---|
| Production CLI | `src/cli/rag-index.ts:513` | NO — passes `useAnalyzer: true` + validation gate; semantics preserved when `useAnalyzer` becomes "read graph.json" |
| Test (top-level `__tests__/integration/rag/`) | `__tests__/integration/rag/indexing-orchestrator.test.ts:48,66,76` | NO — tests stub the analyzer; graph.json read replaces stub-driven analyze |
| Test (in-tree integration) | `src/integration/rag/__tests__/integration/indexing-pipeline.test.ts` (10 call sites L173-385) | NO — these construct fixtures and assert end-to-end behavior; will be re-run in Phase 3 |
| Test (pipeline gate invariant) | `__tests__/pipeline/indexing-gate-invariant.test.ts` (4 call sites) | NO — relies on stub analyzer producing chunks; refactor must preserve the same chunksSkipped semantics |

**No production or test consumer relies on the rag-index analyzer-slice picking up files populate-coderef misses.** Phase 1 halt-and-report condition R-SINGLE-SLICE-4 does NOT trigger.

### 5. Stale-graph staleness check (task 1.4) — **DR-SINGLE-SLICE-D CONFIRMED**

**Decision:** fail loud (per analysis.json default; no override needed).

**Sample size:** 10 files. Pick from each of `src/`, `__tests__/`, top-level `*.ts`. Stat each; if any sampled source mtime > graph.json mtime, throw:

```
graph.json is stale — re-run `coderef populate` to refresh.
Last graph.json: {iso}
Newest sampled source: {path} ({iso})
```

**Rationale:** the alternative (warn + continue) reproduces today's silent-disagreement failure mode in a new shape. If the user's source is newer than the graph, indexing against the old graph produces chunks that don't reflect current code — exactly the kind of self-disagreement this WO is meant to eliminate. Fail loud is honest.

**Performance:** stat × 11 files (graph.json + 10 samples) is sub-millisecond. No need for content hashing in this WO.

### 6. graph.json metadata coverage cross-check (additional probe, surfaced during Phase 1)

Initial probe of pre-existing `.coderef/graph.json` (mtime 2026-04-21) showed **0 nodes with metadata** — pre-Phase-5-task-1.1.5. Re-ran `populate-coderef` (16.99s on coderef-core); fresh graph.json shows:
- 2771 nodes, **all with metadata**
- `headerStatus` values: `['missing']` only (no defined-headers in this codebase, matches validation-report)
- **262 unique files** with at least one missing-header element
- `validation-report.header_missing_count: 262`

**Identity verified pre-implementation:** the data is in the canonical graph.json today. The structural identity AC-05 (`chunksSkipped(header_status_missing) === header_missing_count`) is achievable by construction once the orchestrator reads from this artifact instead of a second analyzer slice.

### 7. R-SINGLE-SLICE-5 (parse performance) — **acceptable**

graph.json is 2.3 MB; `JSON.parse` ~30ms cold. Negligible compared to embedding + vector store I/O. No streaming / lazy-parse needed.

---

## Phase 2 directive (no halts)

Phase 1 cleared all halt-and-report conditions:
- 1.3 caller audit: no consumer relies on divergent slice
- 1.1/1.2: ChunkConverter shape compat resolved by ~20-LOC adapter inside `src/integration/rag/`

Phase 2 may proceed:
1. Insert graph.json read + adapter at indexing-orchestrator.ts:387-444 (replaces the analyze block)
2. Add explicit error if graph.json missing
3. Add fail-loud staleness check (DR-SINGLE-SLICE-D)
4. Delete facet enrichment block lines ~446-564
5. tsc clean both configs after each commit

**ChunkConverter unchanged** — its inline propagation (L153-201) already does what the deleted block was doing.

---

## Cross-references

- Plan: `coderef/workorder/rag-index-single-analyzer-slice/plan.json`
- Analysis: `coderef/workorder/rag-index-single-analyzer-slice/analysis.json`
- Context: `coderef/workorder/rag-index-single-analyzer-slice/context.json`
- Predecessor archive: `coderef/archived/indexing-orchestrator-path-normalization-fix/`
- Superseded WO: `coderef/workorder/rag-index-analyzer-slice-coverage/` (status=superseded, content preserved)

# STUB: indexing-orchestrator chunk↔file path normalization fails on absolute-Windows-path inputs

**Stub ID:** STUB-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001
**Authored:** 2026-05-05
**Author:** CODEREF-CORE (during DISPATCH-2026-05-04-003 E2E smoke)
**Owner domain:** CODEREF-CORE
**Priority:** high
**Status:** RESOLVED — closed by WO-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001 (closeout ee1c1a7); verified 2026-06-13 (normalizeChunkFileForGraphJoin + indexing-orchestrator-path-normalization.test.ts green)
**Phase:** post-rebuild maintenance (rebuild is complete; this is not a Phase 7 reopening)

---

## Summary

The Phase 7 `IndexingOrchestrator`'s file-grain worst-severity facet enrichment (Path A, src/integration/rag/indexing-orchestrator.ts:519-545) silently fails to join graph.json node facets onto chunks when chunk file paths arrive as absolute Windows backslash paths and graph.json node.file is relative POSIX. The result: `chunk.headerStatus` is never populated from the graph, so the AC-09 skip rule (`if chunk.headerStatus in {missing, stale, partial} → skip with header_status_missing`) never fires.

This was first surfaced by DISPATCH-003's E2E smoke run on coderef-core's own source. Phase 7's closeout had verified AC-09 statically (Ollama was down at close time, so the dynamic check wasn't exercised); the smoke caught the gap.

---

## Evidence

### Source location

`src/integration/rag/indexing-orchestrator.ts` lines 519–545:

```typescript
const normalizeChunkFile = (file: string): string => {
  let f = file.replace(/\\/g, '/');
  // strip absolute basePath prefix if present so we can match
  // the relative POSIX path graph.json uses
  const baseRel = this.basePath.replace(/\\/g, '/').replace(/\/$/, '');
  if (f.toLowerCase().startsWith(baseRel.toLowerCase() + '/')) {
    f = f.slice(baseRel.length + 1);
  }
  return f;
};

for (const chunk of chunks) {
  const key = normalizeChunkFile(chunk.file);
  const f = facetByFile.get(key);
  if (!f) continue;
  // ...facet enrichment...
}
```

The bug is in the `normalizeChunkFile` ↔ `facetByFile` key match. The match fails silently — `f` is always `undefined`, and the loop body just `continue`s for every chunk.

### Concrete data

From DISPATCH-003 E2E smoke run (2026-05-05):

- `chunk.file` (chunk side, from `coderef-vectors.json`):
  `file:C:\Users\willh\Desktop\CODEREF\coderef-core\index.ts`
- `node.file` (graph side, from `.coderef/graph.json`):
  `index.ts`
- `this.basePath` (orchestrator state, when invoked as `rag-index --dir .`):
  the resolved absolute path of `.` — likely `C:\Users\willh\Desktop\CODEREF\coderef-core` or similar
- After `normalizeChunkFile(chunk.file)`:
  the prefix strip likely fails because of one of:
  - the `file:` URI-style prefix on chunk.file isn't stripped before the basePath comparison
  - case-sensitivity mismatch (`toLowerCase()` is applied but the `file:` prefix isn't)
  - or backslash-vs-forward-slash sequencing edge (`replace(/\\/g, '/')` runs first, but the `file:` prefix isn't peeled)

The `facetByFile` map has 262 entries keyed by relative POSIX paths (e.g., `index.ts`). The chunk side keys never normalize to that shape.

### Divergence table

| Metric | Phase 7 closeout claim (static) | DISPATCH-003 actual (dynamic) | Divergence |
|---|---:|---:|---|
| `chunksIndexed` | ~1 (file with no header_missing facet) | 263 | +262 |
| `chunksSkipped` (with `header_status_missing`) | 262 expected | 0 | -262 |
| `IndexingResult.status` | `partial` expected | `success` | flipped |

### Static verification (confirms upstream pipeline is correct)

A one-off node script reading `.coderef/graph.json` directly with no path normalization:

```
unique files with headerStatus='missing' in graph.json: 262
first 5: ['demo-all-modules.ts', 'examples/nextjs-api-route.ts', ...]
```

This **matches `validation-report.header_missing_count=262` exactly**. So:
- Phase 1 + Phase 2.5 produced the right ElementData facets ✓
- Phase 5 buildNodes propagated them onto graph nodes correctly ✓
- Phase 6 validation report counted them correctly ✓
- Phase 7 indexing orchestrator's runtime join path normalization is the only broken link ✗

---

## Reproduction

```bash
cd C:/Users/willh/Desktop/CODEREF/coderef-core
node dist/src/cli/populate.js .
CODEREF_LLM_PROVIDER=ollama CODEREF_RAG_LOCAL_ONLY=1 \
  node dist/src/cli/rag-index.js --dir . --reset
# inspect .coderef/rag-index.json:
node -e "const r=require('./.coderef/rag-index.json'); \
  console.log({status: r.status, indexed: r.chunksIndexed, \
    skipped: r.chunksSkipped, skipReasons: r.chunksSkippedDetails.map(s=>s.reason)})"
```

Expected (per Phase 7 AC-09): `{status: 'partial', indexed: 1, skipped: 262, skipReasons: ['header_status_missing', ...262 of these]}`
Actual: `{status: 'success', indexed: 263, skipped: 0, skipReasons: []}`

The bug reproduces on any project where:
1. `headerStatus='missing'` (or `stale` / `partial`) elements are present in the scan, AND
2. The chunk file paths arrive at the orchestrator as absolute Windows backslash paths (i.e., normal Windows usage with `--dir .`).

---

## Proposed fix shape (for follow-up WO scoping — NOT prescriptive)

The fix likely lives entirely in `normalizeChunkFile` (~10–20 lines). Possible approaches:

1. **Peel the `file:` URI prefix first** before basePath strip, since chunk IDs use that scheme:
   ```typescript
   let f = file.replace(/^file:/, '').replace(/\\/g, '/');
   ```
2. **Resolve both sides through the same canonical form** — e.g., `path.relative(basePath, absChunkFile)` instead of string-prefix-strip.
3. **Add a graph.json-key alternate match** — try both relative and absolute forms, fall through to the matching one.

The fix is small (Phase 7 closeout commit 385e9f8 introduced this code; it's ~30 lines of orchestrator state). Recommended scope:

- 1 unit test in `__tests__/integration/rag/` that constructs a known fixture with absolute Windows chunk paths + relative POSIX graph.json keys and asserts the join succeeds.
- 1 invariant test extending `__tests__/pipeline/indexing-gate-invariant.test.ts` to assert `chunksSkipped >= header_missing_count - tolerance` whenever `header_missing_count > 0` and indexing runs successfully.
- The orchestrator code change.

---

## Constraints

- **Phase 7 archive must NOT be reopened.** The rebuild is done. This is post-rebuild maintenance.
- **No new field on `IndexingResult` schema.** The shape is locked additive (DR-PHASE-7-B); the fix is purely runtime correctness, not new contract.
- **No new SkipReason values.** The existing `header_status_missing` is correct; the fix makes it actually fire.
- **AC-09 stays at the same threshold** (`header_missing_count == chunksSkipped(header_status_missing)`, ±10% per ORCHESTRATOR Path A constraint). The fix should restore that equality dynamically.

---

## Cross-references

- Phase 7 closeout report: `coderef/archived/pipeline-indexing-rag/ARCHIVED.md`, AC-09 section
- Phase 7 execution-notes: `coderef/archived/pipeline-indexing-rag/execution-notes.md`, "Task 1.16 AC-09 — RESOLVED via ORCHESTRATOR ruling: Option A" section
- E2E smoke report (this run): `coderef/working/CODEREF-CORE/e2e-smoke-2026-05-05/E2E-SMOKE-REPORT.md`
- Source: `src/integration/rag/indexing-orchestrator.ts:519-545`

# Phase 7 Prep Brief — Indexing / RAG Pipeline

**Phase:** 9 of 10 gated steps (Phase 7 of 9 in roadmap numbering)
**Workorder slug (target):** `pipeline-indexing-rag` (this prep dir is `pipeline-indexing-rag-prep`)
**Predecessor:** Phase 6 (output-validation) ARCHIVED 2026-05-04 — commits 0d7cfa9..971eec0 + archive 1e7f6f6
**Roadmap section:** `roadmap.md` lines 410–448 (`## Phase 7 - Indexing / RAG Pipeline ⏳ NEXT`)

---

## Why this phase exists (the load-bearing why)

Indexing today silently reports success on invalid data. `chunksIndexed: 0` returns success status. Failed/skipped chunks lack failure reasons. RAG queries can't filter by `layer`/`capability`/`constraint`. Phase 7 is where the pipeline's *output* finally becomes trustworthy for downstream consumers (agents, RAG, search).

Phase 7 also operationalizes the semantic facets that Phases 1, 2.5, 3 worked to establish — `@layer`, `@capability`, `@constraint`, `codeRefId`. If Phase 7 doesn't expose these as queryable facets, the entire upstream taxonomy work is unconsumed.

Phase 6's validator is the upstream gate: indexing MUST refuse to run on a graph that fails Phase 6 validation. That is the chokepoint contract Phase 6 established (validatePipelineState in populate.ts before generators) — Phase 7 inherits and respects it.

---

## Hard scope boundaries

**In-scope:**
1. Make indexing refuse invalid graph output (`validation-report.json` failures gate the indexer)
2. Add failure reasons to skipped/failed chunks, unresolved relationships, stale-header elements
3. Add top-level indexing status: `success` | `partial` | `failed`
4. Reject `chunksIndexed: 0` as silent success — must return `failed` (or `partial` with explicit zero-chunks reason)
5. Attach semantic facets to indexed chunks: `layer`, `capability`, `constraints`, `codeRefId`
6. Allow RAG queries to filter by `layer` / `capability` / `constraint`

**Out-of-scope (HARD STOPS):**
- ❌ NO behavioral changes to analyzer / resolver / graph-construction / output-validator layers (Phases 1–6 are read-only territory)
- ❌ NO new edge schema fields, no new resolutionStatus values, no new EdgeEvidence variants
- ❌ NO Phase 8 documentation work (separate phase)
- ❌ NO new vector store backends (chroma, pinecone, sqlite already exist — work within them)
- ❌ NO LLM-side embedding model swaps
- ❌ NO new CLI flags beyond what indexing demands (Phase 6 introduced `--strict-headers`; Phase 7 may need 0–2 new flags MAX, justify each)

**The Phase 6 validator is the gate.** If `.coderef/validation-report.json` shows `ok: false`, the indexer must refuse to run. This is non-negotiable.

---

## Read-only source surfaces (prep agent: survey these, do NOT modify)

Existing machinery (do not rebuild):
- `src/indexer/` — index-store.ts, indexer-service.ts, metadata-index.ts, query-engine.ts, relationship-index.ts
- `src/integration/rag/` — answer-generation-service.ts, chunk-converter.ts, code-chunk.ts, confidence-scorer.ts, context-builder.ts (and tests in `__tests__/`)
- `src/integration/vector/` — chroma-store.ts, pinecone-store.ts, sqlite-store.ts, vector-store.ts (interface)
- `src/pipeline/output-validator.ts` — Phase 6's validator. Read its ValidationResult type contract.
- `src/cli/populate.ts` — chokepoint location. Indexer entry point likely wires here.
- `.coderef/validation-report.json` — Phase 6's contract output. 11 numeric fields + ok flag.

Phase 0 ground-truth tests (must continue to PASS, no regressions):
- `__tests__/pipeline/graph-ground-truth.test.ts` — all 6 assertions PASS as of Phase 5
- `__tests__/pipeline/no-rag-indexing.test.ts` — Phase 6's boundary enforcer asserting NO Phase 7 fields leak (ragIndex, embeddingVector, vectorStoreId, chunkId). **Phase 7 DELETES this test as its first act** (mirroring how Phase 6 deleted no-output-validation.test.ts).

Phase 6's archive for context:
- `coderef/archived/pipeline-output-validation/` — analysis.json + execution-notes.md document what Phase 6 actually shipped vs what it deferred

---

## Deliverables expected from prep agent

The prep agent must produce TWO files in this directory:

### 1. `context.json`
Follow the same schema Phase 6 prep used. Required fields:
- `phase`: "Phase 7 - Indexing / RAG Pipeline"
- `predecessor_state`: paste-ready summary of Phase 6 archive state (commits, validation-report contract, ground-truth state)
- `acceptance_criteria`: 8–12 ACs covering the 4 roadmap exit criteria + 6 tasks. Each AC must be testable.
- `out_of_scope`: explicit list (use the HARD STOPS above)
- `existing_machinery`: file-level inventory of `src/indexer/`, `src/integration/rag/`, `src/integration/vector/` with current responsibilities
- `boundary_enforcer_disposition`: DELETE no-rag-indexing.test.ts; CREATE no-phase-8-docs-leak.test.ts (asserts no Phase 8 doc-sync fields leak into Phase 7)
- `phase_6_gate_contract`: how Phase 7 reads validation-report.json, what triggers refuse-to-index
- `cli_surface_proposal`: any new flags (max 2, must justify)

### 2. `analysis.json`
Follow Phase 6 prep's structure. Required:
- `risks`: 5–8 risks with id (R-PHASE-7-A, B, ...), description, mitigation, severity
- `decision_records`: 3–5 DRs with id (DR-PHASE-7-A, B, ...), question, decision, rationale, alternatives_considered
- `key_files_to_touch`: ranked list of files the implementation WILL modify, with one-line reason each
- `key_files_to_read_only`: files the impl will NEED to understand but NOT change
- `real_world_baseline`: scrape `.coderef/validation-report.json` from coderef-core itself — capture valid_edge_count (3450), node count, etc. as the AC-01 baseline for Phase 7
- `chunk_facet_attachment_strategy`: HOW `layer`/`capability`/`constraints` get from ElementData → chunk metadata (read chunk-converter.ts to understand the seam)
- `query_filter_strategy`: HOW RAG queries gain filter-by-layer capability (read query-engine.ts + answer-generation-service.ts)
- `failed_status_propagation`: HOW indexing's status field bubbles up through populate.ts to CLI exit code
- `phase_8_boundary`: explicit list of fields/behaviors that belong to Phase 8 (docs) and must NOT leak into Phase 7

---

## Halt-and-report points (prep agent)

Stop and report to ORCHESTRATOR before writing the files if you encounter:
1. Phase 6's validation-report.json contract is unclear or ambiguous (read output-validator.ts and ask if needed)
2. The chokepoint location for indexing in populate.ts is unclear (multiple candidates — pick one and justify, or escalate)
3. Existing indexer/rag/vector code reveals a pre-existing structural issue that Phase 7 cannot cleanly land around (file as a follow-up stub, do NOT piggyback fixes)
4. The 6 roadmap tasks don't decompose into 8–12 ACs cleanly (tell ORCHESTRATOR which ones are too coarse)

---

## Constraints

- **READ-ONLY agent.** Do not modify any source file. Only writes are to `context.json` and `analysis.json` in THIS directory.
- **No test changes.** Phase 7 IMPLEMENTATION will land tests; prep just plans them.
- **Real numbers only.** Cite real counts from coderef-core's own scan output (validation-report.json, current chunk count if indexer runs today, vector store size). No invented numbers.
- **Phase 6 archive is canon.** Read `coderef/archived/pipeline-output-validation/analysis.json` to understand what Phase 6 deferred to Phase 7 vs what it kept for itself.

---

## Pipeline context (for the agent who joins cold)

8 of 9 phases archived: 0, 1, 2, 2.5, 3, 4, 5, 6. All 6 ground-truth assertions PASS. validation-report.json baseline: valid_edge_count 3450, 6/6 graph-integrity checks pass on coderef-core's own source. The pipeline produces canonical IDs, resolved imports + calls, validated graph, and now (Phase 6) refuses to emit invalid output. Phase 7 is the first phase that consumes the pipeline's *output* rather than producing it — so its job is to be the trustworthy reader of what 6 phases of producers built.

After Phase 7, only Phase 8 (docs) remains.

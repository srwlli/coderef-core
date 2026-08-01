# /discover report — docs-in-the-scan: what exists today (pre-read for WO-TREAT-MARKDOWN-FILES-LIKE-CODE-SECTION-LEVEL-AST-001)

**Generated:** 2026-08-01T13:55:00Z
**Depth:** medium
**Output dest:** workorder:WO-TREAT-MARKDOWN-FILES-LIKE-CODE-SECTION-LEVEL-AST-001
**Dispatch:** none

## 1. Scope

What was asked: "we recently added docs into the scan — identify where and what exists."
What was bounded: CODEREF-CORE doc-ingestion machinery (pipeline, graph, consumers) + live graph counts. Bounded to the shipped docs-to-graph program surfaces; RAG/doc-gen surfaces noted only where they touch the graph.

## 2. Surfaces audited

- [tool: rg]                    queries=4, hits=doc-ingest.ts + graph-builder.ts + resolve-tail.ts + 4 consumers
- [tool: file-read]             src/pipeline/doc-ingest.ts (349 lines, full), graph-builder doc seams, resolve-tail.ts phase wiring
- [tool: graph.json live count] nodes=3850 total, @Doc=82 (74 resource-sheet / 8 foundation / 0 report), documents edges=121, out-of-universe targets=25
- [tool: registry]              STUB-XB3K8M (promoted) + WO plan.json/context.json read
- WARNING: WO context.json planner discovery is dist-old/* polluted (24/25 candidates from the UNINDEXED-PATH pass) — it predates the f2aef3d `dist-*/` coderefignore fix; do NOT scope from it (SCOPE-001 class)

## 3. Findings table

| Surface | Observation | Severity | Evidence |
|---|---|---|---|
| src/pipeline/doc-ingest.ts:227 | `collectDocFacts()` — the single doc-ingestion entry. THREE lanes, one node kind `@Doc/<repo-relative-path>`: resource sheets (coderef/resource-sheets/*.md, edge-bearing via frontmatter `documents:`), foundation docs (coderef/foundation-docs/*.md, docStatus always 'generated', frontmatter stamped by doc-gen since FU-3), report candidates (any coderef/**/*.md opting in with `ingestion_candidate: true`) | info | header comment lines 16-36 |
| src/pipeline/doc-ingest.ts:145 | `parseDocFrontmatter` is deliberately NOT a YAML parser — flat `key: value` + simple lists only. Whole-file grain: no headings, no body parsing, no code blocks today | info | "NOT a YAML parser by design" |
| src/pipeline/phases/resolve-tail.ts:57 | `collectDocsPhase()` — docs enter the pipeline here, in BOTH run() and runIncremental() (shared resolve tail). Doc facts are deliberately NOT per-file incremental facts: re-collected fresh every scan, which is what makes incremental parity hold by construction | info | doc-ingest.ts lines 42-48 |
| src/pipeline/graph-builder.ts:1213 | `documents` edges minted from `docTargets()` (scalar+list frontmatter union); targets outside the scan universe still mint edges with `reason: 'documents_target_not_in_scan'` (25 such live) | info | line 1257 |
| src/pipeline/graph-builder.ts:114 | `documents` is the ONLY doc edge kind today; evidence carries docStatus provenance for ranking (generated never outranks reviewed sheets, DR-DOCS-E) | info | EdgeEvidence union |
| src/query/canonical-graph.ts + src/cli/mcp/graph-tools.ts | TWO adjacency indexes consume doc edges — any NEW edge kind must teach both (the API-surface WO gotcha) | warning | memory: dual adjacency-index trap |
| .coderef/graph.json (live) | 82 @Doc nodes / 121 documents edges currently in the CORE graph (74 sheets incl. the 21-sheet program, 8 foundation docs, 0 opted-in reports) | info | counted 2026-08-01 |
| src/scanner/scanner.ts | .md files do NOT pass through the scanner today — no section grain, no embedded code blocks, no backtick refs. That is exactly this WO's gap | info | absence verified by grep |
| coderef/workorder/.../context.json | Engine planner discovery ran 12:44Z, BEFORE the dist-*/ ignore fix + repopulate — candidate list is dist-old/* noise; plan's `discovery_required: true` remains genuinely unmet until a real discover lands | warning | 24/25 UNINDEXED-PATH candidates |

## 4. Type/contract divergences

Not applicable for depth=medium.

## 5. Recommendations with priority

| Rec ID | Priority | Action | Owner |
|---|---|---|---|
| REC-001 | high | Quarantine embedded-snippet symbols: doc code blocks must NOT enter the same symbol table namespace as real code (call-resolution pollution, rename_apply must never see them). Mint under the @Doc section container or a synthetic-kind flag excluded from resolvers | CODEREF-CORE |
| REC-002 | high | Gate backtick `symbol` extraction on symbol-table membership — only mint a references edge when the token resolves; disclose unresolved as no-data (backticks also wrap paths/flags/kebab-slugs constantly) | CODEREF-CORE |
| REC-003 | high | No-regress instrument: frozen-tree A/B with the comparison FILTERED to non-@Doc ids (feature is additive by design; code-side node/edge ids must stay byte-identical) | CODEREF-CORE |
| REC-004 | medium | New `references` (and any `contains`) edge kind must be taught to BOTH adjacency indexes (canonical-graph + mcp/graph-tools) | CODEREF-CORE |
| REC-005 | medium | Section node id stability: heading-slug ids churn on heading edits (same class as codeRefId line-shift); decide slug normalization + duplicate-heading disambiguation before minting | CODEREF-CORE |
| REC-006 | medium | Scope ruling needed: which markdown universe? Today's three lanes only (recommended v1), or also docs/*.md + root *.md — plan.json is silent | operator |
| REC-007 | low | Re-run the planner discovery after the TKT-HZF70M repopulate so the engine candidate list stops citing dist-old/* | CODEREF-CORE |

## 6. Reuse template note

This report shape is the canonical `/discover` output. To consume it programmatically: the table headers in §3 and §5 are fixed; section ordering is fixed. Downstream skills (create-workorder, stub, dispatch-session-request) can grep for the `## N.` markers to extract sections.

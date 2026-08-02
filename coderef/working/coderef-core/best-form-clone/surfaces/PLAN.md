---
title: Best-Form Clone — Surfaces band plan
domain: CODEREF-CORE
status: open
created: 2026-08-02
stub_ref: null
---

# Surfaces band — consumers, fully outside

**Graph:** [graph.html](graph.html) · master: [../blueprint.html](../blueprint.html) · ledger: [../PROBLEMS.md](../PROBLEMS.md)

**Mission.** The three presentation/consumer systems, extracted whole (same trio as the reference prep, same names): map viewer, doc generator, context packer. The band law is stark: **import contracts only.** Each surface must run against fixture artifacts with no engine installed — which is exactly what makes this track fully parallel, and what guarantees the engine never again bundles HTML assets or markdown pipelines into its scan loop.

## Nodes

| Node | Phase·Track | Responsibility |
| :--- | :--- | :--- |
| `surface.viewer` | P1·C | Interactive map web app reading MapData artifacts (`contracts.map`). Today's `src/map` viewer assets and the working-folder HTML viewers land here — where their code can't pollute the self-scan (the 2-of-3-cycles receipt in [../PROBLEMS.md](../PROBLEMS.md) P6). |
| `surface.docgen` | P1·C | Resource sheets, foundation docs, READMEs from index + graph artifacts (today's `scripts/` doc-gen leaves the engine repo entirely). |
| `surface.pack` | P1·C | Token-budgeted context packs + change dossiers from index/graph/RAG artifacts (today's `src/context` packer + `src/export`). |

## Laws enforced
Surfaces appear in the rules gate with exactly one allowed import target: `contracts.*`. Problems neutralized: P6 (entanglement), and they inherit P4 protection because everything they read carries the staleness envelope — a surface rendering stale data must say so.

## Build
- **P1 (track C):** all three surfaces against fixture artifacts. The viewer's fixture is a pinned MapData file; doc-gen's is a pinned graph+index pair; pack's adds pinned RAG chunks.
- **P2:** consume real artifacts produced by the integrated engine; visual/golden-output checks against the fixture renders.

**Exit criteria:** each surface runs from artifacts alone (demonstrated in CI with no engine package installed); doc-gen reproduces a reference resource sheet byte-for-byte from fixture inputs; viewer renders the fixture map with the staleness banner exercised.

**Parallelism note.** Track C has zero edges into tracks A/B/D — it can be staffed by a completely separate agent from day one of P1.

---
title: Best-Form Clone — Contracts band plan
domain: CODEREF-CORE
status: open
created: 2026-08-02
stub_ref: null
---

# Contracts band — the seams, made first-class

**Graph:** [graph.html](graph.html) · master: [../blueprint.html](../blueprint.html) · ledger: [../PROBLEMS.md](../PROBLEMS.md)

**Mission.** Every defect class that hurt most in CODEREF-CORE was a seam defect: two components agreeing informally about an artifact and drifting (P1), or two copies of the same knowledge maintained by hand (P2). This band turns each seam into a package: a versioned schema plus **exactly one codec** (reader+writer co-located), round-trip property-tested. Everyone else — engine, transports, surfaces, verification — imports the codec instead of re-implying the format.

## Nodes (all P0, all tracks blocked on them)

| Node | Owns | Note |
| :--- | :--- | :--- |
| `contracts.paths` | Branded `RepoPath` (repo-relative POSIX) + boundary normalizers | The one path law (L6). Replaces 146 ad-hoc `normalizeSlashes` call sites with a type. Windows-first tests. |
| `contracts.index` | File + element records, identity grammar (`@Type/file#name:line`) | The join key for everything downstream, including RAG (kills P7's header coupling). |
| `contracts.graph` | Node/edge kinds, provenance enum, confidence tiers, evidence | A new edge kind is a schema change **here**; every reader learns it at compile time — the two-adjacency-index trap (P2) cannot re-form. |
| `contracts.map` | MapData projection schema | Viewer and engine can never silently disagree about a field again. |
| `contracts.headers` | Header grammar; generator + parser as ONE codec | `parse(generate(x)) === x` property test — the hash-asymmetry class (P1) dies at birth. |
| `contracts.rag` | Chunk records, embedding metadata, scoring envelope | Joins on element id from `contracts.index`. |
| `contracts.envelope` | Staleness + provenance block required on every artifact/response | Readers must distinguish empty (measured zero) from absent (no data) — the honesty law (L7). |

## Laws enforced from this band
L1 (one codec per artifact), L6 (branded paths), L7 (envelope everywhere). The rules gate (`verify.rules`) allows every band to import contracts — and allows contracts to import **nothing** but itself.

## Build (P0) — the trunk of the whole program
1. Pin the seven schemas (versioned; semver stamped into artifacts).
2. Implement codecs with round-trip property tests over `verify.fixture` data.
3. Publish TypeScript types consumed by all four tracks; freeze for P1 (changes after freeze require a blueprint edit + re-ruling — that friction is intentional).

**Exit criteria:** all codecs round-trip on fixture artifacts; `contracts.paths` passes the Windows path matrix; downstream tracks can compile against published types.

**Parallelism note.** This band is the reason P1's four tracks are parallel: once these are frozen, tracks A–D share no other edges. The master graph filtered to P1 shows it.

---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: edge_confidence
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/pipeline/edge-confidence.ts
related_files:
  - src/pipeline/edge-confidence.ts
status: draft
---

## Executive Summary

`edge-confidence.ts` is the pure projection from graph resolver provenance to four ordered confidence tiers: exact, strong, heuristic, and inferred. It does not resolve edges or judge semantic correctness; it labels how conclusively an existing edge was derived and supplies ranking/filter helpers [ref](src/pipeline/edge-confidence.ts).

## Audience and Intent

Graph, MCP, impact, rename, and UI consumers should use this contract to display or filter provenance consistently. Maintainers adding a resolution status or approximate reason must update this single classifier and its exhaustive tests rather than inventing consumer-local trust rules.

## Architecture / Behavior

Resolved edges are exact unless their evidence is provisional or their reason is `field_based_acg`, both of which force heuristic. Deterministically classified external, builtin, type-only, and dynamic edges are strong. Unresolved, ambiguous, and stale edges are inferred. Unknown or absent statuses fail closed to inferred [ref](src/pipeline/edge-confidence.ts).

Ranks run from exact 3 through inferred 0; unknown tiers rank -1. Minimum-confidence comparison is inclusive. An absent or unknown threshold acts as no filter, while an unknown candidate tier fails every recognized threshold [ref](src/pipeline/edge-confidence.ts).

## Source of Truth

This module is authoritative for the confidence tier vocabulary, ordering, status/reason/evidence projection, and threshold semantics. It retains no state and performs no I/O. Runtime configuration and persistent state: **NONE** [ref](src/pipeline/edge-confidence.ts).

`edge-confidence.test.ts` backs the full status taxonomy, determinism, reason override, rank ordering, and inclusive thresholds. `call-resolution-acg.test.ts` specifically pins the never-exact ACG invariant [ref](__tests__/pipeline/edge-confidence.test.ts) [ref](__tests__/pipeline/call-resolution-acg.test.ts).

## Public API / Contracts

- `EdgeConfidenceTier` is `'exact' | 'strong' | 'heuristic' | 'inferred'` [ref](src/pipeline/edge-confidence.ts#EdgeConfidenceTier).
- `EDGE_CONFIDENCE_TIERS` is the frozen descending-provenance sequence [ref](src/pipeline/edge-confidence.ts#EDGE_CONFIDENCE_TIERS).
- `confidenceRank` maps recognized tiers to 3..0 and unknown strings to -1 [ref](src/pipeline/edge-confidence.ts#confidenceRank).
- `classifyEdgeConfidence` deterministically maps status, optional reason, and optional evidence confidence to one tier [ref](src/pipeline/edge-confidence.ts#classifyEdgeConfidence).
- `meetsMinConfidence` applies an inclusive threshold with absent/unknown thresholds treated as no filter [ref](src/pipeline/edge-confidence.ts#meetsMinConfidence).

## Dependencies

Runtime imports and external packages: **NONE**. The implementation uses only string comparison, frozen arrays, and sets [ref](src/pipeline/edge-confidence.ts).

## Risks & Edge Cases

- Unknown thresholds intentionally pass everything. Callers that accept unvalidated user input must validate it separately if a typo should be an error [ref](src/pipeline/edge-confidence.ts).
- A new resolution status silently becomes inferred until added to the taxonomy. This is fail-safe for trust, but may hide rollout incompleteness without test updates [ref](src/pipeline/edge-confidence.ts).
- `field_based_acg` is the sole reason-based guard. Other future approximate reasons will be exact on a resolved edge unless they also carry provisional evidence or are explicitly added [ref](src/pipeline/edge-confidence.ts).
- The frozen array prevents structural mutation, but the exported TypeScript type alone does not validate arbitrary runtime strings [ref](src/pipeline/edge-confidence.ts).

## Validation Checklist

- [x] Verified all five indexed exports and declaration anchors.
- [x] Traced every classifier and threshold branch.
- [x] Reviewed the taxonomy and ACG-focused suites.
- [x] Confirmed purity and absence of configuration/state.


---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: impact_simulator
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/context/impact-simulator.ts
related_files:
  - src/context/impact-simulator.ts
status: draft
---

## Executive Summary

`impact-simulator.ts` traverses incoming dependency-graph edges to estimate the blast radius of changing one element. It classifies affected nodes by BFS depth, assigns proximity scores, summarizes severity/risk/modules/mitigations, and caches results by element and requested maximum depth [ref](src/context/impact-simulator.ts).

## Audience and Intent

Change-planning, breaking-change, and analysis maintainers should use this as a structural dependency signal. It assumes graph direction means source depends on target and treats every incoming edge kind alike; results are not runtime execution proofs.

## Architecture / Behavior

Blast calculation verifies the source node, then breadth-first walks `edgesByTarget`, deduplicating nodes globally. Depth 1 is direct, 2–3 transitive, and 4+ secondary up to the default depth 5. Each impact also receives a separately computed list of downstream dependents within its remaining depth [ref](src/context/impact-simulator.ts).

Severity uses total unique impacted nodes (5/20/50 thresholds). Risk caps direct/transitive/secondary contributions at 60/30/10. Summaries derive top-level path modules, mitigation text, and a count-oriented cascade chain. Cached objects include the first run's elapsed milliseconds [ref](src/context/impact-simulator.ts).

## Source of Truth

This class is authoritative for blast traversal, depth bands, impact/risk/severity formulas, mitigation text, summaries, and cache keys. The injected graph maps/edges are authoritative for topology. Runtime configuration/persistent storage: **NONE** [ref](src/context/impact-simulator.ts).

`context/context-live-four.test.ts` backs incoming-edge direction, direct/transitive classification, severity/risk, unknown IDs, caching, and module summaries [ref](__tests__/context/context-live-four.test.ts).

## Public API / Contracts

- `ElementImpact` describes one affected graph node, depth band/score, dependent count, and affected IDs [ref](src/context/impact-simulator.ts#ElementImpact).
- `BlastRadius` contains categorized impacts, total, severity, risk, and elapsed time [ref](src/context/impact-simulator.ts#BlastRadius).
- `ImpactSummary` is the report-oriented modules/mitigations/cascade projection [ref](src/context/impact-simulator.ts#ImpactSummary).
- `ImpactSimulator` exposes blast/summary calculation plus cache lifecycle/statistics [ref](src/context/impact-simulator.ts#ImpactSimulator).

## Dependencies

External runtime imports: **NONE**. Callers inject a graph with nodes, edges, and source/target adjacency maps [ref](src/context/impact-simulator.ts).

## Risks & Edge Cases

- Cached `BlastRadius` objects/arrays are returned by reference and never invalidated when the injected graph mutates [ref](src/context/impact-simulator.ts).
- `simulationTime` makes fresh output time-dependent and becomes stale telemetry on cache hits [ref](src/context/impact-simulator.ts).
- `totalImpactedFiles` is actually the count of extracted first path segments. Absolute POSIX paths yield an empty first segment and Windows paths yield drive letters, so it is neither a robust module nor file count [ref](src/context/impact-simulator.ts).
- Every impacted node launches another BFS for `affectedElements`, making dense/large blast calculations substantially more expensive than the main traversal [ref](src/context/impact-simulator.ts).
- Edge types/weights are ignored; import, call, test, and other incoming relationships contribute equally [ref](src/context/impact-simulator.ts).
- Negative depth quietly yields no impacts; no argument validation exists [ref](src/context/impact-simulator.ts).

## Validation Checklist

- [x] Verified all four indexed exports and anchors.
- [x] Traced BFS direction, categorization, secondary traversals, scoring, summary, and cache.
- [x] Reviewed the focused live-context tests.
- [x] Distinguished structural risk from semantic/runtime impact.


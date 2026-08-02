---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: metrics_delta
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/map/metrics-delta.ts
related_files:
  - src/map/metrics-delta.ts
status: draft
---

## Executive Summary

`metrics-delta.ts` purely compares two map-metrics snapshots as five independent family deltas, preserving scalar, status-record, and ranked-membership changes without producing a composite score [ref](src/map/metrics-delta.ts).

## Audience and Intent

Agents and map-metrics maintainers use this module to verify a refactor's measured before/after effects without allowing improvement in one family to conceal regression in another. Direction labels describe movement of selected concern scalars, not operator verdicts.

## Architecture / Behavior

Flat numeric records are unioned by key, finite values normalized, and emitted in sorted order. Rankings are compared by first-seen file identity rather than array position, producing entered, left, and rank-shift lists. Test linkage, documentation, and unresolved references derive direction from one concern scalar; size/dependency rankings remain direction-neutral [ref](src/map/metrics-delta.ts).

A missing family on either side becomes no-data with a warning. Schema mismatches are disclosed but comparable family fields are still diffed. The function has no I/O, clock, randomness, or aggregate score [ref](src/map/metrics-delta.ts).

## Source of Truth

This module is authoritative for map-metrics before/after delta decomposition, selected direction scalars, deterministic ordering, ranking identity semantics, schema warnings, and no-data behavior. `engineering-metrics.ts` owns snapshot schemas and measurements [ref](src/map/metrics-delta.ts).

Runtime configuration and persistent state: **NONE**. `metrics-delta.test.ts` covers determinism, zero/change directions, per-status keys, ranking membership/reordering, the no-composite constraint, mixed movements, schema mismatch, and missing data [ref](__tests__/map/metrics-delta.test.ts).

## Public API / Contracts

- `ScalarDelta` records before, after, and signed change [ref](src/map/metrics-delta.ts#ScalarDelta).
- `SummaryDeltas` maps sorted metric keys to scalar deltas [ref](src/map/metrics-delta.ts#SummaryDeltas).
- `RankingChange` records entered, left, and rank-shifted file identities [ref](src/map/metrics-delta.ts#RankingChange).
- `FamilyDirection` is improved, regressed, or unchanged provenance [ref](src/map/metrics-delta.ts#FamilyDirection).
- `MetricsFamilyDelta` carries no-data, direction, and shape-specific deltas [ref](src/map/metrics-delta.ts#MetricsFamilyDelta).
- `MapMetricsDelta` is the five-family result with schema provenance and warnings [ref](src/map/metrics-delta.ts#MapMetricsDelta).
- `diffMapMetrics` computes the deterministic decomposed comparison [ref](src/map/metrics-delta.ts#diffMapMetrics).

## Dependencies

- `engineering-metrics.ts` supplies the input snapshot type only [ref](src/map/metrics-delta.ts).

## Risks & Edge Cases

- When a family exists but a numeric field is absent or non-finite, it is treated as zero rather than family-level no-data [ref](src/map/metrics-delta.ts).
- Direction reflects only one selected concern scalar per concern family; other simultaneous changes do not affect it [ref](src/map/metrics-delta.ts).
- Schema-mismatched records are still compared field-by-field, so consumers must honor the warning [ref](src/map/metrics-delta.ts).
- Duplicate file identities in a ranking use the first occurrence and hide later duplicates [ref](src/map/metrics-delta.ts).
- Rank changes can reflect a list's truncation boundary as well as true whole-corpus movement; truncation flags are not part of this output [ref](src/map/metrics-delta.ts).

## Validation Checklist

- [x] Verified all seven indexed exports and declaration anchors.
- [x] Traced all family shapes, direction rules, schema mismatch, and no-data handling.
- [x] Reviewed determinism, no-composite, ranking, and missing-data coverage.
- [x] Documented field-level zeroing, selected-scalar, duplicate, and truncation limits.


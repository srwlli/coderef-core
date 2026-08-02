---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: breaking_change_detector
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/context/breaking-change-detector/index.ts
related_files:
  - src/context/breaking-change-detector/index.ts
status: draft
---

## Executive Summary

`breaking-change-detector/index.ts` is the modular facade and orchestration class for comparing exported element signatures between git refs or a ref and the worktree. It delegates signature comparison, impacted-call lookup, severity/confidence assessment, and migration hints to focused sibling modules and returns a timestamped `BreakingChangeReport` [ref](src/context/breaking-change-detector/index.ts).

## Audience and Intent

API-diff, CLI, refactoring-safety, and MCP maintainers should use this sheet to distinguish the orchestration contract from the sibling algorithms it re-exports. The detector is intended for signature compatibility, not endpoint-contract diffing or arbitrary source-text diffing.

## Architecture / Behavior

`detectChanges` obtains changed elements, returns a clean empty report when none exist, and otherwise extracts before/after signature maps per changed file. Missing signatures and unchanged signatures are skipped. Breaking versus potentially breaking counts come from the signature comparator; impacted call sites feed severity and migration hints; report confidence is computed across emitted changes [ref](src/context/breaking-change-detector/index.ts).

Worktree mode reads the after signature from the current file; otherwise the optional head ref defaults to `HEAD`. All errors are wrapped with a stable detector prefix. The injected analyzer service remains a structural compatibility seam, while the impact simulator participates in severity calculation [ref](src/context/breaking-change-detector/index.ts).

## Source of Truth

This index module is authoritative for the detector facade, dependency injection, report assembly, and the package-level re-export surface. `types.ts`, `signature-comparator.ts`, `impact-assessor.ts`, `diff-analyzer.ts`, and `hint-generator.ts` are authoritative for their respective contracts and algorithms [ref](src/context/breaking-change-detector/index.ts).

Runtime configuration/state: **NONE** beyond constructor dependencies and call arguments. Reports contain current timestamps/durations. `context/__tests__/breaking-change-detector.test.ts` backs comparator, call-site, confidence, scenarios, report shape, errors, and performance through the modular facade [ref](src/context/__tests__/breaking-change-detector.test.ts).

## Public API / Contracts

- `AnalyzerServiceLike` is the structural compatibility contract used for dependent-call lookup [ref](src/context/breaking-change-detector/index.ts#AnalyzerServiceLike).
- `BreakingChangeDetector` exposes `detectChanges(baseRef, headRef?, useWorktree?, maxDepth?)` and is also the default export [ref](src/context/breaking-change-detector/index.ts#BreakingChangeDetector).

The file additionally re-exports the sibling report types and comparison/assessment/diff/hint functions. The current live index does not project those forwarding exports; renamed/re-export projection is tracked by `TKT-AF2FYQ` [ref](src/context/breaking-change-detector/index.ts).

## Dependencies

- `impact-simulator.ts` supplies blast-radius-aware severity input [ref](src/context/breaking-change-detector/index.ts).
- `types.ts` supplies signatures, call sites, hints, blast radius, and report shapes [ref](src/context/breaking-change-detector/index.ts).
- `signature-comparator.ts`, `impact-assessor.ts`, `diff-analyzer.ts`, and `hint-generator.ts` own all specialized analysis [ref](src/context/breaking-change-detector/index.ts).

## Risks & Edge Cases

- The `maxDepth` argument is accepted but never read or forwarded. Callers cannot currently constrain impact traversal through this surface [ref](src/context/breaking-change-detector/index.ts).
- `nonBreakingCount` is the number of changed elements not counted breaking/potentially-breaking, including elements skipped because a signature was absent or no signature change was returned; it is not solely a count of proven compatible changes [ref](src/context/breaking-change-detector/index.ts).
- Signature extraction is repeated per changed element even when multiple elements share a file. Large diffs can reread/reparse the same before and after file many times [ref](src/context/breaking-change-detector/index.ts).
- Reports are time-dependent through `analyzedAt` and `analysisTime` [ref](src/context/breaking-change-detector/index.ts).
- The analyzer dependency is documented as a compatibility seam; its optional `analyze` member is not used by this class [ref](src/context/breaking-change-detector/index.ts).

## Validation Checklist

- [x] Verified both live-index exports and anchors.
- [x] Traced empty, worktree, ref-to-ref, classified, skipped, and failure paths.
- [x] Reviewed the direct detector suite and the modular dependency boundaries.
- [x] Identified the unconsumed `maxDepth` contract.


---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: git_history
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/map/git-history.ts
related_files:
  - src/map/git-history.ts
status: draft
---

## Executive Summary

`git-history.ts` is the map pipeline's isolated impure boundary for extracting bounded Git churn, co-change, and per-file authorship facts into a deterministic, serializable windowed record [ref](src/map/git-history.ts).

## Audience and Intent

Map behavioral/ownership analytics maintainers use this extractor before pure projection. It deliberately returns declared no-data reasons rather than throwing when a repository, Git executable, history, or extraction is unavailable.

## Architecture / Behavior

The pure parser consumes delimiter-framed `git log --numstat` text, normalizes rename paths to their new identity, counts distinct per-commit file touches, accumulates added/deleted lines, bounds O(n²) co-change expansion, captures optional author/timestamp fields, and explicitly sorts all outputs [ref](src/map/git-history.ts).

The impure extractor probes work-tree status, HEAD, and shallow-clone state, then runs a no-merge bounded log with author metadata. It stamps the resolved window and maps every failure class to a stable degradation reason [ref](src/map/git-history.ts).

## Source of Truth

This module is authoritative for Git command shape, extraction bounds/provenance, numstat parsing, rename normalization, churn/co-change/authorship aggregation, sorting, and degradation reasons. Git owns commit truth; downstream behavioral and ownership modules own interpretation [ref](src/map/git-history.ts).

Runtime configuration is `ExtractGitHistoryOptions`; persistent state: **NONE**. `git-history.test.ts` covers pure parsing, binary edits, renames, normalization, pair caps, ordering, authorship, non-repo degradation, and live extraction from a temporary repository [ref](__tests__/map/git-history.test.ts).

## Public API / Contracts

- `GitFileChurn` records per-file commit and line churn [ref](src/map/git-history.ts#GitFileChurn).
- `GitCoChangePair` records an ordered file pair and shared-commit count [ref](src/map/git-history.ts#GitCoChangePair).
- `GitFileAuthorCount` records one author's per-file commit contribution [ref](src/map/git-history.ts#GitFileAuthorCount).
- `GitFileAuthorship` records sorted authorship, author count, and latest touch [ref](src/map/git-history.ts#GitFileAuthorship).
- `GitHistoryWindow` declares extraction bounds, count, HEAD, and shallow status [ref](src/map/git-history.ts#GitHistoryWindow).
- `GitHistory` bundles windowed churn, coupling, and optional authorship [ref](src/map/git-history.ts#GitHistory).
- `GitHistoryResult` is either history or a degradation reason [ref](src/map/git-history.ts#GitHistoryResult).
- `ExtractGitHistoryOptions` configures commit/time and co-change bounds [ref](src/map/git-history.ts#ExtractGitHistoryOptions).
- `GIT_DEGRADE_NOT_A_REPO` identifies a non-repository target [ref](src/map/git-history.ts#GIT_DEGRADE_NOT_A_REPO).
- `GIT_DEGRADE_GIT_ABSENT` identifies a missing Git executable [ref](src/map/git-history.ts#GIT_DEGRADE_GIT_ABSENT).
- `GIT_DEGRADE_EMPTY_HISTORY` identifies an empty or empty-window history [ref](src/map/git-history.ts#GIT_DEGRADE_EMPTY_HISTORY).
- `GIT_DEGRADE_EXTRACTION_FAILED` identifies a failed log extraction [ref](src/map/git-history.ts#GIT_DEGRADE_EXTRACTION_FAILED).
- `parseGitLogNumstat` purely converts framed numstat text into aggregates [ref](src/map/git-history.ts#parseGitLogNumstat).
- `extractGitHistory` performs bounded Git discovery/extraction without throwing [ref](src/map/git-history.ts#extractGitHistory).

## Dependencies

- Node child-process invokes Git without a shell [ref](src/map/git-history.ts).
- Filesystem/path detect a shallow repository marker [ref](src/map/git-history.ts).
- Path normalization aligns Git paths with graph identities [ref](src/map/git-history.ts).

## Risks & Edge Cases

- Author names are verbatim display names, not stable identities; aliases and collisions split or merge ownership [ref](src/map/git-history.ts).
- Rename normalization maps each rename row to the new path, but commits before the rename remain under the old path and can split history [ref](src/map/git-history.ts).
- Invalid numeric numstat fields silently contribute zero lines [ref](src/map/git-history.ts).
- A commit above the file cap still affects churn/authorship but contributes no co-change pairs, so coupling is intentionally incomplete [ref](src/map/git-history.ts).
- Option values are not range-validated; negative caps suppress pairs and negative maximum counts behave as unbounded [ref](src/map/git-history.ts).
- Output above the 256 MB child-process buffer degrades to extraction failure [ref](src/map/git-history.ts).

## Validation Checklist

- [x] Verified all fourteen indexed exports and declaration anchors.
- [x] Traced pure parsing, process execution, window stamping, and every degradation branch.
- [x] Reviewed fixture and live temporary-repository coverage.
- [x] Documented identity, rename-lineage, cap, option, and buffer limits.


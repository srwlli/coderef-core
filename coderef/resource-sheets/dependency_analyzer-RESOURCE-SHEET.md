---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: dependency_analyzer
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/analyzer/dependency-analyzer.ts
related_files:
  - src/analyzer/dependency-analyzer.ts
status: draft
---

## Executive Summary

`dependency-analyzer.ts` builds a dependency-health report from `package.json`, npm registry metadata, `npm audit`, source import search, license allow/deny lists, and peer information. It classifies every direct/dev dependency, groups issues, computes a health score/level, and provides a null-on-failure convenience entry point [ref](src/analyzer/dependency-analyzer.ts).

## Audience and Intent

Health-report, CLI, and MCP maintainers should use this sheet when interpreting dependency findings or changing external-command behavior. Results depend on npm/network/tool availability and contain heuristics; they should not be treated as a lockfile-accurate installed-version inventory or a legal determination.

## Architecture / Behavior

Analysis silently treats a missing/malformed `package.json` as no dependencies, runs `npm audit --json` with a 30-second timeout, and then analyzes merged production/dev declarations sequentially. For each dependency it queries latest version and license, searches `src/` for exact imports, extracts direct npm-audit advisories, checks limited peer presence, and assigns severity [ref](src/analyzer/dependency-analyzer.ts).

Outdated status compares the registry latest string with the semver-prefix-stripped package declaration, not the installed lockfile version. License compatibility uses fixed permissive and copyleft/proprietary substring lists; unknown licenses are assumed compatible. Severity prioritizes critical/high vulnerabilities, then unused/outdated/peer issues. Report groups drive counts and recommendations [ref](src/analyzer/dependency-analyzer.ts).

## Source of Truth

This module is authoritative for dependency-health orchestration, classification, scoring, license policy, and recommendations. Repository `package.json` supplies declared dependencies; npm CLI output supplies registry, license, and audit data. Lockfiles are not read [ref](src/analyzer/dependency-analyzer.ts).

Runtime configuration file: **NONE**. Network and executable behavior are implicit through `npm`, plus `grep`/`head` for usage detection. Direct focused tests for this analyzer: **NONE found** [ref](src/analyzer/dependency-analyzer.ts).

## Public API / Contracts

- `DependencyHealth` describes one dependency's declared/latest versions, severity, license, usage, vulnerabilities, and peers [ref](src/analyzer/dependency-analyzer.ts#DependencyHealth).
- `SecurityVulnerability` is the normalized direct advisory shape [ref](src/analyzer/dependency-analyzer.ts#SecurityVulnerability).
- `DependencyHealthReport` aggregates dependency counts, health, issue groups/counts, and recommendations [ref](src/analyzer/dependency-analyzer.ts#DependencyHealthReport).
- `DependencyAnalyzer` stores project/audit state and exposes asynchronous comprehensive `analyze()` [ref](src/analyzer/dependency-analyzer.ts#DependencyAnalyzer).
- `analyzeDependencyHealth` constructs the analyzer and returns `null` after logging a top-level failure [ref](src/analyzer/dependency-analyzer.ts#analyzeDependencyHealth).

## Dependencies

- Node `fs/promises` and `path` read the project manifest [ref](src/analyzer/dependency-analyzer.ts).
- Node `child_process.exec` via `util.promisify` launches `npm audit`, `npm view`, and the source-search pipeline [ref](src/analyzer/dependency-analyzer.ts).
- `utils/logger.ts` records failures from the convenience API [ref](src/analyzer/dependency-analyzer.ts).
- External commands/services are npm, its configured registry, and Unix-like `grep`/`head` [ref](src/analyzer/dependency-analyzer.ts).

## Risks & Edge Cases

- The health-score reducer uses `weights[d.severity] || 50`; the intended critical weight is `0`, which is falsy and becomes `50`. **[inference]** Critical dependencies therefore contribute a fair score rather than zero [ref](src/analyzer/dependency-analyzer.ts).
- Usage detection shells out to `grep ... | head` with POSIX redirection. It is unavailable in a default Windows shell and returns false on any command failure, classifying dependencies as unused [ref](src/analyzer/dependency-analyzer.ts).
- Usage matching requires an exact package string and can miss subpath imports (especially scoped packages), dynamic imports, non-`src` code, config/plugins, binaries, and runtime-only dependencies [ref](src/analyzer/dependency-analyzer.ts).
- “Installed version” is actually the `package.json` range. Latest version is queried twice per dependency and compared to that declaration rather than a lockfile/node_modules resolution [ref](src/analyzer/dependency-analyzer.ts).
- A missing or malformed manifest yields a 100/excellent empty report rather than explicit no-data [ref](src/analyzer/dependency-analyzer.ts).
- Unknown licenses are assumed compatible, while compound SPDX expressions are evaluated by substring rather than expression semantics [ref](src/analyzer/dependency-analyzer.ts).
- Peer data is read from an npm-audit vulnerability entry, not installed package manifests; dependencies without an audit entry are always peer-satisfied [ref](src/analyzer/dependency-analyzer.ts).
- Analysis is sequential and runs up to three external commands per dependency, so large manifests can be slow and network-sensitive [ref](src/analyzer/dependency-analyzer.ts).

## Validation Checklist

- [x] Verified all five indexed exports and anchors.
- [x] Traced manifest, audit, registry, usage, license, peer, severity, score, and recommendation paths.
- [x] Confirmed the absence of focused tests and runtime configuration.
- [x] Distinguished declared versions and heuristic findings from installed/security truth.


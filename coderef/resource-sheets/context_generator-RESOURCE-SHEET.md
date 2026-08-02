---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: context_generator
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/pipeline/generators/context-generator.ts
related_files:
  - src/pipeline/generators/context-generator.ts
status: draft
---

## Executive Summary

`context-generator.ts` turns a completed `PipelineState` into `.coderef/context.json` and a human-readable `context.md`. It combines repository statistics, entry points, complexity-driven criticality, async/test-gap heuristics, a reduced call graph, project classification, dependency risk, architecture-pattern inference, configuration analysis, documentation quality, and recommended work priorities [ref](src/pipeline/generators/context-generator.ts).

## Audience and Intent

Pipeline, reporting, planning, and MCP maintainers should use this sheet when changing the generated project-context contract or interpreting its recommendations. Several fields are explicitly heuristic: they are planning signals, not measured coverage, package-registry truth, security audit output, or architectural verdicts.

## Architecture / Behavior

Generation first tries to read `reports/complexity/summary.json`; missing or malformed data silently falls back to a parameter-count/type heuristic. It then builds a single `ProjectContext`, writes pretty JSON, renders the same object plus incremental metadata to Markdown, and logs only in verbose mode [ref](src/pipeline/generators/context-generator.ts).

The context builder derives totals, normalizes entry-point paths, ranks non-test functions using complexity, inbound call counts, name/file orchestrator hints, and entry-point hints, and caps critical functions at 20. Async patterns are capped at 30. “Test gaps” are the top 35 non-test functions ranked by complexity and orchestrator-like naming; this routine does not inspect tests or test linkage [ref](src/pipeline/generators/context-generator.ts).

Dependent counts prefer `metadata.targetElementId`, then the edge target as an element ID, then a unique same-file name, then a globally unique name. The reduced call graph retains critical functions only, labels calls sync/async/callback, and searches for cycles to depth 10. Health, risk heat, and work priorities are deterministic functions of those capped lists, aside from generated timestamps [ref](src/pipeline/generators/context-generator.ts).

Technology detection uses file-path substrings and element kinds. Dependency analysis reads `package.json`, detects two-node import cycles, heuristically flags declared-but-unseen production imports, and assigns a score; it does not query registries or run a vulnerability scanner. Architecture inference recognizes layered, feature-based, MVC/MVVM, repository, hexagonal, and microservices-like naming/structure, then estimates coupling from graph density and cohesion from pattern confidence/module count [ref](src/pipeline/generators/context-generator.ts).

Markdown rendering includes statistics/incremental performance, classification, architecture, available configuration sections, entry points, critical functions/calls, dependency risks, async patterns, test-gap candidates, module structure, executive/risk/work-order sections, documentation quality, technology stack, and a fresh ISO generated timestamp [ref](src/pipeline/generators/context-generator.ts).

## Source of Truth

This generator is authoritative for `context.json` / `context.md` composition, heuristics, caps, scores, and Markdown layout. `PipelineState` is authoritative for scanned files, sources, elements, graph, and incremental metadata. The imported entry detector, classifier, config analyzer, and docs analyzer own their specialized projections [ref](src/pipeline/generators/context-generator.ts).

Optional backing data is `reports/complexity/summary.json`; absent data is replaced by estimates. Repository `package.json`, common configuration files, documentation files, and `STANDARDS`-independent source structure are analyzed by delegated modules. Other runtime configuration: **NONE** [ref](src/pipeline/generators/context-generator.ts).

`generators/context-generator.test.ts` backs JSON/Markdown emission. `generators/root-cause-alignment.test.ts` backs indexed dependent-count construction and duplicate-name target resolution. Focused tests for the many health, risk, dependency, architecture, documentation-rendering, and cycle-detection branches: **NONE found** [ref](__tests__/generators/context-generator.test.ts) [ref](__tests__/generators/root-cause-alignment.test.ts).

## Public API / Contracts

- `CallGraphNode` identifies a critical function with file, complexity, and dependent count [ref](src/pipeline/generators/context-generator.ts#CallGraphNode).
- `CallGraphEdge` connects reduced-graph node IDs with a sync/async/callback label [ref](src/pipeline/generators/context-generator.ts#CallGraphEdge).
- `CallGraph` contains critical nodes, edges, and detected circular chains [ref](src/pipeline/generators/context-generator.ts#CallGraph).
- `ExecutiveSummary` carries the 0–100 health score/rating plus insights and recommendations [ref](src/pipeline/generators/context-generator.ts#ExecutiveSummary).
- `RiskHeatMap` describes file-level estimated complexity, coverage, risk score, and band [ref](src/pipeline/generators/context-generator.ts#RiskHeatMap).
- `WorkOrderPriority` describes ranked testing/refactoring/documentation/security/performance work [ref](src/pipeline/generators/context-generator.ts#WorkOrderPriority).
- `DependencyRisk` describes a heuristic dependency/import risk and optional remediation metadata [ref](src/pipeline/generators/context-generator.ts#DependencyRisk).
- `DependencyRiskAnalysis` aggregates dependency counts, risk score/band, risks, and type counts [ref](src/pipeline/generators/context-generator.ts#DependencyRiskAnalysis).
- `ArchitecturePattern` records a recognized pattern, confidence, evidence, and locations [ref](src/pipeline/generators/context-generator.ts#ArchitecturePattern).
- `ArchitectureAnalysis` aggregates patterns, organization, coupling/cohesion, and recommendations [ref](src/pipeline/generators/context-generator.ts#ArchitectureAnalysis).
- `ProjectContext` is the complete JSON artifact contract [ref](src/pipeline/generators/context-generator.ts#ProjectContext).
- `PipelineContextGenerator` exposes `generate(state, outputDir)` for JSON and Markdown emission [ref](src/pipeline/generators/context-generator.ts#PipelineContextGenerator).

The source also provides `ContextGenerator` as a renamed alias of `PipelineContextGenerator`; the current live index does not project renamed re-exports, tracked separately as `TKT-AF2FYQ` [ref](src/pipeline/generators/context-generator.ts).

## Dependencies

- Node `fs/promises` and `path` read optional inputs and write both artifacts [ref](src/pipeline/generators/context-generator.ts).
- `pipeline/types.ts` and `types/types.ts` supply pipeline and element state [ref](src/pipeline/generators/context-generator.ts).
- `entry-detector.ts` and `project-classifier.ts` supply entry points and project intent [ref](src/pipeline/generators/context-generator.ts).
- `config-analyzer.ts` and `docs-analyzer.ts` inspect repository configuration and documentation [ref](src/pipeline/generators/context-generator.ts).
- `path-normalize.ts` stabilizes emitted relative separators; `logger.ts` supplies verbose completion output [ref](src/pipeline/generators/context-generator.ts).

## Risks & Edge Cases

- “Test gaps” do not inspect tests. Every eligible non-test function is a candidate, so coverage wording and the derived health/risk/work recommendations can overstate missing coverage [ref](src/pipeline/generators/context-generator.ts).
- Complexity summary entries are keyed only by element name. Duplicate names across files/scopes share one value, as do later critical/test-gap deduplication maps [ref](src/pipeline/generators/context-generator.ts).
- In `extractCallGraph`, the outer loop visits each graph edge and then replays every outgoing edge for that source. **[inference]** A source with `k` edges can append each qualifying reduced edge `k` times, inflating edge counts and cycle adjacency [ref](src/pipeline/generators/context-generator.ts).
- Cycle search globally marks a node during its first DFS and caps depth at 10. Alternate paths and longer cycles can be missed; cycle keys are not rotation-normalized [ref](src/pipeline/generators/context-generator.ts).
- Dependency “outdated” detection does not consult a registry, and its major-zero condition depends on whether a semver prefix is present. Unused detection considers only element import metadata and skips dev dependencies [ref](src/pipeline/generators/context-generator.ts).
- Technology/framework detection uses path substrings; a filename containing `route`, `next`, or `tsx` can produce false positives independent of imports or runtime configuration [ref](src/pipeline/generators/context-generator.ts).
- Coupling divides all graph edges by a complete directed-graph maximum across elements; in typical sparse graphs the thresholds make “high” difficult to reach and mix edge kinds [ref](src/pipeline/generators/context-generator.ts).
- Architecture analysis sorts `detectedPatterns` in place to select the primary pattern, so emitted pattern order becomes confidence order rather than detector order [ref](src/pipeline/generators/context-generator.ts).
- `context.md` embeds `new Date().toISOString()`, so repeated generation from identical pipeline state is not byte-identical [ref](src/pipeline/generators/context-generator.ts).

## Validation Checklist

- [x] Read all 2,284 source lines, including every analyzer and renderer branch.
- [x] Verified all twelve live-index exports and declaration anchors.
- [x] Traced optional complexity input, delegated analyzers, JSON/Markdown writes, and caps.
- [x] Reviewed direct generator and root-cause-alignment tests and named missing focused coverage.


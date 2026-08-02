---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: framework_registry
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/scanner/framework-registry.ts
related_files:
  - src/scanner/framework-registry.ts
status: draft
---

## Executive Summary

`framework-registry.ts` defines the plug-in contract for framework-specific route detection and exposes a process-global registry instance. Detectors are keyed by name; registration replaces an existing same-name detector, single detection returns the first match in insertion order, and multi-detection returns every match [ref](src/scanner/framework-registry.ts).

## Audience and Intent

Scanner, plug-in, and route-detector maintainers should implement `FrameworkDetector`, register it during framework setup, and treat registry order as precedence when using first-match detection. Tests should clear or restore the global singleton when mutating it.

## Architecture / Behavior

The internal registry holds a `Map<string, FrameworkDetector>`. It supports register, unregister, first-match `detect`, all-match `detectAll`, ordered name listing, membership checks, and clear. Detector exceptions are not caught, so a failing detector stops dispatch [ref](src/scanner/framework-registry.ts).

## Source of Truth

This module is authoritative for the detector/result contracts and registry dispatch semantics. `register-frameworks.ts` is authoritative for the default detector set and order; `RouteMetadata` owns normalized route data [ref](src/scanner/framework-registry.ts).

Configuration file and persistent storage: **NONE**. State lives in the exported process-global singleton. The framework-detector suite backs the seven-detector barrel, registration integrity, and dispatch reachability [ref](__tests__/analyzer/framework-detectors.test.ts).

## Public API / Contracts

- `FrameworkDetectionResult` combines framework name, normalized route metadata, element name, and function/handler/route kind [ref](src/scanner/framework-registry.ts#FrameworkDetectionResult).
- `FrameworkDetector` requires a stable name and synchronous `detect(file, content)` returning a result or `null` [ref](src/scanner/framework-registry.ts#FrameworkDetector).

The source-level runtime export is `frameworkRegistry` (also the default export), whose concrete class remains private. The live index currently omits that exported constructed constant [ref](src/scanner/framework-registry.ts).

## Dependencies

- `types/types.ts` supplies `RouteMetadata` [ref](src/scanner/framework-registry.ts).
- JavaScript `Map` supplies ordered detector state. External packages: **NONE** [ref](src/scanner/framework-registry.ts).

## Risks & Edge Cases

- First-match behavior depends on registration order. Re-registering an existing name replaces the value without moving its original `Map` position [ref](src/scanner/framework-registry.ts).
- The global singleton leaks mutations between consumers/tests unless explicitly cleared or restored [ref](src/scanner/framework-registry.ts).
- Detector failures are not isolated; one throw prevents later detectors from running [ref](src/scanner/framework-registry.ts).
- Duplicate logical frameworks using different names can both appear in `detectAll`; the registry performs no result deduplication [ref](src/scanner/framework-registry.ts).
- The current live index exposes the two interfaces but omits the runtime singleton export, limiting index-backed API discovery [ref](src/scanner/framework-registry.ts).

## Validation Checklist

- [x] Verified both live-index interface exports and anchors.
- [x] Read every registry operation and dispatch branch.
- [x] Reviewed default-registration and dispatch tests.
- [x] Named global state, ordering, and exception semantics.


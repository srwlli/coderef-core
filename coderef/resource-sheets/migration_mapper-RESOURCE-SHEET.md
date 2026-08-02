---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: migration_mapper
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/validator/migration-mapper.ts
related_files:
  - src/validator/migration-mapper.ts
status: draft
---

## Executive Summary

`migration-mapper.ts` validates route-migration configuration, applies explicit or regular-expression path rewrites, reports coverage and unmapped/deprecated calls, and translates parameter shapes between Flask, Express, FastAPI, and NestJS. Its path mapper is stateless; `SemanticParameterMapper` is the only stateful surface and owns an in-memory list of explicit parameter mappings [ref](src/validator/migration-mapper.ts).

## Audience and Intent

Migration, route-validation, and frontend-update maintainers should use this sheet to understand mapping precedence, confidence values, coverage semantics, and the framework-specific parameter conversions. Callers must validate untrusted configuration before applying it because the lower-level mapping functions deliberately tolerate malformed patterns.

## Architecture / Behavior

Configuration validation composes four checks: required top-level/metadata fields, regex construction, empty/conflicting path targets, and overlap between deprecated and added paths. `applyMappings` tries an exact dictionary entry first (confidence 100), then the first matching regex (confidence 80), and otherwise returns the unchanged path as unmapped (confidence 0) [ref](src/validator/migration-mapper.ts).

Coverage counts every positive-confidence transformation as migrated, computes newly added routes by comparing new paths with the old-path set, and rounds percentages to one decimal. Prefix reporting groups on the first two non-empty path segments. Unmapped-call reporting aligns calls and transformations by array index; deprecated-call reporting performs exact, case-sensitive path membership [ref](src/validator/migration-mapper.ts).

`SemanticParameterMapper` first looks for an explicit mapping matching parameter name plus source and target frameworks. If absent, it recognizes Flask `<type:name>`, Express `:name`, or FastAPI `{name[:type]}` syntax, converts known types through hardcoded framework tables, and optionally infers a FastAPI/Pydantic type. It also maps a small set of Flask-to-FastAPI and Express-to-NestJS validation constraints, supplies framework-specific location syntax, and supports replace-on-add, copy-on-read, and clear operations [ref](src/validator/migration-mapper.ts).

## Source of Truth

This module is authoritative for migration validation rules, path rewrite precedence/confidence, coverage formulas, framework pattern recognition, and semantic parameter conversion. `MigrationMapping` and `MigrationCoverage` in `types/types.ts` are authoritative for shared input/output shapes [ref](src/validator/migration-mapper.ts).

Runtime configuration file: **NONE**. Type converters, Pydantic names, validation conversions, and location syntax are hardcoded. The directly colocated `migration-mapper.test.ts` suite backs validation, mapping precedence, malformed-regex tolerance, parameter inference, constraint conversion, and mapping lifecycle [ref](src/validator/migration-mapper.test.ts).

## Public API / Contracts

- `validateMigrationConfig` returns `{ valid, errors }` after aggregating all applicable validators [ref](src/validator/migration-mapper.ts#validateMigrationConfig).
- `checkRequiredFields` checks `version`, `name`, `mappings`, `metadata.source`, and `metadata.target` [ref](src/validator/migration-mapper.ts#checkRequiredFields).
- `validateRegexPatterns` reports missing fields and invalid regular expressions by array index [ref](src/validator/migration-mapper.ts#validateRegexPatterns).
- `detectPathConflicts` reports empty targets and attempts duplicate-key detection on the supplied record [ref](src/validator/migration-mapper.ts#detectPathConflicts).
- `checkDeprecatedAddedOverlap` returns an error for every deprecated path also present in the added set [ref](src/validator/migration-mapper.ts#checkDeprecatedAddedOverlap).
- `applyExplicitMapping` performs an exact record lookup and returns `null` when no truthy target exists [ref](src/validator/migration-mapper.ts#applyExplicitMapping).
- `applyPatternMapping` returns the first regex replacement and skips malformed patterns [ref](src/validator/migration-mapper.ts#applyPatternMapping).
- `applyMappings` returns the original/transformed path, confidence, and `explicit | pattern | unmapped` rule [ref](src/validator/migration-mapper.ts#applyMappings).
- `calculateMigrationCoverage` returns totals, migrated/new counts, and a one-decimal percentage [ref](src/validator/migration-mapper.ts#calculateMigrationCoverage).
- `findUnmappedCalls` selects calls whose same-index transformation has confidence zero [ref](src/validator/migration-mapper.ts#findUnmappedCalls).
- `findDeprecatedCalls` selects calls with exact paths in the deprecated set [ref](src/validator/migration-mapper.ts#findDeprecatedCalls).
- `groupCoverageByApiPrefix` returns totals, migrated counts, and coverage per two-segment prefix [ref](src/validator/migration-mapper.ts#groupCoverageByApiPrefix).
- `SemanticParameterMapping` defines explicit source/target framework, type, location, validation, and notes metadata [ref](src/validator/migration-mapper.ts#SemanticParameterMapping).
- `SemanticParameterMapper` exposes parameter mapping, validation/location conversion, and mutable mapping-list operations [ref](src/validator/migration-mapper.ts#SemanticParameterMapper).

## Dependencies

- `types/types.ts` supplies the shared migration configuration and coverage contracts [ref](src/validator/migration-mapper.ts).
- JavaScript `RegExp`, `Set`, and record/array operations provide all runtime machinery. External runtime packages: **NONE** [ref](src/validator/migration-mapper.ts).

## Risks & Edge Cases

- JavaScript object records cannot contain two simultaneously observable identical keys. **[inference]** The `seen` branch in `detectPathConflicts` cannot detect duplicate keys once a literal or parsed JSON object has already overwritten the earlier value; it can still report empty targets [ref](src/validator/migration-mapper.ts).
- `validateRegexPatterns` rejects an empty replacement even though replacing a match with `''` is a valid regex operation. Callers cannot intentionally delete matched text through a configuration that passes validation [ref](src/validator/migration-mapper.ts).
- `applyExplicitMapping` treats an empty target as no mapping; validation is the only layer that explains why [ref](src/validator/migration-mapper.ts).
- Coverage trusts transformation array contents and length. Extra transformations can make migrated count exceed old-route count, and missing entries lower coverage without an alignment error [ref](src/validator/migration-mapper.ts).
- Prefix grouping collapses routes solely by their first two segments and preserves odd inputs such as relative or empty paths as literal groups [ref](src/validator/migration-mapper.ts).
- Pattern detection captures but does not verify the parameter name embedded in the source pattern against `paramName`; explicit mappings do require an exact name match [ref](src/validator/migration-mapper.ts).

## Validation Checklist

- [x] Verified all fourteen indexed exports and declaration anchors.
- [x] Traced validation, mapping precedence, coverage, and semantic conversion paths.
- [x] Reviewed the directly colocated unit suite.
- [x] Identified hardcoded tables and the absence of runtime configuration.


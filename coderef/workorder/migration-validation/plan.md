# Migration Validation Implementation Plan

**Workorder ID:** WO-MIGRATION-VALIDATION-001
**Version:** 1.0.0
**Status:** Planning
**Generated:** 2026-03-02T02:00:00Z
**Parent Workorder:** WO-ROUTE-VALIDATION-ENHANCEMENT-001

---

## Table of Contents

1. [Preparation](#preparation)
2. [Executive Summary](#executive-summary)
3. [Risk Assessment](#risk-assessment)
4. [Current State Analysis](#current-state-analysis)
5. [Key Features](#key-features)
6. [Task ID System](#task-id-system)
7. [Implementation Phases](#implementation-phases)
8. [Testing Strategy](#testing-strategy)
9. [Success Criteria](#success-criteria)
10. [Implementation Checklist](#implementation-checklist)
11. [Alignment Commentary](#alignment-commentary)

---

## Preparation

### Architectural Decisions

1. **Extend existing route-validator.ts with migration mapping capabilities** rather than creating separate validator
   - **Reason:** Leverages proven validation logic, maintains single source of truth for route validation

2. **Create migration-mapper.ts as standalone module** with path transformation engine
   - **Reason:** Separation of concerns, can be tested independently, reusable for future use cases (reverse migrations, diff generation)

3. **Store migration configs as JSON schema** with patterns + explicit mappings
   - **Reason:** Enables both simple 1:1 mappings and complex regex transformations, human-editable, version-controllable

4. **Add migration report generator** that extends existing report-generator.ts
   - **Reason:** Consistent report format, reuses markdown formatting utilities, minimizes code duplication

5. **Use coverage percentage as primary success metric** (migrated routes / total routes)
   - **Reason:** Clear, measurable goal for migration completeness, supports incremental migration tracking

6. **Support bidirectional mapping validation** (old→new and new→old)
   - **Reason:** Validates migration completeness in both directions, catches orphaned routes in either codebase

7. **Create CLI workflow with before/after snapshot support**
   - **Reason:** Enables comparison-based validation, tracks migration progress over time, supports rollback verification

### Reference Implementation

- `packages/coderef-core/src/validator/route-validator.ts` (existing validation engine)
- `packages/coderef-core/src/validator/route-normalizer.ts` (path transformation patterns)
- `packages/coderef-core/src/validator/report-generator.ts` (markdown reports)

### Technology Stack

- **Languages:** TypeScript
- **Frameworks:** Node.js
- **Key Libraries:**
  - Existing route-validator.ts infrastructure
  - JSON Schema for config validation
  - Regex for pattern-based mapping
  - Existing report-generator markdown utilities

---

## Executive Summary

### Purpose

Enable API migration tracking and validation by supporting migration config files that map old routes to new routes. Validates that all old routes have migration paths, all new routes are documented, frontend calls use correct paths, and generates migration coverage reports with unmapped/deprecated route detection.

### Impact

Reduces migration risk by **60-80%** through systematic validation. Prevents missing routes during:
- Framework migrations (Flask→FastAPI, Express→Next.js)
- API version upgrades (v1→v2)
- Monolith→microservices splits

Provides migration progress tracking with coverage percentage.

### Key Deliverables

1. **migration-mapper.ts** - Path transformation engine (200 lines)
2. **migration-config-schema.json** - Config structure definition
3. **validateMigration()** function in route-validator.ts
4. **migration-report.md** generator extending report-generator.ts
5. **validate-migration** CLI command with snapshot support
6. **migration-config.json** examples for common scenarios
7. **20+ tests** covering mapping, validation, edge cases
8. **MIGRATION-VALIDATION.md** comprehensive guide

---

## Risk Assessment

### Overall Risk: **Low**

### Breaking Changes

**None** - extends existing route validation, all new functionality is additive

### Dependencies

1. Requires **WO-ROUTE-VALIDATION-ENHANCEMENT-001 completion** (route-validator.ts, frontend-calls.json, routes.json)
2. Depends on existing route normalization logic (route-normalizer.ts)
3. Requires frontend-calls.json and routes.json from both old and new codebases
4. Migration configs must be manually created (tool cannot auto-detect mapping intent)

### Mitigation Strategies

1. Build on proven route validation infrastructure (already handles 57 calls, 27 routes)
2. Pattern-based mapping with fallback to explicit mapping reduces edge case risk
3. Dry-run mode validates migration config before applying transformations
4. Coverage reports identify unmapped routes early (prevents forgotten migrations)
5. Support partial migrations (< 100% coverage) with warnings for incomplete sections

---

## Current State Analysis

### Existing Capabilities

1. **Route validation:** detectMissingRoutes(), detectUnusedRoutes(), detectMethodMismatches() in route-validator.ts
2. **Path normalization:** Flask, FastAPI, Express, Next.js via route-normalizer.ts
3. **Frontend call detection:** scan-frontend-calls generates frontend-calls.json with 57 calls
4. **Route detection:** routes.json with 27 routes from backend scan
5. **Match confidence scoring:** exact=100, dynamic=90, partial=60 in route-matcher.ts
6. **Markdown report generation:** report-generator.ts with severity sections

### Gaps

1. No migration mapping config support - cannot define old→new route transformations
2. No pattern-based route transformation (regex find/replace on paths)
3. No migration coverage calculation (migrated routes / total routes)
4. No deprecated route detection (routes removed in migration)
5. No bidirectional validation (new→old reverse mapping)
6. No migration progress tracking or snapshot comparison
7. No CLI command for migration-specific validation workflow

### Affected Files

- `packages/coderef-core/src/types/types.ts` - Add MigrationMapping, MigrationReport interfaces
- `packages/coderef-core/src/validator/route-validator.ts` - Add validateMigration() function
- `packages/coderef-core/src/validator/report-generator.ts` - Add generateMigrationReport()
- **New:** `packages/coderef-core/src/validator/migration-mapper.ts`
- **New:** `packages/coderef-core/src/validator/migration-config-schema.json`
- **New:** `packages/coderef-core/src/cli/validate-migration.ts`

---

## Key Features

### Feature 1: Migration Config Schema & Validation

**Description:** Define JSON schema for migration configs with explicit path mappings (old→new dictionary) and pattern-based transformations (regex find/replace). Validate config structure and detect conflicts (duplicate mappings, circular references).

**Technical Approach:**
- Create migration-config-schema.json with paths (explicit 1:1), patterns (regex-based), methodChanges, deprecated, added sections
- Implement validateMigrationConfig() to check: required fields, valid regex patterns, no path conflicts, deprecated/added non-overlapping
- Use JSON Schema validation library if available, else manual validation

**Deliverables:**
- `migration-config-schema.json` - JSON schema definition
- MigrationMapping interface in types.ts
- validateMigrationConfig() function
- Example configs: migration-config-v1-to-v2.json, migration-config-flask-to-fastapi.json
- 5+ config validation tests

---

### Feature 2: Path Transformation Engine

**Description:** Apply migration mappings to frontend calls and server routes using explicit mappings first, then pattern-based transformations. Handle multiple expressions per path, track transformation confidence (explicit=100, pattern=80, unmapped=0).

**Technical Approach:**
- Implement applyMappings() with priority: explicit paths > patterns > unmapped
- For patterns, use regex.test() + string.replace() with capture groups ($1, $2)
- Track original path + transformed path + confidence + rule used
- Handle edge cases: multiple pattern matches (use first), malformed regex (skip with warning), circular transformations (detect and error)

**Deliverables:**
- applyMappings() - main transformation function
- applyExplicitMapping() - handle paths dictionary lookups
- applyPatternMapping() - handle regex find/replace
- TransformedCall interface
- 8+ transformation tests

---

### Feature 3: Migration Coverage Analysis

**Description:** Calculate migration coverage percentage (transformed calls / total calls, migrated routes / total routes). Identify unmapped calls (no transformation rule), deprecated calls (still using old routes marked deprecated), orphaned new routes (no frontend callers).

**Technical Approach:**
- Implement calculateMigrationCoverage() that compares old routes, new routes, transformation results
- Metrics: totalOldRoutes, totalNewRoutes, migratedRoutes, newlyAddedRoutes, unmappedCalls, deprecatedCalls
- Coverage = migratedRoutes / totalOldRoutes * 100

**Deliverables:**
- calculateMigrationCoverage() function
- MigrationCoverage interface
- findUnmappedCalls() - detect calls with no transformation rule
- findDeprecatedCalls() - detect calls to deprecated routes
- 6+ coverage calculation tests

---

### Feature 4: Migration Validation Orchestrator

**Description:** Extend route-validator.ts with validateMigration() function that loads old routes, new routes, frontend calls, migration config, applies transformations, runs validation on transformed calls against new routes, generates migration-specific report.

**Technical Approach:**
1. Validate migration config
2. Apply mappings to frontend calls
3. Run existing route validation on transformed calls vs new routes
4. Calculate coverage
5. Detect unmapped/deprecated calls
6. Return MigrationReport with validation results + migration metrics

**Deliverables:**
- validateMigration() orchestrator function
- MigrationReport interface extending RouteValidation
- loadMigrationMapping() helper
- 10+ integration tests

---

### Feature 5: Migration Report Generator

**Description:** Generate migration-report.md with sections: Summary (coverage %), Migration Coverage (by API group), Issues (unmapped, deprecated), Auto-Fix Suggestions (update frontend calls). Extend existing report-generator.ts markdown utilities.

**Technical Approach:**
Generate markdown with:
1. Summary table (old routes, new routes, coverage %)
2. Coverage breakdown by API prefix (/api/users, /api/posts)
3. Critical section (unmapped routes)
4. Warnings section (deprecated routes still used)
5. New routes section (added routes)
6. Auto-fix suggestions (frontend code changes)

**Deliverables:**
- generateMigrationReport() function
- formatMigrationSummary() - coverage table
- formatCoverageBreakdown() - per-API-group coverage
- formatUnmappedRoutes(), formatDeprecatedWarnings()
- 6+ report generation tests

---

### Feature 6: CLI Integration & Workflow

**Description:** Add validate-migration CLI command with options: --old-routes, --new-routes, --frontend-calls, --mapping, --output. Support workflow: scan old → scan new → validate migration → iterate.

**Technical Approach:**
- Create validate-migration.ts with argument parsing, file path resolution, validateMigration() invocation, report generation
- Add --dry-run flag to preview mappings without running validation
- Add --coverage-threshold <percent> to fail if coverage below threshold (CI/CD integration)

**Deliverables:**
- validate-migration.ts CLI command
- CLI options: --frontend-calls, --old-routes, --new-routes, --mapping, --output, --dry-run, --coverage-threshold
- Integration with package.json bin
- 5+ CLI integration tests
- Help text with examples

---

## Task ID System

### Phase 1: Config Schema (19 tasks)

- SETUP-001: Create migration-mapper.ts
- SETUP-002: Create migration-config-schema.json
- SETUP-003: Create migration-mapper.test.ts
- SETUP-004: Create examples/migrations/ directory
- TYPE-001: Add MigrationMapping interface
- SCHEMA-001 to SCHEMA-006: Define schema structure
- VALID-001 to VALID-005: Config validation functions
- TEST-004: Config validation tests
- EXAMPLE-001 to EXAMPLE-003: Create example configs

### Phase 2: Transformation Engine (9 tasks)

- TYPE-003: Add TransformedCall interface
- MAP-001 to MAP-006: Transformation functions
- TEST-001 to TEST-003: Transformation tests

### Phase 3: Coverage & Validation (16 tasks)

- TYPE-002, TYPE-004: MigrationReport, MigrationCoverage interfaces
- COV-001 to COV-006: Coverage calculation functions
- TEST-005: Coverage tests
- VALID-006 to VALID-011: Migration validation integration
- TEST-006: Integration tests

### Phase 4: Reports & CLI (24 tasks)

- REPORT-001 to REPORT-007: Report generation functions
- TEST-007: Report tests
- CLI-001 to CLI-008: CLI command implementation
- TEST-008: CLI tests
- DOC-001 to DOC-008: Documentation
- FINAL-001 to FINAL-004: Finalization tasks

**Total: 68 tasks**

---

## Implementation Phases

### Phase 1: Migration Config Schema & Validation

**Duration:** ~3 hours
**Tasks:** 19 tasks (SETUP, SCHEMA, VALID, TEST-004, EXAMPLE)

**Description:** Define migration config schema, implement config validation, create example configs. Foundation for all transformation logic.

**Deliverables:**
- migration-config-schema.json
- MigrationMapping interface
- validateMigrationConfig() with comprehensive validation
- 3 example migration configs (v1→v2, Flask→FastAPI, monolith→microservices)
- 5+ config validation tests

**Dependencies:** None - standalone phase

**Rationale:** Config schema is foundation for all migration features. Validating configs early prevents runtime errors. Example configs provide clear migration patterns.

---

### Phase 2: Path Transformation Engine

**Duration:** ~2 hours
**Tasks:** 9 tasks (TYPE-003, MAP, TEST-001 to TEST-003)

**Description:** Implement path mapping logic with explicit mappings and pattern-based transformations. Handle confidence scoring and edge cases.

**Deliverables:**
- applyMappings() orchestrator
- applyExplicitMapping() and applyPatternMapping()
- TransformedCall interface
- 15+ transformation tests

**Dependencies:** Requires Phase 1 completion

**Rationale:** Transformation engine is core value proposition. Testing in isolation ensures correctness before integration with validation.

---

### Phase 3: Coverage Analysis & Migration Validation

**Duration:** ~4 hours
**Tasks:** 16 tasks (TYPE-002/004, COV, VALID-006 to VALID-011, TEST-005/006)

**Description:** Calculate migration coverage, detect unmapped/deprecated routes, integrate with existing route validation engine.

**Deliverables:**
- calculateMigrationCoverage() with percentage calculation
- MigrationCoverage and MigrationReport interfaces
- validateMigration() orchestrator
- Integration with existing route validation
- 16+ tests

**Dependencies:** Requires Phase 1, 2, and WO-ROUTE-VALIDATION-ENHANCEMENT-001

**Rationale:** Coverage metrics provide measurable migration progress. Integration with existing validation reuses proven logic.

---

### Phase 4: Report Generation & CLI

**Duration:** ~3 hours
**Tasks:** 24 tasks (REPORT, CLI, DOC, FINAL)

**Description:** Generate migration-specific markdown reports, add CLI command with dry-run and coverage threshold support, complete documentation.

**Deliverables:**
- generateMigrationReport() extending report-generator.ts
- validate-migration CLI command with all flags
- migration-report.md template
- MIGRATION-VALIDATION.md guide (600+ lines)
- Updated README.md
- JSDoc comments on all public APIs
- 11+ report and CLI tests
- Performance validation

**Dependencies:** Requires Phase 1, 2, and 3 completion

**Rationale:** Reports provide actionable migration insights. CLI enables developer workflow and CI/CD integration.

---

## Testing Strategy

### Unit Tests

**migration-mapper.test.ts** (23 tests)
- Config validation (5 tests)
- Explicit mapping (3 tests)
- Pattern mapping (6 tests)
- Frontend call transformation (4 tests)
- Coverage calculation (5 tests)

**route-validator.test.ts additions** (10 tests)
- validateMigration workflow tests
- Edge cases (missing config, empty routes, coverage scenarios)

**report-generator.test.ts additions** (6 tests)
- Migration report formatting
- All sections tested

### Integration Tests

1. End-to-end migration validation: config → transform → validate → report
2. CLI workflow on example v1→v2 migration
3. Dry-run mode preview
4. Coverage threshold enforcement
5. Bidirectional validation
6. Performance test: 1000+ routes in < 5 seconds

### Edge Cases

- Empty migration config
- Circular transformations (A→B, B→A)
- Malformed regex patterns
- Path conflicts (duplicate mappings)
- Deprecated route heavily used (high impact)
- 0% coverage (all unmapped)
- Complex patterns with multiple capture groups
- Case sensitivity, trailing slashes, query parameters

---

## Success Criteria

### Functional

- ✅ All 68 tasks implemented and verified
- ✅ Migration config schema supports all mapping types
- ✅ Config validation detects all error types
- ✅ Path transformation works (explicit=100%, pattern=80% confidence)
- ✅ Coverage calculation accurate
- ✅ Unmapped/deprecated call detection working
- ✅ validateMigration() integrates with existing validation
- ✅ migration-report.md generated with all sections
- ✅ CLI command works with all flags
- ✅ Dry-run mode functional
- ✅ Coverage threshold enforcement working
- ✅ 100% test pass rate (20+ tests)
- ✅ No breaking changes to existing route validation

### Performance

- Migration validation completes in < 5 seconds for 1000+ routes
- Config validation completes in < 100ms
- Transformation processes 1000+ calls in < 2 seconds
- Report generation completes in < 500ms
- Memory usage under 200MB for 1000+ routes

### Quality

- 80%+ code coverage
- Zero TypeScript errors
- All edge cases handled gracefully
- JSDoc comments on all public functions
- Comprehensive documentation (600+ lines)
- Clear CLI help text
- Actionable error messages
- 3+ working example configs

---

## Implementation Checklist

### Phase 1: Config Schema (19 tasks)

- ☐ SETUP-001: Create migration-mapper.ts
- ☐ SETUP-002: Create migration-config-schema.json
- ☐ SETUP-003: Create migration-mapper.test.ts
- ☐ SETUP-004: Create examples/migrations/ directory
- ☐ TYPE-001: Add MigrationMapping interface
- ☐ SCHEMA-001: Define schema structure
- ☐ SCHEMA-002: Add paths section
- ☐ SCHEMA-003: Add patterns section
- ☐ SCHEMA-004: Add methodChanges section
- ☐ SCHEMA-005: Add deprecated section
- ☐ SCHEMA-006: Add added section
- ☐ VALID-001: Implement validateMigrationConfig()
- ☐ VALID-002: Add checkRequiredFields()
- ☐ VALID-003: Add validateRegexPatterns()
- ☐ VALID-004: Add detectPathConflicts()
- ☐ VALID-005: Add checkDeprecatedAddedOverlap()
- ☐ TEST-004: Config validation tests
- ☐ EXAMPLE-001: Create v1→v2 example
- ☐ EXAMPLE-002: Create Flask→FastAPI example
- ☐ EXAMPLE-003: Create monolith→microservices example

### Phase 2: Transformation Engine (9 tasks)

- ☐ TYPE-003: Add TransformedCall interface
- ☐ MAP-001: Implement applyMappings()
- ☐ MAP-002: Implement applyExplicitMapping()
- ☐ MAP-003: Implement applyPatternMapping()
- ☐ MAP-004: Add transformFrontendCall()
- ☐ MAP-005: Add transformServerRoute()
- ☐ MAP-006: Add trackTransformationConfidence()
- ☐ TEST-001: Tests for applyExplicitMapping
- ☐ TEST-002: Tests for applyPatternMapping
- ☐ TEST-003: Tests for transformFrontendCall

### Phase 3: Coverage & Validation (16 tasks)

- ☐ TYPE-002: Add MigrationReport interface
- ☐ TYPE-004: Add MigrationCoverage interface
- ☐ COV-001: Implement calculateMigrationCoverage()
- ☐ COV-002: Add countMigratedRoutes()
- ☐ COV-003: Add countNewlyAddedRoutes()
- ☐ COV-004: Add findUnmappedCalls()
- ☐ COV-005: Add findDeprecatedCalls()
- ☐ COV-006: Add groupCoverageByApiPrefix()
- ☐ TEST-005: Coverage calculation tests
- ☐ VALID-006: Implement validateMigration()
- ☐ VALID-007: Add loadMigrationMapping()
- ☐ VALID-008: Integrate detectMissingRoutes
- ☐ VALID-009: Integrate detectUnusedRoutes
- ☐ VALID-010: Integrate detectMethodMismatches
- ☐ VALID-011: Add generateMigrationReport return
- ☐ TEST-006: Integration tests

### Phase 4: Reports & CLI (24 tasks)

- ☐ REPORT-001: Add generateMigrationReport()
- ☐ REPORT-002: Implement formatMigrationSummary()
- ☐ REPORT-003: Implement formatCoverageBreakdown()
- ☐ REPORT-004: Implement formatUnmappedRoutes()
- ☐ REPORT-005: Implement formatDeprecatedWarnings()
- ☐ REPORT-006: Implement formatNewRoutesSection()
- ☐ REPORT-007: Implement formatAutoFixSuggestions()
- ☐ TEST-007: Report generation tests
- ☐ CLI-001: Create validate-migration.ts
- ☐ CLI-002: Add parseArgs()
- ☐ CLI-003: Add --output option
- ☐ CLI-004: Add --dry-run flag
- ☐ CLI-005: Add --coverage-threshold option
- ☐ CLI-006: Add printMigrationSummary()
- ☐ CLI-007: Add resolveFilePaths()
- ☐ CLI-008: Integrate with package.json bin
- ☐ TEST-008: CLI tests
- ☐ DOC-001: Create MIGRATION-VALIDATION.md
- ☐ DOC-002: Add Quick Start section
- ☐ DOC-003: Add Config Reference
- ☐ DOC-004: Add Common Scenarios
- ☐ DOC-005: Add CLI Reference
- ☐ DOC-006: Add Troubleshooting
- ☐ DOC-007: Update README.md
- ☐ DOC-008: Add JSDoc comments

### Finalization (4 tasks)

- ☐ FINAL-001: All tests passing
- ☐ FINAL-002: CLI end-to-end test
- ☐ FINAL-003: Backward compatibility verified
- ☐ FINAL-004: Performance validated

---

## Alignment Commentary

### What Aligns Well ✅

**1. Foundation is Solid**
- WO-ROUTE-VALIDATION-ENHANCEMENT-001 completed
- Fresh scan shows 3045 elements (662 functions, 176 classes) - infrastructure is stable
- Existing validation logic tested (801/815 tests passing, 98.3%)

**2. Realistic Scope**
- 68 tasks over 4 phases ≈ 12 hours estimated
- Extends existing code (migration-mapper.ts = 200 lines) vs rewriting
- Leverages proven patterns (route-normalizer.ts already handles Flask/FastAPI/Express/Next.js)

**3. Low Risk**
- No breaking changes (extends route-validator.ts, doesn't modify core)
- Config-driven (migration-config.json) - failures don't break validation
- Dry-run support reduces deployment risk

### Potential Challenges ⚠️

**1. Pattern-Based Mapping Complexity**
- Regex capture groups can fail on edge cases (nested params, optional segments)
- **Mitigation:** Test suite includes 10+ edge cases, fallback to partial matching

**2. Manual Config Creation**
- Users must write migration-config.json themselves (no auto-detection)
- **Mitigation:** 3 example configs provided (v1→v2, Flask→FastAPI, monolith→microservices)

**3. Bidirectional Validation**
- Plan includes new→old reverse mapping, but not fully specified in tasks
- **Recommendation:** Add explicit task in Phase 3 for reverse validation logic

### Scope Creep Risks

**Not Included (Good):**
- ❌ Automatic code transformation (frontend calls rewriting) - requires AST modification
- ❌ GraphQL/WebSocket migration - out of scope for REST-focused tool
- ❌ Database schema migration - different problem domain

**Could Add Later (V2):**
- 🔮 Migration progress tracking over time (snapshot comparison)
- 🔮 Visual diff of old vs new routes (HTML report)
- 🔮 Auto-generate migration configs from git diff analysis

### Resource Availability

**From Fresh Scan (.coderef/index.json):**
- ✅ 662 functions, 176 classes available for reference
- ✅ route-validator.ts, route-normalizer.ts, report-generator.ts exist
- ✅ frontend-calls.json format validated (57 calls detected)
- ✅ routes.json format stable (27 routes detected)

**Missing (Expected):**
- ⚠️ No migration-mapper.ts yet (will create)
- ⚠️ No migration-config-schema.json yet (will create)
- ⚠️ No example migration configs yet (will create)

---

## Recommendation

**Plan is well-aligned and ready for execution.**

**Suggested Workflow:**
1. **Phase 1 First** (3 hours) - Schema + examples validate concept
2. **Phase 2 Quickly** (2 hours) - Transformation logic is straightforward
3. **Phase 3 Carefully** (4 hours) - Integration with existing validator needs attention
4. **Phase 4 Polish** (3 hours) - CLI + docs bring it all together

**Total: ~12 hours** matches original estimate.

---

**Generated by:** AI Agent (Claude Sonnet 4.5)
**Last Updated:** 2026-03-02
**UDS Version:** manual-planning v1.0.0

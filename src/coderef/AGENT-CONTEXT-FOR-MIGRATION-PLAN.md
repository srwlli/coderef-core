# Agent Context: CodeRef System Consolidation Migration Plan

**Purpose:** This document provides comprehensive context for an AI agent to create a `plan.json` implementing the migration strategy defined in `migration-strategy.md`.

**Created:** 2026-01-07  
**Related Documents:**
- `migration-strategy.md` - Complete migration plan (7 phases)
- `CODEBASE-AUDIT-REPORT.md` - Full codebase audit with feature mapping
- `master-context-index.md` - Catalog of 173 context files across coderef ecosystem

---

## Executive Context

### What We're Building

**Goal:** Consolidate three separate CodeRef implementations (root, `src/`, `coderef-core-updates/`) into **one unified system** with:
- Working regex scanner (multi-language)
- Working AST scanner (TypeScript/JavaScript)
- Unified parser (EBNF-based CodeRef2)
- Unified type system
- Both scanners producing `ElementData[]` output
- Adapter layer for AST graph → ElementData[] conversion

### Why This Migration

1. **Code Duplication:** Three implementations with overlapping functionality
2. **Type Conflicts:** Multiple incompatible type systems
3. **Maintenance Burden:** Changes must be made in multiple places
4. **Feature Fragmentation:** Some features exist in one location but not others
5. **Build Confusion:** `coderef-core-updates/` excluded from build but still present

### Current State (3 Locations)

#### 1. Root Directory (`/`)
- **Status:** Legacy Phase 2 + Active utilities
- **Files:**
  - `parser.ts` (legacy, deprecated) - 146 lines, regex-based
  - `scanner.ts` (current, active) - 649 lines, regex-based multi-language
  - `types.ts` (legacy, deprecated) - 100 lines, contains `ElementData`, `ParsedCoderef`
  - `utils/fs.ts` (current, active) - 131 lines, file system utilities

#### 2. Source Directory (`src/`)
- **Status:** Current Phase 3+ implementation - **PRIMARY SOURCE OF TRUTH**
- **Key Files:**
  - `src/parser/parser.ts` (current) - 443 lines, EBNF-based CodeRef2 parser
  - `src/types/types.ts` (current) - 222 lines, CodeRef2 type system with `TypeDesignator` enum
  - `src/analyzer/ast-element-scanner.ts` (current) - AST element scanner
  - `src/adapter/graph-to-elements.ts` (current) - Converts `DependencyGraph` → `ElementData[]`
  - Plus 12 other modules (validator, formatter, indexer, query, context, integration, export, errors, utils)

#### 3. Archive Directory (`coderef-core-updates/`)
- **Status:** Experimental/archived - **EXCLUDED FROM BUILD**
- **Files:**
  - `coderef-core-updates/coderef-core/scanner.ts` (experimental) - AST-based standalone scanner
  - `coderef-core-updates/coderef-core/parser.ts` (experimental) - AST-based parser
  - `coderef-core-updates/coderef-core/types.ts` (experimental) - Experimental type definitions

---

## Migration Strategy Overview (7 Phases)

### Phase 0: Review coderef-core-updates/ (Pre-Migration)
- Review experimental code and extract useful features
- Compare AST scanner implementations
- Document findings and decisions
- Extract any unique features worth preserving

### Phase 1: Type Migration (ElementData & ScanOptions)
- Move `ElementData` and `ScanOptions` to `src/types/types.ts`
- Update `scanner.ts` imports
- Update all `src/` module imports
- Update `src/index.ts` exports

### Phase 2: Parser Migration
- Add deprecation warnings to root `parser.ts`
- Create compatibility shim (optional)
- Update documentation
- Update `index.ts` exports

### Phase 3: Types Cleanup
- Verify all imports migrated
- Remove legacy types from root `types.ts`
- Update `index.ts`

### Phase 4: Configuration Updates
- Update `tsconfig.json` to exclude root files
- Update `package.json` exports (if applicable)

### Phase 5: Scanner Consolidation (Optional)
- **Decision Point:** Keep in root OR move to `src/scanner/scanner.ts`
- **Recommendation:** Keep in root (lower risk, already working)

### Phase 6: Remove coderef-core-updates/
- Verify review complete
- Remove directory
- Archive documentation

### Phase 7: File Removal
- Delete root `parser.ts` and `types.ts`
- Clean up `index.ts`
- Update documentation

---

## Key Context Files (From Master Index)

### Essential Documentation
**Location:** `C:\Users\willh\.mcp-servers\coderef\sessions\create-context-index\master-context-index.md`

**Key Files to Reference:**

1. **Architecture & API Documentation:**
   - `docs/ARCHITECTURE.md` - System architecture patterns
   - `docs/API.md` - API contracts and interfaces
   - `docs/SCHEMA.md` - Data models and type definitions
   - `docs/COMPONENTS.md` - Component structure

2. **Implementation Guides:**
   - `guide-to-coderef-core.md` - Core system guide
   - `coderef/resource/scanner/TYPESCRIPT-IMPLEMENTATION-PLAN.md` - Scanner implementation patterns

3. **Resource Sheets:**
   - `coderef/resource/API-SCANNER-CONTRACT.md` - Scanner API contract
   - `coderef/resource/SCAN-EXECUTOR.md` - Scan execution patterns
   - `coderef/resource/scanner/SCANNER-SYSTEM.md` - Scanner architecture

4. **Standards:**
   - `coderef/standards/` - Coding standards and patterns

### Project-Specific Files (coderef-core)
**From:** `coderef-core-index.md`

- `CLAUDE.md` - AI context documentation
- `docs/README.md`, `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/COMPONENTS.md`, `docs/SCHEMA.md`
- `guide-to-coderef-core.md`
- `coderef/resource/` - 8 reference sheets

---

## Critical Dependencies & Constraints

### Import Dependencies
1. **scanner.ts (root)** imports `ElementData` and `ScanOptions` from root `types.ts`
2. **src/adapter/graph-to-elements.ts** imports `ElementData` from `../../types.js`
3. **src/context/types.ts** re-exports `ElementData` from root
4. **src/index.ts** re-exports `ElementData` and `ScanOptions` from root
5. **src/context/context-generator.ts** uses root `scanner.ts`
6. **src/context/breaking-change-detector.ts** uses root `scanner.ts`

### Type Compatibility Requirements
- `ElementData` structure must match exactly between root and `src/`
- `ScanOptions` interface must be compatible
- Migration must maintain backward compatibility during transition

### Build Configuration
- `tsconfig.json` currently includes `"*.ts"` (compiles root files)
- `coderef-core-updates/` is excluded from build
- Generated files: `parser.d.ts`, `parser.js`, `types.d.ts`, `types.js` (if in root)

### External Consumers
- Documentation files reference old API (`parseCoderefTag`, `ParsedCoderef`)
- Potential external packages using root parser/types
- Need compatibility shim for gradual migration

---

## Scanner Architecture Goal

**Target State:**
```
┌─────────────────────────────────────────────────────────┐
│              Unified CodeRef Scanner System              │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Regex       │   │ AST Element  │   │ AST Analyzer │
│ Scanner     │   │ Scanner      │   │ (Graph)      │
│ (root)      │   │ (src/)       │   │ (src/)       │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │
       ▼                 ▼                 ▼
   ElementData[]    ElementData[]    DependencyGraph
       │                 │                 │
       └─────────────────┴─────────────────┘
                          │
                          ▼
                   [Adapter Layer]
                          │
                          ▼
                   ElementData[]
                          │
                          ▼
                   Generators/Tools
```

**Key Requirements:**
1. **Regex Scanner** (root `scanner.ts`): Multi-language support (TS, JS, Python, Go, etc.) - **KEEP**
2. **AST Element Scanner** (`src/analyzer/ast-element-scanner.ts`): TypeScript/JavaScript only, high accuracy - **CURRENT**
3. **AST Analyzer** (`src/analyzer/`): Full relationship analysis with graph building - **CURRENT**
4. **Adapter** (`src/adapter/graph-to-elements.ts`): Converts graph → ElementData[] - **CURRENT**
5. **Unified Output**: All scanners produce `ElementData[]` format

---

## Planning Template Mapping

### Section 0: Preparation
**Use master-context-index.md to find:**
- Foundation docs (ARCHITECTURE.md, API.md, SCHEMA.md, COMPONENTS.md)
- Coding standards (coderef/standards/)
- Similar components (existing scanner, parser, type implementations)
- Test patterns (existing test structure)

### Section 1: Executive Summary
- **What:** Consolidate 3 CodeRef implementations into 1 unified system
- **Why:** Eliminate duplication, resolve type conflicts, reduce maintenance burden
- **Real-world analogy:** Merging three separate libraries into one cohesive package
- **Output:** Unified system with regex + AST scanners, single parser, single type system
- **Complexity:** High (touching 20+ files, breaking changes, migration period)

### Section 2: Risk Assessment
**High Risks:**
- Breaking external consumers using root parser/types
- Type incompatibility during migration
- Import path changes breaking internal modules

**Mitigations:**
- Compatibility shim for gradual migration
- Verify type structures match exactly
- Comprehensive testing after each phase

### Section 3: Current State Analysis
**Files to Modify:**
- Root: `parser.ts`, `types.ts`, `scanner.ts`, `index.ts`
- src/: `types/types.ts`, `adapter/graph-to-elements.ts`, `context/types.ts`, `index.ts`, `context/context-generator.ts`, `context/breaking-change-detector.ts`
- Config: `tsconfig.json`, `package.json`
- Docs: All `.md` files referencing old API

**Dependencies:**
- Existing: TypeScript compiler, existing test framework
- New: None (pure refactoring)

### Section 4: Key Features
1. Type migration (ElementData, ScanOptions to src/types)
2. Parser deprecation and migration
3. Types cleanup (remove legacy types)
4. Configuration updates (tsconfig.json)
5. Scanner consolidation decision
6. Archive directory removal
7. Legacy file removal
8. Documentation updates

### Section 5: Task ID System
**Workorder Format:** `WO-{FEATURE-NAME}-001`
**Suggested:** `WO-CODEREF-CONSOLIDATION-001`

**Task Prefixes:**
- `REVIEW-` - Review and analysis tasks
- `MIGRATE-` - Migration tasks
- `UPDATE-` - Update imports/exports
- `DEPRECATE-` - Deprecation tasks
- `CLEANUP-` - Cleanup and removal tasks
- `TEST-` - Testing tasks
- `DOCS-` - Documentation tasks
- `CONFIG-` - Configuration tasks

### Section 6: Implementation Phases
Map directly to migration strategy phases:
- Phase 0: Review coderef-core-updates/
- Phase 1: Type Migration
- Phase 2: Parser Migration
- Phase 3: Types Cleanup
- Phase 4: Configuration Updates
- Phase 5: Scanner Consolidation (optional)
- Phase 6: Remove coderef-core-updates/
- Phase 7: File Removal

### Section 7: Testing Strategy
- Unit tests: Type compatibility, import paths
- Integration tests: Scanner functionality, parser compatibility
- Edge cases: Empty inputs, invalid types, missing files
- Manual testing: Documentation examples, external consumer compatibility

### Section 8: Success Criteria
**Functional:**
- All scanners produce ElementData[] output
- All imports use src/ versions
- No TypeScript compilation errors
- All tests pass

**Quality:**
- Test coverage maintained (current level)
- No breaking changes for external consumers (via compatibility shim)
- Documentation updated and accurate

**Performance:**
- No performance regression
- Build time unchanged

**Security:**
- No new security vulnerabilities
- Type safety maintained

### Section 9: Implementation Checklist
Organize by phase with all task IDs from Section 5.

---

## Key Decisions Needed in Plan

1. **Compatibility Shim:** Create shim for old API or force breaking change?
   - **Recommendation:** Create shim for gradual migration, remove in v3.0.0

2. **Scanner Location:** Keep in root or move to src/scanner/?
   - **Recommendation:** Keep in root (lower risk, already working)

3. **Deprecation Period:** How long to maintain compatibility shim?
   - **Recommendation:** Until v3.0.0 (one major version)

4. **coderef-core-updates/ Review:** How thorough should review be?
   - **Recommendation:** Compare implementations, document findings, extract unique features if any

---

## Files to Reference During Planning

1. **migration-strategy.md** - Complete 7-phase migration plan
2. **CODEBASE-AUDIT-REPORT.md** - Feature mapping and current state
3. **master-context-index.md** - Catalog of all context files
4. **docs/ARCHITECTURE.md** - System architecture patterns
5. **docs/API.md** - API contracts
6. **docs/SCHEMA.md** - Type definitions
7. **guide-to-coderef-core.md** - Core system guide

---

## Success Criteria Summary

### Final System State
- ✅ One unified system with regex and AST scanners
- ✅ Regex scanner (root or src/) - Multi-language support
- ✅ AST element scanner (`src/analyzer/ast-element-scanner.ts`) - TypeScript/JavaScript
- ✅ AST analyzer (`src/analyzer/`) - Full relationship analysis
- ✅ Adapter layer (`src/adapter/graph-to-elements.ts`) - Graph → ElementData[]
- ✅ Unified parser (`src/parser/parser.ts`) - EBNF-based CodeRef2
- ✅ Unified types (`src/types/types.ts`) - CodeRef2 type system
- ✅ All scanners produce ElementData[] - Compatible output format

### Cleanup Complete
- Root `parser.ts` and `types.ts` deleted
- `coderef-core-updates/` directory removed
- All imports use `src/` versions
- No TypeScript compilation errors
- All tests pass
- Documentation updated
- `tsconfig.json` excludes root files (except scanner.ts if kept in root)
- `index.ts` exports from `src/` (and scanner.ts if kept in root)

---

## Next Steps for Agent

1. **Read migration-strategy.md** - Understand complete 7-phase plan
2. **Read CODEBASE-AUDIT-REPORT.md** - Understand current state and feature mapping
3. **Use master-context-index.md** - Find relevant documentation files
4. **Create plan.json** - Following planning template structure
5. **Map phases to tasks** - Break down each phase into specific, actionable tasks
6. **Define success criteria** - Quantifiable metrics for each phase
7. **Create implementation checklist** - All task IDs organized by phase

---

**Note:** This migration is a **high-complexity refactoring** touching 20+ files across 3 locations. Careful planning is essential to avoid breaking changes and maintain system functionality throughout the migration.


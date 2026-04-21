# Complete CodeRef System Consolidation Plan

## Objective
Consolidate all three CodeRef implementations (root, `src/`, `coderef-core-updates/`) into **one complete, unified system** with:
- ✅ Working regex scanner (multi-language)
- ✅ Working AST scanner (TypeScript/JavaScript)
- ✅ Unified parser (EBNF-based CodeRef2)
- ✅ Unified type system
- ✅ Both scanners producing `ElementData[]` output
- ✅ Adapter layer for AST graph → ElementData[] conversion

## Current State Analysis

### Three Implementation Locations

#### 1. Root Directory (`/`)
**Status:** Legacy Phase 2 + Active utilities

**Files:**
- `parser.ts` (legacy) - 146 lines, regex-based parser using `ParsedCoderef` - **DEPRECATED**
- `scanner.ts` (current) - 649 lines, regex-based multi-language scanner - **ACTIVE**
- `types.ts` (legacy) - 100 lines, contains `ElementData`, `ParsedCoderef`, `ScanOptions` - **DEPRECATED**
- `utils/fs.ts` (current) - 131 lines, file system utilities - **ACTIVE**

#### 2. Source Directory (`src/`)
**Status:** Current Phase 3+ implementation - **PRIMARY SOURCE OF TRUTH**

**Files:**
- `src/parser/parser.ts` (current) - 443 lines, EBNF-based CodeRef2 parser - **CURRENT**
- `src/types/types.ts` (current) - 222 lines, CodeRef2 type system with `TypeDesignator` enum - **CURRENT**
- `src/analyzer/ast-element-scanner.ts` (current) - AST element scanner (part of analyzer system) - **CURRENT**
- `src/adapter/graph-to-elements.ts` (current) - Converts `DependencyGraph` → `ElementData[]` - **CURRENT**
- `src/utils/logger.ts` (current) - Logging utility - **CURRENT**

#### 3. Archive Directory (`coderef-core-updates/`)
**Status:** Experimental/archived - **EXCLUDED FROM BUILD**

**Files:**
- `coderef-core-updates/coderef-core/scanner.ts` (experimental) - AST-based standalone scanner - **EXPERIMENTAL**
- `coderef-core-updates/coderef-core/parser.ts` (experimental) - AST-based parser - **EXPERIMENTAL**
- `coderef-core-updates/coderef-core/types.ts` (experimental) - Experimental type definitions - **EXPERIMENTAL**

### Files to Remove
1. **`parser.ts`** (root, legacy) - 146 lines, regex-based parser using `ParsedCoderef`
2. **`types.ts`** (root, legacy) - 100 lines, contains `ElementData`, `ParsedCoderef`, `ScanOptions`
3. **`coderef-core-updates/`** (entire directory) - After reviewing and extracting useful features

### Files to Keep/Migrate
1. **`scanner.ts`** (root) - Keep in root OR migrate to `src/scanner/scanner.ts` after type migration
2. **`utils/fs.ts`** (root) - Keep (different purpose from `src/utils/logger.ts`)
3. **AST Scanner** - Integrate useful features from `coderef-core-updates/scanner.ts` into `src/analyzer/ast-element-scanner.ts` if needed

### Critical Dependencies
- `scanner.ts` (root) imports `ElementData` and `ScanOptions` from root `types.ts`
- `src/adapter/graph-to-elements.ts` imports `ElementData` from `../../types.js`
- `src/context/types.ts` re-exports `ElementData` from root
- `src/index.ts` re-exports `ElementData` and `ScanOptions` from root
- `src/context/context-generator.ts` uses root `scanner.ts`
- `src/context/breaking-change-detector.ts` uses root `scanner.ts`
- Documentation files reference old API (`parseCoderefTag`, `ParsedCoderef`)

### Scanner Architecture Goal

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

## Migration Strategy

### Phase 0: Review coderef-core-updates/ (Pre-Migration)

**Goal:** Review experimental code and extract useful features before removal

1. **Review AST Scanner** (`coderef-core-updates/coderef-core/scanner.ts`)
   - Compare with `src/analyzer/ast-element-scanner.ts`
   - Identify unique features or improvements
   - Document any useful patterns or approaches
   - Decision: Integrate features OR archive as reference

2. **Review AST Parser** (`coderef-core-updates/coderef-core/parser.ts`)
   - Compare with `src/parser/parser.ts` (EBNF-based)
   - Check if AST-based parsing offers advantages
   - Decision: Keep experimental approach OR remove

3. **Review Types** (`coderef-core-updates/coderef-core/types.ts`)
   - Compare with `src/types/types.ts` (CodeRef2 system)
   - Check for any missing type definitions
   - Decision: Extract useful types OR remove

4. **Document Findings**
   - Create summary of experimental features
   - Note any unique approaches worth preserving
   - Archive documentation if removing directory

### Phase 1: Type Migration (ElementData & ScanOptions)

**Goal:** Move `ElementData` and `ScanOptions` to `src/types/types.ts` or create shared location

1. **Add ElementData to src/types/types.ts**
   - Copy `ElementData` interface from `types.ts` to `src/types/types.ts`
   - Copy `ScanOptions` interface to `src/types/types.ts`
   - Ensure compatibility (same structure, same optional fields)

2. **Update scanner.ts imports**
   - Change `import { ElementData, ScanOptions } from './types'` 
   - To: `import { ElementData, ScanOptions } from './src/types/types.js'`

3. **Update all src/ module imports**
   - Find all imports of `ElementData` from `../../types.js` or `../types.js`
   - Update to import from `../types/types.js` or `../../types/types.js`
   - Files to update:
     - `src/adapter/graph-to-elements.ts`
     - `src/context/types.ts` (remove re-export, import directly)
     - `src/analyzer/ast-element-scanner.ts`
     - Any other files importing from root types

4. **Update src/index.ts exports**
   - Change `export type { ScanOptions, ElementData } from '../types.js'`
   - To: `export type { ScanOptions, ElementData } from './types/types.js'`

### Phase 2: Parser Migration

**Goal:** Remove root `parser.ts` and migrate all references to `src/parser/parser.ts`

1. **Add deprecation warnings**
   - Add `@deprecated` JSDoc tags to all exports in `parser.ts`
   - Add deprecation notice: "Use src/parser/parser.ts instead. Will be removed in v3.0.0"

2. **Create compatibility shim (optional)**
   - In `index.ts`, add compatibility exports that map old API to new:
     ```typescript
     // Compatibility layer - remove in v3.0.0
     import { parseCodeRef } from './src/parser/parser.js';
     import type { ParsedCodeRef } from './src/parser/parser.js';
     
     /** @deprecated Use parseCodeRef from src/parser/parser.js */
     export function parseCoderefTag(tag: string): ParsedCoderef {
       const parsed = parseCodeRef(tag);
       // Convert ParsedCodeRef to ParsedCoderef format
       return { ...parsed, element: parsed.element || null, line: parsed.line ? parseInt(parsed.line) : null };
     }
     ```
   - This allows gradual migration without breaking existing code

3. **Update documentation**
   - Update `guide-to-coderef-core.md` to use new API
   - Update `docs/README.md`, `docs/API.md`, `docs/COMPONENTS.md` examples
   - Replace `parseCoderefTag` with `parseCodeRef`
   - Replace `ParsedCoderef` with `ParsedCodeRef`

4. **Update index.ts exports**
   - Remove `export * from './parser.js'`
   - Keep compatibility shim exports if created
   - Ensure `export * from './src/parser/parser.js'` remains

### Phase 3: Types Cleanup

**Goal:** Remove root `types.ts` after ElementData migration

1. **Verify all imports migrated**
   - Search codebase for any remaining imports from `./types` or `../types`
   - Ensure all use `src/types/types.js` or relative paths to it

2. **Remove legacy types from root types.ts**
   - After ElementData migration, root `types.ts` only contains:
     - `ParsedCoderef` (legacy, used by old parser)
     - `IndexedCoderef`, `DriftStatus`, `DriftReport` (may be unused)
   - Check if these are still needed or can be removed

3. **Update index.ts**
   - Remove `export * from './types.js'`
   - Ensure `export * from './src/types/types.js'` remains

### Phase 4: Configuration Updates

1. **Update tsconfig.json**
   - Remove `"*.ts"` from `include` array
   - Keep only `"utils/**/*.ts"` and `"src/**/*.ts"`
   - This prevents TypeScript from compiling root parser.ts and types.ts

2. **Update package.json exports (if applicable)**
   - Ensure main entry points point to correct files
   - Verify dist/ output structure

### Phase 5: Scanner Consolidation (Optional)

**Goal:** Optionally migrate `scanner.ts` to `src/scanner/scanner.ts` for better organization

**Decision Point:** Keep in root OR move to src/

**Option A: Keep in Root (Recommended)**
- Scanner is foundational utility, appropriate at root level
- Already working and well-integrated
- No duplicate exists in src/
- Lower migration risk

**Option B: Move to src/scanner/scanner.ts**
- Better organization (all code in src/)
- Consistent with modular architecture
- Requires updating all imports
- Higher migration risk

**If choosing Option B:**
1. Create `src/scanner/` directory
2. Move `scanner.ts` → `src/scanner/scanner.ts`
3. Update all imports:
   - `src/context/context-generator.ts`
   - `src/context/breaking-change-detector.ts`
   - `src/index.ts`
   - `index.ts`
4. Update exports in `index.ts` and `src/index.ts`
5. Test all consumers

### Phase 6: Remove coderef-core-updates/

**Goal:** Clean up experimental directory after review

1. **Verify review complete**
   - Phase 0 findings documented
   - Useful features extracted (if any)
   - Decision made on each file

2. **Remove directory**
   - Delete `coderef-core-updates/` directory
   - Update `tsconfig.json` to remove exclusion (no longer needed)
   - Update documentation to remove references

3. **Archive documentation**
   - Save any useful findings to `docs/experimental-approaches.md`
   - Document why features were/weren't integrated

### Phase 7: File Removal

1. **Delete root files**
   - Delete `parser.ts`
   - Delete `types.ts`
   - Delete generated files: `parser.d.ts`, `parser.js`, `types.d.ts`, `types.js` (if in root)

2. **Clean up index.ts**
   - Remove all legacy export statements
   - Remove compatibility shim if migration period complete
   - Keep only src/ exports (and scanner.ts if kept in root)

3. **Update documentation**
   - Update `DUPLICATE-FILES-AUDIT.md` to mark cleanup as complete
   - Update `CODEBASE-AUDIT-REPORT.md` to reflect final state
   - Update any architecture docs referencing root files

## Implementation Steps

### Step 0: Review coderef-core-updates/ (NEW)
- Review `coderef-core-updates/coderef-core/scanner.ts` for useful features
- Compare AST scanner implementations
- Document findings and decisions
- Extract any unique features worth preserving

### Step 1: Add ElementData to src/types/types.ts
- File: `src/types/types.ts`
- Action: Add `ElementData` and `ScanOptions` interfaces at the end of the file
- Verify: Check that structure matches root types.ts exactly

### Step 2: Update scanner.ts imports
- File: `scanner.ts`
- Action: Change import path from `'./types'` to `'./src/types/types.js'`
- Test: Verify scanner still works

### Step 3: Update src/ module imports
- Files: All files importing `ElementData` from root
- Action: Update import paths to use `src/types/types.js`
- Key files:
  - `src/adapter/graph-to-elements.ts`
  - `src/context/types.ts`
  - `src/analyzer/ast-element-scanner.ts`
  - `src/index.ts`

### Step 4: Add deprecation to parser.ts
- File: `parser.ts`
- Action: Add `@deprecated` JSDoc tags to all exported functions

### Step 5: Create compatibility layer (optional)
- File: `index.ts`
- Action: Add compatibility exports mapping old API to new
- Decision: Only if external consumers exist

### Step 6: Update documentation
- Files: All `.md` files in `docs/` and root
- Action: Replace old API references with new API
- Search for: `parseCoderefTag`, `ParsedCoderef`, `generateCoderefTag`

### Step 7: Update tsconfig.json
- File: `tsconfig.json`
- Action: Remove `"*.ts"` from include array

### Step 8: Remove coderef-core-updates/ (NEW)
- Directory: `coderef-core-updates/`
- Action: Delete entire directory after review
- Verify: Update tsconfig.json to remove exclusion
- Document: Archive any useful findings

### Step 9: Remove root files
- Files: `parser.ts`, `types.ts`, generated `.d.ts` and `.js` files
- Action: Delete files
- Verify: Run tests to ensure nothing breaks

### Step 10: Clean up index.ts
- File: `index.ts`
- Action: Remove legacy exports, keep only src/ exports (and scanner.ts if kept in root)

## Risk Assessment

### High Risk
- **Breaking external consumers**: If external packages use root parser/types, they will break
- **Mitigation**: Use compatibility shim, document migration path, provide deprecation period

### Medium Risk
- **Type incompatibility**: If ElementData structures differ, migration will fail
- **Mitigation**: Verify structures match exactly before migration

### Low Risk
- **Documentation out of sync**: Docs may reference old APIs
- **Mitigation**: Comprehensive documentation update in Step 6

## Testing Checklist

### Phase 0: Review
- [ ] coderef-core-updates/ reviewed and documented
- [ ] Useful features identified and extracted (if any)
- [ ] Decisions made on each experimental file

### Phase 1: Type Migration
- [ ] ElementData added to src/types/types.ts
- [ ] Scanner still works after ElementData migration
- [ ] All src/ modules compile after import updates
- [ ] All imports updated to use src/types/types.ts

### Phase 2: Parser Migration
- [ ] Deprecation warnings added to root parser.ts
- [ ] Compatibility shim created (if needed)
- [ ] Tests pass after parser migration
- [ ] Documentation examples work with new API

### Phase 3: Types Cleanup
- [ ] All imports migrated from root types.ts
- [ ] Root types.ts only contains unused types
- [ ] Verification complete

### Phase 4: Configuration
- [ ] tsconfig.json updated
- [ ] No TypeScript errors after tsconfig.json update

### Phase 5: Scanner Consolidation (if chosen)
- [ ] Scanner moved to src/scanner/ (if Option B)
- [ ] All imports updated
- [ ] All tests pass

### Phase 6: Remove coderef-core-updates/
- [ ] Directory removed
- [ ] tsconfig.json updated
- [ ] Documentation archived

### Phase 7: File Removal
- [ ] Root parser.ts and types.ts deleted
- [ ] Generated files cleaned up
- [ ] Build succeeds after file removal
- [ ] All tests pass

## Rollback Plan

If issues arise:
1. Revert import changes in scanner.ts and src/ modules
2. Restore root parser.ts and types.ts from git
3. Revert index.ts exports
4. Revert tsconfig.json changes

## Related Workorders

### WO-CONTEXT-INDEX-001: Context File Catalog
**Purpose:** Catalog all context-useful files across coderef projects for AI agent reference

**Key Results:**
- Created master index with **173 files** across 3 projects
- Organized by category:
  - Documentation (31 files)
  - Reference Sheets (38 files)
  - Guides (30 files)
  - Standards (5 files)
  - Schemas (3 files)
  - Templates (5 files)
  - Other (61 files)
- Project breakdown:
  - coderef-system: 45 files (26%)
  - coderef-dashboard: 109 files (63%)
  - coderef-core: 19 files (11%)
- Generated 4 index files: master + 3 project-specific indexes

**Value:** Centralized catalog for agents to find relevant documentation quickly during migration and consolidation work.

**Session Location:** `C:\Users\willh\.mcp-servers\coderef\sessions\create-context-index\`

**Reference:** Use `master-context-index.md` to locate relevant documentation when working on migration tasks.

---

## Success Criteria

### Final System State
- ✅ **One unified system** with regex and AST scanners
- ✅ **Regex scanner** (root or src/) - Multi-language support
- ✅ **AST element scanner** (`src/analyzer/ast-element-scanner.ts`) - TypeScript/JavaScript
- ✅ **AST analyzer** (`src/analyzer/`) - Full relationship analysis
- ✅ **Adapter layer** (`src/adapter/graph-to-elements.ts`) - Graph → ElementData[]
- ✅ **Unified parser** (`src/parser/parser.ts`) - EBNF-based CodeRef2
- ✅ **Unified types** (`src/types/types.ts`) - CodeRef2 type system
- ✅ **All scanners produce ElementData[]** - Compatible output format

### Cleanup Complete
- Root `parser.ts` and `types.ts` deleted
- `coderef-core-updates/` directory removed
- All imports use `src/` versions
- No TypeScript compilation errors
- All tests pass
- Documentation updated
- `tsconfig.json` excludes root files (except scanner.ts if kept in root)
- `index.ts` exports from `src/` (and scanner.ts if kept in root)

### System Capabilities
- ✅ Regex scanner supports 8+ languages (TS, JS, Python, Go, Rust, Java, C++, C)
- ✅ AST scanner provides 99% accuracy for TypeScript/JavaScript
- ✅ AST analyzer builds dependency graphs with relationships
- ✅ Adapter enables AST graph output to work with regex-based tooling
- ✅ Both scanners can be used independently or together


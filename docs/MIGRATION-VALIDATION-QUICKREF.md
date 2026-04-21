# Migration Validation Tool - Quick Reference for Agents

> **Quick Links**: Documentation, Examples, Tests, and Implementation Files

---

## 📚 Documentation

### Primary Documentation

1. **[User Guide](./MIGRATION-VALIDATION.md)** (900 lines)
   - **Path**: `packages/coderef-core/docs/MIGRATION-VALIDATION.md`
   - **Contents**: Quick start, API reference, usage examples, troubleshooting
   - **Start Here**: Best for learning how to use the tool
   - **Sections**:
     - Quick Start (3 steps to validate a migration)
     - Configuration Schema (complete reference)
     - Usage Examples (v1→v2, Flask→FastAPI, Monolith→Microservices)
     - API Reference (all 13 public functions)
     - Best Practices
     - Troubleshooting

2. **[Technical Specification](./MIGRATION-VALIDATION-SPEC.md)** (1200 lines)
   - **Path**: `packages/coderef-core/docs/MIGRATION-VALIDATION-SPEC.md`
   - **Contents**: Architecture, algorithms, data structures, performance analysis
   - **Start Here**: Best for understanding implementation details
   - **Sections**:
     - System Overview (component architecture, data flow)
     - Core Algorithms (pseudocode + complexity analysis)
     - API Specification (complete function signatures)
     - Data Structures (TypeScript interfaces)
     - Validation Rules (15 config rules, 5 runtime rules)
     - Testing Strategy (66 tests across 4 suites)

3. **[README.md Section](../README.md#4-migration-validation-validatormigration-mapperts-new)**
   - **Path**: `packages/coderef-core/README.md` (search for "Migration Validation")
   - **Contents**: Overview, quick example, key features
   - **Start Here**: Best for 2-minute overview

---

## 🔧 Implementation Files

### Core Implementation

| File | Lines | Purpose | Key Functions |
|------|-------|---------|---------------|
| **[migration-mapper.ts](../src/validator/migration-mapper.ts)** | 380 | Path transformation & coverage | `applyMappings()`, `calculateMigrationCoverage()`, `validateMigrationConfig()` |
| **[route-validator.ts](../src/validator/route-validator.ts)** | 434 | Migration orchestration | `validateMigration()`, `loadMigrationMapping()` |
| **[types.ts](../src/types/types.ts)** | (partial) | TypeScript interfaces | `MigrationMapping`, `MigrationReport`, `TransformedCall`, `MigrationCoverage` |
| **[index.ts](../src/index.ts)** | (exports) | Public API exports | All public functions exported here |

### Direct Links to Key Functions

```typescript
// Import examples
import {
  // Main validation function
  validateMigration,

  // Config validation
  validateMigrationConfig,
  loadMigrationMapping,

  // Path transformation
  applyMappings,
  applyExplicitMapping,
  applyPatternMapping,

  // Coverage analysis
  calculateMigrationCoverage,
  findUnmappedCalls,
  findDeprecatedCalls,
  groupCoverageByApiPrefix,

  // Helper functions
  checkRequiredFields,
  validateRegexPatterns,
  detectPathConflicts,
  checkDeprecatedAddedOverlap
} from '@coderef/core';
```

---

## 📝 Example Configuration Files

### Location: `packages/coderef-core/examples/migrations/`

1. **[migration-v1-to-v2.json](../examples/migrations/migration-v1-to-v2.json)**
   - **Use Case**: API version upgrade
   - **Pattern**: `/api/v1/*` → `/api/v2/*`
   - **Features**: Explicit mappings, regex patterns, method changes

2. **[migration-flask-to-fastapi.json](../examples/migrations/migration-flask-to-fastapi.json)**
   - **Use Case**: Framework migration
   - **Pattern**: Flask parameter syntax → FastAPI syntax
   - **Features**: Parameter conversion (`<int:id>` → `{id}`)

3. **[migration-monolith-to-microservices.json](../examples/migrations/migration-monolith-to-microservices.json)**
   - **Use Case**: Architecture transformation
   - **Pattern**: `/api/users/*` → `/users-service/api/*`
   - **Features**: Service split patterns, health check routes

---

## 🧪 Test Files (Usage Examples)

### Location: `packages/coderef-core/src/validator/`

1. **[migration-mapper.test.ts](../src/validator/migration-mapper.test.ts)** (438 lines)
   - **Tests**: 37 unit tests for transformation & config validation
   - **Best For**: Understanding how to use transformation functions
   - **Test Suites**:
     - `checkRequiredFields()` - 7 tests
     - `validateRegexPatterns()` - 4 tests
     - `detectPathConflicts()` - 3 tests
     - `checkDeprecatedAddedOverlap()` - 4 tests
     - `validateMigrationConfig()` - 2 tests
     - `applyExplicitMapping()` - 4 tests
     - `applyPatternMapping()` - 6 tests
     - `applyMappings()` - 6 tests

2. **[route-validator.test.ts](../src/validator/route-validator.test.ts)** (660 lines)
   - **Tests**: 29 tests for validation & coverage
   - **Best For**: Understanding end-to-end validation workflow
   - **Test Suites**:
     - `detectMissingRoutes()` - 6 tests
     - `detectUnusedRoutes()` - 4 tests
     - `detectMethodMismatches()` - 5 tests
     - `classifyIssue()` - 4 tests
     - `calculateMigrationCoverage()` - 5 tests
     - `findUnmappedCalls()` - 2 tests
     - `groupCoverageByApiPrefix()` - 3 tests

---

## 🚀 Quick Start for Agents

### Step 1: Read User Guide First

```bash
# Open the user guide
cat packages/coderef-core/docs/MIGRATION-VALIDATION.md
```

**Focus on**:
- "Quick Start" section (lines 15-80)
- "Usage Examples" section (lines 150-350)
- "API Reference" section (lines 400-700)

### Step 2: Review Example Configs

```bash
# See real-world migration configs
cat packages/coderef-core/examples/migrations/migration-v1-to-v2.json
cat packages/coderef-core/examples/migrations/migration-flask-to-fastapi.json
```

### Step 3: Study Test Files for Usage Patterns

```bash
# See how functions are used in tests
cat packages/coderef-core/src/validator/migration-mapper.test.ts
cat packages/coderef-core/src/validator/route-validator.test.ts
```

### Step 4: Check Implementation (Optional)

```bash
# Understand internal logic
cat packages/coderef-core/src/validator/migration-mapper.ts
cat packages/coderef-core/src/validator/route-validator.ts
```

---

## 📋 Common Tasks

### Task 1: Validate a Migration Config

```typescript
import { validateMigrationConfig, loadMigrationMapping } from '@coderef/core';

const config = await loadMigrationMapping('./migration-config.json');
const validation = validateMigrationConfig(config);

if (!validation.valid) {
  console.error('Errors:', validation.errors);
}
```

**See**:
- [User Guide § API Reference § validateMigrationConfig()](./MIGRATION-VALIDATION.md#612-validatemigrationconfig)
- [Test Example](../src/validator/migration-mapper.test.ts#L224-L267)

---

### Task 2: Transform a Single Path

```typescript
import { applyMappings } from '@coderef/core';

const result = applyMappings('/api/v1/users', migrationConfig);

console.log(result.transformedPath);  // '/api/v2/users'
console.log(result.confidence);       // 80
console.log(result.mappingRule);      // 'pattern'
```

**See**:
- [User Guide § API Reference § applyMappings()](./MIGRATION-VALIDATION.md#613-applymappings)
- [Test Example](../src/validator/migration-mapper.test.ts#L358-L437)

---

### Task 3: Run Full Migration Validation

```typescript
import { validateMigration } from '@coderef/core';

const report = await validateMigration(
  './.coderef/frontend-calls.json',
  './.coderef/routes-old.json',
  './.coderef/routes-new.json',
  './migration-config.json'
);

console.log(`Coverage: ${report.migration.coverage.coverage}%`);
console.log(`Unmapped: ${report.migration.unmapped.length}`);
console.log(`Critical Issues: ${report.summary.critical}`);
```

**See**:
- [User Guide § Quick Start](./MIGRATION-VALIDATION.md#quick-start)
- [User Guide § Complete Workflow Example](./MIGRATION-VALIDATION.md#complete-workflow-example)
- [Spec § Appendix A](./MIGRATION-VALIDATION-SPEC.md#appendix-a-example-workflow)

---

### Task 4: Calculate Coverage Metrics

```typescript
import { calculateMigrationCoverage } from '@coderef/core';

const coverage = calculateMigrationCoverage(
  oldRoutes,
  newRoutes,
  transformations
);

console.log(`Migrated: ${coverage.migratedRoutes} / ${coverage.totalOldRoutes}`);
console.log(`Coverage: ${coverage.coverage}%`);
```

**See**:
- [User Guide § API Reference § calculateMigrationCoverage()](./MIGRATION-VALIDATION.md#614-calculatemigrationcoverage)
- [Test Example](../src/validator/route-validator.test.ts#L458-L572)

---

### Task 5: Group Coverage by API Prefix

```typescript
import { groupCoverageByApiPrefix } from '@coderef/core';

const grouped = groupCoverageByApiPrefix(transformations);

Object.entries(grouped).forEach(([prefix, stats]) => {
  console.log(`${prefix}: ${stats.coverage}% (${stats.migrated}/${stats.total})`);
});

// Output:
// /api/users: 100% (5/5)
// /api/posts: 75% (3/4)
```

**See**:
- [User Guide § API Reference § groupCoverageByApiPrefix()](./MIGRATION-VALIDATION.md#616-groupcoveragebyapiprefix)
- [Test Example](../src/validator/route-validator.test.ts#L600-L660)

---

## 🎯 Learning Path for Agents

### Beginner Path (Understanding)
1. Read **README.md § Migration Validation** (5 min)
2. Read **User Guide § Quick Start** (10 min)
3. Review **migration-v1-to-v2.json** example (5 min)
4. Read **User Guide § API Reference § validateMigration()** (10 min)

**Total Time**: ~30 minutes

### Intermediate Path (Implementation)
1. Read **User Guide § Complete Workflow Example** (15 min)
2. Study **migration-mapper.test.ts** test cases (20 min)
3. Study **route-validator.test.ts** test cases (20 min)
4. Review **migration-mapper.ts** implementation (30 min)

**Total Time**: ~1.5 hours

### Advanced Path (Deep Dive)
1. Read **Technical Spec § Architecture** (20 min)
2. Read **Technical Spec § Core Algorithms** (30 min)
3. Read **Technical Spec § Data Structures** (20 min)
4. Review **route-validator.ts** implementation (30 min)
5. Understand **route-normalizer.ts** and **route-matcher.ts** (30 min)

**Total Time**: ~2.5 hours

---

## 📊 Quick Reference Tables

### Function Reference

| Function | Input | Output | Use Case |
|----------|-------|--------|----------|
| `validateMigration()` | 4 file paths | `MigrationReport` | Run complete validation |
| `validateMigrationConfig()` | Config object | `{ valid, errors }` | Validate config structure |
| `applyMappings()` | path, config | `TransformedCall` | Transform single path |
| `calculateMigrationCoverage()` | routes, transformations | `MigrationCoverage` | Get coverage metrics |
| `findUnmappedCalls()` | calls, transformations | `FrontendCall[]` | Find unmapped calls |
| `groupCoverageByApiPrefix()` | transformations | Coverage by prefix | Group coverage stats |

### File Reference

| File | Purpose | Start Here If... |
|------|---------|------------------|
| **MIGRATION-VALIDATION.md** | User guide | You want to use the tool |
| **MIGRATION-VALIDATION-SPEC.md** | Technical spec | You want to understand internals |
| **migration-mapper.test.ts** | Unit tests | You want to see usage examples |
| **route-validator.test.ts** | Integration tests | You want to see end-to-end flow |
| **migration-v1-to-v2.json** | Example config | You need a config template |
| **migration-mapper.ts** | Implementation | You need to debug/extend |

---

## 🔍 Search Tips

### Finding Specific Information

**Want to find...**

- **How to validate a config?**
  → Search `MIGRATION-VALIDATION.md` for "validateMigrationConfig"

- **How to handle unmapped routes?**
  → Search `MIGRATION-VALIDATION.md` for "Unmapped Detection"

- **What's the coverage formula?**
  → Search `MIGRATION-VALIDATION-SPEC.md` for "Coverage Formula"

- **How to write regex patterns?**
  → Search `migration-flask-to-fastapi.json` for examples

- **What are the validation rules?**
  → Search `MIGRATION-VALIDATION-SPEC.md` for "Validation Rules"

- **How to test transformations?**
  → Search `migration-mapper.test.ts` for "applyMappings"

---

## 🆘 Troubleshooting Reference

| Problem | Solution | Doc Section |
|---------|----------|-------------|
| Low coverage (<50%) | Add more patterns or explicit mappings | [User Guide § Troubleshooting § Issue 1](./MIGRATION-VALIDATION.md#issue-1-low-migration-coverage) |
| Regex not matching | Test regex directly, check escape chars | [User Guide § Troubleshooting § Issue 2](./MIGRATION-VALIDATION.md#issue-2-regex-pattern-not-matching) |
| Method mismatches | Add to `methodChanges` in config | [User Guide § Troubleshooting § Issue 3](./MIGRATION-VALIDATION.md#issue-3-method-mismatches-after-migration) |
| False deprecated warnings | Remove from `deprecated` or add to `paths` | [User Guide § Troubleshooting § Issue 4](./MIGRATION-VALIDATION.md#issue-4-false-positives-for-deprecated-routes) |
| Config validation fails | Check required fields and regex syntax | [Spec § Validation Rules](./MIGRATION-VALIDATION-SPEC.md#81-config-validation-rules) |

---

## 📦 Test Data & Fixtures

### Test Coverage: 66/66 tests (100%)

```bash
# Run all migration validation tests
cd packages/coderef-core
npm test -- migration-mapper.test.ts route-validator.test.ts

# Run specific test suite
npm test -- migration-mapper.test.ts -t "applyMappings"
npm test -- route-validator.test.ts -t "calculateMigrationCoverage"
```

**Test Files**:
- `migration-mapper.test.ts`: 37 tests (config validation, path transformation)
- `route-validator.test.ts`: 29 tests (validation, coverage analysis)

---

## 🎓 Agent Instructions

### For Code Generation Tasks

**If asked to create a migration config:**
1. Review `examples/migrations/migration-v1-to-v2.json`
2. Check schema in `MIGRATION-VALIDATION.md § Configuration Schema`
3. Use patterns from user guide examples
4. Validate using `validateMigrationConfig()`

**If asked to validate a migration:**
1. Use `validateMigration()` function
2. Follow workflow in `MIGRATION-VALIDATION.md § Complete Workflow Example`
3. Check for coverage thresholds (recommend ≥80%)
4. Report critical issues if any exist

**If asked to troubleshoot:**
1. Check `MIGRATION-VALIDATION.md § Troubleshooting`
2. Review test files for correct usage patterns
3. Validate config first using `validateMigrationConfig()`
4. Use `groupCoverageByApiPrefix()` to identify problem areas

---

## 📞 Quick Links Summary

| Resource | Path | Lines | Purpose |
|----------|------|-------|---------|
| **User Guide** | `docs/MIGRATION-VALIDATION.md` | 900 | Learn how to use |
| **Tech Spec** | `docs/MIGRATION-VALIDATION-SPEC.md` | 1200 | Understand internals |
| **README** | `README.md` (search "Migration") | 50 | Quick overview |
| **Implementation** | `src/validator/migration-mapper.ts` | 380 | Core logic |
| **Orchestration** | `src/validator/route-validator.ts` | 434 | Validation flow |
| **Tests** | `src/validator/migration-mapper.test.ts` | 438 | Usage examples |
| **Tests** | `src/validator/route-validator.test.ts` | 660 | Integration tests |
| **Example 1** | `examples/migrations/migration-v1-to-v2.json` | 25 | API version |
| **Example 2** | `examples/migrations/migration-flask-to-fastapi.json` | 30 | Framework |
| **Example 3** | `examples/migrations/migration-monolith-to-microservices.json` | 52 | Architecture |

---

**Last Updated**: 2026-01-25
**Work Order**: WO-MIGRATION-VALIDATION-001
**Status**: ✅ Complete (100% test coverage, production-ready)

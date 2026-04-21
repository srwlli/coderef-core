# Migration Validation

> **WO-MIGRATION-VALIDATION-001**: Automated migration validation for API route transformations

## Overview

The Migration Validation system validates frontend-to-backend API consistency during platform migrations (e.g., v1→v2, Flask→FastAPI, monolith→microservices). It transforms frontend API calls using mapping rules, validates against new server routes, and calculates migration coverage metrics.

### Features

✅ **Path Transformation** - Map old routes to new routes using explicit mappings or regex patterns
✅ **Multi-Framework Support** - Flask, FastAPI, Express, Next.js route normalization
✅ **Coverage Metrics** - Calculate migration completeness (% of routes migrated)
✅ **Unmapped Detection** - Identify frontend calls with no migration rule
✅ **Deprecated Tracking** - Find calls to deprecated routes that should be updated
✅ **Method Validation** - Detect HTTP method changes during migration
✅ **Confidence Scoring** - Track transformation confidence (explicit=100%, pattern=80%, unmapped=0%)

---

## Quick Start

### 1. Create Migration Config

```json
{
  "version": "1.0.0",
  "name": "API v1 to v2 Migration",
  "mappings": {
    "paths": {
      "/api/upload": "/api/v2/files/upload"
    },
    "patterns": [
      { "find": "^/api/v1/(.*)", "replace": "/api/v2/$1" }
    ],
    "deprecated": ["/api/legacy/upload"],
    "added": ["/api/v2/webhooks"]
  },
  "metadata": {
    "source": "API v1",
    "target": "API v2",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

### 2. Run Migration Validation

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
console.log(`Deprecated: ${report.migration.deprecated.length}`);
```

### 3. View Results

```typescript
// Migration coverage
console.log(`
  Total Old Routes: ${report.migration.coverage.totalOldRoutes}
  Total New Routes: ${report.migration.coverage.totalNewRoutes}
  Migrated Routes: ${report.migration.coverage.migratedRoutes}
  Coverage: ${report.migration.coverage.coverage}%
`);

// Standard validation issues
console.log(`Critical Issues: ${report.summary.critical}`);
console.log(`Warnings: ${report.summary.warnings}`);
```

---

## Configuration Schema

### Complete Schema

```typescript
interface MigrationMapping {
  version: string;  // SemVer (e.g., "1.0.0")
  name: string;     // Human-readable migration name

  mappings: {
    // Explicit 1:1 mappings (highest priority, 100% confidence)
    paths?: Record<string, string>;

    // Regex-based patterns (medium priority, 80% confidence)
    patterns?: Array<{
      find: string;    // Regex pattern
      replace: string; // Replacement with $1, $2 capture groups
    }>;

    // HTTP method changes
    methodChanges?: Record<string, { old: string; new: string }>;

    // Routes removed in new system
    deprecated?: string[];

    // Routes added in new system (not in old)
    added?: string[];
  };

  metadata: {
    source: string;       // Source system name
    target: string;       // Target system name
    createdAt: string;    // ISO 8601 timestamp
    description?: string; // Optional migration description
  };
}
```

### Mapping Priority

Transformations are applied in order of priority:

1. **Explicit mappings** (`paths`) - 100% confidence
   - Direct dictionary lookup
   - Use for special cases or exceptions

2. **Pattern mappings** (`patterns`) - 80% confidence
   - Regex find/replace
   - Use for systematic transformations

3. **Unmapped** - 0% confidence
   - No rule matched
   - Original path preserved

---

## Usage Examples

### Example 1: API Version Migration (v1 → v2)

**Scenario**: Upgrade API from `/api/v1/*` to `/api/v2/*`

```json
{
  "version": "1.0.0",
  "name": "API v1 to v2 Migration",
  "mappings": {
    "patterns": [
      {
        "find": "^/api/v1/(.*)",
        "replace": "/api/v2/$1"
      }
    ],
    "paths": {
      "/api/upload": "/api/v2/files/upload",
      "/api/search": "/api/v2/search/query"
    },
    "methodChanges": {
      "/api/v2/auth": { "old": "POST", "new": "PUT" }
    },
    "deprecated": ["/api/legacy/upload"],
    "added": ["/api/v2/webhooks", "/api/v2/health"]
  },
  "metadata": {
    "source": "API v1",
    "target": "API v2",
    "createdAt": "2024-01-15T10:00:00Z",
    "description": "Systematic v1 to v2 migration with explicit overrides"
  }
}
```

**Transformation Examples**:
- `/api/v1/users` → `/api/v2/users` (pattern, 80% confidence)
- `/api/upload` → `/api/v2/files/upload` (explicit, 100% confidence)
- `/api/v3/posts` → `/api/v3/posts` (unmapped, 0% confidence)

---

### Example 2: Framework Migration (Flask → FastAPI)

**Scenario**: Migrate from Flask to FastAPI, converting parameter syntax

```json
{
  "version": "1.0.0",
  "name": "Flask to FastAPI Migration",
  "mappings": {
    "paths": {
      "/users/<int:id>": "/users/{id}",
      "/posts/<slug>": "/posts/{slug}",
      "/categories/<int:category_id>/posts": "/categories/{category_id}/posts"
    },
    "patterns": [
      {
        "find": "/<int:([a-z_]+)>",
        "replace": "/{$1}"
      },
      {
        "find": "/<string:([a-z_]+)>",
        "replace": "/{$1}"
      },
      {
        "find": "/<path:([a-z_]+)>",
        "replace": "/{$1:path}"
      }
    ],
    "deprecated": ["/legacy/upload"],
    "added": [
      "/docs",
      "/openapi.json",
      "/health",
      "/metrics"
    ]
  },
  "metadata": {
    "source": "Flask",
    "target": "FastAPI",
    "createdAt": "2024-01-15T11:00:00Z",
    "description": "Flask to FastAPI migration with parameter syntax conversion"
  }
}
```

**Transformation Examples**:
- `/users/<int:id>` → `/users/{id}` (explicit, 100% confidence)
- `/posts/<slug>` → `/posts/{slug}` (explicit, 100% confidence)
- `/api/<string:resource>` → `/api/{resource}` (pattern, 80% confidence)

---

### Example 3: Monolith → Microservices

**Scenario**: Split monolithic API into domain-driven microservices

```json
{
  "version": "1.0.0",
  "name": "Monolith to Microservices Migration",
  "mappings": {
    "patterns": [
      {
        "find": "^/api/users/(.*)",
        "replace": "/users-service/api/$1"
      },
      {
        "find": "^/api/posts/(.*)",
        "replace": "/content-service/api/$1"
      },
      {
        "find": "^/api/comments/(.*)",
        "replace": "/content-service/api/comments/$1"
      },
      {
        "find": "^/api/auth/(.*)",
        "replace": "/auth-service/api/$1"
      },
      {
        "find": "^/api/files/(.*)",
        "replace": "/storage-service/api/$1"
      }
    ],
    "paths": {
      "/api/search": "/search-service/api/search",
      "/api/analytics": "/analytics-service/api/events"
    },
    "deprecated": [
      "/api/legacy/reports",
      "/api/admin/stats"
    ],
    "added": [
      "/users-service/health",
      "/content-service/health",
      "/auth-service/health",
      "/storage-service/health",
      "/search-service/health",
      "/analytics-service/health"
    ]
  },
  "metadata": {
    "source": "Monolith",
    "target": "Microservices",
    "createdAt": "2024-01-15T12:00:00Z",
    "description": "Splits monolithic API into domain-driven microservices"
  }
}
```

**Transformation Examples**:
- `/api/users/profile` → `/users-service/api/profile` (pattern, 80% confidence)
- `/api/posts/123` → `/content-service/api/123` (pattern, 80% confidence)
- `/api/search` → `/search-service/api/search` (explicit, 100% confidence)

---

## API Reference

### Core Functions

#### `validateMigration()`

Validate migration between old and new route systems.

```typescript
async function validateMigration(
  frontendCallsPath: string,
  oldRoutesPath: string,
  newRoutesPath: string,
  migrationConfigPath: string
): Promise<MigrationReport>
```

**Parameters**:
- `frontendCallsPath` - Path to `frontend-calls.json`
- `oldRoutesPath` - Path to old `routes.json`
- `newRoutesPath` - Path to new `routes.json`
- `migrationConfigPath` - Path to `migration-config.json`

**Returns**: `MigrationReport` with:
- `totalFrontendCalls` - Number of frontend API calls
- `totalServerRoutes` - Number of server routes in new system
- `matchedRoutes` - Routes successfully matched
- `issues` - Validation issues (missing routes, method mismatches, etc.)
- `summary` - Issue count by severity (critical, warnings, info)
- `migration` - Migration-specific data:
  - `totalMapped` - Routes with successful transformation
  - `unmapped` - Frontend calls with no mapping rule
  - `deprecated` - Calls to deprecated routes
  - `coverage` - Coverage metrics

**Example**:
```typescript
const report = await validateMigration(
  './.coderef/frontend-calls.json',
  './.coderef/routes-old.json',
  './.coderef/routes-new.json',
  './migration-v1-to-v2.json'
);

if (report.migration.coverage.coverage < 80) {
  console.error('Migration coverage below 80%!');
}
```

---

#### `validateMigrationConfig()`

Validate migration config structure and detect issues.

```typescript
function validateMigrationConfig(
  config: any
): { valid: boolean; errors: string[] }
```

**Validation Checks**:
- ✅ Required fields present (version, name, mappings, metadata)
- ✅ Regex patterns are valid
- ✅ No duplicate path mappings
- ✅ No overlap between deprecated and added routes

**Example**:
```typescript
import { validateMigrationConfig, loadMigrationMapping } from '@coderef/core';

const config = await loadMigrationMapping('./migration-config.json');
const validation = validateMigrationConfig(config);

if (!validation.valid) {
  console.error('Config errors:', validation.errors);
  process.exit(1);
}
```

---

#### `applyMappings()`

Apply migration mappings to a single path.

```typescript
function applyMappings(
  path: string,
  config: MigrationMapping
): {
  originalPath: string;
  transformedPath: string;
  confidence: number;
  mappingRule: 'explicit' | 'pattern' | 'unmapped';
}
```

**Example**:
```typescript
import { applyMappings } from '@coderef/core';

const result = applyMappings('/api/v1/users', migrationConfig);

console.log(result.transformedPath);  // '/api/v2/users'
console.log(result.confidence);       // 80
console.log(result.mappingRule);      // 'pattern'
```

---

#### `calculateMigrationCoverage()`

Calculate migration coverage metrics.

```typescript
function calculateMigrationCoverage(
  oldRoutes: Array<{ path: string }>,
  newRoutes: Array<{ path: string }>,
  transformations: Array<{ confidence: number }>
): MigrationCoverage
```

**Returns**:
```typescript
interface MigrationCoverage {
  totalOldRoutes: number;     // Routes in old system
  totalNewRoutes: number;     // Routes in new system
  migratedRoutes: number;     // Routes with mapping (confidence > 0)
  newlyAddedRoutes: number;   // Routes in new but not old
  coverage: number;           // (migratedRoutes / totalOldRoutes) * 100
}
```

**Example**:
```typescript
const coverage = calculateMigrationCoverage(
  oldRoutes,
  newRoutes,
  transformations
);

console.log(`Migration Coverage: ${coverage.coverage}%`);
console.log(`Migrated: ${coverage.migratedRoutes} / ${coverage.totalOldRoutes}`);
console.log(`Newly Added: ${coverage.newlyAddedRoutes}`);
```

---

#### `findUnmappedCalls()`

Find frontend calls with no mapping rule.

```typescript
function findUnmappedCalls(
  calls: Array<FrontendCall>,
  transformations: Array<{ confidence: number; mappingRule: string }>
): Array<FrontendCall>
```

**Example**:
```typescript
const unmapped = findUnmappedCalls(frontendCalls, transformations);

console.log(`Unmapped calls: ${unmapped.length}`);
unmapped.forEach(call => {
  console.log(`  ${call.method} ${call.path} (${call.file}:${call.line})`);
});
```

---

#### `groupCoverageByApiPrefix()`

Group coverage metrics by API prefix (e.g., `/api/users`, `/api/posts`).

```typescript
function groupCoverageByApiPrefix(
  transformations: Array<{ originalPath: string; confidence: number }>
): Record<string, { total: number; migrated: number; coverage: number }>
```

**Example**:
```typescript
const grouped = groupCoverageByApiPrefix(transformations);

Object.entries(grouped).forEach(([prefix, stats]) => {
  console.log(`${prefix}: ${stats.coverage}% (${stats.migrated}/${stats.total})`);
});

// Output:
// /api/users: 100% (5/5)
// /api/posts: 75% (3/4)
// /api/admin: 50% (1/2)
```

---

## Coverage Metrics

### Understanding Coverage

**Migration Coverage** = `(migratedRoutes / totalOldRoutes) * 100`

- `migratedRoutes` - Routes with `confidence > 0` (explicit or pattern match)
- `totalOldRoutes` - Total routes in old system
- `totalNewRoutes` - Total routes in new system
- `newlyAddedRoutes` - Routes in new system not in old system

### Coverage Thresholds

| Coverage | Status | Action |
|----------|--------|--------|
| 90-100% | ✅ Excellent | Ready for migration |
| 75-89% | ⚠️ Good | Review unmapped routes |
| 50-74% | ⚠️ Moderate | Add more mapping rules |
| 0-49% | ❌ Poor | Significant work needed |

### Improving Coverage

1. **Add Explicit Mappings** for unmapped routes
2. **Refine Regex Patterns** to catch edge cases
3. **Review Deprecated Routes** - Are they truly unused?
4. **Check Frontend Calls** - Are some calls outdated?

---

## Best Practices

### 1. Start with Patterns, Add Explicit Mappings

```json
{
  "mappings": {
    "patterns": [
      { "find": "^/api/v1/(.*)", "replace": "/api/v2/$1" }
    ],
    "paths": {
      "/api/upload": "/api/v2/files/upload",  // Exception
      "/api/search": "/api/v2/search/query"   // Exception
    }
  }
}
```

**Why**: Patterns handle 80% of routes, explicit mappings handle edge cases.

---

### 2. Test Regex Patterns Before Deployment

```typescript
import { applyPatternMapping } from '@coderef/core';

const patterns = [
  { find: '^/api/v1/(.*)', replace: '/api/v2/$1' }
];

// Test cases
const testPaths = [
  '/api/v1/users',
  '/api/v1/posts/123',
  '/api/v2/already-migrated'
];

testPaths.forEach(path => {
  const result = applyPatternMapping(path, patterns);
  console.log(`${path} → ${result || 'NO MATCH'}`);
});
```

---

### 3. Version Your Migration Configs

```
migrations/
  migration-v1-to-v2.json
  migration-flask-to-fastapi.json
  migration-monolith-to-microservices.json
```

**Why**: Track migration history, enable rollback

---

### 4. Validate Config Before Use

```typescript
import { validateMigrationConfig, loadMigrationMapping } from '@coderef/core';

async function safeMigration(configPath: string) {
  const config = await loadMigrationMapping(configPath);

  const validation = validateMigrationConfig(config);
  if (!validation.valid) {
    throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
  }

  // Proceed with migration...
}
```

---

### 5. Set Coverage Thresholds in CI/CD

```typescript
const report = await validateMigration(...);

if (report.migration.coverage.coverage < 80) {
  console.error(`Migration coverage ${report.migration.coverage.coverage}% < 80%`);
  process.exit(1);
}

if (report.summary.critical > 0) {
  console.error(`${report.summary.critical} critical issues found`);
  process.exit(1);
}
```

---

## Troubleshooting

### Issue 1: Low Migration Coverage

**Symptom**: `coverage.coverage < 50%`

**Possible Causes**:
1. Missing pattern rules
2. Frontend calls use outdated paths
3. New routes have different structure

**Solution**:
```typescript
// 1. Find unmapped calls
const unmapped = report.migration.unmapped;
console.log('Unmapped calls:', unmapped.map(c => c.path));

// 2. Group by prefix to identify patterns
const grouped = groupCoverageByApiPrefix(transformations);
console.log('Coverage by prefix:', grouped);

// 3. Add patterns for common prefixes
```

---

### Issue 2: Regex Pattern Not Matching

**Symptom**: Routes not transformed as expected

**Debug**:
```typescript
import { applyPatternMapping } from '@coderef/core';

const patterns = [
  { find: '^/api/v1/(.*)', replace: '/api/v2/$1' }
];

const testPath = '/api/v1/users/123';
const result = applyPatternMapping(testPath, patterns);

console.log(`Input: ${testPath}`);
console.log(`Output: ${result}`);
console.log(`Expected: /api/v2/users/123`);

// Test regex directly
const regex = new RegExp('^/api/v1/(.*)');
console.log('Regex matches:', regex.test(testPath));
console.log('Capture groups:', testPath.match(regex));
```

---

### Issue 3: Method Mismatches After Migration

**Symptom**: `report.issues` contains `method_mismatch` errors

**Solution**:
```json
{
  "mappings": {
    "methodChanges": {
      "/api/v2/auth": { "old": "POST", "new": "PUT" },
      "/api/v2/users": { "old": "GET", "new": "POST" }
    }
  }
}
```

---

### Issue 4: False Positives for Deprecated Routes

**Symptom**: Calls flagged as deprecated but should be allowed

**Solution**: Remove from `deprecated` array or add to `paths` mapping

```json
{
  "mappings": {
    "deprecated": [
      "/api/legacy/upload"
      // Removed "/api/upload" - still in use
    ],
    "paths": {
      "/api/upload": "/api/v2/files/upload"  // Map instead of deprecate
    }
  }
}
```

---

## Integration with Route Validation

Migration validation extends the base route validation system:

```typescript
// Standard route validation
import { generateValidationReport } from '@coderef/core';

const standardReport = await generateValidationReport(
  './.coderef/frontend-calls.json',
  './.coderef/routes.json'
);

// Migration validation (with transformation)
import { validateMigration } from '@coderef/core';

const migrationReport = await validateMigration(
  './.coderef/frontend-calls.json',
  './.coderef/routes-old.json',
  './.coderef/routes-new.json',
  './migration-config.json'
);

// Both return compatible RouteValidation structure
console.log(standardReport.summary);   // { critical, warnings, info }
console.log(migrationReport.summary);  // { critical, warnings, info }

// Migration report adds migration-specific data
console.log(migrationReport.migration.coverage);
console.log(migrationReport.migration.unmapped);
```

---

## Complete Workflow Example

```typescript
import {
  validateMigration,
  validateMigrationConfig,
  loadMigrationMapping,
  groupCoverageByApiPrefix
} from '@coderef/core';

async function runMigrationValidation() {
  // 1. Load and validate config
  const config = await loadMigrationMapping('./migration-v1-to-v2.json');
  const configValidation = validateMigrationConfig(config);

  if (!configValidation.valid) {
    console.error('Config errors:', configValidation.errors);
    return;
  }

  // 2. Run migration validation
  const report = await validateMigration(
    './.coderef/frontend-calls.json',
    './.coderef/routes-old.json',
    './.coderef/routes-new.json',
    './migration-v1-to-v2.json'
  );

  // 3. Display coverage metrics
  console.log('=== Migration Coverage ===');
  console.log(`Total: ${report.migration.coverage.coverage}%`);
  console.log(`Migrated: ${report.migration.coverage.migratedRoutes} / ${report.migration.coverage.totalOldRoutes}`);
  console.log(`Newly Added: ${report.migration.coverage.newlyAddedRoutes}`);

  // 4. Display issues by severity
  console.log('\n=== Validation Issues ===');
  console.log(`Critical: ${report.summary.critical}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Info: ${report.summary.info}`);

  // 5. Display unmapped calls
  if (report.migration.unmapped.length > 0) {
    console.log('\n=== Unmapped Calls ===');
    report.migration.unmapped.forEach(call => {
      console.log(`  ${call.method} ${call.path} (${call.file}:${call.line})`);
    });
  }

  // 6. Display deprecated calls
  if (report.migration.deprecated.length > 0) {
    console.log('\n=== Deprecated Calls (Need Update) ===');
    report.migration.deprecated.forEach(call => {
      console.log(`  ${call.method} ${call.path} (${call.file}:${call.line})`);
    });
  }

  // 7. Display coverage by API prefix
  const transformations = /* extract from report */;
  const grouped = groupCoverageByApiPrefix(transformations);

  console.log('\n=== Coverage by API Prefix ===');
  Object.entries(grouped).forEach(([prefix, stats]) => {
    console.log(`  ${prefix}: ${stats.coverage}% (${stats.migrated}/${stats.total})`);
  });

  // 8. Exit with error if coverage too low
  if (report.migration.coverage.coverage < 80) {
    console.error('\n❌ Migration coverage below 80%!');
    process.exit(1);
  }

  if (report.summary.critical > 0) {
    console.error('\n❌ Critical issues found!');
    process.exit(1);
  }

  console.log('\n✅ Migration validation passed!');
}

runMigrationValidation();
```

---

## Related Documentation

- [Route Validation](./ROUTE-VALIDATION.md) - Base route validation system
- [API Route Detection](./API-ROUTE-DETECTION.md) - How routes are detected
- [Frontend Call Detection](./FRONTEND-CALL-DETECTION.md) - How frontend calls are detected

---

## License

MIT

---

**Generated with**: WO-MIGRATION-VALIDATION-001
**Last Updated**: 2026-01-25

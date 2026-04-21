# How an Agent Uses the Migration Validation Tool

> **Practical Guide**: Step-by-step workflows for AI agents to use migration validation

---

## Table of Contents

1. [Agent Workflow Overview](#agent-workflow-overview)
2. [Scenario 1: User Wants to Validate a Migration](#scenario-1-user-wants-to-validate-a-migration)
3. [Scenario 2: User Wants to Create Migration Config](#scenario-2-user-wants-to-create-migration-config)
4. [Scenario 3: User Reports Low Coverage](#scenario-3-user-reports-low-coverage)
5. [Scenario 4: User Has Unmapped Routes](#scenario-4-user-has-unmapped-routes)
6. [Scenario 5: User Needs to Debug Config Errors](#scenario-5-user-needs-to-debug-config-errors)
7. [Agent Decision Tree](#agent-decision-tree)
8. [Common Agent Mistakes to Avoid](#common-agent-mistakes-to-avoid)

---

## Agent Workflow Overview

### What is the Migration Validation Tool?

**Purpose**: Validate API route migrations by transforming frontend calls and checking against new server routes.

**When to Use**:
- User is migrating APIs (v1→v2, Flask→FastAPI, monolith→microservices)
- User wants to ensure frontend-backend consistency during migration
- User needs migration coverage metrics
- User wants to find unmapped or deprecated routes

**When NOT to Use**:
- User just wants standard route validation (use `generateValidationReport()` instead)
- User is not performing a migration
- User doesn't have both old and new route systems

---

## Scenario 1: User Wants to Validate a Migration

### User Request
> "I'm migrating from API v1 to v2. Can you validate that all my frontend calls will work with the new API?"

### Agent Workflow

#### Step 1: Understand Context
Ask clarifying questions if needed:
- ✅ "Do you have a migration config file already?"
- ✅ "What files do you have? (frontend-calls.json, routes-old.json, routes-new.json)"
- ✅ "What's the migration pattern? (e.g., /api/v1/* → /api/v2/*)"

#### Step 2: Check Prerequisites
Verify required files exist:

```typescript
// Agent uses Read tool to check files
const requiredFiles = [
  './.coderef/frontend-calls.json',
  './.coderef/routes-old.json', // or routes.json if no old version
  './.coderef/routes-new.json',
  './migration-config.json' // May need to create this
];

for (const file of requiredFiles) {
  try {
    await Read({ file_path: file });
  } catch (error) {
    // File missing - inform user or offer to help create it
  }
}
```

#### Step 3: Review Migration Config (or Create It)

**If config exists:**
```typescript
// Read and validate config
const configContent = await Read({
  file_path: './migration-config.json'
});

// Validate using the tool
import { validateMigrationConfig } from '@coderef/core';
const validation = validateMigrationConfig(JSON.parse(configContent));

if (!validation.valid) {
  // Report errors to user and offer fixes
  console.log("Config has errors:", validation.errors);
}
```

**If config doesn't exist:**
Offer to create one (see Scenario 2)

#### Step 4: Run Validation

```typescript
// Create a Node.js script to run validation
const scriptContent = `
import { validateMigration } from '@coderef/core';

async function runValidation() {
  const report = await validateMigration(
    './.coderef/frontend-calls.json',
    './.coderef/routes-old.json',
    './.coderef/routes-new.json',
    './migration-config.json'
  );

  console.log('=== Migration Coverage ===');
  console.log(\`Total: \${report.migration.coverage.coverage}%\`);
  console.log(\`Migrated: \${report.migration.coverage.migratedRoutes} / \${report.migration.coverage.totalOldRoutes}\`);
  console.log(\`Newly Added: \${report.migration.coverage.newlyAddedRoutes}\`);

  console.log('\\n=== Validation Issues ===');
  console.log(\`Critical: \${report.summary.critical}\`);
  console.log(\`Warnings: \${report.summary.warnings}\`);

  if (report.migration.unmapped.length > 0) {
    console.log('\\n=== Unmapped Calls ===');
    report.migration.unmapped.forEach(call => {
      console.log(\`  \${call.method} \${call.path} (\${call.file}:\${call.line})\`);
    });
  }

  if (report.migration.deprecated.length > 0) {
    console.log('\\n=== Deprecated Calls ===');
    report.migration.deprecated.forEach(call => {
      console.log(\`  \${call.method} \${call.path} (\${call.file}:\${call.line})\`);
    });
  }

  // Check thresholds
  if (report.migration.coverage.coverage < 80) {
    console.error('\\n❌ Migration coverage below 80%!');
    process.exit(1);
  }

  if (report.summary.critical > 0) {
    console.error('\\n❌ Critical issues found!');
    process.exit(1);
  }

  console.log('\\n✅ Migration validation passed!');
}

runValidation();
`;

// Write script
await Write({
  file_path: './validate-migration.js',
  content: scriptContent
});

// Run script
await Bash({
  command: 'node validate-migration.js',
  description: 'Run migration validation'
});
```

#### Step 5: Interpret Results

**Good Result (Coverage ≥ 80%, No Critical Issues):**
```
Agent Response:
"✅ Migration validation passed!

Coverage: 95%
- Migrated: 38/40 routes
- Newly Added: 5 routes (webhooks, health checks)

All frontend calls have been mapped to new routes. The migration looks good!"
```

**Bad Result (Coverage < 80% or Critical Issues):**
```
Agent Response:
"⚠️ Migration validation found issues:

Coverage: 65% (26/40 routes migrated)

Unmapped Calls (14):
- GET /api/users/profile (app.tsx:45)
- POST /api/upload (form.tsx:120)
...

I recommend:
1. Adding explicit mappings for unmapped routes
2. Reviewing if some routes are deprecated
3. Updating the migration config

Would you like me to help fix the config?"
```

---

## Scenario 2: User Wants to Create Migration Config

### User Request
> "I need to create a migration config for upgrading from v1 to v2 API"

### Agent Workflow

#### Step 1: Gather Information

Ask questions:
```
Agent: "To create the migration config, I need to know:

1. What's the systematic pattern for the migration?
   Example: /api/v1/* → /api/v2/*

2. Are there any special cases that don't follow the pattern?
   Example: /api/upload → /api/v2/files/upload

3. Are there any deprecated routes being removed?

4. Are there any new routes being added?"
```

#### Step 2: Analyze Existing Routes (Optional)

```typescript
// Read old and new routes to identify patterns
const oldRoutes = JSON.parse(await Read({
  file_path: './.coderef/routes-old.json'
}));

const newRoutes = JSON.parse(await Read({
  file_path: './.coderef/routes-new.json'
}));

// Analyze patterns (agent logic)
// - Compare route prefixes
// - Identify systematic changes
// - Find routes only in old (deprecated)
// - Find routes only in new (added)
```

#### Step 3: Create Config Based on Pattern

**Example: Simple Version Migration**
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
    "paths": {},
    "deprecated": [],
    "added": []
  },
  "metadata": {
    "source": "API v1",
    "target": "API v2",
    "createdAt": "2026-01-25T10:00:00Z",
    "description": "Systematic v1 to v2 migration"
  }
}
```

**Example: Framework Migration (Flask → FastAPI)**
```json
{
  "version": "1.0.0",
  "name": "Flask to FastAPI Migration",
  "mappings": {
    "paths": {
      "/users/<int:id>": "/users/{id}",
      "/posts/<slug>": "/posts/{slug}"
    },
    "patterns": [
      {
        "find": "/<int:([a-z_]+)>",
        "replace": "/{$1}"
      },
      {
        "find": "/<string:([a-z_]+)>",
        "replace": "/{$1}"
      }
    ],
    "deprecated": [],
    "added": ["/docs", "/openapi.json", "/health"]
  },
  "metadata": {
    "source": "Flask",
    "target": "FastAPI",
    "createdAt": "2026-01-25T10:00:00Z",
    "description": "Flask to FastAPI migration with parameter syntax conversion"
  }
}
```

#### Step 4: Validate Config

```typescript
import { validateMigrationConfig } from '@coderef/core';

const config = JSON.parse(configContent);
const validation = validateMigrationConfig(config);

if (!validation.valid) {
  // Fix errors before proceeding
  console.error('Config errors:', validation.errors);
}
```

#### Step 5: Test Config

```typescript
// Test a few paths manually
import { applyMappings } from '@coderef/core';

const testPaths = [
  '/api/v1/users',
  '/api/v1/posts/123',
  '/api/upload'
];

testPaths.forEach(path => {
  const result = applyMappings(path, config);
  console.log(`${path} → ${result.transformedPath} (${result.confidence}% confidence, ${result.mappingRule})`);
});
```

---

## Scenario 3: User Reports Low Coverage

### User Request
> "The migration validation shows only 45% coverage. How do I fix this?"

### Agent Workflow

#### Step 1: Analyze Unmapped Routes

```typescript
// Run validation to get unmapped calls
const report = await validateMigration(...);

// Group unmapped calls by pattern
const unmapped = report.migration.unmapped;

// Agent analyzes patterns
const pathsByPrefix = {};
unmapped.forEach(call => {
  const prefix = call.path.split('/').slice(0, 3).join('/');
  if (!pathsByPrefix[prefix]) {
    pathsByPrefix[prefix] = [];
  }
  pathsByPrefix[prefix].push(call.path);
});

// Show grouped results to user
console.log('Unmapped routes by prefix:');
Object.entries(pathsByPrefix).forEach(([prefix, paths]) => {
  console.log(`${prefix}: ${paths.length} routes`);
  paths.slice(0, 3).forEach(p => console.log(`  - ${p}`));
});
```

#### Step 2: Suggest Fixes

```
Agent Response:
"I found patterns in your unmapped routes:

/api/legacy/*: 12 routes
  - /api/legacy/upload
  - /api/legacy/export
  - /api/legacy/reports

/api/admin/*: 8 routes
  - /api/admin/users
  - /api/admin/settings

Recommendations:
1. Add pattern for /api/legacy/* → /api/v2/legacy/*
2. Add pattern for /api/admin/* → /api/v2/admin/*

Or mark these as deprecated if they're being removed.

Would you like me to update the config?"
```

#### Step 3: Update Config

```typescript
// Agent updates migration config
const config = JSON.parse(await Read({ file_path: './migration-config.json' }));

// Add new patterns
config.mappings.patterns.push({
  find: "^/api/legacy/(.*)",
  replace: "/api/v2/legacy/$1"
});

config.mappings.patterns.push({
  find: "^/api/admin/(.*)",
  replace: "/api/v2/admin/$1"
});

// Write updated config
await Write({
  file_path: './migration-config.json',
  content: JSON.stringify(config, null, 2)
});
```

#### Step 4: Re-validate

```bash
# Agent runs validation again
node validate-migration.js
```

---

## Scenario 4: User Has Unmapped Routes

### User Request
> "I have 15 unmapped routes. What should I do with them?"

### Agent Workflow

#### Step 1: Categorize Unmapped Routes

```typescript
// Get unmapped routes
const unmapped = report.migration.unmapped;

// Agent logic to categorize:
// 1. Should be mapped (add to config)
// 2. Should be deprecated (add to deprecated list)
// 3. Errors (fix frontend calls)

// Ask user for each category
console.log('Found 15 unmapped routes. Let me help categorize them:');

console.log('\nThese look like they should be migrated:');
console.log('  /api/users/search');
console.log('  /api/users/export');
console.log('→ Add mapping pattern?');

console.log('\nThese look deprecated:');
console.log('  /api/legacy/upload');
console.log('  /api/old/reports');
console.log('→ Mark as deprecated?');

console.log('\nThese might be errors:');
console.log('  /api/v3/test (calls v3 but migrating to v2?)');
console.log('→ Need frontend fix?');
```

#### Step 2: Offer Solutions

**Option A: Add Explicit Mappings**
```json
{
  "mappings": {
    "paths": {
      "/api/users/search": "/api/v2/search/users",
      "/api/users/export": "/api/v2/export/users"
    }
  }
}
```

**Option B: Add Pattern**
```json
{
  "mappings": {
    "patterns": [
      {
        "find": "^/api/users/(search|export)",
        "replace": "/api/v2/$1/users"
      }
    ]
  }
}
```

**Option C: Mark Deprecated**
```json
{
  "mappings": {
    "deprecated": [
      "/api/legacy/upload",
      "/api/old/reports"
    ]
  }
}
```

---

## Scenario 5: User Needs to Debug Config Errors

### User Request
> "My migration config has validation errors. Can you help?"

### Agent Workflow

#### Step 1: Read Config and Validate

```typescript
const config = JSON.parse(await Read({
  file_path: './migration-config.json'
}));

const validation = validateMigrationConfig(config);

if (!validation.valid) {
  console.log('Config has errors:', validation.errors);
  // Example: ["Missing required field: version", "Pattern 0: invalid regex '^/api/v1/(['"]
}
```

#### Step 2: Fix Each Error

**Error: Missing Required Field**
```typescript
// Error: "Missing required field: version"

// Agent adds missing field
config.version = "1.0.0";
```

**Error: Invalid Regex**
```typescript
// Error: "Pattern 0: invalid regex '^/api/v1/([' - Unterminated group"

// Agent fixes regex
config.mappings.patterns[0].find = "^/api/v1/(.*)"; // Fixed: added closing )
```

**Error: Duplicate Mapping**
```typescript
// Error: "Duplicate mapping for path: /api/users"

// Agent removes duplicate
const paths = config.mappings.paths;
// Keep only one mapping for /api/users
```

**Error: Deprecated/Added Overlap**
```typescript
// Error: "Path appears in both deprecated and added: /api/test"

// Agent removes from one array
config.mappings.deprecated = config.mappings.deprecated.filter(p => p !== '/api/test');
```

#### Step 3: Write Fixed Config

```typescript
await Write({
  file_path: './migration-config.json',
  content: JSON.stringify(config, null, 2)
});
```

#### Step 4: Re-validate

```typescript
const validation = validateMigrationConfig(config);

if (validation.valid) {
  console.log('✅ Config is now valid!');
} else {
  console.log('Still has errors:', validation.errors);
  // Continue fixing
}
```

---

## Agent Decision Tree

```
User mentions API migration
    |
    ├─ Has migration config?
    |  ├─ YES → Validate config → Run validation → Report results
    |  └─ NO → Ask about migration pattern → Create config → Validate
    |
    ├─ Needs coverage improvement?
    |  └─ Analyze unmapped routes → Suggest patterns → Update config
    |
    ├─ Has config errors?
    |  └─ Read errors → Fix each error → Re-validate
    |
    └─ Needs migration plan?
       └─ Analyze old/new routes → Suggest strategy → Create config
```

---

## Common Agent Mistakes to Avoid

### ❌ Mistake 1: Using Standard Route Validation for Migrations

**Wrong:**
```typescript
// User is doing a migration, but agent uses standard validation
const report = await generateValidationReport(
  './.coderef/frontend-calls.json',
  './.coderef/routes.json' // Only new routes
);
// This will show 100% failure because frontend still calls old routes!
```

**Right:**
```typescript
// Use migration validation
const report = await validateMigration(
  './.coderef/frontend-calls.json',
  './.coderef/routes-old.json',
  './.coderef/routes-new.json',
  './migration-config.json'
);
// This transforms old routes to new routes before validation
```

### ❌ Mistake 2: Creating Config Without User Input

**Wrong:**
```typescript
// Agent assumes migration pattern without asking
const config = {
  mappings: {
    patterns: [{ find: "^/api/(.*)", replace: "/v2/$1" }]
  }
};
// Might be wrong pattern!
```

**Right:**
```typescript
// Agent asks first
console.log("What's the migration pattern? Examples:");
console.log("1. /api/v1/* → /api/v2/*");
console.log("2. /api/* → /api/v2/*");
console.log("3. Custom pattern");
// Wait for user response, then create config
```

### ❌ Mistake 3: Not Validating Config Before Use

**Wrong:**
```typescript
// Agent creates config and immediately uses it
await Write({ file_path: './migration-config.json', content: configJson });
const report = await validateMigration(...); // Might fail!
```

**Right:**
```typescript
// Agent validates config first
const config = JSON.parse(configJson);
const validation = validateMigrationConfig(config);

if (!validation.valid) {
  console.error('Config errors:', validation.errors);
  // Fix errors before proceeding
  return;
}

await Write({ file_path: './migration-config.json', content: configJson });
const report = await validateMigration(...);
```

### ❌ Mistake 4: Not Explaining Results to User

**Wrong:**
```typescript
// Agent just dumps data
console.log(JSON.stringify(report, null, 2));
```

**Right:**
```typescript
// Agent interprets and explains
console.log(`Migration Coverage: ${report.migration.coverage.coverage}%`);

if (report.migration.coverage.coverage < 80) {
  console.log('⚠️ Coverage is below recommended 80%');
  console.log(`Found ${report.migration.unmapped.length} unmapped routes`);
  console.log('Recommendation: Add more mapping patterns or mark routes as deprecated');
}
```

### ❌ Mistake 5: Ignoring Edge Cases

**Wrong:**
```typescript
// Agent assumes all routes follow pattern
config.mappings.patterns = [
  { find: "^/api/v1/(.*)", replace: "/api/v2/$1" }
];
// But /api/upload → /api/v2/files/upload (exception!)
```

**Right:**
```typescript
// Agent uses explicit mappings for exceptions
config.mappings.paths = {
  "/api/upload": "/api/v2/files/upload" // Explicit exception
};
config.mappings.patterns = [
  { find: "^/api/v1/(.*)", replace: "/api/v2/$1" } // General pattern
];
```

---

## Agent Best Practices

### ✅ Best Practice 1: Always Start with Documentation

```typescript
// Agent reads quick reference first
const quickRef = await Read({
  file_path: 'packages/coderef-core/docs/MIGRATION-VALIDATION-QUICKREF.md'
});

// Then reads relevant section from user guide
const userGuide = await Read({
  file_path: 'packages/coderef-core/docs/MIGRATION-VALIDATION.md',
  offset: 15,  // Quick Start section
  limit: 100
});
```

### ✅ Best Practice 2: Check Prerequisites

```typescript
// Agent verifies files exist before proceeding
const files = {
  frontendCalls: './.coderef/frontend-calls.json',
  oldRoutes: './.coderef/routes-old.json',
  newRoutes: './.coderef/routes-new.json',
  migrationConfig: './migration-config.json'
};

for (const [name, path] of Object.entries(files)) {
  try {
    await Read({ file_path: path });
    console.log(`✅ ${name} found`);
  } catch (error) {
    console.log(`❌ ${name} missing at ${path}`);
    // Offer to help create or locate file
  }
}
```

### ✅ Best Practice 3: Provide Context-Aware Help

```typescript
// Agent tailors help based on coverage
const coverage = report.migration.coverage.coverage;

if (coverage >= 90) {
  console.log('✅ Excellent coverage! Migration is ready.');
} else if (coverage >= 75) {
  console.log('⚠️ Good coverage, but some routes need attention.');
  console.log(`Unmapped: ${report.migration.unmapped.length} routes`);
} else {
  console.log('❌ Low coverage. Significant work needed.');
  console.log('Let me help you improve the mapping rules...');
  // Provide detailed analysis and suggestions
}
```

### ✅ Best Practice 4: Iterative Improvement

```typescript
// Agent helps user iteratively improve config
let iteration = 1;
let coverage = 0;

while (coverage < 80 && iteration <= 5) {
  console.log(`\nIteration ${iteration}:`);

  const report = await validateMigration(...);
  coverage = report.migration.coverage.coverage;

  console.log(`Coverage: ${coverage}%`);

  if (coverage < 80) {
    // Analyze and suggest improvements
    const suggestions = analyzeUnmapped(report.migration.unmapped);
    console.log('Suggestions:', suggestions);

    // Ask user if they want to apply suggestions
    // Update config
    // Re-validate
  }

  iteration++;
}
```

### ✅ Best Practice 5: Clear Communication

```typescript
// Agent explains technical concepts in plain language
console.log(`
Migration Validation Summary:
============================

What we checked:
- ✅ Loaded ${report.totalFrontendCalls} frontend API calls
- ✅ Compared against ${report.migration.coverage.totalNewRoutes} new routes
- ✅ Applied migration rules from config

Results:
- Coverage: ${report.migration.coverage.coverage}% (${report.migration.coverage.migratedRoutes}/${report.migration.coverage.totalOldRoutes} routes migrated)
- Critical Issues: ${report.summary.critical}
- Warnings: ${report.summary.warnings}

What this means:
${getCoverageExplanation(report.migration.coverage.coverage)}
`);

function getCoverageExplanation(coverage) {
  if (coverage >= 90) return 'Almost all frontend calls have been mapped to new routes. Excellent!';
  if (coverage >= 75) return 'Most calls are mapped, but some need attention.';
  if (coverage >= 50) return 'About half your calls are mapped. More work needed.';
  return 'Many calls are unmapped. Significant migration config improvements needed.';
}
```

---

## Complete Agent Script Example

Here's a complete script an agent might generate:

```typescript
import {
  validateMigration,
  validateMigrationConfig,
  loadMigrationMapping,
  groupCoverageByApiPrefix
} from '@coderef/core';

async function agentValidateMigration() {
  console.log('🤖 Agent: Starting migration validation...\n');

  // Step 1: Check prerequisites
  console.log('Step 1: Checking prerequisites...');
  const files = {
    'Frontend Calls': './.coderef/frontend-calls.json',
    'Old Routes': './.coderef/routes-old.json',
    'New Routes': './.coderef/routes-new.json',
    'Migration Config': './migration-config.json'
  };

  for (const [name, path] of Object.entries(files)) {
    try {
      // In real agent code, use Read tool
      console.log(`  ✅ ${name}: ${path}`);
    } catch (error) {
      console.error(`  ❌ ${name} not found: ${path}`);
      process.exit(1);
    }
  }

  // Step 2: Validate config
  console.log('\nStep 2: Validating migration config...');
  const config = await loadMigrationMapping('./migration-config.json');
  const configValidation = validateMigrationConfig(config);

  if (!configValidation.valid) {
    console.error('  ❌ Config validation failed:');
    configValidation.errors.forEach(err => console.error(`    - ${err}`));
    console.log('\n🤖 Agent: I can help fix these errors. Would you like me to?');
    process.exit(1);
  }
  console.log('  ✅ Config is valid');

  // Step 3: Run migration validation
  console.log('\nStep 3: Running migration validation...');
  const report = await validateMigration(
    './.coderef/frontend-calls.json',
    './.coderef/routes-old.json',
    './.coderef/routes-new.json',
    './migration-config.json'
  );

  // Step 4: Analyze results
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION VALIDATION RESULTS');
  console.log('='.repeat(60));

  console.log('\n📊 Coverage Metrics:');
  console.log(`  Total Frontend Calls: ${report.totalFrontendCalls}`);
  console.log(`  Old Routes: ${report.migration.coverage.totalOldRoutes}`);
  console.log(`  New Routes: ${report.migration.coverage.totalNewRoutes}`);
  console.log(`  Migrated: ${report.migration.coverage.migratedRoutes}`);
  console.log(`  Coverage: ${report.migration.coverage.coverage}%`);

  console.log('\n🔍 Validation Issues:');
  console.log(`  Critical: ${report.summary.critical}`);
  console.log(`  Warnings: ${report.summary.warnings}`);
  console.log(`  Info: ${report.summary.info}`);

  if (report.migration.unmapped.length > 0) {
    console.log('\n⚠️  Unmapped Routes:');
    report.migration.unmapped.slice(0, 5).forEach(call => {
      console.log(`  - ${call.method} ${call.path} (${call.file}:${call.line})`);
    });
    if (report.migration.unmapped.length > 5) {
      console.log(`  ... and ${report.migration.unmapped.length - 5} more`);
    }
  }

  if (report.migration.deprecated.length > 0) {
    console.log('\n⚠️  Deprecated Route Usage:');
    report.migration.deprecated.forEach(call => {
      console.log(`  - ${call.method} ${call.path} (${call.file}:${call.line})`);
    });
  }

  // Step 5: Provide recommendations
  console.log('\n' + '='.repeat(60));
  console.log('🤖 AGENT RECOMMENDATIONS');
  console.log('='.repeat(60));

  const coverage = report.migration.coverage.coverage;

  if (coverage >= 90 && report.summary.critical === 0) {
    console.log('\n✅ Migration looks great!');
    console.log('  - Coverage is excellent (≥90%)');
    console.log('  - No critical issues found');
    console.log('  - Ready to proceed with migration');
  } else if (coverage >= 75) {
    console.log('\n⚠️  Migration is mostly ready, but needs some work:');
    console.log(`  - Coverage: ${coverage}% (target: ≥80%)`);
    console.log(`  - Unmapped routes: ${report.migration.unmapped.length}`);
    console.log('\nSuggested actions:');
    console.log('  1. Review unmapped routes above');
    console.log('  2. Add mapping rules for common patterns');
    console.log('  3. Mark truly deprecated routes in config');
    console.log('\n🤖 Would you like me to analyze patterns and suggest config updates?');
  } else {
    console.log('\n❌ Migration needs significant work:');
    console.log(`  - Coverage: ${coverage}% (target: ≥80%)`);
    console.log(`  - Unmapped routes: ${report.migration.unmapped.length}`);
    console.log(`  - Critical issues: ${report.summary.critical}`);
    console.log('\nSuggested actions:');
    console.log('  1. Review migration config patterns');
    console.log('  2. Analyze unmapped routes for common patterns');
    console.log('  3. Consider if some routes are deprecated');
    console.log('\n🤖 I can help improve the migration config. Shall we start?');
  }

  // Step 6: Coverage by prefix
  // Note: Need to extract transformations from report for this
  console.log('\n📈 Coverage by API Prefix:');
  console.log('  (This helps identify which parts of the API need attention)');
  // In real implementation, would call groupCoverageByApiPrefix()

  console.log('\n' + '='.repeat(60));
}

agentValidateMigration();
```

---

## Summary: Agent Checklist

When a user mentions API migration, the agent should:

- [ ] ✅ Understand the migration scenario (v1→v2, framework change, etc.)
- [ ] ✅ Check for required files (frontend-calls.json, routes files, config)
- [ ] ✅ Validate migration config if exists, or help create if missing
- [ ] ✅ Run `validateMigration()` with appropriate file paths
- [ ] ✅ Interpret results in user-friendly language
- [ ] ✅ Provide specific, actionable recommendations
- [ ] ✅ Offer to help fix issues (config updates, pattern improvements)
- [ ] ✅ Explain coverage metrics and what they mean
- [ ] ✅ Set appropriate expectations (≥80% coverage target)
- [ ] ✅ Iteratively help improve until validation passes

---

**Last Updated**: 2026-01-25
**Work Order**: WO-MIGRATION-VALIDATION-001

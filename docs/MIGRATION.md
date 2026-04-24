# Migration Validation

Complete guide for detecting, analyzing, and validating migrations in database-backed applications.

---

## Overview

Database migrations can become a major source of technical debt, production incidents, and maintenance headaches when not properly tracked. CodeRef's migration validation system helps you:

- **Identify** database migration files across your codebase
- **Detect** potential risks before they reach production
- **Analyze** migration patterns and trends
- **Validate** migration safety and best practices

### Supported Frameworks

| Framework | Language | Detection Method |
|-----------|----------|------------------|
| Django Migrations | Python | `migrations/*.py` |
| Alembic | Python | `versions/*.py` |
| Rails ActiveRecord | Ruby | `db/migrate/*.rb` |
| TypeORM | TypeScript/JS | `src/migrations/*.ts` |
| Prisma | TypeScript/JS | `prisma/migrations/*/migration.sql` |
| Knex.js | JavaScript | `migrations/*.js` |
| Sequelize | JavaScript | `migrations/*.js` |
| Flyway | SQL | `db/migration/V*.sql` |
| Liquibase | XML/YAML | `db/changelog.*` |

---

## Quick Start

```bash
# Build the CLI
npm run build:cli

# Scan for migrations
npx coderef-scan --dir ./src --lang py,rb,ts,js

# Detect and validate migrations
npx validate-routes --dir ./src --detect-migrations
```

**Programmatic Usage:**

```typescript
import { scanCurrentElements } from './dist/src/index.js';

const elements = await scanCurrentElements('/my/project', ['py', 'ts', 'js']);

// Filter migration elements
const migrations = elements.filter(e => 
  e.type === 'migration' || 
  e.metadata?.isMigration === true
);

console.log(`Found ${migrations.length} migration files`);
```

---

## Migration Detection

### File Patterns

The scanner detects migrations by file path patterns:

```python
# Django
myapp/migrations/0001_initial.py
myapp/migrations/0002_add_user_field.py

# Alembic
alembic/versions/20230101_a1b2c3d_add_table.py

# Rails
db/migrate/20230101120000_create_users.rb

# TypeORM
src/migrations/20230101120000-CreateUsers.ts

# Prisma
prisma/migrations/20230101120000_init/migration.sql

# Knex
migrations/20230101120000_create_users.js
```

### Metadata Extraction

Each detected migration includes:

```typescript
{
  "type": "migration",
  "name": "0001_initial",
  "file": "myapp/migrations/0001_initial.py",
  "line": 1,
  "migration": {
    "sequence": 1,                    // Numeric sequence for ordering
    "timestamp": "20230101120000",    // Creation timestamp
    "framework": "django",            // Detected framework
    "direction": "forward",         // 'forward', 'backward', 'both'
    "operations": [
      { "type": "create_table", "table": "users" },
      { "type": "add_column", "table": "users", "column": "email" }
    ]
  }
}
```

---

## Risk Detection

### High-Risk Patterns

The validation system flags these high-risk migration types:

1. **Destructive Operations**
   - `DROP TABLE` - Data loss risk
   - `DROP COLUMN` - Data loss risk  
   - `ALTER COLUMN` with type changes - Conversion risk
   - `DELETE` operations without WHERE clause

2. **Locking Operations**
   - Adding indexes on large tables (acquires long locks)
   - Adding NOT NULL constraints without defaults
   - Heavy ALTER operations on production tables

3. **Data Corruption Risks**
   - Renaming columns without data migration
   - Changing primary keys
   - Modifying constraints on existing data

### Validation Output

```
Migration Risk Report
====================

High Risk (3):
  ⚠ 0015_drop_legacy_table.py:15
    Operation: DROP TABLE legacy_data
    Risk: Permanent data loss
    Recommendation: Backup data first, use soft-delete pattern

  ⚠ 0023_modify_user_id.py:23  
    Operation: ALTER COLUMN user_id TYPE uuid
    Risk: Data conversion failures
    Recommendation: Add new column, migrate data, drop old column

  ⚠ 0031_add_index_users.py:8
    Operation: CREATE INDEX CONCURRENTLY
    Risk: Lock on table with 10M+ rows
    Recommendation: Use online index creation, schedule during low traffic

Medium Risk (2):
  ℹ 0018_add_not_null.py:12
    Operation: ALTER COLUMN email SET NOT NULL
    Risk: Fails if existing NULL values
    Recommendation: Update data first, then add constraint

Safe (12):
  ✓ All other migrations passed validation
```

---

## Best Practices

### Migration Safety Checklist

Before deploying to production:

- [ ] **Test migrations** on a copy of production data
- [ ] **Check data volumes** - Will operations lock large tables?
- [ ] **Backup strategy** - Can you rollback if migration fails?
- [ ] **Timing** - Run large migrations during low-traffic periods
- [ ] **Transaction safety** - Are migrations wrapped in transactions?
- [ ] **Idempotency** - Can migrations be re-run safely?
- [ ] **Rollback plan** - Is there a tested rollback procedure?

### Safe Migration Patterns

**Instead of destructive changes:**

```python
# ❌ Risky: Drop and recreate
# migrations/0005_risky.py
class Migration:
    operations = [
        migrations.DropTable('old_data'),
        migrations.CreateTable('new_data', ...)
    ]

# ✅ Safer: Soft delete then cleanup
# migrations/0005_safe.py  
class Migration:
    operations = [
        migrations.RenameTable('old_data', 'old_data_backup'),
        migrations.CreateTable('new_data', ...),
        # Data migration happens here
        migrations.DropTable('old_data_backup'),  # After verification
    ]
```

**Adding constraints safely:**

```python
# ❌ Risky: Immediate NOT NULL
# migrations/0006_risky.py
class Migration:
    operations = [
        migrations.AlterField('user', 'email', null=False)
    ]

# ✅ Safer: Add nullable, backfill, then constrain  
# migrations/0006_safe_step1.py (deploy first)
class Migration:
    operations = [
        migrations.AddField('user', 'email_v2', null=True)
    ]

# migrations/0007_safe_step2.py (after data update)
class Migration:
    operations = [
        migrations.AlterField('user', 'email_v2', null=False),
        migrations.RemoveField('user', 'email'),
        migrations.RenameField('user', 'email_v2', 'email')
    ]
```

---

## Analysis and Reporting

### Migration Statistics

Generate reports on migration trends:

```bash
# Full migration analysis
npx validate-routes --dir ./src --migration-report

# Output format options
npx validate-routes --dir ./src --migration-report --format json
npx validate-routes --dir ./src --migration-report --format markdown
```

**Sample Report:**

```
Migration Analysis Report
========================

Summary:
  Total migrations: 47
  By framework:
    - Django: 32
    - Alembic: 15
  
  Risk distribution:
    - High risk: 3 (6%)
    - Medium risk: 8 (17%)
    - Low risk: 36 (77%)

Trends (last 90 days):
  Migration velocity: 2.3/week
  Risk introduction: -15% (improving)
  
Recommendations:
  1. Review high-risk migrations before next release
  2. Add automated validation to CI pipeline
  3. Consider splitting 0031 (adds index on 10M row table)
```

### CI Integration

Add to your CI pipeline:

```yaml
# .github/workflows/migration-check.yml
name: Migration Validation

on:
  pull_request:
    paths:
      - '**/migrations/**'
      - '**/migrate/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build CLI
        run: npm run build:cli
        
      - name: Validate Migrations
        run: |
          npx validate-routes \
            --dir ./src \
            --detect-migrations \
            --fail-on-high-risk
```

---

## Troubleshooting

### Common Issues

**Issue: Migrations not detected**
- Verify file patterns match known patterns
- Check `--lang` flag includes migration language
- Ensure migrations are in expected directory structure

**Issue: False positives on risk detection**
- Add exclusion patterns for test migrations
- Use `--ignore-pattern` for known-safe operations
- Configure custom risk rules in `.coderef/config.json`

**Issue: Framework not recognized**
- Add custom pattern to `framework_patterns` config
- File an issue to add native support

---

## Configuration

Create `.coderef/migration-config.json`:

```json
{
  "patterns": {
    "django": "**/migrations/[0-9]*_*.py",
    "alembic": "**/versions/[0-9]*_*.py",
    "rails": "**/db/migrate/[0-9]*_*.rb",
    "custom": "**/db_changes/*.sql"
  },
  "risk_rules": {
    "drop_table": "high",
    "drop_column": "high",
    "add_index": {
      "risk": "medium",
      "threshold_rows": 1000000
    },
    "alter_column": "high"
  },
  "exclusions": [
    "**/test/**",
    "**/test_*_migration*"
  ]
}
```

---

## See Also

- [CLI Reference](./CLI.md) - All CLI commands
- [Route Detection](./ROUTE.md) - API route detection
- [Scanner Guide](./SCANNER.md) - How scanning works
- [API Reference](./API.md) - Programmatic API

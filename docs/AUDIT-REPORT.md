# Documentation Audit Report

**Date:** 2026-04-23  
**Auditor:** Assistant  
**Scope:** `docs/` directory

---

## Summary

| Metric | Value |
|--------|-------|
| Total Docs | 14 files |
| Fresh (< 2 weeks) | 1 (CLI.md) |
| Stale (> 3 months) | 5 files |
| Duplicated Content | 4 patterns |
| Broken References | 3 found |
| Missing Docs | 3 identified |

---

## File Status

### ✅ Fresh (Recently Updated)

| File | Last Modified | Notes |
|------|---------------|-------|
| CLI.md | 2026-04-23 | Just created, comprehensive |

### ⚠️ Current (1-3 months)

| File | Last Modified | Notes |
|------|---------------|-------|
| AGENT-WORKFLOW-GUIDE.md | 2026-03-01 | May need agent-runtime updates |
| MIGRATION-VALIDATION*.md (3 files) | 2026-03-01 | Consolidation opportunity |
| FRONTEND-CALL-DETECTION.md | 2026-03-01 | Check API changes |
| ROUTE-VALIDATION.md | 2026-03-01 | Check API changes |
| ROUTE-DETECTION.md | 2026-02-28 | Check API changes |

### 🔴 Stale (> 3 months)

| File | Last Modified | Issues |
|------|---------------|--------|
| SCHEMA.md | 2026-01-16 | Schema v2.0.0 may be outdated |
| API.md | 2026-01-16 | Likely missing new exports |
| README.md | 2026-01-08 | Missing CLI commands |
| COMPONENTS.md | 2026-01-08 | Architecture may have shifted |
| ARCHITECTURE.md | 2026-01-08 | Version 2.0.0 may need bump |

---

## Stale Content Identified

### 1. SCHEMA.md - Deprecation Issues

```typescript
// Line ~220: Deprecated field
{
  workerPoolSize: number  // NOT IMPLEMENTED
}
```

**Status:** Field marked but still in schema documentation  
**Action:** Remove or mark as deprecated

### 2. Architecture Version

```markdown
# ARCHITECTURE.md
**Version:** 2.0.0  // May need 2.1.0 or 3.0.0
**Date:** 2025-09-17  // Stale date
```

### 3. API.md - Missing Exports

Likely missing:
- `coderef-scan` CLI exports
- `IncrementalCache` class
- `scanCurrentElements` updates
- `ScannerRegistry` class

### 4. README.md - Missing CLI Commands

Current docs only show old commands, missing:
- `coderef-rag-index`
- `coderef-rag-search`
- `coderef-rag-status`
- `scan-frontend-calls`
- `validate-routes`
- `detect-languages`

---

## Duplicated Content

### Pattern 1: Installation Instructions

**Found in:**
- README.md
- AGENT-WORKFLOW-GUIDE.md
- ROUTE-VALIDATION.md
- ROUTE-DETECTION.md

**Solution:** Link to CLI.md section

### Pattern 2: Architecture Diagram

**Found in:**
- README.md
- ARCHITECTURE.md
- AGENT-WORKFLOW-GUIDE.md

**Solution:** Keep in ARCHITECTURE.md only, link elsewhere

### Pattern 3: Migration Validation Content

**Found in:**
- MIGRATION-VALIDATION.md
- MIGRATION-VALIDATION-SPEC.md
- MIGRATION-VALIDATION-QUICKREF.md

**Solution:** Consolidate into single doc with quick reference section

### Pattern 4: Route Documentation

**Found in:**
- ROUTE-VALIDATION.md
- ROUTE-DETECTION.md

**Solution:** Merge into single ROUTE.md with validation + detection sections

---

## Broken/Misleading References

### 1. CLI Command References

```markdown
# In ROUTE-VALIDATION.md:
npx coderef scan --project-dir .  // WRONG
# Should be:
npx coderef-scan --dir .
```

### 2. Package Name References

```markdown
# In multiple docs:
npm install @coderef/core  // Check if published
# Should reference local install until published
```

### 3. Workorder References

```markdown
# In ROUTE-VALIDATION.md:
WO-ROUTE-VALIDATION-ENHANCEMENT-001  // Completed workorder
# Should not reference completed workorders in user docs
```

---

## Missing Documentation

| Topic | Priority | Location |
|-------|----------|----------|
| Scanner Architecture | High | docs/SCANNER.md |
| Cache System | High | docs/CACHE.md |
| Testing Guide | Medium | docs/TESTING.md |
| Contributing Guide | Medium | CONTRIBUTING.md (root) |
| Changelog | Medium | CHANGELOG.md (root) |
| Plugin System | Low | docs/PLUGINS.md |

---

## Recommendations

### Immediate (This Week)

1. **Update README.md** - Add all CLI commands, refresh install instructions
2. **Remove deprecated fields** from SCHEMA.md (workerPoolSize)
3. **Fix CLI command references** in ROUTE-VALIDATION.md
4. **Update ARCHITECTURE.md** version and date

### Short Term (Next 2 Weeks)

1. **Consolidate migration docs** → single MIGRATION.md
2. **Merge route docs** → single ROUTE.md
3. **Create SCANNER.md** - Document scanner architecture
4. **Create CACHE.md** - Document incremental cache system

### Long Term (Next Month)

1. **Create CONTRIBUTING.md** - Contributor guidelines
2. **Create CHANGELOG.md** - Track version changes
3. **Add TESTING.md** - Testing patterns and examples
4. **Review all code examples** - Ensure they compile and work

---

## File Action Matrix

| File | Action | Priority |
|------|--------|----------|
| CLI.md | ✅ Keep (just created) | N/A |
| README.md | 🔄 Update CLI section | High |
| ARCHITECTURE.md | 🔄 Bump version/date | Medium |
| API.md | 🔄 Add missing exports | High |
| SCHEMA.md | 🔄 Remove deprecated fields | High |
| COMPONENTS.md | 📋 Review for accuracy | Medium |
| AGENT-WORKFLOW-GUIDE.md | 📋 Review for agent-runtime changes | Medium |
| MIGRATION*.md (3) | 🔥 Consolidate to 1 | Medium |
| ROUTE*.md (2) | 🔥 Merge to 1 | Medium |
| FRONTEND-CALL-DETECTION.md | 📋 Review API accuracy | Medium |

---

## Next Steps

1. ✅ **Audit Complete** - This report created
2. 🔄 **Create Issues** - For each high priority item
3. 🔄 **Assign Workorders** - For consolidation tasks
4. 🔄 **Update README** - First priority
5. 🔄 **Fix CLI references** - Second priority

---

## Related Workorders

- `WO-SCANNER-MODULAR-REFACTOR-001` - Will require doc updates
- `IMP-CORE-076` - Recursive cache fix (documented)
- `IMP-CORE-077` - Parallel path fix (documented)

---

*Report generated by assistant audit on 2026-04-23*

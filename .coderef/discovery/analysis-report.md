---
**Document:** analysis-report.md
**Project:** coderef-core
**Generated:** 2026-04-13 23:35
**Source:** project-state-discovery.json
**Discovery Version:** 1.3.0
---

# Document Analysis Report - coderef-core

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| Coverage | 78.4% | [WARN] |
| Compliance score | 78.4% | [WARN] |
| Duplicate sets | 19 | [WARN] |
| Type anomalies | 8 | [FAIL] |

## Coverage Analysis

Project coverage: 78.4%

**Missing types:** Changelog, Deliverables, Persona, Prompt, Skill, Standards, Stub, Template

## Duplicate Filenames

19 duplicate basenames were found in the target project.

| Filename | Count | Files | Action |
|----------|-------|-------|--------|
| AGENTS.md | 3 | AGENTS.md, coderef/sessions/coderef-cli-implementation/AGENTS.md, scripts/AGENTS.md | REVIEW |
| API.md | 2 | coderef/foundation-docs/API.md, docs/API.md | KEEP (expected) |
| ARCHITECTURE.md | 2 | coderef/foundation-docs/ARCHITECTURE.md, docs/ARCHITECTURE.md | KEEP (expected) |
| BASELINES.md | 2 | autoresearch/pipeline-quality/BASELINES.md, autoresearch/scanner-quality/BASELINES.md | REVIEW |
| CLAUDE.md | 3 | CLAUDE.md, coderef/sessions/coderef-cli-implementation/CLAUDE.md, scripts/CLAUDE.md | KEEP (expected) |
| COMPONENTS.md | 2 | coderef/foundation-docs/COMPONENTS.md, docs/COMPONENTS.md | KEEP (expected) |
| Context-Generator-RESOURCE-SHEET.md | 2 | coderef/resources-sheets/Context-Generator-RESOURCE-SHEET.md, coderef/resources-sheets/systems/Context-Generator-RESOURCE-SHEET.md | REVIEW |
| Dependency-Graph-Builder-RESOURCE-SHEET.md | 2 | coderef/resources-sheets/Dependency-Graph-Builder-RESOURCE-SHEET.md, coderef/resources-sheets/systems/Dependency-Graph-Builder-RESOURCE-SHEET.md | REVIEW |
| File-Generation-System-RESOURCE-SHEET.md | 2 | coderef/resources-sheets/File-Generation-System-RESOURCE-SHEET.md, coderef/resources-sheets/systems/File-Generation-System-RESOURCE-SHEET.md | REVIEW |
| GEMINI.md | 3 | GEMINI.md, coderef/sessions/coderef-cli-implementation/GEMINI.md, scripts/GEMINI.md | REVIEW |
| INDEX.md | 2 | coderef/resources-sheets/INDEX.md, src/.coderef/INDEX.md | REVIEW |
| MASTER-PLAN.md | 2 | autoresearch/pipeline-quality/MASTER-PLAN.md, autoresearch/scanner-quality/MASTER-PLAN.md | REVIEW |
| README.md | 3 | .coderef/reports/complexity/README.md, README.md, docs/README.md | KEEP (expected) |
| RESOURCE-SHEET.md | 2 | coderef/resource/RESOURCE-SHEET.md, scripts/setup-coderef-dir/RESOURCE-SHEET.md | REVIEW |
| SCHEMA.md | 2 | coderef/foundation-docs/SCHEMA.md, docs/SCHEMA.md | KEEP (expected) |
| Theme-System-RESOURCE-SHEET.md | 2 | coderef/resources-sheets/Theme-System-RESOURCE-SHEET.md, coderef/resources-sheets/systems/Theme-System-RESOURCE-SHEET.md | REVIEW |
| USAGE.md | 2 | scripts/scan-cli/USAGE.md, scripts/setup-coderef-dir/USAGE.md | REVIEW |
| goal.md | 9 | autoresearch/pipeline-quality/07-critical-function-pipeline/goal.md, autoresearch/pipeline-quality/08-test-gap-pipeline/goal.md, autoresearch/pipeline-quality/09-async-pattern-pipeline/goal.md, autoresearch/scanner-quality/01-element-classification/goal.md, autoresearch/scanner-quality/02-export-relationships/goal.md, autoresearch/scanner-quality/03-test-coverage-linkage/goal.md, autoresearch/scanner-quality/04-async-pattern-detection/goal.md, autoresearch/scanner-quality/05-context-summary-signal/goal.md, autoresearch/scanner-quality/06-test-gap-precision/goal.md | REVIEW |
| plan.md | 2 | coderef/workorder/migration-validation/plan.md, coderef/workorder/wo-unified-coderef-pipeline-001/plan.md | REVIEW |

## Type Distribution

| Type | Count | % | Baseline | Status |
|------|-------|---|----------|--------|
| Resource Sheet | 28 | 25.2% | 5-20% | [WARN] |
| Unclassified | 24 | 21.6% | 0-10% | [WARN] |
| Report | 15 | 13.5% | 5-20% | [PASS] |
| Guide | 12 | 10.8% | 5-15% | [PASS] |
| Foundation Doc | 8 | 7.2% | 5-10% | [PASS] |
| Agent Handoff | 7 | 6.3% | 5-15% | [PASS] |
| Plan | 5 | 4.5% | 2-8% | [PASS] |
| Agent Context | 4 | 3.6% | 2-8% | [PASS] |
| Session Log | 4 | 3.6% | 1-5% | [PASS] |
| README | 3 | 2.7% | 5-10% | [WARN] |
| Index/Registry | 1 | 0.9% | 1-5% | [WARN] |
| Changelog | 0 | 0.0% | 0-2% | [PASS] |
| Deliverables | 0 | 0.0% | 3-8% | [WARN] |
| Persona | 0 | 0.0% | 0-3% | [PASS] |
| Prompt | 0 | 0.0% | 0-3% | [PASS] |
| Skill | 0 | 0.0% | 1-5% | [WARN] |
| Standards | 0 | 0.0% | 2-8% | [WARN] |
| Stub | 0 | 0.0% | 1-5% | [WARN] |
| Template | 0 | 0.0% | 0-3% | [PASS] |

**Anomalies:**
- Resource Sheet: 25.2% (above 5-20% baseline)
- Unclassified: 21.6% (above 0-10% baseline)
- README: 2.7% (below 5-10% baseline)
- Index/Registry: 0.9% (below 1-5% baseline)
- Deliverables: 0.0% (below 3-8% baseline)
- Skill: 0.0% (below 1-5% baseline)
- Standards: 0.0% (below 2-8% baseline)
- Stub: 0.0% (below 1-5% baseline)

## Naming Compliance Suggestions (Top 30)

| Project | Current Name | Suggested Type | Confidence |
|---------|-------------|---------------|------------|
| coderef-core | AGENT2-PROGRESS.md | Agent Context | MEDIUM |
| coderef-core | AGENTS.md | Agent Context | MEDIUM |
| coderef-core | AGENTS.md | Agent Context | MEDIUM |
| coderef-core | API-ACCESS.md | Report | LOW |
| coderef-core | AUTO-INJECTION-IMPLEMENTATION.md | Report | LOW |
| coderef-core | AUTO-INJECTION-PATHS.md | Report | LOW |
| coderef-core | BASELINES.md | Report | LOW |
| coderef-core | BASELINES.md | Report | LOW |
| coderef-core | FRONTEND-CALL-DETECTION.md | Report | LOW |
| coderef-core | GEMINI.md | Report | LOW |
| coderef-core | GEMINI.md | Report | LOW |
| coderef-core | IMPORTANT-WORKORDER-FILES.md | Report | LOW |
| coderef-core | ROUTE-DETECTION.md | Report | LOW |
| coderef-core | ROUTE-VALIDATION.md | Report | LOW |
| coderef-core | VERIFY-CONTRACTS.md | Report | LOW |
| coderef-core | goal.md | Report | LOW |
| coderef-core | goal.md | Report | LOW |
| coderef-core | goal.md | Report | LOW |
| coderef-core | goal.md | Report | LOW |
| coderef-core | goal.md | Report | LOW |
| coderef-core | goal.md | Report | LOW |
| coderef-core | goal.md | Report | LOW |
| coderef-core | goal.md | Report | LOW |
| coderef-core | goal.md | Report | LOW |

## Recommendations

### P0 (Critical)
- None

### P1 (High)
- RENAME: coderef-core has 78.4% coverage (24 unclassified files). Review unclassified files.
- RENAME: Unclassified: 21.6% (above 0-10% baseline). Apply naming conventions or extend type library.

### P2 (Medium)
- CONSOLIDATE: 19 duplicate basenames within the target project need review.

### P3 (Low)
- REVIEW: Resource Sheet: 25.2% (above 5-20% baseline). May indicate documentation imbalance.
- REVIEW: README: 2.7% (below 5-10% baseline). May indicate documentation imbalance.
- REVIEW: Index/Registry: 0.9% (below 1-5% baseline). May indicate documentation imbalance.
- REVIEW: Deliverables: 0.0% (below 3-8% baseline). May indicate documentation imbalance.
- REVIEW: Skill: 0.0% (below 1-5% baseline). May indicate documentation imbalance.
- REVIEW: Standards: 0.0% (below 2-8% baseline). May indicate documentation imbalance.
- REVIEW: Stub: 0.0% (below 1-5% baseline). May indicate documentation imbalance.

## NotebookLM Candidate Sets

| Candidate Type | Count | Purpose |
|----------------|-------|---------|
| Compare pairs | 13 | Intra-project duplicate review |
| Merge sets | 13 | Same-project consolidation review |
| Stale review | 3 | Time-sensitive report review |

### Compare Pairs

| ID | Basename | File A | File B |
|----|----------|--------|--------|
| cmp-001 | AGENTS.md | coderef-core:AGENTS.md | coderef-core:coderef/sessions/coderef-cli-implementation/AGENTS.md |
| cmp-002 | BASELINES.md | coderef-core:autoresearch/pipeline-quality/BASELINES.md | coderef-core:autoresearch/scanner-quality/BASELINES.md |
| cmp-003 | Context-Generator-RESOURCE-SHEET.md | coderef-core:coderef/resources-sheets/Context-Generator-RESOURCE-SHEET.md | coderef-core:coderef/resources-sheets/systems/Context-Generator-RESOURCE-SHEET.md |
| cmp-004 | Dependency-Graph-Builder-RESOURCE-SHEET.md | coderef-core:coderef/resources-sheets/Dependency-Graph-Builder-RESOURCE-SHEET.md | coderef-core:coderef/resources-sheets/systems/Dependency-Graph-Builder-RESOURCE-SHEET.md |
| cmp-005 | File-Generation-System-RESOURCE-SHEET.md | coderef-core:coderef/resources-sheets/File-Generation-System-RESOURCE-SHEET.md | coderef-core:coderef/resources-sheets/systems/File-Generation-System-RESOURCE-SHEET.md |
| cmp-006 | GEMINI.md | coderef-core:GEMINI.md | coderef-core:coderef/sessions/coderef-cli-implementation/GEMINI.md |
| cmp-007 | INDEX.md | coderef-core:coderef/resources-sheets/INDEX.md | coderef-core:src/.coderef/INDEX.md |
| cmp-008 | MASTER-PLAN.md | coderef-core:autoresearch/pipeline-quality/MASTER-PLAN.md | coderef-core:autoresearch/scanner-quality/MASTER-PLAN.md |
| cmp-009 | RESOURCE-SHEET.md | coderef-core:coderef/resource/RESOURCE-SHEET.md | coderef-core:scripts/setup-coderef-dir/RESOURCE-SHEET.md |
| cmp-010 | Theme-System-RESOURCE-SHEET.md | coderef-core:coderef/resources-sheets/Theme-System-RESOURCE-SHEET.md | coderef-core:coderef/resources-sheets/systems/Theme-System-RESOURCE-SHEET.md |

### Merge Sets

| ID | Project | Basename | Target Path | File Count |
|----|---------|----------|-------------|------------|
| merge-001 | coderef-core | AGENTS.md | AGENTS.md | 3 |
| merge-002 | coderef-core | BASELINES.md | autoresearch/scanner-quality/BASELINES.md | 2 |
| merge-003 | coderef-core | Context-Generator-RESOURCE-SHEET.md | coderef/resources-sheets/Context-Generator-RESOURCE-SHEET.md | 2 |
| merge-004 | coderef-core | Dependency-Graph-Builder-RESOURCE-SHEET.md | coderef/resources-sheets/Dependency-Graph-Builder-RESOURCE-SHEET.md | 2 |
| merge-005 | coderef-core | File-Generation-System-RESOURCE-SHEET.md | coderef/resources-sheets/File-Generation-System-RESOURCE-SHEET.md | 2 |
| merge-006 | coderef-core | GEMINI.md | GEMINI.md | 3 |
| merge-007 | coderef-core | INDEX.md | src/.coderef/INDEX.md | 2 |
| merge-008 | coderef-core | MASTER-PLAN.md | autoresearch/scanner-quality/MASTER-PLAN.md | 2 |
| merge-009 | coderef-core | RESOURCE-SHEET.md | coderef/resource/RESOURCE-SHEET.md | 2 |
| merge-010 | coderef-core | Theme-System-RESOURCE-SHEET.md | coderef/resources-sheets/Theme-System-RESOURCE-SHEET.md | 2 |

### Stale Review

| ID | Project | File | Signals |
|----|---------|------|---------|
| stale-001 | coderef-core | DUPLICATE-FILES-AUDIT.md | AUDIT |
| stale-002 | coderef-core | TEST-FAILURE-ROOT-CAUSES.md | ROOT-CAUSE |
| stale-003 | coderef-core | src/coderef/CODEBASE-AUDIT-REPORT.md | AUDIT |

---
**Generated by:** /document-analysis skill v1.1.0

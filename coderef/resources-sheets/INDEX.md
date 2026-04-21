---
agent: claude-sonnet-4.5
date: "2026-01-13"
task: DOCUMENT
subject: Resource Sheets Index
parent_project: coderef-dashboard
category: other
version: "1.0.0"
status: APPROVED
---

# Resource Sheets Index

**Last Updated:** 2026-01-13  
**Purpose:** Comprehensive index of all authoritative resource sheets in the CodeRef codebase  
**Format:** RSMS v2.0 compliant resource sheets

---

## Overview

This index catalogs all resource sheets documenting systems, components, services, and utilities in the CodeRef codebase. Resource sheets serve as the single source of truth for architectural decisions, behavior contracts, and integration requirements.

**Index Statistics:**
- **Total Resource Sheets:** 14
- **Approved (RSMS v2.0):** 10
- **Template (Needs Completion):** 0
- **Duplicate/Archive:** 5 (in `systems/` subdirectory)

---

## High Priority Systems (Core)

### ✅ File Generation System
- **File:** `File-Generation-System-RESOURCE-SHEET.md`
- **Status:** APPROVED (RSMS v2.0)
- **Category:** system
- **Parent Project:** coderef-core
- **Version:** 1.0.0
- **Last Updated:** 2026-01-13
- **Description:** TypeScript-based module that generates all 16 `.coderef/` output files from scanned code elements. Orchestrates 8 generation functions across 4 execution phases with parallel execution and fault tolerance.
- **Key Files:**
  - `packages/coderef-core/src/fileGeneration/saveIndex.ts`
  - `packages/coderef-core/src/fileGeneration/generateContext.ts`
  - `packages/coderef-core/src/fileGeneration/buildDependencyGraph.ts`
  - `packages/coderef-core/src/fileGeneration/detectPatterns.ts`
  - `packages/coderef-core/src/fileGeneration/analyzeCoverage.ts`
  - `packages/coderef-core/src/fileGeneration/validateReferences.ts`
  - `packages/coderef-core/src/fileGeneration/detectDrift.ts`
  - `packages/coderef-core/src/fileGeneration/generateDiagrams.ts`

### ✅ Context Generator
- **File:** `Context-Generator-RESOURCE-SHEET.md`
- **Status:** APPROVED (RSMS v2.0)
- **Category:** service
- **Parent Project:** coderef-core
- **Version:** 1.0.0
- **Last Updated:** 2026-01-13
- **Description:** TypeScript service class that orchestrates comprehensive codebase analysis and context generation for AI/MCP integration. Performs 8-step pipeline: scanning, entry point detection, function ranking, pattern detection, dependency analysis, health metrics, and formatting.
- **Key Files:**
  - `packages/coderef-core/src/context/context-generator.ts`
  - `packages/coderef-core/src/context/entry-point-detector.ts`
  - `packages/coderef-core/src/context/markdown-formatter.ts`
  - `packages/coderef-core/src/scanner/scanner.ts`
  - `packages/coderef-core/src/analyzer/analyzer-service.ts`

### ✅ Dependency Graph Builder
- **File:** `Dependency-Graph-Builder-RESOURCE-SHEET.md`
- **Status:** APPROVED (RSMS v2.0)
- **Category:** service
- **Parent Project:** coderef-core
- **Version:** 1.0.0
- **Last Updated:** 2026-01-13
- **Description:** TypeScript function that generates `.coderef/graph.json` files containing import/export relationships, function call graphs, and file-level dependencies. Creates graph structure with nodes (files and elements) and edges (imports, calls).
- **Key Files:**
  - `packages/coderef-core/src/fileGeneration/buildDependencyGraph.ts`
  - `packages/coderef-core/src/types/types.ts`

### ✅ Scanner UI System
- **File:** `Scanner-Ui-System-RESOURCE-SHEET.md`
- **Status:** APPROVED (RSMS v2.0)
- **Category:** component
- **Parent Project:** coderef-dashboard
- **Version:** 1.0.0
- **Last Updated:** 2026-01-13
- **Description:** React component system that provides the primary scan interface for the CodeRef dashboard. Integrates ProjectListCard, ConsoleTabs, and ActionBar with real-time SSE output streaming.
- **Key Files:**
  - `packages/dashboard/src/components/Scanner/index.tsx`
  - `packages/dashboard/src/components/Scanner/ProjectListCard.tsx`
  - `packages/dashboard/src/components/Scanner/ConsoleTabs.tsx`
  - `packages/dashboard/src/components/Scanner/ActionBar.tsx`
  - `packages/dashboard/src/components/Scanner/ConfirmationDialog.tsx`
  - `packages/dashboard/src/app/scanner/page.tsx`

### ✅ Theme System
- **File:** `Theme-System-RESOURCE-SHEET.md`
- **Status:** APPROVED (RSMS v2.0)
- **Category:** component
- **Parent Project:** coderef-dashboard
- **Version:** 1.0.0
- **Last Updated:** 2026-01-13
- **Description:** React Context-based theming solution that manages global dark/light mode and customizable accent colors. Persists preferences to localStorage and applies styles via CSS classes and CSS variables.
- **Key Files:**
  - `packages/dashboard/src/contexts/ThemeContext.tsx`
  - `packages/dashboard/src/contexts/AccentColorContext.tsx`
  - `packages/dashboard/src/components/ThemeToggle.tsx`
  - `packages/dashboard/src/components/ThemePanel.tsx`
  - `packages/dashboard/src/components/AccentColorPicker.tsx`

### ✅ ScanExecutor
- **File:** `ScanExecutor-RESOURCE-SHEET.md`
- **Status:** APPROVED (RSMS v2.0)
- **Category:** service
- **Parent Project:** coderef-dashboard
- **Version:** 1.0.0
- **Last Updated:** 2026-01-13
- **Description:** Node.js EventEmitter-based service that orchestrates 3-phase scan execution (directories → scan → generate). Manages sequential project processing, real-time SSE output streaming, process lifecycle, and global registry with automatic cleanup. Core orchestrator of scanner backend.
- **Key Files:**
  - `packages/dashboard/src/app/api/scanner/lib/scanExecutor.ts`
  - `packages/dashboard/src/app/api/scanner/scan/route.ts`
  - `packages/dashboard/src/app/api/scanner/scan/[scanId]/output/route.ts`
  - `packages/dashboard/src/app/api/scanner/scan/[scanId]/status/route.ts`
  - `packages/dashboard/src/app/api/scanner/scan/[scanId]/cancel/route.ts`

---

## Medium Priority Systems

### ✅ API Routes System
- **File:** `Api-Routes-System-RESOURCE-SHEET.md`
- **Status:** APPROVED (RSMS v2.0)
- **Category:** service
- **Parent Project:** coderef-dashboard
- **Version:** 1.0.0
- **Last Updated:** 2026-01-13
- **Description:** Next.js App Router-based REST API layer providing HTTP endpoints for workorders, stubs, sessions, scanner operations, and CodeRef operations. Serves as contract layer between frontend and backend, coordinating file system operations, ScanExecutor lifecycle, and configuration management.
- **Key Files:**
  - `packages/dashboard/src/app/api/workorders/route.ts`
  - `packages/dashboard/src/app/api/stubs/route.ts`
  - `packages/dashboard/src/app/api/sessions/route.ts`
  - `packages/dashboard/src/app/api/scanner/scan/route.ts`
  - `packages/dashboard/src/app/api/scanner/projects/route.ts`
  - `packages/dashboard/src/app/api/coderef/projects/route.ts`
  - `packages/dashboard/src/app/api/coderef/tree/route.ts`
  - `packages/dashboard/src/app/api/coderef/file/route.ts`
  - `packages/dashboard/src/app/api/scan/route.ts`

### ✅ Navigation System
- **File:** `Navigation-System-RESOURCE-SHEET.md`
- **Status:** APPROVED (RSMS v2.0)
- **Category:** component
- **Parent Project:** coderef-dashboard
- **Version:** 1.0.0
- **Last Updated:** 2026-01-13
- **Description:** React component system providing primary navigation UI with Sidebar (desktop), Header (breadcrumbs), and MobileNav (mobile hamburger). Manages active route state, responsive design, and accessibility. Foundation for all page navigation.
- **Key Files:**
  - `packages/dashboard/src/components/Sidebar.tsx`
  - `packages/dashboard/src/components/Header.tsx`
  - `packages/dashboard/src/components/MobileNav.tsx`

### ✅ Pattern Detection System
- **File:** `Pattern-Detection-System-RESOURCE-SHEET.md`
- **Status:** APPROVED (RSMS v2.0)
- **Category:** service
- **Parent Project:** coderef-core
- **Version:** 1.0.0
- **Last Updated:** 2026-01-13
- **Description:** TypeScript function that detects 5 architectural patterns (event handlers, decorators, error handling, test patterns, API endpoints) using string matching algorithms. Generates `.coderef/reports/patterns.json` as part of File Generation System Phase 3.
- **Key Files:**
  - `packages/coderef-core/src/fileGeneration/detectPatterns.ts`
  - `packages/coderef-core/src/types/types.ts`

---

## Archive / Duplicate Files

The following files exist in `systems/` subdirectory and appear to be duplicates or archived versions:

- `systems/Context-Generator-RESOURCE-SHEET.md`
- `systems/Dependency-Graph-Builder-RESOURCE-SHEET.md`
- `systems/File-Generation-System-RESOURCE-SHEET.md`
- `systems/Scanner-UI-System-RESOURCE-SHEET.md`
- `systems/Theme-System-RESOURCE-SHEET.md`

**Recommendation:** Review and consolidate these files. The root-level versions are the authoritative sources.

---

## Index by Category

### Systems (coderef-core)
- File Generation System ✅
- Pattern Detection System ✅

### Services (coderef-core)
- Context Generator ✅
- Dependency Graph Builder ✅

### Components (coderef-dashboard)
- Scanner UI System ✅
- Theme System ✅
- Navigation System ✅

### Services (coderef-dashboard)
- ScanExecutor ✅
- API Routes System ✅

---

## Index by Status

### ✅ Approved (RSMS v2.0 Compliant)
1. File Generation System
2. Context Generator
3. Dependency Graph Builder
4. Scanner UI System
5. Theme System
6. ScanExecutor
7. API Routes System
8. Navigation System
9. Pattern Detection System

### ⚠️ Needs Completion
None - All resource sheets are complete!

---

## Index by Parent Project

### coderef-core
- File Generation System ✅
- Context Generator ✅
- Dependency Graph Builder ✅
- Pattern Detection System ⚠️

### coderef-dashboard
- Scanner UI System ✅
- Theme System ✅
- Navigation System ⚠️
- ScanExecutor ⚠️
- API Routes System ⚠️

---

## Quick Reference

| System | Status | Category | Project | Priority |
|--------|--------|----------|---------|----------|
| File Generation System | ✅ Approved | system | coderef-core | High |
| Context Generator | ✅ Approved | service | coderef-core | High |
| Dependency Graph Builder | ✅ Approved | service | coderef-core | High |
| Scanner UI System | ✅ Approved | component | coderef-dashboard | High |
| Theme System | ✅ Approved | component | coderef-dashboard | High |
| ScanExecutor | ✅ Approved | service | coderef-dashboard | Medium |
| API Routes System | ✅ Approved | service | coderef-dashboard | Medium |
| Navigation System | ✅ Approved | component | coderef-dashboard | Medium |
| Pattern Detection System | ✅ Approved | service | coderef-core | Medium |

---

## Maintenance Notes

**Last Index Update:** 2026-01-13  
**Next Review:** When new resource sheets are added or existing ones are updated

**Update Process:**
1. Add new resource sheet entry with metadata from frontmatter
2. Update status if sheet is completed/converted to RSMS v2.0
3. Update statistics in Overview section
4. Update relevant index sections (by category, status, project)

**Validation:**
- All approved sheets must have RSMS v2.0 compliant frontmatter
- All approved sheets must have `status: APPROVED`
- Template sheets should be marked as `⚠️ Template` or `⚠️ Review`

---

## Related Documentation

- **RSMS v2.0 Standard:** Resource Sheet Metadata Standard v2.0
- **Resource Sheet Template:** See `/create-resource-sheet` command documentation
- **Validation:** Use Papertrail validation tools for RSMS v2.0 compliance

---

*This index is maintained manually. Update when resource sheets are added, completed, or archived.*

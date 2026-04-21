# TypeScript Implementation Plan - CodeRef Scanner
**Created:** 2026-01-04
**Status:** Implementation Guide
**Purpose:** Port CodeRef CLI functionality to pure TypeScript for self-contained dashboard

---

## Required Context & Resources

### Reference Documentation (Same Directory)
| File | Purpose | Use For |
|------|---------|---------|
| `SCANNER-SYSTEM.md` | Current scanner architecture | Understanding existing implementation |
| `../API-SCANNER-CONTRACT.md` | Scanner API contract | API design and integration |
| `../SCRIPTS-RESOURCE-SHEET.md` | Script inventory | Finding related scripts and tools |

### Python Scripts to Study (CodeRef System)
**Location:** `C:\Users\willh\Desktop\projects\coderef-system\scripts\`

| Script | Purpose | Study For |
|--------|---------|-----------|
| `scan-all.py` | Complete scanning workflow | Overall architecture and CLI command usage |
| `generate-coderef-directories.py` | **REFERENCE: 16-file generation logic** | **Primary reference - step-by-step file generation to replicate in TypeScript** |
| `diagram-generator.py` | Mermaid/DOT generation | Diagram generation algorithms |
| `extract-context.py` | Context extraction | Context building logic |
| `parse_coderef_data.py` | Large index preprocessing | Data processing patterns |

**Note:** `generate-coderef-directories.py` is the **reference implementation** showing how the CLI-based approach works. We will replicate this functionality in pure TypeScript to eliminate the external dependency.

### Existing TypeScript Code (Dashboard)
**Location:** `packages/coderef-core/src/` & `packages/dashboard/src/app/api/scanner/`

| File | Purpose | Use For |
|------|---------|---------|
| `scanner.ts` (or similar) | Current `scanCurrentElements()` | Understanding ElementData structure |
| `lib/scanExecutor.ts` | Scan orchestration | Integration point and progress reporting |
| `types.ts` | Type definitions | Existing type schemas |
| `lib/graph-helpers.ts` | Graph utilities (if exists) | Dependency analysis helpers |

### External Resources

| Resource | URL/Location | Use For |
|----------|-------------|---------|
| **Mermaid Docs** | https://mermaid.js.org/intro/ | Diagram syntax reference |
| **JSON-LD Spec** | https://json-ld.org/ | Semantic export format |
| **TypeScript AST** | https://ts-ast-viewer.com/ | AST parsing (if extending scanner) |
| **CodeRef CLI** | (if available) | Understanding CLI output formats |

### Key Concepts to Research

1. **AST Parsing:** How `scanCurrentElements()` extracts elements from source files
2. **Dependency Resolution:** How imports/calls are tracked between files
3. **Graph Theory:** Basic graph representation (nodes/edges) for dependency graphs
4. **Mermaid Syntax:** Graph TD, flowchart, sequence diagrams
5. **JSON-LD:** Semantic web data representation
6. **Test Coverage:** How to infer coverage from test file patterns

---

## Executive Summary

**Goal:** Eliminate Python/CLI dependencies by implementing all 16 output file generators in TypeScript within `@coderef/core` package.

**Current State:**
- ✅ Phase 0 (Directories): Python script (`setup_coderef_dirs.py`) - **WORKING**
  - Location: `packages/coderef-core/scripts/setup-coderef-dir/`
  - Creates `.coderef/` and `coderef/` directory structure (7 directories)
- ⚠️ Phase 1 (Scan): TypeScript scanner - **INCOMPLETE**
  - Works: Scans codebase, finds elements, reports statistics
  - Missing: Doesn't save any files to disk (data discarded)
- ❌ Phase 2 (Populate): **NOT AVAILABLE** (external script dependency)
  - Requires: `generate-coderef-directories.py` from coderef-system
  - Requires: CodeRef CLI installed
  - Decision: Skip this phase, implement in TypeScript instead

**Target State:**
- ✅ Phase 0 (Directories): Keep Python (simple, works, no changes needed)
- ✅ Phase 1 (Scan): **Expand TypeScript scanner to generate all 16 files**
  - Merge Phase 1 + Phase 2 functionality into single TypeScript implementation
  - No external dependencies (Python, CodeRef CLI)
- ❌ Phase 2 (Populate): **Remove entirely** (functionality moved to Phase 1)

---

## Current Implementation

### What You Have

```typescript
// packages/coderef-core/src/scanner.ts
export async function scanCurrentElements(
  projectPath: string,
  languages: string[],
  options: ScanOptions
): Promise<ElementData[]>
```

**Capabilities:**
- Scans TypeScript/JavaScript files
- Parses AST to find functions, classes, components
- Returns array of elements with metadata
- No external dependencies

**Limitations:**
- ❌ Does not save to `.coderef/index.json`
- ❌ Does not generate other 15 files
- ❌ Data is discarded after statistics

---

## Implementation Plan

### Phase 1: Core Data Generation (4 functions)

#### 1. Save Index (`saveIndex.ts`)

**Purpose:** Persist scan results to disk

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ElementData } from './types';

export async function saveIndex(
  projectPath: string,
  elements: ElementData[]
): Promise<void> {
  const indexPath = path.join(projectPath, '.coderef', 'index.json');

  // Ensure directory exists
  await fs.mkdir(path.dirname(indexPath), { recursive: true });

  // Write formatted JSON
  await fs.writeFile(
    indexPath,
    JSON.stringify(elements, null, 2),
    'utf-8'
  );

  console.log(`[saveIndex] Saved ${elements.length} elements to index.json`);
}
```

**Replaces:** `coderef scan "{project}" -l {lang} --json > .coderef/index.json`

**Output:** `.coderef/index.json`

---

#### 2. Generate Context (`generateContext.ts`)

**Purpose:** Create project summary from scan results

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ElementData, ProjectContext } from './types';

export async function generateContext(
  projectPath: string,
  elements: ElementData[]
): Promise<{ json: ProjectContext; markdown: string }> {

  // Build structured context
  const context: ProjectContext = {
    projectName: path.basename(projectPath),
    projectPath,
    scannedAt: new Date().toISOString(),
    totalElements: elements.length,
    totalFiles: new Set(elements.map(e => e.file)).size,
    elementsByType: groupByType(elements),
    filesByDirectory: groupByDirectory(elements),
    summary: generateSummary(elements),
    languages: ['ts', 'tsx', 'js', 'jsx'],
  };

  // Generate markdown version
  const markdown = formatContextMarkdown(context);

  // Save both formats
  const coderefDir = path.join(projectPath, '.coderef');

  await fs.writeFile(
    path.join(coderefDir, 'context.json'),
    JSON.stringify(context, null, 2),
    'utf-8'
  );

  await fs.writeFile(
    path.join(coderefDir, 'context.md'),
    markdown,
    'utf-8'
  );

  return { json: context, markdown };
}

// Helper: Group elements by type (function, class, component, etc.)
function groupByType(elements: ElementData[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const element of elements) {
    counts[element.kind] = (counts[element.kind] || 0) + 1;
  }
  return counts;
}

// Helper: Group files by directory
function groupByDirectory(elements: ElementData[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const element of elements) {
    const dir = path.dirname(element.file);
    counts[dir] = (counts[dir] || 0) + 1;
  }
  return counts;
}

// Helper: Generate text summary
function generateSummary(elements: ElementData[]): string {
  const fileCount = new Set(elements.map(e => e.file)).size;
  const types = groupByType(elements);

  return `Project contains ${elements.length} code elements across ${fileCount} files. ` +
         `Element breakdown: ${Object.entries(types).map(([k, v]) => `${v} ${k}s`).join(', ')}.`;
}

// Helper: Format as markdown
function formatContextMarkdown(context: ProjectContext): string {
  return `# ${context.projectName} - Project Context

**Scanned:** ${context.scannedAt}
**Total Elements:** ${context.totalElements}
**Total Files:** ${context.totalFiles}

## Summary

${context.summary}

## Elements by Type

${Object.entries(context.elementsByType)
  .map(([type, count]) => `- **${type}**: ${count}`)
  .join('\n')}

## Files by Directory

${Object.entries(context.filesByDirectory)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([dir, count]) => `- \`${dir}\`: ${count} elements`)
  .join('\n')}

---
*Generated by CodeRef Scanner*
`;
}
```

**Replaces:**
- `coderef context "{project}" -f json > .coderef/context.json`
- `coderef context "{project}" > .coderef/context.md`

**Outputs:**
- `.coderef/context.json`
- `.coderef/context.md`

---

#### 3. Build Dependency Graph (`buildGraph.ts`)

**Purpose:** Analyze imports and dependencies

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ElementData, DependencyGraph, GraphNode, GraphEdge } from './types';

export async function buildDependencyGraph(
  projectPath: string,
  elements: ElementData[]
): Promise<DependencyGraph> {

  const graph: DependencyGraph = {
    nodes: [],
    edges: [],
  };

  // Build nodes from elements
  for (const element of elements) {
    graph.nodes.push({
      id: element.id,
      label: element.name,
      type: element.kind,
      file: element.file,
      line: element.line,
    });
  }

  // Build edges from imports/dependencies
  for (const element of elements) {
    // Parse imports (if available in ElementData)
    if (element.imports) {
      for (const imp of element.imports) {
        graph.edges.push({
          from: element.id,
          to: imp.target,
          type: 'import',
          source: element.file,
        });
      }
    }

    // Parse function calls (if available)
    if (element.calls) {
      for (const call of element.calls) {
        graph.edges.push({
          from: element.id,
          to: call.target,
          type: 'call',
          source: element.file,
        });
      }
    }
  }

  // Save graph
  const graphPath = path.join(projectPath, '.coderef', 'graph.json');
  await fs.writeFile(
    graphPath,
    JSON.stringify(graph, null, 2),
    'utf-8'
  );

  console.log(`[buildGraph] Created graph with ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

  return graph;
}
```

**Replaces:** `coderef export -f json > .coderef/graph.json`

**Output:** `.coderef/graph.json`

---

#### 4. Detect Patterns (`detectPatterns.ts`)

**Purpose:** Find common code patterns

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ElementData, PatternReport, Pattern } from './types';

export async function detectPatterns(
  projectPath: string,
  elements: ElementData[]
): Promise<PatternReport> {

  const patterns: PatternReport = {
    handlers: findHandlers(elements),
    decorators: findDecorators(elements),
    errorHandling: findErrorPatterns(elements),
    testPatterns: findTestPatterns(elements),
    apiEndpoints: findApiEndpoints(elements),
    components: findComponents(elements),
  };

  // Save report
  const reportsDir = path.join(projectPath, '.coderef', 'reports');
  await fs.mkdir(reportsDir, { recursive: true });

  await fs.writeFile(
    path.join(reportsDir, 'patterns.json'),
    JSON.stringify(patterns, null, 2),
    'utf-8'
  );

  return patterns;
}

// Pattern detectors
function findHandlers(elements: ElementData[]): Pattern[] {
  return elements
    .filter(e =>
      e.name.endsWith('Handler') ||
      e.name.endsWith('Controller') ||
      e.name.includes('handle')
    )
    .map(e => ({
      type: 'handler',
      element: e.id,
      name: e.name,
      location: `${e.file}:${e.line}`,
    }));
}

function findDecorators(elements: ElementData[]): Pattern[] {
  return elements
    .filter(e => e.decorators && e.decorators.length > 0)
    .map(e => ({
      type: 'decorator',
      element: e.id,
      name: e.name,
      decorators: e.decorators,
      location: `${e.file}:${e.line}`,
    }));
}

function findErrorPatterns(elements: ElementData[]): Pattern[] {
  return elements
    .filter(e =>
      e.name.includes('Error') ||
      e.name.includes('Exception') ||
      e.kind === 'catch'
    )
    .map(e => ({
      type: 'error-handling',
      element: e.id,
      name: e.name,
      location: `${e.file}:${e.line}`,
    }));
}

function findTestPatterns(elements: ElementData[]): Pattern[] {
  return elements
    .filter(e =>
      e.file.includes('.test.') ||
      e.file.includes('.spec.') ||
      e.name.startsWith('test') ||
      e.name.startsWith('it') ||
      e.name.startsWith('describe')
    )
    .map(e => ({
      type: 'test',
      element: e.id,
      name: e.name,
      location: `${e.file}:${e.line}`,
    }));
}

function findApiEndpoints(elements: ElementData[]): Pattern[] {
  return elements
    .filter(e =>
      e.name === 'GET' ||
      e.name === 'POST' ||
      e.name === 'PUT' ||
      e.name === 'DELETE' ||
      e.decorators?.some(d => ['GET', 'POST', 'PUT', 'DELETE'].includes(d))
    )
    .map(e => ({
      type: 'api-endpoint',
      element: e.id,
      name: e.name,
      location: `${e.file}:${e.line}`,
    }));
}

function findComponents(elements: ElementData[]): Pattern[] {
  return elements
    .filter(e =>
      e.kind === 'component' ||
      (e.kind === 'function' && /^[A-Z]/.test(e.name)) // React components
    )
    .map(e => ({
      type: 'component',
      element: e.id,
      name: e.name,
      location: `${e.file}:${e.line}`,
    }));
}
```

**Replaces:** `coderef patterns -f json > .coderef/reports/patterns.json`

**Output:** `.coderef/reports/patterns.json`

---

### Phase 2: Reports & Analysis (4 functions)

#### 5. Analyze Coverage (`analyzeCoverage.ts`)

**Purpose:** Detect test coverage

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ElementData, CoverageReport } from './types';

export async function analyzeCoverage(
  projectPath: string,
  elements: ElementData[]
): Promise<CoverageReport> {

  // Identify test files
  const testFiles = elements.filter(e =>
    e.file.includes('.test.') ||
    e.file.includes('.spec.') ||
    e.file.includes('__tests__')
  );

  // Identify source files (non-test)
  const sourceFiles = elements.filter(e =>
    !e.file.includes('.test.') &&
    !e.file.includes('.spec.') &&
    !e.file.includes('__tests__')
  );

  // Calculate coverage
  const testedElements = countTestedElements(sourceFiles, testFiles);

  const coverage: CoverageReport = {
    totalElements: sourceFiles.length,
    testedElements,
    coveragePercentage: (testedElements / sourceFiles.length) * 100,
    uncoveredFiles: findUncoveredFiles(sourceFiles, testFiles),
    testFiles: testFiles.length,
    testFilesList: Array.from(new Set(testFiles.map(e => e.file))),
  };

  // Save report
  const reportsDir = path.join(projectPath, '.coderef', 'reports');
  await fs.mkdir(reportsDir, { recursive: true });

  await fs.writeFile(
    path.join(reportsDir, 'coverage.json'),
    JSON.stringify(coverage, null, 2),
    'utf-8'
  );

  return coverage;
}

function countTestedElements(
  sourceElements: ElementData[],
  testElements: ElementData[]
): number {
  let count = 0;

  for (const source of sourceElements) {
    // Check if any test references this element
    const hasTest = testElements.some(test =>
      test.file.includes(source.name) ||
      test.name.includes(source.name)
    );

    if (hasTest) count++;
  }

  return count;
}

function findUncoveredFiles(
  sourceElements: ElementData[],
  testElements: ElementData[]
): string[] {
  const sourceFiles = new Set(sourceElements.map(e => e.file));
  const testedFiles = new Set<string>();

  for (const test of testElements) {
    // Infer tested file from test file name
    const testedFile = test.file
      .replace('.test.', '.')
      .replace('.spec.', '.')
      .replace('__tests__/', '');

    testedFiles.add(testedFile);
  }

  return Array.from(sourceFiles).filter(f => !testedFiles.has(f));
}
```

**Replaces:** `coderef coverage -f json > .coderef/reports/coverage.json`

**Output:** `.coderef/reports/coverage.json`

---

#### 6. Validate References (`validateReferences.ts`)

**Purpose:** Check for broken references

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ElementData, ValidationReport, ValidationError } from './types';

export async function validateReferences(
  projectPath: string,
  elements: ElementData[]
): Promise<ValidationReport> {

  const validation: ValidationReport = {
    valid: 0,
    invalid: 0,
    errors: [],
    warnings: [],
  };

  // Build element ID map for fast lookup
  const elementMap = new Map(elements.map(e => [e.id, e]));

  // Validate each element's references
  for (const element of elements) {
    if (element.references) {
      for (const ref of element.references) {
        const target = elementMap.get(ref.target);

        if (!target) {
          validation.invalid++;
          validation.errors.push({
            element: element.id,
            elementName: element.name,
            reference: ref.target,
            location: `${element.file}:${element.line}`,
            reason: 'Reference target not found',
            severity: 'error',
          });
        } else {
          validation.valid++;
        }
      }
    }

    // Validate imports
    if (element.imports) {
      for (const imp of element.imports) {
        // Check if imported file exists
        const importPath = path.join(projectPath, imp.path);
        try {
          await fs.access(importPath);
          validation.valid++;
        } catch {
          validation.warnings.push({
            element: element.id,
            elementName: element.name,
            reference: imp.path,
            location: `${element.file}:${element.line}`,
            reason: 'Imported file not found',
            severity: 'warning',
          });
        }
      }
    }
  }

  // Save report
  const reportsDir = path.join(projectPath, '.coderef', 'reports');
  await fs.mkdir(reportsDir, { recursive: true });

  await fs.writeFile(
    path.join(reportsDir, 'validation.json'),
    JSON.stringify(validation, null, 2),
    'utf-8'
  );

  return validation;
}
```

**Replaces:** `coderef validate "{project}" -f json > .coderef/reports/validation.json`

**Output:** `.coderef/reports/validation.json`

---

#### 7. Detect Drift (`detectDrift.ts`)

**Purpose:** Compare current scan vs previous index

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ElementData, DriftReport, DriftChange } from './types';

export async function detectDrift(
  projectPath: string,
  currentElements: ElementData[]
): Promise<DriftReport> {

  const indexPath = path.join(projectPath, '.coderef', 'index.json');

  // Try to load previous index
  let previousElements: ElementData[] = [];
  try {
    const data = await fs.readFile(indexPath, 'utf-8');
    previousElements = JSON.parse(data);
  } catch {
    // No previous index - first scan
    const drift: DriftReport = {
      hasDrift: false,
      added: currentElements.map(e => ({ element: e, reason: 'Initial scan' })),
      removed: [],
      modified: [],
      summary: `Initial scan: ${currentElements.length} elements added`,
    };

    // Save report
    const reportsDir = path.join(projectPath, '.coderef', 'reports');
    await fs.mkdir(reportsDir, { recursive: true });
    await fs.writeFile(
      path.join(reportsDir, 'drift.json'),
      JSON.stringify(drift, null, 2),
      'utf-8'
    );

    return drift;
  }

  // Build maps for comparison
  const prevMap = new Map(previousElements.map(e => [e.id, e]));
  const currMap = new Map(currentElements.map(e => [e.id, e]));

  const drift: DriftReport = {
    hasDrift: false,
    added: [],
    removed: [],
    modified: [],
    summary: '',
  };

  // Find added elements
  for (const [id, element] of currMap) {
    if (!prevMap.has(id)) {
      drift.added.push({
        element,
        reason: 'New element',
      });
    }
  }

  // Find removed elements
  for (const [id, element] of prevMap) {
    if (!currMap.has(id)) {
      drift.removed.push({
        element,
        reason: 'Element deleted',
      });
    }
  }

  // Find modified elements
  for (const [id, currElement] of currMap) {
    const prevElement = prevMap.get(id);
    if (prevElement && hasChanged(prevElement, currElement)) {
      drift.modified.push({
        element: currElement,
        previousElement: prevElement,
        reason: 'Element modified',
        changes: describeChanges(prevElement, currElement),
      });
    }
  }

  // Calculate drift status
  drift.hasDrift = drift.added.length > 0 || drift.removed.length > 0 || drift.modified.length > 0;
  drift.summary = `Added: ${drift.added.length}, Removed: ${drift.removed.length}, Modified: ${drift.modified.length}`;

  // Save report
  const reportsDir = path.join(projectPath, '.coderef', 'reports');
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(
    path.join(reportsDir, 'drift.json'),
    JSON.stringify(drift, null, 2),
    'utf-8'
  );

  return drift;
}

function hasChanged(prev: ElementData, curr: ElementData): boolean {
  return prev.line !== curr.line ||
         prev.kind !== curr.kind ||
         prev.signature !== curr.signature;
}

function describeChanges(prev: ElementData, curr: ElementData): string[] {
  const changes: string[] = [];

  if (prev.line !== curr.line) {
    changes.push(`Line changed: ${prev.line} → ${curr.line}`);
  }
  if (prev.kind !== curr.kind) {
    changes.push(`Kind changed: ${prev.kind} → ${curr.kind}`);
  }
  if (prev.signature !== curr.signature) {
    changes.push(`Signature changed`);
  }

  return changes;
}
```

**Replaces:** `coderef drift "{project}" --json > .coderef/reports/drift.json`

**Output:** `.coderef/reports/drift.json`

---

### Phase 3: Diagrams & Exports (2 functions)

#### 8. Generate Diagrams (`generateDiagrams.ts`)

**Purpose:** Create Mermaid and DOT diagrams

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import type { DependencyGraph } from './types';

export async function generateDiagrams(
  projectPath: string,
  graph: DependencyGraph
): Promise<void> {

  const diagramsDir = path.join(projectPath, '.coderef', 'diagrams');
  await fs.mkdir(diagramsDir, { recursive: true });

  // 1. Dependencies diagram (Mermaid)
  const mermaidDeps = generateMermaidDependencies(graph);
  await fs.writeFile(
    path.join(diagramsDir, 'dependencies.mmd'),
    mermaidDeps,
    'utf-8'
  );

  // 2. Dependencies diagram (DOT/Graphviz)
  const dotDeps = generateDotDependencies(graph);
  await fs.writeFile(
    path.join(diagramsDir, 'dependencies.dot'),
    dotDeps,
    'utf-8'
  );

  // 3. Call graph (Mermaid)
  const mermaidCalls = generateMermaidCalls(graph);
  await fs.writeFile(
    path.join(diagramsDir, 'calls.mmd'),
    mermaidCalls,
    'utf-8'
  );

  // 4. Import graph (Mermaid)
  const mermaidImports = generateMermaidImports(graph);
  await fs.writeFile(
    path.join(diagramsDir, 'imports.mmd'),
    mermaidImports,
    'utf-8'
  );

  console.log('[generateDiagrams] Created 4 diagram files');
}

function generateMermaidDependencies(graph: DependencyGraph): string {
  const lines = ['graph TD'];

  // Add edges
  for (const edge of graph.edges) {
    const fromNode = graph.nodes.find(n => n.id === edge.from);
    const toNode = graph.nodes.find(n => n.id === edge.to);

    if (fromNode && toNode) {
      lines.push(`  ${sanitizeId(edge.from)}["${fromNode.label}"] --> ${sanitizeId(edge.to)}["${toNode.label}"]`);
    }
  }

  return lines.join('\n');
}

function generateDotDependencies(graph: DependencyGraph): string {
  const lines = ['digraph G {', '  rankdir=LR;', '  node [shape=box];', ''];

  // Add edges
  for (const edge of graph.edges) {
    const fromNode = graph.nodes.find(n => n.id === edge.from);
    const toNode = graph.nodes.find(n => n.id === edge.to);

    if (fromNode && toNode) {
      lines.push(`  "${fromNode.label}" -> "${toNode.label}";`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

function generateMermaidCalls(graph: DependencyGraph): string {
  const lines = ['graph LR'];

  // Filter to call edges only
  const callEdges = graph.edges.filter(e => e.type === 'call');

  for (const edge of callEdges) {
    const fromNode = graph.nodes.find(n => n.id === edge.from);
    const toNode = graph.nodes.find(n => n.id === edge.to);

    if (fromNode && toNode) {
      lines.push(`  ${sanitizeId(edge.from)}["${fromNode.label}"] -->|call| ${sanitizeId(edge.to)}["${toNode.label}"]`);
    }
  }

  return lines.join('\n');
}

function generateMermaidImports(graph: DependencyGraph): string {
  const lines = ['graph LR'];

  // Filter to import edges only
  const importEdges = graph.edges.filter(e => e.type === 'import');

  for (const edge of importEdges) {
    const fromNode = graph.nodes.find(n => n.id === edge.from);
    const toNode = graph.nodes.find(n => n.id === edge.to);

    if (fromNode && toNode) {
      lines.push(`  ${sanitizeId(edge.from)}["${fromNode.label}"] -->|import| ${sanitizeId(edge.to)}["${toNode.label}"]`);
    }
  }

  return lines.join('\n');
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, '_');
}
```

**Replaces:**
- `coderef diagram -f mermaid -t dependencies > .coderef/diagrams/dependencies.mmd`
- `coderef diagram -f dot -t dependencies > .coderef/diagrams/dependencies.dot`
- `coderef diagram -f mermaid -t calls > .coderef/diagrams/calls.mmd`
- `coderef diagram -f mermaid -t imports > .coderef/diagrams/imports.mmd`

**Outputs:**
- `.coderef/diagrams/dependencies.mmd`
- `.coderef/diagrams/dependencies.dot`
- `.coderef/diagrams/calls.mmd`
- `.coderef/diagrams/imports.mmd`

---

#### 9. Export Formats (`exportFormats.ts`)

**Purpose:** Generate JSON-LD and wrapped diagrams

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import type { DependencyGraph } from './types';

export async function exportFormats(
  projectPath: string,
  graph: DependencyGraph
): Promise<void> {

  const exportsDir = path.join(projectPath, '.coderef', 'exports');
  await fs.mkdir(exportsDir, { recursive: true });

  // 1. Full graph export (JSON)
  await fs.writeFile(
    path.join(exportsDir, 'graph.json'),
    JSON.stringify(graph, null, 2),
    'utf-8'
  );

  // 2. JSON-LD format (semantic web)
  const jsonld = {
    "@context": "https://schema.org/",
    "@type": "SoftwareSourceCode",
    "name": path.basename(projectPath),
    "codeRepository": projectPath,
    "programmingLanguage": ["TypeScript", "JavaScript"],
    "graph": {
      "@type": "Graph",
      "nodes": graph.nodes.length,
      "edges": graph.edges.length,
      "data": graph,
    },
  };

  await fs.writeFile(
    path.join(exportsDir, 'graph.jsonld'),
    JSON.stringify(jsonld, null, 2),
    'utf-8'
  );

  // 3. Wrapped Mermaid diagram (for easy rendering)
  const mermaidPath = path.join(projectPath, '.coderef', 'diagrams', 'dependencies.mmd');

  try {
    const mermaidContent = await fs.readFile(mermaidPath, 'utf-8');
    const wrapped = `# ${path.basename(projectPath)} - Dependency Diagram

Generated: ${new Date().toISOString()}

## Architecture Overview

\`\`\`mermaid
${mermaidContent}
\`\`\`

## Usage

Render this diagram at:
- https://mermaid.live
- GitHub markdown
- VSCode with Mermaid extension
`;

    await fs.writeFile(
      path.join(exportsDir, 'diagram-wrapped.md'),
      wrapped,
      'utf-8'
    );
  } catch {
    console.warn('[exportFormats] Could not wrap Mermaid diagram (dependencies.mmd not found)');
  }

  console.log('[exportFormats] Created 3 export files');
}
```

**Replaces:**
- `coderef export -f json > .coderef/exports/graph.json`
- `coderef export -f jsonld > .coderef/exports/graph.jsonld`
- Manual Mermaid wrapping

**Outputs:**
- `.coderef/exports/graph.json`
- `.coderef/exports/graph.jsonld`
- `.coderef/exports/diagram-wrapped.md`

---

## Integration: Update scanExecutor.ts

### Current Implementation (Incomplete)

```typescript
// packages/dashboard/src/app/api/scanner/lib/scanExecutor.ts

private async runScanForProject(projectPath: string): Promise<void> {
  // Call scanner directly (no HTTP, no subprocess)
  const elements: ElementData[] = await scanCurrentElements(
    projectPath,
    ['ts', 'tsx', 'js', 'jsx'],
    {
      recursive: true,
      exclude: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.next/**'],
    }
  );

  // Emit completion with summary
  this.emitOutput(`[Scanner] Found ${totalElements} elements in ${filesScanned} files`);
  // ❌ Data discarded - not saved
}
```

---

### New Implementation (Complete)

```typescript
// packages/dashboard/src/app/api/scanner/lib/scanExecutor.ts

import {
  scanCurrentElements,
  saveIndex,
  generateContext,
  buildDependencyGraph,
  detectPatterns,
  analyzeCoverage,
  validateReferences,
  detectDrift,
  generateDiagrams,
  exportFormats,
} from '@coderef/core';

private async runScanForProject(projectPath: string): Promise<void> {
  try {
    this.emitOutput(`\n[Scanner] Starting comprehensive scan for: ${projectPath}`);
    this.emitOutput(`[Scanner] Using @coderef/core scanner (in-process)\n`);

    const startTime = Date.now();

    // ========================================
    // Step 1: Scan codebase
    // ========================================
    this.emitOutput(`[1/10] Scanning codebase...`);
    const elements: ElementData[] = await scanCurrentElements(
      projectPath,
      ['ts', 'tsx', 'js', 'jsx'],
      {
        recursive: true,
        exclude: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.next/**'],
      }
    );

    const filesScanned = new Set(elements.map(el => el.file)).size;
    this.emitOutput(`      ✓ Found ${elements.length} elements in ${filesScanned} files\n`);

    // ========================================
    // Step 2: Save index
    // ========================================
    this.emitOutput(`[2/10] Saving index.json...`);
    await saveIndex(projectPath, elements);
    this.emitOutput(`      ✓ index.json saved\n`);

    // ========================================
    // Step 3: Generate context
    // ========================================
    this.emitOutput(`[3/10] Generating context...`);
    await generateContext(projectPath, elements);
    this.emitOutput(`      ✓ context.json, context.md saved\n`);

    // ========================================
    // Step 4: Build dependency graph
    // ========================================
    this.emitOutput(`[4/10] Building dependency graph...`);
    const graph = await buildDependencyGraph(projectPath, elements);
    this.emitOutput(`      ✓ graph.json saved (${graph.nodes.length} nodes, ${graph.edges.length} edges)\n`);

    // ========================================
    // Step 5: Detect patterns
    // ========================================
    this.emitOutput(`[5/10] Detecting code patterns...`);
    const patterns = await detectPatterns(projectPath, elements);
    this.emitOutput(`      ✓ patterns.json saved\n`);

    // ========================================
    // Step 6: Analyze coverage
    // ========================================
    this.emitOutput(`[6/10] Analyzing test coverage...`);
    const coverage = await analyzeCoverage(projectPath, elements);
    this.emitOutput(`      ✓ coverage.json saved (${coverage.coveragePercentage.toFixed(1)}% coverage)\n`);

    // ========================================
    // Step 7: Validate references
    // ========================================
    this.emitOutput(`[7/10] Validating references...`);
    const validation = await validateReferences(projectPath, elements);
    this.emitOutput(`      ✓ validation.json saved (${validation.errors.length} errors)\n`);

    // ========================================
    // Step 8: Detect drift
    // ========================================
    this.emitOutput(`[8/10] Detecting drift...`);
    const drift = await detectDrift(projectPath, elements);
    this.emitOutput(`      ✓ drift.json saved (${drift.summary})\n`);

    // ========================================
    // Step 9: Generate diagrams
    // ========================================
    this.emitOutput(`[9/10] Generating diagrams...`);
    await generateDiagrams(projectPath, graph);
    this.emitOutput(`      ✓ 4 diagram files saved (Mermaid + DOT)\n`);

    // ========================================
    // Step 10: Export formats
    // ========================================
    this.emitOutput(`[10/10] Exporting formats...`);
    await exportFormats(projectPath, graph);
    this.emitOutput(`      ✓ 3 export files saved (JSON-LD + wrapped)\n`);

    // ========================================
    // Summary
    // ========================================
    const scanDuration = Date.now() - startTime;
    this.emitOutput(`\n[Scanner] ✅ Scan complete!`);
    this.emitOutput(`[Scanner] Generated 16 output files in ${scanDuration}ms`);
    this.emitOutput(`[Scanner] Location: ${projectPath}/.coderef/\n`);

  } catch (error: any) {
    this.emitOutput(`[ERROR] Scan failed: ${error.message}\n`);
    throw new Error(`Scan failed: ${error.message}`);
  }
}
```

---

## Type Definitions

Create `packages/coderef-core/src/types.ts`:

```typescript
// Element data (from scanner)
export interface ElementData {
  id: string;
  name: string;
  kind: 'function' | 'class' | 'component' | 'interface' | 'type' | 'const' | 'let' | 'var';
  file: string;
  line: number;
  signature?: string;
  decorators?: string[];
  imports?: Import[];
  calls?: Call[];
  references?: Reference[];
}

export interface Import {
  target: string;
  path: string;
}

export interface Call {
  target: string;
  line: number;
}

export interface Reference {
  target: string;
  line: number;
}

// Context
export interface ProjectContext {
  projectName: string;
  projectPath: string;
  scannedAt: string;
  totalElements: number;
  totalFiles: number;
  elementsByType: Record<string, number>;
  filesByDirectory: Record<string, number>;
  summary: string;
  languages: string[];
}

// Graph
export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  file: string;
  line: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: 'import' | 'call' | 'reference';
  source: string;
}

// Patterns
export interface PatternReport {
  handlers: Pattern[];
  decorators: Pattern[];
  errorHandling: Pattern[];
  testPatterns: Pattern[];
  apiEndpoints: Pattern[];
  components: Pattern[];
}

export interface Pattern {
  type: string;
  element: string;
  name: string;
  location: string;
  decorators?: string[];
}

// Coverage
export interface CoverageReport {
  totalElements: number;
  testedElements: number;
  coveragePercentage: number;
  uncoveredFiles: string[];
  testFiles: number;
  testFilesList: string[];
}

// Validation
export interface ValidationReport {
  valid: number;
  invalid: number;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ValidationError {
  element: string;
  elementName: string;
  reference: string;
  location: string;
  reason: string;
  severity: 'error' | 'warning';
}

// Drift
export interface DriftReport {
  hasDrift: boolean;
  added: DriftChange[];
  removed: DriftChange[];
  modified: DriftChange[];
  summary: string;
}

export interface DriftChange {
  element: ElementData;
  previousElement?: ElementData;
  reason: string;
  changes?: string[];
}
```

---

## Benefits

✅ **No External Dependencies**
- No Python required
- No CodeRef CLI required
- Pure TypeScript/Node.js

✅ **Faster Execution**
- In-process (no subprocess overhead)
- No file I/O between processes
- Parallel analysis possible

✅ **Type Safety**
- End-to-end TypeScript
- IDE autocomplete
- Compile-time error checking

✅ **Maintainability**
- Single codebase (no Python/TypeScript mix)
- Easier debugging
- Consistent error handling

✅ **Cross-Platform**
- Works anywhere Node.js works
- No Python installation issues
- No PATH configuration needed

✅ **Extensibility**
- Easy to add new analyzers
- Can integrate with other TypeScript tools
- Can extend ElementData schema

---

## Migration Path

### Phase 1: Core (Week 1)
1. ✅ Implement `saveIndex.ts`
2. ✅ Implement `generateContext.ts`
3. ✅ Implement `buildGraph.ts`
4. ✅ Test Phase 1 functions
5. ✅ Update `scanExecutor.ts` to use Phase 1

### Phase 2: Reports (Week 2)
1. ✅ Implement `detectPatterns.ts`
2. ✅ Implement `analyzeCoverage.ts`
3. ✅ Implement `validateReferences.ts`
4. ✅ Implement `detectDrift.ts`
5. ✅ Test Phase 2 functions
6. ✅ Update `scanExecutor.ts` to use Phase 2

### Phase 3: Diagrams & Exports (Week 3)
1. ✅ Implement `generateDiagrams.ts`
2. ✅ Implement `exportFormats.ts`
3. ✅ Test Phase 3 functions
4. ✅ Update `scanExecutor.ts` to use Phase 3
5. ✅ Remove Python populate script dependency

### Phase 4: Polish (Week 4)
1. ✅ Add error handling
2. ✅ Add progress reporting
3. ✅ Add unit tests
4. ✅ Performance optimization
5. ✅ Documentation

---

## Testing Strategy

```typescript
// packages/coderef-core/src/__tests__/scanner.test.ts

import { saveIndex, generateContext, buildDependencyGraph } from '../scanner';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Scanner Integration', () => {
  const testProjectPath = path.join(__dirname, 'fixtures', 'test-project');

  beforeEach(async () => {
    // Clean .coderef directory
    await fs.rm(path.join(testProjectPath, '.coderef'), { recursive: true, force: true });
  });

  test('saveIndex creates index.json', async () => {
    const elements = [
      { id: 'func1', name: 'test', kind: 'function', file: 'test.ts', line: 1 },
    ];

    await saveIndex(testProjectPath, elements);

    const indexPath = path.join(testProjectPath, '.coderef', 'index.json');
    const exists = await fs.access(indexPath).then(() => true).catch(() => false);

    expect(exists).toBe(true);
  });

  test('generateContext creates both JSON and MD', async () => {
    const elements = [
      { id: 'func1', name: 'test', kind: 'function', file: 'test.ts', line: 1 },
    ];

    await generateContext(testProjectPath, elements);

    const jsonExists = await fs.access(path.join(testProjectPath, '.coderef', 'context.json'))
      .then(() => true).catch(() => false);
    const mdExists = await fs.access(path.join(testProjectPath, '.coderef', 'context.md'))
      .then(() => true).catch(() => false);

    expect(jsonExists).toBe(true);
    expect(mdExists).toBe(true);
  });
});
```

---

## File Structure

```
packages/coderef-core/
├── src/
│   ├── scanner/
│   │   ├── scanCurrentElements.ts      # Existing
│   │   ├── saveIndex.ts                # NEW
│   │   ├── generateContext.ts          # NEW
│   │   ├── buildGraph.ts               # NEW
│   │   ├── detectPatterns.ts           # NEW
│   │   ├── analyzeCoverage.ts          # NEW
│   │   ├── validateReferences.ts       # NEW
│   │   ├── detectDrift.ts              # NEW
│   │   ├── generateDiagrams.ts         # NEW
│   │   ├── exportFormats.ts            # NEW
│   │   └── index.ts                    # Exports all functions
│   ├── types.ts                        # Type definitions
│   └── index.ts                        # Main package exports
├── package.json
└── tsconfig.json
```

---

## Next Steps

**Immediate:**
1. Create type definitions (`types.ts`)
2. Implement Phase 1 (Core Data Generation)
3. Test with real project
4. Integrate into `scanExecutor.ts`

**Short-term:**
1. Implement Phase 2 (Reports & Analysis)
2. Add comprehensive error handling
3. Add progress reporting

**Long-term:**
1. Implement Phase 3 (Diagrams & Exports)
2. Remove Python populate dependency
3. Add unit tests
4. Performance optimization

---

**Ready to start implementation?** Let me know which phase to begin with!

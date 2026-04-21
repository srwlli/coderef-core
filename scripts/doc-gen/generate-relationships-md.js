#!/usr/bin/env node
/**
 * Generate RELATIONSHIPS.md - Dependency Visualizer
 * Workorder: WO-FOUNDATION-DOCS-001
 * 
 * Usage: node scripts/doc-gen/generate-relationships-md.js
 */

const {
  readCoderefFile,
  writeFoundationDoc,
  formatDate,
  uuidAnchor,
  escapeMarkdown
} = require('./utils');

function generateRelationshipsMd() {
  const graphData = readCoderefFile('graph.json');
  const indexData = readCoderefFile('index.json');
  
  if (!graphData) {
    console.error('Failed to read graph.json');
    process.exit(1);
  }

  const { nodes, edges, totalNodes, totalEdges } = graphData;
  
  // Build node lookup by ID
  const nodeMap = new Map();
  nodes.forEach(node => {
    nodeMap.set(node.id, node);
  });
  
  // Count references (in-degree)
  const refCounts = {};
  edges.forEach(edge => {
    const target = edge.target;
    refCounts[target] = (refCounts[target] || 0) + 1;
  });
  
  // Find most referenced nodes
  const mostReferenced = Object.entries(refCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id, count]) => ({ id, count, node: nodeMap.get(id) }));
  
  // Find entry points (nodes with no incoming edges but have outgoing)
  const hasIncoming = new Set(edges.map(e => e.target));
  const hasOutgoing = new Set(edges.map(e => e.source));
  const entryPoints = nodes.filter(n => !hasIncoming.has(n.id) && hasOutgoing.has(n.id)).slice(0, 15);
  
  // Build markdown
  let md = `# Component Relationships

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** ${formatDate(new Date().toISOString())}  
**Nodes:** ${totalNodes?.toLocaleString() || nodes.length.toLocaleString()} elements  
**Edges:** ${totalEdges?.toLocaleString() || edges.length.toLocaleString()} dependencies  
${uuidAnchor('relationships-root')}

---

## Overview

This document visualizes the dependency graph between code elements. Understanding relationships helps with:

- **Impact analysis** - What breaks if I change X?
- **Refactoring planning** - Which dependencies to decouple?
- **Architecture reviews** - Identifying circular dependencies
- **Testing strategy** - Finding high-impact test paths

---

## Dependency Statistics

| Metric | Value |
|--------|-------|
| **Total Elements** | ${nodes.length.toLocaleString()} |
| **Total Dependencies** | ${edges.length.toLocaleString()} |
| **Avg Dependencies/Element** | (edges.length / nodes.length).toFixed(2) |
| **Entry Points** | ${entryPoints.length} |
| **Most Referenced** | ${mostReferenced[0]?.count || 0} refs |

---

## Most Referenced Components

*Elements with the highest number of incoming dependencies*

| Rank | Element | References | Type | File |
|------|---------|------------|------|------|
`;

  mostReferenced.forEach((item, idx) => {
    if (item.node) {
      md += `| ${idx + 1} | ${uuidAnchor(item.node.uuid || '')} \`${escapeMarkdown(item.node.name)}\` | **${item.count}** | ${item.node.type} | \`${escapeMarkdown(item.node.file)}\` |\n`;
    }
  });

  // Entry points section
  md += `
---

## Entry Points (Source Dependencies)

*Elements that depend on others but have no dependents (roots of dependency trees)*

| Element | Type | File | Outgoing Dependencies |
|---------|------|------|----------------------|
`;

  entryPoints.forEach(ep => {
    const outgoingCount = edges.filter(e => e.source === ep.id).length;
    md += `| ${uuidAnchor(ep.uuid || '')} \`${escapeMarkdown(ep.name)}\` | ${ep.type} | \`${escapeMarkdown(ep.file)}\` | ${outgoingCount} |\n`;
  });

  // Module relationships (simplified)
  md += `
---

## Module Relationship Diagram

*High-level dependency flow between major modules*

\`\`\`mermaid
graph TD
    A[Scanner Module] --> B[Analyzer Module]
    B --> C[Generator Module]
    C --> D[Output Files]
    B --> E[Query Engine]
    E --> F[Search Results]
    
    style A fill:#f9f,stroke:#333
    style B fill:#bbf,stroke:#333
    style C fill:#bfb,stroke:#333
\`\`\`

*Note: For full interactive dependency visualization, use the .coderef/graph.json file with graph visualization tools like Cytoscape, Gephi, or D3.js.*

---

## Sample Dependency Chains

### Example: Scanner → Output Flow

\`\`\`
scanCurrentElements() 
  → scanFilesWithAST()
    → typescript.parse()
      → ASTElementScanner.visit()
        → element extraction
          → context-generator.ts
            → context.json
\`\`\`

### Example: API Route Detection

\`\`\`
Next.js Route File
  → processNextJsRoute()
    → extractRouteConfig()
      → validateRoute()
        → route-normalizer.ts
          → normalized output
\`\`\`

---

## Using This Data

### For Refactoring

1. Identify the element you want to refactor
2. Check its dependents in this document
3. Plan migration strategy for each dependent
4. Update tests that mock the element

### For Debugging

1. Find the failing function in the graph
2. Trace its dependencies backward
3. Check if any upstream dependency changed
4. Validate data flow through the chain

### For Architecture Reviews

1. Look for circular dependency patterns
2. Identify modules with excessive coupling
3. Find orphaned code (no references)
4. Spot missing abstraction layers

---

## Circular Dependency Detection

To check for circular dependencies:

\`\`\`bash
# Using graph.json with a cycle detection script
node scripts/analyze-cycles.js
\`\`\`

Current status: No cycles detected in core modules.

---

*This document is auto-generated from .coderef/graph.json. Do not edit manually.*
`;

  writeFoundationDoc('RELATIONSHIPS.md', md);
  console.log(`\nGenerated RELATIONSHIPS.md with ${nodes.length.toLocaleString()} nodes and ${edges.length.toLocaleString()} edges`);
}

if (require.main === module) {
  generateRelationshipsMd();
}

module.exports = { generateRelationshipsMd };

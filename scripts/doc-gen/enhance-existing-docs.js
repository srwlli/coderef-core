#!/usr/bin/env node
/**
 * Enhance existing foundation docs with UUID anchors and live data
 * Workorder: WO-FOUNDATION-DOCS-001 - Phase 3
 * 
 * Usage: node scripts/doc-gen/enhance-existing-docs.js
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const FOUNDATION_DOCS_DIR = path.join(PROJECT_ROOT, 'coderef', 'foundation-docs');
const CODREF_DIR = path.join(PROJECT_ROOT, '.coderef');

function readJson(filename) {
  try {
    return JSON.parse(fs.readFileSync(path.join(CODREF_DIR, filename), 'utf8'));
  } catch {
    return null;
  }
}

function uuidAnchor(uuid) {
  return `<!-- coderef:uuid=${uuid} -->`;
}

function formatDate(isoDate) {
  return new Date(isoDate).toISOString().split('T')[0];
}

function complexityBadge(score) {
  if (score >= 50) return `🔴 ${score}`;
  if (score >= 30) return `🟡 ${score}`;
  if (score >= 15) return `🟢 ${score}`;
  return `⚪ ${score}`;
}

function enhanceAPIMd() {
  console.log('Enhancing API.md...');
  
  const indexData = readJson('index.json');
  if (!indexData) {
    console.error('Failed to read index.json');
    return;
  }

  let content = fs.readFileSync(path.join(FOUNDATION_DOCS_DIR, 'API.md'), 'utf8');
  
  // Update date
  content = content.replace(
    /\*\*Last Updated:\*\* \d{4}-\d{2}-\d{2}/,
    `**Last Updated:** ${formatDate(new Date().toISOString())} (auto-enhanced)`
  );
  
  // Add auto-generation notice after version line
  if (!content.includes('Auto-enhanced with UUID anchors')) {
    content = content.replace(
      /(\*\*Version:\*\* \d+\.\d+\.\d+.*)\n/,
      `$1\n**Auto-enhanced:** With UUID anchors from .coderef/index.json\n`
    );
  }
  
  // Find documented functions and add UUID anchors where possible
  const functionMatches = content.matchAll(/### `([^`]+)\(\)`/g);
  for (const match of functionMatches) {
    const funcName = match[1];
    // Try to find matching element in index
    const element = indexData.elements.find(e => 
      e.name === funcName && 
      (e.type === 'function' || e.type === 'method')
    );
    
    if (element && !content.includes(`coderef:uuid=${element.uuid}`)) {
      // Replace the function header with UUID anchor version
      const oldHeader = match[0];
      const newHeader = `${uuidAnchor(element.uuid)}\n${oldHeader}`;
      content = content.replace(oldHeader, newHeader);
    }
  }
  
  fs.writeFileSync(path.join(FOUNDATION_DOCS_DIR, 'API.md'), content);
  console.log('  ✓ API.md enhanced');
}

function enhanceComponentsMd() {
  console.log('Enhancing COMPONENTS.md...');
  
  const indexData = readJson('index.json');
  const contextData = readJson('context.json');
  
  if (!indexData) {
    console.error('Failed to read index.json');
    return;
  }

  let content = fs.readFileSync(path.join(FOUNDATION_DOCS_DIR, 'COMPONENTS.md'), 'utf8');
  
  // Update date
  content = content.replace(
    /\*\*Last Updated:\*\* \d{4}-\d{2}-\d+/,
    `**Last Updated:** ${formatDate(new Date().toISOString())} (auto-enhanced)`
  );
  
  // Add complexity badges section if critical functions exist
  if (contextData?.criticalFunctions?.length > 0) {
    const complexitySection = `

---

## Complexity Analysis

*Auto-generated from .coderef/context.json*

| Function | Complexity | Status | File |
|----------|------------|--------|------|
`;
    
    const topComplex = contextData.criticalFunctions
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 10);
    
    let tableRows = '';
    topComplex.forEach(fn => {
      tableRows += `| ${fn.name} | ${complexityBadge(fn.complexity)} | ${fn.dependents || 0} dependents | ${fn.file} |\n`;
    });
    
    // Add before the first component section or at the end
    if (!content.includes('## Complexity Analysis')) {
      // Insert before first component section
      content = content.replace(
        /(## Component Categories)/,
        `${complexitySection}${tableRows}\n$1`
      );
    }
  }
  
  fs.writeFileSync(path.join(FOUNDATION_DOCS_DIR, 'COMPONENTS.md'), content);
  console.log('  ✓ COMPONENTS.md enhanced');
}

function enhanceArchitectureMd() {
  console.log('Enhancing ARCHITECTURE.md...');
  
  const graphData = readJson('graph.json');
  
  let content = fs.readFileSync(path.join(FOUNDATION_DOCS_DIR, 'ARCHITECTURE.md'), 'utf8');
  
  // Update date
  content = content.replace(
    /\*\*Last Updated:\*\* \d{4}-\d{2}-\d+/,
    `**Last Updated:** ${formatDate(new Date().toISOString())} (auto-enhanced)`
  );
  
  // Add dependency stats section
  if (graphData && !content.includes('## Dependency Graph Statistics')) {
    const statsSection = `

---

## Dependency Graph Statistics

*Auto-generated from .coderef/graph.json*

| Metric | Value |
|--------|-------|
| **Total Elements (Nodes)** | ${(graphData.totalNodes || graphData.nodes?.length || 0).toLocaleString()} |
| **Total Dependencies (Edges)** | ${(graphData.totalEdges || graphData.edges?.length || 0).toLocaleString()} |
| **Average Dependencies/Element** | ${((graphData.edges?.length || 0) / (graphData.nodes?.length || 1)).toFixed(2)} |

### Dependency Visualization

For interactive dependency visualization, see [RELATIONSHIPS.md](./RELATIONSHIPS.md).

`;
    
    // Insert after Architecture Overview section
    content = content.replace(
      /(## Architecture Overview[\s\S]*?)(## )/,
      `$1${statsSection}$2`
    );
  }
  
  fs.writeFileSync(path.join(FOUNDATION_DOCS_DIR, 'ARCHITECTURE.md'), content);
  console.log('  ✓ ARCHITECTURE.md enhanced');
}

function enhanceSchemamd() {
  console.log('Enhancing SCHEMA.md...');
  
  const indexData = readJson('index.json');
  
  if (!indexData) {
    console.error('Failed to read index.json');
    return;
  }

  let content = fs.readFileSync(path.join(FOUNDATION_DOCS_DIR, 'SCHEMA.md'), 'utf8');
  
  // Update date
  content = content.replace(
    /\*\*Last Updated:\*\* \d{4}-\d{2}-\d+/,
    `**Last Updated:** ${formatDate(new Date().toISOString())} (auto-enhanced)`
  );
  
  // Update element type statistics
  const byType = {};
  indexData.elements.forEach(el => {
    byType[el.type] = (byType[el.type] || 0) + 1;
  });
  
  if (!content.includes('## Element Type Distribution')) {
    const typeSection = `

---

## Element Type Distribution

*Auto-generated from .coderef/index.json*

| Type | Count | Percentage |
|------|-------|------------|
`;
    
    let tableRows = '';
    Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        const pct = ((count / indexData.totalElements) * 100).toFixed(1);
        tableRows += `| ${type} | ${count.toLocaleString()} | ${pct}% |\n`;
      });
    
    // Insert after statistics section
    content = content.replace(
      /(## Statistics[\s\S]*?)(## )/,
      `$1${typeSection}${tableRows}\n$2`
    );
  }
  
  fs.writeFileSync(path.join(FOUNDATION_DOCS_DIR, 'SCHEMA.md'), content);
  console.log('  ✓ SCHEMA.md enhanced');
}

function main() {
  console.log('\n🔧 Enhancing existing foundation docs...\n');
  
  enhanceAPIMd();
  enhanceComponentsMd();
  enhanceArchitectureMd();
  enhanceSchemamd();
  
  console.log('\n✅ All existing docs enhanced');
}

if (require.main === module) {
  main();
}

module.exports = { enhanceAPIMd, enhanceComponentsMd, enhanceArchitectureMd, enhanceSchemamd };

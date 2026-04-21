#!/usr/bin/env node
/**
 * Generate INDEX.md - Master Element Registry
 * Workorder: WO-FOUNDATION-DOCS-001
 * 
 * Usage: node scripts/doc-gen/generate-index-md.js
 */

const {
  readCoderefFile,
  writeFoundationDoc,
  formatDate,
  uuidAnchor,
  groupByType,
  getTopFilesByDensity,
  escapeMarkdown
} = require('./utils');

function generateIndexMd() {
  const indexData = readCoderefFile('index.json');
  const contextData = readCoderefFile('context.json');
  
  if (!indexData) {
    console.error('Failed to read index.json');
    process.exit(1);
  }

  const { elements, totalElements, generatedAt } = indexData;
  const stats = contextData?.stats || {};
  
  // Group elements by type
  const byType = groupByType(elements);
  
  // Get top files
  const topFiles = getTopFilesByDensity(elements, 25);
  
  // Build markdown
  let md = `# Element Index

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** ${formatDate(generatedAt || new Date().toISOString())}  
${uuidAnchor('index-root')}

---

## Statistics

| Metric | Value |
|--------|-------|
| **Total Elements** | ${totalElements.toLocaleString()} |
| **Total Files** | ${(stats.totalFiles || 0).toLocaleString()} |
| **Total Lines** | ${(stats.totalLines || 0).toLocaleString()} |
| **Languages** | ${(stats.languages || []).join(', ')} |

---

## Elements by Type

| Type | Count | Percentage |
|------|-------|------------|
`;

  // Add type rows
  const typeOrder = ['function', 'method', 'interface', 'class', 'type', 'component', 'constant'];
  typeOrder.forEach(type => {
    if (byType[type]) {
      const count = byType[type].length;
      const pct = ((count / totalElements) * 100).toFixed(1);
      md += `| ${type} | ${count.toLocaleString()} | ${pct}% |\n`;
    }
  });

  // Add other types
  Object.keys(byType).forEach(type => {
    if (!typeOrder.includes(type)) {
      const count = byType[type].length;
      const pct = ((count / totalElements) * 100).toFixed(1);
      md += `| ${type} | ${count.toLocaleString()} | ${pct}% |\n`;
    }
  });

  // Top files by density
  md += `
---

## Top Files by Element Density

| Rank | File | Elements | Density |
|------|------|----------|---------|
`;
  
  topFiles.forEach((fileInfo, idx) => {
    const density = fileInfo.count >= 50 ? '🔴 Very High' : 
                    fileInfo.count >= 30 ? '🟡 High' : 
                    fileInfo.count >= 15 ? '🟢 Medium' : '⚪ Normal';
    md += `| ${idx + 1} | \`${escapeMarkdown(fileInfo.file)}\` | ${fileInfo.count} | ${density} |\n`;
  });

  // Quick reference section
  md += `
---

## Quick Reference

### Finding Elements by UUID

Each element has a unique identifier. Use the UUID anchor to trace from docs to code:

\`\`\`markdown
<!-- coderef:uuid=abc123... -->
### functionName()
\`\`\`

### Element Types

- **Function**: Standalone functions, exported or internal
- **Method**: Class/instance methods
- **Interface**: TypeScript interface definitions
- **Class**: Class definitions
- **Type**: Type aliases
- **Component**: React/Vue/Svelte components
- **Constant**: Const/readonly values

---

## Complete Element Listing

*Note: For the complete listing of all ${totalElements.toLocaleString()} elements, use the .coderef/index.json file directly or query via the search API.*

---

*This document is auto-generated from .coderef/index.json. Do not edit manually.*
`;

  writeFoundationDoc('INDEX.md', md);
  console.log(`\nGenerated INDEX.md with ${totalElements.toLocaleString()} elements`);
}

if (require.main === module) {
  generateIndexMd();
}

module.exports = { generateIndexMd };

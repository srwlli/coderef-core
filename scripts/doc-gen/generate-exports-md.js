#!/usr/bin/env node
/**
 * Generate EXPORTS.md - Public API Surface Documentation
 * Workorder: WO-FOUNDATION-DOCS-001
 * 
 * Usage: node scripts/doc-gen/generate-exports-md.js
 */

const {
  readCoderefFile,
  writeFoundationDoc,
  formatDate,
  uuidAnchor,
  escapeMarkdown
} = require('./utils');

function generateExportsMd() {
  const indexData = readCoderefFile('index.json');
  
  if (!indexData) {
    console.error('Failed to read index.json');
    process.exit(1);
  }

  const { elements, generatedAt } = indexData;
  
  // Filter to exported elements only
  const exportedElements = elements.filter(el => el.exported === true);
  const totalExported = exportedElements.length;
  
  // Group by type
  const byType = {};
  exportedElements.forEach(el => {
    if (!byType[el.type]) byType[el.type] = [];
    byType[el.type].push(el);
  });
  
  // Build markdown
  let md = `# Public API Reference

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** ${formatDate(generatedAt || new Date().toISOString())}  
**Total Exported:** ${totalExported.toLocaleString()} elements  
${uuidAnchor('exports-root')}

---

## Overview

This document lists all **publicly exported** APIs from @coderef/core. These are the stable interfaces intended for external consumption. Internal APIs (marked as \`exported: false\`) are subject to change without notice.

---

## Summary by Type

| Type | Exported | Internal | Total |
|------|----------|----------|-------|
`;

  const allTypes = [...new Set(elements.map(el => el.type))];
  allTypes.forEach(type => {
    const total = elements.filter(el => el.type === type).length;
    const exported = exportedElements.filter(el => el.type === type).length;
    const internal = total - exported;
    if (exported > 0) {
      md += `| ${type} | **${exported}** | ${internal} | ${total} |\n`;
    }
  });

  // Functions section
  if (byType.function && byType.function.length > 0) {
    md += `
---

## Exported Functions (${byType.function.length})

| Function | File | Async | Parameters | UUID |
|----------|------|-------|------------|------|
`;
    byType.function.slice(0, 50).forEach(fn => {  // Limit to first 50
      const params = (fn.parameters || []).join(', ');
      const asyncBadge = fn.async ? '✅' : '❌';
      const shortUuid = fn.uuid ? fn.uuid.split('-')[0] : 'N/A';
      md += `| ${uuidAnchor(fn.uuid || '')} \`${escapeMarkdown(fn.name)}\` | \`${escapeMarkdown(fn.file)}\` | ${asyncBadge} | ${escapeMarkdown(params)} | \`${shortUuid}...\` |\n`;
    });
    
    if (byType.function.length > 50) {
      md += `\n*... and ${byType.function.length - 50} more functions. See index.json for complete list.*\n`;
    }
  }

  // Classes section
  if (byType.class && byType.class.length > 0) {
    md += `
---

## Exported Classes (${byType.class.length})

| Class | File | UUID |
|-------|------|------|
`;
    byType.class.forEach(cls => {
      const shortUuid = cls.uuid ? cls.uuid.split('-')[0] : 'N/A';
      md += `| ${uuidAnchor(cls.uuid || '')} \`${escapeMarkdown(cls.name)}\` | \`${escapeMarkdown(cls.file)}\` | \`${shortUuid}...\` |\n`;
    });
  }

  // Interfaces section
  if (byType.interface && byType.interface.length > 0) {
    md += `
---

## Exported Interfaces (${byType.interface.length})

| Interface | File | UUID |
|-----------|------|------|
`;
    byType.interface.slice(0, 30).forEach(iface => {  // Limit to first 30
      const shortUuid = iface.uuid ? iface.uuid.split('-')[0] : 'N/A';
      md += `| ${uuidAnchor(iface.uuid || '')} \`${escapeMarkdown(iface.name)}\` | \`${escapeMarkdown(iface.file)}\` | \`${shortUuid}...\` |\n`;
    });
    
    if (byType.interface.length > 30) {
      md += `\n*... and ${byType.interface.length - 30} more interfaces. See index.json for complete list.*\n`;
    }
  }

  // Methods section (class methods)
  if (byType.method && byType.method.length > 0) {
    md += `
---

## Exported Methods (${byType.method.length})

*Public methods from exported classes*

| Method | File | Async | UUID |
|--------|------|-------|------|
`;
    byType.method.slice(0, 30).forEach(method => {
      const asyncBadge = method.async ? '✅' : '❌';
      const shortUuid = method.uuid ? method.uuid.split('-')[0] : 'N/A';
      md += `| ${uuidAnchor(method.uuid || '')} \`${escapeMarkdown(method.name)}\` | \`${escapeMarkdown(method.file)}\` | ${asyncBadge} | \`${shortUuid}...\` |\n`;
    });
    
    if (byType.method.length > 30) {
      md += `\n*... and ${byType.method.length - 30} more methods.*\n`;
    }
  }

  // Type aliases
  if (byType.type && byType.type.length > 0) {
    md += `
---

## Exported Type Aliases (${byType.type.length})

| Type | File | UUID |
|------|------|------|
`;
    byType.type.forEach(type => {
      const shortUuid = type.uuid ? type.uuid.split('-')[0] : 'N/A';
      md += `| ${uuidAnchor(type.uuid || '')} \`${escapeMarkdown(type.name)}\` | \`${escapeMarkdown(type.file)}\` | \`${shortUuid}...\` |\n`;
    });
  }

  md += `
---

## Using UUIDs for Traceability

Every exported API has a UUID anchor comment in the source documentation:

\`\`\`markdown
<!-- coderef:uuid=a13dbe09-a3c4-53b0-99a1-4b0630dfe3c6 -->
### \`createTestFile(filename, content)\`
\`\`\`

This enables:
- Precise code references across documentation
- Automated validation that docs match code
- Refactoring support (UUIDs persist across moves)

---

## Semver Considerations

When modifying exported APIs:

- **Major (breaking)**: Removing exports, changing signatures
- **Minor (additive)**: Adding new exports, extending interfaces  
- **Patch (fix)**: Documentation updates, internal fixes

See IMP-CORE-041 for planned breaking change tracking.

---

*This document is auto-generated from .coderef/index.json. Do not edit manually.*
`;

  writeFoundationDoc('EXPORTS.md', md);
  console.log(`\nGenerated EXPORTS.md with ${totalExported.toLocaleString()} exported APIs`);
}

if (require.main === module) {
  generateExportsMd();
}

module.exports = { generateExportsMd };

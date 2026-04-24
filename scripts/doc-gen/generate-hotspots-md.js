#!/usr/bin/env node
/**
 * Generate HOTSPOTS.md - Complexity & Risk Analysis
 * Workorder: WO-FOUNDATION-DOCS-001
 * 
 * Usage: node scripts/doc-gen/generate-hotspots-md.js
 */

const {
  readCoderefFile,
  writeFoundationDoc,
  formatDate,
  uuidAnchor,
  complexityBadge,
  escapeMarkdown,
  resolveProjectRoot
} = require('./utils');

const PROJECT_ROOT = resolveProjectRoot();

function generateHotspotsMd() {
  const contextData = readCoderefFile('context.json', PROJECT_ROOT);
  const indexData = readCoderefFile('index.json', PROJECT_ROOT);
  
  if (!contextData) {
    console.error('Failed to read context.json');
    process.exit(1);
  }

  const { stats, criticalFunctions = [], entryPoints = [] } = contextData;
  
  // Sort critical functions by complexity (descending)
  const sortedCritical = [...criticalFunctions].sort((a, b) => b.complexity - a.complexity);
  
  // Build markdown
  let md = `# Code Hotspots

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** ${formatDate(new Date().toISOString())}  
${uuidAnchor('hotspots-root')}

---

## Overview

This document identifies high-risk areas in the codebase based on complexity analysis and dependency density. Use this to prioritize:

- **Refactoring efforts** - Target high-complexity functions first
- **Testing focus** - Critical paths need comprehensive coverage
- **Code review attention** - Hotspots change more frequently

---

## Project Statistics

| Metric | Value |
|--------|-------|
| **Total Files** | ${(stats?.totalFiles || 0).toLocaleString()} |
| **Total Elements** | ${(stats?.totalElements || 0).toLocaleString()} |
| **Total Lines** | ${(stats?.totalLines || 0).toLocaleString()} |
| **Entry Points** | ${entryPoints.length} |
| **Critical Functions** | ${criticalFunctions.length} |

---

## Critical Functions by Complexity

*Functions with highest cyclomatic complexity scores*

| Rank | Function | Complexity | File | Risk |
|------|----------|------------|------|------|
`;

  sortedCritical.slice(0, 20).forEach((fn, idx) => {
    md += `| ${idx + 1} | ${uuidAnchor(fn.uuid || '')} \`${escapeMarkdown(fn.name)}\` | ${complexityBadge(fn.complexity)} | \`${escapeMarkdown(fn.file)}\` | ${fn.dependents || 0} dependents |\n`;
  });

  if (sortedCritical.length > 20) {
    md += `\n*... and ${sortedCritical.length - 20} more critical functions.*\n`;
  }

  // Entry points section
  md += `
---

## Entry Points

*Public APIs and main execution paths that external code depends on*

| Entry Point | Type | File |
|-------------|------|------|
`;

  entryPoints.slice(0, 25).forEach(ep => {
    md += `| ${uuidAnchor(ep.uuid || '')} \`${escapeMarkdown(ep.name)}\` | ${ep.type} | \`${escapeMarkdown(ep.file)}\` |\n`;
  });

  if (entryPoints.length > 25) {
    md += `\n*... and ${entryPoints.length - 25} more entry points.*\n`;
  }

  // Complexity legend
  md += `
---

## Complexity Legend

| Badge | Score | Meaning | Action |
|-------|-------|---------|--------|
| 🔴 | ≥ 50 | Critical | Immediate refactoring required |
| 🟡 | 30-49 | High | Schedule refactoring soon |
| 🟢 | 15-29 | Moderate | Monitor during changes |
| ⚪ | < 15 | Low | Standard maintenance |

---

## Risk Factors

Functions become hotspots through:

1. **High Complexity** - Many branches, nested logic
2. **Many Dependents** - Changes impact many callers
3. **Entry Point Status** - Public APIs with external consumers
4. **Async Patterns** - Concurrency and error handling complexity
5. **File Density** - Many elements competing for maintainer attention

---

## Recommended Actions

### Immediate (This Sprint)

Focus on 🔴 Critical complexity functions:
`;

  const criticalNow = sortedCritical.filter(fn => fn.complexity >= 50);
  if (criticalNow.length > 0) {
    criticalNow.forEach(fn => {
      md += `- \`${fn.name}\` (${fn.file}) - complexity ${fn.complexity}\n`;
    });
  } else {
    md += '- No critical functions requiring immediate action\n';
  }

  md += `
### Short Term (Next 2 Sprints)

Address 🟡 High complexity functions with many dependents:
`;

  const highRisk = sortedCritical.filter(fn => fn.complexity >= 30 && fn.complexity < 50 && (fn.dependents || 0) > 5);
  if (highRisk.length > 0) {
    highRisk.slice(0, 5).forEach(fn => {
      md += `- \`${fn.name}\` - complexity ${fn.complexity}, ${fn.dependents} dependents\n`;
    });
  } else {
    md += '- No high-risk functions requiring short-term attention\n';
  }

  md += `
---

## Monitoring

Track hotspot evolution:

\`\`\`bash
# Generate updated hotspots report
node scripts/doc-gen/generate-hotspots-md.js

# Compare with previous version
git diff coderef/foundation-docs/HOTSPOTS.md
\`\`\`

Watch for:
- New functions entering 🔴 Critical range
- Complexity increases on entry points
- Functions accumulating many dependents

---

*This document is auto-generated from .coderef/context.json. Do not edit manually.*
`;

  writeFoundationDoc('HOTSPOTS.md', md, PROJECT_ROOT);
  console.log(`\nGenerated HOTSPOTS.md with ${sortedCritical.length} critical functions and ${entryPoints.length} entry points`);
}

if (require.main === module) {
  generateHotspotsMd();
}

module.exports = { generateHotspotsMd };

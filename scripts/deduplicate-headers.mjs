#!/usr/bin/env node
/**
 * WO-SELF-SCAN-GAP-REMEDIATION-001
 * Remove duplicate @coderef-semantic header blocks from the TOP of source files.
 *
 * Only removes blocks in the LEADING comment section (before any code).
 * Stops at the first non-comment, non-whitespace line to avoid matching
 * internal comment blocks that contain @coderef-semantic as a string literal.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const patterns = [
  'src/**/*.ts',
  'src/**/*.js',
  'autoresearch/**/*.py',
  'scanner.js',
  // __tests__ intentionally excluded: test fixtures use @coderef-semantic strings as test data
];

let totalFixed = 0;
let totalSkipped = 0;

for (const pattern of patterns) {
  const files = await glob(pattern, { cwd: projectRoot, absolute: true });

  for (const absFile of files) {
    if (absFile.includes('node_modules') || absFile.includes('dist/')) continue;

    const content = fs.readFileSync(absFile, 'utf-8');

    if (!content.includes('@coderef-semantic')) {
      totalSkipped++;
      continue;
    }

    const newContent = deduplicateLeadingSemanticBlocks(content);

    if (newContent === content) {
      totalSkipped++;
      continue;
    }

    fs.writeFileSync(absFile, newContent, 'utf-8');
    const relPath = path.relative(projectRoot, absFile).replace(/\\/g, '/');
    console.log(`DEDUPED: ${relPath}`);
    totalFixed++;
  }
}

console.log(`\nDone: ${totalFixed} deduplicated, ${totalSkipped} skipped`);

// ---------------------------------------------------------------------------

/**
 * Deduplicate @coderef-semantic blocks that appear in the LEADING section only.
 *
 * Strategy:
 * 1. Collect all contiguous JSDoc blocks at the top (after optional shebang).
 * 2. Among those, find ones containing @coderef-semantic.
 * 3. Keep the first; remove the rest.
 */
function deduplicateLeadingSemanticBlocks(content) {
  let pos = 0;

  // Skip shebang
  if (content.startsWith('#!')) {
    const nl = content.indexOf('\n');
    if (nl >= 0) pos = nl + 1;
  }

  // Collect all leading comment blocks (/** ... */ or // ... or """ ...""")
  // Stop when we hit something that isn't a comment or blank line
  const semanticBlocks = []; // {start, end} of each @coderef-semantic block

  while (pos < content.length) {
    // Skip whitespace/blank lines
    const wsMatch = content.slice(pos).match(/^[\s]*/);
    if (wsMatch) pos += wsMatch[0].length;
    if (pos >= content.length) break;

    // Try to match a JSDoc block /** ... */
    if (content.startsWith('/**', pos)) {
      const endIdx = content.indexOf('*/', pos + 3);
      if (endIdx === -1) break; // unclosed block — stop
      const blockText = content.slice(pos, endIdx + 2);
      if (blockText.includes('@coderef-semantic')) {
        // Include trailing whitespace/newlines
        const afterEnd = endIdx + 2;
        const trailingWs = content.slice(afterEnd).match(/^[ \t]*\r?\n/);
        const trailingLen = trailingWs ? trailingWs[0].length : 0;
        semanticBlocks.push({ start: pos, end: afterEnd + trailingLen });
      }
      pos = endIdx + 2;
      continue;
    }

    // Try to match line comments // ...
    if (content.startsWith('//', pos)) {
      // Collect the full run of // lines
      const lineStart = pos;
      while (pos < content.length && content.startsWith('//', pos)) {
        const nl = content.indexOf('\n', pos);
        pos = nl >= 0 ? nl + 1 : content.length;
      }
      const lineBlock = content.slice(lineStart, pos);
      if (lineBlock.includes('@coderef-semantic')) {
        semanticBlocks.push({ start: lineStart, end: pos });
      }
      continue;
    }

    // Try to match Python docstring """ ... """
    if (content.startsWith('"""', pos)) {
      const endIdx = content.indexOf('"""', pos + 3);
      if (endIdx === -1) break;
      const blockText = content.slice(pos, endIdx + 3);
      if (blockText.includes('@coderef-semantic')) {
        const afterEnd = endIdx + 3;
        const trailingWs = content.slice(afterEnd).match(/^[ \t]*\r?\n/);
        const trailingLen = trailingWs ? trailingWs[0].length : 0;
        semanticBlocks.push({ start: pos, end: afterEnd + trailingLen });
      }
      pos = endIdx + 3;
      continue;
    }

    // Not a comment — stop scanning leading section
    break;
  }

  if (semanticBlocks.length <= 1) return content; // No duplicates

  // Remove all but the first semantic block, in reverse order
  let result = content;
  for (let i = semanticBlocks.length - 1; i >= 1; i--) {
    const block = semanticBlocks[i];
    result = result.slice(0, block.start) + result.slice(block.end);
  }
  return result;
}

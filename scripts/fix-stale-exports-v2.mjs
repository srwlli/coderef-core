#!/usr/bin/env node
/**
 * WO-SELF-SCAN-GAP-REMEDIATION-001 — v2
 * Fix stale @exports by scanning actual export statements from source files.
 *
 * For each stale TypeScript/JS file, parse export statements using regex
 * to build the correct exports list, then update @exports in the header.
 *
 * For Python files and scanner.js: remove @exports declaration entirely
 * (AST export detection doesn't apply; they should not have @exports).
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const indexPath = path.join(projectRoot, '.coderef', 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
const elements = index.elements || [];

// Get stale files
const staleFiles = [...new Set(elements.filter(e => e.headerStatus === 'stale').map(e => e.file))];
console.log(`Found ${staleFiles.length} stale files`);

let fixed = 0;
let skipped = 0;

for (const relFile of staleFiles) {
  const absFile = path.join(projectRoot, relFile);

  if (!fs.existsSync(absFile)) {
    console.warn(`  SKIP (not found): ${relFile}`);
    skipped++;
    continue;
  }

  const ext = path.extname(absFile);
  const content = fs.readFileSync(absFile, 'utf-8');

  if (['.py', '.js'].includes(ext) || relFile.endsWith('scanner.js')) {
    // Python files and scanner.js: AST export detection doesn't apply.
    // Remove @exports line so header is no longer considered stale.
    if (!content.includes('@exports')) {
      console.log(`  OK (no @exports): ${relFile}`);
      skipped++;
      continue;
    }

    // Remove @exports lines from all header blocks
    // Pattern: @exports ... (the whole tag line up to next @tag or end of block)
    const newContent = content.replace(
      /[ \t]*@exports\b[ \t]*(?:[A-Za-z_][A-Za-z0-9_]*(?:[ \t]*,[ \t]*[A-Za-z_][A-Za-z0-9_]*)*)[ \t]*(\r?\n)?/g,
      ''
    );

    if (newContent === content) {
      console.log(`  OK (no @exports to remove): ${relFile}`);
      skipped++;
      continue;
    }

    fs.writeFileSync(absFile, newContent, 'utf-8');
    console.log(`  FIXED (removed @exports): ${relFile}`);
    fixed++;
    continue;
  }

  if (!['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
    console.warn(`  SKIP (unsupported ext ${ext}): ${relFile}`);
    skipped++;
    continue;
  }

  // For TypeScript/JS: extract actual export names from source
  const astExports = extractTsExports(content);

  if (astExports === null) {
    console.warn(`  SKIP (could not extract exports): ${relFile}`);
    skipped++;
    continue;
  }

  // Find and update @exports in the FIRST semantic header block
  const semanticIdx = content.indexOf('@coderef-semantic');
  if (semanticIdx === -1) {
    console.warn(`  SKIP (no @coderef-semantic): ${relFile}`);
    skipped++;
    continue;
  }

  const exportsTagRe = /@exports\b[ \t]*((?:[A-Za-z_][A-Za-z0-9_]*(?:[ \t]*,[ \t]*)?)*)/;
  const fromMarker = content.slice(semanticIdx);
  const exportsMatch = exportsTagRe.exec(fromMarker);

  if (!exportsMatch) {
    console.warn(`  SKIP (no @exports tag): ${relFile}`);
    skipped++;
    continue;
  }

  const oldExports = exportsMatch[1].trim();
  const newExports = [...astExports].sort().join(', ');

  if (oldExports === newExports) {
    // Double-check: if old and new are the same, file shouldn't be stale
    // (may need a re-run to confirm)
    console.log(`  OK (exports match): ${relFile}`);
    skipped++;
    continue;
  }

  const matchStart = semanticIdx + exportsMatch.index;
  const oldTag = exportsMatch[0];
  const newTag = `@exports ${newExports}`;
  const newContent = content.slice(0, matchStart) + content.slice(matchStart).replace(oldTag, newTag);

  fs.writeFileSync(absFile, newContent, 'utf-8');
  console.log(`  FIXED: ${relFile}`);
  console.log(`    was: ${oldExports.slice(0, 80)}${oldExports.length > 80 ? '...' : ''}`);
  console.log(`    now: ${newExports.slice(0, 80)}${newExports.length > 80 ? '...' : ''}`);
  fixed++;
}

console.log(`\nDone: ${fixed} fixed, ${skipped} skipped`);

// ---------------------------------------------------------------------------

/**
 * Extract exported names from TS/JS source text.
 * Returns a Set<string> of exported identifiers, excluding 'default' and '*'.
 */
function extractTsExports(source) {
  const exports = new Set();
  const lines = source.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // export class/interface/function/type/enum/const/abstract class Foo
    const declMatch = trimmed.match(/^export\s+(?:abstract\s+)?(?:class|interface|function\*?|type|enum|const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (declMatch) {
      exports.add(declMatch[1]);
      continue;
    }

    // export { Foo, Bar as Baz }
    const namedMatch = trimmed.match(/^export\s*\{([^}]+)\}/);
    if (namedMatch) {
      const specs = namedMatch[1].split(',').map(s => s.trim());
      for (const spec of specs) {
        // "Foo as Bar" -> Bar is the exported name
        const asMatch = spec.match(/\S+\s+as\s+([A-Za-z_][A-Za-z0-9_]*)/);
        if (asMatch) {
          exports.add(asMatch[1]);
        } else {
          const name = spec.match(/^([A-Za-z_][A-Za-z0-9_]*)/);
          if (name) exports.add(name[1]);
        }
      }
      continue;
    }

    // export default function/class Foo (with name)
    const defaultNamed = trimmed.match(/^export\s+default\s+(?:function|class)\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (defaultNamed) {
      // 'default' is excluded per orchestrator logic
      continue;
    }
  }

  return exports;
}

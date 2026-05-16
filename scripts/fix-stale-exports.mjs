#!/usr/bin/env node
/**
 * WO-SELF-SCAN-GAP-REMEDIATION-001
 * Fix stale @exports headers by replacing them with AST-derived export lists.
 *
 * Reads .coderef/index.json, finds all files with headerStatus='stale',
 * computes the correct export list from AST-exported elements, then rewrites
 * the @exports line in the file's first semantic header block.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const indexPath = path.join(projectRoot, '.coderef', 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
const elements = index.elements || [];

// Build map: file -> { astExports: string[], headerExports: string[] }
const fileMap = new Map();
for (const elem of elements) {
  const file = elem.file;
  if (!file) continue;
  if (!fileMap.has(file)) {
    fileMap.set(file, { headerStatus: elem.headerStatus, astExports: new Set(), headerExports: elem.headerFact?.exports || [] });
  }
  if (elem.exported === true && elem.name) {
    fileMap.get(file).astExports.add(elem.name);
  }
}

// Only process stale files
const staleFiles = [...fileMap.entries()].filter(([, v]) => v.headerStatus === 'stale');
console.log(`Found ${staleFiles.length} stale files`);

let fixed = 0;
let skipped = 0;

for (const [relFile, { astExports }] of staleFiles) {
  const absFile = path.join(projectRoot, relFile);

  if (!fs.existsSync(absFile)) {
    console.warn(`  SKIP (not found): ${relFile}`);
    skipped++;
    continue;
  }

  const ext = path.extname(absFile);
  if (!['.ts', '.js', '.py'].includes(ext)) {
    console.warn(`  SKIP (unsupported ext ${ext}): ${relFile}`);
    skipped++;
    continue;
  }

  let content = fs.readFileSync(absFile, 'utf-8');
  const newExportsList = [...astExports].sort().join(', ');

  // Find the first @exports line in a semantic header block
  // Matches: @exports Foo, Bar, Baz (possibly with trailing whitespace/newline)
  const exportTagRe = /(@exports\b[^:]*?)([ \t]*[^\S\n]*)((?:[A-Za-z_][A-Za-z0-9_]*(?:\s*,\s*)?)*)/;

  // Find a @coderef-semantic marker first to make sure we're in a semantic header
  const semanticMarkerIdx = content.indexOf('@coderef-semantic');
  if (semanticMarkerIdx === -1) {
    console.warn(`  SKIP (no @coderef-semantic marker): ${relFile}`);
    skipped++;
    continue;
  }

  // Find the @exports tag AFTER the first semantic marker
  const contentFromMarker = content.slice(semanticMarkerIdx);

  // Match @exports followed by the export list up to end of that tag value
  // The tag value ends at the next @tag or end of comment block
  const exportsTagRe = /@exports\b[ \t]*((?:[A-Za-z_][A-Za-z0-9_]*(?:[ \t]*,[ \t]*)?)*)/;
  const exportsMatch = exportsTagRe.exec(contentFromMarker);

  if (!exportsMatch) {
    console.warn(`  SKIP (no @exports tag found): ${relFile}`);
    skipped++;
    continue;
  }

  const oldExportsList = exportsMatch[1].trim();

  if (newExportsList === oldExportsList) {
    console.log(`  OK (no change needed): ${relFile}`);
    skipped++;
    continue;
  }

  // Replace in the full content
  const matchStart = semanticMarkerIdx + exportsMatch.index;
  const oldTag = exportsMatch[0];
  const newTag = `@exports ${newExportsList}`;

  content = content.slice(0, matchStart) + content.slice(matchStart).replace(oldTag, newTag);

  fs.writeFileSync(absFile, content, 'utf-8');
  console.log(`  FIXED: ${relFile}`);
  console.log(`    old: ${oldExportsList.slice(0, 80)}${oldExportsList.length > 80 ? '...' : ''}`);
  console.log(`    new: ${newExportsList.slice(0, 80)}${newExportsList.length > 80 ? '...' : ''}`);
  fixed++;
}

console.log(`\nDone: ${fixed} fixed, ${skipped} skipped`);

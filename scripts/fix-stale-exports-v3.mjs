#!/usr/bin/env node
/**
 * WO-SELF-SCAN-GAP-REMEDIATION-001 — v3
 * Fix stale @exports using the actual tree-sitter AST (via the built extractor).
 * This is the authoritative version that uses the same extraction logic as the orchestrator.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Load built extractor (same code path as orchestrator)
const { RelationshipExtractor } = await import(`file:///${path.join(projectRoot, 'dist/src/pipeline/extractors/relationship-extractor.js').replace(/\\/g, '/')}`);
const TreeSitter = (await import('tree-sitter')).default;
const TSTypeScript = (await import('tree-sitter-typescript')).default.typescript;

const parser = new TreeSitter();
parser.setLanguage(TSTypeScript);

const indexPath = path.join(projectRoot, '.coderef', 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
const elements = index.elements || [];

const staleFiles = [...new Set(elements.filter(e => e.headerStatus === 'stale').map(e => e.file))];
console.log(`Found ${staleFiles.length} stale files`);

const extractor = new RelationshipExtractor();
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

  // For Python/non-TS files: remove @exports entirely
  if (!['.ts', '.tsx', '.js', '.jsx', '.mjs', '.d.ts'].includes(ext)) {
    const content = fs.readFileSync(absFile, 'utf-8');
    if (!content.includes('@exports')) {
      console.log(`  OK (no @exports): ${relFile}`);
      skipped++;
      continue;
    }
    const newContent = content.replace(
      /[ \t]*@exports\b[ \t]*(?:[A-Za-z_][A-Za-z0-9_]*(?:[ \t]*,[ \t]*[A-Za-z_][A-Za-z0-9_]*)*)[ \t]*(\r?\n)?/g,
      ''
    );
    if (newContent !== content) {
      fs.writeFileSync(absFile, newContent, 'utf-8');
      console.log(`  FIXED (removed @exports): ${relFile}`);
      fixed++;
    } else {
      skipped++;
    }
    continue;
  }

  const content = fs.readFileSync(absFile, 'utf-8');
  const lang = ext === '.ts' || ext === '.tsx' || ext === '.d.ts' ? 'ts' : 'js';

  // Get AST exports via tree-sitter
  let tree;
  try {
    tree = parser.parse(content);
  } catch (e) {
    console.warn(`  SKIP (parse error): ${relFile} — ${e.message}`);
    skipped++;
    continue;
  }

  const rawExports = extractor.extractRawExports(tree.rootNode, relFile, content, lang);
  const astExports = [...new Set(rawExports.map(e => e.exportedName).filter(n => n !== 'default' && n !== '*'))].sort();

  // Get current header exports
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
    // No @exports tag — if AST has exports, this file's header is incomplete but not our job
    console.log(`  SKIP (no @exports tag): ${relFile}`);
    skipped++;
    continue;
  }

  const oldExports = exportsMatch[1].trim();
  const newExports = astExports.join(', ');

  if (oldExports === newExports) {
    console.log(`  OK: ${relFile}`);
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

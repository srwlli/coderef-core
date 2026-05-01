#!/usr/bin/env node
/**
 * Real semantic dry-run test
 * Scans actual codebase, captures semantic headers WITHOUT writing them
 * Shows top 5 files and their generated semantics
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Simple TypeScript/JavaScript parser to extract exports and imports
function extractSemantics(filePath, content) {
  const exports = [];
  const imports = [];

  // Extract top-level exports (simplified)
  const exportMatches = content.matchAll(/export\s+(function|class|const|interface|type|async\s+function)\s+(\w+)/g);
  for (const match of exportMatches) {
    exports.push(match[2]);
  }

  // Extract default export
  if (content.includes('export default')) {
    const defaultMatch = content.match(/export\s+default\s+(\w+)/);
    if (defaultMatch) exports.push(`[default: ${defaultMatch[1]}]`);
  }

  // Extract imports (simplified)
  const importMatches = content.matchAll(/import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g);
  for (const match of importMatches) {
    const source = match[3];
    const items = match[1] ? match[1].split(',').map(s => s.trim()) : [match[2]];
    imports.push({ items, source });
  }

  return { exports, imports };
}

// Find all TS/JS source files
function findSourceFiles(dir, excludeDirs = ['.coderef', 'node_modules', '.git', 'dist', 'ARCHIVED']) {
  const files = [];

  function walk(currentPath) {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          if (!excludeDirs.includes(entry.name)) {
            walk(fullPath);
          }
        } else if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (e) {
      // Skip inaccessible directories
    }
  }

  walk(dir);
  return files;
}

async function main() {
  console.log('================================================================================');
  console.log('REAL SEMANTIC DRY-RUN: Scanning codebase WITHOUT writing changes');
  console.log('================================================================================\n');

  // Find all source files
  const allFiles = findSourceFiles(PROJECT_ROOT);
  console.log(`[SCAN] Found ${allFiles.length} source files\n`);

  // Extract semantics from all files
  const semanticMap = new Map();
  let processedCount = 0;
  let errorCount = 0;

  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const semantics = extractSemantics(filePath, content);

      // Only track files with exports (meaningful headers)
      if (semantics.exports.length > 0) {
        semanticMap.set(filePath, semantics);
        processedCount++;
      }
    } catch (e) {
      errorCount++;
    }
  }

  console.log(`[EXTRACTION] Processed: ${processedCount} files with exports, ${errorCount} errors\n`);

  // Sort by file size and select top 5
  const sortedFiles = Array.from(semanticMap.entries())
    .map(([filePath, semantics]) => ({
      filePath,
      semantics,
      size: fs.statSync(filePath).size,
      exports: semantics.exports.length,
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 5);

  console.log(`[TOP 5 LARGEST FILES WITH EXPORTS]\n`);

  for (let i = 0; i < sortedFiles.length; i++) {
    const { filePath, semantics, size, exports } = sortedFiles[i];
    const relPath = path.relative(PROJECT_ROOT, filePath);

    console.log(`================================================================================`);
    console.log(`[FILE ${i + 1}] ${relPath}`);
    console.log(`         Size: ${(size / 1024).toFixed(2)} KB | Exports: ${exports}`);
    console.log(`================================================================================`);

    // Generate semantic header
    const header = generateHeader(semantics, filePath);
    console.log('WOULD GENERATE HEADER:\n');
    console.log(header);
    console.log('');

    // Show details
    if (semantics.exports.length > 0) {
      console.log('EXPORTS:');
      semantics.exports.forEach(exp => console.log(`  • ${exp}`));
      console.log('');
    }

    if (semantics.imports.length > 0) {
      console.log('IMPORTS:');
      semantics.imports.slice(0, 5).forEach(imp => {
        console.log(`  • from "${imp.source}": ${imp.items.join(', ')}`);
      });
      if (semantics.imports.length > 5) {
        console.log(`  ... and ${semantics.imports.length - 5} more imports`);
      }
      console.log('');
    }
  }

  console.log('================================================================================');
  console.log(`SUMMARY`);
  console.log('================================================================================');
  console.log(`Total files scanned: ${allFiles.length}`);
  console.log(`Files with exports: ${semanticMap.size}`);
  console.log(`Top 5 shown above (no files modified - DRY RUN ONLY)`);
  console.log('================================================================================\n');
}

function generateHeader(semantics, filePath) {
  const filename = path.basename(filePath);
  const exports = semantics.exports.slice(0, 8).join(', ');
  const importCount = semantics.imports.length;

  return `/**
 * ${filename}
 *
 * Exports: ${exports}${semantics.exports.length > 8 ? ` (+${semantics.exports.length - 8} more)` : ''}
 * Dependencies: ${importCount} import(s)
 *
 * @coderef-semantic {version: "1.0.0", scope: "module", timestamp: "${new Date().toISOString()}"}
 */`;
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * CodeRef Scanner CLI
 *
 * Simple command-line wrapper around the TypeScript scanner.
 * Scans a project directory and prints element statistics.
 *
 * Usage: node scan.cjs <project_path>
 */

const path = require('path');
const fs = require('fs');

// Main async wrapper to use dynamic import
(async () => {
  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: node scan.cjs <project_path>');
    console.log('');
    console.log('Scans a project directory and reports code elements found.');
    console.log('');
    console.log('Arguments:');
    console.log('  project_path    Path to project directory (use "." for current directory)');
    console.log('');
    console.log('Example:');
    console.log('  node scan.cjs .');
    console.log('  node scan.cjs C:\\path\\to\\project');
    process.exit(args.length === 0 ? 1 : 0);
  }

  // Get and validate project path
  const projectPath = path.resolve(args[0]);

  if (!fs.existsSync(projectPath)) {
    console.error(`Error: Path does not exist: ${projectPath}`);
    process.exit(1);
  }

  if (!fs.statSync(projectPath).isDirectory()) {
    console.error(`Error: Path is not a directory: ${projectPath}`);
    process.exit(1);
  }

  // Dynamic import of scanner (works with both CommonJS and ES modules)
  const { scanCurrentElements } = await import('../../dist/index.js');

  // Run scan
  console.log(`Scanning: ${projectPath}`);
  console.log('');

  const startTime = Date.now();

  try {
    // Scan all 10 supported languages
    const elements = await scanCurrentElements(projectPath, ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'cpp', 'c']);
    const duration = Date.now() - startTime;

    // Count unique files
    const uniqueFiles = new Set();
    elements.forEach(el => {
      if (el.file) {
        uniqueFiles.add(el.file);
      }
    });

    // Print results
    console.log('Scan Results:');
    console.log(`  Elements found: ${elements.length}`);
    console.log(`  Files scanned:  ${uniqueFiles.size}`);
    console.log(`  Duration:       ${duration}ms`);
    console.log('');
    console.log('✓ Scan completed successfully');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('✗ Scan failed:');
    console.error(`  ${error.message}`);
    process.exit(1);
  }
})();

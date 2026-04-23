#!/usr/bin/env node

/**
 * CodeRef Scanner CLI
 *
 * Fast command-line wrapper around the TypeScript scanner.
 * Scans a project directory and prints element statistics.
 *
 * Usage: npx coderef-scan <project_path>
 */

import path from 'path';
import fs from 'fs';
import { scanCurrentElements } from '../scanner/scanner.js';
import { IncrementalCache } from '../cache/incremental-cache.js';

interface ScanOptions {
  languages?: string[];
  plugins?: string[];
  disablePlugins?: boolean;
  incremental?: boolean;
}

const SUPPORTED_LANGUAGES = ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'cpp', 'c'];

function printHelp(): void {
  console.log('Usage: coderef-scan <project_path> [options]');
  console.log('');
  console.log('Scans a project directory and reports code elements found.');
  console.log('');
  console.log('Arguments:');
  console.log('  project_path    Path to project directory (use "." for current directory)');
  console.log('');
  console.log('Options:');
  console.log('  --languages     Comma-separated list of languages (default: all 10)');
  console.log('  --plugins       Comma-separated list of plugins to enable');
  console.log('  --no-plugins    Disable all plugins');
  console.log('  --incremental   Use incremental scanning (skip unchanged files)');
  console.log('  --help, -h      Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  coderef-scan .');
  console.log('  coderef-scan C:\\path\\to\\project');
  console.log('  coderef-scan . --languages ts,tsx,js');
}

async function scanProject(projectPath: string, options: ScanOptions = {}): Promise<void> {
  const languages = options.languages || SUPPORTED_LANGUAGES;

  console.log(`Scanning: ${projectPath}`);
  console.log(`Languages: ${languages.join(', ')}`);
  if (options.incremental) {
    console.log('Mode: Incremental (using cache)');
  }
  console.log('');

  const startTime = Date.now();

  try {
    // IMP-CORE-057: Use IncrementalCache when --incremental flag is set
    let cache: IncrementalCache | undefined;
    if (options.incremental) {
      cache = new IncrementalCache(projectPath, true);
      await cache.load();
    }

    const elements = await scanCurrentElements(projectPath, languages, {
      verbose: true,
      cache
    });
    const duration = Date.now() - startTime;

    // Count unique files
    const uniqueFiles = new Set<string>();
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

  } catch (error) {
    console.error('');
    console.error('✗ Scan failed:');
    console.error(`  ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function validateProjectPath(projectPath: string): string {
  const resolvedPath = path.resolve(projectPath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: Path does not exist: ${resolvedPath}`);
    process.exit(1);
  }

  if (!fs.statSync(resolvedPath).isDirectory()) {
    console.error(`Error: Path is not a directory: ${resolvedPath}`);
    process.exit(1);
  }

  return resolvedPath;
}

function parseLanguages(langArg: string): string[] {
  const languages = langArg.split(',').map(l => l.trim().toLowerCase());
  const invalid = languages.filter(l => !SUPPORTED_LANGUAGES.includes(l));

  if (invalid.length > 0) {
    console.error(`Error: Unsupported languages: ${invalid.join(', ')}`);
    console.error(`Supported: ${SUPPORTED_LANGUAGES.join(', ')}`);
    process.exit(1);
  }

  return languages;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Show help if no args or --help
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const projectPath = validateProjectPath(args[0]);

  // Parse options
  const options: ScanOptions = {};
  const langIndex = args.indexOf('--languages');
  if (langIndex !== -1 && args[langIndex + 1]) {
    options.languages = parseLanguages(args[langIndex + 1]);
  }

  // Parse plugin options
  const noPluginsIndex = args.indexOf('--no-plugins');
  if (noPluginsIndex !== -1) {
    options.disablePlugins = true;
  }

  const pluginsIndex = args.indexOf('--plugins');
  if (pluginsIndex !== -1 && args[pluginsIndex + 1]) {
    options.plugins = args[pluginsIndex + 1].split(',').map(p => p.trim());
  }

  // Parse incremental flag
  const incrementalIndex = args.indexOf('--incremental');
  if (incrementalIndex !== -1) {
    options.incremental = true;
  }

  await scanProject(projectPath, options);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

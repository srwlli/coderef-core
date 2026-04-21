/**
 * Analyze Coverage - Detect test coverage gaps
 *
 * Outputs: .coderef/reports/coverage.json
 *
 * @module fileGeneration/analyzeCoverage
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ElementData } from '../types/types.js';

interface CoverageReport {
  version: string;
  generatedAt: string;
  projectPath: string;
  summary: {
    totalFiles: number;
    filesWithTests: number;
    filesWithoutTests: number;
    coveragePercentage: number;
  };
  testedFiles: string[];
  untestedFiles: string[];
}

/**
 * Analyze test coverage in the codebase
 *
 * @param projectPath - Absolute path to project root
 * @param elements - Array of code elements from scan
 * @returns Promise that resolves when file is written
 */
export async function analyzeCoverage(
  projectPath: string,
  elements: ElementData[]
): Promise<void> {
  // Get all unique source files (excluding test files)
  const sourceFiles = new Set<string>();
  const testFiles = new Set<string>();

  for (const element of elements) {
    const fileLower = element.file.toLowerCase();

    // Classify as test or source file
    if (isTestFile(fileLower)) {
      testFiles.add(element.file);
    } else {
      sourceFiles.add(element.file);
    }
  }

  // Find which source files have corresponding test files
  const testedFiles: string[] = [];
  const untestedFiles: string[] = [];

  for (const sourceFile of sourceFiles) {
    if (hasTestFile(sourceFile, testFiles)) {
      testedFiles.push(sourceFile);
    } else {
      untestedFiles.push(sourceFile);
    }
  }

  // Calculate coverage percentage
  const totalFiles = sourceFiles.size;
  const filesWithTests = testedFiles.length;
  const coveragePercentage = totalFiles > 0
    ? Math.round((filesWithTests / totalFiles) * 100)
    : 0;

  // Build report
  const report: CoverageReport = {
    version: '2.0.0',
    generatedAt: new Date().toISOString(),
    projectPath,
    summary: {
      totalFiles,
      filesWithTests,
      filesWithoutTests: untestedFiles.length,
      coveragePercentage,
    },
    testedFiles: testedFiles.sort(),
    untestedFiles: untestedFiles.sort(),
  };

  // Ensure reports directory exists
  const reportsDir = path.join(projectPath, '.coderef', 'reports');
  await fs.mkdir(reportsDir, { recursive: true });

  // Write report
  const reportPath = path.join(reportsDir, 'coverage.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
}

/**
 * Check if a file is a test file
 */
function isTestFile(filePath: string): boolean {
  const testPatterns = [
    '.test.',
    '.spec.',
    '.test.ts',
    '.test.tsx',
    '.test.js',
    '.test.jsx',
    '.spec.ts',
    '.spec.tsx',
    '.spec.js',
    '.spec.jsx',
    '/__tests__/',
    '/test/',
    '/tests/',
  ];

  return testPatterns.some(pattern => filePath.includes(pattern));
}

/**
 * Check if a source file has a corresponding test file
 */
function hasTestFile(sourceFile: string, testFiles: Set<string>): boolean {
  // Extract base name without extension
  const parsed = path.parse(sourceFile);
  const baseName = parsed.name;
  const dirName = parsed.dir;

  // Check for common test file naming patterns
  const testPatterns = [
    `${baseName}.test${parsed.ext}`,
    `${baseName}.spec${parsed.ext}`,
    `${baseName}.test.ts`,
    `${baseName}.test.tsx`,
    `${baseName}.test.js`,
    `${baseName}.test.jsx`,
    `${baseName}.spec.ts`,
    `${baseName}.spec.tsx`,
    `${baseName}.spec.js`,
    `${baseName}.spec.jsx`,
  ];

  // Check if any test file exists for this source file
  for (const testFile of testFiles) {
    const testFileName = path.basename(testFile);

    // Check if test file name matches any pattern
    if (testPatterns.some(pattern => testFileName.includes(baseName))) {
      return true;
    }
  }

  return false;
}

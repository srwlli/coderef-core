/**
 * CoverageGenerator - Analyze test coverage from PipelineState
 *
 * WO-UNIFIED-CODEREF-PIPELINE-001 - Phase 3, Task GEN-005
 *
 * Produces: .coderef/reports/coverage.json
 * Analysis: Test file matching, coverage percentage, untested elements
 */

/**
 * @semantic
 * exports: [CoverageGenerator]
 * used_by: [src/cli/populate.ts]
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { PipelineState } from '../types.js';

interface CoverageReport {
  summary: {
    totalFiles: number;
    testedFiles: number;
    coveragePercentage: number;
  };
  files: Array<{
    file: string;
    tested: boolean;
    testFile?: string;
  }>;
  untested: string[];
}

/**
 * CoverageGenerator - Calculate test coverage metrics
 */
export class CoverageGenerator {
  async generate(state: PipelineState, outputDir: string): Promise<void> {
    const reportsDir = path.join(outputDir, 'reports');
    await fs.mkdir(reportsDir, { recursive: true });

    const report = this.calculateCoverage(state);

    const reportPath = path.join(reportsDir, 'coverage.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    if (state.options.verbose) {
      console.log(`[CoverageGenerator] Coverage: ${report.summary.coveragePercentage}% (${report.summary.testedFiles}/${report.summary.totalFiles} files)`);
    }
  }

  private calculateCoverage(state: PipelineState): CoverageReport {
    const allFiles: string[] = [];
    const testFiles = new Set<string>();

    // Collect all files
    for (const [lang, filePaths] of state.files.entries()) {
      filePaths.forEach(filePath => {
        const relativePath = path.relative(state.projectPath, filePath).replace(/\\/g, '/');
        allFiles.push(relativePath);

        if (this.isTestFile(relativePath)) {
          testFiles.add(relativePath);
        }
      });
    }

    // Match implementation files to test files
    const coverage: CoverageReport['files'] = [];
    const untested: string[] = [];

    allFiles.forEach(file => {
      if (this.isTestFile(file)) return; // Skip test files themselves

      const testFile = this.findTestFile(file, Array.from(testFiles));
      const tested = !!testFile;

      coverage.push({ file, tested, testFile });

      if (!tested) {
        untested.push(file);
      }
    });

    const testedFiles = coverage.filter(c => c.tested).length;
    const totalFiles = coverage.length;

    return {
      summary: {
        totalFiles,
        testedFiles,
        coveragePercentage: totalFiles > 0 ? Math.round((testedFiles / totalFiles) * 100) : 0,
      },
      files: coverage,
      untested,
    };
  }

  private isTestFile(filePath: string): boolean {
    // JavaScript/TypeScript patterns
    if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__')) {
      return true;
    }

    // Python patterns
    const fileName = filePath.split('/').pop() || '';
    if (fileName.startsWith('test_') || fileName.endsWith('_test.py')) {
      return true;
    }
    if (filePath.includes('/tests/') && fileName.endsWith('.py')) {
      return true;
    }

    return false;
  }

  private findTestFile(implFile: string, testFiles: string[]): string | undefined {
    const baseName = path.basename(implFile, path.extname(implFile));

    return testFiles.find(testFile => {
      return testFile.includes(baseName) || testFile.includes(baseName.replace(/-/g, ''));
    });
  }
}

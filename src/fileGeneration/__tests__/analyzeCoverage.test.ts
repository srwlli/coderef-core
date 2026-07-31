/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability analyze-coverage-tests
 */

/**
 * analyzeCoverage Test Suite
 *
 * WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 Phase 4 (test-linkage burn-down,
 * cluster B): public-API report writer (src/index.ts named export), previously
 * zero test edges.
 *
 * Tests:
 * - coverage.json written under .coderef/reports/
 * - tested/untested classification via test-file name correspondence
 * - summary math (counts + percentage)
 * - empty-input degenerate case
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { analyzeCoverage } from '../analyzeCoverage.js';
import type { ElementData } from '../../types/types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir, rm, readFile } from 'fs/promises';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('analyzeCoverage() - coverage report', () => {
  let testProjectDir: string;

  beforeEach(async () => {
    testProjectDir = join(__dirname, `.test-project-${randomUUID()}`);
    await mkdir(testProjectDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testProjectDir, { recursive: true, force: true });
  });

  async function readReport(): Promise<any> {
    const raw = await readFile(join(testProjectDir, '.coderef', 'reports', 'coverage.json'), 'utf-8');
    return JSON.parse(raw);
  }

  it('classifies source files by test-file correspondence and writes summary math', async () => {
    const elements: ElementData[] = [
      { type: 'function', name: 'authenticate', file: 'src/auth.ts', line: 10, exported: true },
      { type: 'function', name: 'lonelyFn', file: 'src/lonely.ts', line: 5 },
      { type: 'function', name: 'authSpec', file: '__tests__/auth.test.ts', line: 3 },
    ];

    await analyzeCoverage(testProjectDir, elements);
    const report = await readReport();

    expect(report.version).toBe('2.0.0');
    expect(report.projectPath).toBe(testProjectDir);
    expect(report.summary).toEqual({
      totalFiles: 2,
      filesWithTests: 1,
      filesWithoutTests: 1,
      coveragePercentage: 50,
    });
    expect(report.testedFiles).toEqual(['src/auth.ts']);
    expect(report.untestedFiles).toEqual(['src/lonely.ts']);
  });

  it('emits a zero-percentage report for empty input', async () => {
    await analyzeCoverage(testProjectDir, []);
    const report = await readReport();

    expect(report.summary).toEqual({
      totalFiles: 0,
      filesWithTests: 0,
      filesWithoutTests: 0,
      coveragePercentage: 0,
    });
    expect(report.testedFiles).toEqual([]);
    expect(report.untestedFiles).toEqual([]);
  });
});

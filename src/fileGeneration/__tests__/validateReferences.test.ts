/**
 * validateReferences Test Suite
 *
 * WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 Phase 4 (test-linkage burn-down,
 * cluster B): public-API report writer (src/index.ts named export), previously
 * zero test edges.
 *
 * Tests:
 * - undefined-call detection for calls that resolve to no known element
 * - validation.json summary math
 * - clean-input case reports 100%
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateReferences } from '../validateReferences.js';
import type { ElementData } from '../../types/types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir, rm, readFile } from 'fs/promises';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('validateReferences() - validation report', () => {
  let testProjectDir: string;

  beforeEach(async () => {
    testProjectDir = join(__dirname, `.test-project-${randomUUID()}`);
    await mkdir(testProjectDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testProjectDir, { recursive: true, force: true });
  });

  async function readReport(): Promise<any> {
    const raw = await readFile(join(testProjectDir, '.coderef', 'reports', 'validation.json'), 'utf-8');
    return JSON.parse(raw);
  }

  it('flags calls to unknown elements as undefined-call warnings', async () => {
    const elements: ElementData[] = [
      { type: 'function', name: 'main', file: 'src/main.ts', line: 1, calls: ['helper', 'ghostFn'] },
      { type: 'function', name: 'helper', file: 'src/util.ts', line: 2 },
    ];

    await validateReferences(testProjectDir, elements);
    const report = await readReport();

    expect(report.summary).toEqual({
      totalReferences: 2,
      brokenReferences: 1,
      validReferences: 1,
      validationPercentage: 50,
    });
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]).toMatchObject({
      type: 'undefined-call',
      severity: 'warning',
      file: 'src/main.ts',
      elementName: 'main',
      referencedName: 'ghostFn',
    });
  });

  it('reports 100% when no calls are recorded', async () => {
    const elements: ElementData[] = [
      { type: 'function', name: 'standalone', file: 'src/solo.ts', line: 1 },
    ];

    await validateReferences(testProjectDir, elements);
    const report = await readReport();

    expect(report.summary).toEqual({
      totalReferences: 0,
      brokenReferences: 0,
      validReferences: 0,
      validationPercentage: 100,
    });
    expect(report.issues).toEqual([]);
  });
});

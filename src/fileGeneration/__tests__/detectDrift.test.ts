/**
 * detectDrift Test Suite
 *
 * WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 Phase 4 (test-linkage burn-down,
 * cluster B): public-API report writer (src/index.ts named export), previously
 * zero test edges.
 *
 * Tests:
 * - first-scan branch (no prior index): everything reported as added
 * - comparison branch against a real saveIndex-written previous scan:
 *   added / removed / modified (line drift) classification
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectDrift } from '../detectDrift.js';
import { saveIndex } from '../saveIndex.js';
import type { ElementData } from '../../types/types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir, rm, readFile } from 'fs/promises';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('detectDrift() - drift report', () => {
  let testProjectDir: string;

  beforeEach(async () => {
    testProjectDir = join(__dirname, `.test-project-${randomUUID()}`);
    await mkdir(testProjectDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testProjectDir, { recursive: true, force: true });
  });

  async function readReport(): Promise<any> {
    const raw = await readFile(join(testProjectDir, '.coderef', 'reports', 'drift.json'), 'utf-8');
    return JSON.parse(raw);
  }

  it('first scan (no previous index) reports every element as added', async () => {
    const elements: ElementData[] = [
      { type: 'function', name: 'alpha', file: 'src/a.ts', line: 1 },
      { type: 'function', name: 'beta', file: 'src/b.ts', line: 2 },
    ];

    await detectDrift(testProjectDir, elements);
    const report = await readReport();

    expect(report.hasPreviousScan).toBe(false);
    expect(report.summary).toEqual({
      totalElements: 2,
      addedElements: 2,
      removedElements: 0,
      modifiedElements: 0,
      unchangedElements: 0,
    });
    expect(report.changes.added.map((e: ElementData) => e.name).sort()).toEqual(['alpha', 'beta']);
    expect(report.changes.removed).toEqual([]);
    expect(report.changes.modified).toEqual([]);
  });

  it('compares against a saveIndex-written previous scan: added/removed/modified', async () => {
    const previous: ElementData[] = [
      { type: 'function', name: 'alpha', file: 'src/a.ts', line: 10 },
      { type: 'function', name: 'beta', file: 'src/b.ts', line: 20 },
    ];
    await saveIndex(testProjectDir, previous);

    const current: ElementData[] = [
      // alpha moved lines 10 -> 12 => modified
      { type: 'function', name: 'alpha', file: 'src/a.ts', line: 12 },
      // beta gone => removed; gamma new => added
      { type: 'function', name: 'gamma', file: 'src/c.ts', line: 3 },
    ];

    await detectDrift(testProjectDir, current);
    const report = await readReport();

    expect(report.hasPreviousScan).toBe(true);
    expect(report.summary).toEqual({
      totalElements: 2,
      addedElements: 1,
      removedElements: 1,
      modifiedElements: 1,
      unchangedElements: 0,
    });
    expect(report.changes.added.map((e: ElementData) => e.name)).toEqual(['gamma']);
    expect(report.changes.removed.map((e: ElementData) => e.name)).toEqual(['beta']);
    expect(report.changes.modified.map((e: ElementData) => e.name)).toEqual(['alpha']);
  });
});

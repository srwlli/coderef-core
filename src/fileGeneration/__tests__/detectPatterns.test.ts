/**
 * detectPatterns Test Suite
 *
 * WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 Phase 4 (test-linkage burn-down,
 * cluster B): public-API report writer + getApiEndpointStats (src/index.ts named
 * exports), previously zero test edges.
 *
 * Tests:
 * - patterns.json written with handler/decorator/error/test classification
 * - route-carrying elements surface as apiEndpoints (IMP-CORE-039 path)
 * - getApiEndpointStats per-framework aggregation
 *
 * Fixture names are chosen to hit exactly ONE keyword family each (the
 * detectors match by substring — e.g. "onSubmit" would also count as a test
 * pattern via "it"; "onFocus" does not).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectPatterns, getApiEndpointStats } from '../detectPatterns.js';
import type { ElementData } from '../../types/types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir, rm, readFile } from 'fs/promises';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURE: ElementData[] = [
  { type: 'function', name: 'handleClick', file: 'src/ui/click.ts', line: 1 },
  { type: 'function', name: 'onFocus', file: 'src/ui/focus.ts', line: 2 },
  { type: 'decorator', name: '@cached', file: 'src/cache.py', line: 3 },
  { type: 'function', name: 'throwValidationError', file: 'src/errors.ts', line: 4 },
  { type: 'function', name: 'testHelper', file: '__tests__/helper.test.ts', line: 5 },
  {
    type: 'function',
    name: 'list_users',
    file: 'app.py',
    line: 6,
    exported: true,
    route: { path: '/users', methods: ['GET'], framework: 'flask' },
  },
];

describe('detectPatterns() - pattern report', () => {
  let testProjectDir: string;

  beforeEach(async () => {
    testProjectDir = join(__dirname, `.test-project-${randomUUID()}`);
    await mkdir(testProjectDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testProjectDir, { recursive: true, force: true });
  });

  it('classifies handlers, decorators, error and test patterns, and API endpoints', async () => {
    await detectPatterns(testProjectDir, FIXTURE);

    const raw = await readFile(join(testProjectDir, '.coderef', 'reports', 'patterns.json'), 'utf-8');
    const report = JSON.parse(raw);

    expect(report.statistics).toEqual({
      totalHandlers: 2,
      totalDecorators: 1,
      totalErrorPatterns: 1,
      totalTestPatterns: 1,
      totalApiEndpoints: 1,
    });

    expect(report.patterns.handlers.map((h: any) => h.name).sort()).toEqual(['handleClick', 'onFocus']);
    expect(report.patterns.decorators[0].name).toBe('@cached');
    expect(report.patterns.errorPatterns[0].name).toBe('throwValidationError');
    expect(report.patterns.testPatterns[0].name).toBe('testHelper');

    const endpoint = report.patterns.apiEndpoints[0];
    expect(endpoint).toMatchObject({
      type: 'api-endpoint',
      name: 'list_users',
      file: 'app.py',
      line: 6,
      path: '/users',
      methods: ['GET'],
      framework: 'flask',
    });
  });
});

describe('getApiEndpointStats() - per-framework aggregation', () => {
  it('aggregates totals, byMethod and sorted paths per framework', () => {
    const elements: ElementData[] = [
      ...FIXTURE,
      {
        type: 'function',
        name: 'create_user',
        file: 'app.py',
        line: 12,
        route: { path: '/admin', methods: ['POST', 'GET'], framework: 'flask' },
      },
    ];

    const stats = getApiEndpointStats(elements);

    expect(Object.keys(stats)).toEqual(['flask']);
    expect(stats.flask.total).toBe(2);
    expect(stats.flask.byMethod).toEqual({ GET: 2, POST: 1 });
    expect(stats.flask.paths).toEqual(['/admin', '/users']);
  });

  it('returns an empty record when no element carries route metadata', () => {
    const noRoutes = FIXTURE.filter(e => e.route === undefined);
    expect(getApiEndpointStats(noRoutes)).toEqual({});
  });
});

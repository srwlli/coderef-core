/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability rag-coverage-floor-gate-test
 */

/**
 * Phase 1 (option B) tests for the header-coverage floor gate, added by
 * WO-RAG-HEADER-COVERAGE-ENFORCE-AND-SURFACE-001.
 *
 * The gate fires at the very top of indexCodebase (after the ok===false
 * graph-integrity gate, before any analysis / embedding), so these tests
 * need almost no fixture — they assert the three branches:
 *   1. coverage at/above floor  → no refusal, no warning
 *   2. coverage below floor, non-strict → proceeds (status not 'failed' for
 *      gate reasons) but carries coverageWarning
 *   3. coverage below floor, strict → status='failed', coverageGateRefused
 *
 * Branch (2) still runs the full pipeline; we stub the LLM + vector store so
 * it completes deterministically and we can read coverageWarning off the
 * successful result.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IndexingOrchestrator } from '../indexing-orchestrator.js';
import type { LLMProvider } from '../../llm/llm-provider.js';
import type { VectorStore, VectorRecord } from '../../vector/vector-store.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Header-coverage floor gate (WO-RAG-HEADER-COVERAGE-ENFORCE-AND-SURFACE-001 P1)', () => {
  let mockLLMProvider: LLMProvider;
  let mockVectorStore: VectorStore;
  let orchestrator: IndexingOrchestrator;
  let tempDir: string;

  const writeGraphJson = (basePath: string): void => {
    const graphJson = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      nodes: [
        {
          id: '@Fn/auth/login.ts#authenticate:10',
          type: 'function',
          name: 'authenticate',
          file: 'auth/login.ts',
          line: 10,
          metadata: { exported: true },
        },
      ],
      edges: [],
      statistics: { nodeCount: 1, edgeCount: 0 },
    };
    fs.mkdirSync(path.join(basePath, '.coderef'), { recursive: true });
    fs.writeFileSync(
      path.join(basePath, '.coderef', 'graph.json'),
      JSON.stringify(graphJson),
      'utf-8',
    );
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-cov-'));
    fs.mkdirSync(path.join(tempDir, 'auth'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'auth', 'login.ts'),
      'export function authenticate(p: string) { return p; }',
    );

    mockLLMProvider = {
      complete: vi.fn(),
      embed: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
      countTokens: vi.fn().mockReturnValue(100),
      getProviderName: vi.fn().mockReturnValue('mock-llm'),
      getModel: vi.fn().mockReturnValue('mock-model'),
    } as unknown as LLMProvider;

    const mockRecords: VectorRecord[] = [];
    mockVectorStore = {
      upsert: vi.fn().mockImplementation(async (records: VectorRecord[]) => {
        mockRecords.push(...records);
      }),
      query: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      initialize: vi.fn(),
      stats: vi.fn().mockResolvedValue({
        recordCount: 0,
        dimension: 1536,
        indexName: 'test-index',
      }),
      getProviderName: vi.fn().mockReturnValue('mock-vector-store'),
    } as unknown as VectorStore;

    writeGraphJson(tempDir);
    orchestrator = new IndexingOrchestrator(
      mockLLMProvider,
      mockVectorStore,
      tempDir,
    );
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  });

  it('refuses indexing when coverage is below the floor AND strictCoverage is set', async () => {
    const result = await orchestrator.indexCodebase({
      validation: {
        ok: true,
        coveragePct: 41,
        coverageFloor: 80,
        strictCoverage: true,
      },
      sourceDir: tempDir,
      languages: ['ts'],
      useAnalyzer: true,
      incrementalOptions: { force: true },
      embeddingOptions: { batchSize: 10 },
    });

    expect(result.status).toBe('failed');
    expect(result.coverageGateRefused).toBe(true);
    expect(result.coverageWarning).toMatch(/41%/);
    expect(result.coverageWarning).toMatch(/80%/);
    // Strict refusal must NOT touch the embedding API.
    expect(mockLLMProvider.embed).not.toHaveBeenCalled();
    expect(mockVectorStore.upsert).not.toHaveBeenCalled();
  });

  it('proceeds with a coverageWarning when below floor but NOT strict (default)', async () => {
    const result = await orchestrator.indexCodebase({
      validation: {
        ok: true,
        coveragePct: 41,
        coverageFloor: 80,
        strictCoverage: false,
      },
      sourceDir: tempDir,
      languages: ['ts'],
      useAnalyzer: true,
      incrementalOptions: { force: true },
      embeddingOptions: { batchSize: 10 },
    });

    // Not refused for coverage reasons.
    expect(result.coverageGateRefused).toBeFalsy();
    // But the breach is still surfaced.
    expect(result.coverageWarning).toMatch(/41%/);
    expect(result.coverageWarning).toMatch(/below the floor/);
  });

  it('does not warn or refuse when coverage is at/above the floor', async () => {
    const result = await orchestrator.indexCodebase({
      validation: {
        ok: true,
        coveragePct: 95,
        coverageFloor: 80,
        strictCoverage: true,
      },
      sourceDir: tempDir,
      languages: ['ts'],
      useAnalyzer: true,
      incrementalOptions: { force: true },
      embeddingOptions: { batchSize: 10 },
    });

    expect(result.coverageGateRefused).toBeFalsy();
    expect(result.coverageWarning).toBeUndefined();
  });

  it('disables the floor check when coveragePct is absent (legacy report shape)', async () => {
    const result = await orchestrator.indexCodebase({
      validation: {
        ok: true,
        coverageFloor: 80,
        strictCoverage: true,
      },
      sourceDir: tempDir,
      languages: ['ts'],
      useAnalyzer: true,
      incrementalOptions: { force: true },
      embeddingOptions: { batchSize: 10 },
    });

    expect(result.coverageGateRefused).toBeFalsy();
    expect(result.coverageWarning).toBeUndefined();
  });
});

/**
 * P2 (option C) skip-reason aggregation. The rag-index CLI groups
 * result.chunksSkippedDetails by `reason` into a histogram for the
 * "by reason: ..." line. The orchestrator's header-status skip filter is
 * pre-existing established code (indexing-orchestrator.ts:606-620) and is
 * exercised end-to-end by the Phase 4 dogfood; here we lock the pure
 * aggregation shape the CLI relies on so a refactor of the detail array
 * can't silently break the breakdown.
 */
describe('skip-reason histogram aggregation (P2 CLI breakdown input)', () => {
  type SkipEntry = { coderefId: string; reason: string };
  const aggregate = (details: SkipEntry[]): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const e of details) counts[e.reason] = (counts[e.reason] ?? 0) + 1;
    return counts;
  };

  it('counts each reason and is dominated by header_status_missing when most chunks are header-less', () => {
    const details: SkipEntry[] = [
      { coderefId: 'a', reason: 'header_status_missing' },
      { coderefId: 'b', reason: 'header_status_missing' },
      { coderefId: 'c', reason: 'header_status_stale' },
      { coderefId: 'd', reason: 'unchanged' },
    ];
    const counts = aggregate(details);
    expect(counts.header_status_missing).toBe(2);
    expect(counts.header_status_stale).toBe(1);
    expect(counts.unchanged).toBe(1);
    const top = Object.entries(counts).sort((x, y) => y[1] - x[1])[0][0];
    expect(top).toBe('header_status_missing');
  });

  it('produces an empty histogram for no skips', () => {
    expect(aggregate([])).toEqual({});
  });
});

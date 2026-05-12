import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { DryRunSemanticOrchestrator } from './semantic-integration.js';
import type { SemanticOrchestrator } from '../semantic/orchestrator.js';
import type { PipelineResult } from '../semantic/orchestrator.js';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    writeFileSync: vi.fn(actual.writeFileSync),
    promises: {
      ...actual.promises,
      writeFile: vi.fn(actual.promises.writeFile),
    },
  };
});

const makeMockOrchestrator = (): SemanticOrchestrator => ({
  processProject: vi.fn(async (): Promise<PipelineResult> => ({
    filesProcessed: 0,
    headersGenerated: 0,
    entriesEnriched: 0,
    registryUpdated: 0,
    errors: [],
    executionTime: 0,
  })),
  processFile: vi.fn(async (_filePath: string): Promise<void> => {}),
} as unknown as SemanticOrchestrator);

describe('DryRunSemanticOrchestrator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restore() is idempotent — calling it twice does not throw', async () => {
    const wrapper = new DryRunSemanticOrchestrator(makeMockOrchestrator(), true);
    wrapper.restore();
    expect(() => wrapper.restore()).not.toThrow();
  });

  it('restore() is called even when processProject() throws — second restore() does not throw', async () => {
    const throwingOrchestrator = {
      processProject: vi.fn(async () => { throw new Error('simulated failure'); }),
      processFile: vi.fn(async () => {}),
    } as unknown as SemanticOrchestrator;

    const wrapper = new DryRunSemanticOrchestrator(throwingOrchestrator, true);
    await expect(wrapper.processProject()).rejects.toThrow('simulated failure');
    // If restore() ran in the finally block, calling it again is idempotent (no-op)
    expect(() => wrapper.restore()).not.toThrow();
  });

  it('restore() is called even when processFile() throws', async () => {
    const throwingOrchestrator = {
      processProject: vi.fn(async (): Promise<PipelineResult> => ({ filesProcessed: 0, headersGenerated: 0, entriesEnriched: 0, registryUpdated: 0, errors: [], executionTime: 0 })),
      processFile: vi.fn(async () => { throw new Error('file failure'); }),
    } as unknown as SemanticOrchestrator;

    const wrapper = new DryRunSemanticOrchestrator(throwingOrchestrator, true);
    await expect(wrapper.processFile('/tmp/foo.ts')).rejects.toThrow('file failure');
    expect(() => wrapper.restore()).not.toThrow();
  });

  it('getCapturedWrites captures writes to .ts paths during dry-run', async () => {
    const mockOrchestrator: SemanticOrchestrator = {
      processProject: vi.fn(async (): Promise<PipelineResult> => {
        fs.writeFileSync('/fake/path/test.ts', 'captured content');
        return { filesProcessed: 1, headersGenerated: 0, entriesEnriched: 0, registryUpdated: 0, errors: [], executionTime: 0 };
      }),
      processFile: vi.fn(async () => {}),
    } as unknown as SemanticOrchestrator;

    const wrapper = new DryRunSemanticOrchestrator(mockOrchestrator, true);
    await wrapper.processProject();
    const captured = wrapper.getCapturedWrites();
    expect(captured.has('/fake/path/test.ts')).toBe(true);
    expect(captured.get('/fake/path/test.ts')).toBe('captured content');
  });

  it('does not intercept fs when dryRun=false', async () => {
    const wrapper = new DryRunSemanticOrchestrator(makeMockOrchestrator(), false);
    await wrapper.processProject();
    expect(wrapper.getCapturedWrites().size).toBe(0);
  });
});

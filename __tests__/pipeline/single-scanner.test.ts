import { describe, expect, it, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { RegistryGenerator } from '../../src/pipeline/generators/registry-generator.js';
import { SemanticOrchestrator } from '../../src/semantic/orchestrator.js';
import { ASTExtractor } from '../../src/semantic/ast-extractor.js';
import type { PipelineState } from '../../src/pipeline/types.js';

function createState(): PipelineState {
  return {
    projectPath: 'C:/repo',
    files: new Map([['ts', ['C:/repo/src/alpha.ts']]]),
    elements: [
      {
        type: 'function',
        name: 'alpha',
        file: 'C:/repo/src/alpha.ts',
        line: 1,
        exported: true,
        headerStatus: 'missing',
      },
    ],
    imports: [],
    calls: [],
    graph: {
      version: '1.0.0',
      exportedAt: 0,
      nodes: [],
      edges: [],
      statistics: { nodeCount: 0, edgeCount: 0, edgesByType: {}, densityRatio: 0 },
    },
    sources: new Map([['C:/repo/src/alpha.ts', 'export function alpha() {}\n']]),
    options: {},
    metadata: {
      startTime: 0,
      endTime: 1,
      filesScanned: 1,
      elementsExtracted: 1,
      relationshipsExtracted: 0,
    },
  };
}

describe('single scanner semantic path', () => {
  it('builds semantic registry projection from PipelineState without ASTExtractor.extractDirectory', async () => {
    const extractDirectory = vi.spyOn(ASTExtractor.prototype, 'extractDirectory');
    const state = createState();

    const orchestrator = new SemanticOrchestrator({
      projectDir: 'C:/repo',
      outputDir: 'C:/repo/.coderef',
      registryPath: 'C:/repo/.coderef/semantic-registry.json',
      generateHeaders: false,
      syncRegistry: false,
      pipelineState: state,
    });

    const result = await orchestrator.processProject();

    expect(result.filesProcessed).toBe(1);
    expect(extractDirectory).not.toHaveBeenCalled();
    extractDirectory.mockRestore();
  });

  it('registry generation consumes one PipelineState and preserves headerStatus', async () => {
    const state = createState();
    const generator = new RegistryGenerator();
    const outputDir = path.join('C:/tmp', `coderef-single-scanner-${Date.now()}`);

    try {
      await generator.generate(state, outputDir);

      const projection = JSON.parse(
        await fs.readFile(path.join(outputDir, 'semantic-registry.json'), 'utf-8'),
      );
      expect(projection.entries[0].headerStatus).toBe('missing');
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  });
});

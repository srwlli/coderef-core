import { describe, expect, it } from 'vitest';
import { attachFileImportsToElements, buildSemanticRelationships } from '../src/scanner/semantic-analyzer.js';
import { createSemanticRegistryProjection } from '../src/semantic/projections.js';
import { createCodeRefId, normalizeProjectPath } from '../src/utils/coderef-id.js';
import { buildSemanticElementsFromState } from '../src/pipeline/semantic-elements.js';
import type { ElementData } from '../src/types/types.js';
import type { PipelineState } from '../src/pipeline/types.js';

describe('canonical semantic model', () => {
  const projectPath = 'C:/repo';

  it('generates CodeRef IDs with and without line anchors', () => {
    const element: ElementData = {
      type: 'function',
      name: 'alpha',
      file: 'C:/repo/src/alpha.ts',
      line: 12,
    };

    expect(createCodeRefId(element, projectPath)).toBe('@Fn/src/alpha.ts#alpha:12');
    expect(createCodeRefId(element, projectPath, { includeLine: false })).toBe('@Fn/src/alpha.ts#alpha');
  });

  it('normalizes Windows paths to project-relative POSIX paths', () => {
    expect(normalizeProjectPath('C:/repo', 'C:\\repo\\src\\alpha.ts')).toBe('src/alpha.ts');
  });

  it('computes usedBy as true reverse dependency', () => {
    const elements: ElementData[] = [
      {
        type: 'function',
        name: 'alpha',
        file: 'src/alpha.ts',
        line: 1,
        exported: true,
        imports: [{ source: './beta', specifiers: ['beta'], line: 1 }],
      },
      {
        type: 'function',
        name: 'beta',
        file: 'src/beta.ts',
        line: 1,
        exported: true,
      },
    ];

    const enriched = buildSemanticRelationships(elements, projectPath);
    const alpha = enriched.find(element => element.name === 'alpha');
    const beta = enriched.find(element => element.name === 'beta');

    expect(alpha?.usedBy).toEqual([]);
    expect(beta?.usedBy).toEqual([{ file: 'src/alpha.ts', imports: ['beta'], line: 1 }]);
  });

  it('attaches pipeline-level file imports before semantic relationship projection', () => {
    const elements: ElementData[] = [
      { type: 'function', name: 'alpha', file: 'C:/repo/src/alpha.ts', line: 2, exported: true },
      { type: 'function', name: 'beta', file: 'C:/repo/src/beta.ts', line: 1, exported: true },
    ];

    const withImports = attachFileImportsToElements(elements, [
      {
        sourceFile: 'C:/repo/src/alpha.ts',
        target: './beta',
        specifiers: ['beta'],
        line: 1,
      },
    ], projectPath);

    const enriched = buildSemanticRelationships(withImports, projectPath);
    expect(enriched.find(element => element.name === 'alpha')?.imports).toEqual([
      { source: './beta', specifiers: ['beta'], line: 1 },
    ]);
    expect(enriched.find(element => element.name === 'beta')?.usedBy).toEqual([
      { file: 'src/alpha.ts', imports: ['beta'], line: 1 },
    ]);
  });

  it('builds canonical semantic elements from PipelineState imports', () => {
    const state = {
      projectPath,
      files: new Map(),
      elements: [
        { type: 'function', name: 'alpha', file: 'C:/repo/src/alpha.ts', line: 2, exported: true },
        { type: 'function', name: 'beta', file: 'C:/repo/src/beta.ts', line: 1, exported: true },
      ],
      imports: [
        {
          sourceFile: 'C:/repo/src/alpha.ts',
          target: './beta',
          specifiers: ['beta'],
          line: 1,
        },
      ],
      calls: [],
      graph: { version: '1.0.0', exportedAt: 0, nodes: [], edges: [], statistics: { nodeCount: 0, edgeCount: 0, edgesByType: {}, densityRatio: 0 } },
      sources: new Map(),
      options: {},
      metadata: { startTime: 0, filesScanned: 0, elementsExtracted: 2, relationshipsExtracted: 1 },
    } satisfies PipelineState;

    const semanticElements = buildSemanticElementsFromState(state);
    expect(semanticElements.find(element => element.name === 'alpha')?.imports).toEqual([
      { source: './beta', specifiers: ['beta'], line: 1 },
    ]);
    expect(semanticElements.find(element => element.name === 'beta')?.usedBy).toEqual([
      { file: 'src/alpha.ts', imports: ['beta'], line: 1 },
    ]);
  });

  it('projects semantic-registry entries from canonical ElementData', () => {
    const projection = createSemanticRegistryProjection([
      {
        type: 'function',
        name: 'alpha',
        file: 'src/alpha.ts',
        line: 1,
        codeRefId: '@Fn/src/alpha.ts#alpha:1',
        codeRefIdNoLine: '@Fn/src/alpha.ts#alpha',
        exports: [{ name: 'alpha', type: 'named', target: 'src/alpha.ts' }],
        usedBy: [],
        related: [],
        rules: [],
      },
    ]);

    expect(projection.generated_from).toBe('.coderef/index.json');
    expect(projection.entries[0]).toMatchObject({
      id: '@Fn/src/alpha.ts#alpha:1',
      codeRefId: '@Fn/src/alpha.ts#alpha:1',
      codeRefIdNoLine: '@Fn/src/alpha.ts#alpha',
    });
  });
});

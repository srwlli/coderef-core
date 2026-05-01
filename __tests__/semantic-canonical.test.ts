import { describe, expect, it } from 'vitest';
import { buildSemanticRelationships } from '../src/scanner/semantic-analyzer.js';
import { createSemanticRegistryProjection } from '../src/semantic/projections.js';
import { createCodeRefId, normalizeProjectPath } from '../src/utils/coderef-id.js';
import type { ElementData } from '../src/types/types.js';

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


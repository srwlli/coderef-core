/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability semantic-registry-v2-dedup-test
 */

import { describe, expect, it } from 'vitest';
import { createSemanticRegistryProjection } from '../src/semantic/projections.js';
import type { ElementData } from '../src/types/types.js';

// Registry 2.0.0 (WO-REGISTRY-RAWFACTS-DEDUP-001, operator ruling A):
// file-grain rawFacts live ONCE in a top-level rawFactsByFile map instead
// of being duplicated onto every element of the file (98% of bytes on
// large repos; 124MB self-scan / 209MB PS observed under 1.x).

const elements: ElementData[] = [
  { type: 'function', name: 'a1', file: 'src/a.ts', line: 1 },
  { type: 'function', name: 'a2', file: 'src/a.ts', line: 9 },
  { type: 'function', name: 'b1', file: 'src/b.ts', line: 1 },
];

const bundle = {
  rawImports: [
    { sourceElementId: null, sourceFile: 'src/a.ts', moduleSpecifier: './x', specifiers: [], defaultImport: null, namespaceImport: null, typeOnly: false, dynamic: false, line: 1 },
  ],
  rawCalls: [
    { sourceElementCandidate: null, sourceFile: 'src/b.ts', callExpressionText: 'go()', calleeName: 'go', receiverText: null, scopePath: [], line: 2, language: 'ts' },
  ],
  rawExports: [],
  headerImportFacts: [],
} as any;

describe('semantic-registry 2.0.0 rawFacts dedup', () => {
  it('bumps the projection version to 2.0.0', () => {
    const p = createSemanticRegistryProjection(elements, '/proj', bundle);
    expect(p.version).toBe('2.0.0');
  });

  it('entries carry NO per-element rawFacts', () => {
    const p = createSemanticRegistryProjection(elements, '/proj', bundle);
    for (const e of p.entries) {
      expect((e as any).rawFacts).toBeUndefined();
    }
  });

  it('rawFactsByFile holds each file-grain bundle exactly once, keyed by file', () => {
    const p = createSemanticRegistryProjection(elements, '/proj', bundle) as any;
    expect(p.rawFactsByFile).toBeDefined();
    expect(Object.keys(p.rawFactsByFile).sort()).toEqual(['src/a.ts', 'src/b.ts']);
    expect(p.rawFactsByFile['src/a.ts'].imports).toHaveLength(1);
    expect(p.rawFactsByFile['src/a.ts'].calls).toHaveLength(0);
    expect(p.rawFactsByFile['src/b.ts'].calls).toHaveLength(1);
  });

  it('omits rawFactsByFile entirely when the bundle is empty', () => {
    const p = createSemanticRegistryProjection(elements, '/proj') as any;
    expect(p.rawFactsByFile).toBeUndefined();
    expect(p.version).toBe('2.0.0');
  });
});

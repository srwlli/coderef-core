import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseHeader } from '../../src/pipeline/semantic-header-parser.js';
import { isValidLayer, loadLayerEnum, resolveLayersPath } from '../../src/pipeline/element-taxonomy.js';

const tmp: string[] = [];

afterEach(async () => {
  await Promise.all(tmp.splice(0).map(p => fs.rm(p, { recursive: true, force: true }).catch(() => {})));
  delete process.env.CODEREF_LAYERS_PATH;
});

function fixture(layer: string): string {
  return [
    '/**',
    ' * @coderef-semantic:1.0.0',
    ` * @layer ${layer}`,
    ' * @capability foo',
    ' * @exports x',
    ' * @imports []',
    ' * @generated 2026-05-03T00:00:00Z',
    ' */',
    'export const x = 1;',
    '',
  ].join('\n');
}

describe('Phase 2.5 layer runtime validation INVARIANT (AC-02)', () => {
  it('rejects @layer values not in STANDARDS/layers.json', () => {
    const result = parseHeader(fixture('not_a_real_layer'), 'sample.ts');
    expect(result.headerStatus).toBe('partial');
    expect(result.headerFact.layer).toBeUndefined();
    expect(result.headerFact.parseErrors?.some(e => e.tag === '@layer')).toBe(true);
  });

  it('accepts every value currently in STANDARDS/layers.json', () => {
    const layers = loadLayerEnum(resolveLayersPath());
    expect(layers.length).toBeGreaterThan(0);
    for (const layer of layers) {
      const result = parseHeader(fixture(layer), 'sample.ts');
      expect(result.headerFact.layer).toBe(layer);
      expect(result.headerStatus).toBe('defined');
    }
  });

  it('fails closed when layers.json drift removes a previously-valid layer (mocked path)', async () => {
    // Write a stripped-down layers.json that omits 'utility'. We exercise
    // the isValidLayer/loadLayerEnum path directly with an explicit
    // layersPath rather than mutating the cache via env, because the cache
    // key is the resolveLayersPath() return rather than the path actually
    // used to populate it. Passing layersPath explicitly is the contract
    // for runtime injection.
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-layers-drift-'));
    tmp.push(dir);
    const driftPath = path.join(dir, 'layers.json');
    await fs.writeFile(
      driftPath,
      JSON.stringify({
        layers: [
          { id: 'service' },
          { id: 'api' },
        ],
      }),
      'utf-8',
    );
    const drifted = loadLayerEnum(driftPath);
    expect(drifted).not.toContain('utility');
    expect(isValidLayer('service', driftPath)).toBe(true);
    expect(isValidLayer('utility', driftPath)).toBe(false);
    expect(isValidLayer('not_a_real_layer', driftPath)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { parseHeader } from '../../src/pipeline/semantic-header-parser.js';

const validHeader = [
  '/**',
  ' * @coderef-semantic:1.0.0',
  ' * @layer utility',
  ' * @capability foo-bar',
  ' * @exports x',
  ' * @imports []',
  ' * @generated 2026-05-03T00:00:00Z',
  ' */',
  'export const x = 1;',
  '',
].join('\n');

const malformedHeader = [
  '/**',
  ' * @coderef-semantic:1.0.0',
  ' * @layer not_a_real_layer',
  ' * @capability foo-bar',
  ' * @exports x',
  ' * @imports []',
  ' * @generated 2026-05-03T00:00:00Z',
  ' */',
  'export const x = 1;',
  '',
].join('\n');

describe('Phase 2.5 headerStatus state transitions (AC-06, AC-07)', () => {
  it('valid header -> defined', () => {
    const r = parseHeader(validHeader, 'a.ts');
    expect(r.headerStatus).toBe('defined');
    expect(r.headerFact.parseErrors).toBeUndefined();
  });

  it('header missing -> headerStatus=missing, empty HeaderFact, no parseErrors', () => {
    const r = parseHeader('export const x = 1;\n', 'a.ts');
    expect(r.headerStatus).toBe('missing');
    expect(r.headerFact.layer).toBeUndefined();
    expect(r.headerFact.capability).toBeUndefined();
    expect(r.headerFact.parseErrors).toBeUndefined();
  });

  it('malformed header -> partial with structured parseError naming the bad tag', () => {
    const r = parseHeader(malformedHeader, 'a.ts');
    expect(r.headerStatus).toBe('partial');
    expect(r.headerFact.parseErrors).toBeDefined();
    const layerError = r.headerFact.parseErrors!.find(e => e.tag === '@layer');
    expect(layerError).toBeDefined();
    expect(layerError!.message).toContain('not_a_real_layer');
  });
});

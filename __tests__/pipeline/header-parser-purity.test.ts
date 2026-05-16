import { describe, expect, it } from 'vitest';
import { parseHeader } from '../../src/pipeline/semantic-header-parser.js';

const fixtures = [
  {
    name: 'fully-defined',
    src: [
      '/**',
      ' * @coderef-semantic:1.0.0',
      ' * @layer service',
      ' * @capability orchestration',
      ' * @constraint ["transaction-safe"]',
      ' * @exports DispatchService',
      ' * @imports ["orchestrator:Agent"]',
      ' * @generated 2026-04-29T14:22:00Z',
      ' */',
      'export class DispatchService {}',
      '',
    ].join('\n'),
  },
  {
    name: 'partial-malformed',
    src: [
      '',
      'export const x = 1;',
      '',
    ].join('\n'),
  },
  {
    name: 'no-header',
    src: 'export const x = 1;\n',
  },
];

describe('Phase 2.5 parser purity + idempotency INVARIANT (AC-09, AC-10)', () => {
  it('idempotent: 100 invocations on the same input produce deep-equal output', () => {
    for (const f of fixtures) {
      const baseline = parseHeader(f.src, 'sample.ts');
      const baselineStr = JSON.stringify(baseline);
      for (let i = 0; i < 100; i++) {
        const next = parseHeader(f.src, 'sample.ts');
        expect(JSON.stringify(next)).toBe(baselineStr);
      }
    }
  });

  it('does not mutate the input string (Object.freeze test)', () => {
    for (const f of fixtures) {
      const frozen = Object.freeze(f.src);
      // Should not throw — parser must not attempt to mutate the input.
      expect(() => parseHeader(frozen, 'sample.ts')).not.toThrow();
      // Reference identity: input string is unchanged.
      expect(frozen).toBe(f.src);
    }
  });

  it('produces structurally identical output for the same input twice in a row', () => {
    for (const f of fixtures) {
      const a = parseHeader(f.src, 'sample.ts');
      const b = parseHeader(f.src, 'sample.ts');
      expect(b).toEqual(a);
    }
  });
});

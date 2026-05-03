import { describe, expect, it } from 'vitest';
import { parseHeader } from '../../src/pipeline/semantic-header-parser.js';

function header(fields: { capability?: string; constraint?: string; generated?: string }): string {
  const lines = [
    '/**',
    ' * @coderef-semantic:1.0.0',
    ' * @layer utility',
    ` * @capability ${fields.capability ?? 'foo-bar'}`,
  ];
  if (fields.constraint !== undefined) {
    lines.push(` * @constraint ${fields.constraint}`);
  }
  lines.push(' * @exports x');
  lines.push(' * @imports []');
  lines.push(` * @generated ${fields.generated ?? '2026-05-03T00:00:00Z'}`);
  lines.push(' */');
  lines.push('export const x = 1;');
  lines.push('');
  return lines.join('\n');
}

describe('Phase 2.5 tag validation (AC-03, AC-04, AC-08)', () => {
  describe('@capability kebab-case', () => {
    it('accepts kebab-case', () => {
      const r = parseHeader(header({ capability: 'pipeline-orchestration' }), 'a.ts');
      expect(r.headerFact.capability).toBe('pipeline-orchestration');
      expect(r.headerStatus).toBe('defined');
    });

    it('rejects camelCase', () => {
      const r = parseHeader(header({ capability: 'pipelineOrchestration' }), 'a.ts');
      expect(r.headerFact.capability).toBeUndefined();
      expect(r.headerStatus).toBe('partial');
      expect(r.headerFact.parseErrors?.some(e => e.tag === '@capability')).toBe(true);
    });
  });

  describe('@constraint JSON array of kebab-case', () => {
    it('accepts well-formed array', () => {
      const r = parseHeader(header({ constraint: '["idempotent", "pure-function"]' }), 'a.ts');
      expect(r.headerFact.constraints).toEqual(['idempotent', 'pure-function']);
      expect(r.headerStatus).toBe('defined');
    });

    it('rejects malformed JSON', () => {
      const r = parseHeader(header({ constraint: 'not-json' }), 'a.ts');
      expect(r.headerFact.constraints).toBeUndefined();
      expect(r.headerStatus).toBe('partial');
      expect(r.headerFact.parseErrors?.some(e => e.tag === '@constraint')).toBe(true);
    });

    it('rejects non-kebab items but keeps the kebab ones', () => {
      const r = parseHeader(header({ constraint: '["idempotent", "BadCase"]' }), 'a.ts');
      expect(r.headerFact.constraints).toEqual(['idempotent']);
      expect(r.headerStatus).toBe('partial');
      expect(
        r.headerFact.parseErrors?.some(e => e.tag === '@constraint' && /BadCase/.test(e.message)),
      ).toBe(true);
    });
  });

  describe('@generated ISO 8601', () => {
    it('accepts canonical UTC stamp', () => {
      const r = parseHeader(header({ generated: '2026-05-03T02:00:00Z' }), 'a.ts');
      expect(r.headerFact.generated).toBe('2026-05-03T02:00:00Z');
      expect(r.headerStatus).toBe('defined');
    });

    it('rejects free-form text', () => {
      const r = parseHeader(header({ generated: 'today' }), 'a.ts');
      expect(r.headerFact.generated).toBeUndefined();
      expect(r.headerStatus).toBe('partial');
      expect(r.headerFact.parseErrors?.some(e => e.tag === '@generated')).toBe(true);
    });
  });
});

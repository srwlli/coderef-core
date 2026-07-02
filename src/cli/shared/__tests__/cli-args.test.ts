/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability shared-cli-flag-parsing-tests
 */

import { describe, expect, it } from 'vitest';
import { parseFlags } from '../cli-args.js';

const SPEC = {
  'top-k': { kind: 'int' as const, aliases: ['-k'] },
  'min-score': { kind: 'float' as const },
  lang: { kind: 'string' as const, aliases: ['-l'] },
  json: { kind: 'boolean' as const, aliases: ['-j'] },
};

describe('parseFlags (P2-18)', () => {
  it('accepts --flag value form', () => {
    const r = parseFlags(['--top-k', '5', '--lang', 'ts'], SPEC);
    expect(r.errors).toEqual([]);
    expect(r.values.get('top-k')).toBe(5);
    expect(r.values.get('lang')).toBe('ts');
  });

  it('accepts --flag=value form for EVERY value flag (the old bug)', () => {
    // Previously --top-k=5 matched the key but read the NEXT token as its
    // value, silently swallowing --json.
    const r = parseFlags(['--top-k=5', '--min-score=0.7', '--lang=ts', '--json'], SPEC);
    expect(r.errors).toEqual([]);
    expect(r.values.get('top-k')).toBe(5);
    expect(r.values.get('min-score')).toBeCloseTo(0.7);
    expect(r.values.get('lang')).toBe('ts');
    expect(r.values.get('json')).toBe(true);
  });

  it('aliases behave like their canonical flag, in both forms', () => {
    expect(parseFlags(['-k', '3'], SPEC).values.get('top-k')).toBe(3);
    expect(parseFlags(['-j'], SPEC).values.get('json')).toBe(true);
  });

  it('rejects non-numeric values for numeric flags instead of NaN', () => {
    const r = parseFlags(['--top-k', 'lots'], SPEC);
    expect(r.values.has('top-k')).toBe(false);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatch(/expects a number/);
  });

  it('reports unknown flags instead of silently ignoring them', () => {
    const r = parseFlags(['--top-kk', '5'], SPEC);
    expect(r.errors[0]).toMatch(/Unknown flag: --top-kk/);
    // the dangling '5' becomes a positional, not a swallowed value
    expect(r.positionals).toEqual(['5']);
  });

  it('reports a value flag at end of argv with no value', () => {
    const r = parseFlags(['--lang'], SPEC);
    expect(r.errors[0]).toMatch(/expects a value/);
  });

  it('collects positionals', () => {
    const r = parseFlags(['how does auth work', '--top-k=2'], SPEC);
    expect(r.positionals).toEqual(['how does auth work']);
    expect(r.values.get('top-k')).toBe(2);
  });

  it('boolean --flag=false is honored', () => {
    const r = parseFlags(['--json=false'], SPEC);
    expect(r.values.get('json')).toBe(false);
  });
});

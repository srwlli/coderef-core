/**
 * Phase 6 — output-validation-chokepoint INVARIANT (R-PHASE-6-A).
 *
 * Asserts validatePipelineState is the SOLE validation chokepoint in
 * populate.ts. Three structural invariants — drift here means a refactor
 * has reintroduced a bypass path:
 *   (1) `validatePipelineState(` appears exactly once in populate.ts
 *   (2) the call site is BEFORE the generators array is constructed
 *   (3) on validation.ok=false, populate exits before invoking generators
 *       (the `if (!validation.ok)` block contains a `process.exit(`)
 *
 * Comments are stripped before regex matching to avoid false positives in
 * JSDoc preambles.
 */

import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

const POPULATE_PATH = path.resolve(__dirname, '..', '..', 'src', 'cli', 'populate.ts');

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('Phase 6 R-PHASE-6-A: validatePipelineState is the sole chokepoint', () => {
  const raw = fs.readFileSync(POPULATE_PATH, 'utf-8');
  const code = stripComments(raw);

  it('validatePipelineState is invoked exactly once', () => {
    const matches = code.match(/validatePipelineState\s*\(/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('call site precedes the generators array construction', () => {
    const validateIdx = code.indexOf('validatePipelineState(');
    const generatorsIdx = code.search(/generators\s*:\s*GeneratorRunner\[\]\s*=\s*\[/);
    expect(validateIdx).toBeGreaterThan(0);
    expect(generatorsIdx).toBeGreaterThan(0);
    expect(validateIdx).toBeLessThan(generatorsIdx);
  });

  it('validation.ok=false triggers process.exit before generators run', () => {
    // The block `if (!validation.ok) { ... process.exit(...) }` must exist
    // and must appear before the generators array. Use a non-greedy match
    // anchored on the validation.ok check.
    const guard = code.match(/if\s*\(\s*!\s*validation\.ok\s*\)[\s\S]*?process\.exit\s*\(/);
    expect(guard).not.toBeNull();
    const guardIdx = code.indexOf('if (!validation.ok)');
    const generatorsIdx = code.search(/generators\s*:\s*GeneratorRunner\[\]\s*=\s*\[/);
    expect(guardIdx).toBeGreaterThan(0);
    expect(guardIdx).toBeLessThan(generatorsIdx);
  });
});

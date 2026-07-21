import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { ComplexityGenerator } from '../../src/pipeline/generators/complexity-generator.js';
import { cleanupEnvironment, createMockEnvironment, readJson } from './helpers.js';

describe('ComplexityGenerator', () => {
  const created: string[] = [];

  afterEach(async () => {
    await Promise.all(created.splice(0).map(dir => cleanupEnvironment(dir)));
  });

  it('writes complexity summary with loc and parameter counts', async () => {
    const env = await createMockEnvironment();
    created.push(env.projectDir);

    await new ComplexityGenerator().generate(env.state, env.outputDir);

    const output = await readJson<any>(path.join(env.outputDir, 'reports', 'complexity', 'summary.json'));
    const alpha = output.elements.find((item: any) => item.element === 'alpha');

    expect(output.totalElements).toBe(4);
    expect(alpha.parameters).toBe(2);
    expect(alpha.loc).toBeGreaterThan(0);
    expect(alpha.complexity).toBeGreaterThan(1);
    // No persisted AST metrics in the mock -> disclosed fallback provenance.
    expect(alpha.metric_source).toBe('estimated');
    expect(alpha.cognitive).toBeUndefined();
  });

  it('prefers persisted AST metrics + endLine span over the regex/next-element estimates (IMP-CORE-003, P2)', async () => {
    const env = await createMockEnvironment();
    created.push(env.projectDir);

    const alphaElem = env.state.elements.find(e => e.name === 'alpha')!;
    // alpha's file source is full of regex-countable tokens (if/&&/try/catch/?)
    // — the persisted values must win anyway.
    alphaElem.complexity = { cyclomatic: 7, nestingDepth: 2, cognitive: 9 };
    alphaElem.endLine = 13; // real span: lines 4..13 -> LOC 10

    await new ComplexityGenerator().generate(env.state, env.outputDir);

    const output = await readJson<any>(path.join(env.outputDir, 'reports', 'complexity', 'summary.json'));
    const alpha = output.elements.find((item: any) => item.element === 'alpha');
    const beta = output.elements.find((item: any) => item.element === 'beta');

    expect(alpha.complexity).toBe(7); // persisted, NOT the regex count
    expect(alpha.loc).toBe(10); // endLine - line + 1, NOT next-element estimate
    expect(alpha.cognitive).toBe(9);
    expect(alpha.nestingDepth).toBe(2);
    expect(alpha.metric_source).toBe('ast');
    // untouched sibling stays on the disclosed fallback path
    expect(beta.metric_source).toBe('estimated');
    expect(beta.cognitive).toBeUndefined();
  });
});

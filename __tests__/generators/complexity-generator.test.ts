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
  });
});

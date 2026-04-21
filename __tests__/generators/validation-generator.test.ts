import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { ValidationGenerator } from '../../src/pipeline/generators/validation-generator.js';
import { cleanupEnvironment, createMockEnvironment, readJson } from './helpers.js';

describe('ValidationGenerator', () => {
  const created: string[] = [];

  afterEach(async () => {
    await Promise.all(created.splice(0).map(dir => cleanupEnvironment(dir)));
  });

  it('reports broken @coderef references from source content', async () => {
    const env = await createMockEnvironment();
    created.push(env.projectDir);

    await new ValidationGenerator().generate(env.state, env.outputDir);

    const output = await readJson<any>(path.join(env.outputDir, 'reports', 'validation.json'));

    expect(output.totalReferences).toBe(2);
    expect(output.validReferences).toBe(1);
    expect(output.brokenReferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'src/example.ts',
          reference: '@coderef{src/example.ts:missing}',
        }),
      ])
    );
  });
});

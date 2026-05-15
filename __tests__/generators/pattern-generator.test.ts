import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PatternGenerator } from '../../src/pipeline/generators/pattern-generator.js';
import { cleanupEnvironment, createMockEnvironment, readJson } from './helpers.js';

describe('PatternGenerator', () => {
  const created: string[] = [];

  afterEach(async () => {
    await Promise.all(created.splice(0).map(dir => cleanupEnvironment(dir)));
  });

  it('detects decorators, async functions, error handling, and test gaps', async () => {
    const env = await createMockEnvironment();
    created.push(env.projectDir);

    await new PatternGenerator().generate(env.state, env.outputDir);

    const output = await readJson<any>(path.join(env.outputDir, 'reports', 'patterns.json'));

    expect(output.decorators).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'alpha', decorator: 'logged' }),
      ])
    );
    expect(output.asyncPatterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'alpha' }),
      ])
    );
    expect(output.errorHandling).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: 'src/index.ts', pattern: 'try-catch' }),
      ])
    );
    expect(output.testGaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'beta' }),
      ])
    );
  });
});

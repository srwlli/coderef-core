import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { CoverageGenerator } from '../../src/pipeline/generators/coverage-generator.js';
import { cleanupEnvironment, createMockEnvironment, readJson } from './helpers.js';

describe('CoverageGenerator', () => {
  const created: string[] = [];

  afterEach(async () => {
    await Promise.all(created.splice(0).map(dir => cleanupEnvironment(dir)));
  });

  it('matches implementation files to tests and reports untested files', async () => {
    const env = await createMockEnvironment();
    created.push(env.projectDir);

    await new CoverageGenerator().generate(env.state, env.outputDir);

    const output = await readJson<any>(path.join(env.outputDir, 'reports', 'coverage.json'));

    expect(output.summary.totalFiles).toBe(2);
    expect(output.summary.testedFiles).toBe(1);
    expect(output.untested).toContain('src/untested.ts');
    expect(output.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: 'src/example.ts', tested: true }),
      ])
    );
  });
});

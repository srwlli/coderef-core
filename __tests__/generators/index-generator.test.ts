import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { IndexGenerator } from '../../src/pipeline/generators/index-generator.js';
import { cleanupEnvironment, createMockEnvironment, readJson } from './helpers.js';

describe('IndexGenerator', () => {
  const created: string[] = [];

  afterEach(async () => {
    await Promise.all(created.splice(0).map(dir => cleanupEnvironment(dir)));
  });

  it('writes index.json with relative file paths', async () => {
    const env = await createMockEnvironment();
    created.push(env.projectDir);

    await new IndexGenerator().generate(env.state, env.outputDir);

    const indexFile = await readJson<any>(path.join(env.outputDir, 'index.json'));
    const output = Array.isArray(indexFile) ? indexFile : indexFile.elements;
    const alpha = output.find((item: any) => item.name === 'alpha');

    expect(output).toHaveLength(env.state.elements.length);
    expect(alpha.file).toBe('src/index.ts');
    expect(output.some(item => path.isAbsolute(item.file))).toBe(false);
  });
});

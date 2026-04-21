import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { ContextGenerator } from '../../src/pipeline/generators/context-generator.js';
import { cleanupEnvironment, createMockEnvironment, readJson, readText } from './helpers.js';

describe('ContextGenerator', () => {
  const created: string[] = [];

  afterEach(async () => {
    await Promise.all(created.splice(0).map(dir => cleanupEnvironment(dir)));
  });

  it('writes project context in JSON and Markdown', async () => {
    const env = await createMockEnvironment();
    created.push(env.projectDir);

    await new ContextGenerator().generate(env.state, env.outputDir);

    const jsonOutput = await readJson<any>(path.join(env.outputDir, 'context.json'));
    const markdownOutput = await readText(path.join(env.outputDir, 'context.md'));

    expect(jsonOutput.stats.totalFiles).toBe(4);
    expect(jsonOutput.stats.totalElements).toBe(4);
    expect(jsonOutput.entryPoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'index.ts', type: 'library' }),
        expect.objectContaining({ name: 'server.ts', type: 'server' }),
      ])
    );
    expect(markdownOutput).toContain('# Project Context');
    expect(markdownOutput).toContain('## Entry Points');
  });
});

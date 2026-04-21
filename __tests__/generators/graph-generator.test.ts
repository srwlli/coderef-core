import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { GraphGenerator } from '../../src/pipeline/generators/graph-generator.js';
import { cleanupEnvironment, createMockEnvironment, readJson } from './helpers.js';

describe('GraphGenerator', () => {
  const created: string[] = [];

  afterEach(async () => {
    await Promise.all(created.splice(0).map(dir => cleanupEnvironment(dir)));
  });

  it('writes graph.json with relative node and edge metadata paths', async () => {
    const env = await createMockEnvironment();
    created.push(env.projectDir);

    await new GraphGenerator().generate(env.state, env.outputDir);

    const output = await readJson<any>(path.join(env.outputDir, 'graph.json'));
    expect(output.version).toBe('1.0.0');
    expect(output.nodes[0].file).toBe('src/example.ts');
    expect(output.edges[0].metadata.file).toBe('src/example.ts');
    expect(output.statistics.nodeCount).toBe(3);
  });
});

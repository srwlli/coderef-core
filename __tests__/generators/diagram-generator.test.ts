import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { DiagramGenerator } from '../../src/pipeline/generators/diagram-generator.js';
import { cleanupEnvironment, createMockEnvironment, readText } from './helpers.js';

describe('DiagramGenerator', () => {
  const created: string[] = [];

  afterEach(async () => {
    await Promise.all(created.splice(0).map(dir => cleanupEnvironment(dir)));
  });

  it('writes Mermaid and DOT diagram files', async () => {
    const env = await createMockEnvironment();
    created.push(env.projectDir);

    await new DiagramGenerator().generate(env.state, env.outputDir);

    const diagramsDir = path.join(env.outputDir, 'diagrams');
    const dependencies = await readText(path.join(diagramsDir, 'dependencies.mmd'));
    const calls = await readText(path.join(diagramsDir, 'calls.mmd'));
    const imports = await readText(path.join(diagramsDir, 'imports.mmd'));
    const dot = await readText(path.join(diagramsDir, 'dependencies.dot'));

    expect(dependencies).toContain('graph TD');
    expect(calls).toContain('|calls|');
    expect(imports).toContain('|imports|');
    expect(dot).toContain('digraph Dependencies');
  });
});

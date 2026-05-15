import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { DiagramGenerator } from '../../src/pipeline/generators/diagram-generator.js';
import { ExportGenerator } from '../../src/pipeline/generators/export-generator.js';
import { cleanupEnvironment, createMockEnvironment, readJson, readText } from './helpers.js';

describe('ExportGenerator', () => {
  const created: string[] = [];

  afterEach(async () => {
    await Promise.all(created.splice(0).map(dir => cleanupEnvironment(dir)));
  });

  it('writes graph exports in JSON, JSON-LD, and wrapped Mermaid formats', async () => {
    const env = await createMockEnvironment();
    created.push(env.projectDir);

    await new DiagramGenerator().generate(env.state, env.outputDir);
    await new ExportGenerator().generate(env.state, env.outputDir);

    const exportsDir = path.join(env.outputDir, 'exports');
    const graph = await readJson<any>(path.join(exportsDir, 'graph.json'));
    const jsonld = await readJson<any>(path.join(exportsDir, 'graph.jsonld'));
    const wrapped = await readText(path.join(exportsDir, 'diagram-wrapped.md'));
    const dependencyDiagram = await readText(path.join(env.outputDir, 'diagrams', 'dependencies.mmd'));

    expect(graph.version).toBe('1.0.0');
    expect(graph.nodes[0].file).toBe('src/index.ts');
    expect(graph.edges[0].source).toBe('src/index.ts');
    expect(jsonld['@context']).toBeDefined();
    expect(wrapped).toContain('```mermaid');
    expect(wrapped).toContain('Dependency Diagram');
    expect(wrapped).toContain(dependencyDiagram.trim());
  });
});

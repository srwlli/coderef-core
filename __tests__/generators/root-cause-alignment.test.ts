import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';
import { ContextGenerator } from '../../src/pipeline/generators/context-generator.js';
import { ExportGenerator } from '../../src/pipeline/generators/export-generator.js';
import { GraphGenerator } from '../../src/pipeline/generators/graph-generator.js';
import type { PipelineState } from '../../src/pipeline/types.js';
import type { ElementData } from '../../src/types/types.js';
import { cleanupEnvironment, createMockEnvironment, readJson } from './helpers.js';

function isWindowsAbsolutePath(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z]:[\\/]/.test(value);
}

function countAbsoluteEdgeReferences(graph: { edges: Array<any> }): number {
  return graph.edges.filter(edge =>
    isWindowsAbsolutePath(edge.source) ||
    isWindowsAbsolutePath(edge.target) ||
    isWindowsAbsolutePath(edge.metadata?.file)
  ).length;
}

async function createContextDiagnosticEnvironment(
  functionCount = 40
): Promise<{
  projectDir: string;
  outputDir: string;
  state: PipelineState;
}> {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-context-diagnostic-'));
  const outputDir = path.join(projectDir, '.coderef');
  const srcDir = path.join(projectDir, 'src');
  const exampleFile = path.join(srcDir, 'module.ts');

  await fs.mkdir(srcDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(exampleFile, 'export const sentinel = true;\n', 'utf-8');

  const elements: ElementData[] = Array.from({ length: functionCount }, (_, index) => ({
    type: 'function',
    name: `fn${index}`,
    file: exampleFile,
    line: index + 1,
    exported: true,
    parameters: Array.from({ length: 10 }, (_, parameterIndex) => ({
      name: `arg${parameterIndex}`,
      type: 'string',
    })),
  }));

  const edges: ExportedGraph['edges'] = Array.from({ length: functionCount }, (_, index) => ({
    source: `caller${index}`,
    target: `fn${index}`,
    type: 'calls',
    metadata: {
      file: exampleFile,
      line: index + 1,
    },
  }));

  const state: PipelineState = {
    projectPath: projectDir,
    files: new Map([['ts', [exampleFile]]]),
    elements,
    graph: {
      version: '1.0.0',
      exportedAt: Date.now(),
      nodes: elements.map(element => ({
        id: `${exampleFile}:${element.name}`,
        type: element.type,
        name: element.name,
        file: element.file,
        line: element.line,
      })),
      edges,
      statistics: {
        nodeCount: elements.length,
        edgeCount: edges.length,
        edgesByType: { calls: edges.length },
        densityRatio: 0,
      },
    },
    sources: new Map([[exampleFile, 'export const sentinel = true;\n']]),
    options: { verbose: false },
    metadata: {
      startTime: Date.now() - 100,
      endTime: Date.now(),
      filesScanned: 1,
      elementsExtracted: elements.length,
      relationshipsExtracted: edges.length,
    },
  };

  return { projectDir, outputDir, state };
}

async function createDuplicateNameEnvironment(): Promise<{
  projectDir: string;
  outputDir: string;
  state: PipelineState;
}> {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-duplicate-name-'));
  const outputDir = path.join(projectDir, '.coderef');
  const srcDir = path.join(projectDir, 'src');
  const firstFile = path.join(srcDir, 'alpha.ts');
  const secondFile = path.join(srcDir, 'beta.ts');

  await fs.mkdir(srcDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(firstFile, 'export function duplicate() {}\n', 'utf-8'),
    fs.writeFile(secondFile, 'export function duplicate() {}\n', 'utf-8'),
  ]);

  const elements: ElementData[] = [
    {
      type: 'function',
      name: 'duplicate',
      file: firstFile,
      line: 1,
      exported: true,
      parameters: Array.from({ length: 10 }, (_, index) => ({
        name: `arg${index}`,
        type: 'string',
      })),
    },
    {
      type: 'function',
      name: 'duplicate',
      file: secondFile,
      line: 1,
      exported: true,
      parameters: Array.from({ length: 10 }, (_, index) => ({
        name: `arg${index}`,
        type: 'string',
      })),
    },
  ];

  const state: PipelineState = {
    projectPath: projectDir,
    files: new Map([['ts', [firstFile, secondFile]]]),
    elements,
    graph: {
      version: '1.0.0',
      exportedAt: Date.now(),
      nodes: [
        {
          id: `${firstFile}:duplicate`,
          type: 'function',
          name: 'duplicate',
          file: firstFile,
          line: 1,
        },
        {
          id: `${secondFile}:duplicate`,
          type: 'function',
          name: 'duplicate',
          file: secondFile,
          line: 1,
        },
      ],
      edges: [
        {
          source: 'callerOne',
          target: 'duplicate',
          type: 'calls',
          metadata: {
            file: firstFile,
            line: 1,
          },
        },
      ],
      statistics: {
        nodeCount: 2,
        edgeCount: 1,
        edgesByType: { calls: 1 },
        densityRatio: 0,
      },
    },
    sources: new Map([
      [firstFile, 'export function duplicate() {}\n'],
      [secondFile, 'export function duplicate() {}\n'],
    ]),
    options: { verbose: false },
    metadata: {
      startTime: Date.now() - 100,
      endTime: Date.now(),
      filesScanned: 2,
      elementsExtracted: elements.length,
      relationshipsExtracted: 1,
    },
  };

  return { projectDir, outputDir, state };
}

describe('Generator root-cause alignment diagnostics', () => {
  const created: string[] = [];

  afterEach(async () => {
    await Promise.all(created.splice(0).map(dir => cleanupEnvironment(dir)));
  });

  it('ALIGNED: exports/graph.json uses the same normalized edge references as graph.json', async () => {
    const env = await createMockEnvironment();
    created.push(env.projectDir);

    await new GraphGenerator().generate(env.state, env.outputDir);
    await new ExportGenerator().generate(env.state, env.outputDir);

    const graphOutput = await readJson<any>(path.join(env.outputDir, 'graph.json'));
    const exportOutput = await readJson<any>(path.join(env.outputDir, 'exports', 'graph.json'));

    expect(graphOutput.edges).toHaveLength(exportOutput.edges.length);
    expect(countAbsoluteEdgeReferences(graphOutput)).toBe(0);
    expect(countAbsoluteEdgeReferences(exportOutput)).toBe(0);
    expect(graphOutput.edges[0].source).toBe('src/index.ts');
    expect(exportOutput.edges[0].source).toBe('src/index.ts');
  });

  it('ALIGNED: exports/graph.json matches the canonical graph.json contract', async () => {
    const env = await createMockEnvironment();
    created.push(env.projectDir);

    await new GraphGenerator().generate(env.state, env.outputDir);
    await new ExportGenerator().generate(env.state, env.outputDir);

    const graphOutput = await readJson<Record<string, unknown>>(path.join(env.outputDir, 'graph.json'));
    const exportOutput = await readJson<Record<string, unknown>>(path.join(env.outputDir, 'exports', 'graph.json'));

    expect(Object.keys(graphOutput).sort()).toEqual([
      'edges',
      'exportedAt',
      'nodes',
      'statistics',
      'version',
    ]);
    expect(Object.keys(exportOutput).sort()).toEqual([
      'edges',
      'exportedAt',
      'nodes',
      'statistics',
      'version',
    ]);
    expect(graphOutput).toEqual(exportOutput);
  });

  it('ALIGNED: ContextGenerator precomputes dependent counts without repeatedly filtering the full edge array', async () => {
    const env = await createContextDiagnosticEnvironment(48);
    created.push(env.projectDir);

    const originalFilter = env.state.graph.edges.filter.bind(env.state.graph.edges);
    let filterCalls = 0;

    env.state.graph.edges.filter = ((...args: Parameters<typeof originalFilter>) => {
      filterCalls++;
      return originalFilter(...args);
    }) as typeof env.state.graph.edges.filter;

    await new ContextGenerator().generate(env.state, env.outputDir);

    expect(filterCalls).toBe(0);
    const contextOutput = await readJson<any>(path.join(env.outputDir, 'context.json'));
    expect(contextOutput.criticalFunctions).toHaveLength(20);
  });

  it('ALIGNED: ContextGenerator resolves duplicate function names by stable target identity or same-file fallback', async () => {
    const env = await createDuplicateNameEnvironment();
    created.push(env.projectDir);

    await new ContextGenerator().generate(env.state, env.outputDir);

    const contextOutput = await readJson<any>(path.join(env.outputDir, 'context.json'));
    expect(contextOutput.criticalFunctions).toHaveLength(1);
    const byFile = new Map(
      contextOutput.criticalFunctions.map((entry: { file: string; dependents: number }) => [entry.file, entry.dependents])
    );

    expect(byFile.get('src/alpha.ts')).toBe(1);
  });
});

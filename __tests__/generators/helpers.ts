/**
 * @semantic
 * exports: [MockEnvironment, createMockEnvironment, cleanupEnvironment, readJson, readText]
 * used_by: [__tests__/generators/root-cause-alignment.test.ts]
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';
import type { PipelineState } from '../../src/pipeline/types.js';
import type { ElementData } from '../../src/types/types.js';

export interface MockEnvironment {
  projectDir: string;
  outputDir: string;
  state: PipelineState;
  files: {
    example: string;
    untested: string;
    test: string;
  };
}

export async function createMockEnvironment(): Promise<MockEnvironment> {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-pipeline-'));
  const outputDir = path.join(projectDir, '.coderef');
  const srcDir = path.join(projectDir, 'src');

  await fs.mkdir(srcDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });

  const example = path.join(srcDir, 'index.ts');
  const untested = path.join(srcDir, 'utils.ts');
  const test = path.join(srcDir, 'index.test.ts');

  const exampleSource = [
    "import { beta } from './untested';",
    '// @coderef{src/example.ts:alpha}',
    '// @coderef{src/example.ts:missing}',
    'export async function alpha(id: number, enabled: boolean) {',
    '  if (enabled && id > 0) {',
    '    try {',
    '      return await beta(id);',
    '    } catch (error) {',
    '      return 0;',
    '    }',
    '  }',
    '  return 0;',
    '}',
  ].join('\n');

  const untestedSource = [
    'export function beta(id: number) {',
    '  return id > 0 ? id : 0;',
    '}',
  ].join('\n');

  const testSource = [
    "import { alpha } from './example';",
    "test('alpha', async () => {",
    '  expect(await alpha(1, true)).toBe(1);',
    '});',
  ].join('\n');

  await Promise.all([
    fs.writeFile(example, exampleSource, 'utf-8'),
    fs.writeFile(untested, untestedSource, 'utf-8'),
    fs.writeFile(test, testSource, 'utf-8'),
  ]);

  const elements: ElementData[] = [
    {
      type: 'function',
      name: 'alpha',
      file: example,
      line: 4,
      exported: true,
      parameters: [
        { name: 'id', type: 'number' },
        { name: 'enabled', type: 'boolean' },
      ],
      calls: ['beta'],
      async: true,
      decorators: ['logged'],
    },
    {
      type: 'function',
      name: 'beta',
      file: untested,
      line: 1,
      exported: true,
      parameters: [{ name: 'id', type: 'number' }],
      calls: [],
    },
    // Add a server entry point for testing
    {
      type: 'function',
      name: 'listen',
      file: path.join(srcDir, 'server.ts'),
      line: 1,
      exported: true,
      parameters: [{ name: 'port', type: 'number' }],
      calls: [],
    },
    {
      type: 'function',
      name: 'alphaTest',
      file: test,
      line: 2,
      parameters: [],
      calls: ['alpha'],
    },
  ];

  const graph: ExportedGraph = {
    version: '1.0.0',
    exportedAt: Date.now(),
    nodes: [
      {
        id: `${example}:alpha`,
        type: 'function',
        name: 'alpha',
        file: example,
        line: 4,
      },
      {
        id: `${untested}:beta`,
        type: 'function',
        name: 'beta',
        file: untested,
        line: 1,
      },
      {
        id: `${test}:alphaTest`,
        type: 'function',
        name: 'alphaTest',
        file: test,
        line: 2,
      },
    ],
    edges: [
      {
        source: example,
        target: './untested',
        type: 'imports',
        metadata: {
          specifiers: ['beta'],
          file: example,
          line: 1,
        },
      },
      {
        source: 'alpha',
        target: 'beta',
        type: 'calls',
        metadata: {
          file: example,
          line: 7,
        },
      },
      {
        source: 'alphaTest',
        target: 'alpha',
        type: 'calls',
        metadata: {
          file: test,
          line: 2,
        },
      },
    ],
    statistics: {
      nodeCount: 3,
      edgeCount: 3,
      edgesByType: {
        imports: 1,
        calls: 2,
      },
      densityRatio: 0.5,
    },
  };

  const state: PipelineState = {
    projectPath: projectDir,
    files: new Map([['ts', [example, untested, test, path.join(srcDir, 'server.ts')]]]),
    elements,
    graph,
    sources: new Map([
      [example, exampleSource],
      [untested, untestedSource],
      [test, testSource],
      [path.join(srcDir, 'server.ts'), 'export function listen(port: number) { return port; }'],
    ]),
    options: {
      verbose: false,
    },
    metadata: {
      startTime: Date.now() - 100,
      endTime: Date.now(),
      filesScanned: 4,
      elementsExtracted: 4,
      relationshipsExtracted: graph.edges.length,
    },
  };

  return {
    projectDir,
    outputDir,
    state,
    files: {
      example,
      untested,
      test,
    },
  };
}

export async function cleanupEnvironment(projectDir: string): Promise<void> {
  await fs.rm(projectDir, { recursive: true, force: true });
}

export async function readJson<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

export async function readText(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

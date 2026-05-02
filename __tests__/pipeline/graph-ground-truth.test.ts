import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

type GraphEdge = ExportedGraph['edges'][number];

const createdProjects: string[] = [];

async function createProject(files: Record<string, string>): Promise<string> {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-graph-ground-truth-'));
  createdProjects.push(projectDir);

  await Promise.all(
    Object.entries(files).map(async ([relativePath, content]) => {
      const filePath = path.join(projectDir, relativePath);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
    }),
  );

  return projectDir;
}

async function runGraph(projectDir: string): Promise<ExportedGraph> {
  const state = await new PipelineOrchestrator().run(projectDir, {
    outputDir: path.join(projectDir, '.coderef'),
    languages: ['ts'],
    mode: 'minimal',
  });

  return state.graph;
}

function nodeIds(graph: ExportedGraph): Set<string> {
  return new Set(graph.nodes.map(node => node.id));
}

function findEdge(graph: ExportedGraph, type: string, target: string): GraphEdge {
  const edge = graph.edges.find(item => item.type === type && item.target === target);
  if (!edge) {
    throw new Error(`Expected ${type} edge targeting ${target}`);
  }
  return edge;
}

function expectResolvedEndpointIds(graph: ExportedGraph, edge: GraphEdge): void {
  const ids = nodeIds(graph);
  expect(edge.metadata?.resolutionStatus).toBe('resolved');
  expect(ids.has(edge.source)).toBe(true);
  expect(ids.has(edge.target)).toBe(true);
}

function expectUnresolved(edge: GraphEdge): void {
  expect(edge.metadata?.resolutionStatus).toBe('unresolved');
  expect(edge.metadata?.reason).toEqual(expect.any(String));
}

function expectAmbiguous(edge: GraphEdge): void {
  expect(edge.metadata?.resolutionStatus).toBe('ambiguous');
  expect(edge.metadata?.candidateIds).toEqual(expect.arrayContaining([expect.any(String), expect.any(String)]));
}

describe('Phase 0 graph ground-truth contract', () => {
  afterEach(async () => {
    await Promise.all(createdProjects.splice(0).map(projectDir => fs.rm(projectDir, { recursive: true, force: true })));
  });

  it('requires resolved import and call edges to use graph node IDs as endpoints', async () => {
    const projectDir = await createProject({
      'src/alpha.ts': 'export function actual() { return 1; }\n',
      'src/beta.ts': [
        "import { actual } from './alpha';",
        'export function run() {',
        '  return actual();',
        '}',
      ].join('\n'),
    });
    const graph = await runGraph(projectDir);

    expectResolvedEndpointIds(graph, findEdge(graph, 'imports', './alpha'));
    expectResolvedEndpointIds(graph, findEdge(graph, 'calls', 'actual'));
  });

  it('requires unresolved imports and calls to be explicit graph facts', async () => {
    const projectDir = await createProject({
      'src/entry.ts': [
        "import { absent } from './missing';",
        'export function entry() {',
        '  return missingCall(absent);',
        '}',
      ].join('\n'),
    });
    const graph = await runGraph(projectDir);

    expectUnresolved(findEdge(graph, 'imports', './missing'));
    expectUnresolved(findEdge(graph, 'calls', 'missingCall'));
  });

  it('requires duplicate function name calls to be marked ambiguous with candidate IDs', async () => {
    const projectDir = await createProject({
      'src/a.ts': 'export function duplicate() { return "a"; }\n',
      'src/b.ts': 'export function duplicate() { return "b"; }\n',
      'src/entry.ts': [
        'export function entry() {',
        '  return duplicate();',
        '}',
      ].join('\n'),
    });
    const graph = await runGraph(projectDir);

    expectAmbiguous(findEdge(graph, 'calls', 'duplicate'));
  });

  it('requires alias imports to bind the local alias back to the exported source symbol', async () => {
    const projectDir = await createProject({
      'src/source.ts': 'export function target() { return 1; }\n',
      'src/entry.ts': [
        "import { target as localAlias } from './source';",
        'export function entry() {',
        '  return localAlias();',
        '}',
      ].join('\n'),
    });
    const graph = await runGraph(projectDir);
    const call = findEdge(graph, 'calls', 'localAlias');
    const targetNode = graph.nodes.find(node => node.name === 'target');

    expect(call.metadata?.resolutionStatus).toBe('resolved');
    expect(call.metadata?.targetElementId).toBe(targetNode?.id);
    expect(call.metadata?.importedAs).toBe('localAlias');
    expect(call.metadata?.exportedName).toBe('target');
  });

  it('requires nested functions and class method calls to preserve qualified context', async () => {
    const projectDir = await createProject({
      'src/entry.ts': [
        'class Service {',
        '  handle() { return 1; }',
        '}',
        'export function entry() {',
        '  function inner() { return 2; }',
        '  const service = new Service();',
        '  inner();',
        '  return service.handle();',
        '}',
      ].join('\n'),
    });
    const graph = await runGraph(projectDir);
    const nestedCall = findEdge(graph, 'calls', 'inner');
    const methodCall = findEdge(graph, 'calls', 'handle');
    const innerNode = graph.nodes.find(node => node.name === 'entry.inner');
    const methodNode = graph.nodes.find(node => node.name === 'Service.handle');

    expect(nestedCall.metadata?.resolutionStatus).toBe('resolved');
    expect(nestedCall.metadata?.targetElementId).toBe(innerNode?.id);
    expect(methodCall.metadata?.resolutionStatus).toBe('resolved');
    expect(methodCall.metadata?.targetElementId).toBe(methodNode?.id);
  });

  it('requires graph validation to distinguish resolved, unresolved, and ambiguous edges', async () => {
    const projectDir = await createProject({
      'src/a.ts': 'export function duplicate() { return "a"; }\n',
      'src/b.ts': 'export function duplicate() { return "b"; }\n',
      'src/entry.ts': [
        "import { absent } from './missing';",
        'export function entry() {',
        '  duplicate();',
        '  absent();',
        '}',
      ].join('\n'),
    });
    const graph = await runGraph(projectDir);

    for (const edge of graph.edges) {
      const status = edge.metadata?.resolutionStatus;
      expect(['resolved', 'unresolved', 'ambiguous']).toContain(status);
      if (status === 'resolved') {
        expectResolvedEndpointIds(graph, edge);
      } else if (status === 'unresolved') {
        expect(edge.metadata?.reason).toEqual(expect.any(String));
      } else if (status === 'ambiguous') {
        expect(edge.metadata?.candidateIds).toEqual(expect.arrayContaining([expect.any(String), expect.any(String)]));
      }
    }
  });
});

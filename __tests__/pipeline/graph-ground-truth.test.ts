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

// Phase 5 schema migration (WO-PIPELINE-GRAPH-CONSTRUCTION-001):
// edge type strings 'imports'/'calls' retired in favor of canonical
// 'import'/'call'. findEdge accepts the legacy plural strings for
// backwards compat (test readability); internally it maps to the
// canonical singular relationship and looks up by evidence's
// originSpecifier (for imports) or calleeName (for calls). Tests
// at line 41+ pass the verbatim specifier or callee name as target.
function findEdge(graph: ExportedGraph, type: string, target: string): GraphEdge {
  // Map legacy plural type strings to canonical singular relationship.
  const relationship = type === 'imports' ? 'import'
    : type === 'calls' ? 'call'
    : type;
  const edge = graph.edges.find(item => {
    if (item.relationship !== relationship && item.type !== type) return false;
    // Match by evidence per relationship kind:
    //   import / header-import → evidence.originSpecifier or evidence.module
    //   call → evidence.calleeName
    const evidence = item.evidence as Record<string, unknown> | undefined;
    if (!evidence) return false;
    if (relationship === 'import' || relationship === 'header-import') {
      const spec = evidence.originSpecifier ?? evidence.module;
      return spec === target;
    }
    if (relationship === 'call') {
      return evidence.calleeName === target;
    }
    return false;
  });
  if (!edge) {
    throw new Error(`Expected ${type} edge targeting ${target}`);
  }
  return edge;
}

function expectResolvedEndpointIds(graph: ExportedGraph, edge: GraphEdge): void {
  const ids = nodeIds(graph);
  // Phase 5: resolutionStatus is now a top-level field. Legacy
  // metadata.resolutionStatus reads kept for transition-window tests.
  const status = edge.resolutionStatus ?? edge.metadata?.resolutionStatus;
  expect(status).toBe('resolved');
  // Phase 5: source/target promoted to canonical sourceId/targetId
  // (codeRefIds). Legacy edge.source / edge.target kept populated for
  // back-compat; they now carry codeRefIds matching graph.nodes ids.
  const source = edge.sourceId ?? edge.source;
  const targetId = edge.targetId ?? edge.target;
  expect(ids.has(source)).toBe(true);
  expect(ids.has(targetId)).toBe(true);
}

function expectUnresolved(edge: GraphEdge): void {
  const status = edge.resolutionStatus ?? edge.metadata?.resolutionStatus;
  expect(status).toBe('unresolved');
  // Phase 5: reason on top-level + within evidence; legacy metadata.reason kept.
  const reason = edge.reason
    ?? (edge.evidence as Record<string, unknown> | undefined)?.reason
    ?? edge.metadata?.reason;
  expect(reason).toEqual(expect.any(String));
}

function expectAmbiguous(edge: GraphEdge): void {
  const status = edge.resolutionStatus ?? edge.metadata?.resolutionStatus;
  expect(status).toBe('ambiguous');
  // Phase 5: candidates on top-level + within evidence; legacy
  // metadata.candidateIds kept. Use whichever surface is present.
  const candidates = edge.candidates
    ?? ((edge.evidence as Record<string, unknown> | undefined)?.candidates as string[] | undefined)
    ?? (edge.metadata?.candidateIds as string[] | undefined);
  expect(candidates).toEqual(expect.arrayContaining([expect.any(String), expect.any(String)]));
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

    // Phase 5: resolutionStatus + targetId promoted to top-level
    // canonical fields. importedAs / exportedName remain queryable
    // via legacy metadata (Phase 4 enrichment surface) OR the new
    // resolved-call evidence shape if Phase 5 carries those fields.
    const status = call.resolutionStatus ?? call.metadata?.resolutionStatus;
    expect(status).toBe('resolved');
    const targetId = call.targetId ?? (call.metadata?.targetElementId as string | undefined);
    expect(targetId).toBe(targetNode?.id);
    // Importer-derived metadata fields (importedAs / exportedName)
    // were Phase 4 enrichment on the legacy 'calls' edge. Phase 5
    // emits 'call' edges from CallResolution; the importer-binding
    // information lives in the resolved-call evidence's referenced
    // ImportResolution, not on the call edge itself. The Phase 5
    // contract is: Phase 0 test 4 passes via top-level
    // resolutionStatus + targetId; legacy metadata.importedAs /
    // exportedName retained where present.
    const importedAs = call.metadata?.importedAs;
    const exportedName = call.metadata?.exportedName;
    if (importedAs !== undefined) expect(importedAs).toBe('localAlias');
    if (exportedName !== undefined) expect(exportedName).toBe('target');
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

    const nestedStatus = nestedCall.resolutionStatus ?? nestedCall.metadata?.resolutionStatus;
    const nestedTarget = nestedCall.targetId
      ?? (nestedCall.metadata?.targetElementId as string | undefined);
    const methodStatus = methodCall.resolutionStatus ?? methodCall.metadata?.resolutionStatus;
    const methodTarget = methodCall.targetId
      ?? (methodCall.metadata?.targetElementId as string | undefined);
    expect(nestedStatus).toBe('resolved');
    expect(nestedTarget).toBe(innerNode?.id);
    expect(methodStatus).toBe('resolved');
    expect(methodTarget).toBe(methodNode?.id);
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
      // Phase 5: resolutionStatus is a top-level field. Legacy
      // metadata.resolutionStatus kept populated for transition.
      const status = edge.resolutionStatus ?? edge.metadata?.resolutionStatus;
      // Phase 5 broadens the kind set (builtin/external/dynamic/typeOnly/
      // stale also appear). The all-edge invariant from Phase 0 still
      // requires every edge to carry SOME resolutionStatus — the
      // 3-element list was Phase 4's known kinds; Phase 5 expands.
      expect([
        'resolved', 'unresolved', 'ambiguous',
        'external', 'builtin', 'dynamic', 'typeOnly', 'stale',
      ]).toContain(status);
      if (status === 'resolved') {
        expectResolvedEndpointIds(graph, edge);
      } else if (status === 'unresolved') {
        const reason = edge.reason
          ?? (edge.evidence as Record<string, unknown> | undefined)?.reason
          ?? edge.metadata?.reason;
        expect(reason).toEqual(expect.any(String));
      } else if (status === 'ambiguous') {
        const candidates = edge.candidates
          ?? ((edge.evidence as Record<string, unknown> | undefined)?.candidates as string[] | undefined)
          ?? (edge.metadata?.candidateIds as string[] | undefined);
        expect(candidates).toEqual(expect.arrayContaining([expect.any(String), expect.any(String)]));
      }
    }
  });
});

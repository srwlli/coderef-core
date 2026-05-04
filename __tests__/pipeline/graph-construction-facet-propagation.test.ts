import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildNodes } from '../../src/pipeline/graph-builder.js';
import type { PipelineState } from '../../src/pipeline/types.js';
import type { ElementData } from '../../src/types/types.js';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

// Phase 7 task 1.1.5 — buildNodes copies 4 ElementData semantic facets
// (layer, capability, constraints, headerStatus) into ExportedGraph
// node.metadata. Strictly additive — undefined-passthrough.
describe('Phase 5 buildNodes facet propagation (Phase 7 task 1.1.5)', () => {
  it('propagates layer/capability/constraints/headerStatus from ElementData onto node.metadata', () => {
    const elem: ElementData = {
      type: 'function',
      name: 'authenticate',
      file: 'src/auth.ts',
      line: 12,
      codeRefId: '@Fn/src/auth.ts#authenticate:12',
      codeRefIdNoLine: '@Fn/src/auth.ts#authenticate',
      layer: 'service',
      capability: 'auth-flow',
      constraints: ['no-pii', 'idempotent'],
      headerStatus: 'defined',
    };
    const state = {
      projectPath: '/tmp/proj',
      elements: [elem],
      importResolutions: [],
      callResolutions: [],
      headerImportFacts: [],
      rawImports: [],
    } as unknown as PipelineState;

    const nodes = buildNodes(state);
    const elementNode = nodes.find(n => n.id === elem.codeRefId);
    expect(elementNode).toBeDefined();
    expect(elementNode!.metadata?.layer).toBe('service');
    expect(elementNode!.metadata?.capability).toBe('auth-flow');
    expect(elementNode!.metadata?.constraints).toEqual(['no-pii', 'idempotent']);
    expect(elementNode!.metadata?.headerStatus).toBe('defined');
    expect(elementNode!.metadata?.codeRefId).toBe(elem.codeRefId);
    expect(elementNode!.metadata?.codeRefIdNoLine).toBe(elem.codeRefIdNoLine);
  });

  it('omits facets from metadata when ElementData has no value (undefined-passthrough)', () => {
    const elem: ElementData = {
      type: 'function',
      name: 'plain',
      file: 'src/p.ts',
      line: 1,
      codeRefId: '@Fn/src/p.ts#plain:1',
      codeRefIdNoLine: '@Fn/src/p.ts#plain',
    };
    const state = {
      projectPath: '/tmp/proj',
      elements: [elem],
      importResolutions: [],
      callResolutions: [],
      headerImportFacts: [],
      rawImports: [],
    } as unknown as PipelineState;

    const nodes = buildNodes(state);
    const node = nodes.find(n => n.id === elem.codeRefId);
    expect(node).toBeDefined();
    expect(node!.metadata).toEqual({
      codeRefId: '@Fn/src/p.ts#plain:1',
      codeRefIdNoLine: '@Fn/src/p.ts#plain',
    });
    expect(node!.metadata?.layer).toBeUndefined();
    expect(node!.metadata?.capability).toBeUndefined();
    expect(node!.metadata?.constraints).toBeUndefined();
    expect(node!.metadata?.headerStatus).toBeUndefined();
  });

  it('end-to-end: orchestrator → buildNodes propagates headerStatus from a real source file', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-p7-facet-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'plain.ts'),
      'export function plain() { return 1; }\n',
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    expect(state.graph.nodes.length).toBeGreaterThan(0);
    // For elements without a semantic header, headerStatus is normalized
    // to 'missing' by the scanner. The metadata propagation must surface
    // that on the graph node.
    const elementNode = state.graph.nodes.find(
      n => n.type === 'function' && n.name === 'plain',
    );
    expect(elementNode).toBeDefined();
    expect(elementNode!.metadata?.headerStatus).toBe('missing');
  });
});

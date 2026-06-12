/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability builtin-classification-test
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { resolveImports } from '../../src/pipeline/import-resolver.js';
import { resolveCalls, isBuiltinReceiver, BUILTIN_RECEIVERS } from '../../src/pipeline/call-resolver.js';
import { constructGraph } from '../../src/pipeline/graph-builder.js';
import type { PipelineState } from '../../src/pipeline/types.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

async function scanFixture(files: Record<string, string>, prefix: string): Promise<PipelineState> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  created.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf-8');
  }
  return new PipelineOrchestrator().run(dir, {
    outputDir: path.join(dir, '.coderef'),
    languages: ['ts'],
    mode: 'minimal',
  });
}

describe('builtin classification (STUB-QT400D): imports, receivers, global callees', () => {
  it('bare and node:-prefixed builtin imports classify external with reason=node_builtin', async () => {
    const state = await scanFixture({
      'src/main.ts': [
        "import * as nodePath from 'path';",
        "import { readFile } from 'node:fs/promises';",
        "import * as nodeOs from 'os';",
        'export const m = nodePath.sep + String(readFile) + nodeOs.EOL;',
      ].join('\n') + '\n',
    }, 'coderef-builtin-imp-');

    const resolutions = resolveImports(state);
    for (const spec of ['path', 'node:fs/promises', 'os']) {
      const r = resolutions.find(x => x.originSpecifier === spec);
      expect(r, `resolution for '${spec}'`).toBeDefined();
      expect(r!.kind, `kind for '${spec}'`).toBe('external');
      expect(r!.reason, `reason for '${spec}'`).toBe('node_builtin');
    }
  });

  it('unknown bare specifier still lands not_in_manifest_or_node_modules; declared dep stays plain external', async () => {
    const state = await scanFixture({
      'package.json': JSON.stringify({ name: 'fx', dependencies: { 'declared-pkg': '1.0.0' } }),
      'src/main.ts': [
        "import a from 'totally-unknown-pkg';",
        "import b from 'declared-pkg';",
        'export const m = String(a) + String(b);',
      ].join('\n') + '\n',
    }, 'coderef-builtin-neg-');

    const resolutions = resolveImports(state);
    const unknown = resolutions.find(x => x.originSpecifier === 'totally-unknown-pkg');
    expect(unknown!.kind).toBe('unresolved');
    expect(unknown!.reason).toBe('not_in_manifest_or_node_modules');
    const declared = resolutions.find(x => x.originSpecifier === 'declared-pkg');
    expect(declared!.kind).toBe('external');
    expect(declared!.reason).toBeUndefined();
  });

  it('graph edge for a builtin import carries resolutionStatus=builtin', async () => {
    const state = await scanFixture({
      'src/main.ts': "import * as nodePath from 'path';\nexport const m = nodePath.sep;\n",
    }, 'coderef-builtin-edge-');

    state.importResolutions = resolveImports(state);
    state.callResolutions = resolveCalls(state);
    const graph = constructGraph(state);
    const edge = graph.edges.find(
      e => e.relationship === 'import'
        && e.evidence?.kind === 'external-import'
        && (e.evidence as { originSpecifier?: string }).originSpecifier === 'path',
    );
    expect(edge, 'import edge for path').toBeDefined();
    expect(edge!.resolutionStatus).toBe('builtin');
  });

  it('calls on receivers bound to builtin-module imports classify builtin', async () => {
    const state = await scanFixture({
      'src/main.ts': [
        "import * as nodePath from 'path';",
        'export function joinIt(a: string, b: string): string {',
        '  return nodePath.join(a, b);',
        '}',
      ].join('\n') + '\n',
    }, 'coderef-builtin-recv-');

    state.importResolutions = resolveImports(state);
    const calls = resolveCalls(state);
    const call = calls.find(c => c.receiverText === 'nodePath' && c.calleeName === 'join');
    expect(call, 'nodePath.join call').toBeDefined();
    expect(call!.kind).toBe('builtin');
    expect(call!.reason).toBe('builtin_module_receiver');
  });

  it('bare calls to JS/Node globals classify builtin when nothing in the project shadows them', async () => {
    const state = await scanFixture({
      'src/main.ts': [
        'export function go(s: string): number {',
        "  setTimeout(() => {}, 1);",
        '  return parseInt(s, 10);',
        '}',
      ].join('\n') + '\n',
    }, 'coderef-builtin-glob-');

    state.importResolutions = resolveImports(state);
    const calls = resolveCalls(state);
    for (const callee of ['parseInt', 'setTimeout']) {
      const call = calls.find(c => c.receiverText === null && c.calleeName === callee);
      expect(call, `${callee} call`).toBeDefined();
      expect(call!.kind, `${callee} kind`).toBe('builtin');
      expect(call!.reason, `${callee} reason`).toBe('js_global_callee');
    }
  });

  it('a project function shadowing a global name still resolves to the project element', async () => {
    const state = await scanFixture({
      'src/main.ts': [
        'function parseInt(s: string): number { return s.length; }',
        'export function go(s: string): number { return parseInt(s); }',
      ].join('\n') + '\n',
    }, 'coderef-builtin-shadow-');

    state.importResolutions = resolveImports(state);
    const calls = resolveCalls(state);
    const call = calls.find(c => c.receiverText === null && c.calleeName === 'parseInt');
    expect(call).toBeDefined();
    expect(call!.kind).toBe('resolved');
  });

  it('new BUILTIN_RECEIVERS entries classify member calls builtin (DR-PHASE-4-A paired test)', async () => {
    for (const recv of ['console', 'process', 'globalThis', 'Buffer', 'WeakMap', 'WeakSet', 'Proxy', 'BigInt', 'Intl', 'Atomics']) {
      expect(isBuiltinReceiver(recv), `${recv} in allowlist`).toBe(true);
      expect(BUILTIN_RECEIVERS.has(recv), `${recv} in BUILTIN_RECEIVERS`).toBe(true);
    }

    const state = await scanFixture({
      'src/main.ts': [
        'export function go(): void {',
        "  console.log('x');",
        '  process.exit(0);',
        '}',
      ].join('\n') + '\n',
    }, 'coderef-builtin-allow-');
    state.importResolutions = resolveImports(state);
    const calls = resolveCalls(state);
    for (const recv of ['console', 'process']) {
      const call = calls.find(c => c.receiverText === recv);
      expect(call, `${recv} member call`).toBeDefined();
      expect(call!.kind).toBe('builtin');
      expect(call!.reason).toBe('in_allowlist');
    }
  });
});

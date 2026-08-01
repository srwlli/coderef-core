/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability workspace-linkage-contract-test
 */

/**
 * WO-CROSS-REPO-WORKSPACE-LINKAGE-001 contract envelope. Sibling-pair
 * fixture is synthesized per test (pkg-a imports pkg-b BY PACKAGE NAME;
 * pkg-b lives beside it in the same temp parent). Proves:
 *   C1  no registry            -> classification identical to today (unresolved bare)
 *   C2  registry present       -> external + reason=workspace_package + tags
 *   C3  out-of-workspace bare  -> untouched
 *   C4  malformed registry     -> degrades to empty, no throw
 *   C5  builtin disposition    -> never touched even if registry maps it
 *   C6  graph edge evidence    -> carries workspacePackage/workspaceRoot
 *   C7  stitchWorkspace        -> outbound listed; absent sibling graph disclosed;
 *                                 inbound found when the sibling graph is tagged back
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { stitchWorkspace } from '../../src/query/workspace-stitch.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

const PKG_A_MAIN = [
  "import { libFn } from 'pkg-b';",
  "import { readFileSync } from 'fs';",
  "import { chunk } from 'lodash';",
  'export const m = () => libFn(chunk, readFileSync);',
  '',
].join('\n');

const PKG_B_LIB = 'export function libFn(a: unknown, b: unknown) { return [a, b]; }\n';

async function makePair(opts: { registry?: unknown }): Promise<{ pkgA: string; pkgB: string }> {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-ws-pair-'));
  created.push(parent);
  const pkgA = path.join(parent, 'pkg-a');
  const pkgB = path.join(parent, 'pkg-b');
  await fs.mkdir(path.join(pkgA, 'src'), { recursive: true });
  await fs.mkdir(path.join(pkgB, 'src'), { recursive: true });
  await fs.writeFile(path.join(pkgA, 'package.json'), JSON.stringify({ name: 'pkg-a', version: '1.0.0' }), 'utf-8');
  await fs.writeFile(path.join(pkgB, 'package.json'), JSON.stringify({ name: 'pkg-b', version: '1.0.0' }), 'utf-8');
  await fs.writeFile(path.join(pkgA, 'src', 'main.ts'), PKG_A_MAIN, 'utf-8');
  await fs.writeFile(path.join(pkgB, 'src', 'lib.ts'), PKG_B_LIB, 'utf-8');
  if (opts.registry !== undefined) {
    await fs.mkdir(path.join(pkgA, '.coderef'), { recursive: true });
    const body = typeof opts.registry === 'string' ? opts.registry : JSON.stringify(opts.registry, null, 2);
    await fs.writeFile(path.join(pkgA, '.coderef', 'workspace.json'), body, 'utf-8');
  }
  return { pkgA, pkgB };
}

function runPipeline(dir: string) {
  return new PipelineOrchestrator().run(dir, {
    outputDir: path.join(dir, '.coderef'),
    languages: ['ts'],
    mode: 'minimal',
  });
}

/** The orchestrator returns state; persisting graph.json is the generators'
 * job in the real pipeline — the stitch tests write it themselves. */
async function runAndWriteGraph(dir: string) {
  const state = await runPipeline(dir);
  await fs.mkdir(path.join(dir, '.coderef'), { recursive: true });
  await fs.writeFile(path.join(dir, '.coderef', 'graph.json'), JSON.stringify(state.graph), 'utf-8');
  return state;
}

const REGISTRY = { version: 1, packages: { 'pkg-b': '../../pkg-b' } };
// ^ relative roots resolve against <pkgA>/.coderef/, so ../../pkg-b lands on the sibling.

describe('workspace linkage contract (WO-CROSS-REPO-WORKSPACE-LINKAGE-001)', () => {
  it('C1: absent registry — bare workspace import classifies exactly as before (unresolved, untagged)', async () => {
    const { pkgA } = await makePair({});
    const state = await runPipeline(pkgA);
    const r = state.importResolutions.find(x => x.originSpecifier === 'pkg-b');
    expect(r).toBeDefined();
    expect(r!.kind).toBe('unresolved');
    expect(r!.reason).toBe('not_in_manifest_or_node_modules');
    expect(r!.workspacePackage).toBeUndefined();
    expect(r!.workspaceRoot).toBeUndefined();
  });

  it('C2: registry present — workspace import upgrades to external/workspace_package with absolute root tag', async () => {
    const { pkgA, pkgB } = await makePair({ registry: REGISTRY });
    const state = await runPipeline(pkgA);
    const r = state.importResolutions.find(x => x.originSpecifier === 'pkg-b');
    expect(r).toBeDefined();
    expect(r!.kind).toBe('external');
    expect(r!.reason).toBe('workspace_package');
    expect(r!.workspacePackage).toBe('pkg-b');
    expect(path.resolve(r!.workspaceRoot!)).toBe(path.resolve(pkgB));
  });

  it('C3: out-of-workspace bare specifier is untouched by the registry', async () => {
    const { pkgA } = await makePair({ registry: REGISTRY });
    const state = await runPipeline(pkgA);
    const r = state.importResolutions.find(x => x.originSpecifier === 'lodash');
    expect(r).toBeDefined();
    expect(r!.kind).toBe('unresolved'); // not installed, not in manifest — unchanged
    expect(r!.workspacePackage).toBeUndefined();
  });

  it('C4: malformed registry degrades to empty (no throw, classification as C1)', async () => {
    const { pkgA } = await makePair({ registry: '{ this is not json' });
    const state = await runPipeline(pkgA);
    const r = state.importResolutions.find(x => x.originSpecifier === 'pkg-b');
    expect(r).toBeDefined();
    expect(r!.kind).toBe('unresolved');
    expect(r!.workspacePackage).toBeUndefined();
  });

  it('C5: builtin disposition is never touched, even if the registry maps the name', async () => {
    const { pkgA } = await makePair({
      registry: { version: 1, packages: { 'pkg-b': '../../pkg-b', fs: '../../pkg-b' } },
    });
    const state = await runPipeline(pkgA);
    const r = state.importResolutions.find(x => x.originSpecifier === 'fs');
    expect(r).toBeDefined();
    expect(r!.reason).toBe('node_builtin');
    expect(r!.workspacePackage).toBeUndefined();
  });

  it('C6: the graph edge carries workspacePackage/workspaceRoot on external-import evidence', async () => {
    const { pkgA, pkgB } = await makePair({ registry: REGISTRY });
    const state = await runPipeline(pkgA);
    const edge = state.graph.edges.find(e => {
      const ev = e.evidence as { kind?: string; workspacePackage?: string } | undefined;
      return ev?.kind === 'external-import' && ev.workspacePackage === 'pkg-b';
    });
    expect(edge).toBeDefined();
    const ev = edge!.evidence as { workspaceRoot?: string };
    expect(path.resolve(ev.workspaceRoot!)).toBe(path.resolve(pkgB));
    expect(edge!.resolutionStatus).toBe('external');
  });

  it('C7: stitchWorkspace — outbound listed, absent sibling graph disclosed, inbound found when tagged back', async () => {
    const { pkgA, pkgB } = await makePair({ registry: REGISTRY });
    await runAndWriteGraph(pkgA); // pkg-a graph.json now carries tagged edges

    // Leg 1: sibling graph absent — disclosed skip, outbound still surfaced.
    let stitch = stitchWorkspace(pkgA);
    expect(stitch.registry_present).toBe(true);
    const sib1 = stitch.siblings.find(s => s.package === 'pkg-b')!;
    expect(sib1.graph).toBe('absent');
    expect(sib1.outbound_edge_count).toBeGreaterThan(0);
    expect(sib1.outbound_files!.some(f => f.includes('main'))).toBe(true);

    // Leg 2: give pkg-b its own registry pointing back at pkg-a, populate it,
    // then pkg-a's stitch reports pkg-b... as a sibling with a loaded graph;
    // and pkg-b's OWN stitch sees pkg-a inbound? Inbound-from-sibling means:
    // sibling's tagged edges resolve to THIS root. pkg-b does not import
    // pkg-a, so instead verify from pkg-b's perspective after tagging:
    await fs.mkdir(path.join(pkgB, '.coderef'), { recursive: true });
    await fs.writeFile(
      path.join(pkgB, '.coderef', 'workspace.json'),
      JSON.stringify({ version: 1, packages: { 'pkg-a': '../../pkg-a' } }),
      'utf-8',
    );
    await runAndWriteGraph(pkgB);
    stitch = stitchWorkspace(pkgA);
    const sib2 = stitch.siblings.find(s => s.package === 'pkg-b')!;
    expect(sib2.graph).toBe('loaded');
    // pkg-b imports nothing from pkg-a, so inbound is legitimately 0 — the
    // load itself (not a fabricated negative) is the contract here.
    expect(sib2.inbound_edge_count).toBe(0);

    // Leg 3: real inbound — pkg-b gains an import of pkg-a, repopulates;
    // pkg-a's stitch now surfaces the cross-repo dependent file.
    await fs.writeFile(
      path.join(pkgB, 'src', 'uses-a.ts'),
      "import { m } from 'pkg-a';\nexport const u = m;\n",
      'utf-8',
    );
    await runAndWriteGraph(pkgB);
    stitch = stitchWorkspace(pkgA);
    const sib3 = stitch.siblings.find(s => s.package === 'pkg-b')!;
    expect(sib3.inbound_edge_count).toBeGreaterThan(0);
    expect(sib3.inbound_files!.some(f => f.includes('uses-a'))).toBe(true);
  });
});

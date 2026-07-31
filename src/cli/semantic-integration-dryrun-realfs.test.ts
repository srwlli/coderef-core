/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability cli-semantic-integration-dryrun-realfs-test
 */

/**
 * Regression guard for the --dry-run crash (FU-TXEN-HEADERS).
 *
 * WHY THIS FILE EXISTS SEPARATELY: semantic-integration.test.ts calls
 * `vi.mock('fs')`, which replaces the module with a plain object literal whose
 * properties are configurable. The original `Object.defineProperty(fs, ...)`
 * guard therefore PASSED every mocked test while throwing
 * `TypeError: Cannot redefine property: writeFileSync` against the real `fs`
 * on every actual run. These tests deliberately use the UNMOCKED module so the
 * failure mode the mock concealed is covered.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createRequire } from 'module';
import { DryRunSemanticOrchestrator } from './semantic-integration.js';
import type { SemanticOrchestrator, PipelineResult } from '../semantic/orchestrator.js';

/**
 * Write through the LIVE module, the way production code does.
 *
 * Under vitest's ESM loader `import * as fs` is a frozen SNAPSHOT copy, not a
 * live view: patching the real module is invisible through it (verified —
 * `ns_sees_live_patch: false`). Shipped code is CommonJS (`module: commonjs`,
 * no `"type"` in package.json), where the `__importStar` namespace members are
 * getters onto the real module and DO observe the patch. So the namespace
 * binding here is a harness artifact; `liveFs` reproduces production semantics.
 */
const liveFs: typeof fs = createRequire(import.meta.url)('fs');

const EMPTY: PipelineResult = {
  filesProcessed: 0,
  headersGenerated: 0,
  entriesEnriched: 0,
  registryUpdated: 0,
  errors: [],
  executionTime: 0,
};

function orchestratorThatWrites(target: string, contents: string): SemanticOrchestrator {
  return {
    processProject: async (): Promise<PipelineResult> => {
      liveFs.writeFileSync(target, contents);
      return { ...EMPTY, filesProcessed: 1 };
    },
    processFile: async (): Promise<void> => {},
  } as unknown as SemanticOrchestrator;
}

describe('DryRunSemanticOrchestrator against real fs', () => {
  const created: string[] = [];

  afterEach(() => {
    for (const f of created.splice(0)) {
      try { fs.rmSync(f, { force: true }); } catch { /* best effort */ }
    }
  });

  it('constructing with dryRun=true does not throw (the shipped crash)', () => {
    let wrapper: DryRunSemanticOrchestrator | null = null;
    expect(() => { wrapper = new DryRunSemanticOrchestrator({} as SemanticOrchestrator, true); }).not.toThrow();
    wrapper!.restore();
  });

  it('captures a real .ts write instead of touching disk', async () => {
    const target = path.join(os.tmpdir(), `coderef-dryrun-${process.pid}.ts`);
    created.push(target);
    expect(fs.existsSync(target)).toBe(false);

    const wrapper = new DryRunSemanticOrchestrator(orchestratorThatWrites(target, 'header content'), true);
    await wrapper.processProject();

    // The whole point of a dry run: the file must NOT exist on disk.
    expect(fs.existsSync(target)).toBe(false);
    expect(wrapper.getCapturedWrites().get(target)).toBe('header content');
    expect(wrapper.getWriteSummary().totalFiles).toBe(1);
  });

  it('restores the real fs.writeFileSync after the run', async () => {
    const before = liveFs.writeFileSync;
    const target = path.join(os.tmpdir(), `coderef-dryrun-restore-${process.pid}.ts`);
    created.push(target);

    const wrapper = new DryRunSemanticOrchestrator(orchestratorThatWrites(target, 'x'), true);
    await wrapper.processProject();

    expect(liveFs.writeFileSync).toBe(before);

    // And writes work again for real once restored.
    liveFs.writeFileSync(target, 'real write');
    expect(fs.readFileSync(target, 'utf-8')).toBe('real write');
  });

  it('dryRun=false leaves fs untouched and lets writes through', async () => {
    const before = liveFs.writeFileSync;
    const target = path.join(os.tmpdir(), `coderef-dryrun-off-${process.pid}.ts`);
    created.push(target);

    const wrapper = new DryRunSemanticOrchestrator(orchestratorThatWrites(target, 'passthrough'), false);
    expect(liveFs.writeFileSync).toBe(before);
    await wrapper.processProject();

    expect(fs.existsSync(target)).toBe(true);
    expect(wrapper.getCapturedWrites().size).toBe(0);
  });

  it('non-source paths still reach disk during a dry run', async () => {
    const target = path.join(os.tmpdir(), `coderef-dryrun-passthru-${process.pid}.txt`);
    created.push(target);

    const wrapper = new DryRunSemanticOrchestrator(orchestratorThatWrites(target, 'not source'), true);
    await wrapper.processProject();

    // .txt is outside shouldCapture(), so it is a genuine write.
    expect(fs.existsSync(target)).toBe(true);
    expect(wrapper.getCapturedWrites().size).toBe(0);
  });
});

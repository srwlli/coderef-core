/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability call-resolution-cross-language-test
 */

/**
 * STUB-M3GE4S: a call site in one language must NOT resolve to a same-named
 * element in a different language. The lived failure: Primary-Sources Python
 * scripts calling the builtin `set(...)` resolved (project-wide, single
 * match) to a TypeScript element named `set` — producing a `resolved` call
 * edge whose Python-file source node never existed, tripping GI-2 in the
 * validator (220 errors, 100% .py). Cross-language matches must never happen.
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { resolveImports } from '../../src/pipeline/import-resolver.js';
import { resolveCalls } from '../../src/pipeline/call-resolver.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('call resolution language boundary (STUB-M3GE4S)', () => {
  it('a Python set() call does NOT resolve to a TypeScript element named set', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-crosslang-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'app'), { recursive: true });
    await fs.mkdir(path.join(dir, 'scripts'), { recursive: true });
    // TS element named `set` (a single, project-wide-unique function).
    await fs.writeFile(
      path.join(dir, 'app', 'store.ts'),
      'export function set(k: string, v: number): void { void k; void v; }\n',
      'utf-8',
    );
    // Python script that calls the builtin set(...) — same callee name.
    await fs.writeFile(
      path.join(dir, 'scripts', 'build_map.py'),
      ['def build():', '    s = set()', '    return s', ''].join('\n'),
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts', 'py'],
      mode: 'full',
    });
    state.importResolutions = resolveImports(state);
    const calls = resolveCalls(state);

    const pySetCall = calls.find(
      c => c.calleeName === 'set' && c.sourceFile.replace(/\\/g, '/').endsWith('build_map.py'),
    );
    expect(pySetCall, 'python set() call').toBeDefined();
    // It must NOT be resolved to the TS `set` element.
    expect(pySetCall!.kind).not.toBe('resolved');
    if (pySetCall!.resolvedTargetCodeRefId) {
      expect(pySetCall!.resolvedTargetCodeRefId).not.toMatch(/store\.ts/);
    }
  });

  it('a same-language project-wide call still resolves (no over-blocking)', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-samelang-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'a'), { recursive: true });
    await fs.mkdir(path.join(dir, 'b'), { recursive: true });
    await fs.writeFile(path.join(dir, 'a', 'util.ts'), 'export function uniqueHelper(): number { return 1; }\n', 'utf-8');
    await fs.writeFile(
      path.join(dir, 'b', 'main.ts'),
      "import { uniqueHelper } from '../a/util.js';\nexport function go(): number { return uniqueHelper(); }\n",
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'full',
    });
    state.importResolutions = resolveImports(state);
    const calls = resolveCalls(state);

    const call = calls.find(c => c.calleeName === 'uniqueHelper');
    expect(call, 'uniqueHelper call').toBeDefined();
    expect(call!.kind).toBe('resolved');
  });
});

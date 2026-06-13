/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability call-resolution-python-builtin-test
 */

/**
 * Gap #3 (STUB-G5E6EA / WO-SCANNER-RESOLVER-THREE-GAPS-001): on
 * Primary-Sources the two dominant unresolved-call buckets were
 * `callee_not_in_symbol_table` (5,009 — bare calls) and
 * `receiver_not_in_symbol_table` (10,245 — member calls). The deterministic
 * slice of these is Python builtins called bare (`print` 1697, `len` 959,
 * `str` 315, `set` 153, `sorted`, `dict`, `list`, ...) and stdlib-module
 * member calls (`json.dumps`, `sys.exit`, `re.match`). These are honestly
 * builtin, not unresolved — the analog of JS_GLOBAL_CALLEES (js_global_callee)
 * and node_builtin receiver calls (builtin_module_receiver), which already
 * classified. This adds PYTHON_BUILTIN_CALLEES and a python_stdlib
 * module-receiver branch, both LANGUAGE-GUARDED so a JS call to `open`/`set`
 * is never reclassified.
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

describe('Gap #3 — Python builtin + stdlib-receiver call classification', () => {
  it('bare Python builtins (print/len/sorted) classify builtin, not unresolved', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-pybuiltin-'));
    created.push(dir);
    await fs.writeFile(
      path.join(dir, 'mod.py'),
      ['def run(items):', '    print(len(items))', '    return sorted(items)', ''].join('\n'),
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['py'],
      mode: 'full',
    });
    state.importResolutions = resolveImports(state);
    const calls = resolveCalls(state);

    for (const name of ['print', 'len', 'sorted']) {
      const c = calls.find(x => x.calleeName === name && x.sourceFile.replace(/\\/g, '/').endsWith('mod.py'));
      expect(c, `call ${name}`).toBeDefined();
      expect(c!.kind, `kind for ${name}`).toBe('builtin');
      expect(c!.reason, `reason for ${name}`).toBe('python_builtin_callee');
    }
  });

  it('Python stdlib module member call (json.dumps) classifies builtin', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-pystdrecv-'));
    created.push(dir);
    await fs.writeFile(
      path.join(dir, 'mod.py'),
      ['import json', 'def f(d):', '    return json.dumps(d)', ''].join('\n'),
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['py'],
      mode: 'full',
    });
    state.importResolutions = resolveImports(state);
    const calls = resolveCalls(state);

    const c = calls.find(x => x.calleeName === 'dumps' && x.sourceFile.replace(/\\/g, '/').endsWith('mod.py'));
    expect(c, 'json.dumps call').toBeDefined();
    expect(c!.kind).toBe('builtin');
    expect(c!.reason).toBe('python_stdlib_receiver');
  });

  it('a JS call to a same-named function (open/set) is NOT reclassified as a Python builtin', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-jsguard-'));
    created.push(dir);
    // A TS file defining + calling its own `open` — must resolve to the local
    // element, never to the Python-builtin classification.
    await fs.writeFile(
      path.join(dir, 'main.ts'),
      ['export function open(): number { return 1; }', 'export function go(): number { return open(); }', ''].join('\n'),
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'full',
    });
    state.importResolutions = resolveImports(state);
    const calls = resolveCalls(state);

    const c = calls.find(x => x.calleeName === 'open');
    expect(c, 'open() call').toBeDefined();
    expect(c!.reason).not.toBe('python_builtin_callee');
    expect(c!.kind).toBe('resolved');
  });
});

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

/**
 * Gap #1 (STUB-G5E6EA / WO-SCANNER-RESOLVER-THREE-GAPS-001): Python stdlib
 * imports (`import json`, `import pathlib`, `from re import match`) were
 * classified `unresolved` with reason `not_in_manifest_or_node_modules`
 * because `module.isBuiltin` only knows Node.js builtins. On Primary-Sources
 * this accounted for ~500 false-unresolved import edges (pathlib 198, json
 * 127, re 79, csv 34, time 34, collections 28, ...). Fix: a curated
 * PYTHON_STDLIB set classifies these as `external` with reason
 * `python_stdlib`, which graph-builder maps to resolutionStatus `builtin`
 * (mirrors the node_builtin disposition, STUB-QT400D — no enum changes).
 */
describe('Gap #1 — Python stdlib imports classify external/python_stdlib', () => {
  it('`import json` / `import pathlib` are external, not unresolved', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-pystdlib-'));
    created.push(dir);
    await fs.writeFile(
      path.join(dir, 'mod.py'),
      'import json\nimport pathlib\nimport re\n\ndef f():\n    return json.dumps({})\n',
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['py'],
      mode: 'minimal',
    });

    for (const mod of ['json', 'pathlib', 're']) {
      const r = state.importResolutions.find(res => res.originSpecifier === mod);
      expect(r, `resolution for import ${mod}`).toBeDefined();
      expect(r!.kind, `kind for import ${mod}`).toBe('external');
      expect(r!.reason, `reason for import ${mod}`).toBe('python_stdlib');
    }
  });

  it('dotted stdlib module `import urllib.parse` resolves via top-level package', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-pystdlib-dotted-'));
    created.push(dir);
    await fs.writeFile(
      path.join(dir, 'mod.py'),
      'import urllib.parse\nimport os.path\n',
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['py'],
      mode: 'minimal',
    });

    const urllib = state.importResolutions.find(res => res.originSpecifier === 'urllib.parse');
    expect(urllib).toBeDefined();
    expect(urllib!.kind).toBe('external');
    expect(urllib!.reason).toBe('python_stdlib');
  });

  it('a genuinely-unknown bare module stays unresolved', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-pystdlib-neg-'));
    created.push(dir);
    await fs.writeFile(path.join(dir, 'mod.py'), 'import totallynotastdlibmodule\n', 'utf-8');

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['py'],
      mode: 'minimal',
    });

    const r = state.importResolutions.find(res => res.originSpecifier === 'totallynotastdlibmodule');
    expect(r).toBeDefined();
    expect(r!.kind).not.toBe('external');
  });
});

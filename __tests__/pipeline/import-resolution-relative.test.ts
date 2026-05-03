import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

async function runProject(files: Record<string, string>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-rel-'));
  created.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, 'utf-8');
  }
  return new PipelineOrchestrator().run(dir, {
    outputDir: path.join(dir, '.coderef'),
    languages: ['ts'],
    mode: 'minimal',
  });
}

describe('Phase 3 relative import resolution (AC-02 unit)', () => {
  it('resolves `./x` to ./x.ts when target file is in project (extensionless)', async () => {
    const state = await runProject({
      'src/x.ts': 'export function fooX() { return 1; }\n',
      'src/main.ts': "import { fooX } from './x';\nexport const m = fooX;\n",
    });
    const r = state.importResolutions.find(r => r.localName === 'fooX');
    expect(r).toBeDefined();
    expect(r!.kind).toBe('resolved');
    expect(r!.resolvedTargetCodeRefId).toBeDefined();
  });

  it('resolves `../y` correctly when importer is in a nested directory', async () => {
    const state = await runProject({
      'src/y.ts': 'export const yConst = 42;\n',
      'src/sub/main.ts': "import { yConst } from '../y';\nexport const m = yConst;\n",
    });
    const r = state.importResolutions.find(r => r.localName === 'yConst');
    expect(r).toBeDefined();
    expect(r!.kind).toBe('resolved');
  });

  it('resolves `./x` to ./x/index.ts when ./x is a directory', async () => {
    const state = await runProject({
      'src/x/index.ts': 'export const idxConst = 7;\n',
      'src/main.ts': "import { idxConst } from './x';\nexport const m = idxConst;\n",
    });
    const r = state.importResolutions.find(r => r.localName === 'idxConst');
    expect(r).toBeDefined();
    expect(r!.kind).toBe('resolved');
  });
});

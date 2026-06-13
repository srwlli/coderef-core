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
 * Gap #2 (STUB-G5E6EA / WO-SCANNER-RESOLVER-THREE-GAPS-001): tsconfig.json
 * `paths` aliases like `"@/*": ["./*"]` (the Next.js default, used by
 * Primary-Sources) were NOT resolving — `@/lib/x` imports landed as
 * `unresolved` with reason `not_in_manifest_or_node_modules` even though the
 * target file existed on disk. Root cause: resolveModuleSpecifier resolved the
 * alias target to an ABSOLUTE path then probed it against the project file set,
 * whose keys are PROJECT-RELATIVE — so every alias probe missed.
 */
describe('Gap #2 — tsconfig.json paths alias resolution (@/* → ./*)', () => {
  it('resolves `@/lib/x` to the local file when tsconfig has "@/*": ["./*"]', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-tsalias-'));
    created.push(dir);
    await fs.writeFile(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { paths: { '@/*': ['./*'] } } }, null, 2),
      'utf-8',
    );
    await fs.mkdir(path.join(dir, 'lib'), { recursive: true });
    await fs.writeFile(path.join(dir, 'lib', 'helper.ts'), 'export function help() { return 1; }\n', 'utf-8');
    await fs.writeFile(
      path.join(dir, 'main.ts'),
      "import { help } from '@/lib/helper';\nexport const m = help;\n",
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    const r = state.importResolutions.find(
      res => res.localName === 'help' && res.originSpecifier === '@/lib/helper',
    );
    expect(r).toBeDefined();
    expect(r!.kind).toBe('resolved');
    expect(r!.resolvedModuleFile).toBeDefined();
    expect(r!.resolvedModuleFile!.replace(/\\/g, '/')).toContain('lib/helper');
  });

  it('resolves a nested `@/components/ui/button` alias subpath', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-tsalias-nested-'));
    created.push(dir);
    await fs.writeFile(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['./*'] } } }, null, 2),
      'utf-8',
    );
    await fs.mkdir(path.join(dir, 'components', 'ui'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'components', 'ui', 'button.tsx'),
      'export function Button() { return null; }\n',
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'app.tsx'),
      "import { Button } from '@/components/ui/button';\nexport const a = Button;\n",
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts', 'tsx'],
      mode: 'minimal',
    });

    const r = state.importResolutions.find(
      res => res.localName === 'Button' && res.originSpecifier === '@/components/ui/button',
    );
    expect(r).toBeDefined();
    expect(r!.kind).toBe('resolved');
  });
});

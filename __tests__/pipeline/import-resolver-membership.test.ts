import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { resolveImports, resolveModuleSpecifier } from '../../src/pipeline/import-resolver.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('membership check: NodeNext .js specifiers must resolve to on-disk .ts sources (STUB-XK82Z2)', () => {
  it('resolveModuleSpecifier maps .js/.mjs/.cjs/.jsx specifiers onto TS project files', () => {
    const projectFiles = new Set([
      'src/util.ts',
      'src/widget.tsx',
      'src/esm-only.mts',
      'src/cjs-only.cts',
    ]);
    const noAlias = new Map<string, string[]>();

    expect(resolveModuleSpecifier('./util.js', 'src/main.ts', projectFiles, noAlias)).toBe('src/util.ts');
    expect(resolveModuleSpecifier('./widget.jsx', 'src/main.ts', projectFiles, noAlias)).toBe('src/widget.tsx');
    expect(resolveModuleSpecifier('./widget.js', 'src/main.ts', projectFiles, noAlias)).toBe('src/widget.tsx');
    expect(resolveModuleSpecifier('./esm-only.mjs', 'src/main.ts', projectFiles, noAlias)).toBe('src/esm-only.mts');
    expect(resolveModuleSpecifier('./cjs-only.cjs', 'src/main.ts', projectFiles, noAlias)).toBe('src/cjs-only.cts');
  });

  it('exact on-disk .js file wins over a sibling .ts mapping', () => {
    const projectFiles = new Set(['src/x.js', 'src/x.ts']);
    expect(resolveModuleSpecifier('./x.js', 'src/main.ts', projectFiles, new Map())).toBe('src/x.js');
  });

  it('genuinely-missing targets stay unresolved', () => {
    const projectFiles = new Set(['src/util.ts']);
    expect(resolveModuleSpecifier('./missing.js', 'src/main.ts', projectFiles, new Map())).toBeUndefined();
  });

  it('end-to-end: import { u } from "./util.js" resolves against util.ts (no relative_target_not_in_project)', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-member-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(path.join(dir, 'src', 'util.ts'), 'export const u = 1;\n', 'utf-8');
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      "import { u } from './util.js';\nexport const m = u;\n",
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    const resolutions = resolveImports(state);
    const binding = resolutions.find(
      r => r.originSpecifier === './util.js' && r.localName === 'u',
    );
    expect(binding).toBeDefined();
    expect(binding!.kind).toBe('resolved');
    expect(binding!.reason).toBeUndefined();
    expect(binding!.resolvedModuleFile && binding!.resolvedModuleFile.replace(/\\/g, '/')).toMatch(/src\/util\.ts$/);
  });

  it('end-to-end: import of a missing ./nope.js stays unresolved with relative_target_not_in_project', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-member-neg-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      "import { n } from './nope.js';\nexport const m = n;\n",
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    const resolutions = resolveImports(state);
    const binding = resolutions.find(
      r => r.originSpecifier === './nope.js' && r.localName === 'n',
    );
    expect(binding).toBeDefined();
    expect(binding!.kind).toBe('unresolved');
    expect(binding!.reason).toBe('relative_target_not_in_project');
  });
});

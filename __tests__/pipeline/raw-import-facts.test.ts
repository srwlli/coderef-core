import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import type { RawImportFact } from '../../src/pipeline/types.js';

const createdProjects: string[] = [];

async function createProject(files: Record<string, string>): Promise<string> {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-raw-imports-'));
  createdProjects.push(projectDir);
  await Promise.all(
    Object.entries(files).map(async ([rel, content]) => {
      const filePath = path.join(projectDir, rel);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
    }),
  );
  return projectDir;
}

async function runRawImports(projectDir: string): Promise<RawImportFact[]> {
  const state = await new PipelineOrchestrator().run(projectDir, {
    outputDir: path.join(projectDir, '.coderef'),
    languages: ['ts'],
    mode: 'minimal',
  });
  return state.rawImports;
}

describe('Phase 2 raw import facts', () => {
  afterEach(async () => {
    await Promise.all(
      createdProjects.splice(0).map(d => fs.rm(d, { recursive: true, force: true })),
    );
  });

  it('captures alias bindings on named imports', async () => {
    const projectDir = await createProject({
      'src/entry.ts': "import { foo as bar } from './x';\n",
    });
    const facts = await runRawImports(projectDir);
    const fact = facts.find(f => f.moduleSpecifier === './x');
    expect(fact).toBeDefined();
    expect(fact!.specifiers).toEqual([{ imported: 'foo', local: 'bar' }]);
    expect(fact!.dynamic).toBe(false);
    expect(fact!.typeOnly).toBe(false);
  });

  it('flags dynamic imports', async () => {
    const projectDir = await createProject({
      'src/entry.ts': "export function go() { return import('./x'); }\n",
    });
    const facts = await runRawImports(projectDir);
    const fact = facts.find(f => f.moduleSpecifier === './x');
    expect(fact).toBeDefined();
    expect(fact!.dynamic).toBe(true);
  });

  it('flags type-only imports', async () => {
    const projectDir = await createProject({
      'src/entry.ts': "import type { X } from './x';\nexport const _ = 1;\n",
    });
    const facts = await runRawImports(projectDir);
    const fact = facts.find(f => f.moduleSpecifier === './x');
    expect(fact).toBeDefined();
    expect(fact!.typeOnly).toBe(true);
  });

  it('captures namespace imports', async () => {
    const projectDir = await createProject({
      'src/entry.ts': "import * as ns from './x';\nexport const _ = ns;\n",
    });
    const facts = await runRawImports(projectDir);
    const fact = facts.find(f => f.moduleSpecifier === './x');
    expect(fact).toBeDefined();
    expect(fact!.namespaceImport).toBe('ns');
  });

  it('captures default imports', async () => {
    const projectDir = await createProject({
      'src/entry.ts': "import Foo from './x';\nexport const _ = Foo;\n",
    });
    const facts = await runRawImports(projectDir);
    const fact = facts.find(f => f.moduleSpecifier === './x');
    expect(fact).toBeDefined();
    expect(fact!.defaultImport).toBe('Foo');
  });

  it('captures combined default + named imports with multiple aliases', async () => {
    const projectDir = await createProject({
      'src/entry.ts': "import D, { a, b as c } from './x';\nexport const _ = [D, a, c];\n",
    });
    const facts = await runRawImports(projectDir);
    const fact = facts.find(f => f.moduleSpecifier === './x');
    expect(fact).toBeDefined();
    expect(fact!.defaultImport).toBe('D');
    expect(fact!.specifiers).toEqual([
      { imported: 'a', local: 'a' },
      { imported: 'b', local: 'c' },
    ]);
  });
});

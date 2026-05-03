import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import type { RawExportFact } from '../../src/pipeline/types.js';

const createdProjects: string[] = [];

async function createProject(files: Record<string, string>): Promise<string> {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-raw-exports-'));
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

async function runRawExports(projectDir: string): Promise<RawExportFact[]> {
  const state = await new PipelineOrchestrator().run(projectDir, {
    outputDir: path.join(projectDir, '.coderef'),
    languages: ['ts'],
    mode: 'minimal',
  });
  return state.rawExports;
}

describe('Phase 2 raw export facts', () => {
  afterEach(async () => {
    await Promise.all(
      createdProjects.splice(0).map(d => fs.rm(d, { recursive: true, force: true })),
    );
  });

  it('captures named const exports', async () => {
    const projectDir = await createProject({
      'src/m.ts': 'export const x = 1;\n',
    });
    const facts = await runRawExports(projectDir);
    const fact = facts.find(f => f.exportedName === 'x');
    expect(fact).toBeDefined();
    expect(fact!.kind).toBe('named');
    expect(fact!.localName).toBe('x');
  });

  it('captures named function exports', async () => {
    const projectDir = await createProject({
      'src/m.ts': 'export function foo() { return 1; }\n',
    });
    const facts = await runRawExports(projectDir);
    const fact = facts.find(f => f.exportedName === 'foo');
    expect(fact).toBeDefined();
    expect(fact!.kind).toBe('named');
  });

  it('captures default exports with local name', async () => {
    const projectDir = await createProject({
      'src/m.ts': 'export default class Bar {}\n',
    });
    const facts = await runRawExports(projectDir);
    const fact = facts.find(f => f.kind === 'default');
    expect(fact).toBeDefined();
    expect(fact!.exportedName).toBe('default');
    expect(fact!.localName).toBe('Bar');
  });

  it('captures re-exports', async () => {
    const projectDir = await createProject({
      'src/m.ts': "export { x } from './y';\n",
    });
    const facts = await runRawExports(projectDir);
    const fact = facts.find(f => f.exportedName === 'x');
    expect(fact).toBeDefined();
    expect(fact!.kind).toBe('reexport');
  });

  it('captures namespace re-exports', async () => {
    const projectDir = await createProject({
      'src/m.ts': "export * as ns from './x';\n",
    });
    const facts = await runRawExports(projectDir);
    const fact = facts.find(f => f.kind === 'namespace');
    expect(fact).toBeDefined();
    expect(fact!.exportedName).toBe('ns');
  });
});

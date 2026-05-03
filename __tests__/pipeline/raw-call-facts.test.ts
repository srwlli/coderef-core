import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import type { RawCallFact } from '../../src/pipeline/types.js';

const createdProjects: string[] = [];

async function createProject(files: Record<string, string>): Promise<string> {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-raw-calls-'));
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

async function runRawCalls(projectDir: string): Promise<RawCallFact[]> {
  const state = await new PipelineOrchestrator().run(projectDir, {
    outputDir: path.join(projectDir, '.coderef'),
    languages: ['ts'],
    mode: 'minimal',
  });
  return state.rawCalls;
}

describe('Phase 2 raw call facts', () => {
  afterEach(async () => {
    await Promise.all(
      createdProjects.splice(0).map(d => fs.rm(d, { recursive: true, force: true })),
    );
  });

  it('preserves receiver text on method calls', async () => {
    const projectDir = await createProject({
      'src/entry.ts': [
        'class Service { save(x: string) { return x; } }',
        'export function entry() {',
        '  const obj = new Service();',
        "  obj.save('hi');",
        '}',
        '',
      ].join('\n'),
    });
    const calls = await runRawCalls(projectDir);
    const save = calls.find(c => c.calleeName === 'save');
    expect(save).toBeDefined();
    expect(save!.receiverText).toBe('obj');
    expect(save!.callExpressionText).toBe("obj.save('hi')");
  });

  it('populates scope path for nested function calls', async () => {
    const projectDir = await createProject({
      'src/entry.ts': [
        'export function outer() {',
        '  function inner() {',
        '    inner();',
        '  }',
        '}',
        '',
      ].join('\n'),
    });
    const calls = await runRawCalls(projectDir);
    const innerCall = calls.find(c => c.calleeName === 'inner');
    expect(innerCall).toBeDefined();
    expect(innerCall!.scopePath).toEqual(['outer', 'inner']);
  });

  it('populates scope path for class method calls', async () => {
    const projectDir = await createProject({
      'src/entry.ts': [
        'class C {',
        '  m1() { this.m2(); }',
        '  m2() {}',
        '}',
        'export const _ = new C();',
        '',
      ].join('\n'),
    });
    const calls = await runRawCalls(projectDir);
    const m2Call = calls.find(c => c.calleeName === 'm2');
    expect(m2Call).toBeDefined();
    expect(m2Call!.scopePath).toEqual(['C', 'm1']);
    expect(m2Call!.receiverText).toBe('this');
  });

  it('emits null receiverText on bare function calls', async () => {
    const projectDir = await createProject({
      'src/entry.ts': [
        'function foo() {}',
        'export function entry() { foo(); }',
        '',
      ].join('\n'),
    });
    const calls = await runRawCalls(projectDir);
    const fooCall = calls.find(c => c.calleeName === 'foo');
    expect(fooCall).toBeDefined();
    expect(fooCall!.receiverText).toBeNull();
  });
});

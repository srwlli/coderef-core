import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { createCodeRefId } from '../../src/utils/coderef-id.js';

const created: string[] = [];

afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('Phase 4 call-resolution obj.method() (AC-04 + guardrail-4)', () => {
  it('obj.method() with `const obj = new Y()` resolves to Y.method (option-1, guardrail 1+3)', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-call-obj-newY-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      [
        'export class Service {',
        '  handle() { return 1; }',
        '}',
        'export function run() {',
        '  const svc = new Service();',
        '  return svc.handle();',
        '}',
      ].join('\n'),
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    const handleElem = state.elements.find(e => e.name === 'Service.handle');
    expect(handleElem).toBeDefined();
    const expectedHandleId = handleElem!.codeRefId
      ?? createCodeRefId(handleElem!, state.projectPath, { includeLine: true });
    const call = state.callResolutions.find(r =>
      r.receiverText === 'svc' && r.calleeName === 'handle',
    );
    expect(call).toBeDefined();
    expect(call?.kind).toBe('resolved');
    expect(call?.resolvedTargetCodeRefId).toBe(expectedHandleId);
  });

  it('GUARDRAIL 4: obj.method() where obj = factory call (NOT new) stays ambiguous, never silently resolved', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-call-obj-factory-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      [
        'export class Service {',
        '  handle() { return 1; }',
        '}',
        'export function makeService() { return new Service(); }',
        'export function run() {',
        '  const svc = makeService();',
        '  return svc.handle();',
        '}',
      ].join('\n'),
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    const factoryCall = state.callResolutions.find(r =>
      r.receiverText === 'svc' && r.calleeName === 'handle',
    );
    expect(factoryCall).toBeDefined();
    // Factory pattern stays ambiguous (or unresolved) — never silently resolved.
    expect(factoryCall?.kind).not.toBe('resolved');
    expect(['ambiguous', 'unresolved']).toContain(factoryCall?.kind);
  });

  it('obj.method() with completely unknown receiver and unknown method → unresolved', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-call-obj-unknown-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      [
        'export function run() {',
        '  // @ts-expect-error — testing resolver behavior on undefined receiver',
        '  return mystery.unknownMethod();',
        '}',
      ].join('\n'),
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    const call = state.callResolutions.find(r =>
      r.receiverText === 'mystery' && r.calleeName === 'unknownMethod',
    );
    expect(call).toBeDefined();
    expect(call?.kind).toBe('unresolved');
    expect(call?.reason).toBe('receiver_not_in_symbol_table');
  });
});

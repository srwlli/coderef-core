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

describe('Phase 3 alias-import binding (AC-06 unit, ground-truth alias-imports)', () => {
  it('`import { foo as bar } from "./x"` binds local name "bar" to codeRefId of x.foo', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-alias-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(path.join(dir, 'src', 'x.ts'), 'export function foo() { return 1; }\n', 'utf-8');
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      "import { foo as bar } from './x';\nexport const m = bar;\n",
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    // The resolution for the alias binding has localName === 'bar'
    // (post-alias) and originSpecifier === './x'.
    const r = state.importResolutions.find(
      res => res.localName === 'bar' && res.originSpecifier === './x',
    );
    expect(r).toBeDefined();
    expect(r!.kind).toBe('resolved');
    expect(r!.resolvedTargetCodeRefId).toBeDefined();

    // The target codeRefId must point at x.foo, NOT at main.ts's bar.
    const fooElem = state.elements.find(e => e.name === 'foo' && e.file.endsWith('x.ts'));
    expect(fooElem).toBeDefined();
    const expectedCodeRefId = fooElem!.codeRefId
      ?? createCodeRefId(fooElem!, state.projectPath, { includeLine: true });
    expect(r!.resolvedTargetCodeRefId).toBe(expectedCodeRefId);
  });
});

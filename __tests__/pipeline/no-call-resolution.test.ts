import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

const FORBIDDEN_FIELDS = [
  'resolvedCallTargetId',
  'callEdgeId',
  'callResolution',
  'methodResolutionKind',
  'scopeResolvedTo',
];

describe('Phase 4 boundary INVARIANT: NO call resolution in Phase 3 (AC-14)', () => {
  it('ImportResolution[] and PipelineState carry no call-resolution fields; rawCalls is unmodified by Phase 3', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-no-call-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(path.join(dir, 'src', 'h.ts'), 'export function helperFn() { return 1; }\n', 'utf-8');
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      "import { helperFn } from './h';\nexport function run() { return helperFn(); }\n",
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    // No call-resolution fields on ImportResolution.
    for (const r of state.importResolutions) {
      for (const field of FORBIDDEN_FIELDS) {
        expect(r as unknown as Record<string, unknown>).not.toHaveProperty(field);
      }
    }

    // No call-resolution fields on PipelineState top level.
    for (const field of FORBIDDEN_FIELDS) {
      expect(state as unknown as Record<string, unknown>).not.toHaveProperty(field);
    }

    // state.rawCalls untouched: every entry has the original Phase 2 shape
    // — sourceElementCandidate (string|null), receiverText (string|null),
    // calleeName (string), scopePath (string[]). NO new "resolved" fields.
    for (const c of state.rawCalls) {
      const obj = c as unknown as Record<string, unknown>;
      for (const field of FORBIDDEN_FIELDS) {
        expect(obj).not.toHaveProperty(field);
      }
      // Also no `resolvedTo` / `targetId` / `edgeId` / `resolutionStatus`.
      expect(obj).not.toHaveProperty('resolvedTo');
      expect(obj).not.toHaveProperty('targetId');
      expect(obj).not.toHaveProperty('edgeId');
      expect(obj).not.toHaveProperty('resolutionStatus');
    }
  });
});

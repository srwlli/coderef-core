import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

const VALID_RELATIONSHIPS = new Set(['import', 'call', 'export', 'header-import']);
const VALID_RESOLUTION_STATUSES = new Set([
  'resolved', 'unresolved', 'ambiguous', 'external',
  'builtin', 'dynamic', 'typeOnly', 'stale',
]);

describe('Phase 5 graph-construction edge schema (AC-03 + AC-05 + AC-10)', () => {
  it('every edge has required fields; resolved have targetId; non-resolved omit targetId; ids are unique; enums are valid', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-phase5-schema-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    // Mixed-kinds fixture: resolved (helperFn), unresolved (./missing),
    // ambiguous (duplicate across files), external (a known package),
    // builtin (Math.floor).
    await fs.writeFile(path.join(dir, 'src', 'a.ts'), 'export function dup() { return "a"; }\n', 'utf-8');
    await fs.writeFile(path.join(dir, 'src', 'b.ts'), 'export function dup() { return "b"; }\n', 'utf-8');
    await fs.writeFile(path.join(dir, 'src', 'helper.ts'), 'export function helperFn() { return 1; }\n', 'utf-8');
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      [
        "import { helperFn } from './helper';",
        "import { absent } from './missing';",
        'export function entry() {',
        '  helperFn();',
        '  dup();',
        '  absent();',
        '  Math.floor(1.5);',
        '}',
      ].join('\n'),
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    const seenIds = new Set<string>();
    for (const edge of state.graph.edges) {
      // AC-03: every edge has id, sourceId, relationship, resolutionStatus.
      expect(typeof edge.id).toBe('string');
      expect(edge.id?.length).toBeGreaterThan(0);
      expect(typeof edge.sourceId).toBe('string');
      expect(VALID_RELATIONSHIPS.has(edge.relationship as string)).toBe(true);
      expect(VALID_RESOLUTION_STATUSES.has(edge.resolutionStatus as string)).toBe(true);

      // AC-10: every id unique within graph.
      expect(seenIds.has(edge.id!)).toBe(false);
      seenIds.add(edge.id!);

      // AC-05: resolved edges have targetId; non-resolved OMIT targetId.
      if (edge.resolutionStatus === 'resolved') {
        expect(typeof edge.targetId).toBe('string');
        expect(edge.targetId?.length).toBeGreaterThan(0);
      } else {
        expect(edge.targetId).toBeUndefined();
      }

      // Ambiguous edges have candidates >=2.
      if (edge.resolutionStatus === 'ambiguous') {
        const candidates = edge.candidates
          ?? (edge.evidence as Record<string, unknown> | undefined)?.candidates as string[] | undefined;
        expect(Array.isArray(candidates)).toBe(true);
        expect((candidates as string[]).length).toBeGreaterThanOrEqual(2);
      }
    }

    // Sanity: fixture exercises multiple kinds.
    const kinds = new Set(state.graph.edges.map(e => e.resolutionStatus));
    expect(kinds.has('resolved')).toBe(true);
    expect(kinds.has('unresolved')).toBe(true);
  });
});

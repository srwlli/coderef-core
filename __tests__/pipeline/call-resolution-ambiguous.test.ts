import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { buildSymbolTable } from '../../src/pipeline/call-resolver.js';
import type { PipelineState } from '../../src/pipeline/types.js';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';
import { createCodeRefId } from '../../src/utils/coderef-id.js';

const created: string[] = [];

afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('Phase 4 call-resolution duplicate-name ambiguity (AC-05)', () => {
  it('duplicate function names across files yield ambiguous with candidates[]', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-call-amb-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'a.ts'),
      'export function helper() { return "a"; }\n',
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'src', 'b.ts'),
      'export function helper() { return "b"; }\n',
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'src', 'entry.ts'),
      [
        'export function entry() {',
        '  return helper();',
        '}',
      ].join('\n'),
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    const helperA = state.elements.find(e => e.name === 'helper' && e.file.includes('a.ts'));
    const helperB = state.elements.find(e => e.name === 'helper' && e.file.includes('b.ts'));
    expect(helperA).toBeDefined();
    expect(helperB).toBeDefined();
    const helperAId = helperA!.codeRefId
      ?? createCodeRefId(helperA!, state.projectPath, { includeLine: true });
    const helperBId = helperB!.codeRefId
      ?? createCodeRefId(helperB!, state.projectPath, { includeLine: true });

    const call = state.callResolutions.find(r =>
      r.calleeName === 'helper' && r.receiverText === null && r.sourceFile.includes('entry.ts'),
    );
    expect(call).toBeDefined();
    expect(call?.kind).toBe('ambiguous');
    expect(call?.candidates).toBeDefined();
    expect(call?.candidates).toEqual(
      expect.arrayContaining([helperAId, helperBId]),
    );
    // Ambiguous never has a single resolved target.
    expect(call?.resolvedTargetCodeRefId).toBeUndefined();

    // STUB-1XDRTR regression: an ambiguous candidate array must never contain
    // the same codeRefId twice. Pre-fix, addEntry pushed duplicate entries and
    // this array could list the identical id up to 17× (verified live).
    expect(call?.candidates).toEqual([...new Set(call?.candidates)]);
  });
});

// STUB-1XDRTR: unit-level regression for the symbol-table de-dup guard.
// buildSymbolTable.addEntry previously push()ed with no duplicate check, so an
// element offered twice under the same name produced two identical entries,
// which then bloated every ambiguous edge's candidates[]. This test reproduces
// the precondition (the same method element present twice in state.elements)
// and asserts the table holds exactly one entry per identical symbol.
describe('Phase 4 buildSymbolTable de-dup guard (STUB-1XDRTR)', () => {
  function stateWithDuplicateMethod(): PipelineState {
    const graph: ExportedGraph = {
      nodes: [],
      edges: [],
      statistics: { nodeCount: 0, edgeCount: 0, edgesByType: {} },
    };
    const methodElem = {
      type: 'method' as const,
      name: 'Widget.render',
      file: '/tmp/dedup/src/widget.ts',
      line: 3,
      codeRefId: '@Method/src/widget.ts#Widget.render:3',
    };
    return {
      projectPath: '/tmp/dedup',
      files: new Map([['ts', ['/tmp/dedup/src/widget.ts']]]),
      // Same element appears twice — the live duplicate-registration condition.
      elements: [methodElem, { ...methodElem }],
      imports: [],
      calls: [],
      rawImports: [],
      rawCalls: [],
      rawExports: [],
      headerFacts: new Map(),
      headerImportFacts: [],
      headerParseErrors: [],
      importResolutions: [],
      callResolutions: [],
      graph,
      sources: new Map(),
      options: {},
      metadata: { startTime: 0, filesScanned: 1, elementsExtracted: 2, relationshipsExtracted: 0 },
    } as unknown as PipelineState;
  }

  it('registers a duplicated element exactly once per name (bare + qualified)', () => {
    const table = buildSymbolTable(stateWithDuplicateMethod());
    const bare = table.get('render') ?? [];
    const qualified = table.get('Widget.render') ?? [];
    // Pre-fix: bare.length === 2, qualified.length === 2.
    expect(bare.length).toBe(1);
    expect(qualified.length).toBe(1);
    // Every entry list is free of duplicate codeRefIds.
    for (const [, entries] of table) {
      const ids = entries.map(e => e.codeRefId);
      expect(ids).toEqual([...new Set(ids)]);
    }
  });
});

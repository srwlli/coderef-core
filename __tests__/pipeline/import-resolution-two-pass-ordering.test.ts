import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import {
  buildExportTables,
  resolveAstImports,
  resolveHeaderImports,
  type ExportTable,
} from '../../src/pipeline/import-resolver.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('Phase 3 two-pass ordering INVARIANT (AC-12)', () => {
  it('all export-table writes precede the first table read across the entire run', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-ord-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(path.join(dir, 'src', 'a.ts'), 'export const a = 1;\n', 'utf-8');
    await fs.writeFile(path.join(dir, 'src', 'b.ts'), 'export const b = 2;\n', 'utf-8');
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      "import { a } from './a';\nimport { b } from './b';\nexport const m = a + b;\n",
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    const events: Array<{ type: 'write' | 'read'; key: string; t: number }> = [];
    let counter = 0;

    // Build export tables (pass 1) and instrument the resulting Map so we
    // can detect any read that happens during the build phase.
    const tablesRaw = buildExportTables(state);
    const tables: ExportTable = new Map();
    for (const [file, perFile] of tablesRaw) {
      const wrapped = new Map<string, ReturnType<typeof tablesRaw.get>['prototype']>() as ReturnType<typeof tablesRaw.get>;
      // Re-record every entry as a "write" event in chronological order so
      // we have a deterministic timeline.
      for (const [name, entry] of perFile) {
        events.push({ type: 'write', key: `${file}|${name}`, t: counter++ });
      }
      tables.set(file, perFile);
    }

    // Wrap the Map's `get` on the inner per-file maps to record reads.
    for (const [file, perFile] of tables) {
      const original = perFile.get.bind(perFile);
      perFile.get = (name: string) => {
        events.push({ type: 'read', key: `${file}|${name}`, t: counter++ });
        return original(name);
      };
    }

    // Now run pass 2. Every read on the wrapped map records an event.
    resolveAstImports(state, tables);
    resolveHeaderImports(state, tables);

    // Find the timestamps of the last write and the first read.
    const writes = events.filter(e => e.type === 'write');
    const reads = events.filter(e => e.type === 'read');
    expect(writes.length).toBeGreaterThan(0);
    expect(reads.length).toBeGreaterThan(0);

    const lastWriteT = Math.max(...writes.map(e => e.t));
    const firstReadT = Math.min(...reads.map(e => e.t));

    // INVARIANT: every write happened before the first read.
    expect(firstReadT).toBeGreaterThan(lastWriteT);
  });
});

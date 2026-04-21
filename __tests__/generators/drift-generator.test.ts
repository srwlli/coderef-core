import * as fs from 'fs/promises';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { DriftGenerator } from '../../src/pipeline/generators/drift-generator.js';
import { cleanupEnvironment, createMockEnvironment, readJson } from './helpers.js';

describe('DriftGenerator', () => {
  const created: string[] = [];

  afterEach(async () => {
    await Promise.all(created.splice(0).map(dir => cleanupEnvironment(dir)));
  });

  it('detects added, deleted, and modified elements from a previous index', async () => {
    const env = await createMockEnvironment();
    created.push(env.projectDir);

    const previousIndex = [
      {
        type: 'function',
        name: 'alpha',
        file: env.files.example,
        line: 4,
        exported: false,
        parameters: [{ name: 'id', type: 'number' }],
      },
      {
        type: 'function',
        name: 'gamma',
        file: path.join(env.projectDir, 'src', 'deleted.ts'),
        line: 1,
      },
    ];

    await fs.writeFile(
      path.join(env.outputDir, 'index.json'),
      JSON.stringify(previousIndex, null, 2),
      'utf-8'
    );

    await new DriftGenerator().generate(env.state, env.outputDir);

    const output = await readJson<any>(path.join(env.outputDir, 'reports', 'drift.json'));

    expect(output.summary.added).toBe(2);
    expect(output.summary.deleted).toBe(1);
    expect(output.summary.modified).toBe(1);
    expect(output.added.map((element: any) => element.file)).toEqual(
      expect.arrayContaining(['src/example.test.ts', 'src/untested.ts'])
    );
    expect(output.deleted[0].file).toBe('src/deleted.ts');
    expect(output.modified[0].file).toBe('src/example.ts');
    expect(output.modified[0].changes).toEqual(expect.arrayContaining(['exported: false → true', 'parameters changed']));
  });

  it('reports zero drift when previous index paths are relative and current element paths are absolute', async () => {
    const env = await createMockEnvironment();
    created.push(env.projectDir);

    const previousIndex = env.state.elements.map(element => ({
      ...element,
      file: path.relative(env.projectDir, element.file).replace(/\\/g, '/'),
    }));

    await fs.writeFile(
      path.join(env.outputDir, 'index.json'),
      JSON.stringify(previousIndex, null, 2),
      'utf-8'
    );

    await new DriftGenerator().generate(env.state, env.outputDir);

    const output = await readJson<any>(path.join(env.outputDir, 'reports', 'drift.json'));

    expect(output.driftPercentage).toBe(0);
    expect(output.added).toEqual([]);
    expect(output.deleted).toEqual([]);
    expect(output.modified).toEqual([]);
    expect(output.summary).toEqual({
      totalCurrent: env.state.elements.length,
      totalPrevious: env.state.elements.length,
      added: 0,
      deleted: 0,
      modified: 0,
    });
  });
});

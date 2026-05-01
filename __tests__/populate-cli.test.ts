import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

const execAsync = promisify(exec);

describe('populate-coderef CLI', () => {
  const created: string[] = [];
  const testFile = fileURLToPath(import.meta.url);
  const packageRoot = path.resolve(path.dirname(testFile), '..');
  const tscEntrypoint = path.join(packageRoot, 'node_modules', 'typescript', 'bin', 'tsc');

  beforeAll(async () => {
    await execAsync(`"${process.execPath}" "${tscEntrypoint}" -p tsconfig.json`, {
      cwd: packageRoot,
    });
  });

  afterEach(async () => {
    await Promise.all(
      created.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true }))
    );
  });

  it('generates the expected Phase 3 output files for a sample project', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-populate-cli-'));
    created.push(projectDir);

    const srcDir = path.join(projectDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    await fs.writeFile(
      path.join(srcDir, 'example.ts'),
      [
        "import { beta } from './untested';",
        'export async function alpha(id: number) {',
        '  if (id > 0) {',
        '    return beta(id);',
        '  }',
        '  return 0;',
        '}',
      ].join('\n'),
      'utf-8'
    );

    await fs.writeFile(
      path.join(srcDir, 'untested.ts'),
      [
        'export function beta(id: number) {',
        '  return id;',
        '}',
      ].join('\n'),
      'utf-8'
    );

    await fs.writeFile(
      path.join(srcDir, 'example.test.ts'),
      [
        "import { alpha } from './example';",
        "test('alpha', async () => {",
        '  expect(await alpha(1)).toBe(1);',
        '});',
      ].join('\n'),
      'utf-8'
    );

    const { stdout } = await execAsync(
      `node dist/src/cli/populate.js "${projectDir}" --json`,
      { cwd: packageRoot }
    );

    const result = JSON.parse(stdout);
    const outputDir = path.join(projectDir, '.coderef');

    expect(result.success).toBe(true);
    expect(result.failures).toHaveLength(0);

    const expectedFiles = [
      'index.json',
      'semantic-registry.json',
      'graph.json',
      'context.json',
      'context.md',
      'reports/complexity/summary.json',
      'reports/patterns.json',
      'reports/coverage.json',
      'reports/drift.json',
      'reports/validation.json',
      'diagrams/dependencies.mmd',
      'diagrams/calls.mmd',
      'diagrams/imports.mmd',
      'diagrams/dependencies.dot',
      'exports/graph.json',
      'exports/graph.jsonld',
      'exports/diagram-wrapped.md',
    ];

    for (const relativePath of expectedFiles) {
      await expect(fs.access(path.join(outputDir, relativePath))).resolves.toBeUndefined();
    }

    const sourceContent = await fs.readFile(path.join(srcDir, 'example.ts'), 'utf-8');
    expect(sourceContent).not.toContain('@semantic');

    const index = JSON.parse(await fs.readFile(path.join(outputDir, 'index.json'), 'utf-8'));
    expect(index.elements[0].codeRefId).toMatch(/^@/);

    const semanticRegistry = JSON.parse(await fs.readFile(path.join(outputDir, 'semantic-registry.json'), 'utf-8'));
    expect(semanticRegistry.generated_from).toBe('.coderef/index.json');
  });

  it('auto-detects python repos when --lang is omitted', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-populate-cli-py-'));
    created.push(projectDir);

    await fs.writeFile(
      path.join(projectDir, 'main.py'),
      [
        'def alpha(value: int) -> int:',
        '    return beta(value)',
        '',
        'def beta(value: int) -> int:',
        '    return value',
      ].join('\n'),
      'utf-8'
    );

    const { stdout } = await execAsync(
      `node dist/src/cli/populate.js "${projectDir}" --json`,
      { cwd: packageRoot }
    );

    const result = JSON.parse(stdout);
    expect(result.success).toBe(true);
    expect(result.languagesUsed).toEqual(['py']);
    expect(result.stats.filesScanned).toBeGreaterThan(0);
    expect(result.stats.elementsExtracted).toBeGreaterThan(0);
  });

  it('fails fast when an unsupported --lang value is provided', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-populate-cli-invalid-'));
    created.push(projectDir);

    await fs.writeFile(path.join(projectDir, 'main.py'), 'print("hello")\n', 'utf-8');

    await expect(
      execAsync(`node dist/src/cli/populate.js "${projectDir}" --lang ruby --json`, {
        cwd: packageRoot,
      })
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('Unsupported language(s): ruby'),
    });
  });

  it('fails fast when no supported source files are detected', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-populate-cli-empty-'));
    created.push(projectDir);

    await fs.writeFile(path.join(projectDir, 'README.md'), '# no supported code\n', 'utf-8');

    await expect(
      execAsync(`node dist/src/cli/populate.js "${projectDir}" --json`, {
        cwd: packageRoot,
      })
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('No supported source files were detected'),
    });
  });
});

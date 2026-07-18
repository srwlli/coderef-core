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
    const alpha = index.elements.find((element: any) => element.name === 'alpha');
    const beta = index.elements.find((element: any) => element.name === 'beta');
    expect(alpha.imports).toEqual([
      expect.objectContaining({ source: './untested', line: 1 }),
    ]);
    expect(beta.usedBy).toEqual([
      expect.objectContaining({ file: 'src/example.ts', line: 1 }),
    ]);

    const semanticRegistry = JSON.parse(await fs.readFile(path.join(outputDir, 'semantic-registry.json'), 'utf-8'));
    expect(semanticRegistry.generated_from).toBe('.coderef/index.json');
    const betaEntry = semanticRegistry.entries.find((entry: any) => entry.name === 'beta');
    expect(betaEntry.usedBy).toEqual(beta.usedBy);
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

  it('writes source headers once per file with deduplicated semantic fields', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-populate-cli-headers-'));
    created.push(projectDir);

    const srcDir = path.join(projectDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    await fs.writeFile(
      path.join(srcDir, 'consumer.ts'),
      [
        "import { one, two } from './provider';",
        'export function consumer() {',
        '  return one() + two();',
        '}',
      ].join('\n'),
      'utf-8'
    );

    await fs.writeFile(
      path.join(srcDir, 'provider.ts'),
      [
        '/* License header */',
        'export function one() { return 1; }',
        'export function two() { return 2; }',
      ].join('\r\n'),
      'utf-8'
    );

    await execAsync(
      `node dist/src/cli/populate.js "${projectDir}" --mode minimal --source-headers --json`,
      { cwd: packageRoot }
    );

    const providerContent = await fs.readFile(path.join(srcDir, 'provider.ts'), 'utf-8');
    const semanticCount = (providerContent.match(/@coderef-semantic/g) || []).length;
    expect(semanticCount).toBe(1);
    expect(providerContent).toMatch(/@exports\s+one[,\s]+two|@exports\s+two[,\s]+one/);
    expect(providerContent).toContain('@used_by src/consumer.ts');
    expect(providerContent).not.toContain('*//**');
    // Coderef header is inserted first; the original /* License header */ follows below.
    expect(providerContent).toMatch(/^\/\*\*\r?\n \* @coderef-semantic/);
    expect(providerContent).toContain('/* License header */');
  });

  // WO-ADD-A-PATH-SCOPE-ALLOWLIST-DENYLIST-TO-POPULATE-001 (STUB-4JDQXX): build a
  // repo with an "owned" subdir and a "foreign" subdir sharing one project root.
  async function makeScopedRepo(prefix: string) {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    created.push(projectDir);

    const ownedDir = path.join(projectDir, 'owned');
    const foreignDir = path.join(projectDir, 'foreign');
    await fs.mkdir(ownedDir, { recursive: true });
    await fs.mkdir(foreignDir, { recursive: true });

    await fs.writeFile(
      path.join(ownedDir, 'mine.ts'),
      'export function mine() { return 1; }\n',
      'utf-8'
    );
    await fs.writeFile(
      path.join(foreignDir, 'theirs.ts'),
      'export function theirs() { return 2; }\n',
      'utf-8'
    );

    return { projectDir, ownedDir, foreignDir };
  }

  it('--include scopes --source-headers writes to the allowlisted subset only', async () => {
    const { projectDir, ownedDir, foreignDir } = await makeScopedRepo(
      'coderef-populate-cli-include-'
    );

    await execAsync(
      `node dist/src/cli/populate.js "${projectDir}" --mode minimal --source-headers --include "owned/**" --json`,
      { cwd: packageRoot }
    );

    const ownedContent = await fs.readFile(path.join(ownedDir, 'mine.ts'), 'utf-8');
    const foreignContent = await fs.readFile(path.join(foreignDir, 'theirs.ts'), 'utf-8');

    // Header LANDS in the included subset...
    expect(ownedContent).toContain('@coderef-semantic');
    // ...and the foreign file is left untouched.
    expect(foreignContent).not.toContain('@coderef-semantic');
  });

  it('--exclude skips --source-headers writes for the denylisted subset', async () => {
    const { projectDir, ownedDir, foreignDir } = await makeScopedRepo(
      'coderef-populate-cli-exclude-'
    );

    await execAsync(
      `node dist/src/cli/populate.js "${projectDir}" --mode minimal --source-headers --exclude "foreign/**" --json`,
      { cwd: packageRoot }
    );

    const ownedContent = await fs.readFile(path.join(ownedDir, 'mine.ts'), 'utf-8');
    const foreignContent = await fs.readFile(path.join(foreignDir, 'theirs.ts'), 'utf-8');

    // Non-excluded file still gets a header...
    expect(ownedContent).toContain('@coderef-semantic');
    // ...and the excluded file is skipped.
    expect(foreignContent).not.toContain('@coderef-semantic');
  });
});

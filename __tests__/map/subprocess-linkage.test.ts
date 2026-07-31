/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability subprocess-linkage-tests
 */

/**
 * Subprocess-aware test linkage v1 (WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001
 * Phase 4) — unit tests for the PURE core (dist->src mapping, slash handling,
 * marker gate, aggregation, determinism), the IMPURE extractor's degradation
 * contract, and the engineering-metrics attach point's summary-key stability
 * (the metrics-delta constraint, executable).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import {
  computeSubprocessLinkage,
  extractSubprocessTestContents,
  type SubprocessTestContent,
} from '../../src/map/subprocess-linkage.js';
import { computeEngineeringMetrics } from '../../src/map/engineering-metrics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SPAWNY_PREAMBLE = "import { exec } from 'child_process';\n";

describe('computeSubprocessLinkage - pure core', () => {
  const SRC_IDS = ['src/cli/populate.ts', 'src/cli/scan.ts', 'src/tools/run.ts', 'src/other.ts'];

  it('links a posix dist-bin spawn literal back to its src file', () => {
    const contents: SubprocessTestContent[] = [
      {
        file: '__tests__/populate-cli.test.ts',
        content: SPAWNY_PREAMBLE + 'await execAsync(`node dist/src/cli/populate.js "${dir}" --json`);\n',
      },
    ];
    const block = computeSubprocessLinkage(contents, SRC_IDS);

    expect(block.summary).toEqual({
      testFilesScanned: 1,
      testFilesWithSpawnRefs: 1,
      linkedSrcFileCount: 1,
      spawnRefCount: 1,
    });
    expect(block.linked['src/cli/populate.ts']).toEqual({
      testFileCount: 1,
      refCount: 1,
      testFiles: ['__tests__/populate-cli.test.ts'],
    });
    expect(block.note).toMatch(/does not change testLinkage\.summary/);
  });

  it('reconstructs path.join-segmented dist bins', () => {
    const contents: SubprocessTestContent[] = [
      {
        file: '__tests__/join-shape.test.ts',
        content:
          SPAWNY_PREAMBLE +
          "const CLI = path.join(ROOT, 'dist', 'src', 'cli', 'populate.js');\n" +
          'spawnSync(process.execPath, [CLI]);\n',
      },
    ];
    const block = computeSubprocessLinkage(contents, SRC_IDS);

    expect(block.linked['src/cli/populate.ts']).toEqual({
      testFileCount: 1,
      refCount: 1,
      testFiles: ['__tests__/join-shape.test.ts'],
    });
    // Segmented shapes without the 'src' second segment are ignored.
    const nonSrc = computeSubprocessLinkage(
      [
        {
          file: '__tests__/other.test.ts',
          content: SPAWNY_PREAMBLE + "exec(path.join('dist', 'built.js'));\n",
        },
      ],
      SRC_IDS,
    );
    expect(nonSrc.linked).toEqual({});
  });

  it('handles backslash separators and .mjs -> .ts mapping', () => {
    const contents: SubprocessTestContent[] = [
      {
        file: '__tests__/windows.test.ts',
        content: SPAWNY_PREAMBLE + 'spawnSync("node", ["dist\\src\\cli\\scan.js"]);\n',
      },
      {
        file: '__tests__/mjs.test.ts',
        content: SPAWNY_PREAMBLE + 'await execAsync("node dist/src/tools/run.mjs --once");\n',
      },
    ];
    const block = computeSubprocessLinkage(contents, SRC_IDS);

    expect(Object.keys(block.linked)).toEqual(['src/cli/scan.ts', 'src/tools/run.ts']);
    expect(block.summary.testFilesWithSpawnRefs).toBe(2);
    expect(block.summary.spawnRefCount).toBe(2);
  });

  it('ignores dist literals that map to no known src file', () => {
    const contents: SubprocessTestContent[] = [
      {
        file: '__tests__/ghost.test.ts',
        content: SPAWNY_PREAMBLE + 'await execAsync("node dist/src/cli/ghost.js");\n',
      },
    ];
    const block = computeSubprocessLinkage(contents, SRC_IDS);

    expect(block.summary).toEqual({
      testFilesScanned: 1,
      testFilesWithSpawnRefs: 0,
      linkedSrcFileCount: 0,
      spawnRefCount: 0,
    });
    expect(block.linked).toEqual({});
  });

  it('skips files without a subprocess call marker (prose-only mentions)', () => {
    const contents: SubprocessTestContent[] = [
      {
        file: '__tests__/docs.test.ts',
        content: 'The bin at dist/src/cli/populate.js is documented in this fixture string.\n',
      },
    ];
    const block = computeSubprocessLinkage(contents, SRC_IDS);

    expect(block.summary.testFilesScanned).toBe(1);
    expect(block.summary.testFilesWithSpawnRefs).toBe(0);
    expect(block.linked).toEqual({});
  });

  it('aggregates distinct test files and repeat occurrences per src target, key-sorted', () => {
    const contents: SubprocessTestContent[] = [
      {
        file: '__tests__/z-second.test.ts',
        content: SPAWNY_PREAMBLE + 'exec("node dist/src/cli/populate.js a");\nexec("node dist/src/cli/populate.js b");\n',
      },
      {
        file: '__tests__/a-first.test.ts',
        content: SPAWNY_PREAMBLE + 'exec("node dist/src/cli/populate.js c");\nexec("node dist/src/cli/scan.js");\n',
      },
    ];
    const block = computeSubprocessLinkage(contents, SRC_IDS);

    expect(Object.keys(block.linked)).toEqual(['src/cli/populate.ts', 'src/cli/scan.ts']);
    expect(block.linked['src/cli/populate.ts']).toEqual({
      testFileCount: 2,
      refCount: 3,
      testFiles: ['__tests__/a-first.test.ts', '__tests__/z-second.test.ts'],
    });
    expect(block.summary).toEqual({
      testFilesScanned: 2,
      testFilesWithSpawnRefs: 2,
      linkedSrcFileCount: 2,
      spawnRefCount: 4,
    });
  });

  it('returns an all-zero block for empty contents', () => {
    const block = computeSubprocessLinkage([], SRC_IDS);
    expect(block.summary).toEqual({
      testFilesScanned: 0,
      testFilesWithSpawnRefs: 0,
      linkedSrcFileCount: 0,
      spawnRefCount: 0,
    });
    expect(block.linked).toEqual({});
  });
});

describe('extractSubprocessTestContents - impure extractor degradation contract', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = path.join(__dirname, `.subprocess-extract-${randomUUID()}`);
    fs.mkdirSync(projectDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it('returns null contents with a reason when index.json is absent', () => {
    const result = extractSubprocessTestContents(projectDir);
    expect(result.contents).toBeNull();
    expect(result.reason).toMatch(/index\.json absent/);
  });

  it('returns null contents with a reason when index.json is unreadable', () => {
    fs.mkdirSync(path.join(projectDir, '.coderef'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, '.coderef', 'index.json'), '{not json', 'utf-8');
    const result = extractSubprocessTestContents(projectDir);
    expect(result.contents).toBeNull();
    expect(result.reason).toMatch(/unreadable/);
  });

  it('reads only test-like files from the index, skipping missing-on-disk entries', () => {
    fs.mkdirSync(path.join(projectDir, '.coderef'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, '__tests__'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, '__tests__', 'a.test.ts'), 'exec("node dist/src/b.js")', 'utf-8');
    fs.writeFileSync(
      path.join(projectDir, '.coderef', 'index.json'),
      JSON.stringify({
        elements: [
          { file: '__tests__/a.test.ts', name: 't1' },
          { file: '__tests__/missing.test.ts', name: 't2' },
          { file: 'src/b.ts', name: 'b' },
        ],
      }),
      'utf-8',
    );

    const result = extractSubprocessTestContents(projectDir);
    expect(result.reason).toBeUndefined();
    expect(result.contents).toHaveLength(1);
    expect(result.contents![0].file).toBe('__tests__/a.test.ts');
    expect(result.contents![0].content).toContain('dist/src/b.js');
  });
});

describe('engineering-metrics attach point - summary keys stay stable', () => {
  const nodes = [
    { id: 'src/cli/populate.ts', elementCount: 2 },
    { id: '__tests__/populate-cli.test.ts', elementCount: 1 },
  ];
  const unresolved = new Map<string, { unresolved: number; ambiguous: number }>();

  it('attaches testLinkage.subprocess without touching the summary (metrics-delta constraint)', () => {
    const base = computeEngineeringMetrics(nodes, [], undefined, unresolved);
    expect(base.testLinkage.subprocess).toBeUndefined();

    const withSubprocess = computeEngineeringMetrics(nodes, [], undefined, unresolved, {
      subprocessTestContents: [
        {
          file: '__tests__/populate-cli.test.ts',
          content: SPAWNY_PREAMBLE + 'await execAsync("node dist/src/cli/populate.js");\n',
        },
      ],
    });

    expect(withSubprocess.testLinkage.subprocess).toBeDefined();
    expect(withSubprocess.testLinkage.subprocess!.linked['src/cli/populate.ts'].testFileCount).toBe(1);
    // The additive block must NOT change the summary the delta tool diffs.
    expect(withSubprocess.testLinkage.summary).toEqual(base.testLinkage.summary);
    expect(withSubprocess.testLinkage.zeroTestInEdge).toEqual(base.testLinkage.zeroTestInEdge);
  });

  it('treats null and empty contents as no-data (block absent)', () => {
    const withNull = computeEngineeringMetrics(nodes, [], undefined, unresolved, {
      subprocessTestContents: null,
    });
    expect(withNull.testLinkage.subprocess).toBeUndefined();

    const withEmpty = computeEngineeringMetrics(nodes, [], undefined, unresolved, {
      subprocessTestContents: [],
    });
    expect(withEmpty.testLinkage.subprocess).toBeUndefined();
  });
});

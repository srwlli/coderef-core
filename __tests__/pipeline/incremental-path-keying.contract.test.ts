/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability incremental-path-keying-contract
 */

/**
 * Contract tests for P4 incremental path-keying fix
 * (WO-EDGE-RESOLUTION-IMPROVEMENT-PROGRAM-001 P4, STUB-QPAAY0 — the
 * absolute-vs-relative fact-set keying defect that blocked incremental E2E
 * parity since GX-002: `populate --changed-files` absolutizes inputs while a
 * store persisted by a relative-projectPath full build is relative-keyed, so
 * mergeChangedFacts ADDED the changed file under a second key instead of
 * replacing its bundle — duplicate elements, node_id_uniqueness, fail-closed
 * exit 1, and the corrupt merge was re-persisted).
 *
 * The envelope, authored BEFORE the implementation (P4-T3):
 *   (a) ABSOLUTE changed-file path against a relative-keyed store: incremental
 *       completes with zero duplicate node ids and the resolved state is
 *       IDENTICAL to a from-scratch full rebuild of the same tree;
 *   (b) RELATIVE changed-file path input: same result;
 *   (c) forward-slash separators on input normalize;
 *   (d) deleted-file eviction works with absolute input;
 *   (e) a brand-new file added incrementally appears exactly once;
 *   (f) a missing fact set still falls back to a full build;
 *   (g) a changed path outside the project root never double-keys the store;
 *   (h) a store already poisoned with a double key self-heals on the next
 *       incremental pass (fresh-wins canonical dedupe).
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { readFactSet } from '../../src/pipeline/symbol-table-cache.js';
import type { PipelineState } from '../../src/pipeline/types.js';

const created: string[] = [];
const cwd = process.cwd();
afterEach(async () => {
  process.chdir(cwd);
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

const FIXTURE: Record<string, string> = {
  'src/util.ts': 'export function shared(): number {\n  return 1;\n}\n',
  'src/a.ts': [
    "import { shared } from './util.js';",
    'export function alpha(): number {',
    '  return shared();',
    '}',
  ].join('\n') + '\n',
  'src/b.ts': [
    "import { alpha } from './a.js';",
    'export function beta(): number {',
    '  return alpha();',
    '}',
  ].join('\n') + '\n',
};

async function makeFixtureDir(files: Record<string, string> = FIXTURE): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-keying-'));
  created.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf-8');
  }
  return dir;
}

const OPTS = (dir: string) => ({
  outputDir: path.join(dir, '.coderef'),
  languages: ['ts'],
  mode: 'minimal' as const,
});

/**
 * Full build with a RELATIVE projectPath ('.') from inside the fixture dir —
 * the exact invocation shape that produced the relative-keyed store in the
 * live defect (populate's default projectDir is '.'). Restores cwd after.
 */
async function fullBuildRelativeStore(dir: string): Promise<PipelineState> {
  process.chdir(dir);
  try {
    return await new PipelineOrchestrator().run('.', {
      outputDir: '.coderef',
      languages: ['ts'],
      mode: 'minimal',
    });
  } finally {
    process.chdir(cwd);
  }
}

/** Incremental pass run from inside the fixture dir with projectPath '.'. */
async function incrementalRelative(
  dir: string,
  changed: string[],
  deleted: string[] = [],
): Promise<PipelineState> {
  process.chdir(dir);
  try {
    return await new PipelineOrchestrator().runIncremental('.', changed, {
      outputDir: '.coderef',
      languages: ['ts'],
      mode: 'minimal',
    }, deleted);
  } finally {
    process.chdir(cwd);
  }
}

function nodeIds(state: PipelineState): string[] {
  return state.graph.nodes.map(n => n.id);
}

function duplicateIds(state: PipelineState): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const id of nodeIds(state)) {
    if (seen.has(id)) dups.add(id);
    seen.add(id);
  }
  return [...dups];
}

function resolvedTargets(state: PipelineState): string[] {
  return (state.callResolutions ?? [])
    .filter(c => c.kind === 'resolved' && c.resolvedTargetCodeRefId)
    .map(c => `${c.calleeName}->${c.resolvedTargetCodeRefId}`)
    .sort();
}

/** Canonical (project-relative, forward-slash) view of the store's keys. */
function canonicalStoreKeys(dir: string): string[] {
  const set = readFactSet(dir);
  if (!set) return [];
  return Object.keys(set.byFile)
    .map(k => {
      const abs = path.isAbsolute(k) ? k : path.resolve(dir, k);
      return path.relative(dir, abs).split(path.sep).join('/');
    })
    .sort();
}

describe('incremental path-keying (P4 contract)', () => {
  it('(a) absolute changed path against a relative-keyed store: no duplicates, full parity', async () => {
    const dir = await makeFixtureDir();
    await fullBuildRelativeStore(dir);

    // Modify one file, then incremental with the ABSOLUTE path (the CLI toAbs form).
    const target = path.join(dir, 'src', 'a.ts');
    await fs.writeFile(
      target,
      FIXTURE['src/a.ts'].replace('return shared();', 'return shared() + 1;'),
      'utf-8',
    );
    const incState = await incrementalRelative(dir, [target]);

    expect(duplicateIds(incState)).toEqual([]);

    // Parity: a from-scratch full rebuild of the SAME tree yields the same
    // node-id set and the same resolved call targets.
    const freshDir = await makeFixtureDir({
      ...FIXTURE,
      'src/a.ts': FIXTURE['src/a.ts'].replace('return shared();', 'return shared() + 1;'),
    });
    const fullState = await fullBuildRelativeStore(freshDir);
    expect([...nodeIds(incState)].sort()).toEqual([...nodeIds(fullState)].sort());
    expect(resolvedTargets(incState)).toEqual(resolvedTargets(fullState));

    // The re-persisted store holds the file ONCE under one canonical key.
    const keys = canonicalStoreKeys(dir);
    expect(keys.filter(k => k === 'src/a.ts')).toHaveLength(1);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('(b) relative changed path input: same clean merge', async () => {
    const dir = await makeFixtureDir();
    await fullBuildRelativeStore(dir);
    await fs.writeFile(
      path.join(dir, 'src', 'a.ts'),
      FIXTURE['src/a.ts'].replace('return shared();', 'return shared() * 2;'),
      'utf-8',
    );
    const incState = await incrementalRelative(dir, [path.join('src', 'a.ts')]);
    expect(duplicateIds(incState)).toEqual([]);
    expect(canonicalStoreKeys(dir).filter(k => k === 'src/a.ts')).toHaveLength(1);
  });

  it('(c) forward-slash separators on an absolute input normalize', async () => {
    const dir = await makeFixtureDir();
    await fullBuildRelativeStore(dir);
    await fs.writeFile(
      path.join(dir, 'src', 'b.ts'),
      FIXTURE['src/b.ts'].replace('return alpha();', 'return alpha() + 3;'),
      'utf-8',
    );
    const fwd = path.join(dir, 'src', 'b.ts').split(path.sep).join('/');
    const incState = await incrementalRelative(dir, [fwd]);
    expect(duplicateIds(incState)).toEqual([]);
    expect(canonicalStoreKeys(dir).filter(k => k === 'src/b.ts')).toHaveLength(1);
  });

  it('(d) deleted-file eviction works with an absolute input', async () => {
    const dir = await makeFixtureDir();
    await fullBuildRelativeStore(dir);
    const doomed = path.join(dir, 'src', 'b.ts');
    await fs.rm(doomed);
    const incState = await incrementalRelative(dir, [], [doomed]);
    expect(duplicateIds(incState)).toEqual([]);
    expect(nodeIds(incState).some(id => id.includes('src/b.ts'))).toBe(false);
    expect(canonicalStoreKeys(dir)).not.toContain('src/b.ts');
  });

  it('(e) a brand-new file added incrementally appears exactly once', async () => {
    const dir = await makeFixtureDir();
    await fullBuildRelativeStore(dir);
    const fresh = path.join(dir, 'src', 'c.ts');
    await fs.writeFile(fresh, 'export function gamma(): number {\n  return 9;\n}\n', 'utf-8');
    const incState = await incrementalRelative(dir, [fresh]);
    expect(duplicateIds(incState)).toEqual([]);
    const gammaNodes = nodeIds(incState).filter(id => id.includes('gamma'));
    expect(gammaNodes).toHaveLength(1);
    expect(canonicalStoreKeys(dir).filter(k => k === 'src/c.ts')).toHaveLength(1);
  });

  it('(f) a missing fact set still falls back to a full build', async () => {
    const dir = await makeFixtureDir();
    // No prior full build — no store at all.
    const state = await incrementalRelative(dir, [path.join(dir, 'src', 'a.ts')]);
    expect(duplicateIds(state)).toEqual([]);
    // The full universe is present, not just the "changed" file.
    expect(nodeIds(state).some(id => id.includes('beta'))).toBe(true);
    expect(nodeIds(state).some(id => id.includes('shared'))).toBe(true);
  });

  it('(g) a changed path outside the project root never double-keys the store', async () => {
    const dir = await makeFixtureDir();
    await fullBuildRelativeStore(dir);
    const before = canonicalStoreKeys(dir);

    const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-outside-'));
    created.push(outsideDir);
    const outside = path.join(outsideDir, 'stray.ts');
    await fs.writeFile(outside, 'export const stray = 1;\n', 'utf-8');

    const incState = await incrementalRelative(dir, [outside]);
    expect(duplicateIds(incState)).toEqual([]);
    const after = canonicalStoreKeys(dir);
    expect(new Set(after).size).toBe(after.length);
    // Every in-project key survives untouched.
    for (const k of before) expect(after).toContain(k);
  });

  it('(h) a store poisoned with a double key self-heals on the next incremental pass', async () => {
    const dir = await makeFixtureDir();
    await fullBuildRelativeStore(dir);

    // Simulate the pre-fix corruption: the same file under BOTH the relative
    // key and the absolute key (what a pre-fix failed run persisted).
    const storePath = path.join(dir, '.coderef', 'incremental-facts.json');
    const raw = JSON.parse(await fs.readFile(storePath, 'utf-8'));
    const relKey = Object.keys(raw.byFile).find((k: string) => k.replace(/\\/g, '/') === 'src/a.ts');
    expect(relKey).toBeDefined();
    const absKey = path.join(dir, 'src', 'a.ts');
    raw.byFile[absKey] = raw.byFile[relKey!];
    raw.order.push(absKey);
    await fs.writeFile(storePath, JSON.stringify(raw), 'utf-8');

    const incState = await incrementalRelative(dir, [absKey]);
    expect(duplicateIds(incState)).toEqual([]);
    const keys = canonicalStoreKeys(dir);
    expect(keys.filter(k => k === 'src/a.ts')).toHaveLength(1);
  });
});

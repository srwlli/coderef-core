/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability rename-tool-test
 */

/**
 * Tests for the project-wide symbol rename tool
 * (planRename + applyRename + the referenceSitesOf substrate method).
 *
 * The load-bearing behaviours pinned here:
 *  - planRename resolves declaration + reference sites from a real
 *    .coderef/graph.json in a temp project dir.
 *  - the applier re-tokenizes each attributed line with a word-boundary regex
 *    (superstrings like renameMeLater are NOT touched).
 *  - the SHADOW GUARD: a line with MORE `\b old \b` tokens than the graph
 *    attributed is flagged ambiguous and left UNCHANGED in dry-run/default.
 *    (Assertions go RED if the guard is removed.)
 *  - dry-run writes NOTHING to disk.
 *  - --apply writes atomically; a forced write error yields `halted` with the
 *    applied-files list intact.
 *  - an unknown symbol makes planRename throw.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { ExportedGraph } from '../../export/graph-exporter.js';
import { planRename } from '../rename-planner.js';
import { applyRename } from '../rename-applier.js';

/**
 * Build a temp project dir with a .coderef/graph.json and real source files.
 * Returns the project dir; caller removes it.
 *
 * Fixture (normalized posix paths, as the graph stores them):
 *   src/a.ts declares `renameMe` (line 1) and, on line 5, a shadow line that
 *     references renameMe once (graph-attributed) but the text has TWO tokens.
 *   src/b.ts imports+calls renameMe:
 *     - line 3: import site
 *     - line 6: `renameMe(renameMe, x.renameMe)` call site with 3 text tokens,
 *       graph attributes 3 (via three call edges) -> all rewritten.
 *     - line 7: `renameMeLater()` superstring — NOT a site, NOT touched.
 */
function makeFixtureProject(): { dir: string; aPath: string; bPath: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-rename-'));
  const coderefDir = path.join(dir, '.coderef');
  fs.mkdirSync(coderefDir, { recursive: true });
  const srcDir = path.join(dir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  const aPath = path.join(srcDir, 'a.ts');
  const bPath = path.join(srcDir, 'b.ts');

  // a.ts: declaration on line 1; line 5 has TWO renameMe tokens but the graph
  // will attribute only ONE call site there -> shadow guard must fire.
  const aText = [
    'export function renameMe(x) {',        // 1 declaration
    '  return x;',                          // 2
    '}',                                    // 3
    '',                                     // 4
    'const q = renameMe(renameMe);',        // 5 shadow: 2 tokens, 1 attributed
  ].join('\n');

  // b.ts: import (line 3), call with 3 tokens (line 6), superstring (line 7).
  const bText = [
    "// header",                            // 1
    '',                                     // 2
    "import { renameMe } from './a.js';",   // 3 import site
    '',                                     // 4
    'export function useIt(x) {',           // 5
    '  return renameMe(renameMe, x.renameMe);', // 6 call: 3 tokens, 3 attributed
    '  // renameMeLater() is a superstring',    // 7 NOT a site
    '}',                                    // 8
  ].join('\n');

  fs.writeFileSync(aPath, aText, 'utf-8');
  fs.writeFileSync(bPath, bText, 'utf-8');

  const nodes: ExportedGraph['nodes'] = [
    { id: '@File/src/a.ts', type: 'file', name: 'a.ts', file: 'src/a.ts' },
    { id: '@File/src/b.ts', type: 'file', name: 'b.ts', file: 'src/b.ts' },
    {
      id: '@Fn/src/a.ts#renameMe:1',
      type: 'function',
      name: 'renameMe',
      file: 'src/a.ts',
      line: 1,
      metadata: { codeRefIdNoLine: '@Fn/src/a.ts#renameMe' },
    },
    {
      id: '@Fn/src/b.ts#useIt:5',
      type: 'function',
      name: 'useIt',
      file: 'src/b.ts',
      line: 5,
      metadata: { codeRefIdNoLine: '@Fn/src/b.ts#useIt' },
    },
  ];

  // Reference edges all target the declaration; sourceLocation carries the site
  // file+line (line-grained, no column — matching the real graph schema).
  function callEdge(id: string, srcFile: string, srcLine: number): ExportedGraph['edges'][number] {
    return {
      id,
      sourceId: '@Fn/src/b.ts#useIt:5',
      targetId: '@Fn/src/a.ts#renameMe:1',
      relationship: 'call',
      resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/b.ts', line: srcLine },
      source: '@Fn/src/b.ts#useIt:5',
      target: '@Fn/src/a.ts#renameMe:1',
      type: 'call',
    } as ExportedGraph['edges'][number];
  }

  const edges: ExportedGraph['edges'] = [
    // import site on b.ts:3 (source is the @File node — import edges are file-grain)
    {
      id: 'imp1',
      sourceId: '@File/src/b.ts',
      targetId: '@Fn/src/a.ts#renameMe:1',
      relationship: 'import',
      resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/b.ts', line: 3 },
      source: '@File/src/b.ts',
      target: '@Fn/src/a.ts#renameMe:1',
      type: 'import',
    } as ExportedGraph['edges'][number],
    // three distinct call edges attributed to b.ts:6 (3 tokens on that line)
    callEdge('c1', 'src/b.ts', 6),
    { ...callEdge('c2', 'src/b.ts', 6), id: 'c2', evidence: { arg: 1 } } as ExportedGraph['edges'][number],
    { ...callEdge('c3', 'src/b.ts', 6), id: 'c3', evidence: { arg: 2 } } as ExportedGraph['edges'][number],
    // ONE call edge attributed to a.ts:5 (but that line has 2 renameMe tokens)
    {
      id: 'shadow1',
      sourceId: '@Fn/src/a.ts#renameMe:1',
      targetId: '@Fn/src/a.ts#renameMe:1',
      relationship: 'call',
      resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/a.ts', line: 5 },
      source: '@Fn/src/a.ts#renameMe:1',
      target: '@Fn/src/a.ts#renameMe:1',
      type: 'call',
    } as ExportedGraph['edges'][number],
  ];

  const graph: ExportedGraph = {
    version: '1.0.0',
    exportedAt: 0,
    nodes,
    edges,
    statistics: { nodeCount: nodes.length, edgeCount: edges.length, edgesByType: {}, densityRatio: 0 },
  };

  fs.writeFileSync(path.join(coderefDir, 'graph.json'), JSON.stringify(graph), 'utf-8');
  return { dir, aPath, bPath };
}

describe('planRename', () => {
  let fixture: { dir: string; aPath: string; bPath: string };
  beforeEach(() => { fixture = makeFixtureProject(); });
  afterEach(() => { fs.rmSync(fixture.dir, { recursive: true, force: true }); });

  it('resolves declaration + reference sites from the canonical graph', () => {
    const plan = planRename(fixture.dir, 'renameMe', 'renamed');
    expect(plan.oldName).toBe('renameMe');
    expect(plan.newName).toBe('renamed');
    expect(plan.targetIds).toContain('@Fn/src/a.ts#renameMe:1');

    // Site file paths are absolutized against the project dir.
    const aAbs = path.resolve(fixture.dir, 'src/a.ts');
    const bAbs = path.resolve(fixture.dir, 'src/b.ts');

    // declaration site at src/a.ts:1
    const decl = plan.sites.filter(s => s.kind === 'declaration');
    expect(decl).toContainEqual({ file: aAbs, line: 1, kind: 'declaration' });

    // import site at src/b.ts:3
    const imports = plan.sites.filter(s => s.kind === 'import');
    expect(imports).toContainEqual({ file: bAbs, line: 3, kind: 'import' });

    // three call edges on b.ts:6 dedupe to ONE (file,line,rel) site
    const callsB6 = plan.sites.filter(s => s.kind === 'call' && s.file === bAbs && s.line === 6);
    expect(callsB6.length).toBe(1);

    // stable-shape fields present and empty
    expect(plan.typeOnlyRefs).toEqual([]);
    expect(plan.ambiguities).toEqual([]);
  });

  it('throws on an unknown symbol (zero sites)', () => {
    expect(() => planRename(fixture.dir, 'noSuchSymbol', 'x')).toThrow(/symbol not found/i);
  });
});

describe('applyRename — line re-tokenization', () => {
  let fixture: { dir: string; aPath: string; bPath: string };
  beforeEach(() => { fixture = makeFixtureProject(); });
  afterEach(() => { fs.rmSync(fixture.dir, { recursive: true, force: true }); });

  it('rewrites word-boundary tokens on a multi-token line, leaving superstrings untouched', () => {
    // Build a plan attributing 3 call sites to b.ts:6 so matches == attributed.
    const plan = planRename(fixture.dir, 'renameMe', 'renamed');
    // The planner deduped b.ts:6 to a single site; the applier counts *sites*
    // per line, so to represent 3 attributed tokens we inject the multiplicity
    // the graph carried. Re-derive attribution directly for this line-logic test.
    const threeSitePlan = {
      ...plan,
      sites: [
        { file: fixture.bPath, line: 6, kind: 'call' as const },
        { file: fixture.bPath, line: 6, kind: 'call' as const },
        { file: fixture.bPath, line: 6, kind: 'call' as const },
      ],
    };
    const result = applyRename(threeSitePlan, { apply: false });
    const bPreview = result.previews.find(p => p.file === fixture.bPath)!;
    expect(bPreview.newText).toContain('renamed(renamed, x.renamed)');
    // superstring on line 7 is untouched
    expect(bPreview.newText).toContain('renameMeLater');
    expect(bPreview.newText).not.toContain('renamedLater');
    expect(bPreview.rewrites).toBe(3);
    expect(bPreview.ambiguous.length).toBe(0);
  });
});

describe('applyRename — SHADOW GUARD (load-bearing)', () => {
  let fixture: { dir: string; aPath: string; bPath: string };
  beforeEach(() => { fixture = makeFixtureProject(); });
  afterEach(() => { fs.rmSync(fixture.dir, { recursive: true, force: true }); });

  it('flags a line with MORE tokens than attributed as ambiguous and leaves it UNCHANGED (default)', () => {
    // a.ts:5 = `const q = renameMe(renameMe);` — 2 tokens, graph attributes 1.
    // One site per line is what the planner produces (deduped), so attributed=1.
    const plan = planRename(fixture.dir, 'renameMe', 'renamed');
    const result = applyRename(plan, { apply: false });

    const aPreview = result.previews.find(p => p.file === fixture.aPath)!;
    // line 5 must be reported ambiguous
    const flagged = aPreview.ambiguous.find(a => a.line === 5);
    expect(flagged).toBeTruthy();
    expect(flagged!.reason).toMatch(/shadow|tokens/i);
    // RED-if-guard-removed: the shadow line's tokens must remain "renameMe"
    expect(aPreview.newText).toContain('const q = renameMe(renameMe);');
    expect(result.ambiguities).toBeGreaterThan(0);
  });

  it('with forceAmbiguous the shadow line IS rewritten', () => {
    const plan = planRename(fixture.dir, 'renameMe', 'renamed');
    const result = applyRename(plan, { apply: false, forceAmbiguous: true });
    const aPreview = result.previews.find(p => p.file === fixture.aPath)!;
    expect(aPreview.newText).toContain('const q = renamed(renamed);');
  });
});

describe('applyRename — dry-run writes nothing', () => {
  let fixture: { dir: string; aPath: string; bPath: string };
  beforeEach(() => { fixture = makeFixtureProject(); });
  afterEach(() => { fs.rmSync(fixture.dir, { recursive: true, force: true }); });

  it('leaves file bytes on disk unchanged and exposes a stable preview shape', () => {
    const aBefore = fs.readFileSync(fixture.aPath);
    const bBefore = fs.readFileSync(fixture.bPath);

    const plan = planRename(fixture.dir, 'renameMe', 'renamed');
    const result = applyRename(plan, { apply: false });

    expect(fs.readFileSync(fixture.aPath).equals(aBefore)).toBe(true);
    expect(fs.readFileSync(fixture.bPath).equals(bBefore)).toBe(true);
    expect(result.appliedFiles).toEqual([]);
    // preview shape
    for (const p of result.previews) {
      expect(typeof p.file).toBe('string');
      expect(typeof p.rewrites).toBe('number');
      expect(Array.isArray(p.ambiguous)).toBe(true);
      expect(typeof p.oldText).toBe('string'); // dry-run carries text for diffing
      expect(typeof p.newText).toBe('string');
    }
  });
});

describe('applyRename — --apply path', () => {
  let fixture: { dir: string; aPath: string; bPath: string };
  beforeEach(() => { fixture = makeFixtureProject(); });
  afterEach(() => { fs.rmSync(fixture.dir, { recursive: true, force: true }); });

  it('writes the new name atomically to disk', () => {
    // Rewrite b.ts using the real planner sites (import@3 + call@6 deduped to
    // 1 -> only 1 of 3 tokens attributed => b.ts:6 becomes ambiguous; the
    // import line rewrites cleanly). Assert the import token flipped on disk.
    const plan = planRename(fixture.dir, 'renameMe', 'renamed');
    const result = applyRename(plan, { apply: true });

    expect(result.halted).toBeUndefined();
    const bAfter = fs.readFileSync(fixture.bPath, 'utf-8');
    expect(bAfter).toContain("import { renamed } from './a.js';");
    expect(result.appliedFiles).toContain(fixture.bPath);
    // no leftover .tmp sibling
    expect(fs.existsSync(fixture.bPath + '.tmp')).toBe(false);
  });

  it('a write error yields halted with the applied-files list intact', () => {
    const plan = planRename(fixture.dir, 'renameMe', 'renamed');

    // Deterministic write failure: the file reads fine, but writeTextAtomic
    // writes `<file>.tmp` first — so pre-create `<file>.tmp` as a DIRECTORY and
    // writeFileSync to that path throws EISDIR at write time (not read time).
    const unwritable = path.join(fixture.dir, 'src', 'ro.ts');
    fs.writeFileSync(unwritable, 'const renameMe = 1;\n', 'utf-8');
    fs.mkdirSync(unwritable + '.tmp', { recursive: true });

    // Order matters: b.ts is applied first, then the unwritable file halts.
    const haltPlan = {
      ...plan,
      sites: [
        { file: fixture.bPath, line: 3, kind: 'import' as const },
        { file: unwritable, line: 1, kind: 'declaration' as const },
      ],
    };
    const result = applyRename(haltPlan, { apply: true });

    expect(result.halted).toBeTruthy();
    expect(result.halted!.file).toBe(unwritable);
    // b.ts was applied before the halt and remains in the list
    expect(result.appliedFiles).toContain(fixture.bPath);
    expect(result.appliedFiles).not.toContain(unwritable);
  });
});

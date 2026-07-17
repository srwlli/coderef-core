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

    // declaration site at src/a.ts:1 (Phase 3: declarations are always 'exact')
    const decl = plan.sites.filter(s => s.kind === 'declaration');
    expect(decl).toContainEqual({ file: aAbs, line: 1, kind: 'declaration', confidence: 'exact' });

    // import site at src/b.ts:3 (resolved edge -> 'exact')
    const imports = plan.sites.filter(s => s.kind === 'import');
    expect(imports).toContainEqual({ file: bAbs, line: 3, kind: 'import', confidence: 'exact' });

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
        { file: fixture.bPath, line: 6, kind: 'call' as const, confidence: 'exact' as const },
        { file: fixture.bPath, line: 6, kind: 'call' as const, confidence: 'exact' as const },
        { file: fixture.bPath, line: 6, kind: 'call' as const, confidence: 'exact' as const },
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
        { file: fixture.bPath, line: 3, kind: 'import' as const, confidence: 'exact' as const },
        { file: unwritable, line: 1, kind: 'declaration' as const, confidence: 'exact' as const },
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

/**
 * Phase 3 (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001): confidence tiers on
 * rename sites + the --min-confidence filter.
 *
 * Fixture: a symbol `target` declared in src/t.ts:1, referenced by TWO resolved
 * call edges — one NORMAL (exact) at src/u.ts:4 and one PROVISIONAL/heuristic
 * (resolutionStatus='resolved' + evidence.confidence='provisional', the
 * single_candidate_unknown_receiver tier) at src/u.ts:8. min_confidence=exact
 * must drop the heuristic site and keep the exact one; the declaration is
 * always exact.
 */
function makeTieredFixture(): { dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-rename-tier-'));
  const coderefDir = path.join(dir, '.coderef');
  fs.mkdirSync(coderefDir, { recursive: true });
  const srcDir = path.join(dir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  fs.writeFileSync(
    path.join(srcDir, 't.ts'),
    ['export function target(x) {', '  return x;', '}', ''].join('\n'),
    'utf-8',
  );
  fs.writeFileSync(
    path.join(srcDir, 'u.ts'),
    [
      "import { target } from './t.js';", // 1
      '',                                  // 2
      'export function callExact() {',     // 3
      '  return target(1);',               // 4 exact call
      '}',                                 // 5
      'export function callProvisional(o) {', // 6
      '  // o is an unknown receiver whose method resolved to one candidate',    // 7
      '  return o.target();',              // 8 provisional (heuristic) call
      '}',                                 // 9
    ].join('\n'),
    'utf-8',
  );

  const nodes: ExportedGraph['nodes'] = [
    { id: '@File/src/t.ts', type: 'file', name: 't.ts', file: 'src/t.ts' },
    { id: '@File/src/u.ts', type: 'file', name: 'u.ts', file: 'src/u.ts' },
    {
      id: '@Fn/src/t.ts#target:1', type: 'function', name: 'target', file: 'src/t.ts', line: 1,
      metadata: { codeRefIdNoLine: '@Fn/src/t.ts#target' },
    },
    {
      id: '@Fn/src/u.ts#callExact:3', type: 'function', name: 'callExact', file: 'src/u.ts', line: 3,
      metadata: { codeRefIdNoLine: '@Fn/src/u.ts#callExact' },
    },
    {
      id: '@Fn/src/u.ts#callProvisional:6', type: 'function', name: 'callProvisional', file: 'src/u.ts', line: 6,
      metadata: { codeRefIdNoLine: '@Fn/src/u.ts#callProvisional' },
    },
  ];

  const edges: ExportedGraph['edges'] = [
    // exact call at u.ts:4 — resolutionStatus 'resolved', no provisional flag.
    {
      id: 'exact1', sourceId: '@Fn/src/u.ts#callExact:3', targetId: '@Fn/src/t.ts#target:1',
      relationship: 'call', resolutionStatus: 'resolved',
      sourceLocation: { file: 'src/u.ts', line: 4 },
      source: '@Fn/src/u.ts#callExact:3', target: '@Fn/src/t.ts#target:1', type: 'call',
    } as ExportedGraph['edges'][number],
    // provisional (heuristic) call at u.ts:8 — resolved but single_candidate.
    {
      id: 'prov1', sourceId: '@Fn/src/u.ts#callProvisional:6', targetId: '@Fn/src/t.ts#target:1',
      relationship: 'call', resolutionStatus: 'resolved',
      evidence: { kind: 'resolved-call', confidence: 'provisional' },
      candidates: ['@Fn/src/t.ts#target:1'],
      sourceLocation: { file: 'src/u.ts', line: 8 },
      source: '@Fn/src/u.ts#callProvisional:6', target: '@Fn/src/t.ts#target:1', type: 'call',
    } as ExportedGraph['edges'][number],
  ];

  const graph: ExportedGraph = {
    version: '1.0.0', exportedAt: 0, nodes, edges,
    statistics: { nodeCount: nodes.length, edgeCount: edges.length, edgesByType: {}, densityRatio: 0 },
  };
  fs.writeFileSync(path.join(coderefDir, 'graph.json'), JSON.stringify(graph), 'utf-8');
  return { dir };
}

describe('planRename — confidence tiers + --min-confidence (Phase 3)', () => {
  let fixture: { dir: string };
  beforeEach(() => { fixture = makeTieredFixture(); });
  afterEach(() => { fs.rmSync(fixture.dir, { recursive: true, force: true }); });

  it('tags every site with a confidence tier; declaration is exact', () => {
    const plan = planRename(fixture.dir, 'target', 'renamedTarget');
    for (const s of plan.sites) {
      expect(['exact', 'strong', 'heuristic', 'inferred']).toContain(s.confidence);
    }
    const decl = plan.sites.find(s => s.kind === 'declaration');
    expect(decl?.confidence).toBe('exact');
    // No filter requested -> minConfidence echoes null and both call sites present.
    expect(plan.minConfidence).toBeNull();
    const uAbs = path.resolve(fixture.dir, 'src/u.ts');
    const exactSite = plan.sites.find(s => s.file === uAbs && s.line === 4);
    const provSite = plan.sites.find(s => s.file === uAbs && s.line === 8);
    expect(exactSite?.confidence).toBe('exact');
    expect(provSite?.confidence).toBe('heuristic');
  });

  it('min_confidence=exact drops the provisional (heuristic) reference site, keeps the exact one', () => {
    const uAbs = path.resolve(fixture.dir, 'src/u.ts');
    const full = planRename(fixture.dir, 'target', 'renamedTarget');
    const filtered = planRename(fixture.dir, 'target', 'renamedTarget', 'exact');

    // The heuristic site at u.ts:8 is present unfiltered, absent when exact-only.
    expect(full.sites.some(s => s.file === uAbs && s.line === 8)).toBe(true);
    expect(filtered.sites.some(s => s.file === uAbs && s.line === 8)).toBe(false);
    // The exact site at u.ts:4 survives the filter.
    expect(filtered.sites.some(s => s.file === uAbs && s.line === 4)).toBe(true);
    // The declaration (always exact) survives.
    expect(filtered.sites.some(s => s.kind === 'declaration')).toBe(true);
    // Filtering only shrinks the site set (monotonic), never grows it.
    expect(filtered.sites.length).toBeLessThan(full.sites.length);
    expect(filtered.minConfidence).toBe('exact');
  });

  it('min_confidence=heuristic keeps both exact and heuristic sites (threshold is inclusive)', () => {
    const uAbs = path.resolve(fixture.dir, 'src/u.ts');
    const plan = planRename(fixture.dir, 'target', 'renamedTarget', 'heuristic');
    expect(plan.sites.some(s => s.file === uAbs && s.line === 4)).toBe(true); // exact >= heuristic
    expect(plan.sites.some(s => s.file === uAbs && s.line === 8)).toBe(true); // heuristic >= heuristic
  });
});

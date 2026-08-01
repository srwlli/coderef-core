/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability mcp-rename-apply-contract
 */

/**
 * rename_apply contract tests (WO-GX-003-MIRRORED-RENAME-APPLY-SCOPED-SOURCE-WRITE-001).
 *
 * rename_apply is the FIRST — and the SINGLE — MCP tool sanctioned to write
 * source files (scoped supersession, operator ruling 2026-08-01). These tests
 * pin the safety envelope the ruling is CONDITIONED on, authored BEFORE the
 * implementation (P1-T3):
 *
 *   (a) apply omitted/false is a PURE PREVIEW — zero filesystem writes, and
 *       the site plan is equivalent to rename_preview's.
 *   (b) apply:true rewrites atomically and returns per-file rewrite counts.
 *   (c) shadow-ambiguous lines are NEVER rewritten over MCP and are listed in
 *       the response — the tool schema exposes NO force-ambiguous parameter
 *       (that escape hatch stays CLI-only on coderef-rename).
 *   (d) the response carries the graph-resolution blind-spot disclosure,
 *       STRATIFIED per discovery-resolution-core-issue.md REC-R2
 *       (unresolved_src_count + resolved_of_resolvable ALONGSIDE the raw
 *       totals, with the test-DSL denominator-artifact note).
 *   (e) project_root is required at the registration schema (repo-agnostic
 *       contract, WO-MCP-REPO-AGNOSTIC-ANY-REPO-001).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { buildToolHandlers } from '../../src/cli/coderef-mcp-server.js';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';

// ---- fixture builders -------------------------------------------------------------

interface Fixture {
  proj: string;
  aPath: string;
  bPath: string;
}

/**
 * Build a temp project with REAL rename sites: renameMe declared in a.ts,
 * called once from b.ts. `shadowLine` additionally puts a SECOND renameMe
 * token on b.ts's attributed call line (graph attributes 1 site there), which
 * must trip the applier's shadow guard.
 */
function makeFixture(opts: { shadowLine?: boolean; validationReport?: boolean } = {}): Fixture {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-mcp-rename-apply-'));
  const cr = path.join(proj, '.coderef');
  fs.mkdirSync(cr, { recursive: true });
  fs.mkdirSync(path.join(proj, 'src'), { recursive: true });

  const aPath = path.join(proj, 'src', 'a.ts');
  const bPath = path.join(proj, 'src', 'b.ts');
  fs.writeFileSync(aPath, 'export function renameMe(x) {\n  return x;\n}\n');
  fs.writeFileSync(
    bPath,
    opts.shadowLine
      ? // TWO word-boundary renameMe tokens on the attributed line; the graph
        // attributes only ONE site to it — shadow-guard territory.
        "import { renameMe } from './a.js';\nexport const q = renameMe(1) + renameMe(2);\n"
      : "import { renameMe } from './a.js';\nexport const q = renameMe(1);\n",
  );

  const graph: ExportedGraph = {
    version: '1.0.0',
    exportedAt: 1,
    nodes: [
      { id: '@Fn/src/a.ts#renameMe:1', type: 'function', name: 'renameMe', file: 'src/a.ts', line: 1, metadata: {} },
      { id: '@Fn/src/b.ts#q:2', type: 'variable', name: 'q', file: 'src/b.ts', line: 2, metadata: {} },
    ],
    edges: [
      {
        id: 'rc1', sourceId: '@Fn/src/b.ts#q:2', targetId: '@Fn/src/a.ts#renameMe:1',
        relationship: 'call', resolutionStatus: 'resolved',
        sourceLocation: { file: 'src/b.ts', line: 2 },
        source: '@Fn/src/b.ts#q:2', target: '@Fn/src/a.ts#renameMe:1', type: 'call',
      },
    ],
    statistics: { nodeCount: 2, edgeCount: 1, edgesByType: { call: 1 }, densityRatio: 0 },
  };
  fs.writeFileSync(path.join(cr, 'graph.json'), JSON.stringify(graph));

  if (opts.validationReport !== false) {
    // Discovery-time scalars (2026-08-01) — the numbers the STRATIFIED
    // disclosure must surface side-by-side.
    fs.writeFileSync(path.join(cr, 'validation-report.json'), JSON.stringify({
      valid_edge_count: 9749,
      unresolved_count: 18249,
      ambiguous_count: 1722,
      external_count: 319,
      builtin_count: 13457,
      unresolved_src_count: 948,
      ambiguous_src_count: 1189,
      provisional_count: 1241,
      header_defined_count: 0,
      header_missing_count: 0,
      header_stale_count: 0,
      header_partial_count: 0,
      header_layer_mismatch_count: 0,
      header_export_mismatch_count: 0,
      header_coverage_pct: 100,
      resolution_rate: 22.41,
      resolved_of_resolvable: 32.8,
      ambiguous_rate: 3.96,
      provisional_rate: 12.73,
    }));
  }

  return { proj, aPath, bPath };
}

function snapshotTree(root: string): Map<string, string> {
  const snap = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else snap.set(full, fs.readFileSync(full, 'utf8'));
    }
  };
  walk(root);
  return snap;
}

// ---- (a) preview purity -----------------------------------------------------------

describe('rename_apply — (a) apply omitted/false is a PURE preview', () => {
  it('writes NOTHING with apply omitted, and the site plan matches rename_preview', () => {
    const { proj } = makeFixture();
    try {
      const h = buildToolHandlers(proj);
      const before = snapshotTree(proj);

      const r = h.rename_apply({ old_name: 'renameMe', new_name: 'renameMe2' }) as any;
      expect(r.error).toBeUndefined();
      expect(r.applied).toBe(false);

      // Zero filesystem writes: the whole tree is byte-identical.
      const after = snapshotTree(proj);
      expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
      for (const [file, content] of before) expect(after.get(file)).toBe(content);

      // Site-plan equivalence with rename_preview (same planner, same plan).
      const p = h.rename_preview({ old_name: 'renameMe', new_name: 'renameMe2' }) as any;
      expect(r.target_ids).toEqual(p.target_ids);
      expect(r.site_count).toBe(p.site_count);
      expect(r.sites).toEqual(p.sites);
      expect(r.sites_by_confidence).toEqual(p.sites_by_confidence);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });

  it('writes NOTHING with apply:false explicitly', () => {
    const { proj } = makeFixture();
    try {
      const h = buildToolHandlers(proj);
      const before = snapshotTree(proj);
      const r = h.rename_apply({ old_name: 'renameMe', new_name: 'renameMe2', apply: false }) as any;
      expect(r.error).toBeUndefined();
      expect(r.applied).toBe(false);
      const after = snapshotTree(proj);
      for (const [file, content] of before) expect(after.get(file)).toBe(content);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });

  it('returns element_not_found for an unknown symbol (throw caught cleanly)', () => {
    const { proj } = makeFixture();
    try {
      const h = buildToolHandlers(proj);
      const r = h.rename_apply({ old_name: 'no-such-symbol', new_name: 'x' }) as any;
      expect(r.error).toBe('element_not_found');
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });
});

// ---- (b) apply:true rewrites atomically + per-file counts -------------------------

describe('rename_apply — (b) apply:true rewrites and reports per-file counts', () => {
  it('rewrites the attributed sites and returns per-file rewrite counts', () => {
    const { proj, aPath, bPath } = makeFixture();
    try {
      const h = buildToolHandlers(proj);
      const r = h.rename_apply({ old_name: 'renameMe', new_name: 'renameMe2', apply: true }) as any;
      expect(r.error).toBeUndefined();
      expect(r.applied).toBe(true);

      // The declaration line in a.ts and the call line in b.ts are rewritten.
      expect(fs.readFileSync(aPath, 'utf8')).toContain('renameMe2');
      expect(fs.readFileSync(bPath, 'utf8')).toContain('renameMe2(1)');

      // Per-file rewrite counts + roll-up.
      expect(Array.isArray(r.files)).toBe(true);
      expect(r.files.length).toBeGreaterThanOrEqual(2);
      for (const f of r.files) {
        expect(typeof f.file).toBe('string');
        expect(typeof f.rewrites).toBe('number');
        expect(Array.isArray(f.ambiguous)).toBe(true);
      }
      const summed = r.files.reduce((n: number, f: any) => n + f.rewrites, 0);
      expect(summed).toBe(r.total_rewrites);
      expect(r.total_rewrites).toBeGreaterThanOrEqual(2);

      // applied_files lists exactly the files written.
      expect(Array.isArray(r.applied_files)).toBe(true);
      expect(r.applied_files.length).toBeGreaterThanOrEqual(2);
      // No atomic-write temp files left behind.
      expect(fs.existsSync(aPath + '.tmp')).toBe(false);
      expect(fs.existsSync(bPath + '.tmp')).toBe(false);
      expect(r.halted).toBeUndefined();
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });
});

// ---- (c) shadow-ambiguous NEVER rewritten over MCP, NO force param ----------------

describe('rename_apply — (c) ambiguous lines are never rewritten over MCP', () => {
  it('skips a shadow-ambiguous line on apply:true and lists it in the response', () => {
    const { proj, bPath } = makeFixture({ shadowLine: true });
    try {
      const h = buildToolHandlers(proj);
      const bBefore = fs.readFileSync(bPath, 'utf8');
      const r = h.rename_apply({ old_name: 'renameMe', new_name: 'renameMe2', apply: true }) as any;
      expect(r.error).toBeUndefined();

      // The shadow-ambiguous call line (2 tokens, 1 attributed) is UNCHANGED.
      const bAfter = fs.readFileSync(bPath, 'utf8');
      const callLineBefore = bBefore.split(/\r?\n/)[1];
      const callLineAfter = bAfter.split(/\r?\n/)[1];
      expect(callLineAfter).toBe(callLineBefore);

      // ...and it is DISCLOSED: the file's entry lists the ambiguity.
      const bEntry = r.files.find((f: any) => f.file.endsWith('b.ts'));
      expect(bEntry).toBeDefined();
      expect(bEntry.ambiguous.length).toBeGreaterThanOrEqual(1);
      expect(r.ambiguity_count).toBeGreaterThanOrEqual(1);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });

  it('a force flag passed anyway is IGNORED — the ambiguous line still survives', () => {
    const { proj, bPath } = makeFixture({ shadowLine: true });
    try {
      const h = buildToolHandlers(proj);
      const callLineBefore = fs.readFileSync(bPath, 'utf8').split(/\r?\n/)[1];
      // The handler contract exposes no force parameter; smuggling one in as
      // an extra property must have zero effect.
      const r = (h.rename_apply as any)({
        old_name: 'renameMe', new_name: 'renameMe2', apply: true,
        force_ambiguous: true, forceAmbiguous: true, force: true,
      });
      expect(r.error).toBeUndefined();
      const callLineAfter = fs.readFileSync(bPath, 'utf8').split(/\r?\n/)[1];
      expect(callLineAfter).toBe(callLineBefore);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });

  it('the registration schema exposes NO force parameter (source guard)', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '..', '..', 'src', 'cli', 'coderef-mcp-server.ts'),
      'utf8',
    );
    // Anchor on the REGISTRATION (not the instructions/comments, which also
    // mention rename_apply).
    const m = /server\.registerTool\(\s*'rename_apply'/.exec(src);
    expect(m).not.toBeNull();
    const start = m!.index + m![0].length;
    // The registration block runs to the next registerTool call.
    const end = src.indexOf('server.registerTool', start);
    const block = end === -1 ? src.slice(start) : src.slice(start, end);
    expect(/force/i.test(block)).toBe(false);
  });
});

// ---- (d) stratified blind-spot disclosure -----------------------------------------

describe('rename_apply — (d) stratified resolution disclosure (REC-R2)', () => {
  it('preview mode carries the stratified disclosure', () => {
    const { proj } = makeFixture();
    try {
      const h = buildToolHandlers(proj);
      const r = h.rename_apply({ old_name: 'renameMe', new_name: 'renameMe2' }) as any;
      const d = r.resolution_disclosure;
      expect(d).toBeDefined();
      // Stratified fields ALONGSIDE the raw totals — never the raw headline alone.
      expect(d.unresolved_src_count).toBe(948);
      expect(d.ambiguous_src_count).toBe(1189);
      expect(d.resolved_of_resolvable).toBe(32.8);
      expect(d.resolution_rate).toBe(22.41);
      expect(d.unresolved_edges_total).toBe(18249);
      // The denominator-artifact note names the test-DSL confound.
      expect(String(d.note)).toMatch(/test/i);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });

  it('apply mode carries the SAME disclosure', () => {
    const { proj } = makeFixture();
    try {
      const h = buildToolHandlers(proj);
      const r = h.rename_apply({ old_name: 'renameMe', new_name: 'renameMe2', apply: true }) as any;
      const d = r.resolution_disclosure;
      expect(d).toBeDefined();
      expect(d.unresolved_src_count).toBe(948);
      expect(d.resolved_of_resolvable).toBe(32.8);
      expect(d.resolution_rate).toBe(22.41);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });

  it('absent validation-report.json degrades to a disclosed no-data — never a silent omit', () => {
    const { proj } = makeFixture({ validationReport: false });
    try {
      const h = buildToolHandlers(proj);
      const r = h.rename_apply({ old_name: 'renameMe', new_name: 'renameMe2' }) as any;
      expect(r.error).toBeUndefined();
      expect(r.resolution_disclosure).toBeDefined();
      expect(r.resolution_disclosure.no_data).toBe(true);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });
});

// ---- (e) project_root required (repo-agnostic contract) ---------------------------

describe('rename_apply — (e) project_root is required at the schema', () => {
  it('the registration block requires project_root (repo-agnostic contract)', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '..', '..', 'src', 'cli', 'coderef-mcp-server.ts'),
      'utf8',
    );
    const m = /server\.registerTool\(\s*'rename_apply'/.exec(src);
    expect(m).not.toBeNull();
    const start = m!.index + m![0].length;
    const end = src.indexOf('server.registerTool', start);
    const block = end === -1 ? src.slice(start) : src.slice(start, end);
    expect(block).toContain('project_root: projectRootArg');
    // ...and dispatches per-repo like every other tool.
    expect(block).toContain('perRepo(project_root');
  });
});

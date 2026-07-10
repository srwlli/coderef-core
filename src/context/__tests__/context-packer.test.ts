/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability context-packer-test
 */

/**
 * Tests for the dependency-closure context packer (packContext) and the
 * extracted estimateTokens primitive.
 *
 * The load-bearing behaviours pinned here (built on a real .coderef/graph.json
 * in a temp project dir, deterministic — no Date.now/random):
 *  - the FOCUS block appears FIRST and UNCOMPRESSED (its full window body is
 *    present verbatim).
 *  - a DEPENDENCY is compressed: its body lines are dropped (replaced by
 *    `// ...`) while its signature line survives.
 *  - BUDGET TRIM (load-bearing): with a tiny tokenBudget at least one far dep
 *    is DROPPED and appears in manifest.dropped by id — the assertion goes RED
 *    if a trimmed dep is silently omitted from the manifest.
 *  - estimateTokens grows with input length (monotonic sanity).
 *  - a zero-dependency focus packs just the focus (included length 1, dropped
 *    empty).
 *  - an unknown focus throws /focus not found/i.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { ExportedGraph } from '../../export/graph-exporter.js';
import { packContext } from '../context-packer.js';
import { estimateTokens } from '../token-compress.js';

/**
 * Build a temp project dir with a .coderef/graph.json and real source files.
 *
 * Dependency chain (all resolved outbound call edges, closest-first):
 *   focus -> dep1 -> dep2
 *
 * Source files carry indented multi-line bodies so structure-preserving
 * compression has body lines to drop (-> `// ...`) while keeping signatures.
 */
function makeFixtureProject(): { dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-pack-'));
  const coderefDir = path.join(dir, '.coderef');
  fs.mkdirSync(coderefDir, { recursive: true });
  const srcDir = path.join(dir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  // A distinctive multi-line body per element so we can assert on it.
  // NOTE: body lines are indented STATEMENTS (not const/let/var), so the
  // structure-preserving compressor's BODY_SKIP_RE fires and collapses them to
  // `  // ...` while the signature line survives. (Indented `const`/`let`
  // lines match SIGNATURE_RE and would be KEPT, so they are avoided here.)
  const focusText = [
    'export function focusFn(x) {',        // 1 (signature)
    '  primeFocus(focusMarker);',          // 2 (body)
    '  return dep1(x);',                   // 3 (body)
    '}',                                   // 4
  ].join('\n');

  const dep1Body: string[] = [];
  for (let i = 0; i < 8; i++) dep1Body.push(`  accumulate(dep1Marker${i}, y);`);
  const dep1Text = ['export function dep1(y) {', ...dep1Body, '  return dep2(y);', '}'].join('\n');

  const dep2Body: string[] = [];
  for (let i = 0; i < 8; i++) dep2Body.push(`  compute(dep2Marker${i}, z);`);
  const dep2Text = ['export function dep2(z) {', ...dep2Body, '  return z;', '}'].join('\n');

  fs.writeFileSync(path.join(srcDir, 'focus.ts'), focusText, 'utf-8');
  fs.writeFileSync(path.join(srcDir, 'dep1.ts'), dep1Text, 'utf-8');
  fs.writeFileSync(path.join(srcDir, 'dep2.ts'), dep2Text, 'utf-8');

  const nodes: ExportedGraph['nodes'] = [
    { id: '@File/src/focus.ts', type: 'file', name: 'focus.ts', file: 'src/focus.ts' },
    { id: '@File/src/dep1.ts', type: 'file', name: 'dep1.ts', file: 'src/dep1.ts' },
    { id: '@File/src/dep2.ts', type: 'file', name: 'dep2.ts', file: 'src/dep2.ts' },
    {
      id: '@Fn/src/focus.ts#focusFn:1',
      type: 'function',
      name: 'focusFn',
      file: 'src/focus.ts',
      line: 1,
      metadata: { codeRefIdNoLine: '@Fn/src/focus.ts#focusFn' },
    },
    {
      id: '@Fn/src/dep1.ts#dep1:1',
      type: 'function',
      name: 'dep1',
      file: 'src/dep1.ts',
      line: 1,
      metadata: { codeRefIdNoLine: '@Fn/src/dep1.ts#dep1' },
    },
    {
      id: '@Fn/src/dep2.ts#dep2:1',
      type: 'function',
      name: 'dep2',
      file: 'src/dep2.ts',
      line: 1,
      metadata: { codeRefIdNoLine: '@Fn/src/dep2.ts#dep2' },
    },
  ];

  function callEdge(
    id: string,
    sourceId: string,
    targetId: string,
    srcFile: string,
    srcLine: number,
  ): ExportedGraph['edges'][number] {
    return {
      id,
      sourceId,
      targetId,
      relationship: 'call',
      resolutionStatus: 'resolved',
      sourceLocation: { file: srcFile, line: srcLine },
      source: sourceId,
      target: targetId,
      type: 'call',
    } as ExportedGraph['edges'][number];
  }

  const edges: ExportedGraph['edges'] = [
    // focus -> dep1 (call on focus.ts:4)
    callEdge('e1', '@Fn/src/focus.ts#focusFn:1', '@Fn/src/dep1.ts#dep1:1', 'src/focus.ts', 4),
    // dep1 -> dep2 (call on dep1.ts:4)
    callEdge('e2', '@Fn/src/dep1.ts#dep1:1', '@Fn/src/dep2.ts#dep2:1', 'src/dep1.ts', 4),
  ];

  const graph: ExportedGraph = {
    version: '1.0.0',
    exportedAt: 0,
    nodes,
    edges,
    statistics: { nodeCount: nodes.length, edgeCount: edges.length, edgesByType: {}, densityRatio: 0 },
  };

  fs.writeFileSync(path.join(coderefDir, 'graph.json'), JSON.stringify(graph), 'utf-8');
  return { dir };
}

/**
 * Build a temp project with a single focus function and NO dependency edges.
 */
function makeZeroDepProject(): { dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-pack-solo-'));
  const coderefDir = path.join(dir, '.coderef');
  fs.mkdirSync(coderefDir, { recursive: true });
  const srcDir = path.join(dir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  fs.writeFileSync(
    path.join(srcDir, 'solo.ts'),
    ['export function solo() {', '  return 42;', '}'].join('\n'),
    'utf-8',
  );

  const nodes: ExportedGraph['nodes'] = [
    { id: '@File/src/solo.ts', type: 'file', name: 'solo.ts', file: 'src/solo.ts' },
    {
      id: '@Fn/src/solo.ts#solo:1',
      type: 'function',
      name: 'solo',
      file: 'src/solo.ts',
      line: 1,
      metadata: { codeRefIdNoLine: '@Fn/src/solo.ts#solo' },
    },
  ];

  const graph: ExportedGraph = {
    version: '1.0.0',
    exportedAt: 0,
    nodes,
    edges: [],
    statistics: { nodeCount: nodes.length, edgeCount: 0, edgesByType: {}, densityRatio: 0 },
  };

  fs.writeFileSync(path.join(coderefDir, 'graph.json'), JSON.stringify(graph), 'utf-8');
  return { dir };
}

describe('packContext — focus block', () => {
  let fixture: { dir: string };
  beforeEach(() => { fixture = makeFixtureProject(); });
  afterEach(() => { fs.rmSync(fixture.dir, { recursive: true, force: true }); });

  it('places the focus FIRST and uncompressed (full window body present)', () => {
    const { bundle, manifest } = packContext(fixture.dir, 'focusFn', { tokenBudget: 8000 });

    // Focus header is the very first line of the bundle.
    expect(bundle.startsWith('// ==== @Fn/src/focus.ts#focusFn:1')).toBe(true);
    // Focus body lines are present verbatim (uncompressed).
    expect(bundle).toContain('primeFocus(focusMarker);');
    expect(bundle).toContain('return dep1(x);');

    // Manifest: focus is the first included entry and NOT compressed.
    expect(manifest.included[0].id).toBe('@Fn/src/focus.ts#focusFn:1');
    expect(manifest.included[0].compressed).toBe(false);
  });
});

describe('packContext — dependency compression', () => {
  let fixture: { dir: string };
  beforeEach(() => { fixture = makeFixtureProject(); });
  afterEach(() => { fs.rmSync(fixture.dir, { recursive: true, force: true }); });

  it('drops a dependency body (-> // ...) while keeping its signature', () => {
    // Budget admits focus (uncompressed) + dep1 (compressed) but not dep2. The
    // remaining budget after the focus squeezes dep1 so its body lines collapse
    // to `// ...` while the signature survives. (Sizing verified against the
    // extracted primitive: focus ~33 tok, compressed dep1 ~39 tok.)
    const { bundle } = packContext(fixture.dir, 'focusFn', { tokenBudget: 90, window: 40 });

    // A dependency signature survives compression...
    expect(bundle).toContain('export function dep1(y) {');
    // ...but at least one dependency body line was dropped to a placeholder.
    expect(bundle).toContain('// ...');
    // The dropped body's distinctive marker is gone from the compressed dep.
    expect(bundle).not.toContain('accumulate(dep1Marker0, y);');
  });
});

describe('packContext — BUDGET TRIM (load-bearing)', () => {
  let fixture: { dir: string };
  beforeEach(() => { fixture = makeFixtureProject(); });
  afterEach(() => { fs.rmSync(fixture.dir, { recursive: true, force: true }); });

  it('drops a far dep under a tiny budget and records it in manifest.dropped', () => {
    // Budget: focus (uncompressed) + the nearest dep (dep1, compressed) fit;
    // the far dep (dep2) overflows and must be TRIMMED and recorded — never
    // silently omitted. (focus ~33 + dep1 ~39 = ~72 <= 90; adding dep2 ~39
    // would exceed 90, so dep2 is dropped.)
    const { manifest } = packContext(fixture.dir, 'focusFn', { tokenBudget: 90, window: 40 });

    const includedIds = manifest.included.map(e => e.id);
    const droppedIds = manifest.dropped.map(e => e.id);

    // Focus is always included.
    expect(includedIds).toContain('@Fn/src/focus.ts#focusFn:1');
    // The far dependency dep2 is dropped and NAMED in the manifest.
    expect(droppedIds).toContain('@Fn/src/dep2.ts#dep2:1');
    // Every dropped entry carries an estTokens estimate (nothing silently omitted).
    for (const d of manifest.dropped) {
      expect(typeof d.estTokens).toBe('number');
      expect(d.estTokens).toBeGreaterThan(0);
    }
    // dep2 does not also appear as included.
    expect(includedIds).not.toContain('@Fn/src/dep2.ts#dep2:1');
  });
});

describe('packContext — deps compressed BY DEFAULT (operator ruling 2026-07-10)', () => {
  let fixture: { dir: string };
  beforeEach(() => { fixture = makeFixtureProject(); });
  afterEach(() => { fs.rmSync(fixture.dir, { recursive: true, force: true }); });

  it('compresses dep bodies even at a GENEROUS budget (ratio < 1, deps marked compressed)', () => {
    // The load-bearing proof for the compress-always ruling: with a budget large
    // enough that every dep would fit UNCOMPRESSED, the packer still sheds dep
    // bodies to the skeleton. Ratio must drop below 1 and the deps must report
    // compressed:true — RED if compression only fired under budget pressure.
    const { bundle, manifest } = packContext(fixture.dir, 'focusFn', { tokenBudget: 8000, window: 40 });

    // Both deps admitted (generous budget), focus + 2 deps.
    expect(manifest.included.length).toBe(3);
    expect(manifest.dropped.length).toBe(0);
    // Focus stays uncompressed; deps are compressed.
    expect(manifest.included[0].compressed).toBe(false); // focus
    const depEntries = manifest.included.slice(1);
    expect(depEntries.every(e => e.compressed === true)).toBe(true);
    // Bodies shed -> placeholder present, distinctive body markers gone.
    expect(bundle).toContain('// ...');
    expect(bundle).not.toContain('accumulate(dep1Marker0, y);');
    expect(bundle).not.toContain('compute(dep2Marker0, z);');
    // Compression actually reduced tokens.
    expect(manifest.compressionRatio).toBeLessThan(1);
  });

  it('--full-deps (compressDeps:false) keeps dep bodies verbatim (ratio == 1)', () => {
    const { bundle, manifest } = packContext(fixture.dir, 'focusFn', {
      tokenBudget: 8000,
      window: 40,
      compressDeps: false,
    });
    // Dep bodies are present verbatim; nothing compressed.
    expect(bundle).toContain('accumulate(dep1Marker0, y);');
    expect(bundle).toContain('compute(dep2Marker0, z);');
    expect(manifest.included.every(e => e.compressed === false)).toBe(true);
    // No compression happened: ratio ~1 (the tiny delta is per-block vs joined
    // estimateTokens ceil rounding, not shed content). Contrast the default
    // path above, which drives the ratio meaningfully below 1.
    expect(manifest.compressionRatio).toBeCloseTo(1, 1);
    expect(manifest.compressionRatio).toBeGreaterThan(0.99);
  });
});

describe('estimateTokens — monotonic', () => {
  it('grows with input length', () => {
    const short = estimateTokens('abcd');
    const mid = estimateTokens('abcd'.repeat(10));
    const long = estimateTokens('abcd'.repeat(100));
    expect(mid).toBeGreaterThan(short);
    expect(long).toBeGreaterThan(mid);
    // exact primitive contract: ceil(len/4)
    expect(estimateTokens('12345678')).toBe(2);
  });
});

describe('packContext — zero-dependency focus', () => {
  let fixture: { dir: string };
  beforeEach(() => { fixture = makeZeroDepProject(); });
  afterEach(() => { fs.rmSync(fixture.dir, { recursive: true, force: true }); });

  it('packs just the focus (included length 1, dropped empty)', () => {
    const { manifest, bundle } = packContext(fixture.dir, 'solo', { tokenBudget: 8000 });
    expect(manifest.included.length).toBe(1);
    expect(manifest.dropped.length).toBe(0);
    expect(manifest.included[0].id).toBe('@Fn/src/solo.ts#solo:1');
    expect(bundle).toContain('return 42;');
  });
});

describe('packContext — unknown focus', () => {
  let fixture: { dir: string };
  beforeEach(() => { fixture = makeFixtureProject(); });
  afterEach(() => { fs.rmSync(fixture.dir, { recursive: true, force: true }); });

  it('throws on an unknown focus', () => {
    expect(() => packContext(fixture.dir, 'noSuchFocus', { tokenBudget: 8000 }))
      .toThrow(/focus not found/i);
  });
});

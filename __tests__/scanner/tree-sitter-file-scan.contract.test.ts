/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability tree-sitter-file-scan-relationship-contract
 */

/**
 * Contract tests for WO-ELEMENTEXTRACTOR-REVISITS-RUST-IMPL-AND-JAVA-OR-C-001
 * phase 2 (TKT-XGZA82 / STUB-BD0MZY).
 *
 * TWO defects, both in how relationships were attached in
 * src/scanner/tree-sitter-file-scan.ts.
 *
 * (1) FABRICATED EDGES. Calls were matched with
 *     `call.source === element.name` AFTER method names had been collapsed to
 *     their bare form. Two same-named methods on different classes therefore
 *     matched every call from either, and each element received the UNION of
 *     both methods' callees — measured at HEAD, `Alpha.run` and `Beta.run` both
 *     came back with `["alphaOnly","betaOnly"]`. Neither was correct.
 *
 *     The scope was NOT lost at the dequalify step. It was destroyed earlier, in
 *     relationship-extractor.ts: a `method_definition` OVERWROTE the enclosing
 *     class scope with the bare method name, so `call.source` was already `run`
 *     for both. The fix composes that scope (`qualifyScopes`) and moves the
 *     matching to before the strip. The compose is OPT-IN because the other
 *     consumer of extractCalls feeds the canonical graph builder.
 *
 * (2) SILENT DROPS. Both relationship legs ended in a bare `catch {}`, so an
 *     extraction fault was indistinguishable from a file that genuinely has no
 *     imports or calls. Best-effort is a legitimate policy; unobservable is not.
 *
 * Operator ruling (A), 2026-08-01: element.name stays BARE. P2-T1 verified why —
 * validateReferences.ts:66 indexes elementMap by bare name and would report
 * every method call as "called but not found" if the strip were dropped. What
 * changed is WHERE the strip happens relative to the matching, not whether it
 * happens.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { scanFileWithTreeSitter } from '../../src/scanner/tree-sitter-file-scan.js';
import { RelationshipExtractor } from '../../src/pipeline/extractors/relationship-extractor.js';
import logger from '../../src/utils/logger.js';

afterEach(() => vi.restoreAllMocks());

function callsOf(els: Awaited<ReturnType<typeof scanFileWithTreeSitter>>, name: string) {
  return els.filter(e => e.name === name).map(e => [...(e.calls ?? [])].sort());
}

const TWO_CLASSES = [
  'export class Alpha {',
  '  run(): void { this.alphaOnly(); }',
  '  alphaOnly(): void {}',
  '}',
  'export class Beta {',
  '  run(): void { this.betaOnly(); }',
  '  betaOnly(): void {}',
  '}',
].join('\n');

describe('tree-sitter-file-scan relationship contract (phase 2)', () => {
  it('(a) same-named methods on different classes do NOT share callees', async () => {
    const els = await scanFileWithTreeSitter('C:/x/p.ts', TWO_CLASSES);
    const runs = callsOf(els, 'run');

    expect(runs, 'both classes contribute a `run` element').toHaveLength(2);
    // At HEAD both were ["alphaOnly","betaOnly"] — the union. This is the
    // defect-defining assertion.
    expect(runs).toEqual([['alphaOnly'], ['betaOnly']]);
  });

  it('(b) ruling (A): method names reach consumers BARE', async () => {
    const els = await scanFileWithTreeSitter('C:/x/p.ts', TWO_CLASSES);
    const methods = els.filter(e => e.type === 'method').map(e => e.name);

    // validateReferences.ts:66 indexes by bare name; qualifying here would make
    // every method call report as "called but not found".
    expect(methods.every(n => !n.includes('.')), `got ${JSON.stringify(methods)}`).toBe(true);
  });

  it('(c) plain functions are unaffected by the qualified matching', async () => {
    const code = 'export function a(): void { b(); }\nfunction b(): void {}\n';
    const els = await scanFileWithTreeSitter('C:/x/q.ts', code);

    expect(callsOf(els, 'a')).toEqual([['b']]);
    expect(callsOf(els, 'b')).toEqual([[]]);
  });

  it('(d) a nested function RECOVERS its callees — a drop that predates this WO', async () => {
    // Found while writing this suite, not planned for. The element extractor
    // has always named a nested `function inner()` inside `outer()` as the
    // element `outer.inner`, while the call extractor's scope for it was the
    // bare `inner`. Those two never matched, so nested functions silently
    // received NO callees at all — invisible unless the two sides are compared
    // directly. The same composition that de-fabricates the method edges also
    // recovers these.
    const code = [
      'export function outer(): void {',
      '  function inner(): void { helper(); }',
      '  inner();',
      '}',
      'function helper(): void {}',
    ].join('\n');
    const els = await scanFileWithTreeSitter('C:/x/n.ts', code);

    // The nested element keeps its qualified name: the dequalify step is scoped
    // to `type === 'method'`, and this is a `function`.
    expect(els.map(e => e.name).sort()).toEqual(['helper', 'outer', 'outer.inner']);
    expect(callsOf(els, 'outer.inner'), 'was [] before the fix').toEqual([['helper']]);
    expect(callsOf(els, 'outer')).toEqual([['inner']]);
  });

  it('(e) a failing relationship leg is OBSERVABLE, and stays non-fatal', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    vi.spyOn(RelationshipExtractor.prototype, 'extractCalls').mockImplementation(() => {
      throw new Error('synthetic extractor fault');
    });

    const els = await scanFileWithTreeSitter('C:/x/boom.ts', TWO_CLASSES);

    // Non-fatal: structural elements still stand.
    expect(els.length, 'elements survive a relationship fault').toBeGreaterThan(0);
    // ...but the fault is no longer silent. A bare `catch {}` made this
    // indistinguishable from a file with no relationships.
    expect(warn).toHaveBeenCalled();
    const msg = warn.mock.calls.map(c => String(c[0])).join(' | ');
    expect(msg).toContain('boom.ts');
    expect(msg).toContain('synthetic extractor fault');
  });

  it('(f) a file with genuinely NO relationships stays distinguishable from a fault', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const els = await scanFileWithTreeSitter('C:/x/quiet.ts', 'export const K = 1;\n');

    expect(els.length).toBeGreaterThan(0);
    // The whole point of (e): silence here MEANS something, because a fault
    // would have spoken.
    const relWarns = warn.mock.calls
      .map(c => String(c[0]))
      .filter(m => m.includes('relationship attach failed'));
    expect(relWarns, 'no fault warning for a genuinely quiet file').toEqual([]);
  });

  it('(g) the pipeline path is untouched — qualifyScopes defaults OFF', async () => {
    // The default MUST stay bare-overwrite: orchestrator.ts:463 feeds ctx.calls
    // into the canonical graph builder (resolve-tail.ts:47), so changing the
    // default would move the graph.
    const { GrammarRegistry } = await import('../../src/pipeline/grammar-registry.js');
    const parser = await GrammarRegistry.getInstance().getParser('ts');
    expect(parser, 'ts grammar must load; a missing parser is a FAILURE, not a skip').toBeTruthy();

    const tree = parser!.parse(TWO_CLASSES);
    const extractor = new RelationshipExtractor();

    const defaulted = extractor.extractCalls(tree.rootNode, 'C:/x/p.ts', TWO_CLASSES, 'ts');
    expect(
      defaulted.filter(c => c.source === 'run').length,
      'default path still emits the bare, collapsed scope',
    ).toBeGreaterThan(0);
    expect(defaulted.some(c => String(c.source).includes('.'))).toBe(false);

    const qualified = extractor.extractCalls(
      tree.rootNode, 'C:/x/p.ts', TWO_CLASSES, 'ts', undefined, true,
    );
    expect(qualified.map(c => c.source).sort()).toEqual(['Alpha.run', 'Beta.run']);
  });
});

/**
 * GX-002 scope-stack receiver binding pass — unit tests.
 * WO-GX-002-SCOPE-STACK-RECEIVER-TYPE-INFERENCE-BUILD-001 P1-T7.
 *
 * Covers the binding sources (new-expr, annotation, param), the T1
 * coverage fix (method-body scope frames), shadow-order guardrail G2
 * (first binding wins), the miss semantics split (DR-GX002-B: 'new'
 * stays unresolved on own-methods miss; annotation/param fall through
 * to the field-index ACG tail), and the JS/TS language guard.
 */

import { describe, it, expect } from 'vitest';
import { buildScopeBindingMap } from '../../src/pipeline/scope-binding.js';
import {
  resolveCalls,
} from '../../src/pipeline/call-resolver.js';
import type { PipelineState, RawCallFact } from '../../src/pipeline/types.js';
import type { ElementData } from '../../src/types/types.js';

const PROJECT = 'C:/fake-project';

function makeElement(partial: Partial<ElementData> & { name: string; file: string; type: ElementData['type']; line: number }): ElementData {
  return {
    codeRefId: `@${partial.type === 'method' ? 'M' : partial.type === 'class' ? 'C' : 'Fn'}/${partial.file}#${partial.name}:${partial.line}`,
    ...partial,
  } as ElementData;
}

function makeState(files: Record<string, string>, elements: ElementData[], rawCalls: RawCallFact[]): PipelineState {
  return {
    projectPath: PROJECT,
    sources: new Map(Object.entries(files)),
    elements,
    rawCalls,
    importResolutions: [],
    callResolutions: null,
  } as unknown as PipelineState;
}

function call(sourceFile: string, calleeName: string, receiverText: string | null, scopePath: string[], line = 10): RawCallFact {
  return {
    sourceFile,
    calleeName,
    receiverText,
    scopePath,
    line,
    sourceElementCandidate: null,
  } as unknown as RawCallFact;
}

describe('buildScopeBindingMap — binding sources', () => {
  it('binds const/let/var = new Y() inside a function', () => {
    const src = `
function useIt() {
  const a = new Foo();
  let b = new Bar();
  var c = new Baz();
}
`;
    const fn = makeElement({ name: 'useIt', file: 'a.ts', type: 'function', line: 2 });
    const map = buildScopeBindingMap(
      makeState({ 'a.ts': src }, [fn], []),
      new Map([['a.ts', [fn]]]),
      PROJECT,
    );
    const scope = map.get(fn.codeRefId!);
    expect(scope?.get('a')).toEqual({ className: 'Foo', kind: 'new' });
    expect(scope?.get('b')).toEqual({ className: 'Bar', kind: 'new' });
    expect(scope?.get('c')).toEqual({ className: 'Baz', kind: 'new' });
  });

  it('binds TS type-annotated declarations, stripping generics and skipping primitives/unions/builtins', () => {
    const src = `
function useIt() {
  const a: Widget = getWidget();
  const b: Widget<string> = getWidget();
  const c: string = 'nope';
  const d: Widget | null = maybe();
  const e: Promise<Widget> = load();
}
`;
    const fn = makeElement({ name: 'useIt', file: 'a.ts', type: 'function', line: 2 });
    const map = buildScopeBindingMap(
      makeState({ 'a.ts': src }, [fn], []),
      new Map([['a.ts', [fn]]]),
      PROJECT,
    );
    const scope = map.get(fn.codeRefId!);
    expect(scope?.get('a')).toEqual({ className: 'Widget', kind: 'annotation' });
    expect(scope?.get('b')).toEqual({ className: 'Widget', kind: 'annotation' });
    expect(scope?.has('c')).toBe(false);
    expect(scope?.has('d')).toBe(false); // union — skipped
    expect(scope?.has('e')).toBe(false); // Promise — blocklisted builtin
  });

  it('binds typed parameters on function declarations, including optional and defaulted', () => {
    const src = `
function useIt(w: Widget, count: number, maybe?: Gadget, dflt: Sprocket = make()) {
  return w;
}
`;
    const fn = makeElement({ name: 'useIt', file: 'a.ts', type: 'function', line: 2 });
    const map = buildScopeBindingMap(
      makeState({ 'a.ts': src }, [fn], []),
      new Map([['a.ts', [fn]]]),
      PROJECT,
    );
    const scope = map.get(fn.codeRefId!);
    expect(scope?.get('w')).toEqual({ className: 'Widget', kind: 'param' });
    expect(scope?.has('count')).toBe(false);
    expect(scope?.get('maybe')).toEqual({ className: 'Gadget', kind: 'param' });
    expect(scope?.get('dflt')).toEqual({ className: 'Sprocket', kind: 'param' });
  });

  it('T1 coverage fix: bindings inside class METHOD bodies attribute to the method element', () => {
    const src = `
class Runner {
  run(input: Payload) {
    const helper = new Helper();
    helper.assist();
  }
}
`;
    const method = makeElement({ name: 'Runner.run', file: 'a.ts', type: 'method', line: 3 });
    const map = buildScopeBindingMap(
      makeState({ 'a.ts': src }, [method], []),
      new Map([['a.ts', [method]]]),
      PROJECT,
    );
    const scope = map.get(method.codeRefId!);
    expect(scope?.get('helper')).toEqual({ className: 'Helper', kind: 'new' });
    expect(scope?.get('input')).toEqual({ className: 'Payload', kind: 'param' });
  });

  it('G2: first binding wins per scope; factory returns never bind', () => {
    const src = `
function useIt() {
  const x = new Foo();
  const y = makeBar();
}
function other() {
  const x = new Baz();
}
`;
    const fn1 = makeElement({ name: 'useIt', file: 'a.ts', type: 'function', line: 2 });
    const fn2 = makeElement({ name: 'other', file: 'a.ts', type: 'function', line: 6 });
    const map = buildScopeBindingMap(
      makeState({ 'a.ts': src }, [fn1, fn2], []),
      new Map([['a.ts', [fn1, fn2]]]),
      PROJECT,
    );
    expect(map.get(fn1.codeRefId!)?.get('x')?.className).toBe('Foo');
    expect(map.get(fn1.codeRefId!)?.has('y')).toBe(false);
    expect(map.get(fn2.codeRefId!)?.get('x')?.className).toBe('Baz'); // fresh per scope
  });

  it('language guard: Python files are never walked', () => {
    const src = `def use_it():\n    x = Foo()\n`;
    const fn = makeElement({ name: 'use_it', file: 'a.py', type: 'function', line: 1 });
    const map = buildScopeBindingMap(
      makeState({ 'a.py': src }, [fn], []),
      new Map([['a.py', [fn]]]),
      PROJECT,
    );
    expect(map.size).toBe(0);
  });
});

describe('classifyMethodCall via resolveCalls — resolution semantics (DR-GX002-B)', () => {
  const CLS = `
class Widget {
  spin() { return 1; }
}
function useNew() {
  const w = new Widget();
  w.spin();
}
function useAnn(x: Widget) {
  x.spin();
}
`;

  function widgetElements(): ElementData[] {
    return [
      makeElement({ name: 'Widget', file: 'w.ts', type: 'class', line: 2 }),
      makeElement({ name: 'Widget.spin', file: 'w.ts', type: 'method', line: 3 }),
      makeElement({ name: 'useNew', file: 'w.ts', type: 'function', line: 5 }),
      makeElement({ name: 'useAnn', file: 'w.ts', type: 'function', line: 9 }),
    ];
  }

  it("resolves x.method() through a 'new' binding (existing behavior preserved)", () => {
    const state = makeState({ 'w.ts': CLS }, widgetElements(), [
      call('w.ts', 'spin', 'w', ['useNew'], 7),
    ]);
    const [res] = resolveCalls(state);
    expect(res.kind).toBe('resolved');
    expect(res.resolvedTargetCodeRefId).toBe('@M/w.ts#Widget.spin:3');
    expect(res.reason).toBeUndefined();
  });

  it("resolves x.method() through a 'param' binding at full confidence with scope_binding_param reason", () => {
    const state = makeState({ 'w.ts': CLS }, widgetElements(), [
      call('w.ts', 'spin', 'x', ['useAnn'], 10),
    ]);
    const [res] = resolveCalls(state);
    expect(res.kind).toBe('resolved');
    expect(res.resolvedTargetCodeRefId).toBe('@M/w.ts#Widget.spin:3');
    expect(res.reason).toBe('scope_binding_param');
    expect(res.confidence).toBeUndefined(); // full confidence, not provisional
  });

  it("'new' binding with method nowhere in the project stays unresolved with the SHARPENED reason", () => {
    const state = makeState({ 'w.ts': CLS }, widgetElements(), [
      call('w.ts', 'explode', 'w', ['useNew'], 7),
    ]);
    const [res] = resolveCalls(state);
    expect(res.kind).toBe('unresolved');
    expect(res.reason).toBe('method_not_in_class_own_methods');
  });

  it("'new' binding own-methods miss still reaches the ACG tail (inheritance blindness guard)", () => {
    // `const w = new Widget(); w.helperMethod()` where helperMethod lives on
    // Other — own-methods lookup misses (it cannot see inheritance), and the
    // measured-live regression was hard-failing here instead of letting the
    // field index resolve provisionally.
    const src = `
class Widget {
  spin() { return 1; }
}
class Other {
  helperMethod() { return 2; }
}
function useNew() {
  const w = new Widget();
  w.helperMethod();
}
`;
    const elements = [
      makeElement({ name: 'Widget', file: 'w.ts', type: 'class', line: 2 }),
      makeElement({ name: 'Widget.spin', file: 'w.ts', type: 'method', line: 3 }),
      makeElement({ name: 'Other', file: 'w.ts', type: 'class', line: 5 }),
      makeElement({ name: 'Other.helperMethod', file: 'w.ts', type: 'method', line: 6 }),
      makeElement({ name: 'useNew', file: 'w.ts', type: 'function', line: 8 }),
    ];
    const state = makeState({ 'w.ts': src }, elements, [
      call('w.ts', 'helperMethod', 'w', ['useNew'], 10),
    ]);
    const [res] = resolveCalls(state);
    expect(res.kind).toBe('resolved');
    expect(res.confidence).toBe('provisional');
    expect(res.reason).toBe('field_based_acg');
  });

  it("annotation/param binding miss FALLS THROUGH to the field-index ACG tail (no-regress guard)", () => {
    // `x: Widget` but the called method lives on Other — the pre-GX-002
    // resolver would have found it via the field index (provisional). The
    // fall-through must preserve that outcome instead of hard-failing.
    const src = `
class Widget {
  spin() { return 1; }
}
class Other {
  helperMethod() { return 2; }
}
function useAnn(x: Widget) {
  x.helperMethod();
}
`;
    const elements = [
      makeElement({ name: 'Widget', file: 'w.ts', type: 'class', line: 2 }),
      makeElement({ name: 'Widget.spin', file: 'w.ts', type: 'method', line: 3 }),
      makeElement({ name: 'Other', file: 'w.ts', type: 'class', line: 5 }),
      makeElement({ name: 'Other.helperMethod', file: 'w.ts', type: 'method', line: 6 }),
      makeElement({ name: 'useAnn', file: 'w.ts', type: 'function', line: 8 }),
    ];
    const state = makeState({ 'w.ts': src }, elements, [
      call('w.ts', 'helperMethod', 'x', ['useAnn'], 9),
    ]);
    const [res] = resolveCalls(state);
    // Field-index single-candidate tier: resolved-provisional, field_based_acg.
    expect(res.kind).toBe('resolved');
    expect(res.confidence).toBe('provisional');
    expect(res.reason).toBe('field_based_acg');
  });

  it('shadowing: a scope binding never overrides the builtin-receiver allowlist', () => {
    const src = `
function useIt() {
  const arr = new Thing();
  Math.max(1, 2);
}
`;
    const elements = [
      makeElement({ name: 'useIt', file: 'a.ts', type: 'function', line: 2 }),
    ];
    const state = makeState({ 'a.ts': src }, elements, [
      call('a.ts', 'max', 'Math', ['useIt'], 4),
    ]);
    const [res] = resolveCalls(state);
    expect(res.kind).toBe('builtin');
    expect(res.reason).toBe('in_allowlist');
  });

  it('method-body binding resolves calls INSIDE class methods (T1 coverage fix, end-to-end)', () => {
    const src = `
class Widget {
  spin() { return 1; }
}
class Runner {
  run() {
    const w = new Widget();
    w.spin();
  }
}
`;
    const elements = [
      makeElement({ name: 'Widget', file: 'w.ts', type: 'class', line: 2 }),
      makeElement({ name: 'Widget.spin', file: 'w.ts', type: 'method', line: 3 }),
      makeElement({ name: 'Runner', file: 'w.ts', type: 'class', line: 5 }),
      makeElement({ name: 'Runner.run', file: 'w.ts', type: 'method', line: 6 }),
    ];
    const state = makeState({ 'w.ts': src }, elements, [
      call('w.ts', 'spin', 'w', ['Runner', 'run'], 8),
    ]);
    const [res] = resolveCalls(state);
    expect(res.kind).toBe('resolved');
    expect(res.resolvedTargetCodeRefId).toBe('@M/w.ts#Widget.spin:3');
  });
});

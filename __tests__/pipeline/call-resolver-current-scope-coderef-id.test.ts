/**
 * @coderef-semantic: 1.0.0
 * @exports (test file — no exports)
 * @used_by (test runner only)
 */

import { describe, expect, it } from 'vitest';
import { buildSymbolTable, resolveCallsAgainstTable } from '../../src/pipeline/call-resolver.js';
import type { PipelineState } from '../../src/pipeline/types.js';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGraph(): ExportedGraph {
  return {
    nodes: [],
    edges: [],
    statistics: { nodeCount: 0, edgeCount: 0, edgesByType: {} },
  };
}

/**
 * Build a minimal PipelineState for testing currentScopeCodeRefId behavior
 * indirectly through resolveCallsAgainstTable → buildNewInitializerMap.
 *
 * The key shape:
 *   - source text contains `function outerFn() { const obj = new MyClass(); obj.doWork(); }`
 *   - elements include `outerFn` (the enclosing scope) and `MyClass.doWork` (the method)
 *   - rawCalls has one entry: receiver='obj', callee='doWork', scopePath=['outerFn']
 *
 * When currentScopeCodeRefId resolves correctly, it finds outerFn's codeRefId,
 * which lets buildNewInitializerMap attribute `obj → MyClass` to that scope.
 * classifyMethodCall branch 3 then resolves `obj.doWork()` → `MyClass.doWork`.
 */
function makeMethodResolutionState(): PipelineState {
  return {
    projectPath: '/tmp/scope-test',
    files: new Map([['ts', ['/tmp/scope-test/src/main.ts']]]),
    elements: [
      {
        type: 'function',
        name: 'outerFn',
        file: '/tmp/scope-test/src/main.ts',
        line: 1,
        codeRefId: '@Fn/src/main.ts#outerFn:1',
      },
      {
        type: 'method',
        name: 'MyClass.doWork',
        file: '/tmp/scope-test/src/main.ts',
        line: 10,
        codeRefId: '@Fn/src/main.ts#MyClass.doWork:10',
      },
    ],
    imports: [],
    calls: [],
    rawImports: [],
    rawCalls: [
      {
        sourceElementCandidate: null,
        sourceFile: '/tmp/scope-test/src/main.ts',
        callExpressionText: 'obj.doWork()',
        calleeName: 'doWork',
        receiverText: 'obj',
        scopePath: ['outerFn'],
        line: 3,
        language: 'ts',
      },
    ],
    rawExports: [],
    headerFacts: new Map(),
    headerImportFacts: [],
    headerParseErrors: [],
    importResolutions: [],
    callResolutions: [],
    graph: makeGraph(),
    // Source text: outerFn contains `const obj = new MyClass()` then `obj.doWork()`
    sources: new Map([
      [
        '/tmp/scope-test/src/main.ts',
        [
          'function outerFn() {',
          '  const obj = new MyClass();',
          '  obj.doWork();',
          '}',
          '',
          'class MyClass {',
          '  doWork() { return 42; }',
          '}',
        ].join('\n'),
      ],
    ]),
    options: {},
    metadata: { startTime: 0, filesScanned: 1, elementsExtracted: 2, relationshipsExtracted: 0 },
  };
}

/**
 * State where `const obj = new MyClass()` appears at module scope (outside
 * any function). currentScopeCodeRefId should return null, so the binding
 * is NOT attributed to any scope and obj.doWork() goes through unknown-receiver
 * fallback.
 */
function makeModuleScopeState(): PipelineState {
  return {
    projectPath: '/tmp/scope-test-module',
    files: new Map([['ts', ['/tmp/scope-test-module/src/main.ts']]]),
    elements: [
      {
        type: 'method',
        name: 'MyClass.doWork',
        file: '/tmp/scope-test-module/src/main.ts',
        line: 5,
        codeRefId: '@Fn/src/main.ts#MyClass.doWork:5',
      },
    ],
    imports: [],
    calls: [],
    rawImports: [],
    rawCalls: [
      {
        sourceElementCandidate: null,
        sourceFile: '/tmp/scope-test-module/src/main.ts',
        callExpressionText: 'obj.doWork()',
        calleeName: 'doWork',
        receiverText: 'obj',
        scopePath: [],
        line: 3,
        language: 'ts',
      },
    ],
    rawExports: [],
    headerFacts: new Map(),
    headerImportFacts: [],
    headerParseErrors: [],
    importResolutions: [],
    callResolutions: [],
    graph: makeGraph(),
    // const obj = new MyClass() at module scope — no enclosing function
    sources: new Map([
      [
        '/tmp/scope-test-module/src/main.ts',
        [
          'const obj = new MyClass();',
          'obj.doWork();',
          '',
          'class MyClass {',
          '  doWork() { return 42; }',
          '}',
        ].join('\n'),
      ],
    ]),
    options: {},
    metadata: { startTime: 0, filesScanned: 1, elementsExtracted: 1, relationshipsExtracted: 0 },
  };
}

/**
 * State where the scopeStack has frames but none match any element in
 * elemByName. currentScopeCodeRefId should fall through to null, and the
 * binding is skipped (guardrail: only attribute when scope resolves).
 */
function makeScopeStackNoMatchState(): PipelineState {
  return {
    projectPath: '/tmp/scope-test-nomatch',
    files: new Map([['ts', ['/tmp/scope-test-nomatch/src/main.ts']]]),
    elements: [
      // No element named 'arrowHandler' or any name matching the source function
      {
        type: 'method',
        name: 'MyClass.doWork',
        file: '/tmp/scope-test-nomatch/src/main.ts',
        line: 8,
        codeRefId: '@Fn/src/main.ts#MyClass.doWork:8',
      },
    ],
    imports: [],
    calls: [],
    rawImports: [],
    rawCalls: [
      {
        sourceElementCandidate: null,
        sourceFile: '/tmp/scope-test-nomatch/src/main.ts',
        callExpressionText: 'obj.doWork()',
        calleeName: 'doWork',
        receiverText: 'obj',
        scopePath: ['unknownArrow'],
        line: 4,
        language: 'ts',
      },
    ],
    rawExports: [],
    headerFacts: new Map(),
    headerImportFacts: [],
    headerParseErrors: [],
    importResolutions: [],
    callResolutions: [],
    graph: makeGraph(),
    // Function named `unknownFn` in source but no element registered for it
    sources: new Map([
      [
        '/tmp/scope-test-nomatch/src/main.ts',
        [
          'function unknownFn() {',
          '  const obj = new MyClass();',
          '  obj.doWork();',
          '}',
          '',
          'class MyClass {',
          '  doWork() { return 1; }',
          '}',
        ].join('\n'),
      ],
    ]),
    options: {},
    metadata: { startTime: 0, filesScanned: 1, elementsExtracted: 1, relationshipsExtracted: 0 },
  };
}

/**
 * State with two nested functions. The inner function has `const obj = new MyClass()`.
 * currentScopeCodeRefId should resolve to the innermost matching scope (innerFn),
 * not outerFn.
 */
function makeNestedScopeState(): PipelineState {
  return {
    projectPath: '/tmp/scope-test-nested',
    files: new Map([['ts', ['/tmp/scope-test-nested/src/main.ts']]]),
    elements: [
      {
        type: 'function',
        name: 'outerFn',
        file: '/tmp/scope-test-nested/src/main.ts',
        line: 1,
        codeRefId: '@Fn/src/main.ts#outerFn:1',
      },
      {
        type: 'function',
        name: 'outerFn.innerFn',
        file: '/tmp/scope-test-nested/src/main.ts',
        line: 2,
        codeRefId: '@Fn/src/main.ts#outerFn.innerFn:2',
      },
      {
        type: 'method',
        name: 'MyClass.doWork',
        file: '/tmp/scope-test-nested/src/main.ts',
        line: 12,
        codeRefId: '@Fn/src/main.ts#MyClass.doWork:12',
      },
    ],
    imports: [],
    calls: [],
    rawImports: [],
    rawCalls: [
      {
        sourceElementCandidate: null,
        sourceFile: '/tmp/scope-test-nested/src/main.ts',
        callExpressionText: 'obj.doWork()',
        calleeName: 'doWork',
        receiverText: 'obj',
        scopePath: ['outerFn', 'innerFn'],
        line: 4,
        language: 'ts',
      },
    ],
    rawExports: [],
    headerFacts: new Map(),
    headerImportFacts: [],
    headerParseErrors: [],
    importResolutions: [],
    callResolutions: [],
    graph: makeGraph(),
    sources: new Map([
      [
        '/tmp/scope-test-nested/src/main.ts',
        [
          'function outerFn() {',
          '  function innerFn() {',
          '    const obj = new MyClass();',
          '    obj.doWork();',
          '  }',
          '  innerFn();',
          '}',
          '',
          'class MyClass {',
          '  doWork() { return 7; }',
          '}',
        ].join('\n'),
      ],
    ]),
    options: {},
    metadata: { startTime: 0, filesScanned: 1, elementsExtracted: 3, relationshipsExtracted: 0 },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('currentScopeCodeRefId — exercised via buildNewInitializerMap pipeline', () => {
  it('resolves obj.method() to ClassName.method when const obj = new ClassName() in enclosing fn scope', () => {
    const state = makeMethodResolutionState();
    const table = buildSymbolTable(state);
    const resolutions = resolveCallsAgainstTable(state, table);

    expect(resolutions).toHaveLength(1);
    const r = resolutions[0];
    // Branch 3 of classifyMethodCall: obj resolved to MyClass via newInitMap,
    // so doWork resolves to MyClass.doWork.
    expect(r.kind).toBe('resolved');
    expect(r.resolvedTargetCodeRefId).toBe('@Fn/src/main.ts#MyClass.doWork:10');
    expect(r.calleeName).toBe('doWork');
    expect(r.receiverText).toBe('obj');
  });

  it('returns null (no binding) when const obj = new ClassName() is at module scope', () => {
    // When currentScopeCodeRefId returns null, buildNewInitializerMap skips
    // the binding (the codeRefId guard at line 950). obj.doWork() then
    // falls through to unknown-receiver fallback in classifyMethodCall.
    const state = makeModuleScopeState();
    const table = buildSymbolTable(state);
    const resolutions = resolveCallsAgainstTable(state, table);

    expect(resolutions).toHaveLength(1);
    const r = resolutions[0];
    // No newInitMap entry exists for module-scope const; falls to branch 5/6/7.
    // MyClass.doWork is in the symbol table as a method → ambiguous with one candidate.
    expect(r.kind).toBe('ambiguous');
    expect(r.calleeName).toBe('doWork');
  });

  it('falls through to null when scopeStack has frames but no element matches', () => {
    // unknownFn exists in source (so brace tracker pushes a scope frame) but
    // no element is registered under that name. currentScopeCodeRefId walks
    // the full stack without finding a match and returns null → binding skipped.
    const state = makeScopeStackNoMatchState();
    const table = buildSymbolTable(state);
    const resolutions = resolveCallsAgainstTable(state, table);

    expect(resolutions).toHaveLength(1);
    const r = resolutions[0];
    // No newInitMap entry → unknown-receiver fallback.
    expect(r.kind).toBe('ambiguous');
  });

  it('attributes const obj = new ClassName() to innermost scope when nested fns present', () => {
    // innerFn is the innermost scope frame when `const obj = new MyClass()` is
    // encountered. currentScopeCodeRefId walks scopeStack from top and finds
    // `outerFn.innerFn` first. The binding is stored under innerFn's codeRefId.
    const state = makeNestedScopeState();
    const table = buildSymbolTable(state);
    const resolutions = resolveCallsAgainstTable(state, table);

    expect(resolutions).toHaveLength(1);
    const r = resolutions[0];
    // The rawCall has scopePath=['outerFn','innerFn'] so deriveCallerCodeRefId
    // resolves to outerFn.innerFn. The newInitMap key is also outerFn.innerFn's
    // codeRefId. Both agree → branch 3 resolves.
    expect(r.kind).toBe('resolved');
    expect(r.resolvedTargetCodeRefId).toBe('@Fn/src/main.ts#MyClass.doWork:12');
    expect(r.callerCodeRefId).toBe('@Fn/src/main.ts#outerFn.innerFn:2');
  });

  it('first-binding-wins: second const obj = new OtherClass() in same scope is ignored', () => {
    const state: PipelineState = {
      projectPath: '/tmp/scope-test-firstwins',
      files: new Map([['ts', ['/tmp/scope-test-firstwins/src/main.ts']]]),
      elements: [
        {
          type: 'function', name: 'handler',
          file: '/tmp/scope-test-firstwins/src/main.ts', line: 1,
          codeRefId: '@Fn/src/main.ts#handler:1',
        },
        {
          type: 'method', name: 'FirstClass.run',
          file: '/tmp/scope-test-firstwins/src/main.ts', line: 10,
          codeRefId: '@Fn/src/main.ts#FirstClass.run:10',
        },
        {
          type: 'method', name: 'SecondClass.run',
          file: '/tmp/scope-test-firstwins/src/main.ts', line: 16,
          codeRefId: '@Fn/src/main.ts#SecondClass.run:16',
        },
      ],
      imports: [],
      calls: [],
      rawImports: [],
      rawCalls: [
        {
          sourceElementCandidate: null,
          sourceFile: '/tmp/scope-test-firstwins/src/main.ts',
          callExpressionText: 'obj.run()',
          calleeName: 'run',
          receiverText: 'obj',
          scopePath: ['handler'],
          line: 4,
          language: 'ts',
        },
      ],
      rawExports: [],
      headerFacts: new Map(),
      headerImportFacts: [],
      headerParseErrors: [],
      importResolutions: [],
      callResolutions: [],
      graph: makeGraph(),
      sources: new Map([
        [
          '/tmp/scope-test-firstwins/src/main.ts',
          [
            'function handler() {',
            '  const obj = new FirstClass();',
            '  const obj = new SecondClass();',  // duplicate — first wins
            '  obj.run();',
            '}',
            '',
            'class FirstClass {',
            '  run() { return 1; }',
            '}',
            '',
            'class SecondClass {',
            '  run() { return 2; }',
            '}',
          ].join('\n'),
        ],
      ]),
      options: {},
      metadata: { startTime: 0, filesScanned: 1, elementsExtracted: 3, relationshipsExtracted: 0 },
    };

    const table = buildSymbolTable(state);
    const resolutions = resolveCallsAgainstTable(state, table);

    expect(resolutions).toHaveLength(1);
    const r = resolutions[0];
    // First binding (FirstClass) wins — obj resolves to FirstClass, not SecondClass.
    expect(r.kind).toBe('resolved');
    expect(r.resolvedTargetCodeRefId).toBe('@Fn/src/main.ts#FirstClass.run:10');
  });

  it('does not attribute const binding across files (isolation guarantee)', () => {
    // Two files. File A has `function fnA() { const obj = new MyClass(); }`.
    // File B has `obj.doWork()` in fnB. The binding from file A must NOT
    // carry over to file B's resolution.
    const state: PipelineState = {
      projectPath: '/tmp/scope-test-isolation',
      files: new Map([['ts', [
        '/tmp/scope-test-isolation/src/a.ts',
        '/tmp/scope-test-isolation/src/b.ts',
      ]]]),
      elements: [
        {
          type: 'function', name: 'fnA',
          file: '/tmp/scope-test-isolation/src/a.ts', line: 1,
          codeRefId: '@Fn/src/a.ts#fnA:1',
        },
        {
          type: 'function', name: 'fnB',
          file: '/tmp/scope-test-isolation/src/b.ts', line: 1,
          codeRefId: '@Fn/src/b.ts#fnB:1',
        },
        {
          type: 'method', name: 'MyClass.doWork',
          file: '/tmp/scope-test-isolation/src/a.ts', line: 8,
          codeRefId: '@Fn/src/a.ts#MyClass.doWork:8',
        },
      ],
      imports: [],
      calls: [],
      rawImports: [],
      rawCalls: [
        {
          sourceElementCandidate: null,
          sourceFile: '/tmp/scope-test-isolation/src/b.ts',
          callExpressionText: 'obj.doWork()',
          calleeName: 'doWork',
          receiverText: 'obj',
          scopePath: ['fnB'],
          line: 3,
          language: 'ts',
        },
      ],
      rawExports: [],
      headerFacts: new Map(),
      headerImportFacts: [],
      headerParseErrors: [],
      importResolutions: [],
      callResolutions: [],
      graph: makeGraph(),
      sources: new Map([
        [
          '/tmp/scope-test-isolation/src/a.ts',
          [
            'function fnA() {',
            '  const obj = new MyClass();',
            '}',
            '',
            'class MyClass {',
            '  doWork() { return 1; }',
            '}',
          ].join('\n'),
        ],
        [
          '/tmp/scope-test-isolation/src/b.ts',
          [
            'function fnB() {',
            '  obj.doWork();',
            '}',
          ].join('\n'),
        ],
      ]),
      options: {},
      metadata: { startTime: 0, filesScanned: 2, elementsExtracted: 3, relationshipsExtracted: 0 },
    };

    const table = buildSymbolTable(state);
    const resolutions = resolveCallsAgainstTable(state, table);

    expect(resolutions).toHaveLength(1);
    const r = resolutions[0];
    // File B's fnB has no `const obj = new MyClass()` — cross-file binding
    // does not apply. Falls to unknown-receiver fallback.
    expect(r.kind).not.toBe('resolved');
    expect(r.calleeName).toBe('doWork');
  });
});

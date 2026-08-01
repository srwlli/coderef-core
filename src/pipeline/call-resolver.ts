/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability call-resolver-call-resolution-kind
 * @exports CallResolutionKind, CallResolution, SymbolTableEntry, SymbolTable, BUILTIN_RECEIVERS, JS_GLOBAL_CALLEES, PYTHON_BUILTIN_CALLEES, JS_PROTOTYPE_METHODS, TEST_DSL_AMBIENT_CALLEES, resolveCalls, buildSymbolTable, resolveCallsAgainstTable, isBuiltinReceiver, isBuiltinRootReceiver, classifyMethodCall, deriveCallerCodeRefId
 * @used_by src/pipeline/orchestrator.ts, src/pipeline/types.ts, __tests__/pipeline/call-resolution-determinism.test.ts, __tests__/pipeline/call-resolution-pre-phase3-assertion.test.ts, __tests__/pipeline/call-resolution-two-pass-ordering.test.ts, __tests__/pipeline/call-resolver-current-scope-coderef-id.test.ts
 */

/**
 * Phase 4 Call Resolver
 *
 * WO-PIPELINE-CALL-RESOLUTION-001
 *
 * Two-pass resolver (mirrors Phase 3's pattern):
 *   Pass 1 (buildSymbolTable) — index every PipelineState.element + every
 *     resolved Phase 3 ImportResolution.localName binding into a
 *     Map<name, SymbolTableEntry[]>. Multi-valued because duplicates exist
 *     across files (drives ambiguous detection in pass 2).
 *   Pass 2 (resolveCallsAgainstTable) — for every RawCallFact, classify
 *     the call into exactly one of {resolved, unresolved, ambiguous,
 *     external, builtin} using receiver text, scope path, and the symbol
 *     table. Pass 2 performs ZERO file IO and DOES NOT mutate state.calls /
 *     state.rawCalls / state.importResolutions / state.elements.
 *
 * Phase 4 invariants (enforced by tests):
 *   AC-01: every RawCallFact produces exactly one CallResolution; no silent
 *     drops; every kind is one of the 5 valid kinds.
 *   AC-02: built-in receivers (Array, Object, Promise, Map, Set, String,
 *     Number, Boolean, RegExp, Date, Error, JSON, Math, Reflect, Symbol)
 *     classify as 'builtin' and produce NO project graph edges.
 *   AC-03: `this.method()` resolves within the enclosing class scope.
 *   AC-04: `obj.method()` with unknown receiver type is ambiguous OR
 *     unresolved — NEVER silently resolved.
 *   AC-05: duplicate function names across files yield kind='ambiguous'
 *     with candidates[] populated.
 *   AC-06: nested-function and class-method calls preserve qualifying
 *     scope path during resolution.
 *   AC-07: calls to imported symbols resolve via Phase 3's
 *     ImportResolution.localName binding (cross-phase seam).
 *   AC-08: resolution is deterministic and pure over PipelineState.
 *   AC-09: pass 1 completes for ALL files before pass 2 begins for ANY file.
 *   AC-10: NO graph construction work leaks (Phase 5 boundary enforcer).
 *   AC-11: Phase 0 ground-truth call-side assertions flip to PASS in this
 *     phase (4 tests' call-side + 2 fully-call-only tests). Test 1's
 *     endpoint-is-node-id assertion (line 52) STAYS FAIL — Phase 5 owns it.
 *
 * Design records:
 *   DR-PHASE-4-A: built-in detection uses BUILTIN_RECEIVERS allowlist.
 *   DR-PHASE-4-B: method-call branching — this/imported/known-symbol/unknown.
 *   DR-PHASE-4-C: read-only consumption of state.importResolutions.
 *   DR-PHASE-4-D: two-pass timing mirrors Phase 3.
 */



import type {
  PipelineState,
  RawCallFact,
  ImportResolution,
} from './types.js';
import type { ElementData } from '../types/types.js';
import { createCodeRefId } from '../utils/coderef-id.js';
import { buildFieldIndex, lookupField, type FieldIndex } from './field-index.js';
import { buildScopeBindingMap, type ScopeBindingMap } from './scope-binding.js';
import { buildHeritageIndex, heritageMethodLookup, type HeritageIndex } from './heritage-index.js';

/**
 * Classification of a single resolved call. Every RawCallFact yields exactly
 * one CallResolution carrying one of these kinds.
 *
 *   resolved   — call resolved to a unique target codeRefId (via local
 *                scope, enclosing scope, class member, imported binding,
 *                or unambiguous same-file/global symbol).
 *   unresolved — calleeName not in symbol table, or `this.method()` where
 *                method is not in the enclosing class, or receiverText is
 *                clearly unresolvable.
 *   ambiguous  — multiple candidate symbols match; resolvedTargetCodeRefId
 *                is undefined; candidates[] contains all matching codeRefIds.
 *   external   — call resolves through an ImportResolution whose kind is
 *                'external' (the package was identified as a third-party
 *                dependency in Phase 3 but the underlying symbol's identity
 *                lives outside the project).
 *   builtin    — receiverText is in the BUILTIN_RECEIVERS allowlist
 *                (Array.map, Object.keys, etc.); explicitly NOT a project edge.
 */
export type CallResolutionKind =
  | 'resolved'
  | 'unresolved'
  | 'ambiguous'
  | 'external'
  | 'builtin';

/**
 * Per-call resolution record. Every RawCallFact produces ONE CallResolution.
 * The arity is exact — duplicates are not introduced and calls are not
 * silently dropped.
 */
export interface CallResolution {
  /** Source file containing the call. */
  sourceFile: string;
  /**
   * codeRefId of the enclosing element when the call site can be bound to
   * one, otherwise null. Phase 4 derives this from sourceFile + scopePath
   * (or carries through RawCallFact.sourceElementCandidate when set). Phase
   * 4 emits resolved-call graph edges using this as the source endpoint
   * when kind === 'resolved' AND callerCodeRefId is non-null.
   */
  callerCodeRefId: string | null;
  /** Trailing identifier that names the called function/method. */
  calleeName: string;
  /** Receiver text for member-access calls (`obj` in `obj.method()`), or null for bare calls. */
  receiverText: string | null;
  /** Enclosing scope path verbatim from the RawCallFact. */
  scopePath: string[];
  /** Line number of the call expression. */
  line: number;
  /** Classification. */
  kind: CallResolutionKind;
  /**
   * codeRefId of the resolved target element when kind === 'resolved'.
   * Always undefined for kinds {unresolved, ambiguous, external, builtin}.
   */
  resolvedTargetCodeRefId?: string;
  /**
   * Candidate codeRefIds. Present with >= 2 entries when kind === 'ambiguous'.
   * Also present with EXACTLY 1 entry when kind === 'resolved' AND
   * confidence === 'provisional' (STUB-6CWWHQ): the single-candidate
   * unknown-receiver tier keeps its lone candidate for audit.
   */
  candidates?: string[];
  /**
   * Confidence tier for a resolved call (STUB-6CWWHQ, Phase 2). Absent on a
   * normally-resolved call (implicitly full confidence). Set to 'provisional'
   * ONLY for the single_candidate_unknown_receiver case: an unknown receiver
   * whose method name has EXACTLY one candidate method in the same language
   * family. Guardrail-4 is preserved by LABELING (not silently binding) — the
   * edge is resolved to that one candidate but flagged provisional so
   * consumers can filter by trust tier. Never set when candidates.length >= 2
   * (that stays kind='ambiguous').
   */
  confidence?: 'provisional';
  /**
   * Structured reason for non-resolved kinds. Examples:
   *   'in_allowlist'                       (builtin)
   *   'this_method_not_in_class'           (unresolved)
   *   'receiver_not_in_symbol_table'       (unresolved)
   *   'callee_not_in_symbol_table'         (unresolved)
   *   'external_via_import'                (external)
   */
  reason?: string;
}

/**
 * Single row of the project-wide symbol table. One element / imported
 * binding produces one entry. The table is keyed by `name` and multi-valued
 * because duplicates exist across files (drives ambiguous detection).
 */
export interface SymbolTableEntry {
  /** Canonical codeRefId of the symbol's underlying element. */
  codeRefId: string;
  /**
   * Lookup name. For top-level functions / classes, this is the bare name.
   * For class methods, this is the bare method name (the class qualifier
   * lives on parentScope). For imported bindings, this is the local alias.
   */
  name: string;
  /** Source file the symbol lives in (for imports: the importer file). */
  sourceFile: string;
  /**
   * Scope kind:
   *   'file'     — top-level function / class / const in a file
   *   'function' — nested function inside another function
   *   'class'    — class declaration
   *   'method'   — method belonging to a class
   *   'imported' — local binding produced by a Phase 3 ImportResolution
   */
  scope: 'file' | 'function' | 'class' | 'method' | 'imported';
  /**
   * codeRefId of the enclosing scope when applicable:
   *   methods → codeRefId of the owning class
   *   nested functions → codeRefId of the enclosing element
   *   imported / file → undefined
   */
  parentScope?: string;
  /**
   * Qualifier path used by the extractor for nested elements. For class
   * methods this is `[className]`; for nested functions this is the chain
   * of enclosing names. Used by lookupSymbol for scope-aware matching.
   */
  qualifierPath?: string[];
}

/**
 * Project-wide symbol table. Outer key = symbol name; values = every entry
 * carrying that name across the project (multi-valued for ambiguous
 * detection).
 */
export type SymbolTable = Map<string, SymbolTableEntry[]>;

/**
 * Built-in receiver allowlist. Calls whose receiverText is one of these
 * names classify as kind='builtin' and produce NO project graph edge.
 *
 * This list MAY grow over time. Per DR-PHASE-4-A, each addition must be
 * paired with a unit test asserting calls on the new receiver classify as
 * 'builtin'. Unknown receivers are NEVER assumed builtin — they fall
 * through to the ambiguous-vs-unresolved branch (DR-PHASE-4-B).
 */
export const BUILTIN_RECEIVERS = new Set<string>([
  'Array',
  'Object',
  'Promise',
  'Map',
  'Set',
  'String',
  'Number',
  'Boolean',
  'RegExp',
  'Date',
  'Error',
  'JSON',
  'Math',
  'Reflect',
  'Symbol',
  // STUB-QT400D additions (paired tests in builtin-classification.test.ts):
  // Node/JS globals routinely used as receivers in this ecosystem.
  'console',
  'process',
  'globalThis',
  'Buffer',
  'WeakMap',
  'WeakSet',
  'Proxy',
  'BigInt',
  'Intl',
  'Atomics',
]);

/**
 * JS/Node global functions callable bare (no receiver). A bare call whose
 * callee has NO symbol-table entry (nothing in the project shadows the
 * name) and is in this set classifies kind='builtin' with
 * reason='js_global_callee' (STUB-QT400D). Project symbols always win —
 * the symbol-table lookup runs first, so shadowing is preserved.
 */
export const JS_GLOBAL_CALLEES = new Set<string>([
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'String',
  'Number',
  'Boolean',
  'Symbol',
  'BigInt',
  'Array',
  'Object',
  'Error',
  'TypeError',
  'RangeError',
  'SyntaxError',
  'RegExp',
  'Date',
  'Promise',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Proxy',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'clearImmediate',
  'queueMicrotask',
  'structuredClone',
  'fetch',
  'encodeURIComponent',
  'decodeURIComponent',
  'encodeURI',
  'decodeURI',
  'atob',
  'btoa',
  'require',
]);

/**
 * Python builtin functions (STUB-G5E6EA gap #3). A BARE call to one of these
 * names from a PYTHON source file, with no project symbol shadowing it,
 * classifies kind='builtin' reason='python_builtin_callee' — the analog of
 * JS_GLOBAL_CALLEES. On Primary-Sources this is the dominant
 * `callee_not_in_symbol_table` slice (print 1697, len 959, str 315, set 153,
 * sorted 115, dict 87, list 74, sum 73, isinstance 50, int 50, open 50, ...).
 * The classification is language-guarded at the call site (a JS call to
 * `open`/`set`/`len` is never reclassified). Project symbols always win —
 * the same-language symbol-table lookup runs first, so shadowing is preserved.
 */
export const PYTHON_BUILTIN_CALLEES = new Set<string>([
  'abs', 'aiter', 'all', 'anext', 'any', 'ascii', 'bin', 'bool', 'breakpoint',
  'bytearray', 'bytes', 'callable', 'chr', 'classmethod', 'compile', 'complex',
  'delattr', 'dict', 'dir', 'divmod', 'enumerate', 'eval', 'exec', 'filter',
  'float', 'format', 'frozenset', 'getattr', 'globals', 'hasattr', 'hash',
  'help', 'hex', 'id', 'input', 'int', 'isinstance', 'issubclass', 'iter',
  'len', 'list', 'locals', 'map', 'max', 'memoryview', 'min', 'next', 'object',
  'oct', 'open', 'ord', 'pow', 'print', 'property', 'range', 'repr', 'reversed',
  'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod', 'str', 'sum',
  'super', 'tuple', 'type', 'vars', 'zip',
  // Common builtin exceptions called as constructors.
  'Exception', 'ValueError', 'TypeError', 'KeyError', 'IndexError',
  'RuntimeError', 'StopIteration', 'SystemExit', 'NotImplementedError',
  'FileNotFoundError', 'AttributeError', 'OSError', 'ImportError',
]);

/**
 * Language family of a source file by extension, exposed for the call-site
 * Python guard (gap #3). Kept in sync with the internal `languageFamily`.
 */
function isPythonFile(file: string): boolean {
  const lower = file.toLowerCase();
  return lower.endsWith('.py') || lower.endsWith('.pyi');
}

/**
 * JS prototype-method vocabulary (STUB-XX4JBC, extended by STUB-KWDA8V 3c).
 * Member-call callees that are overwhelmingly likely to be Array/String/
 * Object/Map/Set/Promise/RegExp/Function prototype methods when the receiver
 * is unknown. Used by classifyMethodCall's zero-candidate tail: an unknown
 * receiver in a JS/TS file whose callee is in this set and has ZERO project
 * candidates classifies kind='builtin' reason='js_prototype_member' (operator
 * ruling 2026-07-09, superseding the 2026-06-12 option-A evidence-flag ruling
 * — `arr.push()` is honestly a builtin, not an unresolvable project edge).
 */
export const JS_PROTOTYPE_METHODS = new Set<string>([
  // Array.prototype
  'push', 'pop', 'shift', 'unshift', 'slice', 'splice', 'map', 'filter',
  'reduce', 'reduceRight', 'forEach', 'find', 'findIndex', 'findLast',
  'findLastIndex', 'some', 'every', 'includes', 'indexOf', 'lastIndexOf',
  'join', 'concat', 'flat', 'flatMap', 'fill', 'sort', 'reverse', 'at',
  'keys', 'values', 'entries',
  // String.prototype
  'split', 'replace', 'replaceAll', 'trim', 'trimStart', 'trimEnd',
  'toLowerCase', 'toUpperCase', 'startsWith', 'endsWith', 'charAt',
  'charCodeAt', 'codePointAt', 'padStart', 'padEnd', 'repeat', 'substring',
  'substr', 'match', 'matchAll', 'search', 'localeCompare', 'normalize',
  // Object.prototype + conversions
  'toString', 'valueOf', 'hasOwnProperty', 'toJSON', 'toFixed', 'toPrecision',
  // Map/Set.prototype
  'get', 'set', 'has', 'delete', 'add', 'clear',
  // Promise.prototype
  'then', 'catch', 'finally',
  // RegExp.prototype
  'test', 'exec',
  // Function.prototype
  'bind', 'call', 'apply',
]);

/**
 * Test-framework DSL vocabulary (WO-EDGE-RESOLUTION-IMPROVEMENT-PROGRAM-001
 * P1, operator-delegated ruling A 2026-08-01 — the P3c js_prototype_member
 * shape extended to test DSLs, superseding the narrower GX-002 FU-1 slice).
 *
 * Ambient callees injected as globals by vitest/jest (globals mode) can NEVER
 * be in the project symbol table; a bare call to one of these inside a
 * test-origin file that would otherwise classify 'unresolved' is honestly a
 * framework builtin, not a resolver failure. Both sides are covered:
 *   - TEST_DSL_AMBIENT_CALLEES: bare describe/it/expect/... calls
 *     -> reason='test_dsl_ambient_callee'
 *   - isTestDslReceiver: expect()-rooted matcher chains plus the ambient
 *     vi/jest/expect receiver objects -> reason='test_dsl_matcher_receiver'
 *
 * Guards (the envelope pinned by test-dsl-reclassify.contract.test.ts):
 *   - test-origin files only (TEST_DSL_FILE_RE, kept in lockstep with
 *     graph-builder's TEST_ORIGIN_RE — same pattern, duplicated to keep the
 *     resolver import-free of graph-builder);
 *   - only a would-be 'unresolved' result flips (project symbols always win;
 *     ambiguous results are never flipped);
 *   - plain dotted receivers (obj.a.b — the FU-2 recall frontier) are NOT
 *     matched by the receiver predicate.
 */
export const TEST_DSL_AMBIENT_CALLEES = new Set<string>([
  // vitest + jest shared vocabulary
  'describe', 'it', 'test', 'expect', 'beforeEach', 'afterEach',
  'beforeAll', 'afterAll',
  // vitest extras
  'suite', 'bench', 'onTestFinished', 'onTestFailed',
  // jest focused/skipped variants (ambient in jest globals mode)
  'fit', 'fdescribe', 'xit', 'xdescribe', 'xtest',
]);

// Same pattern as graph-builder's TEST_ORIGIN_RE (STUB-K5YBFN); keep in sync.
const TEST_DSL_FILE_RE = /__tests__|\.test\.|\.spec\./;

function isTestDslFile(file: string): boolean {
  return TEST_DSL_FILE_RE.test(file.split('\\').join('/'));
}

/**
 * Matcher-side receiver predicate: expect()-rooted chains
 * (`expect(x)`, `expect(x).resolves`, `expect.soft(x)`) and the bare ambient
 * framework objects (`vi`, `jest`, `expect`). Deliberately NOT a general
 * dotted-receiver match — `output.byType.fetch` stays unresolved for FU-2.
 */
function isTestDslReceiver(receiverText: string): boolean {
  return receiverText === 'vi'
    || receiverText === 'jest'
    || receiverText === 'expect'
    || receiverText.startsWith('expect(')
    || receiverText.startsWith('expect.');
}

/**
 * Post-classification override applying the test_dsl disposition. Pure and
 * narrow: fires ONLY when the classifier already concluded 'unresolved' (so
 * symbol-table, import, scope-binding, and builtin branches all keep
 * priority), ONLY in test-origin files, and ONLY for the two ruled sides.
 * Classification-only by construction — edge identity is untouched
 * (computeEdgeId excludes resolutionStatus).
 */
function applyTestDslReclassify(
  fact: { sourceFile: string; calleeName: string; receiverText: string | null },
  result: { kind: CallResolutionKind; reason?: string; candidates?: string[] },
): { kind: CallResolutionKind; reason?: string; candidates?: string[] } {
  if (result.kind !== 'unresolved') return result;
  if (!isTestDslFile(fact.sourceFile)) return result;
  if (fact.receiverText === null) {
    if (TEST_DSL_AMBIENT_CALLEES.has(fact.calleeName)) {
      return { kind: 'builtin', reason: 'test_dsl_ambient_callee' };
    }
    return result;
  }
  if (isTestDslReceiver(fact.receiverText)) {
    return { kind: 'builtin', reason: 'test_dsl_matcher_receiver' };
  }
  return result;
}

/**
 * Entry point. Drives pass 1 then pass 2 and returns every CallResolution
 * the RawCallFact set produced. Caller is responsible for writing the
 * result onto state.callResolutions and emitting graph edges for
 * kind === 'resolved'.
 *
 * R-PHASE-4-B / DR-PHASE-4-C: state.importResolutions must be populated
 * (Phase 3 must have run). Throws when null/undefined to enforce
 * cross-phase ordering discipline.
 *
 * AC-09: pass 1 completes fully before pass 2 begins. The implementation
 * MUST NOT interleave the two passes.
 */
export function resolveCalls(state: PipelineState): CallResolution[] {
  if (state.importResolutions === null || state.importResolutions === undefined) {
    throw new Error(
      '[Phase 4 / call-resolver] state.importResolutions is null or undefined. ' +
      'Phase 3 must run first; resolveImports populates state.importResolutions ' +
      'with the cross-phase seam Phase 4 reads. R-PHASE-4-B mitigation.',
    );
  }

  // Pass 1: build the project-wide symbol table AND the field/property index
  // (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 Phase 10, ACG). Both are PURE
  // functions of state.elements and complete fully before Pass 2 (AC-09). The
  // field index widens the unknown-receiver tail's candidate source from
  // method-only symbol-table entries to every method + property definition.
  const symbolTable = buildSymbolTable(state);
  const fieldIndex = buildFieldIndex(state.elements, state.projectPath);

  // Pass 2: resolve every RawCallFact against the symbol table + field index.
  return resolveCallsAgainstTable(state, symbolTable, fieldIndex);
}

/**
 * Pass 1 — index PipelineState.elements + state.importResolutions into a
 * scope-aware Map<name, SymbolTableEntry[]>. Iterates ALL elements before
 * returning (AC-09).
 *
 * Public for testability of the two-pass ordering invariant (test 1.17
 * instruments addEntry/lookupSymbol call ordering).
 */
export function buildSymbolTable(state: PipelineState): SymbolTable {
  const table: SymbolTable = new Map();
  const projectPath = state.projectPath;

  const addEntry = (name: string, entry: SymbolTableEntry): void => {
    const list = table.get(name);
    if (!list) {
      table.set(name, [entry]);
      return;
    }
    // De-dup guard (STUB-1XDRTR): the same element can be offered to addEntry
    // more than once under the same name (e.g. registered on multiple passes),
    // which bloated candidate arrays with the identical codeRefId up to 17×
    // (verified live: scanCurrentElements:908). Skip an entry that is identical
    // to one already present on this name. Identity = the full tuple, so two
    // genuinely-distinct symbols that merely share a codeRefId (never happens
    // today, but cheap to be precise) are still both kept.
    const isDup = list.some(e =>
      e.codeRefId === entry.codeRefId
      && e.scope === entry.scope
      && e.sourceFile === entry.sourceFile
      && e.parentScope === entry.parentScope,
    );
    if (!isDup) list.push(entry);
  };

  for (const elem of state.elements) {
    const codeRefId = elem.codeRefId
      ?? createCodeRefId(elem, projectPath, { includeLine: true });

    if (elem.type === 'method') {
      // Method names are stored as 'ClassName.methodName' by the extractor.
      const dotIdx = elem.name.indexOf('.');
      if (dotIdx > 0) {
        const className = elem.name.slice(0, dotIdx);
        const methodName = elem.name.slice(dotIdx + 1);
        // Bare method name keyed for `this.method()` / `obj.method()` lookup.
        addEntry(methodName, {
          codeRefId,
          name: methodName,
          sourceFile: elem.file,
          scope: 'method',
          qualifierPath: [className],
        });
        // Qualified name keyed for direct ClassName.method lookup.
        addEntry(elem.name, {
          codeRefId,
          name: elem.name,
          sourceFile: elem.file,
          scope: 'method',
          qualifierPath: [className],
        });
      } else {
        addEntry(elem.name, {
          codeRefId,
          name: elem.name,
          sourceFile: elem.file,
          scope: 'method',
        });
      }
      continue;
    }

    if (elem.type === 'class') {
      addEntry(elem.name, {
        codeRefId,
        name: elem.name,
        sourceFile: elem.file,
        scope: 'class',
      });
      continue;
    }

    if (elem.type === 'function' || elem.type === 'component' || elem.type === 'hook') {
      // Nested-function detection: if elem.name contains '.', the AST
      // scanner emitted a qualified name like 'outer.inner'. Bare lookup
      // by inner name + qualified lookup keyed for scope-priority disambiguation.
      const dotIdx = elem.name.indexOf('.');
      if (dotIdx > 0) {
        const innerName = elem.name.slice(elem.name.lastIndexOf('.') + 1);
        const qualifier = elem.name.slice(0, elem.name.lastIndexOf('.'));
        addEntry(innerName, {
          codeRefId,
          name: innerName,
          sourceFile: elem.file,
          scope: 'function',
          qualifierPath: qualifier.split('.'),
        });
        addEntry(elem.name, {
          codeRefId,
          name: elem.name,
          sourceFile: elem.file,
          scope: 'function',
          qualifierPath: qualifier.split('.'),
        });
      } else {
        addEntry(elem.name, {
          codeRefId,
          name: elem.name,
          sourceFile: elem.file,
          scope: 'file',
        });
      }
      continue;
    }

    // constants / interfaces / types / decorators / properties / unknown:
    // index by name so receiverText lookups can detect them when relevant.
    if (elem.type === 'constant' || elem.type === 'interface' || elem.type === 'type') {
      addEntry(elem.name, {
        codeRefId,
        name: elem.name,
        sourceFile: elem.file,
        scope: 'file',
      });
    }
  }

  // Index every resolved Phase 3 ImportResolution.localName as an
  // 'imported' scope entry. This is the cross-phase seam for AC-07.
  for (const ir of state.importResolutions) {
    if (ir.kind !== 'resolved' || !ir.resolvedTargetCodeRefId || !ir.localName) {
      continue;
    }
    addEntry(ir.localName, {
      codeRefId: ir.resolvedTargetCodeRefId,
      name: ir.localName,
      sourceFile: ir.sourceFile,
      scope: 'imported',
    });
  }

  return table;
}

/**
 * Pass 2 — for each RawCallFact, classify into one of the 5 CallResolutionKinds
 * using receiverText, scopePath, the symbol table, and state.importResolutions.
 *
 * Public for testability of the two-pass ordering invariant.
 */
export function resolveCallsAgainstTable(
  state: PipelineState,
  symbolTable: SymbolTable,
  fieldIndex?: FieldIndex,
): CallResolution[] {
  const elementsByFile = indexElementsByFile(state.elements);
  const projectPath = state.projectPath;
  // The field/property index (Phase 10 ACG) is built by resolveCalls in Pass 1
  // and threaded in. When a caller invokes this Pass-2 entry point directly
  // (e.g. the two-pass-ordering tests) without it, build it here from the same
  // state so the unknown-receiver tail resolves identically — Pass 1 is still
  // fully complete (buildSymbolTable was already called) before Pass 2 begins.
  const resolvedFieldIndex = fieldIndex ?? buildFieldIndex(state.elements, projectPath);
  // Per-scope receiver binding map (GX-002 scope-stack pass, evolving the
  // option-1 `const X = new Y()` scan): outer key = callerCodeRefId; inner
  // key = local variable / parameter name; value = {className, kind} where
  // kind is 'new' | 'annotation' | 'param' (DR-GX002-A/B).
  const newInitMap = buildScopeBindingMap(state, elementsByFile, projectPath);
  // Subtype→supertypes index over the Phase-2 heritage facts (P3 heritage-aware
  // method lookup, STUB-9B66EN). Absence=no-data: an estate with no extracted
  // heritage yields an empty index and every walk reports hasHeritage=false.
  const heritageIndex = buildHeritageIndex(state.heritage);
  const resolutions: CallResolution[] = [];

  for (const fact of state.rawCalls) {
    const callerCodeRefId = deriveCallerCodeRefId(fact, elementsByFile, projectPath);

    // Branch 1: builtin receiver allowlist (DR-PHASE-4-A).
    if (isBuiltinReceiver(fact.receiverText)) {
      resolutions.push({
        sourceFile: fact.sourceFile,
        callerCodeRefId,
        calleeName: fact.calleeName,
        receiverText: fact.receiverText,
        scopePath: [...fact.scopePath],
        line: fact.line,
        kind: 'builtin',
        reason: 'in_allowlist',
      });
      continue;
    }

    // Branch 1b (P2): pure dotted chain whose ROOT is allowlisted
    // (`process.stderr.write()`). Same disposition family as Branch 1 with a
    // distinct reason so the flip is separately auditable.
    if (isBuiltinRootReceiver(fact.receiverText)) {
      resolutions.push({
        sourceFile: fact.sourceFile,
        callerCodeRefId,
        calleeName: fact.calleeName,
        receiverText: fact.receiverText,
        scopePath: [...fact.scopePath],
        line: fact.line,
        kind: 'builtin',
        reason: 'builtin_root_receiver',
      });
      continue;
    }

    // Branch 2: member-access calls (this/super/imported/local-typed/unknown).
    if (fact.receiverText !== null) {
      const result = classifyMethodCall(
        fact,
        symbolTable,
        state.importResolutions,
        callerCodeRefId,
        newInitMap,
        resolvedFieldIndex,
        heritageIndex,
      );
      resolutions.push({
        sourceFile: fact.sourceFile,
        callerCodeRefId,
        calleeName: fact.calleeName,
        receiverText: fact.receiverText,
        scopePath: [...fact.scopePath],
        line: fact.line,
        ...applyTestDslReclassify(fact, result),
      });
      continue;
    }

    // Branch 3: bare calls — calleeName lookup by scope priority.
    const result = classifyBareCall(
      fact,
      symbolTable,
      state.importResolutions,
    );
    resolutions.push({
      sourceFile: fact.sourceFile,
      callerCodeRefId,
      calleeName: fact.calleeName,
      receiverText: null,
      scopePath: [...fact.scopePath],
      line: fact.line,
      ...applyTestDslReclassify(fact, result),
    });
  }

  return resolutions;
}

/**
 * O(1) check whether a receiver name is in the built-in allowlist
 * (DR-PHASE-4-A). Returns true if and only if receiverText exactly
 * matches an entry in BUILTIN_RECEIVERS.
 */
export function isBuiltinReceiver(receiverText: string | null): boolean {
  if (receiverText === null) return false;
  return BUILTIN_RECEIVERS.has(receiverText);
}

/** Pure dotted identifier chain with at least two parts (a.b, a.b.c, ...). */
const PURE_DOTTED_CHAIN_RE = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)+$/;

/**
 * WO-EDGE-RESOLUTION-IMPROVEMENT-PROGRAM-001 P2: dotted receivers whose ROOT
 * identifier is in the builtin allowlist (`process.stderr.write()`,
 * `Array.prototype.map.call()`) are honestly builtin member calls — the exact
 * receiverText (`process.stderr`) just never matched the allowlist's exact-set
 * check. Pure dotted chains only: call-expression receivers (`f(x).g`) and
 * cast forms are deliberately NOT matched here.
 */
export function isBuiltinRootReceiver(receiverText: string | null): boolean {
  if (receiverText === null) return false;
  if (PURE_DOTTED_CHAIN_RE.test(receiverText)) {
    return BUILTIN_RECEIVERS.has(receiverText.split('.')[0]);
  }
  // FU-2 lever 1: call-expression chains rooted on a builtin constructor or
  // global — `new Date().toISOString()`, `JSON.parse(raw).map(...)`. Branch 1
  // has already claimed the exact-match case, so this only ever widens.
  const chainRoot = receiverChainRoot(receiverText);
  return chainRoot !== null && BUILTIN_RECEIVERS.has(chainRoot);
}

/**
 * Extract the ROOT identifier a receiver expression is anchored on, for the
 * import-binding disposition branches (P2). Handles exactly two shapes:
 *   - a pure dotted identifier chain: `ts.factory` -> `ts`
 *   - a single-layer cast/paren wrapper around an identifier:
 *     `(ts as any)` / `(ts)` / `(ts!)` -> `ts`, including a trailing dotted
 *     tail: `(ts as any).factory` -> `ts`
 * Anything else (call-expression receivers `f(x)`, `this.`/`super.` forms,
 * literals) returns null — those receivers are NOT import-binding shaped and
 * must keep their existing classification paths.
 */
function receiverRootIdentifier(receiverText: string): string | null {
  const core = receiverText.trim();
  const paren = /^\(\s*([A-Za-z_$][\w$]*)\s*(?:!|as\s+[^()]*)?\s*\)(?:\.[A-Za-z_$][\w$]*)*$/.exec(core);
  if (paren) return paren[1];
  if (/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(core)) {
    return core.split('.')[0];
  }
  return null;
}

/**
 * Root used by the import-binding disposition branches (3.5 / 3.7): the P2
 * shapes first, then the FU-2 lever-1 CHAIN root as a widening fallback.
 *
 * The fallback is SUPPRESSED for matcher-side receivers in test files, because
 * the P1 test_dsl disposition owns them and cannot reclaim them afterwards —
 * applyTestDslReclassify fires only on results still marked 'unresolved'. Left
 * ungated, `expect(x).toBe(y)` roots on `expect`, which is a vitest import, and
 * ~6.5k edges silently migrate from builtin/test_dsl to external, gutting the
 * shipped test_dsl_count. The gate covers ONLY the new fallback: P2's own
 * shapes (bare `vi`, `jest`, dotted chains) keep the exact disposition they
 * have always had.
 */
function receiverDispositionRoot(sourceFile: string, receiver: string): string | null {
  const p2Root = receiverRootIdentifier(receiver);
  if (p2Root !== null) return p2Root;
  if (isTestDslFile(sourceFile) && isTestDslReceiver(receiver)) return null;
  return receiverChainRoot(receiver);
}

/** Roots that are scope constructs, never import bindings — branch 2 owns them. */
const NON_BINDING_ROOTS = new Set<string>(['this', 'super']);

/**
 * Extract the ROOT identifier of a member/call CHAIN receiver (FU-2 lever 1,
 * WO-RESOLVE-62-OF-UNRESOLVED-CALLS-VIA-SCOPE-STACK-001). Sees through call
 * expressions, index access, non-null assertions, optional chaining, `new`,
 * and the embedded CRLF that fluent builders produce:
 *
 *   `z\r\n    .string()\r\n    .optional()`      -> `z`
 *   `createHash('sha256').update(content)`       -> `createHash`
 *   `fs.lstatSync(resolved)`                     -> `fs`
 *   `new Date()`                                 -> `Date`
 *
 * Measured on this repo, receivers of these shapes were 216 of the 547 honest
 * `receiver_not_in_symbol_table` edges (A1 call-expr 173 + A2 new-expr 43).
 * They are not project edges and never could be — `z.string()` is zod — so the
 * root is fed to the EXISTING import-binding branches (3.5 node_builtin, 3.7
 * external) and the builtin allowlist, which already carry the right
 * disposition. No new resolution path, no fabricated edges.
 *
 * Only the TOP LEVEL is inspected: anything inside (), [] or {} is call or
 * index ARGUMENT territory and is skipped wholesale (string literals too), so
 * an argument containing arbitrary syntax never disqualifies the chain. At
 * depth 0 the sole legal tokens are chain punctuation (`.`, `!`, `?.`) and
 * identifier runs that FOLLOW a dot. Anything else — a ternary, `??`, `||`,
 * arithmetic, a stray second identifier — means the root would be a guess
 * rather than a fact, so the function returns null and the receiver keeps its
 * existing classification path (the same conservative contract
 * receiverRootIdentifier has always had for shapes it cannot prove).
 */
function receiverChainRoot(receiverText: string): string | null {
  let core = receiverText.trim();
  const ctor = /^new\s+/.exec(core);
  if (ctor) core = core.slice(ctor[0].length).trim();

  const head = /^[A-Za-z_$][\w$]*/.exec(core);
  if (!head) return null;
  const root = head[0];
  if (NON_BINDING_ROOTS.has(root)) return null;

  let depth = 0;
  let afterDot = false;
  let inIdent = false;
  for (let i = root.length; i < core.length; i++) {
    const ch = core[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i++;
      while (i < core.length) {
        if (core[i] === '\\') { i++; }
        else if (core[i] === quote) break;
        i++;
      }
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') { depth++; continue; }
    if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      if (depth < 0) return null; // closes more than it opens — not self-contained
      continue;
    }
    if (depth > 0) continue;
    if (/\s/.test(ch)) { inIdent = false; continue; }
    if (ch === '.') { afterDot = true; inIdent = false; continue; }
    if (ch === '!') { inIdent = false; continue; }
    if (ch === '?') {
      if (core[i + 1] === '.') { i++; afterDot = true; inIdent = false; continue; }
      return null; // ternary or `??` — the root is not determinable
    }
    if (/[\w$]/.test(ch)) {
      if (!afterDot && !inIdent) return null; // a second bare identifier
      inIdent = true;
      afterDot = false;
      continue;
    }
    return null; // any other top-level operator
  }
  return depth === 0 ? root : null;
}

/**
 * Branch dispatcher for member-access calls (DR-PHASE-4-B + ORCHESTRATOR
 * option-1 guardrails approved 2026-05-03):
 *
 *   1. `this.X()` → look up X in the enclosing class's own (same-file)
 *      methods first, then the declared extends/implements chain (P3
 *      heritage walk, STUB-9B66EN — guardrail 3's "no parent classes"
 *      restriction retired 2026-08-01; own methods still shadow inherited).
 *   2. `super.X()` → resolve against the enclosing class's PARENT chain
 *      via the heritage walk. Miss-with-heritage →
 *      'super_method_not_in_heritage'; no recorded heritage keeps the
 *      original 'super_call_out_of_scope'.
 *   3. `obj.X()` where obj is scope-bound to a class (new/annotation/param)
 *      → resolve X against the class's own methods, then its heritage
 *      chain (P3); a heritage single-match is EXACT (declared chain +
 *      known receiver class). Factory pattern `const obj = makeY()` is
 *      NOT matched and stays ambiguous (guardrail 4).
 *   4. `localName.X()` where localName is a Phase 3 ImportResolution
 *      binding to a resolved target — emit ambiguous (we don't know what
 *      X is on the target without type inference; guardrail 3 forbids
 *      walking interfaces).
 *   5. `obj.X()` where obj is unknown but X exists in the symbol table
 *      with two or more candidates → ambiguous with candidates[].
 *   6. `obj.X()` where obj is unknown and X has exactly one candidate →
 *      ambiguous with candidates=[that one]. Guardrail 4 forbids silent
 *      resolution for unknown receivers.
 *   7. `obj.X()` where obj is unknown and X has zero candidates →
 *      unresolved with reason='receiver_not_in_symbol_table'.
 */
/**
 * De-dup a candidate codeRefId list, preserving first-seen order (STUB-1XDRTR).
 * The symbol-table addEntry guard is the root-cause fix; this is defense-in-depth
 * at every `candidates:` emission so a duplicate can never reach a consumer even
 * if a future code path repopulates the table without going through addEntry.
 * DoD requires `[...new Set(candidates)]` at emission — this centralizes it.
 */
function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

export function classifyMethodCall(
  fact: RawCallFact,
  symbolTable: SymbolTable,
  importResolutions: readonly ImportResolution[],
  callerCodeRefId: string | null,
  newInitMap: ScopeBindingMap,
  fieldIndex: FieldIndex = new Map(),
  heritageIndex: HeritageIndex = new Map(),
): {
  kind: CallResolutionKind;
  resolvedTargetCodeRefId?: string;
  candidates?: string[];
  confidence?: 'provisional';
  reason?: string;
} {
  const receiver = fact.receiverText;
  const callee = fact.calleeName;
  // Ancestor-level own-methods lookup for the P3 heritage walk: identical
  // filter to branch 3's own-methods check (scope 'method', qualifierPath
  // exactly [ancestorName]) so the walk resolves only real method elements.
  const heritageOwnMethods = (ancestorName: string): string[] =>
    (symbolTable.get(`${ancestorName}.${callee}`) ?? [])
      .filter(
        e => e.scope === 'method'
          && e.qualifierPath?.length === 1
          && e.qualifierPath[0] === ancestorName,
      )
      .map(e => e.codeRefId);
  // Set when a 'new' scope binding matched the receiver but the class's own
  // methods missed — the walk continues (ACG may still resolve through the
  // name, e.g. an inherited method own-methods lookup cannot see), and this
  // only sharpens the FINAL unresolved reason when everything else misses.
  let newBindingMissed = false;

  // (1) this.X() — resolve in enclosing class scope.
  if (receiver === 'this') {
    const enclosingClass = findEnclosingClassName(fact.scopePath);
    if (!enclosingClass) {
      return { kind: 'unresolved', reason: 'this_outside_class_scope' };
    }
    const qualifiedName = `${enclosingClass}.${callee}`;
    const entries = symbolTable.get(qualifiedName) ?? [];
    const sameFile = entries.filter(e => e.sourceFile === fact.sourceFile);
    if (sameFile.length === 1) {
      return { kind: 'resolved', resolvedTargetCodeRefId: sameFile[0].codeRefId };
    }
    if (sameFile.length > 1) {
      return { kind: 'ambiguous', candidates: uniqueIds(sameFile.map(e => e.codeRefId)) };
    }
    // P3 heritage walk (STUB-9B66EN): the method is not among the enclosing
    // class's own (same-file) methods — it may be INHERITED. Walk the declared
    // extends/implements chain before giving up.
    const inherited = heritageMethodLookup(enclosingClass, heritageIndex, heritageOwnMethods);
    if (inherited.codeRefIds.length === 1) {
      return {
        kind: 'resolved',
        resolvedTargetCodeRefId: inherited.codeRefIds[0],
        reason: 'heritage_method_lookup',
      };
    }
    if (inherited.codeRefIds.length > 1) {
      return {
        kind: 'ambiguous',
        candidates: uniqueIds(inherited.codeRefIds),
        reason: 'heritage_method_lookup',
      };
    }
    return { kind: 'unresolved', reason: 'this_method_not_in_class' };
  }

  // (2) super.X() — heritage-chain resolution (P3, retiring the guardrail-3
  //     hard-unresolved). The enclosing class's PARENT chain is exactly what
  //     `super` denotes; own methods are deliberately not consulted. A miss
  //     with heritage present is honestly 'super_method_not_in_heritage'; a
  //     class with no recorded heritage keeps the original
  //     'super_call_out_of_scope' (absence=no-data, classification unchanged).
  if (receiver === 'super') {
    const enclosingClass = findEnclosingClassName(fact.scopePath);
    if (enclosingClass) {
      const parentMatch = heritageMethodLookup(enclosingClass, heritageIndex, heritageOwnMethods);
      if (parentMatch.codeRefIds.length === 1) {
        return {
          kind: 'resolved',
          resolvedTargetCodeRefId: parentMatch.codeRefIds[0],
          reason: 'heritage_method_lookup',
        };
      }
      if (parentMatch.codeRefIds.length > 1) {
        return {
          kind: 'ambiguous',
          candidates: uniqueIds(parentMatch.codeRefIds),
          reason: 'heritage_method_lookup',
        };
      }
      if (parentMatch.hasHeritage) {
        return { kind: 'unresolved', reason: 'super_method_not_in_heritage' };
      }
    }
    return { kind: 'unresolved', reason: 'super_call_out_of_scope' };
  }

  // (3) obj.X() where obj is scope-bound to a class (GX-002 scope-stack
  //     pass). Three binding provenances with different miss semantics
  //     (DR-GX002-B):
  //       'new'        — `const obj = new Y()`: a PROVEN instance. Own-
  //                      methods miss returns unresolved (guardrail 3,
  //                      the original option-1 behavior).
  //       'annotation' — `const obj: Y`: declared truth, but Y may be an
  //                      interface or supertype with no method elements.
  //       'param'      — `(obj: Y) =>`: same as 'annotation'.
  //     For annotation/param, an own-methods MISS falls through to the
  //     remaining branches (imports, field-index ACG) so no resolution
  //     the pre-GX-002 resolver produced is ever lost (no-regress guard).
  if (receiver !== null && callerCodeRefId) {
    const perScope = newInitMap.get(callerCodeRefId);
    const binding = perScope?.get(receiver);
    // (3.0) FU-2 lever 2: a QUALIFIED annotation (`node: ts.Node`) binds the
    // namespace ROOT, not a project class. `ts.Node` is the TypeScript compiler
    // API — there is no own-methods lookup to attempt and never will be. Resolve
    // the root against this file's imports and take the same disposition
    // branches 3.5/3.7 would give the bare receiver. A root that is NOT an
    // import falls through untouched: a project namespace object keeps every
    // existing path, so this can only ever move edges that were already headed
    // for the honest tail.
    if (binding && binding.kind === 'qualified') {
      const nsRoot = binding.className;
      const nsBinding = importResolutions.find(
        ir => ir.sourceFile === fact.sourceFile && ir.localName === nsRoot,
      );
      if (nsBinding) {
        // A type annotation's namespace is idiomatically imported with
        // `import type`, which short-circuits classification in Phase 3 — so
        // the origin is read from typeOnlyOrigin when present, and from the
        // value-import fields otherwise. Both spellings must agree, or the
        // dominant real-world case (`import type Parser from 'tree-sitter'`,
        // 89 edges on this repo alone) silently misses.
        const origin = nsBinding.kind === 'typeOnly'
          ? nsBinding.typeOnlyOrigin
          : (nsBinding.kind === 'external' ? (nsBinding.reason ?? 'external') : undefined);
        if (origin === 'node_builtin') {
          return { kind: 'builtin', reason: 'builtin_module_receiver' };
        }
        if (origin === 'python_stdlib') {
          return { kind: 'builtin', reason: 'python_stdlib_receiver' };
        }
        if (origin !== undefined && origin !== 'project') {
          return { kind: 'external', reason: 'external_annotation_receiver' };
        }
      }
    }
    if (binding && binding.kind !== 'qualified') {
      const className = binding.className;
      const qualifiedName = `${className}.${callee}`;
      const entries = symbolTable.get(qualifiedName) ?? [];
      // Guardrail 3: own methods only. Method scope entries' qualifierPath
      // is [className]; reject anything else (no parent-class / interface
      // walking). Multi-file matches with the same class name → ambiguous.
      const ownMethods = entries.filter(
        e => e.scope === 'method'
          && e.qualifierPath?.length === 1
          && e.qualifierPath[0] === className,
      );
      if (ownMethods.length === 1) {
        return binding.kind === 'new'
          ? { kind: 'resolved', resolvedTargetCodeRefId: ownMethods[0].codeRefId }
          : {
              kind: 'resolved',
              resolvedTargetCodeRefId: ownMethods[0].codeRefId,
              reason: binding.kind === 'annotation'
                ? 'scope_binding_annotation'
                : 'scope_binding_param',
            };
      }
      if (ownMethods.length > 1) {
        return { kind: 'ambiguous', candidates: uniqueIds(ownMethods.map(e => e.codeRefId)) };
      }
      // Own-methods miss — try the INHERITED methods first (P3 heritage walk,
      // STUB-9B66EN, retiring guardrail-3's "no parent-class walking"). The
      // bound class is KNOWN and its extends/implements chain is declared
      // truth, so a single ancestor match is an EXACT resolution — a strictly
      // better answer than the bare-name ACG rescue below (which matches by
      // name with the receiver type unproven, hence provisional).
      const chainMatch = heritageMethodLookup(className, heritageIndex, heritageOwnMethods);
      if (chainMatch.codeRefIds.length === 1) {
        return {
          kind: 'resolved',
          resolvedTargetCodeRefId: chainMatch.codeRefIds[0],
          reason: 'heritage_method_lookup',
        };
      }
      if (chainMatch.codeRefIds.length > 1) {
        return {
          kind: 'ambiguous',
          candidates: uniqueIds(chainMatch.codeRefIds),
          reason: 'heritage_method_lookup',
        };
      }
      // Heritage also missed. ALL binding kinds fall through to the remaining
      // branches — measured live (self-scan): hard-failing 'new' misses here
      // moved 645 edges from the ACG tier to unresolved, because own-methods
      // lookup is blind to methods the walk cannot see either (an unextracted
      // or external ancestor) that the field-index resolves by name.
      // A proven-instance miss only sharpens the final unresolved reason
      // (see newBindingMissed at the tail).
      if (binding.kind === 'new') {
        newBindingMissed = true;
      }
    }
  }

  // (3.5) localName.X() where localName is bound to a Node builtin module
  //     import (`import * as fs from 'fs'` → fs.readFile()). The Phase 3
  //     resolution carries reason='node_builtin' (STUB-QT400D); the call
  //     is honestly a builtin-module member call, not a project edge.
  if (receiver !== null) {
    // FU-2 lever 1: the root is consulted alongside the exact receiver text so
    // a builtin-module CALL chain (`fs.lstatSync(p).isDirectory()`,
    // `createHash('sha256').update(x)`) reaches the same disposition its bare
    // form already had. Root extraction is refusal-biased — an expression whose
    // root cannot be proven yields null and matches nothing.
    const builtinRoot = receiverDispositionRoot(fact.sourceFile, receiver);
    const builtinBinding = importResolutions.find(
      ir => ir.sourceFile === fact.sourceFile
        && (ir.localName === receiver || (builtinRoot !== null && ir.localName === builtinRoot))
        && ir.reason === 'node_builtin',
    );
    if (builtinBinding) {
      return { kind: 'builtin', reason: 'builtin_module_receiver' };
    }
  }

  // (3.6) localName.X() where localName is bound to a Python stdlib module
  //     import (`import json` → json.dumps(), `import sys` → sys.exit()).
  //     The Phase 3 resolution carries reason='python_stdlib' (STUB-G5E6EA
  //     gap #3). On Primary-Sources `json`/`sys`/`re` receivers alone were
  //     ~944 receiver_not_in_symbol_table edges. The receiver token may be a
  //     bare module name (`json`) or a dotted root (`sys.path` → root `sys`).
  if (receiver !== null) {
    const receiverRoot = receiver.split('.')[0];
    const pyStdlibBinding = importResolutions.find(
      ir => ir.sourceFile === fact.sourceFile
        && ir.reason === 'python_stdlib'
        && (ir.localName === receiver
          || ir.localName === receiverRoot
          || ir.originSpecifier === receiver
          || ir.originSpecifier === receiverRoot
          || ir.originSpecifier.split('.')[0] === receiverRoot),
    );
    if (pyStdlibBinding) {
      return { kind: 'builtin', reason: 'python_stdlib_receiver' };
    }
  }

  // (3.7) localName.X() where localName (the receiver's root identifier,
  //     after unwrapping single-layer cast/paren forms like `(ts as any)` and
  //     dotted tails like `ts.factory`) is bound to an EXTERNAL package import
  //     (WO-EDGE-RESOLUTION-IMPROVEMENT-PROGRAM-001 P2). The call targets a
  //     third-party package member — honestly `external`, not an unresolvable
  //     project edge. node_builtin / python_stdlib bindings are excluded so
  //     branches 3.5/3.6 keep their canonical `builtin` disposition. Post-P1
  //     this class was 726 bare + 377 cast-wrapped receiver_not_in_symbol_table
  //     edges on this repo (`ts.*` alone dominating).
  if (receiver !== null) {
    const externalRoot = receiverDispositionRoot(fact.sourceFile, receiver);
    if (externalRoot !== null) {
      const externalBinding = importResolutions.find(
        ir => ir.sourceFile === fact.sourceFile
          && ir.kind === 'external'
          && ir.reason !== 'node_builtin'
          && ir.reason !== 'python_stdlib'
          && (ir.localName === receiver || ir.localName === externalRoot),
      );
      if (externalBinding) {
        return { kind: 'external', reason: 'external_module_receiver' };
      }
    }
  }

  // (4) localName.X() bound by Phase 3 ImportResolution. We know the
  //     receiver is an imported namespace / default, but we don't know
  //     what X is on it without walking module exports. Emit ambiguous
  //     so consumers know there's a receiver but the method target is
  //     undetermined.
  if (receiver !== null) {
    const importBinding = importResolutions.find(
      ir => ir.sourceFile === fact.sourceFile
        && ir.localName === receiver
        && ir.kind === 'resolved',
    );
    if (importBinding) {
      const candidates = uniqueIds((symbolTable.get(callee) ?? [])
        .filter(e => e.scope === 'method' && sameLanguageFamily(fact.sourceFile, e.sourceFile))
        .map(e => e.codeRefId));
      if (candidates.length >= 2) {
        return { kind: 'ambiguous', candidates };
      }
      if (candidates.length === 1) {
        return { kind: 'ambiguous', candidates };
      }
      return { kind: 'unresolved', reason: 'imported_receiver_method_unknown' };
    }
  }

  // (5)/(6)/(7) Unknown receiver — the honest-project tail. FIELD-BASED (ACG)
  // RESOLUTION (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 Phase 10, Feldthaus
  // Approximate Call Graph). The builtin / prototype / node-builtin / python-
  // stdlib / imported-namespace branches above have already won FIRST, so this
  // consult only ever sees the genuinely-unknown project tail. Consult the
  // field/property-definition index — which covers BOTH `type:'method'` AND
  // `type:'property'` definitions (the property coverage buildSymbolTable's
  // method-only lookup never had) — for everything in the project that DEFINES
  // this bare property name, filtered to the same language family (STUB-M3GE4S,
  // enforced inside lookupField).
  //
  // GUARDRAIL 4 PRESERVED BY LABELING, NEVER SILENTLY PROMOTING: an ACG edge is
  // approximate by construction (the receiver type was never proven), so it is
  // emitted at a DISTINCT reason ('field_based_acg') that maps to a NON-exact
  // confidence tier. A MULTI-candidate hit stays kind='ambiguous' with the full
  // set; a SINGLE-candidate hit resolves-provisional exactly like the STUB-6CWWHQ
  // single_candidate_unknown_receiver tier (kind='resolved' + confidence=
  // 'provisional'), differing only in the reason string so it is separately
  // filterable via --min-confidence. Both endpoints exist (candidates are real
  // element codeRefIds — no fabricated nodes).
  const fieldCandidates = uniqueIds(
    lookupField(fieldIndex, callee, fact.sourceFile).map(d => d.codeRefId),
  );
  if (fieldCandidates.length >= 2) {
    return {
      kind: 'ambiguous',
      candidates: fieldCandidates,
      reason: 'field_based_acg',
    };
  }
  if (fieldCandidates.length === 1) {
    // Feldthaus single-candidate approximation. RESOLVE to the lone definition
    // but LABEL it provisional — guardrail-4 is honored (a MULTI-candidate
    // unknown receiver above stays ambiguous), and the candidate is retained for
    // audit. A single-element set is STILL an approximation (the receiver was
    // never proven to be that type); the provisional tier + field_based_acg
    // reason say exactly that. This is the surface that moves the 64%
    // receiver_not_in_symbol_table slice into a labeled, filterable ACG tier.
    return {
      kind: 'resolved',
      resolvedTargetCodeRefId: fieldCandidates[0],
      candidates: fieldCandidates,
      confidence: 'provisional',
      reason: 'field_based_acg',
    };
  }
  // Zero project candidates. STUB-KWDA8V Phase 3, sub-stage 3c (operator ruling
  // 2026-07-09, supersedes the 2026-06-12 option-A evidence-flag ruling of
  // STUB-XX4JBC): an unknown receiver whose callee is JS prototype vocabulary
  // (push/map/split/add/...) in a JS/TS file, with ZERO project methods of that
  // name, is honestly a language builtin — NOT an unresolvable project edge.
  // `str.split()`, `arr.push()` will never resolve to a project target. Classify
  // kind='builtin' so it leaves the receiver_not_in_symbol_table population and
  // stops inflating the unresolved count. Guardrails preserved:
  //   - fires ONLY here, the zero-candidate tail: a project method genuinely
  //     named `map`/`filter`/... already resolved (known receiver) or went
  //     ambiguous/provisional (candidates >= 1) in the branches above, so no
  //     real project edge is ever swept to builtin;
  //   - LANGUAGE-GUARDED to js-ts (mirrors the python_stdlib / node_builtin
  //     precedent) so a Python `.split()` / `.get()` on an unknown receiver is
  //     never JS-reclassified;
  //   - `builtin` emits NO graph edge — identical to unresolved on the graph,
  //     so the ruling's original concern (never fabricate a project edge) holds.
  // This supersedes graph-builder's probableBuiltinMember evidence flag, which
  // is removed (the classification now carries the meaning).
  if (
    JS_PROTOTYPE_METHODS.has(callee)
    && languageFamily(fact.sourceFile) === 'js-ts'
  ) {
    return { kind: 'builtin', reason: 'js_prototype_member' };
  }
  // GX-002: when a proven 'new' binding matched the receiver but every
  // resolution avenue missed, the precise fact is "the bound class (and the
  // project) has no such member" — not "the receiver is unknown".
  if (newBindingMissed) {
    return { kind: 'unresolved', reason: 'method_not_in_class_own_methods' };
  }
  return { kind: 'unresolved', reason: 'receiver_not_in_symbol_table' };
}

/**
 * Bare-call classifier (no receiver). Lookup priority per roadmap.md
 * line 289-296: local → enclosing → class → imported → same-file →
 * global if unambiguous.
 *
 * Phase 4 collapses these via the symbol table: the table already has
 * 'imported' entries scoped to importer file. Strategy:
 *   1. Same-file matches first. If exactly one → resolved. If 2+ →
 *      ambiguous within file.
 *   2. If no same-file match but one or more 'imported' entries scoped
 *      to this file → use the imported entry.
 *   3. Otherwise look across the whole project. Exactly one match →
 *      resolved (global if unambiguous). 2+ → ambiguous. Zero →
 *      unresolved.
 */
function classifyBareCall(
  fact: RawCallFact,
  symbolTable: SymbolTable,
  importResolutions: readonly ImportResolution[],
): {
  kind: CallResolutionKind;
  resolvedTargetCodeRefId?: string;
  candidates?: string[];
  reason?: string;
} {
  void importResolutions;
  const callee = fact.calleeName;
  // STUB-M3GE4S: only consider symbols in the same language family as the
  // call site. A Python set() must never resolve to a TypeScript `set`.
  const entries = (symbolTable.get(callee) ?? []).filter(e =>
    sameLanguageFamily(fact.sourceFile, e.sourceFile),
  );
  if (entries.length === 0) {
    // Nothing in the project shadows the name — JS/Node globals classify
    // builtin (STUB-QT400D). Symbol-table entries always take precedence.
    if (JS_GLOBAL_CALLEES.has(callee)) {
      return { kind: 'builtin', reason: 'js_global_callee' };
    }
    // Python builtins, guarded to Python source (STUB-G5E6EA gap #3).
    if (isPythonFile(fact.sourceFile) && PYTHON_BUILTIN_CALLEES.has(callee)) {
      return { kind: 'builtin', reason: 'python_builtin_callee' };
    }
    return { kind: 'unresolved', reason: 'callee_not_in_symbol_table' };
  }

  // 1) Same-file priority. Class methods are excluded — bare calls
  //    cannot target a class method without a receiver.
  const sameFile = entries.filter(
    e => e.sourceFile === fact.sourceFile && e.scope !== 'method',
  );
  // Within the same file, prefer scope match: nested function calls
  // should pick the entry whose qualifierPath aligns with fact.scopePath.
  if (sameFile.length > 1) {
    const scopeMatched = sameFile.filter(e =>
      qualifierPathMatchesScope(e.qualifierPath, fact.scopePath),
    );
    if (scopeMatched.length === 1) {
      return { kind: 'resolved', resolvedTargetCodeRefId: scopeMatched[0].codeRefId };
    }
    if (scopeMatched.length > 1) {
      return {
        kind: 'ambiguous',
        candidates: uniqueIds(scopeMatched.map(e => e.codeRefId)),
      };
    }
    return { kind: 'ambiguous', candidates: uniqueIds(sameFile.map(e => e.codeRefId)) };
  }
  if (sameFile.length === 1) {
    return { kind: 'resolved', resolvedTargetCodeRefId: sameFile[0].codeRefId };
  }

  // 2) Imported entries scoped to this file.
  const imported = entries.filter(
    e => e.scope === 'imported' && e.sourceFile === fact.sourceFile,
  );
  if (imported.length === 1) {
    return { kind: 'resolved', resolvedTargetCodeRefId: imported[0].codeRefId };
  }
  if (imported.length > 1) {
    return { kind: 'ambiguous', candidates: uniqueIds(imported.map(e => e.codeRefId)) };
  }

  // 3) Project-wide. Class methods excluded.
  const projectWide = entries.filter(e => e.scope !== 'method');
  if (projectWide.length === 1) {
    return { kind: 'resolved', resolvedTargetCodeRefId: projectWide[0].codeRefId };
  }
  if (projectWide.length >= 2) {
    return { kind: 'ambiguous', candidates: uniqueIds(projectWide.map(e => e.codeRefId)) };
  }
  // Only method-scope entries matched — a bare call cannot target a class
  // method, so a JS/Node global of the same name is the honest disposition.
  if (JS_GLOBAL_CALLEES.has(callee)) {
    return { kind: 'builtin', reason: 'js_global_callee' };
  }
  if (isPythonFile(fact.sourceFile) && PYTHON_BUILTIN_CALLEES.has(callee)) {
    return { kind: 'builtin', reason: 'python_builtin_callee' };
  }
  return { kind: 'unresolved', reason: 'callee_not_in_symbol_table' };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Language family of a source file, by extension. A call site only resolves
 * to a symbol-table entry in the SAME family (STUB-M3GE4S): the lived bug
 * was a Python `set(...)` call resolving project-wide to a TypeScript
 * element named `set`, producing a resolved call edge whose Python-file
 * source node never existed (GI-2 failure, 220 errors on Primary-Sources).
 * JS and TS share a family (TS imports JS and vice versa); every other
 * language is its own family.
 */
function languageFamily(file: string): string {
  const lower = file.toLowerCase();
  const dot = lower.lastIndexOf('.');
  const ext = dot >= 0 ? lower.slice(dot + 1) : '';
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
    case 'mts':
    case 'cts':
      return 'js-ts';
    default:
      return ext || 'unknown';
  }
}

/**
 * True when a call site in `callerFile` may legitimately resolve to a symbol
 * defined in `targetFile`. Cross-language matches are rejected (STUB-M3GE4S).
 */
function sameLanguageFamily(callerFile: string, targetFile: string): boolean {
  return languageFamily(callerFile) === languageFamily(targetFile);
}

function indexElementsByFile(elements: ElementData[]): Map<string, ElementData[]> {
  const map = new Map<string, ElementData[]>();
  for (const elem of elements) {
    const list = map.get(elem.file);
    if (list) list.push(elem);
    else map.set(elem.file, [elem]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.line - b.line);
  }
  return map;
}

function findEnclosingClassName(scopePath: string[]): string | null {
  // The extractor pushes class names verbatim (capitalized identifier).
  // Walk from the outermost scope inward and pick the first capitalized
  // segment. Method-name segments may or may not be capitalized; relying
  // on capitalization alone is heuristic, but the structural shape here
  // (extractor emits [ClassName, methodName, ...]) makes the FIRST
  // segment the class when scopePath length >= 2.
  if (scopePath.length === 0) return null;
  const first = scopePath[0];
  // Heuristic: classes are PascalCase. If first segment starts with
  // uppercase letter, treat as class name.
  if (first.length > 0 && first[0] === first[0].toUpperCase() && first[0] !== first[0].toLowerCase()) {
    return first;
  }
  return null;
}

function qualifierPathMatchesScope(
  qualifierPath: string[] | undefined,
  scopePath: string[],
): boolean {
  if (!qualifierPath || qualifierPath.length === 0) return scopePath.length === 0;
  if (qualifierPath.length > scopePath.length) return false;
  for (let i = 0; i < qualifierPath.length; i++) {
    if (qualifierPath[i] !== scopePath[i]) return false;
  }
  return true;
}

/**
 * The per-scope binding pass moved to src/pipeline/scope-binding.ts
 * (GX-002): buildScopeBindingMap subsumes the former private
 * buildNewInitializerMap/NewInitializerMap (`const x = new Y()` scan),
 * adding method-body scope frames, let/var, TS type annotations, and
 * typed parameters. classifyMethodCall branch 3 consumes it above.
 */

/**
 * Internal — derive callerCodeRefId from a RawCallFact when
 * sourceElementCandidate is null. Phase 2 currently emits null for every
 * call (the extractor doesn't bind call sites to enclosing element ids).
 * Phase 4 walks state.elements for the same sourceFile and finds the
 * enclosing element by scopePath.
 */
export function deriveCallerCodeRefId(
  fact: RawCallFact,
  elementsByFile: Map<string, ElementData[]>,
  projectPath: string,
): string | null {
  if (fact.sourceElementCandidate) return fact.sourceElementCandidate;
  const elements = elementsByFile.get(fact.sourceFile);
  if (!elements || elements.length === 0) return null;

  // When scopePath is empty the call is at module top level — no caller.
  if (fact.scopePath.length === 0) return null;

  // The most-deeply-nested name in scopePath identifies the enclosing
  // function/method. For class methods the extractor emits scopePath
  // [ClassName, methodName]; the matching element name is `ClassName.methodName`.
  const lastScope = fact.scopePath[fact.scopePath.length - 1];
  const qualifiedName = fact.scopePath.length >= 2
    ? `${fact.scopePath[fact.scopePath.length - 2]}.${lastScope}`
    : null;

  let bestMatch: ElementData | undefined;
  for (const elem of elements) {
    if (qualifiedName && elem.name === qualifiedName) {
      bestMatch = elem;
      break;
    }
    if (elem.name === lastScope && (elem.type === 'function' || elem.type === 'method')) {
      // Keep first match; class-qualified search above takes precedence.
      bestMatch = bestMatch ?? elem;
    }
  }

  if (!bestMatch) return null;
  return bestMatch.codeRefId ?? createCodeRefId(bestMatch, projectPath, { includeLine: true });
}

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
   * Candidate codeRefIds when kind === 'ambiguous'. Always at least 2
   * entries when present.
   */
  candidates?: string[];
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
]);

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

  // Pass 1: build the project-wide symbol table.
  const symbolTable = buildSymbolTable(state);

  // Pass 2: resolve every RawCallFact against the symbol table.
  return resolveCallsAgainstTable(state, symbolTable);
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
  // Implementation lands in task 1.6 (after structural_foundation_review).
  // Skeleton present so types compile and orchestrator wiring (task 1.5)
  // can land before the checkpoint halt.
  void state;
  return new Map();
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
): CallResolution[] {
  // Implementation lands in task 1.7 (after structural_foundation_review).
  void state;
  void symbolTable;
  return [];
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

/**
 * Branch dispatcher for member-access calls (DR-PHASE-4-B). Distinguishes
 * `this.method()`, imported-binding member calls, super.method(), and
 * unknown-receiver calls. Returns the CallResolutionKind plus any auxiliary
 * fields (resolvedTargetCodeRefId / candidates / reason).
 *
 * Implementation lands in task 1.8.
 */
export function classifyMethodCall(
  fact: RawCallFact,
  symbolTable: SymbolTable,
  importResolutions: readonly ImportResolution[],
  callerCodeRefId: string | null,
): {
  kind: CallResolutionKind;
  resolvedTargetCodeRefId?: string;
  candidates?: string[];
  reason?: string;
} {
  void fact;
  void symbolTable;
  void importResolutions;
  void callerCodeRefId;
  return { kind: 'unresolved', reason: 'classify_method_call_not_implemented' };
}

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

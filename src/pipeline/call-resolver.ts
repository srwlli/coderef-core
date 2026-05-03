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
  const table: SymbolTable = new Map();
  const projectPath = state.projectPath;

  const addEntry = (name: string, entry: SymbolTableEntry): void => {
    const list = table.get(name);
    if (list) list.push(entry);
    else table.set(name, [entry]);
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
): CallResolution[] {
  const elementsByFile = indexElementsByFile(state.elements);
  const projectPath = state.projectPath;
  // Per-scope `const X = new Y()` map (option 1 + guardrails 1+2): one
  // fresh map per enclosing element. Outer key = callerCodeRefId; inner
  // key = local variable name; value = class name. Built lazily per file
  // and shared across calls inside the same enclosing element.
  const newInitMap = buildNewInitializerMap(state, elementsByFile, projectPath);
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

    // Branch 2: member-access calls (this/super/imported/local-typed/unknown).
    if (fact.receiverText !== null) {
      const result = classifyMethodCall(
        fact,
        symbolTable,
        state.importResolutions,
        callerCodeRefId,
        newInitMap,
      );
      resolutions.push({
        sourceFile: fact.sourceFile,
        callerCodeRefId,
        calleeName: fact.calleeName,
        receiverText: fact.receiverText,
        scopePath: [...fact.scopePath],
        line: fact.line,
        ...result,
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
      ...result,
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

/**
 * Branch dispatcher for member-access calls (DR-PHASE-4-B + ORCHESTRATOR
 * option-1 guardrails approved 2026-05-03):
 *
 *   1. `this.X()` → look up X in the enclosing class's own methods only
 *      (guardrail 3: own methods, no parent classes, no interfaces).
 *   2. `super.X()` → unresolved (parent-class hierarchy traversal is out
 *      of Phase 4 scope per guardrail 3).
 *   3. `obj.X()` where obj is bound by `const obj = new Y()` in the
 *      enclosing scope (guardrail 1: literal `const x = new Y()` pattern
 *      only, no factories) → resolve X against Y's own methods only.
 *      Factory pattern `const obj = makeY()` is NOT matched and stays
 *      ambiguous (guardrail 4).
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
export function classifyMethodCall(
  fact: RawCallFact,
  symbolTable: SymbolTable,
  importResolutions: readonly ImportResolution[],
  callerCodeRefId: string | null,
  newInitMap: NewInitializerMap,
): {
  kind: CallResolutionKind;
  resolvedTargetCodeRefId?: string;
  candidates?: string[];
  reason?: string;
} {
  const receiver = fact.receiverText;
  const callee = fact.calleeName;

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
      return { kind: 'ambiguous', candidates: sameFile.map(e => e.codeRefId) };
    }
    return { kind: 'unresolved', reason: 'this_method_not_in_class' };
  }

  // (2) super.X() — out of scope per guardrail 3.
  if (receiver === 'super') {
    return { kind: 'unresolved', reason: 'super_call_out_of_scope' };
  }

  // (3) obj.X() where obj = new Y() (literal pattern, option-1 narrow scan).
  if (receiver !== null && callerCodeRefId) {
    const perScope = newInitMap.get(callerCodeRefId);
    const className = perScope?.get(receiver);
    if (className) {
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
        return { kind: 'resolved', resolvedTargetCodeRefId: ownMethods[0].codeRefId };
      }
      if (ownMethods.length > 1) {
        return { kind: 'ambiguous', candidates: ownMethods.map(e => e.codeRefId) };
      }
      // class is known but method not in own methods → unresolved.
      return {
        kind: 'unresolved',
        reason: 'method_not_in_class_own_methods',
      };
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
      const candidates = (symbolTable.get(callee) ?? [])
        .filter(e => e.scope === 'method')
        .map(e => e.codeRefId);
      if (candidates.length >= 2) {
        return { kind: 'ambiguous', candidates };
      }
      if (candidates.length === 1) {
        return { kind: 'ambiguous', candidates };
      }
      return { kind: 'unresolved', reason: 'imported_receiver_method_unknown' };
    }
  }

  // (5)/(6)/(7) Unknown receiver — ambiguous-or-unresolved, never resolved
  // (DR-PHASE-4-B + guardrail 4).
  const calleeEntries = (symbolTable.get(callee) ?? [])
    .filter(e => e.scope === 'method');
  if (calleeEntries.length >= 2) {
    return {
      kind: 'ambiguous',
      candidates: calleeEntries.map(e => e.codeRefId),
    };
  }
  if (calleeEntries.length === 1) {
    return {
      kind: 'ambiguous',
      candidates: calleeEntries.map(e => e.codeRefId),
      reason: 'single_candidate_unknown_receiver',
    };
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
  const entries = symbolTable.get(callee) ?? [];
  if (entries.length === 0) {
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
        candidates: scopeMatched.map(e => e.codeRefId),
      };
    }
    return { kind: 'ambiguous', candidates: sameFile.map(e => e.codeRefId) };
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
    return { kind: 'ambiguous', candidates: imported.map(e => e.codeRefId) };
  }

  // 3) Project-wide. Class methods excluded.
  const projectWide = entries.filter(e => e.scope !== 'method');
  if (projectWide.length === 1) {
    return { kind: 'resolved', resolvedTargetCodeRefId: projectWide[0].codeRefId };
  }
  if (projectWide.length >= 2) {
    return { kind: 'ambiguous', candidates: projectWide.map(e => e.codeRefId) };
  }
  return { kind: 'unresolved', reason: 'callee_not_in_symbol_table' };
}

// ============================================================================
// Helpers
// ============================================================================

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
 * Per-scope variable→class map produced by the narrow `const x = new Y()`
 * scan (option 1 + guardrails 1+2). Outer key = callerCodeRefId; inner
 * map = { localVarName → className }. Each enclosing element gets a
 * fresh inner map (guardrail 2: no carry across scopes).
 */
type NewInitializerMap = Map<string, Map<string, string>>;

const NEW_INIT_REGEX = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+([A-Z][\w$]*)\s*\(/g;

/**
 * Build the per-scope `const X = new Y()` map by brace-tracking the
 * source. For each file:
 *   - walk character-by-character maintaining a brace nesting depth
 *     and a stack of (kind, name, openDepth)
 *   - when we see `function NAME(` or `class NAME {` or `NAME(...) {`
 *     within a class body, we push that scope on stack open-brace
 *   - when depth pops below the scope's openDepth, pop it off
 *   - when we match `const X = new Y(`, attribute it to the TOP of
 *     stack at that moment
 *
 * The stack-top scope name is mapped to a fnElement codeRefId via
 * the elementsByFile index. When no element matches (e.g., arrow-fn
 * scope), the binding attributes to the nearest enclosing function-
 * or method-element scope (per constraint 4: arrow scopes aren't
 * qualified, so their `const X = new Y()` flows up to the fn).
 *
 * This is a deliberately small parser — strings, comments, and
 * regex literals are skipped via a pragmatic state machine. Edge
 * cases the parser may miss (template literals with `${` brace
 * confusion) gracefully degrade to no-binding rather than wrong
 * binding.
 */
function buildNewInitializerMap(
  state: PipelineState,
  elementsByFile: Map<string, ElementData[]>,
  projectPath: string,
): NewInitializerMap {
  const map: NewInitializerMap = new Map();

  for (const [file, elements] of elementsByFile) {
    const source = state.sources.get(file);
    if (!source) continue;

    const fnElements = elements.filter(
      e => e.type === 'function' || e.type === 'method' || e.type === 'component' || e.type === 'hook',
    );
    if (fnElements.length === 0) continue;
    const elemByName = new Map<string, ElementData>();
    for (const elem of fnElements) {
      // Last-write-wins on bare-name collision (multiple top-level
      // `function helper`s would already be caught by ambiguous logic).
      const bareName = elem.name.includes('.')
        ? elem.name.slice(elem.name.lastIndexOf('.') + 1)
        : elem.name;
      elemByName.set(elem.name, elem);
      // Also index by bare name so class-method `Class.method` and
      // nested fn `outer.inner` lookup both work.
      if (!elemByName.has(bareName)) elemByName.set(bareName, elem);
    }

    // scopeStack: list of { qualifiedName, openDepth }. qualifiedName is
    // the dotted name as built by entering nested functions and classes.
    type ScopeFrame = { name: string; depth: number; classCtx: string | null };
    const scopeStack: ScopeFrame[] = [];
    let depth = 0;
    let i = 0;
    const len = source.length;

    // Helper: get current enclosing-fn codeRefId from scopeStack, or
    // null if we're at module scope (no fn context).
    const currentScopeCodeRefId = (): string | null => {
      for (let s = scopeStack.length - 1; s >= 0; s--) {
        const frame = scopeStack[s];
        const elem = elemByName.get(frame.name);
        if (elem) {
          return elem.codeRefId
            ?? createCodeRefId(elem, projectPath, { includeLine: true });
        }
      }
      return null;
    };

    while (i < len) {
      const ch = source[i];

      // Skip line comments.
      if (ch === '/' && source[i + 1] === '/') {
        while (i < len && source[i] !== '\n') i++;
        continue;
      }
      // Skip block comments.
      if (ch === '/' && source[i + 1] === '*') {
        i += 2;
        while (i < len - 1 && !(source[i] === '*' && source[i + 1] === '/')) i++;
        i += 2;
        continue;
      }
      // Skip string literals.
      if (ch === '"' || ch === "'" || ch === '`') {
        const quote = ch;
        i++;
        while (i < len) {
          if (source[i] === '\\') { i += 2; continue; }
          if (source[i] === quote) { i++; break; }
          // For backtick, ${...} can contain code — but tracking
          // template substitutions accurately is beyond this small
          // parser. Our worst case: a `${` opens a brace we count
          // and then closes — net-zero, but the matching `}` ends
          // the substitution before the closing backtick. Most
          // real code doesn't put `const X = new Y()` inside a
          // template literal, so we skip the substitution naively.
          i++;
        }
        continue;
      }

      // Track braces.
      if (ch === '{') {
        depth++;
        i++;
        continue;
      }
      if (ch === '}') {
        depth--;
        // Pop any scope frames whose openDepth > current depth.
        while (scopeStack.length > 0 && scopeStack[scopeStack.length - 1].depth > depth) {
          scopeStack.pop();
        }
        i++;
        continue;
      }

      // Detect `function NAME(` (function declaration; NOT preceded by
      // `=` so `const X = function()` is excluded per constraint 4).
      // Also push class scope on `class NAME` for nested-name awareness.
      if (
        source.startsWith('function', i)
        && (i === 0 || /\W/.test(source[i - 1]))
        && /\W/.test(source[i + 'function'.length] ?? ' ')
      ) {
        // Check this is NOT a function expression (preceded by = or ( or , or :).
        let j = i - 1;
        while (j >= 0 && /\s/.test(source[j])) j--;
        const prevCh = j >= 0 ? source[j] : '';
        const isExpression = prevCh === '=' || prevCh === '(' || prevCh === ',' || prevCh === ':';
        if (!isExpression) {
          // Read function name.
          let k = i + 'function'.length;
          while (k < len && /\s/.test(source[k])) k++;
          // Skip `*` for generators.
          if (source[k] === '*') { k++; while (k < len && /\s/.test(source[k])) k++; }
          const nameMatch = /^[A-Za-z_$][\w$]*/.exec(source.slice(k));
          if (nameMatch) {
            const fnName = nameMatch[0];
            const enclosingFn = scopeStack.length > 0
              ? scopeStack[scopeStack.length - 1].name
              : null;
            const qualifiedName = enclosingFn ? `${enclosingFn}.${fnName}` : fnName;
            // The opening `{` will be counted shortly. Push frame
            // with depth = currentDepth + 1 so the matching `}`
            // pops it.
            scopeStack.push({
              name: qualifiedName,
              depth: depth + 1,
              classCtx: null,
            });
            i = k + nameMatch[0].length;
            continue;
          }
        }
      }

      // Detect `class NAME` declaration.
      if (
        source.startsWith('class', i)
        && (i === 0 || /\W/.test(source[i - 1]))
        && /\s/.test(source[i + 'class'.length] ?? ' ')
      ) {
        let k = i + 'class'.length;
        while (k < len && /\s/.test(source[k])) k++;
        const nameMatch = /^[A-Za-z_$][\w$]*/.exec(source.slice(k));
        if (nameMatch) {
          const className = nameMatch[0];
          scopeStack.push({
            name: className,
            depth: depth + 1,
            classCtx: className,
          });
          i = k + nameMatch[0].length;
          continue;
        }
      }

      // Detect `const X = new Y(`.
      // GUARDRAIL 1: literal const + new Y( only.
      // We must be inside a fn scope (current scope codeRefId resolves
      // to a fn element). At module scope it's not a useful binding.
      if (
        source.startsWith('const', i)
        && (i === 0 || /\W/.test(source[i - 1]))
        && /\s/.test(source[i + 'const'.length] ?? ' ')
      ) {
        const sliceStart = i;
        const remainder = source.slice(i, i + 200);
        const m = /^const\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+([A-Z][\w$]*)\s*\(/.exec(remainder);
        if (m) {
          const localName = m[1];
          const className = m[2];
          const codeRefId = currentScopeCodeRefId();
          if (codeRefId) {
            let perScope = map.get(codeRefId);
            if (!perScope) {
              perScope = new Map();
              map.set(codeRefId, perScope);
            }
            // GUARDRAIL 2: first binding wins per scope.
            if (!perScope.has(localName)) {
              perScope.set(localName, className);
            }
          }
          i = sliceStart + m[0].length;
          continue;
        }
      }

      i++;
    }
  }

  return map;
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

/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability field-index-acg-resolution
 * @exports FieldDef, FieldIndex, buildFieldIndex, lookupField
 * @used_by src/pipeline/call-resolver.ts
 */

/**
 * field-index — a PURE project-wide field/property-definition index that powers
 * the Feldthaus Approximate Call Graph (ACG) resolution of method calls on
 * UNKNOWN receivers (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 Phase 10).
 *
 * The single largest measured precision hole in the graph is
 * `classifyMethodCall`'s unknown-receiver zero-candidate tail:
 * `obj.foo()` where the receiver's type is unproven and `foo` has no
 * method-scope symbol-table entry returns `unresolved` /
 * `receiver_not_in_symbol_table` (the project's own P3 ruling put this at
 * 64% of unresolved receiver cases). Feldthaus's field-based approximation
 * resolves such a call to the BOUNDED CANDIDATE SET of everything in the
 * project that DEFINES the property name `foo` — a high-recall, labeled-as-
 * approximate edge, never a proven binding.
 *
 * This module is PURE: no I/O, no filesystem, no `Date.now`, no `Math.random`.
 * `buildFieldIndex` is a deterministic function of the element list and folds
 * into Pass 1 alongside `buildSymbolTable` (Pass 1 completes fully before Pass 2
 * — AC-09 preserved). Candidate ordering is id-deterministic so identical
 * inputs yield byte-identical candidate sets.
 *
 * WHY A SEPARATE INDEX (not just the symbol table): `buildSymbolTable` indexes
 * `type:'method'` names as `scope:'method'` entries but NEVER indexes
 * `type:'property'` elements for member lookup (they fall through its
 * constant/interface/type branch). A field index covers BOTH method AND
 * property definitions by their bare property name — the coverage gap this
 * phase closes.
 *
 * SURFACES, NOT VERDICTS. A field-index candidate set reports WHAT DEFINES this
 * property name in the project — it is NOT a proof that the call targets one of
 * them. A single-element set is still an APPROXIMATION (the receiver type was
 * never proven), which is exactly why the resolver labels a single-candidate
 * ACG hit `confidence:'provisional'` / `reason:'field_based_acg'` and NEVER
 * `exact`. A property name with zero definitions returns an empty set — an
 * absence is no-data, never a fabricated candidate.
 */

import type { ElementData } from '../types/types.js';
import { createCodeRefId } from '../utils/coderef-id.js';

/**
 * One project-wide definition of a property name. Every `type:'method'` and
 * `type:'property'` element produces exactly one FieldDef, keyed in the index
 * by its BARE property name (the `ClassName.` qualifier stripped).
 */
export interface FieldDef {
  /** Bare property/method name (the index key), qualifier stripped. */
  propName: string;
  /** Whether this definition came from a `method` or a `property` element. */
  definingType: 'method' | 'property';
  /** Canonical codeRefId of the defining element. */
  codeRefId: string;
  /** Source file the definition lives in (drives the same-language guard). */
  sourceFile: string;
  /**
   * Language family of the source file (`js-ts`, `py`, or the raw extension).
   * Kept on the record so `lookupField` can enforce the same-family guard
   * without re-deriving it. Mirrors `call-resolver.languageFamily`.
   */
  language: string;
}

/**
 * The field index: bare property name → every project definition of it,
 * ordered deterministically by codeRefId.
 */
export type FieldIndex = Map<string, FieldDef[]>;

/**
 * Language family of a source file by extension. JS and TS share a family
 * (TS imports JS and vice versa); every other language is its own family.
 *
 * DELIBERATELY mirrors `call-resolver.languageFamily` (kept private there).
 * The ACG candidate set must obey the same cross-language rejection
 * (STUB-M3GE4S) as the symbol-table lookup it generalizes: a Python `.foo()`
 * must never resolve to a TypeScript `foo` definition.
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
 * Strip a leading `ClassName.` (or nested `A.B.`) qualifier from an element
 * name, returning the bare trailing identifier. The extractor stores class
 * methods as `ClassName.methodName`; properties may or may not carry a
 * qualifier. Mirrors `buildSymbolTable`'s bare-name handling
 * (`name.slice(name.lastIndexOf('.') + 1)`) so a method indexed here keys on
 * the same bare name the resolver looks up by.
 */
function bareName(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1) : name;
}

/**
 * Pass-1 build of the project-wide field/property-definition index. PURE and
 * deterministic: a function of `elements` (+ `projectPath` only for the
 * codeRefId fallback, matching `buildSymbolTable`). Indexes EVERY
 * `type:'method'` and `type:'property'` element by its bare property name.
 * Candidate lists are sorted by codeRefId so identical inputs yield
 * byte-identical sets (no wall-clock, no randomness, no input-order
 * dependence).
 *
 * @param elements the project's extracted elements (`state.elements`).
 * @param projectPath used only to derive a codeRefId when an element lacks one
 *   (identical fallback to `buildSymbolTable`).
 */
export function buildFieldIndex(
  elements: readonly ElementData[],
  projectPath: string,
): FieldIndex {
  const index: FieldIndex = new Map();

  for (const elem of elements) {
    if (elem.type !== 'method' && elem.type !== 'property') continue;

    const codeRefId = elem.codeRefId
      ?? createCodeRefId(elem, projectPath, { includeLine: true });
    const propName = bareName(elem.name);
    if (propName.length === 0) continue;

    const def: FieldDef = {
      propName,
      definingType: elem.type,
      codeRefId,
      sourceFile: elem.file,
      language: languageFamily(elem.file),
    };

    const list = index.get(propName);
    if (!list) {
      index.set(propName, [def]);
      continue;
    }
    // De-dup guard (mirrors buildSymbolTable's addEntry): the same element can
    // be offered more than once. Identity = codeRefId + definingType +
    // sourceFile so two genuinely-distinct definitions sharing a codeRefId are
    // still both kept, but an exact repeat never bloats the candidate set.
    const isDup = list.some(d =>
      d.codeRefId === def.codeRefId
      && d.definingType === def.definingType
      && d.sourceFile === def.sourceFile,
    );
    if (!isDup) list.push(def);
  }

  // Deterministic ordering: sort each candidate list by codeRefId. Byte-
  // identical inputs ⇒ byte-identical candidate sets, independent of the
  // element iteration order.
  for (const list of index.values()) {
    list.sort((a, b) => (a.codeRefId < b.codeRefId ? -1 : a.codeRefId > b.codeRefId ? 1 : 0));
  }

  return index;
}

/**
 * Look up the bounded candidate set for a property name at a call site, filtered
 * to the SAME LANGUAGE FAMILY as the caller (STUB-M3GE4S — a Python `.foo()`
 * never resolves to a TS `foo` definition). Returns the field definitions in
 * the index's deterministic (codeRefId-sorted) order. A property name with no
 * same-language definition returns an empty array — absence is no-data, never a
 * fabricated candidate.
 *
 * @param index the field index from `buildFieldIndex`.
 * @param propName the bare callee/property name from `obj.propName()`.
 * @param callerFile the source file of the call site (drives the same-family guard).
 */
export function lookupField(
  index: FieldIndex,
  propName: string,
  callerFile: string,
): FieldDef[] {
  const all = index.get(propName);
  if (!all || all.length === 0) return [];
  const callerFamily = languageFamily(callerFile);
  return all.filter(d => d.language === callerFamily);
}

/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability heritage-method-lookup
 * @exports HeritageIndex, buildHeritageIndex, heritageMethodLookup, HeritageMethodMatch
 */

/**
 * heritage-index — subtype→supertypes index over the Phase-2 heritage facts
 * (`state.heritage`, genre-features P5) plus the breadth-first ancestor-chain
 * method lookup consumed by call-resolver branches 1/2/3
 * (WO-EDGE-RESOLUTION-IMPROVEMENT-PROGRAM-001 P3, STUB-9B66EN).
 *
 * This retires the branch-3 guardrail-3 "no parent-class walking" restriction:
 * a method call on a receiver whose class is KNOWN (this/super/scope-binding)
 * but whose method is not among the class's OWN methods now walks the DECLARED
 * `extends`/`implements` chain. The walk consults only facts the AST states
 * (heritage clauses) and elements that already exist in the symbol table —
 * it can re-point a call at a real ancestor method, never fabricate a node.
 *
 * Semantics:
 *   - NEAREST-LEVEL-WINS shadowing: candidates found N levels up stop the walk;
 *     a farther ancestor's same-name method is never mixed in. (Own methods are
 *     level 0 and are the CALLER's job — this walk starts at the parents.)
 *   - Name-keyed like the symbol table: ancestors are type NAMES; a name
 *     declared in multiple files contributes all matching entries and the
 *     caller surfaces >=2 as ambiguous (never silent resolution).
 *   - Cycle-safe (visited set) and depth-capped: a malformed `A extends B,
 *     B extends A` estate terminates deterministically.
 *   - `extends` and `implements` are both walked: an interface's method
 *     signature is a real element and a legitimate (exact) target for
 *     navigation when the language extractor emits interface members.
 */

import type { HeritageRelationship } from './types.js';

/** subtypeName → its direct heritage facts (extends + implements). */
export type HeritageIndex = Map<string, HeritageRelationship[]>;

/**
 * Defensive depth cap for the BFS walk. Real inheritance chains are shallow
 * (single digits); the cap only exists so a pathological synthetic estate
 * cannot degrade the resolver. Cycles are handled by the visited set, not
 * by this cap.
 */
const MAX_HERITAGE_DEPTH = 16;

/**
 * Build the subtype→supertypes index from the extracted heritage facts.
 * Absence tolerated (absence=no-data): undefined/empty input yields an empty
 * index and every lookup reports `hasHeritage: false`.
 */
export function buildHeritageIndex(
  heritage: readonly HeritageRelationship[] | undefined,
): HeritageIndex {
  const index: HeritageIndex = new Map();
  for (const h of heritage ?? []) {
    const existing = index.get(h.subtype);
    if (existing) {
      existing.push(h);
    } else {
      index.set(h.subtype, [h]);
    }
  }
  return index;
}

/** Result of one ancestor-chain method lookup. */
export interface HeritageMethodMatch {
  /**
   * Candidate codeRefIds at the NEAREST ancestor level that produced any.
   * Empty when the chain was exhausted (or the class has no heritage).
   */
  codeRefIds: string[];
  /**
   * Whether the starting class has ANY recorded heritage facts. Lets the
   * caller distinguish "walked the chain and missed" (an honest
   * method-not-in-heritage) from "there was never a chain to walk".
   */
  hasHeritage: boolean;
}

/**
 * Breadth-first ancestor-chain lookup: starting from `className`'s DIRECT
 * supertypes (level 1 — own methods are the caller's level 0), consult
 * `lookupOwnMethods(ancestorName)` per ancestor and return the first level's
 * combined candidates (de-duplicated, first-seen order). Nearest level wins;
 * deeper ancestors are never consulted once a level matches.
 */
export function heritageMethodLookup(
  className: string,
  index: HeritageIndex,
  lookupOwnMethods: (ancestorName: string) => string[],
): HeritageMethodMatch {
  const direct = index.get(className) ?? [];
  const hasHeritage = direct.length > 0;
  const visited = new Set<string>([className]);
  let frontier = direct.map(h => h.supertype).filter(s => !visited.has(s));

  for (let depth = 0; depth < MAX_HERITAGE_DEPTH && frontier.length > 0; depth++) {
    const levelCandidates: string[] = [];
    for (const ancestor of frontier) {
      visited.add(ancestor);
      levelCandidates.push(...lookupOwnMethods(ancestor));
    }
    if (levelCandidates.length > 0) {
      return { codeRefIds: [...new Set(levelCandidates)], hasHeritage };
    }
    frontier = frontier
      .flatMap(a => index.get(a) ?? [])
      .map(h => h.supertype)
      .filter(s => !visited.has(s));
  }
  return { codeRefIds: [], hasHeritage };
}

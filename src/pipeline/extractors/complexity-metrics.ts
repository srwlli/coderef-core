/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability ast-complexity-metrics
 * @constraint single depth-tracking walk over the P1-resolved body node; zero extra I/O
 * @exports computeComplexityMetrics, captureComplexity, GrammarFamily, AstComplexity
 * @used_by src/pipeline/extractors/element-extractor.ts
 */

/**
 * AST-accurate complexity metrics — WO-EXTEND-THE-CLONE-SURFACE-P10-SRC-QUERY-CLONES-001 P2.
 *
 * ONE depth-tracking walk over the element's RESOLVED BODY NODE (the same
 * `resolveBodyNode` seam the P1 clone substrate hashes — name/signature
 * excluded) computes three metrics from the real parse tree:
 *
 * - `cyclomatic`  — McCabe subset: 1 + one per decision point.
 * - `cognitive`   — documented Sonar-style subset with nesting penalty.
 * - `nestingDepth`— max count of enclosing nesting structures reached.
 *
 * These fill the DECLARED-but-never-fed `ElementData.complexity` slot, so the
 * downstream AST-preference paths (complexity-generator IMP-CORE-003, the
 * rewired complexity-scorer) finally receive real numbers. Absence discipline:
 * the regex-fallback scanner never reaches this module — old/fallback indexes
 * lack the field and downstream consumers disclose `metric_source: 'estimated'`.
 *
 * PINNED METRIC SPEC (P2-T1 probe, machine-verified against the installed
 * grammars 2026-07-21 — node names below are ground truth from parsing
 * fixture snippets, not from documentation):
 *
 * CYCLOMATIC (base 1, +1 each):
 * - conditional nodes: js `if_statement`, py `if_statement`, go `if_statement`,
 *   rs `if_expression` (covers if-let in the current grammar), java
 *   `if_statement`, c/cpp `if_statement` — else-if chains count per `if`.
 * - flat conditionals: py `elif_clause`, py comprehension guard `if_clause`.
 * - loops: js `for_statement`/`for_in_statement`/`while_statement`/`do_statement`;
 *   py `for_statement`/`while_statement`/comprehension `for_in_clause`;
 *   go `for_statement`; rs `for_expression`/`while_expression` (covers
 *   while-let)/`loop_expression`; java `for_statement`/`enhanced_for_statement`/
 *   `while_statement`/`do_statement`; c/cpp `for_statement`/`for_range_loop`/
 *   `while_statement`/`do_statement`.
 * - case labels (the switch/match head itself adds 0): js `switch_case`
 *   (grammar splits `switch_default` out — defaults never count); go
 *   `expression_case`/`type_case`/`communication_case` (`default_case` split
 *   out); py match `case_clause` (wildcard `case _` indistinguishable —
 *   counted, documented); rs `match_arm` (wildcard arm counted, documented);
 *   java `switch_label` ONLY when its text starts with `case`; c/cpp
 *   `case_statement` ONLY when it carries a `value` field (`default:` has none).
 * - catches: js/java/cpp `catch_clause`, py `except_clause` (go/rs: none).
 * - ternaries: js/java `ternary_expression`, py/cpp `conditional_expression`
 *   (go/rs: none).
 * - short-circuit operators, per OCCURRENCE: js `binary_expression` with
 *   operator `&&`/`||`/`??`; py `boolean_operator` with `and`/`or`; go/rs/java/
 *   c-cpp `binary_expression` with `&&`/`||`.
 *
 * COGNITIVE (Sonar-style SUBSET — documented deviations: logical operators
 * count per occurrence, not per sequence; nested functions are not separately
 * penalized; go/java plain `else` blocks are field-children with no clause
 * node and are not counted):
 * - +1 + current nesting depth for: each conditional (unless it is an
 *   else-if), loop, switch/match head (js `switch_statement`, py
 *   `match_statement`, go `expression_switch_statement`/`type_switch_statement`/
 *   `select_statement`, rs `match_expression`, java `switch_expression` — the
 *   modern grammar parses statement switches as this type, c/cpp
 *   `switch_statement`), catch, ternary.
 * - +1 flat for: else-if (an `if` sitting in an `else_clause`, or in the
 *   `alternative` field of an outer `if` — the go/java shape), py
 *   `elif_clause`, an `else_clause` that does not wrap an `if` (includes
 *   Python's for/try `else`), py comprehension `if_clause`, each
 *   short-circuit operator occurrence.
 *
 * NESTING: depth increments entering the subtree of each non-else-if
 * conditional, loop, switch/match head, catch, and ternary; else-if stays at
 * the outer if's level; case labels add no depth. A flat body = 0.
 *
 * Scope: the walk is subtree-inclusive — decision nodes inside nested
 * closures/lambdas count toward the enclosing element, and a nested function
 * DECLARATION (extracted as its own element) is also attributed to its parent
 * (same double-attribution precedent as the P1 astFingerprint).
 */

import type Parser from 'tree-sitter';
import { resolveBodyNode } from './clone-substrate.js';

/** Comment node types across the 10 supported grammars (walk skips them). */
const COMMENT_NODE_TYPES = new Set(['comment', 'line_comment', 'block_comment']);

/** Grammar family — same bucketing the near-miss clone pass uses. */
export type GrammarFamily = 'js' | 'py' | 'go' | 'rs' | 'java' | 'c';

export interface AstComplexity {
  cyclomatic: number;
  cognitive: number;
  nestingDepth: number;
}

interface FamilyConfig {
  /** if-like nodes: +1 cyclomatic; cognitive +1+depth (flat when else-if); nesting. */
  conditionals: ReadonlySet<string>;
  /** flat conditionals (elif, comprehension guard): +1 cyclomatic, +1 flat cognitive. */
  flatConditionals: ReadonlySet<string>;
  /** loop nodes: +1 cyclomatic, +1+depth cognitive, nesting. */
  loops: ReadonlySet<string>;
  /** switch/match heads: +0 cyclomatic (labels count), +1+depth cognitive, nesting. */
  switches: ReadonlySet<string>;
  /** case labels: +1 cyclomatic each (subject to the per-family predicate). */
  caseLabels: ReadonlySet<string>;
  /** catch/except clauses: +1 cyclomatic, +1+depth cognitive, nesting. */
  catches: ReadonlySet<string>;
  /** ternary/conditional expressions: +1 cyclomatic, +1+depth cognitive, nesting. */
  ternaries: ReadonlySet<string>;
  /** node types carrying a short-circuit operator child. */
  logicalOpNodes: ReadonlySet<string>;
  /** operator child types that count: +1 cyclomatic, +1 flat cognitive. */
  logicalOps: ReadonlySet<string>;
  /** true when else_clause (sans wrapped if) counts +1 flat cognitive. */
  countsPlainElse: boolean;
  /** java: switch_label counts only when its text starts with 'case'. */
  caseLabelTextPrefix?: string;
  /** c/cpp: case_statement counts only when it has a `value` field. */
  caseLabelNeedsValueField?: boolean;
}

const EMPTY: ReadonlySet<string> = new Set();

const FAMILY_CONFIGS: Record<GrammarFamily, FamilyConfig> = {
  js: {
    conditionals: new Set(['if_statement']),
    flatConditionals: EMPTY,
    loops: new Set(['for_statement', 'for_in_statement', 'while_statement', 'do_statement']),
    switches: new Set(['switch_statement']),
    caseLabels: new Set(['switch_case']),
    catches: new Set(['catch_clause']),
    ternaries: new Set(['ternary_expression']),
    logicalOpNodes: new Set(['binary_expression']),
    logicalOps: new Set(['&&', '||', '??']),
    countsPlainElse: true,
  },
  py: {
    conditionals: new Set(['if_statement']),
    flatConditionals: new Set(['elif_clause', 'if_clause']),
    loops: new Set(['for_statement', 'while_statement', 'for_in_clause']),
    switches: new Set(['match_statement']),
    caseLabels: new Set(['case_clause']),
    catches: new Set(['except_clause']),
    ternaries: new Set(['conditional_expression']),
    logicalOpNodes: new Set(['boolean_operator']),
    logicalOps: new Set(['and', 'or']),
    countsPlainElse: true,
  },
  go: {
    conditionals: new Set(['if_statement']),
    flatConditionals: EMPTY,
    loops: new Set(['for_statement']),
    switches: new Set(['expression_switch_statement', 'type_switch_statement', 'select_statement']),
    caseLabels: new Set(['expression_case', 'type_case', 'communication_case']),
    catches: EMPTY,
    ternaries: EMPTY,
    logicalOpNodes: new Set(['binary_expression']),
    logicalOps: new Set(['&&', '||']),
    countsPlainElse: false,
  },
  rs: {
    conditionals: new Set(['if_expression']),
    flatConditionals: EMPTY,
    loops: new Set(['for_expression', 'while_expression', 'loop_expression']),
    switches: new Set(['match_expression']),
    caseLabels: new Set(['match_arm']),
    catches: EMPTY,
    ternaries: EMPTY,
    logicalOpNodes: new Set(['binary_expression']),
    logicalOps: new Set(['&&', '||']),
    countsPlainElse: true,
  },
  java: {
    conditionals: new Set(['if_statement']),
    flatConditionals: EMPTY,
    loops: new Set(['for_statement', 'enhanced_for_statement', 'while_statement', 'do_statement']),
    switches: new Set(['switch_expression']),
    caseLabels: new Set(['switch_label']),
    catches: new Set(['catch_clause']),
    ternaries: new Set(['ternary_expression']),
    logicalOpNodes: new Set(['binary_expression']),
    logicalOps: new Set(['&&', '||']),
    countsPlainElse: false,
    caseLabelTextPrefix: 'case',
  },
  c: {
    conditionals: new Set(['if_statement']),
    flatConditionals: EMPTY,
    loops: new Set(['for_statement', 'for_range_loop', 'while_statement', 'do_statement']),
    switches: new Set(['switch_statement']),
    caseLabels: new Set(['case_statement']),
    catches: new Set(['catch_clause']),
    ternaries: new Set(['conditional_expression']),
    logicalOpNodes: new Set(['binary_expression']),
    logicalOps: new Set(['&&', '||']),
    countsPlainElse: true,
    caseLabelNeedsValueField: true,
  },
};

/**
 * Compute the pinned complexity metrics over a (body) node in ONE
 * depth-tracking walk. Pure over the SyntaxNode; deterministic.
 */
export function computeComplexityMetrics(
  bodyNode: Parser.SyntaxNode,
  family: GrammarFamily
): AstComplexity {
  const cfg = FAMILY_CONFIGS[family];
  let cyclomatic = 1;
  let cognitive = 0;
  let maxDepth = 0;

  const isElseIf = (node: Parser.SyntaxNode): boolean => {
    const parent = node.parent;
    if (!parent) return false;
    // ts/rs/cpp shape: the chained if sits inside an else_clause.
    if (parent.type === 'else_clause') return true;
    // go/java shape: the chained if IS the outer if's `alternative` field.
    if (cfg.conditionals.has(parent.type)) {
      const alt = parent.childForFieldName('alternative');
      return alt !== null && alt.id === node.id;
    }
    return false;
  };

  const countsAsCaseLabel = (node: Parser.SyntaxNode): boolean => {
    if (cfg.caseLabelNeedsValueField) return node.childForFieldName('value') !== null;
    if (cfg.caseLabelTextPrefix) return node.text.startsWith(cfg.caseLabelTextPrefix);
    return true;
  };

  const walk = (node: Parser.SyntaxNode, depth: number): void => {
    if (COMMENT_NODE_TYPES.has(node.type)) return;
    const t = node.type;
    let nextDepth = depth;

    if (cfg.conditionals.has(t)) {
      cyclomatic += 1;
      if (isElseIf(node)) {
        cognitive += 1; // Sonar: else-if is +1 flat, at the outer if's level.
      } else {
        cognitive += 1 + depth;
        nextDepth = depth + 1;
      }
    } else if (cfg.loops.has(t) || cfg.catches.has(t) || cfg.ternaries.has(t)) {
      cyclomatic += 1;
      cognitive += 1 + depth;
      nextDepth = depth + 1;
    } else if (cfg.switches.has(t)) {
      cognitive += 1 + depth; // the head counts once; its labels carry cyclomatic
      nextDepth = depth + 1;
    } else if (cfg.caseLabels.has(t)) {
      if (countsAsCaseLabel(node)) cyclomatic += 1;
    } else if (cfg.flatConditionals.has(t)) {
      cyclomatic += 1;
      cognitive += 1;
    } else if (t === 'else_clause' && cfg.countsPlainElse) {
      const first = node.namedChildren.find(c => !COMMENT_NODE_TYPES.has(c.type));
      if (!(first && cfg.conditionals.has(first.type))) cognitive += 1;
    } else if (cfg.logicalOpNodes.has(t)) {
      const op = node.childForFieldName('operator');
      if (op && cfg.logicalOps.has(op.type)) {
        cyclomatic += 1;
        cognitive += 1;
      }
    }

    if (nextDepth > maxDepth) maxDepth = nextDepth;
    for (const child of node.children) walk(child, nextDepth);
  };

  walk(bodyNode, 0);
  return { cyclomatic, cognitive, nestingDepth: maxDepth };
}

/**
 * Push-site helper — spread into an ElementData literal at the extractor's
 * function-like push sites (function/method/hook/component), mirroring the
 * P1 `captureCloneSubstrate` pattern. Resolves the same body node the clone
 * hash uses, so metrics cover the BODY (name/signature excluded).
 */
export function captureComplexity(
  node: Parser.SyntaxNode,
  family: GrammarFamily
): { complexity: { cyclomatic: number; nestingDepth: number; cognitive: number } } {
  const m = computeComplexityMetrics(resolveBodyNode(node), family);
  return {
    complexity: {
      cyclomatic: m.cyclomatic,
      nestingDepth: m.nestingDepth,
      cognitive: m.cognitive,
    },
  };
}

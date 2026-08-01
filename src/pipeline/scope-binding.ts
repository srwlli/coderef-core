/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability scope-stack-receiver-binding
 * @constraint [pure, deterministic, js-ts-only]
 * @exports ScopeBindingKind, ScopeBinding, ScopeBindingMap, buildScopeBindingMap
 * @used_by src/pipeline/call-resolver.ts, __tests__/pipeline/scope-binding.test.ts
 */

/**
 * Scope-stack receiver binding pass (GX-002, WO-GX-002-SCOPE-STACK-RECEIVER-
 * TYPE-INFERENCE-BUILD-001).
 *
 * Evolves Phase 4's private `buildNewInitializerMap` (the option-1
 * `const x = new Y()` scan) into a fuller per-scope binding table so
 * classifyMethodCall can resolve method calls on local variables and
 * parameters. Three binding sources, in the same single brace-tracking
 * walk:
 *
 *   'new'        — `const|let|var x = new Y(`  (the original pattern,
 *                  widened from const-only to let/var).
 *   'annotation' — `const|let|var x: Y` where Y is a bare PascalCase
 *                  type identifier (generics stripped: `Y<T>` → `Y`;
 *                  unions/intersections/arrays/primitives skipped).
 *   'param'      — `x: Y` pairs inside a function/method parameter list,
 *                  same Y restrictions as 'annotation'.
 *   'qualified'  — `x: ns.Y` (FU-2 lever 2, WO-RESOLVE-62). Binds the
 *                  namespace ROOT, not a class: `ts.Node` -> root `ts`.
 *                  These are NOT project types, so the consumer uses the
 *                  root purely to reach a DISPOSITION (external / builtin)
 *                  and never attempts an own-methods lookup with it.
 *
 * The walk fixes the T1-found coverage hole: class METHOD bodies now get
 * scope frames (`ClassName.methodName`), so bindings inside methods
 * attribute to the method element instead of being dropped.
 *
 * Guardrails carried over from the option-1 scan:
 *   G1 — literal patterns only; factory returns (`const x = makeY()`)
 *        never bind.
 *   G2 — first binding wins per (scope, name); no reassignment tracking.
 *   G3/G4 live in the CONSUMER (call-resolver): 'new' bindings resolve
 *        against own methods only and miss honestly; 'annotation'/'param'
 *        bindings fall through to the ACG tail on miss (DR-GX002-B) so
 *        no existing provisional resolution is lost.
 *
 * PURE. No IO, no Date/random; a function of (sources, elements). JS/TS
 * only — Python files are never walked (language guard mirrors the
 * js_prototype_member precedent).
 */

import type { PipelineState } from './types.js';
import type { ElementData } from '../types/types.js';
import { createCodeRefId } from '../utils/coderef-id.js';
import { normalizeSlashes } from '../utils/path-normalize.js';

/** Provenance of a binding — drives consumer strictness (DR-GX002-B). */
export type ScopeBindingKind = 'new' | 'annotation' | 'param' | 'qualified';

/** One local-name → type-name binding inside a scope. */
export interface ScopeBinding {
  /**
   * PascalCase class/type name the local is bound to (generics stripped).
   * For kind 'qualified' this is instead the namespace ROOT (`ts` in
   * `ts.Node`) — the identifier the consumer resolves against imports.
   */
  className: string;
  /** How the binding was established. */
  kind: ScopeBindingKind;
  /**
   * Kind 'qualified' only: the member type name (`Node` in `ts.Node`).
   * Carried for provenance/auditing; the disposition turns on the root.
   */
  qualifiedMember?: string;
}

/**
 * Outer key = enclosing element codeRefId; inner key = local variable /
 * parameter name. Same shape as the retired NewInitializerMap with a
 * richer value.
 */
export type ScopeBindingMap = Map<string, Map<string, ScopeBinding>>;

/** JS/TS extensions — the only files the walk visits. */
function isJsTsFile(file: string): boolean {
  const lower = file.toLowerCase();
  return /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/.test(lower);
}

/**
 * Keywords that look like method names when scanning `NAME(` inside a
 * class body. Any hit here is control flow, not a method declaration.
 */
const METHOD_NAME_BLOCKLIST = new Set<string>([
  'if', 'for', 'while', 'switch', 'catch', 'return', 'throw', 'new',
  'typeof', 'delete', 'void', 'await', 'yield', 'do', 'else', 'in', 'of',
  'super', 'this', 'function',
]);

/**
 * Type names that never carry project methods — skip the binding rather
 * than record a dead end (primitives, boxed builtins, common utility
 * types). Builtin receivers keep their existing builtin classification
 * path; binding them here would shadow it.
 */
const ANNOTATION_TYPE_BLOCKLIST = new Set<string>([
  'String', 'Number', 'Boolean', 'Object', 'Array', 'Function', 'Symbol',
  'BigInt', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Date', 'RegExp',
  'Error', 'Record', 'Partial', 'Required', 'Readonly', 'Pick', 'Omit',
  'Exclude', 'Extract', 'NonNullable', 'Parameters', 'ReturnType',
  'InstanceType', 'Awaited', 'Buffer',
]);

/**
 * Extract a usable type name from annotation text following a `:`.
 * Accepts a bare PascalCase identifier with optional generic suffix
 * (`Foo`, `Foo<T>`); rejects primitives (lowercase), qualified names
 * (`ns.Foo`), unions/intersections, arrays (`Foo[]`), tuples, object
 * literals, and blocklisted builtins. Returns null when unusable.
 */
function usableAnnotationType(raw: string): string | null {
  const text = raw.trim();
  const m = /^([A-Z][\w$]*)\s*(<[^]*?>)?\s*$/.exec(text);
  if (!m) return null;
  const name = m[1];
  if (ANNOTATION_TYPE_BLOCKLIST.has(name)) return null;
  return name;
}

/**
 * FU-2 lever 2: extract the NAMESPACE ROOT of a QUALIFIED type annotation —
 * `ts.Node` -> {root:'ts', member:'Node'}, `fs.Dirent`, `http.Server`,
 * `ts.factory.NodeFactory` (root is the leftmost identifier).
 *
 * usableAnnotationType above deliberately accepts only a BARE PascalCase
 * identifier, so every qualified annotation was rejected and
 * `(node: ts.Node)` produced NO binding at all — the receiver then fell all
 * the way to the honest tail. Measured 2026-08-01 on a clean scan, locals
 * typed this way were ~160 of the 547 receiver_not_in_symbol_table edges
 * (`node` 92, `entry` 22, `res` 12, `child` 10, `spec` 9, `worker` 7,
 * `server` 6).
 *
 * Such a local is NOT project structure — `ts.Node` is the TypeScript
 * compiler API. The binding therefore exists to reach a DISPOSITION, and the
 * consumer resolves the root against that file's imports: an external package
 * yields external, a node builtin yields builtin, and anything else falls
 * through untouched. Nothing here resolves an edge.
 *
 * Shape rules, deliberately strict: at least two dot-separated segments, every
 * segment a plain identifier, and the LAST segment PascalCase (a type name, so
 * a value path like `foo.bar` never binds). Generics are stripped. Arrays,
 * unions, intersections and object literals are rejected by the regex.
 */
function usableQualifiedAnnotation(raw: string): { root: string; member: string } | null {
  const text = raw.trim();
  const m = /^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+)\s*(?:<[^]*?>)?\s*$/.exec(text);
  if (!m) return null;
  const parts = m[1].split('.');
  const member = parts[parts.length - 1];
  if (!/^[A-Z]/.test(member)) return null;
  return { root: parts[0], member };
}

/**
 * Parse `name: Type` pairs out of a parameter-list string (the text between
 * the fn's outer parentheses). Pragmatic split on top-level commas with
 * bracket/paren/angle depth tracking; per-param regex extracts
 * `name : Annotation` where the annotation is then filtered through
 * usableAnnotationType. Optional params (`x?: Foo`) and defaulted params
 * (`x: Foo = ...`) both bind. Destructured/rest params never match the
 * leading identifier and are skipped (DR-GX002-C).
 */
/** One parsed parameter binding, carrying its provenance kind. */
interface ParamBinding {
  name: string;
  className: string;
  kind: ScopeBindingKind;
  qualifiedMember?: string;
}

function parseParamBindings(paramText: string): ParamBinding[] {
  const out: ParamBinding[] = [];
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < paramText.length; i++) {
    const ch = paramText[i];
    if (ch === '(' || ch === '[' || ch === '{' || ch === '<') depth++;
    else if (ch === ')' || ch === ']' || ch === '}' || ch === '>') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);

  for (const part of parts) {
    const m = /^\s*(?:readonly\s+)?(?:public\s+|private\s+|protected\s+)?([A-Za-z_$][\w$]*)\s*\??\s*:\s*([^=]+?)\s*(?:=[^]*)?$/.exec(part);
    if (!m) continue;
    const name = m[1];
    if (name === 'this') continue; // TS `this` parameter — not a local.
    const typeName = usableAnnotationType(m[2]);
    if (typeName) {
      out.push({ name, className: typeName, kind: 'param' });
      continue;
    }
    // FU-2 lever 2: `(node: ts.Node)` — bind the namespace root for disposition.
    const qualified = usableQualifiedAnnotation(m[2]);
    if (qualified) {
      out.push({
        name,
        className: qualified.root,
        kind: 'qualified',
        qualifiedMember: qualified.member,
      });
    }
  }
  return out;
}

/**
 * Read a balanced `(...)` starting at `start` (which must point at `(`).
 * Skips strings/comments inside. Returns the inner text and the index
 * just past the closing paren, or null when unbalanced within `limit`
 * characters (graceful degrade: no bindings rather than wrong ones).
 */
function readBalancedParens(
  source: string,
  start: number,
  limit = 2000,
): { inner: string; end: number } | null {
  if (source[start] !== '(') return null;
  let depth = 0;
  const cap = Math.min(source.length, start + limit);
  for (let i = start; i < cap; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i++;
      while (i < cap) {
        if (source[i] === '\\') { i++; }
        else if (source[i] === quote) break;
        i++;
      }
      continue;
    }
    if (ch === '/' && source[i + 1] === '/') {
      while (i < cap && source[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < cap - 1 && !(source[i] === '*' && source[i + 1] === '/')) i++;
      i++;
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) {
        return { inner: source.slice(start + 1, i), end: i + 1 };
      }
    }
  }
  return null;
}

/**
 * Build the per-scope binding map. Single brace-tracking walk per JS/TS
 * file (the same pragmatic state machine as the option-1 scan: strings
 * and comments skipped; template-literal `${}` degrades gracefully).
 * Scope frames are pushed for function declarations, class declarations,
 * AND class methods (the T1 coverage fix); bindings attribute to the
 * nearest enclosing frame that maps to a function/method element.
 */
export function buildScopeBindingMap(
  state: PipelineState,
  elementsByFile: Map<string, ElementData[]>,
  projectPath: string,
): ScopeBindingMap {
  const map: ScopeBindingMap = new Map();

  // state.sources and elementsByFile key files in different shapes across
  // pipeline entry points (posix-relative vs backslash-relative — measured
  // live: srcKey "index.ts" vs elemKey "scripts\\scan-cli\\...", which
  // starved the walk to the accidental-overlap subset). Normalize both
  // sides to forward slashes once, up front.
  const sourcesNormalized = new Map<string, string>();
  for (const [k, v] of state.sources) {
    sourcesNormalized.set(normalizeSlashes(k), v);
  }

  for (const [file, elements] of elementsByFile) {
    if (!isJsTsFile(file)) continue;
    const source = state.sources.get(file)
      ?? sourcesNormalized.get(normalizeSlashes(file));
    if (!source) continue;

    const fnElements = elements.filter(
      e => e.type === 'function' || e.type === 'method' || e.type === 'component' || e.type === 'hook',
    );
    if (fnElements.length === 0) continue;
    const elemByName = new Map<string, ElementData>();
    for (const elem of fnElements) {
      const bareName = elem.name.includes('.')
        ? elem.name.slice(elem.name.lastIndexOf('.') + 1)
        : elem.name;
      elemByName.set(elem.name, elem);
      if (!elemByName.has(bareName)) elemByName.set(bareName, elem);
    }

    type ScopeFrame = { name: string; depth: number; classCtx: string | null };
    const scopeStack: ScopeFrame[] = [];
    let depth = 0;
    let i = 0;
    const len = source.length;

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

    const addBinding = (
      localName: string,
      className: string,
      kind: ScopeBindingKind,
      qualifiedMember?: string,
    ): void => {
      const codeRefId = currentScopeCodeRefId();
      if (!codeRefId) return;
      let perScope = map.get(codeRefId);
      if (!perScope) {
        perScope = new Map();
        map.set(codeRefId, perScope);
      }
      // G2: first binding wins per (scope, name).
      if (!perScope.has(localName)) {
        perScope.set(localName, qualifiedMember === undefined
          ? { className, kind }
          : { className, kind, qualifiedMember });
      }
    };

    /** Innermost frame, when it is a class body at exactly one level in. */
    const enclosingClassAtMethodDepth = (): ScopeFrame | null => {
      const top = scopeStack[scopeStack.length - 1];
      if (top && top.classCtx !== null && top.depth === depth) return top;
      return null;
    };

    while (i < len) {
      const ch = source[i];

      if (ch === '/' && source[i + 1] === '/') {
        while (i < len && source[i] !== '\n') i++;
        continue;
      }
      if (ch === '/' && source[i + 1] === '*') {
        i += 2;
        while (i < len - 1 && !(source[i] === '*' && source[i + 1] === '/')) i++;
        i += 2;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        const quote = ch;
        i++;
        while (i < len) {
          if (source[i] === '\\') { i += 2; continue; }
          if (source[i] === quote) { i++; break; }
          i++;
        }
        continue;
      }

      if (ch === '{') {
        depth++;
        i++;
        continue;
      }
      if (ch === '}') {
        depth--;
        while (scopeStack.length > 0 && scopeStack[scopeStack.length - 1].depth > depth) {
          scopeStack.pop();
        }
        i++;
        continue;
      }

      // `function NAME(params)` declaration (not an expression).
      if (
        source.startsWith('function', i)
        && (i === 0 || /\W/.test(source[i - 1]))
        && /\W/.test(source[i + 'function'.length] ?? ' ')
      ) {
        let j = i - 1;
        while (j >= 0 && /\s/.test(source[j])) j--;
        const prevCh = j >= 0 ? source[j] : '';
        const isExpression = prevCh === '=' || prevCh === '(' || prevCh === ',' || prevCh === ':';
        if (!isExpression) {
          let k = i + 'function'.length;
          while (k < len && /\s/.test(source[k])) k++;
          if (source[k] === '*') { k++; while (k < len && /\s/.test(source[k])) k++; }
          const nameMatch = /^[A-Za-z_$][\w$]*/.exec(source.slice(k));
          if (nameMatch) {
            const fnName = nameMatch[0];
            const enclosingFn = scopeStack.length > 0
              ? scopeStack[scopeStack.length - 1].name
              : null;
            const qualifiedName = enclosingFn ? `${enclosingFn}.${fnName}` : fnName;
            scopeStack.push({ name: qualifiedName, depth: depth + 1, classCtx: null });
            i = k + fnName.length;
            // Typed parameters → 'param' bindings on the just-pushed frame.
            let p = i;
            while (p < len && /\s/.test(source[p])) p++;
            const parens = readBalancedParens(source, p);
            if (parens) {
              for (const pb of parseParamBindings(parens.inner)) {
                addBinding(pb.name, pb.className, pb.kind, pb.qualifiedMember);
              }
              i = parens.end;
            }
            continue;
          }
        }
      }

      // `class NAME` declaration.
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
          scopeStack.push({ name: className, depth: depth + 1, classCtx: className });
          i = k + nameMatch[0].length;
          continue;
        }
      }

      // Class METHOD declaration (the T1 coverage fix): inside a class body
      // at method depth, `[static] [async] [get|set] NAME(params)` followed
      // by `{` after the params. Keywords blocklisted; constructor included.
      const classFrame = enclosingClassAtMethodDepth();
      if (classFrame && /[A-Za-z_$]/.test(ch)) {
        const m = /^(?:static\s+)?(?:async\s+)?(?:get\s+|set\s+)?(?:\*\s*)?([A-Za-z_$][\w$]*)\s*\(/.exec(source.slice(i, i + 300));
        if (m && !METHOD_NAME_BLOCKLIST.has(m[1]) && (i === 0 || /[^.\w$]/.test(source[i - 1]))) {
          const methodName = m[1];
          // m[0] ends at the opening paren — offset is its last character.
          const parens = readBalancedParens(source, i + m[0].length - 1);
          if (parens) {
            // Look ahead past the params (and an optional `: ReturnType`)
            // for the opening `{` that proves this is a method body, not a
            // call expression inside a field initializer.
            let q = parens.end;
            while (q < len && /\s/.test(source[q])) q++;
            if (source[q] === ':') {
              // Skip return-type annotation up to `{` at angle/paren depth 0.
              let tDepth = 0;
              q++;
              while (q < len) {
                const tc = source[q];
                if (tc === '<' || tc === '(' || tc === '[') tDepth++;
                else if (tc === '>' || tc === ')' || tc === ']') tDepth--;
                else if (tc === '{' && tDepth === 0) break;
                else if ((tc === ';' || tc === '\n') && tDepth === 0) break;
                q++;
              }
            }
            if (source[q] === '{') {
              const qualifiedName = `${classFrame.classCtx}.${methodName}`;
              scopeStack.push({ name: qualifiedName, depth: depth + 1, classCtx: null });
              for (const pb of parseParamBindings(parens.inner)) {
                addBinding(pb.name, pb.className, pb.kind, pb.qualifiedMember);
              }
              i = parens.end;
              continue;
            }
          }
        }
      }

      // `const|let|var X ...` — 'new' and 'annotation' bindings.
      for (const kw of ['const', 'let', 'var'] as const) {
        if (
          source.startsWith(kw, i)
          && (i === 0 || /\W/.test(source[i - 1]))
          && /\s/.test(source[i + kw.length] ?? '')
        ) {
          const remainder = source.slice(i, i + 300);
          // `const X = new Y(` — proven instance (original option-1 pattern).
          const mNew = new RegExp(`^${kw}\\s+([A-Za-z_$][\\w$]*)\\s*(?::\\s*[^=]{0,120}?)?=\\s*new\\s+([A-Z][\\w$]*)\\s*[(<]`).exec(remainder);
          if (mNew) {
            addBinding(mNew[1], mNew[2], 'new');
            i += mNew[0].length;
            break;
          }
          // `const X: Y` (no `new`) — declared-type binding.
          const mAnn = new RegExp(`^${kw}\\s+([A-Za-z_$][\\w$]*)\\s*:\\s*([^=;\\n]{1,120})`).exec(remainder);
          if (mAnn) {
            const typeName = usableAnnotationType(mAnn[2]);
            if (typeName) {
              addBinding(mAnn[1], typeName, 'annotation');
            } else {
              // FU-2 lever 2: `const sf: ts.SourceFile` — namespace root for disposition.
              const qualified = usableQualifiedAnnotation(mAnn[2]);
              if (qualified) {
                addBinding(mAnn[1], qualified.root, 'qualified', qualified.member);
              }
            }
            i += mAnn[0].length;
            break;
          }
        }
      }

      i++;
    }
  }

  return map;
}

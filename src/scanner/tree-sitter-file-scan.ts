/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability single-parse-tree-sitter-file-scan
 * @constraint ["one-parse-per-file", "caller-supplied-content-no-disk-reread"]
 * @exports scanFileWithTreeSitter
 * @imports ["../pipeline/grammar-registry.js:GrammarRegistry", "../pipeline/extractors/element-extractor.js:ElementExtractor", "../pipeline/extractors/relationship-extractor.js:RelationshipExtractor", "../analyzer/js-call-detector.js:JSCallDetector"]
 * @used_by src/scanner/scanner.ts, src/scanner/scanner-worker.ts
 * @generated 2026-07-02T00:00:00Z
 */

/**
 * Shared tree-sitter file scan — WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 3 (P2-13).
 *
 * Replaces the scanner's private TreeSitterScanner path, which (a) re-read the
 * file from disk although the caller already held its content, (b) parsed the
 * file a second time for relationship extraction, and (c) used a reduced
 * element extractor that missed interfaces, constants and type aliases (the
 * regex second pass was masking that recall gap). Elements now come from the
 * SAME pipeline ElementExtractor that produces .coderef/index.json, from one
 * shared parse.
 *
 * Relationship attach mirrors Phase 2 (P1-8): ts/tsx via the pipeline
 * RelationshipExtractor on the same tree; js/jsx via JSCallDetector (Acorn —
 * kept for its CommonJS require extraction), primed with the in-memory
 * content so it performs exactly one parse and zero disk reads.
 *
 * Throws when no grammar covers the file's extension — callers treat that as
 * "tree-sitter unavailable" and take their regex fallback path.
 */

import * as path from 'path';
import { GrammarRegistry } from '../pipeline/grammar-registry.js';
import { ElementExtractor } from '../pipeline/extractors/element-extractor.js';
import { RelationshipExtractor } from '../pipeline/extractors/relationship-extractor.js';
import { JSCallDetector } from '../analyzer/js-call-detector.js';
import logger from '../utils/logger.js';
import type { ElementData } from '../types/types.js';

const elementExtractor = new ElementExtractor();
const relationshipExtractor = new RelationshipExtractor();

/** One attached import entry, as element.imports carries it. */
type AttachedImport = NonNullable<ElementData['imports']>[number];

/**
 * The local names an import binds into file scope: named specifiers, the default
 * binding, and the namespace alias. These are the only tokens an element body can
 * mention, so they are the only basis on which ownership can be decided.
 */
function importBindings(imp: AttachedImport): string[] {
  const names: string[] = [];
  for (const s of imp.specifiers ?? []) if (s) names.push(s);
  if (imp.default) names.push(imp.default);
  if (imp.namespace) names.push(imp.namespace);
  return names;
}

/**
 * Does this element's own source span mention anything the import binds?
 *
 * CONSERVATIVE BY DESIGN — the two error directions are not symmetric. A false
 * KEEP leaves an unused import attached, which is exactly the pre-fix behaviour
 * and harms nothing. A false DROP discards an import the element genuinely uses,
 * which is data loss. So anything we cannot decide is KEPT:
 *   - an import that binds no names (side-effect `import './x.js'`, dynamic
 *     `import()`) has nothing to match on, so it stays;
 *   - an element with no usable body span (no endLine) keeps the whole list.
 *
 * This is a TEXT match, not symbol resolution. A name appearing only in a comment
 * or string keeps its import, and a symbol reached by computed access may be
 * dropped. Real resolution needs the symbol table and is far larger than this
 * change; the limitation is recorded rather than papered over.
 */
function importUsedBy(imp: AttachedImport, body: string): boolean {
  const names = importBindings(imp);
  if (names.length === 0) return true; // nothing to match on -> keep
  return names.some(n => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(body));
}

/**
 * Narrow a file's import list to the entries an element actually references.
 *
 * Replaces the whole-file assignment both legs used to do. Measured before the
 * change, across 256 src files: 2,445 of 2,778 elements carried imports and
 * 11,578 entries were attached, and in ALL 203 files that had imports every
 * element carried a byte-identical copy of the file list. The live consequence
 * was in query/clones.ts:247, which gates triviality on
 * `importSources(el.imports).length === 0` — so inside any file with imports no
 * element could ever be trivial. 193 elements qualified where 1,264 should.
 */
function ownImports(
  element: ElementData,
  fileImports: AttachedImport[],
  lines: string[]
): AttachedImport[] {
  if (!element.line || !element.endLine || element.endLine < element.line) {
    return fileImports; // no body span to reason about -> keep everything
  }
  const body = lines.slice(element.line - 1, element.endLine).join('\n');
  return fileImports.filter(imp => importUsedBy(imp, body));
}

/**
 * Scan one file with tree-sitter: extract elements and attach imports/calls.
 *
 * @param file Absolute path to the file (used for ids and grammar choice)
 * @param content The file's content, already read by the caller
 * @returns Elements with imports[]/calls[] attached where extractable
 * @throws When the extension has no tree-sitter grammar (caller falls back)
 */
export async function scanFileWithTreeSitter(
  file: string,
  content: string
): Promise<ElementData[]> {
  const realExt = path.extname(file).substring(1); // ts vs tsx vs js vs jsx grammar
  const parser = await GrammarRegistry.getInstance().getParser(realExt);
  if (!parser) {
    throw new Error(`Unsupported language for tree-sitter: ${realExt} (file: ${file})`);
  }

  const tree = parser.parse(content);
  const elements = elementExtractor.extract(tree.rootNode, file, content, realExt);

  // Split once, not per element per leg — ownImports() slices each element's own
  // [line, endLine] span out of this to decide which imports it references.
  const lines = content.split('\n');

  // WO-ELEMENTEXTRACTOR-...-001 phase 2 (TKT-XGZA82).
  //
  // Relationship attach runs BEFORE dequalification, on purpose. It used to run
  // after, matching `call.source === element.name` on names already collapsed to
  // their bare form — so two same-named methods on different classes both matched
  // every call from either, and each element was handed the UNION of both methods'
  // callees. Both elements were then wrong, each carrying a fabricated edge.
  //
  // Matching on the qualified identity is only possible because extractCalls is
  // now asked to COMPOSE method scope (`qualifyScopes`); by default it overwrites
  // the class scope with the bare method name, which is where the identity was
  // actually destroyed.
  //
  // The default stays OFF for the pipeline path. Traced during the phase-5
  // surface audit, more precisely than the phase-2 note claimed: orchestrator.ts:463
  // feeds ctx.calls into legacyGraphPhase (resolve-tail.ts:47), which builds a
  // SEED graph object — and constructGraphPhase (resolve-tail.ts:109) then
  // Object.assign-s canonical nodes/edges over it, built from extractRawCalls,
  // whose RawCallFact.scopePath is a string[] and so never lost the enclosing
  // class in the first place. The canonical graph was never exposed to this
  // defect. Keeping the default off is therefore about not re-specifying a
  // legacy seam mid-fix, not about protecting the canonical graph from it.
  if (realExt === 'ts' || realExt === 'tsx') {
    try {
      const fileImports = relationshipExtractor.extractImports(tree.rootNode, file, content, realExt);
      const fileCalls = relationshipExtractor.extractCalls(
        tree.rootNode, file, content, realExt, undefined, /* qualifyScopes */ true
      );
      for (const element of elements) {
        const elementCalls = fileCalls
          .filter(call => call.source === element.name)
          .map(call => call.target);
        // element.imports is the imports THIS element references, not the file's
        // whole list (TKT-SCBB58, WO-ELEMENT-IMPORTS-...-001 phase 1). The old
        // behaviour handed every element an identical copy of the file list; see
        // ownImports() above for the measured baseline and the conservatism rule.
        // `namespace` is carried through now that the repaired extractor actually
        // populates it — it was silently dropped here even before the repair.
        const attached = fileImports.map(imp => ({
          source: imp.target,
          specifiers: imp.specifiers ?? [],
          default: imp.default,
          namespace: imp.namespace,
          dynamic: imp.dynamic || false,
          line: imp.line
        }));
        const mine = ownImports(element, attached, lines);
        if (mine.length > 0) {
          element.imports = mine;
        }
        if (elementCalls.length > 0) {
          element.calls = [...new Set(elementCalls)];
        }
      }
    } catch (error) {
      // Non-fatal by policy: structural elements stand. But NOT silent — a bare
      // `catch {}` made an extraction fault indistinguishable from a file that
      // genuinely has no imports or calls, which is the "silently drops" half of
      // TKT-XGZA82. Best-effort is a legitimate policy; unobservable is not.
      logger.warn(
        `[tree-sitter-file-scan] relationship attach failed for ${file} ` +
        `(${realExt}): ${error instanceof Error ? error.message : String(error)} ` +
        `— elements stand, imports/calls omitted for this file`
      );
    }
  } else if (realExt === 'js' || realExt === 'jsx') {
    try {
      const detector = new JSCallDetector();
      detector.primeContent(file, content); // one Acorn parse, no disk read
      const fileImports = detector.detectImports(file);
      const fileCalls = detector.detectCalls(file);
      for (const element of elements) {
        const elementCalls = fileCalls
          .filter(call => {
            // The detector already carries callerClass and callerFunction
            // SEPARATELY, so the qualified identity was always available here.
            // The old predicate ORed them, which matched a call inside
            // `Alpha.run` against BOTH the method `run` and the class `Alpha`,
            // and matched every same-named method besides.
            const qualified = call.callerClass
              ? `${call.callerClass}.${call.callerFunction ?? ''}`
              : call.callerFunction;
            return qualified === element.name;
          })
          .map(call => call.calleeFunction);
        // Same narrowing as the ts leg. These two legs are the pair that must not
        // drift: the JS detector already populated specifiers correctly while the
        // ts extractor silently returned none, so the SAME field meant different
        // things depending on the file extension.
        const attached = fileImports.map(imp => ({
          source: imp.source,
          specifiers: imp.specifiers.filter(s => s !== 'default'),
          default: imp.isDefault ? imp.specifiers[0] : undefined,
          dynamic: imp.dynamic || false,
          line: imp.line
        }));
        const mine = ownImports(element, attached, lines);
        if (mine.length > 0) {
          element.imports = mine;
        }
        if (elementCalls.length > 0) {
          // Deduped to match the ts leg. The two legs previously disagreed about
          // whether element.calls could repeat — same function, same field, two
          // contracts.
          element.calls = [...new Set(elementCalls)];
        }
      }
    } catch (error) {
      logger.warn(
        `[tree-sitter-file-scan] relationship attach failed for ${file} ` +
        `(${realExt}): ${error instanceof Error ? error.message : String(error)} ` +
        `— elements stand, imports/calls omitted for this file`
      );
    }
  }

  // Scanner-shape contract: the pipeline extractor qualifies methods as
  // `Class.method`, but scanCurrentElements has always emitted BARE method
  // names. Verified in P2-T1: three consumers depend on the bare form for
  // CALLEE lookup — validateReferences.ts:66 indexes elementMap by bare name and
  // would report every method call as "called but not found" if this were
  // dropped. So the strip stays; it just no longer runs before the matching that
  // needs the scope.
  for (const element of elements) {
    if (element.type === 'method' && element.name.includes('.')) {
      element.name = element.name.split('.').pop()!;
    }
  }

  return elements;
}

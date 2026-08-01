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
  // actually destroyed. That default is kept for the pipeline path, whose
  // ctx.calls feeds the canonical graph builder.
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
        // KNOWN, OUT OF SCOPE for TKT-XGZA82: this assigns the file's ENTIRE
        // import list to every element in the file. That is over-assignment, not
        // a dropped or fabricated relationship, and changing it redefines what
        // the field means for six consumers — so it is left alone deliberately
        // rather than absorbed into this fix.
        if (fileImports.length > 0) {
          element.imports = fileImports.map(imp => ({
            source: imp.target,
            specifiers: imp.specifiers ?? [],
            default: imp.default,
            dynamic: imp.dynamic || false,
            line: imp.line
          }));
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
        if (fileImports.length > 0) {
          element.imports = fileImports.map(imp => ({
            source: imp.source,
            specifiers: imp.specifiers.filter(s => s !== 'default'),
            default: imp.isDefault ? imp.specifiers[0] : undefined,
            dynamic: imp.dynamic || false,
            line: imp.line
          }));
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

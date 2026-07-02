/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability single-parse-tree-sitter-file-scan
 * @constraint one tree-sitter parse per file; content is caller-supplied (no disk re-read)
 * @exports scanFileWithTreeSitter
 * @imports pipeline/grammar-registry:GrammarRegistry, pipeline/extractors/element-extractor:ElementExtractor, pipeline/extractors/relationship-extractor:RelationshipExtractor, analyzer/js-call-detector:JSCallDetector
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

  // Scanner-shape contract: the pipeline extractor qualifies methods as
  // `Class.method`, but scanCurrentElements has always emitted BARE method
  // names (consumers filter on `el.name === 'findUser'`), and the
  // relationship attach below matches call sources against bare names too.
  for (const element of elements) {
    if (element.type === 'method' && element.name.includes('.')) {
      element.name = element.name.split('.').pop()!;
    }
  }

  if (realExt === 'ts' || realExt === 'tsx') {
    try {
      const fileImports = relationshipExtractor.extractImports(tree.rootNode, file, content, realExt);
      const fileCalls = relationshipExtractor.extractCalls(tree.rootNode, file, content, realExt);
      for (const element of elements) {
        const elementCalls = fileCalls
          .filter(call => call.source === element.name)
          .map(call => call.target);
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
    } catch {
      // Non-fatal: structural elements stand; relationship data is best-effort
    }
  } else if (realExt === 'js' || realExt === 'jsx') {
    try {
      const detector = new JSCallDetector();
      detector.primeContent(file, content); // one Acorn parse, no disk read
      const fileImports = detector.detectImports(file);
      const fileCalls = detector.detectCalls(file);
      for (const element of elements) {
        const elementCalls = fileCalls
          .filter(call => call.callerFunction === element.name || call.callerClass === element.name)
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
          element.calls = elementCalls;
        }
      }
    } catch {
      // Non-fatal: structural elements stand; relationship data is best-effort
    }
  }

  return elements;
}

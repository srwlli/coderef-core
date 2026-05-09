/**
 * RelationshipExtractor - AST-based import and call relationship extraction
 *
 * WO-UNIFIED-CODEREF-PIPELINE-001 - Phase 2, Task IMPL-003
 * WO-PIPELINE-RELATIONSHIP-RAW-FACTS-001 - Phase 2 (raw-fact split)
 *
 * Public surface:
 * - Legacy: extractImports / extractCalls produce ImportRelationship[] /
 *   CallRelationship[] (kept during transition; consumers migrate phase-by-phase).
 * - Raw facts (Phase 2): extractRawImports / extractRawCalls /
 *   extractRawExports produce typed RawXxxFact[] that carry every detail
 *   downstream resolvers (Phase 3 / Phase 4) need.
 * - Header (Phase 2.5): extractHeaderFact returns the parsed semantic
 *   header (HeaderFact + HeaderStatus + HeaderImportFact[]).
 *
 * Phase 2/2.5 invariants (enforced by tests):
 * - No raw fact carries a graph node ID as endpoint.
 * - Method calls preserve receiver text — `obj.save()` is
 *   `{ receiverText: 'obj', calleeName: 'save' }`, never bare `'save'`.
 * - Every RawCallFact has a populated scopePath (may be empty array at
 *   module top level).
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports RelationshipExtractor
 * @used_by src/pipeline/orchestrator.ts
 */

import type Parser from 'tree-sitter';
import type {
  ImportRelationship,
  CallRelationship,
  RawImportFact,
  RawImportSpecifier,
  RawCallFact,
  RawExportFact,
} from '../types.js';
import type {
  HeaderFact,
  HeaderImportFact,
} from '../header-fact.js';
import type { HeaderStatus } from '../element-taxonomy.js';
import { parseHeader } from '../semantic-header-parser.js';

/**
 * RelationshipExtractor - Extract import and call relationships from AST
 */
export class RelationshipExtractor {
  /**
   * Extract import relationships from AST
   *
   * @param rootNode Parsed AST root node
   * @param filePath Source file path
   * @param content Source code content
   * @param language Language extension (ts, py, go, etc)
   * @returns Array of import relationships
   */
  extractImports(
    rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    language: string
  ): ImportRelationship[] {
    const imports: ImportRelationship[] = [];

    switch (language) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
        this.extractTypeScriptImports(rootNode, filePath, content, imports);
        break;
      case 'py':
        this.extractPythonImports(rootNode, filePath, content, imports);
        break;
      case 'go':
        this.extractGoImports(rootNode, filePath, content, imports);
        break;
      case 'rs':
        this.extractRustImports(rootNode, filePath, content, imports);
        break;
      case 'java':
        this.extractJavaImports(rootNode, filePath, content, imports);
        break;
      case 'cpp':
      case 'cc':
      case 'c':
      case 'h':
        this.extractCppImports(rootNode, filePath, content, imports);
        break;
      default:
        console.warn(`[RelationshipExtractor] Unsupported language for imports: ${language}`);
    }

    return imports;
  }

  /**
   * Extract call relationships from AST
   *
   * @param rootNode Parsed AST root node
   * @param filePath Source file path
   * @param content Source code content
   * @param language Language extension
   * @param currentScope Current scope context (for tracking source element)
   * @returns Array of call relationships
   */
  extractCalls(
    rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    language: string,
    currentScope?: string
  ): CallRelationship[] {
    const calls: CallRelationship[] = [];

    switch (language) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
        this.extractTypeScriptCalls(rootNode, filePath, content, calls, currentScope);
        break;
      case 'py':
        this.extractPythonCalls(rootNode, filePath, content, calls, currentScope);
        break;
      case 'go':
        this.extractGoCalls(rootNode, filePath, content, calls, currentScope);
        break;
      case 'rs':
        this.extractRustCalls(rootNode, filePath, content, calls, currentScope);
        break;
      case 'java':
        this.extractJavaCalls(rootNode, filePath, content, calls, currentScope);
        break;
      case 'cpp':
      case 'cc':
      case 'c':
      case 'h':
        this.extractCppCalls(rootNode, filePath, content, calls, currentScope);
        break;
      default:
        console.warn(`[RelationshipExtractor] Unsupported language for calls: ${language}`);
    }

    return calls;
  }

  // ========================================================================
  // Phase 2 raw-fact public API
  // ========================================================================

  /** Extract RawImportFact[] for the file. */
  extractRawImports(
    rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    language: string
  ): RawImportFact[] {
    const facts: RawImportFact[] = [];
    switch (language) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
        this.walkRawTsImports(rootNode, filePath, content, facts);
        break;
      case 'py':
        this.walkRawPyImports(rootNode, filePath, content, facts);
        break;
      // Other languages: Phase 2 ships TS/JS/PY raw facts; legacy extractors
      // keep covering go/rs/java/cpp until later phases promote them.
      default:
        break;
    }
    return facts;
  }

  /** Extract RawCallFact[] for the file. */
  extractRawCalls(
    rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    language: string
  ): RawCallFact[] {
    const facts: RawCallFact[] = [];
    switch (language) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
        this.walkRawTsCalls(rootNode, filePath, content, language, [], facts);
        break;
      case 'py':
        this.walkRawPyCalls(rootNode, filePath, content, language, [], facts);
        break;
      default:
        break;
    }
    return facts;
  }

  /** Extract RawExportFact[] for the file. */
  extractRawExports(
    rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    language: string
  ): RawExportFact[] {
    const facts: RawExportFact[] = [];
    switch (language) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
        this.walkRawTsExports(rootNode, filePath, content, facts);
        break;
      default:
        break;
    }
    return facts;
  }

  /**
   * Phase 2.5 structured header extraction. Returns the parsed
   * {@link HeaderFact}, the parser-side {@link HeaderStatus} (which the
   * orchestrator may demote to `'stale'` after AST cross-check), and the
   * structured {@link HeaderImportFact}[] that supersedes
   * {@link RawHeaderImportFact}. Pure delegation to parseHeader; AST is not
   * inspected here.
   */
  extractHeaderFact(
    _rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    _language: string
  ): { headerFact: HeaderFact; headerStatus: HeaderStatus; importFacts: HeaderImportFact[] } {
    return parseHeader(content, filePath);
  }

  // ========================================================================
  // TypeScript/JavaScript raw imports
  // ========================================================================

  private walkRawTsImports(
    node: Parser.SyntaxNode,
    filePath: string,
    content: string,
    facts: RawImportFact[]
  ): void {
    if (node.type === 'import_statement') {
      const sourceNode = node.childForFieldName('source');
      if (sourceNode) {
        const moduleSpecifier = this.extractStringLiteral(sourceNode, content);
        const line = node.startPosition.row + 1;
        // tree-sitter-typescript exposes `import_clause` as an unnamed-field
        // child rather than via childForFieldName, so look it up by type.
        const importClause = node.namedChildren.find(c => c.type === 'import_clause');

        const specifiers: RawImportSpecifier[] = [];
        let defaultImport: string | null = null;
        let namespaceImport: string | null = null;

        // `import type { ... } from ...` is detected by leading `type` keyword.
        const typeOnly = /^\s*import\s+type\b/.test(
          content.slice(node.startIndex, node.endIndex)
        );

        if (importClause) {
          // Default binding: `import Foo from '...'` — appears as `identifier`
          // direct child of import_clause.
          for (const child of importClause.namedChildren) {
            if (child.type === 'identifier') {
              defaultImport = content.slice(child.startIndex, child.endIndex);
              break;
            }
          }

          // Named imports: `import { a, b as c }`. import_specifier nodes
          // live inside the named_imports descendant.
          for (const spec of importClause.descendantsOfType('import_specifier')) {
            const nameNode = spec.childForFieldName('name');
            const aliasNode = spec.childForFieldName('alias');
            if (!nameNode) continue;
            const imported = content.slice(nameNode.startIndex, nameNode.endIndex);
            const local = aliasNode
              ? content.slice(aliasNode.startIndex, aliasNode.endIndex)
              : imported;
            specifiers.push({ imported, local });
          }

          // Namespace import: `import * as ns`.
          const ns = importClause.descendantsOfType('namespace_import')[0];
          if (ns) {
            const nameNode = ns.namedChildren.find(c => c.type === 'identifier')
              ?? ns.childForFieldName('name');
            if (nameNode) {
              namespaceImport = content.slice(nameNode.startIndex, nameNode.endIndex);
            }
          }
        }

        facts.push({
          sourceElementId: null,
          sourceFile: filePath,
          moduleSpecifier,
          specifiers,
          defaultImport,
          namespaceImport,
          typeOnly,
          dynamic: false,
          line,
        });
      }
    } else if (node.type === 'call_expression') {
      // Dynamic import: `import('module')` parses as a call_expression whose
      // function is the keyword `import`.
      const fn = node.childForFieldName('function');
      if (fn && content.slice(fn.startIndex, fn.endIndex) === 'import') {
        const args = node.childForFieldName('arguments');
        if (args && args.namedChildCount > 0) {
          const firstArg = args.namedChild(0);
          if (firstArg) {
            facts.push({
              sourceElementId: null,
              sourceFile: filePath,
              moduleSpecifier: this.extractStringLiteral(firstArg, content),
              specifiers: [],
              defaultImport: null,
              namespaceImport: null,
              typeOnly: false,
              dynamic: true,
              line: node.startPosition.row + 1,
            });
          }
        }
      }
    }

    for (const child of node.namedChildren) {
      this.walkRawTsImports(child, filePath, content, facts);
    }
  }

  // ========================================================================
  // TypeScript/JavaScript raw calls
  // ========================================================================

  private walkRawTsCalls(
    node: Parser.SyntaxNode,
    filePath: string,
    content: string,
    language: string,
    scopePath: string[],
    facts: RawCallFact[]
  ): void {
    if (node.type === 'call_expression') {
      const fn = node.childForFieldName('function');
      if (fn) {
        const callExpressionText = content.slice(node.startIndex, node.endIndex);
        let calleeName = '';
        let receiverText: string | null = null;

        if (fn.type === 'member_expression') {
          // `obj.method()` — preserve receiver text.
          const objectNode = fn.childForFieldName('object');
          const propertyNode = fn.childForFieldName('property');
          if (propertyNode) {
            calleeName = content.slice(propertyNode.startIndex, propertyNode.endIndex);
          }
          if (objectNode) {
            receiverText = content.slice(objectNode.startIndex, objectNode.endIndex);
          }
        } else if (fn.type === 'identifier') {
          calleeName = content.slice(fn.startIndex, fn.endIndex);
        } else {
          // Fall back to the full function text (e.g. parenthesised expressions).
          calleeName = content.slice(fn.startIndex, fn.endIndex);
        }

        // Skip the dynamic-import keyword — that is captured by raw imports.
        const skip =
          fn.type === 'identifier' &&
          calleeName === 'import' &&
          node.parent?.type !== 'arguments';

        if (calleeName && !skip) {
          facts.push({
            sourceElementCandidate: null,
            sourceFile: filePath,
            callExpressionText,
            calleeName,
            receiverText,
            scopePath: [...scopePath],
            line: node.startPosition.row + 1,
            language,
          });
        }
      }
    }

    // Update scopePath for descendants when entering function/method/class.
    let pushed = false;
    if (
      node.type === 'function_declaration' ||
      node.type === 'method_definition'
    ) {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        scopePath.push(content.slice(nameNode.startIndex, nameNode.endIndex));
        pushed = true;
      }
    } else if (node.type === 'class_declaration') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        scopePath.push(content.slice(nameNode.startIndex, nameNode.endIndex));
        pushed = true;
      }
    }

    for (const child of node.namedChildren) {
      this.walkRawTsCalls(child, filePath, content, language, scopePath, facts);
    }

    if (pushed) scopePath.pop();
  }

  // ========================================================================
  // TypeScript/JavaScript raw exports
  // ========================================================================

  private walkRawTsExports(
    node: Parser.SyntaxNode,
    filePath: string,
    content: string,
    facts: RawExportFact[]
  ): void {
    if (node.type === 'export_statement') {
      const line = node.startPosition.row + 1;
      const text = content.slice(node.startIndex, node.endIndex);
      const sourceNode = node.childForFieldName('source');
      const viaModule = sourceNode
        ? this.extractStringLiteral(sourceNode, content)
        : undefined;

      // `export * as ns from './x'` — namespace re-export.
      const namespaceExport = node.descendantsOfType('namespace_export')[0];
      if (namespaceExport && sourceNode) {
        const nameNode = namespaceExport.childForFieldName('name')
          ?? namespaceExport.namedChildren.find(c => c.type === 'identifier');
        const local = nameNode
          ? content.slice(nameNode.startIndex, nameNode.endIndex)
          : '*';
        facts.push({
          sourceFile: filePath,
          exportedName: local,
          localName: local,
          kind: 'namespace',
          line,
          viaModule,
        });
        // Recurse into children below — there might be more.
      }

      // `export * from './bar'` — wildcard re-export. Tree-sitter exposes
      // this as an export_statement with a source field but no
      // namespace_export and no export_clause. Encode as a single
      // RawExportFact with exportedName='*', kind='reexport', viaModule set.
      if (sourceNode && !namespaceExport && !node.descendantsOfType('export_clause')[0]) {
        facts.push({
          sourceFile: filePath,
          exportedName: '*',
          localName: '*',
          kind: 'reexport',
          line,
          viaModule,
        });
      }

      // `export { x, y as z } from './m'` (reexport) or `export { x, y as z }` (named).
      const exportClause = node.descendantsOfType('export_clause')[0];
      if (exportClause) {
        for (const spec of exportClause.descendantsOfType('export_specifier')) {
          const nameNode = spec.childForFieldName('name');
          const aliasNode = spec.childForFieldName('alias');
          if (!nameNode) continue;
          const localName = content.slice(nameNode.startIndex, nameNode.endIndex);
          const exportedName = aliasNode
            ? content.slice(aliasNode.startIndex, aliasNode.endIndex)
            : localName;
          facts.push({
            sourceFile: filePath,
            exportedName,
            localName,
            kind: sourceNode ? 'reexport' : 'named',
            line,
            ...(sourceNode ? { viaModule } : {}),
          });
        }
      }

      // `export default ...`
      if (/\bexport\s+default\b/.test(text)) {
        // Attempt to capture the local name when it's a named declaration
        // (`export default function foo(){}` / `export default class Bar {}`).
        let localName = 'default';
        for (const child of node.namedChildren) {
          if (
            child.type === 'function_declaration' ||
            child.type === 'class_declaration'
          ) {
            const nameNode = child.childForFieldName('name');
            if (nameNode) {
              localName = content.slice(nameNode.startIndex, nameNode.endIndex);
              break;
            }
          }
          if (child.type === 'identifier') {
            localName = content.slice(child.startIndex, child.endIndex);
            break;
          }
        }
        facts.push({
          sourceFile: filePath,
          exportedName: 'default',
          localName,
          kind: 'default',
          line,
        });
      }

      // `export const x = ...`, `export function foo(){}`, `export class Bar {}`
      for (const child of node.namedChildren) {
        if (child.type === 'function_declaration' || child.type === 'class_declaration') {
          const nameNode = child.childForFieldName('name');
          if (nameNode) {
            // Skip if this was the default-export branch (already pushed above).
            if (/\bexport\s+default\b/.test(text)) continue;
            const name = content.slice(nameNode.startIndex, nameNode.endIndex);
            facts.push({
              sourceFile: filePath,
              exportedName: name,
              localName: name,
              kind: 'named',
              line,
            });
          }
        } else if (child.type === 'lexical_declaration' || child.type === 'variable_declaration') {
          for (const decl of child.descendantsOfType('variable_declarator')) {
            const nameNode = decl.childForFieldName('name');
            if (nameNode && nameNode.type === 'identifier') {
              const name = content.slice(nameNode.startIndex, nameNode.endIndex);
              facts.push({
                sourceFile: filePath,
                exportedName: name,
                localName: name,
                kind: 'named',
                line,
              });
            }
          }
        }
      }
    }

    for (const child of node.namedChildren) {
      this.walkRawTsExports(child, filePath, content, facts);
    }
  }

  // ========================================================================
  // Python raw imports / calls (lightweight — receiver/scope preserved)
  // ========================================================================

  private walkRawPyImports(
    node: Parser.SyntaxNode,
    filePath: string,
    content: string,
    facts: RawImportFact[]
  ): void {
    if (node.type === 'import_statement') {
      const line = node.startPosition.row + 1;
      for (const dotted of node.descendantsOfType('dotted_name')) {
        facts.push({
          sourceElementId: null,
          sourceFile: filePath,
          moduleSpecifier: content.slice(dotted.startIndex, dotted.endIndex),
          specifiers: [],
          defaultImport: null,
          namespaceImport: null,
          typeOnly: false,
          dynamic: false,
          line,
        });
      }
    } else if (node.type === 'import_from_statement') {
      const line = node.startPosition.row + 1;
      const moduleNode = node.childForFieldName('module_name');
      if (moduleNode) {
        const moduleSpecifier = content.slice(moduleNode.startIndex, moduleNode.endIndex);
        const specifiers: RawImportSpecifier[] = [];
        for (const dotted of node.descendantsOfType('dotted_name').slice(1)) {
          const name = content.slice(dotted.startIndex, dotted.endIndex);
          specifiers.push({ imported: name, local: name });
        }
        facts.push({
          sourceElementId: null,
          sourceFile: filePath,
          moduleSpecifier,
          specifiers,
          defaultImport: null,
          namespaceImport: null,
          typeOnly: false,
          dynamic: false,
          line,
        });
      }
    }

    for (const child of node.namedChildren) {
      this.walkRawPyImports(child, filePath, content, facts);
    }
  }

  private walkRawPyCalls(
    node: Parser.SyntaxNode,
    filePath: string,
    content: string,
    language: string,
    scopePath: string[],
    facts: RawCallFact[]
  ): void {
    if (node.type === 'call') {
      const fn = node.childForFieldName('function');
      if (fn) {
        const callExpressionText = content.slice(node.startIndex, node.endIndex);
        let calleeName = '';
        let receiverText: string | null = null;
        if (fn.type === 'attribute') {
          const objectNode = fn.childForFieldName('object');
          const attrNode = fn.childForFieldName('attribute');
          if (attrNode) calleeName = content.slice(attrNode.startIndex, attrNode.endIndex);
          if (objectNode) receiverText = content.slice(objectNode.startIndex, objectNode.endIndex);
        } else {
          calleeName = content.slice(fn.startIndex, fn.endIndex);
        }
        if (calleeName) {
          facts.push({
            sourceElementCandidate: null,
            sourceFile: filePath,
            callExpressionText,
            calleeName,
            receiverText,
            scopePath: [...scopePath],
            line: node.startPosition.row + 1,
            language,
          });
        }
      }
    }

    let pushed = false;
    if (node.type === 'function_definition' || node.type === 'class_definition') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        scopePath.push(content.slice(nameNode.startIndex, nameNode.endIndex));
        pushed = true;
      }
    }

    for (const child of node.namedChildren) {
      this.walkRawPyCalls(child, filePath, content, language, scopePath, facts);
    }

    if (pushed) scopePath.pop();
  }

  // ========== TypeScript/JavaScript Import Extraction (legacy) ==========

  private extractTypeScriptImports(
    node: Parser.SyntaxNode,
    filePath: string,
    content: string,
    imports: ImportRelationship[]
  ): void {
    if (node.type === 'import_statement') {
      const importClause = node.childForFieldName('import_clause');
      const source = node.childForFieldName('source');

      if (!source) return;

      const target = this.extractStringLiteral(source, content);
      const line = node.startPosition.row + 1;

      const relationship: ImportRelationship = {
        sourceFile: filePath,
        target,
        line,
      };

      if (importClause) {
        // Named imports: import { foo, bar } from 'module'
        const namedImports = importClause.descendantsOfType('import_specifier');
        if (namedImports.length > 0) {
          relationship.specifiers = namedImports.map(spec => {
            const name = spec.childForFieldName('name');
            return name ? content.slice(name.startIndex, name.endIndex) : '';
          }).filter(Boolean);
        }

        // Default import: import Foo from 'module'
        const identifier = importClause.childForFieldName('name');
        if (identifier) {
          relationship.default = content.slice(identifier.startIndex, identifier.endIndex);
        }

        // Namespace import: import * as Foo from 'module'
        const namespaceImport = importClause.descendantsOfType('namespace_import')[0];
        if (namespaceImport) {
          const name = namespaceImport.childForFieldName('name');
          if (name) {
            relationship.namespace = content.slice(name.startIndex, name.endIndex);
          }
        }
      }

      imports.push(relationship);
    } else if (node.type === 'call_expression') {
      // Dynamic import: import('module')
      const func = node.childForFieldName('function');
      if (func && content.slice(func.startIndex, func.endIndex) === 'import') {
        const args = node.childForFieldName('arguments');
        if (args && args.namedChildCount > 0) {
          const firstArg = args.namedChild(0);
          if (firstArg) {
            const target = this.extractStringLiteral(firstArg, content);
            imports.push({
              sourceFile: filePath,
              target,
              dynamic: true,
              line: node.startPosition.row + 1,
            });
          }
        }
      }
    }

    // Recurse through children
    for (const child of node.namedChildren) {
      this.extractTypeScriptImports(child, filePath, content, imports);
    }
  }

  // ========== TypeScript/JavaScript Call Extraction (legacy) ==========

  private extractTypeScriptCalls(
    node: Parser.SyntaxNode,
    filePath: string,
    content: string,
    calls: CallRelationship[],
    currentScope?: string
  ): void {
    if (node.type === 'call_expression') {
      const func = node.childForFieldName('function');
      if (func) {
        const isMethod = func.type === 'member_expression';
        let targetName = '';

        if (isMethod) {
          // Method call: obj.method()
          const property = func.childForFieldName('property');
          if (property) {
            targetName = content.slice(property.startIndex, property.endIndex);
          }
        } else {
          // Function call: foo()
          targetName = content.slice(func.startIndex, func.endIndex);
        }

        if (targetName && currentScope) {
          calls.push({
            source: currentScope,
            target: targetName,
            file: filePath,
            line: node.startPosition.row + 1,
            isMethod,
          });
        }
      }
    }

    // Track scope changes for functions/methods/classes
    let newScope = currentScope;
    if (node.type === 'function_declaration' || node.type === 'method_definition') {
      const name = node.childForFieldName('name');
      if (name) {
        newScope = content.slice(name.startIndex, name.endIndex);
      }
    } else if (node.type === 'class_declaration') {
      const name = node.childForFieldName('name');
      if (name) {
        newScope = content.slice(name.startIndex, name.endIndex);
      }
    }

    // Recurse through children with updated scope
    for (const child of node.namedChildren) {
      this.extractTypeScriptCalls(child, filePath, content, calls, newScope);
    }
  }

  // ========== Python Import Extraction ==========

  private extractPythonImports(
    node: Parser.SyntaxNode,
    filePath: string,
    content: string,
    imports: ImportRelationship[]
  ): void {
    if (node.type === 'import_statement' || node.type === 'import_from_statement') {
      const line = node.startPosition.row + 1;

      if (node.type === 'import_statement') {
        // import foo, bar
        const dottedNames = node.descendantsOfType('dotted_name');
        for (const dottedName of dottedNames) {
          const target = content.slice(dottedName.startIndex, dottedName.endIndex);
          imports.push({
            sourceFile: filePath,
            target,
            line,
          });
        }
      } else {
        // from foo import bar, baz
        const moduleName = node.childForFieldName('module_name');
        if (moduleName) {
          const target = content.slice(moduleName.startIndex, moduleName.endIndex);
          const specifiers: string[] = [];

          const importList = node.descendantsOfType('dotted_name').slice(1); // Skip module name
          for (const spec of importList) {
            specifiers.push(content.slice(spec.startIndex, spec.endIndex));
          }

          imports.push({
            sourceFile: filePath,
            target,
            specifiers: specifiers.length > 0 ? specifiers : undefined,
            line,
          });
        }
      }
    }

    // Recurse through children
    for (const child of node.namedChildren) {
      this.extractPythonImports(child, filePath, content, imports);
    }
  }

  // ========== Python Call Extraction ==========

  private extractPythonCalls(
    node: Parser.SyntaxNode,
    filePath: string,
    content: string,
    calls: CallRelationship[],
    currentScope?: string
  ): void {
    if (node.type === 'call') {
      const func = node.childForFieldName('function');
      if (func) {
        const isMethod = func.type === 'attribute';
        let targetName = '';

        if (isMethod) {
          // Method call: obj.method()
          const attribute = func.childForFieldName('attribute');
          if (attribute) {
            targetName = content.slice(attribute.startIndex, attribute.endIndex);
          }
        } else {
          // Function call: foo()
          targetName = content.slice(func.startIndex, func.endIndex);
        }

        if (targetName && currentScope) {
          calls.push({
            source: currentScope,
            target: targetName,
            file: filePath,
            line: node.startPosition.row + 1,
            isMethod,
          });
        }
      }
    }

    // Track scope changes
    let newScope = currentScope;
    if (node.type === 'function_definition') {
      const name = node.childForFieldName('name');
      if (name) {
        newScope = content.slice(name.startIndex, name.endIndex);
      }
    } else if (node.type === 'class_definition') {
      const name = node.childForFieldName('name');
      if (name) {
        newScope = content.slice(name.startIndex, name.endIndex);
      }
    }

    // Recurse through children
    for (const child of node.namedChildren) {
      this.extractPythonCalls(child, filePath, content, calls, newScope);
    }
  }

  // ========== Go Import Extraction ==========

  private extractGoImports(
    node: Parser.SyntaxNode,
    filePath: string,
    content: string,
    imports: ImportRelationship[]
  ): void {
    if (node.type === 'import_declaration') {
      const importSpecList = node.childForFieldName('specs');
      if (importSpecList) {
        for (const spec of importSpecList.namedChildren) {
          if (spec.type === 'import_spec') {
            const path = spec.childForFieldName('path');
            if (path) {
              const target = this.extractStringLiteral(path, content);
              const name = spec.childForFieldName('name');

              imports.push({
                sourceFile: filePath,
                target,
                default: name ? content.slice(name.startIndex, name.endIndex) : undefined,
                line: spec.startPosition.row + 1,
              });
            }
          }
        }
      }
    }

    // Recurse through children
    for (const child of node.namedChildren) {
      this.extractGoImports(child, filePath, content, imports);
    }
  }

  // ========== Go Call Extraction ==========

  private extractGoCalls(
    node: Parser.SyntaxNode,
    filePath: string,
    content: string,
    calls: CallRelationship[],
    currentScope?: string
  ): void {
    if (node.type === 'call_expression') {
      const func = node.childForFieldName('function');
      if (func) {
        const isMethod = func.type === 'selector_expression';
        let targetName = '';

        if (isMethod) {
          // Method call: obj.Method()
          const field = func.childForFieldName('field');
          if (field) {
            targetName = content.slice(field.startIndex, field.endIndex);
          }
        } else {
          // Function call: Foo()
          targetName = content.slice(func.startIndex, func.endIndex);
        }

        if (targetName && currentScope) {
          calls.push({
            source: currentScope,
            target: targetName,
            file: filePath,
            line: node.startPosition.row + 1,
            isMethod,
          });
        }
      }
    }

    // Track scope changes
    let newScope = currentScope;
    if (node.type === 'function_declaration' || node.type === 'method_declaration') {
      const name = node.childForFieldName('name');
      if (name) {
        newScope = content.slice(name.startIndex, name.endIndex);
      }
    }

    // Recurse through children
    for (const child of node.namedChildren) {
      this.extractGoCalls(child, filePath, content, calls, newScope);
    }
  }

  // ========== Rust Import Extraction ==========

  private extractRustImports(
    node: Parser.SyntaxNode,
    filePath: string,
    content: string,
    imports: ImportRelationship[]
  ): void {
    if (node.type === 'use_declaration') {
      const usePath = node.descendantsOfType('scoped_identifier')[0] ||
                       node.descendantsOfType('identifier')[0];

      if (usePath) {
        const target = content.slice(usePath.startIndex, usePath.endIndex);
        imports.push({
          sourceFile: filePath,
          target,
          line: node.startPosition.row + 1,
        });
      }
    }

    // Recurse through children
    for (const child of node.namedChildren) {
      this.extractRustImports(child, filePath, content, imports);
    }
  }

  // ========== Rust Call Extraction ==========

  private extractRustCalls(
    node: Parser.SyntaxNode,
    filePath: string,
    content: string,
    calls: CallRelationship[],
    currentScope?: string
  ): void {
    if (node.type === 'call_expression') {
      const func = node.childForFieldName('function');
      if (func) {
        const isMethod = func.type === 'field_expression';
        let targetName = '';

        if (isMethod) {
          // Method call: obj.method()
          const field = func.childForFieldName('field');
          if (field) {
            targetName = content.slice(field.startIndex, field.endIndex);
          }
        } else {
          // Function call: foo()
          targetName = content.slice(func.startIndex, func.endIndex);
        }

        if (targetName && currentScope) {
          calls.push({
            source: currentScope,
            target: targetName,
            file: filePath,
            line: node.startPosition.row + 1,
            isMethod,
          });
        }
      }
    }

    // Track scope changes
    let newScope = currentScope;
    if (node.type === 'function_item') {
      const name = node.childForFieldName('name');
      if (name) {
        newScope = content.slice(name.startIndex, name.endIndex);
      }
    }

    // Recurse through children
    for (const child of node.namedChildren) {
      this.extractRustCalls(child, filePath, content, calls, newScope);
    }
  }

  // ========== Java Import Extraction ==========

  private extractJavaImports(
    node: Parser.SyntaxNode,
    filePath: string,
    content: string,
    imports: ImportRelationship[]
  ): void {
    if (node.type === 'import_declaration') {
      const scopedIdentifier = node.descendantsOfType('scoped_identifier')[0];
      if (scopedIdentifier) {
        const target = content.slice(scopedIdentifier.startIndex, scopedIdentifier.endIndex);
        imports.push({
          sourceFile: filePath,
          target,
          line: node.startPosition.row + 1,
        });
      }
    }

    // Recurse through children
    for (const child of node.namedChildren) {
      this.extractJavaImports(child, filePath, content, imports);
    }
  }

  // ========== Java Call Extraction ==========

  private extractJavaCalls(
    node: Parser.SyntaxNode,
    filePath: string,
    content: string,
    calls: CallRelationship[],
    currentScope?: string
  ): void {
    if (node.type === 'method_invocation') {
      const name = node.childForFieldName('name');
      const object = node.childForFieldName('object');

      if (name && currentScope) {
        const targetName = content.slice(name.startIndex, name.endIndex);
        calls.push({
          source: currentScope,
          target: targetName,
          file: filePath,
          line: node.startPosition.row + 1,
          isMethod: !!object,
        });
      }
    }

    // Track scope changes
    let newScope = currentScope;
    if (node.type === 'method_declaration') {
      const name = node.childForFieldName('name');
      if (name) {
        newScope = content.slice(name.startIndex, name.endIndex);
      }
    } else if (node.type === 'class_declaration') {
      const name = node.childForFieldName('name');
      if (name) {
        newScope = content.slice(name.startIndex, name.endIndex);
      }
    }

    // Recurse through children
    for (const child of node.namedChildren) {
      this.extractJavaCalls(child, filePath, content, calls, newScope);
    }
  }

  // ========== C/C++ Import Extraction ==========

  private extractCppImports(
    node: Parser.SyntaxNode,
    filePath: string,
    content: string,
    imports: ImportRelationship[]
  ): void {
    if (node.type === 'preproc_include') {
      const path = node.childForFieldName('path');
      if (path) {
        const target = this.extractStringLiteral(path, content);
        imports.push({
          sourceFile: filePath,
          target,
          line: node.startPosition.row + 1,
        });
      }
    }

    // Recurse through children
    for (const child of node.namedChildren) {
      this.extractCppImports(child, filePath, content, imports);
    }
  }

  // ========== C/C++ Call Extraction ==========

  private extractCppCalls(
    node: Parser.SyntaxNode,
    filePath: string,
    content: string,
    calls: CallRelationship[],
    currentScope?: string
  ): void {
    if (node.type === 'call_expression') {
      const func = node.childForFieldName('function');
      if (func) {
        const isMethod = func.type === 'field_expression';
        let targetName = '';

        if (isMethod) {
          // Method call: obj->method() or obj.method()
          const field = func.childForFieldName('field');
          if (field) {
            targetName = content.slice(field.startIndex, field.endIndex);
          }
        } else {
          // Function call: foo()
          targetName = content.slice(func.startIndex, func.endIndex);
        }

        if (targetName && currentScope) {
          calls.push({
            source: currentScope,
            target: targetName,
            file: filePath,
            line: node.startPosition.row + 1,
            isMethod,
          });
        }
      }
    }

    // Track scope changes
    let newScope = currentScope;
    if (node.type === 'function_definition') {
      const declarator = node.childForFieldName('declarator');
      if (declarator && declarator.type === 'function_declarator') {
        const name = declarator.childForFieldName('declarator');
        if (name) {
          newScope = content.slice(name.startIndex, name.endIndex);
        }
      }
    }

    // Recurse through children
    for (const child of node.namedChildren) {
      this.extractCppCalls(child, filePath, content, calls, newScope);
    }
  }

  // ========== Helper Methods ==========

  /**
   * Extract string literal value from AST node
   * Handles both single and double quoted strings
   */
  private extractStringLiteral(node: Parser.SyntaxNode, content: string): string {
    const text = content.slice(node.startIndex, node.endIndex);
    // Remove quotes
    return text.replace(/^["']|["']$/g, '');
  }
}



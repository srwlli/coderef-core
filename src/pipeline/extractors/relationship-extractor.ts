/**
 * RelationshipExtractor - AST-based import and call relationship extraction
 *
 * WO-UNIFIED-CODEREF-PIPELINE-001 - Phase 2, Task IMPL-003
 *
 * Features:
 * - Import extraction: Static imports, dynamic imports, namespace imports
 * - Call extraction: Function calls, method calls, constructor calls
 * - Support for all 10 languages: ts, tsx, js, jsx, py, go, rs, java, cpp, c
 *
 * Performance:
 * - Single AST traversal per file (same tree used by ElementExtractor)
 * - No regex parsing - pure tree-sitter node matching
 */

import type Parser from 'tree-sitter';
import type { ImportRelationship, CallRelationship } from '../types.js';

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

  // ========== TypeScript/JavaScript Import Extraction ==========

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

  // ========== TypeScript/JavaScript Call Extraction ==========

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

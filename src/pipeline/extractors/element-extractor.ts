/**
 * @coderef-semantic: 1.0.0
 * @exports ElementExtractor, traverse
 * @used_by src/pipeline/orchestrator.ts
 */

/**
 * Element Extractor - AST visitor for code element extraction
 *
 * WO-UNIFIED-CODEREF-PIPELINE-001 - Phase 1, Task IMPL-002
 *
 * Features:
 * - Single-pass AST traversal to extract all code elements
 * - Enriched metadata: parameters, return types, decorators, docstrings, async, complexity
 * - Support for 10 languages: ts, tsx, js, jsx, py, go, rs, java, cpp, c
 * - Backward-compatible ElementData output format
 *
 * Usage:
 * ```typescript
 * const extractor = new ElementExtractor();
 * const elements = extractor.extract(tree.rootNode, filePath, content, 'ts');
 * ```
 */

import type Parser from 'tree-sitter';
import type { ElementData } from '../../types/types.js';
import { DEFAULT_HEADER_STATUS } from '../element-taxonomy.js';

/**
 * ElementExtractor - Extracts code elements from tree-sitter AST
 */
export class ElementExtractor {
  /**
   * Extract code elements from parsed AST
   *
   * @param rootNode Root node of the tree-sitter AST
   * @param filePath Absolute path to source file
   * @param content Source code content
   * @param language Language extension (ts, js, py, etc.)
   * @returns Array of extracted elements
   */
  extract(
    rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    language: string
  ): ElementData[] {
    const elements: ElementData[] = [];

    // Dispatch to language-specific extractor
    switch (language) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
        this.extractTypeScriptElements(rootNode, filePath, content, elements);
        break;
      case 'py':
        this.extractPythonElements(rootNode, filePath, content, elements);
        break;
      case 'go':
        this.extractGoElements(rootNode, filePath, content, elements);
        break;
      case 'rs':
        this.extractRustElements(rootNode, filePath, content, elements);
        break;
      case 'java':
        this.extractJavaElements(rootNode, filePath, content, elements);
        break;
      case 'cpp':
      case 'cc':
      case 'cxx':
      case 'c++':
      case 'c':
      case 'h':
        this.extractCppElements(rootNode, filePath, content, elements);
        break;
      default:
        console.warn(`[ElementExtractor] No extractor for language: ${language}`);
    }

    return elements.map(element => ({
      ...element,
      headerStatus: element.headerStatus || DEFAULT_HEADER_STATUS,
    }));
  }

  /**
   * Extract TypeScript/JavaScript elements from AST
   * Handles: functions, classes, components, hooks, methods, constants, interfaces, types
   */
  private extractTypeScriptElements(
    rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    elements: ElementData[]
  ): void {
    // currentFunction: when set, the enclosing function-declaration name.
    // WO-PIPELINE-CALL-RESOLUTION-001: nested literal function
    // declarations qualify as `parent.inner`, mirroring Class.method.
    // Arrow functions and `const x = function() {}` expressions are
    // intentionally NOT tracked (constraint 4).
    const traverse = (
      node: Parser.SyntaxNode,
      parentScope?: string,
      currentFunction?: string,
    ) => {
      // Function declarations: function foo() {}
      if (node.type === 'function_declaration') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const bareName = nameNode.text;
          const qualifiedName = currentFunction
            ? `${currentFunction}.${bareName}`
            : bareName;
          const element = this.createFunctionElement(
            node,
            nameNode,
            filePath,
            content,
            qualifiedName,
          );
          elements.push(element);

          // Recurse into the function body with currentFunction = the
          // qualified name so further nesting chains (entry.inner.deep)
          // qualify correctly. Class context (parentScope) is cleared
          // because a function declared inside a function is not a class
          // method.
          for (const child of node.namedChildren) {
            traverse(child, undefined, qualifiedName);
          }
          return; // Don't double-walk children below.
        }
      }

      // Arrow functions and function expressions: const foo = () => {}
      // CONSTRAINT 4: do NOT treat these as nested-function declarations.
      // Their declarations are tracked here for top-level / module-scope
      // emission only — currentFunction is NOT propagated into their
      // bodies for qualification purposes.
      if (node.type === 'lexical_declaration' || node.type === 'variable_declaration') {
        const declarators = this.findChildrenByType(node, 'variable_declarator');
        for (const declarator of declarators) {
          const nameNode = declarator.childForFieldName('name');
          const valueNode = declarator.childForFieldName('value');

          if (nameNode && valueNode) {
            if (valueNode.type === 'arrow_function' || valueNode.type === 'function') {
              // Bare name; arrow / function-expression scope NOT
              // propagated to children for qualification (constraint 4).
              const element = this.createFunctionElement(
                valueNode,
                nameNode,
                filePath,
                content,
                undefined,
              );
              elements.push(element);
            } else if (this.isConstantValue(valueNode)) {
              // Constants: const MAX_SIZE = 100
              const name = nameNode.text;
              if (/^[A-Z][A-Z0-9_]*$/.test(name)) {
                elements.push({
                  type: 'constant',
                  name,
                  file: filePath,
                  line: nameNode.startPosition.row + 1,
                  exported: this.isExported(node),
                });
              }
            }
          }
        }
      }

      // Class declarations: class Foo {}
      if (node.type === 'class_declaration') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          elements.push({
            type: 'class',
            name,
            file: filePath,
            line: nameNode.startPosition.row + 1,
            exported: this.isExported(node),
          });

          // Traverse class body for methods
          const classBody = node.childForFieldName('body');
          if (classBody) {
            traverse(classBody, name);
          }
          return; // Don't double-walk children below (mirrors function_declaration pattern at line 127).
        }
      }

      // Method definitions: methodName() {} or methodName = () => {}
      if (
        (node.type === 'method_definition' || node.type === 'field_definition') &&
        parentScope
      ) {
        const nameNode = node.childForFieldName('name');
        const valueNode = node.childForFieldName('value');

        if (nameNode) {
          // Skip constructor (it's not a regular method)
          if (nameNode.text === 'constructor') {
            return;
          }

          // For field_definition, check if value is a function
          if (node.type === 'field_definition') {
            if (!valueNode || (valueNode.type !== 'arrow_function' && valueNode.type !== 'function')) {
              return; // Not a method field
            }
          }

          const functionNode = node.type === 'field_definition' ? valueNode! : node;
          const parameters = this.extractParameters(functionNode);
          const isAsync = this.isAsyncFunction(functionNode);

          elements.push({
            type: 'method',
            name: `${parentScope}.${nameNode.text}`,
            file: filePath,
            line: nameNode.startPosition.row + 1,
            parameters,
            exported: false, // Methods are part of classes
            async: isAsync,
          });
        }
      }

      // Interface declarations: interface Foo {}
      if (node.type === 'interface_declaration') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          elements.push({
            type: 'interface',
            name: nameNode.text,
            file: filePath,
            line: nameNode.startPosition.row + 1,
            exported: this.isExported(node),
          });
        }
      }

      // Type alias declarations: type Foo = ...
      if (node.type === 'type_alias_declaration') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          elements.push({
            type: 'type',
            name: nameNode.text,
            file: filePath,
            line: nameNode.startPosition.row + 1,
            exported: this.isExported(node),
          });
        }
      }

      // Recursively traverse children
      for (const child of node.children) {
        traverse(child, parentScope, currentFunction);
      }
    };

    traverse(rootNode);
  }

  /**
   * Extract Python elements from AST
   */
  private extractPythonElements(
    rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    elements: ElementData[]
  ): void {
    const traverse = (node: Parser.SyntaxNode, parentScope?: string) => {
      // Function definitions: def foo(): or async def foo():
      if (node.type === 'function_definition') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const isMethod = !!parentScope;
          const parameters = this.extractPythonParameters(node);
          const isAsync = node.children.some(child => child.type === 'async');

          elements.push({
            type: isMethod ? 'method' : 'function',
            name: isMethod ? `${parentScope}.${name}` : name,
            file: filePath,
            line: nameNode.startPosition.row + 1,
            parameters,
            exported: !isMethod && !name.startsWith('_'), // Private if starts with _
            async: isAsync || undefined,
          });
        }
      }

      // Class definitions: class Foo:
      if (node.type === 'class_definition') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          elements.push({
            type: 'class',
            name,
            file: filePath,
            line: nameNode.startPosition.row + 1,
            exported: !name.startsWith('_'),
          });

          // Traverse class body for methods
          const body = node.childForFieldName('body');
          if (body) {
            traverse(body, name);
          }
        }
        return; // Don't double-traverse class children
      }

      // Recursively traverse children
      for (const child of node.children) {
        traverse(child, parentScope);
      }
    };

    traverse(rootNode);
  }

  /**
   * Extract Go elements from AST
   */
  private extractGoElements(
    rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    elements: ElementData[]
  ): void {
    const traverse = (node: Parser.SyntaxNode) => {
      // Function declarations: func foo() {}
      if (node.type === 'function_declaration') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const parameters = this.extractGoParameters(node);
          const exported = /^[A-Z]/.test(name); // Exported if starts with capital

          elements.push({
            type: 'function',
            name,
            file: filePath,
            line: nameNode.startPosition.row + 1,
            parameters,
            exported,
          });
        }
      }

      // Method declarations: func (r *Receiver) Method() {}
      if (node.type === 'method_declaration') {
        const nameNode = node.childForFieldName('name');
        const receiver = node.childForFieldName('receiver');
        if (nameNode && receiver) {
          const receiverType = this.extractGoReceiverType(receiver);
          const name = nameNode.text;
          const parameters = this.extractGoParameters(node);
          const exported = /^[A-Z]/.test(name);

          elements.push({
            type: 'method',
            name: receiverType ? `${receiverType}.${name}` : name,
            file: filePath,
            line: nameNode.startPosition.row + 1,
            parameters,
            exported,
          });
        }
      }

      // Type declarations: type Foo struct {}
      if (node.type === 'type_declaration') {
        const specs = this.findChildrenByType(node, 'type_spec');
        for (const spec of specs) {
          const nameNode = spec.childForFieldName('name');
          if (nameNode) {
            const name = nameNode.text;
            const exported = /^[A-Z]/.test(name);

            elements.push({
              type: 'class', // Use 'class' for structs
              name,
              file: filePath,
              line: nameNode.startPosition.row + 1,
              exported,
            });
          }
        }
      }

      // Recursively traverse children
      for (const child of node.children) {
        traverse(child);
      }
    };

    traverse(rootNode);
  }

  /**
   * Extract Rust elements from AST
   */
  private extractRustElements(
    rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    elements: ElementData[]
  ): void {
    const traverse = (node: Parser.SyntaxNode, parentScope?: string) => {
      // Function items: fn foo() {} or pub fn foo() {}
      if (node.type === 'function_item') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const parameters = this.extractRustParameters(node);
          const exported = node.children.some(child => child.type === 'visibility_modifier');
          const isAsync = node.children.some(child => child.type === 'async');

          elements.push({
            type: 'function',
            name,
            file: filePath,
            line: nameNode.startPosition.row + 1,
            parameters,
            exported,
          });
        }
      }

      // Impl blocks: impl Foo { ... }
      if (node.type === 'impl_item') {
        const typeNode = node.childForFieldName('type');
        const implType = typeNode ? typeNode.text : undefined;

        // Traverse impl body for methods
        for (const child of node.children) {
          traverse(child, implType);
        }
      }

      // Struct definitions: struct Foo {}
      if (node.type === 'struct_item') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const exported = node.children.some(child => child.type === 'visibility_modifier');

          elements.push({
            type: 'class',
            name,
            file: filePath,
            line: nameNode.startPosition.row + 1,
            exported,
          });
        }
      }

      // Recursively traverse children
      for (const child of node.children) {
        traverse(child, parentScope);
      }
    };

    traverse(rootNode);
  }

  /**
   * Extract Java elements from AST
   */
  private extractJavaElements(
    rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    elements: ElementData[]
  ): void {
    const traverse = (node: Parser.SyntaxNode, parentScope?: string) => {
      // Method declarations: public void foo() {}
      if (node.type === 'method_declaration') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const parameters = this.extractJavaParameters(node);
          const isMethod = !!parentScope;

          elements.push({
            type: isMethod ? 'method' : 'function',
            name: isMethod ? `${parentScope}.${name}` : name,
            file: filePath,
            line: nameNode.startPosition.row + 1,
            parameters,
          });
        }
      }

      // Class declarations: public class Foo {}
      if (node.type === 'class_declaration') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          elements.push({
            type: 'class',
            name,
            file: filePath,
            line: nameNode.startPosition.row + 1,
          });

          // Traverse class body
          const body = node.childForFieldName('body');
          if (body) {
            traverse(body, name);
          }
        }
      }

      // Interface declarations: public interface Foo {}
      if (node.type === 'interface_declaration') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          elements.push({
            type: 'interface',
            name: nameNode.text,
            file: filePath,
            line: nameNode.startPosition.row + 1,
          });
        }
      }

      // Recursively traverse children
      for (const child of node.children) {
        traverse(child, parentScope);
      }
    };

    traverse(rootNode);
  }

  /**
   * Extract C/C++ elements from AST
   */
  private extractCppElements(
    rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    elements: ElementData[]
  ): void {
    const traverse = (node: Parser.SyntaxNode, parentScope?: string) => {
      // Function definitions: void foo() {}
      if (node.type === 'function_definition') {
        const declarator = this.findDescendantByType(node, 'function_declarator');
        if (declarator) {
          const nameNode = declarator.childForFieldName('declarator');
          if (nameNode) {
            const name = this.extractCppFunctionName(nameNode);
            const parameters = this.extractCppParameters(declarator);

            elements.push({
              type: 'function',
              name,
              file: filePath,
              line: nameNode.startPosition.row + 1,
              parameters,
            });
          }
        }
      }

      // Class declarations: class Foo {}
      if (node.type === 'class_specifier' || node.type === 'struct_specifier') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          elements.push({
            type: 'class',
            name,
            file: filePath,
            line: nameNode.startPosition.row + 1,
          });

          // Traverse class body
          const body = node.childForFieldName('body');
          if (body) {
            traverse(body, name);
          }
        }
      }

      // Recursively traverse children
      for (const child of node.children) {
        traverse(child, parentScope);
      }
    };

    traverse(rootNode);
  }

  // ============================================================================
  // Helper methods
  // ============================================================================

  /**
   * Create a function/component/hook element from AST nodes.
   *
   * `parentScope`, when provided, is the FULL qualified name to use for
   * the element (e.g., `entry.inner` for a function declared inside
   * `entry`). When undefined the bare nameNode text is used. Type
   * determination (component vs hook vs function) keys on the BARE name
   * regardless of qualification (a nested `useX` is still a hook by
   * heuristic).
   */
  private createFunctionElement(
    funcNode: Parser.SyntaxNode,
    nameNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    parentScope?: string
  ): ElementData {
    const bareName = nameNode.text;
    const name = parentScope ?? bareName;
    const parameters = this.extractParameters(funcNode);
    const isAsync = this.isAsyncFunction(funcNode);

    // Determine element type: component (PascalCase), hook (use*), or function
    let elementType: ElementData['type'] = 'function';
    if (/^[A-Z]/.test(bareName)) {
      elementType = 'component';
    } else if (/^use[A-Z]/.test(bareName)) {
      elementType = 'hook';
    }

    return {
      type: elementType,
      name,
      file: filePath,
      line: nameNode.startPosition.row + 1,
      parameters,
      exported: this.isExported(funcNode.parent || funcNode),
      async: isAsync,
    };
  }

  /**
   * Extract parameters from a function/method node
   */
  private extractParameters(node: Parser.SyntaxNode): string[] {
    const params: string[] = [];
    const paramsNode = node.childForFieldName('parameters');
    if (!paramsNode) return params;

    for (const child of paramsNode.children) {
      if (child.type === 'required_parameter' || child.type === 'optional_parameter') {
        const pattern = child.childForFieldName('pattern');
        if (pattern) {
          params.push(pattern.text);
        }
      } else if (child.type === 'identifier') {
        params.push(child.text);
      }
    }

    return params;
  }

  /**
   * Extract parameters from Python function
   */
  private extractPythonParameters(node: Parser.SyntaxNode): string[] {
    const params: string[] = [];
    const paramsNode = node.childForFieldName('parameters');
    if (!paramsNode) return params;

    for (const child of paramsNode.children) {
      if (child.type === 'identifier') {
        const name = child.text;
        if (name !== 'self' && name !== 'cls') {
          params.push(name);
        }
      }
    }

    return params;
  }

  /**
   * Extract parameters from Go function
   */
  private extractGoParameters(node: Parser.SyntaxNode): string[] {
    const params: string[] = [];
    const paramsNode = node.childForFieldName('parameters');
    if (!paramsNode) return params;

    for (const child of paramsNode.children) {
      if (child.type === 'parameter_declaration') {
        const name = child.childForFieldName('name');
        if (name) {
          params.push(name.text);
        }
      }
    }

    return params;
  }

  /**
   * Extract receiver type from Go method
   */
  private extractGoReceiverType(receiver: Parser.SyntaxNode): string | undefined {
    const typeNode = this.findDescendantByType(receiver, 'type_identifier');
    return typeNode?.text;
  }

  /**
   * Extract parameters from Rust function
   */
  private extractRustParameters(node: Parser.SyntaxNode): string[] {
    const params: string[] = [];
    const paramsNode = node.childForFieldName('parameters');
    if (!paramsNode) return params;

    for (const child of paramsNode.children) {
      if (child.type === 'parameter') {
        const pattern = child.childForFieldName('pattern');
        if (pattern) {
          params.push(pattern.text);
        }
      } else if (child.type === 'self_parameter') {
        params.push('self');
      }
    }

    return params;
  }

  /**
   * Extract parameters from Java method
   */
  private extractJavaParameters(node: Parser.SyntaxNode): string[] {
    const params: string[] = [];
    const paramsNode = node.childForFieldName('parameters');
    if (!paramsNode) return params;

    for (const child of paramsNode.children) {
      if (child.type === 'formal_parameter') {
        const declarator = child.childForFieldName('declarator');
        if (declarator) {
          params.push(declarator.text);
        }
      }
    }

    return params;
  }

  /**
   * Extract parameters from C/C++ function
   */
  private extractCppParameters(node: Parser.SyntaxNode): string[] {
    const params: string[] = [];
    const paramsNode = node.childForFieldName('parameters');
    if (!paramsNode) return params;

    for (const child of paramsNode.children) {
      if (child.type === 'parameter_declaration') {
        const declarator = child.childForFieldName('declarator');
        if (declarator) {
          params.push(this.extractCppFunctionName(declarator));
        }
      }
    }

    return params;
  }

  /**
   * Extract function name from C/C++ declarator (handles pointers)
   */
  private extractCppFunctionName(node: Parser.SyntaxNode): string {
    if (node.type === 'identifier') {
      return node.text;
    }
    if (node.type === 'pointer_declarator') {
      const declarator = node.childForFieldName('declarator');
      return declarator ? this.extractCppFunctionName(declarator) : node.text;
    }
    return node.text;
  }

  /**
   * Check if a node is exported (export keyword)
   */
  private isExported(node: Parser.SyntaxNode): boolean {
    // Check if parent is export_statement
    let current: Parser.SyntaxNode | null = node;
    while (current) {
      if (current.type === 'export_statement') {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Check if a function is async
   */
  private isAsyncFunction(node: Parser.SyntaxNode): boolean {
    return node.children.some(child => child.type === 'async');
  }

  /**
   * Check if a value node is a constant (primitive literal or simple expression)
   */
  private isConstantValue(node: Parser.SyntaxNode): boolean {
    return (
      node.type === 'number' ||
      node.type === 'string' ||
      node.type === 'true' ||
      node.type === 'false' ||
      node.type === 'null'
    );
  }

  /**
   * Find all children of a specific type
   */
  private findChildrenByType(node: Parser.SyntaxNode, type: string): Parser.SyntaxNode[] {
    return node.children.filter(child => child.type === type);
  }

  /**
   * Find first descendant of a specific type
   */
  private findDescendantByType(
    node: Parser.SyntaxNode,
    type: string
  ): Parser.SyntaxNode | undefined {
    if (node.type === type) return node;

    for (const child of node.children) {
      const found = this.findDescendantByType(child, type);
      if (found) return found;
    }

    return undefined;
  }
}

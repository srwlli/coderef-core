/**
 * TreeSitterScanner - AST-based code element scanner
 *
 * WO-TREE-SITTER-SCANNER-001
 * Replaces regex patterns with tree-sitter AST parsing for accurate code intelligence.
 *
 * Features:
 * - AST-based parsing for 10 languages (ts, tsx, js, jsx, py, go, rs, java, cpp, c)
 * - Metadata extraction is best-effort. Phase 1 scanner truth does not guarantee
 *   return types, decorators, docstrings, or complexity.
 * - Lazy grammar loading (grammars loaded on first use per language)
 * - Automatic fallback to regex scanner on parse errors
 * - Backward-compatible ElementData output format
 *
 * Performance:
 * - Target: <5s for 500 files (comparable to regex scanner)
 * - Grammar loading overhead: ~50-100ms per language (one-time cost)
 * - Parse overhead: ~10-20ms per file (vs ~5ms for regex)
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports EnrichedElementData, TreeSitterScanner, traverse
 * @used_by src/scanner/scanner.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import Parser from 'tree-sitter';
import { ElementData } from '../types/types.js';
import { DEFAULT_HEADER_STATUS } from '../pipeline/element-taxonomy.js';

/**
 * Type alias for ElementData with tree-sitter enriched fields
 * Uses the extended ElementData interface from types.ts (WO-TREE-SITTER-SCANNER-001)
 *
 * Enriched fields are optional best-effort metadata. Only ElementData base
 * fields, CodeRef identity fields, and taxonomy/headerStatus defaults are
 * scanner contract fields in Phase 1.
 */
export type EnrichedElementData = ElementData;

/**
 * WO-CODEREF-SEMANTIC-INTEGRATION-001: Ensure all elements have required semantic fields
 * Helper to initialize semantic fields with empty arrays for consistency
 */
function normalizeElement(elem: Partial<ElementData>): ElementData {
  return {
    exports: [],
    usedBy: [],
    related: [],
    rules: [],
    ...elem,
    headerStatus: elem.headerStatus || DEFAULT_HEADER_STATUS,
  } as ElementData;
}

/**
 * Grammar loader cache
 * Lazy-loads tree-sitter grammars on first use per language
 */
class GrammarLoader {
  private static grammars: Map<string, any> = new Map();

  /**
   * Language to npm package mapping
   * Maps file extensions to tree-sitter grammar packages
   */
  private static readonly GRAMMAR_PACKAGES: Record<string, string> = {
    ts: 'tree-sitter-typescript',
    tsx: 'tree-sitter-typescript',
    js: 'tree-sitter-javascript',
    jsx: 'tree-sitter-javascript',
    py: 'tree-sitter-python',
    go: 'tree-sitter-go',
    rs: 'tree-sitter-rust',
    java: 'tree-sitter-java',
    cpp: 'tree-sitter-cpp',
    c: 'tree-sitter-cpp' // C uses cpp grammar
  };

  /**
   * Load grammar for a given language
   * Uses lazy loading pattern - grammar loaded only on first call
   *
   * @param lang Language extension (ts, js, py, etc.)
   * @returns Tree-sitter grammar object or null if unavailable
   */
  static async loadGrammar(lang: string): Promise<any | null> {
    // Check cache first
    if (this.grammars.has(lang)) {
      return this.grammars.get(lang) || null;
    }

    const packageName = this.GRAMMAR_PACKAGES[lang];
    if (!packageName) {
      console.warn(`No tree-sitter grammar available for language: ${lang}`);
      return null;
    }

    try {
      // Dynamic import of grammar package
      let grammar;

      // Special handling for TypeScript (has both typescript and tsx grammars)
      if (packageName === 'tree-sitter-typescript') {
        const tsModule = await import('tree-sitter-typescript');
        grammar = lang === 'tsx' ? tsModule.tsx : tsModule.typescript;
      } else {
        // Standard import for other languages
        const module = await import(packageName);
        grammar = module.default || module;
      }

      // Cache the grammar
      this.grammars.set(lang, grammar);

      return grammar;
    } catch (error) {
      console.error(`Failed to load tree-sitter grammar for ${lang}:`, error);
      this.grammars.set(lang, null); // Cache failure to avoid repeated attempts
      return null;
    }
  }

  /**
   * Check if grammar is available for a language
   */
  static isSupported(lang: string): boolean {
    return lang in this.GRAMMAR_PACKAGES;
  }

  /**
   * Clear grammar cache (for testing)
   */
  static clearCache(): void {
    this.grammars.clear();
  }
}

/**
 * TreeSitterScanner - Main scanner class
 *
 * Usage:
 * ```typescript
 * const scanner = new TreeSitterScanner();
 * const elements = await scanner.scanFile('/path/to/file.ts');
 * ```
 */
export class TreeSitterScanner {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  /**
   * Scan a single file and extract code elements
   *
   * @param filePath Absolute path to file
   * @returns Array of enriched code elements
   * @throws Error if file cannot be read or parsed
   */
  async scanFile(filePath: string): Promise<EnrichedElementData[]> {
    // Determine language from file extension
    const ext = path.extname(filePath).substring(1);
    const lang = this.normalizeLanguage(ext);

    // Check if language is supported
    if (!GrammarLoader.isSupported(lang)) {
      throw new Error(`Unsupported language for tree-sitter: ${lang} (file: ${filePath})`);
    }

    // Load grammar (lazy loading)
    const grammar = await GrammarLoader.loadGrammar(lang);
    if (!grammar) {
      throw new Error(`Failed to load tree-sitter grammar for ${lang}`);
    }

    // Set parser language
    this.parser.setLanguage(grammar);

    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');

    // Parse with tree-sitter
    const tree = this.parser.parse(content);

    // Extract elements from AST
    const elements = this.extractElements(tree.rootNode, filePath, content, lang);

    return elements;
  }

  /**
   * Normalize language extension
   * Maps .tsx to .ts, .jsx to .js for grammar loading
   */
  private normalizeLanguage(ext: string): string {
    // TypeScript and JavaScript variants use same grammar
    if (ext === 'tsx') return 'tsx'; // Keep tsx separate for TypeScript TSX grammar
    if (ext === 'jsx') return 'js';
    return ext;
  }

  /**
   * Extract code elements from AST root node
   * Delegates to language-specific extractors
   */
  private extractElements(
    rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    lang: string
  ): EnrichedElementData[] {
    const elements: EnrichedElementData[] = [];

    // Dispatch to language-specific extractor
    switch (lang) {
      case 'ts':
      case 'tsx':
      case 'js':
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
      case 'c':
        this.extractCppElements(rootNode, filePath, content, elements);
        break;
      default:
        throw new Error(`No AST extractor for language: ${lang}`);
    }

    return elements;
  }

  /**
   * Extract TypeScript/JavaScript elements from AST
   * Handles: functions, classes, components, hooks, methods, constants
   */
  private extractTypeScriptElements(
    rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    elements: EnrichedElementData[]
  ): void {
    // Recursive AST traversal
    const traverse = (node: Parser.SyntaxNode, parentScope?: string) => {
      // Function declarations: function foo() {}
      if (node.type === 'function_declaration') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;

          // Determine type: component (PascalCase), hook (use*), or function
          let elementType: ElementData['type'] = 'function';
          if (/^[A-Z]/.test(name)) {
            elementType = 'component';
          } else if (/^use[A-Z]/.test(name)) {
            elementType = 'hook';
          }

          const element = this.createFunctionElement(node, nameNode, filePath, content, parentScope, elementType);
          elements.push(element);
        }
      }

      // Arrow functions: const foo = () => {}
      if (node.type === 'lexical_declaration' || node.type === 'variable_declaration') {
        const declarator = node.descendantsOfType('variable_declarator')[0];
        if (declarator) {
          const nameNode = declarator.childForFieldName('name');
          const valueNode = declarator.childForFieldName('value');

          if (nameNode && valueNode && (valueNode.type === 'arrow_function' || valueNode.type === 'function')) {
            const name = nameNode.text;

            // Determine type: component (PascalCase), hook (use*), constant (ALL_CAPS), or function
            let elementType: ElementData['type'] = 'function';
            if (/^[A-Z]/.test(name)) {
              elementType = 'component';
            } else if (/^use[A-Z]/.test(name)) {
              elementType = 'hook';
            } else if (/^[A-Z][A-Z0-9_]*$/.test(name)) {
              elementType = 'constant';
            }

            const element = this.createFunctionElement(valueNode, nameNode, filePath, content, parentScope, elementType);
            elements.push(element);
          }
        }
      }

      // Class declarations: class Foo {}
      if (node.type === 'class_declaration') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const line = nameNode.startPosition.row + 1;

          elements.push({
            type: 'class',
            name,
            file: filePath,
            line,
            exported: this.isExported(node),
            decorators: this.extractDecorators(node, content)
          });

          // Extract methods within class
          const classBody = node.childForFieldName('body');
          if (classBody) {
            traverse(classBody, name); // Pass class name as parent scope
          }
        }
      }

      // Method definitions: methodName() {}
      if (node.type === 'method_definition' && parentScope) {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const element = this.createMethodElement(node, nameNode, filePath, content, parentScope);
          elements.push(element);
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
   * Extract Python elements from AST
   * Handles: functions, async functions, classes, methods, decorators, docstrings
   */
  private extractPythonElements(
    rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    elements: EnrichedElementData[]
  ): void {
    // Recursive AST traversal
    const traverse = (node: Parser.SyntaxNode, parentScope?: string) => {
      // Function definitions: def foo(): or async def foo():
      if (node.type === 'function_definition') {

        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const line = nameNode.startPosition.row + 1;
          const isAsync = this.isPythonAsync(node);

          // Check if this is a method (inside a class) vs top-level function
          const elementType: ElementData['type'] = parentScope ? 'method' : 'function';

          elements.push({
            type: elementType,
            name,
            file: filePath,
            line,
            exported: true, // Python doesn't have explicit export keyword
            async: isAsync || undefined,
            parameters: this.extractPythonParameters(node, content),
            returnType: this.extractPythonReturnType(node, content),
            decorators: this.extractPythonDecorators(node, content),
            docstring: this.extractPythonDocstring(node, content),
            parentScope,
            complexity: this.estimateComplexity(node)
          });
        }
      }

      // Class definitions: class Foo:
      if (node.type === 'class_definition') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const line = nameNode.startPosition.row + 1;

          elements.push({
            type: 'class',
            name,
            file: filePath,
            line,
            exported: true,
            decorators: this.extractPythonDecorators(node, content),
            docstring: this.extractPythonDocstring(node, content)
          });

          // Extract methods within class
          const classBody = node.childForFieldName('body');
          if (classBody) {
            traverse(classBody, name); // Pass class name as parent scope
          }
        }
      }

      // Recursively traverse children (but skip class bodies already handled)
      if (node.type !== 'class_definition') {
        for (const child of node.children) {
          traverse(child, parentScope);
        }
      }
    };

    traverse(rootNode);
  }

  /**
   * Check if Python function is async
   */
  private isPythonAsync(node: Parser.SyntaxNode): boolean {
    // Check for 'async' keyword before 'def'
    const asyncModifier = node.children.find(child => child.type === 'async' || child.text === 'async');
    return !!asyncModifier;
  }

  /**
   * Extract Python function parameters with type hints
   * Example: def foo(a: int, b: str = "default") -> int:
   */
  private extractPythonParameters(node: Parser.SyntaxNode, content: string): Array<{ name: string; type?: string }> | undefined {
    const params: Array<{ name: string; type?: string }> = [];

    // Find parameters node
    const paramsNode = node.childForFieldName('parameters');
    if (!paramsNode) return undefined;

    // Extract each parameter
    for (const param of paramsNode.namedChildren) {
      if (param.type === 'identifier') {
        // Simple parameter without type hint
        params.push({ name: param.text });
      } else if (param.type === 'typed_parameter' || param.type === 'default_parameter') {
        // Parameter with type hint: a: int or a: int = 5
        const nameNode = param.childForFieldName('name') || param.children.find(c => c.type === 'identifier');
        const typeNode = param.childForFieldName('type');

        if (nameNode) {
          params.push({
            name: nameNode.text,
            type: typeNode ? typeNode.text : undefined
          });
        }
      }
    }

    // Filter out 'self' and 'cls' parameters
    const filteredParams = params.filter(p => p.name !== 'self' && p.name !== 'cls');
    return filteredParams.length > 0 ? filteredParams : undefined;
  }

  /**
   * Extract Python return type annotation
   * Example: def foo() -> int:
   */
  private extractPythonReturnType(node: Parser.SyntaxNode, content: string): string | undefined {
    const returnTypeNode = node.childForFieldName('return_type');
    return returnTypeNode ? returnTypeNode.text : undefined;
  }

  /**
   * Extract Python decorators
   * Example: @staticmethod, @property, @app.route('/api')
   */
  private extractPythonDecorators(node: Parser.SyntaxNode, content: string): string[] | undefined {
    const decorators: string[] = [];

    // Search for decorated_definition parent
    let current = node.parent;
    while (current && current.type !== 'decorated_definition') {
      current = current.parent;
    }

    if (current && current.type === 'decorated_definition') {
      // Find all decorator nodes
      for (const child of current.children) {
        if (child.type === 'decorator') {
          // Extract decorator name (remove @ symbol)
          const decoratorText = child.text.replace(/^@/, '').split('(')[0].trim();
          decorators.push(decoratorText);
        }
      }
    }

    return decorators.length > 0 ? decorators : undefined;
  }

  /**
   * Extract Python docstring
   * Looks for string literal immediately after function/class definition
   */
  private extractPythonDocstring(node: Parser.SyntaxNode, content: string): string | undefined {
    // Get the body of the function/class
    const bodyNode = node.childForFieldName('body');
    if (!bodyNode) return undefined;

    // First statement in body should be the docstring
    const firstChild = bodyNode.namedChildren[0];
    if (!firstChild) return undefined;

    // Check if first statement is an expression_statement containing a string
    if (firstChild.type === 'expression_statement') {
      const stringNode = firstChild.namedChildren[0];
      if (stringNode && stringNode.type === 'string') {
        // Extract string content, remove quotes
        let docstring = stringNode.text;

        // Remove triple quotes (""" or ''')
        docstring = docstring.replace(/^('''|""")\s*/, '').replace(/\s*('''|""")$/, '');
        // Remove single quotes
        docstring = docstring.replace(/^["']\s*/, '').replace(/\s*["']$/, '');

        return docstring.trim();
      }
    }

    return undefined;
  }

  /**
   * Extract Go elements from AST
   * Handles: functions, methods, structs, interfaces
   */
  private extractGoElements(
    rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    elements: EnrichedElementData[]
  ): void {
    // Recursive AST traversal
    const traverse = (node: Parser.SyntaxNode, parentScope?: string) => {
      // Function declarations: func FunctionName(...) {...}
      if (node.type === 'function_declaration') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const line = nameNode.startPosition.row + 1;

          elements.push({
            type: 'function',
            name,
            file: filePath,
            line,
            exported: this.isGoExported(name),
            parameters: this.extractGoParameters(node, content),
            returnType: this.extractGoReturnType(node, content),
            docstring: this.extractGoDocstring(node, content),
            complexity: this.estimateComplexity(node)
          });
        }
      }

      // Method declarations: func (receiver Type) MethodName(...) {...}
      if (node.type === 'method_declaration') {
        const nameNode = node.childForFieldName('name');
        const receiverNode = node.childForFieldName('receiver');

        if (nameNode) {
          const name = nameNode.text;
          const line = nameNode.startPosition.row + 1;

          // Extract receiver type as parent scope
          let receiverType: string | undefined;
          if (receiverNode) {
            // Find type identifier in receiver
            const typeNode = receiverNode.descendantsOfType('type_identifier')[0] ||
                           receiverNode.descendantsOfType('pointer_type')[0];
            if (typeNode) {
              receiverType = typeNode.text.replace(/^\*/, ''); // Remove pointer marker
            }
          }

          elements.push({
            type: 'method',
            name,
            file: filePath,
            line,
            exported: this.isGoExported(name),
            parameters: this.extractGoParameters(node, content),
            returnType: this.extractGoReturnType(node, content),
            docstring: this.extractGoDocstring(node, content),
            parentScope: receiverType,
            complexity: this.estimateComplexity(node)
          });
        }
      }

      // Type declarations: type StructName struct {...} or type InterfaceName interface {...}
      if (node.type === 'type_declaration') {
        const typeSpec = node.childForFieldName('type');
        if (typeSpec) {
          const nameNode = typeSpec.childForFieldName('name');
          const typeValue = typeSpec.childForFieldName('type');

          if (nameNode && typeValue) {
            const name = nameNode.text;
            const line = nameNode.startPosition.row + 1;

            // Determine if struct or interface
            const isStruct = typeValue.type === 'struct_type';

            elements.push({
              type: 'class', // Use 'class' for both structs and interfaces
              name,
              file: filePath,
              line,
              exported: this.isGoExported(name),
              docstring: this.extractGoDocstring(node, content)
            });
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

  /**
   * Check if Go identifier is exported (starts with uppercase)
   */
  private isGoExported(name: string): boolean {
    return name.length > 0 && name[0] === name[0].toUpperCase();
  }

  /**
   * Extract Go function/method parameters
   * Example: func foo(a int, b string) or func foo(a, b int)
   */
  private extractGoParameters(node: Parser.SyntaxNode, content: string): Array<{ name: string; type?: string }> | undefined {
    const params: Array<{ name: string; type?: string }> = [];

    // Find parameter_list node
    const paramsNode = node.childForFieldName('parameters');
    if (!paramsNode) return undefined;

    // Extract each parameter
    for (const param of paramsNode.namedChildren) {
      if (param.type === 'parameter_declaration') {
        // Can have multiple names: a, b int
        const nameNodes = param.children.filter(c => c.type === 'identifier');
        const typeNode = param.children.find(c => c.type !== 'identifier' && c.type !== ',');

        for (const nameNode of nameNodes) {
          params.push({
            name: nameNode.text,
            type: typeNode ? typeNode.text : undefined
          });
        }
      }
    }

    return params.length > 0 ? params : undefined;
  }

  /**
   * Extract Go return type
   * Example: func foo() int or func foo() (int, error)
   */
  private extractGoReturnType(node: Parser.SyntaxNode, content: string): string | undefined {
    const resultNode = node.childForFieldName('result');
    if (!resultNode) return undefined;

    // Single return type: int, string, etc.
    if (resultNode.type === 'type_identifier' || resultNode.type === 'pointer_type') {
      return resultNode.text;
    }

    // Multiple return types: (int, error)
    if (resultNode.type === 'parameter_list') {
      const types = resultNode.namedChildren
        .map(child => child.text)
        .join(', ');
      return `(${types})`;
    }

    return undefined;
  }

  /**
   * Extract Go doc comment
   * Go uses // comments before declarations
   */
  private extractGoDocstring(node: Parser.SyntaxNode, content: string): string | undefined {
    // Search for comment nodes before the function/type
    let current = node.previousSibling;
    const commentLines: string[] = [];

    while (current && current.type === 'comment') {
      // Extract comment text, remove // prefix
      const commentText = current.text.replace(/^\/\/\s*/, '');
      commentLines.unshift(commentText);
      current = current.previousSibling;
    }

    return commentLines.length > 0 ? commentLines.join('\n').trim() : undefined;
  }

  /**
   * Extract Rust elements from AST
   * Handles: functions, structs, enums, impl blocks, traits
   */
  private extractRustElements(
    rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    elements: EnrichedElementData[]
  ): void {
    // Recursive AST traversal
    const traverse = (node: Parser.SyntaxNode, parentScope?: string) => {
      // Function declarations: fn function_name(...) or pub fn function_name(...)
      if (node.type === 'function_item') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const line = nameNode.startPosition.row + 1;
          const isAsync = this.isRustAsync(node);

          elements.push({
            type: parentScope ? 'method' : 'function',
            name,
            file: filePath,
            line,
            exported: this.isRustPublic(node),
            async: isAsync || undefined,
            parameters: this.extractRustParameters(node, content),
            returnType: this.extractRustReturnType(node, content),
            docstring: this.extractRustDocstring(node, content),
            parentScope,
            complexity: this.estimateComplexity(node)
          });
        }
      }

      // Struct declarations: struct StructName or pub struct StructName
      if (node.type === 'struct_item') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const line = nameNode.startPosition.row + 1;

          elements.push({
            type: 'class',
            name,
            file: filePath,
            line,
            exported: this.isRustPublic(node),
            docstring: this.extractRustDocstring(node, content)
          });
        }
      }

      // Enum declarations: enum EnumName or pub enum EnumName
      if (node.type === 'enum_item') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const line = nameNode.startPosition.row + 1;

          elements.push({
            type: 'class',
            name,
            file: filePath,
            line,
            exported: this.isRustPublic(node),
            docstring: this.extractRustDocstring(node, content)
          });
        }
      }

      // Trait declarations: trait TraitName or pub trait TraitName
      if (node.type === 'trait_item') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const line = nameNode.startPosition.row + 1;

          elements.push({
            type: 'class',
            name,
            file: filePath,
            line,
            exported: this.isRustPublic(node),
            docstring: this.extractRustDocstring(node, content)
          });
        }
      }

      // Impl blocks: impl StructName { fn method() {} }
      if (node.type === 'impl_item') {
        const typeNode = node.childForFieldName('type');
        if (typeNode) {
          const implType = typeNode.text;

          // Traverse body for methods
          const bodyNode = node.childForFieldName('body');
          if (bodyNode) {
            traverse(bodyNode, implType);
          }
        }
      }

      // Recursively traverse children (skip impl bodies already handled)
      if (node.type !== 'impl_item') {
        for (const child of node.children) {
          traverse(child, parentScope);
        }
      }
    };

    traverse(rootNode);
  }

  /**
   * Check if Rust item is public (has pub keyword)
   */
  private isRustPublic(node: Parser.SyntaxNode): boolean {
    // Check for 'pub' visibility modifier
    const visibilityNode = node.childForFieldName('visibility');
    return !!visibilityNode;
  }

  /**
   * Check if Rust function is async
   */
  private isRustAsync(node: Parser.SyntaxNode): boolean {
    // Check for 'async' keyword in function modifiers
    return node.children.some(child => child.type === 'async' || child.text === 'async');
  }

  /**
   * Extract Rust function parameters
   * Example: fn foo(a: i32, b: String)
   */
  private extractRustParameters(node: Parser.SyntaxNode, content: string): Array<{ name: string; type?: string }> | undefined {
    const params: Array<{ name: string; type?: string }> = [];

    // Find parameters node
    const paramsNode = node.childForFieldName('parameters');
    if (!paramsNode) return undefined;

    // Extract each parameter
    for (const param of paramsNode.namedChildren) {
      if (param.type === 'parameter') {
        const patternNode = param.childForFieldName('pattern');
        const typeNode = param.childForFieldName('type');

        if (patternNode) {
          // Extract identifier from pattern (can be identifier or self)
          let name: string;
          if (patternNode.type === 'identifier') {
            name = patternNode.text;
          } else if (patternNode.type === 'self') {
            name = 'self';
          } else {
            // Complex pattern, use full text
            name = patternNode.text;
          }

          // Skip 'self' parameter
          if (name !== 'self') {
            params.push({
              name,
              type: typeNode ? typeNode.text : undefined
            });
          }
        }
      }
    }

    return params.length > 0 ? params : undefined;
  }

  /**
   * Extract Rust return type
   * Example: fn foo() -> i32
   */
  private extractRustReturnType(node: Parser.SyntaxNode, content: string): string | undefined {
    const returnTypeNode = node.childForFieldName('return_type');
    return returnTypeNode ? returnTypeNode.text.replace(/^->\s*/, '') : undefined;
  }

  /**
   * Extract Rust doc comment
   * Rust uses /// for outer doc comments and //! for inner doc comments
   */
  private extractRustDocstring(node: Parser.SyntaxNode, content: string): string | undefined {
    // Search for comment nodes before the item
    let current = node.previousSibling;
    const commentLines: string[] = [];

    while (current && (current.type === 'line_comment' || current.type === 'block_comment')) {
      let commentText = current.text;

      // Handle /// doc comments
      if (commentText.startsWith('///')) {
        commentText = commentText.replace(/^\/\/\/\s*/, '');
        commentLines.unshift(commentText);
      }
      // Handle //! inner doc comments
      else if (commentText.startsWith('//!')) {
        commentText = commentText.replace(/^\/\/!\s*/, '');
        commentLines.unshift(commentText);
      }

      current = current.previousSibling;
    }

    return commentLines.length > 0 ? commentLines.join('\n').trim() : undefined;
  }

  /**
   * Extract Java elements from AST
   * Handles: classes, interfaces, enums, methods, annotations
   */
  private extractJavaElements(
    rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    elements: EnrichedElementData[]
  ): void {
    // Recursive AST traversal
    const traverse = (node: Parser.SyntaxNode, parentScope?: string) => {
      // Class declarations: class ClassName or public class ClassName
      if (node.type === 'class_declaration') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const line = nameNode.startPosition.row + 1;

          elements.push({
            type: 'class',
            name,
            file: filePath,
            line,
            exported: this.isJavaPublic(node),
            decorators: this.extractJavaAnnotations(node, content),
            docstring: this.extractJavaDocstring(node, content)
          });

          // Extract methods within class
          const classBody = node.childForFieldName('body');
          if (classBody) {
            traverse(classBody, name);
          }
        }
      }

      // Interface declarations: interface InterfaceName
      if (node.type === 'interface_declaration') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const line = nameNode.startPosition.row + 1;

          elements.push({
            type: 'class',
            name,
            file: filePath,
            line,
            exported: this.isJavaPublic(node),
            decorators: this.extractJavaAnnotations(node, content),
            docstring: this.extractJavaDocstring(node, content)
          });

          // Extract methods within interface
          const interfaceBody = node.childForFieldName('body');
          if (interfaceBody) {
            traverse(interfaceBody, name);
          }
        }
      }

      // Enum declarations: enum EnumName
      if (node.type === 'enum_declaration') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const line = nameNode.startPosition.row + 1;

          elements.push({
            type: 'class',
            name,
            file: filePath,
            line,
            exported: this.isJavaPublic(node),
            decorators: this.extractJavaAnnotations(node, content),
            docstring: this.extractJavaDocstring(node, content)
          });
        }
      }

      // Method declarations
      if (node.type === 'method_declaration') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const line = nameNode.startPosition.row + 1;

          elements.push({
            type: 'method',
            name,
            file: filePath,
            line,
            exported: this.isJavaPublic(node),
            parameters: this.extractJavaParameters(node, content),
            returnType: this.extractJavaReturnType(node, content),
            decorators: this.extractJavaAnnotations(node, content),
            docstring: this.extractJavaDocstring(node, content),
            parentScope,
            complexity: this.estimateComplexity(node)
          });
        }
      }

      // Constructor declarations
      if (node.type === 'constructor_declaration') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const line = nameNode.startPosition.row + 1;

          elements.push(normalizeElement({
            type: 'method',
            name,
            file: filePath,
            line,
            exported: this.isJavaPublic(node),
            parameters: this.extractJavaParameters(node, content),
            decorators: this.extractJavaAnnotations(node, content),
            docstring: this.extractJavaDocstring(node, content),
            parentScope,
            complexity: this.estimateComplexity(node)
          }));
        }
      }

      // Recursively traverse children (skip class/interface bodies already handled)
      if (node.type !== 'class_declaration' && node.type !== 'interface_declaration') {
        for (const child of node.children) {
          traverse(child, parentScope);
        }
      }
    };

    traverse(rootNode);
  }

  /**
   * Check if Java element is public
   */
  private isJavaPublic(node: Parser.SyntaxNode): boolean {
    // Check for 'public' modifier
    const modifiers = node.children.filter(c => c.type === 'modifiers');
    for (const modifier of modifiers) {
      if (modifier.text.includes('public')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Extract Java method parameters
   * Example: void foo(int a, String b)
   */
  private extractJavaParameters(node: Parser.SyntaxNode, content: string): Array<{ name: string; type?: string }> | undefined {
    const params: Array<{ name: string; type?: string }> = [];

    // Find formal_parameters node
    const paramsNode = node.childForFieldName('parameters');
    if (!paramsNode) return undefined;

    // Extract each parameter
    for (const param of paramsNode.namedChildren) {
      if (param.type === 'formal_parameter') {
        const typeNode = param.childForFieldName('type');
        const nameNode = param.childForFieldName('name');

        if (nameNode) {
          params.push({
            name: nameNode.text,
            type: typeNode ? typeNode.text : undefined
          });
        }
      }
    }

    return params.length > 0 ? params : undefined;
  }

  /**
   * Extract Java return type
   * Example: public int foo() or public String foo()
   */
  private extractJavaReturnType(node: Parser.SyntaxNode, content: string): string | undefined {
    const typeNode = node.childForFieldName('type');
    return typeNode ? typeNode.text : undefined;
  }

  /**
   * Extract Java annotations
   * Example: @Override, @Deprecated, @RequestMapping("/api")
   */
  private extractJavaAnnotations(node: Parser.SyntaxNode, content: string): string[] | undefined {
    const annotations: string[] = [];

    // Search for marker_annotation, annotation nodes
    for (const child of node.children) {
      if (child.type === 'marker_annotation' || child.type === 'annotation') {
        // Extract annotation name (remove @ symbol)
        const annotationText = child.text.replace(/^@/, '').split('(')[0];
        annotations.push(annotationText);
      }
    }

    return annotations.length > 0 ? annotations : undefined;
  }

  /**
   * Extract Java Javadoc comment
   * Javadoc uses block comment format with double asterisks
   */
  private extractJavaDocstring(node: Parser.SyntaxNode, content: string): string | undefined {
    // Search for comment nodes before the declaration
    let current = node.previousSibling;

    while (current) {
      if (current.type === 'block_comment' && current.text.startsWith('/**')) {
        // Extract Javadoc content, remove /** and */
        let javadoc = current.text;
        javadoc = javadoc.replace(/^\/\*\*\s*/g, '').replace(/\s*\*\/$/g, '');

        // Clean up asterisks at the beginning of lines
        return javadoc
          .split('\n')
          .map(line => line.replace(/^\s*\*\s?/g, ''))
          .join('\n')
          .trim();
      }

      current = current.previousSibling;
    }

    return undefined;
  }

  /**
   * Extract C++/C elements from AST
   * Handles: functions, classes, structs
   */
  private extractCppElements(
    rootNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    elements: EnrichedElementData[]
  ): void {
    // Recursive AST traversal
    const traverse = (node: Parser.SyntaxNode, parentScope?: string) => {
      // Function definitions: ReturnType functionName(...) {...}
      if (node.type === 'function_definition') {
        const declarator = node.childForFieldName('declarator');
        if (declarator) {
          const nameNode = this.extractCppFunctionName(declarator);
          if (nameNode) {
            const name = nameNode.text;
            const line = nameNode.startPosition.row + 1;

            elements.push({
              type: parentScope ? 'method' : 'function',
              name,
              file: filePath,
              line,
              exported: true, // C++ doesn't have explicit export in the same way
              parameters: this.extractCppParameters(declarator, content),
              returnType: this.extractCppReturnType(node, content),
              docstring: this.extractCppDocstring(node, content),
              parentScope,
              complexity: this.estimateComplexity(node)
            });
          }
        }
      }

      // Class declarations: class ClassName {...}
      if (node.type === 'class_specifier') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const line = nameNode.startPosition.row + 1;

          elements.push({
            type: 'class',
            name,
            file: filePath,
            line,
            exported: true,
            docstring: this.extractCppDocstring(node, content)
          });

          // Extract methods within class
          const classBody = node.childForFieldName('body');
          if (classBody) {
            traverse(classBody, name);
          }
        }
      }

      // Struct declarations: struct StructName {...}
      if (node.type === 'struct_specifier') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const line = nameNode.startPosition.row + 1;

          elements.push({
            type: 'class',
            name,
            file: filePath,
            line,
            exported: true,
            docstring: this.extractCppDocstring(node, content)
          });

          // Extract methods within struct
          const structBody = node.childForFieldName('body');
          if (structBody) {
            traverse(structBody, name);
          }
        }
      }

      // Recursively traverse children (skip class/struct bodies already handled)
      if (node.type !== 'class_specifier' && node.type !== 'struct_specifier') {
        for (const child of node.children) {
          traverse(child, parentScope);
        }
      }
    };

    traverse(rootNode);
  }

  /**
   * Extract function name from C++ declarator
   * Handles complex declarators like qualified_identifier, field_identifier
   */
  private extractCppFunctionName(declarator: Parser.SyntaxNode): Parser.SyntaxNode | null {
    // Direct identifier
    if (declarator.type === 'identifier') {
      return declarator;
    }

    // Function declarator: identifier(...)
    if (declarator.type === 'function_declarator') {
      const innerDeclarator = declarator.childForFieldName('declarator');
      if (innerDeclarator) {
        return this.extractCppFunctionName(innerDeclarator);
      }
    }

    // Pointer declarator: *identifier
    if (declarator.type === 'pointer_declarator') {
      const innerDeclarator = declarator.childForFieldName('declarator');
      if (innerDeclarator) {
        return this.extractCppFunctionName(innerDeclarator);
      }
    }

    // Qualified identifier: ClassName::methodName
    if (declarator.type === 'qualified_identifier') {
      const nameNode = declarator.childForFieldName('name');
      if (nameNode) {
        return nameNode;
      }
    }

    // Field identifier (for methods)
    if (declarator.type === 'field_identifier') {
      return declarator;
    }

    // Search for identifier in children
    for (const child of declarator.children) {
      if (child.type === 'identifier' || child.type === 'field_identifier') {
        return child;
      }
    }

    return null;
  }

  /**
   * Extract C++ function parameters
   * Example: void foo(int a, string b)
   */
  private extractCppParameters(declarator: Parser.SyntaxNode, content: string): Array<{ name: string; type?: string }> | undefined {
    const params: Array<{ name: string; type?: string }> = [];

    // Find parameter_list
    let current: Parser.SyntaxNode | null = declarator;
    while (current) {
      if (current.type === 'parameter_list') {
        break;
      }
      // Search in children
      const paramList = current.children.find(c => c.type === 'parameter_list');
      if (paramList) {
        current = paramList;
        break;
      }
      current = null;
    }

    if (!current) return undefined;

    // Extract each parameter
    for (const param of current.namedChildren) {
      if (param.type === 'parameter_declaration') {
        const typeNode = param.childForFieldName('type');
        const declaratorNode = param.childForFieldName('declarator');

        let name: string | undefined;
        if (declaratorNode) {
          // Extract identifier from declarator
          const identifier = this.extractCppIdentifier(declaratorNode);
          name = identifier?.text;
        }

        if (name) {
          params.push({
            name,
            type: typeNode ? typeNode.text : undefined
          });
        }
      }
    }

    return params.length > 0 ? params : undefined;
  }

  /**
   * Extract identifier from C++ declarator
   */
  private extractCppIdentifier(declarator: Parser.SyntaxNode): Parser.SyntaxNode | null {
    if (declarator.type === 'identifier') {
      return declarator;
    }

    for (const child of declarator.children) {
      if (child.type === 'identifier') {
        return child;
      }
      const nested = this.extractCppIdentifier(child);
      if (nested) return nested;
    }

    return null;
  }

  /**
   * Extract C++ return type
   */
  private extractCppReturnType(node: Parser.SyntaxNode, content: string): string | undefined {
    const typeNode = node.childForFieldName('type');
    return typeNode ? typeNode.text : undefined;
  }

  /**
   * Extract C++ doc comment
   * C++ uses triple-slash or block comment format for documentation
   */
  private extractCppDocstring(node: Parser.SyntaxNode, content: string): string | undefined {
    // Search for comment nodes before the declaration
    let current = node.previousSibling;
    const commentLines: string[] = [];

    while (current && current.type === 'comment') {
      let commentText = current.text;

      // Handle /// doc comments
      if (commentText.startsWith('///')) {
        commentText = commentText.replace(/^\/\/\/\s*/, '');
        commentLines.unshift(commentText);
      }
      // Handle /** ... */ doc comments
      else if (commentText.startsWith('/**')) {
        commentText = commentText.replace(/^\/\*\*\s*/, '').replace(/\s*\*\/$/, '');
        // Clean up asterisks at the beginning of lines
        const lines = commentText
          .split('\n')
          .map(line => line.replace(/^\s*\*\s?/, ''));
        commentLines.unshift(...lines);
      }
      // Handle // comments
      else if (commentText.startsWith('//')) {
        commentText = commentText.replace(/^\/\/\s*/, '');
        commentLines.unshift(commentText);
      }

      current = current.previousSibling;
    }

    return commentLines.length > 0 ? commentLines.join('\n').trim() : undefined;
  }

  /**
   * Create enriched function element from AST node
   */
  private createFunctionElement(
    funcNode: Parser.SyntaxNode,
    nameNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    parentScope?: string,
    elementType: ElementData['type'] = 'function'
  ): EnrichedElementData {
    const name = nameNode.text;
    const line = nameNode.startPosition.row + 1;

    return {
      type: elementType,
      name,
      file: filePath,
      line,
      exported: this.isExported(funcNode),
      async: this.isAsync(funcNode),
      parameters: this.extractParameters(funcNode, content),
      returnType: this.extractReturnType(funcNode, content),
      decorators: this.extractDecorators(funcNode, content),
      docstring: this.extractDocstring(funcNode, content),
      parentScope,
      complexity: this.estimateComplexity(funcNode)
    };
  }

  /**
   * Create enriched method element from AST node
   */
  private createMethodElement(
    methodNode: Parser.SyntaxNode,
    nameNode: Parser.SyntaxNode,
    filePath: string,
    content: string,
    parentScope: string
  ): EnrichedElementData {
    const name = nameNode.text;
    const line = nameNode.startPosition.row + 1;

    return {
      type: 'method',
      name,
      file: filePath,
      line,
      exported: false, // Methods are not directly exported
      async: this.isAsync(methodNode),
      parameters: this.extractParameters(methodNode, content),
      returnType: this.extractReturnType(methodNode, content),
      decorators: this.extractDecorators(methodNode, content),
      docstring: this.extractDocstring(methodNode, content),
      parentScope,
      complexity: this.estimateComplexity(methodNode)
    };
  }

  /**
   * Check if node is exported
   */
  private isExported(node: Parser.SyntaxNode): boolean {
    // Check if node or parent has 'export' keyword
    let current: Parser.SyntaxNode | null = node;
    while (current) {
      if (current.type === 'export_statement' || current.text.startsWith('export ')) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Check if function/method is async
   */
  private isAsync(node: Parser.SyntaxNode): boolean {
    // Check for 'async' keyword in node text
    // More robust: search for async modifier in AST
    const asyncModifier = node.children.find(child => child.type === 'async' || child.text === 'async');
    return !!asyncModifier;
  }

  /**
   * Extract parameter list from function/method node
   * Returns array of {name, type} objects
   */
  private extractParameters(node: Parser.SyntaxNode, content: string): Array<{ name: string; type?: string }> | undefined {
    const params: Array<{ name: string; type?: string }> = [];

    // Find formal_parameters or parameters node
    const paramsNode = node.childForFieldName('parameters') ||
                       node.descendantsOfType('formal_parameters')[0];

    if (!paramsNode) return undefined;

    // Extract each parameter
    for (const param of paramsNode.namedChildren) {
      if (param.type === 'required_parameter' || param.type === 'optional_parameter') {
        const nameNode = param.childForFieldName('pattern') || param.children[0];
        const typeNode = param.childForFieldName('type');

        if (nameNode) {
          params.push({
            name: nameNode.text,
            type: typeNode ? typeNode.text.replace(/^:\s*/, '') : undefined  // Strip leading colon
          });
        }
      } else if (param.type === 'identifier') {
        // Simple parameter without type annotation
        params.push({ name: param.text });
      }
    }

    return params.length > 0 ? params : undefined;
  }

  /**
   * Extract return type annotation
   * Supports TypeScript type annotations
   */
  private extractReturnType(node: Parser.SyntaxNode, content: string): string | undefined {
    const returnTypeNode = node.childForFieldName('return_type') ||
                           node.descendantsOfType('type_annotation')[0];

    return returnTypeNode ? returnTypeNode.text.replace(/^:\s*/, '') : undefined;
  }

  /**
   * Extract decorators from node
   * Supports TypeScript decorators (@Component, @Injectable)
   */
  private extractDecorators(node: Parser.SyntaxNode, content: string): string[] | undefined {
    const decorators: string[] = [];

    // Search for decorator nodes before the function/class
    let current = node.previousSibling;
    while (current && current.type === 'decorator') {
      // Extract decorator name (remove @ symbol)
      const decoratorText = current.text.replace(/^@/, '').split('(')[0];
      decorators.unshift(decoratorText);
      current = current.previousSibling;
    }

    return decorators.length > 0 ? decorators : undefined;
  }

  /**
   * Extract docstring or JSDoc comment
   * Looks for comment block immediately before node
   */
  private extractDocstring(node: Parser.SyntaxNode, content: string): string | undefined {
    // Search for comment node before the function/class
    let current = node.previousSibling;
    while (current && current.type === 'comment') {
      const commentText = current.text;

      // Check if it's a JSDoc comment (/** ... */)
      if (commentText.startsWith('/**')) {
        // Clean up JSDoc formatting
        return commentText
          .replace(/^\/\*\*\s*/, '')
          .replace(/\s*\*\/$/, '')
          .split('\n')
          .map(line => line.replace(/^\s*\*\s?/, ''))
          .join('\n')
          .trim();
      }

      current = current.previousSibling;
    }

    return undefined;
  }

  /**
   * Estimate complexity from AST
   * Returns cyclomatic complexity and nesting depth
   */
  private estimateComplexity(node: Parser.SyntaxNode): { cyclomatic: number; nestingDepth: number } | undefined {
    let cyclomatic = 1; // Base complexity
    let maxNestingDepth = 0;

    // Recursive traversal to count control flow nodes
    const traverse = (n: Parser.SyntaxNode, depth: number = 0) => {
      maxNestingDepth = Math.max(maxNestingDepth, depth);

      // Increment cyclomatic complexity for control flow nodes
      if (['if_statement', 'for_statement', 'while_statement', 'switch_case',
           'catch_clause', 'conditional_expression'].includes(n.type)) {
        cyclomatic++;
      }

      // Increment for logical operators (&&, ||)
      if (n.type === 'binary_expression' && ['&&', '||'].includes(n.text)) {
        cyclomatic++;
      }

      // Recursively traverse children
      for (const child of n.children) {
        const newDepth = ['if_statement', 'for_statement', 'while_statement'].includes(child.type)
          ? depth + 1
          : depth;
        traverse(child, newDepth);
      }
    };

    traverse(node);

    return { cyclomatic, nestingDepth: maxNestingDepth };
  }
}

/**
 * Export GrammarLoader for testing
 */
export { GrammarLoader };

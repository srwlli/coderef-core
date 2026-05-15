/**
 * @coderef-semantic: 1.0.0
 * @exports ExportInfo, ImportInfo, SemanticExtractionResult, ASTExtractorOptions, ASTExtractor, astExtractor, extractBatch
 * @used_by src/semantic/header-generator.ts, src/semantic/orchestrator.ts, src/semantic/registry-sync.ts, __tests__/pipeline/single-scanner.test.ts
 */



/**
 * Legacy AST-based extraction helper for CodeRef-Semantics.
 *
 * The canonical scanner path is PipelineOrchestrator -> PipelineState. This
 * helper remains exported for compatibility and focused import/export extraction;
 * it is not an alternate source of ElementData or graph truth.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

export interface ExportInfo {
  name: string;
  type: 'named' | 'default' | 'namespace';
  line: number;
  declaration?: string;
}

export interface ImportInfo {
  name: string;
  from: string;
  type: 'named' | 'default' | 'namespace';
  line: number;
}

export interface SemanticExtractionResult {
  file: string;
  exports: ExportInfo[];
  imports: ImportInfo[];
  internalDependencies: string[];
  externalDependencies: string[];
  executionTime: number;
}

export interface ASTExtractorOptions {
  includeInternalDeps?: boolean;
  includeExternalDeps?: boolean;
  maxFileSize?: number;
}

/**
 * Compatibility extractor for semantic import/export analysis.
 */
export class ASTExtractor {
  private options: ASTExtractorOptions;

  constructor(options: ASTExtractorOptions = {}) {
    this.options = {
      includeInternalDeps: true,
      includeExternalDeps: true,
      maxFileSize: 1024 * 1024, // 1MB default
      ...options,
    };
  }

  /**
   * Extract semantic information from a single file
   * @param filePath - Absolute path to the source file
   * @returns Extraction result with exports, imports, and dependencies
   */
  async extractFile(filePath: string): Promise<SemanticExtractionResult> {
    const startTime = Date.now();
    const result: SemanticExtractionResult = {
      file: filePath,
      exports: [],
      imports: [],
      internalDependencies: [],
      externalDependencies: [],
      executionTime: 0,
    };

    try {
      // Check file size
      const stats = fs.statSync(filePath);
      if (stats.size > (this.options.maxFileSize || 1024 * 1024)) {
        console.warn(`File ${filePath} exceeds max size, skipping`);
        result.executionTime = Date.now() - startTime;
        return result;
      }

      // Read file content
      const content = fs.readFileSync(filePath, 'utf-8');

      // Determine file type and parse accordingly
      const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: isTypeScript
          ? ['typescript', 'jsx']
          : ['jsx', ['flow', { all: true }]],
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
      });

      // Traverse AST to extract exports and imports
      traverse(ast, {
        ExportNamedDeclaration: (astPath) => {
          const node = astPath.node;
          if (node.declaration) {
            this.extractExportDeclaration(node.declaration, result.exports);
          }
          if (node.specifiers) {
            node.specifiers.forEach((spec: any) => {
              if (spec.exported) {
                result.exports.push({
                  name: spec.exported.name,
                  type: 'named',
                  line: spec.loc?.start.line || 0,
                });
              }
            });
          }
        },
        ExportDefaultDeclaration: (astPath) => {
          const node = astPath.node;
          if (node.declaration) {
            result.exports.push({
              name: 'default',
              type: 'default',
              line: node.loc?.start.line || 0,
              declaration: this.getDeclarationType(node.declaration),
            });
          }
        },
        ImportDeclaration: (astPath) => {
          const node = astPath.node;
          const source = node.source.value;
          const isInternal = !source.startsWith('.');
          const deps = isInternal
            ? result.externalDependencies
            : result.internalDependencies;

          if (!deps.includes(source)) {
            deps.push(source);
          }

          node.specifiers.forEach((spec: any) => {
            if (spec.type === 'ImportSpecifier') {
              result.imports.push({
                name: spec.local.name,
                from: source,
                type: 'named',
                line: spec.loc?.start.line || 0,
              });
            } else if (spec.type === 'ImportDefaultSpecifier') {
              result.imports.push({
                name: spec.local.name,
                from: source,
                type: 'default',
                line: spec.loc?.start.line || 0,
              });
            } else if (spec.type === 'ImportNamespaceSpecifier') {
              result.imports.push({
                name: spec.local.name,
                from: source,
                type: 'namespace',
                line: spec.loc?.start.line || 0,
              });
            }
          });
        },
      });
    } catch (error) {
      console.error(`Error extracting ${filePath}:`, error instanceof Error ? error.message : error);
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }

  /**
   * Extract multiple files in a directory
   * @param dirPath - Directory path to scan
   * @param pattern - File glob pattern (default: **\/*.{ts,tsx,js,jsx})
   * @returns Array of extraction results
   */
  async extractDirectory(dirPath: string, pattern = '**/*.{ts,tsx,js,jsx}'): Promise<SemanticExtractionResult[]> {
    const results: SemanticExtractionResult[] = [];
    const glob = await import('glob');

    const files = await glob.glob(pattern, { cwd: dirPath });
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const result = await this.extractFile(filePath);
      results.push(result);
    }

    return results;
  }

  /**
   * Extract export information from a declaration node
   */
  private extractExportDeclaration(declaration: any, exports: ExportInfo[]): void {
    if (declaration.id && declaration.id.name) {
      exports.push({
        name: declaration.id.name,
        type: 'named',
        line: declaration.loc?.start.line || 0,
        declaration: declaration.type,
      });
    } else if (declaration.type === 'VariableDeclaration' && Array.isArray(declaration.declarations)) {
      // VariableDeclaration has no top-level id; iterate declarators
      declaration.declarations.forEach((decl: any) => {
        if (decl.id && decl.id.name) {
          exports.push({
            name: decl.id.name,
            type: 'named',
            line: decl.loc?.start.line || declaration.loc?.start.line || 0,
            declaration: 'variable',
          });
        }
      });
    } else if (declaration.type === 'ObjectPattern') {
      // Handle destructured exports
      if (declaration.properties) {
        declaration.properties.forEach((prop: any) => {
          if (prop.key && prop.key.name) {
            exports.push({
              name: prop.key.name,
              type: 'named',
              line: prop.loc?.start.line || 0,
            });
          }
        });
      }
    }
  }

  /**
   * Get the type of a declaration (FunctionDeclaration, ClassDeclaration, etc.)
   */
  private getDeclarationType(declaration: any): string {
    if (declaration.type === 'FunctionDeclaration') return 'function';
    if (declaration.type === 'ClassDeclaration') return 'class';
    if (declaration.type === 'VariableDeclaration') return 'variable';
    if (declaration.type === 'TypeAlias') return 'type';
    if (declaration.type === 'InterfaceDeclaration') return 'interface';
    return declaration.type || 'unknown';
  }
}

/**
 * Convenience function for single file extraction
 */
export async function astExtractor(filePath: string, options?: ASTExtractorOptions): Promise<SemanticExtractionResult> {
  const extractor = new ASTExtractor(options);
  return extractor.extractFile(filePath);
}

/**
 * Batch extraction for multiple files
 */
export async function extractBatch(
  filePaths: string[],
  options?: ASTExtractorOptions,
): Promise<SemanticExtractionResult[]> {
  const extractor = new ASTExtractor(options);
  const results: SemanticExtractionResult[] = [];

  for (const filePath of filePaths) {
    const result = await extractor.extractFile(filePath);
    results.push(result);
  }

  return results;
}

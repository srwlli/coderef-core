/**
 * Import Parser - Detects import/export relationships in source code
 * Phase 3, Task P3-T1: Relationship Detection & Analysis
 *
 * Detects:
 * - ES6 imports: import { x } from 'y'
 * - ES6 re-exports: export { x } from 'y'
 * - CommonJS requires: require('x')
 * - Barrel exports: export * from 'x'
 * - Dynamic imports: import('x')
 *
 * Builds 'imports' relationship edges for dependency graph
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Represents an import/export statement detected in source code
 */
export interface ImportStatement {
  type: 'import' | 'export' | 'require' | 'dynamic-import' | 'reexport';
  source: string;
  specifiers?: string[];
  line: number;
  column: number;
  isBarrelExport: boolean;
  isSideEffect: boolean;
}

/**
 * Represents an import relationship edge in the dependency graph
 */
export interface ImportEdge {
  sourceFile: string;
  targetFile: string;
  importStatements: ImportStatement[];
  edgeType: 'imports' | 'reexports';
}

export class ImportParser {
  private basePath: string;
  private importCache: Map<string, ImportStatement[]> = new Map();

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  /**
   * Parse imports from a single file
   */
  parseImports(filePath: string): ImportStatement[] {
    // Check cache first
    if (this.importCache.has(filePath)) {
      return this.importCache.get(filePath)!;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const imports: ImportStatement[] = [];

      // Parse ES6 imports
      imports.push(...this.parseES6Imports(content, filePath));

      // Parse CommonJS requires
      imports.push(...this.parseCommonJSRequires(content, filePath));

      // Parse re-exports
      imports.push(...this.parseReexports(content, filePath));

      // Cache results
      this.importCache.set(filePath, imports);
      return imports;
    } catch (error) {
      // File may not be readable or may not exist
      return [];
    }
  }

  /**
   * Parse ES6 import statements
   * Patterns:
   * - import x from 'y'
   * - import { a, b } from 'y'
   * - import * as x from 'y'
   * - import 'y' (side-effect)
   */
  private parseES6Imports(content: string, filePath: string): ImportStatement[] {
    const imports: ImportStatement[] = [];
    const lines = content.split('\n');

    // Pattern for ES6 imports
    const importPattern = /^\s*import\s+(?:(?:{[^}]*}|[\w$]+(?:\s+as\s+[\w$]+)?(?:\s*,\s*)?)*\s*)?(?:\*\s+as\s+[\w$]+\s+)?from\s+['"`]([^'"`]+)['"`]/;
    const sideEffectPattern = /^\s*import\s+['"`]([^'"`]+)['"`]/;
    const dynamicPattern = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/;

    lines.forEach((line, lineIndex) => {
      // Check for regular imports
      const importMatch = line.match(importPattern);
      if (importMatch) {
        const source = importMatch[1];
        if (!this.isExternalPackage(source)) {
          imports.push({
            type: 'import',
            source: this.resolveModulePath(source, filePath),
            line: lineIndex + 1,
            column: line.indexOf('import'),
            isBarrelExport: false,
            isSideEffect: false,
          });
        }
      }

      // Check for side-effect imports
      const sideEffectMatch = line.match(sideEffectPattern);
      if (sideEffectMatch && !line.includes('{')) {
        const source = sideEffectMatch[1];
        if (!this.isExternalPackage(source)) {
          imports.push({
            type: 'import',
            source: this.resolveModulePath(source, filePath),
            line: lineIndex + 1,
            column: line.indexOf('import'),
            isBarrelExport: false,
            isSideEffect: true,
          });
        }
      }

      // Check for dynamic imports
      const dynamicMatch = line.match(dynamicPattern);
      if (dynamicMatch) {
        const source = dynamicMatch[1];
        if (!this.isExternalPackage(source)) {
          imports.push({
            type: 'dynamic-import',
            source: this.resolveModulePath(source, filePath),
            line: lineIndex + 1,
            column: line.indexOf('import'),
            isBarrelExport: false,
            isSideEffect: false,
          });
        }
      }
    });

    return imports;
  }

  /**
   * Parse CommonJS require statements
   * Patterns:
   * - require('x')
   * - const x = require('y')
   */
  private parseCommonJSRequires(content: string, filePath: string): ImportStatement[] {
    const requires: ImportStatement[] = [];
    const lines = content.split('\n');
    const requirePattern = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/;

    lines.forEach((line, lineIndex) => {
      const requireMatch = line.match(requirePattern);
      if (requireMatch) {
        const source = requireMatch[1];
        if (!this.isExternalPackage(source)) {
          requires.push({
            type: 'require',
            source: this.resolveModulePath(source, filePath),
            line: lineIndex + 1,
            column: line.indexOf('require'),
            isBarrelExport: false,
            isSideEffect: false,
          });
        }
      }
    });

    return requires;
  }

  /**
   * Parse export statements
   * Patterns:
   * - export { x } from 'y'
   * - export * from 'y'
   * - export default from 'y' (TypeScript)
   */
  private parseReexports(content: string, filePath: string): ImportStatement[] {
    const reexports: ImportStatement[] = [];
    const lines = content.split('\n');

    // Pattern for export from
    const exportFromPattern = /^\s*export\s+(?:\{[^}]*\}|\*)\s+from\s+['"`]([^'"`]+)['"`]/;
    const exportDefaultPattern = /^\s*export\s+default\s+from\s+['"`]([^'"`]+)['"`]/;

    lines.forEach((line, lineIndex) => {
      // Check for export...from
      const exportMatch = line.match(exportFromPattern);
      if (exportMatch) {
        const source = exportMatch[1];
        if (!this.isExternalPackage(source)) {
          const isBarrel = line.includes('*');
          reexports.push({
            type: 'reexport',
            source: this.resolveModulePath(source, filePath),
            line: lineIndex + 1,
            column: line.indexOf('export'),
            isBarrelExport: isBarrel,
            isSideEffect: false,
          });
        }
      }

      // Check for export default from
      const exportDefaultMatch = line.match(exportDefaultPattern);
      if (exportDefaultMatch) {
        const source = exportDefaultMatch[1];
        if (!this.isExternalPackage(source)) {
          reexports.push({
            type: 'export',
            source: this.resolveModulePath(source, filePath),
            line: lineIndex + 1,
            column: line.indexOf('export'),
            isBarrelExport: false,
            isSideEffect: false,
          });
        }
      }
    });

    return reexports;
  }

  /**
   * Check if a module is external (node_modules, packages, etc.)
   */
  private isExternalPackage(modulePath: string): boolean {
    // External packages start with letters or @
    if (modulePath.startsWith('@') && !modulePath.startsWith('@/')) {
      return true; // @babel/*, @types/*, etc.
    }
    if (modulePath.match(/^[a-z]/i) && !modulePath.startsWith('.')) {
      return true; // node_modules packages
    }
    return false;
  }

  /**
   * Resolve relative module path to absolute file path
   */
  private resolveModulePath(modulePath: string, fromFile: string): string {
    // Skip external packages
    if (this.isExternalPackage(modulePath)) {
      return modulePath;
    }

    const fromDir = path.dirname(fromFile);
    let resolvedPath = path.resolve(fromDir, modulePath);

    // Add .ts/.tsx/.js extension if missing
    if (!resolvedPath.match(/\.(ts|tsx|js|json)$/)) {
      const candidates = [
        `${resolvedPath}.ts`,
        `${resolvedPath}.tsx`,
        `${resolvedPath}.js`,
        `${resolvedPath}/index.ts`,
        `${resolvedPath}/index.tsx`,
        `${resolvedPath}/index.js`,
      ];

      for (const candidate of candidates) {
        try {
          if (fs.existsSync(candidate)) {
            resolvedPath = candidate;
            break;
          }
        } catch {
          // Continue to next candidate
        }
      }
    }

    // Make relative to base path
    try {
      return path.relative(this.basePath, resolvedPath);
    } catch {
      return resolvedPath;
    }
  }

  /**
   * Build import relationship edges from detected imports
   */
  buildImportEdges(filePaths: string[]): ImportEdge[] {
    const edges: ImportEdge[] = [];
    const edgeMap = new Map<string, ImportEdge>();

    for (const filePath of filePaths) {
      const imports = this.parseImports(filePath);

      for (const imp of imports) {
        const edgeKey = `${filePath} -> ${imp.source}`;

        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, {
            sourceFile: filePath,
            targetFile: imp.source,
            importStatements: [],
            edgeType: imp.type === 'reexport' ? 'reexports' : 'imports',
          });
        }

        edgeMap.get(edgeKey)!.importStatements.push(imp);
      }
    }

    return Array.from(edgeMap.values());
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.importCache.clear();
  }
}

export default ImportParser;

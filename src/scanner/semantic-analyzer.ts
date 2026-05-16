/**
 * @coderef-semantic: 1.0.0
 * @exports attachFileImportsToElements, buildSemanticRelationships, deduplicateUsedBy
 * @used_by src/pipeline/semantic-elements.ts
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports attachFileImportsToElements, buildSemanticRelationships, deduplicateUsedBy
 * @used_by src/pipeline/semantic-elements.ts
 */



/**
 * Semantic Analyzer - Build exports and used_by relationships
 * WO-CODEREF-SEMANTIC-INTEGRATION-001: Phase 1
 *
 * Analyzes elements to build semantic relationships:
 * - exports: What each file provides
 * - used_by: Reverse import tracking (which files depend on this)
 */

import type { ElementData } from '../types/types.js';
import type { ImportRelationship } from '../pipeline/types.js';
import * as path from 'path';
import { normalizeProjectPath } from '../utils/coderef-id.js';

/**
 * Attach pipeline-level file imports to each element in the importing file.
 *
 * The relationship extractor works at file scope, while semantic projections are
 * emitted per ElementData. This adapter preserves the canonical file-level import
 * facts without changing extractor behavior.
 */
export function attachFileImportsToElements(
  elements: ElementData[],
  imports: ImportRelationship[],
  projectPath: string,
): ElementData[] {
  if (!imports || imports.length === 0) return elements;

  const importsByFile = new Map<string, ElementData['imports']>();

  for (const imp of imports) {
    const sourceFile = normalizeProjectPath(projectPath, imp.sourceFile);
    const normalizedImport = {
      source: imp.target.replace(/\\/g, '/'),
      specifiers: imp.specifiers,
      default: imp.default,
      namespace: imp.namespace,
      dynamic: imp.dynamic,
      line: imp.line,
    };

    const existing = importsByFile.get(sourceFile);
    if (existing) {
      existing.push(normalizedImport);
    } else {
      importsByFile.set(sourceFile, [normalizedImport]);
    }
  }

  return elements.map(element => {
    const file = normalizeProjectPath(projectPath, element.file);
    const fileImports = importsByFile.get(file);
    if (!fileImports || fileImports.length === 0) return element;

    return {
      ...element,
      imports: deduplicateImports([...(element.imports || []), ...fileImports]),
    };
  });
}

function deduplicateImports(imports: NonNullable<ElementData['imports']>): NonNullable<ElementData['imports']> {
  const unique = new Map<string, NonNullable<ElementData['imports']>[number]>();

  for (const imp of imports) {
    const key = [
      imp.source,
      imp.line,
      (imp.specifiers || []).join(','),
      imp.default || '',
      imp.namespace || '',
      imp.dynamic ? 'dynamic' : 'static',
    ].join('\u0000');

    if (!unique.has(key)) {
      unique.set(key, imp);
    }
  }

  return Array.from(unique.values());
}

/**
 * Build semantic relationships from scanned elements
 *
 * @param elements All scanned elements from the project
 * @param projectPath Project root for relative path resolution
 * @returns Elements with exports and used_by populated
 */
export function buildSemanticRelationships(
  elements: ElementData[],
  projectPath: string
): ElementData[] {
  const knownFiles = new Set(elements.map(el => normalizeProjectPath(projectPath, el.file)));

  // Index elements by file for quick lookup
  const elementsByFile = new Map<string, ElementData[]>();
  elements.forEach(el => {
    const file = normalizeProjectPath(projectPath, el.file);
    if (!elementsByFile.has(file)) {
      elementsByFile.set(file, []);
    }
    elementsByFile.get(file)!.push(el);
  });

  // Build used_by map: file -> list of files that import from it
  const usedByMap = new Map<string, Map<string, {
    file: string;
    imports?: string[];
    line?: number;
  }>>();

  // Track all imports across the project
  elements.forEach(el => {
    if (!el.imports || el.imports.length === 0) return;
    const sourceFile = normalizeProjectPath(projectPath, el.file);

    el.imports.forEach(imp => {
      // Resolve imported module to project file
      const resolvedFile = resolveImportPath(imp.source, sourceFile, projectPath, knownFiles);
      if (!resolvedFile) return; // External dependency, skip

      if (!usedByMap.has(resolvedFile)) {
        usedByMap.set(resolvedFile, new Map());
      }

      const importedNames = imp.specifiers || (imp.default ? [imp.default] : undefined);
      const key = `${sourceFile}:${imp.line}:${(importedNames || []).join(',')}`;
      usedByMap.get(resolvedFile)!.set(key, {
        file: sourceFile,
        imports: importedNames,
        line: imp.line
      });
    });
  });

  // Populate exports and used_by on elements
  const result = elements.map(el => ({
    ...el,
    file: normalizeProjectPath(projectPath, el.file),
    // Exports: all exported elements in this file (empty array if none)
    exports: buildExportsForFile(normalizeProjectPath(projectPath, el.file), elements, projectPath) || [],
    // Used by: files that import from this file (empty array if none)
    usedBy: usedByMap.get(normalizeProjectPath(projectPath, el.file))
      ? Array.from(usedByMap.get(normalizeProjectPath(projectPath, el.file))!.values()).map(u => ({
          file: u.file,
          imports: u.imports,
          line: u.line
        }))
      : [],
    // Related: semantically related files (empty array for Phase 1, Lloyd populates in Phase 3)
    related: el.related || [],
    // Rules: constraints for this file (empty array if none specified)
    rules: el.rules || []
  }));

  return result;
}

/**
 * Build exports list for a file
 */
function buildExportsForFile(file: string, allElements: ElementData[], projectPath: string): any[] {
  const fileElements = allElements.filter(el => normalizeProjectPath(projectPath, el.file) === file && el.exported);

  return fileElements.map(el => ({
    name: el.name,
    type: determineExportType(el),
    // Optional: point to the actual element for default exports
    target: el.type === 'class' || el.type === 'function' ? file : undefined
  }));
}

/**
 * Determine if export is default or named
 * (This is a heuristic; actual determination requires AST analysis)
 */
function determineExportType(el: ElementData): 'default' | 'named' {
  // Default export heuristic: class exports are often default, functions are often named
  // This should be improved with actual AST analysis in future phases
  if (el.type === 'class') return 'default';
  return 'named';
}

/**
 * Resolve import path to project file
 * Handles relative paths, absolute paths, and module names
 *
 * @param source Import source (e.g., './utils', 'react', '../models/user')
 * @param fromFile Current file path
 * @param projectPath Project root
 * @returns Resolved file path or null if external
 */
function resolveImportPath(
  source: string,
  fromFile: string,
  projectPath: string,
  knownFiles: Set<string>
): string | null {
  // Skip external dependencies
  if (!source.startsWith('.') && !source.startsWith('/')) {
    return null; // External package
  }

  const fromDir = path.dirname(fromFile);
  const relativeResolved = normalizeProjectPath(projectPath, path.normalize(path.join(fromDir, source)));
  const candidates = [relativeResolved];

  // Handle missing extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java'];
  if (!extensions.some(ext => relativeResolved.endsWith(ext))) {
    candidates.push(...extensions.map(ext => `${relativeResolved}${ext}`));
    candidates.push(...extensions.map(ext => `${relativeResolved}/index${ext}`));
  } else if (relativeResolved.endsWith('.js')) {
    candidates.push(relativeResolved.replace(/\.js$/, '.ts'));
    candidates.push(relativeResolved.replace(/\.js$/, '.tsx'));
  } else if (relativeResolved.endsWith('.jsx')) {
    candidates.push(relativeResolved.replace(/\.jsx$/, '.tsx'));
  }

  return candidates.find(candidate => knownFiles.has(candidate)) || null;
}

/**
 * Deduplicate and normalize used_by entries
 */
export function deduplicateUsedBy(
  usedBy: Array<{ file: string; imports?: string[]; line?: number }>
): Array<{ file: string; imports?: string[]; line?: number }> {
  if (!usedBy || usedBy.length === 0) return [];

  const unique = new Map<string, { file: string; imports?: string[]; line?: number }>();
  usedBy.forEach(entry => {
    const key = `${entry.file}:${entry.line || 'unknown'}`;
    if (!unique.has(key)) {
      unique.set(key, entry);
    }
  });

  return Array.from(unique.values());
}

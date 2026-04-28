/**
 * Semantic Analyzer - Build exports and used_by relationships
 * WO-CODEREF-SEMANTIC-INTEGRATION-001: Phase 1
 *
 * Analyzes elements to build semantic relationships:
 * - exports: What each file provides
 * - used_by: Reverse import tracking (which files depend on this)
 */

import type { ElementData } from '../types/types.js';
import * as path from 'path';

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
  // Index elements by file for quick lookup
  const elementsByFile = new Map<string, ElementData[]>();
  elements.forEach(el => {
    if (!elementsByFile.has(el.file)) {
      elementsByFile.set(el.file, []);
    }
    elementsByFile.get(el.file)!.push(el);
  });

  // Build used_by map: file -> list of files that import from it
  const usedByMap = new Map<string, Set<{
    file: string;
    imports?: string[];
    line?: number;
  }>>();

  // Track all imports across the project
  elements.forEach(el => {
    if (!el.imports || el.imports.length === 0) return;

    el.imports.forEach(imp => {
      // Resolve imported module to project file
      const resolvedFile = resolveImportPath(imp.source, el.file, projectPath);
      if (!resolvedFile) return; // External dependency, skip

      if (!usedByMap.has(resolvedFile)) {
        usedByMap.set(resolvedFile, new Set());
      }

      usedByMap.get(resolvedFile)!.add({
        file: el.file,
        imports: imp.specifiers || (imp.default ? [imp.default] : undefined),
        line: imp.line
      });
    });
  });

  // Populate exports and used_by on elements
  const result = elements.map(el => ({
    ...el,
    // Exports: all exported elements in this file (empty array if none)
    exports: buildExportsForFile(el.file, elements) || [],
    // Used by: files that import from this file (empty array if none)
    usedBy: usedByMap.get(el.file)
      ? Array.from(usedByMap.get(el.file)!).map(u => ({
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
function buildExportsForFile(file: string, allElements: ElementData[]): any[] {
  const fileElements = allElements.filter(el => el.file === file && el.exported);

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
  projectPath: string
): string | null {
  // Skip external dependencies
  if (!source.startsWith('.') && !source.startsWith('/')) {
    return null; // External package
  }

  // Resolve relative path
  const fromDir = path.dirname(fromFile);
  let resolved = path.resolve(fromDir, source);

  // Handle missing extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java'];
  for (const ext of extensions) {
    if (resolved.endsWith(ext)) {
      return resolved;
    }
  }

  for (const ext of extensions) {
    const withExt = resolved + ext;
    // In a real implementation, check if file exists
    // For now, return the most likely candidate
    if (ext === '.ts' || ext === '.tsx' || ext === '.js') {
      return withExt;
    }
  }

  return resolved;
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

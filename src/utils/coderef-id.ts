/**
 * @semantic
 * exports: [CodeRefIdOptions, normalizeProjectPath, codeRefDesignatorForType, createCodeRefId]
 * used_by: [src/pipeline/call-resolver.ts, src/pipeline/generators/drift-generator.ts, src/pipeline/graph-builder.ts, src/pipeline/import-resolver.ts, src/pipeline/orchestrator.ts, src/pipeline/semantic-elements.ts, src/scanner/semantic-analyzer.ts, src/semantic/projections.ts]
 */

import * as path from 'path';
import type { ElementData } from '../types/types.js';

const TYPE_DESIGNATORS: Record<ElementData['type'], string> = {
  function: 'Fn',
  class: 'Cl',
  component: 'C',
  hook: 'H',
  method: 'M',
  constant: 'V',
  interface: 'I',
  type: 'I',
  decorator: 'AST',
  property: 'V',
  unknown: 'AST',
};

export interface CodeRefIdOptions {
  includeLine?: boolean;
}

/**
 * Single canonical CodeRef element ID generator.
 *
 * All scanner, graph, and projection call sites must route through
 * createCodeRefId so line-anchored and no-line identities stay coherent.
 */
export function normalizeProjectPath(projectPath: string, value: string): string {
  const normalized = path.isAbsolute(value)
    ? path.relative(projectPath, value)
    : value;

  return normalized.replace(/\\/g, '/').replace(/^\.\//, '');
}

export function codeRefDesignatorForType(type: ElementData['type']): string {
  return TYPE_DESIGNATORS[type] ?? TYPE_DESIGNATORS.unknown;
}

export function createCodeRefId(
  element: Pick<ElementData, 'type' | 'name' | 'file' | 'line'>,
  projectPath: string,
  options: CodeRefIdOptions = {},
): string {
  const includeLine = options.includeLine ?? true;
  const designator = codeRefDesignatorForType(element.type);
  const file = normalizeProjectPath(projectPath, element.file);
  const anchor = `${designator}/${file}#${element.name}`;

  return includeLine ? `@${anchor}:${element.line}` : `@${anchor}`;
}


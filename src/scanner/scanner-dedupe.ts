/**
 * Scanner Dedupe — extracted from scanner.ts (P1-002)
 *
 * Pure function. Takes the raw element stream produced by pattern/AST/
 * tree-sitter passes and collapses duplicates on the (file, line, name)
 * tuple, keeping the entry with the highest TYPE_PRIORITY.
 *
 * Workorder: WO-SCANNER-MODULE-EXTRACTION-001
 */

import { ElementData } from '../types/types.js';
import { TYPE_PRIORITY } from './scanner-patterns.js';

export function deduplicateElements(elements: ElementData[]): ElementData[] {
  const elementMap = new Map<string, ElementData>();

  for (const element of elements) {
    const key = `${element.file}:${element.line}:${element.name}`;
    const existing = elementMap.get(key);

    if (!existing) {
      elementMap.set(key, element);
      continue;
    }

    const existingPriority = TYPE_PRIORITY[existing.type] || 0;
    const newPriority = TYPE_PRIORITY[element.type] || 0;

    if (newPriority > existingPriority) {
      elementMap.set(key, element);
    }
  }

  return Array.from(elementMap.values());
}

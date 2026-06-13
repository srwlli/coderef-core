/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability projections-semantic-registry-projection
 * @exports SemanticRegistryProjection, SemanticRegistryRawFacts, SemanticRegistryProjectionEntry, RawFactsBundle, createSemanticRegistryProjection
 * @used_by src/pipeline/generators/registry-generator.ts
 */

import * as path from 'path';
import type { ElementData } from '../types/types.js';
import type {
  RawImportFact,
  RawCallFact,
  RawExportFact,
} from '../pipeline/types.js';
import type { HeaderFact, HeaderImportFact } from '../pipeline/header-fact.js';
import { DEFAULT_HEADER_STATUS } from '../pipeline/element-taxonomy.js';
import { createCodeRefId } from '../utils/coderef-id.js';

export interface SemanticRegistryProjection {
  version: string;
  generated_from: '.coderef/index.json';
  generated_at: string;
  entries: SemanticRegistryProjectionEntry[];
  /**
   * Registry 2.0.0 (WO-REGISTRY-RAWFACTS-DEDUP-001, operator ruling A):
   * file-grain raw facts stored ONCE per file. Under 1.x every element of a
   * file duplicated the full per-file bundle (98% of bytes on large repos —
   * 124MB self-scan / 209MB on Primary-Sources). Entries reference their
   * bundle via their `file` field. Omitted when the pipeline ran without a
   * raw-facts bundle.
   */
  rawFactsByFile?: Record<string, SemanticRegistryRawFacts>;
}

/**
 * Phase 2/2.5 raw-fact bundle attached to a registry entry. All four arrays
 * are file-grain; an entry inherits the raw facts of its containing file.
 * Phase 3/4 resolvers consume these into typed graph edges. headerImports
 * is the structured HeaderImportFact[] (RawHeaderImportFact was removed in
 * Phase 3).
 */
export interface SemanticRegistryRawFacts {
  imports: RawImportFact[];
  calls: RawCallFact[];
  exports: RawExportFact[];
  headerImports: HeaderImportFact[];
}

export interface SemanticRegistryProjectionEntry {
  id: string;
  file: string;
  line: number;
  type: ElementData['type'];
  name: string;
  codeRefId: string;
  codeRefIdNoLine: string;
  layer: ElementData['layer'];
  capability: ElementData['capability'];
  constraints: ElementData['constraints'];
  headerStatus: NonNullable<ElementData['headerStatus']>;
  exports: ElementData['exports'];
  imports: ElementData['imports'];
  usedBy: ElementData['usedBy'];
  related: ElementData['related'];
  rules: ElementData['rules'];
  /**
   * Phase 2.5 parsed semantic header (additive). Optional. Mirrors
   * ElementData.headerFact for the entry's source file.
   */
  headerFact?: HeaderFact;
}

export interface RawFactsBundle {
  rawImports?: RawImportFact[];
  rawCalls?: RawCallFact[];
  rawExports?: RawExportFact[];
  headerImportFacts?: HeaderImportFact[];
}

/**
 * Normalize a source path to a project-relative POSIX path so raw-fact keys
 * match the element.file value used by the projection (which is already
 * project-relative POSIX).
 */
function normalizeFilePath(filePath: string, projectPath: string): string {
  const rel = path.isAbsolute(filePath) ? path.relative(projectPath, filePath) : filePath;
  return rel.split(path.sep).join('/');
}

/**
 * Group a flat list of raw facts by sourceFile (normalized to project-relative
 * POSIX) so per-entry attachment is O(elements) rather than O(elements*facts).
 */
function groupBySourceFile<T extends { sourceFile: string }>(
  facts: T[] | undefined,
  projectPath: string,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  if (!facts) return map;
  for (const fact of facts) {
    const key = normalizeFilePath(fact.sourceFile, projectPath);
    const list = map.get(key);
    if (list) list.push(fact);
    else map.set(key, [fact]);
  }
  return map;
}

export function createSemanticRegistryProjection(
  elements: ElementData[],
  projectPath = process.cwd(),
  rawFactsBundle?: RawFactsBundle,
): SemanticRegistryProjection {
  const importsByFile = groupBySourceFile(rawFactsBundle?.rawImports, projectPath);
  const callsByFile = groupBySourceFile(rawFactsBundle?.rawCalls, projectPath);
  const exportsByFile = groupBySourceFile(rawFactsBundle?.rawExports, projectPath);
  const headerImportsByFile = groupBySourceFile(rawFactsBundle?.headerImportFacts, projectPath);
  const hasAnyRawFacts =
    importsByFile.size +
      callsByFile.size +
      exportsByFile.size +
      headerImportsByFile.size >
    0;

  // 2.0.0 dedup: one bundle per file that has elements, stored once.
  let rawFactsByFile: Record<string, SemanticRegistryRawFacts> | undefined;
  if (hasAnyRawFacts) {
    rawFactsByFile = {};
    for (const element of elements) {
      const key = normalizeFilePath(element.file, projectPath);
      if (rawFactsByFile[key]) continue;
      rawFactsByFile[key] = {
        imports: importsByFile.get(key) || [],
        calls: callsByFile.get(key) || [],
        exports: exportsByFile.get(key) || [],
        headerImports: headerImportsByFile.get(key) || [],
      };
    }
  }

  return {
    version: '2.0.0',
    generated_from: '.coderef/index.json',
    generated_at: new Date().toISOString(),
    ...(rawFactsByFile ? { rawFactsByFile } : {}),
    entries: elements.map(element => {
      const entry: SemanticRegistryProjectionEntry = {
        id: element.codeRefId || createCodeRefId(element, projectPath, { includeLine: true }),
        file: element.file,
        line: element.line,
        type: element.type,
        name: element.name,
        codeRefId: element.codeRefId || createCodeRefId(element, projectPath, { includeLine: true }),
        codeRefIdNoLine: element.codeRefIdNoLine || createCodeRefId(element, projectPath, { includeLine: false }),
        layer: element.layer,
        capability: element.capability,
        constraints: element.constraints,
        headerStatus: element.headerStatus || DEFAULT_HEADER_STATUS,
        exports: element.exports || [],
        imports: element.imports || [],
        usedBy: element.usedBy || [],
        related: element.related || [],
        rules: element.rules || [],
      };

      if (element.headerFact) {
        entry.headerFact = element.headerFact;
      }

      return entry;
    }),
  };
}


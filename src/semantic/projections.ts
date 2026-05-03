import type { ElementData } from '../types/types.js';
import type {
  RawImportFact,
  RawCallFact,
  RawExportFact,
  RawHeaderImportFact,
} from '../pipeline/types.js';
import { DEFAULT_HEADER_STATUS } from '../pipeline/element-taxonomy.js';
import { createCodeRefId } from '../utils/coderef-id.js';

export interface SemanticRegistryProjection {
  version: string;
  generated_from: '.coderef/index.json';
  generated_at: string;
  entries: SemanticRegistryProjectionEntry[];
}

/**
 * Phase 2 raw-fact bundle attached to a registry entry. All four arrays are
 * file-grain; an entry inherits the raw facts of its containing file.
 * Phase 3/4 resolvers consume these into typed graph edges.
 */
export interface SemanticRegistryRawFacts {
  imports: RawImportFact[];
  calls: RawCallFact[];
  exports: RawExportFact[];
  headerImports: RawHeaderImportFact[];
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
   * Phase 2 raw facts (additive). Optional — older snapshots and consumers
   * that haven't migrated yet will not see this field.
   */
  rawFacts?: SemanticRegistryRawFacts;
}

export interface RawFactsBundle {
  rawImports?: RawImportFact[];
  rawCalls?: RawCallFact[];
  rawExports?: RawExportFact[];
  rawHeaderImports?: RawHeaderImportFact[];
}

/**
 * Group a flat list of raw facts by sourceFile so per-entry attachment is
 * O(elements) rather than O(elements * facts).
 */
function groupBySourceFile<T extends { sourceFile: string }>(
  facts: T[] | undefined,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  if (!facts) return map;
  for (const fact of facts) {
    const list = map.get(fact.sourceFile);
    if (list) list.push(fact);
    else map.set(fact.sourceFile, [fact]);
  }
  return map;
}

export function createSemanticRegistryProjection(
  elements: ElementData[],
  projectPath = process.cwd(),
  rawFactsBundle?: RawFactsBundle,
): SemanticRegistryProjection {
  const importsByFile = groupBySourceFile(rawFactsBundle?.rawImports);
  const callsByFile = groupBySourceFile(rawFactsBundle?.rawCalls);
  const exportsByFile = groupBySourceFile(rawFactsBundle?.rawExports);
  const headerImportsByFile = groupBySourceFile(rawFactsBundle?.rawHeaderImports);
  const hasAnyRawFacts =
    importsByFile.size +
      callsByFile.size +
      exportsByFile.size +
      headerImportsByFile.size >
    0;

  return {
    version: '1.0.0',
    generated_from: '.coderef/index.json',
    generated_at: new Date().toISOString(),
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

      if (hasAnyRawFacts) {
        entry.rawFacts = {
          imports: importsByFile.get(element.file) || [],
          calls: callsByFile.get(element.file) || [],
          exports: exportsByFile.get(element.file) || [],
          headerImports: headerImportsByFile.get(element.file) || [],
        };
      }

      return entry;
    }),
  };
}


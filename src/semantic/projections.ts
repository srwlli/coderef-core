import type { ElementData } from '../types/types.js';
import { DEFAULT_HEADER_STATUS } from '../pipeline/element-taxonomy.js';
import { createCodeRefId } from '../utils/coderef-id.js';

export interface SemanticRegistryProjection {
  version: string;
  generated_from: '.coderef/index.json';
  generated_at: string;
  entries: SemanticRegistryProjectionEntry[];
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
}

export function createSemanticRegistryProjection(
  elements: ElementData[],
  projectPath = process.cwd(),
): SemanticRegistryProjection {
  return {
    version: '1.0.0',
    generated_from: '.coderef/index.json',
    generated_at: new Date().toISOString(),
    entries: elements.map(element => ({
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
    })),
  };
}


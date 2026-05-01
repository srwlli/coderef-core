import type { ElementData } from '../types/types.js';

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
  exports: ElementData['exports'];
  imports: ElementData['imports'];
  usedBy: ElementData['usedBy'];
  related: ElementData['related'];
  rules: ElementData['rules'];
}

export function createSemanticRegistryProjection(
  elements: ElementData[],
): SemanticRegistryProjection {
  return {
    version: '1.0.0',
    generated_from: '.coderef/index.json',
    generated_at: new Date().toISOString(),
    entries: elements.map(element => ({
      id: element.codeRefId || `${element.file}:${element.name}:${element.line}`,
      file: element.file,
      line: element.line,
      type: element.type,
      name: element.name,
      codeRefId: element.codeRefId || '',
      codeRefIdNoLine: element.codeRefIdNoLine || '',
      exports: element.exports || [],
      imports: element.imports || [],
      usedBy: element.usedBy || [],
      related: element.related || [],
      rules: element.rules || [],
    })),
  };
}


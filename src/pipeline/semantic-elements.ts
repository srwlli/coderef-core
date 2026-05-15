/**
 * @coderef-semantic: 1.0.0
 * @exports buildSemanticElementsFromState, normalizeRelatedField, normalizeRulesField
 * @used_by src/cli/populate.ts, src/pipeline/generators/index-generator.ts, src/pipeline/generators/registry-generator.ts, src/semantic/orchestrator.ts
 */





import type { ElementData } from '../types/types.js';
import type { PipelineState } from './types.js';
import { globalRegistry } from '../registry/entity-registry.js';
import { attachFileImportsToElements, buildSemanticRelationships, deduplicateUsedBy } from '../scanner/semantic-analyzer.js';
import { createCodeRefId, normalizeProjectPath } from '../utils/coderef-id.js';
import { DEFAULT_HEADER_STATUS } from './element-taxonomy.js';

/**
 * Build the canonical semantic ElementData projection from PipelineState.
 *
 * Generators and opt-in source headers must share this path so index.json remains
 * the machine-truth source for semantic-registry.json and header projection.
 */
export function buildSemanticElementsFromState(state: PipelineState): ElementData[] {
  const transformed = state.elements.map(element => normalizeElementForOutput(element, state.projectPath));
  const withImports = attachFileImportsToElements(transformed, state.imports || [], state.projectPath);
  const semanticElements = buildSemanticRelationships(withImports, state.projectPath).map(element => ({
    ...element,
    imports: normalizeImportsField(element.imports),
    dependencies: normalizePathArray(element.dependencies) as string[] | undefined,
    calledBy: normalizePathArray(element.calledBy) as string[] | undefined,
    usedBy: deduplicateUsedBy(element.usedBy || []),
    related: normalizeRelatedField(element.related || []),
    rules: normalizeRulesField(element.rules || []),
  }));

  semanticElements.sort((a, b) => {
    if (a.file !== b.file) {
      return a.file.localeCompare(b.file);
    }
    return a.line - b.line;
  });

  return semanticElements.map(cleanElement);
}

function normalizeElementForOutput(element: ElementData, projectPath: string): ElementData & { uuid?: string } {
  const file = normalizeProjectPath(projectPath, element.file);

  return {
    ...element,
    uuid: globalRegistry.lookup({ name: element.name, file: element.file, line: element.line }),
    file,
    codeRefId: createCodeRefId(element, projectPath, { includeLine: true }),
    codeRefIdNoLine: createCodeRefId(element, projectPath, { includeLine: false }),
    headerStatus: element.headerStatus || DEFAULT_HEADER_STATUS,
    exports: element.exports || [],
    usedBy: element.usedBy || [],
    related: element.related || [],
    rules: element.rules || [],
  };
}

function normalizeImportsField(imports: ElementData['imports']): ElementData['imports'] {
  if (!Array.isArray(imports)) return imports;

  return imports.map(item => ({
    ...item,
    source: typeof item.source === 'string' ? item.source.replace(/\\/g, '/') : item.source,
  }));
}

function normalizePathArray(values: unknown): unknown {
  if (!Array.isArray(values)) return values;
  return values.map(value => typeof value === 'string' ? value.replace(/\\/g, '/') : value);
}

export function normalizeRelatedField(related: any[]): any[] {
  if (!related || !Array.isArray(related)) return [];

  return related.map(item => {
    if (typeof item === 'string') {
      return { path: item.replace(/\\/g, '/'), confidence_score: 1.0 };
    }

    if (typeof item === 'object' && item !== null) {
      const normalized: any = {};

      if (item.path) {
        normalized.path = item.path.replace(/\\/g, '/');
      } else if (item.file) {
        normalized.path = item.file.replace(/\\/g, '/');
      }

      if (item.confidence_score !== undefined) {
        normalized.confidence_score = item.confidence_score;
      } else if (item.confidence !== undefined) {
        normalized.confidence_score = item.confidence;
      } else {
        normalized.confidence_score = 1.0;
      }

      if (item.reason) normalized.reason = item.reason;

      return normalized;
    }

    return item;
  });
}

export function normalizeRulesField(rules: any[]): NonNullable<ElementData['rules']> {
  if (!Array.isArray(rules)) return [];

  return rules.map(item => {
    if (typeof item === 'object' && item !== null && item.rule) {
      return {
        rule: item.rule,
        description: item.description || undefined,
        severity: item.severity || 'error',
      };
    }

    if (typeof item === 'string') {
      const colonIndex = item.indexOf(':');
      if (colonIndex > 0) {
        return {
          rule: item.substring(0, colonIndex).trim(),
          description: item.substring(colonIndex + 1).trim(),
          severity: 'error',
        };
      }

      return {
        rule: item.trim(),
        severity: 'error',
      };
    }

    return item;
  });
}

function cleanElement<T extends Record<string, any>>(element: T): T {
  const output = { ...element };
  for (const key of Object.keys(output)) {
    if (['exports', 'imports', 'usedBy', 'related', 'rules'].includes(key)) continue;
    if (output[key] === undefined || output[key] === null) {
      delete output[key];
    }
  }
  return output;
}

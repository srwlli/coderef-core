/**
 * ValidationGenerator - Validate CodeRef2 references in source files
 *
 * WO-UNIFIED-CODEREF-PIPELINE-001 - Phase 3, Task GEN-007
 *
 * Produces: .coderef/reports/validation.json
 * Analysis: Broken CodeRef2 references, validation errors
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports ValidationGenerator
 * @used_by src/cli/populate.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { PipelineState } from '../types.js';

interface ValidationReport {
  totalReferences: number;
  validReferences: number;
  brokenReferences: Array<{
    file: string;
    line: number;
    reference: string;
    reason: string;
  }>;
}

/**
 * ValidationGenerator - Validate CodeRef2 tags in source code
 */
export class ValidationGenerator {
  async generate(state: PipelineState, outputDir: string): Promise<void> {
    const reportsDir = path.join(outputDir, 'reports');
    await fs.mkdir(reportsDir, { recursive: true });

    const report = this.validateReferences(state);

    const reportPath = path.join(reportsDir, 'validation.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    if (state.options.verbose) {
      console.log(`[ValidationGenerator] Validated ${report.totalReferences} references (${report.brokenReferences.length} broken)`);
    }
  }

  private validateReferences(state: PipelineState): ValidationReport {
    const brokenReferences: ValidationReport['brokenReferences'] = [];
    let totalReferences = 0;

    // Build element lookup map
    const elementMap = new Map<string, typeof state.elements[number]>();

    state.elements.forEach(element => {
      const relativeFile = path.relative(state.projectPath, element.file).replace(/\\/g, '/');
      elementMap.set(`${relativeFile}:${element.name}`, element);
      elementMap.set(`${element.file}:${element.name}`, element);
    });

    // Scan all source files for CodeRef2 references
    for (const [filePath, content] of state.sources.entries()) {
      const relativePath = path.relative(state.projectPath, filePath).replace(/\\/g, '/');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Match @coderef{file:element} pattern
        const matches = line.matchAll(/@coderef\{([^:]+):([^}]+)\}/g);

        for (const match of matches) {
          totalReferences++;
          const [, refFile, refElement] = match;

          // Verify reference exists
          const elementKey = `${refFile}:${refElement}`;
          if (!elementMap.has(elementKey)) {
            brokenReferences.push({
              file: relativePath,
              line: index + 1,
              reference: match[0],
              reason: `Element '${refElement}' not found in '${refFile}'`,
            });
          }
        }
      });
    }

    return {
      totalReferences,
      validReferences: totalReferences - brokenReferences.length,
      brokenReferences,
    };
  }
}

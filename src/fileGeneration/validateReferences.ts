/**
 * Validate References - Find broken references and missing imports
 *
 * Outputs: .coderef/reports/validation.json
 *
 * @module fileGeneration/validateReferences
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ElementData } from '../types/types.js';

interface ValidationReport {
  version: string;
  generatedAt: string;
  projectPath: string;
  summary: {
    totalReferences: number;
    brokenReferences: number;
    validReferences: number;
    validationPercentage: number;
  };
  issues: ValidationIssue[];
}

interface ValidationIssue {
  type: 'broken-reference' | 'missing-import' | 'undefined-call';
  severity: 'error' | 'warning';
  message: string;
  file: string;
  line: number;
  elementName: string;
  referencedName: string;
}

/**
 * Validate code references and detect broken links
 *
 * @param projectPath - Absolute path to project root
 * @param elements - Array of code elements from scan
 * @returns Promise that resolves when file is written
 */
export async function validateReferences(
  projectPath: string,
  elements: ElementData[]
): Promise<void> {
  // Build element lookup map
  const elementMap = new Map<string, ElementData>();
  for (const element of elements) {
    const key = `${element.file}:${element.name}`;
    elementMap.set(key, element);

    // Also index by name only (for cross-file references)
    if (!elementMap.has(element.name)) {
      elementMap.set(element.name, element);
    }
  }

  // Find broken references
  const issues: ValidationIssue[] = [];
  let totalReferences = 0;

  for (const element of elements) {
    if (element.calls && element.calls.length > 0) {
      for (const calledFunction of element.calls) {
        totalReferences++;

        // Check if called function exists
        if (!elementMap.has(calledFunction)) {
          issues.push({
            type: 'undefined-call',
            severity: 'warning',
            message: `Function "${calledFunction}" is called but not found in codebase`,
            file: element.file,
            line: element.line,
            elementName: element.name,
            referencedName: calledFunction,
          });
        }
      }
    }
  }

  // Calculate validation percentage
  const brokenReferences = issues.length;
  const validReferences = totalReferences - brokenReferences;
  const validationPercentage = totalReferences > 0
    ? Math.round((validReferences / totalReferences) * 100)
    : 100;

  // Build report
  const report: ValidationReport = {
    version: '2.0.0',
    generatedAt: new Date().toISOString(),
    projectPath,
    summary: {
      totalReferences,
      brokenReferences,
      validReferences,
      validationPercentage,
    },
    issues: issues.slice(0, 100), // Limit to first 100 issues
  };

  // Ensure reports directory exists
  const reportsDir = path.join(projectPath, '.coderef', 'reports');
  await fs.mkdir(reportsDir, { recursive: true });

  // Write report
  const reportPath = path.join(reportsDir, 'validation.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
}

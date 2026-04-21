/**
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Frontend Call Generation Module
 * Filters frontend API call elements and generates frontend-calls.json output
 */

import { ElementData } from '../types/types.js';
import { FrontendCall } from '../analyzer/frontend-call-parsers.js';

/**
 * Frontend call element with metadata extracted
 */
export interface FrontendCallElement {
  /** Element name (function/hook name) */
  name: string;
  /** File path where call is made */
  file: string;
  /** Line number in file */
  line: number;
  /** Frontend call metadata (path, method, callType, confidence) */
  call: FrontendCall;
}

/**
 * Grouped frontend calls by call type
 */
export interface FrontendCallsOutput {
  /** Total number of frontend API calls detected */
  totalCalls: number;
  /** Calls grouped by type */
  byType: {
    fetch?: FrontendCallElement[];
    axios?: FrontendCallElement[];
    reactQuery?: FrontendCallElement[];
    custom?: FrontendCallElement[];
  };
  /** Generation metadata */
  metadata: {
    generatedAt: string;
    projectPath?: string;
    scanVersion?: string;
  };
}

/**
 * Filter elements that have frontend call metadata
 *
 * @param elements - Array of scanned code elements
 * @returns Array of elements with frontend call metadata
 *
 * @example
 * const elements = await scanCodebase(projectPath);
 * const callElements = filterFrontendCallElements(elements);
 * // Returns: [{ name: 'fetchUsers', file: 'api.ts', line: 15, call: {...} }]
 */
export function filterFrontendCallElements(elements: ElementData[]): FrontendCallElement[] {
  return elements
    .filter(element => element.frontendCall !== undefined)
    .map(element => ({
      name: element.name,
      file: element.file,
      line: element.line,
      call: element.frontendCall!
    }));
}

/**
 * Format frontend calls as JSON with call type grouping
 *
 * @param callElements - Array of frontend call elements
 * @param projectPath - Optional project path for metadata
 * @returns Formatted frontend calls output structure
 *
 * @example
 * const callElements = filterFrontendCallElements(elements);
 * const output = formatFrontendCallsJson(callElements, '/project');
 * // Returns: { totalCalls: 12, byType: { fetch: [...], axios: [...] }, metadata: {...} }
 */
export function formatFrontendCallsJson(
  callElements: FrontendCallElement[],
  projectPath?: string
): FrontendCallsOutput {
  // Group calls by type
  const byType: FrontendCallsOutput['byType'] = {
    fetch: [],
    axios: [],
    reactQuery: [],
    custom: []
  };

  for (const callElement of callElements) {
    const callType = callElement.call.callType;
    byType[callType]?.push(callElement);
  }

  // Remove empty type groups
  const cleanedByType: FrontendCallsOutput['byType'] = {};
  for (const [type, calls] of Object.entries(byType)) {
    if (calls && calls.length > 0) {
      cleanedByType[type as keyof FrontendCallsOutput['byType']] = calls;
    }
  }

  return {
    totalCalls: callElements.length,
    byType: cleanedByType,
    metadata: {
      generatedAt: new Date().toISOString(),
      projectPath,
      scanVersion: '1.0.0' // WO-ROUTE-VALIDATION-ENHANCEMENT-001
    }
  };
}

/**
 * Sort frontend calls within each type group by path
 *
 * @param output - Frontend calls output structure
 * @returns Sorted frontend calls output
 */
export function sortFrontendCalls(output: FrontendCallsOutput): FrontendCallsOutput {
  const sortedByType: FrontendCallsOutput['byType'] = {};

  for (const [type, calls] of Object.entries(output.byType)) {
    if (calls && calls.length > 0) {
      sortedByType[type as keyof FrontendCallsOutput['byType']] = calls.sort((a, b) =>
        a.call.path.localeCompare(b.call.path)
      );
    }
  }

  return {
    ...output,
    byType: sortedByType
  };
}

/**
 * Main function: Generate frontend-calls.json from scanned elements
 *
 * @param elements - Array of scanned code elements
 * @param projectPath - Optional project path for metadata
 * @returns Formatted and sorted frontend calls output
 *
 * @example
 * import { scanCodebase } from '../scanner/scanner.js';
 * import { generateFrontendCalls } from './generateFrontendCalls.js';
 *
 * const elements = await scanCodebase(projectPath);
 * const calls = generateFrontendCalls(elements, projectPath);
 * // Returns sorted calls grouped by type
 */
export function generateFrontendCalls(
  elements: ElementData[],
  projectPath?: string
): FrontendCallsOutput {
  // Step 1: Filter elements with frontend call metadata
  const callElements = filterFrontendCallElements(elements);

  // Step 2: Format as JSON with type grouping
  const output = formatFrontendCallsJson(callElements, projectPath);

  // Step 3: Sort calls by path within each type
  return sortFrontendCalls(output);
}

/**
 * Generate frontend calls and save to file
 *
 * @param elements - Array of scanned code elements
 * @param outputPath - Path to save frontend-calls.json
 * @param projectPath - Optional project path for metadata
 *
 * @example
 * import { saveFrontendCallsToFile } from './generateFrontendCalls.js';
 *
 * await saveFrontendCallsToFile(elements, '/project/.coderef/frontend-calls.json', '/project');
 */
export async function saveFrontendCallsToFile(
  elements: ElementData[],
  outputPath: string,
  projectPath?: string
): Promise<void> {
  const calls = generateFrontendCalls(elements, projectPath);
  const fs = await import('fs/promises');
  const path = await import('path');

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });

  // Write formatted JSON
  await fs.writeFile(outputPath, JSON.stringify(calls, null, 2), 'utf-8');
}

/**
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Save Frontend Calls File Generation
 * Generates frontend-calls.json by scanning project files for API calls
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports FrontendCallElement, FrontendCallsOutput, formatFrontendCallsOutput, saveFrontendCalls, generateFrontendCallsOutput, countFrontendCalls
 * @used_by src/cli/scan-frontend-calls.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { scanProjectForFrontendCalls } from '../scanner/frontend-scanner.js';
import type { FrontendCall } from '../analyzer/frontend-call-parsers.js';

/**
 * Frontend call with source information
 */
export interface FrontendCallElement {
  /** API path being called */
  path: string;
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** File path where call is made */
  file: string;
  /** Line number in file */
  line: number;
  /** Type of API call (fetch, axios, reactQuery, custom) */
  callType: string;
  /** Confidence score (0-100) */
  confidence: number;
}

/**
 * Grouped frontend calls output structure
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
  /** All calls as flat array */
  calls: FrontendCallElement[];
  /** Generation metadata */
  metadata: {
    generatedAt: string;
    projectPath: string;
    scanVersion: string;
  };
}

/**
 * Convert FrontendCall to FrontendCallElement
 */
function convertToElement(call: FrontendCall): FrontendCallElement {
  return {
    path: call.path,
    method: call.method,
    file: call.file,
    line: call.line,
    callType: call.callType,
    confidence: call.confidence
  };
}

/**
 * Format frontend calls as JSON with call type grouping
 *
 * @param calls - Array of frontend calls from scanner
 * @param projectPath - Project path for metadata
 * @returns Formatted frontend calls output structure
 */
export function formatFrontendCallsOutput(
  calls: FrontendCall[],
  projectPath: string
): FrontendCallsOutput {
  // Convert to elements
  const elements = calls.map(convertToElement);

  // Group calls by type
  const byType: FrontendCallsOutput['byType'] = {
    fetch: [],
    axios: [],
    reactQuery: [],
    custom: []
  };

  for (const element of elements) {
    const callType = element.callType as keyof typeof byType;
    byType[callType]?.push(element);
  }

  // Remove empty type groups
  const cleanedByType: FrontendCallsOutput['byType'] = {};
  for (const [type, typeCalls] of Object.entries(byType)) {
    if (typeCalls && typeCalls.length > 0) {
      // Sort calls by path within each type
      cleanedByType[type as keyof FrontendCallsOutput['byType']] = typeCalls.sort((a, b) =>
        a.path.localeCompare(b.path)
      );
    }
  }

  // Sort all calls by path
  const sortedCalls = [...elements].sort((a, b) => a.path.localeCompare(b.path));

  return {
    totalCalls: calls.length,
    byType: cleanedByType,
    calls: sortedCalls,
    metadata: {
      generatedAt: new Date().toISOString(),
      projectPath,
      scanVersion: '1.0.0' // WO-ROUTE-VALIDATION-ENHANCEMENT-001
    }
  };
}

/**
 * Generate and save frontend-calls.json for a project
 *
 * @param projectPath - Absolute path to project root directory
 * @param outputPath - Optional custom output path (default: .coderef/frontend-calls.json)
 * @param extensions - Optional file extensions to scan (default: ['.js', '.jsx', '.ts', '.tsx', '.vue'])
 * @returns Path where frontend-calls.json was saved
 *
 * @example
 * // Basic usage - saves to .coderef/frontend-calls.json
 * await saveFrontendCalls('./my-project');
 *
 * @example
 * // Custom output path
 * await saveFrontendCalls('./my-project', './output/frontend-calls.json');
 *
 * @example
 * // Scan only TypeScript files
 * await saveFrontendCalls('./my-project', undefined, ['.ts', '.tsx']);
 */
export async function saveFrontendCalls(
  projectPath: string,
  outputPath?: string,
  extensions?: string[]
): Promise<string> {
  // Step 1: Scan project for frontend calls
  const calls = await scanProjectForFrontendCalls(projectPath, extensions);

  // Step 2: Format as structured output
  const output = formatFrontendCallsOutput(calls, projectPath);

  // Step 3: Determine output path
  const finalOutputPath = outputPath || path.join(projectPath, '.coderef', 'frontend-calls.json');

  // Step 4: Ensure directory exists
  const dir = path.dirname(finalOutputPath);
  await fs.mkdir(dir, { recursive: true });

  // Step 5: Write formatted JSON
  await fs.writeFile(finalOutputPath, JSON.stringify(output, null, 2), 'utf-8');

  return finalOutputPath;
}

/**
 * Generate frontend-calls.json without saving to file
 * Useful for programmatic access or testing
 *
 * @param projectPath - Absolute path to project root directory
 * @param extensions - Optional file extensions to scan
 * @returns Formatted frontend calls output
 *
 * @example
 * const output = await generateFrontendCallsOutput('./my-project');
 * console.log(`Found ${output.totalCalls} API calls`);
 * console.log(`Fetch calls: ${output.byType.fetch?.length || 0}`);
 */
export async function generateFrontendCallsOutput(
  projectPath: string,
  extensions?: string[]
): Promise<FrontendCallsOutput> {
  const calls = await scanProjectForFrontendCalls(projectPath, extensions);
  return formatFrontendCallsOutput(calls, projectPath);
}

/**
 * Quick check: Count frontend calls without full processing
 * Useful for validation or quick stats
 *
 * @param projectPath - Absolute path to project root directory
 * @param extensions - Optional file extensions to scan
 * @returns Number of frontend API calls detected
 *
 * @example
 * const count = await countFrontendCalls('./my-project');
 * console.log(`Found ${count} frontend API calls`);
 */
export async function countFrontendCalls(
  projectPath: string,
  extensions?: string[]
): Promise<number> {
  const calls = await scanProjectForFrontendCalls(projectPath, extensions);
  return calls.length;
}

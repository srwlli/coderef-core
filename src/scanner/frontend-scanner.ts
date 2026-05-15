/**
 * @coderef-semantic: 1.0.0
 * @exports scanFileForFrontendCalls, attachFrontendCalls, scanProjectForFrontendCalls
 * @used_by src/fileGeneration/saveFrontendCalls.ts
 */

/**
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Frontend Call Scanner
 * Scans files for frontend API calls and attaches metadata to elements
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { parseFetchCalls, parseAxiosCalls, parseReactQueryCalls, parseCustomApiCalls } from '../analyzer/frontend-call-parsers.js';
import type { FrontendCall } from '../analyzer/frontend-call-parsers.js';
import type { ElementData } from '../types/types.js';

/**
 * Scan a single file for frontend API calls
 *
 * @param filePath - Absolute path to file
 * @returns Array of frontend calls found in file
 */
export async function scanFileForFrontendCalls(filePath: string): Promise<FrontendCall[]> {
  try {
    // Only scan frontend files
    if (!isFrontendFile(filePath)) {
      return [];
    }

    const code = await fs.readFile(filePath, 'utf-8');

    // Run all parsers
    const calls = [
      ...parseFetchCalls(code, filePath),
      ...parseAxiosCalls(code, filePath),
      ...parseReactQueryCalls(code, filePath),
      ...parseCustomApiCalls(code, filePath)
    ];

    return calls;
  } catch (error) {
    // If file can't be read or parsed, return empty array
    return [];
  }
}

/**
 * Check if file is a frontend file that might contain API calls
 */
function isFrontendFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const frontendExtensions = ['.js', '.jsx', '.ts', '.tsx', '.vue'];
  return frontendExtensions.includes(ext);
}

/**
 * Attach frontend call metadata to elements
 *
 * @param elements - Array of scanned code elements
 * @returns Elements with frontendCall metadata attached
 *
 * @example
 * const elements = await scanCurrentElements('./src', ['ts', 'tsx']);
 * const enriched = await attachFrontendCalls(elements);
 * // Now elements have .frontendCall property if they contain API calls
 */
export async function attachFrontendCalls(elements: ElementData[]): Promise<ElementData[]> {
  // Group elements by file for efficiency
  const elementsByFile = new Map<string, ElementData[]>();

  for (const element of elements) {
    const fileElements = elementsByFile.get(element.file) || [];
    fileElements.push(element);
    elementsByFile.set(element.file, fileElements);
  }

  // Scan each file once
  const enrichedElements: ElementData[] = [];

  for (const [filePath, fileElements] of elementsByFile) {
    const calls = await scanFileForFrontendCalls(filePath);

    // Attach calls to elements based on line numbers
    for (const element of fileElements) {
      // Find call closest to this element's line number
      const closestCall = findClosestCall(element.line, calls);

      if (closestCall) {
        enrichedElements.push({
          ...element,
          frontendCall: closestCall
        });
      } else {
        enrichedElements.push(element);
      }
    }
  }

  return enrichedElements;
}

/**
 * Find the frontend call closest to a given line number
 */
function findClosestCall(line: number, calls: FrontendCall[]): FrontendCall | undefined {
  if (calls.length === 0) return undefined;

  // Find call with line number closest to target
  let closest = calls[0];
  let minDistance = Math.abs(calls[0].line - line);

  for (const call of calls) {
    const distance = Math.abs(call.line - line);
    if (distance < minDistance) {
      minDistance = distance;
      closest = call;
    }
  }

  // Only return if within 10 lines (reasonable proximity)
  return minDistance <= 10 ? closest : undefined;
}

/**
 * Scan entire project for frontend calls without attaching to elements
 * Useful for generating frontend-calls.json directly
 *
 * @param projectPath - Project root directory
 * @param extensions - File extensions to scan (default: ['.js', '.jsx', '.ts', '.tsx'])
 * @returns Array of all frontend calls found
 *
 * @example
 * const calls = await scanProjectForFrontendCalls('./my-project');
 * console.log(`Found ${calls.length} API calls`);
 */
export async function scanProjectForFrontendCalls(
  projectPath: string,
  extensions: string[] = ['.js', '.jsx', '.ts', '.tsx', '.vue']
): Promise<FrontendCall[]> {
  const allCalls: FrontendCall[] = [];

  // Recursively find all files with matching extensions
  const files = await findFiles(projectPath, extensions);

  // Scan each file
  for (const file of files) {
    const calls = await scanFileForFrontendCalls(file);
    allCalls.push(...calls);
  }

  // Filter out non-API paths (assets, components, etc.)
  return allCalls.filter(isLikelyApiCall);
}

/**
 * Check if a path looks like an actual API call (not an asset or component fetch)
 */
function isLikelyApiCall(call: FrontendCall): boolean {
  const path = call.path.toLowerCase();

  // Include: Paths that start with /api, /v1, /v2, etc.
  if (path.startsWith('/api/') ||
      path.match(/^\/v\d+\//) ||
      path.startsWith('/graphql') ||
      path.startsWith('/rest/')) {
    return true;
  }

  // Exclude: Static assets
  const assetExtensions = ['.js', '.css', '.html', '.json', '.xml', '.txt', '.md', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
  if (assetExtensions.some(ext => path.endsWith(ext))) {
    return false;
  }

  // Exclude: Component imports (usually have file extensions or special patterns)
  if (path.includes('/components/') ||
      path.includes('/widgets/') ||
      path.includes('.tsx') ||
      path.includes('.jsx')) {
    return false;
  }

  // Exclude: Relative imports that look like module imports
  if (path.startsWith('./') || path.startsWith('../')) {
    return false;
  }

  // Include: Anything else that starts with / (likely a backend route)
  if (path.startsWith('/')) {
    return true;
  }

  // Exclude: Everything else (likely not an API call)
  return false;
}

/**
 * Recursively find all files with matching extensions
 */
async function findFiles(dir: string, extensions: string[]): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules, dist, build, etc.
      if (shouldSkipDirectory(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        const subFiles = await findFiles(fullPath, extensions);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }

  return files;
}

/**
 * Check if directory should be skipped during scanning
 */
function shouldSkipDirectory(dirName: string): boolean {
  const skipDirs = [
    'node_modules',
    'dist',
    'build',
    '.git',
    '.next',
    'out',
    'coverage',
    '.cache',
    '.vscode',
    '.idea',
    'archived',    // Skip archived files
    'coderef',     // Skip coderef metadata
    '__tests__',   // Skip test directories
    'test',
    'tests'
  ];

  return skipDirs.includes(dirName) || dirName.startsWith('.');
}

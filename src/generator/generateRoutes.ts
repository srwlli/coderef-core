/**
 * WO-API-ROUTE-DETECTION-001: Route Generation Module
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Added Frontend Call Generation
 * Filters route-enabled elements and generates routes.json output
 * Filters frontend API call elements and generates frontend-calls.json output
 */

import { ElementData, RouteMetadata, FrontendCall } from '../types/types.js';

/**
 * Route element with metadata extracted
 */
export interface RouteElement {
  /** Element name (function/handler name) */
  name: string;
  /** File path where route is defined */
  file: string;
  /** Line number in file */
  line: number;
  /** Route metadata (path, methods, framework, blueprint) */
  route: RouteMetadata;
}

/**
 * Grouped routes by framework
 */
export interface RoutesOutput {
  /** Total number of routes detected */
  totalRoutes: number;
  /** Routes grouped by framework */
  byFramework: {
    flask?: RouteElement[];
    fastapi?: RouteElement[];
    express?: RouteElement[];
    nextjs?: RouteElement[];
  };
  /** Generation metadata */
  metadata: {
    generatedAt: string;
    projectPath?: string;
    scanVersion?: string;
  };
}

/**
 * Filter elements that have route metadata
 *
 * @param elements - Array of scanned code elements
 * @returns Array of elements with route metadata
 *
 * @example
 * const elements = await scanCodebase(projectPath);
 * const routeElements = filterRouteElements(elements);
 * // Returns: [{ name: 'getUsers', file: 'app.py', line: 10, route: {...} }]
 */
export function filterRouteElements(elements: ElementData[]): RouteElement[] {
  return elements
    .filter(element => element.route !== undefined)
    .map(element => ({
      name: element.name,
      file: element.file,
      line: element.line,
      route: element.route!
    }));
}

/**
 * Format routes as JSON with framework grouping
 *
 * @param routeElements - Array of route elements
 * @param projectPath - Optional project path for metadata
 * @returns Formatted routes output structure
 *
 * @example
 * const routeElements = filterRouteElements(elements);
 * const output = formatRoutesJson(routeElements, '/project');
 * // Returns: { totalRoutes: 5, byFramework: { flask: [...], express: [...] }, metadata: {...} }
 */
export function formatRoutesJson(
  routeElements: RouteElement[],
  projectPath?: string
): RoutesOutput {
  // Group routes by framework
  const byFramework: RoutesOutput['byFramework'] = {
    flask: [],
    fastapi: [],
    express: [],
    nextjs: []
  };

  for (const routeElement of routeElements) {
    const framework = routeElement.route.framework;
    byFramework[framework]?.push(routeElement);
  }

  // Remove empty framework groups
  const cleanedByFramework: RoutesOutput['byFramework'] = {};
  for (const [framework, routes] of Object.entries(byFramework)) {
    if (routes && routes.length > 0) {
      cleanedByFramework[framework as keyof RoutesOutput['byFramework']] = routes;
    }
  }

  return {
    totalRoutes: routeElements.length,
    byFramework: cleanedByFramework,
    metadata: {
      generatedAt: new Date().toISOString(),
      projectPath,
      scanVersion: '1.0.0' // WO-API-ROUTE-DETECTION-001
    }
  };
}

/**
 * Sort routes within each framework group by path
 *
 * @param output - Routes output structure
 * @returns Sorted routes output
 */
export function sortRoutes(output: RoutesOutput): RoutesOutput {
  const sortedByFramework: RoutesOutput['byFramework'] = {};

  for (const [framework, routes] of Object.entries(output.byFramework)) {
    if (routes && routes.length > 0) {
      sortedByFramework[framework as keyof RoutesOutput['byFramework']] = routes.sort((a, b) =>
        a.route.path.localeCompare(b.route.path)
      );
    }
  }

  return {
    ...output,
    byFramework: sortedByFramework
  };
}

/**
 * Main function: Generate routes.json from scanned elements
 *
 * @param elements - Array of scanned code elements
 * @param projectPath - Optional project path for metadata
 * @returns Formatted and sorted routes output
 *
 * @example
 * import { scanCodebase } from '../scanner/scanner.js';
 * import { generateRoutes } from './generateRoutes.js';
 *
 * const elements = await scanCodebase(projectPath);
 * const routes = generateRoutes(elements, projectPath);
 * // Returns sorted routes grouped by framework
 */
export function generateRoutes(
  elements: ElementData[],
  projectPath?: string
): RoutesOutput {
  // Step 1: Filter elements with route metadata
  const routeElements = filterRouteElements(elements);

  // Step 2: Format as JSON with framework grouping
  const output = formatRoutesJson(routeElements, projectPath);

  // Step 3: Sort routes by path within each framework
  return sortRoutes(output);
}

/**
 * Generate routes and save to file
 *
 * @param elements - Array of scanned code elements
 * @param outputPath - Path to save routes.json
 * @param projectPath - Optional project path for metadata
 *
 * @example
 * import { saveRoutesToFile } from './generateRoutes.js';
 *
 * await saveRoutesToFile(elements, '/project/.coderef/routes.json', '/project');
 */
export async function saveRoutesToFile(
  elements: ElementData[],
  outputPath: string,
  projectPath?: string
): Promise<void> {
  const routes = generateRoutes(elements, projectPath);
  const fs = await import('fs/promises');
  const path = await import('path');

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });

  // Write formatted JSON
  await fs.writeFile(outputPath, JSON.stringify(routes, null, 2), 'utf-8');
}

// ============================================================================
// WO-ROUTE-VALIDATION-ENHANCEMENT-001: Frontend Call Generation
// ============================================================================

/**
 * Frontend call element with metadata extracted
 */
export interface FrontendCallElement {
  /** API path called */
  path: string;
  /** HTTP method */
  method: string;
  /** File path where call is made */
  file: string;
  /** Line number in file */
  line: number;
  /** Type of API call (fetch, axios, reactQuery, custom) */
  callType: FrontendCall['callType'];
  /** Confidence score (100 for static, 80 for template literals) */
  confidence: number;
}

/**
 * Grouped frontend calls by call type
 */
export interface FrontendCallsOutput {
  /** Total number of frontend API calls detected */
  totalCalls: number;
  /** Calls grouped by call type */
  byCallType: {
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
 * @returns Array of frontend call elements
 *
 * @example
 * const elements = await scanCodebase(projectPath);
 * const frontendCalls = filterFrontendCallElements(elements);
 * // Returns: [{ path: '/api/users', method: 'GET', file: 'app.tsx', line: 15, callType: 'fetch', confidence: 100 }]
 */
export function filterFrontendCallElements(elements: ElementData[]): FrontendCallElement[] {
  return elements
    .filter(element => element.frontendCall !== undefined)
    .map(element => ({
      path: element.frontendCall!.path,
      method: element.frontendCall!.method,
      file: element.frontendCall!.file,
      line: element.frontendCall!.line,
      callType: element.frontendCall!.callType,
      confidence: element.frontendCall!.confidence
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
 * // Returns: { totalCalls: 12, byCallType: { fetch: [...], axios: [...] }, metadata: {...} }
 */
export function formatFrontendCallsJson(
  callElements: FrontendCallElement[],
  projectPath?: string
): FrontendCallsOutput {
  // Group calls by call type
  const byCallType: FrontendCallsOutput['byCallType'] = {
    fetch: [],
    axios: [],
    reactQuery: [],
    custom: []
  };

  for (const callElement of callElements) {
    const callType = callElement.callType;
    byCallType[callType]?.push(callElement);
  }

  // Remove empty call type groups
  const cleanedByCallType: FrontendCallsOutput['byCallType'] = {};
  for (const [callType, calls] of Object.entries(byCallType)) {
    if (calls && calls.length > 0) {
      cleanedByCallType[callType as keyof FrontendCallsOutput['byCallType']] = calls;
    }
  }

  return {
    totalCalls: callElements.length,
    byCallType: cleanedByCallType,
    metadata: {
      generatedAt: new Date().toISOString(),
      projectPath,
      scanVersion: '1.0.0' // WO-ROUTE-VALIDATION-ENHANCEMENT-001
    }
  };
}

/**
 * Sort frontend calls within each call type group by path, then by file
 *
 * @param output - Frontend calls output structure
 * @returns Sorted frontend calls output
 */
export function sortFrontendCalls(output: FrontendCallsOutput): FrontendCallsOutput {
  const sortedByCallType: FrontendCallsOutput['byCallType'] = {};

  for (const [callType, calls] of Object.entries(output.byCallType)) {
    if (calls && calls.length > 0) {
      sortedByCallType[callType as keyof FrontendCallsOutput['byCallType']] = calls.sort((a, b) => {
        // Sort by path first
        const pathCompare = a.path.localeCompare(b.path);
        if (pathCompare !== 0) return pathCompare;
        // Then by file
        return a.file.localeCompare(b.file);
      });
    }
  }

  return {
    ...output,
    byCallType: sortedByCallType
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
 * import { generateFrontendCalls } from './generateRoutes.js';
 *
 * const elements = await scanCodebase(projectPath);
 * const frontendCalls = generateFrontendCalls(elements, projectPath);
 * // Returns sorted frontend calls grouped by call type
 */
export function generateFrontendCalls(
  elements: ElementData[],
  projectPath?: string
): FrontendCallsOutput {
  // Step 1: Filter elements with frontend call metadata
  const callElements = filterFrontendCallElements(elements);

  // Step 2: Format as JSON with call type grouping
  const output = formatFrontendCallsJson(callElements, projectPath);

  // Step 3: Sort calls by path within each call type
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
 * import { saveFrontendCallsToFile } from './generateRoutes.js';
 *
 * await saveFrontendCallsToFile(elements, '/project/.coderef/frontend-calls.json', '/project');
 */
export async function saveFrontendCallsToFile(
  elements: ElementData[],
  outputPath: string,
  projectPath?: string
): Promise<void> {
  const frontendCalls = generateFrontendCalls(elements, projectPath);
  const fs = await import('fs/promises');
  const path = await import('path');

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });

  // Write formatted JSON
  await fs.writeFile(outputPath, JSON.stringify(frontendCalls, null, 2), 'utf-8');
}

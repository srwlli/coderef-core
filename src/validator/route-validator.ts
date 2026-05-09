/**
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Route Validation Engine
 * Phase 3: Validates frontend API calls against server routes
 */

/**
 * @semantic
 * exports: [loadFrontendCalls, loadServerRoutes, detectMissingRoutes, detectUnusedRoutes, detectMethodMismatches, classifyIssue, generateValidationReport, saveValidationReport, loadMigrationMapping, validateMigration]
 * used_by: [src/cli/validate-routes.ts]
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  FrontendCall,
  RouteMetadata,
  ValidationIssue,
  RouteValidation
} from '../types/types.js';
import { normalizeRoutePath, type NormalizedRoute } from './route-normalizer.js';
import { findBestMatch, calculateMatchConfidence } from './route-matcher.js';

/**
 * Load frontend API calls from frontend-calls.json
 *
 * @param filePath - Path to frontend-calls.json file
 * @returns Array of frontend calls
 *
 * @example
 * const calls = await loadFrontendCalls('./.coderef/frontend-calls.json');
 */
export async function loadFrontendCalls(filePath: string): Promise<FrontendCall[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Check for flat calls array first (new format from scan-frontend-calls)
    if (Array.isArray(data.calls)) {
      return data.calls;
    }

    // Fall back to grouped structure for backwards compatibility
    const allCalls: FrontendCall[] = [];

    // Support both byType (new) and byCallType (legacy)
    const groupedCalls = data.byType || data.byCallType;

    if (groupedCalls) {
      for (const callType of Object.values(groupedCalls)) {
        if (Array.isArray(callType)) {
          allCalls.push(...callType);
        }
      }
    }

    return allCalls;
  } catch (error) {
    throw new Error(`Failed to load frontend calls from ${filePath}: ${error}`);
  }
}

/**
 * Load server routes from routes.json
 *
 * @param filePath - Path to routes.json file
 * @returns Array of server routes
 *
 * @example
 * const routes = await loadServerRoutes('./.coderef/routes.json');
 */
export async function loadServerRoutes(
  filePath: string
): Promise<Array<RouteMetadata & { path: string }>> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Extract routes from grouped structure
    const allRoutes: Array<RouteMetadata & { path: string }> = [];

    if (data.byFramework) {
      for (const frameworkRoutes of Object.values(data.byFramework)) {
        if (Array.isArray(frameworkRoutes)) {
          for (const routeElement of frameworkRoutes) {
            if (routeElement.route) {
              allRoutes.push({
                ...routeElement.route,
                path: routeElement.route.path
              });
            }
          }
        }
      }
    }

    return allRoutes;
  } catch (error) {
    throw new Error(`Failed to load server routes from ${filePath}: ${error}`);
  }
}

/**
 * Detect frontend calls that have no matching server route
 *
 * @param frontendCalls - Array of frontend API calls
 * @param serverRoutes - Array of server routes
 * @returns Array of validation issues for missing routes
 *
 * @example
 * const issues = detectMissingRoutes(frontendCalls, serverRoutes);
 * // Returns issues with type 'missing_route'
 */
export function detectMissingRoutes(
  frontendCalls: FrontendCall[],
  serverRoutes: Array<RouteMetadata & { path: string }>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Normalize all server routes
  const normalizedServerRoutes: NormalizedRoute[] = serverRoutes.map(route =>
    normalizeRoutePath(route.path, route.framework)
  );

  for (const call of frontendCalls) {
    // Try to find matching server route
    const match = findBestMatch(call.path, normalizedServerRoutes, call.method);

    // No match found or very low confidence
    if (!match || match.match.confidence < 50) {
      issues.push({
        type: 'missing_route',
        severity: 'critical',
        frontendCall: call,
        message: `No server route found for ${call.method} ${call.path}`,
        suggestion: `Add a server route handler for ${call.method} ${call.path} or verify the frontend call is correct (${call.file}:${call.line})`
      });
    }
  }

  return issues;
}

/**
 * Detect server routes that are never called by frontend
 *
 * @param frontendCalls - Array of frontend API calls
 * @param serverRoutes - Array of server routes
 * @returns Array of validation issues for unused routes
 *
 * @example
 * const issues = detectUnusedRoutes(frontendCalls, serverRoutes);
 * // Returns issues with type 'unused_route'
 */
export function detectUnusedRoutes(
  frontendCalls: FrontendCall[],
  serverRoutes: Array<RouteMetadata & { path: string }>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Normalize all frontend calls
  const normalizedFrontendPaths = frontendCalls.map(call => ({
    path: call.path,
    method: call.method
  }));

  for (const route of serverRoutes) {
    const normalizedRoute = normalizeRoutePath(route.path, route.framework);

    // Check if any frontend call matches this route
    let isUsed = false;

    for (const call of normalizedFrontendPaths) {
      const match = calculateMatchConfidence(call.path, normalizedRoute, call.method);
      if (match.matched && match.confidence >= 50) {
        isUsed = true;
        break;
      }
    }

    if (!isUsed) {
      issues.push({
        type: 'unused_route',
        severity: 'warning',
        serverRoute: route,
        message: `Server route ${route.methods.join('/')} ${route.path} is not called by any frontend code`,
        suggestion: 'Consider removing this route if it is truly unused, or verify frontend code is complete'
      });
    }
  }

  return issues;
}

/**
 * Detect HTTP method mismatches between frontend and server
 *
 * @param frontendCalls - Array of frontend API calls
 * @param serverRoutes - Array of server routes
 * @returns Array of validation issues for method mismatches
 *
 * @example
 * const issues = detectMethodMismatches(frontendCalls, serverRoutes);
 * // Returns issues with type 'method_mismatch'
 */
export function detectMethodMismatches(
  frontendCalls: FrontendCall[],
  serverRoutes: Array<RouteMetadata & { path: string }>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const normalizedServerRoutes: NormalizedRoute[] = serverRoutes.map(route => ({
    ...normalizeRoutePath(route.path, route.framework),
    methods: route.methods
  }));

  for (const call of frontendCalls) {
    const match = findBestMatch(call.path, normalizedServerRoutes, call.method);

    // Path matches but method doesn't
    if (match && match.match.matched && !match.match.methodsMatch) {
      const serverRoute = serverRoutes.find(r => r.path === match.route.path);

      issues.push({
        type: 'method_mismatch',
        severity: 'critical',
        frontendCall: call,
        serverRoute,
        message: `HTTP method mismatch: Frontend calls ${call.method} ${call.path} but server only supports ${match.route.methods.join(', ')}`,
        suggestion: `Update frontend to use ${match.route.methods[0]} or add ${call.method} support to server route (${call.file}:${call.line})`
      });
    }
  }

  return issues;
}

/**
 * Classify validation issue severity
 *
 * @param issue - Validation issue to classify
 * @returns Severity level
 *
 * @example
 * classifyIssue({ type: 'missing_route', ... })
 * // Returns: 'critical'
 */
export function classifyIssue(issue: ValidationIssue): 'critical' | 'warning' | 'info' {
  switch (issue.type) {
    case 'missing_route':
    case 'method_mismatch':
      return 'critical';
    case 'unused_route':
      return 'warning';
    case 'path_mismatch':
      return 'info';
    default:
      return 'warning';
  }
}

/**
 * Generate complete validation report
 *
 * @param frontendCallsPath - Path to frontend-calls.json
 * @param serverRoutesPath - Path to routes.json
 * @returns Complete validation report
 *
 * @example
 * const report = await generateValidationReport(
 *   './.coderef/frontend-calls.json',
 *   './.coderef/routes.json'
 * );
 */
export async function generateValidationReport(
  frontendCallsPath: string,
  serverRoutesPath: string
): Promise<RouteValidation> {
  // Load data
  const frontendCalls = await loadFrontendCalls(frontendCallsPath);
  const serverRoutes = await loadServerRoutes(serverRoutesPath);

  // Run all validation checks
  const missingRoutes = detectMissingRoutes(frontendCalls, serverRoutes);
  const unusedRoutes = detectUnusedRoutes(frontendCalls, serverRoutes);
  const methodMismatches = detectMethodMismatches(frontendCalls, serverRoutes);

  // Combine all issues
  const allIssues = [...missingRoutes, ...unusedRoutes, ...methodMismatches];

  // Calculate matched routes (frontend calls that found a match)
  const normalizedServerRoutes = serverRoutes.map(route =>
    normalizeRoutePath(route.path, route.framework)
  );

  let matchedCount = 0;
  for (const call of frontendCalls) {
    const match = findBestMatch(call.path, normalizedServerRoutes, call.method);
    if (match && match.match.confidence >= 50 && match.match.methodsMatch) {
      matchedCount++;
    }
  }

  // Summarize by severity
  const summary = {
    critical: allIssues.filter(i => classifyIssue(i) === 'critical').length,
    warnings: allIssues.filter(i => classifyIssue(i) === 'warning').length,
    info: allIssues.filter(i => classifyIssue(i) === 'info').length
  };

  return {
    totalFrontendCalls: frontendCalls.length,
    totalServerRoutes: serverRoutes.length,
    matchedRoutes: matchedCount,
    issues: allIssues,
    summary
  };
}

/**
 * Save validation report to JSON file
 *
 * @param report - Validation report
 * @param outputPath - Path to save report
 *
 * @example
 * await saveValidationReport(report, './.coderef/validation-report.json');
 */
export async function saveValidationReport(
  report: RouteValidation,
  outputPath: string
): Promise<void> {
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf-8');
}

/**
 * Load migration mapping configuration from JSON file
 * WO-MIGRATION-VALIDATION-001
 *
 * @param filePath - Path to migration-config.json
 * @returns Migration mapping configuration
 *
 * @example
 * const config = await loadMigrationMapping('./migration-config.json');
 */
export async function loadMigrationMapping(filePath: string): Promise<import('../types/types.js').MigrationMapping> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load migration mapping from ${filePath}: ${error}`);
  }
}

/**
 * Validate migration between old and new route systems
 * WO-MIGRATION-VALIDATION-001
 *
 * @param frontendCallsPath - Path to frontend-calls.json
 * @param oldRoutesPath - Path to old routes.json
 * @param newRoutesPath - Path to new routes.json
 * @param migrationConfigPath - Path to migration-config.json
 * @returns Migration validation report
 *
 * @example
 * const report = await validateMigration(
 *   './.coderef/frontend-calls.json',
 *   './.coderef/routes-old.json',
 *   './.coderef/routes-new.json',
 *   './migration-config.json'
 * );
 * console.log(`Coverage: ${report.migration.coverage.coverage}%`);
 */
export async function validateMigration(
  frontendCallsPath: string,
  oldRoutesPath: string,
  newRoutesPath: string,
  migrationConfigPath: string
): Promise<import('../types/types.js').MigrationReport> {
  const {
    validateMigrationConfig,
    applyMappings,
    calculateMigrationCoverage,
    findUnmappedCalls,
    findDeprecatedCalls
  } = await import('./migration-mapper.js');

  // Load all data
  const frontendCalls = await loadFrontendCalls(frontendCallsPath);
  const oldRoutes = await loadServerRoutes(oldRoutesPath);
  const newRoutes = await loadServerRoutes(newRoutesPath);
  const migrationConfig = await loadMigrationMapping(migrationConfigPath);

  // Validate migration config
  const configValidation = validateMigrationConfig(migrationConfig);
  if (!configValidation.valid) {
    throw new Error(`Invalid migration config: ${configValidation.errors.join(', ')}`);
  }

  // Apply mappings to frontend calls
  const transformations = frontendCalls.map(call =>
    applyMappings(call.path, migrationConfig)
  );

  // Create transformed frontend calls for validation
  const transformedCalls = frontendCalls.map((call, index) => ({
    ...call,
    path: transformations[index].transformedPath
  }));

  // Run validation checks on transformed calls vs new routes
  const missingRoutes = detectMissingRoutes(transformedCalls, newRoutes);
  const unusedRoutes = detectUnusedRoutes(transformedCalls, newRoutes);
  const methodMismatches = detectMethodMismatches(transformedCalls, newRoutes);

  // Combine all issues
  const allIssues = [...missingRoutes, ...unusedRoutes, ...methodMismatches];

  // Calculate matched routes (frontend calls that found a match)
  const normalizedServerRoutes = newRoutes.map(route =>
    normalizeRoutePath(route.path, route.framework)
  );

  let matchedCount = 0;
  for (const call of transformedCalls) {
    const match = findBestMatch(call.path, normalizedServerRoutes, call.method);
    if (match && match.match.confidence >= 50 && match.match.methodsMatch) {
      matchedCount++;
    }
  }

  // Summarize by severity
  const summary = {
    critical: allIssues.filter(i => classifyIssue(i) === 'critical').length,
    warnings: allIssues.filter(i => classifyIssue(i) === 'warning').length,
    info: allIssues.filter(i => classifyIssue(i) === 'info').length
  };

  // Calculate migration coverage
  const coverage = calculateMigrationCoverage(oldRoutes, newRoutes, transformations);

  // Find unmapped and deprecated calls
  const unmapped = findUnmappedCalls(frontendCalls, transformations);
  const deprecated = migrationConfig.mappings.deprecated
    ? frontendCalls.filter(call => migrationConfig.mappings.deprecated!.includes(call.path))
    : [];

  // Build migration report
  const migrationReport: import('../types/types.js').MigrationReport = {
    totalFrontendCalls: frontendCalls.length,
    totalServerRoutes: newRoutes.length,
    matchedRoutes: matchedCount,
    issues: allIssues,
    summary,
    migration: {
      totalMapped: transformations.filter(t => t.confidence > 0).length,
      unmapped,
      deprecated,
      coverage
    }
  };

  return migrationReport;
}

/**
 * @coderef-semantic: 1.0.0
 * @exports ApiEndpoint, detectPatterns, getApiEndpointStats
 */



/**
 * Detect Patterns - Find common code patterns
 *
 * Outputs: .coderef/reports/patterns.json
 *
 * @module fileGeneration/detectPatterns
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ElementData, RouteMetadata } from '../types/types.js';
import { extractAllRoutes, type MigrationRouteElement } from '../analyzer/migration-route-analyzer.js';

interface PatternReport {
  version: string;
  generatedAt: string;
  projectPath: string;
  patterns: {
    handlers: PatternMatch[];
    decorators: PatternMatch[];
    errorPatterns: PatternMatch[];
    testPatterns: PatternMatch[];
    apiEndpoints: ApiEndpoint[];
  };
  statistics: {
    totalHandlers: number;
    totalDecorators: number;
    totalErrorPatterns: number;
    totalTestPatterns: number;
    totalApiEndpoints: number;
  };
}

interface PatternMatch {
  type: string;
  name: string;
  file: string;
  line: number;
  count?: number;
}

/**
 * IMP-CORE-039: Enhanced API endpoint detection with RouteMetadata
 */
export interface ApiEndpoint {
  /** Endpoint type */
  type: 'api-endpoint';
  /** Handler/function name */
  name: string;
  /** File path where endpoint is defined */
  file: string;
  /** Line number in file */
  line: number;
  /** Route path (e.g., '/api/users', '/users/<int:id>') */
  path: string;
  /** HTTP methods (e.g., ['GET', 'POST']) */
  methods: string[];
  /** Framework type */
  framework: RouteMetadata['framework'];
  /** Optional: Blueprint or router name */
  blueprint?: string;
}

/**
 * Detect common code patterns in the codebase
 *
 * @param projectPath - Absolute path to project root
 * @param elements - Array of code elements from scan
 * @returns Promise that resolves when file is written
 */
export async function detectPatterns(
  projectPath: string,
  elements: ElementData[]
): Promise<void> {
  // Detect various patterns
  const handlers = detectHandlers(elements);
  const decorators = detectDecorators(elements);
  const errorPatterns = detectErrorPatterns(elements);
  const testPatterns = detectTestPatterns(elements);
  const apiEndpoints = detectApiEndpoints(elements);

  // Build report
  const report: PatternReport = {
    version: '3.0.0-IMP-CORE-039',
    generatedAt: new Date().toISOString(),
    projectPath,
    patterns: {
      handlers,
      decorators,
      errorPatterns,
      testPatterns,
      apiEndpoints,
    },
    statistics: {
      totalHandlers: handlers.length,
      totalDecorators: decorators.length,
      totalErrorPatterns: errorPatterns.length,
      totalTestPatterns: testPatterns.length,
      totalApiEndpoints: apiEndpoints.length,
    },
  };

  // Ensure reports directory exists
  const reportsDir = path.join(projectPath, '.coderef', 'reports');
  await fs.mkdir(reportsDir, { recursive: true });

  // Write report
  const reportPath = path.join(reportsDir, 'patterns.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
}

/**
 * Detect event handlers (onClick, onSubmit, onChange, etc.)
 */
function detectHandlers(elements: ElementData[]): PatternMatch[] {
  const handlers: PatternMatch[] = [];
  const handlerPrefixes = ['on', 'handle'];

  for (const element of elements) {
    const nameLower = element.name.toLowerCase();

    // Check if name starts with handler prefix
    if (handlerPrefixes.some(prefix => nameLower.startsWith(prefix))) {
      handlers.push({
        type: 'handler',
        name: element.name,
        file: element.file,
        line: element.line,
      });
    }
  }

  return handlers;
}

/**
 * Detect decorators (@decorator syntax)
 */
function detectDecorators(elements: ElementData[]): PatternMatch[] {
  const decorators: PatternMatch[] = [];

  for (const element of elements) {
    // Check if name starts with @ (decorator syntax)
    if (element.name.startsWith('@')) {
      decorators.push({
        type: 'decorator',
        name: element.name,
        file: element.file,
        line: element.line,
      });
    }
  }

  return decorators;
}

/**
 * Detect error handling patterns
 */
function detectErrorPatterns(elements: ElementData[]): PatternMatch[] {
  const patterns: PatternMatch[] = [];
  const errorKeywords = ['error', 'exception', 'catch', 'throw'];

  for (const element of elements) {
    const nameLower = element.name.toLowerCase();

    // Check if name contains error-related keywords
    if (errorKeywords.some(keyword => nameLower.includes(keyword))) {
      patterns.push({
        type: 'error-handling',
        name: element.name,
        file: element.file,
        line: element.line,
      });
    }
  }

  return patterns;
}

/**
 * Detect test patterns (test, describe, it, etc.)
 */
function detectTestPatterns(elements: ElementData[]): PatternMatch[] {
  const patterns: PatternMatch[] = [];
  const testKeywords = ['test', 'describe', 'it', 'should', 'spec'];

  for (const element of elements) {
    const nameLower = element.name.toLowerCase();
    const fileLower = element.file.toLowerCase();

    // Check if name or file contains test-related keywords
    if (testKeywords.some(keyword => nameLower.includes(keyword) || fileLower.includes(keyword))) {
      patterns.push({
        type: 'test',
        name: element.name,
        file: element.file,
        line: element.line,
      });
    }
  }

  return patterns;
}

/**
 * IMP-CORE-039: Detect API endpoints using rich RouteMetadata
 *
 * Replaces keyword matching with structured route extraction.
 * Provides full path, methods, framework, and blueprint information.
 *
 * @param elements - Array of code elements from scan
 * @returns Array of API endpoints with full metadata
 */
function detectApiEndpoints(elements: ElementData[]): ApiEndpoint[] {
  // Use MigrationRouteAnalyzer for unified extraction
  const routes = extractAllRoutes(elements);

  // Convert to ApiEndpoint format
  return routes.map(route => ({
    type: 'api-endpoint',
    name: route.name,
    file: route.file,
    line: route.line,
    path: route.route.path,
    methods: route.route.methods,
    framework: route.route.framework,
    blueprint: route.route.blueprint
  }));
}

/**
 * IMP-CORE-039: Get detailed API endpoint statistics by framework
 *
 * @param elements - Array of code elements from scan
 * @returns Framework statistics for migration analysis
 */
export function getApiEndpointStats(elements: ElementData[]): Record<string, {
  total: number;
  byMethod: Record<string, number>;
  paths: string[];
}> {
  const routes = extractAllRoutes(elements);
  const stats: Record<string, { total: number; byMethod: Record<string, number>; paths: string[] }> = {};

  for (const route of routes) {
    const fw = route.route.framework;

    if (!stats[fw]) {
      stats[fw] = {
        total: 0,
        byMethod: {},
        paths: []
      };
    }

    stats[fw].total++;
    stats[fw].paths.push(route.route.path);

    for (const method of route.route.methods) {
      const upperMethod = method.toUpperCase();
      stats[fw].byMethod[upperMethod] = (stats[fw].byMethod[upperMethod] || 0) + 1;
    }
  }

  // Sort paths alphabetically for consistent output
  for (const fw of Object.keys(stats)) {
    stats[fw].paths.sort();
  }

  return stats;
}

/**
 * @coderef-semantic: 1.0.0
 * @exports MigrationRouteElement, AffectedCaller, BreakingChange, OrphanedCall, FrameworkStats, MigrationRouteAnalyzer, extractAllRoutes, findOrphanedCalls, detectBreakingChanges
 * @used_by src/fileGeneration/detectPatterns.ts
 */



/**
 * IMP-CORE-039: Migration Route Analyzer
 *
 * Unifies route metadata extraction for migration analysis.
 * Provides a single API for extracting routes, detecting breaking changes,
 * and identifying orphaned frontend calls.
 *
 * Replaces ad-hoc keyword matching in detectApiEndpoints with rich RouteMetadata.
 *
 * @module analyzer/migration-route-analyzer
 */

import { ElementData, RouteMetadata, FrontendCall } from '../types/types.js';

/**
 * Route element with full metadata for migration analysis
 */
export interface MigrationRouteElement {
  /** Element name (function/handler name) */
  name: string;
  /** File path where route is defined */
  file: string;
  /** Line number in file */
  line: number;
  /** Full route metadata */
  route: RouteMetadata;
  /** Whether element is exported */
  exported?: boolean;
}

/**
 * Affected caller from frontend scan
 * IMP-CORE-041: Breaking change detection with affected callers
 */
export interface AffectedCaller {
  /** Source file path */
  file: string;
  /** Line number */
  line: number;
  /** Function/component name or description */
  callSite: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Breaking change detection result
 */
export interface BreakingChange {
  /** Type of breaking change */
  type: 'method_removed' | 'path_changed' | 'response_schema_changed' | 'request_body_changed' | 'method_added' | 'auth_changed' | 'rate_limit_changed';
  /** Route path affected */
  path: string;
  /** HTTP method affected (if applicable) */
  method?: string;
  /** Old value (before change) */
  oldValue: string;
  /** New value (after change) */
  newValue: string;
  /** Impact level */
  impact: 'high' | 'medium' | 'low';
  /** Numeric impact score (0-100) */
  impactScore?: number;
  /** File where change occurs */
  file: string;
  /** Affected frontend/API callers */
  affectedCallers?: AffectedCaller[];
  /** Human-readable migration hint */
  migrationHint?: string;
  /** Whether this change can be auto-fixed */
  autoFixable?: boolean;
}

/**
 * Orphaned frontend call detection result
 */
export interface OrphanedCall {
  /** Frontend API call metadata */
  call: FrontendCall;
  /** Confidence that this call is orphaned (0-100) */
  confidence: number;
  /** Reason for orphan detection */
  reason: 'no_matching_route' | 'method_mismatch' | 'path_mismatch';
  /** Suggested matching routes (if any) */
  suggestions?: string[];
}

/**
 * Framework route statistics
 */
export interface FrameworkStats {
  /** Total routes for this framework */
  total: number;
  /** Routes grouped by HTTP method */
  byMethod: Record<string, number>;
  /** Blueprints/routers detected */
  blueprints?: string[];
}

/**
 * Migration Route Analyzer
 *
 * Centralizes route metadata extraction for migration use cases.
 * Replaces keyword-based detection with structured RouteMetadata access.
 */
export class MigrationRouteAnalyzer {
  private elements: ElementData[];

  constructor(elements: ElementData[]) {
    this.elements = elements;
  }

  /**
   * Extract all routes with full metadata
   *
   * @returns Array of migration route elements
   *
   * @example
   * const analyzer = new MigrationRouteAnalyzer(elements);
   * const routes = analyzer.extractAllRoutes();
   * // Returns: [{ name: 'getUsers', file: 'app.py', line: 10, route: {...}, exported: true }]
   */
  extractAllRoutes(): MigrationRouteElement[] {
    return this.elements
      .filter(element => element.route !== undefined)
      .map(element => ({
        name: element.name,
        file: element.file,
        line: element.line,
        route: element.route!,
        exported: element.exported
      }));
  }

  /**
   * Find routes by framework
   *
   * @param framework - Target framework ('flask', 'fastapi', 'express', etc.)
   * @returns Array of routes for the specified framework
   *
   * @example
   * const flaskRoutes = analyzer.findRoutesByFramework('flask');
   * const expressRoutes = analyzer.findRoutesByFramework('express');
   */
  findRoutesByFramework(
    framework: RouteMetadata['framework']
  ): MigrationRouteElement[] {
    return this.extractAllRoutes().filter(
      route => route.route.framework === framework
    );
  }

  /**
   * Get framework statistics
   *
   * @returns Statistics for each framework
   *
   * @example
   * const stats = analyzer.getFrameworkStats();
   * // Returns: { flask: { total: 5, byMethod: { GET: 3, POST: 2 }, blueprints: ['auth_bp'] } }
   */
  getFrameworkStats(): Record<string, FrameworkStats> {
    const routes = this.extractAllRoutes();
    const stats: Record<string, FrameworkStats> = {};

    for (const route of routes) {
      const fw = route.route.framework;

      if (!stats[fw]) {
        stats[fw] = {
          total: 0,
          byMethod: {},
          blueprints: []
        };
      }

      stats[fw].total++;

      // Count by method
      for (const method of route.route.methods) {
        const upperMethod = method.toUpperCase();
        stats[fw].byMethod[upperMethod] = (stats[fw].byMethod[upperMethod] || 0) + 1;
      }

      // Track blueprints
      if (route.route.blueprint && !stats[fw].blueprints?.includes(route.route.blueprint)) {
        stats[fw].blueprints?.push(route.route.blueprint);
      }
    }

    return stats;
  }

  /**
   * Find orphaned frontend calls (API calls with no matching backend route)
   *
   * @param frontendCalls - Array of frontend API calls from scan
   * @returns Array of orphaned calls with confidence scores
   *
   * @example
   * const orphaned = analyzer.findOrphanedCalls(frontendCalls);
   * // Returns: [{ call: {...}, confidence: 95, reason: 'no_matching_route', suggestions: ['/api/users'] }]
   */
  findOrphanedCalls(frontendCalls: FrontendCall[]): OrphanedCall[] {
    const routes = this.extractAllRoutes();
    const orphaned: OrphanedCall[] = [];

    for (const call of frontendCalls) {
      const match = this.findMatchingRoute(routes, call);

      if (!match.found) {
        orphaned.push({
          call,
          confidence: match.confidence,
          reason: match.reason,
          suggestions: match.suggestions
        });
      }
    }

    return orphaned;
  }

  /**
   * Detect breaking changes between two route sets (e.g., v1 -> v2)
   *
   * @param oldRoutes - Routes from previous version
   * @param newRoutes - Routes from new version
   * @returns Array of detected breaking changes
   *
   * @example
   * const changes = analyzer.detectBreakingChanges(v1Routes, v2Routes);
   * // Returns: [{ type: 'method_removed', path: '/api/users', method: 'POST', impact: 'high' }]
   */
  detectBreakingChanges(
    oldRoutes: MigrationRouteElement[],
    newRoutes: MigrationRouteElement[]
  ): BreakingChange[] {
    const changes: BreakingChange[] = [];
    const changedPaths = new Set<string>(); // Track paths already reported

    // Check for removed routes / method changes
    for (const oldRoute of oldRoutes) {
      const newRoute = this.findRouteByPathAndMethods(
        newRoutes,
        oldRoute.route.path,
        oldRoute.route.methods
      );

      if (!newRoute) {
        // Route removed or methods changed
        const partialMatch = this.findRouteByPath(newRoutes, oldRoute.route.path);

        if (partialMatch) {
          // Path exists but methods changed - route still valid, don't mark as changed path
          const removedMethods = oldRoute.route.methods.filter(
            m => !partialMatch.route.methods.includes(m)
          );

          for (const method of removedMethods) {
            const impactScore = this.calculateImpactScore(oldRoute, 'method_removed');
            changes.push({
              type: 'method_removed',
              path: oldRoute.route.path,
              method,
              oldValue: method,
              newValue: 'N/A',
              impact: impactScore >= 70 ? 'high' : impactScore >= 40 ? 'medium' : 'low',
              impactScore,
              file: oldRoute.file
            });
          }
          // Don't add to changedPaths - path still exists, only methods changed
        } else {
          // Path completely removed - mark for possible migration check
          changedPaths.add(oldRoute.route.path);
        }
      }
    }

    // Check for path changes/migrations (only for paths not already processed)
    for (const oldRoute of oldRoutes) {
      // Skip if we already processed this path
      if (changedPaths.has(oldRoute.route.path)) {
        // Check if there's a similar route (migration)
        const similarRoute = this.findSimilarRoute(newRoutes, oldRoute);

        if (similarRoute && similarRoute.route.path !== oldRoute.route.path) {
          // This is a migration, update the "removed" entry
          const existingIndex = changes.findIndex(
            c => c.path === oldRoute.route.path && c.type === 'path_changed'
          );

          if (existingIndex >= 0) {
            // Update existing entry to show migration
            changes[existingIndex].newValue = similarRoute.route.path;
            changes[existingIndex].impact = 'medium';
            changes[existingIndex].impactScore = 50;
          } else {
            // Add new migration entry
            changes.push({
              type: 'path_changed',
              path: oldRoute.route.path,
              oldValue: oldRoute.route.path,
              newValue: similarRoute.route.path,
              impact: 'medium',
              impactScore: 50,
              file: oldRoute.file
            });
          }
        } else {
          // No similar route - confirm as REMOVED
          const existingRemoved = changes.find(
            c => c.path === oldRoute.route.path && c.type === 'path_changed' && c.newValue === 'REMOVED'
          );

          if (!existingRemoved) {
            const impactScore = this.calculateImpactScore(oldRoute, 'path_removed');
            changes.push({
              type: 'path_changed',
              path: oldRoute.route.path,
              oldValue: oldRoute.route.path,
              newValue: 'REMOVED',
              impact: impactScore >= 70 ? 'high' : impactScore >= 40 ? 'medium' : 'low',
              impactScore,
              file: oldRoute.file
            });
          }
        }
      }
    }

    return changes;
  }

  /**
   * Export routes to migration-compatible format
   *
   * @returns Structured routes for migration configuration
   *
   * @example
   * const migrationData = analyzer.exportForMigration();
   * // Returns: { routes: [...], stats: {...}, byFramework: {...} }
   */
  exportForMigration(): {
    routes: MigrationRouteElement[];
    stats: Record<string, FrameworkStats>;
    byFramework: Record<string, MigrationRouteElement[]>;
  } {
    const routes = this.extractAllRoutes();
    const stats = this.getFrameworkStats();

    const byFramework: Record<string, MigrationRouteElement[]> = {};
    for (const route of routes) {
      const fw = route.route.framework;
      if (!byFramework[fw]) {
        byFramework[fw] = [];
      }
      byFramework[fw].push(route);
    }

    return { routes, stats, byFramework };
  }

  // Private helper methods

  private findMatchingRoute(
    routes: MigrationRouteElement[],
    call: FrontendCall
  ): { found: boolean; confidence: number; reason?: OrphanedCall['reason']; suggestions?: string[] } {
    // Exact match: path and method
    const exactMatch = routes.find(
      r => r.route.path === call.path && r.route.methods.includes(call.method)
    );

    if (exactMatch) {
      return { found: true, confidence: 100 };
    }

    // Path match but method mismatch
    const pathMatch = routes.find(r => r.route.path === call.path);
    if (pathMatch) {
      return {
        found: false,
        confidence: 80,
        reason: 'method_mismatch',
        suggestions: [`${call.path} (methods: ${pathMatch.route.methods.join(', ')})`]
      };
    }

    // Similar path suggestions
    const similarRoutes = routes
      .filter(r => this.isSimilarPath(r.route.path, call.path))
      .map(r => r.route.path);

    return {
      found: false,
      confidence: similarRoutes.length > 0 ? 60 : 95,
      reason: 'no_matching_route',
      suggestions: similarRoutes.length > 0 ? similarRoutes : undefined
    };
  }

  private findRouteByPathAndMethods(
    routes: MigrationRouteElement[],
    path: string,
    methods: string[]
  ): MigrationRouteElement | undefined {
    return routes.find(
      r => r.route.path === path &&
           methods.every(m => r.route.methods.includes(m))
    );
  }

  private findRouteByPath(
    routes: MigrationRouteElement[],
    path: string
  ): MigrationRouteElement | undefined {
    return routes.find(r => r.route.path === path);
  }

  private findSimilarRoute(
    routes: MigrationRouteElement[],
    target: MigrationRouteElement
  ): MigrationRouteElement | undefined {
    // Simple similarity: same number of path segments, same framework
    const targetSegments = target.route.path.split('/').filter(Boolean);

    return routes.find(r => {
      if (r.route.framework !== target.route.framework) return false;

      const segments = r.route.path.split('/').filter(Boolean);
      return segments.length === targetSegments.length &&
             r.route.path !== target.route.path;
    });
  }

  private isSimilarPath(routePath: string, callPath: string): boolean {
    // Check for similar structure (same number of segments)
    const routeSegments = routePath.split('/').filter(Boolean);
    const callSegments = callPath.split('/').filter(Boolean);

    return routeSegments.length === callSegments.length;
  }

  /**
   * Calculate impact score for a breaking change based on route characteristics
   *
   * @param route - Route being changed
   * @param changeType - Type of breaking change
   * @returns Impact score (0-100)
   */
  private calculateImpactScore(
    route: MigrationRouteElement,
    changeType: string
  ): number {
    let score = 50; // Base score

    // Factor 1: HTTP methods (POST/DELETE changes are higher impact than GET)
    const highImpactMethods = ['POST', 'DELETE', 'PUT'];
    const hasHighImpactMethod = route.route.methods.some(m =>
      highImpactMethods.includes(m.toUpperCase())
    );
    if (hasHighImpactMethod) {
      score += 20;
    }

    // Factor 2: Path depth (deeper paths = more specific = lower impact)
    const pathDepth = route.route.path.split('/').filter(Boolean).length;
    if (pathDepth <= 2) {
      score += 15; // Top-level routes affect more clients
    } else if (pathDepth >= 4) {
      score -= 10; // Deep nested routes are more specific
    }

    // Factor 3: Change type severity
    const severityWeights: Record<string, number> = {
      'method_removed': 15,
      'path_removed': 15,
      'auth_changed': 10,
      'response_schema_changed': 5,
      'request_body_changed': 5,
      'method_added': -5,
      'rate_limit_changed': 0
    };
    score += severityWeights[changeType] || 0;

    // Factor 4: Route complexity (more methods = more usage)
    score += route.route.methods.length * 3;

    // Clamp to 0-100 range
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Detect affected callers from frontend scan for breaking changes
   *
   * @param changes - Array of breaking changes
   * @param frontendCalls - Frontend API calls from scan
   * @returns Breaking changes with affected callers populated
   */
  detectAffectedCallers(
    changes: BreakingChange[],
    frontendCalls: FrontendCall[]
  ): BreakingChange[] {
    return changes.map(change => {
      const affected: AffectedCaller[] = [];

      for (const call of frontendCalls) {
        // Check if call matches the changed path
        const pathMatch = this.matchPathWithParams(change.path, call.path);
        const methodMatch = !change.method || call.method === change.method;

        if (pathMatch && methodMatch) {
          affected.push({
            file: call.file || 'unknown',
            line: call.line || 0,
            callSite: `${call.callType} call at line ${call.line}`,
            confidence: pathMatch === 'exact' ? 0.95 : 0.75
          });
        }
      }

      return {
        ...change,
        affectedCallers: affected.length > 0 ? affected : undefined,
        // Increase impact if many callers affected
        impactScore: change.impactScore !== undefined
          ? Math.min(100, change.impactScore + affected.length * 5)
          : undefined
      };
    });
  }

  /**
   * Match paths considering path parameters
   *
   * @param routePath - Route path pattern
   * @param callPath - Actual call path
   * @returns Match type ('exact', 'pattern', 'none')
   */
  private matchPathWithParams(routePath: string, callPath: string): 'exact' | 'pattern' | 'none' {
    // Exact match
    if (routePath === callPath) {
      return 'exact';
    }

    // Pattern match: convert route pattern to regex
    // e.g., /api/users/{id} -> /api/users/[^/]+
    const pattern = routePath
      .replace(/{[^}]+}/g, '[^/]+')
      .replace(/<[^>]+>/g, '[^/]+');

    try {
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(callPath)) {
        return 'pattern';
      }
    } catch {
      // Invalid regex, ignore
    }

    return 'none';
  }
}

/**
 * Convenience function: Create analyzer and extract all routes
 *
 * @param elements - Array of scanned code elements
 * @returns Array of migration route elements
 */
export function extractAllRoutes(elements: ElementData[]): MigrationRouteElement[] {
  const analyzer = new MigrationRouteAnalyzer(elements);
  return analyzer.extractAllRoutes();
}

/**
 * Convenience function: Find orphaned frontend calls
 *
 * @param elements - Array of scanned code elements (with routes)
 * @param frontendCalls - Array of frontend API calls
 * @returns Array of orphaned calls
 */
export function findOrphanedCalls(
  elements: ElementData[],
  frontendCalls: FrontendCall[]
): OrphanedCall[] {
  const analyzer = new MigrationRouteAnalyzer(elements);
  return analyzer.findOrphanedCalls(frontendCalls);
}

/**
 * Convenience function: Detect breaking changes
 *
 * @param oldElements - Elements from previous version
 * @param newElements - Elements from new version
 * @returns Array of breaking changes
 */
export function detectBreakingChanges(
  oldElements: ElementData[],
  newElements: ElementData[]
): BreakingChange[] {
  const oldAnalyzer = new MigrationRouteAnalyzer(oldElements);
  const newAnalyzer = new MigrationRouteAnalyzer(newElements);

  return oldAnalyzer.detectBreakingChanges(
    oldAnalyzer.extractAllRoutes(),
    newAnalyzer.extractAllRoutes()
  );
}

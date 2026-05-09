/**
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Route Matching Module
 * Matches frontend API calls to server routes with confidence scoring
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports RouteMatch, exactMatch, dynamicMatch, partialMatch, calculateMatchConfidence, matchHttpMethods, findBestMatch
 * @used_by src/validator/route-validator.ts
 */

import type { NormalizedRoute } from './route-normalizer.js';

/**
 * Route match result with confidence scoring
 */
export interface RouteMatch {
  /** Whether routes match */
  matched: boolean;
  /** Match confidence (0-100) */
  confidence: number;
  /** Type of match */
  matchType: 'exact' | 'dynamic' | 'partial' | 'none';
  /** HTTP methods match */
  methodsMatch: boolean;
  /** Details about the match */
  details?: {
    /** Matched dynamic segments */
    matchedSegments?: string[];
    /** Mismatched segments */
    mismatchedSegments?: string[];
  };
}

/**
 * Check if two routes match exactly (same path, no dynamic segments)
 *
 * @param frontendPath - Frontend API call path
 * @param serverRoute - Server route (normalized)
 * @returns True if exact match
 *
 * @example
 * exactMatch('/api/users', { path: '/api/users', dynamicSegments: [] })
 * // Returns: true
 */
export function exactMatch(
  frontendPath: string,
  serverRoute: NormalizedRoute
): boolean {
  // Exact match: paths identical and no dynamic segments
  return (
    frontendPath === serverRoute.path &&
    serverRoute.dynamicSegments.length === 0
  );
}

/**
 * Check if frontend call matches server route with dynamic segments
 *
 * @param frontendPath - Frontend API call path (may have {id} placeholders)
 * @param serverRoute - Server route (normalized with dynamic segments)
 * @returns True if dynamic match
 *
 * @example
 * dynamicMatch('/api/users/{id}', { path: '/api/users/{id}', dynamicSegments: ['id'] })
 * // Returns: true
 */
export function dynamicMatch(
  frontendPath: string,
  serverRoute: NormalizedRoute
): boolean {
  // If server has no dynamic segments, can't be dynamic match
  if (serverRoute.dynamicSegments.length === 0) {
    return false;
  }

  // Split paths into segments
  const frontendSegments = frontendPath.split('/').filter(s => s);
  const serverSegments = serverRoute.path.split('/').filter(s => s);

  // Must have same number of segments
  if (frontendSegments.length !== serverSegments.length) {
    return false;
  }

  // Check each segment
  for (let i = 0; i < frontendSegments.length; i++) {
    const frontSeg = frontendSegments[i];
    const serverSeg = serverSegments[i];

    // Both are placeholders or both are identical
    if (
      (frontSeg.startsWith('{') && frontSeg.endsWith('}') &&
       serverSeg.startsWith('{') && serverSeg.endsWith('}')) ||
      frontSeg === serverSeg
    ) {
      continue;
    } else {
      return false;
    }
  }

  return true;
}

/**
 * Check if frontend path partially matches server route (prefix match)
 *
 * @param frontendPath - Frontend API call path
 * @param serverRoute - Server route (normalized)
 * @returns True if partial match
 *
 * @example
 * partialMatch('/api/users/123', { path: '/api/users/{id}', dynamicSegments: ['id'] })
 * // Returns: true (partial match ignoring dynamic segment values)
 */
export function partialMatch(
  frontendPath: string,
  serverRoute: NormalizedRoute
): boolean {
  const frontendSegments = frontendPath.split('/').filter(s => s);
  const serverSegments = serverRoute.path.split('/').filter(s => s);

  // Frontend path should have at least as many segments as server
  if (frontendSegments.length < serverSegments.length) {
    return false;
  }

  // Check if all server segments match frontend (allowing dynamic segments)
  for (let i = 0; i < serverSegments.length; i++) {
    const serverSeg = serverSegments[i];
    const frontSeg = frontendSegments[i];

    // Server segment is dynamic, frontend can be anything
    if (serverSeg.startsWith('{') && serverSeg.endsWith('}')) {
      continue;
    }

    // Server segment is static, must match exactly
    if (serverSeg !== frontSeg) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate match confidence between frontend call and server route
 *
 * @param frontendPath - Frontend API call path
 * @param serverRoute - Server route (normalized)
 * @returns Match result with confidence (0-100)
 *
 * @example
 * calculateMatchConfidence('/api/users/{id}', { path: '/api/users/{id}', dynamicSegments: ['id'], methods: ['GET'], framework: 'express' })
 * // Returns: { matched: true, confidence: 95, matchType: 'dynamic', methodsMatch: true }
 */
export function calculateMatchConfidence(
  frontendPath: string,
  serverRoute: NormalizedRoute,
  frontendMethod?: string
): RouteMatch {
  // Check exact match first
  if (exactMatch(frontendPath, serverRoute)) {
    const methodsMatch = frontendMethod
      ? matchHttpMethods(frontendMethod, serverRoute.methods)
      : true;

    return {
      matched: true,
      confidence: 100,
      matchType: 'exact',
      methodsMatch
    };
  }

  // Check dynamic match
  if (dynamicMatch(frontendPath, serverRoute)) {
    const methodsMatch = frontendMethod
      ? matchHttpMethods(frontendMethod, serverRoute.methods)
      : true;

    // Dynamic match has 95% confidence (slightly lower than exact)
    return {
      matched: true,
      confidence: methodsMatch ? 95 : 75, // Lower confidence if methods don't match
      matchType: 'dynamic',
      methodsMatch,
      details: {
        matchedSegments: serverRoute.dynamicSegments
      }
    };
  }

  // Check partial match
  if (partialMatch(frontendPath, serverRoute)) {
    const methodsMatch = frontendMethod
      ? matchHttpMethods(frontendMethod, serverRoute.methods)
      : true;

    // Partial match has 70% confidence
    return {
      matched: true,
      confidence: methodsMatch ? 70 : 50, // Lower confidence if methods don't match
      matchType: 'partial',
      methodsMatch
    };
  }

  // No match
  return {
    matched: false,
    confidence: 0,
    matchType: 'none',
    methodsMatch: false
  };
}

/**
 * Check if HTTP methods match between frontend call and server route
 *
 * @param frontendMethod - HTTP method from frontend call (e.g., 'GET', 'POST')
 * @param serverMethods - HTTP methods supported by server route
 * @returns True if methods compatible
 *
 * @example
 * matchHttpMethods('GET', ['GET', 'POST'])
 * // Returns: true
 */
export function matchHttpMethods(
  frontendMethod: string,
  serverMethods: string[]
): boolean {
  // If server methods array is empty, assume all methods supported
  if (serverMethods.length === 0) {
    return true;
  }

  // Normalize to uppercase
  const normalizedFrontend = frontendMethod.toUpperCase();
  const normalizedServer = serverMethods.map(m => m.toUpperCase());

  return normalizedServer.includes(normalizedFrontend);
}

/**
 * Find best matching server route for a frontend call
 *
 * @param frontendPath - Frontend API call path
 * @param serverRoutes - Array of normalized server routes
 * @param frontendMethod - Optional HTTP method from frontend
 * @returns Best match with confidence, or null if no match
 *
 * @example
 * findBestMatch('/api/users/123', serverRoutes, 'GET')
 * // Returns: { route: {...}, match: { matched: true, confidence: 95, ... } }
 */
export function findBestMatch(
  frontendPath: string,
  serverRoutes: NormalizedRoute[],
  frontendMethod?: string
): { route: NormalizedRoute; match: RouteMatch } | null {
  let bestMatch: { route: NormalizedRoute; match: RouteMatch } | null = null;
  let highestConfidence = 0;

  for (const serverRoute of serverRoutes) {
    const match = calculateMatchConfidence(
      frontendPath,
      serverRoute,
      frontendMethod
    );

    if (match.matched && match.confidence > highestConfidence) {
      highestConfidence = match.confidence;
      bestMatch = { route: serverRoute, match };
    }
  }

  return bestMatch;
}

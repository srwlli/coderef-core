/**
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Route Normalization Module
 * Normalizes routes from different frameworks to a common format for comparison
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports NormalizedRoute, normalizeFlaskRoute, normalizeFastAPIRoute, normalizeExpressRoute, normalizeNextJsRoute, extractDynamicSegments, normalizeRoutePath
 * @used_by src/validator/route-matcher.ts, src/validator/route-validator.ts
 */

/**
 * Normalized route representation
 */
export interface NormalizedRoute {
  /** Normalized path with {param} placeholders (e.g., '/api/users/{id}') */
  path: string;
  /** Dynamic segments extracted from path (e.g., ['id']) */
  dynamicSegments: string[];
  /** HTTP methods */
  methods: string[];
  /** Original framework */
  framework?: string;
}

/**
 * Normalize Flask route to common format
 * Flask uses <type:param> syntax (e.g., '/users/<int:id>')
 *
 * @param path - Flask route path
 * @returns Normalized route with {param} placeholders
 *
 * @example
 * normalizeFlaskRoute('/users/<int:id>')
 * // Returns: { path: '/api/users/{id}', dynamicSegments: ['id'], ... }
 */
export function normalizeFlaskRoute(path: string): NormalizedRoute {
  // Convert Flask <type:param> to {param}
  const normalizedPath = path.replace(/<(?:[^:]+:)?([^>]+)>/g, '{$1}');

  const dynamicSegments = extractDynamicSegments(normalizedPath);

  return {
    path: normalizedPath,
    dynamicSegments,
    methods: [],
    framework: 'flask'
  };
}

/**
 * Normalize FastAPI route to common format
 * FastAPI uses {param} syntax (e.g., '/users/{id}')
 *
 * @param path - FastAPI route path
 * @returns Normalized route
 *
 * @example
 * normalizeFastAPIRoute('/users/{user_id}')
 * // Returns: { path: '/users/{user_id}', dynamicSegments: ['user_id'], ... }
 */
export function normalizeFastAPIRoute(path: string): NormalizedRoute {
  // FastAPI already uses {param} format
  const dynamicSegments = extractDynamicSegments(path);

  return {
    path,
    dynamicSegments,
    methods: [],
    framework: 'fastapi'
  };
}

/**
 * Normalize Express route to common format
 * Express uses :param syntax (e.g., '/users/:id')
 *
 * @param path - Express route path
 * @returns Normalized route with {param} placeholders
 *
 * @example
 * normalizeExpressRoute('/users/:id')
 * // Returns: { path: '/users/{id}', dynamicSegments: ['id'], ... }
 */
export function normalizeExpressRoute(path: string): NormalizedRoute {
  // Convert Express :param to {param}
  const normalizedPath = path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');

  const dynamicSegments = extractDynamicSegments(normalizedPath);

  return {
    path: normalizedPath,
    dynamicSegments,
    methods: [],
    framework: 'express'
  };
}

/**
 * Normalize Next.js route to common format
 * Next.js uses [param] syntax for dynamic segments (e.g., '/users/[id]')
 *
 * @param path - Next.js route path (file-based routing)
 * @returns Normalized route with {param} placeholders
 *
 * @example
 * normalizeNextJsRoute('/api/users/[id]/route.ts')
 * // Returns: { path: '/api/users/{id}', dynamicSegments: ['id'], ... }
 */
export function normalizeNextJsRoute(path: string): NormalizedRoute {
  // Remove file extensions and /route.ts suffix
  let normalizedPath = path.replace(/\/(route|page)\.(ts|js|tsx|jsx)$/, '');

  // Convert Next.js [param] to {param}
  normalizedPath = normalizedPath.replace(/\[([^\]]+)\]/g, '{$1}');

  const dynamicSegments = extractDynamicSegments(normalizedPath);

  return {
    path: normalizedPath,
    dynamicSegments,
    methods: [],
    framework: 'nextjs'
  };
}

/**
 * Extract dynamic segments from normalized path
 *
 * @param normalizedPath - Path with {param} placeholders
 * @returns Array of parameter names
 *
 * @example
 * extractDynamicSegments('/api/users/{id}/posts/{postId}')
 * // Returns: ['id', 'postId']
 */
export function extractDynamicSegments(normalizedPath: string): string[] {
  const matches = normalizedPath.match(/\{([^}]+)\}/g);
  if (!matches) return [];

  return matches.map(match => match.slice(1, -1)); // Remove { }
}

/**
 * Dispatcher function to normalize any route based on framework
 *
 * @param path - Route path in framework-specific format
 * @param framework - Framework type
 * @returns Normalized route
 *
 * @example
 * normalizeRoutePath('/users/<int:id>', 'flask')
 * // Returns: { path: '/users/{id}', dynamicSegments: ['id'], framework: 'flask' }
 */
export function normalizeRoutePath(
  path: string,
  framework:
    | 'flask'
    | 'fastapi'
    | 'express'
    | 'nextjs'
    | 'nuxt'
    | 'sveltekit'
    | 'remix'
    | string
): NormalizedRoute {
  switch (framework) {
    case 'flask':
      return normalizeFlaskRoute(path);
    case 'fastapi':
      return normalizeFastAPIRoute(path);
    case 'express':
      return normalizeExpressRoute(path);
    case 'nextjs':
      return normalizeNextJsRoute(path);
    default:
      // Unknown framework, return as-is
      return {
        path,
        dynamicSegments: extractDynamicSegments(path),
        methods: [],
        framework
      };
  }
}

/**
 * @coderef-semantic: 1.0.0
 * @layer validation
 * @capability route-normalizer-normalized-route
 * @exports NormalizedRoute, normalizeFlaskRoute, normalizeFastAPIRoute, normalizeExpressRoute, normalizeNextJsRoute, normalizeSvelteKitRoute, normalizeNuxtRoute, normalizeRemixRoute, extractDynamicSegments, normalizeRoutePath
 * @used_by src/pipeline/endpoint-identity.ts, src/validator/route-matcher.ts, src/validator/route-validator.ts
 */

/**
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Route Normalization Module
 * Normalizes routes from different frameworks to a common format for comparison
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
 * Normalize a SvelteKit route to common format
 * SvelteKit uses [param] for dynamic segments and [...rest] for catch-alls,
 * plus [[optional]] for optional params and (group) for layout groups that
 * contribute NO url segment.
 *
 * WO-API-SURFACE-MAPPING-RECONNECT-AND-GRAPH-ELEVATION-001 Phase 2. Before this,
 * 'sveltekit' hit normalizeRoutePath's `default:` arm and came back UNCHANGED —
 * so a SvelteKit `[id]` never became `{id}` and never matched a client `{id}`.
 *
 * @param path - SvelteKit route path (file-based routing)
 * @returns Normalized route with {param} placeholders
 *
 * @example
 * normalizeSvelteKitRoute('/api/users/[id]')
 * // Returns: { path: '/api/users/{id}', dynamicSegments: ['id'], ... }
 */
export function normalizeSvelteKitRoute(path: string): NormalizedRoute {
  // Layout groups `(admin)` are organisational only — they contribute no URL
  // segment, so a route inside one must normalize to the path WITHOUT it.
  let normalizedPath = path.replace(/\/\([^)]*\)(?=\/|$)/g, '');
  // Optional parameter `[[lang]]` -> `{lang}`. Treated as present: an optional
  // segment that is omitted is a DIFFERENT path, and we cannot know which the
  // caller used, so we record the declared shape rather than guessing both.
  normalizedPath = normalizedPath.replace(/\[\[([^\]]+)\]\]/g, '{$1}');
  // Catch-all `[...rest]` -> `{...rest}`; the ellipsis is preserved so the
  // identity layer can distinguish a splat from a single-segment param.
  normalizedPath = normalizedPath.replace(/\[\.\.\.([^\]]+)\]/g, '{...$1}');
  // Single-segment `[id]` -> `{id}`.
  normalizedPath = normalizedPath.replace(/\[([^\]]+)\]/g, '{$1}');

  return {
    path: normalizedPath,
    dynamicSegments: extractDynamicSegments(normalizedPath),
    methods: [],
    framework: 'sveltekit'
  };
}

/**
 * Normalize a Nuxt route to common format
 * Nuxt server routes use [param] and [...slug], matching SvelteKit's bracket
 * dialect. Nuxt additionally spells a catch-all as `[...]` with no name.
 *
 * @param path - Nuxt route path (file-based routing)
 * @returns Normalized route with {param} placeholders
 *
 * @example
 * normalizeNuxtRoute('/api/users/[id]')
 * // Returns: { path: '/api/users/{id}', dynamicSegments: ['id'], ... }
 */
export function normalizeNuxtRoute(path: string): NormalizedRoute {
  let normalizedPath = path.replace(/\[\.\.\.([^\]]*)\]/g, (_m, name) =>
    `{...${name || 'rest'}}`);
  normalizedPath = normalizedPath.replace(/\[([^\]]+)\]/g, '{$1}');

  return {
    path: normalizedPath,
    dynamicSegments: extractDynamicSegments(normalizedPath),
    methods: [],
    framework: 'nuxt'
  };
}

/**
 * Normalize a Remix route to common format
 * Remix v2 uses `$param` for dynamic segments, a bare `$` for a splat, and dots
 * as segment separators in the FILE name. parseRemixRoute already converts the
 * dot-delimited filename into a slash path and rewrites `$` into brackets, so
 * this handles both the bracket output it produces and raw `$` spellings that
 * reach us from another source.
 *
 * @param path - Remix route path
 * @returns Normalized route with {param} placeholders
 *
 * @example
 * normalizeRemixRoute('/users/$id')
 * // Returns: { path: '/users/{id}', dynamicSegments: ['id'], ... }
 */
export function normalizeRemixRoute(path: string): NormalizedRoute {
  // Bracket forms first (what parseRemixRoute emits).
  let normalizedPath = path.replace(/\[\.\.\.([^\]]+)\]/g, '{...$1}');
  normalizedPath = normalizedPath.replace(/\[([^\]]+)\]/g, '{$1}');
  // A bare `$` segment is Remix's splat (matches the remainder of the path).
  normalizedPath = normalizedPath.replace(/(^|\/)\$(?=\/|$)/g, '$1{...splat}');
  // `$param` -> `{param}`.
  normalizedPath = normalizedPath.replace(/\$([a-zA-Z0-9_]+)/g, '{$1}');
  // A leading underscore names a pathless layout route — no URL segment.
  normalizedPath = normalizedPath.replace(/\/_[^/]*(?=\/|$)/g, '');

  return {
    path: normalizedPath,
    dynamicSegments: extractDynamicSegments(normalizedPath),
    methods: [],
    framework: 'remix'
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
    // WO-API-SURFACE-MAPPING-RECONNECT-AND-GRAPH-ELEVATION-001 Phase 2: these
    // three arms close a real gap. RouteMetadata['framework'] has admitted
    // seven values since WO-API-ROUTE-DETECTION-001, but only four were
    // dispatched here — sveltekit, nuxt, and remix fell through to `default:`
    // and were returned UNCHANGED. Their bracket/`$` dialects therefore never
    // became `{param}`, so a SvelteKit `[id]` route could not match a client
    // call to `/api/users/{id}` no matter how correct both sides were. The
    // gap was invisible until Phase 1 gave the subsystem a live producer.
    case 'sveltekit':
      return normalizeSvelteKitRoute(path);
    case 'nuxt':
      return normalizeNuxtRoute(path);
    case 'remix':
      return normalizeRemixRoute(path);
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

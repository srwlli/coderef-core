// coderef-core/analyzer/route-parsers.ts
// WO-API-ROUTE-DETECTION-001: Multi-framework route detection parsers

/**
 * @coderef-semantic: 1.0.0
 * @exports parseFlaskRoute, parseFastAPIRoute, parseExpressRoute, parseNextJsRoute, parseNextJsPagesRoute, parseSvelteKitRoute, parseNuxtRoute, parseRemixRoute, extractRouteMetadata
 * @used_by src/scanner/scanner.ts
 */

import { RouteMetadata } from '../types/types.js';

/**
 * Parse Flask route decorator: @app.route('/path', methods=['GET', 'POST'])
 * Also supports blueprints: @bp.route('/path')
 *
 * @param code - Decorator line containing @app.route or @bp.route
 * @param line - Line number for debugging
 * @returns RouteMetadata or null if not a valid Flask route
 *
 * @example
 * parseFlaskRoute("@app.route('/users', methods=['GET', 'POST'])", 42)
 * // Returns: { path: '/users', methods: ['GET', 'POST'], framework: 'flask' }
 */
export function parseFlaskRoute(code: string, line: number): RouteMetadata | null {
  // Regex: @(app|bp_name).route('/path', methods=['GET'])
  // Captures: 1=blueprint/app name, 2=path, 3=methods string (optional)
  const routeRegex = /@(\w+)\.route\(\s*['"]([^'"]+)['"](?:\s*,\s*methods\s*=\s*\[([^\]]+)\])?\s*\)/;
  const match = code.match(routeRegex);

  if (!match) return null;

  const [_, blueprintOrApp, path, methodsStr] = match;

  // Parse methods array: ['GET', 'POST'] or ['get', 'post']
  const methods = methodsStr
    ? methodsStr
        .split(',')
        .map(m => m.trim().replace(/['"]/g, '').toUpperCase())
        .filter(m => m.length > 0)
    : ['GET']; // Default to GET if no methods specified

  return {
    path,
    methods,
    framework: 'flask',
    blueprint: blueprintOrApp !== 'app' ? blueprintOrApp : undefined,
  };
}

/**
 * Parse FastAPI route decorator: @app.get('/path'), @app.post('/path')
 *
 * @param code - Decorator line containing @app.get/post/put/delete/patch
 * @param line - Line number for debugging
 * @returns RouteMetadata or null if not a valid FastAPI route
 *
 * @example
 * parseFastAPIRoute("@app.get('/items/{item_id}')", 15)
 * // Returns: { path: '/items/{item_id}', methods: ['GET'], framework: 'fastapi' }
 */
export function parseFastAPIRoute(code: string, line: number): RouteMetadata | null {
  // Regex: @app.(get|post|put|delete|patch)('/path')
  // Captures: 1=method, 2=path
  const routeRegex = /@app\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]\)/;
  const match = code.match(routeRegex);

  if (!match) return null;

  const [_, method, path] = match;

  return {
    path,
    methods: [method.toUpperCase()],
    framework: 'fastapi',
  };
}

/**
 * Parse Express route: app.get('/path', handler) or router.post('/path', handler)
 *
 * @param code - Line containing app.METHOD or router.METHOD
 * @param line - Line number for debugging
 * @param fileContent - Full file content for context checking (optional)
 * @returns RouteMetadata or null if not a valid Express route
 *
 * @example
 * parseExpressRoute("app.get('/api/users', getUsers)", 28)
 * // Returns: { path: '/api/users', methods: ['GET'], framework: 'express' }
 *
 * parseExpressRoute("router.post('/login', auth, loginHandler)", 35)
 * // Returns: { path: '/login', methods: ['POST'], framework: 'express', blueprint: 'router' }
 */
export function parseExpressRoute(code: string, line: number, fileContent?: string): RouteMetadata | null {
  // Regex: (app|router_name).(get|post|put|delete|patch)('/path'
  // Captures: 1=app/router name, 2=method, 3=path
  const routeRegex = /(\w+)\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/;
  const match = code.match(routeRegex);

  if (!match) return null;

  const [_, appOrRouter, method, path] = match;

  // Whitelist: Common Express variable names that indicate routing
  const ROUTER_WHITELIST = [
    'app',
    'router',
    'apiRouter',
    'api',
    'authRouter',
    'userRouter',
    'adminRouter',
    'publicRouter',
    'privateRouter',
    'v1Router',
    'v2Router'
  ];

  // Blacklist: Common variable names that are NOT Express routers
  const FALSE_POSITIVE_BLACKLIST = [
    'params',
    'urlParams',
    'searchParams',
    'queryParams',
    'url',
    'query',
    'request',
    'req',
    'response',
    'res',
    'options',
    'config',
    'settings',
    'data',
    'obj',
    'object',
    'item',
    'element'
  ];

  // Check blacklist first (fast rejection)
  if (FALSE_POSITIVE_BLACKLIST.includes(appOrRouter)) {
    return null;
  }

  // If whitelist match, accept immediately
  if (ROUTER_WHITELIST.includes(appOrRouter)) {
    return {
      path,
      methods: [method.toUpperCase()],
      framework: 'express',
      blueprint: appOrRouter !== 'app' ? appOrRouter : undefined,
    };
  }

  // If not in whitelist and fileContent provided, check for Express imports
  if (fileContent) {
    const hasExpressImport =
      /require\(['"]express['"]\)/.test(fileContent) ||
      /from\s+['"]express['"]/.test(fileContent) ||
      /import\s+express/.test(fileContent);

    if (hasExpressImport) {
      return {
        path,
        methods: [method.toUpperCase()],
        framework: 'express',
        blueprint: appOrRouter !== 'app' ? appOrRouter : undefined,
      };
    }
  }

  // Accept if it looks like a router (ends with 'Router' or 'router')
  if (/router$/i.test(appOrRouter)) {
    return {
      path,
      methods: [method.toUpperCase()],
      framework: 'express',
      blueprint: appOrRouter !== 'app' ? appOrRouter : undefined,
    };
  }

  // Reject all other cases to avoid false positives
  return null;
}

/**
 * Parse Next.js App Router file-based routing
 * Detects: app/api/users/route.ts with named exports (GET, POST, PUT, DELETE)
 *
 * @param filePath - Absolute file path
 * @param exports - Array of export names from the file
 * @returns RouteMetadata or null if not a Next.js route file
 *
 * @example
 * parseNextJsRoute("/project/app/api/users/route.ts", ['GET', 'POST'])
 * // Returns: { path: '/api/users', methods: ['GET', 'POST'], framework: 'nextjs' }
 */
export function parseNextJsRoute(filePath: string, exports: string[]): RouteMetadata | null {
  // Check if file matches app/api/*/route.ts or app/api/*/route.js
  const routeFileRegex = /\/app\/api\/(.+)\/route\.(ts|js|tsx|jsx)$/;
  const match = filePath.match(routeFileRegex);

  if (!match) return null;

  const routePath = match[1]; // e.g., 'users' or 'boards/[id]'

  // Extract HTTP method exports (GET, POST, PUT, DELETE, PATCH)
  const httpMethods = exports.filter(exp =>
    ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(exp.toUpperCase())
  );

  if (httpMethods.length === 0) return null;

  return {
    path: `/api/${routePath}`,
    methods: httpMethods.map(m => m.toUpperCase()),
    framework: 'nextjs',
  };
}

/**
 * IMP-CORE-004: Parse Next.js Pages Router file-based routing
 * Detects: pages/api/users.ts with default export handler
 *
 * @param filePath - Absolute file path
 * @param fileContent - Full file content to detect methods from req.method checks
 * @returns RouteMetadata or null if not a Next.js Pages route file
 *
 * @example
 * parseNextJsPagesRoute("/project/pages/api/users.ts", "export default function handler(req, res) { ... }")
 * // Returns: { path: '/api/users', methods: ['GET', 'POST'], framework: 'nextjs' }
 */
export function parseNextJsPagesRoute(filePath: string, fileContent: string): RouteMetadata | null {
  // Check if file matches pages/api/*.ts or pages/api/**/*.ts
  const routeFileRegex = /\/pages\/api\/(.+)\.(ts|js|tsx|jsx)$/;
  const match = filePath.match(routeFileRegex);

  if (!match) return null;

  let routePath = match[1]; // e.g., 'users' or 'users/[id]' or 'users/index'

  // Remove /index from path if present (Next.js convention)
  routePath = routePath.replace(/\/index$/, '');

  // Detect methods from req.method checks in handler
  const methods: string[] = [];

  if (/req\.method\s*===?\s*['"]GET['"]/.test(fileContent) || /req\.method\s*===?\s*['"]get['"]/.test(fileContent)) {
    methods.push('GET');
  }
  if (/req\.method\s*===?\s*['"]POST['"]/.test(fileContent) || /req\.method\s*===?\s*['"]post['"]/.test(fileContent)) {
    methods.push('POST');
  }
  if (/req\.method\s*===?\s*['"]PUT['"]/.test(fileContent) || /req\.method\s*===?\s*['"]put['"]/.test(fileContent)) {
    methods.push('PUT');
  }
  if (/req\.method\s*===?\s*['"]DELETE['"]/.test(fileContent) || /req\.method\s*===?\s*['"]delete['"]/.test(fileContent)) {
    methods.push('DELETE');
  }
  if (/req\.method\s*===?\s*['"]PATCH['"]/.test(fileContent) || /req\.method\s*===?\s*['"]patch['"]/.test(fileContent)) {
    methods.push('PATCH');
  }

  // If no explicit method checks found, default to generic handler
  if (methods.length === 0 && /export\s+default\s+(?:async\s+)?function\s+handler/.test(fileContent)) {
    methods.push('GET', 'POST', 'PUT', 'DELETE', 'PATCH'); // Assume all methods
  }

  if (methods.length === 0) return null;

  return {
    path: `/api/${routePath}`,
    methods,
    framework: 'nextjs',
  };
}

/**
 * IMP-CORE-004: Parse SvelteKit server routes
 * Detects: +server.ts with named exports (GET, POST, etc.) or +page.server.ts with load/actions
 *
 * @param filePath - Absolute file path
 * @param exports - Array of export names from the file
 * @returns RouteMetadata or null if not a SvelteKit route file
 *
 * @example
 * parseSvelteKitRoute("/project/src/routes/api/users/+server.ts", ['GET', 'POST'])
 * // Returns: { path: '/api/users', methods: ['GET', 'POST'], framework: 'sveltekit' }
 */
export function parseSvelteKitRoute(filePath: string, exports: string[]): RouteMetadata | null {
  // Check for +server.ts (API routes)
  const serverRouteRegex = /\/src\/routes\/(.+)\/\+server\.(ts|js)$/;
  const serverMatch = filePath.match(serverRouteRegex);

  if (serverMatch) {
    const routePath = serverMatch[1]; // e.g., 'api/users'

    // Extract HTTP method exports
    const httpMethods = exports.filter(exp =>
      ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(exp.toUpperCase())
    );

    if (httpMethods.length === 0) return null;

    return {
      path: `/${routePath}`,
      methods: httpMethods.map(m => m.toUpperCase()),
      framework: 'sveltekit',
    };
  }

  // Check for +page.server.ts (Page routes with load/actions)
  const pageServerRegex = /\/src\/routes\/(.+)\/\+page\.server\.(ts|js)$/;
  const pageMatch = filePath.match(pageServerRegex);

  if (pageMatch) {
    const routePath = pageMatch[1]; // e.g., 'users'
    const methods: string[] = [];

    // load = GET, actions = POST/PUT/DELETE
    if (exports.includes('load')) {
      methods.push('GET');
    }
    if (exports.includes('actions')) {
      methods.push('POST', 'PUT', 'DELETE');
    }

    if (methods.length === 0) return null;

    return {
      path: `/${routePath}`,
      methods,
      framework: 'sveltekit',
    };
  }

  return null;
}

/**
 * IMP-CORE-004: Parse Nuxt server API routes
 * Detects: server/api/*.get.ts, server/api/*.post.ts, or server/api/*.ts
 *
 * @param filePath - Absolute file path
 * @param fileContent - Full file content for method detection
 * @returns RouteMetadata or null if not a Nuxt route file
 *
 * @example
 * parseNuxtRoute("/project/server/api/users.get.ts", "export default defineEventHandler(...)")
 * // Returns: { path: '/api/users', methods: ['GET'], framework: 'nuxt' }
 */
export function parseNuxtRoute(filePath: string, fileContent: string): RouteMetadata | null {
  // Check for server/api/**/*.ts pattern
  const routeFileRegex = /\/server\/api\/(.+)\.(ts|js)$/;
  const match = filePath.match(routeFileRegex);

  if (!match) return null;

  let routePath = match[1]; // e.g., 'users.get' or 'users/index.get'

  // Parse method from filename suffix (.get.ts, .post.ts, etc.)
  const methodSuffixRegex = /\.(get|post|put|delete|patch)$/i;
  const methodMatch = routePath.match(methodSuffixRegex);

  let methods: string[] = [];

  if (methodMatch) {
    // Extract method from filename
    methods.push(methodMatch[1].toUpperCase());
    // Remove suffix from path
    routePath = routePath.replace(methodSuffixRegex, '');
  } else {
    // No suffix - check if it's a catch-all handler
    if (/defineEventHandler/.test(fileContent) || /export\s+default\s+defineEventHandler/.test(fileContent)) {
      // Try to detect methods from event.node.req.method or assume all
      if (/req\.method/.test(fileContent)) {
        // Parse specific methods from content
        if (/['"]GET['"]/.test(fileContent)) methods.push('GET');
        if (/['"]POST['"]/.test(fileContent)) methods.push('POST');
        if (/['"]PUT['"]/.test(fileContent)) methods.push('PUT');
        if (/['"]DELETE['"]/.test(fileContent)) methods.push('DELETE');
        if (/['"]PATCH['"]/.test(fileContent)) methods.push('PATCH');
      }
      if (methods.length === 0) {
        methods.push('GET', 'POST', 'PUT', 'DELETE', 'PATCH');
      }
    }
  }

  // Remove /index from path if present
  routePath = routePath.replace(/\/index$/, '');

  if (methods.length === 0) return null;

  return {
    path: `/api/${routePath}`,
    methods,
    framework: 'nuxt',
  };
}

/**
 * IMP-CORE-004: Parse Remix routes
 * Detects: app/routes users.tsx with loader/action exports
 *
 * @param filePath - Absolute file path
 * @param exports - Array of export names from the file
 * @returns RouteMetadata or null if not a Remix route file
 *
 * @example
 * parseRemixRoute("/project/app/routes/users.tsx", ['loader', 'action'])
 * // Returns: { path: '/users', methods: ['GET', 'POST'], framework: 'remix' }
 */
export function parseRemixRoute(filePath: string, exports: string[]): RouteMetadata | null {
  // Check for app/routes/**/*.tsx pattern
  const routeFileRegex = /\/app\/routes\/(.+)\.(tsx|jsx|ts|js)$/;
  const match = filePath.match(routeFileRegex);

  if (!match) return null;

  let routePath = match[1]; // e.g., 'users' or 'users.$id'

  // Convert Remix route conventions to path
  // users.$id → users/[id]
  routePath = routePath.replace(/\.\$/g, '/[').replace(/\$/g, '[') + (routePath.includes('$') ? ']' : '');
  // _index → /
  routePath = routePath.replace(/\/_index$/, '');

  const methods: string[] = [];

  // loader = GET
  if (exports.includes('loader')) {
    methods.push('GET');
  }

  // action = POST/PUT/DELETE/PATCH
  if (exports.includes('action')) {
    methods.push('POST', 'PUT', 'DELETE', 'PATCH');
  }

  if (methods.length === 0) return null;

  return {
    path: routePath.startsWith('/') ? routePath : `/${routePath}`,
    methods,
    framework: 'remix',
  };
}

/**
 * Dispatcher function that detects framework and calls appropriate parser
 *
 * @param code - Code line to parse (decorator or route definition)
 * @param filePath - File path for Next.js detection
 * @param exports - Export names for Next.js detection
 * @param line - Line number for debugging
 * @param fileContent - Full file content for context checking (optional)
 * @returns RouteMetadata or null if no route detected
 *
 * @example
 * extractRouteMetadata("@app.route('/users')", "app.py", [], 42)
 * // Returns: { path: '/users', methods: ['GET'], framework: 'flask' }
 *
 * extractRouteMetadata("", "app/api/boards/route.ts", ['GET', 'POST'], 1)
 * // Returns: { path: '/api/boards', methods: ['GET', 'POST'], framework: 'nextjs' }
 */
export function extractRouteMetadata(
  code: string,
  filePath: string,
  exports: string[] = [],
  line: number = 0,
  fileContent?: string
): RouteMetadata | null {
  // Try Next.js App Router (requires file path analysis)
  if (filePath.includes('/app/api/') && filePath.includes('/route.')) {
    const nextjsRoute = parseNextJsRoute(filePath, exports);
    if (nextjsRoute) return nextjsRoute;
  }

  // IMP-CORE-004: Try Next.js Pages Router
  if (filePath.includes('/pages/api/') && fileContent) {
    const nextjsPagesRoute = parseNextJsPagesRoute(filePath, fileContent);
    if (nextjsPagesRoute) return nextjsPagesRoute;
  }

  // IMP-CORE-004: Try SvelteKit routes
  if (filePath.includes('/src/routes/') && (filePath.includes('/+server.') || filePath.includes('/+page.server.'))) {
    const sveltekitRoute = parseSvelteKitRoute(filePath, exports);
    if (sveltekitRoute) return sveltekitRoute;
  }

  // IMP-CORE-004: Try Nuxt server routes
  if (filePath.includes('/server/api/') && fileContent) {
    const nuxtRoute = parseNuxtRoute(filePath, fileContent);
    if (nuxtRoute) return nuxtRoute;
  }

  // IMP-CORE-004: Try Remix routes
  if (filePath.includes('/app/routes/')) {
    const remixRoute = parseRemixRoute(filePath, exports);
    if (remixRoute) return remixRoute;
  }

  // Try Flask (@app.route or @bp.route)
  if (code.includes('@') && code.includes('.route(')) {
    const flaskRoute = parseFlaskRoute(code, line);
    if (flaskRoute) return flaskRoute;
  }

  // Try FastAPI (@app.get/post/put/delete/patch)
  if (code.includes('@app.') && /\.(get|post|put|delete|patch)\(/.test(code)) {
    const fastapiRoute = parseFastAPIRoute(code, line);
    if (fastapiRoute) return fastapiRoute;
  }

  // Try Express (app.get or router.post)
  if (/\w+\.(get|post|put|delete|patch)\(['"]/.test(code)) {
    const expressRoute = parseExpressRoute(code, line, fileContent);
    if (expressRoute) return expressRoute;
  }

  return null;
}

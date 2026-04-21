/**
 * WO-API-ROUTE-DETECTION-001: Route Generation Tests
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Frontend Call Generation Tests
 * Tests for route filtering, formatting, and output generation
 * Tests for frontend call filtering, formatting, and output generation
 */

import { describe, it, expect } from 'vitest';
import {
  filterRouteElements,
  formatRoutesJson,
  sortRoutes,
  generateRoutes,
  type RouteElement,
  filterFrontendCallElements,
  formatFrontendCallsJson,
  sortFrontendCalls,
  generateFrontendCalls,
  type FrontendCallElement
} from './generateRoutes.js';
import type { ElementData } from '../types/types.js';

describe('filterRouteElements', () => {
  // TEST-010: Route generation tests (part 1)

  it('should filter elements with route metadata', () => {
    const elements: ElementData[] = [
      {
        type: 'function',
        name: 'getUsers',
        file: 'app.py',
        line: 10,
        route: {
          path: '/users',
          methods: ['GET'],
          framework: 'flask'
        }
      },
      {
        type: 'function',
        name: 'normalFunction',
        file: 'utils.py',
        line: 20
      },
      {
        type: 'function',
        name: 'createUser',
        file: 'app.py',
        line: 30,
        route: {
          path: '/users',
          methods: ['POST'],
          framework: 'flask'
        }
      }
    ];

    const result = filterRouteElements(elements);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('getUsers');
    expect(result[1].name).toBe('createUser');
  });

  it('should return empty array when no routes', () => {
    const elements: ElementData[] = [
      {
        type: 'function',
        name: 'normalFunction',
        file: 'utils.py',
        line: 10
      }
    ];

    const result = filterRouteElements(elements);

    expect(result).toHaveLength(0);
  });

  it('should extract all route fields correctly', () => {
    const elements: ElementData[] = [
      {
        type: 'function',
        name: 'handler',
        file: 'server.js',
        line: 15,
        route: {
          path: '/api/data',
          methods: ['GET', 'POST'],
          framework: 'express',
          blueprint: 'apiRouter'
        }
      }
    ];

    const result = filterRouteElements(elements);

    expect(result[0]).toEqual({
      name: 'handler',
      file: 'server.js',
      line: 15,
      route: {
        path: '/api/data',
        methods: ['GET', 'POST'],
        framework: 'express',
        blueprint: 'apiRouter'
      }
    });
  });
});

describe('formatRoutesJson', () => {
  // TEST-010: Route generation tests (part 2)

  it('should group routes by framework', () => {
    const routeElements: RouteElement[] = [
      {
        name: 'getUsers',
        file: 'app.py',
        line: 10,
        route: { path: '/users', methods: ['GET'], framework: 'flask' }
      },
      {
        name: 'handler',
        file: 'server.js',
        line: 20,
        route: { path: '/api/data', methods: ['GET'], framework: 'express' }
      },
      {
        name: 'createUser',
        file: 'app.py',
        line: 30,
        route: { path: '/users', methods: ['POST'], framework: 'flask' }
      }
    ];

    const result = formatRoutesJson(routeElements, '/project');

    expect(result.totalRoutes).toBe(3);
    expect(result.byFramework.flask).toHaveLength(2);
    expect(result.byFramework.express).toHaveLength(1);
    expect(result.byFramework.fastapi).toBeUndefined();
    expect(result.byFramework.nextjs).toBeUndefined();
  });

  it('should include metadata with timestamp and project path', () => {
    const routeElements: RouteElement[] = [];
    const result = formatRoutesJson(routeElements, '/my/project');

    expect(result.metadata.projectPath).toBe('/my/project');
    expect(result.metadata.scanVersion).toBe('1.0.0');
    expect(result.metadata.generatedAt).toBeDefined();
    expect(new Date(result.metadata.generatedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should handle empty route elements', () => {
    const result = formatRoutesJson([]);

    expect(result.totalRoutes).toBe(0);
    expect(Object.keys(result.byFramework)).toHaveLength(0);
  });

  it('should group all four frameworks correctly', () => {
    const routeElements: RouteElement[] = [
      {
        name: 'flask1',
        file: 'app.py',
        line: 1,
        route: { path: '/flask', methods: ['GET'], framework: 'flask' }
      },
      {
        name: 'fastapi1',
        file: 'main.py',
        line: 2,
        route: { path: '/fastapi', methods: ['GET'], framework: 'fastapi' }
      },
      {
        name: 'express1',
        file: 'server.js',
        line: 3,
        route: { path: '/express', methods: ['GET'], framework: 'express' }
      },
      {
        name: 'nextjs1',
        file: 'app/api/route.ts',
        line: 4,
        route: { path: '/nextjs', methods: ['GET'], framework: 'nextjs' }
      }
    ];

    const result = formatRoutesJson(routeElements);

    expect(result.byFramework.flask).toHaveLength(1);
    expect(result.byFramework.fastapi).toHaveLength(1);
    expect(result.byFramework.express).toHaveLength(1);
    expect(result.byFramework.nextjs).toHaveLength(1);
  });
});

describe('sortRoutes', () => {
  // TEST-010: Route generation tests (part 3)

  it('should sort routes by path within each framework', () => {
    const output = {
      totalRoutes: 3,
      byFramework: {
        flask: [
          {
            name: 'handler3',
            file: 'app.py',
            line: 30,
            route: { path: '/users', methods: ['GET'], framework: 'flask' as const }
          },
          {
            name: 'handler1',
            file: 'app.py',
            line: 10,
            route: { path: '/admin', methods: ['GET'], framework: 'flask' as const }
          },
          {
            name: 'handler2',
            file: 'app.py',
            line: 20,
            route: { path: '/login', methods: ['POST'], framework: 'flask' as const }
          }
        ]
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        scanVersion: '1.0.0'
      }
    };

    const result = sortRoutes(output);

    expect(result.byFramework.flask![0].route.path).toBe('/admin');
    expect(result.byFramework.flask![1].route.path).toBe('/login');
    expect(result.byFramework.flask![2].route.path).toBe('/users');
  });

  it('should preserve totalRoutes and metadata', () => {
    const output = {
      totalRoutes: 5,
      byFramework: {},
      metadata: {
        generatedAt: '2026-01-01T00:00:00.000Z',
        projectPath: '/test',
        scanVersion: '1.0.0'
      }
    };

    const result = sortRoutes(output);

    expect(result.totalRoutes).toBe(5);
    expect(result.metadata).toEqual(output.metadata);
  });

  it('should handle empty frameworks', () => {
    const output = {
      totalRoutes: 0,
      byFramework: {},
      metadata: {
        generatedAt: new Date().toISOString(),
        scanVersion: '1.0.0'
      }
    };

    const result = sortRoutes(output);

    expect(result.byFramework).toEqual({});
  });
});

describe('generateRoutes (integration)', () => {
  // TEST-010: Route generation tests (complete pipeline)

  it('should filter, format, and sort routes end-to-end', () => {
    const elements: ElementData[] = [
      {
        type: 'function',
        name: 'getUsers',
        file: 'app.py',
        line: 30,
        route: { path: '/users', methods: ['GET'], framework: 'flask' }
      },
      {
        type: 'function',
        name: 'normalFunction',
        file: 'utils.py',
        line: 10
      },
      {
        type: 'function',
        name: 'getAdmin',
        file: 'app.py',
        line: 10,
        route: { path: '/admin', methods: ['GET'], framework: 'flask' }
      },
      {
        type: 'function',
        name: 'expressHandler',
        file: 'server.js',
        line: 50,
        route: { path: '/api/data', methods: ['GET'], framework: 'express' }
      }
    ];

    const result = generateRoutes(elements, '/my/project');

    // Check filtering
    expect(result.totalRoutes).toBe(3);

    // Check grouping
    expect(result.byFramework.flask).toHaveLength(2);
    expect(result.byFramework.express).toHaveLength(1);

    // Check sorting (Flask routes sorted by path)
    expect(result.byFramework.flask![0].route.path).toBe('/admin');
    expect(result.byFramework.flask![1].route.path).toBe('/users');

    // Check metadata
    expect(result.metadata.projectPath).toBe('/my/project');
    expect(result.metadata.scanVersion).toBe('1.0.0');
  });

  it('should handle elements with no routes', () => {
    const elements: ElementData[] = [
      {
        type: 'function',
        name: 'util1',
        file: 'utils.js',
        line: 10
      },
      {
        type: 'class',
        name: 'Helper',
        file: 'helper.js',
        line: 20
      }
    ];

    const result = generateRoutes(elements);

    expect(result.totalRoutes).toBe(0);
    expect(Object.keys(result.byFramework)).toHaveLength(0);
  });

  it('should handle mixed frameworks with sorting', () => {
    const elements: ElementData[] = [
      {
        type: 'function',
        name: 'route1',
        file: 'app.py',
        line: 1,
        route: { path: '/z-last', methods: ['GET'], framework: 'flask' }
      },
      {
        type: 'function',
        name: 'route2',
        file: 'main.py',
        line: 2,
        route: { path: '/b-middle', methods: ['GET'], framework: 'fastapi' }
      },
      {
        type: 'function',
        name: 'route3',
        file: 'app.py',
        line: 3,
        route: { path: '/a-first', methods: ['GET'], framework: 'flask' }
      },
      {
        type: 'function',
        name: 'route4',
        file: 'main.py',
        line: 4,
        route: { path: '/a-also-first', methods: ['GET'], framework: 'fastapi' }
      }
    ];

    const result = generateRoutes(elements);

    // Flask sorted
    expect(result.byFramework.flask![0].route.path).toBe('/a-first');
    expect(result.byFramework.flask![1].route.path).toBe('/z-last');

    // FastAPI sorted
    expect(result.byFramework.fastapi![0].route.path).toBe('/a-also-first');
    expect(result.byFramework.fastapi![1].route.path).toBe('/b-middle');
  });
});

// ============================================================================
// WO-ROUTE-VALIDATION-ENHANCEMENT-001: Frontend Call Generation Tests
// ============================================================================

describe('filterFrontendCallElements', () => {
  // TEST-010: Frontend call generation tests (part 1)

  it('should filter elements with frontendCall metadata', () => {
    const elements: ElementData[] = [
      {
        type: 'function',
        name: 'fetchUsers',
        file: 'app.tsx',
        line: 10,
        frontendCall: {
          path: '/api/users',
          method: 'GET',
          file: 'app.tsx',
          line: 10,
          callType: 'fetch',
          confidence: 100
        }
      },
      {
        type: 'function',
        name: 'regularFunction',
        file: 'utils.ts',
        line: 20
      },
      {
        type: 'function',
        name: 'axiosPost',
        file: 'api.ts',
        line: 30,
        frontendCall: {
          path: '/api/posts',
          method: 'POST',
          file: 'api.ts',
          line: 30,
          callType: 'axios',
          confidence: 100
        }
      }
    ];

    const result = filterFrontendCallElements(elements);

    expect(result).toHaveLength(2);
    expect(result[0].path).toBe('/api/users');
    expect(result[0].callType).toBe('fetch');
    expect(result[1].path).toBe('/api/posts');
    expect(result[1].callType).toBe('axios');
  });

  it('should return empty array when no frontend calls exist', () => {
    const elements: ElementData[] = [
      {
        type: 'function',
        name: 'regularFunction',
        file: 'utils.ts',
        line: 20
      }
    ];

    const result = filterFrontendCallElements(elements);
    expect(result).toEqual([]);
  });

  it('should extract all frontend call fields correctly', () => {
    const elements: ElementData[] = [
      {
        type: 'function',
        name: 'fetchUser',
        file: 'app.tsx',
        line: 15,
        frontendCall: {
          path: '/api/users/{id}',
          method: 'GET',
          file: 'app.tsx',
          line: 15,
          callType: 'fetch',
          confidence: 80
        }
      }
    ];

    const result = filterFrontendCallElements(elements);

    expect(result[0]).toEqual({
      path: '/api/users/{id}',
      method: 'GET',
      file: 'app.tsx',
      line: 15,
      callType: 'fetch',
      confidence: 80
    });
  });
});

describe('formatFrontendCallsJson', () => {
  // TEST-010: Frontend call generation tests (part 2)

  it('should group frontend calls by call type', () => {
    const callElements: FrontendCallElement[] = [
      {
        path: '/api/users',
        method: 'GET',
        file: 'app.tsx',
        line: 10,
        callType: 'fetch',
        confidence: 100
      },
      {
        path: '/api/posts',
        method: 'POST',
        file: 'api.ts',
        line: 20,
        callType: 'axios',
        confidence: 100
      },
      {
        path: '/api/comments',
        method: 'GET',
        file: 'hooks.ts',
        line: 30,
        callType: 'reactQuery',
        confidence: 100
      }
    ];

    const result = formatFrontendCallsJson(callElements, '/project');

    expect(result.totalCalls).toBe(3);
    expect(result.byCallType.fetch).toHaveLength(1);
    expect(result.byCallType.axios).toHaveLength(1);
    expect(result.byCallType.reactQuery).toHaveLength(1);
    expect(result.byCallType.custom).toBeUndefined();
  });

  it('should include metadata with timestamp and project path', () => {
    const callElements: FrontendCallElement[] = [];
    const result = formatFrontendCallsJson(callElements, '/my/project');

    expect(result.metadata.projectPath).toBe('/my/project');
    expect(result.metadata.scanVersion).toBe('1.0.0');
    expect(result.metadata.generatedAt).toBeDefined();
    expect(new Date(result.metadata.generatedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should handle empty call elements', () => {
    const result = formatFrontendCallsJson([]);

    expect(result.totalCalls).toBe(0);
    expect(Object.keys(result.byCallType)).toHaveLength(0);
  });

  it('should group multiple calls of same type', () => {
    const callElements: FrontendCallElement[] = [
      {
        path: '/api/users',
        method: 'GET',
        file: 'app.tsx',
        line: 10,
        callType: 'fetch',
        confidence: 100
      },
      {
        path: '/api/posts',
        method: 'GET',
        file: 'app.tsx',
        line: 20,
        callType: 'fetch',
        confidence: 100
      }
    ];

    const result = formatFrontendCallsJson(callElements);

    expect(result.totalCalls).toBe(2);
    expect(result.byCallType.fetch).toHaveLength(2);
  });
});

describe('sortFrontendCalls', () => {
  // TEST-010: Frontend call generation tests (part 3)

  it('should sort calls by path within each call type', () => {
    const output = {
      totalCalls: 3,
      byCallType: {
        fetch: [
          {
            path: '/api/users',
            method: 'GET',
            file: 'app.tsx',
            line: 10,
            callType: 'fetch' as const,
            confidence: 100
          },
          {
            path: '/api/posts',
            method: 'GET',
            file: 'app.tsx',
            line: 20,
            callType: 'fetch' as const,
            confidence: 100
          },
          {
            path: '/api/comments',
            method: 'POST',
            file: 'app.tsx',
            line: 30,
            callType: 'fetch' as const,
            confidence: 100
          }
        ]
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        scanVersion: '1.0.0'
      }
    };

    const result = sortFrontendCalls(output);

    expect(result.byCallType.fetch![0].path).toBe('/api/comments');
    expect(result.byCallType.fetch![1].path).toBe('/api/posts');
    expect(result.byCallType.fetch![2].path).toBe('/api/users');
  });

  it('should sort by file when paths are identical', () => {
    const output = {
      totalCalls: 2,
      byCallType: {
        fetch: [
          {
            path: '/api/users',
            method: 'GET',
            file: 'components/UserList.tsx',
            line: 10,
            callType: 'fetch' as const,
            confidence: 100
          },
          {
            path: '/api/users',
            method: 'GET',
            file: 'app.tsx',
            line: 20,
            callType: 'fetch' as const,
            confidence: 100
          }
        ]
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        scanVersion: '1.0.0'
      }
    };

    const result = sortFrontendCalls(output);

    expect(result.byCallType.fetch![0].file).toBe('app.tsx');
    expect(result.byCallType.fetch![1].file).toBe('components/UserList.tsx');
  });

  it('should handle empty call types', () => {
    const output = {
      totalCalls: 0,
      byCallType: {},
      metadata: {
        generatedAt: new Date().toISOString(),
        scanVersion: '1.0.0'
      }
    };

    const result = sortFrontendCalls(output);
    expect(result.byCallType).toEqual({});
  });
});

describe('generateFrontendCalls (integration)', () => {
  // TEST-010: Frontend call generation tests (complete pipeline)

  it('should filter, format, and sort frontend calls end-to-end', () => {
    const elements: ElementData[] = [
      {
        type: 'function',
        name: 'fetchUsers',
        file: 'app.tsx',
        line: 30,
        frontendCall: {
          path: '/api/users',
          method: 'GET',
          file: 'app.tsx',
          line: 30,
          callType: 'fetch',
          confidence: 100
        }
      },
      {
        type: 'function',
        name: 'regularFunction',
        file: 'utils.ts',
        line: 10
      },
      {
        type: 'function',
        name: 'axiosPosts',
        file: 'api.ts',
        line: 20,
        frontendCall: {
          path: '/api/posts',
          method: 'POST',
          file: 'api.ts',
          line: 20,
          callType: 'axios',
          confidence: 100
        }
      },
      {
        type: 'function',
        name: 'useComments',
        file: 'hooks.ts',
        line: 15,
        frontendCall: {
          path: '/api/comments',
          method: 'GET',
          file: 'hooks.ts',
          line: 15,
          callType: 'reactQuery',
          confidence: 100
        }
      }
    ];

    const result = generateFrontendCalls(elements, '/my/project');

    // Check filtering
    expect(result.totalCalls).toBe(3);

    // Check grouping
    expect(result.byCallType.fetch).toHaveLength(1);
    expect(result.byCallType.axios).toHaveLength(1);
    expect(result.byCallType.reactQuery).toHaveLength(1);

    // Check metadata
    expect(result.metadata.projectPath).toBe('/my/project');
    expect(result.metadata.scanVersion).toBe('1.0.0');
  });

  it('should handle elements with no frontend calls', () => {
    const elements: ElementData[] = [
      {
        type: 'function',
        name: 'util1',
        file: 'utils.js',
        line: 10
      },
      {
        type: 'class',
        name: 'Helper',
        file: 'helper.js',
        line: 20
      }
    ];

    const result = generateFrontendCalls(elements);

    expect(result.totalCalls).toBe(0);
    expect(Object.keys(result.byCallType)).toHaveLength(0);
  });

  it('should handle mixed call types with template literals and sorting', () => {
    const elements: ElementData[] = [
      {
        type: 'function',
        name: 'fetchUser',
        file: 'app.tsx',
        line: 10,
        frontendCall: {
          path: '/api/users/{id}',
          method: 'GET',
          file: 'app.tsx',
          line: 10,
          callType: 'fetch',
          confidence: 80
        }
      },
      {
        type: 'function',
        name: 'fetchAllUsers',
        file: 'app.tsx',
        line: 20,
        frontendCall: {
          path: '/api/users',
          method: 'GET',
          file: 'app.tsx',
          line: 20,
          callType: 'fetch',
          confidence: 100
        }
      }
    ];

    const result = generateFrontendCalls(elements);

    expect(result.totalCalls).toBe(2);
    expect(result.byCallType.fetch).toHaveLength(2);

    // Check sorting (should be sorted by path)
    expect(result.byCallType.fetch![0].path).toBe('/api/users');
    expect(result.byCallType.fetch![1].path).toBe('/api/users/{id}');

    // Check confidence scores preserved
    expect(result.byCallType.fetch![0].confidence).toBe(100);
    expect(result.byCallType.fetch![1].confidence).toBe(80);
  });
});

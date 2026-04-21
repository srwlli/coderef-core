/**
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Route Matching Tests
 */

import { describe, it, expect } from 'vitest';
import {
  exactMatch,
  dynamicMatch,
  partialMatch,
  calculateMatchConfidence,
  matchHttpMethods,
  findBestMatch,
  type RouteMatch
} from './route-matcher.js';
import type { NormalizedRoute } from './route-normalizer.js';

describe('exactMatch', () => {
  it('should match identical static routes', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users',
      dynamicSegments: [],
      methods: ['GET'],
      framework: 'express'
    };

    expect(exactMatch('/api/users', serverRoute)).toBe(true);
  });

  it('should not match if paths differ', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users',
      dynamicSegments: [],
      methods: ['GET'],
      framework: 'express'
    };

    expect(exactMatch('/api/posts', serverRoute)).toBe(false);
  });

  it('should not match if server has dynamic segments', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users/{id}',
      dynamicSegments: ['id'],
      methods: ['GET'],
      framework: 'express'
    };

    expect(exactMatch('/api/users/{id}', serverRoute)).toBe(false);
  });

  it('should match with trailing slashes normalized', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users',
      dynamicSegments: [],
      methods: ['GET'],
      framework: 'express'
    };

    expect(exactMatch('/api/users', serverRoute)).toBe(true);
  });
});

describe('dynamicMatch', () => {
  it('should match routes with same dynamic segments', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users/{id}',
      dynamicSegments: ['id'],
      methods: ['GET'],
      framework: 'express'
    };

    expect(dynamicMatch('/api/users/{id}', serverRoute)).toBe(true);
  });

  it('should match routes with multiple dynamic segments', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users/{userId}/posts/{postId}',
      dynamicSegments: ['userId', 'postId'],
      methods: ['GET'],
      framework: 'express'
    };

    expect(dynamicMatch('/api/users/{userId}/posts/{postId}', serverRoute)).toBe(true);
  });

  it('should not match if segment counts differ', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users/{id}',
      dynamicSegments: ['id'],
      methods: ['GET'],
      framework: 'express'
    };

    expect(dynamicMatch('/api/users', serverRoute)).toBe(false);
  });

  it('should not match if static segments differ', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users/{id}',
      dynamicSegments: ['id'],
      methods: ['GET'],
      framework: 'express'
    };

    expect(dynamicMatch('/api/posts/{id}', serverRoute)).toBe(false);
  });

  it('should return false if server has no dynamic segments', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users',
      dynamicSegments: [],
      methods: ['GET'],
      framework: 'express'
    };

    expect(dynamicMatch('/api/users/{id}', serverRoute)).toBe(false);
  });

  it('should match mixed static and dynamic segments', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/v1/users/{id}/profile',
      dynamicSegments: ['id'],
      methods: ['GET'],
      framework: 'express'
    };

    expect(dynamicMatch('/api/v1/users/{id}/profile', serverRoute)).toBe(true);
  });
});

describe('partialMatch', () => {
  it('should match frontend path that extends server route', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users/{id}',
      dynamicSegments: ['id'],
      methods: ['GET'],
      framework: 'express'
    };

    expect(partialMatch('/api/users/123', serverRoute)).toBe(true);
  });

  it('should not match if frontend path is shorter than server', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users/{id}/posts',
      dynamicSegments: ['id'],
      methods: ['GET'],
      framework: 'express'
    };

    expect(partialMatch('/api/users', serverRoute)).toBe(false);
  });

  it('should match with dynamic segment placeholders', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users/{userId}/posts/{postId}',
      dynamicSegments: ['userId', 'postId'],
      methods: ['GET'],
      framework: 'express'
    };

    expect(partialMatch('/api/users/123/posts/456', serverRoute)).toBe(true);
  });

  it('should not match if static segments differ', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users/{id}',
      dynamicSegments: ['id'],
      methods: ['GET'],
      framework: 'express'
    };

    expect(partialMatch('/api/posts/123', serverRoute)).toBe(false);
  });
});

describe('calculateMatchConfidence', () => {
  it('should return 100 confidence for exact match', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users',
      dynamicSegments: [],
      methods: ['GET'],
      framework: 'express'
    };

    const result = calculateMatchConfidence('/api/users', serverRoute, 'GET');

    expect(result.matched).toBe(true);
    expect(result.confidence).toBe(100);
    expect(result.matchType).toBe('exact');
    expect(result.methodsMatch).toBe(true);
  });

  it('should return 95 confidence for dynamic match with matching methods', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users/{id}',
      dynamicSegments: ['id'],
      methods: ['GET'],
      framework: 'express'
    };

    const result = calculateMatchConfidence('/api/users/{id}', serverRoute, 'GET');

    expect(result.matched).toBe(true);
    expect(result.confidence).toBe(95);
    expect(result.matchType).toBe('dynamic');
    expect(result.methodsMatch).toBe(true);
  });

  it('should return 75 confidence for dynamic match with mismatched methods', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users/{id}',
      dynamicSegments: ['id'],
      methods: ['GET'],
      framework: 'express'
    };

    const result = calculateMatchConfidence('/api/users/{id}', serverRoute, 'POST');

    expect(result.matched).toBe(true);
    expect(result.confidence).toBe(75);
    expect(result.matchType).toBe('dynamic');
    expect(result.methodsMatch).toBe(false);
  });

  it('should return 70 confidence for partial match with matching methods', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users/{id}',
      dynamicSegments: ['id'],
      methods: ['GET'],
      framework: 'express'
    };

    const result = calculateMatchConfidence('/api/users/123', serverRoute, 'GET');

    expect(result.matched).toBe(true);
    expect(result.confidence).toBe(70);
    expect(result.matchType).toBe('partial');
    expect(result.methodsMatch).toBe(true);
  });

  it('should return 50 confidence for partial match with mismatched methods', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users/{id}',
      dynamicSegments: ['id'],
      methods: ['GET'],
      framework: 'express'
    };

    const result = calculateMatchConfidence('/api/users/123', serverRoute, 'POST');

    expect(result.matched).toBe(true);
    expect(result.confidence).toBe(50);
    expect(result.matchType).toBe('partial');
    expect(result.methodsMatch).toBe(false);
  });

  it('should return 0 confidence for no match', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users',
      dynamicSegments: [],
      methods: ['GET'],
      framework: 'express'
    };

    const result = calculateMatchConfidence('/api/posts', serverRoute);

    expect(result.matched).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.matchType).toBe('none');
    expect(result.methodsMatch).toBe(false);
  });

  it('should include matched segments in details', () => {
    const serverRoute: NormalizedRoute = {
      path: '/api/users/{id}',
      dynamicSegments: ['id'],
      methods: ['GET'],
      framework: 'express'
    };

    const result = calculateMatchConfidence('/api/users/{id}', serverRoute);

    expect(result.details?.matchedSegments).toEqual(['id']);
  });
});

describe('matchHttpMethods', () => {
  it('should match if frontend method in server methods', () => {
    expect(matchHttpMethods('GET', ['GET', 'POST'])).toBe(true);
  });

  it('should not match if frontend method not in server methods', () => {
    expect(matchHttpMethods('DELETE', ['GET', 'POST'])).toBe(false);
  });

  it('should match case-insensitively', () => {
    expect(matchHttpMethods('get', ['GET', 'POST'])).toBe(true);
    expect(matchHttpMethods('GET', ['get', 'post'])).toBe(true);
  });

  it('should return true if server methods empty', () => {
    expect(matchHttpMethods('GET', [])).toBe(true);
  });

  it('should handle all standard HTTP methods', () => {
    const allMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

    allMethods.forEach(method => {
      expect(matchHttpMethods(method, allMethods)).toBe(true);
    });
  });
});

describe('findBestMatch', () => {
  it('should return exact match with highest confidence', () => {
    const serverRoutes: NormalizedRoute[] = [
      {
        path: '/api/users',
        dynamicSegments: [],
        methods: ['GET'],
        framework: 'express'
      },
      {
        path: '/api/users/{id}',
        dynamicSegments: ['id'],
        methods: ['GET'],
        framework: 'express'
      }
    ];

    const result = findBestMatch('/api/users', serverRoutes, 'GET');

    expect(result).not.toBeNull();
    expect(result?.route.path).toBe('/api/users');
    expect(result?.match.confidence).toBe(100);
  });

  it('should return dynamic match when no exact match', () => {
    const serverRoutes: NormalizedRoute[] = [
      {
        path: '/api/posts',
        dynamicSegments: [],
        methods: ['GET'],
        framework: 'express'
      },
      {
        path: '/api/users/{id}',
        dynamicSegments: ['id'],
        methods: ['GET'],
        framework: 'express'
      }
    ];

    const result = findBestMatch('/api/users/{id}', serverRoutes, 'GET');

    expect(result).not.toBeNull();
    expect(result?.route.path).toBe('/api/users/{id}');
    expect(result?.match.confidence).toBe(95);
  });

  it('should return null if no match found', () => {
    const serverRoutes: NormalizedRoute[] = [
      {
        path: '/api/posts',
        dynamicSegments: [],
        methods: ['GET'],
        framework: 'express'
      }
    ];

    const result = findBestMatch('/api/users', serverRoutes);

    expect(result).toBeNull();
  });

  it('should prefer higher confidence match', () => {
    const serverRoutes: NormalizedRoute[] = [
      {
        path: '/api/users/{id}',
        dynamicSegments: ['id'],
        methods: ['GET'],
        framework: 'express'
      },
      {
        path: '/api/{resource}/{id}',
        dynamicSegments: ['resource', 'id'],
        methods: ['GET'],
        framework: 'express'
      }
    ];

    const result = findBestMatch('/api/users/{id}', serverRoutes, 'GET');

    expect(result).not.toBeNull();
    expect(result?.route.path).toBe('/api/users/{id}');
    expect(result?.match.confidence).toBeGreaterThan(90);
  });

  it('should handle empty server routes array', () => {
    const result = findBestMatch('/api/users', [], 'GET');

    expect(result).toBeNull();
  });
});

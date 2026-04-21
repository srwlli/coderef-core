/**
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Route Validator Tests
 * WO-MIGRATION-VALIDATION-001: Migration Validation Tests
 */

import { describe, it, expect } from 'vitest';
import {
  detectMissingRoutes,
  detectUnusedRoutes,
  detectMethodMismatches,
  classifyIssue
} from './route-validator.js';
import {
  calculateMigrationCoverage,
  findUnmappedCalls,
  groupCoverageByApiPrefix
} from './migration-mapper.js';
import type { FrontendCall, RouteMetadata } from '../types/types.js';

describe('detectMissingRoutes', () => {
  it('should detect frontend call with no matching server route', () => {
    const frontendCalls: FrontendCall[] = [
      {
        path: '/api/users',
        method: 'GET',
        file: 'app.tsx',
        line: 10,
        callType: 'fetch',
        confidence: 100
      }
    ];

    const serverRoutes: Array<RouteMetadata & { path: string }> = [
      {
        path: '/api/posts',
        methods: ['GET'],
        framework: 'express'
      }
    ];

    const issues = detectMissingRoutes(frontendCalls, serverRoutes);

    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('missing_route');
    expect(issues[0].severity).toBe('critical');
    expect(issues[0].frontendCall?.path).toBe('/api/users');
  });

  it('should not report issue when routes match exactly', () => {
    const frontendCalls: FrontendCall[] = [
      {
        path: '/api/users',
        method: 'GET',
        file: 'app.tsx',
        line: 10,
        callType: 'fetch',
        confidence: 100
      }
    ];

    const serverRoutes: Array<RouteMetadata & { path: string }> = [
      {
        path: '/api/users',
        methods: ['GET'],
        framework: 'express'
      }
    ];

    const issues = detectMissingRoutes(frontendCalls, serverRoutes);

    expect(issues).toHaveLength(0);
  });

  it('should match frontend call with dynamic segment to server route', () => {
    const frontendCalls: FrontendCall[] = [
      {
        path: '/api/users/{id}',
        method: 'GET',
        file: 'app.tsx',
        line: 10,
        callType: 'fetch',
        confidence: 80
      }
    ];

    const serverRoutes: Array<RouteMetadata & { path: string }> = [
      {
        path: '/api/users/:id',
        methods: ['GET'],
        framework: 'express'
      }
    ];

    const issues = detectMissingRoutes(frontendCalls, serverRoutes);

    expect(issues).toHaveLength(0);
  });

  it('should detect missing route with low confidence match', () => {
    const frontendCalls: FrontendCall[] = [
      {
        path: '/api/users/profile',
        method: 'GET',
        file: 'app.tsx',
        line: 10,
        callType: 'fetch',
        confidence: 100
      }
    ];

    const serverRoutes: Array<RouteMetadata & { path: string }> = [
      {
        path: '/api/posts',
        methods: ['GET'],
        framework: 'express'
      }
    ];

    const issues = detectMissingRoutes(frontendCalls, serverRoutes);

    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('No server route found');
  });

  it('should handle empty frontend calls', () => {
    const frontendCalls: FrontendCall[] = [];
    const serverRoutes: Array<RouteMetadata & { path: string }> = [
      {
        path: '/api/users',
        methods: ['GET'],
        framework: 'express'
      }
    ];

    const issues = detectMissingRoutes(frontendCalls, serverRoutes);

    expect(issues).toHaveLength(0);
  });

  it('should match Flask routes with Express-style params', () => {
    const frontendCalls: FrontendCall[] = [
      {
        path: '/api/users/{id}',
        method: 'GET',
        file: 'app.tsx',
        line: 10,
        callType: 'fetch',
        confidence: 80
      }
    ];

    const serverRoutes: Array<RouteMetadata & { path: string }> = [
      {
        path: '/api/users/<int:id>',
        methods: ['GET'],
        framework: 'flask'
      }
    ];

    const issues = detectMissingRoutes(frontendCalls, serverRoutes);

    expect(issues).toHaveLength(0);
  });
});

describe('detectUnusedRoutes', () => {
  it('should detect server route not called by frontend', () => {
    const frontendCalls: FrontendCall[] = [
      {
        path: '/api/users',
        method: 'GET',
        file: 'app.tsx',
        line: 10,
        callType: 'fetch',
        confidence: 100
      }
    ];

    const serverRoutes: Array<RouteMetadata & { path: string }> = [
      {
        path: '/api/users',
        methods: ['GET'],
        framework: 'express'
      },
      {
        path: '/api/posts',
        methods: ['GET'],
        framework: 'express'
      }
    ];

    const issues = detectUnusedRoutes(frontendCalls, serverRoutes);

    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('unused_route');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].serverRoute?.path).toBe('/api/posts');
  });

  it('should not report issue when all routes are used', () => {
    const frontendCalls: FrontendCall[] = [
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

    const serverRoutes: Array<RouteMetadata & { path: string }> = [
      {
        path: '/api/users',
        methods: ['GET'],
        framework: 'express'
      },
      {
        path: '/api/posts',
        methods: ['GET'],
        framework: 'express'
      }
    ];

    const issues = detectUnusedRoutes(frontendCalls, serverRoutes);

    expect(issues).toHaveLength(0);
  });

  it('should match dynamic routes when detecting unused', () => {
    const frontendCalls: FrontendCall[] = [
      {
        path: '/api/users/{id}',
        method: 'GET',
        file: 'app.tsx',
        line: 10,
        callType: 'fetch',
        confidence: 80
      }
    ];

    const serverRoutes: Array<RouteMetadata & { path: string }> = [
      {
        path: '/api/users/:id',
        methods: ['GET'],
        framework: 'express'
      }
    ];

    const issues = detectUnusedRoutes(frontendCalls, serverRoutes);

    expect(issues).toHaveLength(0);
  });

  it('should handle empty server routes', () => {
    const frontendCalls: FrontendCall[] = [
      {
        path: '/api/users',
        method: 'GET',
        file: 'app.tsx',
        line: 10,
        callType: 'fetch',
        confidence: 100
      }
    ];
    const serverRoutes: Array<RouteMetadata & { path: string }> = [];

    const issues = detectUnusedRoutes(frontendCalls, serverRoutes);

    expect(issues).toHaveLength(0);
  });
});

describe('detectMethodMismatches', () => {
  it('should detect HTTP method mismatch', () => {
    const frontendCalls: FrontendCall[] = [
      {
        path: '/api/users',
        method: 'POST',
        file: 'app.tsx',
        line: 10,
        callType: 'fetch',
        confidence: 100
      }
    ];

    const serverRoutes: Array<RouteMetadata & { path: string }> = [
      {
        path: '/api/users',
        methods: ['GET'],
        framework: 'express'
      }
    ];

    const issues = detectMethodMismatches(frontendCalls, serverRoutes);

    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('method_mismatch');
    expect(issues[0].severity).toBe('critical');
    expect(issues[0].frontendCall?.method).toBe('POST');
    expect(issues[0].message).toContain('POST');
    expect(issues[0].message).toContain('GET');
  });

  it('should not report issue when methods match', () => {
    const frontendCalls: FrontendCall[] = [
      {
        path: '/api/users',
        method: 'GET',
        file: 'app.tsx',
        line: 10,
        callType: 'fetch',
        confidence: 100
      }
    ];

    const serverRoutes: Array<RouteMetadata & { path: string }> = [
      {
        path: '/api/users',
        methods: ['GET', 'POST'],
        framework: 'express'
      }
    ];

    const issues = detectMethodMismatches(frontendCalls, serverRoutes);

    expect(issues).toHaveLength(0);
  });

  it('should detect method mismatch with dynamic routes', () => {
    const frontendCalls: FrontendCall[] = [
      {
        path: '/api/users/{id}',
        method: 'DELETE',
        file: 'app.tsx',
        line: 10,
        callType: 'fetch',
        confidence: 80
      }
    ];

    const serverRoutes: Array<RouteMetadata & { path: string }> = [
      {
        path: '/api/users/:id',
        methods: ['GET', 'PUT'],
        framework: 'express'
      }
    ];

    const issues = detectMethodMismatches(frontendCalls, serverRoutes);

    expect(issues).toHaveLength(1);
    expect(issues[0].frontendCall?.method).toBe('DELETE');
  });

  it('should handle case-insensitive method matching', () => {
    const frontendCalls: FrontendCall[] = [
      {
        path: '/api/users',
        method: 'get',
        file: 'app.tsx',
        line: 10,
        callType: 'fetch',
        confidence: 100
      }
    ];

    const serverRoutes: Array<RouteMetadata & { path: string }> = [
      {
        path: '/api/users',
        methods: ['GET'],
        framework: 'express'
      }
    ];

    const issues = detectMethodMismatches(frontendCalls, serverRoutes);

    expect(issues).toHaveLength(0);
  });

  it('should not report mismatch if no matching route exists', () => {
    const frontendCalls: FrontendCall[] = [
      {
        path: '/api/users',
        method: 'POST',
        file: 'app.tsx',
        line: 10,
        callType: 'fetch',
        confidence: 100
      }
    ];

    const serverRoutes: Array<RouteMetadata & { path: string }> = [
      {
        path: '/api/posts',
        methods: ['GET'],
        framework: 'express'
      }
    ];

    const issues = detectMethodMismatches(frontendCalls, serverRoutes);

    // Should be 0 because path doesn't match at all (covered by detectMissingRoutes)
    expect(issues).toHaveLength(0);
  });
});

describe('classifyIssue', () => {
  it('should classify missing_route as critical', () => {
    const issue = {
      type: 'missing_route' as const,
      severity: 'critical' as const,
      message: 'Test'
    };

    expect(classifyIssue(issue)).toBe('critical');
  });

  it('should classify method_mismatch as critical', () => {
    const issue = {
      type: 'method_mismatch' as const,
      severity: 'critical' as const,
      message: 'Test'
    };

    expect(classifyIssue(issue)).toBe('critical');
  });

  it('should classify unused_route as warning', () => {
    const issue = {
      type: 'unused_route' as const,
      severity: 'warning' as const,
      message: 'Test'
    };

    expect(classifyIssue(issue)).toBe('warning');
  });

  it('should classify path_mismatch as info', () => {
    const issue = {
      type: 'path_mismatch' as const,
      severity: 'info' as const,
      message: 'Test'
    };

    expect(classifyIssue(issue)).toBe('info');
  });
});

// ============================================================================
// WO-MIGRATION-VALIDATION-001: Migration Validation Tests
// ============================================================================

describe('Migration Validation - Integration Tests', () => {
  describe('calculateMigrationCoverage', () => {
    it('should calculate 100% coverage when all routes are migrated', () => {
      const oldRoutes = [
        { path: '/api/v1/users' },
        { path: '/api/v1/posts' }
      ];

      const newRoutes = [
        { path: '/api/v2/users' },
        { path: '/api/v2/posts' }
      ];

      const transformations = [
        { confidence: 100 },
        { confidence: 80 }
      ];

      const coverage = calculateMigrationCoverage(oldRoutes, newRoutes, transformations);

      expect(coverage.totalOldRoutes).toBe(2);
      expect(coverage.totalNewRoutes).toBe(2);
      expect(coverage.migratedRoutes).toBe(2);
      expect(coverage.coverage).toBe(100);
    });

    it('should calculate 50% coverage when half of routes are migrated', () => {
      const oldRoutes = [
        { path: '/api/v1/users' },
        { path: '/api/v1/posts' },
        { path: '/api/v1/comments' },
        { path: '/api/v1/likes' }
      ];

      const newRoutes = [
        { path: '/api/v2/users' },
        { path: '/api/v2/posts' }
      ];

      const transformations = [
        { confidence: 100 },
        { confidence: 80 },
        { confidence: 0 },
        { confidence: 0 }
      ];

      const coverage = calculateMigrationCoverage(oldRoutes, newRoutes, transformations);

      expect(coverage.totalOldRoutes).toBe(4);
      expect(coverage.totalNewRoutes).toBe(2);
      expect(coverage.migratedRoutes).toBe(2);
      expect(coverage.coverage).toBe(50);
    });

    it('should count newly added routes', () => {
      const oldRoutes = [
        { path: '/api/v1/users' }
      ];

      const newRoutes = [
        { path: '/api/v2/users' },
        { path: '/api/v2/webhooks' },
        { path: '/api/v2/health' }
      ];

      const transformations = [
        { confidence: 100 }
      ];

      const coverage = calculateMigrationCoverage(oldRoutes, newRoutes, transformations);

      expect(coverage.totalNewRoutes).toBe(3);
      expect(coverage.newlyAddedRoutes).toBe(3); // All 3 routes are new (different paths from old)
    });

    it('should handle 0% coverage when no routes are migrated', () => {
      const oldRoutes = [
        { path: '/api/v1/users' },
        { path: '/api/v1/posts' }
      ];

      const newRoutes = [
        { path: '/api/v2/other' }
      ];

      const transformations = [
        { confidence: 0 },
        { confidence: 0 }
      ];

      const coverage = calculateMigrationCoverage(oldRoutes, newRoutes, transformations);

      expect(coverage.coverage).toBe(0);
      expect(coverage.migratedRoutes).toBe(0);
    });

    it('should handle empty old routes (100% coverage)', () => {
      const oldRoutes: Array<{ path: string }> = [];
      const newRoutes = [{ path: '/api/v2/users' }];
      const transformations: Array<{ confidence: number }> = [];

      const coverage = calculateMigrationCoverage(oldRoutes, newRoutes, transformations);

      expect(coverage.coverage).toBe(100);
      expect(coverage.totalOldRoutes).toBe(0);
    });
  });

  describe('findUnmappedCalls', () => {
    it('should find frontend calls with no mapping', () => {
      const calls = [
        { path: '/api/v1/users', method: 'GET' },
        { path: '/api/v1/posts', method: 'GET' },
        { path: '/api/v1/legacy', method: 'GET' }
      ];

      const transformations = [
        { confidence: 100, mappingRule: 'explicit' },
        { confidence: 80, mappingRule: 'pattern' },
        { confidence: 0, mappingRule: 'unmapped' }
      ];

      const unmapped = findUnmappedCalls(calls, transformations);

      expect(unmapped).toHaveLength(1);
      expect(unmapped[0].path).toBe('/api/v1/legacy');
    });

    it('should return empty array when all calls are mapped', () => {
      const calls = [
        { path: '/api/v1/users', method: 'GET' },
        { path: '/api/v1/posts', method: 'GET' }
      ];

      const transformations = [
        { confidence: 100, mappingRule: 'explicit' },
        { confidence: 80, mappingRule: 'pattern' }
      ];

      const unmapped = findUnmappedCalls(calls, transformations);

      expect(unmapped).toHaveLength(0);
    });
  });

  describe('groupCoverageByApiPrefix', () => {
    it('should group coverage by API prefix', () => {
      const transformations = [
        { originalPath: '/api/users/list', confidence: 100 },
        { originalPath: '/api/users/profile', confidence: 80 },
        { originalPath: '/api/posts/create', confidence: 100 },
        { originalPath: '/api/posts/delete', confidence: 0 }
      ];

      const grouped = groupCoverageByApiPrefix(transformations);

      expect(grouped['/api/users'].total).toBe(2);
      expect(grouped['/api/users'].migrated).toBe(2);
      expect(grouped['/api/users'].coverage).toBe(100);

      expect(grouped['/api/posts'].total).toBe(2);
      expect(grouped['/api/posts'].migrated).toBe(1);
      expect(grouped['/api/posts'].coverage).toBe(50);
    });

    it('should handle single-segment paths', () => {
      const transformations = [
        { originalPath: '/health', confidence: 100 }
      ];

      const grouped = groupCoverageByApiPrefix(transformations);

      expect(grouped['/health'].total).toBe(1);
      expect(grouped['/health'].migrated).toBe(1);
    });

    it('should handle empty transformations', () => {
      const transformations: Array<{ originalPath: string; confidence: number }> = [];

      const grouped = groupCoverageByApiPrefix(transformations);

      expect(Object.keys(grouped)).toHaveLength(0);
    });
  });
});

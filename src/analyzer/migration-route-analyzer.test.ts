/**
 * IMP-CORE-039: Migration Route Analyzer Tests
 *
 * Test suite for unified route metadata extraction.
 */

import { describe, it, expect } from 'vitest';
import {
  MigrationRouteAnalyzer,
  MigrationRouteElement,
  extractAllRoutes,
  findOrphanedCalls,
  detectBreakingChanges
} from './migration-route-analyzer.js';
import { ElementData, RouteMetadata, FrontendCall } from '../types/types.js';

describe('MigrationRouteAnalyzer', () => {
  describe('extractAllRoutes', () => {
    it('should extract routes from elements with route metadata', () => {
      const elements: ElementData[] = [
        {
          type: 'function',
          name: 'getUsers',
          file: '/project/app.py',
          line: 10,
          route: {
            path: '/users',
            methods: ['GET'],
            framework: 'flask'
          }
        },
        {
          type: 'function',
          name: 'createUser',
          file: '/project/app.py',
          line: 20,
          route: {
            path: '/users',
            methods: ['POST'],
            framework: 'flask',
            blueprint: 'api_bp'
          }
        },
        {
          type: 'function',
          name: 'helperFunction',
          file: '/project/utils.py',
          line: 5
          // No route metadata
        }
      ];

      const routes = extractAllRoutes(elements);

      expect(routes).toHaveLength(2);
      expect(routes[0].name).toBe('getUsers');
      expect(routes[0].route.path).toBe('/users');
      expect(routes[1].route.blueprint).toBe('api_bp');
    });

    it('should handle empty elements array', () => {
      const routes = extractAllRoutes([]);
      expect(routes).toHaveLength(0);
    });

    it('should preserve exported flag', () => {
      const elements: ElementData[] = [
        {
          type: 'function',
          name: 'exportedRoute',
          file: '/project/app.ts',
          line: 1,
          exported: true,
          route: {
            path: '/api/data',
            methods: ['GET'],
            framework: 'express'
          }
        }
      ];

      const routes = extractAllRoutes(elements);
      expect(routes[0].exported).toBe(true);
    });
  });

  describe('findRoutesByFramework', () => {
    it('should filter routes by framework', () => {
      const elements: ElementData[] = [
        {
          type: 'function',
          name: 'flaskRoute',
          file: '/project/app.py',
          line: 1,
          route: { path: '/users', methods: ['GET'], framework: 'flask' }
        },
        {
          type: 'function',
          name: 'expressRoute',
          file: '/project/server.js',
          line: 1,
          route: { path: '/api/data', methods: ['GET'], framework: 'express' }
        },
        {
          type: 'function',
          name: 'fastapiRoute',
          file: '/project/main.py',
          line: 1,
          route: { path: '/items', methods: ['GET'], framework: 'fastapi' }
        }
      ];

      const analyzer = new MigrationRouteAnalyzer(elements);
      const flaskRoutes = analyzer.findRoutesByFramework('flask');
      const expressRoutes = analyzer.findRoutesByFramework('express');

      expect(flaskRoutes).toHaveLength(1);
      expect(flaskRoutes[0].name).toBe('flaskRoute');
      expect(expressRoutes).toHaveLength(1);
      expect(expressRoutes[0].name).toBe('expressRoute');
    });

    it('should return empty array for non-existent framework', () => {
      const elements: ElementData[] = [
        {
          type: 'function',
          name: 'flaskRoute',
          file: '/project/app.py',
          line: 1,
          route: { path: '/users', methods: ['GET'], framework: 'flask' }
        }
      ];

      const analyzer = new MigrationRouteAnalyzer(elements);
      const routes = analyzer.findRoutesByFramework('nextjs');

      expect(routes).toHaveLength(0);
    });
  });

  describe('getFrameworkStats', () => {
    it('should calculate framework statistics', () => {
      const elements: ElementData[] = [
        {
          type: 'function',
          name: 'route1',
          file: '/project/app.py',
          line: 1,
          route: { path: '/users', methods: ['GET', 'POST'], framework: 'flask' }
        },
        {
          type: 'function',
          name: 'route2',
          file: '/project/app.py',
          line: 10,
          route: { path: '/items', methods: ['GET'], framework: 'flask', blueprint: 'api_bp' }
        },
        {
          type: 'function',
          name: 'route3',
          file: '/project/server.js',
          line: 1,
          route: { path: '/api/users', methods: ['GET'], framework: 'express' }
        }
      ];

      const analyzer = new MigrationRouteAnalyzer(elements);
      const stats = analyzer.getFrameworkStats();

      expect(stats.flask.total).toBe(2);
      expect(stats.flask.byMethod.GET).toBe(2);
      expect(stats.flask.byMethod.POST).toBe(1);
      expect(stats.flask.blueprints).toContain('api_bp');
      expect(stats.express.total).toBe(1);
    });
  });

  describe('findOrphanedCalls', () => {
    it('should detect orphaned frontend calls', () => {
      const elements: ElementData[] = [
        {
          type: 'function',
          name: 'getUsers',
          file: '/project/app.py',
          line: 1,
          route: { path: '/api/users', methods: ['GET'], framework: 'express' }
        }
      ];

      const frontendCalls: FrontendCall[] = [
        {
          path: '/api/users',
          method: 'GET',
          file: '/project/frontend/app.tsx',
          line: 10,
          callType: 'fetch',
          confidence: 100
        },
        {
          path: '/api/nonexistent',
          method: 'POST',
          file: '/project/frontend/app.tsx',
          line: 20,
          callType: 'fetch',
          confidence: 100
        }
      ];

      const analyzer = new MigrationRouteAnalyzer(elements);
      const orphaned = analyzer.findOrphanedCalls(frontendCalls);

      expect(orphaned).toHaveLength(1);
      expect(orphaned[0].call.path).toBe('/api/nonexistent');
      expect(orphaned[0].reason).toBe('no_matching_route');
    });

    it('should detect method mismatch', () => {
      const elements: ElementData[] = [
        {
          type: 'function',
          name: 'getUsers',
          file: '/project/app.py',
          line: 1,
          route: { path: '/api/users', methods: ['GET'], framework: 'express' }
        }
      ];

      const frontendCalls: FrontendCall[] = [
        {
          path: '/api/users',
          method: 'POST',
          file: '/project/frontend/app.tsx',
          line: 10,
          callType: 'fetch',
          confidence: 100
        }
      ];

      const analyzer = new MigrationRouteAnalyzer(elements);
      const orphaned = analyzer.findOrphanedCalls(frontendCalls);

      expect(orphaned).toHaveLength(1);
      expect(orphaned[0].reason).toBe('method_mismatch');
      expect(orphaned[0].suggestions).toBeDefined();
    });
  });

  describe('detectBreakingChanges', () => {
    it('should detect removed methods', () => {
      const oldRoutes: MigrationRouteElement[] = [
        {
          name: 'route1',
          file: '/project/app.py',
          line: 1,
          route: { path: '/users', methods: ['GET', 'POST'], framework: 'flask' }
        }
      ];

      const newRoutes: MigrationRouteElement[] = [
        {
          name: 'route1',
          file: '/project/app.py',
          line: 1,
          route: { path: '/users', methods: ['GET'], framework: 'flask' }
        }
      ];

      const analyzer = new MigrationRouteAnalyzer([]);
      const changes = analyzer.detectBreakingChanges(oldRoutes, newRoutes);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('method_removed');
      expect(changes[0].method).toBe('POST');
      expect(changes[0].impact).toBe('high');
    });

    it('should detect path changes', () => {
      const oldRoutes: MigrationRouteElement[] = [
        {
          name: 'route1',
          file: '/project/app.py',
          line: 1,
          route: { path: '/old-path', methods: ['GET'], framework: 'flask' }
        }
      ];

      const newRoutes: MigrationRouteElement[] = [
        // Route completely removed
      ];

      const analyzer = new MigrationRouteAnalyzer([]);
      const changes = analyzer.detectBreakingChanges(oldRoutes, newRoutes);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('path_changed');
      expect(changes[0].oldValue).toBe('/old-path');
      expect(changes[0].newValue).toBe('REMOVED');
    });

    it('should detect path migrations with same segment count', () => {
      const oldRoutes: MigrationRouteElement[] = [
        {
          name: 'route1',
          file: '/project/app.py',
          line: 1,
          route: { path: '/old-users', methods: ['GET'], framework: 'flask' }
        }
      ];

      const newRoutes: MigrationRouteElement[] = [
        {
          name: 'route1_new',
          file: '/project/app.py',
          line: 5,
          route: { path: '/new-users', methods: ['GET'], framework: 'flask' }
        }
      ];

      const analyzer = new MigrationRouteAnalyzer([]);
      const changes = analyzer.detectBreakingChanges(oldRoutes, newRoutes);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('path_changed');
      expect(changes[0].newValue).toBe('/new-users');
      expect(changes[0].impact).toBe('medium');
    });
  });

  describe('exportForMigration', () => {
    it('should export structured migration data', () => {
      const elements: ElementData[] = [
        {
          type: 'function',
          name: 'route1',
          file: '/project/app.py',
          line: 1,
          route: { path: '/users', methods: ['GET'], framework: 'flask' }
        }
      ];

      const analyzer = new MigrationRouteAnalyzer(elements);
      const data = analyzer.exportForMigration();

      expect(data.routes).toHaveLength(1);
      expect(data.stats.flask.total).toBe(1);
      expect(data.byFramework.flask).toHaveLength(1);
    });
  });
});

describe('Convenience Functions', () => {
  describe('detectBreakingChanges (standalone)', () => {
    it('should work with elements directly', () => {
      const oldElements: ElementData[] = [
        {
          type: 'function',
          name: 'oldRoute',
          file: '/project/old.py',
          line: 1,
          route: { path: '/api/v1/users', methods: ['GET'], framework: 'flask' }
        }
      ];

      const newElements: ElementData[] = [
        {
          type: 'function',
          name: 'newRoute',
          file: '/project/new.py',
          line: 1,
          route: { path: '/api/v2/users', methods: ['GET'], framework: 'flask' }
        }
      ];

      const changes = detectBreakingChanges(oldElements, newElements);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('path_changed');
    });
  });

  describe('findOrphanedCalls (standalone)', () => {
    it('should work with elements and calls', () => {
      const elements: ElementData[] = [
        {
          type: 'function',
          name: 'route',
          file: '/project/app.py',
          line: 1,
          route: { path: '/api/data', methods: ['GET'], framework: 'express' }
        }
      ];

      const calls: FrontendCall[] = [
        {
          path: '/api/unknown',
          method: 'GET',
          file: '/project/app.tsx',
          line: 1,
          callType: 'fetch',
          confidence: 100
        }
      ];

      const orphaned = findOrphanedCalls(elements, calls);

      expect(orphaned).toHaveLength(1);
      expect(orphaned[0].call.path).toBe('/api/unknown');
    });
  });
});

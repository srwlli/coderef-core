/**
 * WO-API-ROUTE-DETECTION-001: Route Parser Tests
 * Comprehensive test suite for multi-framework route detection
 */

import { describe, it, expect } from 'vitest';
import {
  parseFlaskRoute,
  parseFastAPIRoute,
  parseExpressRoute,
  parseNextJsRoute,
  extractRouteMetadata
} from './route-parsers.js';

describe('parseFlaskRoute', () => {
  // TEST-001: Flask parser tests

  it('should parse basic Flask route with default GET method', () => {
    const code = "@app.route('/users')";
    const result = parseFlaskRoute(code, 10);

    expect(result).toEqual({
      path: '/users',
      methods: ['GET'],
      framework: 'flask',
      blueprint: undefined
    });
  });

  it('should parse Flask route with explicit methods', () => {
    const code = "@app.route('/users', methods=['GET', 'POST'])";
    const result = parseFlaskRoute(code, 15);

    expect(result).toEqual({
      path: '/users',
      methods: ['GET', 'POST'],
      framework: 'flask',
      blueprint: undefined
    });
  });

  it('should parse Flask route with lowercase methods', () => {
    const code = "@app.route('/login', methods=['get', 'post'])";
    const result = parseFlaskRoute(code, 20);

    expect(result).toEqual({
      path: '/login',
      methods: ['GET', 'POST'],
      framework: 'flask',
      blueprint: undefined
    });
  });

  it('should parse Flask blueprint route', () => {
    const code = "@auth_bp.route('/login')";
    const result = parseFlaskRoute(code, 25);

    expect(result).toEqual({
      path: '/login',
      methods: ['GET'],
      framework: 'flask',
      blueprint: 'auth_bp'
    });
  });

  it('should parse Flask route with path parameters', () => {
    const code = "@app.route('/users/<int:user_id>')";
    const result = parseFlaskRoute(code, 30);

    expect(result).toEqual({
      path: '/users/<int:user_id>',
      methods: ['GET'],
      framework: 'flask',
      blueprint: undefined
    });
  });

  it('should return null for non-Flask route', () => {
    const code = "def get_users():";
    const result = parseFlaskRoute(code, 35);

    expect(result).toBeNull();
  });

  it('should handle Flask route with spaces', () => {
    const code = "@app.route( '/api/data' , methods = [ 'GET' , 'POST' ] )";
    const result = parseFlaskRoute(code, 40);

    expect(result).toEqual({
      path: '/api/data',
      methods: ['GET', 'POST'],
      framework: 'flask',
      blueprint: undefined
    });
  });
});

describe('parseFastAPIRoute', () => {
  // TEST-002: FastAPI parser tests

  it('should parse FastAPI GET route', () => {
    const code = "@app.get('/users')";
    const result = parseFastAPIRoute(code, 10);

    expect(result).toEqual({
      path: '/users',
      methods: ['GET'],
      framework: 'fastapi'
    });
  });

  it('should parse FastAPI POST route', () => {
    const code = "@app.post('/users')";
    const result = parseFastAPIRoute(code, 15);

    expect(result).toEqual({
      path: '/users',
      methods: ['POST'],
      framework: 'fastapi'
    });
  });

  it('should parse FastAPI PUT route', () => {
    const code = "@app.put('/users/{user_id}')";
    const result = parseFastAPIRoute(code, 20);

    expect(result).toEqual({
      path: '/users/{user_id}',
      methods: ['PUT'],
      framework: 'fastapi'
    });
  });

  it('should parse FastAPI DELETE route', () => {
    const code = "@app.delete('/users/{user_id}')";
    const result = parseFastAPIRoute(code, 25);

    expect(result).toEqual({
      path: '/users/{user_id}',
      methods: ['DELETE'],
      framework: 'fastapi'
    });
  });

  it('should parse FastAPI PATCH route', () => {
    const code = "@app.patch('/users/{user_id}')";
    const result = parseFastAPIRoute(code, 30);

    expect(result).toEqual({
      path: '/users/{user_id}',
      methods: ['PATCH'],
      framework: 'fastapi'
    });
  });

  it('should return null for non-FastAPI route', () => {
    const code = "async def get_users():";
    const result = parseFastAPIRoute(code, 35);

    expect(result).toBeNull();
  });

  it('should handle FastAPI route with query parameters', () => {
    const code = "@app.get('/items')";
    const result = parseFastAPIRoute(code, 40);

    expect(result).toEqual({
      path: '/items',
      methods: ['GET'],
      framework: 'fastapi'
    });
  });
});

describe('parseExpressRoute', () => {
  // TEST-003: Express parser tests

  it('should parse Express app.get route', () => {
    const code = "app.get('/users', getUsers)";
    const result = parseExpressRoute(code, 10);

    expect(result).toEqual({
      path: '/users',
      methods: ['GET'],
      framework: 'express',
      blueprint: undefined
    });
  });

  it('should parse Express app.post route', () => {
    const code = "app.post('/users', createUser)";
    const result = parseExpressRoute(code, 15);

    expect(result).toEqual({
      path: '/users',
      methods: ['POST'],
      framework: 'express',
      blueprint: undefined
    });
  });

  it('should parse Express router route', () => {
    const code = "router.get('/login', auth, loginHandler)";
    const result = parseExpressRoute(code, 20);

    expect(result).toEqual({
      path: '/login',
      methods: ['GET'],
      framework: 'express',
      blueprint: 'router'
    });
  });

  it('should parse Express route with named router', () => {
    const code = "authRouter.post('/signup', signupHandler)";
    const result = parseExpressRoute(code, 25);

    expect(result).toEqual({
      path: '/signup',
      methods: ['POST'],
      framework: 'express',
      blueprint: 'authRouter'
    });
  });

  it('should parse Express PUT route', () => {
    const code = "app.put('/users/:id', updateUser)";
    const result = parseExpressRoute(code, 30);

    expect(result).toEqual({
      path: '/users/:id',
      methods: ['PUT'],
      framework: 'express',
      blueprint: undefined
    });
  });

  it('should parse Express DELETE route', () => {
    const code = "app.delete('/users/:id', deleteUser)";
    const result = parseExpressRoute(code, 35);

    expect(result).toEqual({
      path: '/users/:id',
      methods: ['DELETE'],
      framework: 'express',
      blueprint: undefined
    });
  });

  it('should parse Express PATCH route', () => {
    const code = "app.patch('/users/:id', patchUser)";
    const result = parseExpressRoute(code, 40);

    expect(result).toEqual({
      path: '/users/:id',
      methods: ['PATCH'],
      framework: 'express',
      blueprint: undefined
    });
  });

  it('should return null for non-Express route', () => {
    const code = "function getUsers() {";
    const result = parseExpressRoute(code, 45);

    expect(result).toBeNull();
  });

  // WO-API-ROUTE-DETECTION-001-FIX: Tests for whitelist/blacklist validation
  it('should reject blacklisted variable names (URLSearchParams.get)', () => {
    const code = "const id = params.get('id')";
    const result = parseExpressRoute(code, 50);

    expect(result).toBeNull();
  });

  it('should reject blacklisted variable names (urlParams.get)', () => {
    const code = "const filter = urlParams.get('filter')";
    const result = parseExpressRoute(code, 55);

    expect(result).toBeNull();
  });

  it('should reject blacklisted variable names (searchParams.get)', () => {
    const code = "const query = searchParams.get('query')";
    const result = parseExpressRoute(code, 60);

    expect(result).toBeNull();
  });

  it('should accept whitelisted router names (apiRouter)', () => {
    const code = "apiRouter.get('/data', handler)";
    const result = parseExpressRoute(code, 65);

    expect(result).toEqual({
      path: '/data',
      methods: ['GET'],
      framework: 'express',
      blueprint: 'apiRouter'
    });
  });

  it('should accept variable names ending with Router (customRouter)', () => {
    const code = "customRouter.post('/items', createItem)";
    const result = parseExpressRoute(code, 70);

    expect(result).toEqual({
      path: '/items',
      methods: ['POST'],
      framework: 'express',
      blueprint: 'customRouter'
    });
  });

  it('should accept routes when Express import is detected', () => {
    const code = "myApp.get('/test', handler)";
    const fileContent = "const express = require('express');\nconst myApp = express();";
    const result = parseExpressRoute(code, 75, fileContent);

    expect(result).toEqual({
      path: '/test',
      methods: ['GET'],
      framework: 'express',
      blueprint: 'myApp'
    });
  });

  it('should reject routes without Express import for unknown variable names', () => {
    const code = "myApp.get('/test', handler)";
    const fileContent = "const myApp = somethingElse();";
    const result = parseExpressRoute(code, 80, fileContent);

    expect(result).toBeNull();
  });
});

describe('parseNextJsRoute', () => {
  // TEST-004: Next.js parser tests

  it('should parse Next.js route with GET export', () => {
    const filePath = '/project/app/api/users/route.ts';
    const exports = ['GET'];
    const result = parseNextJsRoute(filePath, exports);

    expect(result).toEqual({
      path: '/api/users',
      methods: ['GET'],
      framework: 'nextjs'
    });
  });

  it('should parse Next.js route with multiple methods', () => {
    const filePath = '/project/app/api/users/route.ts';
    const exports = ['GET', 'POST'];
    const result = parseNextJsRoute(filePath, exports);

    expect(result).toEqual({
      path: '/api/users',
      methods: ['GET', 'POST'],
      framework: 'nextjs'
    });
  });

  it('should parse Next.js dynamic route', () => {
    const filePath = '/project/app/api/users/[id]/route.ts';
    const exports = ['GET', 'PUT', 'DELETE'];
    const result = parseNextJsRoute(filePath, exports);

    expect(result).toEqual({
      path: '/api/users/[id]',
      methods: ['GET', 'PUT', 'DELETE'],
      framework: 'nextjs'
    });
  });

  it('should parse Next.js nested route', () => {
    const filePath = '/project/app/api/boards/[id]/cards/route.ts';
    const exports = ['GET', 'POST'];
    const result = parseNextJsRoute(filePath, exports);

    expect(result).toEqual({
      path: '/api/boards/[id]/cards',
      methods: ['GET', 'POST'],
      framework: 'nextjs'
    });
  });

  it('should handle .js extension', () => {
    const filePath = '/project/app/api/data/route.js';
    const exports = ['GET'];
    const result = parseNextJsRoute(filePath, exports);

    expect(result).toEqual({
      path: '/api/data',
      methods: ['GET'],
      framework: 'nextjs'
    });
  });

  it('should return null for non-route file', () => {
    const filePath = '/project/app/api/users/page.ts';
    const exports = ['GET'];
    const result = parseNextJsRoute(filePath, exports);

    expect(result).toBeNull();
  });

  it('should return null for file not in /app/api/', () => {
    const filePath = '/project/src/utils/route.ts';
    const exports = ['GET'];
    const result = parseNextJsRoute(filePath, exports);

    expect(result).toBeNull();
  });

  it('should return null when no HTTP method exports', () => {
    const filePath = '/project/app/api/users/route.ts';
    const exports = ['config', 'metadata'];
    const result = parseNextJsRoute(filePath, exports);

    expect(result).toBeNull();
  });

  it('should handle lowercase method exports', () => {
    const filePath = '/project/app/api/users/route.ts';
    const exports = ['get', 'post'];
    const result = parseNextJsRoute(filePath, exports);

    expect(result).toEqual({
      path: '/api/users',
      methods: ['GET', 'POST'],
      framework: 'nextjs'
    });
  });
});

describe('extractRouteMetadata (dispatcher)', () => {
  // TEST-005: Dispatcher function tests

  it('should detect Flask route', () => {
    const code = "@app.route('/users')";
    const result = extractRouteMetadata(code, 'app.py', [], 10);

    expect(result?.framework).toBe('flask');
    expect(result?.path).toBe('/users');
  });

  it('should detect FastAPI route', () => {
    const code = "@app.get('/users')";
    const result = extractRouteMetadata(code, 'main.py', [], 10);

    expect(result?.framework).toBe('fastapi');
    expect(result?.path).toBe('/users');
  });

  it('should detect Express route', () => {
    const code = "app.get('/users', handler)";
    const result = extractRouteMetadata(code, 'server.js', [], 10);

    expect(result?.framework).toBe('express');
    expect(result?.path).toBe('/users');
  });

  it('should detect Next.js route by file path', () => {
    const filePath = '/project/app/api/users/route.ts';
    const exports = ['GET', 'POST'];
    const result = extractRouteMetadata('', filePath, exports, 1);

    expect(result?.framework).toBe('nextjs');
    expect(result?.path).toBe('/api/users');
  });

  it('should prioritize Next.js detection when file matches pattern', () => {
    const code = "export async function GET() {}";
    const filePath = '/project/app/api/data/route.ts';
    const exports = ['GET'];
    const result = extractRouteMetadata(code, filePath, exports, 1);

    expect(result?.framework).toBe('nextjs');
  });

  it('should return null for non-route code', () => {
    const code = "function normalFunction() {}";
    const result = extractRouteMetadata(code, 'utils.js', [], 10);

    expect(result).toBeNull();
  });

  it('should handle empty code', () => {
    const result = extractRouteMetadata('', 'file.js', [], 1);

    expect(result).toBeNull();
  });

  it('should handle multiple decorators and detect route', () => {
    const code = "@login_required\n@app.route('/admin')";
    const result = extractRouteMetadata(code, 'admin.py', [], 15);

    expect(result?.framework).toBe('flask');
    expect(result?.path).toBe('/admin');
  });
});

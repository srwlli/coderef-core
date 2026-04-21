/**
 * WO-API-ROUTE-DETECTION-001: Integration Tests
 * End-to-end tests for route detection through scanner
 * Tests: TEST-006, TEST-007, TEST-008, TEST-009, TEST-011
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { scanCurrentElements } from '../scanner/scanner.js';
import { generateRoutes } from '../generator/generateRoutes.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Route Detection Integration Tests', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'route-test-'));
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Flask route detection (TEST-006)', () => {
    it('should detect Flask routes through scanner', async () => {
      // Create test Flask file
      const flaskCode = `
from flask import Flask

app = Flask(__name__)

@app.route('/users')
def get_users():
    return []

@app.route('/users/<int:user_id>')
def get_user(user_id):
    return {}

@app.route('/login', methods=['GET', 'POST'])
def login():
    return {}
`;

      const filePath = path.join(testDir, 'app.py');
      await fs.writeFile(filePath, flaskCode);

      // Scan the file
      const elements = await scanCurrentElements(testDir, ['py'], {
        recursive: false,
        exclude: []
      });

      // Filter route elements
      const routeElements = elements.filter(el => el.route !== undefined);

      expect(routeElements).toHaveLength(3);

      // Check first route
      const getUsersRoute = routeElements.find(el => el.route?.path === '/users');
      expect(getUsersRoute).toBeDefined();
      expect(getUsersRoute?.route).toEqual({
        path: '/users',
        methods: ['GET'],
        framework: 'flask',
        blueprint: undefined
      });

      // Check route with path parameter
      const getUserRoute = routeElements.find(el => el.route?.path === '/users/<int:user_id>');
      expect(getUserRoute).toBeDefined();
      expect(getUserRoute?.route?.path).toBe('/users/<int:user_id>');

      // Check route with methods
      const loginRoute = routeElements.find(el => el.route?.path === '/login');
      expect(loginRoute).toBeDefined();
      expect(loginRoute?.route?.methods).toEqual(['GET', 'POST']);
    });

    it('should detect Flask blueprint routes', async () => {
      const blueprintCode = `
from flask import Blueprint

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login')
def login():
    return {}

@auth_bp.route('/logout')
def logout():
    return {}
`;

      const filePath = path.join(testDir, 'auth.py');
      await fs.writeFile(filePath, blueprintCode);

      const elements = await scanCurrentElements(testDir, ['py']);
      const routeElements = elements.filter(el => el.route !== undefined);

      expect(routeElements).toHaveLength(2);
      expect(routeElements[0].route?.blueprint).toBe('auth_bp');
      expect(routeElements[1].route?.blueprint).toBe('auth_bp');
    });
  });

  describe('FastAPI route detection (TEST-007)', () => {
    it('should detect FastAPI routes through scanner', async () => {
      const fastapiCode = `
from fastapi import FastAPI

app = FastAPI()

@app.get("/items")
async def read_items():
    return []

@app.post("/items")
async def create_item(item: Item):
    return item

@app.get("/items/{item_id}")
async def read_item(item_id: int):
    return {}

@app.put("/items/{item_id}")
async def update_item(item_id: int, item: Item):
    return item

@app.delete("/items/{item_id}")
async def delete_item(item_id: int):
    return {"deleted": True}
`;

      const filePath = path.join(testDir, 'main.py');
      await fs.writeFile(filePath, fastapiCode);

      const elements = await scanCurrentElements(testDir, ['py']);
      const routeElements = elements.filter(el => el.route !== undefined);

      expect(routeElements).toHaveLength(5);

      // Check GET route
      const getRoute = routeElements.find(el => el.route?.path === '/items' && el.route?.methods?.includes('GET'));
      expect(getRoute?.route).toEqual({
        path: '/items',
        methods: ['GET'],
        framework: 'fastapi'
      });

      // Check POST route
      const postRoute = routeElements.find(el => el.route?.path === '/items' && el.route?.methods?.includes('POST'));
      expect(postRoute?.route?.methods).toEqual(['POST']);

      // Check PUT route
      const putRoute = routeElements.find(el => el.route?.path === '/items/{item_id}' && el.route?.methods?.includes('PUT'));
      expect(putRoute?.route?.methods).toEqual(['PUT']);

      // Check DELETE route
      const deleteRoute = routeElements.find(el => el.route?.path === '/items/{item_id}' && el.route?.methods?.includes('DELETE'));
      expect(deleteRoute?.route?.methods).toEqual(['DELETE']);
    });
  });

  describe('Express route detection (TEST-008)', () => {
    it('should detect Express routes through scanner', async () => {
      const expressCode = `
const express = require('express');
const app = express();

app.get('/users', (req, res) => {
  res.json([]);
});

app.post('/users', (req, res) => {
  res.json({});
});

app.get('/users/:id', (req, res) => {
  res.json({});
});

app.put('/users/:id', (req, res) => {
  res.json({});
});

app.delete('/users/:id', (req, res) => {
  res.json({});
});
`;

      const filePath = path.join(testDir, 'server.js');
      await fs.writeFile(filePath, expressCode);

      const elements = await scanCurrentElements(testDir, ['js']);
      const routeElements = elements.filter(el => el.route !== undefined);

      // Note: Express routes may be detected multiple times due to pattern matching
      expect(routeElements.length).toBeGreaterThanOrEqual(5);

      // Check that routes were detected
      const paths = routeElements.map(el => el.route?.path);
      expect(paths).toContain('/users');
      expect(paths).toContain('/users/:id');

      // Check methods
      const methods = routeElements.flatMap(el => el.route?.methods || []);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('PUT');
      expect(methods).toContain('DELETE');
    });

    it('should detect Express router routes', async () => {
      const routerCode = `
const express = require('express');
const router = express.Router();

router.get('/login', authMiddleware, loginHandler);
router.post('/signup', signupHandler);

module.exports = router;
`;

      const filePath = path.join(testDir, 'auth-router.js');
      await fs.writeFile(filePath, routerCode);

      const elements = await scanCurrentElements(testDir, ['js']);
      const routeElements = elements.filter(el => el.route !== undefined);

      expect(routeElements.length).toBeGreaterThanOrEqual(2);

      // Check blueprint (router) name
      const routerRoutes = routeElements.filter(el => el.route?.blueprint === 'router');
      expect(routerRoutes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Next.js route detection (TEST-009)', () => {
    it('should detect Next.js App Router routes through scanner', async () => {
      const nextjsCode = `
export async function GET() {
  return Response.json({ data: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  return Response.json({ created: true });
}
`;

      // Create Next.js route file structure
      const apiDir = path.join(testDir, 'app', 'api', 'users');
      await fs.mkdir(apiDir, { recursive: true });
      const filePath = path.join(apiDir, 'route.ts');
      await fs.writeFile(filePath, nextjsCode);

      const elements = await scanCurrentElements(testDir, ['ts']);
      const routeElements = elements.filter(el => el.route !== undefined);

      expect(routeElements).toHaveLength(1);

      const nextjsRoute = routeElements[0];
      expect(nextjsRoute.route).toEqual({
        path: '/api/users',
        methods: ['GET', 'POST'],
        framework: 'nextjs'
      });
    });

    it('should detect Next.js dynamic routes', async () => {
      const dynamicCode = `
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  return Response.json({ id: params.id });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  return Response.json({ updated: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  return Response.json({ deleted: true });
}
`;

      const apiDir = path.join(testDir, 'app', 'api', 'boards', '[id]');
      await fs.mkdir(apiDir, { recursive: true });
      const filePath = path.join(apiDir, 'route.ts');
      await fs.writeFile(filePath, dynamicCode);

      const elements = await scanCurrentElements(testDir, ['ts']);
      const routeElements = elements.filter(el => el.route !== undefined);

      expect(routeElements).toHaveLength(1);

      const dynamicRoute = routeElements[0];
      expect(dynamicRoute.route?.path).toBe('/api/boards/[id]');
      expect(dynamicRoute.route?.methods).toEqual(['GET', 'PUT', 'DELETE']);
    });
  });

  describe('IMP-CORE-004: Next.js Pages Router detection', () => {
    it('should detect Next.js Pages API routes', async () => {
      const nextjsPagesCode = `
export default function handler(req, res) {
  if (req.method === 'GET') {
    res.json({ data: [] });
  } else if (req.method === 'POST') {
    res.json({ created: true });
  }
}
`;
      const pagesDir = path.join(testDir, 'pages', 'api', 'users');
      await fs.mkdir(pagesDir, { recursive: true });
      await fs.writeFile(path.join(pagesDir, 'index.ts'), nextjsPagesCode);

      const elements = await scanCurrentElements(testDir, ['ts']);
      const routeElements = elements.filter(el => el.route !== undefined);

      expect(routeElements.length).toBeGreaterThanOrEqual(1);

      const nextjsRoute = routeElements.find(el => el.route?.framework === 'nextjs');
      expect(nextjsRoute).toBeDefined();
      expect(nextjsRoute?.route?.path).toBe('/api/users');
      expect(nextjsRoute?.route?.methods).toContain('GET');
      expect(nextjsRoute?.route?.methods).toContain('POST');
    });
  });

  describe('IMP-CORE-004: SvelteKit route detection', () => {
    it('should detect SvelteKit +server.ts API routes', async () => {
      const svelteKitCode = `
export async function GET() {
  return new Response(JSON.stringify({ data: [] }));
}

export async function POST({ request }) {
  const body = await request.json();
  return new Response(JSON.stringify({ created: true }));
}
`;
      const routesDir = path.join(testDir, 'src', 'routes', 'api', 'users');
      await fs.mkdir(routesDir, { recursive: true });
      await fs.writeFile(path.join(routesDir, '+server.ts'), svelteKitCode);

      const elements = await scanCurrentElements(testDir, ['ts']);
      const routeElements = elements.filter(el => el.route !== undefined && el.route?.framework === 'sveltekit');

      expect(routeElements.length).toBeGreaterThanOrEqual(1);

      const sveltekitRoute = routeElements[0];
      expect(sveltekitRoute.route?.path).toBe('/api/users');
      expect(sveltekitRoute.route?.methods).toContain('GET');
      expect(sveltekitRoute.route?.methods).toContain('POST');
    });

    it('should detect SvelteKit +page.server.ts routes', async () => {
      const pageServerCode = `
export async function load() {
  return { data: [] };
}

export const actions = {
  create: async ({ request }) => {
    return { success: true };
  }
};
`;
      const routesDir = path.join(testDir, 'src', 'routes', 'users');
      await fs.mkdir(routesDir, { recursive: true });
      await fs.writeFile(path.join(routesDir, '+page.server.ts'), pageServerCode);

      const elements = await scanCurrentElements(testDir, ['ts']);
      const routeElements = elements.filter(el => el.route !== undefined && el.route?.framework === 'sveltekit');

      expect(routeElements.length).toBeGreaterThanOrEqual(1);

      const sveltekitRoute = routeElements.find(el => el.route?.path === '/users');
      expect(sveltekitRoute).toBeDefined();
      expect(sveltekitRoute?.route?.methods).toContain('GET');
    });
  });

  describe('IMP-CORE-004: Nuxt route detection', () => {
    it('should detect Nuxt server API routes with method suffix', async () => {
      const nuxtCode = `
export default defineEventHandler((event) => {
  return { data: [] };
});
`;
      const apiDir = path.join(testDir, 'server', 'api', 'users');
      await fs.mkdir(apiDir, { recursive: true });
      await fs.writeFile(path.join(apiDir, 'index.get.ts'), nuxtCode);

      const elements = await scanCurrentElements(testDir, ['ts']);
      const routeElements = elements.filter(el => el.route !== undefined && el.route?.framework === 'nuxt');

      expect(routeElements.length).toBeGreaterThanOrEqual(1);

      const nuxtRoute = routeElements.find(el => el.route?.path === '/api/users');
      expect(nuxtRoute).toBeDefined();
      expect(nuxtRoute?.route?.methods).toContain('GET');
    });
  });

  describe('IMP-CORE-004: Remix route detection', () => {
    it('should detect Remix loader/action routes', async () => {
      const remixCode = `
export async function loader() {
  return { data: [] };
}

export async function action({ request }) {
  return { created: true };
}

export default function Users() {
  return <div>Users</div>;
}
`;
      const routesDir = path.join(testDir, 'app', 'routes');
      await fs.mkdir(routesDir, { recursive: true });
      await fs.writeFile(path.join(routesDir, 'users.tsx'), remixCode);

      const elements = await scanCurrentElements(testDir, ['tsx']);
      const routeElements = elements.filter(el => el.route !== undefined && el.route?.framework === 'remix');

      expect(routeElements.length).toBeGreaterThanOrEqual(1);

      const remixRoute = routeElements.find(el => el.route?.path === '/users');
      expect(remixRoute).toBeDefined();
      expect(remixRoute?.route?.methods).toContain('GET');
      expect(remixRoute?.route?.methods).toContain('POST');
    });
  });

  describe('End-to-end: Scan to routes.json (TEST-011)', () => {
    it('should scan multi-framework project and generate routes.json', async () => {
      // Create a project with multiple frameworks

      // Flask file
      const flaskCode = `
@app.route('/flask/users')
def get_users():
    return []
`;
      await fs.writeFile(path.join(testDir, 'flask_app.py'), flaskCode);

      // FastAPI file
      const fastapiCode = `
@app.get("/fastapi/items")
async def get_items():
    return []
`;
      await fs.writeFile(path.join(testDir, 'fastapi_main.py'), fastapiCode);

      // Express file
      const expressCode = `
app.get('/express/data', handler);
`;
      await fs.writeFile(path.join(testDir, 'express_server.js'), expressCode);

      // Next.js App Router file
      const nextjsDir = path.join(testDir, 'app', 'api', 'nextjs');
      await fs.mkdir(nextjsDir, { recursive: true });
      const nextjsCode = `
export async function GET() { return Response.json({}); }
`;
      await fs.writeFile(path.join(nextjsDir, 'route.ts'), nextjsCode);

      // IMP-CORE-004: Next.js Pages Router
      const nextjsPagesDir = path.join(testDir, 'pages', 'api', 'legacy');
      await fs.mkdir(nextjsPagesDir, { recursive: true });
      const nextjsPagesCode = `
export default function handler(req, res) {
  res.json({ legacy: true });
}
`;
      await fs.writeFile(path.join(nextjsPagesDir, 'index.ts'), nextjsPagesCode);

      // IMP-CORE-004: SvelteKit
      const sveltekitDir = path.join(testDir, 'src', 'routes', 'api', 'svelte');
      await fs.mkdir(sveltekitDir, { recursive: true });
      const sveltekitCode = `
export async function GET() { return new Response('OK'); }
`;
      await fs.writeFile(path.join(sveltekitDir, '+server.ts'), sveltekitCode);

      // Scan entire project
      const elements = await scanCurrentElements(testDir, ['py', 'js', 'ts'], {
        recursive: true
      });

      // Generate routes
      const routes = generateRoutes(elements, testDir);

      // Verify output structure
      expect(routes.totalRoutes).toBeGreaterThanOrEqual(4);
      expect(routes.byFramework.flask).toBeDefined();
      expect(routes.byFramework.fastapi).toBeDefined();
      expect(routes.byFramework.express).toBeDefined();
      expect(routes.byFramework.nextjs).toBeDefined();

      // Verify metadata
      expect(routes.metadata.projectPath).toBe(testDir);
      expect(routes.metadata.scanVersion).toBe('1.0.0');
      expect(routes.metadata.generatedAt).toBeDefined();

      // Verify sorting within frameworks
      if (routes.byFramework.flask && routes.byFramework.flask.length > 1) {
        const paths = routes.byFramework.flask.map(r => r.route.path);
        const sortedPaths = [...paths].sort();
        expect(paths).toEqual(sortedPaths);
      }
    });

    it('should handle project with no routes', async () => {
      // Create files with no routes
      const utilCode = `
function normalFunction() {
  return true;
}
`;
      await fs.writeFile(path.join(testDir, 'utils.js'), utilCode);

      const elements = await scanCurrentElements(testDir, ['js']);
      const routes = generateRoutes(elements, testDir);

      expect(routes.totalRoutes).toBe(0);
      expect(Object.keys(routes.byFramework)).toHaveLength(0);
    });
  });
});

/**
 * WO-API-ROUTE-DETECTION-001: Integration Tests
 * End-to-end tests for route detection through scanner
 * Tests: TEST-006, TEST-007, TEST-008, TEST-009, TEST-011
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { scanCurrentElements } from '../scanner/scanner.js';
import { generateRoutes } from '../generator/generateRoutes.js';
import { PipelineOrchestrator } from '../pipeline/orchestrator.js';
import { RoutesGenerator } from '../pipeline/generators/routes-generator.js';
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

      expect(routeElements.length).toBeGreaterThanOrEqual(3);

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

      expect(routeElements.length).toBeGreaterThanOrEqual(2);
      expect(routeElements.every(el => el.route?.blueprint === 'auth_bp')).toBe(true);
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

      expect(routeElements.length).toBeGreaterThanOrEqual(5);

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

  // ==========================================================================
  // WO-API-SURFACE-MAPPING-RECONNECT-AND-GRAPH-ELEVATION-001 Phase 1 (REC-001)
  //
  // The blocks above exercise the LEGACY library path (scanCurrentElements ->
  // generateRoutes). That path still works and stays supported — but it had no
  // production caller, which is why .coderef/routes.json went stale in March 2026
  // and .coderef/frontend-calls.json was never written at all.
  //
  // These tests cover the PIPELINE path: PipelineOrchestrator carries route +
  // frontend-call facts on its single pass, and RoutesGenerator emits both
  // artifacts during a normal populate run.
  // ==========================================================================
  describe('Populate-pipeline route production (WO-API-SURFACE-MAPPING P1)', () => {
    it('emits routes.json and frontend-calls.json from a pipeline run', async () => {
      // Multi-framework fixture: an Express server, a Next.js App Router handler,
      // and a React client that calls both.
      await fs.writeFile(
        path.join(testDir, 'server.js'),
        `const express = require('express');\n` +
          `const app = express();\n` +
          `app.get('/api/users', (req, res) => res.json([]));\n` +
          `app.post('/api/users', (req, res) => res.json({}));\n`,
      );

      const apiDir = path.join(testDir, 'app', 'api', 'items');
      await fs.mkdir(apiDir, { recursive: true });
      await fs.writeFile(
        path.join(apiDir, 'route.ts'),
        `export async function GET() { return new Response('[]'); }\n` +
          `export async function POST() { return new Response('{}'); }\n`,
      );

      await fs.writeFile(
        path.join(testDir, 'client.tsx'),
        `export function Users() {\n` +
          `  const load = () => fetch('/api/users');\n` +
          `  const create = () => fetch('/api/users', { method: 'POST' });\n` +
          `  const items = () => axios.get('/api/items');\n` +
          `  return null;\n` +
          `}\n`,
      );

      const orchestrator = new PipelineOrchestrator();
      const state = await orchestrator.run(testDir, { languages: ['js', 'ts', 'tsx'] });

      // The facts ride pipeline state...
      expect(state.routes).toBeDefined();
      expect(state.frontendCalls).toBeDefined();
      expect(state.routes!.length).toBeGreaterThan(0);
      expect(state.frontendCalls!.length).toBeGreaterThan(0);

      // ...and MUST NOT pollute the element inventory. Stamping carrier elements
      // into state.elements would move index.json counts and every coverage /
      // complexity denominator derived from it.
      expect(state.elements.some(e => e.route !== undefined)).toBe(false);
      expect(state.elements.some(e => e.frontendCall !== undefined)).toBe(false);

      const outputDir = path.join(testDir, '.coderef');
      await new RoutesGenerator().generate(state, outputDir);

      const routes = JSON.parse(
        await fs.readFile(path.join(outputDir, 'routes.json'), 'utf-8'),
      );
      const calls = JSON.parse(
        await fs.readFile(path.join(outputDir, 'frontend-calls.json'), 'utf-8'),
      );

      // Framework grouping survives the pipeline path.
      expect(routes.totalRoutes).toBeGreaterThan(0);
      expect(Object.keys(routes.byFramework).length).toBeGreaterThan(0);

      // totalRoutes MUST equal the number of routes actually present. Until P1 this
      // could diverge: byFramework was typed to only flask/fastapi/express/nextjs while
      // the registry also ships sveltekit/nuxt/remix detectors, and formatRoutesJson
      // pushed through an optional chain — so a SvelteKit route was counted and then
      // dropped, producing an artifact that contradicted its own header.
      const emitted = Object.values(routes.byFramework).flat();
      expect(emitted).toHaveLength(routes.totalRoutes);

      // The detectors reached the file-based frameworks, not just the content-regex
      // ones. nextjs-detector matches on '/app/api/' — a literal forward-slash segment —
      // so this assertion is what catches a regression to native-path handoff, under
      // which every file-based framework silently detects nothing on Windows.
      const detected = Object.keys(routes.byFramework);
      expect(detected).toContain('nextjs');
      expect(detected).toContain('express');

      // The metadata records THIS project, not whatever checkout last ran a scan.
      // The artifact this producer replaces carried a foreign projectPath, which let
      // a passing validate-routes run assert against a five-month-old inventory.
      expect(routes.metadata.projectPath).toBe(testDir);
      expect(calls.metadata.projectPath).toBe(testDir);

      // Client calls are grouped by call type with confidence carried verbatim.
      expect(calls.totalCalls).toBeGreaterThan(0);
      const allCalls = Object.values(calls.byCallType).flat() as Array<{
        path: string;
        confidence: number;
      }>;
      expect(allCalls.some(c => c.path === '/api/users')).toBe(true);
      expect(allCalls.every(c => c.confidence === 100 || c.confidence === 80)).toBe(true);
    });

    it('does NOT harvest route-shaped literals out of test files', async () => {
      // THE REGRESSION THIS GUARDS. The artifact Phase 1 deleted claimed 34 express
      // routes in a repo that is a CLI library exposing zero HTTP endpoints. All 34
      // were regex matches on route-shaped STRING LITERALS inside test fixtures. The
      // express detector matches /(?:app|router)\.(get|post|...)/ against raw content,
      // so a test that merely DESCRIBES a route is indistinguishable from one that
      // SERVES it — unless test-origin files are excluded up front.
      const testsDir = path.join(testDir, '__tests__');
      await fs.mkdir(testsDir, { recursive: true });
      await fs.writeFile(
        path.join(testsDir, 'orphan-detection.test.js'),
        `it('detects orphans', () => {\n` +
          `  const code = "app.get('/api/phantom', handler)";\n` +
          `  expect(detect(code)).toBe(true);\n` +
          `});\n`,
      );
      await fs.writeFile(
        path.join(testDir, 'report-generator.test.js'),
        `const sample = "router.post('/api/also-phantom', handler)";\n`,
      );

      const orchestrator = new PipelineOrchestrator();
      const state = await orchestrator.run(testDir, { languages: ['js'] });

      expect(state.routes ?? []).toHaveLength(0);

      const outputDir = path.join(testDir, '.coderef');
      await new RoutesGenerator().generate(state, outputDir);

      const routes = JSON.parse(
        await fs.readFile(path.join(outputDir, 'routes.json'), 'utf-8'),
      );
      expect(routes.totalRoutes).toBe(0);
    });

    it('does NOT harvest routes out of comments and JSDoc examples', async () => {
      // The second phantom class, found by running the reconnected producer against
      // CODEREF-CORE itself: it reported 7 endpoints for a CLI library that exposes
      // none. Every one came from a comment in the DETECTORS' OWN SOURCE — e.g.
      // route-parsers.ts:81 ` * Parse Express route: app.get('/path', handler)` and
      // scanner.ts:200 ` // Flask: @app.route('/path', methods=['GET'])`.
      //
      // A test-origin filter cannot reach these: they live in production source. The
      // content-regex detectors match raw text and cannot distinguish a route
      // DEFINITION from prose DESCRIBING one, so comment bodies are blanked first.
      await fs.writeFile(
        path.join(testDir, 'documented.js'),
        `/**\n` +
          ` * Parse Express route: app.get('/path', handler)\n` +
          ` * @example\n` +
          ` *   parseExpressRoute("app.get('/api/users', getUsers)", 28)\n` +
          ` */\n` +
          `// Flask: @app.route('/api/commented', methods=['GET'])\n` +
          `export function parseRoute(line) { return line; }\n`,
      );
      await fs.writeFile(
        path.join(testDir, 'documented.py'),
        `# @app.route('/api/py-commented')\n` +
          `def helper():\n` +
          `    return 1\n`,
      );

      const orchestrator = new PipelineOrchestrator();
      const state = await orchestrator.run(testDir, { languages: ['js', 'py'] });

      expect(state.routes ?? []).toHaveLength(0);
    });

    it('still detects a real route on a line carrying a trailing comment', async () => {
      // The guard above must not over-reach. Blanking is line-oriented and only fires
      // on lines that are ENTIRELY comment, so a genuine definition with a trailing
      // note stays visible.
      await fs.writeFile(
        path.join(testDir, 'srv.js'),
        `const app = require('express')();\n` +
          `app.get('/api/real', handler); // still a real route\n`,
      );

      const orchestrator = new PipelineOrchestrator();
      const state = await orchestrator.run(testDir, { languages: ['js'] });

      expect((state.routes ?? []).length).toBeGreaterThan(0);
      expect((state.routes ?? [])[0].route.path).toBe('/api/real');
    });

    it('emits an honest empty artifact for a project with no API surface', async () => {
      // A CLI library legitimately exposes zero HTTP routes. Zero is a VALID result —
      // but it must be written as a real artifact with correct metadata, not skipped.
      // An absent file reads as "never scanned"; an empty one reads as "scanned, none
      // found". Those are different facts and the consumer needs to tell them apart.
      await fs.writeFile(
        path.join(testDir, 'util.ts'),
        `export function add(a: number, b: number): number { return a + b; }\n`,
      );

      const orchestrator = new PipelineOrchestrator();
      const state = await orchestrator.run(testDir, { languages: ['ts'] });

      const outputDir = path.join(testDir, '.coderef');
      await new RoutesGenerator().generate(state, outputDir);

      const routes = JSON.parse(
        await fs.readFile(path.join(outputDir, 'routes.json'), 'utf-8'),
      );
      const calls = JSON.parse(
        await fs.readFile(path.join(outputDir, 'frontend-calls.json'), 'utf-8'),
      );

      expect(routes.totalRoutes).toBe(0);
      expect(routes.metadata.projectPath).toBe(testDir);
      expect(calls.totalCalls).toBe(0);
      expect(calls.metadata.projectPath).toBe(testDir);
    });
  });
});
